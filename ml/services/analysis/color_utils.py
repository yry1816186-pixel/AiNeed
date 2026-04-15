"""
P0-5: Unified CIELAB Color Science and CIEDE2000 Implementation

This module provides a single source of truth for:
- RGB <-> CIELAB conversion (D65 illuminant)
- CIEDE2000 color difference
- Seasonal palette generation

Other modules should import from here instead of implementing their own copies.
"""

from __future__ import annotations

import math
from typing import Dict, List, Tuple

import numpy as np

# ============================================================
# D65 Illuminant Reference Values
# ============================================================

_D65_XN = 0.95047
_D65_YN = 1.00000
_D65_ZN = 1.08883


# ============================================================
# RGB <-> CIELAB Conversion
# ============================================================

def rgb_to_lab(r: int, g: int, b: int) -> Tuple[float, float, float]:
    """Convert RGB (0-255) to CIELAB using D65 illuminant.

    Args:
        r: Red channel (0-255)
        g: Green channel (0-255)
        b: Blue channel (0-255)

    Returns:
        Tuple of (L*, a*, b*) CIELAB values
    """
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

    delta = 6.0 / 29.0

    def f(t: float) -> float:
        if t > delta ** 3:
            return t ** (1.0 / 3.0)
        return t / (3.0 * delta * delta) + 4.0 / 29.0

    fx, fy, fz = f(x), f(y), f(z)
    l_star = 116.0 * fy - 16.0
    a_star = 500.0 * (fx - fy)
    b_star = 200.0 * (fy - fz)

    return (l_star, a_star, b_star)


def lab_to_rgb(l: float, a: float, b: float) -> Tuple[int, int, int]:
    """Convert CIELAB to RGB (0-255).

    Args:
        l: L* value
        a: a* value
        b: b* value

    Returns:
        Tuple of (R, G, B) values (0-255)
    """
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


def hex_to_lab(hex_value: str) -> Tuple[float, float, float]:
    """Convert hex color string to CIELAB.

    Args:
        hex_value: Hex color string (e.g., '#FF7F7F' or 'FF7F7F')

    Returns:
        Tuple of (L*, a*, b*) CIELAB values
    """
    hex_value = hex_value.lstrip("#")
    r = int(hex_value[0:2], 16)
    g = int(hex_value[2:4], 16)
    b = int(hex_value[4:6], 16)
    return rgb_to_lab(r, g, b)


# ============================================================
# CIEDE2000 Color Difference
# ============================================================

def delta_e_ciede2000(
    lab1: Tuple[float, float, float],
    lab2: Tuple[float, float, float],
    kl: float = 1.0,
    kc: float = 1.0,
    kh: float = 1.0,
) -> float:
    """Compute CIEDE2000 color difference between two CIELAB colors.

    Args:
        lab1: First CIELAB color (L*, a*, b*)
        lab2: Second CIELAB color (L*, a*, b*)
        kl: Lightness weighting factor (default 1.0)
        kc: Chroma weighting factor (default 1.0)
        kh: Hue weighting factor (default 1.0)

    Returns:
        CIEDE2000 color difference value
    """
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

    result = math.sqrt(
        (dl / (kl * sl)) ** 2
        + (dcp / (kc * sc)) ** 2
        + (dhp_val / (kh * sh)) ** 2
        + rt * (dcp / (kc * sc)) * (dhp_val / (kh * sh))
    )

    return result


# ============================================================
# Seasonal Palette Generation
# ============================================================

