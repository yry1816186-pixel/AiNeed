from __future__ import annotations

import base64
import io
import logging
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, File, Query, UploadFile
from PIL import Image
import numpy as np

from ml.api.middleware.error_handler import ModelNotLoadedError, InferenceError, ValidationError
from ml.api.schemas.analysis import (
    BodyAnalysisRequest,
    BodyAnalysisResponse,
    BodyProfileResponse,
    BodyTypeQueryRequest,
    ClothingAdaptationResponse,
    EnhanceRequest,
    ItemFitRequest,
    ItemFitResponse,
    ItemFitResult,
    QualityAnalyzeRequest,
    StyleAnalysisRequest,
    StyleAnalysisResponse,
    StyleSuggestionsRequest,
    StyleSuggestionsResponse,
    OutfitSuggestionResponse,
)

logger = logging.getLogger(__name__)

try:
    from ml.services.analysis.body_analyzer import get_body_analyzer_service
    _body_service = get_body_analyzer_service()
    _body_available = True
except Exception as e:
    logger.warning(f"BodyAnalyzerService import failed: {e}")
    _body_service = None
    _body_available = False

try:
    from ml.services.stylist.style_understanding_service import (
        StyleUnderstandingAPI,
        StyleUnderstandingService,
        StyleUnderstandingUnavailableError,
    )
    _style_api = StyleUnderstandingAPI(StyleUnderstandingService())
    _style_available = True
except Exception as e:
    logger.warning(f"StyleUnderstandingAPI import failed: {e}")
    _style_api = None
    _style_available = False

try:
    from ml.services.analysis.photo_quality_analyzer import (
        PhotoQualityAnalyzer,
        get_photo_quality_analyzer,
    )
    _photo_analyzer = get_photo_quality_analyzer()
    _photo_available = True
except Exception as e:
    logger.warning(f"PhotoQualityAnalyzer import failed: {e}")
    _photo_analyzer = None
    _photo_available = False

router = APIRouter(prefix="/api/analysis", tags=["Analysis"])


def _analyze_quality_fallback(image_array: np.ndarray) -> Dict[str, Any]:
    h, w, c = image_array.shape
    gray = np.mean(image_array, axis=2)

    brightness = float(np.mean(gray))
    contrast = float(np.std(gray))

    laplacian = np.array([[0, 1, 0], [1, -4, 1], [0, 1, 0]])
    from scipy.ndimage import convolve
    sharpness_map = convolve(gray.astype(float), laplacian)
    sharpness = float(np.var(sharpness_map))

    quality_score = 50.0
    issues = []
    suggestions = []

    if brightness < 80:
        issues.append("underexposed")
        suggestions.append("增加曝光亮度")
        quality_score -= 15
    elif brightness > 200:
        issues.append("overexposed")
        suggestions.append("降低曝光亮度")
        quality_score -= 15
    else:
        quality_score += 10

    if contrast < 30:
        issues.append("low_contrast")
        suggestions.append("增加对比度")
        quality_score -= 10
    elif contrast > 80:
        quality_score += 5

    if sharpness < 100:
        issues.append("blurry")
        suggestions.append("照片模糊，请重新拍摄或使用更稳定的设备")
        quality_score -= 20
    else:
        quality_score += 10

    if h < 500 or w < 500:
        issues.append("low_resolution")
        suggestions.append("照片分辨率较低，建议使用更高分辨率的相机")
        quality_score -= 10

    quality_score = max(0.0, min(100.0, quality_score))

    return {
        "overall_score": round(quality_score, 1),
        "brightness": round(brightness, 1),
        "contrast": round(contrast, 1),
        "sharpness": round(sharpness, 1),
        "resolution": f"{w}x{h}",
        "issues": issues,
        "suggestions": suggestions,
        "suitable_for_analysis": quality_score >= 40,
    }


def _enhance_image(image: Image.Image) -> Image.Image:
    from PIL import ImageEnhance, ImageFilter

    if image.mode != "RGB":
        image = image.convert("RGB")

    arr = np.array(image, dtype=np.float32)
    mean_brightness = float(np.mean(arr))
    if mean_brightness < 1.0:
        mean_brightness = 1.0
    brightness_factor = 128.0 / mean_brightness
    brightness_factor = max(0.7, min(1.4, brightness_factor))
    enhancer = ImageEnhance.Brightness(image)
    image = enhancer.enhance(brightness_factor)

    contrast_enhancer = ImageEnhance.Contrast(image)
    image = contrast_enhancer.enhance(1.2)

    sharpness_enhancer = ImageEnhance.Sharpness(image)
    image = sharpness_enhancer.enhance(1.3)

    return image


