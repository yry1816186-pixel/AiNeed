"""
CatVTON Virtual Try-On Inference Server

Lightweight virtual try-on service based on CatVTON (ICLR 2025).
Uses concatenation-based approach with SD 1.5 Inpainting as base.
Fits within 8GB VRAM at 1024x768 resolution with bf16 precision.

Based on: https://github.com/Zheng-Chong/CatVTON
Paper: "CatVTON: Concatenation Is All You Need for Virtual Try-On
       with Diffusion Models" (ICLR 2025)
"""

import io
import os
import sys
import base64
import logging
import time
import tempfile
import asyncio
import signal
from typing import Optional, List
from contextlib import asynccontextmanager
from concurrent.futures import TimeoutError as FuturesTimeoutError
from multiprocessing import Process, Queue as MPQueue

import torch
import numpy as np
from PIL import Image
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# Add CatVTON repo to path so its model/ and utils.py are importable
CATVTON_REPO_PATH = os.environ.get(
    "CATVTON_REPO_PATH",
    os.path.join(os.path.dirname(__file__), "..", "..", "models", "CatVTON"),
)
CATVTON_REPO_PATH = os.path.abspath(CATVTON_REPO_PATH)
if CATVTON_REPO_PATH not in sys.path:
    sys.path.insert(0, CATVTON_REPO_PATH)

# Safe working directory context manager to avoid race conditions in multi-request scenarios
@contextlib.contextmanager
def _working_directory(path: str):
    """Temporarily change working directory within a context manager."""
    old_cwd = os.getcwd()
    os.chdir(path)
    try:
        yield
    finally:
        os.chdir(old_cwd)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global state
MODEL_LOADED = False
MASKER_LOADED = False
GPU_AVAILABLE = False
DEVICE = None
PIPELINE = None
AUTO_MASKER = None
MASK_PROCESSOR = None
STATUS_MESSAGE = "Not initialized"

try:
    GPU_AVAILABLE = torch.cuda.is_available()
    DEVICE = torch.device("cuda" if GPU_AVAILABLE else "cpu")
    logger.info(f"CUDA available: {GPU_AVAILABLE}, Device: {DEVICE}")
    if GPU_AVAILABLE:
        gpu_name = torch.cuda.get_device_name(0)
        vram = torch.cuda.get_device_properties(0).total_memory / 1024**3
        logger.info(f"GPU: {gpu_name}, VRAM: {vram:.1f} GB")
        GPU_MEMORY_FRACTION = float(os.environ.get("CATVTON_GPU_MEMORY_FRACTION", "0.8"))
        torch.cuda.set_per_process_memory_fraction(GPU_MEMORY_FRACTION, 0)
        logger.info(f"GPU memory limit set to {GPU_MEMORY_FRACTION*100:.0f}% of total VRAM")
except Exception as e:
    logger.warning(f"CUDA check failed: {e}")
    DEVICE = torch.device("cpu")

INFERENCE_TIMEOUT_SECONDS = int(os.environ.get("CATVTON_INFERENCE_TIMEOUT", "180"))


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class TryOnRequest(BaseModel):
    person_image: str = Field(
        ..., description="Base64 encoded person photo (with or without data URL prefix)"
    )
    garment_image: str = Field(
        ..., description="Base64 encoded garment photo (with or without data URL prefix)"
    )
    category: str = Field(
        default="upper",
        description="Clothing category: upper, lower, or overall (dress)",
    )
    num_inference_steps: int = Field(
        default=50, ge=10, le=100, description="Denoising steps"
    )
    guidance_scale: float = Field(
        default=2.5, ge=0.0, le=10.0, description="CFG strength"
    )
    seed: int = Field(
        default=-1, description="Random seed (-1 for random)"
    )
    width: int = Field(default=768, description="Output width")
    height: int = Field(default=1024, description="Output height")


class TryOnResponse(BaseModel):
    result_image: str = Field(description="Base64 encoded result image (data URL)")
    gpu_used: bool
    processing_time: float
    model_version: str


