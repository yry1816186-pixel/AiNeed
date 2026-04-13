from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class BodyAnalysisRequest(BaseModel):
    image_base64: Optional[str] = Field(None, description="Base64 encoded image")
    image_path: Optional[str] = Field(None, description="Image file path")


class BodyTypeQueryRequest(BaseModel):
    body_type: str = Field(..., description="Body type: rectangle/hourglass/triangle/inverted_triangle/oval")
    category: Optional[str] = Field(None, description="Clothing category filter")


class ItemFitRequest(BaseModel):
    items: List[Dict[str, Any]] = Field(..., description="List of clothing items to rank")
    body_profile: Dict[str, Any] = Field(..., description="User body profile")


class BodyProfileResponse(BaseModel):
    body_type: str
    confidence: float
    proportions: Dict[str, float] = Field(default_factory=dict)
    measurements: Dict[str, float] = Field(default_factory=dict)
    skin_tone: str = "medium"
    color_season: str = "autumn"


class ClothingAdaptationResponse(BaseModel):
    suitable_styles: List[str] = Field(default_factory=list)
    avoid_styles: List[str] = Field(default_factory=list)
    emphasis: str = ""
    styling_tips: List[str] = Field(default_factory=list)
    best_cuts: List[str] = Field(default_factory=list)
    best_patterns: List[str] = Field(default_factory=list)
    best_colors: List[str] = Field(default_factory=list)


class BodyAnalysisResponse(BaseModel):
    success: bool
    body_profile: Optional[BodyProfileResponse] = None
    clothing_adaptations: Optional[ClothingAdaptationResponse] = None
    body_type_info: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class ItemFitResult(BaseModel):
    item_id: str = ""
    item_name: str = ""
    category: str = ""
    fit_score: float = 0.0
    recommendation: str = ""
    scores: Dict[str, float] = Field(default_factory=dict)


class ItemFitResponse(BaseModel):
    results: List[ItemFitResult] = Field(default_factory=list)
