from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

# ============================================================
# CIELAB Color Science (D65 Illuminant)
# ============================================================

_D65_XN = 0.95047
_D65_YN = 1.00000
_D65_ZN = 1.08883


def _rgb_to_lab(r: int, g: int, b: int) -> Tuple[float, float, float]:
    """Convert RGB (0-255) to CIELAB using D65 illuminant."""
    rn = r / 255.0
    gn = g / 255.0
    bn = b / 255.0

    def linearize(c: float) -> float:
        return ((c + 0.055) / 1.055) ** 2.4 if c > 0.04045 else c / 12.92

    rl = linearize(rn)
    gl = linearize(gn)
    bl = linearize(bn)

    x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / _D65_XN
    y = (rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750) / _D65_YN
    z = (rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041) / _D65_ZN

    def f(t: float) -> float:
        delta = 6.0 / 29.0
        if t > delta ** 3:
            return t ** (1.0 / 3.0)
        return t / (3.0 * delta * delta) + 4.0 / 29.0

    fx, fy, fz = f(x), f(y), f(z)
    l_star = 116.0 * fy - 16.0
    a_star = 500.0 * (fx - fy)
    b_star = 200.0 * (fy - fz)

    return (l_star, a_star, b_star)


def _lab_to_rgb(l: float, a: float, b: float) -> Tuple[int, int, int]:
    """Convert CIELAB to RGB (0-255)."""
    delta = 6.0 / 29.0
    fy = (l + 16.0) / 116.0
    fx = a / 500.0 + fy
    fz = fy - b / 200.0

    def inv_f(t: float) -> float:
        if t > delta:
            return t ** 3
        return 3.0 * delta * delta * (t - 4.0 / 29.0)

    xn = inv_f(fx) * _D65_XN
    yn = inv_f(fy) * _D65_YN
    zn = inv_f(fz) * _D65_ZN

    rl = 3.2404542 * xn - 1.5371385 * yn - 0.4985314 * zn
    gl = -0.9692660 * xn + 1.8760108 * yn + 0.0415560 * zn
    bl = 0.0556434 * xn - 0.2040259 * yn + 1.0572252 * zn

    def gamma(c: float) -> float:
        c = max(0.0, c)
        return 1.055 * c ** (1.0 / 2.4) - 0.055 if c > 0.0031308 else 12.92 * c

    return (
        min(255, max(0, round(gamma(rl) * 255))),
        min(255, max(0, round(gamma(gl) * 255))),
        min(255, max(0, round(gamma(bl) * 255))),
    )


def _compute_ita(l_star: float, b_star: float) -> float:
    """Compute Individual Typology Angle (ITA).

    ITA = arctan((L* - 50) / b*) * (180 / pi)

    Reference: del Bino & Bernardin (2013), derm-ita.
    """
    if abs(b_star) < 1e-10:
        return 90.0 if l_star > 50 else -90.0
    return math.atan((l_star - 50.0) / b_star) * (180.0 / math.pi)


def _compute_chroma(a_star: float, b_star: float) -> float:
    """Compute chroma C* = sqrt(a*^2 + b*^2)."""
    return math.sqrt(a_star ** 2 + b_star ** 2)


# ============================================================
# 12-Season Color Analysis System
# ============================================================

class TwelveSeason(Enum):
    """12-season color analysis system based on 3 dimensions:
    - Hue: warm / cool
    - Value: light / dark
    - Chroma: clear / muted
    """
    # Spring (Warm + Light)
    SPRING_WARM_LIGHT_CLEAR = "spring_warm_light_clear"       # Warm Spring
    SPRING_WARM_LIGHT_MUTED = "spring_warm_light_muted"       # Soft Spring
    SPRING_WARM_DEEP_CLEAR = "spring_warm_deep_clear"         # Deep Spring

    # Summer (Cool + Light)
    SUMMER_COOL_LIGHT_MUTED = "summer_cool_light_muted"       # Cool Summer
    SUMMER_COOL_LIGHT_CLEAR = "summer_cool_light_clear"       # Light Summer
    SUMMER_COOL_DEEP_MUTED = "summer_cool_deep_muted"         # Soft Summer

    # Autumn (Warm + Dark)
    AUTUMN_WARM_DEEP_MUTED = "autumn_warm_deep_muted"         # Warm Autumn
    AUTUMN_WARM_DEEP_CLEAR = "autumn_warm_deep_clear"         # Deep Autumn
    AUTUMN_WARM_LIGHT_MUTED = "autumn_warm_light_muted"       # Soft Autumn

    # Winter (Cool + Dark)
    WINTER_COOL_DEEP_CLEAR = "winter_cool_deep_clear"         # Cool Winter
    WINTER_COOL_LIGHT_CLEAR = "winter_cool_light_clear"       # Light Winter
    WINTER_COOL_DEEP_MUTED = "winter_cool_deep_muted"         # Deep Winter


