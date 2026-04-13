from __future__ import annotations

import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)


class ColorSeason(Enum):
    SPRING = "spring"
    SUMMER = "summer"
    AUTUMN = "autumn"
    WINTER = "winter"


class ToneType(Enum):
    WARM = "warm"
    COOL = "cool"


class DepthType(Enum):
    LIGHT = "light"
    DEEP = "deep"


@dataclass
class ColorSwatch:
    name: str
    hex_value: str
    reason: str

    def to_dict(self) -> Dict[str, str]:
        return {
            "name": self.name,
            "hex_value": self.hex_value,
            "reason": self.reason,
        }


@dataclass
class ColorSeasonResult:
    season: ColorSeason
    tone: ToneType
    depth: DepthType
    skin_hsl: Tuple[float, float, float]
    suitable_colors: List[ColorSwatch]
    unsuitable_colors: List[ColorSwatch]
    confidence: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "season": self.season.value,
            "season_label": _SEASON_LABELS[self.season],
            "tone": self.tone.value,
            "tone_label": "暖色调" if self.tone == ToneType.WARM else "冷色调",
            "depth": self.depth.value,
            "depth_label": "浅型" if self.depth == DepthType.LIGHT else "深型",
            "skin_hsl": {
                "hue": round(self.skin_hsl[0], 2),
                "saturation": round(self.skin_hsl[1], 2),
                "lightness": round(self.skin_hsl[2], 2),
            },
            "suitable_colors": [c.to_dict() for c in self.suitable_colors],
            "unsuitable_colors": [c.to_dict() for c in self.unsuitable_colors],
            "confidence": round(self.confidence, 4),
        }


_SEASON_LABELS: Dict[ColorSeason, str] = {
    ColorSeason.SPRING: "春季型",
    ColorSeason.SUMMER: "夏季型",
    ColorSeason.AUTUMN: "秋季型",
    ColorSeason.WINTER: "冬季型",
}

_HUE_WARM_THRESHOLD = 45.0
_HUE_COOL_THRESHOLD = 180.0
_LIGHTNESS_THRESHOLD = 55.0

_SAMPLING_REGIONS: Dict[str, Tuple[float, float, float, float]] = {
    "forehead": (0.20, 0.05, 0.60, 0.20),
    "left_cheek": (0.10, 0.35, 0.30, 0.25),
    "right_cheek": (0.60, 0.35, 0.30, 0.25),
    "nose_bridge": (0.40, 0.30, 0.20, 0.20),
    "chin": (0.30, 0.70, 0.40, 0.15),
}

