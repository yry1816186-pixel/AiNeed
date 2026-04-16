from __future__ import annotations

import logging
from typing import Literal, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from ml.api.middleware.error_handler import InferenceError
from ml.services.tryon.virtual_tryon_service import virtual_tryon_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/virtual-tryon", tags=["virtual-tryon"])


class GenerateTryOnRequest(BaseModel):
    person_image_url: str = Field(
        ..., max_length=10_000_000, description="Person photo base64"
    )
    garment_image_url: str = Field(
        ..., max_length=10_000_000, description="Garment image base64"
    )
    category: Literal["upper_body", "lower_body", "dress", "full_body"] = Field(
        default="upper_body", description="Clothing category"
    )
    prompt: Optional[str] = Field(default=None, description="Custom generation prompt")


class GenerateTryOnResponse(BaseModel):
    success: bool
    result_url: Optional[str] = None
    provider: Optional[str] = None
    processing_time: Optional[float] = None
    error: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    doubao_configured: bool
    glm_configured: bool


@router.post("/generate", response_model=GenerateTryOnResponse)
async def generate_tryon(request: GenerateTryOnRequest) -> GenerateTryOnResponse:
    try:
        result = await virtual_tryon_service.generate_tryon(
            person_image=request.person_image_url,
            garment_image=request.garment_image_url,
            category=request.category,
            prompt=request.prompt,
        )
        logger.info("virtual try-on completed", extra={"service": "tryon", "endpoint": "generate", "category": request.category})
        return GenerateTryOnResponse(**result)
    except InferenceError:
        raise
    except Exception as e:
        logger.error("virtual try-on failed", extra={"service": "tryon", "endpoint": "generate", "error": str(e)})
        raise InferenceError(message="Image generation failed. Please try again.")


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    return HealthResponse(
        status="ok",
        doubao_configured=bool(virtual_tryon_service.doubao_api_key),
        glm_configured=bool(virtual_tryon_service.glm_api_key),
    )
