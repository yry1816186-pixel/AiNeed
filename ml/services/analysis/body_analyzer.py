"""
增强版体型分析与服装适配模块
基于MediaPipe Pose提取33个身体关键点，计算身体比例，推断体型分类
提供服装适配建议算法，与推荐系统集成

Author: xuno ML Team
Version: 2.0.0
"""

from __future__ import annotations

import os
import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Tuple, Any, Union
from pathlib import Path

import numpy as np
from PIL import Image

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class BodyType(Enum):
    """体型类型枚举"""
    RECTANGLE = "rectangle"          # H型/矩形
    HOURGLASS = "hourglass"          # X型/沙漏
    TRIANGLE = "triangle"            # A型/梨形
    INVERTED_TRIANGLE = "inverted_triangle"  # Y型/倒三角
    OVAL = "oval"                    # O型/椭圆


class SkinTone(Enum):
    """肤色类型枚举"""
    FAIR = "fair"
    LIGHT = "light"
    MEDIUM = "medium"
    OLIVE = "olive"
    TAN = "tan"
    DARK = "dark"


class ColorSeason(Enum):
    """色彩季型枚举"""
    SPRING = "spring"
    SUMMER = "summer"
    AUTUMN = "autumn"
    WINTER = "winter"


class ClothingCategory(Enum):
    """服装类别枚举"""
    TOP = "top"                      # 上装
    BOTTOM = "bottom"                # 下装
    DRESS = "dress"                  # 连衣裙
    OUTERWEAR = "outerwear"          # 外套
    SHOES = "shoes"                  # 鞋履
    ACCESSORY = "accessory"          # 配饰


@dataclass
class Keypoint:
    """身体关键点数据结构"""
    x: float
    y: float
    z: float = 0.0
    visibility: float = 1.0
    name: str = ""


@dataclass
class BodyProportions:
    """身体比例数据结构"""
    shoulder_to_hip_ratio: float = 1.0      # 肩臀比
    waist_to_hip_ratio: float = 0.8          # 腰臀比
    waist_to_shoulder_ratio: float = 0.8     # 腰肩比
    bust_to_waist_ratio: float = 1.0         # 胸腰比
    bust_to_hip_ratio: float = 0.9           # 胸臀比
    leg_to_torso_ratio: float = 1.0          # 腿身比
    arm_to_height_ratio: float = 0.4         # 臂身比

    def to_dict(self) -> Dict[str, float]:
        """转换为字典格式"""
        return {
            "shoulder_to_hip_ratio": self.shoulder_to_hip_ratio,
            "waist_to_hip_ratio": self.waist_to_hip_ratio,
            "waist_to_shoulder_ratio": self.waist_to_shoulder_ratio,
            "bust_to_waist_ratio": self.bust_to_waist_ratio,
            "bust_to_hip_ratio": self.bust_to_hip_ratio,
            "leg_to_torso_ratio": self.leg_to_torso_ratio,
            "arm_to_height_ratio": self.arm_to_height_ratio,
        }


@dataclass
class BodyMeasurements:
    """身体测量数据结构"""
    shoulder_width: float = 40.0      # 肩宽 (cm)
    bust_width: float = 35.0          # 胸宽 (cm)
    waist_width: float = 30.0         # 腰宽 (cm)
    hip_width: float = 38.0           # 臀宽 (cm)
    torso_height: float = 50.0        # 躯干高度 (pixels)
    leg_height: float = 80.0          # 腿长 (pixels)
    arm_length: float = 60.0          # 手臂长度 (pixels)
    estimated_height: float = 170.0   # 估算身高 (cm)

    def to_dict(self) -> Dict[str, float]:
        """转换为字典格式"""
        return {
            "shoulder_width": self.shoulder_width,
            "bust_width": self.bust_width,
            "waist_width": self.waist_width,
            "hip_width": self.hip_width,
            "torso_height": self.torso_height,
            "leg_height": self.leg_height,
            "arm_length": self.arm_length,
            "estimated_height": self.estimated_height,
        }


@dataclass
class BodyProfile:
    """完整的身体档案数据结构"""
    body_type: BodyType
    confidence: float
    keypoints: Dict[str, Keypoint]
    proportions: BodyProportions
    measurements: BodyMeasurements
    skin_tone: SkinTone = SkinTone.MEDIUM
    color_season: ColorSeason = ColorSeason.AUTUMN

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "body_type": self.body_type.value,
            "confidence": self.confidence,
            "keypoints": {k: {"x": v.x, "y": v.y, "z": v.z, "visibility": v.visibility}
                         for k, v in self.keypoints.items()},
            "proportions": self.proportions.to_dict(),
            "measurements": self.measurements.to_dict(),
            "skin_tone": self.skin_tone.value,
            "color_season": self.color_season.value,
        }


@dataclass
class ClothingAdaptation:
    """服装适配建议数据结构"""
    suitable_styles: List[str] = field(default_factory=list)
    avoid_styles: List[str] = field(default_factory=list)
    emphasis: str = ""
    styling_tips: List[str] = field(default_factory=list)
    best_cuts: List[str] = field(default_factory=list)
    best_patterns: List[str] = field(default_factory=list)
    best_colors: List[str] = field(default_factory=list)


@dataclass
class FitScore:
    """适配分数数据结构"""
    overall_score: float
    body_type_score: float
    style_match_score: float
    color_match_score: float
    cut_match_score: float
    details: Dict[str, Any] = field(default_factory=dict)


# 体型分类阈值配置
BODY_TYPE_THRESHOLDS = {
    "shoulder_hip_ratio": {
        "hourglass_range": (0.95, 1.05),
        "triangle_threshold": 0.92,
        "inverted_triangle_threshold": 1.08,
    },
    "waist_shoulder_ratio": {
        "hourglass_max": 0.72,
        "rectangle_min": 0.75,
        "rectangle_max": 0.85,
        "oval_min": 0.88,
    },
    "waist_hip_ratio": {
        "hourglass_max": 0.75,
        "rectangle_max": 0.82,
        "oval_min": 0.85,
    }
}

