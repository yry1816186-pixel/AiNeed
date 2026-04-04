"""
Hallucination Detector for AI Fashion Assistant

Main hallucination detection module that combines:
1. Factual consistency checks (knowledge base verification)
2. Logical consistency checks (internal logic)
3. Numerical reasonableness (temperature, prices, etc.)
4. Fashion rule validation

2026 AI Safety Best Practices Implementation
"""

import re
import logging
import time
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
import json

from .fashion_rules import (
    FashionRuleValidator,
    RuleViolation,
    RuleSeverity
)

logger = logging.getLogger(__name__)


class HallucinationType(Enum):
    """Types of hallucinations that can be detected"""
    FACTUAL_ERROR = "factual_error"           # Inconsistent with knowledge base
    LOGICAL_ERROR = "logical_error"           # Internal contradiction
    NUMERICAL_ERROR = "numerical_error"       # Unreasonable numbers
    FASHION_RULE_VIOLATION = "fashion_rule"   # Violates fashion rules
    CONTEXT_MISMATCH = "context_mismatch"     # Doesn't match user context
    FABRICATION = "fabrication"               # Made-up information
    INCONSISTENCY = "inconsistency"           # Self-contradiction


@dataclass
class HallucinationIssue:
    """Represents a single hallucination issue"""
    type: HallucinationType
    severity: RuleSeverity
    description: str
    confidence: float
    location: Optional[str] = None
    suggestion: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class HallucinationResult:
    """Result of hallucination detection"""
    is_hallucination: bool
    confidence_score: float  # Overall confidence (1.0 = no hallucination)
    issues: List[HallucinationIssue]
    processing_time_ms: float
    text_length: int
    validated_at: str

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            'is_hallucination': self.is_hallucination,
            'confidence_score': self.confidence_score,
            'issues': [
                {
                    'type': issue.type.value,
                    'severity': issue.severity.value,
                    'description': issue.description,
                    'confidence': issue.confidence,
                    'location': issue.location,
                    'suggestion': issue.suggestion,
                    'details': issue.details
                }
                for issue in self.issues
            ],
            'processing_time_ms': self.processing_time_ms,
            'text_length': self.text_length,
            'validated_at': self.validated_at
        }

    def get_critical_issues(self) -> List[HallucinationIssue]:
        """Get only critical (error-level) issues"""
        return [i for i in self.issues if i.severity == RuleSeverity.ERROR]

    def get_warnings(self) -> List[HallucinationIssue]:
        """Get warning-level issues"""
        return [i for i in self.issues if i.severity == RuleSeverity.WARNING]


@dataclass
class DetectionConfig:
    """Configuration for hallucination detection"""
    # Thresholds
    low_confidence_threshold: float = 0.5
    warning_threshold: float = 0.7
    high_confidence_threshold: float = 0.9

    # Feature toggles
    check_factual_consistency: bool = True
    check_logical_consistency: bool = True
    check_numerical_reasonableness: bool = True
    check_fashion_rules: bool = True
    check_context_match: bool = True

    # Weights for different check types
    factual_weight: float = 0.30
    logical_weight: float = 0.20
    numerical_weight: float = 0.15
    fashion_weight: float = 0.25
    context_weight: float = 0.10

    # Thresholds for specific checks
    max_temperature_celsius: int = 50
    min_temperature_celsius: int = -30
    max_price_usd: int = 100000
    min_price_usd: int = 0

    # Logging
    log_detections: bool = True


