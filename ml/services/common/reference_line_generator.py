from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


class LineType(str, Enum):
    SHOULDER = "shoulder"
    WAIST = "waist"
    CENTER = "center"
    CONTOUR = "contour"


class AlignmentStatus(str, Enum):
    GOOD = "good"
    TILTED_LEFT = "tilted_left"
    TILTED_RIGHT = "tilted_right"


class CenteringStatus(str, Enum):
    CENTERED = "centered"
    LEFT = "left"
    RIGHT = "right"


class FacingStatus(str, Enum):
    FRONT = "front"
    LEFT = "left"
    RIGHT = "right"


@dataclass
class LineSegment:
    type: LineType
    start: Dict[str, float]
    end: Dict[str, float]
    color: str
    width: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.type.value,
            "start": self.start,
            "end": self.end,
            "color": self.color,
            "width": self.width,
        }


@dataclass
class ContourLine:
    type: LineType
    points: List[Dict[str, float]]
    color: str
    width: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.type.value,
            "points": self.points,
            "color": self.color,
            "width": self.width,
        }


@dataclass
class AlignmentResult:
    shoulder_alignment: AlignmentStatus
    body_centering: CenteringStatus
    facing_direction: FacingStatus
    suggestions: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "shoulderAlignment": self.shoulder_alignment.value,
            "bodyCentering": self.body_centering.value,
            "facingDirection": self.facing_direction.value,
            "suggestions": self.suggestions,
        }


@dataclass
class GuideData:
    lines: List[Dict[str, Any]]
    contours: List[Dict[str, Any]]
    text_prompts: List[str]
    alignment: AlignmentResult

    def to_dict(self) -> Dict[str, Any]:
        return {
            "lines": self.lines,
            "contours": self.contours,
            "textPrompts": self.text_prompts,
            "alignment": self.alignment.to_dict(),
        }


KEYPOINT_INDEX = {
    "nose": 0,
    "left_shoulder": 11,
    "right_shoulder": 12,
    "left_elbow": 13,
    "right_elbow": 14,
    "left_wrist": 15,
    "right_wrist": 16,
    "left_hip": 23,
    "right_hip": 24,
    "left_knee": 25,
    "right_knee": 26,
    "left_ankle": 27,
    "right_ankle": 28,
}

SHOULDER_TILT_THRESHOLD = 0.04
CENTERING_THRESHOLD = 0.05
FACING_Z_THRESHOLD = 0.08
VISIBILITY_THRESHOLD = 0.5

LINE_COLORS = {
    LineType.SHOULDER: "#FF6B6B",
    LineType.WAIST: "#4ECDC4",
    LineType.CENTER: "#FFE66D",
    LineType.CONTOUR: "#A8E6CF",
}

LINE_WIDTHS = {
    LineType.SHOULDER: 2.0,
    LineType.WAIST: 2.0,
    LineType.CENTER: 1.5,
    LineType.CONTOUR: 1.5,
}


def _get_point(landmarks: List[Dict], name: str) -> Optional[Dict[str, float]]:
    idx = KEYPOINT_INDEX.get(name)
    if idx is None or idx >= len(landmarks):
        return None
    lm = landmarks[idx]
    if lm.get("visibility", 0) < VISIBILITY_THRESHOLD:
        return None
    return {"x": lm["x"], "y": lm["y"], "z": lm.get("z", 0.0)}


def _midpoint(p1: Dict[str, float], p2: Dict[str, float]) -> Dict[str, float]:
    return {
        "x": (p1["x"] + p2["x"]) / 2,
        "y": (p1["y"] + p2["y"]) / 2,
        "z": (p1.get("z", 0) + p2.get("z", 0)) / 2,
    }


def _build_shoulder_line(landmarks: List[Dict]) -> Optional[LineSegment]:
    left = _get_point(landmarks, "left_shoulder")
    right = _get_point(landmarks, "right_shoulder")
    if not left or not right:
        return None
    return LineSegment(
        type=LineType.SHOULDER,
        start=left,
        end=right,
        color=LINE_COLORS[LineType.SHOULDER],
        width=LINE_WIDTHS[LineType.SHOULDER],
    )


def _build_waist_line(landmarks: List[Dict]) -> Optional[LineSegment]:
    left = _get_point(landmarks, "left_hip")
    right = _get_point(landmarks, "right_hip")
    if not left or not right:
        return None
    return LineSegment(
        type=LineType.WAIST,
        start=left,
        end=right,
        color=LINE_COLORS[LineType.WAIST],
        width=LINE_WIDTHS[LineType.WAIST],
    )


def _build_center_line(landmarks: List[Dict]) -> Optional[LineSegment]:
    left_shoulder = _get_point(landmarks, "left_shoulder")
    right_shoulder = _get_point(landmarks, "right_shoulder")
    left_hip = _get_point(landmarks, "left_hip")
    right_hip = _get_point(landmarks, "right_hip")
    if not left_shoulder or not right_shoulder or not left_hip or not right_hip:
        return None
    top = _midpoint(left_shoulder, right_shoulder)
    bottom = _midpoint(left_hip, right_hip)
    return LineSegment(
        type=LineType.CENTER,
        start=top,
        end=bottom,
        color=LINE_COLORS[LineType.CENTER],
        width=LINE_WIDTHS[LineType.CENTER],
    )


