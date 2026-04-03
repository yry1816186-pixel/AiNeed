import os
import sys
import json
import asyncio
import uuid
import tempfile
import mimetypes
import traceback
from pathlib import Path
from typing import Dict, List, Optional, Any
from contextlib import asynccontextmanager
import numpy as np
from PIL import Image
import io
import base64
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI, HTTPException, UploadFile, File, Query, Body, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, Field
from prometheus_client import make_asgi_app, Counter, Histogram, generate_latest

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_IMAGE_DIRS = [
    Path(os.environ.get("DATA_DIR", "/data/images")),
    Path(tempfile.gettempdir()) / "aineed",
]

def validate_image_path(user_path: str) -> str:
    real_path = os.path.realpath(user_path)
    if not any(real_path.startswith(str(d)) for d in ALLOWED_IMAGE_DIRS):
        raise HTTPException(status_code=400, detail="Invalid image path: access denied")
    if ".." in user_path or user_path.startswith("/"):
        raise HTTPException(status_code=400, detail="Invalid image path: path traversal detected")
    return real_path

from inference.inference_service import (
    AIInferenceService,
    AnalysisResult,
    RecommendationResult,
    BodyAnalysisResult,
    create_api_response
)
from services.style_understanding_service import StyleUnderstandingUnavailableError


class StyleAnalysisRequest(BaseModel):
    user_input: str = Field(..., description="用户风格描述，如'小红书同款'")
    user_profile: Optional[Dict[str, Any]] = Field(None, description="用户档案信息")


class StyleSuggestionsRequest(BaseModel):
    user_input: str
    body_type: Optional[str] = None
    occasion: Optional[str] = None


class RecommendationRequest(BaseModel):
    user_input: str = Field(..., description="用户风格描述")
    user_profile: Optional[Dict[str, Any]] = None
    occasion: Optional[str] = None
    category: Optional[str] = None
    top_k: int = 10


class OutfitRecommendationRequest(BaseModel):
    user_input: str
    user_profile: Optional[Dict[str, Any]] = None
    occasion: Optional[str] = None


class ImageAnalysisRequest(BaseModel):
    image_path: Optional[str] = None
    image_base64: Optional[str] = None


class SimilarSearchRequest(BaseModel):
    image_path: Optional[str] = None
    image_base64: Optional[str] = None
    top_k: int = 10
    category_filter: Optional[str] = None


class EmbeddingRequest(BaseModel):
    image_url: Optional[str] = None
    image_path: Optional[str] = None
    text: Optional[str] = None


class OutfitItemsRequest(BaseModel):
    base_item_id: str
    user_body_type: Optional[str] = None
    occasion: Optional[str] = None
    top_k: int = 5


inference_service: Optional[AIInferenceService] = None
style_service = None
recommender_service = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global inference_service, style_service, recommender_service
    
    print("正在初始化AI推理服务...")
    inference_service = AIInferenceService(device="auto")
    print("AI推理服务初始化完成")
    
    try:
        from services.style_understanding_service import (
            StyleUnderstandingAPI,
            StyleUnderstandingService,
        )
        style_service = StyleUnderstandingAPI(
            StyleUnderstandingService(use_mock=False)
        )
        print("风格理解服务初始化完成")
    except Exception as e:
        print(f"风格理解服务初始化失败: {e}")
    
    try:
        from services.intelligent_style_recommender import StyleRecommendationAPI
        recommender_service = StyleRecommendationAPI()
        print("智能推荐服务初始化完成")
    except Exception as e:
        print(f"智能推荐服务初始化失败: {e}")
    
    yield


app = FastAPI(
    title="AiNeed Fashion AI Service",
    description="智能服装推荐API - 支持风格理解、搭配推荐",
    version="2.0.0",
    lifespan=lifespan
)

ERROR_COUNTER = Counter(
    'api_errors_total',
    'Total API errors',
    ['error_type', 'endpoint']
)


