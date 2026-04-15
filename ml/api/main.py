from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from prometheus_client import make_asgi_app

from ml.api.config import settings
from ml.api.middleware.auth import APIKeyMiddleware
from ml.api.middleware.logging import RequestLoggingMiddleware
from ml.api.middleware.error_handler import (
    MLError,
    ModelNotLoadedError,
    InferenceError,
    RateLimitError,
    ValidationError,
    ml_error_handler,
    validation_error_handler,
    global_exception_handler,
)
from ml.api.routes.health import router as health_router
from ml.api.routes.tasks import router as tasks_router


# A-P2-15: 请求体大小限制中间件
class RequestBodySizeLimitMiddleware:
    """
    请求体大小限制中间件

    防止过大的请求体导致 OOM 或 DoS 攻击。
    默认限制 10MB，可通过环境变量 REQUEST_BODY_MAX_BYTES 配置。
    对于文件上传接口（如 /api/stylist/v2/tryon），限制放宽到 50MB。
    """

    # 默认请求体大小限制（10MB）
    DEFAULT_MAX_BODY_BYTES = 10 * 1024 * 1024

    # 文件上传相关路径的放宽限制（50MB）
    UPLOAD_MAX_BODY_BYTES = 50 * 1024 * 1024

    # 文件上传路径前缀
    UPLOAD_PATH_PREFIXES = (
        "/api/stylist/v2/tryon",
        "/api/virtual-tryon",
        "/api/body-analysis",
        "/api/style-analysis",
    )

    def __init__(self, app):
        self.app = app
        import os
        self._max_body_bytes = int(
            os.getenv("REQUEST_BODY_MAX_BYTES", self.DEFAULT_MAX_BODY_BYTES)
        )
        self._upload_max_body_bytes = int(
            os.getenv("UPLOAD_BODY_MAX_BYTES", self.UPLOAD_MAX_BODY_BYTES)
        )

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # 确定当前路径的大小限制
        path = scope.get("path", "")
        max_bytes = self._upload_max_body_bytes
        for prefix in self.UPLOAD_PATH_PREFIXES:
            if path.startswith(prefix):
                break
        else:
            max_bytes = self._max_body_bytes

        body_size = 0
        received_body_parts = []

        async def limited_receive():
            nonlocal body_size
            message = await receive()

            if message["type"] == "http.request":
                body = message.get("body", b"")
                body_size += len(body)
                received_body_parts.append(body)

                if body_size > max_bytes:
                    # 请求体过大，返回 413
                    raise RequestBodyTooLargeError(
                        max_bytes=max_bytes,
                        actual_bytes=body_size,
                    )

            return message

        try:
            await self.app(scope, limited_receive, send)
        except RequestBodyTooLargeError as e:
            # 构造 413 响应
            response = JSONResponse(
                status_code=413,
                content={
                    "error": "Request Entity Too Large",
                    "detail": f"Request body size ({e.actual_bytes} bytes) exceeds limit ({e.max_bytes} bytes)",
                    "max_size_bytes": e.max_bytes,
                },
            )
            await response(scope, receive, send)


class RequestBodyTooLargeError(Exception):
    """请求体过大异常"""

    def __init__(self, max_bytes: int, actual_bytes: int):
        self.max_bytes = max_bytes
        self.actual_bytes = actual_bytes
        super().__init__(
            f"Request body size ({actual_bytes} bytes) exceeds limit ({max_bytes} bytes)"
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.basicConfig(
        level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    logger = logging.getLogger(__name__)
    logger.info("ML API starting up (env=%s)", settings.ENVIRONMENT)

    yield

    logger.info("ML API shutting down")


app = FastAPI(
    title="寻裳 ML API",
    description="AI-driven personal styling service API",
    version="1.0.0",
    lifespan=lifespan,
)

cors_origins = settings.cors_origins_list
if settings.is_production and not cors_origins:
    logging.getLogger(__name__).warning(
        "CORS_ORIGINS not set in production. Using restrictive defaults."
    )
    cors_origins = []

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With", "X-ML-API-Key"],
)

# A-P2-15: 请求体大小限制中间件（必须在其他中间件之前注册，确保最先执行）
app.add_middleware(RequestBodySizeLimitMiddleware)

app.add_middleware(APIKeyMiddleware)
app.add_middleware(RequestLoggingMiddleware)

app.add_exception_handler(MLError, ml_error_handler)
app.add_exception_handler(RequestValidationError, validation_error_handler)
app.add_exception_handler(Exception, global_exception_handler)

metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

app.include_router(health_router)
app.include_router(tasks_router)

try:
    from ml.services.intelligent_stylist_api import router as stylist_router

    app.include_router(stylist_router)
    logging.getLogger(__name__).info("Intelligent stylist v2 API routes loaded at /api/stylist/v2")
except Exception as e:
    logging.getLogger(__name__).warning("Failed to load intelligent stylist API: %s", e)

try:
    from ml.services.visual_outfit_api import router as visual_router

    app.include_router(visual_router)
    logging.getLogger(__name__).info("Visual outfit API routes loaded")
except Exception as e:
    logging.getLogger(__name__).warning("Failed to load visual outfit API: %s", e)

try:
    from ml.api.routes.fashion_recommend import router as fashion_recommend_router

    app.include_router(fashion_recommend_router)
    logging.getLogger(__name__).info("Fashion recommendation routes loaded")
except Exception as e:
    logging.getLogger(__name__).warning("Failed to load fashion recommendation routes: %s", e)

try:
    from ml.api.routes.stylist_chat import router as stylist_chat_router

    app.include_router(stylist_chat_router)
    logging.getLogger(__name__).info("Stylist chat routes loaded")
except Exception as e:
    logging.getLogger(__name__).warning("Failed to load stylist chat routes: %s", e)

try:
    from ml.api.routes.photo_quality import router as photo_quality_router

    app.include_router(photo_quality_router)
    logging.getLogger(__name__).info("Photo quality routes loaded")
except Exception as e:
    logging.getLogger(__name__).warning("Failed to load photo quality routes: %s", e)

try:
    from ml.api.routes.body_analysis import router as body_analysis_router

    app.include_router(body_analysis_router)
    logging.getLogger(__name__).info("Body analysis API routes loaded")
except Exception as e:
    logging.getLogger(__name__).warning("Failed to load body analysis API: %s", e)

try:
    from ml.api.routes.style_analysis import router as style_analysis_router

    app.include_router(style_analysis_router)
    logging.getLogger(__name__).info("Style analysis API routes loaded")
except Exception as e:
    logging.getLogger(__name__).warning("Failed to load style analysis API: %s", e)

try:
    from ml.api.routes.virtual_tryon import router as virtual_tryon_router

    app.include_router(virtual_tryon_router)
    logging.getLogger(__name__).info("Virtual try-on API routes loaded")
except Exception as e:
    logging.getLogger(__name__).warning("Failed to load virtual try-on API: %s", e)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "ml.api.main:app",
        host=settings.ML_SERVICE_HOST,
        port=settings.ML_SERVICE_PORT,
        reload=settings.ENVIRONMENT == "development",
    )
