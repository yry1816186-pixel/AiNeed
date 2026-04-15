from __future__ import annotations

import base64
import io
import logging
import uuid
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, File, HTTPException, UploadFile
from PIL import Image

from ml.api.schemas.body_analysis import (
    BodyAnalysisRequest,
    BodyAnalysisResponse,
    BodyProfileResponse,
    BodyTypeQueryRequest,
    ClothingAdaptationResponse,
    ItemFitRequest,
    ItemFitResponse,
    ItemFitResult,
)

logger = logging.getLogger(__name__)

try:
    from ml.services.body_analyzer import get_body_analyzer_service
    _body_service = get_body_analyzer_service()
    _service_available = True
except Exception as e:
    logger.warning(f"BodyAnalyzerService import failed: {e}")
    _body_service = None
    _service_available = False

router = APIRouter(prefix="/api/body-analysis", tags=["body-analysis"])

_pending_tasks: Dict[str, Dict[str, Any]] = {}


@router.post("/analyze", response_model=BodyAnalysisResponse)
async def analyze_body(
    file: Optional[UploadFile] = File(None),
    request: Optional[BodyAnalysisRequest] = None,
):
    if not _service_available or _body_service is None:
        raise HTTPException(status_code=503, detail="Body analysis service unavailable")

    image: Optional[Image.Image] = None

    if file is not None:
        contents = await file.read()
        try:
            image = Image.open(io.BytesIO(contents)).convert("RGB")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid image file: {e}")
    elif request is not None:
        if request.image_base64:
            try:
                image_data = base64.b64decode(request.image_base64)
                image = Image.open(io.BytesIO(image_data)).convert("RGB")
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Invalid base64 image: {e}")
        elif request.image_path:
            path = Path(request.image_path)
            if not path.exists():
                raise HTTPException(status_code=400, detail=f"Image file not found: {request.image_path}")
            try:
                image = Image.open(str(path)).convert("RGB")
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Cannot open image: {e}")
    else:
        raise HTTPException(status_code=400, detail="No image provided. Use file upload or JSON body.")

    task_id = str(uuid.uuid4())

    try:
        result = _body_service.analyze_user_photo(image)
    except Exception as e:
        logger.error(f"Body analysis failed: {e}")
        return BodyAnalysisResponse(success=False, error=str(e))

    if not result.get("success", False):
        return BodyAnalysisResponse(
            success=False,
            error=result.get("error", "Unknown error"),
        )

    body_profile_data = result.get("body_profile", {})
    clothing_adaptations_data = result.get("clothing_adaptations", {})
    body_type_info_data = result.get("body_type_info")

    body_profile = BodyProfileResponse(
        body_type=body_profile_data.get("body_type", "rectangle"),
        confidence=body_profile_data.get("confidence", 0.0),
        proportions=body_profile_data.get("proportions", {}),
        measurements=body_profile_data.get("measurements", {}),
        skin_tone=body_profile_data.get("skin_tone", "medium"),
        color_season=body_profile_data.get("color_season", "autumn"),
    )

    clothing_adaptations = ClothingAdaptationResponse(
        suitable_styles=clothing_adaptations_data.get("suitable_styles", []),
        avoid_styles=clothing_adaptations_data.get("avoid_styles", []),
        emphasis=clothing_adaptations_data.get("emphasis", ""),
        styling_tips=clothing_adaptations_data.get("styling_tips", []),
        best_cuts=clothing_adaptations_data.get("best_cuts", []),
        best_patterns=clothing_adaptations_data.get("best_patterns", []),
        best_colors=clothing_adaptations_data.get("best_colors", []),
    )

    _pending_tasks[task_id] = {"status": "completed", "result": result}

    return BodyAnalysisResponse(
        success=True,
        body_profile=body_profile,
        clothing_adaptations=clothing_adaptations,
        body_type_info=body_type_info_data,
    )


@router.post("/recommendations")
async def get_body_type_recommendations(request: BodyTypeQueryRequest):
    if not _service_available or _body_service is None:
        raise HTTPException(status_code=503, detail="Body analysis service unavailable")

    try:
        result = _body_service.get_recommendations_for_body_type(
            body_type=request.body_type,
            category=request.category,
        )
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Get recommendations failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/fit-score", response_model=ItemFitResponse)
async def calculate_fit_score(request: ItemFitRequest):
    if not _service_available or _body_service is None:
        raise HTTPException(status_code=503, detail="Body analysis service unavailable")

    try:
        ranked = _body_service.rank_items_by_fit(
            items=request.items,
            body_profile=request.body_profile,
        )
        results = [
            ItemFitResult(
                item_id=item.get("item_id", ""),
                item_name=item.get("item_name", ""),
                category=item.get("category", ""),
                fit_score=item.get("fit_score", 0.0),
                recommendation=item.get("recommendation", ""),
                scores=item.get("scores", {}),
            )
            for item in ranked
        ]
        return ItemFitResponse(results=results)
    except Exception as e:
        logger.error(f"Fit score calculation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
