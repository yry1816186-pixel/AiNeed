"""
本地AI模型服务
整合多个预训练模型，提供服装分析、特征提取、推荐等功能
支持YOLOv11、CLIP、MediaPipe等模型

NOTE: KMP_DUPLICATE_LIB_OK has been removed to ensure stable runtime.
If you encounter OpenMP library conflicts, please:
1. Ensure only one OpenMP runtime is installed
2. Set OMP_NUM_THREADS=1 if needed
3. Use conda/pip to manage dependencies properly
"""

import os
import hashlib
import threading
import time
from collections import OrderedDict

# Removed: os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'
# This was a workaround that could cause runtime instability.
# Proper solution: Ensure clean environment with single OpenMP runtime.

import json
import torch
import numpy as np
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from pathlib import Path
from PIL import Image
import cv2
from enum import Enum

# Import path configuration for centralized path management
import sys as _sys
_sys.path.insert(0, str(Path(__file__).parent.parent / "config"))
from paths import ModelPaths, PROJECT_ROOT


class EmbeddingCache:
    """LRU cache for image/text embeddings with TTL support"""
    
    def __init__(self, max_size: int = 1000, ttl_seconds: int = 3600):
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self._cache: OrderedDict[str, Tuple[np.ndarray, float]] = OrderedDict()
        self._lock = threading.RLock()
        self._hits = 0
        self._misses = 0
    
    def _compute_image_hash(self, image: Image.Image) -> str:
        """Compute a hash for PIL Image for caching purposes"""
        try:
            import io
            buffer = io.BytesIO()
            image.save(buffer, format='PNG')
            data = buffer.getvalue()
            return hashlib.sha256(data).hexdigest()
        except Exception as e:
            # FIX-CODE-004: 添加日志记录 (修复时间: 2026-03-19)
            logger.warning(f"Failed to compute image hash, using size fallback: {e}")
            return hashlib.sha256(str(image.size).encode()).hexdigest()
    
    def _compute_text_hash(self, text: str) -> str:
        """Compute a hash for text for caching purposes"""
        return hashlib.sha256(text.encode('utf-8')).hexdigest()
    
    def get_image_key(self, image: Image.Image, prefix: str = "img") -> str:
        """Generate cache key for image embedding"""
        return f"{prefix}:{self._compute_image_hash(image)}"
    
    def get_text_key(self, text: str, prefix: str = "txt") -> str:
        """Generate cache key for text embedding"""
        return f"{prefix}:{self._compute_text_hash(text)}"
    
    def get(self, key: str) -> Optional[np.ndarray]:
        """Get cached embedding if exists and not expired"""
        with self._lock:
            if key not in self._cache:
                self._misses += 1
                return None
            
            embedding, timestamp = self._cache[key]
            
            if time.time() - timestamp > self.ttl_seconds:
                del self._cache[key]
                self._misses += 1
                return None
            
            self._cache.move_to_end(key)
            self._hits += 1
            return embedding
    
    def set(self, key: str, embedding: np.ndarray) -> None:
        """Store embedding in cache"""
        with self._lock:
            if key in self._cache:
                del self._cache[key]
            
            self._cache[key] = (embedding.copy(), time.time())
            
            while len(self._cache) > self.max_size:
                self._cache.popitem(last=False)
    
    def clear(self) -> None:
        """Clear all cached entries"""
        with self._lock:
            self._cache.clear()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        with self._lock:
            total = self._hits + self._misses
            hit_rate = self._hits / total if total > 0 else 0
            return {
                "size": len(self._cache),
                "max_size": self.max_size,
                "hits": self._hits,
                "misses": self._misses,
                "hit_rate": round(hit_rate, 4),
                "ttl_seconds": self.ttl_seconds
            }


class BodyType(Enum):
    RECTANGLE = "rectangle"
    HOURGLASS = "hourglass"
    TRIANGLE = "triangle"
    INVERTED_TRIANGLE = "inverted_triangle"
    OVAL = "oval"


@dataclass
class ClothingAnalysis:
    category: str
    style: List[str]
    colors: List[str]
    occasions: List[str]
    seasons: List[str]
    attributes: Dict[str, Any]
    embedding: np.ndarray
    confidence: float


@dataclass
class BodyAnalysis:
    body_type: str
    body_type_confidence: float
    height_estimate: float
    shoulder_width: float
    bust_width: float
    waist_width: float
    hip_width: float
    skin_tone: str
    color_season: str
    keypoints: Dict[str, Tuple[float, float]]
    proportions: Dict[str, float]
    measurements: Dict[str, float]


@dataclass
class OutfitRecommendation:
    items: List[Dict]
    compatibility_score: float
    style_match: float
    occasion_match: float
    reasons: List[str]