# 体型适配规则配置
BODY_TYPE_ADAPTATIONS = {
    BodyType.RECTANGLE: {
        "name": "H型（矩形）",
        "description": "肩、腰、臀宽度相近，身体线条平直",
        "characteristics": ["肩宽与臀宽相近", "腰部曲线不明显", "腿部通常较长"],
        "suitable_styles": ["收腰设计", "层次搭配", "V领上衣", "A字裙", "高腰裤", "有垫肩的外套"],
        "avoid_styles": ["直筒连衣裙", "无腰线款式", "过于宽松的直筒型"],
        "emphasis": "创造腰线，增加层次感",
        "styling_tips": [
            "选择有腰线设计的单品，创造曲线感",
            "上身或下身选择有量感的款式增加层次",
            "高腰设计可以优化比例",
            "层叠穿搭增加视觉层次",
            "利用腰带或收腰设计强调腰线"
        ],
        "best_cuts": ["收腰连衣裙", "A字裙", "高腰裤", "有结构感的外套"],
        "best_patterns": ["竖条纹", "几何图案", "层次感印花"],
        "best_colors": ["深浅对比色搭配", "同色系渐变"],
    },
    BodyType.HOURGLASS: {
        "name": "X型（沙漏）",
        "description": "肩臀相近，腰部明显纤细，曲线明显",
        "characteristics": ["肩宽与臀宽相近", "腰部明显收紧", "胸部丰满"],
        "suitable_styles": ["收腰款式", "铅笔裙", "高腰裤", "裹身裙", "合身衬衫", "包身裙"],
        "avoid_styles": ["宽松直筒款", "无腰线设计", "过于宽松的上衣", "低腰裤"],
        "emphasis": "突出腰线，展现曲线",
        "styling_tips": [
            "选择收腰设计的单品展示曲线",
            "合身剪裁比宽松款更显身材优势",
            "腰带是很好的配饰选择",
            "避免过于宽松掩盖腰线",
            "选择贴合但不紧绷的款式"
        ],
        "best_cuts": ["收腰连衣裙", "高腰裤", "铅笔裙", "合身衬衫"],
        "best_patterns": ["花卉图案", "波点", "素色"],
        "best_colors": ["强调腰线的对比色", "单色系搭配"],
    },
    BodyType.TRIANGLE: {
        "name": "A型（梨形）",
        "description": "臀部比肩宽，下半身较丰满",
        "characteristics": ["肩部较窄", "臀部较宽", "大腿较粗"],
        "suitable_styles": ["垫肩设计", "亮色上衣", "深色下装", "A字裙", "阔腿裤", "船领上衣"],
        "avoid_styles": ["紧身裤", "紧身裙", "臀部装饰", "过于修身的连衣裙", "亮色紧身裤"],
        "emphasis": "增加上半身量感，弱化下半身",
        "styling_tips": [
            "上身选择亮色或有设计感的款式吸引视线",
            "下装选择深色、简洁款式",
            "A字裙或阔腿裤平衡臀宽",
            "船领、一字领等扩展肩部线条",
            "上衣选择有细节设计的款式"
        ],
        "best_cuts": ["船领上衣", "A字裙", "阔腿裤", "深色直筒牛仔裤"],
        "best_patterns": ["上身印花", "下身素色", "上身亮色"],
        "best_colors": ["上身浅色/亮色", "下身深色"],
    },
    BodyType.INVERTED_TRIANGLE: {
        "name": "Y型（倒三角）",
        "description": "肩部比臀宽，上半身较丰满",
        "characteristics": ["肩部较宽", "胸部较丰满", "臀部较窄"],
        "suitable_styles": ["V领设计", "深色上衣", "亮色下装", "阔腿裤", "A字裙", "高腰裤"],
        "avoid_styles": ["垫肩设计", "泡泡袖", "紧身裤", "船领上衣", "大领口上衣"],
        "emphasis": "柔化肩线，增加下半身量感",
        "styling_tips": [
            "下装选择有量感或亮色的款式",
            "V领、U领柔和肩部线条",
            "避免垫肩或肩部有装饰的款式",
            "A字裙或阔腿裤增加下身量感",
            "上衣选择简洁款式"
        ],
        "best_cuts": ["V领上衣", "阔腿裤", "A字裙", "深色上装"],
        "best_patterns": ["上身素色", "下身印花", "竖条纹"],
        "best_colors": ["上身深色", "下身浅色/亮色"],
    },
    BodyType.OVAL: {
        "name": "O型（椭圆）",
        "description": "腰部较粗，四肢相对纤细",
        "characteristics": ["腰围较大", "腹部较圆润", "四肢较细"],
        "suitable_styles": ["V领上衣", "深色系", "垂感面料", "直筒款", "长款开衫", "A字连衣裙"],
        "avoid_styles": ["紧身款", "横条纹", "腰部装饰", "短款上衣", "高腰线款式"],
        "emphasis": "拉长身形，展示四肢优势",
        "styling_tips": [
            "V领设计拉长颈部线条",
            "选择垂感好的面料",
            "长款外套修饰腰腹",
            "展示纤细的四肢",
            "选择深色系有收缩效果"
        ],
        "best_cuts": ["V领上衣", "长款开衫", "直筒裤", "A字连衣裙"],
        "best_patterns": ["竖条纹", "素色", "小图案"],
        "best_colors": ["深色系", "单色搭配", "冷色调"],
    },
}

# 服装单品与体型适配规则
CLOTHING_ITEM_FIT_RULES = {
    "top": {
        "suitable_for": {
            BodyType.RECTANGLE: ["收腰设计", "V领", "有垫肩", "有结构感"],
            BodyType.HOURGLASS: ["收腰款式", "合身剪裁", "V领", "裹身上衣"],
            BodyType.TRIANGLE: ["亮色", "有设计感", "船领", "泡泡袖", "垫肩"],
            BodyType.INVERTED_TRIANGLE: ["V领", "深色", "简洁款式", "无肩部装饰"],
            BodyType.OVAL: ["V领", "深色", "垂感面料", "宽松但不臃肿"],
        },
        "avoid_for": {
            BodyType.RECTANGLE: ["直筒型", "无腰线"],
            BodyType.HOURGLASS: ["宽松直筒款", "无腰线设计"],
            BodyType.TRIANGLE: ["深色简约", "无设计感"],
            BodyType.INVERTED_TRIANGLE: ["垫肩", "泡泡袖", "船领", "亮色"],
            BodyType.OVAL: ["紧身款", "横条纹", "腰部装饰"],
        },
        "score_weights": {
            "cut_match": 0.35,
            "color_match": 0.25,
            "style_match": 0.25,
            "body_optimization": 0.15,
        }
    },
    "bottom": {
        "suitable_for": {
            BodyType.RECTANGLE: ["高腰裤", "A字裙", "有腰线设计"],
            BodyType.HOURGLASS: ["高腰裤", "铅笔裙", "包身裙", "收腰设计"],
            BodyType.TRIANGLE: ["深色", "A字裙", "阔腿裤", "直筒裤"],
            BodyType.INVERTED_TRIANGLE: ["亮色", "阔腿裤", "A字裙", "有量感"],
            BodyType.OVAL: ["直筒裤", "高腰但不紧身", "A字裙"],
        },
        "avoid_for": {
            BodyType.RECTANGLE: ["低腰", "无腰线"],
            BodyType.HOURGLASS: ["低腰裤", "宽松直筒"],
            BodyType.TRIANGLE: ["紧身裤", "紧身裙", "亮色", "臀部装饰"],
            BodyType.INVERTED_TRIANGLE: ["紧身裤", "深色简约"],
            BodyType.OVAL: ["紧身裤", "低腰", "腰部装饰"],
        },
        "score_weights": {
            "cut_match": 0.40,
            "color_match": 0.20,
            "style_match": 0.25,
            "body_optimization": 0.15,
        }
    },
    "dress": {
        "suitable_for": {
            BodyType.RECTANGLE: ["收腰连衣裙", "A字裙", "有腰线设计"],
            BodyType.HOURGLASS: ["收腰连衣裙", "裹身裙", "包身裙"],
            BodyType.TRIANGLE: ["A字裙", "上身有设计", "深色下摆"],
            BodyType.INVERTED_TRIANGLE: ["A字裙", "V领", "下摆有量感"],
            BodyType.OVAL: ["A字连衣裙", "V领", "垂感面料", "长款"],
        },
        "avoid_for": {
            BodyType.RECTANGLE: ["直筒连衣裙", "无腰线"],
            BodyType.HOURGLASS: ["直筒款", "无腰线设计"],
            BodyType.TRIANGLE: ["紧身裙", "包身裙"],
            BodyType.INVERTED_TRIANGLE: ["紧身裙", "肩部装饰"],
            BodyType.OVAL: ["紧身款", "短款", "横条纹"],
        },
        "score_weights": {
            "cut_match": 0.40,
            "color_match": 0.25,
            "style_match": 0.20,
            "body_optimization": 0.15,
        }
    },
    "outerwear": {
        "suitable_for": {
            BodyType.RECTANGLE: ["收腰设计", "有结构感", "长款"],
            BodyType.HOURGLASS: ["收腰款式", "合身剪裁"],
            BodyType.TRIANGLE: ["有垫肩", "长款", "上身有设计"],
            BodyType.INVERTED_TRIANGLE: ["V领", "简洁款式", "无垫肩"],
            BodyType.OVAL: ["长款开衫", "V领", "垂感面料"],
        },
        "avoid_for": {
            BodyType.RECTANGLE: ["直筒型", "无腰线"],
            BodyType.HOURGLASS: ["宽松直筒款"],
            BodyType.TRIANGLE: ["短款", "深色简约"],
            BodyType.INVERTED_TRIANGLE: ["垫肩", "肩部装饰"],
            BodyType.OVAL: ["紧身款", "短款"],
        },
        "score_weights": {
            "cut_match": 0.35,
            "color_match": 0.25,
            "style_match": 0.25,
            "body_optimization": 0.15,
        }
    },
}

