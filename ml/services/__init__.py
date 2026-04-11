"""
ML Services Package
体型分析、推荐系统等服务模块
"""

from .body_analyzer import (
    BodyAnalyzer,
    BodyAnalyzerService,
    BodyType,
    SkinTone,
    ColorSeason,
    BodyProfile,
    BodyProportions,
    BodyMeasurements,
    Keypoint,
    ClothingAdaptation,
    FitScore,
    MediaPipeProcessor,
    BODY_TYPE_ADAPTATIONS,
    BODY_TYPE_THRESHOLDS,
    CLOTHING_ITEM_FIT_RULES,
    COLOR_SEASON_MATCHES,
    get_body_analyzer,
    get_body_analyzer_service,
    create_body_analyzer,
    create_body_analyzer_service,
)

__all__ = [
    "BodyAnalyzer",
    "BodyAnalyzerService",
    "BodyType",
    "SkinTone",
    "ColorSeason",
    "BodyProfile",
    "BodyProportions",
    "BodyMeasurements",
    "Keypoint",
    "ClothingAdaptation",
    "FitScore",
    "MediaPipeProcessor",
    "BODY_TYPE_ADAPTATIONS",
    "BODY_TYPE_THRESHOLDS",
    "CLOTHING_ITEM_FIT_RULES",
    "COLOR_SEASON_MATCHES",
    "get_body_analyzer",
    "get_body_analyzer_service",
    "create_body_analyzer",
    "create_body_analyzer_service",
]
