"""
Hallucination Detection Module for AI Fashion Assistant

This module provides LLM output hallucination detection capabilities
to ensure the accuracy of outfit recommendations.

Detection Dimensions:
1. Factual Consistency - Compare with knowledge base
2. Logical Consistency - Internal logic check
3. Numerical Reasonableness - Temperature, price, etc.
4. Fashion Rules - Color matching, occasion rules

2026 AI Safety Best Practices Implementation
"""

from .detector import (
    HallucinationDetector,
    HallucinationResult,
    HallucinationType,
    DetectionConfig
)
from .fashion_rules import (
    FashionRuleValidator,
    ColorRule,
    OccasionRule,
    SeasonRule,
    BodyTypeRule
)
from .knowledge_verifier import KnowledgeVerifier

__all__ = [
    # Detector
    'HallucinationDetector',
    'HallucinationResult',
    'HallucinationType',
    'DetectionConfig',

    # Fashion Rules
    'FashionRuleValidator',
    'ColorRule',
    'OccasionRule',
    'SeasonRule',
    'BodyTypeRule',

    # Knowledge Verification
    'KnowledgeVerifier',
]

__version__ = '1.0.0'