class StatusResponse(BaseModel):
    available: bool
    model_loaded: bool
    masker_loaded: bool
    gpu_available: bool
    status_message: Optional[str] = None
    vram_used_mb: Optional[int] = None
    vram_total_mb: Optional[int] = None
    model_path: str
    catvton_repo_path: str


class WarmupResponse(BaseModel):
    success: bool
    message: str


# ---------------------------------------------------------------------------
# Image helpers
# ---------------------------------------------------------------------------

def decode_base64_image(image_b64: str) -> Image.Image:
    """Decode a base64 image string (with or without data URL prefix) to PIL."""
    if image_b64.startswith("data:image"):
        image_b64 = image_b64.split(",", 1)[1]
    image_data = base64.b64decode(image_b64)
    return Image.open(io.BytesIO(image_data)).convert("RGB")


def encode_image_base64(image: Image.Image, fmt: str = "PNG") -> str:
    """Encode a PIL Image to a base64 data URL string."""
    buffer = io.BytesIO()
    image.save(buffer, format=fmt)
    encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/{fmt.lower()};base64,{encoded}"


# ---------------------------------------------------------------------------
# Model loading
# ---------------------------------------------------------------------------

def load_pipeline() -> bool:
    """Load CatVTON pipeline (UNet + VAE + scheduler + attention adapter)."""
    global PIPELINE, MODEL_LOADED, STATUS_MESSAGE

    try:
        from model.pipeline import CatVTONPipeline
        from utils import init_weight_dtype
    except ImportError as exc:
        STATUS_MESSAGE = f"Failed to import CatVTON modules: {exc}"
        logger.error(STATUS_MESSAGE)
        return False

    base_ckpt = os.environ.get(
        "CATVTON_BASE_MODEL", "booksforcharlie/stable-diffusion-inpainting"
    )
    resume_path = os.environ.get("CATVTON_RESUME_PATH", "zhengchong/CatVTON")
    mixed_precision = os.environ.get("CATVTON_PRECISION", "bf16")
    weight_dtype = init_weight_dtype(mixed_precision)

    logger.info("=" * 60)
    logger.info("Loading CatVTON pipeline...")
    logger.info(f"  Base model:  {base_ckpt}")
    logger.info(f"  Weights:     {resume_path}")
    logger.info(f"  Precision:   {mixed_precision} ({weight_dtype})")
    logger.info(f"  Device:      {DEVICE}")
    logger.info("=" * 60)

    try:
        PIPELINE = CatVTONPipeline(
            base_ckpt=base_ckpt,
            attn_ckpt=resume_path,
            attn_ckpt_version="mix",
            weight_dtype=weight_dtype,
            device=str(DEVICE),
            compile=False,
            skip_safety_check=True,  # skip safety checker to save VRAM
            use_tf32=True,
        )
        MODEL_LOADED = True
        STATUS_MESSAGE = "CatVTON pipeline loaded successfully"
        logger.info("CatVTON pipeline loaded successfully.")
        return True
    except Exception as exc:
        STATUS_MESSAGE = f"Failed to load CatVTON pipeline: {exc}"
        logger.error(STATUS_MESSAGE, exc_info=True)
        return False


def load_masker() -> bool:
    """Load AutoMasker (DensePose + SCHP) for automatic mask generation."""
    global AUTO_MASKER, MASK_PROCESSOR, MASKER_LOADED, STATUS_MESSAGE

    try:
        from huggingface_hub import snapshot_download
        from model.cloth_masker import AutoMasker
        from diffusers.image_processor import VaeImageProcessor
    except ImportError as exc:
        msg = f"Failed to import masker modules: {exc}"
        STATUS_MESSAGE = msg
        logger.error(msg)
        return False

    logger.info("Loading AutoMasker (DensePose + SCHP)...")

    try:
        # Download / locate CatVTON weights which include DensePose & SCHP
        resume_path = os.environ.get("CATVTON_RESUME_PATH", "zhengchong/CatVTON")
        if os.path.isdir(resume_path):
            repo_path = resume_path
        else:
            repo_path = snapshot_download(repo_id=resume_path)

        # DensePose needs configs relative to repo; use context manager for safety
        with _working_directory(CATVTON_REPO_PATH):
            AUTO_MASKER = AutoMasker(
                densepose_ckpt=os.path.join(repo_path, "DensePose"),
                schp_ckpt=os.path.join(repo_path, "SCHP"),
                device=str(DEVICE),
            )
            MASK_PROCESSOR = VaeImageProcessor(
                vae_scale_factor=8,
                do_normalize=False,
                do_binarize=True,
                do_convert_grayscale=True,
            )
            MASKER_LOADED = True
            logger.info("AutoMasker loaded successfully.")
        return True
    except Exception as exc:
        STATUS_MESSAGE = f"Failed to load AutoMasker: {exc}"
        logger.error(STATUS_MESSAGE, exc_info=True)
        return False