class BodyShapeAnalyzer:
    """
    高级体型分析器
    基于人体关键点和比例进行精确的体型分类
    """

    BODY_TYPE_THRESHOLDS = {
        'shoulder_hip_ratio': {
            'hourglass_range': (0.95, 1.05),
            'triangle_threshold': 0.92,
            'inverted_triangle_threshold': 1.08,
        },
        'waist_shoulder_ratio': {
            'hourglass_max': 0.72,
            'rectangle_max': 0.85,
            'oval_min': 0.88,
        },
        'waist_hip_ratio': {
            'hourglass_max': 0.75,
            'rectangle_max': 0.82,
            'oval_min': 0.85,
        }
    }

    BODY_TYPE_DESCRIPTIONS = {
        BodyType.RECTANGLE: {
            'name': 'H型（矩形）',
            'description': '肩、腰、臀宽度相近，身体线条平直',
            'characteristics': ['肩宽与臀宽相近', '腰部曲线不明显', '腿部通常较长'],
            'suitable_styles': ['收腰设计', '层次搭配', 'V领上衣', 'A字裙'],
            'avoid_styles': ['直筒连衣裙', '无腰线款式'],
        },
        BodyType.HOURGLASS: {
            'name': 'X型（沙漏）',
            'description': '肩臀相近，腰部明显纤细，曲线明显',
            'characteristics': ['肩宽与臀宽相近', '腰部明显收紧', '胸部丰满'],
            'suitable_styles': ['收腰款式', '铅笔裙', '高腰裤', '裹身裙'],
            'avoid_styles': ['宽松直筒款', '无腰线设计'],
        },
        BodyType.TRIANGLE: {
            'name': 'A型（梨形）',
            'description': '臀部比肩宽，下半身较丰满',
            'characteristics': ['肩部较窄', '臀部较宽', '大腿较粗'],
            'suitable_styles': ['垫肩设计', '亮色上衣', '深色下装', 'A字裙'],
            'avoid_styles': ['紧身裤', '紧身裙', '臀部装饰'],
        },
        BodyType.INVERTED_TRIANGLE: {
            'name': 'Y型（倒三角）',
            'description': '肩部比臀宽，上半身较丰满',
            'characteristics': ['肩部较宽', '胸部较丰满', '臀部较窄'],
            'suitable_styles': ['V领设计', '深色上衣', '亮色下装', '阔腿裤'],
            'avoid_styles': ['垫肩设计', '泡泡袖', '紧身裤'],
        },
        BodyType.OVAL: {
            'name': 'O型（椭圆）',
            'description': '腰部较粗，四肢相对纤细',
            'characteristics': ['腰围较大', '腹部较圆润', '四肢较细'],
            'suitable_styles': ['V领上衣', '深色系', '垂感面料', '直筒款'],
            'avoid_styles': ['紧身款', '横条纹', '腰部装饰'],
        },
    }

    def __init__(self):
        self.pose_model = None
        self.mp_pose = None
        self.pose_backend = None
        self.load_error = None
        self._load_models()

    def _load_models(self):
        try:
            import mediapipe as mp

            if hasattr(mp, "solutions") and hasattr(mp.solutions, "pose"):
                self.mp_pose = mp.solutions.pose
                self.pose_model = self.mp_pose.Pose(
                    static_image_mode=True,
                    model_complexity=2,
                    enable_segmentation=True,
                    min_detection_confidence=0.5,
                    min_tracking_confidence=0.5
                )
                self.pose_backend = "solutions"
                self.load_error = None
                print("MediaPipe Pose model loaded successfully")
                return

            from mediapipe.tasks import python
            from mediapipe.tasks.python import vision

            model_path = self._resolve_pose_landmarker_model_path()
            if model_path is None:
                raise FileNotFoundError("PoseLandmarker model file not found")

            base_options = python.BaseOptions(model_asset_path=model_path)
            options = vision.PoseLandmarkerOptions(
                base_options=base_options,
                running_mode=vision.RunningMode.IMAGE,
                num_poses=1,
                min_pose_detection_confidence=0.5,
                min_pose_presence_confidence=0.5,
                min_tracking_confidence=0.5,
            )
            self.pose_model = vision.PoseLandmarker.create_from_options(options)
            self.pose_backend = "tasks"
            self.load_error = None
            print(f"MediaPipe PoseLandmarker loaded successfully from {model_path}")
        except Exception as e:
            print(f"Failed to load MediaPipe: {e}")
            self.pose_model = None
            self.pose_backend = None
            self.load_error = str(e)

    def _resolve_pose_landmarker_model_path(self) -> Optional[str]:
        configured_path = os.environ.get("POSE_LANDMARKER_MODEL")
        candidate_paths = [
            configured_path,
            str(Path("models/mediapipe/pose_landmarker.task")),
            str(Path("models/mediapipe/pose_landmarker_heavy.task")),
            str(Path(__file__).resolve().parents[1] / "models" / "mediapipe" / "pose_landmarker.task"),
            str(Path(__file__).resolve().parents[1] / "models" / "mediapipe" / "pose_landmarker_heavy.task"),
        ]

        for candidate in candidate_paths:
            if candidate and Path(candidate).exists():
                return candidate

        return None

    def analyze_body_type(self, image: Image.Image) -> BodyAnalysis:
        if self.pose_model is None:
            return self._get_default_analysis()

        image_array = np.array(image)

        if self.pose_backend == "tasks":
            import mediapipe as mp

            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_array)
            results = self.pose_model.detect(mp_image)
            if not results.pose_landmarks:
                return self._get_default_analysis()
            landmarks = results.pose_landmarks[0]
        else:
            results = self.pose_model.process(image_array)
            if not results.pose_landmarks:
                return self._get_default_analysis()
            landmarks = results.pose_landmarks.landmark

        h, w = image_array.shape[:2]

        keypoints = self._extract_keypoints(landmarks, w, h)
        measurements = self._calculate_measurements(keypoints, h, w)
        proportions = self._calculate_proportions(measurements)
        body_type, confidence = self._classify_body_type(measurements, proportions)

        skin_tone = self._estimate_skin_tone(image_array, landmarks)
        color_season = self._predict_color_season(skin_tone)

        return BodyAnalysis(
            body_type=body_type.value,
            body_type_confidence=confidence,
            height_estimate=measurements.get('estimated_height', 170),
            shoulder_width=measurements.get('shoulder_width', 40),
            bust_width=measurements.get('bust_width', 35),
            waist_width=measurements.get('waist_width', 30),
            hip_width=measurements.get('hip_width', 38),
            skin_tone=skin_tone,
            color_season=color_season,
            keypoints=keypoints,
            proportions=proportions,
            measurements=measurements
        )

    def _extract_keypoints(self, landmarks, img_width: int, img_height: int) -> Dict:
        keypoint_indices = {
            'nose': 0,
            'left_shoulder': 11, 'right_shoulder': 12,
            'left_elbow': 13, 'right_elbow': 14,
            'left_wrist': 15, 'right_wrist': 16,
            'left_hip': 23, 'right_hip': 24,
            'left_knee': 25, 'right_knee': 26,
            'left_ankle': 27, 'right_ankle': 28,
            'left_ear': 7, 'right_ear': 8,
        }

        keypoints = {}
        for name, idx in keypoint_indices.items():
            landmark = landmarks[idx]
            keypoints[name] = {
                'x': landmark.x * img_width,
                'y': landmark.y * img_height,
                'z': getattr(landmark, 'z', 0.0),
                'visibility': getattr(landmark, 'visibility', 1.0)
            }

        keypoints['left_waist'] = self._estimate_waist_point(
            landmarks[11], landmarks[23], img_width, img_height
        )
        keypoints['right_waist'] = self._estimate_waist_point(
            landmarks[12], landmarks[24], img_width, img_height
        )

        return keypoints

    def _estimate_waist_point(self, shoulder, hip, img_width, img_height):
        waist_y = shoulder.y + (hip.y - shoulder.y) * 0.4
        waist_x = shoulder.x + (hip.x - shoulder.x) * 0.5

        return {
            'x': waist_x * img_width,
            'y': waist_y * img_height,
            'z': (getattr(shoulder, 'z', 0.0) + getattr(hip, 'z', 0.0)) / 2,
            'visibility': min(getattr(shoulder, 'visibility', 1.0), getattr(hip, 'visibility', 1.0))
        }

    def _calculate_measurements(self, keypoints: Dict, img_height: int, img_width: int) -> Dict:
        shoulder_width = abs(
            keypoints['left_shoulder']['x'] - keypoints['right_shoulder']['x']
        )

        hip_width = abs(
            keypoints['left_hip']['x'] - keypoints['right_hip']['x']
        )

        waist_width = abs(
            keypoints['left_waist']['x'] - keypoints['right_waist']['x']
        )

        bust_width = shoulder_width * 0.85

        torso_height = abs(
            keypoints['left_shoulder']['y'] - keypoints['left_hip']['y']
        )
        leg_height = abs(
            keypoints['left_hip']['y'] - keypoints['left_ankle']['y']
        )

        head_height = abs(
            keypoints['nose']['y'] - (keypoints['left_shoulder']['y'] + keypoints['right_shoulder']['y']) / 2
        ) * 2

        total_height_pixels = torso_height + leg_height + head_height

        pixels_per_cm = total_height_pixels / 170
        estimated_height = img_height / pixels_per_cm if pixels_per_cm > 0 else 170

        return {
            'shoulder_width': shoulder_width / pixels_per_cm if pixels_per_cm > 0 else shoulder_width,
            'hip_width': hip_width / pixels_per_cm if pixels_per_cm > 0 else hip_width,
            'waist_width': waist_width / pixels_per_cm if pixels_per_cm > 0 else waist_width,
            'bust_width': bust_width / pixels_per_cm if pixels_per_cm > 0 else bust_width,
            'torso_height': torso_height,
            'leg_height': leg_height,
            'total_height_pixels': total_height_pixels,
            'estimated_height': estimated_height,
            'pixels_per_cm': pixels_per_cm,
        }

    def _calculate_proportions(self, measurements: Dict) -> Dict:
        shoulder = measurements.get('shoulder_width', 1)
        hip = measurements.get('hip_width', 1)
        waist = measurements.get('waist_width', 1)
        bust = measurements.get('bust_width', 1)

        return {
            'shoulder_to_hip_ratio': shoulder / hip if hip > 0 else 1,
            'waist_to_hip_ratio': waist / hip if hip > 0 else 1,
            'waist_to_shoulder_ratio': waist / shoulder if shoulder > 0 else 1,
            'bust_to_waist_ratio': bust / waist if waist > 0 else 1,
            'bust_to_hip_ratio': bust / hip if hip > 0 else 1,
        }

    def _classify_body_type(self, measurements: Dict, proportions: Dict) -> Tuple[BodyType, float]:
        shoulder_hip = proportions.get('shoulder_to_hip_ratio', 1)
        waist_shoulder = proportions.get('waist_to_shoulder_ratio', 1)
        waist_hip = proportions.get('waist_to_hip_ratio', 1)

        thresholds = self.BODY_TYPE_THRESHOLDS

        scores = {
            BodyType.HOURGLASS: 0,
            BodyType.RECTANGLE: 0,
            BodyType.TRIANGLE: 0,
            BodyType.INVERTED_TRIANGLE: 0,
            BodyType.OVAL: 0,
        }

        if (thresholds['shoulder_hip_ratio']['hourglass_range'][0] <= shoulder_hip <=
            thresholds['shoulder_hip_ratio']['hourglass_range'][1]):
            if waist_shoulder < thresholds['waist_shoulder_ratio']['hourglass_max']:
                scores[BodyType.HOURGLASS] += 40
            if waist_hip < thresholds['waist_hip_ratio']['hourglass_max']:
                scores[BodyType.HOURGLASS] += 40

        if abs(shoulder_hip - 1) < 0.1 and waist_shoulder > 0.75:
            scores[BodyType.RECTANGLE] += 30
        if waist_hip < thresholds['waist_hip_ratio']['rectangle_max']:
            scores[BodyType.RECTANGLE] += 20

        if shoulder_hip < thresholds['shoulder_hip_ratio']['triangle_threshold']:
            scores[BodyType.TRIANGLE] += 50
        if waist_hip > 0.7:
            scores[BodyType.TRIANGLE] += 20

        if shoulder_hip > thresholds['shoulder_hip_ratio']['inverted_triangle_threshold']:
            scores[BodyType.INVERTED_TRIANGLE] += 50
        if waist_shoulder < thresholds['waist_shoulder_ratio']['hourglass_max']:
            scores[BodyType.INVERTED_TRIANGLE] += 20

        if waist_shoulder > thresholds['waist_shoulder_ratio']['oval_min']:
            scores[BodyType.OVAL] += 40
        if waist_hip > thresholds['waist_hip_ratio']['oval_min']:
            scores[BodyType.OVAL] += 40

        best_type = max(scores, key=scores.get)
        total_score = sum(scores.values())
        confidence = scores[best_type] / total_score if total_score > 0 else 0.5

        return best_type, min(confidence, 0.95)

    def _estimate_skin_tone(self, image: np.ndarray, landmarks) -> str:
        try:
            h, w = image.shape[:2]
            landmark_list = landmarks.landmark if hasattr(landmarks, "landmark") else landmarks

            nose = landmark_list[0]
            left_cheek = landmark_list[10]
            right_cheek = landmark_list[9]

            center_x = int(nose.x * w)
            center_y = int(nose.y * h)

            radius = min(w, h) // 12
            y1 = max(0, center_y - radius)
            y2 = min(h, center_y + radius)
            x1 = max(0, center_x - radius)
            x2 = min(w, center_x + radius)

            face_region = image[y1:y2, x1:x2]

            if face_region.size == 0:
                return "medium"

            avg_color = np.mean(face_region, axis=(0, 1))
            brightness = np.mean(avg_color)

            hsv = cv2.cvtColor(np.uint8([[avg_color]]), cv2.COLOR_BGR2HSV)[0][0]
            saturation = hsv[1]

            if brightness > 200:
                return "fair"
            elif brightness > 175:
                return "light"
            elif brightness > 150:
                if saturation > 30:
                    return "light"
                return "medium"
            elif brightness > 125:
                return "medium"
            elif brightness > 100:
                if saturation > 40:
                    return "olive"
                return "tan"
            elif brightness > 75:
                return "tan"
            else:
                return "dark"

        except Exception as e:
            # FIX-CODE-004: 添加日志记录 (修复时间: 2026-03-19)
            logger.warning(f"Skin tone estimation failed: {e}")
            return "medium"

    def _predict_color_season(self, skin_tone: str) -> str:
        season_map = {
            "fair": "summer",
            "light": "spring",
            "medium": "autumn",
            "olive": "autumn",
            "tan": "winter",
            "dark": "winter"
        }
        return season_map.get(skin_tone, "summer")

    def _get_default_analysis(self) -> BodyAnalysis:
        return BodyAnalysis(
            body_type="rectangle",
            body_type_confidence=0.5,
            height_estimate=170,
            shoulder_width=40,
            bust_width=35,
            waist_width=30,
            hip_width=38,
            skin_tone="medium",
            color_season="summer",
            keypoints={},
            proportions={},
            measurements={}
        )

    def get_body_type_details(self, body_type: str) -> Dict:
        try:
            bt = BodyType(body_type)
            return self.BODY_TYPE_DESCRIPTIONS.get(bt, self.BODY_TYPE_DESCRIPTIONS[BodyType.RECTANGLE])
        except ValueError:
            return self.BODY_TYPE_DESCRIPTIONS[BodyType.RECTANGLE]


