"""
Tests for the Virtual Try-On pipeline:
  - tryon_preprocessor: RGB<->CIELAB conversion, CIEDE2000, k-means colors
  - tryon_prompt_engine: prompt generation
  - tryon_postprocessor: QualityMetrics dataclass
"""

import pytest
import numpy as np
from unittest.mock import patch, MagicMock
from dataclasses import asdict

from ml.services.tryon_preprocessor import (
    _rgb_to_lab,
    _lab_to_rgb,
    _ciede2000,
    _kmeans_colors,
    GarmentFeatures,
    AlignmentMetadata,
    LightingInfo,
    PreprocessResult,
    TryonPreprocessor,
)
from ml.services.tryon_prompt_engine import TryonPromptEngine
from ml.services.tryon_postprocessor import QualityMetrics


# ===================================================================
# _rgb_to_lab
# ===================================================================

class TestRgbToLab:
    """CIELAB conversion: boundary colors and known references."""

    def test_white_to_lab(self):
        """White (255,255,255) should yield L* close to 100."""
        l, a, b = _rgb_to_lab(255, 255, 255)
        assert abs(l - 100.0) < 1.0, f"L* for white should be ~100, got {l}"
        assert abs(a) < 1.0, f"a* for white should be ~0, got {a}"
        assert abs(b) < 1.0, f"b* for white should be ~0, got {b}"

    def test_black_to_lab(self):
        """Black (0,0,0) should yield L* close to 0."""
        l, a, b = _rgb_to_lab(0, 0, 0)
        assert abs(l) < 1.0, f"L* for black should be ~0, got {l}"
        assert abs(a) < 1.0
        assert abs(b) < 1.0

    def test_mid_gray(self):
        """Mid gray (128,128,128): L* should be around 53-54."""
        l, _, _ = _rgb_to_lab(128, 128, 128)
        assert 50 < l < 60, f"Mid gray L* should be ~53, got {l}"

    def test_red_has_positive_a(self):
        """Pure red should have positive a* (red-green axis)."""
        l, a, b = _rgb_to_lab(255, 0, 0)
        assert a > 30, f"Red a* should be strongly positive, got {a}"

    def test_green_has_negative_a(self):
        """Pure green should have negative a*."""
        l, a, b = _rgb_to_lab(0, 255, 0)
        assert a < -20, f"Green a* should be negative, got {a}"


# ===================================================================
# RGB <-> LAB roundtrip
# ===================================================================

class TestLabRoundtrip:
    """_lab_to_rgb(_rgb_to_lab(r,g,b)) should approximately recover (r,g,b)."""

    @pytest.mark.parametrize("r,g,b", [
        (255, 255, 255),
        (0, 0, 0),
        (128, 128, 128),
        (200, 50, 50),
        (50, 200, 50),
        (50, 50, 200),
        (30, 90, 180),
    ])
    def test_roundtrip(self, r, g, b):
        lab = _rgb_to_lab(r, g, b)
        r2, g2, b2 = _lab_to_rgb(*lab)
        assert abs(r2 - r) <= 2, f"R mismatch: {r} -> {r2}"
        assert abs(g2 - g) <= 2, f"G mismatch: {g} -> {g2}"
        assert abs(b2 - b) <= 2, f"B mismatch: {b} -> {b2}"


# ===================================================================
# CIEDE2000
# ===================================================================

