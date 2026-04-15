from __future__ import annotations

import json
import math
import unittest
from pathlib import Path
from typing import Any, Dict, List

from ml.services.common.reference_line_generator import (
    AlignmentResult,
    AlignmentStatus,
    CenteringStatus,
    ContourLine,
    FacingStatus,
    GuideData,
    LineSegment,
    LineType,
    check_alignment,
    generate_guide,
)


def _make_landmark(x: float, y: float, z: float = 0.0, visibility: float = 1.0) -> Dict[str, Any]:
    return {"x": x, "y": y, "z": z, "visibility": visibility, "name": ""}


def _make_perfect_landmarks() -> List[Dict[str, Any]]:
    landmarks = [{} for _ in range(33)]
    landmarks[0] = _make_landmark(0.5, 0.15, 0.0, 1.0)
    landmarks[11] = _make_landmark(0.35, 0.30, 0.0, 1.0)
    landmarks[12] = _make_landmark(0.65, 0.30, 0.0, 1.0)
    landmarks[13] = _make_landmark(0.25, 0.50, 0.0, 1.0)
    landmarks[14] = _make_landmark(0.75, 0.50, 0.0, 1.0)
    landmarks[15] = _make_landmark(0.20, 0.70, 0.0, 1.0)
    landmarks[16] = _make_landmark(0.80, 0.70, 0.0, 1.0)
    landmarks[23] = _make_landmark(0.40, 0.60, 0.0, 1.0)
    landmarks[24] = _make_landmark(0.60, 0.60, 0.0, 1.0)
    landmarks[25] = _make_landmark(0.42, 0.78, 0.0, 1.0)
    landmarks[26] = _make_landmark(0.58, 0.78, 0.0, 1.0)
    landmarks[27] = _make_landmark(0.43, 0.95, 0.0, 1.0)
    landmarks[28] = _make_landmark(0.57, 0.95, 0.0, 1.0)
    return landmarks


def _make_tilted_landmarks() -> List[Dict[str, Any]]:
    landmarks = _make_perfect_landmarks()
    landmarks[11] = _make_landmark(0.35, 0.28, 0.0, 1.0)
    landmarks[12] = _make_landmark(0.65, 0.33, 0.0, 1.0)
    return landmarks


def _make_off_center_landmarks() -> List[Dict[str, Any]]:
    landmarks = _make_perfect_landmarks()
    landmarks[11] = _make_landmark(0.25, 0.30, 0.0, 1.0)
    landmarks[12] = _make_landmark(0.55, 0.30, 0.0, 1.0)
    landmarks[23] = _make_landmark(0.30, 0.60, 0.0, 1.0)
    landmarks[24] = _make_landmark(0.60, 0.60, 0.0, 1.0)
    return landmarks


def _make_facing_left_landmarks() -> List[Dict[str, Any]]:
    landmarks = _make_perfect_landmarks()
    landmarks[11] = _make_landmark(0.35, 0.30, 0.15, 1.0)
    landmarks[12] = _make_landmark(0.65, 0.30, -0.05, 1.0)
    return landmarks


def _make_low_visibility_landmarks() -> List[Dict[str, Any]]:
    landmarks = _make_perfect_landmarks()
    landmarks[11] = _make_landmark(0.35, 0.30, 0.0, 0.3)
    landmarks[12] = _make_landmark(0.65, 0.30, 0.0, 0.3)
    return landmarks


class TestCheckAlignmentPerfect(unittest.TestCase):
    def setUp(self):
        self.landmarks = _make_perfect_landmarks()
        self.result = check_alignment(self.landmarks)

    def test_shoulder_good(self):
        self.assertEqual(self.result.shoulder_alignment, AlignmentStatus.GOOD)

    def test_body_centered(self):
        self.assertEqual(self.result.body_centering, CenteringStatus.CENTERED)

    def test_facing_front(self):
        self.assertEqual(self.result.facing_direction, FacingStatus.FRONT)

    def test_has_suggestions(self):
        self.assertIsInstance(self.result.suggestions, list)
        self.assertGreater(len(self.result.suggestions), 0)


