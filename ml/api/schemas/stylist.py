from __future__ import annotations

from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class StylistUserProfile(BaseModel):
    body_type: Optional[str] = Field(None, description="体型: rectangle/triangle/inverted_triangle/hourglass/oval")
    skin_tone: Optional[str] = Field(None, description="肤色: fair/light/medium/olive/tan/dark")
    color_season: Optional[str] = Field(None, description="色彩季型: spring/summer/autumn/winter")
    face_shape: Optional[str] = Field(None, description="脸型")
    height: Optional[int] = Field(None, ge=100, le=250, description="身高(cm)")
    weight: Optional[int] = Field(None, ge=20, le=300, description="体重(kg)")
    age_range: Optional[str] = Field(None, description="年龄段")
    gender: Optional[str] = Field(None, description="性别")
    style_preferences: List[str] = Field(default_factory=list, description="偏好风格")
    style_avoidances: List[str] = Field(default_factory=list, description="避免风格")
    color_preferences: List[str] = Field(default_factory=list, description="偏好颜色")
    budget_range: Optional[Dict[str, int]] = Field(None, description="预算范围 {min, max}")
    lifestyle: List[str] = Field(default_factory=list, description="生活方式")
    occupation: Optional[str] = Field(None, description="职业")
    fashion_goals: List[str] = Field(default_factory=list, description="穿搭目标")


class StylistSceneContext(BaseModel):
    occasion: Optional[str] = Field(None, description="场合: interview/work/date/travel/party/daily/campus")
    weather: Optional[str] = Field(None, description="天气描述")
    season: Optional[str] = Field(None, description="季节: spring/summer/fall/winter")
    time_of_day: Optional[str] = Field(None, description="时间段")
    formality_level: Optional[str] = Field(None, description="正式程度: low/medium/medium_high/high")
    special_requirements: List[str] = Field(default_factory=list, description="特殊需求")


class StylistChatRequest(BaseModel):
    session_id: str = Field(..., description="会话ID")
    message: str = Field(..., description="用户消息")
    user_profile: Optional[StylistUserProfile] = Field(None, description="用户画像")
    conversation_history: Optional[List[Dict]] = Field(None, description="对话历史")


class StylistOutfitRequest(BaseModel):
    user_profile: StylistUserProfile = Field(..., description="用户画像")
    scene_context: StylistSceneContext = Field(..., description="场景上下文")
    user_request: str = Field(default="", description="用户额外需求描述")


class StylistChatResponse(BaseModel):
    session_id: str
    reply: str
    timestamp: str


class StylistBodyAnalysisRequest(BaseModel):
    description: str = Field(..., description="用户对自己身材的描述")


class StylistBodyAnalysisResponse(BaseModel):
    body_type: str
    confidence: float
    analysis: str
    optimize_tips: List[str] = Field(default_factory=list)
    recommended_items: List[str] = Field(default_factory=list)
    avoid_items: List[str] = Field(default_factory=list)