class TestCiede2000:
    """CIEDE2000 color difference metric."""

    def test_same_color_zero_distance(self):
        """Identical colors should yield zero distance."""
        lab = (50.0, 20.0, -30.0)
        assert _ciede2000(lab, lab) == pytest.approx(0.0, abs=1e-6)

    def test_same_color_various(self):
        """Multiple same-color pairs should all yield zero."""
        pairs = [
            (0.0, 0.0, 0.0),
            (100.0, 0.0, 0.0),
            (50.0, -40.0, 40.0),
            (73.0, 25.0, -18.0),
        ]
        for lab in pairs:
            assert _ciede2000(lab, lab) == pytest.approx(0.0, abs=1e-6)

    def test_black_vs_white_large_distance(self):
        """Black vs white should have a large DeltaE."""
        black = _rgb_to_lab(0, 0, 0)
        white = _rgb_to_lab(255, 255, 255)
        de = _ciede2000(black, white)
        assert de > 50, f"Black-white DeltaE should be large, got {de}"

    def test_ordering_similar_vs_distant(self):
        """Similar colors should have smaller DeltaE than very different ones."""
        lab_base = _rgb_to_lab(128, 128, 128)
        lab_close = _rgb_to_lab(130, 128, 128)
        lab_far = _rgb_to_lab(255, 0, 0)
        de_close = _ciede2000(lab_base, lab_close)
        de_far = _ciede2000(lab_base, lab_far)
        assert de_close < de_far

    def test_non_negative(self):
        """DeltaE should never be negative (perceptual distance)."""
        lab1 = _rgb_to_lab(100, 150, 200)
        lab2 = _rgb_to_lab(10, 50, 90)
        assert _ciede2000(lab1, lab2) >= 0

    def test_symmetry(self):
        """DeltaE(a,b) should approximately equal DeltaE(b,a)."""
        lab1 = _rgb_to_lab(120, 60, 200)
        lab2 = _rgb_to_lab(40, 180, 80)
        de12 = _ciede2000(lab1, lab2)
        de21 = _ciede2000(lab2, lab1)
        # CIEDE2000 is not perfectly symmetric due to rotation term,
        # but they should be very close
        assert abs(de12 - de21) < 0.5


# ===================================================================
# TryonPromptEngine
# ===================================================================

class TestTryonPromptEngine:
    """Prompt engine should generate non-empty, well-structured prompts."""

    def _make_preprocess_result(self, **overrides):
        """Build a minimal PreprocessResult for testing."""
        garment = overrides.get(
            "garment_features",
            GarmentFeatures(
                dominant_colors=[(0, 0, 0)],
                color_names=["black"],
                pattern_type="solid",
                texture_descriptor="smooth",
                formality="formal",
            ),
        )
        alignment = overrides.get(
            "alignment",
            AlignmentMetadata(
                pose_angle=0.0,
                shoulder_width_px=200.0,
                torso_height_px=300.0,
                garment_scale_factor=1.0,
                offset_x=0.0,
                offset_y=0.0,
                pose_description="frontal",
            ),
        )
        lighting = overrides.get(
            "lighting",
            LightingInfo(
                average_brightness=60.0,
                color_temperature="neutral",
                skin_tone_description="neutral",
                avg_lab=(60.0, 5.0, 10.0),
            ),
        )
        return PreprocessResult(
            alignment=alignment,
            lighting=lighting,
            garment_features=garment,
        )

    def test_generate_returns_nonempty_string(self):
        engine = TryonPromptEngine()
        result = engine.generate(self._make_preprocess_result(), "upper_body")
        assert isinstance(result, str)
        assert len(result) > 0

    def test_generate_contains_category(self):
        engine = TryonPromptEngine()
        prompt = engine.generate(self._make_preprocess_result(), "upper_body")
        assert "上装" in prompt

    def test_generate_with_user_prompt(self):
        engine = TryonPromptEngine()
        result = engine.generate(
            self._make_preprocess_result(),
            "upper_body",
            user_prompt="A very detailed custom prompt that exceeds twenty characters in length",
        )
        assert isinstance(result, str)
        assert len(result) > 0

    def test_generate_for_glm(self):
        engine = TryonPromptEngine()
        prompt = engine.generate_for_glm(
            self._make_preprocess_result(), "dress"
        )
        assert "连衣裙" in prompt
        assert len(prompt) > 0

    def test_pose_variation(self):
        engine = TryonPromptEngine()
        alignment = AlignmentMetadata(
            pose_angle=-15.0,
            shoulder_width_px=200.0,
            torso_height_px=300.0,
            garment_scale_factor=1.0,
            offset_x=0.0,
            offset_y=0.0,
            pose_description="slight-left",
        )
        result = engine.generate(
            self._make_preprocess_result(alignment=alignment),
            "upper_body",
        )
        assert "微微侧身向左" in result