def get_vram_info() -> tuple:
    """Return (used_bytes, total_bytes) for GPU VRAM, or (None, None)."""
    if GPU_AVAILABLE:
        try:
            used = torch.cuda.memory_allocated()
            total = torch.cuda.get_device_properties(0).total_memory
            return used, total
        except (RuntimeError, OSError):
            pass
    return None, None


# ---------------------------------------------------------------------------
# Inference
# ---------------------------------------------------------------------------

def run_inference_with_timeout(
    person_image_b64: str,
    garment_image_b64: str,
    category: str = "upper",
    num_inference_steps: int = 50,
    guidance_scale: float = 2.5,
    seed: int = -1,
    width: int = 768,
    height: int = 1024,
    timeout_seconds: int = INFERENCE_TIMEOUT_SECONDS,
) -> dict:
    """
    Run CatVTON virtual try-on inference with timeout protection.

    Returns dict with keys: result_image, gpu_used, processing_time, model_version, timeout.
    """
    from utils import resize_and_crop, resize_and_padding

    start_time = time.time()

    def inference_worker(result_queue: MPQueue, **kwargs):
        try:
            person_image = decode_base64_image(kwargs["person_image_b64"])
            garment_image = decode_base64_image(kwargs["garment_image_b64"])

            person_image = resize_and_crop(person_image, (kwargs["width"], kwargs["height"]))
            garment_image = resize_and_padding(garment_image, (kwargs["width"], kwargs["height"]))

            if MASKER_LOADED and AUTO_MASKER is not None:
                mask_result = AUTO_MASKER(person_image, kwargs["category"])
                mask = mask_result["mask"]
            else:
                logger.warning("AutoMasker not loaded, using fallback rectangular mask")
                mask = Image.new("L", (kwargs["width"], kwargs["height"]), 0)
                mask_np = np.array(mask)
                top = int(kwargs["height"] * 0.15)
                bottom = int(kwargs["height"] * 0.75)
                left = int(kwargs["width"] * 0.15)
                right = int(kwargs["width"] * 0.85)
                if kwargs["category"] == "lower":
                    top = int(kwargs["height"] * 0.4)
                    bottom = int(kwargs["height"] * 0.9)
                elif kwargs["category"] == "overall":
                    top = int(kwargs["height"] * 0.1)
                    bottom = int(kwargs["height"] * 0.9)
                mask_np[top:bottom, left:right] = 255
                mask = Image.fromarray(mask_np)

            if MASK_PROCESSOR is not None:
                mask = MASK_PROCESSOR.blur(mask, blur_factor=9)

            generator = None
            if kwargs["seed"] != -1:
                generator = torch.Generator(device=str(DEVICE)).manual_seed(kwargs["seed"])

            # CatVTON pipeline may need CWD set to repo path; use context manager
            with _working_directory(CATVTON_REPO_PATH):
                result_images = PIPELINE(
                    image=person_image,
                    condition_image=garment_image,
                    mask=mask,
                    num_inference_steps=kwargs["num_inference_steps"],
                    guidance_scale=kwargs["guidance_scale"],
                    height=kwargs["height"],
                    width=kwargs["width"],
                    generator=generator,
                )

            result_image = result_images[0]
            result_b64 = encode_image_base64(result_image)
            result_queue.put(("success", result_b64))
        except Exception as e:
            result_queue.put(("error", str(e)))

    result_queue = MPQueue()
    worker_kwargs = {
        "person_image_b64": person_image_b64,
        "garment_image_b64": garment_image_b64,
        "category": category,
        "num_inference_steps": num_inference_steps,
        "guidance_scale": guidance_scale,
        "seed": seed,
        "width": width,
        "height": height,
    }

    p = Process(target=inference_worker, args=(result_queue,), kwargs=worker_kwargs)
    p.start()
    p.join(timeout=timeout_seconds)

    processing_time = time.time() - start_time

    if p.is_alive():
        p.terminate()
        p.join(timeout=5)
        if p.is_alive():
            p.kill()
            p.join()
        logger.error(f"Inference timed out after {timeout_seconds}s")
        return {
            "result_image": "",
            "gpu_used": GPU_AVAILABLE,
            "processing_time": round(processing_time, 3),
            "model_version": "catvton-mix-48k-1024-bf16",
            "timeout": True,
            "error": f"Inference timed out after {timeout_seconds} seconds",
        }

    if not result_queue.empty():
        status, data = result_queue.get()
        if status == "success":
            logger.info(f"CatVTON inference completed in {processing_time:.2f}s")
            return {
                "result_image": data,
                "gpu_used": GPU_AVAILABLE,
                "processing_time": round(processing_time, 3),
                "model_version": "catvton-mix-48k-1024-bf16",
                "timeout": False,
            }
        else:
            logger.error(f"Inference failed: {data}")
            return {
                "result_image": "",
                "gpu_used": GPU_AVAILABLE,
                "processing_time": round(processing_time, 3),
                "model_version": "catvton-mix-48k-1024-bf16",
                "timeout": False,
                "error": data,
            }

    return {
        "result_image": "",
        "gpu_used": GPU_AVAILABLE,
        "processing_time": round(processing_time, 3),
        "model_version": "catvton-mix-48k-1024-bf16",
        "timeout": False,
        "error": "Unknown error: no result from worker process",
    }