# 4-season color palettes with hex values
_SEASONAL_PALETTES: Dict[str, Dict[str, List[Dict[str, str]]]] = {
    "spring": {
        "best_colors": [
            {"name": "珊瑚粉", "hex": "#FF7F7F"},
            {"name": "桃红", "hex": "#FF8C94"},
            {"name": "杏色", "hex": "#FBCEB1"},
            {"name": "暖黄", "hex": "#FFD700"},
            {"name": "草绿", "hex": "#99DC5B"},
            {"name": "浅蓝绿", "hex": "#87CEEB"},
            {"name": "米色", "hex": "#F5E6CC"},
            {"name": "奶油白", "hex": "#FFFDD0"},
        ],
        "avoid_colors": [
            {"name": "纯黑", "hex": "#000000"},
            {"name": "纯白", "hex": "#FFFFFF"},
            {"name": "冷灰", "hex": "#808080"},
            {"name": "深紫", "hex": "#4B0082"},
        ],
    },
    "summer": {
        "best_colors": [
            {"name": "玫瑰粉", "hex": "#FF66CC"},
            {"name": "薰衣草紫", "hex": "#B57EDC"},
            {"name": "天蓝", "hex": "#87CEEB"},
            {"name": "薄荷绿", "hex": "#98FB98"},
            {"name": "灰粉", "hex": "#C3B1E1"},
            {"name": "银灰", "hex": "#C0C0C0"},
        ],
        "avoid_colors": [
            {"name": "橙色", "hex": "#FFA500"},
            {"name": "金黄", "hex": "#FFD700"},
            {"name": "暖棕", "hex": "#8B4513"},
        ],
    },
    "autumn": {
        "best_colors": [
            {"name": "焦糖色", "hex": "#C68E17"},
            {"name": "酒红", "hex": "#722F37"},
            {"name": "墨绿", "hex": "#006400"},
            {"name": "棕色", "hex": "#8B4513"},
            {"name": "橙色", "hex": "#FF8C00"},
            {"name": "芥末黄", "hex": "#FFDB58"},
            {"name": "驼色", "hex": "#C19A6B"},
        ],
        "avoid_colors": [
            {"name": "荧光色", "hex": "#CCFF00"},
            {"name": "冷粉", "hex": "#FFB6C1"},
            {"name": "纯白", "hex": "#FFFFFF"},
        ],
    },
    "winter": {
        "best_colors": [
            {"name": "正红", "hex": "#FF0000"},
            {"name": "宝蓝", "hex": "#4169E1"},
            {"name": "纯白", "hex": "#FFFFFF"},
            {"name": "黑色", "hex": "#000000"},
            {"name": "玫红", "hex": "#FF007F"},
            {"name": "翠绿", "hex": "#00C957"},
            {"name": "深灰", "hex": "#555555"},
        ],
        "avoid_colors": [
            {"name": "暖橙", "hex": "#FF8C00"},
            {"name": "土黄", "hex": "#E1C699"},
            {"name": "暖棕", "hex": "#8B4513"},
        ],
    },
}


def get_seasonal_palette(season: str) -> Dict[str, List[Dict[str, str]]]:
    """Get the color palette for a given season.

    Args:
        season: Season name ('spring', 'summer', 'autumn', 'winter')

    Returns:
        Dictionary with 'best_colors' and 'avoid_colors' lists
    """
    return _SEASONAL_PALETTES.get(season, _SEASONAL_PALETTES["spring"])


def compute_ita(l_star: float, b_star: float) -> float:
    """Compute Individual Typology Angle (ITA).

    ITA = arctan((L* - 50) / b*) * (180 / pi)

    Args:
        l_star: CIELAB L* value
        b_star: CIELAB b* value

    Returns:
        ITA value in degrees
    """
    if abs(b_star) < 1e-10:
        return 90.0 if l_star > 50 else -90.0
    return math.atan((l_star - 50.0) / b_star) * (180.0 / math.pi)


def compute_chroma(a_star: float, b_star: float) -> float:
    """Compute chroma C* = sqrt(a*^2 + b*^2).

    Args:
        a_star: CIELAB a* value
        b_star: CIELAB b* value

    Returns:
        Chroma value
    """
    return math.sqrt(a_star ** 2 + b_star ** 2)


def is_skin_pixel_cielab(r: int, g: int, b: int) -> bool:
    """Skin pixel detection using CIELAB color space.

    Based on research: human skin in CIELAB falls within:
    L* in [20, 90], a* in [2, 20], b* in [5, 35]

    Args:
        r: Red channel (0-255)
        g: Green channel (0-255)
        b: Blue channel (0-255)

    Returns:
        True if the pixel is likely a skin pixel
    """
    l, a, b_val = rgb_to_lab(r, g, b)
    if l < 15 or l > 95:
        return False
    if a < -5 or a > 25:
        return False
    if b_val < 2 or b_val > 40:
        return False
    return True


# ============================================================
# Vectorized Batch Conversions (numpy)
# ============================================================