# Human-readable labels
_SEASON_LABELS: Dict[TwelveSeason, str] = {
    TwelveSeason.SPRING_WARM_LIGHT_CLEAR: "暖春型",
    TwelveSeason.SPRING_WARM_LIGHT_MUTED: "柔春型",
    TwelveSeason.SPRING_WARM_DEEP_CLEAR: "深春型",
    TwelveSeason.SUMMER_COOL_LIGHT_MUTED: "凉夏型",
    TwelveSeason.SUMMER_COOL_LIGHT_CLEAR: "浅夏型",
    TwelveSeason.SUMMER_COOL_DEEP_MUTED: "柔夏型",
    TwelveSeason.AUTUMN_WARM_DEEP_MUTED: "暖秋型",
    TwelveSeason.AUTUMN_WARM_DEEP_CLEAR: "深秋型",
    TwelveSeason.AUTUMN_WARM_LIGHT_MUTED: "柔秋型",
    TwelveSeason.WINTER_COOL_DEEP_CLEAR: "冷冬型",
    TwelveSeason.WINTER_COOL_LIGHT_CLEAR: "浅冬型",
    TwelveSeason.WINTER_COOL_DEEP_MUTED: "深冬型",
}

# Parent season for backward compatibility
_PARENT_SEASON: Dict[TwelveSeason, str] = {
    TwelveSeason.SPRING_WARM_LIGHT_CLEAR: "spring",
    TwelveSeason.SPRING_WARM_LIGHT_MUTED: "spring",
    TwelveSeason.SPRING_WARM_DEEP_CLEAR: "spring",
    TwelveSeason.SUMMER_COOL_LIGHT_MUTED: "summer",
    TwelveSeason.SUMMER_COOL_LIGHT_CLEAR: "summer",
    TwelveSeason.SUMMER_COOL_DEEP_MUTED: "summer",
    TwelveSeason.AUTUMN_WARM_DEEP_MUTED: "autumn",
    TwelveSeason.AUTUMN_WARM_DEEP_CLEAR: "autumn",
    TwelveSeason.AUTUMN_WARM_LIGHT_MUTED: "autumn",
    TwelveSeason.WINTER_COOL_DEEP_CLEAR: "winter",
    TwelveSeason.WINTER_COOL_LIGHT_CLEAR: "winter",
    TwelveSeason.WINTER_COOL_DEEP_MUTED: "winter",
}

# ============================================================
# Skin Tone Classification
# ============================================================

class ToneType(Enum):
    WARM = "warm"
    COOL = "cool"
    NEUTRAL = "neutral"


class DepthType(Enum):
    LIGHT = "light"
    DEEP = "deep"


class ChromaType(Enum):
    CLEAR = "clear"
    MUTED = "muted"


# ============================================================
# Data Structures
# ============================================================

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
    season: TwelveSeason
    parent_season: str  # backward compat: "spring"/"summer"/"autumn"/"winter"
    tone: ToneType
    depth: DepthType
    chroma: ChromaType
    skin_lab: Tuple[float, float, float]
    ita: float
    suitable_colors: List[ColorSwatch]
    unsuitable_colors: List[ColorSwatch]
    confidence: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "season": self.season.value,
            "season_label": _SEASON_LABELS[self.season],
            "parent_season": self.parent_season,
            "parent_season_label": {
                "spring": "春季型", "summer": "夏季型",
                "autumn": "秋季型", "winter": "冬季型",
            }[self.parent_season],
            "tone": self.tone.value,
            "tone_label": {
                ToneType.WARM: "暖色调", ToneType.COOL: "冷色调",
                ToneType.NEUTRAL: "中性色调",
            }[self.tone],
            "depth": self.depth.value,
            "depth_label": "浅型" if self.depth == DepthType.LIGHT else "深型",
            "chroma": self.chroma.value,
            "chroma_label": "清型" if self.chroma == ChromaType.CLEAR else "柔型",
            "skin_lab": {
                "L": round(self.skin_lab[0], 2),
                "a": round(self.skin_lab[1], 2),
                "b": round(self.skin_lab[2], 2),
            },
            "ita": round(self.ita, 2),
            "suitable_colors": [c.to_dict() for c in self.suitable_colors],
            "unsuitable_colors": [c.to_dict() for c in self.unsuitable_colors],
            "confidence": round(self.confidence, 4),
        }


# ============================================================
# Face Mesh Landmark Regions (MediaPipe Face Mesh 468 points)
# ============================================================

_FACE_MESH_REGIONS: Dict[str, List[int]] = {
    "forehead": [10, 108, 337, 151, 67, 109, 338, 297],
    "left_cheek": [116, 117, 118, 119, 120, 47, 100, 126],
    "right_cheek": [345, 346, 347, 348, 349, 277, 329, 356],
    "nose_bridge": [6, 197, 195, 5, 4, 1, 19, 94, 2],
    "chin": [152, 148, 377, 323, 365, 391, 393],
}

