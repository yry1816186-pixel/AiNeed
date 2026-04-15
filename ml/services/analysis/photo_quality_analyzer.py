from __future__ import annotations

import logging
import os
import tempfile
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Tuple, Any, Union
from pathlib import Path

import numpy as np
from PIL import Image

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# A-P1-1: Allowed directories for image loading (whitelist)
_ALLOWED_IMAGE_DIRS: List[str] = []

def _init_allowed_dirs() -> None:
    """Initialize allowed image directories from environment or defaults."""
    global _ALLOWED_IMAGE_DIRS
    env_dirs = os.getenv("PHOTO_ANALYZER_ALLOWED_DIRS", "")
    if env_dirs:
        _ALLOWED_IMAGE_DIRS = [d.strip() for d in env_dirs.split(",") if d.strip()]
    else:
        # Default: temp directory and current working directory
        _ALLOWED_IMAGE_DIRS = [
            tempfile.gettempdir(),
            os.getcwd(),
        ]

_init_allowed_dirs()


def _validate_image_path(image_path: str) -> str:
    """Validate that an image path is safe to access (prevents path traversal).

    Security checks:
    1. Resolve the real path using os.path.realpath()
    2. Reject paths containing '..' components
    3. Verify the resolved path is within an allowed directory

    Args:
        image_path: The file path to validate.

    Returns:
        The resolved real path if validation passes.

    Raises:
        ValueError: If the path fails validation (traversal attempt or outside allowed dirs).
    """
    if not image_path:
        raise ValueError("Image path cannot be empty")

    # Reject obvious traversal patterns before resolution
    # Check for '..' path components (e.g., '../../etc/passwd')
    normalized = os.path.normpath(image_path)
    parts = normalized.replace("\\", "/").split("/")
    if ".." in parts:
        raise ValueError(f"Path traversal detected: '{image_path}' contains '..' component")

    # Resolve the real absolute path (follows symlinks)
    real_path = os.path.realpath(image_path)

    # Verify the resolved path is within an allowed directory
    if _ALLOWED_IMAGE_DIRS:
        allowed = False
        for allowed_dir in _ALLOWED_IMAGE_DIRS:
            allowed_real = os.path.realpath(allowed_dir)
            if real_path.startswith(allowed_real + os.sep) or real_path == allowed_real:
                allowed = True
                break
        if not allowed:
            raise ValueError(
                f"Path traversal blocked: '{image_path}' resolves to '{real_path}' "
                f"which is outside allowed directories"
            )

    return real_path


class QualityIssue(Enum):
    LOW_SHARPNESS = "low_sharpness"
    TOO_DARK = "too_dark"
    TOO_BRIGHT = "too_bright"
    LOW_CONTRAST = "low_contrast"
    NO_PERSON = "no_person"
    PERSON_NOT_CENTERED = "person_not_centered"
    NOT_FULL_BODY = "not_full_body"


QUALITY_THRESHOLDS = {
    "sharpness": 40,
    "brightness_min": 30,
    "brightness_max": 70,
    "contrast": 30,
}

SCORE_WEIGHTS = {
    "sharpness": 0.3,
    "brightness": 0.2,
    "contrast": 0.2,
    "composition": 0.3,
}


@dataclass
class CompositionResult:
    has_person: bool = False
    person_centered: bool = False
    full_body: bool = False
    person_bbox: Optional[Tuple[int, int, int, int]] = None
    confidence: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "has_person": self.has_person,
            "person_centered": self.person_centered,
            "full_body": self.full_body,
            "person_bbox": list(self.person_bbox) if self.person_bbox else None,
            "confidence": self.confidence,
        }


@dataclass
class QualityReport:
    sharpness: float = 0.0
    brightness: float = 0.0
    contrast: float = 0.0
    composition: CompositionResult = field(default_factory=CompositionResult)
    overall_score: float = 0.0
    passed: bool = False
    suggestions: List[str] = field(default_factory=list)
    issues: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "sharpness": round(self.sharpness, 2),
            "brightness": round(self.brightness, 2),
            "contrast": round(self.contrast, 2),
            "composition": self.composition.to_dict(),
            "overall_score": round(self.overall_score, 2),
            "passed": self.passed,
            "suggestions": self.suggestions,
            "issues": self.issues,
        }


