"""
Virtual Try-On Postprocessing Module
Quality validation pipeline: proportion check, CIEDE2000 color verification,
SSIM face preservation, and overall quality scoring.

Author: XunO ML Team
Version: 1.0.0
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Dict, Optional, Tuple

import numpy as np
from PIL import Image

# P0-5: Import unified color utilities instead of transitive duplicates
from ml.services.analysis.color_utils import (
    rgb_to_lab as _rgb_to_lab,
    delta_e_ciede2000 as _ciede2000,
    is_skin_pixel_cielab as _is_skin_pixel_cielab,
    rgb_to_lab_batch,
)
from ml.services.tryon.tryon_preprocessor import (
    TryonPreprocessor,
    PreprocessResult,
)

logger = logging.getLogger(__name__)

# Quality thresholds
_PROPORTION_DEFORM_THRESHOLD = 0.10  # 10% deformation allowed
_COLOR_DELTA_E_THRESHOLD = 15.0  # CIEDE2000 threshold for color shift
_FACE_SSIM_THRESHOLD = 0.85  # SSIM threshold for face preservation
_OVERALL_QUALITY_THRESHOLD = 0.70  # Below this triggers retry


@dataclass
class QualityMetrics:
    proportion_score: float
    proportion_passed: bool
    color_score: float
    color_passed: bool
    color_delta_e: float
    face_ssim: float
    face_passed: bool
    overall_score: float
    overall_passed: bool
    details: Dict[str, str] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, object]:
        return {
            "proportion_score": round(self.proportion_score, 4),
            "proportion_passed": self.proportion_passed,
            "color_score": round(self.color_score, 4),
            "color_passed": self.color_passed,
            "color_delta_e": round(self.color_delta_e, 2),
            "face_ssim": round(self.face_ssim, 4),
            "face_passed": self.face_passed,
            "overall_score": round(self.overall_score, 4),
            "overall_passed": self.overall_passed,
            "details": self.details,
        }


def _compute_ssim(img1: np.ndarray, img2: np.ndarray) -> float:
    """Compute Structural Similarity Index between two image regions.

    Uses the standard SSIM formula with luminance, contrast, and structure comparisons.
    """
    if img1.shape != img2.shape:
        # Resize to match
        h, w = img1.shape[:2]
        img2 = np.array(Image.fromarray(img2).resize((w, h), Image.BILINEAR))

    # Convert to float
    a = img1.astype(np.float64)
    b = img2.astype(np.float64)

    # SSIM constants
    c1 = (0.01 * 255) ** 2
    c2 = (0.03 * 255) ** 2

    mu_a = _uniform_filter(a)
    mu_b = _uniform_filter(b)

    mu_a_sq = mu_a ** 2
    mu_b_sq = mu_b ** 2
    mu_ab = mu_a * mu_b

    sigma_a_sq = _uniform_filter(a ** 2) - mu_a_sq
    sigma_b_sq = _uniform_filter(b ** 2) - mu_b_sq
    sigma_ab = _uniform_filter(a * b) - mu_ab

    numerator = (2.0 * mu_ab + c1) * (2.0 * sigma_ab + c2)
    denominator = (mu_a_sq + mu_b_sq + c1) * (sigma_a_sq + sigma_b_sq + c2)

    ssim_map = numerator / (denominator + 1e-10)
    return float(np.mean(ssim_map))


def _uniform_filter(img: np.ndarray, size: int = 7) -> np.ndarray:
    """Simple box filter (uniform average) for SSIM computation."""
    kernel = np.ones((size, size)) / (size * size)
    if img.ndim == 3:
        result = np.zeros_like(img)
        for c in range(img.shape[2]):
            result[:, :, c] = _convolve2d(img[:, :, c], kernel)
        return result
    return _convolve2d(img, kernel)


def _convolve2d(img: np.ndarray, kernel: np.ndarray) -> np.ndarray:
    """Simple 2D convolution without scipy dependency."""
    kh, kw = kernel.shape
    ph, pw = kh // 2, kw // 2
    padded = np.pad(img, ((ph, ph), (pw, pw)), mode="reflect")
    h, w = img.shape
    result = np.zeros_like(img, dtype=np.float64)
    for i in range(kh):
        for j in range(kw):
            result += padded[i:i + h, j:j + w] * kernel[i, j]
    return result


def _extract_face_region(
    img_array: np.ndarray,
    keypoints: Optional[Dict[int, Tuple[float, float, float]]] = None,
) -> Optional[np.ndarray]:
    """Extract face region from image using keypoints or fallback heuristic."""
    h, w = img_array.shape[:2]

    if keypoints:
        # Use ear and nose positions to estimate face bounding box
        nose = keypoints.get(0)  # NOSE
        left_ear = keypoints.get(7)  # LEFT_EAR
        right_ear = keypoints.get(8)  # RIGHT_EAR

        if nose and (left_ear or right_ear):
            cx, cy = int(nose[0]), int(nose[1])

            # Estimate face width from ear positions
            if left_ear and right_ear:
                face_w = int(abs(right_ear[0] - left_ear[0]) * 1.3)
            else:
                face_w = int(w * 0.15)

            face_h = int(face_w * 1.2)

            x1 = max(0, cx - face_w // 2)
            x2 = min(w, cx + face_w // 2)
            y1 = max(0, cy - int(face_h * 0.7))
            y2 = min(h, cy + int(face_h * 0.3))

            return img_array[y1:y2, x1:x2]

    # Fallback: assume face is in upper-center 30% of image
    face_region = img_array[:int(h * 0.3), int(w * 0.25):int(w * 0.75)]
    return face_region if face_region.size > 0 else None


def _extract_dominant_color_lab(img_region: np.ndarray) -> Optional[Tuple[float, float, float]]:
    """Extract dominant color in CIELAB from an image region (skin pixels only)."""
    skin_labs = []
    step = 3
    for y in range(0, img_region.shape[0], step):
        for x in range(0, img_region.shape[1], step):
            r, g, b = int(img_region[y, x, 0]), int(img_region[y, x, 1]), int(img_region[y, x, 2])
            if _is_skin_pixel_cielab(r, g, b):
                skin_labs.append(_rgb_to_lab(r, g, b))

    if len(skin_labs) < 5:
        return None

    # Return median
    l_median = float(np.median([v[0] for v in skin_labs]))
    a_median = float(np.median([v[1] for v in skin_labs]))
    b_median = float(np.median([v[2] for v in skin_labs]))
    return (l_median, a_median, b_median)


def _extract_garment_colors_lab(
    img_array: np.ndarray,
    mask: Optional[np.ndarray] = None,
    n_colors: int = 3,
) -> list[Tuple[float, float, float]]:
    """Extract garment region colors in CIELAB."""
    if mask is not None:
        # Use mask to isolate garment region
        masked = img_array.copy()
        mask_bool = mask > 128
        pixels = img_array[mask_bool]
    else:
        # Use center region as garment proxy
        h, w = img_array.shape[:2]
        pixels = img_array[h // 4:3 * h // 4, w // 4:3 * w // 4].reshape(-1, 3)

    if len(pixels) < 10:
        return []

    # Subsample
    if len(pixels) > 3000:
        indices = np.random.choice(len(pixels), 3000, replace=False)
        pixels = pixels[indices]

    # Convert to CIELAB using unified batch function
    lab_pixels = rgb_to_lab_batch(pixels.astype(np.float64))

    # k-means using Euclidean distance in CIELAB (fast approximation)
    k = min(n_colors, len(lab_pixels))
    if k == 0:
        return []

    indices = np.random.choice(len(lab_pixels), k, replace=False)
    centroids = lab_pixels[indices].copy()

    for _ in range(8):
        diff = lab_pixels[:, None, :] - centroids[None, :, :]
        distances = np.sqrt(np.sum(diff ** 2, axis=2))
        assignments = np.argmin(distances, axis=1)
        for j in range(k):
            mask_j = assignments == j
            if mask_j.sum() > 0:
                centroids[j] = lab_pixels[mask_j].mean(axis=0)

    return [tuple(c) for c in centroids]


class TryonPostprocessor:
    """Validates virtual try-on results with quality metrics."""

    def __init__(self):
        self.preprocessor = TryonPreprocessor()

    def check_proportion(
        self,
        original_keypoints: Optional[Dict[int, Tuple[float, float, float]]],
        result_img: Image.Image,
    ) -> Tuple[float, bool]:
        """Check if body proportions are preserved in the result image.

        Returns (score, passed) where score is 1.0 = perfect preservation.
        """
        if original_keypoints is None:
            return (1.0, True)

        result_keypoints = self.preprocessor.extract_keypoints(result_img)
        if result_keypoints is None:
            return (0.5, True)  # Can't verify, assume ok

        deformations = []

        # Check shoulder width ratio
        orig_shoulder = None
        if 11 in original_keypoints and 12 in original_keypoints:
            sl, sr = original_keypoints[11], original_keypoints[12]
            orig_shoulder = abs(sr[0] - sl[0])

        res_shoulder = None
        if 11 in result_keypoints and 12 in result_keypoints:
            sl, sr = result_keypoints[11], result_keypoints[12]
            res_shoulder = abs(sr[0] - sl[0])

        if orig_shoulder and res_shoulder and orig_shoulder > 0:
            shoulder_ratio = res_shoulder / orig_shoulder
            shoulder_deform = abs(1.0 - shoulder_ratio)
            deformations.append(shoulder_deform)

        # Check torso height ratio (shoulder to hip)
        orig_torso = None
        if 11 in original_keypoints and 23 in original_keypoints:
            orig_torso = abs(original_keypoints[23][1] - original_keypoints[11][1])

        res_torso = None
        if 11 in result_keypoints and 23 in result_keypoints:
            res_torso = abs(result_keypoints[23][1] - result_keypoints[11][1])

        if orig_torso and res_torso and orig_torso > 0:
            torso_ratio = res_torso / orig_torso
            torso_deform = abs(1.0 - torso_ratio)
            deformations.append(torso_deform)

        if not deformations:
            return (1.0, True)

        avg_deform = float(np.mean(deformations))
        score = max(0.0, 1.0 - avg_deform)
        passed = avg_deform < _PROPORTION_DEFORM_THRESHOLD

        return (score, passed)

    def check_color_consistency(
        self,
        original_garment_img: Image.Image,
        result_img: Image.Image,
        preprocess: PreprocessResult,
    ) -> Tuple[float, float, bool]:
        """Check color consistency between original garment and result.

        Returns (score, delta_e, passed).
        """
        orig_array = np.array(original_garment_img.convert("RGB"))
        res_array = np.array(result_img.convert("RGB"))

        # Extract colors from both
        orig_colors = _extract_garment_colors_lab(orig_array, n_colors=3)
        res_colors = _extract_garment_colors_lab(res_array, preprocess.mask_region, n_colors=3)

        if not orig_colors or not res_colors:
            return (1.0, 0.0, True)  # Can't verify, assume ok

        # Find minimum CIEDE2000 distance for each original color
        min_distances = []
        for oc in orig_colors:
            distances = [_ciede2000(oc, rc) for rc in res_colors]
            min_distances.append(min(distances))

        avg_delta_e = float(np.mean(min_distances))
        score = max(0.0, 1.0 - avg_delta_e / 50.0)
        passed = avg_delta_e < _COLOR_DELTA_E_THRESHOLD

        return (score, avg_delta_e, passed)

    def check_face_preservation(
        self,
        original_img: Image.Image,
        result_img: Image.Image,
        original_keypoints: Optional[Dict[int, Tuple[float, float, float]]] = None,
    ) -> Tuple[float, bool]:
        """Check face region preservation using SSIM.

        Returns (ssim_score, passed).
        """
        orig_array = np.array(original_img.convert("RGB"))
        res_array = np.array(result_img.convert("RGB"))

        # Extract face regions
        orig_face = _extract_face_region(orig_array, original_keypoints)

        # For result image, we don't have keypoints yet - use same region
        if orig_face is not None:
            h, w = orig_array.shape[:2]
            rh, rw = res_array.shape[:2]

            # Scale coordinates if sizes differ
            if rh != h or rw != w:
                result_resized = np.array(
                    Image.fromarray(res_array).resize((w, h), Image.BILINEAR)
                )
            else:
                result_resized = res_array

            # Use same face region extraction
            res_face = _extract_face_region(result_resized, original_keypoints)

            if orig_face is not None and res_face is not None and orig_face.size > 0 and res_face.size > 0:
                # Resize to same dimensions for SSIM
                oh, ow = orig_face.shape[:2]
                if res_face.shape[0] != oh or res_face.shape[1] != ow:
                    res_face = np.array(
                        Image.fromarray(res_face).resize((ow, oh), Image.BILINEAR)
                    )

                ssim_val = _compute_ssim(orig_face, res_face)
                passed = ssim_val >= _FACE_SSIM_THRESHOLD
                return (ssim_val, passed)

        return (1.0, True)  # Can't verify, assume ok

    async def validate(
        self,
        original_person: Image.Image,
        original_garment: Image.Image,
        result_image: Image.Image,
        preprocess: PreprocessResult,
    ) -> QualityMetrics:
        """Run full quality validation pipeline on try-on result.

        Args:
            original_person: Original person image.
            original_garment: Original garment image.
            result_image: Result image from the try-on API.
            preprocess: Preprocessing results (contains keypoints and mask).

        Returns:
            QualityMetrics with all scores and pass/fail status.
        """
        details = {}

        # Extract keypoints from original (reuse if available)
        original_keypoints = self.preprocessor.extract_keypoints(original_person)

        # Step 1: Proportion check
        proportion_score, proportion_passed = self.check_proportion(
            original_keypoints, result_image
        )
        details["proportion"] = (
            f"Body proportion score: {proportion_score:.2f}, "
            f"{'passed' if proportion_passed else 'DEFORMATION DETECTED'}"
        )

        # Step 2: Color consistency
        color_score, delta_e, color_passed = self.check_color_consistency(
            original_garment, result_image, preprocess
        )
        details["color"] = (
            f"Color DeltaE: {delta_e:.2f} (threshold: {_COLOR_DELTA_E_THRESHOLD}), "
            f"{'passed' if color_passed else 'COLOR SHIFT DETECTED'}"
        )

        # Step 3: Face preservation
        face_ssim, face_passed = self.check_face_preservation(
            original_person, result_image, original_keypoints
        )
        details["face"] = (
            f"Face SSIM: {face_ssim:.4f} (threshold: {_FACE_SSIM_THRESHOLD}), "
            f"{'passed' if face_passed else 'FACE DISTORTION DETECTED'}"
        )

        # Step 4: Overall quality score (weighted combination)
        overall_score = (
            proportion_score * 0.3
            + color_score * 0.3
            + face_ssim * 0.4
        )
        overall_passed = overall_score >= _OVERALL_QUALITY_THRESHOLD

        details["overall"] = (
            f"Overall quality: {overall_score:.4f}, "
            f"{'PASSED' if overall_passed else 'BELOW THRESHOLD - retry recommended'}"
        )

        logger.info("Try-on quality metrics: %s", details)

        return QualityMetrics(
            proportion_score=proportion_score,
            proportion_passed=proportion_passed,
            color_score=color_score,
            color_passed=color_passed,
            color_delta_e=delta_e,
            face_ssim=face_ssim,
            face_passed=face_passed,
            overall_score=overall_score,
            overall_passed=overall_passed,
            details=details,
        )