# 色彩季型与服装颜色适配
COLOR_SEASON_MATCHES = {
    ColorSeason.SPRING: {
        "best_colors": ["珊瑚粉", "桃红", "杏色", "暖黄", "草绿", "浅蓝绿", "米色"],
        "avoid_colors": ["纯黑", "纯白", "冷灰", "深紫"],
        "neutrals": ["米色", "奶油白", "暖灰"],
    },
    ColorSeason.SUMMER: {
        "best_colors": ["玫瑰粉", "薰衣草紫", "天蓝", "薄荷绿", "灰粉", "银灰"],
        "avoid_colors": ["橙色", "金黄", "暖棕"],
        "neutrals": ["冷灰", "银灰", "白色"],
    },
    ColorSeason.AUTUMN: {
        "best_colors": ["焦糖色", "酒红", "墨绿", "棕色", "橙色", "芥末黄", "驼色"],
        "avoid_colors": ["荧光色", "冷粉", "纯白"],
        "neutrals": ["驼色", "米色", "深棕"],
    },
    ColorSeason.WINTER: {
        "best_colors": ["正红", "宝蓝", "纯白", "黑色", "玫红", "翠绿", "深灰"],
        "avoid_colors": ["暖橙", "土黄", "暖棕"],
        "neutrals": ["黑色", "白色", "深灰"],
    },
}


class MediaPipeProcessor:
    """MediaPipe处理器封装类"""

    # MediaPipe Pose关键点索引
    KEYPOINT_INDICES = {
        "nose": 0,
        "left_eye_inner": 1, "left_eye": 2, "left_eye_outer": 3,
        "right_eye_inner": 4, "right_eye": 5, "right_eye_outer": 6,
        "left_ear": 7, "right_ear": 8,
        "mouth_left": 9, "mouth_right": 10,
        "left_shoulder": 11, "right_shoulder": 12,
        "left_elbow": 13, "right_elbow": 14,
        "left_wrist": 15, "right_wrist": 16,
        "left_pinky": 17, "right_pinky": 18,
        "left_index": 19, "right_index": 20,
        "left_thumb": 21, "right_thumb": 22,
        "left_hip": 23, "right_hip": 24,
        "left_knee": 25, "right_knee": 26,
        "left_ankle": 27, "right_ankle": 28,
        "left_heel": 29, "right_heel": 30,
        "left_foot_index": 31, "right_foot_index": 32,
    }

    def __init__(self):
        self.pose_model = None
        self.mp_pose = None
        self._load_models()

    def _load_models(self):
        """加载MediaPipe模型"""
        try:
            import mediapipe as mp

            self.mp_pose = mp.solutions.pose
            self.pose_model = self.mp_pose.Pose(
                static_image_mode=True,
                model_complexity=2,
                enable_segmentation=True,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5
            )
            logger.info("MediaPipe Pose model loaded successfully")
        except ImportError:
            logger.warning("MediaPipe not installed, using fallback mode")
            self.pose_model = None
        except Exception as e:
            logger.error(f"Failed to load MediaPipe: {e}")
            self.pose_model = None

    def process(self, image: Union[Image.Image, np.ndarray]) -> Optional[Any]:
        """处理图像并返回关键点"""
        if self.pose_model is None:
            return None

        try:
            import cv2

            if isinstance(image, Image.Image):
                image_array = np.array(image)
                image_rgb = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
            else:
                image_rgb = image

            results = self.pose_model.process(image_rgb)
            return results if results.pose_landmarks else None
        except Exception as e:
            logger.error(f"MediaPipe processing failed: {e}")
            return None

    def extract_keypoints(self, landmarks, img_width: int, img_height: int) -> Dict[str, Keypoint]:
        """从MediaPipe结果中提取关键点"""
        keypoints = {}

        for name, idx in self.KEYPOINT_INDICES.items():
            landmark = landmarks.landmark[idx]
            keypoints[name] = Keypoint(
                x=landmark.x * img_width,
                y=landmark.y * img_height,
                z=landmark.z,
                visibility=landmark.visibility,
                name=name
            )

        # 计算腰部关键点（使用默认比例，后续根据体型修正）
        # 初始使用默认比例0.37，待体型分类后可调用refine_waist_keypoints修正
        keypoints["left_waist"] = self._estimate_waist_point(
            keypoints["left_shoulder"],
            keypoints["left_hip"],
            img_width, img_height
        )
        keypoints["right_waist"] = self._estimate_waist_point(
            keypoints["right_shoulder"],
            keypoints["right_hip"],
            img_width, img_height
        )

        return keypoints

    def refine_waist_keypoints(
        self,
        keypoints: Dict[str, Keypoint],
        body_type: BodyType,
        img_width: int,
        img_height: int
    ) -> Dict[str, Keypoint]:
        """
        根据体型修正腰部关键点位置

        不同体型的自然腰围位置存在显著差异：
        - HOURGLASS (沙漏型): 腰线明显且较高，约38%位置
        - OVAL (椭圆型): 腹部丰满，腰线较低，约42%位置
        - RECTANGLE (矩形): 腰线不明显，标准37%位置
        - TRIANGLE (梨形): 臀部丰满，标准37%位置
        - INVERTED_TRIANGLE (倒三角): 上身较宽，腰线较高，约36%位置

        参考: ISO 8559-1:2017 服装尺寸设计人体测量标准

        Args:
            keypoints: 原始关键点字典
            body_type: 已分类的体型类型
            img_width: 图像宽度
            img_height: 图像高度

        Returns:
            更新了腰部关键点的字典
        """
        # 创建副本避免修改原始数据
        refined = keypoints.copy()

        # 根据体型修正左侧腰点
        refined["left_waist"] = self._estimate_waist_point(
            keypoints["left_shoulder"],
            keypoints["left_hip"],
            img_width, img_height,
            body_type=body_type
        )

        # 根据体型修正右侧腰点
        refined["right_waist"] = self._estimate_waist_point(
            keypoints["right_shoulder"],
            keypoints["right_hip"],
            img_width, img_height,
            body_type=body_type
        )

        return refined

    # FIX: 根据人体测量学研究，不同体型的腰围位置比例不同
    # 基于ISO 8559-1:2017人体测量标准
    WAIST_POSITION_RATIOS = {
        "default": 0.37,  # 默认标准比例
        BodyType.HOURGLASS: 0.38,   # 沙漏型 - 腰线较高
        BodyType.OVAL: 0.42,        # 椭圆型 - 腰线较低
        BodyType.RECTANGLE: 0.37,  # 矩形 - 标准位置
        BodyType.TRIANGLE: 0.37,   # 三角形 - 标准位置
        BodyType.INVERTED_TRIANGLE: 0.36,  # 倒三角 - 腰线较高
    }

    def _estimate_waist_point(self, shoulder: Keypoint, hip: Keypoint,
                              img_width: int, img_height: int,
                              body_type: Optional[BodyType] = None) -> Keypoint:
        """
        估算腰部关键点位置

        基于人体测量学研究：
        - 女性自然腰围位置通常在肩峰到髂嵴的37-40%
        - 男性略低，约35-38%
        - 不同体型腰围位置有差异

        参考: ISO 8559-1:2017 服装尺寸设计人体测量
        """
        # 根据体型选择合适的比例
        if body_type and body_type in self.WAIST_POSITION_RATIOS:
            waist_ratio = self.WAIST_POSITION_RATIOS[body_type]
        else:
            waist_ratio = self.WAIST_POSITION_RATIOS["default"]

        waist_y = shoulder.y + (hip.y - shoulder.y) * waist_ratio
        waist_x = shoulder.x + (hip.x - shoulder.x) * 0.5

        return Keypoint(
            x=waist_x,
            y=waist_y,
            z=(shoulder.z + hip.z) / 2,
            visibility=min(shoulder.visibility, hip.visibility),
            name="waist"
        )