class APIError(Exception):
    """Base API error class"""
    def __init__(self, message: str, error_code: str, status_code: int = 500, details: Optional[Dict] = None):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class ModelNotLoadedError(APIError):
    """Error when AI model is not loaded"""
    def __init__(self, model_name: str):
        super().__init__(
            message=f"AI model '{model_name}' is not loaded",
            error_code="MODEL_NOT_LOADED",
            status_code=503,
            details={"model": model_name}
        )


class InferenceError(APIError):
    """Error during model inference"""
    def __init__(self, message: str, details: Optional[Dict] = None):
        super().__init__(
            message=message,
            error_code="INFERENCE_ERROR",
            status_code=500,
            details=details
        )


class RateLimitError(APIError):
    """Error when rate limit is exceeded"""
    def __init__(self, retry_after: int = 60):
        super().__init__(
            message="Rate limit exceeded. Please try again later.",
            error_code="RATE_LIMIT_EXCEEDED",
            status_code=429,
            details={"retry_after_seconds": retry_after}
        )


@app.exception_handler(APIError)
async def api_error_handler(request: Request, exc: APIError) -> JSONResponse:
    """Handle custom API errors"""
    ERROR_COUNTER.labels(error_type=exc.error_code, endpoint=request.url.path).inc()
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.error_code,
                "message": exc.message,
                "details": exc.details,
                "timestamp": datetime.now().isoformat(),
                "path": request.url.path
            }
        }
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handle HTTP exceptions with consistent format"""
    ERROR_COUNTER.labels(error_type="HTTP_ERROR", endpoint=request.url.path).inc()
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": exc.detail,
                "timestamp": datetime.now().isoformat(),
                "path": request.url.path
            }
        }
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle request validation errors"""
    ERROR_COUNTER.labels(error_type="VALIDATION_ERROR", endpoint=request.url.path).inc()
    
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"]
        })
    
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed",
                "details": {"errors": errors},
                "timestamp": datetime.now().isoformat(),
                "path": request.url.path
            }
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Global exception handler for unhandled errors"""
    ERROR_COUNTER.labels(error_type="UNHANDLED_ERROR", endpoint=request.url.path).inc()
    
    error_id = uuid.uuid4().hex[:8]
    error_trace = traceback.format_exc()
    
    print(f"[ERROR-{error_id}] Unhandled exception: {exc}")
    print(f"[ERROR-{error_id}] Traceback:\n{error_trace}")
    
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred. Please try again later.",
                "details": {
                    "error_id": error_id,
                    "type": type(exc).__name__
                },
                "timestamp": datetime.now().isoformat(),
                "path": request.url.path
            }
        }
    )

allowed_origins = os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001,http://localhost:8081").split(",")
if os.environ.get("ENVIRONMENT", "development") == "production":
    if not os.environ.get("CORS_ORIGINS"):
        print("WARNING: CORS_ORIGINS not set in production. Using restrictive defaults.")
        allowed_origins = []

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
)

# Mount Prometheus ASGI app for metrics endpoint
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

# Custom HTTP request metrics
http_requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

http_request_duration_seconds = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint'],
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
)


@app.get("/health")
async def health_check():
    """基础健康检查"""
    style_status = {"available": False}
    if style_service is not None and hasattr(style_service, "service"):
        style_status = style_service.service.get_backend_status()

    return {
        "status": "healthy" if style_status.get("available", False) else "degraded",
        "services": {
            "inference": inference_service is not None,
            "style_understanding": style_status,
            "recommender": recommender_service is not None
        }
    }


@app.get("/health/detailed")
async def detailed_health_check():
    """详细健康检查 - 包含模型状态和系统资源"""
    import torch
    import psutil

    health_status = {
        "status": "healthy",
        "timestamp": __import__('datetime').datetime.now().isoformat(),
        "services": {},
        "models": {},
        "resources": {},
        "gpu": None
    }

    # 检查服务状态
    services_healthy = True

    if inference_service is not None:
        try:
            # 检查关键模型
            models_status = {}
            if hasattr(inference_service, 'models') and inference_service.models:
                models_status["clip"] = inference_service.models.clip_model is not None
                models_status["yolo"] = inference_service.models.yolo_model is not None
                models_status["body_analyzer"] = inference_service.models.body_analyzer is not None

            health_status["services"]["inference"] = {
                "available": True,
                "models": models_status
            }
        except Exception as e:
            health_status["services"]["inference"] = {
                "available": False,
                "error": str(e)
            }
            services_healthy = False
    else:
        health_status["services"]["inference"] = {"available": False}
        services_healthy = False

    if style_service is not None and hasattr(style_service, "service"):
        health_status["services"]["style_understanding"] = style_service.service.get_backend_status()
        if not health_status["services"]["style_understanding"].get("available", False):
            services_healthy = False
    else:
        health_status["services"]["style_understanding"] = {"available": False}
        services_healthy = False
    health_status["services"]["recommender"] = {
        "available": recommender_service is not None
    }

    # 系统资源
    health_status["resources"] = {
        "cpu_percent": psutil.cpu_percent(interval=0.1),
        "memory_percent": psutil.virtual_memory().percent,
        "memory_available_gb": round(psutil.virtual_memory().available / (1024**3), 2),
        "disk_percent": psutil.disk_usage('/').percent if os.name != 'nt' else psutil.disk_usage('C:\\').percent
    }

    # GPU状态
    if torch.cuda.is_available():
        try:
            gpu_id = 0
            health_status["gpu"] = {
                "available": True,
                "name": torch.cuda.get_device_name(gpu_id),
                "memory_total_gb": round(torch.cuda.get_device_properties(gpu_id).total_memory / (1024**3), 2),
                "memory_allocated_gb": round(torch.cuda.memory_allocated(gpu_id) / (1024**3), 4),
                "memory_reserved_gb": round(torch.cuda.memory_reserved(gpu_id) / (1024**3), 4),
                "utilization_percent": None  # 需要 pynvml 库
            }
        except Exception as e:
            health_status["gpu"] = {
                "available": True,
                "error": str(e)
            }
    else:
        health_status["gpu"] = {"available": False}

    # 确定整体状态
    if not services_healthy:
        health_status["status"] = "degraded"
    elif health_status["resources"]["memory_percent"] > 90:
        health_status["status"] = "degraded"
    elif health_status["resources"]["cpu_percent"] > 95:
        health_status["status"] = "degraded"

    return health_status


@app.get("/status/models")
async def get_models_status():
    """获取已加载模型的详细状态"""
    import torch

    models_info = {
        "loaded": [],
        "missing": [],
        "device": "cuda" if torch.cuda.is_available() else "cpu"
    }

    # 检查模型目录
    models_dir = Path(__file__).parent.parent / "models"
    expected_models = ["clip", "yolo", "idm-vton"]

    for model_name in expected_models:
        model_path = models_dir / model_name
        if model_path.exists():
            # 计算目录大小
            total_size = sum(f.stat().st_size for f in model_path.rglob('*') if f.is_file())
            models_info["loaded"].append({
                "name": model_name,
                "path": str(model_path),
                "size_mb": round(total_size / (1024**2), 2)
            })
        else:
            models_info["missing"].append(model_name)

    return models_info


@app.post("/api/style/analyze")
async def analyze_style(request: StyleAnalysisRequest):
    if style_service is None:
        raise HTTPException(status_code=503, detail="风格理解服务未初始化")
    
    try:
        result = await style_service.analyze(
            request.user_input,
            request.user_profile
        )
        return result
    except StyleUnderstandingUnavailableError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={
                "message": exc.message,
                "backend": exc.backend,
                "reason": exc.reason,
            },
        ) from exc
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/style/suggestions")
async def get_style_suggestions(request: StyleSuggestionsRequest):
    if style_service is None:
        raise HTTPException(status_code=503, detail="风格理解服务未初始化")
    
    try:
        result = await style_service.get_suggestions(
            request.user_input,
            request.body_type,
            request.occasion
        )
        return result
    except StyleUnderstandingUnavailableError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={
                "message": exc.message,
                "backend": exc.backend,
                "reason": exc.reason,
            },
        ) from exc
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/recommendations")
async def get_recommendations(request: RecommendationRequest):
    if recommender_service is None:
        raise HTTPException(status_code=503, detail="推荐服务未初始化")
    
    try:
        result = await recommender_service.get_recommendations(
            user_input=request.user_input,
            user_profile=request.user_profile,
            occasion=request.occasion,
            category=request.category,
            top_k=request.top_k
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/recommendations/outfit")
async def get_outfit_recommendation(request: OutfitRecommendationRequest):
    if recommender_service is None:
        raise HTTPException(status_code=503, detail="推荐服务未初始化")
    
    try:
        result = await recommender_service.get_outfit_recommendation(
            user_input=request.user_input,
            user_profile=request.user_profile,
            occasion=request.occasion
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _validate_image_type(content: bytes, filename: str) -> str:
    """Validate image type by checking file magic bytes."""
    if len(content) < 12:
        raise HTTPException(status_code=400, detail="File too small to be a valid image")
    
    magic_bytes = content[:12]
    
    if magic_bytes[:8] == b'\x89PNG\r\n\x1a\n':
        return "png"
    elif magic_bytes[:2] == b'\xff\xd8':
        return "jpeg"
    elif magic_bytes[:4] == b'RIFF' and magic_bytes[8:12] == b'WEBP':
        return "webp"
    elif magic_bytes[:6] in (b'GIF87a', b'GIF89a'):
        return "gif"
    else:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported image format. Allowed: JPEG, PNG, WebP, GIF"
        )


def _create_secure_temp_file(content: bytes, suffix: str) -> str:
    """Create a secure temporary file with unique name."""
    temp_dir = tempfile.gettempdir()
    unique_name = f"aineed_{uuid.uuid4().hex}{suffix}"
    temp_path = os.path.join(temp_dir, unique_name)
    
    with open(temp_path, "wb") as f:
        f.write(content)
    
    return temp_path


@app.post("/api/analyze/path")
async def analyze_image_by_path(request: ImageAnalysisRequest):
    if inference_service is None:
        raise HTTPException(status_code=503, detail="推理服务未初始化")
    
    temp_path = None
    try:
        if request.image_path:
            safe_path = validate_image_path(request.image_path)
            if not os.path.exists(safe_path):
                raise HTTPException(status_code=400, detail="Image file not found")
            result = inference_service.analyze_image(safe_path)
        elif request.image_base64:
            try:
                image_data = base64.b64decode(request.image_base64)
                if len(image_data) > MAX_FILE_SIZE:
                    raise HTTPException(status_code=400, detail=f"Image too large. Max size: {MAX_FILE_SIZE // (1024*1024)}MB")
                
                image_format = _validate_image_type(image_data, "base64")
                image = Image.open(io.BytesIO(image_data)).convert("RGB")
                temp_path = _create_secure_temp_file(image_data, f".{image_format}")
                image.save(temp_path)
                result = inference_service.analyze_image(temp_path)
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"图像解析失败: {e}")
        else:
            raise HTTPException(status_code=400, detail="需要提供 image_path 或 image_base64")
        
        return create_api_response(result)
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass


@app.post("/api/analyze/upload")
async def analyze_uploaded_image(file: UploadFile = File(...)):
    if inference_service is None:
        raise HTTPException(status_code=503, detail="推理服务未初始化")
    
    temp_path = None
    try:
        contents = await file.read()
        
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail=f"File too large. Max size: {MAX_FILE_SIZE // (1024*1024)}MB")
        
        image_format = _validate_image_type(contents, file.filename or "upload")
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        temp_path = _create_secure_temp_file(contents, f".{image_format}")
        image.save(temp_path)
        
        result = inference_service.analyze_image(temp_path)
        return create_api_response(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass


@app.post("/api/body-analysis")
async def analyze_body(
    request: Request,
    file: Optional[UploadFile] = File(None)
):
    if inference_service is None:
        raise HTTPException(status_code=503, detail="推理服务未初始化")
    
    temp_path = None
    try:
        if file is not None:
            contents = await file.read()
            
            if len(contents) > MAX_FILE_SIZE:
                raise HTTPException(status_code=400, detail=f"File too large. Max size: {MAX_FILE_SIZE // (1024*1024)}MB")
            
            image_format = _validate_image_type(contents, file.filename or "upload")
            image = Image.open(io.BytesIO(contents)).convert("RGB")
            temp_path = _create_secure_temp_file(contents, f".{image_format}")
            image.save(temp_path)
        else:
            payload = await request.json()
            if payload.get("image_path"):
                safe_path = validate_image_path(payload["image_path"])
                if not os.path.exists(safe_path):
                    raise HTTPException(status_code=400, detail="Image file not found")
                temp_path = safe_path
            elif payload.get("image_base64"):
                image_data = base64.b64decode(payload["image_base64"])
                if len(image_data) > MAX_FILE_SIZE:
                    raise HTTPException(status_code=400, detail=f"Image too large. Max size: {MAX_FILE_SIZE // (1024*1024)}MB")
                
                image_format = _validate_image_type(image_data, "base64")
                image = Image.open(io.BytesIO(image_data)).convert("RGB")
                temp_path = _create_secure_temp_file(image_data, f".{image_format}")
                image.save(temp_path)

        if not temp_path:
            raise HTTPException(
                status_code=400,
                detail="需要提供 file、image_path 或 image_base64",
            )

        result = inference_service.analyze_body(temp_path)
        return create_api_response(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass


@app.post("/api/similar")
async def find_similar_items(request: SimilarSearchRequest):
    if inference_service is None:
        raise HTTPException(status_code=503, detail="推理服务未初始化")
    
    temp_path = None
    try:
        if request.image_path:
            safe_path = validate_image_path(request.image_path)
            if not os.path.exists(safe_path):
                raise HTTPException(status_code=400, detail="Image file not found")
            temp_path = safe_path
        elif request.image_base64:
            try:
                image_data = base64.b64decode(request.image_base64)
                if len(image_data) > MAX_FILE_SIZE:
                    raise HTTPException(status_code=400, detail=f"Image too large. Max size: {MAX_FILE_SIZE // (1024*1024)}MB")
                
                image_format = _validate_image_type(image_data, "base64")
                image = Image.open(io.BytesIO(image_data)).convert("RGB")
                temp_path = _create_secure_temp_file(image_data, f".{image_format}")
                image.save(temp_path)
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"图像解析失败: {e}")

        if not temp_path:
            raise HTTPException(
                status_code=400,
                detail="需要提供 image_path 或 image_base64",
            )

        results = inference_service.find_similar(
            temp_path,
            top_k=request.top_k,
            category_filter=request.category_filter
        )
        return create_api_response(results)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_path and os.path.exists(temp_path) and request.image_base64:
            try:
                os.remove(temp_path)
            except OSError:
                pass


@app.post("/api/outfit")
async def recommend_outfit_items(
    request: OutfitItemsRequest
):
    if inference_service is None:
        raise HTTPException(status_code=503, detail="推理服务未初始化")
    
    try:
        result = inference_service.recommend_outfit(
            request.base_item_id,
            user_body_type=request.user_body_type,
            occasion=request.occasion,
            top_k=request.top_k
        )
        return create_api_response(result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/colors/{color_season}")
async def get_color_recommendations(color_season: str, category: Optional[str] = None):
    if inference_service is None:
        raise HTTPException(status_code=503, detail="推理服务未初始化")
    
    result = inference_service.get_color_recommendations(color_season, category)
    return create_api_response(result)


@app.post("/api/embedding")
async def get_embedding(request: EmbeddingRequest):
    if inference_service is None:
        raise HTTPException(status_code=503, detail="推理服务未初始化")
    
    try:
        if request.image_path:
            embedding = inference_service.get_image_embedding(request.image_path)
        elif request.image_url:
            embedding = inference_service.get_image_embedding(request.image_url)
        elif request.text:
            embedding = inference_service.get_text_embedding(request.text)
        else:
            raise HTTPException(status_code=400, detail="需要提供 image_url, image_path 或 text")
        
        return {
            "success": True,
            "data": {"embedding": embedding.tolist() if hasattr(embedding, 'tolist') else embedding}
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/embedding/text")
async def get_text_embedding(request: EmbeddingRequest):
    if inference_service is None:
        raise HTTPException(status_code=503, detail="推理服务未初始化")
    
    try:
        if not request.text:
            raise HTTPException(status_code=400, detail="需要提供 text 参数")
        
        embedding = inference_service.get_text_embedding(request.text)
        return {
            "success": True,
            "data": {"embedding": embedding.tolist() if hasattr(embedding, 'tolist') else embedding}
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/items/{item_id}")
async def get_item_embedding(item_id: str):
    if inference_service is None:
        raise HTTPException(status_code=503, detail="推理服务未初始化")
    
    try:
        embedding = inference_service.get_item_embedding(item_id)
        if embedding is None:
            raise HTTPException(status_code=404, detail="商品未找到")
        
        return {
            "success": True,
            "data": {
                "item_id": item_id,
                "embedding": embedding.tolist() if hasattr(embedding, 'tolist') else embedding
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stats")
async def get_stats():
    if inference_service is None:
        raise HTTPException(status_code=503, detail="推理服务未初始化")
    
    try:
        stats = inference_service.get_stats()
        return {"success": True, "data": stats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/models/status")
async def get_models_status():
    from models.model_weight_manager import ModelWeightManager, MODELS_REGISTRY
    
    manager = ModelWeightManager()
    status = {}
    
    for model_id in MODELS_REGISTRY:
        success, issues = manager.verify_model(model_id)
        status[model_id] = {
            "ready": success,
            "issues": issues if not success else []
        }
    
    return {
        "models": status,
        "total": len(status),
        "ready": sum(1 for s in status.values() if s["ready"])
    }


@app.post("/api/models/download")
async def download_model_weights(model_id: Optional[str] = None, force: bool = False):
    from models.model_weight_manager import ModelWeightManager, MODELS_REGISTRY
    
    manager = ModelWeightManager()
    
    if model_id:
        success, message = await manager.download_model(model_id, force)
        return {"model_id": model_id, "success": success, "message": message}
    else:
        results = await manager.download_all()
        return {
            "results": {
                k: {"success": v[0], "message": v[1]}
                for k, v in results.items()
            }
        }


try:
    from services.intelligent_stylist_api import router as stylist_router
    app.include_router(stylist_router)
    print("智能造型师 API 路由已加载")
except Exception as e:
    print(f"智能造型师 API 加载失败: {e}")

try:
    from services.visual_outfit_api import router as visual_router
    app.include_router(visual_router)
    print("可视化穿搭 API 路由已加载")
except Exception as e:
    print(f"可视化穿搭 API 加载失败: {e}")

try:
    from services.hallucination.api import router as hallucination_router
    app.include_router(hallucination_router)
    print("幻觉检测 API 路由已加载")
except Exception as e:
    print(f"幻觉检测 API 加载失败: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
