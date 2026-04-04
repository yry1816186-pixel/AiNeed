"""
CatVTON Virtual Try-On Inference Server (Production Grade)

Lightweight virtual try-on service based on CatVTON (ICLR 2025).
Uses concatenation-based approach with SD 1.5 Inpainting as base.
Fits within 8GB VRAM at 1024x768 resolution with bf16 precision.

Production Features:
- Request queue management with concurrency control
- Batch image processing support
- Structured logging with request tracing
- Real-time GPU VRAM monitoring
- Comprehensive error handling and recovery
- Metrics collection and health checks
- Graceful shutdown support

Based on: https://github.com/Zheng-Chong/CatVTON
Paper: "CatVTON: Concatenation Is All You Need for Virtual Try-On
       with Diffusion Models" (ICLR 2025)

Author: AiNeed ML Team
Version: 2.0.0 (Production Ready)
Date: 2026-04-04
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
import uuid
import threading
import traceback
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager
from concurrent.futures import TimeoutError as FuturesTimeoutError, ThreadPoolExecutor
from multiprocessing import Process, Queue as MPQueue
from dataclasses import dataclass, field
from datetime import datetime
from queue import Queue
from collections import defaultdict
import json

import torch
import numpy as np
from PIL import Image
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel, Field, validator

# Add CatVTON repo to path so its model/ and utils.py are importable
CATVTON_REPO_PATH = os.environ.get(
    "CATVTON_REPO_PATH",
    os.path.join(os.path.dirname(__file__), "..", "..", "models", "CatVTON"),
)
CATVTON_REPO_PATH = os.path.abspath(CATVTON_REPO_PATH)
if CATVTON_REPO_PATH not in sys.path:
    sys.path.insert(0, CATVTON_REPO_PATH)


# ============================================================================
# 结构化日志配置
# ============================================================================

class StructuredFormatter(logging.Formatter):
    """结构化日志格式器，支持JSON输出"""

    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # 添加额外字段
        if hasattr(record, 'request_id'):
            log_data['request_id'] = record.request_id
        if hasattr(record, 'processing_time'):
            log_data['processing_time'] = record.processing_time
        if hasattr(record, 'vram_usage'):
            log_data['vram_usage'] = record.vram_usage
        if hasattr(record, 'extra'):
            log_data.update(record.extra)

        # 异常信息
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)

        return json.dumps(log_data, ensure_ascii=False)


def setup_logging():
    """配置结构化日志"""
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)

    # 控制台处理器
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(StructuredFormatter())
    logger.addHandler(console_handler)

    return logger


logger = setup_logging()


# ============================================================================
# 安全工作目录上下文管理器
# ============================================================================

@asynccontextmanager
async def _working_directory(path: str):
    """Temporarily change working directory within a context manager."""
    old_cwd = os.getcwd()
    os.chdir(path)
    try:
        yield
    finally:
        os.chdir(old_cwd)


# ============================================================================
# 全局状态管理
# ============================================================================

class ServerState:
    """服务器全局状态管理"""

    def __init__(self):
        # 模型状态
        self.model_loaded: bool = False
        self.masker_loaded: bool = False
        self.gpu_available: bool = False
        self.device = None
        self.pipeline = None
        self.auto_masker = None
        self.mask_processor = None
        self.status_message: str = "Not initialized"

        # GPU 监控
        self.gpu_name: str = ""
        self.vram_total_gb: float = 0.0
        self.vram_limit_fraction: float = 0.8

        # 请求队列
        self.request_queue: Optional[Queue] = None
        self.max_concurrent_requests: int = 2  # 最大并发请求数
        self.current_requests: int = 0
        self.request_lock: threading.Lock = threading.Lock()

        # 统计指标
        self.metrics: Dict[str, Any] = {
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "timeout_requests": 0,
            "average_processing_time": 0.0,
            "total_processing_time": 0.0,
            "requests_by_category": defaultdict(int),
            "errors_by_type": defaultdict(int),
        }
        self.metrics_lock: threading.Lock = threading.Lock()

        # 配置
        self.inference_timeout_seconds: int = 180
        self.max_batch_size: int = 4
        self.enable_batch_processing: bool = True


# 创建全局状态实例
state = ServerState()


# ============================================================================
# GPU 初始化和监控
# ============================================================================

def initialize_gpu():
    """初始化GPU并设置内存限制"""
    try:
        state.gpu_available = torch.cuda.is_available()
        state.device = torch.device("cuda" if state.gpu_available else "cpu")
        logger.info(f"CUDA available: {state.gpu_available}, Device: {state.device}")

        if state.gpu_available:
            state.gpu_name = torch.cuda.get_device_name(0)
            state.vram_total_gb = torch.cuda.get_device_properties(0).total_memory / 1024**3
            logger.info(f"GPU: {state.gpu_name}, VRAM: {state.vram_total_gb:.1f} GB")

            state.vram_limit_fraction = float(
                os.environ.get("CATVTON_GPU_MEMORY_FRACTION", "0.8")
            )
            torch.cuda.set_per_process_memory_fraction(state.vram_limit_fraction, 0)
            logger.info(
                f"GPU memory limit set to {state.vram_limit_fraction*100:.0f}% "
                f"of total VRAM ({state.vram_total_gb * state.vram_limit_fraction:.1f} GB)"
            )
    except Exception as e:
        logger.warning(f"CUDA check failed: {e}")
        state.device = torch.device("cpu")


def get_vram_info() -> tuple:
    """Return (used_bytes, total_bytes, used_gb, total_gb) for GPU VRAM."""
    if state.gpu_available:
        try:
            used = torch.cuda.memory_allocated()
            total = torch.cuda.get_device_properties(0).total_memory
            return (
                used,
                total,
                round(used / 1024**3, 2),
                round(total / 1024**3, 2)
            )
        except (RuntimeError, OSError):
            pass
    return None, None, None, None


def monitor_vram():
    """持续监控VRAM使用情况（后台线程）"""
    while True:
        try:
            used, total, used_gb, total_gb = get_vram_info()
            if used is not None:
                usage_percent = (used / total) * 100
                logger.debug(
                    f"VRAM Monitor: {used_gb}GB / {total_gb}GB ({usage_percent:.1f}%)",
                    extra={"vram_usage": {"used_gb": used_gb, "total_gb": total_gb, "percent": usage_percent}}
                )

                # VRAM 使用率超过90%时警告
                if usage_percent > 90:
                    logger.warning(
                        f"High VRAM usage detected: {usage_percent:.1f}%"
                    )
        except Exception as e:
            logger.error(f"VRAM monitoring error: {e}")

        time.sleep(10)  # 每10秒检查一次


# ============================================================================
# 请求/响应 Schema
# ============================================================================

class TryOnRequest(BaseModel):
    """试衣请求模型"""
    person_image: str = Field(
        ...,
        description="Base64 encoded person photo (with or without data URL prefix)",
        max_length=10_000_000  # 约10MB上限
    )
    garment_image: str = Field(
        ...,
        description="Base64 encoded garment photo (with or without data URL prefix)",
        max_length=10_000_000
    )
    category: str = Field(
        default="upper",
        description="Clothing category: upper, lower, or overall (dress)"
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
    width: int = Field(default=768, ge=256, le=1024, description="Output width")
    height: int = Field(default=1024, ge=256, le=1280, description="Output height")

    @validator('category')
    def validate_category(cls, v):
        valid_categories = {'upper', 'lower', 'overall'}
        if v.lower() not in valid_categories:
            raise ValueError(f'Invalid category. Must be one of: {valid_categories}')
        return v.lower()

    @validator('person_image', 'garment_image')
    def validate_base64_images(cls, v):
        """验证Base64图像数据有效性"""
        if not v:
            raise ValueError("Image cannot be empty")

        # 移除data URL前缀
        b64_data = v
        if v.startswith("data:image"):
            parts = v.split(",", 1)
            if len(parts) == 2:
                b64_data = parts[1]

        # 尝试解码验证
        try:
            decoded = base64.b64decode(b64_data)
            if len(decoded) < 100:  # 至少100字节
                raise ValueError("Image data too small")
        except Exception as e:
            raise ValueError(f"Invalid base64 image data: {str(e)}")

        return v


class BatchTryOnRequest(BaseModel):
    """批量试衣请求模型"""
    requests: List[TryOnRequest] = Field(
        ...,
        description="List of try-on requests (max 4 per batch)",
        min_items=1,
        max_items=4
    )


class TryOnResponse(BaseModel):
    """试衣响应模型"""
    result_image: str = Field(description="Base64 encoded result image (data URL)")
    gpu_used: bool
    processing_time: float
    model_version: str
    request_id: str
    success: bool
    error: Optional[str] = None


class BatchTryOnResponse(BaseModel):
    """批量试衣响应模型"""
    results: List[TryOnResponse]
    total_processing_time: float
    batch_size: int
    successful_count: int
    failed_count: int


class StatusResponse(BaseModel):
    """服务器状态响应"""
    available: bool
    model_loaded: bool
    masker_loaded: bool
    gpu_available: bool
    status_message: Optional[str] = None
    vram_used_mb: Optional[int] = None
    vram_total_mb: Optional[int] = None
    model_path: str
    catvton_repo_path: str
    current_requests: int
    max_concurrent_requests: int
    uptime_seconds: float


class HealthResponse(BaseModel):
    """健康检查响应"""
    status: str  # healthy, degraded, unhealthy
    model_loaded: bool
    masker_loaded: bool
    gpu_available: bool
    vram_usage_percent: Optional[float] = None
    queue_depth: int
    uptime_seconds: float
    version: str


class MetricsResponse(BaseModel):
    """统计指标响应"""
    metrics: Dict[str, Any]
    timestamp: str


class WarmupResponse(BaseModel):
    """预热响应"""
    success: bool
    message: str
    processing_time: Optional[float] = None


# ============================================================================
# 图像处理工具函数
# ============================================================================

def decode_base64_image(image_b64: str) -> Image.Image:
    """Decode a base64 image string (with or without data URL prefix) to PIL.

    Args:
        image_b64: Base64编码的图像字符串

    Returns:
        PIL Image对象

    Raises:
        ValueError: 如果图像解码失败
    """
    try:
        if image_b64.startswith("data:image"):
            image_b64 = image_b64.split(",", 1)[1]
        image_data = base64.b64decode(image_b64)
        image = Image.open(io.BytesIO(image_data)).convert("RGB")

        # 验证图像尺寸合理性
        if image.size[0] < 32 or image.size[1] < 32:
            raise ValueError(f"Image too small: {image.size}")
        if image.size[0] > 4096 or image.size[1] > 4096:
            raise ValueError(f"Image too large: {image.size}")

        return image
    except Exception as e:
        logger.error(f"Failed to decode base64 image: {e}")
        raise ValueError(f"Invalid image data: {str(e)}")


def encode_image_base64(image: Image.Image, fmt: str = "PNG") -> str:
    """Encode a PIL Image to a base64 data URL string.

    Args:
        image: PIL Image对象
        fmt: 图像格式 (PNG/JPEG)

    Returns:
        Base64 data URL字符串
    """
    buffer = io.BytesIO()
    image.save(buffer, format=fmt)
    encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/{fmt.lower()};base64,{encoded}"


# ============================================================================
# 模型加载
# ============================================================================

def load_pipeline() -> bool:
    """Load CatVTON pipeline (UNet + VAE + scheduler + attention adapter).

    Returns:
        True如果加载成功，False否则
    """
    global state

    try:
        from model.pipeline import CatVTONPipeline
        from utils import init_weight_dtype
    except ImportError as exc:
        state.status_message = f"Failed to import CatVTON modules: {exc}"
        logger.error(state.status_message)
        return False

    base_ckpt = os.environ.get(
        "CATVTON_BASE_MODEL", "booksforcharlie/stable-diffusion-inpainting"
    )
    resume_path = os.environ.get("CATVTON_RESUME_PATH", "zhengchong/CatVTON")
    mixed_precision = os.environ.get("CATVTON_PRECISION", "bf16")

    try:
        weight_dtype = init_weight_dtype(mixed_precision)
    except Exception as e:
        logger.warning(f"Failed to init weight dtype '{mixed_precision}', falling back to bf16: {e}")
        weight_dtype = torch.bfloat16
        mixed_precision = "bf16"

    logger.info("=" * 60)
    logger.info("Loading CatVTON pipeline...")
    logger.info(f"  Base model:  {base_ckpt}")
    logger.info(f"  Weights:     {resume_path}")
    logger.info(f"  Precision:   {mixed_precision} ({weight_dtype})")
    logger.info(f"  Device:      {state.device}")
    logger.info("=" * 60)

    try:
        start_time = time.time()

        state.pipeline = CatVTONPipeline(
            base_ckpt=base_ckpt,
            attn_ckpt=resume_path,
            attn_ckpt_version="mix",
            weight_dtype=weight_dtype,
            device=str(state.device),
            compile=False,
            skip_safety_check=True,  # skip safety checker to save VRAM
            use_tf32=True,
        )

        load_time = time.time() - start_time
        state.model_loaded = True
        state.status_message = "CatVTON pipeline loaded successfully"
        logger.info(f"✓ CatVTON pipeline loaded successfully in {load_time:.2f}s")

        # 记录加载后的VRAM使用
        _, _, used_gb, _ = get_vram_info()
        if used_gb is not None:
            logger.info(f"VRAM after loading: {used_gb} GB")

        return True
    except Exception as exc:
        state.status_message = f"Failed to load CatVTON pipeline: {exc}"
        logger.error(state.status_message, exc_info=True)
        return False


def load_masker() -> bool:
    """Load AutoMasker (DensePose + SCHP) for automatic mask generation.

    Returns:
        True如果加载成功，False否则
    """
    global state

    try:
        from huggingface_hub import snapshot_download
        from model.cloth_masker import AutoMasker
        from diffusers.image_processor import VaeImageProcessor
    except ImportError as exc:
        msg = f"Failed to import masker modules: {exc}"
        state.status_message = msg
        logger.error(msg)
        return False

    logger.info("Loading AutoMasker (DensePos + SCHP)...")

    try:
        resume_path = os.environ.get("CATVTON_RESUME_PATH", "zhengchong/CatVTON")
        if os.path.isdir(resume_path):
            repo_path = resume_path
        else:
            repo_path = snapshot_download(repo_id=resume_path)

        start_time = time.time()

        # DensePose needs configs relative to repo; use context manager for safety
        old_cwd = os.getcwd()
        os.chdir(CATVTON_REPO_PATH)
        try:
            state.auto_masker = AutoMasker(
                densepose_ckpt=os.path.join(repo_path, "DensePose"),
                schp_ckpt=os.path.join(repo_path, "SCHP"),
                device=str(state.device),
            )
            state.mask_processor = VaeImageProcessor(
                vae_scale_factor=8,
                do_normalize=False,
                do_binarize=True,
                do_convert_grayscale=True,
            )
        finally:
            os.chdir(old_cwd)

        load_time = time.time() - start_time
        state.masker_loaded = True
        logger.info(f"✓ AutoMasker loaded successfully in {load_time:.2f}s")
        return True
    except Exception as exc:
        state.status_message = f"Failed to load AutoMasker: {exc}"
        logger.error(state.status_message, exc_info=True)
        return False


# ============================================================================
# 推理核心逻辑
# ============================================================================

def run_inference_with_timeout(
    person_image_b64: str,
    garment_image_b64: str,
    category: str = "upper",
    num_inference_steps: int = 50,
    guidance_scale: float = 2.5,
    seed: int = -1,
    width: int = 768,
    height: int = 1024,
    timeout_seconds: int = None,
    request_id: str = None,
) -> dict:
    """
    Run CatVTON virtual try-on inference with comprehensive error handling.

    Args:
        person_image_b64: 人物图像Base64
        garment_image_b64: 服装图像Base64
        category: 服装类别 (upper/lower/overall)
        num_inference_steps: 去噪步数
        guidance_scale: CFG强度
        seed: 随机种子
        width: 输出宽度
        height: 输出高度
        timeout_seconds: 超时时间（秒）
        request_id: 请求ID（用于日志追踪）

    Returns:
        包含结果的字典
    """
    from utils import resize_and_crop, resize_and_padding

    timeout_seconds = timeout_seconds or state.inference_timeout_seconds
    request_id = request_id or str(uuid.uuid4())[:8]
    start_time = time.time()

    logger.info(
        f"[{request_id}] Starting inference: category={category}, "
        f"steps={num_inference_steps}, size={width}x{height}",
        extra={"request_id": request_id}
    )

    def inference_worker(result_queue: MPQueue, **kwargs):
        """推理工作进程"""
        try:
            req_id = kwargs.get('request_id', 'unknown')

            # 解码图像
            person_image = decode_base64_image(kwargs["person_image_b64"])
            garment_image = decode_base64_image(kwargs["garment_image_b64"])

            # 调整尺寸
            person_image = resize_and_crop(person_image, (kwargs["width"], kwargs["height"]))
            garment_image = resize_and_padding(garment_image, (kwargs["width"], kwargs["height"]))

            # 生成掩码
            if state.masker_loaded and state.auto_masker is not None:
                try:
                    mask_result = state.auto_masker(person_image, kwargs["category"])
                    mask = mask_result["mask"]
                except Exception as mask_error:
                    logger.warning(
                        f"[{req_id}] AutoMasker failed, using fallback mask: {mask_error}"
                    )
                    mask = generate_fallback_mask(kwargs["width"], kwargs["height"], kwargs["category"])
            else:
                logger.warning(f"[{req_id}] AutoMasker not loaded, using fallback rectangular mask")
                mask = generate_fallback_mask(kwargs["width"], kwargs["height"], kwargs["category"])

            # 应用模糊处理
            if state.mask_processor is not None:
                try:
                    mask = state.mask_processor.blur(mask, blur_factor=9)
                except Exception as blur_error:
                    logger.warning(f"[{req_id}] Mask blur failed: {blur_error}")

            # 设置随机种子
            generator = None
            if kwargs["seed"] != -1:
                generator = torch.Generator(device=str(state.device)).manual_seed(kwargs["seed"])

            # 执行推理
            old_cwd = os.getcwd()
            os.chdir(CATVTON_REPO_PATH)
            try:
                result_images = state.pipeline(
                    image=person_image,
                    condition_image=garment_image,
                    mask=mask,
                    num_inference_steps=kwargs["num_inference_steps"],
                    guidance_scale=kwargs["guidance_scale"],
                    height=kwargs["height"],
                    width=kwargs["width"],
                    generator=generator,
                )
            finally:
                os.chdir(old_cwd)

            result_image = result_images[0]
            result_b64 = encode_image_base64(result_image)
            result_queue.put(("success", result_b64))

        except Exception as e:
            error_msg = f"{type(e).__name__}: {str(e)}"
            logger.error(f"[{req_id}] Inference worker error: {error_msg}", exc_info=True)
            result_queue.put(("error", error_msg))


    def generate_fallback_mask(width: int, height: int, category: str) -> Image.Image:
        """生成后备矩形掩码"""
        mask = Image.new("L", (width, height), 0)
        mask_np = np.array(mask)

        # 根据类别设置不同的掩码区域
        top = int(height * 0.15)
        bottom = int(height * 0.75)
        left = int(width * 0.15)
        right = int(width * 0.85)

        if category == "lower":
            top = int(height * 0.4)
            bottom = int(height * 0.9)
        elif category == "overall":
            top = int(height * 0.1)
            bottom = int(height * 0.9)

        mask_np[top:bottom, left:right] = 255
        return Image.fromarray(mask_np)


    # 启动推理进程
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
        "request_id": request_id,
    }

    process = Process(target=inference_worker, args=(result_queue,), kwargs=worker_kwargs)
    process.start()

    # 等待完成或超时
    process.join(timeout=timeout_seconds)
    processing_time = time.time() - start_time

    # 处理超时
    if process.is_alive():
        logger.error(
            f"[{request_id}] Inference timed out after {timeout_seconds}s, terminating...",
            extra={"request_id": request_id, "processing_time": processing_time}
        )
        process.terminate()
        process.join(timeout=5)
        if process.is_alive():
            process.kill()
            process.join()

        return {
            "result_image": "",
            "gpu_used": state.gpu_available,
            "processing_time": round(processing_time, 3),
            "model_version": "catvton-mix-48k-1024-bf16",
            "request_id": request_id,
            "success": False,
            "timeout": True,
            "error": f"Inference timed out after {timeout_seconds} seconds",
        }

    # 处理结果
    if not result_queue.empty():
        status, data = result_queue.get()
        if status == "success":
            logger.info(
                f"[{request_id}] ✓ Inference completed in {processing_time:.2f}s",
                extra={
                    "request_id": request_id,
                    "processing_time": processing_time
                }
            )
            return {
                "result_image": data,
                "gpu_used": state.gpu_available,
                "processing_time": round(processing_time, 3),
                "model_version": "catvton-mix-48k-1024-bf16",
                "request_id": request_id,
                "success": True,
                "timeout": False,
            }
        else:
            logger.error(
                f"[{request_id}] ✗ Inference failed: {data}",
                extra={"request_id": request_id}
            )
            return {
                "result_image": "",
                "gpu_used": state.gpu_available,
                "processing_time": round(processing_time, 3),
                "model_version": "catvton-mix-48k-1024-bf16",
                "request_id": request_id,
                "success": False,
                "timeout": False,
                "error": data,
            }

    # 未知错误
    logger.error(
        f"[{request_id}] ✗ Unknown error: no result from worker process",
        extra={"request_id": request_id}
    )
    return {
        "result_image": "",
        "gpu_used": state.gpu_available,
        "processing_time": round(processing_time, 3),
        "model_version": "catvton-mix-48k-1024-bf16",
        "request_id": request_id,
        "success": False,
        "timeout": False,
        "error": "Unknown error: no result from worker process",
    }


# ============================================================================
# 批量处理支持
# ============================================================================

def run_batch_inference(
    requests: List[TryOnRequest],
    timeout_multiplier: float = 1.5
) -> BatchTryOnResponse:
    """
    批量执行多个试衣请求

    Args:
        requests: 试衣请求列表
        timeout_multiplier: 超时时间倍数（批量处理通常更慢）

    Returns:
        批量试衣响应
    """
    if len(requests) > state.max_batch_size:
        raise HTTPException(
            status_code=400,
            detail=f"Batch size exceeds maximum of {state.max_batch_size}"
        )

    start_time = time.time()
    results = []
    successful = 0
    failed = 0

    logger.info(f"Starting batch inference: {len(requests)} requests")

    # 计算批量超时时间
    batch_timeout = int(state.inference_timeout_seconds * timeout_multiplier * len(requests))

    for i, req in enumerate(requests):
        request_id = f"batch-{uuid.uuid4()[:6]}-{i}"

        try:
            result = run_inference_with_timeout(
                person_image_b64=req.person_image,
                garment_image_b64=req.garment_image,
                category=req.category,
                num_inference_steps=req.num_inference_steps,
                guidance_scale=req.guidance_scale,
                seed=req.seed,
                width=req.width,
                height=req.height,
                timeout_seconds=batch_timeout,
                request_id=request_id,
            )

            results.append(TryOnResponse(**result))
            if result['success']:
                successful += 1
            else:
                failed += 1

        except Exception as e:
            logger.error(f"[{request_id}] Batch item {i} failed: {e}")
            failed += 1
            results.append(TryOnResponse(
                result_image="",
                gpu_used=state.gpu_available,
                processing_time=0.0,
                model_version="catvton-mix-48k-1024-bf16",
                request_id=request_id,
                success=False,
                error=str(e)
            ))

    total_time = time.time() - start_time

    logger.info(
        f"Batch completed: {successful}/{len(requests)} successful in {total_time:.2f}s"
    )

    return BatchTryOnResponse(
        results=results,
        total_processing_time=round(total_time, 3),
        batch_size=len(requests),
        successful_count=successful,
        failed_count=failed
    )


# ============================================================================
# 请求队列管理
# ============================================================================

class RequestQueueManager:
    """请求队列管理器，控制并发访问"""

    def __init__(self, max_concurrent: int = 2):
        self.max_concurrent = max_concurrent
        self.current_requests = 0
        self.lock = threading.Lock()
        self.queue = Queue()
        self.condition = threading.Condition(self.lock)

    def acquire(self, timeout: float = 30.0) -> bool:
        """获取请求槽位（带超时）"""
        with self.condition:
            if self.current_requests < self.max_concurrent:
                self.current_requests += 1
                return True

            # 等待空余槽位
            start_time = time.time()
            while self.current_requests >= self.max_concurrent:
                remaining = timeout - (time.time() - start_time)
                if remaining <= 0:
                    return False
                self.condition.wait(timeout=remaining)

            if self.current_requests < self.max_concurrent:
                self.current_requests += 1
                return True
            return False

    def release(self):
        """释放请求槽位"""
        with self.condition:
            self.current_requests -= 1
            self.condition.notify_all()

    @property
    def available_slots(self) -> int:
        return self.max_concurrent - self.current_requests


# 创建队列管理器
queue_manager = RequestQueueManager(max_concurrent_requests=state.max_concurrent_requests)


# ============================================================================
# 指标收集
# ============================================================================

def update_metrics(success: bool, processing_time: float, category: str, error_type: str = None):
    """更新统计指标"""
    with state.metrics_lock:
        state.metrics["total_requests"] += 1
        state.metrics["total_processing_time"] += processing_time

        if success:
            state.metrics["successful_requests"] += 1
        else:
            state.metrics["failed_requests"] += 1
            if error_type:
                state.metrics["errors_by_type"][error_type] += 1

        state.metrics["requests_by_category"][category] += 1

        # 更新平均处理时间
        total = state.metrics["total_requests"]
        state.metrics["average_processing_time"] = (
            state.metrics["total_processing_time"] / total
        )


def get_metrics_summary() -> Dict[str, Any]:
    """获取指标摘要"""
    with state.metrics_lock:
        return {
            **state.metrics,
            "requests_by_category": dict(state.metrics["requests_by_category"]),
            "errors_by_type": dict(state.metrics["errors_by_type"]),
        }


# ============================================================================
# FastAPI 应用
# ============================================================================

# 启动时间记录
START_TIME = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle: startup and shutdown."""

    # ========== 启动阶段 ==========
    logger.info("=" * 60)
    logger.info("🚀 Starting CatVTON Production Server v2.0...")
    logger.info(f"   CatVTON repo: {CATVTON_REPO_PATH}")
    logger.info("=" * 60)

    # 初始化GPU
    initialize_gpu()

    # 启动VRAM监控线程
    if state.gpu_available:
        vram_monitor_thread = threading.Thread(target=monitor_vram, daemon=True)
        vram_monitor_thread.start()
        logger.info("✓ VRAM monitoring thread started")

    # 加载模型
    pipeline_ok = load_pipeline()
    masker_ok = load_masker()

    # 更新状态
    if pipeline_ok:
        state.status_message = (
            "Ready"
            if masker_ok
            else "Pipeline loaded, masker unavailable (using fallback masks)"
        )
        logger.info(f"✓ Server ready: {state.status_message}")
    else:
        logger.error("✗ Server failed to load pipeline. Check model weights.")
        state.status_message = "ERROR: Pipeline loading failed"

    logger.info(f"\n{'=' * 60}")
    logger.info(f"Server startup complete. Listening for requests...")
    logger.info(f"{'=' * 60}\n")

    yield

    # ========== 关闭阶段 ==========
    logger.info("\nShutting down CatVTON Server...")

    # 等待进行中的请求完成
    logger.info("Waiting for in-flight requests to complete...")
    await asyncio.sleep(2)

    # 清理资源
    del state.pipeline
    del state.auto_masker

    if state.gpu_available:
        torch.cuda.empty_cache()
        logger.info("GPU cache cleared")

    logger.info("Server shutdown complete.")


