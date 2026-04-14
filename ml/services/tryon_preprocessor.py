"""
Virtual Try-On Preprocessing Module
Body region segmentation, geometric alignment, lighting extraction, garment feature extraction.
Uses MediaPipe Pose keypoints and CIELAB color science.

Author: XunO ML Team
Version: 1.0.0
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

# MediaPipe Pose landmark indices
SHOULDER_LEFT = 11
SHOULDER_RIGHT = 12
HIP_LEFT = 23
HIP_RIGHT = 24
KNEE_LEFT = 25
KNEE_RIGHT = 26
ANKLE_LEFT = 27
ANKLE_RIGHT = 28
NOSE = 0
LEFT_EAR = 7
RIGHT_EAR = 8
LEFT_WRIST = 15
RIGHT_WRIST = 16

# CIELAB conversion constants (D65 illuminant)
_D65_XN = 0.95047
_D65_YN = 1.00000
_D65_ZN = 1.08883


@dataclass
class GarmentFeatures:
    dominant_colors: List[Tuple[int, int, int]]
    color_names: List[str]
    pattern_type: str  # solid / striped / floral / printed / plaid
    texture_descriptor: str  # smooth / textured / knit / denim / silk
    formality: str  # formal / smart-casual / casual / sporty


@dataclass
class AlignmentMetadata:
    pose_angle: float  # degrees from vertical
    shoulder_width_px: float
    torso_height_px: float
    garment_scale_factor: float
    offset_x: float
    offset_y: float
    pose_description: str  # "frontal" / "slight-left" / "slight-right"


@dataclass
class LightingInfo:
    average_brightness: float  # L* from CIELAB [0, 100]
    color_temperature: str  # "warm" / "cool" / "neutral"
    skin_tone_description: str  # "warm-yellow" / "cool-pink" / "neutral"
    avg_lab: Tuple[float, float, float]  # (L*, a*, b*)


@dataclass
class PreprocessResult:
    alignment: AlignmentMetadata
    lighting: LightingInfo
    garment_features: GarmentFeatures
    mask_region: Optional[np.ndarray] = None


def _rgb_to_lab(r: int, g: int, b: int) -> Tuple[float, float, float]:
    """Convert RGB (0-255) to CIELAB using D65 illuminant."""
    # Normalize to [0, 1]
    rn = r / 255.0
    gn = g / 255.0
    bn = b / 255.0

    # sRGB -> linear RGB
    def linearize(c: float) -> float:
        return ((c + 0.055) / 1.055) ** 2.4 if c > 0.04045 else c / 12.92

    rl = linearize(rn)
    gl = linearize(gn)
    bl = linearize(bn)

    # Linear RGB -> XYZ (D65)
    x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / _D65_XN
    y = (rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750) / _D65_YN
    z = (rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041) / _D65_ZN

    # XYZ -> CIELAB
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

    # XYZ -> linear RGB
    rl = 3.2404542 * xn - 1.5371385 * yn - 0.4985314 * zn
    gl = -0.9692660 * xn + 1.8760108 * yn + 0.0415560 * zn
    bl = 0.0556434 * xn - 0.2040259 * yn + 1.0572252 * zn

    # Gamma correction
    def gamma(c: float) -> float:
        c = max(0.0, c)
        return 1.055 * c ** (1.0 / 2.4) - 0.055 if c > 0.0031308 else 12.92 * c

    return (
        min(255, max(0, round(gamma(rl) * 255))),
        min(255, max(0, round(gamma(gl) * 255))),
        min(255, max(0, round(gamma(bl) * 255))),
    )


def _ciede2000(lab1: Tuple[float, float, float], lab2: Tuple[float, float, float]) -> float:
    """Compute CIEDE2000 color difference between two CIELAB colors."""
    l1, a1, b1 = lab1
    l2, a2, b2 = lab2

    c1 = np.sqrt(a1 ** 2 + b1 ** 2)
    c2 = np.sqrt(a2 ** 2 + b2 ** 2)
    c_avg = (c1 + c2) / 2.0

    c_avg_7 = c_avg ** 7
    g = 0.5 * (1.0 - np.sqrt(c_avg_7 / (c_avg_7 + 25.0 ** 7)))

    a1p = a1 * (1.0 + g)
    a2p = a2 * (1.0 + g)

    c1p = np.sqrt(a1p ** 2 + b1 ** 2)
    c2p = np.sqrt(a2p ** 2 + b2 ** 2)

    h1p = np.degrees(np.arctan2(b1, a1p)) % 360.0
    h2p = np.degrees(np.arctan2(b2, a2p)) % 360.0

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

    dhp_val = 2.0 * np.sqrt(c1p * c2p) * np.sin(np.radians(dhp / 2.0))

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
         - 0.17 * np.cos(np.radians(hp_avg - 30.0))
         + 0.24 * np.cos(np.radians(2.0 * hp_avg))
         + 0.32 * np.cos(np.radians(3.0 * hp_avg + 6.0))
         - 0.20 * np.cos(np.radians(4.0 * hp_avg - 63.0)))

    sl = 1.0 + 0.015 * (lp_avg - 50.0) ** 2 / np.sqrt(20.0 + (lp_avg - 50.0) ** 2)
    sc = 1.0 + 0.045 * cp_avg
    sh = 1.0 + 0.015 * cp_avg * t

    cp_avg_7 = cp_avg ** 7
    rt = (-np.sin(np.radians(2.0 * (30.0 * np.exp(-((hp_avg - 275.0) / 25.0) ** 2))))
          * 2.0 * np.sqrt(cp_avg_7 / (cp_avg_7 + 25.0 ** 7)))

    kl, kc, kh = 1.0, 1.0, 1.0

    result = np.sqrt(
        (dl / (kl * sl)) ** 2
        + (dcp / (kc * sc)) ** 2
        + (dhp_val / (kh * sh)) ** 2
        + rt * (dcp / (kc * sc)) * (dhp_val / (kh * sh))
    )

    return float(result)


def _is_skin_pixel_cielab(r: int, g: int, b: int) -> bool:
    """Skin pixel detection using CIELAB color space (more accurate than RGB heuristic)."""
    l, a, b_val = _rgb_to_lab(r, g, b)
    # Human skin tone in CIELAB: L* in [20, 90], a* in [2, 20], b* in [5, 35]
    # This covers the full range of human skin tones across ethnicities
    if l < 15 or l > 95:
        return False
    if a < -5 or a > 25:
        return False
    if b_val < 2 or b_val > 40:
        return False
    return True


def _kmeans_colors(img_array: np.ndarray, k: int = 3) -> List[Tuple[int, int, int]]:
    """Extract k dominant colors using k-means clustering in CIELAB space.

    Uses vectorized Euclidean distance in CIELAB for k-means iterations
    (fast approximation), then validates final centroids with CIEDE2000.
    """
    pixels = img_array.reshape(-1, 3).astype(np.float32)

    # Subsample for performance if image is large
    if len(pixels) > 5000:
        indices = np.random.choice(len(pixels), 5000, replace=False)
        pixels = pixels[indices]

    # Convert all pixels to CIELAB using vectorized operation
    r_flat = pixels[:, 0].astype(np.float64) / 255.0
    g_flat = pixels[:, 1].astype(np.float64) / 255.0
    b_flat = pixels[:, 2].astype(np.float64) / 255.0

    # Vectorized sRGB linearization
    def _vec_linearize(c):
        return np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)

    rl = _vec_linearize(r_flat)
    gl = _vec_linearize(g_flat)
    bl = _vec_linearize(b_flat)

    x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / _D65_XN
    y = (rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750) / _D65_YN
    z = (rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041) / _D65_ZN

    delta = 6.0 / 29.0
    fx = np.where(x > delta ** 3, x ** (1.0 / 3.0), x / (3.0 * delta * delta) + 4.0 / 29.0)
    fy = np.where(y > delta ** 3, y ** (1.0 / 3.0), y / (3.0 * delta * delta) + 4.0 / 29.0)
    fz = np.where(z > delta ** 3, z ** (1.0 / 3.0), z / (3.0 * delta * delta) + 4.0 / 29.0)

    lab_pixels = np.column_stack([116.0 * fy - 16.0, 500.0 * (fx - fy), 200.0 * (fy - fz)])

    # Simple k-means in CIELAB space using Euclidean distance (fast)
    # Initialize centroids using k-means++
    centroids = np.zeros((k, 3))
    centroids[0] = lab_pixels[np.random.randint(len(lab_pixels))]

    for i in range(1, k):
        # Euclidean distance to nearest centroid (vectorized)
        dists = np.min(
            np.sqrt(np.sum((lab_pixels[:, None, :] - centroids[None, :i, :]) ** 2, axis=2)),
            axis=1,
        )
        dist_sq = dists ** 2
        probs = dist_sq / max(dist_sq.sum(), 1e-10)
        centroids[i] = lab_pixels[np.random.choice(len(lab_pixels), p=probs)]

    # Iterate k-means with Euclidean distance in CIELAB (good approximation)
    for _ in range(10):
        # Vectorized assignment: distances[n, c] = ||lab_pixels[n] - centroids[c]||
        diff = lab_pixels[:, None, :] - centroids[None, :, :]
        distances = np.sqrt(np.sum(diff ** 2, axis=2))
        assignments = np.argmin(distances, axis=1)
        for j in range(k):
            mask = assignments == j
            if mask.sum() > 0:
                centroids[j] = lab_pixels[mask].mean(axis=0)

    # Convert centroids back to RGB
    dominant_rgb = [_lab_to_rgb(float(c[0]), float(c[1]), float(c[2])) for c in centroids]
    return dominant_rgb


def _analyze_texture_frequency(img_array: np.ndarray) -> str:
    """Classify garment texture pattern using frequency analysis (2D FFT)."""
    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    # Resize for consistent FFT
    gray = cv2.resize(gray, (128, 128))

    # Apply 2D FFT
    f = np.fft.fft2(gray)
    fshift = np.fft.fftshift(f)
    magnitude = np.abs(fshift)

    # Analyze frequency distribution
    h, w = magnitude.shape
    center_h, center_w = h // 2, w // 2

    # Low frequency energy (DC component region)
    low_region = magnitude[center_h - 8:center_h + 8, center_w - 8:center_w + 8]
    low_energy = np.mean(low_region ** 2)

    # High frequency energy
    high_energy = np.mean(magnitude ** 2) - low_energy / (magnitude.size)

    # Check for directional patterns (stripes)
    horizontal_profile = magnitude[center_h, :]
    vertical_profile = magnitude[:, center_w]

    h_peaks = _count_peaks(horizontal_profile)
    v_peaks = _count_peaks(vertical_profile)

    # Check for repetitive patterns
    if h_peaks > 5 or v_peaks > 5:
        if abs(h_peaks - v_peaks) > 3:
            return "striped"
        return "plaid"

    if high_energy / (low_energy + 1e-10) > 0.3:
        return "printed"

    return "solid"


def _count_peaks(profile: np.ndarray, min_distance: int = 5) -> int:
    """Count peaks in a 1D signal for pattern detection."""
    peaks = 0
    last_peak = -min_distance
    threshold = np.mean(profile) + np.std(profile)

    for i in range(1, len(profile) - 1):
        if profile[i] > threshold and profile[i] > profile[i - 1] and profile[i] > profile[i + 1]:
            if i - last_peak >= min_distance:
                peaks += 1
                last_peak = i

    return peaks


def _classify_formality(colors: List[Tuple[int, int, int]], pattern: str) -> str:
    """Classify garment formality based on colors and pattern."""
    # Convert colors to CIELAB
    lab_colors = [_rgb_to_lab(c[0], c[1], c[2]) for c in colors]

    # Low chroma (muted) colors -> more formal
    avg_chroma = np.mean([np.sqrt(lab[1] ** 2 + lab[2] ** 2) for lab in lab_colors])

    # Dark colors -> more formal
    avg_lightness = np.mean([lab[0] for lab in lab_colors])

    # Neutral colors (low chroma) -> formal
    if avg_chroma < 10:
        return "formal"

    if pattern in ("striped", "plaid") and avg_chroma < 20:
        return "smart-casual"

    if pattern == "solid" and avg_lightness < 40:
        return "formal"

    if avg_chroma > 25 or pattern in ("printed", "floral"):
        return "casual"

    return "smart-casual"


def _describe_texture(img_array: np.ndarray) -> str:
    """Describe garment texture (smooth/textured/knit/denim/silk)."""
    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    gray = cv2.resize(gray, (128, 128))

    # Compute local standard deviation as texture measure
    kernel_size = 5
    mean_local = cv2.blur(gray, (kernel_size, kernel_size))
    variance = np.mean((gray.astype(float) - mean_local.astype(float)) ** 2)
    std_dev = np.sqrt(variance)

    if std_dev < 15:
        return "smooth"
    if std_dev < 25:
        return "silk"
    if std_dev < 40:
        return "knit"
    if std_dev < 55:
        return "textured"
    return "denim"


class TryonPreprocessor:
    """Preprocesses person and garment images for virtual try-on API calls."""

    def __init__(self):
        self._pose_estimator = None

    def _get_pose_estimator(self):
        """Lazy-load MediaPipe Pose to avoid import at module level."""
        if self._pose_estimator is None:
            try:
                import mediapipe as mp
                self._pose_estimator = mp.solutions.pose.Pose(
                    static_image_mode=True,
                    model_complexity=2,
                    min_detection_confidence=0.5,
                )
            except ImportError:
                logger.warning("MediaPipe not available, using fallback pose estimation")
                self._pose_estimator = False
        return self._pose_estimator if self._pose_estimator is not False else None

    def extract_keypoints(self, image: Image.Image) -> Optional[Dict[int, Tuple[float, float, float]]]:
        """Extract body keypoints from person image using MediaPipe Pose."""
        pose = self._get_pose_estimator()
        if pose is None:
            return None

        img_array = np.array(image.convert("RGB"))
        results = pose.process(img_array)

        if not results.pose_landmarks:
            logger.warning("No pose landmarks detected in person image")
            return None

        landmarks = {}
        img_h, img_w = img_array.shape[:2]
        for idx, lm in enumerate(results.pose_landmarks.landmark):
            landmarks[idx] = (lm.x * img_w, lm.y * img_h, lm.visibility)

        return landmarks

    def generate_inpainting_mask(
        self,
        img_size: Tuple[int, int],
        keypoints: Dict[int, Tuple[float, float, float]],
        category: str,
    ) -> np.ndarray:
        """Generate inpainting mask based on garment category and body keypoints."""
        h, w = img_size
        mask = np.zeros((h, w), dtype=np.uint8)

        # Select keypoints for the garment region
        region_points = []

        if category in ("upper_body",):
            # Torso: shoulders to waist
            for idx in [SHOULDER_LEFT, SHOULDER_RIGHT, HIP_LEFT, HIP_RIGHT,
                        LEFT_WRIST, RIGHT_WRIST, NOSE]:
                if idx in keypoints and keypoints[idx][2] > 0.5:
                    region_points.append((int(keypoints[idx][0]), int(keypoints[idx][1])))
            # Add intermediate points along torso sides
            if SHOULDER_LEFT in keypoints and HIP_LEFT in keypoints:
                sl = keypoints[SHOULDER_LEFT]
                hl = keypoints[HIP_LEFT]
                for t in [0.25, 0.5, 0.75]:
                    region_points.append((int(sl[0] + t * (hl[0] - sl[0])),
                                         int(sl[1] + t * (hl[1] - sl[1]))))
            if SHOULDER_RIGHT in keypoints and HIP_RIGHT in keypoints:
                sr = keypoints[SHOULDER_RIGHT]
                hr = keypoints[HIP_RIGHT]
                for t in [0.25, 0.5, 0.75]:
                    region_points.append((int(sr[0] + t * (hr[0] - sr[0])),
                                         int(sr[1] + t * (hr[1] - sr[1]))))

        elif category == "lower_body":
            # Waist to ankles
            for idx in [HIP_LEFT, HIP_RIGHT, KNEE_LEFT, KNEE_RIGHT,
                        ANKLE_LEFT, ANKLE_RIGHT]:
                if idx in keypoints and keypoints[idx][2] > 0.5:
                    region_points.append((int(keypoints[idx][0]), int(keypoints[idx][1])))

        elif category in ("dress", "full_body"):
            # Full body below shoulders
            for idx in [SHOULDER_LEFT, SHOULDER_RIGHT, HIP_LEFT, HIP_RIGHT,
                        KNEE_LEFT, KNEE_RIGHT, ANKLE_LEFT, ANKLE_RIGHT]:
                if idx in keypoints and keypoints[idx][2] > 0.5:
                    region_points.append((int(keypoints[idx][0]), int(keypoints[idx][1])))

        if len(region_points) >= 3:
            pts = np.array(region_points, dtype=np.int32)
            hull = cv2.convexHull(pts)
            # Draw filled convex hull
            cv2.fillConvexPoly(mask, hull, 255)
            # Dilate to extend region slightly
            kernel = np.ones((15, 15), np.uint8)
            mask = cv2.dilate(mask, kernel, iterations=2)
            # Blur edges for smooth transition
            mask = cv2.GaussianBlur(mask, (21, 21), 0)

        return mask

    def analyze_alignment(
        self,
        person_keypoints: Dict[int, Tuple[float, float, float]],
        garment_img: Image.Image,
        category: str,
    ) -> AlignmentMetadata:
        """Calculate geometric alignment between person pose and garment."""
        # Calculate pose angle from shoulder keypoints
        if SHOULDER_LEFT in person_keypoints and SHOULDER_RIGHT in person_keypoints:
            sl = person_keypoints[SHOULDER_LEFT]
            sr = person_keypoints[SHOULDER_RIGHT]
            dx = sr[0] - sl[0]
            dy = sr[1] - sl[1]
            pose_angle = float(np.degrees(np.arctan2(dy, dx)))
            shoulder_width = float(np.sqrt(dx ** 2 + dy ** 2))
        else:
            pose_angle = 0.0
            shoulder_width = 200.0

        # Calculate torso height
        if SHOULDER_LEFT in person_keypoints and HIP_LEFT in person_keypoints:
            sl = person_keypoints[SHOULDER_LEFT]
            hl = person_keypoints[HIP_LEFT]
            torso_height = float(abs(hl[1] - sl[1]))
        else:
            torso_height = 300.0

        # Calculate garment scale factor
        gw, gh = garment_img.size
        aspect_ratio = gh / (gw + 1e-10)

        if category == "upper_body":
            target_height = torso_height
        elif category == "lower_body":
            target_height = torso_height * 1.5
        else:
            target_height = torso_height * 2.0

        scale_factor = target_height / (gh + 1e-10)

        # Determine pose description
        if abs(pose_angle) < 10:
            pose_description = "frontal"
        elif pose_angle < -10:
            pose_description = "slight-left"
        else:
            pose_description = "slight-right"

        return AlignmentMetadata(
            pose_angle=pose_angle,
            shoulder_width_px=shoulder_width,
            torso_height_px=torso_height,
            garment_scale_factor=scale_factor,
            offset_x=0.0,
            offset_y=0.0,
            pose_description=pose_description,
        )

    def extract_lighting(
        self,
        person_img: Image.Image,
        keypoints: Optional[Dict[int, Tuple[float, float, float]]] = None,
    ) -> LightingInfo:
        """Extract lighting conditions and skin tone from person image."""
        img_array = np.array(person_img.convert("RGB"))
        h, w = img_array.shape[:2]

        # Sample skin pixels from visible skin regions
        skin_pixels = []

        if keypoints:
            # Use face region (between ears and nose) for skin sampling
            face_points = [NOSE, LEFT_EAR, RIGHT_EAR]
            visible_points = [keypoints[i] for i in face_points if i in keypoints and keypoints[i][2] > 0.5]

            if len(visible_points) >= 2:
                cx = int(np.mean([p[0] for p in visible_points]))
                cy = int(np.mean([p[1] for p in visible_points]))
                # Sample a 40x40 region around face center
                r = 20
                x1, x2 = max(0, cx - r), min(w, cx + r)
                y1, y2 = max(0, cy - r), min(h, cy + r)
                region = img_array[y1:y2, x1:x2]
                for row in region:
                    for pixel in row:
                        if _is_skin_pixel_cielab(int(pixel[0]), int(pixel[1]), int(pixel[2])):
                            skin_pixels.append((int(pixel[0]), int(pixel[1]), int(pixel[2])))

        # Fallback: scan entire image for skin pixels
        if len(skin_pixels) < 10:
            step = 4  # subsample for speed
            for y in range(0, h, step):
                for x in range(0, w, step):
                    r, g, b = int(img_array[y, x, 0]), int(img_array[y, x, 1]), int(img_array[y, x, 2])
                    if _is_skin_pixel_cielab(r, g, b):
                        skin_pixels.append((r, g, b))

        if len(skin_pixels) < 5:
            return LightingInfo(
                average_brightness=50.0,
                color_temperature="neutral",
                skin_tone_description="neutral",
                avg_lab=(50.0, 0.0, 0.0),
            )

        # Convert to CIELAB using vectorized operation
        skin_arr = np.array(skin_pixels, dtype=np.float64)
        r_f = skin_arr[:, 0] / 255.0
        g_f = skin_arr[:, 1] / 255.0
        b_f = skin_arr[:, 2] / 255.0

        rl = np.where(r_f > 0.04045, ((r_f + 0.055) / 1.055) ** 2.4, r_f / 12.92)
        gl = np.where(g_f > 0.04045, ((g_f + 0.055) / 1.055) ** 2.4, g_f / 12.92)
        bl = np.where(b_f > 0.04045, ((b_f + 0.055) / 1.055) ** 2.4, b_f / 12.92)

        x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / _D65_XN
        y = (rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750) / _D65_YN
        z = (rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041) / _D65_ZN

        delta = 6.0 / 29.0
        fx = np.where(x > delta ** 3, x ** (1.0 / 3.0), x / (3.0 * delta * delta) + 4.0 / 29.0)
        fy = np.where(y > delta ** 3, y ** (1.0 / 3.0), y / (3.0 * delta * delta) + 4.0 / 29.0)
        fz = np.where(z > delta ** 3, z ** (1.0 / 3.0), z / (3.0 * delta * delta) + 4.0 / 29.0)

        lab_arr = np.column_stack([116.0 * fy - 16.0, 500.0 * (fx - fy), 200.0 * (fy - fz)])
        avg_l = float(np.mean(lab_arr[:, 0]))
        avg_a = float(np.mean(lab_arr[:, 1]))
        avg_b = float(np.mean(lab_arr[:, 2]))
        avg_lab = (avg_l, avg_a, avg_b)

        # Color temperature from a* axis
        if avg_a > 5:
            color_temp = "warm"
        elif avg_a < -2:
            color_temp = "cool"
        else:
            color_temp = "neutral"

        # Skin tone description from b* axis
        if avg_b > 15 and avg_a > 3:
            skin_desc = "warm-yellow"
        elif avg_b < 10 and avg_a < 2:
            skin_desc = "cool-pink"
        else:
            skin_desc = "neutral"

        return LightingInfo(
            average_brightness=avg_l,
            color_temperature=color_temp,
            skin_tone_description=skin_desc,
            avg_lab=(avg_l, avg_a, avg_b),
        )

    def extract_garment_features(self, garment_img: Image.Image) -> GarmentFeatures:
        """Extract visual features from garment image."""
        img_array = np.array(garment_img.convert("RGB"))

        # Dominant colors using k-means in CIELAB
        dominant_colors = _kmeans_colors(img_array, k=3)

        # Pattern classification using FFT
        pattern = _analyze_texture_frequency(img_array)

        # Texture descriptor
        texture = _describe_texture(img_array)

        # Formality classification
        formality = _classify_formality(dominant_colors, pattern)

        # Generate color names (simplified)
        color_names = []
        for r, g, b in dominant_colors:
            lab = _rgb_to_lab(r, g, b)
            l_val, a_val, b_val = lab
            chroma = np.sqrt(a_val ** 2 + b_val ** 2)

            if chroma < 8:
                if l_val > 80:
                    color_names.append("white")
                elif l_val > 40:
                    color_names.append("gray")
                else:
                    color_names.append("black")
            elif a_val > 10 and b_val > 10:
                if l_val > 60:
                    color_names.append("warm-light")
                else:
                    color_names.append("brown")
            elif a_val > 10:
                color_names.append("red")
            elif b_val > 15:
                color_names.append("yellow")
            elif a_val < -5:
                color_names.append("blue")
            elif b_val < -5:
                color_names.append("purple")
            else:
                color_names.append("neutral")

        return GarmentFeatures(
            dominant_colors=dominant_colors,
            color_names=color_names,
            pattern_type=pattern,
            texture_descriptor=texture,
            formality=formality,
        )

    async def analyze(
        self,
        person_image: Image.Image,
        garment_image: Image.Image,
        category: str,
    ) -> PreprocessResult:
        """Run full preprocessing pipeline on person and garment images."""
        # Step 1: Extract person keypoints
        keypoints = self.extract_keypoints(person_image)
        img_h, img_w = np.array(person_image).shape[:2]

        # Step 2: Generate inpainting mask
        mask = None
        if keypoints:
            mask = self.generate_inpainting_mask((img_h, img_w), keypoints, category)

        # Step 3: Geometric alignment
        if keypoints:
            alignment = self.analyze_alignment(keypoints, garment_image, category)
        else:
            alignment = AlignmentMetadata(
                pose_angle=0.0,
                shoulder_width_px=200.0,
                torso_height_px=300.0,
                garment_scale_factor=1.0,
                offset_x=0.0,
                offset_y=0.0,
                pose_description="frontal",
            )

        # Step 4: Lighting extraction
        lighting = self.extract_lighting(person_image, keypoints)

        # Step 5: Garment feature extraction
        garment_features = self.extract_garment_features(garment_image)

        return PreprocessResult(
            alignment=alignment,
            lighting=lighting,
            garment_features=garment_features,
            mask_region=mask,
        )
