"""
ML Services Package
体型分析、推荐系统等服务模块
"""

from ml.services.stylist import IntelligentStylistService, UserProfile, SceneContext, get_stylist_service
from ml.services.analysis import BodyAnalyzer, BodyAnalyzerService, get_body_analyzer_service
from ml.services.tryon import virtual_tryon_service

__all__ = [
    "IntelligentStylistService",
    "UserProfile",
    "SceneContext",
    "get_stylist_service",
    "BodyAnalyzer",
    "BodyAnalyzerService",
    "get_body_analyzer_service",
    "virtual_tryon_service",
]