app = FastAPI(
    title="CatVTON Virtual Try-On Service (Production)",
    description=(
        "Production-grade virtual try-on inference server. "
        "CatVTON uses concatenation-based approach fitting in 8GB VRAM.\n\n"
        "**Features:**\n"
        "- Request queue management\n"
        "- Batch processing\n"
        "- Structured logging\n"
        "- Real-time VRAM monitoring\n"
        "- Comprehensive error handling\n"
        "- Metrics collection"
    ),
    version="2.0.0",
    lifespan=lifespan,
)

# 添加Gzip压缩中间件
app.add_middleware(GZipMiddleware, minimum_size=1000)


# ============================================================================
# 中间件：请求追踪和指标
# ============================================================================

@app.middleware("http")
async def add_request_tracking(request: Request, call_next):
    """添加请求追踪中间件"""
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:8])

    # 记录请求开始
    start_time = time.time()

    # 处理请求
    response = await call_next(request)

    # 记录请求完成
    process_time = time.time() - start_time
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Processing-Time"] = str(round(process_time, 3))

    logger.debug(
        f"{request.method} {request.url.path} - {response.status_code} ({process_time:.3f}s)",
        extra={"request_id": request_id, "processing_time": process_time}
    )

    return response


# ============================================================================
# API 端点
# ============================================================================

