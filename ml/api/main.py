from __future__ import annotations

import sys
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
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

sys.path.insert(0, str(Path(__file__).parent.parent))


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
    from services.intelligent_stylist_api import router as stylist_router

    app.include_router(stylist_router)
    logging.getLogger(__name__).info("Intelligent stylist API routes loaded")
except Exception as e:
    logging.getLogger(__name__).warning("Failed to load intelligent stylist API: %s", e)

try:
    from services.visual_outfit_api import router as visual_router

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
