"""
智能造型师 API - FastAPI 端点
提供 GLM-5 驱动的个人形象定制服务
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

from ml.services.intelligent_stylist_service import (
    IntelligentStylistService,
    UserProfile,
    SceneContext,
    get_stylist_service
)

router = APIRouter(prefix="/api/stylist/v2", tags=["Intelligent Stylist"])


class UserProfileInput(BaseModel):
    body_type: Optional[str] = Field(None, description="体型: rectangle/triangle/inverted_triangle/hourglass/oval")
    skin_tone: Optional[str] = Field(None, description="肤色: fair/light/medium/olive/tan/dark")
    color_season: Optional[str] = Field(None, description="色彩季型: spring/summer/autumn/winter")
    face_shape: Optional[str] = Field(None, description="脸型")
    height: Optional[int] = Field(None, description="身高(cm)")
    weight: Optional[int] = Field(None, description="体重(kg)")
    age_range: Optional[str] = Field(None, description="年龄段")
    gender: Optional[str] = Field(None, description="性别")
    style_preferences: List[str] = Field(default_factory=list, description="偏好风格")
    style_avoidances: List[str] = Field(default_factory=list, description="避免风格")
    color_preferences: List[str] = Field(default_factory=list, description="偏好颜色")
    budget_range: Optional[Dict[str, int]] = Field(None, description="预算范围 {min, max}")
    lifestyle: List[str] = Field(default_factory=list, description="生活方式")
    occupation: Optional[str] = Field(None, description="职业")
    fashion_goals: List[str] = Field(default_factory=list, description="穿搭目标")


class SceneContextInput(BaseModel):
    occasion: Optional[str] = Field(None, description="场合: interview/work/date/travel/party/daily/campus")
    weather: Optional[str] = Field(None, description="天气描述")
    season: Optional[str] = Field(None, description="季节: spring/summer/fall/winter")
    time_of_day: Optional[str] = Field(None, description="时间段")
    formality_level: Optional[str] = Field(None, description="正式程度: low/medium/medium_high/high")
    special_requirements: List[str] = Field(default_factory=list, description="特殊需求")


class OutfitRequest(BaseModel):
    user_profile: UserProfileInput
    scene_context: SceneContextInput
    user_request: str = Field(default="", description="用户的额外需求描述")


class ChatMessage(BaseModel):
    role: str = Field(..., description="消息角色: user/assistant")
    content: str = Field(..., description="消息内容")


class ChatRequest(BaseModel):
    message: str = Field(..., description="用户消息")
    conversation_history: List[ChatMessage] = Field(default_factory=list, description="对话历史")
    user_profile: Optional[UserProfileInput] = Field(None, description="用户档案")


class BodyAnalysisRequest(BaseModel):
    description: str = Field(..., description="用户对自己身材的描述")


@router.post("/outfit-recommendation")
async def get_outfit_recommendation(request: OutfitRequest) -> Dict[str, Any]:
    """
    获取个性化穿搭推荐
    基于用户档案、场景需求和时尚趋势生成完整的穿搭方案
    """
    try:
        service = await get_stylist_service()
        
        user_profile = UserProfile(
            body_type=request.user_profile.body_type,
            skin_tone=request.user_profile.skin_tone,
            color_season=request.user_profile.color_season,
            face_shape=request.user_profile.face_shape,
            height=request.user_profile.height,
            weight=request.user_profile.weight,
            age_range=request.user_profile.age_range,
            gender=request.user_profile.gender,
            style_preferences=request.user_profile.style_preferences,
            style_avoidances=request.user_profile.style_avoidances,
            color_preferences=request.user_profile.color_preferences,
            budget_range=request.user_profile.budget_range,
            lifestyle=request.user_profile.lifestyle,
            occupation=request.user_profile.occupation,
            fashion_goals=request.user_profile.fashion_goals
        )
        
        scene_context = SceneContext(
            occasion=request.scene_context.occasion,
            weather=request.scene_context.weather,
            season=request.scene_context.season,
            time_of_day=request.scene_context.time_of_day,
            formality_level=request.scene_context.formality_level,
            special_requirements=request.scene_context.special_requirements
        )
        
        result = await service.generate_outfit_recommendation(
            user_profile=user_profile,
            scene_context=scene_context,
            user_request=request.user_request
        )
        
        return {
            "success": True,
            "data": result,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"推荐生成失败: {str(e)}")


@router.post("/chat")
async def chat_with_stylist(request: ChatRequest) -> Dict[str, Any]:
    """
    与智能造型师对话
    支持上下文连续对话，提供个性化的时尚建议
    """
    try:
        service = await get_stylist_service()
        
        user_profile = None
        if request.user_profile:
            user_profile = UserProfile(
                body_type=request.user_profile.body_type,
                skin_tone=request.user_profile.skin_tone,
                color_season=request.user_profile.color_season,
                height=request.user_profile.height,
                weight=request.user_profile.weight,
                style_preferences=request.user_profile.style_preferences,
                lifestyle=request.user_profile.lifestyle,
                occupation=request.user_profile.occupation
            )
        
        history = [{"role": msg.role, "content": msg.content} for msg in request.conversation_history]
        
        response = await service.chat_interaction(
            user_message=request.message,
            conversation_history=history,
            user_profile=user_profile
        )
        
        return {
            "success": True,
            "response": response,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"对话失败: {str(e)}")


@router.post("/analyze-body-type")
async def analyze_body_type(request: BodyAnalysisRequest) -> Dict[str, Any]:
    """
    分析用户体型
    基于用户自然语言描述判断体型类型并提供建议
    """
    try:
        service = await get_stylist_service()
        
        result = await service.analyze_body_type(request.description)
        
        return {
            "success": True,
            "data": result,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"分析失败: {str(e)}")


@router.get("/fashion-trends/{season}")
async def get_fashion_trends(season: str) -> Dict[str, Any]:
    """
    获取指定季节的时尚趋势
    """
    valid_seasons = ["spring", "summer", "fall", "winter"]
    if season.lower() not in valid_seasons:
        raise HTTPException(status_code=400, detail=f"无效的季节，请选择: {valid_seasons}")
    
    service = await get_stylist_service()
    trends = service.FASHION_TRENDS_2025.get(season.lower(), {})
    
    return {
        "success": True,
        "season": season,
        "trends": trends,
        "timestamp": datetime.now().isoformat()
    }


@router.get("/color-guide/{color_season}")
async def get_color_guide(color_season: str) -> Dict[str, Any]:
    """
    获取色彩季型指南
    """
    valid_seasons = ["spring", "summer", "autumn", "winter"]
    if color_season.lower() not in valid_seasons:
        raise HTTPException(status_code=400, detail=f"无效的色彩季型，请选择: {valid_seasons}")
    
    service = await get_stylist_service()
    guide = service.COLOR_SEASON_GUIDE.get(color_season.lower(), {})
    
    return {
        "success": True,
        "color_season": color_season,
        "guide": guide,
        "timestamp": datetime.now().isoformat()
    }


@router.get("/body-type-guide/{body_type}")
async def get_body_type_guide(body_type: str) -> Dict[str, Any]:
    """
    获取体型穿搭指南
    """
    valid_types = ["rectangle", "triangle", "inverted_triangle", "hourglass", "oval"]
    if body_type.lower() not in valid_types:
        raise HTTPException(status_code=400, detail=f"无效的体型，请选择: {valid_types}")
    
    service = await get_stylist_service()
    guide = service.BODY_TYPE_GUIDE.get(body_type.lower(), {})
    
    return {
        "success": True,
        "body_type": body_type,
        "guide": guide,
        "timestamp": datetime.now().isoformat()
    }


@router.get("/occasion-guide/{occasion}")
async def get_occasion_guide(occasion: str) -> Dict[str, Any]:
    """
    获取场合穿搭指南
    """
    valid_occasions = ["interview", "work", "date", "travel", "party", "daily", "campus"]
    if occasion.lower() not in valid_occasions:
        raise HTTPException(status_code=400, detail=f"无效的场合，请选择: {valid_occasions}")
    
    service = await get_stylist_service()
    guide = service.OCCASION_GUIDE.get(occasion.lower(), {})
    
    return {
        "success": True,
        "occasion": occasion,
        "guide": guide,
        "timestamp": datetime.now().isoformat()
    }


@router.get("/health")
async def health_check():
    """
    健康检查
    """
    return {
        "status": "healthy",
        "service": "intelligent-stylist",
        "model": "GLM-5",
        "timestamp": datetime.now().isoformat()
    }