@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """
    Health check endpoint for monitoring systems.

    Returns server health status including:
    - Model loading status
    - GPU availability
    - VRAM usage
    - Queue depth
    - Uptime
    """
    _, _, used_gb, total_gb = get_vram_info()
    vram_percent = (used_gb / total_gb * 100) if (used_gb and total_gb) else None

    # 判断健康状态
    if state.model_loaded and (vram_percent is None or vram_percent < 90):
        status = "healthy"
    elif state.model_loaded:
        status = "degraded"
    else:
        status = "unhealthy"

    return HealthResponse(
        status=status,
        model_loaded=state.model_loaded,
        masker_loaded=state.masker_loaded,
        gpu_available=state.gpu_available,
        vram_usage_percent=vram_percent,
        queue_depth=queue_manager.current_requests,
        uptime_seconds=round(time.time() - START_TIME, 2),
        version="2.0.0"
    )


@app.get("/status", response_model=StatusResponse, tags=["Status"])
async def get_status():
    """
    Return detailed server status.

    Includes model information, VRAM usage, and configuration.
    """
    used, total, used_gb, total_gb = get_vram_info()

    return StatusResponse(
        available=state.model_loaded,
        model_loaded=state.model_loaded,
        masker_loaded=state.masker_loaded,
        gpu_available=state.gpu_available,
        status_message=state.status_message,
        vram_used_mb=int(used / 1024**2) if used else None,
        vram_total_mb=int(total / 1024**2) if total else None,
        model_path=os.environ.get("CATVTON_RESUME_PATH", "zhengchong/CatVTON"),
        catvton_repo_path=CATVTON_REPO_PATH,
        current_requests=queue_manager.current_requests,
        max_concurrent_requests=queue_manager.max_concurrent,
        uptime_seconds=round(time.time() - START_TIME, 2)
    )


