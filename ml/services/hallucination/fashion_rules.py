"""
Fashion Rules Module for Hallucination Detection

Defines fashion domain rules for validating LLM outputs:
- Color matching rules
- Occasion dressing rules
- Season-appropriate clothing rules
- Body type styling rules

Based on 2026 Fashion Industry Standards and Color Theory
"""

import re
from typing import Dict, List, Optional, Set, Tuple, Any
from dataclasses import dataclass, field
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class RuleSeverity(Enum):
    """Severity level for rule violations"""
    ERROR = "error"      # Major violation, likely hallucination
    WARNING = "warning"  # Minor violation, needs review
    INFO = "info"        # Style suggestion, not a violation


@dataclass
class RuleViolation:
    """Represents a rule violation"""
    rule_name: str
    severity: RuleSeverity
    message: str
    details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ColorRule:
    """Color matching rule definition"""
    name: str
    primary_colors: Set[str]
    complementary_colors: Set[str]
    analogous_colors: Set[str]
    avoid_combinations: List[Set[str]]
    notes: str = ""


@dataclass
class OccasionRule:
    """Occasion dressing rule definition"""
    occasion: str
    formality_level: str  # casual, smart_casual, business, formal, black_tie
    required_items: List[str]
    forbidden_items: List[str]
    recommended_fabrics: List[str]
    avoid_fabrics: List[str]
    color_guidelines: Dict[str, List[str]]
    notes: str = ""


@dataclass
class SeasonRule:
    """Season-appropriate clothing rule"""
    season: str
    temperature_range: Tuple[int, int]  # Celsius
    recommended_materials: List[str]
    avoid_materials: List[str]
    layering_rules: Dict[str, str]
    color_palettes: List[str]
    essential_items: List[str]
    avoid_items: List[str]


@dataclass
class BodyTypeRule:
    """Body type styling rule"""
    body_type: str
    characteristics: List[str]
    styling_goals: List[str]
    recommended_silhouettes: List[str]
    avoid_silhouettes: List[str]
    focal_points: List[str]
    proportion_tips: Dict[str, str]