# ===================================================================
# QualityMetrics dataclass
# ===================================================================

class TestQualityMetrics:
    """QualityMetrics construction and serialization."""

    def test_construction(self):
        qm = QualityMetrics(
            proportion_score=0.9,
            proportion_passed=True,
            color_score=0.8,
            color_passed=True,
            color_delta_e=5.0,
            face_ssim=0.95,
            face_passed=True,
            overall_score=0.88,
            overall_passed=True,
        )
        assert qm.proportion_score == 0.9
        assert qm.color_passed is True
        assert qm.overall_passed is True

    def test_to_dict(self):
        qm = QualityMetrics(
            proportion_score=0.9123,
            proportion_passed=True,
            color_score=0.8456,
            color_passed=False,
            color_delta_e=18.789,
            face_ssim=0.9501,
            face_passed=True,
            overall_score=0.8822,
            overall_passed=True,
            details={"color": "COLOR SHIFT DETECTED"},
        )
        d = qm.to_dict()
        assert isinstance(d, dict)
        assert d["proportion_score"] == 0.9123  # rounded to 4 decimals
        assert d["color_passed"] is False
        assert d["color_delta_e"] == 18.79  # rounded to 2 decimals
        assert "color" in d["details"]

    def test_to_dict_rounding(self):
        qm = QualityMetrics(
            proportion_score=0.123456,
            proportion_passed=True,
            color_score=0.654321,
            color_passed=True,
            color_delta_e=12.3456,
            face_ssim=0.987654,
            face_passed=True,
            overall_score=0.777777,
            overall_passed=False,
        )
        d = qm.to_dict()
        # Scores rounded to 4 decimal places
        assert d["proportion_score"] == 0.1235
        assert d["color_score"] == 0.6543
        assert d["face_ssim"] == 0.9877
        assert d["overall_score"] == 0.7778
        # Delta E rounded to 2 decimal places
        assert d["color_delta_e"] == 12.35


# ===================================================================
# _kmeans_colors
# ===================================================================

class TestKmeansColors:
    """K-means color extraction in CIELAB space."""

    def test_returns_correct_number_of_clusters(self):
        """Should return exactly k dominant colors."""
        np.random.seed(0)
        # 3 distinct color clusters
        img = np.zeros((100, 100, 3), dtype=np.uint8)
        img[:33, :, :] = [200, 50, 50]    # reddish
        img[33:66, :, :] = [50, 200, 50]  # greenish
        img[66:, :, :] = [50, 50, 200]    # bluish
        colors = _kmeans_colors(img, k=3)
        assert len(colors) == 3
        for c in colors:
            assert len(c) == 3  # (r, g, b)

    def test_k1_returns_one_color(self):
        np.random.seed(1)
        img = np.random.randint(0, 255, (50, 50, 3), dtype=np.uint8)
        colors = _kmeans_colors(img, k=1)
        assert len(colors) == 1

    @pytest.mark.xfail(
        reason="Known bug: k-means++ init produces all-zero probabilities when "
               "all pixels are identical, causing np.random.choice to fail. "
               "The max(dist_sq.sum(), 1e-10) guard prevents division-by-zero but "
               "does not handle the all-zero probabilities case.",
        strict=True,
        raises=ValueError,
    )
    def test_uniform_color_image(self):
        """When the entire image is one color, k-means should converge to it.

        This currently fails due to a bug in _kmeans_colors: when all pixels
        are identical, all CIEDE2000 distances are zero, so the k-means++
        probability distribution is all zeros. np.random.choice then raises
        ValueError("probabilities do not sum to 1").
        """
        np.random.seed(42)
        img = np.full((60, 60, 3), [128, 64, 200], dtype=np.uint8)
        colors = _kmeans_colors(img, k=3)
        assert len(colors) == 3
        for r, g, b in colors:
            assert abs(r - 128) < 10, f"R={r} far from 128"
            assert abs(g - 64) < 10, f"G={g} far from 64"
            assert abs(b - 200) < 10, f"B={b} far from 200"

    @pytest.mark.xfail(
        reason="Known bug: k-means++ init produces all-zero probabilities when "
               "all pixels are identical, causing np.random.choice to fail.",
        strict=True,
        raises=ValueError,
    )
    def test_kmeans_pp_no_division_by_zero_same_color(self):
        """K-means++ init with all-same-color image should not crash.

        Currently crashes because the probability array is all zeros after
        all distances are zero, and np.random.choice rejects that.
        The max(dist_sq.sum(), 1e-10) guard only prevents division-by-zero,
        not the all-zero-probability case.
        """
        np.random.seed(7)
        img = np.full((30, 30, 3), [100, 100, 100], dtype=np.uint8)
        colors = _kmeans_colors(img, k=2)
        assert len(colors) == 2

    def test_output_values_in_range(self):
        """Returned RGB values should be in [0, 255]."""
        np.random.seed(99)
        img = np.random.randint(0, 255, (50, 50, 3), dtype=np.uint8)
        colors = _kmeans_colors(img, k=5)
        for r, g, b in colors:
            assert 0 <= r <= 255
            assert 0 <= g <= 255
            assert 0 <= b <= 255