def run_inference(
    person_image_b64: str,
    garment_image_b64: str,
    category: str = "upper",
    num_inference_steps: int = 50,
    guidance_scale: float = 2.5,
    seed: int = -1,
    width: int = 768,
    height: int = 1024,
) -> dict:
    """
    Run CatVTON virtual try-on inference (legacy wrapper with timeout).

    Returns dict with keys: result_image, gpu_used, processing_time, model_version.
    """
    return run_inference_with_timeout(
        person_image_b64=person_image_b64,
        garment_image_b64=garment_image_b64,
        category=category,
        num_inference_steps=num_inference_steps,
        guidance_scale=guidance_scale,
        seed=seed,
        width=width,
        height=height,
        timeout_seconds=INFERENCE_TIMEOUT_SECONDS,
    )


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: load models on startup."""
    global STATUS_MESSAGE

    logger.info("=" * 60)
    logger.info("Starting CatVTON Server...")
    logger.info(f"  CatVTON repo: {CATVTON_REPO_PATH}")
    logger.info("=" * 60)

    # Load pipeline first (heaviest)
    pipeline_ok = load_pipeline()

    # Load masker (DensePose + SCHP)
    masker_ok = load_masker()

    # Log VRAM usage after loading
    used, total = get_vram_info()
    if used is not None:
        logger.info(
            f"VRAM after loading: {used / 1024**3:.2f} / {total / 1024**3:.2f} GB"
        )

    if pipeline_ok:
        STATUS_MESSAGE = (
            "Ready"
            if masker_ok
            else "Pipeline loaded, masker unavailable (using fallback masks)"
        )
        logger.info(f"Server ready: {STATUS_MESSAGE}")
    else:
        logger.error("Server failed to load pipeline. Check model weights.")

    yield

    logger.info("Shutting down CatVTON Server...")
    global PIPELINE, AUTO_MASKER
    del PIPELINE
    del AUTO_MASKER
    if GPU_AVAILABLE:
        torch.cuda.empty_cache()


app = FastAPI(
    title="CatVTON Virtual Try-On Service",
    description=(
        "Lightweight virtual try-on inference server. "
        "CatVTON uses concatenation-based approach fitting in 8GB VRAM."
    ),
    version="1.0.0",
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/status", response_model=StatusResponse)
async def get_status():
    """Return server status including model loading state and VRAM usage."""
    used, total = get_vram_info()
    return StatusResponse(
        available=MODEL_LOADED,
        model_loaded=MODEL_LOADED,
        masker_loaded=MASKER_LOADED,
        gpu_available=GPU_AVAILABLE,
        status_message=STATUS_MESSAGE,
        vram_used_mb=int(used / 1024**2) if used else None,
        vram_total_mb=int(total / 1024**2) if total else None,
        model_path=os.environ.get(
            "CATVTON_RESUME_PATH", "zhengchong/CatVTON"
        ),
        catvton_repo_path=CATVTON_REPO_PATH,
    )


@app.post("/tryon", response_model=TryOnResponse)
async def tryon(request: TryOnRequest):
    """
    Run virtual try-on inference.

    Accepts base64-encoded person and garment images, returns the try-on
    result as a base64-encoded image.
    """
    if not MODEL_LOADED:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "Model not loaded",
                "message": STATUS_MESSAGE,
            },
        )

    # Validate category
    valid_categories = {"upper", "lower", "overall"}
    if request.category not in valid_categories:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid category '{request.category}'. "
                f"Must be one of: {valid_categories}"
            ),
        )

    try:
        result = run_inference(
            person_image_b64=request.person_image,
            garment_image_b64=request.garment_image,
            category=request.category,
            num_inference_steps=request.num_inference_steps,
            guidance_scale=request.guidance_scale,
            seed=request.seed,
            width=request.width,
            height=request.height,
        )
        return TryOnResponse(**result)
    except Exception as exc:
        logger.error(f"Inference failed: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/warmup", response_model=WarmupResponse)
async def warmup():
    """Warm up the model with a dummy forward pass."""
    if not MODEL_LOADED:
        return WarmupResponse(
            success=False, message="Model not loaded"
        )

    try:
        logger.info("Warming up CatVTON pipeline...")
        # Create small dummy images for a quick warmup
        dummy_person = Image.new("RGB", (384, 512), (128, 128, 128))
        dummy_garment = Image.new("RGB", (384, 512), (64, 64, 200))
        dummy_mask = Image.new("L", (384, 512), 255)

        # Warmup forward pass (pipeline may need CWD set to repo path)
        with _working_directory(CATVTON_REPO_PATH):
            _ = PIPELINE(
                image=dummy_person,
                condition_image=dummy_garment,
                mask=dummy_mask,
                num_inference_steps=5,  # minimal steps for warmup
                guidance_scale=2.5,
                height=512,
                width=384,
            )

        if GPU_AVAILABLE:
            torch.cuda.empty_cache()

        logger.info("Warmup completed successfully")
        return WarmupResponse(
            success=True, message="Model warmed up successfully"
        )
    except Exception as exc:
        logger.error(f"Warmup failed: {exc}", exc_info=True)
        return WarmupResponse(success=False, message=str(exc))


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "healthy" if MODEL_LOADED else "degraded",
        "model_loaded": MODEL_LOADED,
        "masker_loaded": MASKER_LOADED,
        "gpu_available": GPU_AVAILABLE,
    }


@app.get("/requirements")
async def get_requirements():
    """Return model requirements and current resource status."""
    used, total = get_vram_info()
    return {
        "model_loaded": MODEL_LOADED,
        "gpu_required": True,
        "min_vram_gb": 6,
        "recommended_vram_gb": 8,
        "current_vram_used_gb": round(used / 1024**3, 2) if used else None,
        "current_vram_total_gb": round(total / 1024**3, 2) if total else None,
        "base_model": "booksforcharlie/stable-diffusion-inpainting",
        "catvton_weights": "zhengchong/CatVTON",
        "vae": "stabilityai/sd-vae-ft-mse",
        "mixed_precision": "bf16",
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("CATVTON_PORT", "8001"))
    host = os.environ.get("CATVTON_HOST", "0.0.0.0")

    logger.info(f"Starting CatVTON server on {host}:{port}")
    uvicorn.run(app, host=host, port=port)