@app.get("/metrics", response_model=MetricsResponse, tags=["Monitoring"])
async def get_metrics():
    """
    Return performance metrics and statistics.

    Useful for monitoring and alerting systems.
    """
    return MetricsResponse(
        metrics=get_metrics_summary(),
        timestamp=datetime.utcnow().isoformat() + "Z"
    )


@app.post("/tryon", response_model=TryOnResponse, tags=["Inference"])
async def tryon(request: TryOnRequest, background_tasks: BackgroundTasks):
    """
    Run single virtual try-on inference.

    Accepts base64-encoded person and garment images, returns the try-on
    result as a base64-encoded image.

    **Features:**
    - Automatic request queuing
    - Timeout protection (180s default)
    - Detailed error messages
    - Request ID tracking
    """
    # 检查模型是否就绪
    if not state.model_loaded:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "Model not loaded",
                "message": state.status_message,
                "retry_after": 30
            },
        )

    # 获取请求ID
    request_id = str(uuid.uuid4())[:8]

    # 尝试获取队列槽位
    if not queue_manager.acquire(timeout=30.0):
        raise HTTPException(
            status_code=503,
            detail={
                "error": "Server busy",
                "message": "Maximum concurrent requests reached. Please retry later.",
                "available_slots": queue_manager.available_slots,
                "retry_after": 5
            }
        )

    try:
        # 执行推理
        result = run_inference_with_timeout(
            person_image_b64=request.person_image,
            garment_image_b64=request.garment_image,
            category=request.category,
            num_inference_steps=request.num_inference_steps,
            guidance_scale=request.guidance_scale,
            seed=request.seed,
            width=request.width,
            height=request.height,
            request_id=request_id,
        )

        # 更新指标
        update_metrics(
            success=result['success'],
            processing_time=result['processing_time'],
            category=request.category,
            error_type='timeout' if result.get('timeout') else ('inference' if not result['success'] else None)
        )

        return TryOnResponse(**result)

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"[{request_id}] Unexpected error: {exc}", exc_info=True)
        update_metrics(success=False, processing_time=0, category=request.category, error_type='unexpected')
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(exc)}")
    finally:
        # 释放队列槽位
        queue_manager.release()


