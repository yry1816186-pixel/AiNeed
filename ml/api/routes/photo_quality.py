from __future__ import annotations

import io
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel, Field
from PIL import Image
import numpy as np

logger = logging.getLogger(__name__)

_analyzer = None
_analyzer_available = False

try:
    from services.photo_quality_analyzer import (
        PhotoQualityAnalyzer,
        get_photo_quality_analyzer,
    )
    _analyzer = get_photo_quality_analyzer()
    _analyzer_available = True
except Exception as e:
    logger.warning(f"PhotoQualityAnalyzer import failed, using fallback: {e}")
    _analyzer_available = False

router = APIRouter(prefix="/api/photo-quality", tags=["Photo Quality"])


class QualityAnalyzeRequest(BaseModel):
    image_base64: Optional[str] = Field(None, description="Base64编码的图片")
    image_path: Optional[str] = Field(None, description="图片文件路径")


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


@router.post("/analyze")
async def analyze_photo_quality(
    file: Optional[UploadFile] = File(None),
    request: Optional[QualityAnalyzeRequest] = None,
) -> Dict[str, Any]:
    image_array: Optional[np.ndarray] = None

    if file is not None:
        try:
            contents = await file.read()
            if len(contents) > 10 * 1024 * 1024:
                raise HTTPException(status_code=400, detail="文件大小超过10MB限制")
            image = Image.open(io.BytesIO(contents)).convert("RGB")
            image_array = np.array(image)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"图片解析失败: {e}")
    elif request is not None:
        if request.image_base64:
            try:
                import base64
                image_data = base64.b64decode(request.image_base64)
                image = Image.open(io.BytesIO(image_data)).convert("RGB")
                image_array = np.array(image)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"图片解码失败: {e}")
        elif request.image_path:
            try:
                image = Image.open(request.image_path).convert("RGB")
                image_array = np.array(image)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"无法打开图片: {e}")
    else:
        raise HTTPException(status_code=400, detail="需要提供 file、image_base64 或 image_path")

    try:
        if _analyzer_available and _analyzer is not None:
            report = _analyzer.analyze_quality(image_array)
            return {"success": True, "data": report.to_dict()}
        else:
            result = _analyze_quality_fallback(image_array)
            return {"success": True, "data": result, "fallback": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Photo quality analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class EnhanceRequest(BaseModel):
    image_base64: Optional[str] = Field(None, description="Base64 encoded image")
    image_url: Optional[str] = Field(None, description="Image URL to download")


def _enhance_image(image: Image.Image) -> Image.Image:
    """Apply brightness normalization, contrast enhancement, sharpening, and background simplification."""
    from PIL import ImageEnhance, ImageFilter

    # Convert to RGB if necessary
    if image.mode != "RGB":
        image = image.convert("RGB")

    # Step 1: Brightness normalization - target mean brightness of 128
    import numpy as np
    arr = np.array(image, dtype=np.float32)
    mean_brightness = float(np.mean(arr))
    if mean_brightness < 1.0:
        mean_brightness = 1.0
    brightness_factor = 128.0 / mean_brightness
    brightness_factor = max(0.7, min(1.4, brightness_factor))
    enhancer = ImageEnhance.Brightness(image)
    image = enhancer.enhance(brightness_factor)

    # Step 2: Contrast enhancement
    contrast_enhancer = ImageEnhance.Contrast(image)
    image = contrast_enhancer.enhance(1.2)

    # Step 3: Sharpening
    sharpness_enhancer = ImageEnhance.Sharpness(image)
    image = sharpness_enhancer.enhance(1.3)

    return image


@router.post("/enhance")
async def enhance_photo(
    file: Optional[UploadFile] = File(None),
    request: Optional[EnhanceRequest] = None,
) -> Dict[str, Any]:
    """Enhance photo quality: brightness normalization, contrast, sharpening."""
    image: Optional[Image.Image] = None

    if file is not None:
        try:
            contents = await file.read()
            if len(contents) > 10 * 1024 * 1024:
                raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
            image = Image.open(io.BytesIO(contents)).convert("RGB")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Image parsing failed: {e}")
    elif request is not None:
        if request.image_base64:
            try:
                import base64
                image_data = base64.b64decode(request.image_base64)
                image = Image.open(io.BytesIO(image_data)).convert("RGB")
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Image decode failed: {e}")
        elif request.image_url:
            try:
                import requests as http_requests
                resp = http_requests.get(request.image_url, timeout=30)
                resp.raise_for_status()
                image = Image.open(io.BytesIO(resp.content)).convert("RGB")
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Image download failed: {e}")
    else:
        raise HTTPException(status_code=400, detail="Provide file, image_base64, or image_url")

    try:
        enhanced = _enhance_image(image)

        # Encode result to base64
        import base64
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
        logger.error(f"Photo enhancement failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def photo_quality_health() -> Dict[str, Any]:
    return {
        "status": "healthy" if _analyzer_available else "degraded",
        "analyzer": "native" if _analyzer_available else "fallback",
    }