class BodyAnalyzer:
    """
    增强版体型分析器
    基于MediaPipe Pose提取33个身体关键点
    计算身体比例，推断体型分类
    提供服装适配建议
    """

    def __init__(self, mediapipe_processor: Optional[MediaPipeProcessor] = None):
        """
        初始化体型分析器

        Args:
            mediapipe_processor: 可选的MediaPipe处理器实例
        """
        self.mediapipe = mediapipe_processor or MediaPipeProcessor()
        self.thresholds = BODY_TYPE_THRESHOLDS

    def analyze_body_type(self, image: Union[Image.Image, np.ndarray]) -> BodyProfile:
        """
        分析图像中的体型

        Args:
            image: PIL Image或numpy数组格式的图像

        Returns:
            BodyProfile: 完整的身体档案
        """
        # 1. 提取关键点（初始腰围点使用默认比例）
        keypoints = self._extract_keypoints_from_image(image)

        # 如果无法提取关键点，返回默认配置
        if not keypoints:
            return self._get_default_body_profile()

        # 获取图像尺寸
        if isinstance(image, Image.Image):
            img_height, img_width = image.height, image.width
        else:
            img_height, img_width = image.shape[:2]

        # 2. 计算测量数据（使用初始关键点）
        measurements = self.compute_measurements(keypoints, img_height, img_width)

        # 3. 计算比例
        proportions = self.compute_proportions(measurements)

        # 4. 分类体型
        body_type, confidence = self.classify_body_type(measurements, proportions)

        # 5. P1-014修复: 根据体型修正腰围关键点位置
        # 不同体型的自然腰围位置差异显著，需要根据体型调整
        keypoints = self.mediapipe.refine_waist_keypoints(
            keypoints, body_type, img_width, img_height
        )

        # 6. 使用修正后的关键点重新计算测量数据
        measurements = self.compute_measurements(keypoints, img_height, img_width)

        # 7. 重新计算比例
        proportions = self.compute_proportions(measurements)

        # 8. 估计肤色和色彩季型
        skin_tone = self._estimate_skin_tone(image, keypoints) if not isinstance(image, Image.Image) else SkinTone.MEDIUM
        color_season = self._predict_color_season_enhanced(image, keypoints, skin_tone) if not isinstance(image, Image.Image) else ColorSeason.AUTUMN

        return BodyProfile(
            body_type=body_type,
            confidence=confidence,
            keypoints=keypoints,
            proportions=proportions,
            measurements=measurements,
            skin_tone=skin_tone,
            color_season=color_season,
        )

    def _extract_keypoints_from_image(self, image: Union[Image.Image, np.ndarray]) -> Dict[str, Keypoint]:
        """从图像中提取关键点"""
        results = self.mediapipe.process(image)

        if results is None:
            logger.warning("No pose landmarks detected")
            return {}

        if isinstance(image, Image.Image):
            img_height, img_width = image.height, image.width
        else:
            img_height, img_width = image.shape[:2]

        return self.mediapipe.extract_keypoints(results, img_width, img_height)

    def compute_measurements(self, keypoints: Dict[str, Keypoint],
                            img_height: int, img_width: int) -> BodyMeasurements:
        """
        计算身体测量数据

        Args:
            keypoints: 关键点字典
            img_height: 图像高度
            img_width: 图像宽度

        Returns:
            BodyMeasurements: 身体测量数据
        """
        # 计算肩宽
        shoulder_width = abs(
            keypoints["left_shoulder"].x - keypoints["right_shoulder"].x
        )

        # 计算臀宽
        hip_width = abs(
            keypoints["left_hip"].x - keypoints["right_hip"].x
        )

        # 计算腰宽
        waist_width = abs(
            keypoints["left_waist"].x - keypoints["right_waist"].x
        )

        # 胸宽估算（肩宽的85%）
        bust_width = shoulder_width * 0.85

        # 计算躯干高度
        torso_height = abs(
            keypoints["left_shoulder"].y - keypoints["left_hip"].y
        )

        # 计算腿长
        leg_height = abs(
            keypoints["left_hip"].y - keypoints["left_ankle"].y
        )

        # 计算手臂长度
        arm_length = (
            abs(keypoints["left_shoulder"].y - keypoints["left_elbow"].y) +
            abs(keypoints["left_elbow"].y - keypoints["left_wrist"].y)
        )

        # 计算头部高度估算
        head_height = abs(
            keypoints["nose"].y - (keypoints["left_shoulder"].y + keypoints["right_shoulder"].y) / 2
        ) * 2

        # 总高度（像素）
        total_height_pixels = torso_height + leg_height + head_height

        # 像素到厘米的转换比例（假设平均身高170cm）
        pixels_per_cm = total_height_pixels / 170 if total_height_pixels > 0 else 1

        # 估算身高
        estimated_height = img_height / pixels_per_cm if pixels_per_cm > 0 else 170

        return BodyMeasurements(
            shoulder_width=shoulder_width / pixels_per_cm if pixels_per_cm > 0 else shoulder_width,
            bust_width=bust_width / pixels_per_cm if pixels_per_cm > 0 else bust_width,
            waist_width=waist_width / pixels_per_cm if pixels_per_cm > 0 else waist_width,
            hip_width=hip_width / pixels_per_cm if pixels_per_cm > 0 else hip_width,
            torso_height=torso_height,
            leg_height=leg_height,
            arm_length=arm_length,
            estimated_height=estimated_height,
        )

    def compute_proportions(self, measurements: BodyMeasurements) -> BodyProportions:
        """
        计算身体比例

        Args:
            measurements: 身体测量数据

        Returns:
            BodyProportions: 身体比例数据
        """
        shoulder = measurements.shoulder_width
        hip = measurements.hip_width
        waist = measurements.waist_width
        bust = measurements.bust_width
        torso = measurements.torso_height
        leg = measurements.leg_height
        arm = measurements.arm_length
        height = measurements.estimated_height

        return BodyProportions(
            shoulder_to_hip_ratio=shoulder / hip if hip > 0 else 1.0,
            waist_to_hip_ratio=waist / hip if hip > 0 else 1.0,
            waist_to_shoulder_ratio=waist / shoulder if shoulder > 0 else 1.0,
            bust_to_waist_ratio=bust / waist if waist > 0 else 1.0,
            bust_to_hip_ratio=bust / hip if hip > 0 else 1.0,
            leg_to_torso_ratio=leg / torso if torso > 0 else 1.0,
            arm_to_height_ratio=arm / height if height > 0 else 0.4,
        )

    def classify_body_type(self, measurements: BodyMeasurements,
                          proportions: BodyProportions) -> Tuple[BodyType, float]:
        """
        根据测量数据和比例分类体型

        Args:
            measurements: 身体测量数据
            proportions: 身体比例数据

        Returns:
            Tuple[BodyType, float]: 体型类型和置信度
        """
        shoulder_hip = proportions.shoulder_to_hip_ratio
        waist_shoulder = proportions.waist_to_shoulder_ratio
        waist_hip = proportions.waist_to_hip_ratio

        thresholds = self.thresholds

        # 初始化各体型的得分
        scores = {
            BodyType.HOURGLASS: 0,
            BodyType.RECTANGLE: 0,
            BodyType.TRIANGLE: 0,
            BodyType.INVERTED_TRIANGLE: 0,
            BodyType.OVAL: 0,
        }

        # 沙漏型判断：肩臀相近 + 腰细
        hourglass_shoulder_hip_range = thresholds["shoulder_hip_ratio"]["hourglass_range"]
        if (hourglass_shoulder_hip_range[0] <= shoulder_hip <= hourglass_shoulder_hip_range[1]):
            if waist_shoulder < thresholds["waist_shoulder_ratio"]["hourglass_max"]:
                scores[BodyType.HOURGLASS] += 40
            if waist_hip < thresholds["waist_hip_ratio"]["hourglass_max"]:
                scores[BodyType.HOURGLASS] += 40

        # 矩形判断：肩臀相近 + 腰不太细
        if abs(shoulder_hip - 1) < 0.1 and waist_shoulder > thresholds["waist_shoulder_ratio"]["rectangle_min"]:
            scores[BodyType.RECTANGLE] += 30
        if waist_hip < thresholds["waist_hip_ratio"]["rectangle_max"]:
            if scores[BodyType.RECTANGLE] == 0:
                scores[BodyType.RECTANGLE] += 20
            else:
                scores[BodyType.RECTANGLE] += 15

        # 梨形判断：肩窄于臀
        if shoulder_hip < thresholds["shoulder_hip_ratio"]["triangle_threshold"]:
            scores[BodyType.TRIANGLE] += 50
        if waist_hip > 0.7:
            scores[BodyType.TRIANGLE] += 20

        # 倒三角判断：肩宽于臀
        if shoulder_hip > thresholds["shoulder_hip_ratio"]["inverted_triangle_threshold"]:
            scores[BodyType.INVERTED_TRIANGLE] += 50
        if waist_shoulder < thresholds["waist_shoulder_ratio"]["hourglass_max"]:
            scores[BodyType.INVERTED_TRIANGLE] += 20

        # 椭圆判断：腰粗
        if waist_shoulder > thresholds["waist_shoulder_ratio"]["oval_min"]:
            scores[BodyType.OVAL] += 40
        if waist_hip > thresholds["waist_hip_ratio"]["oval_min"]:
            scores[BodyType.OVAL] += 40

        # 找到最高分的体型
        best_type = max(scores, key=scores.get)
        total_score = sum(scores.values())
        confidence = scores[best_type] / total_score if total_score > 0 else 0.5

        return best_type, min(confidence, 0.95)

    def _estimate_skin_tone(self, image: Union[Image.Image, np.ndarray],
                           keypoints: Dict[str, Keypoint]) -> SkinTone:
        """估计肤色"""
        try:
            import cv2

            if isinstance(image, Image.Image):
                image_array = np.array(image)
            else:
                image_array = image

            h, w = image_array.shape[:2]

            # 从面部区域提取肤色
            nose = keypoints.get("nose")
            if nose is None:
                return SkinTone.MEDIUM

            center_x = int(nose.x)
            center_y = int(nose.y)

            radius = min(w, h) // 12
            y1 = max(0, center_y - radius)
            y2 = min(h, center_y + radius)
            x1 = max(0, center_x - radius)
            x2 = min(w, center_x + radius)

            face_region = image_array[y1:y2, x1:x2]

            if face_region.size == 0:
                return SkinTone.MEDIUM

            avg_color = np.mean(face_region, axis=(0, 1))
            brightness = np.mean(avg_color)

            # 转换到HSV空间分析饱和度
            hsv = cv2.cvtColor(np.uint8([[avg_color]]), cv2.COLOR_RGB2HSV)[0][0]
            saturation = hsv[1]

            # 根据亮度和饱和度判断肤色
            if brightness > 200:
                return SkinTone.FAIR
            elif brightness > 175:
                return SkinTone.LIGHT
            elif brightness > 150:
                if saturation > 30:
                    return SkinTone.LIGHT
                return SkinTone.MEDIUM
            elif brightness > 125:
                return SkinTone.MEDIUM
            elif brightness > 100:
                if saturation > 40:
                    return SkinTone.OLIVE
                return SkinTone.TAN
            elif brightness > 75:
                return SkinTone.TAN
            else:
                return SkinTone.DARK

        except Exception as e:
            logger.warning(f"Skin tone estimation failed: {e}")
            return SkinTone.MEDIUM

    def _predict_color_season(self, skin_tone: SkinTone) -> ColorSeason:
        """根据肤色预测色彩季型（简化版本，仅作为后备）"""
        season_map = {
            SkinTone.FAIR: ColorSeason.SUMMER,
            SkinTone.LIGHT: ColorSeason.SPRING,
            SkinTone.MEDIUM: ColorSeason.AUTUMN,
            SkinTone.OLIVE: ColorSeason.AUTUMN,
            SkinTone.TAN: ColorSeason.WINTER,
            SkinTone.DARK: ColorSeason.WINTER,
        }
        return season_map.get(skin_tone, ColorSeason.SUMMER)

    def _predict_color_season_enhanced(
        self,
        image: Union[Image.Image, np.ndarray],
        keypoints: Dict[str, Keypoint],
        skin_tone: SkinTone
    ) -> ColorSeason:
        """
        P2-015修复: 增强版色彩季型预测

        基于个人色彩分析理论（Personal Color Analysis），
        综合分析肤色的三个维度来判断色彩季型：

        1. Undertone (底调/色温): 暖(Warm) vs 冷(Cool)
           - 暖调: 黄金、桃红底调，适合暖色系
           - 冷调: 粉红、蓝底调，适合冷色系

        2. Value (明度): 浅(Light) vs 深(Deep/Dark)
           - 浅色: 肤色较浅，对比度较低
           - 深色: 肤色较深，对比度较高

        3. Chroma (饱和度/纯度): 柔和(Muted/Soft) vs 鲜艳(Bright/Clear)
           - 柔和: 灰调较多，适合低饱和度颜色
           - 鲜艳: 色彩纯正，适合高饱和度颜色

        色彩季型矩阵:
        +------------------+-----------------+------------------+
        |                  | 暖调 (Warm)     | 冷调 (Cool)      |
        +------------------+-----------------+------------------+
        | 浅 + 柔和        | Spring (春季型) | Summer (夏季型)  |
        | 深 + 鲜艳        | Autumn (秋季型) | Winter (冬季型)  |
        +------------------+-----------------+------------------+

        参考:
        - Color Me Beautiful by Carole Jackson
        - 12-season color analysis system

        Args:
            image: 原始图像
            keypoints: 身体关键点（用于定位面部区域）
            skin_tone: 基础肤色分类

        Returns:
            ColorSeason: 预测的色彩季型
        """
        try:
            # 转换为numpy数组
            if isinstance(image, Image.Image):
                image_array = np.array(image)
            else:
                image_array = image

            h, w = image_array.shape[:2]

            # 从面部区域提取肤色样本
            nose = keypoints.get("nose")
            if nose is None:
                return self._predict_color_season(skin_tone)

            # 扩大采样区域以获得更准确的肤色分析
            center_x = int(nose.x)
            center_y = int(nose.y)
            radius = min(w, h) // 10

            y1 = max(0, center_y - radius)
            y2 = min(h, center_y + radius)
            x1 = max(0, center_x - radius)
            x2 = min(w, center_x + radius)

            face_region = image_array[y1:y2, x1:x2]
            if face_region.size == 0:
                return self._predict_color_season(skin_tone)

            # ===== 1. 计算平均肤色 =====
            avg_color = np.mean(face_region, axis=(0, 1))

            # ===== 2. 分析 Undertone (底调) =====
            # 基于RGB通道差异判断暖冷调
            # 暖调: R > B (红色通道高于蓝色)
            # 冷调: B > R (蓝色通道较高或相等)
            r, g, b = avg_color[0], avg_color[1], avg_color[2]

            # 使用标准化的暖冷调指数
            # 正值表示暖调，负值表示冷调
            warmth_index = (r - b) / 255.0

            # 额外检查：黄色的存在通常表示暖调
            # 黄色 = 高R + 高G + 低B
            yellowness = ((r + g) / 2 - b) / 255.0

            # 综合判断底调
            undertone_warm = warmth_index > 0.05 or yellowness > 0.1

            # ===== 3. 分析 Value (明度) =====
            # 使用HSV的V通道或亮度公式
            brightness = np.mean(avg_color)  # 0-255

            # 标准化到0-1范围
            value_normalized = brightness / 255.0

            # 明度分类
            is_light = value_normalized > 0.55

            # ===== 4. 分析 Chroma (饱和度) =====
            # 转换到HSV空间
            hsv = cv2.cvtColor(np.uint8([[avg_color]]), cv2.COLOR_RGB2HSV)[0][0]
            saturation = hsv[1]  # 0-255

            # 标准化到0-1范围
            chroma_normalized = saturation / 255.0

            # 饱和度分类
            is_bright = chroma_normalized > 0.25

            # ===== 5. 综合判断色彩季型 =====
            # 基于12季色彩分析理论的简化4季版本

            # 计算特征向量和置信度
            features = {
                "undertone": "warm" if undertone_warm else "cool",
                "value": "light" if is_light else "deep",
                "chroma": "bright" if is_bright else "muted",
                "warmth_index": warmth_index,
                "value_normalized": value_normalized,
                "chroma_normalized": chroma_normalized
            }

            logger.debug(f"Color season features: {features}")

            # 色彩季型判定矩阵
            # +--------+-----------+-----------+
            # |        | Warm      | Cool      |
            # +--------+-----------+-----------+
            # | Light  | Spring    | Summer    |
            # | Deep   | Autumn    | Winter    |
            # +--------+-----------+-----------+

            if undertone_warm:
                # 暖调
                if is_light:
                    # 春季型: 暖 + 浅
                    # 特征: 明亮、温暖、活泼
                    return ColorSeason.SPRING
                else:
                    # 秋季型: 暖 + 深
                    # 特征: 温暖、深沉、丰富
                    return ColorSeason.AUTUMN
            else:
                # 冷调
                if is_light:
                    # 夏季型: 冷 + 浅
                    # 特征: 柔和、冷调、优雅
                    return ColorSeason.SUMMER
                else:
                    # 冬季型: 冷 + 深
                    # 特征: 鲜明、冷调、对比强烈
                    return ColorSeason.WINTER

        except Exception as e:
            logger.warning(f"Enhanced color season prediction failed: {e}, falling back to simple method")
            return self._predict_color_season(skin_tone)

    def _get_default_body_profile(self) -> BodyProfile:
        """返回默认的身体档案（当无法检测时使用）"""
        return BodyProfile(
            body_type=BodyType.RECTANGLE,
            confidence=0.5,
            keypoints={},
            proportions=BodyProportions(),
            measurements=BodyMeasurements(),
            skin_tone=SkinTone.MEDIUM,
            color_season=ColorSeason.AUTUMN,
        )

    def get_clothing_adaptations(self, body_type: BodyType) -> ClothingAdaptation:
        """
        根据体型返回服装适配建议

        Args:
            body_type: 体型类型

        Returns:
            ClothingAdaptation: 服装适配建议
        """
        adaptation_data = BODY_TYPE_ADAPTATIONS.get(body_type, BODY_TYPE_ADAPTATIONS[BodyType.RECTANGLE])

        return ClothingAdaptation(
            suitable_styles=adaptation_data.get("suitable_styles", []),
            avoid_styles=adaptation_data.get("avoid_styles", []),
            emphasis=adaptation_data.get("emphasis", ""),
            styling_tips=adaptation_data.get("styling_tips", []),
            best_cuts=adaptation_data.get("best_cuts", []),
            best_patterns=adaptation_data.get("best_patterns", []),
            best_colors=adaptation_data.get("best_colors", []),
        )

    def get_body_type_info(self, body_type: BodyType) -> Dict[str, Any]:
        """
        获取体型的详细信息

        Args:
            body_type: 体型类型

        Returns:
            Dict: 体型详细信息
        """
        return BODY_TYPE_ADAPTATIONS.get(body_type, BODY_TYPE_ADAPTATIONS[BodyType.RECTANGLE])

    def calculate_fit_score(self, clothing_item: Dict[str, Any],
                           body_profile: BodyProfile) -> FitScore:
        """
        计算服装单品与用户体型的适配分数

        Args:
            clothing_item: 服装单品信息字典，包含：
                - category: 服装类别 (top/bottom/dress/outerwear/shoes/accessory)
                - style: 风格标签列表
                - colors: 颜色列表
                - cut: 剪裁类型
                - pattern: 图案类型
                - attributes: 其他属性
            body_profile: 用户身体档案

        Returns:
            FitScore: 适配分数详情
        """
        category = clothing_item.get("category", "top").lower()
        body_type = body_profile.body_type
        color_season = body_profile.color_season

        # 获取该类别的适配规则
        fit_rules = CLOTHING_ITEM_FIT_RULES.get(category, CLOTHING_ITEM_FIT_RULES["top"])
        weights = fit_rules.get("score_weights", {
            "cut_match": 0.35,
            "color_match": 0.25,
            "style_match": 0.25,
            "body_optimization": 0.15,
        })

        # 1. 计算剪裁匹配分数
        cut_score = self._calculate_cut_match_score(
            clothing_item, body_type, fit_rules
        )

        # 2. 计算颜色匹配分数
        color_score = self._calculate_color_match_score(
            clothing_item, color_season
        )

        # 3. 计算风格匹配分数
        style_score = self._calculate_style_match_score(
            clothing_item, body_type, fit_rules
        )

        # 4. 计算体型优化分数
        body_opt_score = self._calculate_body_optimization_score(
            clothing_item, body_type
        )

        # 计算加权总分
        overall_score = (
            cut_score * weights.get("cut_match", 0.35) +
            color_score * weights.get("color_match", 0.25) +
            style_score * weights.get("style_match", 0.25) +
            body_opt_score * weights.get("body_optimization", 0.15)
        )

        return FitScore(
            overall_score=round(overall_score, 3),
            body_type_score=round(body_opt_score, 3),
            style_match_score=round(style_score, 3),
            color_match_score=round(color_score, 3),
            cut_match_score=round(cut_score, 3),
            details={
                "category": category,
                "body_type": body_type.value,
                "color_season": color_season.value,
                "weights_used": weights,
                "recommendation": self._get_fit_recommendation(overall_score),
            }
        )

    def _calculate_cut_match_score(self, clothing_item: Dict[str, Any],
                                   body_type: BodyType,
                                   fit_rules: Dict[str, Any]) -> float:
        """计算剪裁匹配分数"""
        item_cut = clothing_item.get("cut", "").lower()
        item_attributes = clothing_item.get("attributes", {})
        cut_keywords = item_attributes.get("cut_keywords", [])

        # 合并所有剪裁相关关键词
        all_cut_info = [item_cut] + cut_keywords

        # 获取该体型适合和不适合的剪裁
        suitable_cuts = fit_rules.get("suitable_for", {}).get(body_type, [])
        avoid_cuts = fit_rules.get("avoid_for", {}).get(body_type, [])

        if not all_cut_info or all(c == "" for c in all_cut_info):
            return 0.5  # 无剪裁信息时返回中性分数

        score = 0.5  # 基础分

        for cut_info in all_cut_info:
            cut_lower = cut_info.lower()

            # 检查是否匹配适合的剪裁
            for suitable in suitable_cuts:
                if suitable.lower() in cut_lower or cut_lower in suitable.lower():
                    score += 0.15
                    break

            # 检查是否匹配不适合的剪裁
            for avoid in avoid_cuts:
                if avoid.lower() in cut_lower or cut_lower in avoid.lower():
                    score -= 0.20
                    break

        return max(0.0, min(1.0, score))

    def _calculate_color_match_score(self, clothing_item: Dict[str, Any],
                                     color_season: ColorSeason) -> float:
        """计算颜色匹配分数"""
        item_colors = clothing_item.get("colors", [])
        if not item_colors:
            return 0.5  # 无颜色信息时返回中性分数

        season_info = COLOR_SEASON_MATCHES.get(color_season, COLOR_SEASON_MATCHES[ColorSeason.AUTUMN])
        best_colors = season_info.get("best_colors", [])
        avoid_colors = season_info.get("avoid_colors", [])

        score = 0.5

        for color in item_colors:
            color_lower = color.lower()

            # 检查是否匹配最佳颜色
            for best in best_colors:
                if best.lower() in color_lower or color_lower in best.lower():
                    score += 0.15
                    break

            # 检查是否匹配应避免的颜色
            for avoid in avoid_colors:
                if avoid.lower() in color_lower or color_lower in avoid.lower():
                    score -= 0.15
                    break

        return max(0.0, min(1.0, score))

    def _calculate_style_match_score(self, clothing_item: Dict[str, Any],
                                     body_type: BodyType,
                                     fit_rules: Dict[str, Any]) -> float:
        """计算风格匹配分数"""
        item_styles = clothing_item.get("style", [])
        if isinstance(item_styles, str):
            item_styles = [item_styles]

        if not item_styles:
            return 0.5

        # 获取体型适配信息
        adaptation = BODY_TYPE_ADAPTATIONS.get(body_type, {})
        suitable_styles = adaptation.get("suitable_styles", [])
        avoid_styles = adaptation.get("avoid_styles", [])

        score = 0.5

        for style in item_styles:
            style_lower = style.lower()

            for suitable in suitable_styles:
                if suitable.lower() in style_lower or style_lower in suitable.lower():
                    score += 0.12
                    break

            for avoid in avoid_styles:
                if avoid.lower() in style_lower or style_lower in avoid.lower():
                    score -= 0.15
                    break

        return max(0.0, min(1.0, score))

    def _calculate_body_optimization_score(self, clothing_item: Dict[str, Any],
                                          body_type: BodyType) -> float:
        """计算体型优化分数（基于整体设计是否有助于优化体型）"""
        category = clothing_item.get("category", "top").lower()
        attributes = clothing_item.get("attributes", {})

        adaptation = BODY_TYPE_ADAPTATIONS.get(body_type, {})
        best_cuts = adaptation.get("best_cuts", [])
        emphasis = adaptation.get("emphasis", "")

        score = 0.5

        # 检查是否有优化体型的特征
        optimization_keywords = {
            BodyType.RECTANGLE: ["收腰", "高腰", "层次", "腰线", "垫肩"],
            BodyType.HOURGLASS: ["收腰", "合身", "修身", "曲线", "腰带"],
            BodyType.TRIANGLE: ["垫肩", "亮色上衣", "深色下装", "A字", "阔腿"],
            BodyType.INVERTED_TRIANGLE: ["V领", "深色上衣", "亮色下装", "阔腿", "A字"],
            BodyType.OVAL: ["V领", "深色", "垂感", "长款", "直筒"],
        }

        keywords = optimization_keywords.get(body_type, [])

        # 检查商品描述和属性
        description = clothing_item.get("description", "").lower()
        all_text = description

        for attr_value in attributes.values():
            if isinstance(attr_value, str):
                all_text += " " + attr_value.lower()
            elif isinstance(attr_value, list):
                all_text += " " + " ".join(str(v).lower() for v in attr_value)

        for keyword in keywords:
            if keyword.lower() in all_text:
                score += 0.08

        return max(0.0, min(1.0, score))

    def _get_fit_recommendation(self, score: float) -> str:
        """根据适配分数返回推荐描述"""
        if score >= 0.8:
            return "非常推荐 - 完美匹配您的体型"
        elif score >= 0.65:
            return "推荐 - 很适合您的体型"
        elif score >= 0.5:
            return "可以考虑 - 基本适合您的体型"
        elif score >= 0.35:
            return "谨慎选择 - 可能不是最佳选择"
        else:
            return "不推荐 - 不太适合您的体型"

    def batch_calculate_fit_scores(self, clothing_items: List[Dict[str, Any]],
                                   body_profile: BodyProfile) -> List[Dict[str, Any]]:
        """
        批量计算多个服装单品的适配分数

        Args:
            clothing_items: 服装单品列表
            body_profile: 用户身体档案

        Returns:
            List[Dict]: 包含每个单品适配分数的结果列表
        """
        results = []

        for item in clothing_items:
            fit_score = self.calculate_fit_score(item, body_profile)
            results.append({
                "item_id": item.get("id", ""),
                "item_name": item.get("name", ""),
                "category": item.get("category", ""),
                "fit_score": fit_score.overall_score,
                "recommendation": fit_score.details.get("recommendation", ""),
                "scores": {
                    "cut_match": fit_score.cut_match_score,
                    "color_match": fit_score.color_match_score,
                    "style_match": fit_score.style_match_score,
                    "body_optimization": fit_score.body_type_score,
                },
                "item_data": item,
            })

        # 按适配分数排序
        results.sort(key=lambda x: x["fit_score"], reverse=True)

        return results

    def get_outfit_combination_score(self, outfit_items: List[Dict[str, Any]],
                                     body_profile: BodyProfile) -> Dict[str, Any]:
        """
        计算整套穿搭的适配分数

        Args:
            outfit_items: 穿搭单品列表
            body_profile: 用户身体档案

        Returns:
            Dict: 整套穿搭的适配分析结果
        """
        if not outfit_items:
            return {
                "overall_score": 0.0,
                "items_analysis": [],
                "recommendation": "无穿搭数据",
            }

        items_analysis = []
        total_score = 0.0
        category_scores = {}

        for item in outfit_items:
            fit_score = self.calculate_fit_score(item, body_profile)
            category = item.get("category", "unknown")

            items_analysis.append({
                "item_id": item.get("id", ""),
                "item_name": item.get("name", ""),
                "category": category,
                "fit_score": fit_score.overall_score,
                "scores": {
                    "cut_match": fit_score.cut_match_score,
                    "color_match": fit_score.color_match_score,
                    "style_match": fit_score.style_match_score,
                    "body_optimization": fit_score.body_type_score,
                },
            })

            category_scores[category] = fit_score.overall_score
            total_score += fit_score.overall_score

        # 计算平均分数
        avg_score = total_score / len(outfit_items)

        # 计算整体协调性（各单品分数的方差越小越好）
        scores_list = [item["fit_score"] for item in items_analysis]
        variance = sum((s - avg_score) ** 2 for s in scores_list) / len(scores_list)
        harmony_bonus = max(0, 0.1 - variance) * 5  # 协调性加分

        final_score = min(1.0, avg_score + harmony_bonus)

        return {
            "overall_score": round(final_score, 3),
            "average_item_score": round(avg_score, 3),
            "harmony_bonus": round(harmony_bonus, 3),
            "items_analysis": items_analysis,
            "category_scores": category_scores,
            "recommendation": self._get_fit_recommendation(final_score),
            "body_type_considered": body_profile.body_type.value,
        }