# Fallback fixed regions (when MediaPipe Face Mesh is unavailable)
_FALLBACK_REGIONS: Dict[str, Tuple[float, float, float, float]] = {
    "forehead": (0.20, 0.05, 0.60, 0.20),
    "left_cheek": (0.10, 0.35, 0.30, 0.25),
    "right_cheek": (0.60, 0.35, 0.30, 0.25),
    "nose_bridge": (0.40, 0.30, 0.20, 0.20),
    "chin": (0.30, 0.70, 0.40, 0.15),
}


# ============================================================
# 12-Season Palettes (CIELAB-based)
# ============================================================

def _hex_to_lab(hex_value: str) -> Tuple[float, float, float]:
    """Convert hex color to CIELAB."""
    hex_value = hex_value.lstrip("#")
    r = int(hex_value[0:2], 16)
    g = int(hex_value[2:4], 16)
    b = int(hex_value[4:6], 16)
    return _rgb_to_lab(r, g, b)


_SEASON_PALETTES: Dict[TwelveSeason, Dict[str, List[Dict[str, str]]]] = {
    TwelveSeason.SPRING_WARM_LIGHT_CLEAR: {
        "suitable": [
            {"name": "珊瑚粉", "hex": "#FF7F7F", "reason": "暖浅清基调，与暖春型肤色自然融合"},
            {"name": "鹅黄", "hex": "#FFF44F", "reason": "明亮暖黄，提升暖春型气色"},
            {"name": "嫩绿", "hex": "#99DC5B", "reason": "清新暖绿，呼应暖春型的生机感"},
            {"name": "桃红", "hex": "#FF8C94", "reason": "柔和暖粉，衬托暖春型的好气色"},
            {"name": "天蓝", "hex": "#87CEEB", "reason": "浅暖蓝，为暖春型增添清爽感"},
            {"name": "杏色", "hex": "#FBCEB1", "reason": "暖调裸色，与暖春型肤色和谐统一"},
            {"name": "薄荷绿", "hex": "#98FB98", "reason": "清浅暖绿，让暖春型更显活力"},
            {"name": "奶油白", "hex": "#FFFDD0", "reason": "暖调白色，比纯白更适合暖春型"},
        ],
        "unsuitable": [
            {"name": "酒红", "hex": "#722F37", "reason": "过深过冷，压暗暖春型肤色"},
            {"name": "藏青", "hex": "#273475", "reason": "冷深色调，与暖春型暖浅基调冲突"},
            {"name": "深紫", "hex": "#4B0082", "reason": "冷深色，让暖春型显得暗沉"},
            {"name": "炭灰", "hex": "#3C3C3C", "reason": "深灰冷调，削弱暖春型的明快感"},
        ],
    },
    TwelveSeason.SPRING_WARM_LIGHT_MUTED: {
        "suitable": [
            {"name": "柔桃粉", "hex": "#FFB6A3", "reason": "柔暖粉，与柔春型低饱和度气质匹配"},
            {"name": "浅杏", "hex": "#F5D5C8", "reason": "柔和暖色，适合柔春型的温婉感"},
            {"name": "暖米", "hex": "#F5E6CC", "reason": "低饱和暖色，柔春型的安全色"},
            {"name": "柔绿", "hex": "#B5D6A7", "reason": "灰调暖绿，柔春型穿来清新自然"},
            {"name": "浅驼", "hex": "#E8D5B7", "reason": "暖调中性色，柔春型百搭色"},
            {"name": "淡黄", "hex": "#FFEAA7", "reason": "柔暖黄，提亮柔春型肤色"},
        ],
        "unsuitable": [
            {"name": "正红", "hex": "#FF0000", "reason": "高饱和冷色，压制柔春型的柔和气质"},
            {"name": "藏青", "hex": "#273475", "reason": "冷深色调，与柔春型不协调"},
        ],
    },
    TwelveSeason.SPRING_WARM_DEEP_CLEAR: {
        "suitable": [
            {"name": "番茄红", "hex": "#E63946", "reason": "暖调鲜红，衬托深春型的热烈气质"},
            {"name": "金棕", "hex": "#C68E17", "reason": "暖深棕，与深春型的丰富感匹配"},
            {"name": "松石绿", "hex": "#40B5A4", "reason": "清亮暖绿，深春型的对比色"},
            {"name": "蜜橘", "hex": "#FF8C42", "reason": "暖调橘色，深春型的活力色"},
            {"name": "暖铜", "hex": "#B87333", "reason": "金属暖色，深春型穿来有质感"},
        ],
        "unsuitable": [
            {"name": "冰蓝", "hex": "#99FFFF", "reason": "冷浅色，让深春型显灰"},
            {"name": "淡紫", "hex": "#E6E6FA", "reason": "冷柔色，与深春型暖深基调冲突"},
        ],
    },
    TwelveSeason.SUMMER_COOL_LIGHT_MUTED: {
        "suitable": [
            {"name": "薰衣草紫", "hex": "#B57EDC", "reason": "冷浅紫，与凉夏型肤色柔和搭配"},
            {"name": "雾蓝", "hex": "#7EC8E3", "reason": "柔和冷蓝，衬托凉夏型的清雅"},
            {"name": "玫瑰粉", "hex": "#FF66CC", "reason": "冷调粉红，提升凉夏型的柔美感"},
            {"name": "薄荷蓝", "hex": "#A5F2F3", "reason": "清冷浅蓝，与凉夏型气质一致"},
            {"name": "灰粉", "hex": "#C3B1E1", "reason": "低饱和冷粉，适合凉夏型的柔和感"},
            {"name": "冰白", "hex": "#F0F8FF", "reason": "冷调白色，比暖白更适合凉夏型"},
        ],
        "unsuitable": [
            {"name": "橘红", "hex": "#FF4500", "reason": "暖高饱和色，与凉夏型冷浅基调冲突"},
            {"name": "明黄", "hex": "#FFD700", "reason": "暖亮色，让凉夏型肤色显黄"},
        ],
    },
    TwelveSeason.SUMMER_COOL_LIGHT_CLEAR: {
        "suitable": [
            {"name": "冰粉", "hex": "#FFD1DC", "reason": "清冷粉，与浅夏型的轻盈感匹配"},
            {"name": "浅蓝", "hex": "#ADD8E6", "reason": "清亮冷蓝，浅夏型的经典色"},
            {"name": "薰衣草", "hex": "#D4A5FF", "reason": "冷调柔紫，衬托浅夏型的灵动感"},
            {"name": "薄荷绿", "hex": "#AAFFCC", "reason": "清亮冷绿，浅夏型的活力色"},
        ],
        "unsuitable": [
            {"name": "砖红", "hex": "#CB4335", "reason": "暖深色，压制浅夏型的轻盈感"},
            {"name": "草绿", "hex": "#3EB370", "reason": "暖调绿，与浅夏型冷感不协调"},
        ],
    },
    TwelveSeason.SUMMER_COOL_DEEP_MUTED: {
        "suitable": [
            {"name": "灰蓝", "hex": "#6F8FAF", "reason": "冷柔蓝，柔夏型的核心色"},
            {"name": "灰紫", "hex": "#8B7DA8", "reason": "冷柔紫，柔夏型的气质色"},
            {"name": "冷灰", "hex": "#A0AEC0", "reason": "冷中性灰，柔夏型的高级色"},
            {"name": "雾粉", "hex": "#D4A5A5", "reason": "低饱和冷粉，柔夏型的温柔色"},
        ],
        "unsuitable": [
            {"name": "橘红", "hex": "#FF4500", "reason": "暖高饱和色，与柔夏型冲突"},
            {"name": "嫩绿", "hex": "#99DC5B", "reason": "暖亮色，柔夏型穿来显脏"},
        ],
    },
    TwelveSeason.AUTUMN_WARM_DEEP_MUTED: {
        "suitable": [
            {"name": "焦糖棕", "hex": "#C68E17", "reason": "暖深棕，与暖秋型肤色浑然一体"},
            {"name": "砖红", "hex": "#CB4335", "reason": "暖调深红，衬托暖秋型的醇厚感"},
            {"name": "橄榄绿", "hex": "#6B8E23", "reason": "暖深绿，呼应暖秋型的沉稳气质"},
            {"name": "驼色", "hex": "#C19A6B", "reason": "暖中性色，暖秋型的经典百搭色"},
            {"name": "芥末黄", "hex": "#FFDB58", "reason": "暖深黄，与暖秋型肤色和谐呼应"},
        ],
        "unsuitable": [
            {"name": "荧光粉", "hex": "#FF6FFF", "reason": "冷高饱和色，与暖秋型暖深基调冲突"},
            {"name": "冰蓝", "hex": "#99FFFF", "reason": "冷浅色，让暖秋型肤色显灰"},
        ],
    },
    TwelveSeason.AUTUMN_WARM_DEEP_CLEAR: {
        "suitable": [
            {"name": "铁锈红", "hex": "#B7410E", "reason": "暖深鲜红，深秋型的标志色"},
            {"name": "深金", "hex": "#D4A017", "reason": "暖深金属色，深秋型的质感色"},
            {"name": "森林绿", "hex": "#228B22", "reason": "暖深绿，深秋型的大地色"},
            {"name": "深橘", "hex": "#FF7518", "reason": "暖深鲜橘，深秋型的活力色"},
            {"name": "赤褐", "hex": "#B5651D", "reason": "暖深棕，深秋型的核心色"},
        ],
        "unsuitable": [
            {"name": "冰粉", "hex": "#FFD1DC", "reason": "冷浅柔色，与深秋型暖深基调冲突"},
            {"name": "浅蓝", "hex": "#ADD8E6", "reason": "冷浅色，让深秋型显灰"},
        ],
    },
    TwelveSeason.AUTUMN_WARM_LIGHT_MUTED: {
        "suitable": [
            {"name": "暖米", "hex": "#F5E6CC", "reason": "柔暖浅色，柔秋型的安全色"},
            {"name": "暖灰", "hex": "#C4B09E", "reason": "低饱和暖灰，柔秋型的高级色"},
            {"name": "柔驼", "hex": "#D4BC98", "reason": "柔暖驼色，柔秋型的经典色"},
            {"name": "浅橄榄", "hex": "#A8B887", "reason": "柔暖绿，柔秋型的自然色"},
        ],
        "unsuitable": [
            {"name": "正红", "hex": "#FF0000", "reason": "冷清高饱和，与柔秋型柔暖基调冲突"},
            {"name": "宝蓝", "hex": "#4169E1", "reason": "冷清色，与柔秋型不协调"},
        ],
    },
    TwelveSeason.WINTER_COOL_DEEP_CLEAR: {
        "suitable": [
            {"name": "正红", "hex": "#FF0000", "reason": "冷深基调，正红让冷冬型气场全开"},
            {"name": "藏青", "hex": "#273475", "reason": "冷深蓝，衬托冷冬型的冷艳气质"},
            {"name": "纯白", "hex": "#FFFFFF", "reason": "冷调白色，冷冬型穿来干净利落"},
            {"name": "宝蓝", "hex": "#4169E1", "reason": "冷深蓝，与冷冬型形成鲜明对比"},
            {"name": "深紫", "hex": "#4B0082", "reason": "冷深紫，增强冷冬型的神秘感"},
        ],
        "unsuitable": [
            {"name": "鹅黄", "hex": "#FFF44F", "reason": "暖浅色，让冷冬型肤色显暗黄"},
            {"name": "杏色", "hex": "#FBCEB1", "reason": "暖浅裸色，与冷冬型冷深基调冲突"},
        ],
    },
    TwelveSeason.WINTER_COOL_LIGHT_CLEAR: {
        "suitable": [
            {"name": "冰蓝", "hex": "#99FFFF", "reason": "冷清浅蓝，浅冬型的标志色"},
            {"name": "冰粉", "hex": "#FFD1DC", "reason": "冷清粉，浅冬型的柔美色"},
            {"name": "纯白", "hex": "#FFFFFF", "reason": "冷调白色，浅冬型的清爽色"},
            {"name": "薄荷绿", "hex": "#AAFFCC", "reason": "冷清绿，浅冬型的活力色"},
        ],
        "unsuitable": [
            {"name": "焦糖棕", "hex": "#C68E17", "reason": "暖深色，压制浅冬型的轻盈感"},
            {"name": "芥末黄", "hex": "#FFDB58", "reason": "暖深黄，让浅冬型显脏"},
        ],
    },
    TwelveSeason.WINTER_COOL_DEEP_MUTED: {
        "suitable": [
            {"name": "深酒红", "hex": "#5C0029", "reason": "冷深柔红，深冬型的质感色"},
            {"name": "深灰", "hex": "#555555", "reason": "冷深灰，深冬型的高级色"},
            {"name": "深藏青", "hex": "#1B2A4A", "reason": "冷深蓝，深冬型的核心色"},
            {"name": "深紫灰", "hex": "#6B5B7B", "reason": "冷柔深紫，深冬型的气质色"},
        ],
        "unsuitable": [
            {"name": "明黄", "hex": "#FFD700", "reason": "暖亮色，与深冬型冷深基调冲突"},
            {"name": "嫩绿", "hex": "#99DC5B", "reason": "暖亮绿，深冬型穿来显脏"},
        ],
    },
}