_SEASON_PALETTES: Dict[ColorSeason, Dict[str, List[Dict[str, str]]]] = {
    ColorSeason.SPRING: {
        "suitable": [
            {"name": "珊瑚粉", "hex": "#FF7F7F", "reason": "暖浅基调，与春季型肤色自然融合"},
            {"name": "鹅黄", "hex": "#FFF44F", "reason": "明亮暖黄，提升春季型气色"},
            {"name": "嫩绿", "hex": "#99DC5B", "reason": "清新暖绿，呼应春季型的生机感"},
            {"name": "桃红", "hex": "#FF8C94", "reason": "柔和暖粉，衬托春季型的好气色"},
            {"name": "天蓝", "hex": "#87CEEB", "reason": "浅暖蓝，为春季型增添清爽感"},
            {"name": "杏色", "hex": "#FBCEB1", "reason": "暖调裸色，与春季型肤色和谐统一"},
            {"name": "薄荷绿", "hex": "#98FB98", "reason": "清浅暖绿，让春季型更显活力"},
            {"name": "奶油白", "hex": "#FFFDD0", "reason": "暖调白色，比纯白更适合春季型"},
        ],
        "unsuitable": [
            {"name": "酒红", "hex": "#722F37", "reason": "过深过冷，压暗春季型肤色"},
            {"name": "藏青", "hex": "#273475", "reason": "冷深色调，与春季型暖浅基调冲突"},
            {"name": "深紫", "hex": "#4B0082", "reason": "冷深色，让春季型显得暗沉"},
            {"name": "炭灰", "hex": "#3C3C3C", "reason": "深灰冷调，削弱春季型的明快感"},
        ],
    },
    ColorSeason.SUMMER: {
        "suitable": [
            {"name": "薰衣草紫", "hex": "#B57EDC", "reason": "冷浅紫，与夏季型肤色柔和搭配"},
            {"name": "雾蓝", "hex": "#7EC8E3", "reason": "柔和冷蓝，衬托夏季型的清雅"},
            {"name": "玫瑰粉", "hex": "#FF66CC", "reason": "冷调粉红，提升夏季型的柔美感"},
            {"name": "薄荷蓝", "hex": "#A5F2F3", "reason": "清冷浅蓝，与夏季型气质一致"},
            {"name": "灰粉", "hex": "#C3B1E1", "reason": "低饱和冷粉，适合夏季型的柔和感"},
            {"name": "浅灰", "hex": "#C0C0C0", "reason": "中性冷灰，夏季型穿来高级感十足"},
            {"name": "淡紫蓝", "hex": "#CFB53B", "reason": "冷调柔色，为夏季型增添知性"},
            {"name": "冰白", "hex": "#F0F8FF", "reason": "冷调白色，比暖白更适合夏季型"},
        ],
        "unsuitable": [
            {"name": "橘红", "hex": "#FF4500", "reason": "暖高饱和色，与夏季型冷浅基调冲突"},
            {"name": "明黄", "hex": "#FFD700", "reason": "暖亮色，让夏季型肤色显黄"},
            {"name": "草绿", "hex": "#3EB370", "reason": "暖调绿，与夏季型冷感不协调"},
            {"name": "砖红", "hex": "#CB4335", "reason": "暖深色，压制夏季型的轻盈感"},
        ],
    },
    ColorSeason.AUTUMN: {
        "suitable": [
            {"name": "焦糖棕", "hex": "#C68E17", "reason": "暖深棕，与秋季型肤色浑然一体"},
            {"name": "砖红", "hex": "#CB4335", "reason": "暖调深红，衬托秋季型的醇厚感"},
            {"name": "橄榄绿", "hex": "#6B8E23", "reason": "暖深绿，呼应秋季型的沉稳气质"},
            {"name": "南瓜橘", "hex": "#FF7518", "reason": "暖调橘色，让秋季型更显温暖"},
            {"name": "酒红", "hex": "#722F37", "reason": "深暖红，为秋季型增添质感"},
            {"name": "驼色", "hex": "#C19A6B", "reason": "暖中性色，秋季型的经典百搭色"},
            {"name": "芥末黄", "hex": "#FFDB58", "reason": "暖深黄，与秋季型肤色和谐呼应"},
            {"name": "米棕", "hex": "#D2B48C", "reason": "暖调浅棕，秋季型的安全选择"},
        ],
        "unsuitable": [
            {"name": "荧光粉", "hex": "#FF6FFF", "reason": "冷高饱和色，与秋季型暖深基调冲突"},
            {"name": "冰蓝", "hex": "#99FFFF", "reason": "冷浅色，让秋季型肤色显灰"},
            {"name": "亮紫", "hex": "#9B30FF", "reason": "冷高饱和色，与秋季型不协调"},
            {"name": "纯白", "hex": "#FFFFFF", "reason": "冷调白色，秋季型穿来显苍白"},
        ],
    },
    ColorSeason.WINTER: {
        "suitable": [
            {"name": "正红", "hex": "#FF0000", "reason": "冷深基调，正红让冬季型气场全开"},
            {"name": "藏青", "hex": "#273475", "reason": "冷深蓝，衬托冬季型的冷艳气质"},
            {"name": "纯白", "hex": "#FFFFFF", "reason": "冷调白色，冬季型穿来干净利落"},
            {"name": "宝蓝", "hex": "#4169E1", "reason": "冷深蓝，与冬季型形成鲜明对比"},
            {"name": "深紫", "hex": "#4B0082", "reason": "冷深紫，增强冬季型的神秘感"},
            {"name": "炭灰", "hex": "#3C3C3C", "reason": "冷深灰，冬季型穿来高级有质感"},
            {"name": "品红", "hex": "#FF0090", "reason": "冷调深粉，为冬季型增添女性魅力"},
            {"name": "冰灰", "hex": "#A9A9A9", "reason": "冷调中性灰，冬季型可轻松驾驭"},
        ],
        "unsuitable": [
            {"name": "鹅黄", "hex": "#FFF44F", "reason": "暖浅色，让冬季型肤色显暗黄"},
            {"name": "杏色", "hex": "#FBCEB1", "reason": "暖浅裸色，与冬季型冷深基调冲突"},
            {"name": "草绿", "hex": "#3EB370", "reason": "暖调绿，削弱冬季型的冷艳感"},
            {"name": "奶油白", "hex": "#FFFDD0", "reason": "暖调白色，冬季型穿来显脏"},
        ],
    },
}


