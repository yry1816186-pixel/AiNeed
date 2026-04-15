from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from ml.api.schemas.style_analysis import (
    StyleAnalysisRequest,
    StyleAnalysisResponse,
    StyleSuggestionsRequest,
    StyleSuggestionsResponse,
    OutfitSuggestionResponse,
)

logger = logging.getLogger(__name__)

try:
    from ml.services.style_understanding_service import (
        StyleUnderstandingAPI,
        StyleUnderstandingService,
        StyleUnderstandingUnavailableError,
    )
    _style_api = StyleUnderstandingAPI(StyleUnderstandingService())
    _service_available = True
except Exception as e:
    logger.warning(f"StyleUnderstandingAPI import failed: {e}")
    _style_api = None
    _service_available = False

router = APIRouter(prefix="/api/style", tags=["style-analysis"])


@router.post("/analyze", response_model=StyleAnalysisResponse)
async def analyze_style(request: StyleAnalysisRequest):
    if not _service_available or _style_api is None:
        raise HTTPException(status_code=503, detail="Style analysis service unavailable")

    try:
        result = await _style_api.analyze(
            user_input=request.user_input,
            user_profile=request.user_profile,
        )
        return StyleAnalysisResponse(**result)
    except StyleUnderstandingUnavailableError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"message": exc.message, "backend": exc.backend, "reason": exc.reason},
        )
    except Exception as e:
        logger.error(f"Style analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/suggestions", response_model=StyleSuggestionsResponse)
async def get_style_suggestions(request: StyleSuggestionsRequest):
    if not _service_available or _style_api is None:
        raise HTTPException(status_code=503, detail="Style analysis service unavailable")

    try:
        result = await _style_api.get_suggestions(
            user_input=request.user_input,
            body_type=request.body_type,
            occasion=request.occasion,
        )
        style_analysis = StyleAnalysisResponse(**result.get("style_analysis", {}))
        outfit_suggestions = [
            OutfitSuggestionResponse(**s) for s in result.get("outfit_suggestions", [])
        ]
        return StyleSuggestionsResponse(
            style_analysis=style_analysis,
            outfit_suggestions=outfit_suggestions,
            embedding_prompts=result.get("embedding_prompts", []),
            style_weights=result.get("style_weights", {}),
        )
    except StyleUnderstandingUnavailableError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"message": exc.message, "backend": exc.backend, "reason": exc.reason},
        )
    except Exception as e:
        logger.error(f"Style suggestions failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/quick-match")
async def quick_match_style(user_input: str = Query(..., description="User input text")):
    if not _service_available or _style_api is None:
        raise HTTPException(status_code=503, detail="Style analysis service unavailable")

    try:
        style_name, confidence = _style_api.quick_match_style(user_input)
        return {"style_name": style_name, "confidence": confidence}
    except Exception as e:
        logger.error(f"Quick match failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
