from __future__ import annotations

from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class FashionRecommendRequest(BaseModel):
    user_input: str = Field(..., description="用户风格描述")
    user_profile: Optional[Dict] = Field(None, description="用户画像信息")
    occasion: Optional[str] = Field(None, description="场合: interview/work/date/travel/party/daily/campus")
    category: Optional[str] = Field(None, description="服装类别: tops/bottoms/dresses/outerwear/footwear/accessories")
    top_k: int = Field(default=10, ge=1, le=50, description="返回推荐数量")


class OutfitRecommendRequest(BaseModel):
    user_input: str = Field(..., description="用户风格描述")
    user_profile: Optional[Dict] = Field(None, description="用户画像信息")
    occasion: Optional[str] = Field(None, description="场合")


class RecommendationResultResponse(BaseModel):
    item_id: str
    score: float
    category: str
    style_tags: List[str] = Field(default_factory=list)
    color_tags: List[str] = Field(default_factory=list)
    reasons: List[str] = Field(default_factory=list)
    image_url: Optional[str] = None
    price: Optional[float] = None
    brand: Optional[str] = None


class FashionRecommendResponse(BaseModel):
    style_analysis: Dict
    recommendations: List[RecommendationResultResponse]
    total: int


class OutfitRecommendResponse(BaseModel):
    outfit_id: str
    style_analysis: Dict
    items: List[RecommendationResultResponse]
    compatibility_score: float
    total_price: Optional[float] = None