# ============================================================
# Skin Pixel Detection (CIELAB-based)
# ============================================================

def _is_skin_pixel_cielab(r: int, g: int, b: int) -> bool:
    """Skin pixel detection using CIELAB color space.

    Based on research: human skin in CIELAB falls within:
    L* in [20, 90], a* in [2, 20], b* in [5, 35]
    """
    l, a, b_val = _rgb_to_lab(r, g, b)
    if l < 15 or l > 95:
        return False
    if a < -5 or a > 25:
        return False
    if b_val < 2 or b_val > 40:
        return False
    return True


# ============================================================
# Face Region Extraction
# ============================================================

def _extract_face_landmarks(image: Image.Image) -> Optional[Dict[str, np.ndarray]]:
    """Extract face mesh landmarks using MediaPipe Face Mesh."""
    try:
        import mediapipe as mp
        img_array = np.array(image.convert("RGB"))
        h, w = img_array.shape[:2]

        with mp.solutions.face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
        ) as face_mesh:
            results = face_mesh.process(img_array)
            if not results.multi_face_landmarks:
                return None

            landmarks = results.multi_face_landmarks[0]
            regions = {}
            for region_name, indices in _FACE_MESH_REGIONS.items():
                points = []
                for idx in indices:
                    if idx < len(landmarks.landmark):
                        lm = landmarks.landmark[idx]
                        points.append((lm.x * w, lm.y * h))
                if points:
                    regions[region_name] = np.array(points)

            return regions
    except ImportError:
        logger.debug("MediaPipe Face Mesh not available, using fallback regions")
        return None
    except Exception as e:
        logger.debug("Face mesh extraction failed: %s", str(e))
        return None


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