class FashionRuleValidator:
    """
    Fashion Rule Validator

    Validates LLM outputs against fashion domain rules to detect
    potential hallucinations in outfit recommendations.
    """

    # Color name mappings for Chinese and English
    COLOR_MAPPINGS = {
        # Chinese to English
        '红色': 'red', '蓝色': 'blue', '绿色': 'green', '黄色': 'yellow',
        '橙色': 'orange', '紫色': 'purple', '粉色': 'pink', '黑色': 'black',
        '白色': 'white', '灰色': 'gray', '棕色': 'brown', '米色': 'beige',
        '藏青': 'navy', '酒红': 'burgundy', '墨绿': 'dark_green',
        '卡其': 'khaki', '驼色': 'camel', '军绿': 'army_green',
        '藏蓝': 'navy', '深蓝': 'dark_blue', '浅蓝': 'light_blue',
        '深灰': 'dark_gray', '浅灰': 'light_gray', '杏色': 'apricot',
        '薄荷绿': 'mint', '珊瑚色': 'coral', '芥末黄': 'mustard',
        '铁锈红': 'rust', '奶油色': 'cream', '象牙白': 'ivory',
        '炭灰': 'charcoal', '天蓝': 'sky_blue', '宝蓝': 'royal_blue',
        '靛蓝': 'indigo', '橄榄绿': 'olive', '森林绿': 'forest_green',
        '薰衣草紫': 'lavender', '玫瑰粉': 'rose', '裸色': 'nude',
        '巧克力色': 'chocolate', '咖啡色': 'coffee',
    }

    # Common color harmony rules
    COLOR_HARMONY_RULES = {
        'complementary': {
            'red': ['green'],
            'blue': ['orange'],
            'yellow': ['purple'],
            'orange': ['blue'],
            'green': ['red'],
            'purple': ['yellow'],
        },
        'analogous': {
            'red': ['orange', 'purple'],
            'orange': ['red', 'yellow'],
            'yellow': ['orange', 'green'],
            'green': ['yellow', 'blue'],
            'blue': ['green', 'purple'],
            'purple': ['blue', 'red'],
        },
    }

    # Clashing color combinations (should be flagged)
    CLASHING_COLORS = [
        {'red', 'pink'},
        {'orange', 'red', 'pink'},
        {'neon_green', 'hot_pink'},
    ]

    # ==========================================
    # COLOR THEORY RULES - Extended
    # ==========================================
    # 60-30-10 rule: dominant, secondary, accent colors
    COLOR_PROPORTION_RULE = {
        'dominant': 0.60,  # Main color
        'secondary': 0.30,  # Supporting color
        'accent': 0.10,  # Pop color
    }

    # Warm colors (advancing, energetic)
    WARM_COLORS = {
        'red', 'orange', 'yellow', 'coral', 'peach', 'salmon',
        'rust', 'burgundy', 'maroon', 'tomato', 'crimson',
        'amber', 'gold', 'apricot', 'terracotta', 'copper'
    }

    # Cool colors (receding, calming)
    COOL_COLORS = {
        'blue', 'green', 'purple', 'teal', 'turquoise', 'cyan',
        'navy', 'indigo', 'lavender', 'periwinkle', 'mint',
        'forest_green', 'emerald', 'sapphire', 'slate'
    }

    # Neutral colors (versatile, grounding)
    NEUTRAL_COLORS = {
        'black', 'white', 'gray', 'beige', 'brown', 'tan',
        'cream', 'ivory', 'charcoal', 'camel', 'khaki',
        'taupe', 'nude', 'champagne', 'silver'
    }

    # Color temperature compatibility matrix
    COLOR_TEMPERATURE_COMPATIBILITY = {
        'warm': {
            'best_with': ['warm', 'neutral'],
            'challenging_with': ['cool'],
            'examples': ['red+gold', 'orange+cream', 'coral+beige']
        },
        'cool': {
            'best_with': ['cool', 'neutral'],
            'challenging_with': ['warm'],
            'examples': ['blue+silver', 'purple+gray', 'teal+white']
        },
        'neutral': {
            'best_with': ['warm', 'cool', 'neutral'],
            'challenging_with': [],
            'examples': ['black+any', 'white+any', 'beige+any']
        }
    }

    # Triadic color schemes (3 colors equally spaced on color wheel)
    TRIADIC_SCHEMES = [
        {'red', 'yellow', 'blue'},
        {'orange', 'green', 'purple'},
        {'red_orange', 'yellow_green', 'blue_violet'},
    ]

    # Split-complementary schemes (base + two adjacent to complement)
    SPLIT_COMPLEMENTARY = {
        'red': ['yellow_green', 'blue_green'],
        'blue': ['red_orange', 'yellow_orange'],
        'yellow': ['red_violet', 'blue_violet'],
        'green': ['red_orange', 'red_violet'],
        'orange': ['blue_green', 'blue_violet'],
        'purple': ['yellow_green', 'yellow_orange'],
    }

    # Skin tone color recommendations
    SKIN_TONE_COLORS = {
        'fair': {
            'best': ['pastels', 'soft_pinks', 'light_blues', 'lavender', 'peach'],
            'avoid': ['harsh_oranges', 'mustard', 'rust']
        },
        'light': {
            'best': ['soft_corals', 'rose', 'sky_blue', 'mint', 'soft_yellow'],
            'avoid': ['neon', 'harsh_white']
        },
        'medium': {
            'best': ['warm_tones', 'coral', 'turquoise', 'olive', 'mustard'],
            'avoid': ['pale_pastels', 'washed_out_colors']
        },
        'olive': {
            'best': ['earth_tones', 'terracotta', 'forest_green', 'burgundy', 'gold'],
            'avoid': ['cool_pastels', 'icy_colors']
        },
        'tan': {
            'best': ['bright_colors', 'white', 'coral', 'turquoise', 'yellow'],
            'avoid': ['muddy_browns', 'dull_colors']
        },
        'dark': {
            'best': ['vibrant_colors', 'jewel_tones', 'white', 'bright_yellow', 'cobalt'],
            'avoid': ['dark_browns', 'muted_colors']
        }
    }

    # Occasion definitions with rules
    OCCASION_RULES: Dict[str, OccasionRule] = {
        'business': OccasionRule(
            occasion='business',
            formality_level='business',
            required_items=['dress_shirt', 'dress_pants', 'closed_toe_shoes'],
            forbidden_items=['shorts', 'flip_flops', 'tank_tops', 'ripped_jeans'],
            recommended_fabrics=['wool', 'cotton', 'silk', 'linen'],
            avoid_fabrics=['denim', 'jersey', 'velvet'],
            color_guidelines={
                'recommended': ['navy', 'black', 'gray', 'white', 'beige', 'burgundy'],
                'avoid': ['neon', 'bright_orange', 'hot_pink']
            },
            notes='Business attire should be professional and polished'
        ),
        'casual': OccasionRule(
            occasion='casual',
            formality_level='casual',
            required_items=[],
            forbidden_items=[],
            recommended_fabrics=['cotton', 'denim', 'jersey', 'linen'],
            avoid_fabrics=[],
            color_guidelines={
                'recommended': ['any'],
                'avoid': []
            },
            notes='Casual wear allows for personal expression'
        ),
        'formal': OccasionRule(
            occasion='formal',
            formality_level='formal',
            required_items=['dress_shirt', 'dress_pants_or_skirt', 'dress_shoes'],
            forbidden_items=['jeans', 'sneakers', 't_shirts', 'shorts'],
            recommended_fabrics=['silk', 'satin', 'velvet', 'fine_wool'],
            avoid_fabrics=['denim', 'cotton_jersey', 'polyester'],
            color_guidelines={
                'recommended': ['black', 'navy', 'burgundy', 'emerald', 'gold'],
                'avoid': ['neon', 'loud_patterns']
            },
            notes='Formal occasions require elegant, refined attire'
        ),
        'date': OccasionRule(
            occasion='date',
            formality_level='smart_casual',
            required_items=[],
            forbidden_items=['stained_clothes', 'wrinkled_clothes'],
            recommended_fabrics=['cotton', 'silk', 'cashmere', 'linen'],
            avoid_fabrics=['polyester'],
            color_guidelines={
                'recommended': ['red', 'burgundy', 'navy', 'black', 'soft_pinks'],
                'avoid': ['neon_green', 'bright_orange']
            },
            notes='Date outfits should be attractive but comfortable'
        ),
        'interview': OccasionRule(
            occasion='interview',
            formality_level='business',
            required_items=['professional_top', 'professional_bottom'],
            forbidden_items=['jeans', 'sneakers', 'revealing_clothes', 'wrinkled_clothes'],
            recommended_fabrics=['wool', 'cotton', 'blend'],
            avoid_fabrics=['leather', 'denim', 'shiny_materials'],
            color_guidelines={
                'recommended': ['navy', 'black', 'gray', 'white', 'light_blue'],
                'avoid': ['red', 'neon', 'bright_colors', 'busy_patterns']
            },
            notes='Interview attire should be conservative and professional'
        ),
        'party': OccasionRule(
            occasion='party',
            formality_level='smart_casual',
            required_items=[],
            forbidden_items=[],
            recommended_fabrics=['silk', 'satin', 'velvet', 'sequin'],
            avoid_fabrics=[],
            color_guidelines={
                'recommended': ['any'],
                'avoid': []
            },
            notes='Party wear can be fun and expressive'
        ),
        'wedding_guest': OccasionRule(
            occasion='wedding_guest',
            formality_level='formal',
            required_items=[],
            forbidden_items=['white', 'overly_casual', 'jeans', 'sneakers'],
            recommended_fabrics=['chiffon', 'silk', 'lace', 'fine_wool'],
            avoid_fabrics=['denim', 'cotton_jersey'],
            color_guidelines={
                'recommended': ['pastels', 'jewel_tones', 'florals'],
                'avoid': ['white', 'cream', 'black_for_day_weddings']
            },
            notes='Never wear white to a wedding unless specified'
        ),
        'workout': OccasionRule(
            occasion='workout',
            formality_level='casual',
            required_items=['athletic_shoes'],
            forbidden_items=['jeans', 'dress_shoes', 'jewelry'],
            recommended_fabrics=['moisture_wicking', 'spandex', 'nylon', 'polyester'],
            avoid_fabrics=['cotton', 'denim', 'wool'],
            color_guidelines={
                'recommended': ['any'],
                'avoid': []
            },
            notes='Workout clothes should be functional'
        ),
        'beach': OccasionRule(
            occasion='beach',
            formality_level='casual',
            required_items=[],
            forbidden_items=['formal_wear', 'high_heels'],
            recommended_fabrics=['cotton', 'linen', 'swimwear_materials'],
            avoid_fabrics=['wool', 'leather', 'silk'],
            color_guidelines={
                'recommended': ['bright', 'pastels', 'white', 'navy'],
                'avoid': ['dark_heavy_colors']
            },
            notes='Beach wear should be light and comfortable'
        ),
    }

    # Season rules
    SEASON_RULES: Dict[str, SeasonRule] = {
        'spring': SeasonRule(
            season='spring',
            temperature_range=(10, 22),
            recommended_materials=['cotton', 'linen', 'light_wool', 'chambray'],
            avoid_materials=['heavy_wool', 'fur', 'thick_fleece'],
            layering_rules={
                'light_jacket': 'For cooler mornings and evenings',
                'cardigan': 'Easy to add or remove',
            },
            color_palettes=['pastels', 'florals', 'light_neutrals', 'soft_colors'],
            essential_items=['light_jacket', 'cardigan', 'light_scarf'],
            avoid_items=['heavy_coats', 'thick_sweaters', 'fur_boots']
        ),
        'summer': SeasonRule(
            season='summer',
            temperature_range=(25, 40),
            recommended_materials=['cotton', 'linen', 'rayon', 'silk', 'bamboo'],
            avoid_materials=['wool', 'polyester', 'fleece', 'leather'],
            layering_rules={
                'minimal': 'Light layers only',
            },
            color_palettes=['whites', 'pastels', 'bright_colors', 'nudes'],
            essential_items=['breathable_top', 'shorts_or_skirt', 'sandals'],
            avoid_items=['heavy_fabrics', 'dark_colors', 'boots', 'sweaters']
        ),
        'autumn': SeasonRule(
            season='autumn',
            temperature_range=(8, 20),
            recommended_materials=['wool', 'cotton', 'corduroy', 'tweed', 'cashmere'],
            avoid_materials=['sheer_fabrics', 'linen'],
            layering_rules={
                'layering': 'Perfect for layering',
                'jacket': 'Medium weight jackets',
            },
            color_palettes=['earth_tones', 'burgundy', 'mustard', 'olive', 'brown'],
            essential_items=['light_coat', 'sweater', 'boots', 'scarf'],
            avoid_items=['flip_flops', 'shorts', 'tank_tops']
        ),
        'winter': SeasonRule(
            season='winter',
            temperature_range=(-10, 10),
            recommended_materials=['wool', 'cashmere', 'down', 'fleece', 'leather'],
            avoid_materials=['linen', 'cotton', 'sheer_fabrics'],
            layering_rules={
                'heavy_layering': 'Multiple layers recommended',
                'coat': 'Heavy coat essential',
            },
            color_palettes=['dark_colors', 'jewel_tones', 'neutrals', 'black'],
            essential_items=['heavy_coat', 'sweater', 'boots', 'gloves', 'scarf', 'hat'],
            avoid_items=['sandals', 'shorts', 'light_dresses', 'linen']
        ),
    }

    # Body type rules
    BODY_TYPE_RULES: Dict[str, BodyTypeRule] = {
        'hourglass': BodyTypeRule(
            body_type='hourglass',
            characteristics=['balanced_bust_hips', 'defined_waist'],
            styling_goals=['highlight_waist', 'maintain_proportions'],
            recommended_silhouettes=['fitted', 'wrap_dresses', 'belted_styles', 'peplum'],
            avoid_silhouettes=['boxy', 'shapeless', 'oversized'],
            focal_points=['waist'],
            proportion_tips={
                'tops': 'Fitted tops that define waist',
                'bottoms': 'High-waisted styles',
                'dresses': 'Wrap or belted dresses',
            }
        ),
        'pear': BodyTypeRule(
            body_type='pear',
            characteristics=['narrower_shoulders', 'wider_hips', 'defined_waist'],
            styling_goals=['balance_upper_body', 'elongate_legs'],
            recommended_silhouettes=['a_line', 'fit_and_flare', 'boat_neck', 'off_shoulder'],
            avoid_silhouettes=['tight_bottoms', 'hip_details', 'clam_diggers'],
            focal_points=['upper_body', 'waist'],
            proportion_tips={
                'tops': 'Add volume to shoulders',
                'bottoms': 'A-line or wide-leg pants',
                'dresses': 'Fit and flare styles',
            }
        ),
        'apple': BodyTypeRule(
            body_type='apple',
            characteristics=['fuller_midsection', 'slimmer_legs', 'broad_shoulders'],
            styling_goals=['elongate_torso', 'show_legs'],
            recommended_silhouettes=['empire_waist', 'v_neck', 'wrap_styles', 'flowy'],
            avoid_silhouettes=['tight_waist', 'crop_tops', 'clinging_fabrics'],
            focal_points=['legs', 'decolletage'],
            proportion_tips={
                'tops': 'V-necks and empire waist',
                'bottoms': 'Show off slim legs',
                'dresses': 'Empire waist or A-line',
            }
        ),
        'rectangle': BodyTypeRule(
            body_type='rectangle',
            characteristics=['similar_measurements', 'less_defined_waist'],
            styling_goals=['create_curves', 'define_waist'],
            recommended_silhouettes=['peplum', 'ruched', 'layered', 'belted'],
            avoid_silhouettes=['shapeless', 'straight_cut'],
            focal_points=['waist', 'creating_volume'],
            proportion_tips={
                'tops': 'Add details and volume',
                'bottoms': 'Create curves with details',
                'dresses': 'Belted or peplum styles',
            }
        ),
        'inverted_triangle': BodyTypeRule(
            body_type='inverted_triangle',
            characteristics=['broad_shoulders', 'narrower_hips'],
            styling_goals=['balance_lower_body', 'soften_shoulders'],
            recommended_silhouettes=['wide_leg', 'a_line', 'v_neck', 'scoop_neck'],
            avoid_silhouettes=['shoulder_pads', 'boat_neck', 'tight_top_loose_bottom'],
            focal_points=['lower_body', 'vertical_lines'],
            proportion_tips={
                'tops': 'Simple, minimal detail',
                'bottoms': 'Add volume and details',
                'dresses': 'A-line with simple top',
            }
        ),
        # ==========================================
        # EXTENDED BODY TYPE RULES
        # ==========================================
        'petite': BodyTypeRule(
            body_type='petite',
            characteristics=['height_under_165cm', 'proportioned_frame'],
            styling_goals=['elongate_silhouette', 'create_vertical_lines'],
            recommended_silhouettes=['high_waist', 'vertical_stripes', 'monochrome', 'fitted'],
            avoid_silhouettes=['oversized', 'ankle_straps', 'horizontal_stripes', 'long_coats'],
            focal_points=['vertical_lines', 'waist'],
            proportion_tips={
                'tops': 'Fitted, cropped or tucked in',
                'bottoms': 'High-waisted, straight or wide-leg',
                'dresses': 'Above knee or maxi with heels',
            }
        ),
        'tall': BodyTypeRule(
            body_type='tall',
            characteristics=['height_over_175cm', 'long_limbs'],
            styling_goals=['break_up_vertical_line', 'create_proportion'],
            recommended_silhouettes=['wide_leg', 'maxi', 'layers', 'bold_prints'],
            avoid_silhouettes=['vertical_stripes', 'super_fitted', 'mini_skirts'],
            focal_points=['waist', 'horizontal_lines'],
            proportion_tips={
                'tops': 'Layered looks, tunics',
                'bottoms': 'Wide-leg, cropped styles',
                'dresses': 'Maxi, midi lengths',
            }
        ),
        'plus_size': BodyTypeRule(
            body_type='plus_size',
            characteristics=['fuller_figure', 'curves'],
            styling_goals=['highlight_best_features', 'create_balance'],
            recommended_silhouettes=['wrap_dresses', 'a_line', 'empire_waist', 'v_neck'],
            avoid_silhouettes=['shapeless', 'tight', 'clingy', 'boxy'],
            focal_points=['waist', 'decolletage', 'legs'],
            proportion_tips={
                'tops': 'V-necks, structured shoulders',
                'bottoms': 'A-line, bootcut, straight',
                'dresses': 'Wrap, fit-and-flare',
            }
        ),
        'athletic': BodyTypeRule(
            body_type='athletic',
            characteristics=['muscular_build', 'defined_shoulders'],
            styling_goals=['soften_lines', 'add_femininity'],
            recommended_silhouettes=['ruched', 'ruffles', 'wrap', 'peplum'],
            avoid_silhouettes=['boxy', 'oversized', 'minimalist'],
            focal_points=['curves', 'feminine_details'],
            proportion_tips={
                'tops': 'Details, ruching, soft fabrics',
                'bottoms': 'A-line, skirts with movement',
                'dresses': 'Wrap, fit-and-flare with details',
            }
        ),
    }

    # Item type mappings
    ITEM_MAPPINGS = {
        # Tops
        '衬衫': 'dress_shirt', 'T恤': 't_shirt', '毛衣': 'sweater',
        '外套': 'jacket', '西装': 'blazer', '卫衣': 'hoodie',
        '针织衫': 'knit_top', '雪纺衫': 'chiffon_top',
        '背心': 'tank_top', '吊带': 'camisole',

        # Bottoms
        '牛仔裤': 'jeans', '西裤': 'dress_pants', '休闲裤': 'casual_pants',
        '短裤': 'shorts', '短裙': 'skirt', '长裙': 'long_skirt',
        '连衣裙': 'dress', '阔腿裤': 'wide_leg_pants',

        # Shoes
        '运动鞋': 'sneakers', '高跟鞋': 'high_heels', '平底鞋': 'flats',
        '靴子': 'boots', '凉鞋': 'sandals', '拖鞋': 'flip_flops',

        # Accessories
        '围巾': 'scarf', '帽子': 'hat', '手套': 'gloves',
        '腰带': 'belt', '手表': 'watch', '项链': 'necklace',
    }

    def __init__(self):
        self.violations: List[RuleViolation] = []

    def validate_color_combination(
        self,
        colors: List[str],
        context: Optional[Dict[str, Any]] = None
    ) -> List[RuleViolation]:
        """
        Validate color combination against fashion rules.

        Args:
            colors: List of colors in the outfit
            context: Additional context (occasion, season, etc.)

        Returns:
            List of rule violations
        """
        violations = []

        # Normalize colors
        normalized_colors = []
        for color in colors:
            color_lower = color.lower().strip()
            # Map Chinese to English
            normalized = self.COLOR_MAPPINGS.get(color_lower, color_lower)
            normalized_colors.append(normalized)

        # Check for too many colors (more than 4 is generally too busy)
        unique_colors = set(normalized_colors)
        if len(unique_colors) > 4:
            violations.append(RuleViolation(
                rule_name='too_many_colors',
                severity=RuleSeverity.WARNING,
                message=f'Too many colors ({len(unique_colors)}). Consider limiting to 3-4 colors.',
                details={'colors': list(unique_colors)}
            ))

        # Check for known clashing combinations
        for clashing_set in self.CLASHING_COLORS:
            if clashing_set.issubset(unique_colors):
                violations.append(RuleViolation(
                    rule_name='clashing_colors',
                    severity=RuleSeverity.WARNING,
                    message=f'Colors {clashing_set} may clash. Consider alternative combinations.',
                    details={'clashing_colors': list(clashing_set)}
                ))

        # Check context-specific color rules
        if context:
            occasion = context.get('occasion', '').lower()
            if occasion in self.OCCASION_RULES:
                rule = self.OCCASION_RULES[occasion]
                avoid_colors = rule.color_guidelines.get('avoid', [])

                for color in unique_colors:
                    for avoid in avoid_colors:
                        if avoid in color or color in avoid:
                            violations.append(RuleViolation(
                                rule_name='occasion_color_violation',
                                severity=RuleSeverity.WARNING,
                                message=f'Color "{color}" may not be appropriate for {occasion} occasion.',
                                details={
                                    'color': color,
                                    'occasion': occasion,
                                    'suggestion': f'Avoid {avoid} for {occasion}'
                                }
                            ))

        # Check color temperature compatibility
        violations.extend(self._validate_color_temperature(normalized_colors))

        # Check skin tone color recommendations
        if context and context.get('skin_tone'):
            violations.extend(self._validate_skin_tone_colors(
                normalized_colors, context['skin_tone']
            ))

        return violations

    def _validate_color_temperature(self, colors: List[str]) -> List[RuleViolation]:
        """Validate color temperature compatibility."""
        violations = []

        warm_count = sum(1 for c in colors if c in self.WARM_COLORS)
        cool_count = sum(1 for c in colors if c in self.COOL_COLORS)
        neutral_count = sum(1 for c in colors if c in self.NEUTRAL_COLORS)

        # Check for excessive mixing of warm and cool without neutrals
        if warm_count > 0 and cool_count > 0 and neutral_count == 0:
            violations.append(RuleViolation(
                rule_name='color_temperature_mismatch',
                severity=RuleSeverity.INFO,
                message='Mixing warm and cool colors without neutrals can be challenging.',
                details={
                    'warm_colors': [c for c in colors if c in self.WARM_COLORS],
                    'cool_colors': [c for c in colors if c in self.COOL_COLORS],
                    'suggestion': 'Consider adding a neutral color as a bridge'
                }
            ))

        return violations

    def _validate_skin_tone_colors(
        self,
        colors: List[str],
        skin_tone: str
    ) -> List[RuleViolation]:
        """Validate colors against skin tone recommendations."""
        violations = []

        skin_tone_key = skin_tone.lower()
        recommendations = self.SKIN_TONE_COLORS.get(skin_tone_key)

        if not recommendations:
            return violations

        avoid_colors = recommendations.get('avoid', [])

        for color in colors:
            for avoid in avoid_colors:
                if avoid.replace('_', ' ') in color or color in avoid.replace('_', ' '):
                    violations.append(RuleViolation(
                        rule_name='skin_tone_color_mismatch',
                        severity=RuleSeverity.INFO,
                        message=f'Color "{color}" may not be ideal for {skin_tone} skin tone.',
                        details={
                            'color': color,
                            'skin_tone': skin_tone,
                            'suggestion': f'Consider: {", ".join(recommendations.get("best", [])[:3])}'
                        }
           ))

        return violations

    def validate_occasion_appropriateness(
        self,
        items: List[str],
        occasion: str,
        context: Optional[Dict[str, Any]] = None
    ) -> List[RuleViolation]:
        """
        Validate if items are appropriate for the occasion.

        Args:
            items: List of clothing items
            occasion: Target occasion
            context: Additional context

        Returns:
            List of rule violations
        """
        violations = []

        occasion_key = occasion.lower().replace(' ', '_').replace('-', '_')
        rule = self.OCCASION_RULES.get(occasion_key)

        if not rule:
            # Try partial match
            for key, r in self.OCCASION_RULES.items():
                if key in occasion_key or occasion_key in key:
                    rule = r
                    break

        if not rule:
            return violations

        # Normalize items
        normalized_items = []
        for item in items:
            item_lower = item.lower().strip()
            normalized = self.ITEM_MAPPINGS.get(item_lower, item_lower)
            normalized_items.append(normalized)

        # Check for forbidden items
        for item in normalized_items:
            for forbidden in rule.forbidden_items:
                if forbidden in item or item in forbidden:
                    violations.append(RuleViolation(
                        rule_name='forbidden_occasion_item',
                        severity=RuleSeverity.ERROR,
                        message=f'Item "{item}" is not appropriate for {occasion}.',
                        details={
                            'item': item,
                            'occasion': occasion,
                            'forbidden': forbidden
                        }
                    ))

        return violations

    def validate_season_appropriateness(
        self,
        items: List[str],
        season: str,
        temperature: Optional[int] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> List[RuleViolation]:
        """
        Validate if items are appropriate for the season/temperature.

        Args:
            items: List of clothing items
            season: Target season (spring, summer, autumn, winter)
            temperature: Current temperature in Celsius
            context: Additional context

        Returns:
            List of rule violations
        """
        violations = []

        season_key = season.lower()
        rule = self.SEASON_RULES.get(season_key)

        if not rule:
            return violations

        # Check temperature consistency
        if temperature is not None:
            temp_range = rule.temperature_range
            if not (temp_range[0] <= temperature <= temp_range[1]):
                violations.append(RuleViolation(
                    rule_name='temperature_mismatch',
                    severity=RuleSeverity.WARNING,
                    message=f'Temperature {temperature}C does not match typical {season} range ({temp_range[0]}-{temp_range[1]}C).',
                    details={
                        'temperature': temperature,
                        'season': season,
                        'expected_range': temp_range
                    }
                ))

        # Check for items to avoid in this season
        normalized_items = [item.lower() for item in items]

        for avoid_item in rule.avoid_items:
            for item in normalized_items:
                if avoid_item.lower() in item or item in avoid_item.lower():
                    violations.append(RuleViolation(
                        rule_name='season_inappropriate_item',
                        severity=RuleSeverity.WARNING,
                        message=f'Item "{item}" is not typically worn in {season}.',
                        details={
                            'item': item,
                            'season': season,
                            'suggestion': f'Consider {", ".join(rule.essential_items[:3])}'
                        }
                    ))

        return violations

    def validate_body_type_recommendation(
        self,
        recommendation: str,
        body_type: str,
        items: List[str],
        context: Optional[Dict[str, Any]] = None
    ) -> List[RuleViolation]:
        """
        Validate if recommendation matches body type rules.

        Args:
            recommendation: The text recommendation
            body_type: Target body type
            items: Recommended items
            context: Additional context

        Returns:
            List of rule violations
        """
        violations = []

        body_type_key = body_type.lower().replace(' ', '_').replace('-', '_')
        rule = self.BODY_TYPE_RULES.get(body_type_key)

        if not rule:
            return violations

        # Check for avoided silhouettes
        for avoid in rule.avoid_silhouettes:
            avoid_lower = avoid.lower().replace('_', ' ')
            if avoid_lower in recommendation.lower():
                violations.append(RuleViolation(
                    rule_name='body_type_avoided_silhouette',
                    severity=RuleSeverity.WARNING,
                    message=f'Silhouette "{avoid}" is not recommended for {body_type} body type.',
                    details={
                        'silhouette': avoid,
                        'body_type': body_type,
                        'suggestion': f'Try: {", ".join(rule.recommended_silhouettes[:3])}'
                    }
                ))

        return violations

    def validate_temperature_clothing_match(
        self,
        items: List[str],
        temperature: int,
        context: Optional[Dict[str, Any]] = None
    ) -> List[RuleViolation]:
        """
        Validate if clothing items match the temperature.

        Args:
            items: List of clothing items
            temperature: Temperature in Celsius
            context: Additional context

        Returns:
            List of rule violations
        """
        violations = []

        # Define temperature thresholds
        hot_threshold = 28
        warm_threshold = 22
        cool_threshold = 15
        cold_threshold = 5

        # Hot weather items that shouldn't be recommended
        hot_inappropriate = ['sweater', 'coat', 'boots', 'scarf', 'gloves', 'jacket', 'hoodie']
        # Cold weather items that shouldn't be missing
        cold_essential = ['coat', 'jacket', 'sweater', 'boots']
        # Hot weather items that are good
        hot_appropriate = ['t_shirt', 'shorts', 'sandals', 'dress', 'tank_top']
        # Cold weather items that are inappropriate
        cold_inappropriate = ['shorts', 'sandals', 'tank_top', 'flip_flops']

        normalized_items = [item.lower() for item in items]

        # Hot weather check (>28C)
        if temperature > hot_threshold:
            for item in normalized_items:
                for inappropriate in hot_inappropriate:
                    if inappropriate in item:
                        violations.append(RuleViolation(
                            rule_name='hot_weather_inappropriate',
                            severity=RuleSeverity.WARNING,
                            message=f'Item "{item}" may be too warm for {temperature}C weather.',
                            details={
                                'item': item,
                                'temperature': temperature,
                                'suggestion': 'Consider lighter alternatives'
                            }
                        ))

        # Cold weather check (<5C)
        if temperature < cold_threshold:
            # Check for inappropriate items
            for item in normalized_items:
                for inappropriate in cold_inappropriate:
                    if inappropriate in item:
                        violations.append(RuleViolation(
                            rule_name='cold_weather_inappropriate',
                            severity=RuleSeverity.ERROR,
                            message=f'Item "{item}" is not appropriate for {temperature}C weather.',
                            details={
                                'item': item,
                                'temperature': temperature,
                                'suggestion': 'Consider warmer alternatives'
                            }
                        ))

            # Check if essentials are missing
            has_warm_layer = any(
                any(essential in item for essential in cold_essential)
                for item in normalized_items
            )
            if not has_warm_layer:
                violations.append(RuleViolation(
                    rule_name='missing_warm_layer',
                    severity=RuleSeverity.WARNING,
                    message=f'No warm outer layer detected for {temperature}C weather.',
                    details={
                        'temperature': temperature,
                        'suggestion': 'Add a coat or jacket'
                    }
                ))

        return violations

    def extract_colors_from_text(self, text: str) -> List[str]:
        """Extract color mentions from text."""
        colors = []

        # Check for Chinese color names
        for cn, en in self.COLOR_MAPPINGS.items():
            if cn in text:
                colors.append(en)

        # Check for English color names
        color_patterns = [
            r'\b(red|blue|green|yellow|orange|purple|pink|black|white|gray|brown|beige|navy|burgundy|khaki|camel)\b',
        ]

        for pattern in color_patterns:
            matches = re.findall(pattern, text.lower())
            colors.extend(matches)

        return list(set(colors))

    def extract_items_from_text(self, text: str) -> List[str]:
        """Extract clothing item mentions from text."""
        items = []

        # Check for Chinese item names
        for cn, en in self.ITEM_MAPPINGS.items():
            if cn in text:
                items.append(en)

        # Check for common English item patterns
        item_patterns = [
            r'\b(shirt|pants|dress|skirt|jacket|coat|sweater|shoes|boots|jeans|blouse|top|bottom)\b',
        ]

        for pattern in item_patterns:
            matches = re.findall(pattern, text.lower())
            items.extend(matches)

        return list(set(items))

    def validate_text(
        self,
        text: str,
        context: Optional[Dict[str, Any]] = None
    ) -> List[RuleViolation]:
        """
        Validate text for fashion rule violations.

        Args:
            text: Text to validate
            context: Validation context (occasion, season, body_type, temperature)

        Returns:
            List of all rule violations found
        """
        all_violations = []
        context = context or {}

        # Extract colors and items from text
        colors = self.extract_colors_from_text(text)
        items = self.extract_items_from_text(text)

        # Validate color combinations
        if colors:
            color_violations = self.validate_color_combination(colors, context)
            all_violations.extend(color_violations)

        # Validate occasion appropriateness
        occasion = context.get('occasion')
        if occasion and items:
            occasion_violations = self.validate_occasion_appropriateness(items, occasion, context)
            all_violations.extend(occasion_violations)

        # Validate season appropriateness
        season = context.get('season')
        temperature = context.get('temperature')
        if season and items:
            season_violations = self.validate_season_appropriateness(
                items, season, temperature, context
            )
            all_violations.extend(season_violations)

        # Validate temperature-clothing match
        if temperature and items:
            temp_violations = self.validate_temperature_clothing_match(items, temperature, context)
            all_violations.extend(temp_violations)

        # Validate body type recommendations
        body_type = context.get('body_type')
        if body_type:
            body_type_violations = self.validate_body_type_recommendation(
                text, body_type, items, context
            )
            all_violations.extend(body_type_violations)

        return all_violations