@dataclass
class EnhanceResult:
    enhanced_image: Optional[np.ndarray] = None
    enhanced_image_base64: Optional[str] = None
    enhanced_report: Optional[QualityReport] = None
    adjustments_applied: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "enhanced_image_base64": self.enhanced_image_base64,
            "enhanced_report": self.enhanced_report.to_dict() if self.enhanced_report else None,
            "adjustments_applied": self.adjustments_applied,
        }


class MediaPipePersonDetector:
    def __init__(self):
        self.pose_model = None
        self.mp_pose = None
        self._load_models()

    def _load_models(self):
        try:
            import mediapipe as mp
            self.mp_pose = mp.solutions.pose
            self.pose_model = self.mp_pose.Pose(
                static_image_mode=True,
                model_complexity=1,
                enable_segmentation=False,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5,
            )
            logger.info("MediaPipe Pose model loaded for person detection")
        except ImportError:
            logger.warning("MediaPipe not installed, person detection unavailable")
            self.pose_model = None
        except Exception as e:
            logger.error(f"Failed to load MediaPipe: {e}")
            self.pose_model = None

    def detect_person(self, image: np.ndarray) -> CompositionResult:
        if self.pose_model is None:
            return CompositionResult()

        try:
            import cv2

            if len(image.shape) == 2:
                image_bgr = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
            elif image.shape[2] == 4:
                image_bgr = cv2.cvtColor(image, cv2.COLOR_RGBA2BGR)
            elif image.shape[2] == 3:
                image_bgr = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
            else:
                return CompositionResult()

            results = self.pose_model.process(image_bgr)

            if not results.pose_landmarks:
                return CompositionResult()

            h, w = image.shape[:2]
            landmarks = results.pose_landmarks.landmark

            x_coords = [lm.x * w for lm in landmarks if lm.visibility > 0.5]
            y_coords = [lm.y * h for lm in landmarks if lm.visibility > 0.5]

            if not x_coords or not y_coords:
                return CompositionResult(has_person=True, confidence=0.3)

            x_min, x_max = int(min(x_coords)), int(max(x_coords))
            y_min, y_max = int(min(y_coords)), int(max(y_coords))

            person_cx = (x_min + x_max) / 2
            person_cy = (y_min + y_max) / 2
            image_cx = w / 2
            image_cy = h / 2

            center_offset = np.sqrt(
                ((person_cx - image_cx) / w) ** 2 +
                ((person_cy - image_cy) / h) ** 2
            )
            person_centered = center_offset < 0.2

            left_ankle = landmarks[27]
            right_ankle = landmarks[28]
            nose = landmarks[0]

            ankle_visible = (
                left_ankle.visibility > 0.5 or right_ankle.visibility > 0.5
            )
            nose_visible = nose.visibility > 0.5
            full_body = ankle_visible and nose_visible

            confidence = min(
                sum(1 for lm in landmarks if lm.visibility > 0.5) / len(landmarks),
                1.0,
            )

            return CompositionResult(
                has_person=True,
                person_centered=person_centered,
                full_body=full_body,
                person_bbox=(x_min, y_min, x_max, y_max),
                confidence=confidence,
            )

        except Exception as e:
            logger.error(f"Person detection failed: {e}")
            return CompositionResult()