def _compute_region_lab(
    img_array: np.ndarray,
    region_coords: Optional[Tuple[float, float, float, float]] = None,
    landmark_points: Optional[np.ndarray] = None,
) -> Optional[Tuple[float, float, float]]:
    """Compute median CIELAB for skin pixels in a region."""
    if landmark_points is not None and len(landmark_points) >= 3:
        # Use landmark convex hull
        import cv2
        hull = cv2.convexHull(landmark_points.astype(np.int32))
        mask = np.zeros(img_array.shape[:2], dtype=np.uint8)
        cv2.fillConvexPoly(mask, hull, 255)
        pixels = img_array[mask > 0]
    elif region_coords is not None:
        pixels = _extract_region_pixels(img_array, region_coords)
        if pixels.size == 0:
            return None
        pixels = pixels.reshape(-1, 3)
    else:
        return None

    lab_l = []
    lab_a = []
    lab_b = []

    for pixel in pixels:
        r, g, b = int(pixel[0]), int(pixel[1]), int(pixel[2])
        if _is_skin_pixel_cielab(r, g, b):
            l_val, a_val, b_val = _rgb_to_lab(r, g, b)
            lab_l.append(l_val)
            lab_a.append(a_val)
            lab_b.append(b_val)

    if len(lab_l) < 5:
        return None

    return (
        float(np.median(lab_l)),
        float(np.median(lab_a)),
        float(np.median(lab_b)),
    )


