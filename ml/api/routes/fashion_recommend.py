from __future__ import annotations

import logging
import uuid
from typing import Dict

from fastapi import APIRouter, HTTPException

from ml.api.schemas.recommendation import (
    FashionRecommendRequest,
    FashionRecommendResponse,
    OutfitRecommendRequest,
    OutfitRecommendResponse,
    RecommendationResultResponse,
)

logger = logging.getLogger(__name__)

try:
    from ml.services.stylist.intelligent_style_recommender import StyleRecommendationAPI
    _recommender_service = StyleRecommendationAPI()
    _service_available = True
except Exception as e:
    logger.warning(f"StyleRecommendationAPI import failed: {e}")
    _recommender_service = None
    _service_available = False

router = APIRouter(prefix="/api/recommend", tags=["Fashion Recommendation"])


@router.post("/items", response_model=FashionRecommendResponse)
async def recommend_items(request: FashionRecommendRequest) -> FashionRecommendResponse:
    if not _service_available or _recommender_service is None:
        raise HTTPException(status_code=503, detail="推荐服务不可用")

    try:
        result = await _recommender_service.get_recommendations(
            user_input=request.user_input,
            user_profile=request.user_profile,
            occasion=request.occasion,
            category=request.category,
            top_k=request.top_k,
        )
        recommendations = [
            RecommendationResultResponse(**item) for item in result.get("recommendations", [])
        ]
        return FashionRecommendResponse(
            style_analysis=result.get("style_analysis", {}),
            recommendations=recommendations,
            total=result.get("total", 0),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"推荐生成失败: {e}")
        raise HTTPException(status_code=500, detail=f"推荐生成失败: {str(e)}")


@router.post("/outfit", response_model=OutfitRecommendResponse)
async def recommend_outfit(request: OutfitRecommendRequest) -> OutfitRecommendResponse:
    if not _service_available or _recommender_service is None:
        raise HTTPException(status_code=503, detail="推荐服务不可用")

    try:
        result = await _recommender_service.get_outfit_recommendation(
            user_input=request.user_input,
            user_profile=request.user_profile,
            occasion=request.occasion,
        )
        items = [
            RecommendationResultResponse(**item) for item in result.get("items", [])
        ]
        return OutfitRecommendResponse(
            outfit_id=result.get("outfit_id", str(uuid.uuid4())),
            style_analysis=result.get("style_analysis", {}),
            items=items,
            compatibility_score=result.get("compatibility_score", 0.0),
            total_price=result.get("total_price"),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"穿搭推荐生成失败: {e}")
        raise HTTPException(status_code=500, detail=f"穿搭推荐生成失败: {str(e)}")