def _build_contour_lines(landmarks: List[Dict]) -> List[ContourLine]:
    contours: List[ContourLine] = []

    left_chain_names = [
        "left_shoulder", "left_elbow", "left_wrist",
    ]
    right_chain_names = [
        "right_shoulder", "right_elbow", "right_wrist",
    ]
    left_leg_names = [
        "left_hip", "left_knee", "left_ankle",
    ]
    right_leg_names = [
        "right_hip", "right_knee", "right_ankle",
    ]

    for names in [left_chain_names, right_chain_names, left_leg_names, right_leg_names]:
        points: List[Dict[str, float]] = []
        for name in names:
            pt = _get_point(landmarks, name)
            if pt:
                points.append(pt)
        if len(points) >= 2:
            contours.append(ContourLine(
                type=LineType.CONTOUR,
                points=points,
                color=LINE_COLORS[LineType.CONTOUR],
                width=LINE_WIDTHS[LineType.CONTOUR],
            ))

    torso_points: List[Dict[str, float]] = []
    for name in ["left_shoulder", "right_shoulder", "right_hip", "left_hip"]:
        pt = _get_point(landmarks, name)
        if pt:
            torso_points.append(pt)
    if len(torso_points) == 4:
        torso_points.append(torso_points[0])
        contours.append(ContourLine(
            type=LineType.CONTOUR,
            points=torso_points,
            color=LINE_COLORS[LineType.CONTOUR],
            width=LINE_WIDTHS[LineType.CONTOUR],
        ))

    return contours


def check_alignment(landmarks: List[Dict]) -> AlignmentResult:
    """Check body alignment based on MediaPipe Pose landmarks.

    Args:
        landmarks: List of 33 keypoint dicts with x, y, z, visibility, name.

    Returns:
        AlignmentResult with shoulder alignment, body centering, facing direction,
        and actionable suggestions.
    """
    suggestions: List[str] = []

    left_shoulder = _get_point(landmarks, "left_shoulder")
    right_shoulder = _get_point(landmarks, "right_shoulder")
    left_hip = _get_point(landmarks, "left_hip")
    right_hip = _get_point(landmarks, "right_hip")
    nose = _get_point(landmarks, "nose")

    shoulder_alignment = AlignmentStatus.GOOD
    if left_shoulder and right_shoulder:
        dy = left_shoulder["y"] - right_shoulder["y"]
        if dy > SHOULDER_TILT_THRESHOLD:
            shoulder_alignment = AlignmentStatus.TILTED_LEFT
            suggestions.append("请稍向右调整肩膀")
        elif dy < -SHOULDER_TILT_THRESHOLD:
            shoulder_alignment = AlignmentStatus.TILTED_RIGHT
            suggestions.append("请稍向左调整肩膀")

    body_centering = CenteringStatus.CENTERED
    if left_shoulder and right_shoulder:
        mid_x = (left_shoulder["x"] + right_shoulder["x"]) / 2
        if mid_x < 0.5 - CENTERING_THRESHOLD:
            body_centering = CenteringStatus.LEFT
            suggestions.append("请稍向右移动")
        elif mid_x > 0.5 + CENTERING_THRESHOLD:
            body_centering = CenteringStatus.RIGHT
            suggestions.append("请稍向左移动")

    facing_direction = FacingStatus.FRONT
    if left_shoulder and right_shoulder:
        dz = left_shoulder.get("z", 0) - right_shoulder.get("z", 0)
        if dz > FACING_Z_THRESHOLD:
            facing_direction = FacingStatus.LEFT
            suggestions.append("请正面朝向镜头")
        elif dz < -FACING_Z_THRESHOLD:
            facing_direction = FacingStatus.RIGHT
            suggestions.append("请正面朝向镜头")

    if nose and left_shoulder and right_shoulder:
        shoulder_mid = _midpoint(left_shoulder, right_shoulder)
        nose_offset = nose["x"] - shoulder_mid["x"]
        if abs(nose_offset) > 0.06 and facing_direction == FacingStatus.FRONT:
            if nose_offset > 0:
                suggestions.append("请稍向左转头")
            else:
                suggestions.append("请稍向右转头")

    if left_shoulder and right_shoulder and left_hip and right_hip:
        shoulder_mid = _midpoint(left_shoulder, right_shoulder)
        hip_mid = _midpoint(left_hip, right_hip)
        dx = hip_mid["x"] - shoulder_mid["x"]
        if abs(dx) > 0.05:
            suggestions.append("请站直")

    if not suggestions:
        suggestions.append("姿势很好，请保持")

    return AlignmentResult(
        shoulder_alignment=shoulder_alignment,
        body_centering=body_centering,
        facing_direction=facing_direction,
        suggestions=suggestions,
    )


def generate_guide(landmarks: List[Dict]) -> GuideData:
    """Generate reference line data for frontend Canvas rendering.

    Produces shoulder line, waist line, center line, contour lines, and
    text prompts based on alignment analysis.

    Args:
        landmarks: List of 33 keypoint dicts with x, y, z, visibility, name.

    Returns:
        GuideData containing line segments, contour lines, text prompts,
        and alignment result. All data is JSON-serializable via to_dict().
    """
    lines: List[Dict[str, Any]] = []
    contours: List[Dict[str, Any]] = []

    shoulder_line = _build_shoulder_line(landmarks)
    if shoulder_line:
        lines.append(shoulder_line.to_dict())

    waist_line = _build_waist_line(landmarks)
    if waist_line:
        lines.append(waist_line.to_dict())

    center_line = _build_center_line(landmarks)
    if center_line:
        lines.append(center_line.to_dict())

    contour_lines = _build_contour_lines(landmarks)
    for cl in contour_lines:
        contours.append(cl.to_dict())

    alignment = check_alignment(landmarks)

    text_prompts = list(alignment.suggestions)

    logger.debug(
        "Generated guide: %d lines, %d contours, %d prompts, alignment=%s",
        len(lines), len(contours), len(text_prompts),
        alignment.shoulder_alignment.value,
    )

    return GuideData(
        lines=lines,
        contours=contours,
        text_prompts=text_prompts,
        alignment=alignment,
    )
