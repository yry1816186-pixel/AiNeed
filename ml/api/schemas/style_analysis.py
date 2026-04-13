from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


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
