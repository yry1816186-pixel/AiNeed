"""
服装美学评分系统
基于多维度美学特征评估服装搭配的视觉美感
包括：颜色协调性、构图平衡、风格一致性、时尚度评分等

NOTE: KMP_DUPLICATE_LIB_OK removed - ensure clean OpenMP environment
"""

import os
# Removed: os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'

import numpy as np
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from pathlib import Path
from PIL import Image
import cv2
from enum import Enum
import colorsys


class AestheticDimension(Enum):
    COLOR_HARMONY = "color_harmony"
    COMPOSITION = "composition"
    STYLE_CONSISTENCY = "style_consistency"
    VISUAL_BALANCE = "visual_balance"
    TRENDINESS = "trendiness"
    BODY_FIT = "body_fit"
    OCCASION_APPROPRIATENESS = "occasion_appropriateness"


@dataclass
class AestheticScore:
    dimension: str
    score: float
    max_score: float
    details: Dict[str, Any]
    suggestions: List[str]


@dataclass
class OutfitAestheticResult:
    overall_score: float
    dimension_scores: List[AestheticScore]
    strengths: List[str]
    weaknesses: List[str]
    improvement_suggestions: List[str]
    confidence: float


class ColorHarmonyAnalyzer:
    """颜色协调性分析器"""

    COLOR_WHEEL = {
        'red': 0,
        'red_orange': 30,
        'orange': 45,
        'yellow_orange': 60,
        'yellow': 90,
        'yellow_green': 120,
        'green': 150,
        'blue_green': 180,
        'cyan': 195,
        'blue': 240,
        'blue_violet': 270,
        'violet': 285,
        'purple': 300,
        'magenta': 315,
        'red_violet': 330,
    }

    HARMONY_TYPES = {
        'complementary': {'angle': 180, 'tolerance': 30, 'description': '互补色搭配，对比强烈'},
        'analogous': {'angle': 30, 'tolerance': 15, 'description': '类似色搭配，和谐统一'},
        'triadic': {'angle': 120, 'tolerance': 20, 'description': '三角色搭配，活泼平衡'},
        'split_complementary': {'angle': 150, 'tolerance': 20, 'description': '分裂互补色，丰富有趣'},
        'tetradic': {'angle': 90, 'tolerance': 20, 'description': '四角色搭配，复杂丰富'},
        'monochromatic': {'angle': 0, 'tolerance': 15, 'description': '单色搭配，简洁优雅'},
    }

    def __init__(self):
        pass

    def analyze(self, colors: List[Tuple[int, int, int]]) -> AestheticScore:
        if not colors:
            return AestheticScore(
                dimension=AestheticDimension.COLOR_HARMONY.value,
                score=50,
                max_score=100,
                details={'error': 'No colors provided'},
                suggestions=['添加更多颜色元素']
            )

        hsv_colors = [self._rgb_to_hsv(c) for c in colors]
        hues = [h for h, s, v in hsv_colors]

        harmony_score, harmony_type = self._calculate_harmony_score(hues)
        saturation_score = self._calculate_saturation_balance([s for h, s, v in hsv_colors])
        brightness_score = self._calculate_brightness_balance([v for h, s, v in hsv_colors])
        contrast_score = self._calculate_contrast_score(hsv_colors)

        total_score = (
            harmony_score * 0.4 +
            saturation_score * 0.2 +
            brightness_score * 0.2 +
            contrast_score * 0.2
        )

        suggestions = self._generate_color_suggestions(
            harmony_score, saturation_score, brightness_score, harmony_type
        )

        return AestheticScore(
            dimension=AestheticDimension.COLOR_HARMONY.value,
            score=total_score,
            max_score=100,
            details={
                'harmony_type': harmony_type,
                'harmony_score': harmony_score,
                'saturation_balance': saturation_score,
                'brightness_balance': brightness_score,
                'contrast_score': contrast_score,
                'dominant_colors': colors[:3],
            },
            suggestions=suggestions
        )

    def _rgb_to_hsv(self, rgb: Tuple[int, int, int]) -> Tuple[float, float, float]:
        r, g, b = rgb[0] / 255, rgb[1] / 255, rgb[2] / 255
        h, s, v = colorsys.rgb_to_hsv(r, g, b)
        return h * 360, s, v

    def _calculate_harmony_score(self, hues: List[float]) -> Tuple[float, str]:
        if len(hues) < 2:
            return 70, 'monochromatic'

        best_harmony_type = 'unknown'
        best_harmony_score = 0

        for harmony_name, harmony_config in self.HARMONY_TYPES.items():
            score = self._evaluate_harmony_type(hues, harmony_config)
            if score > best_harmony_score:
                best_harmony_score = score
                best_harmony_type = harmony_name

        return best_harmony_score, best_harmony_type

    def _evaluate_harmony_type(self, hues: List[float], config: Dict) -> float:
        target_angle = config['angle']
        tolerance = config['tolerance']

        if target_angle == 0:
            variance = np.var(hues)
            return max(0, 100 - variance / 10)

        angles_diff = []
        for i in range(len(hues)):
            for j in range(i + 1, len(hues)):
                diff = abs(hues[i] - hues[j])
                diff = min(diff, 360 - diff)
                angles_diff.append(diff)

        if not angles_diff:
            return 50

        matches = sum(1 for diff in angles_diff if abs(diff - target_angle) <= tolerance)
        match_ratio = matches / len(angles_diff)

        return match_ratio * 100

    def _calculate_saturation_balance(self, saturations: List[float]) -> float:
        if not saturations:
            return 50

        mean_sat = np.mean(saturations)
        std_sat = np.std(saturations)

        if mean_sat < 0.2:
            return 40 + mean_sat * 100

        if std_sat > 0.4:
            return 60

        return 80 - std_sat * 50

    def _calculate_brightness_balance(self, brightnesses: List[float]) -> float:
        if not brightnesses:
            return 50

        mean_bri = np.mean(brightnesses)
        std_bri = np.std(brightnesses)

        if mean_bri < 0.2 or mean_bri > 0.9:
            return 50

        return 70 + (1 - std_bri) * 30

    def _calculate_contrast_score(self, hsv_colors: List[Tuple[float, float, float]]) -> float:
        if len(hsv_colors) < 2:
            return 70

        brightnesses = [v for h, s, v in hsv_colors]
        max_bri = max(brightnesses)
        min_bri = min(brightnesses)

        contrast_ratio = (max_bri - min_bri) / max(max_bri, 0.01)

        if contrast_ratio < 0.1:
            return 50
        elif contrast_ratio > 0.8:
            return 60
        else:
            return 80

    def _generate_color_suggestions(
        self,
        harmony_score: float,
        saturation_score: float,
        brightness_score: float,
        harmony_type: str
    ) -> List[str]:
        suggestions = []

        if harmony_score < 60:
            suggestions.append(f"当前颜色搭配为{harmony_type}，可尝试调整颜色以获得更好的协调性")

        if saturation_score < 60:
            suggestions.append("颜色饱和度分布不均，建议增加或减少某些颜色的饱和度")

        if brightness_score < 60:
            suggestions.append("颜色明暗对比不够理想，可调整深浅色比例")

        return suggestions