def rgb_to_lab_batch(pixels: np.ndarray) -> np.ndarray:
    """Convert an array of RGB pixels to CIELAB using D65 illuminant (vectorized).

    This is the vectorized equivalent of rgb_to_lab() for batch processing.
    Uses the same algorithm and constants, ensuring identical results.

    Args:
        pixels: numpy array of shape (N, 3) with RGB values in [0, 255]

    Returns:
        numpy array of shape (N, 3) with (L*, a*, b*) CIELAB values
    """
    r_flat = pixels[:, 0].astype(np.float64) / 255.0
    g_flat = pixels[:, 1].astype(np.float64) / 255.0
    b_flat = pixels[:, 2].astype(np.float64) / 255.0

    # Vectorized sRGB linearization (same thresholds as scalar version)
    rl = np.where(r_flat > 0.04045, ((r_flat + 0.055) / 1.055) ** 2.4, r_flat / 12.92)
    gl = np.where(g_flat > 0.04045, ((g_flat + 0.055) / 1.055) ** 2.4, g_flat / 12.92)
    bl = np.where(b_flat > 0.04045, ((b_flat + 0.055) / 1.055) ** 2.4, b_flat / 12.92)

    # Linear RGB -> XYZ (D65), same matrix as scalar version
    x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / _D65_XN
    y = (rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750) / _D65_YN
    z = (rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041) / _D65_ZN

    # XYZ -> CIELAB, same delta and formula as scalar version
    delta = 6.0 / 29.0
    fx = np.where(x > delta ** 3, x ** (1.0 / 3.0), x / (3.0 * delta * delta) + 4.0 / 29.0)
    fy = np.where(y > delta ** 3, y ** (1.0 / 3.0), y / (3.0 * delta * delta) + 4.0 / 29.0)
    fz = np.where(z > delta ** 3, z ** (1.0 / 3.0), z / (3.0 * delta * delta) + 4.0 / 29.0)

    lab = np.column_stack([116.0 * fy - 16.0, 500.0 * (fx - fy), 200.0 * (fy - fz)])
    return lab


def lab_to_rgb_batch(lab_pixels: np.ndarray) -> np.ndarray:
    """Convert an array of CIELAB values to RGB (vectorized).

    This is the vectorized equivalent of lab_to_rgb() for batch processing.
    Uses the same algorithm and constants, ensuring identical results.

    Args:
        lab_pixels: numpy array of shape (N, 3) with (L*, a*, b*) values

    Returns:
        numpy array of shape (N, 3) with RGB values in [0, 255] as int32
    """
    l = lab_pixels[:, 0]
    a = lab_pixels[:, 1]
    b = lab_pixels[:, 2]

    delta = 6.0 / 29.0
    fy = (l + 16.0) / 116.0
    fx = a / 500.0 + fy
    fz = fy - b / 200.0

    # Inverse f function (same as scalar version)
    xn = np.where(fx > delta, fx ** 3, 3.0 * delta * delta * (fx - 4.0 / 29.0)) * _D65_XN
    yn = np.where(fy > delta, fy ** 3, 3.0 * delta * delta * (fy - 4.0 / 29.0)) * _D65_YN
    zn = np.where(fz > delta, fz ** 3, 3.0 * delta * delta * (fz - 4.0 / 29.0)) * _D65_ZN

    # XYZ -> linear RGB (same matrix as scalar version)
    rl = 3.2404542 * xn - 1.5371385 * yn - 0.4985314 * zn
    gl = -0.9692660 * xn + 1.8760108 * yn + 0.0415560 * zn
    bl = 0.0556434 * xn - 0.2040259 * yn + 1.0572252 * zn

    # Gamma correction (same thresholds as scalar version)
    rl = np.maximum(0.0, rl)
    gl = np.maximum(0.0, gl)
    bl = np.maximum(0.0, bl)

    rl = np.where(rl > 0.0031308, 1.055 * rl ** (1.0 / 2.4) - 0.055, 12.92 * rl)
    gl = np.where(gl > 0.0031308, 1.055 * gl ** (1.0 / 2.4) - 0.055, 12.92 * gl)
    bl = np.where(bl > 0.0031308, 1.055 * bl ** (1.0 / 2.4) - 0.055, 12.92 * bl)

    rgb = np.column_stack([
        np.clip(np.round(rl * 255), 0, 255),
        np.clip(np.round(gl * 255), 0, 255),
        np.clip(np.round(bl * 255), 0, 255),
    ]).astype(np.int32)

    return rgb