class HallucinationDetector:
    """
    Hallucination Detector

    Main class for detecting hallucinations in LLM outputs for the
    fashion recommendation system.
    """

    def __init__(
        self,
        config: Optional[DetectionConfig] = None,
        knowledge_verifier: Optional[Any] = None
    ):
        """
        Initialize Hallucination Detector

        Args:
            config: Detection configuration
            knowledge_verifier: Knowledge verifier instance
        """
        self.config = config or DetectionConfig()
        self.fashion_validator = FashionRuleValidator()
        self.knowledge_verifier = knowledge_verifier

        # Patterns for detecting potential issues
        self._init_patterns()

    def _init_patterns(self):
        """Initialize regex patterns for detection"""
        # Temperature patterns (Celsius and Fahrenheit)
        self.temp_c_pattern = re.compile(
            r'(-?\d+(?:\.\d+)?)\s*[°度]?C(?:elsius)?',
            re.IGNORECASE
        )
        self.temp_f_pattern = re.compile(
            r'(-?\d+(?:\.\d+)?)\s*[°度]?F(?:ahrenheit)?',
            re.IGNORECASE
        )

        # Price patterns
        self.price_patterns = [
            re.compile(r'\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)'),
            re.compile(r'(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:美元|USD)'),
            re.compile(r'(?:价格|price)[：:]\s*(\d+(?:,\d{3})*(?:\.\d{2})?)'),
        ]

        # Certainty markers (often indicate speculation)
        self.certainty_markers = [
            r'可能', r'也许', r'大概', r'应该', r'maybe', r'perhaps',
            r'probably', r'likely', r'might', r'could be'
        ]

        # Definitive markers (check for overconfidence)
        self.definitive_markers = [
            r'一定', r'绝对', r'肯定', r'必须', r'definitely', r'absolutely',
            r'always', r'never', r'must', r'certainly'
        ]

        # Fabrication indicators
        self.fabrication_patterns = [
            re.compile(r'(?:brand|品牌)[：:]\s*([A-Za-z\u4e00-\u9fff]+)', re.IGNORECASE),
            re.compile(r'(?:designer|设计师)[：:]\s*([A-Za-z\u4e00-\u9fff]+)', re.IGNORECASE),
        ]

    def detect(
        self,
        text: str,
        context: Optional[Dict[str, Any]] = None
    ) -> HallucinationResult:
        """
        Detect hallucinations in the given text.

        Args:
            text: Text to analyze
            context: Additional context for validation
                - occasion: Target occasion
                - season: Current season
                - body_type: User's body type
                - temperature: Current temperature
                - knowledge_context: Knowledge base context
                - user_preferences: User's style preferences

        Returns:
            HallucinationResult with detection findings
        """
        start_time = time.time()
        context = context or {}
        issues: List[HallucinationIssue] = []

        # Run all detection checks
        if self.config.check_factual_consistency:
            issues.extend(self._check_factual_consistency(text, context))

        if self.config.check_logical_consistency:
            issues.extend(self._check_logical_consistency(text, context))

        if self.config.check_numerical_reasonableness:
            issues.extend(self._check_numerical_reasonableness(text, context))

        if self.config.check_fashion_rules:
            issues.extend(self._check_fashion_rules(text, context))

        if self.config.check_context_match:
            issues.extend(self._check_context_match(text, context))

        # Calculate confidence score
        confidence_score = self._calculate_confidence(issues)

        # Determine if this is a hallucination
        is_hallucination = confidence_score < self.config.low_confidence_threshold

        processing_time = (time.time() - start_time) * 1000

        result = HallucinationResult(
            is_hallucination=is_hallucination,
            confidence_score=confidence_score,
            issues=issues,
            processing_time_ms=processing_time,
            text_length=len(text),
            validated_at=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        )

        if self.config.log_detections:
            self._log_detection(result, text[:100])

        return result

    def get_confidence_score(self, text: str, context: Optional[Dict[str, Any]] = None) -> float:
        """
        Get confidence score for text without full detection.

        Args:
            text: Text to analyze
            context: Additional context

        Returns:
            Confidence score (0.0 to 1.0)
        """
        result = self.detect(text, context)
        return result.confidence_score

    def _check_factual_consistency(
        self,
        text: str,
        context: Dict[str, Any]
    ) -> List[HallucinationIssue]:
        """
        Check factual consistency against knowledge base.

        Uses RAG system to verify claims against established fashion knowledge.
        """
        issues = []

        # If knowledge verifier is available, use it
        if self.knowledge_verifier:
            try:
                kb_issues = self.knowledge_verifier.verify(text, context)
                issues.extend(kb_issues)
            except Exception as e:
                logger.error(f"Knowledge verification failed: {e}")

        # Check for known fashion facts
        issues.extend(self._check_known_facts(text))

        return issues

    def _check_known_facts(self, text: str) -> List[HallucinationIssue]:
        """
        Check against known fashion and clothing domain rules.
        Comprehensive rule set with 130+ detection rules covering:
        - Season-material compatibility
        - Color theory principles
        - Occasion-appropriate dressing
        - Body type styling myths
        - Fabric properties and care
        - Brand/trend verification needs
        - Size and fit misconceptions
        - Proportion and silhouette rules
        - Accessory coordination guidelines
        - Age-appropriate styling
        - Cultural/religious dress codes
        - Professional industry standards
        """
        issues = []
        text_lower = text.lower()

        # ==========================================
        # 1. SEASON-MATERIAL INCOMPATIBILITY RULES (12 rules)
        # ==========================================
        season_material_rules = [
            # Chinese rules (6)
            (r'夏[天季].*推荐.*羊毛', 'Wool is not recommended for summer due to heat retention'),
            (r'夏[天季].*适合.*羊绒', 'Cashmere is too warm for summer weather'),
            (r'夏[天季].*穿.*羽绒', 'Down jackets are inappropriate for summer'),
            (r'冬[天季].*推荐.*亚麻', 'Linen is too thin and breathable for winter cold'),
            (r'冬[天季].*推荐.*雪纺', 'Chiffon provides insufficient warmth for winter'),
            (r'冬[天季].*穿.*薄纱', 'Tulle/veil is too thin for winter conditions'),
            # English rules (6)
            (r'summer.*recommend.*wool', 'Wool is not recommended for summer due to heat retention'),
            (r'summer.*suitable.*cashmere', 'Cashmere is too warm for summer weather'),
            (r'summer.*wear.*down.*jacket', 'Down jackets are inappropriate for summer'),
            (r'winter.*recommend.*linen', 'Linen is too thin and breathable for winter cold'),
            (r'winter.*recommend.*chiffon', 'Chiffon provides insufficient warmth for winter'),
            (r'winter.*wear.*tulle', 'Tulle/veil is too thin for winter conditions'),
        ]

        for pattern, fact in season_material_rules:
            if re.search(pattern, text_lower):
                issues.append(HallucinationIssue(
                    type=HallucinationType.FACTUAL_ERROR,
                    severity=RuleSeverity.ERROR,
                    description='Season-material incompatibility detected',
                    confidence=0.90,
                    suggestion=fact,
                    details={'pattern': pattern, 'category': 'season_material'}
                ))

        # ==========================================
        # 2. COLOR THEORY VIOLATIONS (10 rules)
        # ==========================================
        color_rules = [
            # Chinese rules (5)
            (r'黑[色]?[与和]黑[色]?.*不.*搭配', 'Black on black is a classic monochromatic look'),
            (r'白[色]?[与和]白[色]?.*不.*搭配', 'White on white creates elegant minimalist style'),
            (r'蓝[色]?[与和]绿[色]?.*冲突', 'Blue and green can create harmonious nature-inspired palettes'),
            (r'暖[色色调]?.*冷[色色调]?.*不.*混搭', 'Warm and cool tones can be mixed with proper balance'),
            (r'全身.*超过.*[三3].*颜[色彩].*丑', 'More than 3 colors can work with cohesive color theory'),
            # English rules (5)
            (r'black.*and.*black.*don\'?t.*match', 'Black on black is a classic monochromatic look'),
            (r'white.*and.*white.*don\'?t.*match', 'White on white creates elegant minimalist style'),
            (r'blue.*and.*green.*clash', 'Blue and green can create harmonious nature-inspired palettes'),
            (r'warm.*cool.*tone.*don\'?t.*mix', 'Warm and cool tones can be mixed with proper balance'),
            (r'more.*than.*three.*color.*bad', 'More than 3 colors can work with cohesive color theory'),
        ]

        for pattern, fact in color_rules:
            if re.search(pattern, text_lower):
                issues.append(HallucinationIssue(
                    type=HallucinationType.FACTUAL_ERROR,
                    severity=RuleSeverity.WARNING,
                    description='Color theory misconception detected',
                    confidence=0.75,
                    suggestion=fact,
                    details={'pattern': pattern, 'category': 'color_theory'}
                ))

        # ==========================================
        # 3. OCCASION-APPAREL RULES (10 rules)
        # ==========================================
        occasion_rules = [
            # Chinese rules (5)
            (r'白[色]?衬衫.*不适合.*正式场合', 'White shirts are classic staples for formal occasions'),
            (r'black.*不.*适合.*面试', 'Black is professional and appropriate for interviews'),
            (r'运动鞋.*不能.*商务', 'Clean sneakers can work in smart-casual business settings'),
            (r'牛[仔仔]裤.*不适合.*办公室', 'Dark well-fitted jeans can be office-appropriate'),
            (r'短[裙裤].*正式.*场合', 'Appropriate length skirts can be suitable for formal events'),
            # English rules (5)
            (r'white.*shirt.*not.*formal', 'White shirts are classic staples for formal occasions'),
            (r'black.*not.*suitable.*interview', 'Black is professional and appropriate for interviews'),
            (r'sneakers.*cannot.*business', 'Clean sneakers can work in smart-casual business settings'),
            (r'jeans.*not.*appropriate.*office', 'Dark well-fitted jeans can be office-appropriate'),
            (r'short.*skirt.*formal.*event', 'Appropriate length skirts can be suitable for formal events'),
        ]

        for pattern, fact in occasion_rules:
            if re.search(pattern, text_lower):
                issues.append(HallucinationIssue(
                    type=HallucinationType.FACTUAL_ERROR,
                    severity=RuleSeverity.ERROR,
                    description='Occasion-apparel rule violation detected',
                    confidence=0.85,
                    suggestion=fact,
                    details={'pattern': pattern, 'category': 'occasion_apparel'}
                ))

        # ==========================================
        # 4. BODY TYPE MYTHS (8 rules)
        # ==========================================
        body_type_rules = [
            # Chinese rules (4)
            (r'[矮短].*不.*穿.*长款', 'Vertical lines from long pieces can elongate petite frames'),
            (r'[胖丰满].*[只能].*穿.*黑[色]?', 'Colors beyond black can flatter all body types'),
            (r'高[个].*不.*穿.*高[跟鞋台]', 'Heels can enhance proportions for tall individuals too'),
            (r'[瘦瘦].*[只能].*穿.*宽松', 'Fitted pieces can add curves to slender frames'),
            # English rules (4)
            (r'short.*should.*not.*wear.*long', 'Vertical lines from long pieces can elongate petite frames'),
            (r'plus.*size.*only.*wear.*black', 'Colors beyond black can flatter all body types'),
            (r'tall.*should.*not.*wear.*heels', 'Heels can enhance proportions for tall individuals too'),
            (r'slim.*only.*wear.*loose', 'Fitted pieces can add curves to slender frames'),
        ]

        for pattern, fact in body_type_rules:
            if re.search(pattern, text_lower):
                issues.append(HallucinationIssue(
                    type=HallucinationType.FACTUAL_ERROR,
                    severity=RuleSeverity.WARNING,
                    description='Body type fashion myth detected',
                    confidence=0.80,
                    suggestion=fact,
                    details={'pattern': pattern, 'category': 'body_type_myth'}
                ))

        # ==========================================
        # 5. FABRICATION DETECTION (4 rules)
        # ==========================================
        fabrication_patterns = [
            (r'(?:品牌|brand)[：:]\s*([A-Za-z\u4e00-\u9fff]{1,20})(?:的|的产品|官方)', 'Brand claim should be verified'),
            (r'(?:明星|celebrity).*穿.*([A-Za-z\u4e00-\u9fff]+)', 'Celebrity-brand association should be verified'),
            (r'(?:限量|limited).*([0-9]+).*件', 'Limited edition claims should be verified'),
            (r'(?:价格|price)[：:]\s*([0-9,]+)', 'Price claims should be verified against market data'),
        ]

        for pattern, message in fabrication_patterns:
            if re.search(pattern, text_lower):
                issues.append(HallucinationIssue(
                    type=HallucinationType.FABRICATION,
                    severity=RuleSeverity.INFO,
                    description='Potential unverified claim detected',
                    confidence=0.60,
                    suggestion=message,
                    details={'pattern': pattern, 'category': 'fabrication_check'}
                ))

        # ==========================================
        # 6. STYLE COMBINATION WARNINGS (3 rules)
        # ==========================================
        style_combo_rules = [
            (r'正式.*[与和].*运动.*绝.*不.*搭', 'Formal-athletic fusion is a valid modern style trend'),
            (r'复古.*现代.*冲突', 'Vintage-modern mixing creates unique personal style'),
            (r'街头.*优雅.*不.*共存', 'Street-elegant hybrid is a contemporary fashion movement'),
        ]

        for pattern, fact in style_combo_rules:
            if re.search(pattern, text_lower):
                issues.append(HallucinationIssue(
                    type=HallucinationType.LOGICAL_ERROR,
                    severity=RuleSeverity.INFO,
                    description='Style combination assumption may be overly restrictive',
                    confidence=0.65,
                    suggestion=fact,
                    details={'pattern': pattern, 'category': 'style_combination'}
                ))

        # ==========================================
        # 7. OVERGENERALIZATION PATTERNS (12 rules)
        # ==========================================
        additional_rules = [
            (r'永远.*不要.*穿', 'Absolute prohibitions in fashion are often incorrect'),
            (r'所有.*都.*必须', 'Universal requirements in fashion are rare'),
            (r'只有.*才能', 'Exclusivity claims in fashion are often misleading'),
            (r'任何.*都.*适合', 'Universal suitability claims are often false'),
            (r'一定.*会.*显瘦', 'Guaranteed slimming effects are unrealistic'),
            (r'保证.*显[高瘦白]', 'Guaranteed visual effects are marketing claims'),
            (r'100%.*[纯棉羊毛真丝]', 'Material composition claims should be verified'),
            (r'所有人.*都.*适合', 'Universal fit claims are unrealistic'),
            (r'绝对.*不.*过时', 'Timeless claims are subjective and often exaggerated'),
            (r'任何.*场合.*都.*适合', 'Universal occasion claims are rarely accurate'),
            (r'永远.*流行', 'Eternal trend claims are marketing exaggerations'),
            (r'专家.*建议.*所有', 'Expert advice for everyone should be contextualized'),
        ]

        for pattern, message in additional_rules:
            if re.search(pattern, text_lower):
                issues.append(HallucinationIssue(
                    type=HallucinationType.FABRICATION,
                    severity=RuleSeverity.INFO,
                    description='Overgeneralization or absolute claim detected',
                    confidence=0.55,
                    suggestion=message,
                    details={'pattern': pattern, 'category': 'overgeneralization'}
                ))

        # ==========================================
        # 8. SIZE AND FIT MYTHS (5 rules)
        # ==========================================
        size_fit_rules = [
            (r'大[一1].*号.*显[瘦小]', 'Oversized fit depends on styling, not guaranteed slimming'),
            (r'小[一1].*号.*显[瘦身材]', 'Smaller size does not guarantee better appearance'),
            (r'紧身.*显[瘦身材]', 'Tight fit does not always create slimming effect'),
            (r'宽松.*遮.*肉', 'Loose fit can sometimes add visual bulk'),
            (r'高腰.*一定.*显腿长', 'High waist effect depends on proportions and styling'),
        ]

        for pattern, fact in size_fit_rules:
            if re.search(pattern, text_lower):
                issues.append(HallucinationIssue(
                    type=HallucinationType.FACTUAL_ERROR,
                    severity=RuleSeverity.INFO,
                    description='Size/fit oversimplification detected',
                    confidence=0.60,
                    suggestion=fact,
                    details={'pattern': pattern, 'category': 'size_fit_myth'}
                ))

        # ==========================================
        # 9. BRAND AND TREND FABRICATION (4 rules)
        # ==========================================
        brand_trend_rules = [
            (r'(?:今年|2024|2025|2026).*流行.*所有', 'Trend universality claims should be verified'),
            (r'(?:明星|网红|名人).*都在穿', 'Celebrity trend claims should be verified'),
            (r'(?:必买|必入|必备).*清单', 'Essential item claims are subjective marketing'),
            (r'(?:爆款|网红款).*适合.*所有', 'Viral item universal fit claims are often exaggerated'),
        ]

        for pattern, message in brand_trend_rules:
            if re.search(pattern, text_lower):
                issues.append(HallucinationIssue(
                    type=HallucinationType.FABRICATION,
                    severity=RuleSeverity.INFO,
                    description='Trend/brand claim should be verified',
                    confidence=0.50,
                    suggestion=message,
                    details={'pattern': pattern, 'category': 'brand_trend_claim'}
                ))

        # ==========================================
        # 10. FABRIC CARE MYTHS (6 rules)
        # ==========================================
        fabric_care_rules = [
            (r'羊毛.*可以.*机洗', 'Wool generally requires gentle hand wash or dry clean'),
            (r'真丝.*可以.*暴晒', 'Silk should not be exposed to direct sunlight'),
            (r'皮革.*可以.*水洗', 'Leather should be cleaned with specialized products'),
            (r'羊绒.*可以.*烘干', 'Cashmere should be air dried flat'),
            (r'羽绒服.*可以.*干洗', 'Down jackets are often better washed at home'),
            (r'牛仔.*必须.*频繁洗', 'Denim benefits from less frequent washing'),
        ]

        for pattern, fact in fabric_care_rules:
            if re.search(pattern, text_lower):
                issues.append(HallucinationIssue(
                    type=HallucinationType.FACTUAL_ERROR,
                    severity=RuleSeverity.WARNING,
                    description='Fabric care misconception detected',
                    confidence=0.80,
                    suggestion=fact,
                    details={'pattern': pattern, 'category': 'fabric_care'}
                ))

        # ==========================================
        # 11. PROPORTION AND FIT MYTHS (5 rules)
        # ==========================================
        proportion_rules = [
            (r'矮[个子]?.*不能.*穿.*长款', 'Petite frames can wear long pieces with proper proportions'),
            (r'高[个子]?.*不能.*穿.*短款', 'Tall frames can wear cropped styles confidently'),
            (r'胖.*不能.*穿.*横条纹', 'Horizontal stripes can work with proper scale and placement'),
            (r'瘦.*不能.*穿.*宽松', 'Oversized styles can create intentional silhouette on slim frames'),
            (r'[四4]十.*不能.*穿.*短裙', 'Age-appropriate styling is subjective and personal'),
        ]

        for pattern, fact in proportion_rules:
            if re.search(pattern, text_lower):
                issues.append(HallucinationIssue(
                    type=HallucinationType.FACTUAL_ERROR,
                    severity=RuleSeverity.WARNING,
                    description='Proportion/fit myth detected',
                    confidence=0.75,
                    suggestion=fact,
                    details={'pattern': pattern, 'category': 'proportion_myth'}
                ))

        # ==========================================
        # 12. ACCESSORY RULES (4 rules)
        # ==========================================
        accessory_rules = [
            (r'正式.*不能.*戴.*手表', 'Appropriate watches are acceptable for formal occasions'),
            (r'运动.*不能.*戴.*首饰', 'Minimal jewelry can complement athletic wear'),
            (r'项链.*必须.*配.*耳环', 'Jewelry mixing is a personal style choice'),
            (r'腰带.*必须.*同.*鞋子', 'Belt-shoe matching is a traditional rule, not mandatory'),
        ]

        for pattern, fact in accessory_rules:
            if re.search(pattern, text_lower):
                issues.append(HallucinationIssue(
                    type=HallucinationType.FACTUAL_ERROR,
                    severity=RuleSeverity.INFO,
                    description='Accessory rule misconception detected',
                    confidence=0.65,
                    suggestion=fact,
                    details={'pattern': pattern, 'category': 'accessory_rule'}
                ))

        # ==========================================
        # ★ 新增: 13. AGE-APPROPRIATE STYLING RULES (8 rules)
        # ==========================================
        age_styling_rules = [
            (r'[五5]十.*不能.*穿.*鲜艳', 'Vibrant colors can be worn at any age with confidence'),
            (r'[六6]十.*只能.*穿.*暗[色色调]', 'Dark colors are not mandatory for mature adults'),
            (r'年轻.*不能.*穿.*复古', 'Vintage styles are popular across all age groups'),
            (r'[老年人].*不适合.*时尚', 'Fashion has no age limit; style is timeless'),
            (r'[三3]十.*必须.*成熟', 'Style maturity is personal, not age-dictated'),
            (r'青少年.*不能.*穿.*正装', 'Young people can wear formal attire appropriately'),
            (r'中年.*避免.*潮流', 'Middle-aged individuals can embrace trends selectively'),
            (r'老年人.*只.*能.*舒适', 'Comfort and style can coexist at any age'),
        ]

        for pattern, fact in age_styling_rules:
            if re.search(pattern, text_lower):
                issues.append(HallucinationIssue(
                    type=HallucinationType.FACTUAL_ERROR,
                    severity=RuleSeverity.WARNING,
                    description='Age-based styling restriction detected',
                    confidence=0.70,
                    suggestion=fact,
                    details={'pattern': pattern, 'category': 'age_styling'}
                ))

        # ==========================================
        # ★ 新增: 14. FABRIC PROPERTY RULES (10 rules)
        # ==========================================
        fabric_property_rules = [
            (r'棉.*不.*透气', 'Cotton is highly breathable and moisture-wicking'),
            (r'丝绸.*粗糙', 'Silk is known for its smooth, soft texture'),
            (r'亚麻.*不.*吸汗', 'Linen excels at moisture absorption and breathability'),
            (r'羊毛.*夏天.*凉快', 'Wool is insulating and retains heat, unsuitable for hot weather'),
            (r'化纤.*比.*棉.*好', 'Natural fibers like cotton offer superior comfort and breathability'),
            (r'皮革.*透气', 'Leather is not breathable; it insulates and protects'),
            (r'羽绒.*轻薄', 'Down insulation is bulky by nature for thermal efficiency'),
            (r'牛仔.*弹性', 'Traditional denim has no stretch unless blended with elastane'),
            (r'针织.*挺括', 'Knits are inherently stretchy and casual, not structured'),
            (r'雪纺.*保暖', 'Chiffon is lightweight and sheer, offering minimal warmth'),
        ]

        for pattern, fact in fabric_property_rules:
            if re.search(pattern, text_lower):
                issues.append(HallucinationIssue(
                    type=HallucinationType.FACTUAL_ERROR,
                    severity=RuleSeverity.ERROR,
                    description='Incorrect fabric property claim detected',
                    confidence=0.85,
                    suggestion=fact,
                    details={'pattern': pattern, 'category': 'fabric_property'}
                ))

        # ==========================================
        # ★ 新增: 15. SILHOUETTE AND PROPORTION RULES (8 rules)
        # ==========================================
        silhouette_rules = [
            (r'A字.*显.*胖', 'A-line silhouettes are universally flattering and balance proportions'),
            (r'直筒.*最.*显瘦', 'Straight cuts depend on fabric drape and personal proportions'),
            (r'蓬蓬裙.*只.*适合.*瘦', 'Full skirts can add balance to various body types'),
            (r'紧身.*一定.*性感', 'Sexiness comes from confidence, not just tight fits'),
            (r'Oversized.*邋遢', 'Oversized can be styled intentionally for modern, chic looks'),
            (r'crop.*top.*暴露', 'Crop tops can be styled modestly with high-waisted bottoms'),
            (r'高腰裤.*过时', 'High-waisted pants remain a timeless, flattering staple'),
            (r'阔腿裤.*显矮', 'Wide-leg pants elongate legs when paired with proper footwear'),
        ]

        for pattern, fact in silhouette_rules:
            if re.search(pattern, text_lower):
                issues.append(HallucinationIssue(
                    type=HallucinationType.FACTUAL_ERROR,
                    severity=RuleSeverity.WARNING,
                    description='Silhouette/proportion myth detected',
                    confidence=0.72,
                    suggestion=fact,
                    details={'pattern': pattern, 'category': 'silhouette_myth'}
                ))

        # ==========================================
        # ★ 新增: 16. CULTURAL DRESS CODE RULES (6 rules)
        # ==========================================
        cultural_rules = [
            (r'中国.*红.*不.*吉利', 'Red is auspicious and celebratory in Chinese culture'),
            (r'白色.*婚礼.*西方.*禁忌', 'White wedding dresses are Western tradition, not universal'),
            (r'和服.*只.*日本', 'Similar traditional garments exist across East Asian cultures'),
            (r'黑色.*葬礼.*全球', 'Black mourning attire is Western-centric; other cultures use white/purple'),
            (r'露肤.*不.*尊重', 'Modesty standards vary significantly across cultures'),
            (r'宗教.*服装.*单一', 'Religious dress codes vary widely within and between faiths'),
        ]

        for pattern, fact in cultural_rules:
            if re.search(pattern, text_lower):
                issues.append(HallucinationIssue(
                    type=HallucinationType.CONTEXT_MISMATCH,
                    severity=RuleSeverity.WARNING,
                    description='Cultural dress code oversimplification detected',
                    confidence=0.78,
                    suggestion=fact,
                    details={'pattern': pattern, 'category': 'cultural_dress_code'}
                ))

        # ==========================================
        # ★ 新增: 17. PRICE AND VALUE MYTHS (6 rules)
        # ==========================================
        price_value_rules = [
            (r'贵.*就是.*好', 'Price does not guarantee quality or suitability'),
            (r'便宜.*没.*好货', 'Affordable options can offer excellent value and quality'),
            (r'名牌.*质量.*最好', 'Brand reputation varies; luxury items can have quality control issues'),
            (r'折扣.*肯定.*划算', 'Discounted items may be overpriced or defective'),
            (r'奢侈品.*保值', 'Most luxury items depreciate rapidly except rare collectibles'),
            (r'价格高.*适合.*所有', 'Expensive items must still match personal style and context'),
        ]

        for pattern, fact in price_value_rules:
            if re.search(pattern, text_lower):
                issues.append(HallucinationIssue(
                    type=HallucinationType.LOGICAL_ERROR,
                    severity=RuleSeverity.INFO,
                    description='Price-value misconception detected',
                    confidence=0.65,
                    suggestion=fact,
                    details={'pattern': pattern, 'category': 'price_value_myth'}
                ))

        # ==========================================
        # ★ 新增: 18. SUSTAINABILITY CLAIMS (6 rules)
        # ==========================================
        sustainability_rules = [
            (r'纯天然.*无污染', 'Even natural materials have environmental footprints'),
            (r'有机棉.*完美', 'Organic cotton still requires water and land resources'),
            (r'可降解.*立即消失', 'Biodegradation takes months to years under ideal conditions'),
            (r'再生材料.*低质量', 'Recycled materials can match virgin quality when processed correctly'),
            (r'快时尚.*环保', 'Fast fashion inherently conflicts with environmental sustainability'),
            (r'二手.*不卫生', 'Secondhand clothing can be thoroughly cleaned and sanitized'),
        ]

        for pattern, fact in sustainability_rules:
            if re.search(pattern, text_lower):
                issues.append(HallucinationIssue(
                    type=HallucinationType.FACTUAL_ERROR,
                    severity=RuleSeverity.WARNING,
                    description='Sustainability claim exaggeration detected',
                    confidence=0.75,
                    suggestion=fact,
                    details={'pattern': pattern, 'category': 'sustainability_claim'}
                ))

        # ==========================================
        # ★ 新增: 19. WARDROBE ESSENTIALS MYTHS (6 rules)
        # ==========================================
        wardrobe_rules = [
            (r'每个人.*必须.*有.*小黑裙', 'The "little black dress" is a Western fashion construct, not universal'),
            (r'衣橱.*必须有.*白衬衫', 'Wardrobe essentials are personal and context-dependent'),
            (r'西装.*必备', 'Not all professions or lifestyles require suits'),
            (r'牛仔裤.*万能', 'Denim is inappropriate for many formal and cultural contexts'),
            (r'高跟鞋.*女人味', 'Femininity is not defined by footwear choices'),
            (r'运动鞋.*不专业', 'Athleisure has normalized sneakers in many professional settings'),
        ]

        for pattern, fact in wardrobe_rules:
            if re.search(pattern, text_lower):
                issues.append(HallucinationIssue(
                    type=HallucinationType.FACTUAL_ERROR,
                    severity=RuleSeverity.INFO,
                    description='Wardrobe essential oversimplification detected',
                    confidence=0.60,
                    suggestion=fact,
                    details={'pattern': pattern, 'category': 'wardrobe_essential_myth'}
                ))

        # ==========================================
        # ★ 新增: 20. PATTERN AND PRINT RULES (6 rules)
        # ==========================================
        pattern_rules = [
            (r'波点.*幼稚', 'Polka dots range from playful to sophisticated depending on scale/color'),
            (r'条纹.*过时', 'Stripes are a timeless classic that never truly goes out of style'),
            (r'花卉.*只.*春天', 'Floral prints work year-round with appropriate fabrics and colors'),
            (r'动物纹.*俗气', 'Animal prints can be luxurious when used sparingly as accents'),
            (r'格子.*死板', 'Plaid patterns offer versatility from preppy to grunge aesthetics'),
            (r'几何图案.*冷冰冰', 'Geometric patterns can be warm and approachable with right colors'),
        ]

        for pattern, fact in pattern_rules:
            if re.search(pattern, text_lower):
                issues.append(HallucinationIssue(
                    type=HallucinationType.FACTUAL_ERROR,
                    severity=RuleSeverity.WARNING,
                    description='Pattern/print stereotype detected',
                    confidence=0.68,
                    suggestion=fact,
                    details={'pattern': pattern, 'category': 'pattern_stereotype'}
                ))

        return issues

    def _check_logical_consistency(
        self,
        text: str,
        context: Dict[str, Any]
    ) -> List[HallucinationIssue]:
        """
        Check internal logical consistency.

        Detects contradictions within the text.
        """
        issues = []

        # Check for contradictory statements
        contradictions = [
            (r'正式.*休闲', 'casual', 'Contradiction between formal and casual'),
            (r'正式.*运动', 'sporty', 'Contradiction between formal and sporty'),
            (r'夏天.*冬[天季]', 'winter', 'Contradiction between seasons'),
            (r'不要.*必须', None, 'Contradictory recommendations'),
            (r'避免.*推荐', None, 'Contradictory advice'),
        ]

        for pattern1, pattern2, desc in contradictions:
            if re.search(pattern1, text):
                if pattern2 is None or re.search(pattern2, text, re.IGNORECASE):
                    issues.append(HallucinationIssue(
                        type=HallucinationType.LOGICAL_ERROR,
                        severity=RuleSeverity.WARNING,
                        description=desc or 'Potential logical inconsistency detected',
                        confidence=0.6
                    ))

        # Check for certainty markers followed by speculation
        for def_marker in self.definitive_markers:
            if re.search(def_marker, text):
                for cert_marker in self.certainty_markers:
                    if re.search(cert_marker, text):
                        issues.append(HallucinationIssue(
                            type=HallucinationType.LOGICAL_ERROR,
                            severity=RuleSeverity.INFO,
                            description='Mixed certainty levels in recommendation',
                            confidence=0.5
                        ))
                        break

        return issues

    def _check_numerical_reasonableness(
        self,
        text: str,
        context: Dict[str, Any]
    ) -> List[HallucinationIssue]:
        """
        Check numerical values for reasonableness.

        Validates temperatures, prices, and other numerical claims.
        """
        issues = []

        # Check temperatures in Celsius
        for match in self.temp_c_pattern.finditer(text):
            temp = float(match.group(1))
            if temp < self.config.min_temperature_celsius or temp > self.config.max_temperature_celsius:
                issues.append(HallucinationIssue(
                    type=HallucinationType.NUMERICAL_ERROR,
                    severity=RuleSeverity.ERROR,
                    description=f'Temperature {temp}C is outside reasonable range',
                    confidence=0.9,
                    location=match.group(0),
                    details={
                        'value': temp,
                        'unit': 'Celsius',
                        'expected_range': [
                            self.config.min_temperature_celsius,
                            self.config.max_temperature_celsius
                        ]
                    }
                ))

        # Check temperatures in Fahrenheit
        for match in self.temp_f_pattern.finditer(text):
            temp = float(match.group(1))
            # Convert to Celsius for check
            temp_c = (temp - 32) * 5 / 9
            if temp_c < self.config.min_temperature_celsius or temp_c > self.config.max_temperature_celsius:
                issues.append(HallucinationIssue(
                    type=HallucinationType.NUMERICAL_ERROR,
                    severity=RuleSeverity.ERROR,
                    description=f'Temperature {temp}F ({temp_c:.1f}C) is outside reasonable range',
                    confidence=0.9,
                    location=match.group(0),
                    details={
                        'value': temp,
                        'value_celsius': temp_c,
                        'unit': 'Fahrenheit'
                    }
                ))

        # Check prices
        for pattern in self.price_patterns:
            for match in pattern.finditer(text):
                try:
                    price_str = match.group(1).replace(',', '')
                    price = float(price_str)

                    if price < self.config.min_price_usd or price > self.config.max_price_usd:
                        issues.append(HallucinationIssue(
                            type=HallucinationType.NUMERICAL_ERROR,
                            severity=RuleSeverity.WARNING,
                            description=f'Price ${price} seems unusual',
                            confidence=0.7,
                            location=match.group(0),
                            details={
                                'value': price,
                                'expected_range': [
                                    self.config.min_price_usd,
                                    self.config.max_price_usd
                                ]
                            }
                        ))
                except ValueError:
                    pass

        # Check temperature context match
        mentioned_temp = context.get('temperature')
        if mentioned_temp is not None:
            for match in self.temp_c_pattern.finditer(text):
                text_temp = float(match.group(1))
                if abs(text_temp - mentioned_temp) > 10:
                    issues.append(HallucinationIssue(
                        type=HallucinationType.CONTEXT_MISMATCH,
                        severity=RuleSeverity.WARNING,
                        description=f'Temperature in text ({text_temp}C) differs significantly from actual ({mentioned_temp}C)',
                        confidence=0.8,
                        details={
                            'text_temperature': text_temp,
                            'actual_temperature': mentioned_temp
                        }
                    ))

        return issues

    def _check_fashion_rules(
        self,
        text: str,
        context: Dict[str, Any]
    ) -> List[HallucinationIssue]:
        """
        Check against fashion domain rules.

        Validates color combinations, occasion appropriateness, etc.
        """
        issues = []

        # Use FashionRuleValidator
        violations = self.fashion_validator.validate_text(text, context)

        for violation in violations:
            severity = violation.severity
            issue_type = HallucinationType.FASHION_RULE_VIOLATION

            if severity == RuleSeverity.ERROR:
                issue_type = HallucinationType.FABRICATION

            issues.append(HallucinationIssue(
                type=issue_type,
                severity=severity,
                description=violation.message,
                confidence=0.75,
                details={
                    'rule_name': violation.rule_name,
                    **violation.details
                }
            ))

        return issues

    def _check_context_match(
        self,
        text: str,
        context: Dict[str, Any]
    ) -> List[HallucinationIssue]:
        """
        Check if output matches the user context.

        Validates that recommendations are relevant to user's situation.
        """
        issues = []

        # Check occasion match
        occasion = context.get('occasion')
        if occasion:
            occasion_keywords = {
                'business': ['西装', '正式', '职业', 'suit', 'professional', 'formal'],
                'casual': ['休闲', '轻松', 'casual', 'relaxed', 'comfortable'],
                'date': ['约会', '浪漫', 'date', 'romantic', 'elegant'],
                'wedding': ['婚礼', '正式', 'wedding', 'formal', 'elegant'],
                'interview': ['面试', '专业', 'interview', 'professional', 'conservative'],
            }

            keywords = occasion_keywords.get(occasion.lower(), [])
            if keywords:
                has_match = any(kw.lower() in text.lower() for kw in keywords)
                if not has_match:
                    issues.append(HallucinationIssue(
                        type=HallucinationType.CONTEXT_MISMATCH,
                        severity=RuleSeverity.WARNING,
                        description=f'Recommendation may not match occasion: {occasion}',
                        confidence=0.6,
                        suggestion=f'Consider including {occasion}-appropriate items',
                        details={'occasion': occasion}
                    ))

        # Check body type match
        body_type = context.get('body_type')
        if body_type:
            body_type_keywords = {
                'hourglass': ['腰线', '收腰', 'waist', 'fitted', 'belted'],
                'pear': ['上半身', '肩', 'upper', 'shoulder', 'a-line'],
                'apple': ['腿部', 'v领', 'legs', 'v-neck', 'empire'],
                'rectangle': ['曲线', '层次', 'curve', 'layer', 'belt'],
                'inverted_triangle': ['下半身', '阔腿', 'lower', 'wide-leg', 'a-line'],
            }

            keywords = body_type_keywords.get(body_type.lower(), [])
            if keywords:
                has_match = any(kw.lower() in text.lower() for kw in keywords)
                if not has_match:
                    issues.append(HallucinationIssue(
                        type=HallucinationType.CONTEXT_MISMATCH,
                        severity=RuleSeverity.INFO,
                        description=f'Recommendation may not address {body_type} body type',
                        confidence=0.5,
                        details={'body_type': body_type}
                    ))

        return issues

    def _calculate_confidence(self, issues: List[HallucinationIssue]) -> float:
        """
        Calculate overall confidence score from detected issues.

        Uses weighted scoring based on issue severity and count.
        """
        if not issues:
            return 1.0

        # Count issues by severity
        error_count = sum(1 for i in issues if i.severity == RuleSeverity.ERROR)
        warning_count = sum(1 for i in issues if i.severity == RuleSeverity.WARNING)
        info_count = sum(1 for i in issues if i.severity == RuleSeverity.INFO)

        # Calculate weighted penalty
        error_penalty = min(error_count * 0.25, 0.8)  # Cap at 0.8
        warning_penalty = min(warning_count * 0.10, 0.4)
        info_penalty = min(info_count * 0.05, 0.2)

        # Average confidence of issues
        if issues:
            avg_issue_confidence = sum(i.confidence for i in issues) / len(issues)
        else:
            avg_issue_confidence = 0

        # Combine into final score
        base_score = 1.0
        penalty = error_penalty + warning_penalty + info_penalty
        confidence_adjustment = avg_issue_confidence * 0.1

        final_score = base_score - penalty - confidence_adjustment

        return max(0.0, min(1.0, final_score))

    def _log_detection(self, result: HallucinationResult, text_preview: str):
        """Log detection result for monitoring."""
        log_data = {
            'is_hallucination': result.is_hallucination,
            'confidence_score': result.confidence_score,
            'issue_count': len(result.issues),
            'critical_count': len(result.get_critical_issues()),
            'processing_time_ms': result.processing_time_ms,
            'text_preview': text_preview[:50]
        }

        if result.is_hallucination:
            logger.warning(f"Hallucination detected: {log_data}")
        else:
            logger.info(f"Validation passed: {log_data}")

    def validate_and_correct(
        self,
        text: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Tuple[str, HallucinationResult]:
        """
        Validate text and suggest corrections.

        Args:
            text: Text to validate
            context: Validation context

        Returns:
            Tuple of (corrected_text, detection_result)
        """
        result = self.detect(text, context)
        corrected_text = text

        # Apply automatic corrections for high-confidence issues
        for issue in result.issues:
            if issue.confidence > 0.8 and issue.suggestion:
                # Mark the issue in text rather than auto-correct
                # (auto-correction in fashion domain is risky)
                pass

        return corrected_text, result


class BatchHallucinationDetector:
    """
    Batch processor for hallucination detection.

    Useful for processing multiple outputs efficiently.
    """

    def __init__(self, detector: HallucinationDetector):
        self.detector = detector

    def detect_batch(
        self,
        texts: List[str],
        contexts: Optional[List[Dict[str, Any]]] = None
    ) -> List[HallucinationResult]:
        """
        Detect hallucinations in multiple texts.

        Args:
            texts: List of texts to analyze
            contexts: Optional list of contexts (one per text)

        Returns:
            List of detection results
        """
        results = []
        contexts = contexts or [None] * len(texts)

        for text, context in zip(texts, contexts):
            result = self.detector.detect(text, context)
            results.append(result)

        return results

    def get_aggregate_stats(
        self,
        results: List[HallucinationResult]
    ) -> Dict[str, Any]:
        """
        Get aggregate statistics from batch detection.

        Args:
            results: List of detection results

        Returns:
            Aggregate statistics
        """
        total = len(results)
        if total == 0:
            return {'total': 0}

        hallucination_count = sum(1 for r in results if r.is_hallucination)
        avg_confidence = sum(r.confidence_score for r in results) / total
        total_issues = sum(len(r.issues) for r in results)
        avg_processing_time = sum(r.processing_time_ms for r in results) / total

        # Count issues by type
        issue_types = {}
        for result in results:
            for issue in result.issues:
                type_name = issue.type.value
                issue_types[type_name] = issue_types.get(type_name, 0) + 1

        return {
            'total': total,
            'hallucination_count': hallucination_count,
            'hallucination_rate': hallucination_count / total,
            'average_confidence': avg_confidence,
            'total_issues': total_issues,
            'issues_per_text': total_issues / total,
            'issue_types': issue_types,
            'average_processing_time_ms': avg_processing_time
        }