def _rgb_to_hsl(r: int, g: int, b: int) -> Tuple[float, float, float]:
    """Convert RGB (0-255) to HSL (0-360, 0-100, 0-100)."""
    r_n, g_n, b_n = r / 255.0, g / 255.0, b / 255.0
    c_max = max(r_n, g_n, b_n)
    c_min = min(r_n, g_n, b_n)
    delta = c_max - c_min

    if delta == 0:
        h = 0.0
    elif c_max == r_n:
        h = 60.0 * (((g_n - b_n) / delta) % 6)
    elif c_max == g_n:
        h = 60.0 * (((b_n - r_n) / delta) + 2)
    else:
        h = 60.0 * (((r_n - g_n) / delta) + 4)

    if h < 0:
        h += 360.0

    l = (c_max + c_min) / 2.0

    if delta == 0:
        s = 0.0
    else:
        s = (delta / (1.0 - abs(2.0 * l - 1.0))) * 100.0

    return (round(h, 2), round(s, 2), round(l * 100.0, 2))


def _is_skin_pixel(r: int, g: int, b: int) -> bool:
    """Heuristic skin pixel detection in RGB space."""
    if r < 60 or g < 40 or b < 20:
        return False
    if r < g or r < b:
        return False
    if abs(r - g) < 10 and abs(r - b) > 30:
        return False
    max_val = max(r, g, b)
    min_val = min(r, g, b)
    if max_val - min_val < 15:
        return False
    if r > 220 and g > 200 and b > 180:
        return True
    if r > 95 and g > 40 and b > 20:
        if (r - g) > 12 and (r - b) > 8:
            return True
        if (r - g) > 15 and (r - b) >= 5:
            return True
    return False


def _extract_region_pixels(
    img_array: np.ndarray, region: Tuple[float, float, float, float]
) -> np.ndarray:
    """Extract pixels from a normalized region (x_ratio, y_ratio, w_ratio, h_ratio)."""
    h, w = img_array.shape[:2]
    x1 = int(region[0] * w)
    y1 = int(region[1] * h)
    x2 = int((region[0] + region[2]) * w)
    y2 = int((region[1] + region[3]) * h)
    x1, x2 = max(0, x1), min(w, x2)
    y1, y2 = max(0, y1), min(h, y2)
    return img_array[y1:y2, x1:x2]


def _compute_region_hsl(img_array: np.ndarray, region: Tuple[float, float, float, float]) -> Optional[Tuple[float, float, float]]:
    """Compute median HSL for skin pixels in a region."""
    pixels = _extract_region_pixels(img_array, region)
    if pixels.size == 0:
        return None

    skin_h_values = []
    skin_s_values = []
    skin_l_values = []

    for row in pixels:
        for pixel in row:
            r, g, b = int(pixel[0]), int(pixel[1]), int(pixel[2])
            if _is_skin_pixel(r, g, b):
                h, s, l = _rgb_to_hsl(r, g, b)
                skin_h_values.append(h)
                skin_s_values.append(s)
                skin_l_values.append(l)

    if len(skin_h_values) < 5:
        return None

    median_h = float(np.median(skin_h_values))
    median_s = float(np.median(skin_s_values))
    median_l = float(np.median(skin_l_values))

    return (median_h, median_s, median_l)


def _determine_tone(hue: float) -> Tuple[ToneType, float]:
    """Determine warm/cool tone based on HSL hue value.

    Skin hue in range [0, 60] is warm (yellow-orange undertone).
    Skin hue in range [180, 360] or near 0 with low saturation is cool.
    Returns tone type and confidence score.
    """
    if hue <= _HUE_WARM_THRESHOLD or hue > 330.0:
        return ToneType.WARM, 0.8
    elif hue >= _HUE_COOL_THRESHOLD:
        return ToneType.COOL, 0.8
    elif hue <= 90.0:
        return ToneType.WARM, 0.6
    elif hue <= 150.0:
        return ToneType.COOL, 0.55
    else:
        return ToneType.COOL, 0.65


def _determine_depth(lightness: float) -> Tuple[DepthType, float]:
    """Determine light/deep based on HSL lightness value.

    Higher lightness = lighter skin = light type.
    Returns depth type and confidence score.
    """
    if lightness >= _LIGHTNESS_THRESHOLD:
        return DepthType.LIGHT, 0.8
    elif lightness >= 45.0:
        return DepthType.LIGHT, 0.55
    elif lightness >= 35.0:
        return DepthType.DEEP, 0.55
    else:
        return DepthType.DEEP, 0.8