# ============================================================
# Season Classification Algorithm
# ============================================================

def _classify_tone(a_star: float) -> Tuple[ToneType, float]:
    """Classify warm/cool tone from CIELAB a* axis.

    In CIELAB, positive a* = red/warm, negative a* = green/cool.
    """
    if a_star > 8.0:
        return ToneType.WARM, min(1.0, 0.5 + a_star / 30.0)
    if a_star > 3.0:
        return ToneType.WARM, 0.5 + a_star / 20.0
    if a_star < -2.0:
        return ToneType.COOL, min(1.0, 0.5 + abs(a_star) / 20.0)
    # NEUTRAL range: [-2.0, 3.0]
    return ToneType.NEUTRAL, 0.5


def _classify_depth(l_star: float) -> Tuple[DepthType, float]:
    """Classify light/deep from CIELAB L* axis."""
    if l_star >= 65.0:
        return DepthType.LIGHT, min(1.0, 0.5 + (l_star - 65.0) / 30.0)
    if l_star >= 50.0:
        return DepthType.LIGHT, 0.5 + (l_star - 50.0) / 30.0
    if l_star >= 40.0:
        return DepthType.DEEP, 0.5 + (50.0 - l_star) / 20.0
    return DepthType.DEEP, min(1.0, 0.5 + (40.0 - l_star) / 20.0)


def _classify_chroma(chroma: float) -> Tuple[ChromaType, float]:
    """Classify clear/muted from CIELAB chroma C*."""
    if chroma >= 18.0:
        return ChromaType.CLEAR, min(1.0, 0.5 + (chroma - 18.0) / 15.0)
    if chroma >= 12.0:
        return ChromaType.CLEAR, 0.5 + (chroma - 12.0) / 12.0
    if chroma >= 8.0:
        return ChromaType.MUTED, 0.5 + (12.0 - chroma) / 8.0
    return ChromaType.MUTED, min(1.0, 0.5 + (8.0 - chroma) / 8.0)