# ===================================================================
# TryonPreprocessor (unit tests with mocked external deps)
# ===================================================================

class TestTryonPreprocessor:
    """Test preprocessor methods that do not depend on MediaPipe or real images."""

    def test_analyze_alignment_frontal(self):
        preprocessor = TryonPreprocessor()
        keypoints = {
            11: (100.0, 50.0, 0.9),  # left shoulder
            12: (300.0, 50.0, 0.9),  # right shoulder
            23: (150.0, 350.0, 0.8), # left hip
        }
        mock_garment = MagicMock()
        mock_garment.size = (200, 400)
        alignment = preprocessor.analyze_alignment(keypoints, mock_garment, "upper_body")
        assert alignment.pose_description == "frontal"
        assert abs(alignment.pose_angle) < 10
        assert alignment.shoulder_width_px > 0

    def test_analyze_alignment_slight_right(self):
        preprocessor = TryonPreprocessor()
        # Tilted shoulders: right shoulder lower (higher y) to get pose_angle > 10
        # dx=200, dy=60 => atan2(60,200) ~ 16.7 degrees > 10 => "slight-right"
        keypoints = {
            11: (100.0, 40.0, 0.9),
            12: (300.0, 100.0, 0.9),
            23: (150.0, 350.0, 0.8),
        }
        mock_garment = MagicMock()
        mock_garment.size = (200, 400)
        alignment = preprocessor.analyze_alignment(keypoints, mock_garment, "upper_body")
        assert alignment.pose_description == "slight-right"

    @patch.object(TryonPreprocessor, "_get_pose_estimator", return_value=None)
    def test_extract_keypoints_no_mediapipe(self, mock_pose):
        preprocessor = TryonPreprocessor()
        mock_img = MagicMock()
        result = preprocessor.extract_keypoints(mock_img)
        assert result is None

    def test_generate_inpainting_mask_too_few_keypoints(self):
        preprocessor = TryonPreprocessor()
        # Only one keypoint -> fewer than 3 region_points -> mask stays all zeros
        keypoints = {11: (100.0, 100.0, 0.9)}
        mask = preprocessor.generate_inpainting_mask((400, 300), keypoints, "upper_body")
        assert mask is not None
        assert mask.shape == (400, 300)
        # With fewer than 3 visible points, convex hull is not drawn
        assert mask.max() == 0

    def test_generate_inpainting_mask_upper_body(self):
        preprocessor = TryonPreprocessor()
        keypoints = {
            11: (100.0, 50.0, 0.9),
            12: (300.0, 50.0, 0.9),
            23: (120.0, 350.0, 0.8),
            24: (280.0, 350.0, 0.8),
            0: (200.0, 30.0, 0.9),
            15: (80.0, 250.0, 0.7),
            16: (320.0, 250.0, 0.7),
        }
        mask = preprocessor.generate_inpainting_mask((500, 400), keypoints, "upper_body")
        assert mask.shape == (500, 400)
        # Mask should have some non-zero values (torso region drawn)
        assert mask.max() > 0