# ---- Body Analysis ----

@router.post("/body/analyze", response_model=BodyAnalysisResponse)
async def analyze_body(
    file: Optional[UploadFile] = File(None),
    request: Optional[BodyAnalysisRequest] = None,
):
    if not _body_available or _body_service is None:
        raise ModelNotLoadedError(model_name="Body analysis service unavailable")

    image: Optional[Image.Image] = None

    if file is not None:
        contents = await file.read()
        try:
            image = Image.open(io.BytesIO(contents)).convert("RGB")
        except Exception as e:
            raise ValidationError(message=f"Invalid image file: {e}")
    elif request is not None:
        if request.image_base64:
            try:
                image_data = base64.b64decode(request.image_base64)
                image = Image.open(io.BytesIO(image_data)).convert("RGB")
            except Exception as e:
                raise ValidationError(message=f"Invalid base64 image: {e}")
        elif request.image_path:
            path = Path(request.image_path)
            if not path.exists():
                raise ValidationError(message=f"Image file not found: {request.image_path}")
            try:
                image = Image.open(str(path)).convert("RGB")
            except Exception as e:
                raise ValidationError(message=f"Cannot open image: {e}")
    else:
        raise ValidationError(message="No image provided. Use file upload or JSON body.")

    try:
        result = _body_service.analyze_user_photo(image)
    except Exception as e:
        logger.error("body analysis failed", extra={"service": "analysis", "endpoint": "body/analyze", "error": str(e)})
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

    return BodyAnalysisResponse(
        success=True,
        body_profile=body_profile,
        clothing_adaptations=clothing_adaptations,
        body_type_info=body_type_info_data,
    )


@router.post("/body/recommendations")
async def get_body_type_recommendations(request: BodyTypeQueryRequest):
    if not _body_available or _body_service is None:
        raise ModelNotLoadedError(model_name="Body analysis service unavailable")

    try:
        result = _body_service.get_recommendations_for_body_type(
            body_type=request.body_type,
            category=request.category,
        )
        return {"success": True, "data": result}
    except Exception as e:
        logger.error("body recommendations failed", extra={"service": "analysis", "endpoint": "body/recommendations", "error": str(e)})
        raise InferenceError(message=str(e))


@router.post("/body/fit-score", response_model=ItemFitResponse)
async def calculate_fit_score(request: ItemFitRequest):
    if not _body_available or _body_service is None:
        raise ModelNotLoadedError(model_name="Body analysis service unavailable")

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
        logger.error("fit score calculation failed", extra={"service": "analysis", "endpoint": "body/fit-score", "error": str(e)})
        raise InferenceError(message=str(e))


# ---- Style Analysis ----

@router.post("/style/analyze", response_model=StyleAnalysisResponse)
async def analyze_style(request: StyleAnalysisRequest):
    if not _style_available or _style_api is None:
        raise ModelNotLoadedError(model_name="Style analysis service unavailable")

    try:
        result = await _style_api.analyze(
            user_input=request.user_input,
            user_profile=request.user_profile,
        )
        return StyleAnalysisResponse(**result)
    except StyleUnderstandingUnavailableError as exc:
        raise InferenceError(
            message=exc.message,
            details={"backend": exc.backend, "reason": exc.reason},
        )
    except Exception as e:
        logger.error("style analysis failed", extra={"service": "analysis", "endpoint": "style/analyze", "error": str(e)})
        raise InferenceError(message=str(e))


@router.post("/style/suggestions", response_model=StyleSuggestionsResponse)
async def get_style_suggestions(request: StyleSuggestionsRequest):
    if not _style_available or _style_api is None:
        raise ModelNotLoadedError(model_name="Style analysis service unavailable")

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
        raise InferenceError(
            message=exc.message,
            details={"backend": exc.backend, "reason": exc.reason},
        )
    except Exception as e:
        logger.error("style suggestions failed", extra={"service": "analysis", "endpoint": "style/suggestions", "error": str(e)})
        raise InferenceError(message=str(e))