@app.post("/tryon/batch", response_model=BatchTryOnResponse, tags=["Inference"])
async def tryon_batch(request: BatchTryOnRequest):
    """
    Run batch virtual try-on inference (up to 4 items).

    Processes multiple try-on requests efficiently.
    Each request uses the same settings but different images.

    **Limitations:**
    - Maximum 4 requests per batch
    - Longer timeout than single requests
    - All requests share the same GPU resources
    """
    if not state.model_loaded:
        raise HTTPException(
            status_code=503,
            detail={"error": "Model not loaded", "message": state.status_message}
        )

    if len(request.requests) > state.max_batch_size:
        raise HTTPException(
            status_code=400,
            detail=f"Batch size exceeds maximum of {state.max_batch_size}"
        )

    # 批量处理也需要排队
    if not queue_manager.acquire(timeout=60.0):
        raise HTTPException(
            status_code=503,
            detail={"error": "Server busy", "message": "Please retry later"}
        )

    try:
        result = run_batch_inference(request.requests)

        # 更新指标
        for i, req in enumerate(request.requests):
            update_metrics(
                success=result.results[i].success,
                processing_time=result.results[i].processing_time,
                category=req.category
            )

        return result
    finally:
        queue_manager.release()


@app.post("/warmup", response_model=WarmupResponse, tags=["Maintenance"])
async def warmup():
    """
    Warm up the model with dummy forward pass.

    Ensures model is fully loaded and CUDA kernels are compiled.
    Should be called after server startup before handling real requests.
    """
    if not state.model_loaded:
        return WarmupResponse(success=False, message="Model not loaded")

    start_time = time.time()

    try:
        logger.info("Warming up CatVTON pipeline...")

        # Create small dummy images for quick warmup
        dummy_person = Image.new("RGB", (384, 512), (128, 128, 128))
        dummy_garment = Image.new("RGB", (384, 512), (64, 64, 200))
        dummy_mask = Image.new("L", (384, 512), 255)

        # Warmup forward pass
        old_cwd = os.getcwd()
        os.chdir(CATVTON_REPO_PATH)
        try:
            _ = state.pipeline(
                image=dummy_person,
                condition_image=dummy_garment,
                mask=dummy_mask,
                num_inference_steps=5,  # minimal steps
                guidance_scale=2.5,
                height=512,
                width=384,
            )
        finally:
            os.chdir(old_cwd)

        if state.gpu_available:
            torch.cuda.empty_cache()

        warmup_time = time.time() - start_time
        logger.info(f"✓ Warmup completed in {warmup_time:.2f}s")

        return WarmupResponse(
            success=True,
            message="Model warmed up successfully",
            processing_time=round(warmup_time, 3)
        )
    except Exception as exc:
        logger.error(f"Warmup failed: {exc}", exc_info=True)
        return WarmupResponse(success=False, message=str(exc))