class BodyAnalyzerService:
    """
    体型分析服务类
    提供与推荐系统集成的接口
    """

    def __init__(self):
        """初始化服务"""
        self.analyzer = BodyAnalyzer()

    def analyze_user_photo(self, image: Union[Image.Image, np.ndarray, str]) -> Dict[str, Any]:
        """
        分析用户照片

        Args:
            image: 图像，可以是PIL Image、numpy数组或文件路径

        Returns:
            Dict: 分析结果
        """
        try:
            if isinstance(image, str):
                image = Image.open(image).convert("RGB")

            profile = self.analyzer.analyze_body_type(image)

            return {
                "success": True,
                "body_profile": profile.to_dict(),
                "clothing_adaptations": self.analyzer.get_clothing_adaptations(profile.body_type).__dict__,
                "body_type_info": self.analyzer.get_body_type_info(profile.body_type),
            }
        except Exception as e:
            logger.error(f"Failed to analyze user photo: {e}")
            return {
                "success": False,
                "error": str(e),
                "body_profile": self.analyzer._get_default_body_profile().to_dict(),
            }

    def get_recommendations_for_body_type(self, body_type: str,
                                          category: Optional[str] = None) -> Dict[str, Any]:
        """
        获取特定体型的服装推荐规则

        Args:
            body_type: 体型类型字符串
            category: 可选的服装类别

        Returns:
            Dict: 推荐规则
        """
        try:
            bt = BodyType(body_type.lower())
        except ValueError:
            bt = BodyType.RECTANGLE

        adaptations = self.analyzer.get_clothing_adaptations(bt)
        body_info = self.analyzer.get_body_type_info(bt)

        result = {
            "body_type": bt.value,
            "body_type_info": body_info,
            "adaptations": adaptations.__dict__,
        }

        # 如果指定了类别，返回该类别的详细规则
        if category and category.lower() in CLOTHING_ITEM_FIT_RULES:
            category_rules = CLOTHING_ITEM_FIT_RULES[category.lower()]
            result["category_rules"] = {
                "suitable_for_your_body": category_rules.get("suitable_for", {}).get(bt, []),
                "avoid_for_your_body": category_rules.get("avoid_for", {}).get(bt, []),
                "score_weights": category_rules.get("score_weights", {}),
            }

        return result

    def rank_items_by_fit(self, items: List[Dict[str, Any]],
                         body_profile: Union[BodyProfile, Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        根据体型适配度对商品进行排序

        Args:
            items: 商品列表
            body_profile: 身体档案（BodyProfile对象或字典）

        Returns:
            List[Dict]: 排序后的商品列表，包含适配分数
        """
        if isinstance(body_profile, dict):
            # 从字典重建BodyProfile
            profile = self._dict_to_body_profile(body_profile)
        else:
            profile = body_profile

        return self.analyzer.batch_calculate_fit_scores(items, profile)

    def _dict_to_body_profile(self, data: Dict[str, Any]) -> BodyProfile:
        """将字典转换为BodyProfile对象"""
        try:
            body_type = BodyType(data.get("body_type", "rectangle"))
            proportions_data = data.get("proportions", {})
            measurements_data = data.get("measurements", {})

            proportions = BodyProportions(
                shoulder_to_hip_ratio=proportions_data.get("shoulder_to_hip_ratio", 1.0),
                waist_to_hip_ratio=proportions_data.get("waist_to_hip_ratio", 0.8),
                waist_to_shoulder_ratio=proportions_data.get("waist_to_shoulder_ratio", 0.8),
                bust_to_waist_ratio=proportions_data.get("bust_to_waist_ratio", 1.0),
                bust_to_hip_ratio=proportions_data.get("bust_to_hip_ratio", 0.9),
                leg_to_torso_ratio=proportions_data.get("leg_to_torso_ratio", 1.0),
                arm_to_height_ratio=proportions_data.get("arm_to_height_ratio", 0.4),
            )

            measurements = BodyMeasurements(
                shoulder_width=measurements_data.get("shoulder_width", 40.0),
                bust_width=measurements_data.get("bust_width", 35.0),
                waist_width=measurements_data.get("waist_width", 30.0),
                hip_width=measurements_data.get("hip_width", 38.0),
                torso_height=measurements_data.get("torso_height", 50.0),
                leg_height=measurements_data.get("leg_height", 80.0),
                arm_length=measurements_data.get("arm_length", 60.0),
                estimated_height=measurements_data.get("estimated_height", 170.0),
            )

            skin_tone = SkinTone(data.get("skin_tone", "medium"))
            color_season = ColorSeason(data.get("color_season", "autumn"))

            return BodyProfile(
                body_type=body_type,
                confidence=data.get("confidence", 0.5),
                keypoints={},
                proportions=proportions,
                measurements=measurements,
                skin_tone=skin_tone,
                color_season=color_season,
            )
        except Exception as e:
            logger.error(f"Failed to convert dict to BodyProfile: {e}")
            return self.analyzer._get_default_body_profile()


# 便捷导出函数
def create_body_analyzer() -> BodyAnalyzer:
    """创建体型分析器实例"""
    return BodyAnalyzer()


def create_body_analyzer_service() -> BodyAnalyzerService:
    """创建体型分析服务实例"""
    return BodyAnalyzerService()


# 模块级单例
_analyzer_instance: Optional[BodyAnalyzer] = None
_service_instance: Optional[BodyAnalyzerService] = None


def get_body_analyzer() -> BodyAnalyzer:
    """获取体型分析器单例"""
    global _analyzer_instance
    if _analyzer_instance is None:
        _analyzer_instance = BodyAnalyzer()
    return _analyzer_instance


def get_body_analyzer_service() -> BodyAnalyzerService:
    """获取体型分析服务单例"""
    global _service_instance
    if _service_instance is None:
        _service_instance = BodyAnalyzerService()
    return _service_instance


if __name__ == "__main__":
    # 测试代码
    print("Body Analyzer Module Test")
    print("=" * 50)

    # 创建分析器
    analyzer = create_body_analyzer()

    # 测试体型适配
    for body_type in BodyType:
        print(f"\n{body_type.value.upper()}:")
        adaptations = analyzer.get_clothing_adaptations(body_type)
        print(f"  Suitable: {adaptations.suitable_styles[:3]}")
        print(f"  Avoid: {adaptations.avoid_styles[:3]}")
        print(f"  Emphasis: {adaptations.emphasis}")

    # 测试适配分数计算
    print("\n" + "=" * 50)
    print("Fit Score Test:")

    test_item = {
        "id": "test_001",
        "name": "V领收腰连衣裙",
        "category": "dress",
        "style": ["优雅", "收腰"],
        "colors": ["酒红"],
        "cut": "收腰",
        "attributes": {
            "cut_keywords": ["V领", "收腰", "中长款"],
        }
    }

    profile = BodyProfile(
        body_type=BodyType.HOURGLASS,
        confidence=0.85,
        keypoints={},
        proportions=BodyProportions(),
        measurements=BodyMeasurements(),
        skin_tone=SkinTone.MEDIUM,
        color_season=ColorSeason.AUTUMN,
    )

    fit_score = analyzer.calculate_fit_score(test_item, profile)
    print(f"Item: {test_item['name']}")
    print(f"Body Type: {profile.body_type.value}")
    print(f"Overall Fit Score: {fit_score.overall_score}")
    print(f"Recommendation: {fit_score.details['recommendation']}")