def _determine_season(
    tone: ToneType, depth: DepthType, chroma: ChromaType
) -> TwelveSeason:
    """Determine 12-season type from tone, depth, and chroma."""
    if tone in (ToneType.WARM, ToneType.NEUTRAL):
        if depth == DepthType.LIGHT:
            if chroma == ChromaType.CLEAR:
                return TwelveSeason.SPRING_WARM_LIGHT_CLEAR
            return TwelveSeason.SPRING_WARM_LIGHT_MUTED
        # Deep + Warm
        if chroma == ChromaType.CLEAR:
            return TwelveSeason.SPRING_WARM_DEEP_CLEAR
        return TwelveSeason.AUTUMN_WARM_DEEP_MUTED
    else:
        # Cool
        if depth == DepthType.LIGHT:
            if chroma == ChromaType.CLEAR:
                return TwelveSeason.SUMMER_COOL_LIGHT_CLEAR
            return TwelveSeason.SUMMER_COOL_LIGHT_MUTED
        # Deep + Cool
        if chroma == ChromaType.CLEAR:
            return TwelveSeason.WINTER_COOL_DEEP_CLEAR
        return TwelveSeason.WINTER_COOL_DEEP_MUTED


# ============================================================
# CIEDE2000-based Dynamic Palette Enhancement
# ============================================================

def _ciede2000(
    lab1: Tuple[float, float, float], lab2: Tuple[float, float, float]
) -> float:
    """Compute CIEDE2000 color difference."""
    l1, a1, b1 = lab1
    l2, a2, b2 = lab2

    c1 = math.sqrt(a1 ** 2 + b1 ** 2)
    c2 = math.sqrt(a2 ** 2 + b2 ** 2)
    c_avg = (c1 + c2) / 2.0

    c_avg_7 = c_avg ** 7
    g = 0.5 * (1.0 - math.sqrt(c_avg_7 / (c_avg_7 + 25.0 ** 7)))

    a1p = a1 * (1.0 + g)
    a2p = a2 * (1.0 + g)

    c1p = math.sqrt(a1p ** 2 + b1 ** 2)
    c2p = math.sqrt(a2p ** 2 + b2 ** 2)

    h1p = math.degrees(math.atan2(b1, a1p)) % 360.0
    h2p = math.degrees(math.atan2(b2, a2p)) % 360.0

    dl = l2 - l1
    dcp = c2p - c1p

    if c1p * c2p == 0:
        dhp = 0.0
    elif abs(h2p - h1p) <= 180.0:
        dhp = h2p - h1p
    elif h2p - h1p > 180.0:
        dhp = h2p - h1p - 360.0
    else:
        dhp = h2p - h1p + 360.0

    dhp_val = 2.0 * math.sqrt(c1p * c2p) * math.sin(math.radians(dhp / 2.0))

    lp_avg = (l1 + l2) / 2.0
    cp_avg = (c1p + c2p) / 2.0

    if c1p * c2p == 0:
        hp_avg = h1p + h2p
    elif abs(h1p - h2p) <= 180.0:
        hp_avg = (h1p + h2p) / 2.0
    elif h1p + h2p < 360.0:
        hp_avg = (h1p + h2p + 360.0) / 2.0
    else:
        hp_avg = (h1p + h2p - 360.0) / 2.0

    t = (1.0
         - 0.17 * math.cos(math.radians(hp_avg - 30.0))
         + 0.24 * math.cos(math.radians(2.0 * hp_avg))
         + 0.32 * math.cos(math.radians(3.0 * hp_avg + 6.0))
         - 0.20 * math.cos(math.radians(4.0 * hp_avg - 63.0)))

    sl = 1.0 + 0.015 * (lp_avg - 50.0) ** 2 / math.sqrt(20.0 + (lp_avg - 50.0) ** 2)
    sc = 1.0 + 0.045 * cp_avg
    sh = 1.0 + 0.015 * cp_avg * t

    cp_avg_7 = cp_avg ** 7
    rt = (-math.sin(math.radians(2.0 * (30.0 * math.exp(-((hp_avg - 275.0) / 25.0) ** 2))))
          * 2.0 * math.sqrt(cp_avg_7 / (cp_avg_7 + 25.0 ** 7)))

    kl, kc, kh = 1.0, 1.0, 1.0

    result = math.sqrt(
        (dl / (kl * sl)) ** 2
        + (dcp / (kc * sc)) ** 2
        + (dhp_val / (kh * sh)) ** 2
        + rt * (dcp / (kc * sc)) * (dhp_val / (kh * sh))
    )

    return result


def generate_palette(season: TwelveSeason) -> Dict[str, List[ColorSwatch]]:
    """Generate color palette for a 12-season type."""
    palette_data = _SEASON_PALETTES.get(season)
    if palette_data is None:
        logger.warning("Unknown season type: %s, falling back to SPRING_WARM_LIGHT_CLEAR", season)
        palette_data = _SEASON_PALETTES[TwelveSeason.SPRING_WARM_LIGHT_CLEAR]

    suitable = [
        ColorSwatch(name=c["name"], hex_value=c["hex"], reason=c["reason"])
        for c in palette_data["suitable"]
    ]
    unsuitable = [
        ColorSwatch(name=c["name"], hex_value=c["hex"], reason=c["reason"])
        for c in palette_data["unsuitable"]
    ]

    return {"suitable": suitable, "unsuitable": unsuitable}


