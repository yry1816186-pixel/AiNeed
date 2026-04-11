"""
Unit tests for Hallucination Detection Module

Tests for:
- HallucinationDetector
- FashionRuleValidator
- KnowledgeVerifier
"""

import pytest
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.hallucination.detector import (
    HallucinationDetector,
    HallucinationResult,
    HallucinationType,
    DetectionConfig
)
from services.hallucination.fashion_rules import (
    FashionRuleValidator,
    RuleSeverity
)
from services.hallucination.knowledge_verifier import KnowledgeVerifier


class TestFashionRuleValidator:
    """Tests for FashionRuleValidator"""

    @pytest.fixture
    def validator(self):
        return FashionRuleValidator()

    def test_validate_color_combination_valid(self, validator):
        """Test valid color combinations"""
        violations = validator.validate_color_combination(['navy', 'white'])
        assert len(violations) == 0

    def test_validate_color_combination_too_many_colors(self, validator):
        """Test too many colors warning"""
        violations = validator.validate_color_combination(
            ['red', 'blue', 'green', 'yellow', 'orange']
        )
        assert len(violations) > 0
        assert any(v.rule_name == 'too_many_colors' for v in violations)

    def test_validate_color_combination_occasion_context(self, validator):
        """Test color validation with occasion context"""
        violations = validator.validate_color_combination(
            ['neon_green'],
            context={'occasion': 'interview'}
        )
        # Should warn about neon for interview
        assert len(violations) > 0

    def test_validate_occasion_business_forbidden(self, validator):
        """Test business occasion forbidden items"""
        violations = validator.validate_occasion_appropriateness(
            ['shorts', 'flip_flops'],
            'business'
        )
        assert len(violations) > 0
        assert any(v.severity == RuleSeverity.ERROR for v in violations)

    def test_validate_season_summer(self, validator):
        """Test summer season validation"""
        violations = validator.validate_season_appropriateness(
            ['sweater', 'boots'],
            'summer',
            temperature=30
        )
        assert len(violations) > 0

    def test_validate_temperature_clothing_hot(self, validator):
        """Test hot weather clothing validation"""
        violations = validator.validate_temperature_clothing_match(
            ['coat', 'sweater'],
            temperature=35
        )
        assert len(violations) > 0
        assert any(v.rule_name == 'hot_weather_inappropriate' for v in violations)

    def test_validate_temperature_clothing_cold(self, validator):
        """Test cold weather clothing validation"""
        violations = validator.validate_temperature_clothing_match(
            ['shorts', 'sandals'],
            temperature=-5
        )
        assert len(violations) > 0
        assert any(v.rule_name == 'cold_weather_inappropriate' for v in violations)

    def test_extract_colors_from_text(self, validator):
        """Test color extraction from text"""
        text = "推荐你穿红色的衬衫搭配蓝色牛仔裤"
        colors = validator.extract_colors_from_text(text)
        assert 'red' in colors
        assert 'blue' in colors

    def test_extract_items_from_text(self, validator):
        """Test item extraction from text"""
        text = "这件衬衫搭配西裤很合适"
        items = validator.extract_items_from_text(text)
        assert 'dress_shirt' in items
        assert 'dress_pants' in items


class TestHallucinationDetector:
    """Tests for HallucinationDetector"""

    @pytest.fixture
    def detector(self):
        return HallucinationDetector()

    def test_detect_valid_response(self, detector):
        """Test detection on valid response"""
        text = "建议您穿一件蓝色衬衫搭配黑色西裤，非常适合商务场合。"
        result = detector.detect(text, {'occasion': 'business'})

        assert isinstance(result, HallucinationResult)
        assert result.confidence_score > 0.5
        assert result.processing_time_ms > 0

    def test_detect_temperature_error(self, detector):
        """Test detection of temperature errors"""
        text = "今天温度50度，建议穿毛衣。"
        result = detector.detect(text)

        # Should detect unrealistic temperature
        assert result.is_hallucination or len(result.issues) > 0

    def test_detect_occasion_violation(self, detector):
        """Test detection of occasion violations"""
        text = "面试时推荐穿短裤和拖鞋，非常舒适。"
        result = detector.detect(text, {'occasion': 'interview'})

        # Should detect inappropriate items for interview
        critical_issues = result.get_critical_issues()
        assert len(critical_issues) > 0 or result.confidence_score < 1.0

    def test_get_confidence_score(self, detector):
        """Test confidence score extraction"""
        text = "这是一条正常的穿搭建议。"
        score = detector.get_confidence_score(text)

        assert 0 <= score <= 1

    def test_detect_with_context(self, detector):
        """Test detection with full context"""
        text = "根据您的梨形身材，建议穿紧身牛仔裤来突出曲线。"
        context = {
            'body_type': 'pear',
            'occasion': 'casual'
        }

        result = detector.detect(text, context)

        # Pear body type should avoid tight bottoms
        assert isinstance(result, HallucinationResult)

    def test_numerical_reasonableness(self, detector):
        """Test numerical reasonableness check"""
        # Unreasonable temperature
        text = "现在的温度是100摄氏度，建议穿羽绒服。"
        result = detector.detect(text)

        temp_issues = [
            i for i in result.issues
            if i.type == HallucinationType.NUMERICAL_ERROR
        ]
        assert len(temp_issues) > 0

    def test_fashion_rule_violation(self, detector):
        """Test fashion rule violation detection"""
        text = "夏天推荐穿厚重的羊毛大衣。"
        result = detector.detect(text, {'season': 'summer'})

        # Should detect inappropriate fabric for season
        assert len(result.issues) > 0


