"""
可视化穿搭方�?API
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

from ml.services.tryon.visual_outfit_service import (
    VisualOutfitService,
    UserImageInfo,
    get_visual_outfit_service
)

router = APIRouter(prefix="/api/visual-outfit", tags=["Visual Outfit"])


class UserProfileInput(BaseModel):
    body_type: Optional[str] = Field(None, description="体型")
    skin_tone: Optional[str] = Field(None, description="肤色")
    color_season: Optional[str] = Field(None, description="色彩季型")
    height: Optional[int] = Field(None, description="身高(cm)")
    weight: Optional[int] = Field(None, description="体重(kg)")
    style_preferences: List[str] = Field(default_factory=list, description="偏好风格")
    budget_range: Optional[Dict[str, int]] = Field(None, description="预算范围")


class SceneContextInput(BaseModel):
    occasion: Optional[str] = Field(None, description="场合")
    season: Optional[str] = Field(None, description="季节")
    weather: Optional[str] = Field(None, description="天气")
    formality_level: Optional[str] = Field(None, description="正式程度")


class UserImageInput(BaseModel):
    url: str = Field(..., description="用户照片URL")
    body_type: Optional[str] = Field(None, description="识别的体�?)
    skin_tone: Optional[str] = Field(None, description="识别的肤�?)


class VisualOutfitRequest(BaseModel):
    user_profile: UserProfileInput
    scene_context: SceneContextInput
    user_image: Optional[UserImageInput] = Field(None, description="用户照片（用于虚拟试衣）")
    user_request: str = Field(default="", description="用户需求描�?)


@router.post("/generate")
async def generate_visual_outfit(request: VisualOutfitRequest) -> Dict[str, Any]:
    """
    生成可视化穿搭方�?    
    返回包含�?    - 真实商品图片和购买链�?    - 搭配建议和理�?    - 虚拟试衣效果（如果提供了用户照片�?    """
    try:
        service = await get_visual_outfit_service()
        
        user_profile = {
            "body_type": request.user_profile.body_type,
            "skin_tone": request.user_profile.skin_tone,
            "color_season": request.user_profile.color_season,
            "height": request.user_profile.height,
            "weight": request.user_profile.weight,
            "style_preferences": request.user_profile.style_preferences,
            "budget_range": request.user_profile.budget_range or {}
        }
        
        scene_context = {
            "occasion": request.scene_context.occasion,
            "season": request.scene_context.season,
            "weather": request.scene_context.weather,
            "formality_level": request.scene_context.formality_level
        }
        
        user_image = None
        if request.user_image:
            user_image = UserImageInfo(
                url=request.user_image.url,
                body_type=request.user_image.body_type,
                skin_tone=request.user_image.skin_tone
            )
        
        result = await service.generate_visual_outfit(
            user_profile=user_profile,
            scene_context=scene_context,
            user_image=user_image,
            user_request=request.user_request
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"穿搭方案生成失败: {str(e)}")


@router.post("/try-on")
async def generate_virtual_tryon(
    user_image_url: str,
    cloth_image_url: str,
    category: str = "upper_body"
) -> Dict[str, Any]:
    """
    单独生成虚拟试衣效果
    
    参数�?    - user_image_url: 用户全身照URL
    - cloth_image_url: 服装图片URL
    - category: 服装类别 (upper_body/lower_body/full_body)
    """
    try:
        from ml.services.tryon.virtual_tryon_service import virtual_tryon_service

        result = await virtual_tryon_service.generate_tryon(
            person_image_url=user_image_url,
            garment_image_url=cloth_image_url,
            category=category,
        )

        if result.get("success"):
            return {
                "success": True,
                "result_url": result.get("result_url"),
                "generated_at": datetime.now().isoformat()
            }
        else:
            raise HTTPException(
                status_code=503,
                detail=result.get("error", "虚拟试衣服务暂时不可�?)
            )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"虚拟试衣失败: {str(e)}")


@router.get("/health")
async def health_check():
    """健康检�?""
    return {
        "status": "healthy",
        "service": "visual-outfit",
        "features": {
            "outfit_generation": True,
            "virtual_tryon": bool(os.getenv("GLM_API_KEY")),
            "ecommerce_api": bool(os.getenv("TAOBAO_APP_KEY") or os.getenv("JD_APP_KEY"))
        },
        "timestamp": datetime.now().isoformat()
    }