class PhotoQualityAnalyzer:
    def __init__(self, person_detector: Optional[MediaPipePersonDetector] = None):
        self.person_detector = person_detector or MediaPipePersonDetector()
        self.thresholds = QUALITY_THRESHOLDS
        # P1-10: Track last successful analysis for degradation
        self._last_successful_report: Optional[QualityReport] = None

    def analyze_quality(self, image: Union[np.ndarray, Image.Image, str]) -> QualityReport:
        try:
            image_array = self._load_image(image)
            if image_array is None:
                return QualityReport(
                    suggestions=["无法加载图片，请检查文件格式"],
                    issues=["invalid_image"],
                )

            sharpness = self._measure_sharpness(image_array)
            brightness = self._measure_brightness(image_array)
            contrast = self._measure_contrast(image_array)
            composition = self._analyze_composition(image_array)

            composition_score = self._calculate_composition_score(composition)
            overall_score = (
                sharpness * SCORE_WEIGHTS["sharpness"]
                + brightness * SCORE_WEIGHTS["brightness"]
                + contrast * SCORE_WEIGHTS["contrast"]
                + composition_score * SCORE_WEIGHTS["composition"]
            )

            issues = self._identify_issues(sharpness, brightness, contrast, composition)
            passed = len(issues) == 0
            suggestions = self._generate_suggestions(sharpness, brightness, contrast, composition)

            report = QualityReport(
                sharpness=sharpness,
                brightness=brightness,
                contrast=contrast,
                composition=composition,
                overall_score=round(overall_score, 2),
                passed=passed,
                suggestions=suggestions,
                issues=[i.value for i in issues],
            )
            # P1-10: Cache successful result for degradation
            self._last_successful_report = report
            return report

        except Exception as e:
            logger.error(f"Quality analysis failed: {e}")
            # P1-10: Return degraded result instead of bare error report
            if self._last_successful_report is not None:
                degraded = QualityReport(
                    sharpness=self._last_successful_report.sharpness,
                    brightness=self._last_successful_report.brightness,
                    contrast=self._last_successful_report.contrast,
                    overall_score=max(0, self._last_successful_report.overall_score - 10),
                    passed=False,
                    suggestions=[f"分析降级运行（上次成功结果）: {str(e)}"] + self._last_successful_report.suggestions,
                    issues=["degraded_analysis"] + self._last_successful_report.issues,
                )
                return degraded
            return QualityReport(
                suggestions=[f"分析失败: {str(e)}"],
                issues=["analysis_error"],
            )

    def auto_enhance(
        self,
        image: Union[np.ndarray, Image.Image, str],
        issues: Optional[List[str]] = None,
    ) -> EnhanceResult:
        try:
            image_array = self._load_image(image)
            if image_array is None:
                return EnhanceResult()

            if issues is None:
                report = self.analyze_quality(image_array)
                issues = report.issues

            enhanced = image_array.copy()
            adjustments = []

            import cv2

            for issue in issues:
                if issue == QualityIssue.TOO_DARK.value:
                    enhanced = self._adjust_brightness(enhanced, factor=1.4)
                    adjustments.append("brightness_increase")
                elif issue == QualityIssue.TOO_BRIGHT.value:
                    enhanced = self._adjust_brightness(enhanced, factor=0.7)
                    adjustments.append("brightness_decrease")
                elif issue == QualityIssue.LOW_CONTRAST.value:
                    enhanced = self._adjust_contrast(enhanced, alpha=1.3)
                    adjustments.append("contrast_increase")
                elif issue == QualityIssue.LOW_SHARPNESS.value:
                    enhanced = self._sharpen(enhanced)
                    adjustments.append("sharpen")

            if not adjustments:
                gamma = 1.0 / self._estimate_gamma(image_array)
                enhanced = self._apply_gamma(enhanced, gamma)
                adjustments.append("gamma_correction")

            import base64
            import io

            pil_image = Image.fromarray(enhanced.astype(np.uint8))
            buffer = io.BytesIO()
            pil_image.save(buffer, format="JPEG", quality=90)
            enhanced_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

            enhanced_report = self.analyze_quality(enhanced)

            return EnhanceResult(
                enhanced_image=enhanced,
                enhanced_image_base64=enhanced_base64,
                enhanced_report=enhanced_report,
                adjustments_applied=adjustments,
            )

        except Exception as e:
            logger.error(f"Auto enhance failed: {e}")
            return EnhanceResult()

    def _load_image(self, image: Union[np.ndarray, Image.Image, str]) -> Optional[np.ndarray]:
        if isinstance(image, np.ndarray):
            return image
        elif isinstance(image, Image.Image):
            return np.array(image.convert("RGB"))
        elif isinstance(image, str):
            try:
                # A-P1-1: Validate path to prevent path traversal attacks
                safe_path = _validate_image_path(image)
                img = Image.open(safe_path).convert("RGB")
                return np.array(img)
            except ValueError as e:
                # Path validation failure (traversal attempt)
                logger.error(f"Path validation failed: {e}")
                return None
            except Exception as e:
                logger.error(f"Failed to load image from path: {e}")
                return None
        return None

    def _measure_sharpness(self, image: np.ndarray) -> float:
        try:
            import cv2

            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            laplacian = cv2.Laplacian(gray, cv2.CV_64F)
            variance = laplacian.var()

            normalized = min(variance / 500, 1.0) * 100
            return round(normalized, 2)

        except Exception as e:
            logger.warning(f"Sharpness measurement failed: {e}")
            return 50.0

    def _measure_brightness(self, image: np.ndarray) -> float:
        try:
            import cv2

            hsv = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)
            v_channel = hsv[:, :, 2]
            mean_brightness = np.mean(v_channel)

            normalized = (mean_brightness / 255) * 100
            return round(normalized, 2)

        except Exception as e:
            logger.warning(f"Brightness measurement failed: {e}")
            return 50.0

    def _measure_contrast(self, image: np.ndarray) -> float:
        try:
            import cv2

            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            std_dev = np.std(gray)

            normalized = min((std_dev / 128) * 100, 100)
            return round(normalized, 2)

        except Exception as e:
            logger.warning(f"Contrast measurement failed: {e}")
            return 50.0

    def _analyze_composition(self, image: np.ndarray) -> CompositionResult:
        return self.person_detector.detect_person(image)

    def _calculate_composition_score(self, composition: CompositionResult) -> float:
        score = 0.0
        if composition.has_person:
            score += 50
        if composition.person_centered:
            score += 25
        if composition.full_body:
            score += 25
        return score

    def _identify_issues(
        self,
        sharpness: float,
        brightness: float,
        contrast: float,
        composition: CompositionResult,
    ) -> List[QualityIssue]:
        issues = []

        if sharpness <= self.thresholds["sharpness"]:
            issues.append(QualityIssue.LOW_SHARPNESS)
        if brightness < self.thresholds["brightness_min"]:
            issues.append(QualityIssue.TOO_DARK)
        if brightness > self.thresholds["brightness_max"]:
            issues.append(QualityIssue.TOO_BRIGHT)
        if contrast <= self.thresholds["contrast"]:
            issues.append(QualityIssue.LOW_CONTRAST)
        if not composition.has_person:
            issues.append(QualityIssue.NO_PERSON)
        elif not composition.person_centered:
            issues.append(QualityIssue.PERSON_NOT_CENTERED)
        elif not composition.full_body:
            issues.append(QualityIssue.NOT_FULL_BODY)

        return issues

    def _generate_suggestions(
        self,
        sharpness: float,
        brightness: float,
        contrast: float,
        composition: CompositionResult,
    ) -> List[str]:
        suggestions = []

        if sharpness <= self.thresholds["sharpness"]:
            suggestions.append("照片清晰度不足，请保持相机稳定后重新拍摄")
        if brightness < self.thresholds["brightness_min"]:
            suggestions.append("照片过暗，请在光线充足的环境下拍摄")
        if brightness > self.thresholds["brightness_max"]:
            suggestions.append("照片过亮，请避免逆光或强光直射")
        if contrast <= self.thresholds["contrast"]:
            suggestions.append("照片对比度不足，请调整光线方向增加明暗层次")
        if not composition.has_person:
            suggestions.append("未检测到人像，请确保照片中包含完整的人物")
        elif not composition.person_centered:
            suggestions.append("人像未居中，请将人物置于画面中央")
        if composition.has_person and not composition.full_body:
            suggestions.append("建议拍摄全身照以获得更准确的分析结果")

        return suggestions

    def _adjust_brightness(self, image: np.ndarray, factor: float) -> np.ndarray:
        import cv2

        hsv = cv2.cvtColor(image, cv2.COLOR_RGB2HSV).astype(np.float32)
        hsv[:, :, 2] = np.clip(hsv[:, :, 2] * factor, 0, 255)
        return cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2RGB)

    def _adjust_contrast(self, image: np.ndarray, alpha: float = 1.3) -> np.ndarray:
        return np.clip(image.astype(np.float32) * alpha, 0, 255).astype(np.uint8)

    def _sharpen(self, image: np.ndarray) -> np.ndarray:
        import cv2

        kernel = np.array([[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]])
        return cv2.filter2D(image, -1, kernel)

    def _estimate_gamma(self, image: np.ndarray) -> float:
        gray = np.mean(image)
        if gray <= 0:
            return 1.0
        return np.log(128) / np.log(gray)

    def _apply_gamma(self, image: np.ndarray, gamma: float) -> np.ndarray:
        inv_gamma = 1.0 / max(gamma, 0.1)
        table = np.array(
            [((i / 255.0) ** inv_gamma) * 255 for i in range(256)]
        ).astype(np.uint8)
        return table[image]


_analyzer_instance: Optional[PhotoQualityAnalyzer] = None


def get_photo_quality_analyzer() -> PhotoQualityAnalyzer:
    global _analyzer_instance
    if _analyzer_instance is None:
        _analyzer_instance = PhotoQualityAnalyzer()
    return _analyzer_instance


if __name__ == "__main__":
    analyzer = get_photo_quality_analyzer()
    print("PhotoQualityAnalyzer initialized")
    print(f"Thresholds: {QUALITY_THRESHOLDS}")
    print(f"Score weights: {SCORE_WEIGHTS}")