class LocalAIModels:
    """
    本地AI模型管理器
    整合多个预训练模型，支持CPU/GPU推理
    """

    def __init__(self, device: str = "auto", models_dir: str = "models", cache_size: int = 1000, cache_ttl: int = 3600):
        self.models_dir = Path(models_dir)
        self.models_dir.mkdir(parents=True, exist_ok=True)

        if device == "auto":
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device

        print(f"Using device: {self.device}")

        self.clip_model = None
        self.clip_processor = None
        self.yolo_model = None
        self.body_analyzer = None
        
        self._embedding_cache = EmbeddingCache(max_size=cache_size, ttl_seconds=cache_ttl)

        self._load_models()

    def _load_models(self):
        self._load_clip()
        self._load_yolo()
        self._load_body_analyzer()

    def _load_clip(self):
        try:
            from transformers import CLIPProcessor, CLIPModel
            import os

            os.environ["HF_ENDPOINT"] = "https://hf-mirror.com"

            local_clip_path = self.models_dir / "clip"
            model_name = "openai/clip-vit-base-patch32"
            
            if local_clip_path.exists() and any(local_clip_path.iterdir()):
                print(f"Loading CLIP model from local path: {local_clip_path}")
                self.clip_model = CLIPModel.from_pretrained(
                    str(local_clip_path)
                ).to(self.device)
                self.clip_processor = CLIPProcessor.from_pretrained(
                    str(local_clip_path)
                )
            else:
                print(f"Loading CLIP model: {model_name} (will download)")
                self.clip_model = CLIPModel.from_pretrained(
                    model_name,
                    cache_dir=str(self.models_dir / "clip_cache")
                ).to(self.device)
                self.clip_processor = CLIPProcessor.from_pretrained(
                    model_name,
                    cache_dir=str(self.models_dir / "clip_cache")
                )

            self.clip_model.eval()
            print("CLIP model loaded successfully")

        except Exception as e:
            print(f"Failed to load CLIP: {e}")
            print("Continuing without CLIP model...")
            self.clip_model = None
            self.clip_processor = None

    def _load_yolo(self):
        try:
            from ultralytics import YOLO

            user_model_path = ModelPaths.get_yolo_model_path()
            if user_model_path and user_model_path.exists():
                print(f"Loading YOLOv11 model from user path: {user_model_path}")
                self.yolo_model = YOLO(str(user_model_path))
                print("YOLOv11 model loaded successfully from user path")
                return

            model_path = self.models_dir / "yolo" / "yolo11n.pt"

            if not model_path.exists():
                print("Downloading YOLOv11 model...")
                model_path.parent.mkdir(parents=True, exist_ok=True)
                try:
                    self.yolo_model = YOLO("yolo11n.pt")
                except (ImportError, ValueError, RuntimeError) as e:
                    print(f"YOLOv11 auto-download failed ({e}), please manually download yolo11n.pt")
                    raise

            print("YOLO model loaded successfully")

        except Exception as e:
            print(f"Failed to load YOLO: {e}")
            self.yolo_model = None

    def _load_body_analyzer(self):
        self.body_analyzer = BodyShapeAnalyzer()

    def extract_image_embedding(self, image: Image.Image) -> np.ndarray:
        cache_key = self._embedding_cache.get_image_key(image)
        cached = self._embedding_cache.get(cache_key)
        if cached is not None:
            return cached
        
        if self.clip_model is None:
            print("WARNING: CLIP model not loaded, returning zero embedding")
            zero_embedding = np.zeros(512, dtype=np.float32)
            zero_embedding[0] = 1e-8
            result = zero_embedding / np.linalg.norm(zero_embedding)
            self._embedding_cache.set(cache_key, result)
            return result

        with torch.no_grad():
            inputs = self.clip_processor(images=image, return_tensors="pt")
            pixel_values = inputs["pixel_values"].to(self.device)

            outputs = self.clip_model.vision_model(pixel_values=pixel_values)
            image_features = self.clip_model.visual_projection(outputs.pooler_output)
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)

            result = image_features.cpu().numpy().flatten()
            self._embedding_cache.set(cache_key, result)
            return result

    def extract_text_embedding(self, text: str) -> np.ndarray:
        cache_key = self._embedding_cache.get_text_key(text)
        cached = self._embedding_cache.get(cache_key)
        if cached is not None:
            return cached
        
        if self.clip_model is None:
            print("WARNING: CLIP model not loaded, returning zero text embedding")
            zero_embedding = np.zeros(512, dtype=np.float32)
            zero_embedding[0] = 1e-8
            result = zero_embedding / np.linalg.norm(zero_embedding)
            self._embedding_cache.set(cache_key, result)
            return result

        with torch.no_grad():
            inputs = self.clip_processor(text=[text], return_tensors="pt", padding=True)
            input_ids = inputs["input_ids"].to(self.device)
            attention_mask = inputs["attention_mask"].to(self.device)

            text_features = self.clip_model.get_text_features(
                input_ids=input_ids,
                attention_mask=attention_mask
            )
            text_features = text_features / text_features.norm(dim=-1, keepdim=True)

            result = text_features.cpu().numpy().flatten()
            self._embedding_cache.set(cache_key, result)
            return result

    def compute_similarity(self, image: Image.Image, text: str) -> float:
        image_emb = self.extract_image_embedding(image)
        text_emb = self.extract_text_embedding(text)

        similarity = np.dot(image_emb, text_emb)
        return float(similarity)
    
    def get_image_embedding(self, image: Image.Image) -> np.ndarray:
        return self.extract_image_embedding(image)
    
    def get_text_embedding(self, text: str) -> np.ndarray:
        return self.extract_text_embedding(text)
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get embedding cache statistics"""
        return self._embedding_cache.get_stats()
    
    def clear_cache(self) -> None:
        """Clear the embedding cache"""
        self._embedding_cache.clear()

    def classify_clothing_style(self, image: Image.Image) -> Dict[str, float]:
        style_prompts = [
            "casual clothing",
            "formal business attire",
            "sporty athletic wear",
            "streetwear urban fashion",
            "minimalist simple clothing",
            "bohemian boho style",
            "vintage retro fashion",
            "romantic feminine style",
            "edgy punk rock fashion",
            "classic elegant clothing"
        ]

        if self.clip_model is None:
            return {s.split()[0]: 0.1 for s in style_prompts}

        with torch.no_grad():
            image_inputs = self.clip_processor(images=image, return_tensors="pt")
            pixel_values = image_inputs["pixel_values"].to(self.device)

            vision_outputs = self.clip_model.vision_model(pixel_values=pixel_values)
            image_features = self.clip_model.visual_projection(vision_outputs.pooler_output)
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)

            text_inputs = self.clip_processor(text=style_prompts, return_tensors="pt", padding=True)
            input_ids = text_inputs["input_ids"].to(self.device)
            attention_mask = text_inputs["attention_mask"].to(self.device)

            text_outputs = self.clip_model.text_model(
                input_ids=input_ids,
                attention_mask=attention_mask
            )
            text_features = self.clip_model.text_projection(text_outputs.pooler_output)
            text_features = text_features / text_features.norm(dim=-1, keepdim=True)

            logits = (image_features @ text_features.T).softmax(dim=-1)

            style_names = ["casual", "formal", "sporty", "streetwear",
                          "minimalist", "bohemian", "vintage", "romantic",
                          "edgy", "classic"]

            return {name: float(logits[0][i]) for i, name in enumerate(style_names)}

    def analyze_body_type(self, image: Image.Image) -> BodyAnalysis:
        return self.body_analyzer.analyze_body_type(image)

    def detect_clothing(self, image: Image.Image) -> List[Dict]:
        if self.yolo_model is None:
            return []

        results = self.yolo_model(np.array(image))

        clothing_items = []

        for result in results:
            boxes = result.boxes
            for box in boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])

                if conf > 0.5:
                    x1, y1, x2, y2 = box.xyxy[0].tolist()

                    clothing_items.append({
                        "bbox": [x1, y1, x2, y2],
                        "confidence": conf,
                        "class_id": cls_id
                    })

        return clothing_items

    def analyze_clothing_item(self, image: Image.Image) -> ClothingAnalysis:
        embedding = self.extract_image_embedding(image)
        style_scores = self.classify_clothing_style(image)

        top_styles = sorted(style_scores.items(), key=lambda x: x[1], reverse=True)[:3]
        styles = [s[0] for s in top_styles if s[1] > 0.1]

        colors = self._extract_colors(image)

        category = self._classify_category(image)

        occasions = self._predict_occasions(styles)
        seasons = self._predict_seasons(colors, styles)

        attributes = self._extract_all_attributes(image, category)

        return ClothingAnalysis(
            category=category,
            style=styles if styles else ["casual"],
            colors=colors,
            occasions=occasions,
            seasons=seasons,
            attributes={
                "style_scores": style_scores,
                "dominant_colors": colors[:3],
                **attributes
            },
            embedding=embedding,
            confidence=float(max(style_scores.values())) if style_scores else 0.5
        )

    def _extract_all_attributes(self, image: Image.Image, category: str) -> Dict[str, Any]:
        attributes = {}

        attributes['neckline'] = self._classify_neckline(image)
        attributes['sleeve'] = self._classify_sleeve(image)
        attributes['pattern'] = self._classify_pattern(image)
        attributes['length'] = self._classify_length(image, category)
        attributes['fit'] = self._classify_fit(image)
        attributes['material'] = self._classify_material(image)
        attributes['closure'] = self._classify_closure(image)
        attributes['details'] = self._detect_details(image)

        return attributes

    def _classify_neckline(self, image: Image.Image) -> Dict[str, Any]:
        neckline_prompts = [
            "a photo of clothing with V-neck neckline",
            "a photo of clothing with round neck crew neck",
            "a photo of clothing with scoop neck deep neckline",
            "a photo of clothing with boat neck off-shoulder neckline",
            "a photo of clothing with collar polo neck",
            "a photo of clothing with turtleneck high neck",
            "a photo of clothing with square neck neckline",
            "a photo of clothing with sweetheart neckline",
            "a photo of clothing with halter neck",
            "a photo of clothing with one shoulder asymmetric neckline",
        ]

        if self.clip_model is None:
            return {"type": "unknown", "confidence": 0}

        with torch.no_grad():
            image_inputs = self.clip_processor(images=image, return_tensors="pt")
            pixel_values = image_inputs["pixel_values"].to(self.device)

            vision_outputs = self.clip_model.vision_model(pixel_values=pixel_values)
            image_features = self.clip_model.visual_projection(vision_outputs.pooler_output)
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)

            text_inputs = self.clip_processor(text=neckline_prompts, return_tensors="pt", padding=True)
            input_ids = text_inputs["input_ids"].to(self.device)
            attention_mask = text_inputs["attention_mask"].to(self.device)

            text_outputs = self.clip_model.text_model(
                input_ids=input_ids,
                attention_mask=attention_mask
            )
            text_features = self.clip_model.text_projection(text_outputs.pooler_output)
            text_features = text_features / text_features.norm(dim=-1, keepdim=True)

            logits = (image_features @ text_features.T).softmax(dim=-1)

            neckline_types = ["v_neck", "round_neck", "scoop_neck", "boat_neck", 
                            "collar", "turtleneck", "square_neck", "sweetheart", 
                            "halter", "one_shoulder"]

            scores = {neckline_types[i]: float(logits[0][i]) for i in range(len(neckline_types))}
            best_idx = logits.argmax().item()
            best_type = neckline_types[best_idx]
            confidence = float(logits[0][best_idx])

            return {
                "type": best_type,
                "confidence": confidence,
                "all_scores": scores
            }

    def _classify_sleeve(self, image: Image.Image) -> Dict[str, Any]:
        sleeve_prompts = [
            "a photo of clothing with long sleeves",
            "a photo of clothing with short sleeves",
            "a photo of clothing with sleeveless no sleeves",
            "a photo of clothing with three quarter sleeves",
            "a photo of clothing with cap sleeves",
            "a photo of clothing with bell sleeves",
            "a photo of clothing with puff sleeves",
            "a photo of clothing with flutter sleeves",
        ]

        if self.clip_model is None:
            return {"type": "unknown", "confidence": 0}

        with torch.no_grad():
            image_inputs = self.clip_processor(images=image, return_tensors="pt")
            pixel_values = image_inputs["pixel_values"].to(self.device)

            vision_outputs = self.clip_model.vision_model(pixel_values=pixel_values)
            image_features = self.clip_model.visual_projection(vision_outputs.pooler_output)
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)

            text_inputs = self.clip_processor(text=sleeve_prompts, return_tensors="pt", padding=True)
            input_ids = text_inputs["input_ids"].to(self.device)
            attention_mask = text_inputs["attention_mask"].to(self.device)

            text_outputs = self.clip_model.text_model(
                input_ids=input_ids,
                attention_mask=attention_mask
            )
            text_features = self.clip_model.text_projection(text_outputs.pooler_output)
            text_features = text_features / text_features.norm(dim=-1, keepdim=True)

            logits = (image_features @ text_features.T).softmax(dim=-1)

            sleeve_types = ["long_sleeve", "short_sleeve", "sleeveless", 
                          "three_quarter", "cap_sleeve", "bell_sleeve", 
                          "puff_sleeve", "flutter_sleeve"]

            scores = {sleeve_types[i]: float(logits[0][i]) for i in range(len(sleeve_types))}
            best_idx = logits.argmax().item()
            best_type = sleeve_types[best_idx]
            confidence = float(logits[0][best_idx])

            return {
                "type": best_type,
                "confidence": confidence,
                "all_scores": scores
            }

    def _classify_pattern(self, image: Image.Image) -> Dict[str, Any]:
        pattern_prompts = [
            "a photo of solid color plain clothing",
            "a photo of striped clothing",
            "a photo of plaid checkered clothing",
            "a photo of floral pattern clothing",
            "a photo of polka dot pattern clothing",
            "a photo of geometric pattern clothing",
            "a photo of animal print clothing",
            "a photo of paisley pattern clothing",
            "a photo of tie dye pattern clothing",
            "a photo of embroidered pattern clothing",
        ]

        if self.clip_model is None:
            return {"type": "unknown", "confidence": 0}

        with torch.no_grad():
            image_inputs = self.clip_processor(images=image, return_tensors="pt")
            pixel_values = image_inputs["pixel_values"].to(self.device)

            vision_outputs = self.clip_model.vision_model(pixel_values=pixel_values)
            image_features = self.clip_model.visual_projection(vision_outputs.pooler_output)
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)

            text_inputs = self.clip_processor(text=pattern_prompts, return_tensors="pt", padding=True)
            input_ids = text_inputs["input_ids"].to(self.device)
            attention_mask = text_inputs["attention_mask"].to(self.device)

            text_outputs = self.clip_model.text_model(
                input_ids=input_ids,
                attention_mask=attention_mask
            )
            text_features = self.clip_model.text_projection(text_outputs.pooler_output)
            text_features = text_features / text_features.norm(dim=-1, keepdim=True)

            logits = (image_features @ text_features.T).softmax(dim=-1)

            pattern_types = ["solid", "striped", "plaid", "floral", 
                           "polka_dot", "geometric", "animal_print", 
                           "paisley", "tie_dye", "embroidered"]

            scores = {pattern_types[i]: float(logits[0][i]) for i in range(len(pattern_types))}
            best_idx = logits.argmax().item()
            best_type = pattern_types[best_idx]
            confidence = float(logits[0][best_idx])

            return {
                "type": best_type,
                "confidence": confidence,
                "all_scores": scores
            }

    def _classify_length(self, image: Image.Image, category: str) -> Dict[str, Any]:
        if category in ["footwear", "accessories"]:
            return {"type": "not_applicable", "confidence": 1.0}

        length_prompts = [
            "a photo of mini short length clothing",
            "a photo of midi medium length clothing",
            "a photo of maxi long length clothing",
            "a photo of knee length clothing",
            "a photo of ankle length clothing",
            "a photo of cropped short clothing",
        ]

        if self.clip_model is None:
            return {"type": "unknown", "confidence": 0}

        with torch.no_grad():
            image_inputs = self.clip_processor(images=image, return_tensors="pt")
            pixel_values = image_inputs["pixel_values"].to(self.device)

            vision_outputs = self.clip_model.vision_model(pixel_values=pixel_values)
            image_features = self.clip_model.visual_projection(vision_outputs.pooler_output)
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)

            text_inputs = self.clip_processor(text=length_prompts, return_tensors="pt", padding=True)
            input_ids = text_inputs["input_ids"].to(self.device)
            attention_mask = text_inputs["attention_mask"].to(self.device)

            text_outputs = self.clip_model.text_model(
                input_ids=input_ids,
                attention_mask=attention_mask
            )
            text_features = self.clip_model.text_projection(text_outputs.pooler_output)
            text_features = text_features / text_features.norm(dim=-1, keepdim=True)

            logits = (image_features @ text_features.T).softmax(dim=-1)

            length_types = ["mini", "midi", "maxi", "knee_length", "ankle_length", "cropped"]

            scores = {length_types[i]: float(logits[0][i]) for i in range(len(length_types))}
            best_idx = logits.argmax().item()
            best_type = length_types[best_idx]
            confidence = float(logits[0][best_idx])

            return {
                "type": best_type,
                "confidence": confidence,
                "all_scores": scores
            }

    def _classify_fit(self, image: Image.Image) -> Dict[str, Any]:
        fit_prompts = [
            "a photo of slim fit tight clothing",
            "a photo of regular fit clothing",
            "a photo of loose fit oversized clothing",
            "a photo of fitted bodycon clothing",
            "a photo of relaxed fit clothing",
            "a photo of tailored fit clothing",
        ]

        if self.clip_model is None:
            return {"type": "unknown", "confidence": 0}

        with torch.no_grad():
            image_inputs = self.clip_processor(images=image, return_tensors="pt")
            pixel_values = image_inputs["pixel_values"].to(self.device)

            vision_outputs = self.clip_model.vision_model(pixel_values=pixel_values)
            image_features = self.clip_model.visual_projection(vision_outputs.pooler_output)
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)

            text_inputs = self.clip_processor(text=fit_prompts, return_tensors="pt", padding=True)
            input_ids = text_inputs["input_ids"].to(self.device)
            attention_mask = text_inputs["attention_mask"].to(self.device)

            text_outputs = self.clip_model.text_model(
                input_ids=input_ids,
                attention_mask=attention_mask
            )
            text_features = self.clip_model.text_projection(text_outputs.pooler_output)
            text_features = text_features / text_features.norm(dim=-1, keepdim=True)

            logits = (image_features @ text_features.T).softmax(dim=-1)

            fit_types = ["slim_fit", "regular_fit", "loose_fit", "fitted", "relaxed_fit", "tailored"]

            scores = {fit_types[i]: float(logits[0][i]) for i in range(len(fit_types))}
            best_idx = logits.argmax().item()
            best_type = fit_types[best_idx]
            confidence = float(logits[0][best_idx])

            return {
                "type": best_type,
                "confidence": confidence,
                "all_scores": scores
            }

    def _classify_material(self, image: Image.Image) -> Dict[str, Any]:
        material_prompts = [
            "a photo of cotton fabric clothing",
            "a photo of silk fabric clothing",
            "a photo of denim jeans fabric clothing",
            "a photo of wool fabric clothing",
            "a photo of linen fabric clothing",
            "a photo of polyester synthetic fabric clothing",
            "a photo of leather material clothing",
            "a photo of chiffon sheer fabric clothing",
            "a photo of velvet fabric clothing",
            "a photo of knit sweater fabric clothing",
        ]

        if self.clip_model is None:
            return {"type": "unknown", "confidence": 0}

        with torch.no_grad():
            image_inputs = self.clip_processor(images=image, return_tensors="pt")
            pixel_values = image_inputs["pixel_values"].to(self.device)

            vision_outputs = self.clip_model.vision_model(pixel_values=pixel_values)
            image_features = self.clip_model.visual_projection(vision_outputs.pooler_output)
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)

            text_inputs = self.clip_processor(text=material_prompts, return_tensors="pt", padding=True)
            input_ids = text_inputs["input_ids"].to(self.device)
            attention_mask = text_inputs["attention_mask"].to(self.device)

            text_outputs = self.clip_model.text_model(
                input_ids=input_ids,
                attention_mask=attention_mask
            )
            text_features = self.clip_model.text_projection(text_outputs.pooler_output)
            text_features = text_features / text_features.norm(dim=-1, keepdim=True)

            logits = (image_features @ text_features.T).softmax(dim=-1)

            material_types = ["cotton", "silk", "denim", "wool", "linen", 
                            "polyester", "leather", "chiffon", "velvet", "knit"]

            scores = {material_types[i]: float(logits[0][i]) for i in range(len(material_types))}
            best_idx = logits.argmax().item()
            best_type = material_types[best_idx]
            confidence = float(logits[0][best_idx])

            return {
                "type": best_type,
                "confidence": confidence,
                "all_scores": scores
            }

    def _classify_closure(self, image: Image.Image) -> Dict[str, Any]:
        closure_prompts = [
            "a photo of clothing with buttons closure",
            "a photo of clothing with zipper closure",
            "a photo of clothing with pullover no closure",
            "a photo of clothing with tie wrap closure",
            "a photo of clothing with snap buttons closure",
            "a photo of clothing with hook and eye closure",
        ]

        if self.clip_model is None:
            return {"type": "unknown", "confidence": 0}

        with torch.no_grad():
            image_inputs = self.clip_processor(images=image, return_tensors="pt")
            pixel_values = image_inputs["pixel_values"].to(self.device)

            vision_outputs = self.clip_model.vision_model(pixel_values=pixel_values)
            image_features = self.clip_model.visual_projection(vision_outputs.pooler_output)
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)

            text_inputs = self.clip_processor(text=closure_prompts, return_tensors="pt", padding=True)
            input_ids = text_inputs["input_ids"].to(self.device)
            attention_mask = text_inputs["attention_mask"].to(self.device)

            text_outputs = self.clip_model.text_model(
                input_ids=input_ids,
                attention_mask=attention_mask
            )
            text_features = self.clip_model.text_projection(text_outputs.pooler_output)
            text_features = text_features / text_features.norm(dim=-1, keepdim=True)

            logits = (image_features @ text_features.T).softmax(dim=-1)

            closure_types = ["buttons", "zipper", "pullover", "tie_wrap", "snap_buttons", "hook_eye"]

            scores = {closure_types[i]: float(logits[0][i]) for i in range(len(closure_types))}
            best_idx = logits.argmax().item()
            best_type = closure_types[best_idx]
            confidence = float(logits[0][best_idx])

            return {
                "type": best_type,
                "confidence": confidence,
                "all_scores": scores
            }

    def _detect_details(self, image: Image.Image) -> Dict[str, Any]:
        detail_prompts = [
            "a photo of clothing with pockets",
            "a photo of clothing with belt",
            "a photo of clothing with ruffles",
            "a photo of clothing with pleats",
            "a photo of clothing with lace trim",
            "a photo of clothing with sequins embellishment",
            "a photo of clothing with embroidery details",
            "a photo of clothing with cutout details",
            "a photo of clothing with fringe details",
            "a photo of clothing with bow tie detail",
        ]

        if self.clip_model is None:
            return {"detected": [], "scores": {}}

        with torch.no_grad():
            image_inputs = self.clip_processor(images=image, return_tensors="pt")
            pixel_values = image_inputs["pixel_values"].to(self.device)

            vision_outputs = self.clip_model.vision_model(pixel_values=pixel_values)
            image_features = self.clip_model.visual_projection(vision_outputs.pooler_output)
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)

            text_inputs = self.clip_processor(text=detail_prompts, return_tensors="pt", padding=True)
            input_ids = text_inputs["input_ids"].to(self.device)
            attention_mask = text_inputs["attention_mask"].to(self.device)

            text_outputs = self.clip_model.text_model(
                input_ids=input_ids,
                attention_mask=attention_mask
            )
            text_features = self.clip_model.text_projection(text_outputs.pooler_output)
            text_features = text_features / text_features.norm(dim=-1, keepdim=True)

            logits = (image_features @ text_features.T).softmax(dim=-1)

            detail_types = ["pockets", "belt", "ruffles", "pleats", "lace", 
                          "sequins", "embroidery", "cutout", "fringe", "bow"]

            scores = {detail_types[i]: float(logits[0][i]) for i in range(len(detail_types))}
            detected = [detail_types[i] for i in range(len(detail_types)) if float(logits[0][i]) > 0.15]

            return {
                "detected": detected,
                "scores": scores
            }

    def _extract_colors(self, image: Image.Image, n_colors: int = 5) -> List[str]:
        image_array = np.array(image)
        pixels = image_array.reshape(-1, 3)

        pixels = pixels[::10]

        try:
            from sklearn.cluster import KMeans

            kmeans = KMeans(n_clusters=n_colors, random_state=42, n_init=10)
            kmeans.fit(pixels)

            colors = kmeans.cluster_centers_

            color_names = []
            for color in colors:
                color_name = self._rgb_to_color_name(color)
                color_names.append(color_name)

            return color_names

        except Exception as e:
            # FIX-CODE-004: 添加日志记录 (修复时间: 2026-03-19)
            logger.warning(f"Color extraction failed: {e}")
            return ["unknown"]

    def _rgb_to_color_name(self, rgb: np.ndarray) -> str:
        r, g, b = rgb

        h, s, v = self._rgb_to_hsv(r, g, b)

        if s < 0.1:
            if v < 0.2:
                return "black"
            elif v > 0.8:
                return "white"
            else:
                return "gray"

        if h < 15 or h >= 345:
            return "red"
        elif h < 45:
            return "orange"
        elif h < 75:
            return "yellow"
        elif h < 150:
            return "green"
        elif h < 210:
            return "cyan"
        elif h < 270:
            return "blue"
        elif h < 315:
            return "purple"
        else:
            return "pink"

    def _rgb_to_hsv(self, r: float, g: float, b: float) -> Tuple[float, float, float]:
        r, g, b = r / 255, g / 255, b / 255

        max_c = max(r, g, b)
        min_c = min(r, g, b)
        diff = max_c - min_c

        if diff == 0:
            h = 0
        elif max_c == r:
            h = (60 * ((g - b) / diff) + 360) % 360
        elif max_c == g:
            h = (60 * ((b - r) / diff) + 120) % 360
        else:
            h = (60 * ((r - g) / diff) + 240) % 360

        s = 0 if max_c == 0 else diff / max_c
        v = max_c

        return h, s, v

    def _classify_category(self, image: Image.Image) -> str:
        category_prompts = [
            "a photo of a top shirt blouse",
            "a photo of pants trousers jeans skirt",
            "a photo of a dress",
            "a photo of a jacket coat blazer",
            "a photo of shoes sneakers boots heels",
            "a photo of accessories bag hat scarf"
        ]

        if self.clip_model is None:
            return "tops"

        with torch.no_grad():
            image_inputs = self.clip_processor(images=image, return_tensors="pt")
            pixel_values = image_inputs["pixel_values"].to(self.device)

            vision_outputs = self.clip_model.vision_model(pixel_values=pixel_values)
            image_features = self.clip_model.visual_projection(vision_outputs.pooler_output)
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)

            text_inputs = self.clip_processor(text=category_prompts, return_tensors="pt", padding=True)
            input_ids = text_inputs["input_ids"].to(self.device)
            attention_mask = text_inputs["attention_mask"].to(self.device)

            text_outputs = self.clip_model.text_model(
                input_ids=input_ids,
                attention_mask=attention_mask
            )
            text_features = self.clip_model.text_projection(text_outputs.pooler_output)
            text_features = text_features / text_features.norm(dim=-1, keepdim=True)

            logits = (image_features @ text_features.T).softmax(dim=-1)

            categories = ["tops", "bottoms", "dresses", "outerwear", "footwear", "accessories"]
            idx = logits.argmax().item()

            return categories[idx]

    def _predict_occasions(self, styles: List[str]) -> List[str]:
        style_occasion_map = {
            "casual": ["daily", "weekend", "travel"],
            "formal": ["work", "meeting", "wedding"],
            "sporty": ["gym", "sport", "outdoor"],
            "streetwear": ["daily", "party", "weekend"],
            "minimalist": ["work", "daily", "meeting"],
            "bohemian": ["weekend", "festival", "travel"],
            "vintage": ["party", "date", "weekend"],
            "romantic": ["date", "party", "wedding"],
            "edgy": ["party", "concert", "nightlife"],
            "classic": ["work", "meeting", "formal"]
        }

        occasions = set()
        for style in styles:
            if style in style_occasion_map:
                occasions.update(style_occasion_map[style])

        return list(occasions) if occasions else ["daily"]

    def _predict_seasons(self, colors: List[str], styles: List[str]) -> List[str]:
        warm_colors = {"red", "orange", "yellow", "brown", "beige"}
        cool_colors = {"blue", "green", "purple", "gray", "white"}

        has_warm = any(c in warm_colors for c in colors)
        has_cool = any(c in cool_colors for c in colors)

        seasons = []

        if has_warm:
            seasons.extend(["spring", "autumn"])
        if has_cool:
            seasons.extend(["summer", "winter"])

        if not seasons:
            seasons = ["spring", "summer", "autumn", "winter"]

        return list(set(seasons))

    def compute_compatibility(self, item1: ClothingAnalysis, item2: ClothingAnalysis) -> float:
        emb_sim = np.dot(item1.embedding, item2.embedding)

        style_overlap = len(set(item1.style) & set(item2.style)) / max(len(item1.style), len(item2.style), 1)

        occasion_overlap = len(set(item1.occasions) & set(item2.occasions)) / max(len(item1.occasions), len(item2.occasions), 1)

        season_overlap = len(set(item1.seasons) & set(item2.seasons)) / max(len(item1.seasons), len(item2.seasons), 1)

        compatibility = (
            emb_sim * 0.4 +
            style_overlap * 0.25 +
            occasion_overlap * 0.2 +
            season_overlap * 0.15
        )

        return float(compatibility)

    def recommend_outfit(
        self,
        base_item: ClothingAnalysis,
        candidates: List[ClothingAnalysis],
        user_body: Optional[BodyAnalysis] = None,
        occasion: Optional[str] = None,
        top_k: int = 5
    ) -> List[OutfitRecommendation]:
        recommendations = []

        for candidate in candidates:
            if candidate.category == base_item.category:
                continue

            compatibility = self.compute_compatibility(base_item, candidate)

            style_match = len(set(base_item.style) & set(candidate.style)) / max(len(base_item.style), len(candidate.style), 1)

            occasion_match = 1.0
            if occasion:
                occasion_match = 1.0 if occasion in candidate.occasions else 0.5

            body_match = 1.0
            if user_body:
                body_match = self._compute_body_match(candidate, user_body)

            final_score = (
                compatibility * 0.4 +
                style_match * 0.2 +
                occasion_match * 0.2 +
                body_match * 0.2
            )

            reasons = self._generate_recommendation_reasons(
                base_item, candidate, compatibility, style_match
            )

            recommendations.append(OutfitRecommendation(
                items=[{"item": candidate, "score": final_score}],
                compatibility_score=compatibility,
                style_match=style_match,
                occasion_match=occasion_match,
                reasons=reasons
            ))

        recommendations.sort(key=lambda x: x.compatibility_score, reverse=True)

        return recommendations[:top_k]

    def _compute_body_match(self, item: ClothingAnalysis, body: BodyAnalysis) -> float:
        body_style_map = {
            "rectangle": ["fitted", "structured", "layered"],
            "triangle": ["a-line", "boat-neck", "off-shoulder"],
            "inverted_triangle": ["v-neck", "wide-leg", "flared"],
            "hourglass": ["fitted", "wrap", "belted"],
            "oval": ["v-neck", "a-line", "empire"]
        }

        match_score = 0.5

        if body.color_season in item.seasons:
            match_score += 0.2

        return min(match_score, 1.0)

    def _generate_recommendation_reasons(
        self,
        item1: ClothingAnalysis,
        item2: ClothingAnalysis,
        compatibility: float,
        style_match: float
    ) -> List[str]:
        reasons = []

        if compatibility > 0.7:
            reasons.append("整体风格高度协调")

        if style_match > 0.5:
            common_styles = set(item1.style) & set(item2.style)
            if common_styles:
                reasons.append(f"风格匹配: {', '.join(common_styles)}")

        common_occasions = set(item1.occasions) & set(item2.occasions)
        if common_occasions:
            reasons.append(f"适合场合: {', '.join(list(common_occasions)[:2])}")

        common_seasons = set(item1.seasons) & set(item2.seasons)
        if common_seasons:
            reasons.append(f"适合季节: {', '.join(list(common_seasons)[:2])}")

        if not reasons:
            reasons.append("风格互补搭配")

        return reasons[:3]


class AIModelServer:
    """AI模型服务接口"""

    def __init__(self, device: str = "auto"):
        self.models = LocalAIModels(device=device)

    def analyze_image(self, image_path: str) -> Dict:
        """分析图像"""
        image = Image.open(image_path).convert("RGB")

        clothing_analysis = self.models.analyze_clothing_item(image)
        body_analysis = self.models.analyze_body_type(image)

        return {
            "clothing": {
                "category": clothing_analysis.category,
                "style": clothing_analysis.style,
                "colors": clothing_analysis.colors,
                "occasions": clothing_analysis.occasions,
                "seasons": clothing_analysis.seasons,
                "confidence": clothing_analysis.confidence,
            },
            "body": {
                "body_type": body_analysis.body_type,
                "body_type_confidence": body_analysis.body_type_confidence,
                "skin_tone": body_analysis.skin_tone,
                "color_season": body_analysis.color_season,
                "proportions": body_analysis.proportions,
                "measurements": body_analysis.measurements,
            },
            "embedding": clothing_analysis.embedding.tolist()
        }

    def compute_similarity(self, image_path: str, text: str) -> float:
        """计算图像-文本相似度"""
        image = Image.open(image_path).convert("RGB")
        return self.models.compute_similarity(image, text)

    def get_embedding(self, image_path: str) -> List[float]:
        """获取图像嵌入向量"""
        image = Image.open(image_path).convert("RGB")
        embedding = self.models.extract_image_embedding(image)
        return embedding.tolist()

    def recommend(
        self,
        query_image_path: str,
        candidate_paths: List[str],
        occasion: Optional[str] = None,
        top_k: int = 10
    ) -> List[Dict]:
        """推荐搭配"""
        query_image = Image.open(query_image_path).convert("RGB")
        query_analysis = self.models.analyze_clothing_item(query_image)

        candidates = []
        for path in candidate_paths:
            try:
                img = Image.open(path).convert("RGB")
                analysis = self.models.analyze_clothing_item(img)
                candidates.append(analysis)
            except Exception as e:
                print(f"Error processing {path}: {e}")

        recommendations = self.models.recommend_outfit(
            query_analysis,
            candidates,
            occasion=occasion,
            top_k=top_k
        )

        return [
            {
                "compatibility_score": r.compatibility_score,
                "style_match": r.style_match,
                "occasion_match": r.occasion_match,
                "reasons": r.reasons
            }
            for r in recommendations
        ]


def batch_process_images(
    image_dir: str,
    output_file: str,
    device: str = "auto"
):
    """批量处理图像并保存嵌入向量"""
    server = AIModelServer(device=device)

    image_dir = Path(image_dir)
    results = {}

    image_files = list(image_dir.glob("*.jpg")) + list(image_dir.glob("*.png"))

    print(f"Processing {len(image_files)} images...")

    for image_path in image_files:
        try:
            result = server.analyze_image(str(image_path))
            results[image_path.stem] = result
            print(f"Processed: {image_path.name}")
        except Exception as e:
            print(f"Error processing {image_path}: {e}")

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\nSaved results to {output_file}")
    print(f"Total processed: {len(results)} images")

    return results


if __name__ == "__main__":
    server = AIModelServer()

    print("\n" + "="*50)
    print("AI模型服务已初始化")
    print("="*50)

    test_image = "data/raw/images/1163.jpg"
    if os.path.exists(test_image):
        print(f"\n分析测试图像: {test_image}")
        result = server.analyze_image(test_image)
        print(json.dumps(result["clothing"], indent=2, ensure_ascii=False))
        print(f"\n体型分析: {result['body']}")