class TestKnowledgeVerifier:
    """Tests for KnowledgeVerifier"""

    @pytest.fixture
    def verifier(self):
        return KnowledgeVerifier()

    def test_verify_color_season(self, verifier):
        """Test color season verification"""
        # Winter person recommended orange
        issues = verifier.verify(
            "推荐你穿橙色的衣服",
            {'color_season': 'winter'}
        )

        # Winter should avoid orange
        assert len(issues) > 0

    def test_verify_body_type(self, verifier):
        """Test body type verification"""
        # Pear body type recommended tight bottoms
        issues = verifier.verify(
            "建议穿紧身裤来展示身材",
            {'body_type': 'pear'}
        )

        # Pear should avoid tight bottoms
        assert len(issues) > 0

    def test_verify_occasion(self, verifier):
        """Test occasion verification"""
        # Interview recommended casual wear
        issues = verifier.verify(
            "面试时推荐穿牛仔裤",
            {'occasion': 'interview'}
        )

        assert len(issues) > 0

    def test_verify_season(self, verifier):
        """Test season verification"""
        # Summer recommended sweater
        issues = verifier.verify(
            "夏天推荐穿毛衣",
            {'season': 'summer'}
        )

        assert len(issues) > 0


class TestDetectionConfig:
    """Tests for DetectionConfig"""

    def test_default_config(self):
        """Test default configuration values"""
        config = DetectionConfig()

        assert config.low_confidence_threshold == 0.5
        assert config.check_factual_consistency is True
        assert config.check_fashion_rules is True

    def test_custom_config(self):
        """Test custom configuration"""
        config = DetectionConfig(
            low_confidence_threshold=0.7,
            check_fashion_rules=False
        )

        assert config.low_confidence_threshold == 0.7
        assert config.check_fashion_rules is False


class TestHallucinationResult:
    """Tests for HallucinationResult"""

    def test_to_dict(self):
        """Test serialization to dictionary"""
        from services.hallucination.detector import HallucinationIssue

        result = HallucinationResult(
            is_hallucination=False,
            confidence_score=0.85,
            issues=[
                HallucinationIssue(
                    type=HallucinationType.FASHION_RULE_VIOLATION,
                    severity=RuleSeverity.WARNING,
                    description="Test issue",
                    confidence=0.8
                )
            ],
            processing_time_ms=10.5,
            text_length=100,
            validated_at="2026-01-01T00:00:00Z"
        )

        result_dict = result.to_dict()

        assert result_dict['is_hallucination'] is False
        assert result_dict['confidence_score'] == 0.85
        assert len(result_dict['issues']) == 1

    def test_get_critical_issues(self):
        """Test filtering critical issues"""
        from services.hallucination.detector import HallucinationIssue

        result = HallucinationResult(
            is_hallucination=True,
            confidence_score=0.3,
            issues=[
                HallucinationIssue(
                    type=HallucinationType.FACTUAL_ERROR,
                    severity=RuleSeverity.ERROR,
                    description="Critical issue",
                    confidence=0.9
                ),
                HallucinationIssue(
                    type=HallucinationType.FASHION_RULE_VIOLATION,
                    severity=RuleSeverity.WARNING,
                    description="Warning issue",
                    confidence=0.7
                )
            ],
            processing_time_ms=10.5,
            text_length=100,
            validated_at="2026-01-01T00:00:00Z"
        )

        critical = result.get_critical_issues()
        warnings = result.get_warnings()

        assert len(critical) == 1
        assert len(warnings) == 1


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