# ============================================================
# Main Analysis Entry Point
# ============================================================

def analyze_color_season(
    face_image: Union[str, Image.Image],
) -> ColorSeasonResult:
    """Analyze color season from a face image using CIELAB + ITA + 12-season system.

    Pipeline:
    1. Extract face mesh landmarks (MediaPipe Face Mesh 468 points)
    2. Sample skin pixels from facial regions using landmark convex hulls
    3. Compute average CIELAB values (L*, a*, b*)
    4. Compute ITA (Individual Typology Angle)
    5. Classify along 3 dimensions: hue (a*), value (L*), chroma (C*)
    6. Map to one of 12 seasons
    7. Generate color palette with CIEDE2000 harmony verification

    Args:
        face_image: Path to image file or PIL Image object of a face.

    Returns:
        ColorSeasonResult with 12-season type, tone, depth, chroma,
        skin CIELAB values, ITA score, and color palette.
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

    # Step 1: Try MediaPipe Face Mesh for precise regions
    face_regions = _extract_face_landmarks(img)

    # Step 2: Extract CIELAB values from facial regions
    region_results: Dict[str, Tuple[float, float, float]] = {}

    if face_regions:
        # Use landmark-based regions
        for region_name, points in face_regions.items():
            result = _compute_region_lab(img_array, landmark_points=points)
            if result is not None:
                region_results[region_name] = result
                logger.debug(
                    "Region %s (landmark): L=%.1f a=%.1f b=%.1f",
                    region_name, result[0], result[1], result[2],
                )

    # Fallback to fixed regions if landmark extraction failed
    if not face_regions:
        for region_name, region_coords in _FALLBACK_REGIONS.items():
            result = _compute_region_lab(img_array, region_coords=region_coords)
            if result is not None:
                region_results[region_name] = result
                logger.debug(
                    "Region %s (fallback): L=%.1f a=%.1f b=%.1f",
                    region_name, result[0], result[1], result[2],
                )

    if not region_results:
        logger.warning("No valid skin regions detected, using fallback defaults")
        avg_l, avg_a, avg_b = 65.0, 8.0, 15.0
    else:
        # Weighted average of regions
        weights: Dict[str, float] = {
            "forehead": 0.25,
            "left_cheek": 0.20,
            "right_cheek": 0.20,
            "nose_bridge": 0.15,
            "chin": 0.20,
        }
        total_weight = sum(weights.get(name, 0.1) for name in region_results)
        avg_l = sum(
            region_results[n][0] * weights.get(n, 0.1) for n in region_results
        ) / total_weight
        avg_a = sum(
            region_results[n][1] * weights.get(n, 0.1) for n in region_results
        ) / total_weight
        avg_b = sum(
            region_results[n][2] * weights.get(n, 0.1) for n in region_results
        ) / total_weight

    logger.info(
        "Weighted average skin CIELAB: L=%.1f a=%.1f b=%.1f",
        avg_l, avg_a, avg_b,
    )

    # Step 3: Compute derived metrics
    chroma = _compute_chroma(avg_a, avg_b)
    ita = _compute_ita(avg_l, avg_b)

    logger.info("Chroma=%.1f, ITA=%.1f", chroma, ita)

    # Step 4: Classify along 3 dimensions
    tone, tone_conf = _classify_tone(avg_a)
    depth, depth_conf = _classify_depth(avg_l)
    chroma_type, chroma_conf = _classify_chroma(chroma)

    # Step 5: Map to 12-season
    season = _determine_season(tone, depth, chroma_type)

    # Overall confidence
    confidence = (tone_conf + depth_conf + chroma_conf) / 3.0

    logger.info(
        "Color season result: %s (tone=%s, depth=%s, chroma=%s, ITA=%.1f, confidence=%.3f)",
        season.value, tone.value, depth.value, chroma_type.value, ita, confidence,
    )

    # Step 6: Generate palette
    palette = generate_palette(season)

    return ColorSeasonResult(
        season=season,
        parent_season=_PARENT_SEASON[season],
        tone=tone,
        depth=depth,
        chroma=chroma_type,
        skin_lab=(avg_l, avg_a, avg_b),
        ita=ita,
        suitable_colors=palette["suitable"],
        unsuitable_colors=palette["unsuitable"],
        confidence=confidence,
    )


# ============================================================
# Backward Compatibility
# ============================================================

# Keep the old 4-season enum and interface for backward compatibility
class ColorSeason(Enum):
    SPRING = "spring"
    SUMMER = "summer"
    AUTUMN = "autumn"
    WINTER = "winter"