class TestCheckAlignmentTilted(unittest.TestCase):
    def setUp(self):
        self.landmarks = _make_tilted_landmarks()
        self.result = check_alignment(self.landmarks)

    def test_shoulder_not_good(self):
        self.assertNotEqual(self.result.shoulder_alignment, AlignmentStatus.GOOD)

    def test_has_tilt_suggestion(self):
        suggestions_text = " ".join(self.result.suggestions)
        self.assertTrue("�? in suggestions_text or "调整" in suggestions_text)


class TestCheckAlignmentOffCenter(unittest.TestCase):
    def setUp(self):
        self.landmarks = _make_off_center_landmarks()
        self.result = check_alignment(self.landmarks)

    def test_body_not_centered(self):
        self.assertNotEqual(self.result.body_centering, CenteringStatus.CENTERED)

    def test_has_centering_suggestion(self):
        suggestions_text = " ".join(self.result.suggestions)
        self.assertTrue("移动" in suggestions_text or "�? in suggestions_text)


class TestCheckAlignmentFacingLeft(unittest.TestCase):
    def setUp(self):
        self.landmarks = _make_facing_left_landmarks()
        self.result = check_alignment(self.landmarks)

    def test_facing_not_front(self):
        self.assertNotEqual(self.result.facing_direction, FacingStatus.FRONT)

    def test_has_facing_suggestion(self):
        suggestions_text = " ".join(self.result.suggestions)
        self.assertTrue("正面" in suggestions_text or "朝向" in suggestions_text)


class TestCheckAlignmentLowVisibility(unittest.TestCase):
    def test_low_visibility_keypoints_ignored(self):
        landmarks = _make_low_visibility_landmarks()
        result = check_alignment(landmarks)
        self.assertIsInstance(result, AlignmentResult)


class TestGenerateGuidePerfect(unittest.TestCase):
    def setUp(self):
        self.landmarks = _make_perfect_landmarks()
        self.guide = generate_guide(self.landmarks)

    def test_returns_guide_data(self):
        self.assertIsInstance(self.guide, GuideData)

    def test_has_shoulder_line(self):
        types = [l["type"] for l in self.guide.lines]
        self.assertIn("shoulder", types)

    def test_has_waist_line(self):
        types = [l["type"] for l in self.guide.lines]
        self.assertIn("waist", types)

    def test_has_center_line(self):
        types = [l["type"] for l in self.guide.lines]
        self.assertIn("center", types)

    def test_has_contours(self):
        self.assertGreater(len(self.guide.contours), 0)

    def test_has_text_prompts(self):
        self.assertGreater(len(self.guide.text_prompts), 0)

    def test_has_alignment(self):
        self.assertIsInstance(self.guide.alignment, AlignmentResult)


class TestGenerateGuideLineSegments(unittest.TestCase):
    def setUp(self):
        self.landmarks = _make_perfect_landmarks()
        self.guide = generate_guide(self.landmarks)

    def test_line_has_required_fields(self):
        for line in self.guide.lines:
            self.assertIn("type", line)
            self.assertIn("start", line)
            self.assertIn("end", line)
            self.assertIn("color", line)
            self.assertIn("width", line)

    def test_line_start_end_have_xy(self):
        for line in self.guide.lines:
            self.assertIn("x", line["start"])
            self.assertIn("y", line["start"])
            self.assertIn("x", line["end"])
            self.assertIn("y", line["end"])

    def test_line_color_is_hex(self):
        for line in self.guide.lines:
            self.assertRegex(line["color"], r"^#[0-9A-Fa-f]{6}$")

    def test_line_width_positive(self):
        for line in self.guide.lines:
            self.assertGreater(line["width"], 0)


class TestGenerateGuideContours(unittest.TestCase):
    def setUp(self):
        self.landmarks = _make_perfect_landmarks()
        self.guide = generate_guide(self.landmarks)

    def test_contour_has_required_fields(self):
        for contour in self.guide.contours:
            self.assertIn("type", contour)
            self.assertIn("points", contour)
            self.assertIn("color", contour)
            self.assertIn("width", contour)

    def test_contour_points_have_xy(self):
        for contour in self.guide.contours:
            for pt in contour["points"]:
                self.assertIn("x", pt)
                self.assertIn("y", pt)

    def test_torso_contour_is_closed(self):
        torso_contours = [
            c for c in self.guide.contours
            if len(c["points"]) == 5
        ]
        if torso_contours:
            tc = torso_contours[0]
            self.assertEqual(tc["points"][0], tc["points"][-1])


class TestGuideDataToJson(unittest.TestCase):
    def test_to_dict_json_serializable(self):
        landmarks = _make_perfect_landmarks()
        guide = generate_guide(landmarks)
        d = guide.to_dict()
        json_str = json.dumps(d, ensure_ascii=False)
        parsed = json.loads(json_str)
        self.assertIn("lines", parsed)
        self.assertIn("contours", parsed)
        self.assertIn("textPrompts", parsed)
        self.assertIn("alignment", parsed)

    def test_alignment_dict_keys(self):
        landmarks = _make_perfect_landmarks()
        guide = generate_guide(landmarks)
        alignment_dict = guide.alignment.to_dict()
        self.assertIn("shoulderAlignment", alignment_dict)
        self.assertIn("bodyCentering", alignment_dict)
        self.assertIn("facingDirection", alignment_dict)
        self.assertIn("suggestions", alignment_dict)


class TestLineSegmentDataclass(unittest.TestCase):
    def test_to_dict(self):
        seg = LineSegment(
            type=LineType.SHOULDER,
            start={"x": 0.1, "y": 0.2},
            end={"x": 0.3, "y": 0.4},
            color="#FF0000",
            width=2.0,
        )
        d = seg.to_dict()
        self.assertEqual(d["type"], "shoulder")
        self.assertEqual(d["start"]["x"], 0.1)
        self.assertEqual(d["end"]["x"], 0.3)


class TestContourLineDataclass(unittest.TestCase):
    def test_to_dict(self):
        cl = ContourLine(
            type=LineType.CONTOUR,
            points=[{"x": 0.1, "y": 0.2}, {"x": 0.3, "y": 0.4}],
            color="#00FF00",
            width=1.5,
        )
        d = cl.to_dict()
        self.assertEqual(d["type"], "contour")
        self.assertEqual(len(d["points"]), 2)


class TestAlignmentResultDataclass(unittest.TestCase):
    def test_to_dict_keys(self):
        ar = AlignmentResult(
            shoulder_alignment=AlignmentStatus.GOOD,
            body_centering=CenteringStatus.CENTERED,
            facing_direction=FacingStatus.FRONT,
            suggestions=["姿势很好，请保持"],
        )
        d = ar.to_dict()
        self.assertEqual(d["shoulderAlignment"], "good")
        self.assertEqual(d["bodyCentering"], "centered")
        self.assertEqual(d["facingDirection"], "front")
        self.assertEqual(len(d["suggestions"]), 1)


class TestGenerateGuidePartialLandmarks(unittest.TestCase):
    def test_missing_some_keypoints(self):
        landmarks = [{} for _ in range(33)]
        landmarks[11] = _make_landmark(0.35, 0.30, 0.0, 1.0)
        landmarks[12] = _make_landmark(0.65, 0.30, 0.0, 1.0)
        guide = generate_guide(landmarks)
        self.assertIsInstance(guide, GuideData)
        types = [l["type"] for l in guide.lines]
        self.assertIn("shoulder", types)

    def test_empty_landmarks(self):
        landmarks = [{} for _ in range(33)]
        guide = generate_guide(landmarks)
        self.assertIsInstance(guide, GuideData)
        self.assertEqual(len(guide.lines), 0)
        self.assertEqual(len(guide.contours), 0)


# TODO: Add boundary condition tests:
# - Landmarks at image edges (x=0, x=1, y=0, y=1)
# - Very small or very large landmark coordinates (near 0 or 1)
# - Single keypoint with visibility=1 (minimal valid input)
# - All keypoints with visibility=0 (fully invisible)
# - Extremely tilted shoulders (near-vertical)
# - Body centering at exact threshold boundary values
# - Facing direction with z-values at classification boundaries
# - Duplicate landmark positions (all same point)


if __name__ == "__main__":
    unittest.main()