def _combine_season(tone: ToneType, depth: DepthType) -> ColorSeason:
    """Combine tone and depth into a color season type."""
    if tone == ToneType.WARM and depth == DepthType.LIGHT:
        return ColorSeason.SPRING
    elif tone == ToneType.COOL and depth == DepthType.LIGHT:
        return ColorSeason.SUMMER
    elif tone == ToneType.WARM and depth == DepthType.DEEP:
        return ColorSeason.AUTUMN
    else:
        return ColorSeason.WINTER


def generate_palette(season_type: ColorSeason) -> Dict[str, List[ColorSwatch]]:
    """Generate color palette for a given color season type.

    Args:
        season_type: The color season enum value.

    Returns:
        Dictionary with 'suitable' and 'unsuitable' color swatch lists.
    """
    palette_data = _SEASON_PALETTES.get(season_type)
    if palette_data is None:
        logger.warning("Unknown season type: %s, falling back to SPRING", season_type)
        palette_data = _SEASON_PALETTES[ColorSeason.SPRING]

    suitable = [
        ColorSwatch(name=c["name"], hex_value=c["hex"], reason=c["reason"])
        for c in palette_data["suitable"]
    ]
    unsuitable = [
        ColorSwatch(name=c["name"], hex_value=c["hex"], reason=c["reason"])
        for c in palette_data["unsuitable"]
    ]

    return {"suitable": suitable, "unsuitable": unsuitable}


def analyze_color_season(
    face_image: Union[str, Image.Image],
) -> ColorSeasonResult:
    """Analyze color season from a face image.

    Extracts skin color from multiple facial regions (forehead, cheeks,
    nose bridge, chin), determines warm/cool tone and light/deep depth
    in HSL color space, and combines them into one of four color seasons.

    Args:
        face_image: Path to image file or PIL Image object of a face.

    Returns:
        ColorSeasonResult containing season type, tone, depth, skin HSL
        values, suitable/unsuitable color palettes, and confidence score.
    """
    if isinstance(face_image, str):
        try:
            img = Image.open(face_image).convert("RGB")
        except Exception as e:
            logger.error("Failed to open image %s: %s", face_image, e)
            raise ValueError(f"Cannot open image: {face_image}") from e
    elif isinstance(face_image, Image.Image):
        img = face_image.convert("RGB")
    else:
        raise TypeError(f"Expected str or PIL.Image, got {type(face_image)}")

    img_array = np.array(img)
    logger.info(
        "Analyzing color season from image of size %sx%s",
        img_array.shape[1], img_array.shape[0],
    )

    region_results: Dict[str, Tuple[float, float, float]] = {}
    for region_name, region_coords in _SAMPLING_REGIONS.items():
        result = _compute_region_hsl(img_array, region_coords)
        if result is not None:
            region_results[region_name] = result
            logger.debug(
                "Region %s: H=%.1f S=%.1f L=%.1f",
                region_name, result[0], result[1], result[2],
            )

    if not region_results:
        logger.warning("No valid skin regions detected, using fallback defaults")
        avg_h, avg_s, avg_l = 25.0, 40.0, 60.0
    else:
        weights: Dict[str, float] = {
            "forehead": 0.25,
            "left_cheek": 0.20,
            "right_cheek": 0.20,
            "nose_bridge": 0.15,
            "chin": 0.20,
        }
        total_weight = sum(
            weights.get(name, 0.1) for name in region_results
        )
        avg_h = sum(
            region_results[n][0] * weights.get(n, 0.1) for n in region_results
        ) / total_weight
        avg_s = sum(
            region_results[n][1] * weights.get(n, 0.1) for n in region_results
        ) / total_weight
        avg_l = sum(
            region_results[n][2] * weights.get(n, 0.1) for n in region_results
        ) / total_weight

    logger.info(
        "Weighted average skin HSL: H=%.1f S=%.1f L=%.1f",
        avg_h, avg_s, avg_l,
    )

    tone, tone_conf = _determine_tone(avg_h)
    depth, depth_conf = _determine_depth(avg_l)
    season = _combine_season(tone, depth)
    confidence = (tone_conf + depth_conf) / 2.0

    logger.info(
        "Color season result: %s (tone=%s, depth=%s, confidence=%.3f)",
        season.value, tone.value, depth.value, confidence,
    )

    palette = generate_palette(season)

    return ColorSeasonResult(
        season=season,
        tone=tone,
        depth=depth,
        skin_hsl=(avg_h, avg_s, avg_l),
        suitable_colors=palette["suitable"],
        unsuitable_colors=palette["unsuitable"],
        confidence=confidence,
    )