@app.get("/requirements", tags=["Info"])
async def get_requirements():
    """
    Return model requirements and current resource status.

    Useful for client-side validation and resource planning.
    """
    _, _, used_gb, total_gb = get_vram_info()

    return {
        "model_loaded": state.model_loaded,
        "gpu_required": True,
        "min_vram_gb": 6,
        "recommended_vram_gb": 8,
        "current_vram_used_gb": used_gb,
        "current_vram_total_gb": total_gb,
        "base_model": "booksforcharlie/stable-diffusion-inpainting",
        "catvton_weights": "zhengchong/CatVTON",
        "vae": "stabilityai/sd-vae-ft-mse",
        "mixed_precision": "bf16",
        "max_resolution": "1024x768",
        "max_batch_size": state.max_batch_size,
        "max_concurrent_requests": state.max_concurrent_requests,
        "inference_timeout_seconds": state.inference_timeout_seconds,
        "supported_categories": ["upper", "lower", "overall"],
    }


# ============================================================================
# 启动入口
# ============================================================================

if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("CATVTON_PORT", "8001"))
    host = os.environ.get("CATVTON_HOST", "0.0.0.0")

    logger.info(f"🎯 Starting CatVTON production server on {host}:{port}")
    logger.info(f"   Max concurrent requests: {state.max_concurrent_requests}")
    logger.info(f"   Max batch size: {state.max_batch_size}")
    logger.info(f"   Inference timeout: {state.inference_timeout_seconds}s")

    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info",
        access_log=True,
    )
