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


class StyleAnalysisRequest(BaseModel):
    user_input: str = Field(..., description="User style description, e.g. 'xiaohongshu style'")
    user_profile: Optional[Dict[str, Any]] = Field(None, description="User profile information")


class StyleSuggestionsRequest(BaseModel):
    user_input: str = Field(..., description="User style description")
    body_type: Optional[str] = Field(None, description="User body type")
    occasion: Optional[str] = Field(None, description="Target occasion")


class StyleAnalysisResponse(BaseModel):
    style_name: str = ""
    confidence: float = 0.0
    core_elements: List[str] = Field(default_factory=list)
    key_items: List[str] = Field(default_factory=list)
    color_palette: List[str] = Field(default_factory=list)
    patterns: List[str] = Field(default_factory=list)
    materials: List[str] = Field(default_factory=list)
    occasions: List[str] = Field(default_factory=list)
    seasons: List[str] = Field(default_factory=list)
    body_type_suggestions: Dict[str, List[str]] = Field(default_factory=dict)
    celebrity_references: List[str] = Field(default_factory=list)
    brand_references: List[str] = Field(default_factory=list)
    price_range: str = ""
    similar_styles: List[str] = Field(default_factory=list)


class OutfitSuggestionResponse(BaseModel):
    category: str = ""
    description: str = ""
    style_tags: List[str] = Field(default_factory=list)
    color_suggestions: List[str] = Field(default_factory=list)
    item_examples: List[str] = Field(default_factory=list)
    pairing_tips: str = ""


class StyleSuggestionsResponse(BaseModel):
    style_analysis: StyleAnalysisResponse = Field(default_factory=StyleAnalysisResponse)
    outfit_suggestions: List[OutfitSuggestionResponse] = Field(default_factory=list)
    embedding_prompts: List[str] = Field(default_factory=list)
    style_weights: Dict[str, float] = Field(default_factory=dict)


class QualityAnalyzeRequest(BaseModel):
    image_base64: Optional[str] = Field(None, description="Base64 encoded image")
    image_path: Optional[str] = Field(None, description="Image file path")


class EnhanceRequest(BaseModel):
    image_base64: Optional[str] = Field(None, description="Base64 encoded image")
    image_url: Optional[str] = Field(None, description="Image URL to download")