class CompositionAnalyzer:
    """构图平衡分析器"""

    RULE_OF_THIRDS_WEIGHT = 0.3
    SYMMETRY_WEIGHT = 0.3
    FOCAL_POINT_WEIGHT = 0.2
    VISUAL_WEIGHT_WEIGHT = 0.2

    def analyze(self, image: Image.Image, clothing_items: List[Dict] = None) -> AestheticScore:
        image_array = np.array(image)
        h, w = image_array.shape[:2]

        thirds_score = self._analyze_rule_of_thirds(image_array)
        symmetry_score = self._analyze_symmetry(image_array)
        focal_score = self._analyze_focal_points(image_array)
        visual_weight_score = self._analyze_visual_weight(image_array)

        total_score = (
            thirds_score * self.RULE_OF_THIRDS_WEIGHT +
            symmetry_score * self.SYMMETRY_WEIGHT +
            focal_score * self.FOCAL_POINT_WEIGHT +
            visual_weight_score * self.VISUAL_WEIGHT_WEIGHT
        )

        suggestions = self._generate_composition_suggestions(
            thirds_score, symmetry_score, focal_score, visual_weight_score
        )

        return AestheticScore(
            dimension=AestheticDimension.COMPOSITION.value,
            score=total_score,
            max_score=100,
            details={
                'rule_of_thirds': thirds_score,
                'symmetry': symmetry_score,
                'focal_points': focal_score,
                'visual_weight': visual_weight_score,
                'aspect_ratio': w / h,
            },
            suggestions=suggestions
        )

    def _analyze_rule_of_thirds(self, image: np.ndarray) -> float:
        h, w = image.shape[:2]

        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY) if len(image.shape) == 3 else image

        thirds_h = [h // 3, 2 * h // 3]
        thirds_w = [w // 3, 2 * w // 3]

        edges = cv2.Canny(gray, 50, 150)

        interest_points = 0
        total_points = 0

        for y in thirds_h:
            band = edges[max(0, y - 10):min(h, y + 10), :]
            interest_points += band.sum()
            total_points += band.size

        for x in thirds_w:
            band = edges[:, max(0, x - 10):min(w, x + 10)]
            interest_points += band.sum()
            total_points += band.size

        if total_points == 0:
            return 50

        ratio = interest_points / total_points
        return min(100, ratio * 500)

    def _analyze_symmetry(self, image: np.ndarray) -> float:
        h, w = image.shape[:2]

        left_half = image[:, :w // 2]
        right_half = image[:, w // 2:]
        right_half_flipped = np.flip(right_half, axis=1)

        min_width = min(left_half.shape[1], right_half_flipped.shape[1])
        left_half = left_half[:, :min_width]
        right_half_flipped = right_half_flipped[:, :min_width]

        diff = np.abs(left_half.astype(float) - right_half_flipped.astype(float))
        symmetry = 1 - (diff.mean() / 255)

        return symmetry * 100

    def _analyze_focal_points(self, image: np.ndarray) -> float:
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY) if len(image.shape) == 3 else image

        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        if not contours:
            return 50

        largest_contour = max(contours, key=cv2.contourArea)
        x, y, w, h = cv2.boundingRect(largest_contour)

        center_x = x + w // 2
        center_y = y + h // 2

        img_h, img_w = gray.shape
        img_center_x = img_w // 2
        img_center_y = img_h // 2

        distance = np.sqrt((center_x - img_center_x) ** 2 + (center_y - img_center_y) ** 2)
        max_distance = np.sqrt(img_center_x ** 2 + img_center_y ** 2)

        centrality = 1 - (distance / max_distance)

        return centrality * 100

    def _analyze_visual_weight(self, image: np.ndarray) -> float:
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY) if len(image.shape) == 3 else image
        h, w = gray.shape

        left_weight = gray[:, :w // 2].sum()
        right_weight = gray[:, w // 2:].sum()

        total_weight = left_weight + right_weight
        if total_weight == 0:
            return 50

        balance = 1 - abs(left_weight - right_weight) / total_weight

        top_weight = gray[:h // 2, :].sum()
        bottom_weight = gray[h // 2:, :].sum()

        vertical_balance = 1 - abs(top_weight - bottom_weight) / total_weight

        return (balance + vertical_balance) / 2 * 100

    def _generate_composition_suggestions(
        self,
        thirds_score: float,
        symmetry_score: float,
        focal_score: float,
        visual_weight_score: float
    ) -> List[str]:
        suggestions = []

        if thirds_score < 60:
            suggestions.append("可尝试将主体放置在三分线交叉点附近")

        if symmetry_score < 60:
            suggestions.append("构图对称性可以改善，注意左右平衡")

        if focal_score < 60:
            suggestions.append("主体位置偏移中心，可调整构图")

        if visual_weight_score < 60:
            suggestions.append("画面视觉重量分布不均，注意平衡")

        return suggestions


class StyleConsistencyAnalyzer:
    """风格一致性分析器"""

    STYLE_KEYWORDS = {
        'casual': ['relaxed', 'comfortable', 'everyday', 'informal'],
        'formal': ['elegant', 'professional', 'sophisticated', 'refined'],
        'sporty': ['athletic', 'active', 'dynamic', 'energetic'],
        'bohemian': ['free-spirited', 'artistic', 'eclectic', 'relaxed'],
        'minimalist': ['simple', 'clean', 'understated', 'essential'],
        'streetwear': ['urban', 'trendy', 'edgy', 'contemporary'],
        'vintage': ['retro', 'classic', 'timeless', 'nostalgic'],
        'romantic': ['feminine', 'soft', 'delicate', 'dreamy'],
    }

    STYLE_COMPATIBILITY = {
        ('casual', 'sporty'): 0.9,
        ('casual', 'streetwear'): 0.85,
        ('formal', 'minimalist'): 0.8,
        ('bohemian', 'vintage'): 0.85,
        ('romantic', 'vintage'): 0.75,
        ('minimalist', 'formal'): 0.8,
        ('sporty', 'streetwear'): 0.85,
    }

    def analyze(self, styles: List[str], attributes: Dict[str, Any] = None) -> AestheticScore:
        if not styles:
            return AestheticScore(
                dimension=AestheticDimension.STYLE_CONSISTENCY.value,
                score=50,
                max_score=100,
                details={'error': 'No styles provided'},
                suggestions=['无法识别风格']
            )

        consistency_score = self._calculate_style_consistency(styles)
        coherence_score = self._calculate_style_coherence(styles, attributes)

        total_score = (consistency_score + coherence_score) / 2

        suggestions = self._generate_style_suggestions(styles, consistency_score)

        return AestheticScore(
            dimension=AestheticDimension.STYLE_CONSISTENCY.value,
            score=total_score,
            max_score=100,
            details={
                'detected_styles': styles,
                'consistency': consistency_score,
                'coherence': coherence_score,
            },
            suggestions=suggestions
        )

    def _calculate_style_consistency(self, styles: List[str]) -> float:
        if len(styles) <= 1:
            return 85

        compatibility_scores = []
        for i, style1 in enumerate(styles):
            for style2 in styles[i + 1:]:
                key = tuple(sorted([style1, style2]))
                reverse_key = tuple(sorted([style1, style2], reverse=True))

                compatibility = self.STYLE_COMPATIBILITY.get(key, 0.5)
                if compatibility == 0.5:
                    compatibility = self.STYLE_COMPATIBILITY.get(reverse_key, 0.5)

                compatibility_scores.append(compatibility)

        if not compatibility_scores:
            return 70

        return np.mean(compatibility_scores) * 100

    def _calculate_style_coherence(self, styles: List[str], attributes: Dict) -> float:
        if not attributes:
            return 70

        coherence_score = 70

        if 'pattern' in attributes:
            pattern = attributes.get('pattern', {}).get('type', '')
            if pattern == 'solid':
                if 'minimalist' in styles or 'formal' in styles:
                    coherence_score += 10
            elif pattern in ['floral', 'paisley']:
                if 'romantic' in styles or 'bohemian' in styles:
                    coherence_score += 10

        if 'fit' in attributes:
            fit = attributes.get('fit', {}).get('type', '')
            if fit == 'slim_fit' and 'formal' in styles:
                coherence_score += 5
            elif fit == 'loose_fit' and 'casual' in styles:
                coherence_score += 5

        return min(100, coherence_score)

    def _generate_style_suggestions(self, styles: List[str], consistency_score: float) -> List[str]:
        suggestions = []

        if consistency_score < 60:
            suggestions.append(f"风格组合{', '.join(styles)}可能不够协调，建议选择更统一的风格")

        if len(styles) > 3:
            suggestions.append("风格元素过多，建议精简以突出主题")

        return suggestions


class TrendinessAnalyzer:
    """时尚度分析器"""

    TRENDING_COLORS_2024 = [
        'peach_fuzz', 'cyber_lime', 'apricot_crush', 'cool_mint',
        'pastel_lavender', 'sunset_coral', 'electric_blue', 'warm_sand'
    ]

    TRENDING_STYLES_2024 = [
        'quiet_luxury', 'coquette_core', 'coastal_grandmother',
        'dopamine_dressing', 'dark_academia', 'y2k_revival',
        'minimalist_chic', 'athleisure_elevated'
    ]

    TRENDING_PATTERNS = ['micro_floral', 'abstract_geometric', 'tie_dye', 'checkerboard']

    TRENDING_SILHOUETTES = ['oversized', 'cropped', 'wide_leg', 'slim_fit']

    def analyze(
        self,
        styles: List[str],
        colors: List[str],
        attributes: Dict[str, Any] = None
    ) -> AestheticScore:
        style_trendiness = self._analyze_style_trendiness(styles)
        color_trendiness = self._analyze_color_trendiness(colors)
        pattern_trendiness = self._analyze_pattern_trendiness(attributes)
        silhouette_trendiness = self._analyze_silhouette_trendiness(attributes)

        total_score = (
            style_trendiness * 0.35 +
            color_trendiness * 0.25 +
            pattern_trendiness * 0.2 +
            silhouette_trendiness * 0.2
        )

        suggestions = self._generate_trendiness_suggestions(
            style_trendiness, color_trendiness, pattern_trendiness
        )

        return AestheticScore(
            dimension=AestheticDimension.TRENDINESS.value,
            score=total_score,
            max_score=100,
            details={
                'style_trendiness': style_trendiness,
                'color_trendiness': color_trendiness,
                'pattern_trendiness': pattern_trendiness,
                'silhouette_trendiness': silhouette_trendiness,
            },
            suggestions=suggestions
        )

    def _analyze_style_trendiness(self, styles: List[str]) -> float:
        if not styles:
            return 50

        trending_count = 0
        for style in styles:
            for trending in self.TRENDING_STYLES_2024:
                if trending.replace('_', '') in style.replace('_', '').lower():
                    trending_count += 1
                    break

        return min(100, 50 + trending_count * 20)

    def _analyze_color_trendiness(self, colors: List[str]) -> float:
        if not colors:
            return 50

        trending_color_hues = [
            (255, 218, 185),
            (200, 255, 100),
            (255, 180, 150),
            (180, 255, 220),
            (230, 190, 255),
        ]

        trending_count = 0
        for color_name in colors:
            for trending_hue in trending_color_hues:
                if self._color_matches_trend(color_name, trending_hue):
                    trending_count += 1
                    break

        return min(100, 50 + trending_count * 15)

    def _color_matches_trend(self, color_name: str, trend_rgb: Tuple[int, int, int]) -> bool:
        trending_names = ['peach', 'lime', 'apricot', 'mint', 'lavender', 'coral', 'blue', 'sand']
        return any(t in color_name.lower() for t in trending_names)

    def _analyze_pattern_trendiness(self, attributes: Dict) -> float:
        if not attributes or 'pattern' not in attributes:
            return 60

        pattern = attributes.get('pattern', {}).get('type', '')

        if pattern in self.TRENDING_PATTERNS:
            return 90
        elif pattern == 'solid':
            return 70
        else:
            return 60

    def _analyze_silhouette_trendiness(self, attributes: Dict) -> float:
        if not attributes or 'fit' not in attributes:
            return 60

        fit = attributes.get('fit', {}).get('type', '')

        if fit in self.TRENDING_SILHOUETTES:
            return 85
        else:
            return 60

    def _generate_trendiness_suggestions(
        self,
        style_trendiness: float,
        color_trendiness: float,
        pattern_trendiness: float
    ) -> List[str]:
        suggestions = []

        if style_trendiness < 60:
            suggestions.append("可尝试融入当季流行风格元素")

        if color_trendiness < 60:
            suggestions.append("考虑添加当季流行色彩")

        if pattern_trendiness < 60:
            suggestions.append("图案设计可更具时尚感")

        return suggestions


class OutfitAestheticScorer:
    """服装美学评分主类"""

    def __init__(self, device: str = "auto"):
        self.color_analyzer = ColorHarmonyAnalyzer()
        self.composition_analyzer = CompositionAnalyzer()
        self.style_analyzer = StyleConsistencyAnalyzer()
        self.trendiness_analyzer = TrendinessAnalyzer()

        self.dimension_weights = {
            AestheticDimension.COLOR_HARMONY.value: 0.25,
            AestheticDimension.COMPOSITION.value: 0.15,
            AestheticDimension.STYLE_CONSISTENCY.value: 0.25,
            AestheticDimension.TRENDINESS.value: 0.15,
            AestheticDimension.VISUAL_BALANCE.value: 0.1,
            AestheticDimension.BODY_FIT.value: 0.1,
        }

    def score_outfit(
        self,
        image: Image.Image,
        styles: List[str] = None,
        colors: List[Tuple[int, int, int]] = None,
        attributes: Dict[str, Any] = None,
        body_type: str = None,
        occasion: str = None
    ) -> OutfitAestheticResult:
        dimension_scores = []

        if colors:
            color_score = self.color_analyzer.analyze(colors)
            dimension_scores.append(color_score)

        composition_score = self.composition_analyzer.analyze(image)
        dimension_scores.append(composition_score)

        if styles:
            style_score = self.style_analyzer.analyze(styles, attributes)
            dimension_scores.append(style_score)

        if styles and colors:
            trendiness_score = self.trendiness_analyzer.analyze(styles, colors, attributes)
            dimension_scores.append(trendiness_score)

        if body_type and attributes:
            body_fit_score = self._analyze_body_fit(body_type, attributes)
            dimension_scores.append(body_fit_score)

        if occasion and styles:
            occasion_score = self._analyze_occasion_appropriateness(occasion, styles, attributes)
            dimension_scores.append(occasion_score)

        overall_score = self._calculate_overall_score(dimension_scores)

        strengths, weaknesses = self._identify_strengths_weaknesses(dimension_scores)

        all_suggestions = []
        for score in dimension_scores:
            all_suggestions.extend(score.suggestions)

        confidence = self._calculate_confidence(dimension_scores)

        return OutfitAestheticResult(
            overall_score=overall_score,
            dimension_scores=dimension_scores,
            strengths=strengths,
            weaknesses=weaknesses,
            improvement_suggestions=list(set(all_suggestions))[:5],
            confidence=confidence
        )

    def _analyze_body_fit(self, body_type: str, attributes: Dict) -> AestheticScore:
        body_style_recommendations = {
            'rectangle': {
                'recommended_fits': ['fitted', 'structured', 'layered'],
                'recommended_necklines': ['v_neck', 'boat_neck', 'sweetheart'],
                'avoid': ['boxy', 'shapeless'],
            },
            'hourglass': {
                'recommended_fits': ['fitted', 'wrap', 'belted'],
                'recommended_necklines': ['v_neck', 'sweetheart', 'round_neck'],
                'avoid': ['oversized', 'tent'],
            },
            'triangle': {
                'recommended_fits': ['a_line', 'fit_and_flare'],
                'recommended_necklines': ['boat_neck', 'off_shoulder', 'square_neck'],
                'avoid': ['tight_bottom', 'hip_details'],
            },
            'inverted_triangle': {
                'recommended_fits': ['wide_leg', 'flared', 'a_line'],
                'recommended_necklines': ['v_neck', 'deep_v'],
                'avoid': ['shoulder_pads', 'boat_neck'],
            },
            'oval': {
                'recommended_fits': ['empire', 'a_line', 'flowy'],
                'recommended_necklines': ['v_neck', 'deep_v', 'collar'],
                'avoid': ['tight', 'crop_top'],
            },
        }

        recommendations = body_style_recommendations.get(body_type, {})
        score = 70
        suggestions = []

        if 'fit' in attributes:
            fit_type = attributes.get('fit', {}).get('type', '')
            recommended = recommendations.get('recommended_fits', [])
            avoid = recommendations.get('avoid', [])

            if fit_type in recommended:
                score += 15
            elif fit_type in avoid:
                score -= 15
                suggestions.append(f"对于{body_type}体型，{fit_type}版型可能不是最佳选择")

        if 'neckline' in attributes:
            neckline_type = attributes.get('neckline', {}).get('type', '')
            recommended_necklines = recommendations.get('recommended_necklines', [])
            if neckline_type in recommended_necklines:
                score += 10

        return AestheticScore(
            dimension=AestheticDimension.BODY_FIT.value,
            score=min(100, max(0, score)),
            max_score=100,
            details={
                'body_type': body_type,
                'recommendations': recommendations,
            },
            suggestions=suggestions
        )

    def _analyze_occasion_appropriateness(
        self,
        occasion: str,
        styles: List[str],
        attributes: Dict
    ) -> AestheticScore:
        occasion_style_map = {
            'work': {
                'appropriate': ['formal', 'minimalist', 'classic'],
                'inappropriate': ['sporty', 'bohemian', 'edgy'],
            },
            'casual': {
                'appropriate': ['casual', 'sporty', 'streetwear', 'bohemian'],
                'inappropriate': ['formal'],
            },
            'date': {
                'appropriate': ['romantic', 'casual', 'elegant', 'vintage'],
                'inappropriate': ['sporty'],
            },
            'party': {
                'appropriate': ['streetwear', 'edgy', 'romantic', 'glamorous'],
                'inappropriate': ['sporty', 'minimalist'],
            },
            'wedding': {
                'appropriate': ['formal', 'romantic', 'classic', 'elegant'],
                'inappropriate': ['sporty', 'streetwear', 'casual'],
            },
        }

        occasion_rules = occasion_style_map.get(occasion, {})
        score = 70
        suggestions = []

        appropriate = occasion_rules.get('appropriate', [])
        inappropriate = occasion_rules.get('inappropriate', [])

        for style in styles:
            if style in appropriate:
                score += 10
            elif style in inappropriate:
                score -= 15
                suggestions.append(f"{style}风格可能不太适合{occasion}场合")

        return AestheticScore(
            dimension=AestheticDimension.OCCASION_APPROPRIATENESS.value,
            score=min(100, max(0, score)),
            max_score=100,
            details={
                'occasion': occasion,
                'appropriate_styles': appropriate,
            },
            suggestions=suggestions
        )

    def _calculate_overall_score(self, dimension_scores: List[AestheticScore]) -> float:
        if not dimension_scores:
            return 50

        weighted_sum = 0
        total_weight = 0

        for score in dimension_scores:
            weight = self.dimension_weights.get(score.dimension, 0.1)
            weighted_sum += score.score * weight
            total_weight += weight

        if total_weight == 0:
            return 50

        return weighted_sum / total_weight

    def _identify_strengths_weaknesses(
        self,
        dimension_scores: List[AestheticScore]
    ) -> Tuple[List[str], List[str]]:
        strengths = []
        weaknesses = []

        dimension_names = {
            AestheticDimension.COLOR_HARMONY.value: '颜色协调',
            AestheticDimension.COMPOSITION.value: '构图平衡',
            AestheticDimension.STYLE_CONSISTENCY.value: '风格一致性',
            AestheticDimension.TRENDINESS.value: '时尚度',
            AestheticDimension.BODY_FIT.value: '体型适配',
            AestheticDimension.OCCASION_APPROPRIATENESS.value: '场合适配',
        }

        for score in dimension_scores:
            name = dimension_names.get(score.dimension, score.dimension)
            if score.score >= 75:
                strengths.append(f"{name}表现出色")
            elif score.score < 60:
                weaknesses.append(f"{name}有待改进")

        return strengths, weaknesses

    def _calculate_confidence(self, dimension_scores: List[AestheticScore]) -> float:
        if not dimension_scores:
            return 0.5

        score_variance = np.var([s.score for s in dimension_scores])

        confidence = 0.9 - (score_variance / 10000)
        return max(0.5, min(0.95, confidence))


class AestheticScoringService:
    """美学评分服务接口"""

    def __init__(self, device: str = "auto"):
        self.scorer = OutfitAestheticScorer(device=device)

    def score_image(
        self,
        image_path: str,
        styles: List[str] = None,
        body_type: str = None,
        occasion: str = None
    ) -> Dict:
        image = Image.open(image_path).convert("RGB")

        colors = self._extract_dominant_colors(image)

        result = self.scorer.score_outfit(
            image=image,
            styles=styles,
            colors=colors,
            body_type=body_type,
            occasion=occasion
        )

        return {
            "overall_score": result.overall_score,
            "dimension_scores": [
                {
                    "dimension": score.dimension,
                    "score": score.score,
                    "details": score.details,
                    "suggestions": score.suggestions,
                }
                for score in result.dimension_scores
            ],
            "strengths": result.strengths,
            "weaknesses": result.weaknesses,
            "improvement_suggestions": result.improvement_suggestions,
            "confidence": result.confidence,
        }

    def _extract_dominant_colors(self, image: Image.Image, n_colors: int = 5) -> List[Tuple[int, int, int]]:
        image_array = np.array(image)
        pixels = image_array.reshape(-1, 3)

        pixels = pixels[::10]

        try:
            from sklearn.cluster import KMeans
            kmeans = KMeans(n_clusters=n_colors, random_state=42, n_init=10)
            kmeans.fit(pixels)

            colors = [tuple(map(int, center)) for center in kmeans.cluster_centers_]
            return colors
        except (ImportError, ValueError, RuntimeError):
            return [(128, 128, 128)]


if __name__ == "__main__":
    service = AestheticScoringService()

    print("\n" + "="*50)
    print("服装美学评分服务已初始化")
    print("="*50)

    test_image = "data/raw/images/1163.jpg"
    if os.path.exists(test_image):
        print(f"\n评分测试图像: {test_image}")
        result = service.score_image(
            test_image,
            styles=['casual', 'minimalist'],
            body_type='rectangle',
            occasion='casual'
        )
        print(f"总体评分: {result['overall_score']:.1f}/100")
        print(f"优势: {', '.join(result['strengths'])}")
        print(f"改进建议: {', '.join(result['improvement_suggestions'])}")