@router.get("/style/quick-match")
async def quick_match_style(user_input: str = Query(..., description="User input text")):
    if not _style_available or _style_api is None:
        raise ModelNotLoadedError(model_name="Style analysis service unavailable")

    try:
        style_name, confidence = _style_api.quick_match_style(user_input)
        return {"style_name": style_name, "confidence": confidence}
    except Exception as e:
        logger.error("style quick match failed", extra={"service": "analysis", "endpoint": "style/quick-match", "error": str(e)})
        raise InferenceError(message=str(e))


# ---- Photo Quality ----

@router.post("/photo/analyze")
async def analyze_photo_quality(
    file: Optional[UploadFile] = File(None),
    request: Optional[QualityAnalyzeRequest] = None,
) -> Dict[str, Any]:
    image_array: Optional[np.ndarray] = None

    if file is not None:
        try:
            contents = await file.read()
            if len(contents) > 10 * 1024 * 1024:
                raise ValidationError(message="文件大小超过10MB限制")
            image = Image.open(io.BytesIO(contents)).convert("RGB")
            image_array = np.array(image)
        except (ModelNotLoadedError, InferenceError, ValidationError):
            raise
        except Exception as e:
            raise ValidationError(message=f"图片解析失败: {e}")
    elif request is not None:
        if request.image_base64:
            try:
                image_data = base64.b64decode(request.image_base64)
                image = Image.open(io.BytesIO(image_data)).convert("RGB")
                image_array = np.array(image)
            except Exception as e:
                raise ValidationError(message=f"图片解码失败: {e}")
        elif request.image_path:
            try:
                image = Image.open(request.image_path).convert("RGB")
                image_array = np.array(image)
            except Exception as e:
                raise ValidationError(message=f"无法打开图片: {e}")
    else:
        raise ValidationError(message="需要提供 file、image_base64 或 image_path")

    try:
        if _photo_available and _photo_analyzer is not None:
            report = _photo_analyzer.analyze_quality(image_array)
            return {"success": True, "data": report.to_dict()}
        else:
            result = _analyze_quality_fallback(image_array)
            return {"success": True, "data": result, "fallback": True}
    except (ModelNotLoadedError, InferenceError, ValidationError):
        raise
    except Exception as e:
        logger.error("photo quality analysis failed", extra={"service": "analysis", "endpoint": "photo/analyze", "error": str(e)})
        raise InferenceError(message=str(e))


@router.post("/photo/enhance")
async def enhance_photo(
    file: Optional[UploadFile] = File(None),
    request: Optional[EnhanceRequest] = None,
) -> Dict[str, Any]:
    image: Optional[Image.Image] = None

    if file is not None:
        try:
            contents = await file.read()
            if len(contents) > 10 * 1024 * 1024:
                raise ValidationError(message="File size exceeds 10MB limit")
            image = Image.open(io.BytesIO(contents)).convert("RGB")
        except (ModelNotLoadedError, InferenceError, ValidationError):
            raise
        except Exception as e:
            raise ValidationError(message=f"Image parsing failed: {e}")
    elif request is not None:
        if request.image_base64:
            try:
                image_data = base64.b64decode(request.image_base64)
                image = Image.open(io.BytesIO(image_data)).convert("RGB")
            except Exception as e:
                raise ValidationError(message=f"Image decode failed: {e}")
        elif request.image_url:
            try:
                import requests as http_requests
                resp = http_requests.get(request.image_url, timeout=30)
                resp.raise_for_status()
                image = Image.open(io.BytesIO(resp.content)).convert("RGB")
            except Exception as e:
                raise ValidationError(message=f"Image download failed: {e}")
    else:
        raise ValidationError(message="Provide file, image_base64, or image_url")

    try:
        enhanced = _enhance_image(image)

        buf = io.BytesIO()
        enhanced.save(buf, format="JPEG", quality=90)
        enhanced_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

        return {
            "success": True,
            "data": {
                "image_base64": enhanced_b64,
                "format": "jpeg",
                "width": enhanced.width,
                "height": enhanced.height,
            },
        }
    except Exception as e:
        logger.error("photo enhancement failed", extra={"service": "analysis", "endpoint": "photo/enhance", "error": str(e)})
        raise InferenceError(message=str(e))


@router.get("/photo/health")
async def photo_quality_health() -> Dict[str, Any]:
    return {
        "status": "healthy" if _photo_available else "degraded",
        "analyzer": "native" if _photo_available else "fallback",
    }


# ---- Analysis Health ----

@router.get("/health")
async def analysis_health() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "services": {
            "body_analysis": _body_available,
            "style_analysis": _style_available,
            "photo_quality": _photo_available,
        },
    }
