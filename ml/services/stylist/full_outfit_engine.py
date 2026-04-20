"""
全身搭配方案生成引擎

从上衣到鞋配的完整搭配方案，融合：
- 体型适配（什么版型最适合）
- 色彩协调（整体色彩方案不冲突）
- 场合适配（面试/约会/日常等）
- 天气适配（温度→层次穿搭）
- 价格约束（总预算内）
- 风格一致性（不混搭矛盾风格）

设计理念：
  1. 选定核心单品（anchor piece）作为搭配锚点
  2. 从锚点出发，逐层扩展搭配链
  3. 每步验证与已选单品的兼容性
  4. 通过多维度评分优化整体方案质量
"""

import os
import json
import uuid
import math
import colorsys
import logging
import hashlib
import threading
from typing import Dict, List, Optional, Any, Tuple, Set
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from collections import OrderedDict

import numpy as np

from ml.services.stylist.intelligent_stylist_service import (
    UserProfile,
    SceneContext,
    OutfitItem,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class ClothingSlot(str, Enum):
    """搭配槽位：每个槽位对应身体的一个穿着区域"""
    OUTER_TOP = "outer_top"
    INNER_TOP = "inner_top"
    DRESS = "dress"
    BOTTOM = "bottom"
    SHOES = "shoes"
    BAG = "bag"
    NECKLACE = "necklace"
    SCARF = "scarf"
    WATCH = "watch"
    HAT = "hat"
    BELT = "belt"
    EARRINGS = "earrings"
    SUNGLASSES = "sunglasses"


class ColorSchemeType(str, Enum):
    """色彩搭配类型"""
    MONOCHROMATIC = "monochromatic"       # 同类色（同色系深浅）
    ANALOGOUS = "analogous"               # 类似色（相邻色环）
    COMPLEMENTARY = "complementary"       # 互补色（对角）
    TRIADIC = "triadic"                   # 三角配色
    SPLIT_COMPLEMENTARY = "split_complementary"  # 分裂互补
    NEUTRAL = "neutral"                   # 中性色为主
    ACHROMATIC = "achromatic"             # 无彩色（黑白灰）


class FormalityLevel(str, Enum):
    """正式程度"""
    VERY_LOW = "very_low"
    LOW = "low"
    MEDIUM = "medium"
    MEDIUM_HIGH = "medium_high"
    HIGH = "high"
    VERY_HIGH = "very_high"


class SeasonType(str, Enum):
    """季节"""
    SPRING = "spring"
    SUMMER = "summer"
    FALL = "fall"
    WINTER = "winter"


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class ClothingItem:
    """单品详情"""
    item_id: str
    name: str
    category: str                              # tops / bottoms / outerwear / dresses / footwear / accessories
    subcategory: Optional[str] = None
    color_primary: str = ""                    # 主色（中文或 hex）
    color_secondary: str = ""                  # 辅色
    colors: List[str] = field(default_factory=list)
    materials: List[str] = field(default_factory=list)
    style_tags: List[str] = field(default_factory=list)
    price: float = 0.0
    brand: Optional[str] = None
    image_url: Optional[str] = None
    seasons: List[str] = field(default_factory=list)
    occasions: List[str] = field(default_factory=list)
    body_type_fit: List[str] = field(default_factory=list)
    warmth_level: int = 0                      # 0=透气 1=轻薄 2=中等 3=保暖 4=极暖
    formality: float = 0.5                     # 0=极度休闲 1=极度正式
    description: str = ""


@dataclass
class ColorHarmonyResult:
    """色彩协调检查结果"""
    is_harmonious: bool = True
    scheme_type: ColorSchemeType = ColorSchemeType.NEUTRAL
    dominant_colors: List[str] = field(default_factory=list)
    accent_colors: List[str] = field(default_factory=list)
    score: float = 0.0
    issues: List[str] = field(default_factory=list)
    suggestion: str = ""


@dataclass
class StyleConsistencyResult:
    """风格一致性检查结果"""
    is_consistent: bool = True
    dominant_style: str = ""
    style_conflict: List[Tuple[str, str]] = field(default_factory=list)
    score: float = 0.0
    issues: List[str] = field(default_factory=list)


@dataclass
class WeatherResult:
    """天气适配检查结果"""
    is_suitable: bool = True
    layer_count: int = 1
    warmth_total: int = 0
    score: float = 0.0
    issues: List[str] = field(default_factory=list)
    suggestion: str = ""


@dataclass
class BudgetResult:
    """价格约束检查结果"""
    is_within_budget: bool = True
    total_price: float = 0.0
    budget_limit: float = 0.0
    remaining_budget: float = 0.0
    score: float = 0.0
    issues: List[str] = field(default_factory=list)


@dataclass
class BodyFitResult:
    """体型适配检查结果"""
    score: float = 0.0
    fitting_items: List[str] = field(default_factory=list)
    issues: List[str] = field(default_factory=list)


@dataclass
class ColorScheme:
    """完整色彩方案描述"""
    scheme_type: ColorSchemeType = ColorSchemeType.NEUTRAL
    primary_color: str = ""           # 主色 60%
    secondary_color: str = ""         # 辅助色 30%
    accent_color: str = ""            # 点缀色 10%
    primary_role: str = "base"        # base / contrast / highlight
    description: str = ""


@dataclass
class FullOutfitPlan:
    """全身搭配方案"""
    plan_id: str = ""
    anchor_piece: Optional[ClothingItem] = None
    inner_top: Optional[ClothingItem] = None
    outer_top: Optional[ClothingItem] = None
    bottom: Optional[ClothingItem] = None
    shoes: Optional[ClothingItem] = None
    accessories: List[ClothingItem] = field(default_factory=list)

    color_scheme: ColorScheme = field(default_factory=ColorScheme)
    style_tags: List[str] = field(default_factory=list)
    occasion: str = ""
    season: str = ""
    total_price: float = 0.0

    body_fit_score: float = 0.0
    color_harmony_score: float = 0.0
    style_consistency_score: float = 0.0
    weather_score: float = 0.0
    overall_score: float = 0.0

    explanation: str = ""

    def get_all_items(self) -> List[ClothingItem]:
        """获取方案中所有单品"""
        items: List[ClothingItem] = []
        if self.anchor_piece:
            items.append(self.anchor_piece)
        if self.inner_top:
            items.append(self.inner_top)
        if self.outer_top:
            items.append(self.outer_top)
        if self.bottom:
            items.append(self.bottom)
        if self.shoes:
            items.append(self.shoes)
        items.extend(self.accessories)
        return items

    def to_dict(self) -> Dict[str, Any]:
        """转换为可序列化的字典"""
        result = {
            "plan_id": self.plan_id,
            "occasion": self.occasion,
            "season": self.season,
            "total_price": self.total_price,
            "style_tags": self.style_tags,
            "color_scheme": asdict(self.color_scheme),
            "body_fit_score": round(self.body_fit_score, 2),
            "color_harmony_score": round(self.color_harmony_score, 2),
            "style_consistency_score": round(self.style_consistency_score, 2),
            "weather_score": round(self.weather_score, 2),
            "overall_score": round(self.overall_score, 2),
            "explanation": self.explanation,
            "items": [],
        }
        for item in self.get_all_items():
            result["items"].append(asdict(item))
        return result


@dataclass
class OutfitContext:
    """搭配生成上下文"""
    occasion: str = "daily"
    season: str = ""
    temperature_celsius: Optional[float] = None
    weather_description: str = ""
    time_of_day: str = "daytime"
    formality_hint: Optional[float] = None


# ---------------------------------------------------------------------------
# Color Knowledge Base
# ---------------------------------------------------------------------------

# 颜色分类映射：将中文颜色名归类到色环族
_COLOR_FAMILY: Dict[str, str] = {
    # 红
    "红": "red", "红色": "red", "正红": "red", "酒红": "red", "玫红": "red",
    "暗红": "red", "砖红": "red", "珊瑚红": "red", "西瓜红": "red",
    "粉红": "pink", "粉色": "pink", "粉色系": "pink", "玫瑰粉": "pink",
    "桃红": "pink", "灰粉": "pink",
    # 橙
    "橙": "orange", "橙色": "orange", "暖橙": "orange", "橘色": "orange",
    "焦糖色": "orange", "芥末黄": "orange",
    # 黄
    "黄": "yellow", "黄色": "yellow", "柠檬黄": "yellow", "暖黄": "yellow",
    "金黄": "yellow", "杏色": "yellow",
    # 绿
    "绿": "green", "绿色": "green", "草绿": "green", "墨绿": "green",
    "薄荷绿": "green", "翠绿": "green", "军绿": "green",
    # 蓝
    "蓝": "blue", "蓝色": "blue", "经典蓝": "blue", "天蓝": "blue",
    "天空蓝": "blue", "深蓝": "blue", "宝蓝": "blue", "藏青": "blue",
    # 紫
    "紫": "purple", "紫色": "purple", "薰衣草紫": "purple", "深紫": "purple",
    "柔和紫": "purple",
    # 棕/大地
    "棕": "brown", "棕色": "brown", "驼色": "brown", "咖啡色": "brown",
    "卡其": "brown", "卡其色": "brown", "深棕": "brown", "米色": "brown",
    "栗色": "brown",
    # 中性/无彩
    "黑": "neutral", "黑色": "neutral", "白": "neutral", "白色": "neutral",
    "灰": "neutral", "灰色": "neutral", "深灰": "neutral", "银灰": "neutral",
    "冷灰": "neutral", "暖灰": "neutral", "奶油白": "neutral", "米白": "neutral",
    "纯白": "neutral", "纯黑": "neutral",
}

# 颜色族的色环角度（0-360）
_FAMILY_HUE: Dict[str, float] = {
    "red": 0.0,
    "pink": 330.0,
    "orange": 30.0,
    "yellow": 60.0,
    "green": 120.0,
    "blue": 240.0,
    "purple": 270.0,
    "brown": 30.0,  # 大地色归入橙色区间
    "neutral": -1.0,  # 中性色无色相
}

# 中性色（百搭色）
_NEUTRAL_FAMILIES: Set[str] = {"neutral"}

# 场合→正式度
_OCCASION_FORMALITY: Dict[str, float] = {
    "interview": 0.9,
    "work": 0.7,
    "business": 0.85,
    "date": 0.45,
    "daily": 0.2,
    "travel": 0.15,
    "party": 0.4,
    "campus": 0.15,
    "wedding": 0.95,
    "ceremony": 0.95,
}

# 场合→首选风格
_OCCASION_STYLES: Dict[str, List[str]] = {
    "interview": ["business", "smart_casual", "minimalist"],
    "work": ["smart_casual", "business", "minimalist"],
    "business": ["business", "minimalist"],
    "date": ["romantic", "smart_casual", "casual"],
    "daily": ["casual", "minimalist", "smart_casual"],
    "travel": ["casual", "sporty", "bohemian"],
    "party": ["edgy", "streetwear", "romantic"],
    "campus": ["casual", "streetwear", "smart_casual"],
    "wedding": ["formal", "romantic", "minimalist"],
    "ceremony": ["formal", "business"],
}

# 风格正式度映射
_STYLE_FORMALITY: Dict[str, float] = {
    "casual": 0.1,
    "sporty": 0.1,
    "streetwear": 0.15,
    "bohemian": 0.2,
    "smart_casual": 0.5,
    "minimalist": 0.5,
    "romantic": 0.4,
    "edgy": 0.3,
    "business": 0.8,
    "formal": 0.95,
    "korean": 0.3,
    "french": 0.35,
    "japanese": 0.25,
    "preppy": 0.45,
}

# 风格兼容矩阵：1=完全兼容 0.5=可混搭 0=不可混搭
_STYLE_COMPATIBILITY: Dict[str, Dict[str, float]] = {
    "casual":       {"casual": 1.0, "smart_casual": 0.8, "sporty": 0.7, "streetwear": 0.7, "minimalist": 0.7, "bohemian": 0.6, "romantic": 0.5, "edgy": 0.4, "business": 0.2, "formal": 0.1, "korean": 0.8, "french": 0.7, "japanese": 0.7, "preppy": 0.6},
    "smart_casual": {"casual": 0.8, "smart_casual": 1.0, "sporty": 0.3, "streetwear": 0.3, "minimalist": 0.9, "bohemian": 0.3, "romantic": 0.6, "edgy": 0.3, "business": 0.7, "formal": 0.5, "korean": 0.7, "french": 0.7, "japanese": 0.5, "preppy": 0.8},
    "business":     {"casual": 0.2, "smart_casual": 0.7, "sporty": 0.05, "streetwear": 0.05, "minimalist": 0.8, "bohemian": 0.05, "romantic": 0.2, "edgy": 0.05, "business": 1.0, "formal": 0.9, "korean": 0.2, "french": 0.3, "japanese": 0.2, "preppy": 0.7},
    "formal":       {"casual": 0.1, "smart_casual": 0.5, "sporty": 0.0, "streetwear": 0.0, "minimalist": 0.7, "bohemian": 0.0, "romantic": 0.3, "edgy": 0.0, "business": 0.9, "formal": 1.0, "korean": 0.1, "french": 0.2, "japanese": 0.1, "preppy": 0.5},
    "sporty":       {"casual": 0.7, "smart_casual": 0.3, "sporty": 1.0, "streetwear": 0.8, "minimalist": 0.3, "bohemian": 0.2, "romantic": 0.1, "edgy": 0.4, "business": 0.05, "formal": 0.0, "korean": 0.5, "french": 0.2, "japanese": 0.4, "preppy": 0.3},
    "romantic":     {"casual": 0.5, "smart_casual": 0.6, "sporty": 0.1, "streetwear": 0.1, "minimalist": 0.4, "bohemian": 0.6, "romantic": 1.0, "edgy": 0.3, "business": 0.2, "formal": 0.3, "korean": 0.7, "french": 0.9, "japanese": 0.5, "preppy": 0.4},
    "edgy":         {"casual": 0.4, "smart_casual": 0.3, "sporty": 0.4, "streetwear": 0.9, "minimalist": 0.4, "bohemian": 0.2, "romantic": 0.3, "edgy": 1.0, "business": 0.05, "formal": 0.0, "korean": 0.4, "french": 0.3, "japanese": 0.5, "preppy": 0.1},
    "minimalist":   {"casual": 0.7, "smart_casual": 0.9, "sporty": 0.3, "streetwear": 0.4, "minimalist": 1.0, "bohemian": 0.2, "romantic": 0.4, "edgy": 0.4, "business": 0.8, "formal": 0.7, "korean": 0.6, "french": 0.7, "japanese": 0.7, "preppy": 0.6},
    "bohemian":     {"casual": 0.6, "smart_casual": 0.3, "sporty": 0.2, "streetwear": 0.2, "minimalist": 0.2, "bohemian": 1.0, "romantic": 0.6, "edgy": 0.2, "business": 0.05, "formal": 0.0, "korean": 0.3, "french": 0.5, "japanese": 0.3, "preppy": 0.1},
    "streetwear":   {"casual": 0.7, "smart_casual": 0.3, "sporty": 0.8, "streetwear": 1.0, "minimalist": 0.4, "bohemian": 0.2, "romantic": 0.1, "edgy": 0.9, "business": 0.05, "formal": 0.0, "korean": 0.7, "french": 0.2, "japanese": 0.6, "preppy": 0.1},
    "korean":       {"casual": 0.8, "smart_casual": 0.7, "sporty": 0.5, "streetwear": 0.7, "minimalist": 0.6, "bohemian": 0.3, "romantic": 0.7, "edgy": 0.4, "business": 0.2, "formal": 0.1, "korean": 1.0, "french": 0.6, "japanese": 0.7, "preppy": 0.5},
    "french":       {"casual": 0.7, "smart_casual": 0.7, "sporty": 0.2, "streetwear": 0.2, "minimalist": 0.7, "bohemian": 0.5, "romantic": 0.9, "edgy": 0.3, "business": 0.3, "formal": 0.2, "korean": 0.6, "french": 1.0, "japanese": 0.4, "preppy": 0.5},
    "japanese":     {"casual": 0.7, "smart_casual": 0.5, "sporty": 0.4, "streetwear": 0.6, "minimalist": 0.7, "bohemian": 0.3, "romantic": 0.5, "edgy": 0.5, "business": 0.2, "formal": 0.1, "korean": 0.7, "french": 0.4, "japanese": 1.0, "preppy": 0.3},
    "preppy":       {"casual": 0.6, "smart_casual": 0.8, "sporty": 0.3, "streetwear": 0.1, "minimalist": 0.6, "bohemian": 0.1, "romantic": 0.4, "edgy": 0.1, "business": 0.7, "formal": 0.5, "korean": 0.5, "french": 0.5, "japanese": 0.3, "preppy": 1.0},
}

# 体型→推荐版型
_BODY_TYPE_RECOMMENDATIONS: Dict[str, Dict[str, Any]] = {
    "rectangle": {
        "name": "H型",
        "best_fits": ["收腰", "高腰", "a-line", "a字", "有腰线", "垫肩", "荷叶边"],
        "avoid_fits": ["直筒", "宽松无腰", "箱型"],
        "focus": "创造曲线感和层次感",
    },
    "triangle": {
        "name": "A型",
        "best_fits": ["v领", "船领", "一字领", "a字", "a-line", "阔腿", "深色下装"],
        "avoid_fits": ["紧身裤", "铅笔裙", "臀部装饰"],
        "focus": "上身增加量感，下身简洁修饰",
    },
    "inverted_triangle": {
        "name": "Y型",
        "best_fits": ["v领", "u领", "阔腿", "a字", "a-line", "深色上装"],
        "avoid_fits": ["垫肩", "船领", "紧身裤", "肩部装饰"],
        "focus": "柔和肩线，增加下身量感",
    },
    "hourglass": {
        "name": "X型",
        "best_fits": ["收腰", "高腰", "合身", "铅笔裙", "腰带"],
        "avoid_fits": ["直筒", "宽松无腰", "低腰"],
        "focus": "展示曲线优势，强调腰线",
    },
    "oval": {
        "name": "O型",
        "best_fits": ["v领", "垂感", "长款", "直筒", "a字", "a-line"],
        "avoid_fits": ["紧身", "腰部装饰", "短款"],
        "focus": "修饰腰腹，展示四肢",
    },
}


# ---------------------------------------------------------------------------
# Helper: Color utilities
# ---------------------------------------------------------------------------

def _resolve_color_family(color_name: str) -> str:
    """将中文颜色名映射到色环族"""
    if not color_name:
        return "neutral"
    color_lower = color_name.strip().lower()
    # 精确匹配
    if color_lower in _COLOR_FAMILY:
        return _COLOR_FAMILY[color_lower]
    # 模糊匹配：包含关系
    for cn_name, family in _COLOR_FAMILY.items():
        if cn_name in color_lower or color_lower in cn_name:
            return family
    # hex 颜色
    if color_lower.startswith("#"):
        try:
            r = int(color_lower[1:3], 16) / 255.0
            g = int(color_lower[3:5], 16) / 255.0
            b = int(color_lower[5:7], 16) / 255.0
            h, _s, _v = colorsys.rgb_to_hsv(r, g, b)
            hue_deg = h * 360.0
            if _s < 0.15 or _v < 0.15:
                return "neutral"
            if hue_deg < 15 or hue_deg >= 345:
                return "red"
            if hue_deg < 45:
                return "orange"
            if hue_deg < 75:
                return "yellow"
            if hue_deg < 165:
                return "green"
            if hue_deg < 255:
                return "blue"
            if hue_deg < 285:
                return "purple"
            return "red"  # pink region
        except (ValueError, IndexError):
            pass
    return "neutral"


def _hue_distance(family_a: str, family_b: str) -> float:
    """计算两个色族之间的色环角度距离（0-180）"""
    if family_a == "neutral" or family_b == "neutral":
        return 0.0  # 中性色百搭
    if family_a == family_b:
        return 0.0
    hue_a = _FAMILY_HUE.get(family_a, 0.0)
    hue_b = _FAMILY_HUE.get(family_b, 0.0)
    diff = abs(hue_a - hue_b)
    return min(diff, 360.0 - diff)


def _get_season_from_month(month: int) -> str:
    """根据月份推断季节"""
    if month in (3, 4, 5):
        return "spring"
    if month in (6, 7, 8):
        return "summer"
    if month in (9, 10, 11):
        return "fall"
    return "winter"


# ---------------------------------------------------------------------------
# Main Engine
# ---------------------------------------------------------------------------

class FullOutfitEngine:
    """全身搭配方案生成引擎

    使用流程::

        engine = FullOutfitEngine()
        plan = engine.generate_outfit_plan(
            user_profile=user_profile,
            context=outfit_context,
            budget=3000.0,
            candidates=all_items,
        )

    核心算法：
    1. 根据场合+体型+季节确定搭配锚点（anchor piece）
    2. 从锚点出发，按槽位逐步扩展搭配链
    3. 对每个候选单品进行多维度兼容性打分
    4. 对整体方案进行色彩协调、风格一致、天气适配、预算检查
    5. 生成自然语言解释

    Attributes:
        _cache: 方案缓存（LRU + TTL）
    """

    def __init__(self) -> None:
        self._cache: OrderedDict[str, FullOutfitPlan] = OrderedDict()
        self._cache_lock = threading.RLock()
        self._max_cache_size = 200

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def generate_outfit_plan(
        self,
        user_profile: UserProfile,
        context: OutfitContext,
        budget: float = 5000.0,
        candidates: Optional[List[ClothingItem]] = None,
        num_plans: int = 3,
    ) -> List[FullOutfitPlan]:
        """生成完整的搭配方案列表

        Args:
            user_profile: 用户档案
            context: 搭配上下文（场合、天气等）
            budget: 总预算（元）
            candidates: 可选的候选单品池；为空时需要调用方提供
            num_plans: 生成方案数量

        Returns:
            按评分降序排列的搭配方案列表
        """
        if not candidates:
            logger.warning("No candidate items provided; returning empty plans")
            return []

        season = context.season or _get_season_from_month(datetime.now().month)

        # 确定搭配槽位（根据场合和是否穿连衣裙）
        slots = self._determine_slots(context, user_profile)

        # 确定目标风格
        target_styles = self._resolve_target_styles(user_profile, context)

        # 确定目标色彩
        target_colors = self._resolve_target_colors(user_profile, context)

        # 确定正式度
        target_formality = self._resolve_formality(user_profile, context)

        plans: List[FullOutfitPlan] = []

        # 尝试多种锚点组合
        anchor_candidates = self._pick_anchor_candidates(
            candidates, user_profile, context, target_styles, target_formality
        )

        for anchor in anchor_candidates[:num_plans * 2]:
            remaining_budget = budget - anchor.price
            if remaining_budget < 0 and budget > 0:
                continue

            # 基于锚点扩展搭配链
            plan = self._expand_outfit_chain(
                anchor=anchor,
                slots=slots,
                user_profile=user_profile,
                context=context,
                candidates=candidates,
                budget=remaining_budget,
                target_styles=target_styles,
                target_colors=target_colors,
                target_formality=target_formality,
            )

            if plan is None:
                continue

            # 填充元信息
            plan.occasion = context.occasion
            plan.season = season
            plan.total_price = sum(item.price for item in plan.get_all_items())

            # 多维评分
            plan.body_fit_score = self._check_body_fit(plan.get_all_items(), user_profile).score
            color_harmony = self._check_color_harmony(plan.get_all_items())
            plan.color_harmony_score = color_harmony.score
            plan.color_scheme = self._build_color_scheme(plan.get_all_items(), color_harmony)

            style_consistency = self._check_style_consistency(plan.get_all_items())
            plan.style_consistency_score = style_consistency.score
            plan.style_tags = self._extract_dominant_styles(plan.get_all_items())

            if context.temperature_celsius is not None:
                weather = self._check_weather_suitability(
                    plan.get_all_items(), context.temperature_celsius
                )
                plan.weather_score = weather.score
            else:
                plan.weather_score = self._estimate_season_score(
                    plan.get_all_items(), season
                )

            plan.overall_score = self._score_outfit(
                plan.get_all_items(), user_profile, context
            )

            # 生成自然语言解释
            plan.explanation = self._generate_explanation(
                plan, user_profile, context, color_harmony, style_consistency
            )

            plans.append(plan)

        # 去重：基于单品组合的 hash
        seen_hashes: Set[str] = set()
        unique_plans: List[FullOutfitPlan] = []
        for plan in plans:
            h = self._plan_hash(plan)
            if h not in seen_hashes:
                seen_hashes.add(h)
                unique_plans.append(plan)

        # 按综合评分降序
        unique_plans.sort(key=lambda p: p.overall_score, reverse=True)

        return unique_plans[:num_plans]

    def generate_single_plan(
        self,
        user_profile: UserProfile,
        context: OutfitContext,
        budget: float = 5000.0,
        candidates: Optional[List[ClothingItem]] = None,
    ) -> Optional[FullOutfitPlan]:
        """生成单个最优搭配方案

        Args:
            user_profile: 用户档案
            context: 搭配上下文
            budget: 总预算
            candidates: 候选单品池

        Returns:
            最优搭配方案，或 None
        """
        plans = self.generate_outfit_plan(
            user_profile=user_profile,
            context=context,
            budget=budget,
            candidates=candidates,
            num_plans=1,
        )
        return plans[0] if plans else None

    # ------------------------------------------------------------------
    # Anchor piece selection
    # ------------------------------------------------------------------

    def _pick_anchor_piece(
        self,
        candidates: List[ClothingItem],
        user_profile: UserProfile,
        context: OutfitContext,
    ) -> Optional[ClothingItem]:
        """选择核心单品（anchor piece）

        核心单品是整套搭配的锚点，通常是：
        - 正式场合：外套/上装
        - 日常休闲：上装或连衣裙
        - 冬季：外套

        Args:
            candidates: 候选单品列表
            user_profile: 用户档案
            context: 搭配上下文

        Returns:
            最适合的核心单品，或 None
        """
        scored = self._pick_anchor_candidates(
            candidates, user_profile, context, [], 0.5
        )
        return scored[0] if scored else None

    def _pick_anchor_candidates(
        self,
        candidates: List[ClothingItem],
        user_profile: UserProfile,
        context: OutfitContext,
        target_styles: List[str],
        target_formality: float,
    ) -> List[ClothingItem]:
        """选择多个候选核心单品

        策略：
        1. 根据场合确定锚点品类优先级
        2. 对每个候选打分：体型匹配 + 场合匹配 + 季节匹配 + 风格匹配
        3. 返回按分排序的候选列表
        """
        # 确定锚点品类优先级
        anchor_categories = self._get_anchor_categories(context)

        # 筛选合适品类的候选
        filtered = [
            c for c in candidates if c.category in anchor_categories
        ]

        if not filtered:
            # 回退：任意品类
            filtered = list(candidates)

        scored_list: List[Tuple[float, ClothingItem]] = []
        for item in filtered:
            score = 0.0

            # 体型匹配（权重 0.25）
            body_score = self._item_body_fit_score(item, user_profile)
            score += body_score * 0.25

            # 场合匹配（权重 0.25）
            occasion_score = self._item_occasion_score(item, context)
            score += occasion_score * 0.25

            # 正式度匹配（权重 0.15）
            formality_diff = abs(item.formality - target_formality)
            formality_score = max(0.0, 1.0 - formality_diff)
            score += formality_score * 0.15

            # 风格匹配（权重 0.20）
            style_score = self._item_style_score(item, target_styles)
            score += style_score * 0.20

            # 季节匹配（权重 0.10）
            season_score = self._item_season_score(item, context)
            score += season_score * 0.10

            # 价格合理性（权重 0.05）：不是最贵也不是最便宜
            if item.price > 0:
                price_score = 0.5  # 中等价格加分
                score += price_score * 0.05

            scored_list.append((score, item))

        scored_list.sort(key=lambda x: x[0], reverse=True)
        return [item for _, item in scored_list]

    def _get_anchor_categories(self, context: OutfitContext) -> List[str]:
        """根据场合确定锚点品类优先级"""
        occasion = context.occasion
        temp = context.temperature_celsius
        season = context.season or _get_season_from_month(datetime.now().month)

        # 冬季/低温：外套优先
        if (temp is not None and temp < 10) or season == "winter":
            if occasion in ("interview", "business", "work", "wedding", "ceremony"):
                return ["outerwear", "tops", "dresses"]
            return ["outerwear", "tops", "dresses"]

        # 正式场合：上装/连衣裙优先
        if occasion in ("interview", "business", "wedding", "ceremony"):
            return ["tops", "outerwear", "dresses"]

        # 约会/社交：连衣裙或上装
        if occasion in ("date", "party"):
            return ["dresses", "tops", "outerwear"]

        # 日常/旅行
        return ["tops", "dresses", "outerwear"]

    # ------------------------------------------------------------------
    # Outfit chain expansion
    # ------------------------------------------------------------------

    def _expand_outfit_chain(
        self,
        anchor: ClothingItem,
        slots: List[ClothingSlot],
        user_profile: UserProfile,
        context: OutfitContext,
        candidates: List[ClothingItem],
        budget: float,
        target_styles: List[str],
        target_colors: List[str],
        target_formality: float,
    ) -> Optional[FullOutfitPlan]:
        """基于核心单品扩展完整搭配

        逐槽位填充，每个槽位选择与已选单品兼容度最高的候选。
        """
        plan = FullOutfitPlan(
            plan_id=f"plan_{uuid.uuid4().hex[:12]}",
            anchor_piece=anchor,
        )

        selected_items: List[ClothingItem] = [anchor]
        remaining_budget = budget
        used_ids: Set[str] = {anchor.item_id}

        # 确定锚点是什么品类，调整需要填充的槽位
        actual_slots = self._adjust_slots_for_anchor(slots, anchor)

        for slot in actual_slots:
            slot_category = self._slot_to_category(slot)
            if not slot_category:
                continue

            # 从候选中筛选品类匹配
            slot_candidates = [
                c for c in candidates
                if c.category in slot_category
                and c.item_id not in used_ids
            ]

            if not slot_candidates:
                continue

            # 为每个候选计算与已选单品的兼容度
            best_item: Optional[ClothingItem] = None
            best_score = -1.0

            for candidate in slot_candidates:
                # 预算检查
                if remaining_budget > 0 and candidate.price > remaining_budget:
                    continue

                compat = self._item_compatibility_score(
                    candidate, selected_items, user_profile, context,
                    target_styles, target_colors, target_formality,
                )
                if compat > best_score:
                    best_score = compat
                    best_item = candidate

            if best_item is not None:
                self._assign_slot_to_plan(plan, slot, best_item)
                selected_items.append(best_item)
                remaining_budget -= best_item.price
                used_ids.add(best_item.item_id)

        return plan

    def _determine_slots(
        self, context: OutfitContext, user_profile: UserProfile
    ) -> List[ClothingSlot]:
        """确定搭配槽位列表

        根据场合和温度决定需要的层次和配饰。
        """
        slots: List[ClothingSlot] = []
        temp = context.temperature_celsius
        season = context.season or _get_season_from_month(datetime.now().month)

        # 低温层搭
        if temp is not None and temp < 10:
            slots.extend([ClothingSlot.OUTER_TOP, ClothingSlot.INNER_TOP])
        elif temp is not None and temp < 20:
            slots.append(ClothingSlot.OUTER_TOP)
        else:
            slots.append(ClothingSlot.INNER_TOP)

        # 下装 + 鞋子（始终需要）
        slots.extend([ClothingSlot.BOTTOM, ClothingSlot.SHOES])

        # 配饰（根据场合添加）
        occasion = context.occasion
        if occasion in ("date", "party", "wedding"):
            slots.extend([
                ClothingSlot.BAG,
                ClothingSlot.NECKLACE,
                ClothingSlot.EARRINGS,
            ])
        elif occasion in ("interview", "business", "work"):
            slots.extend([ClothingSlot.BAG, ClothingSlot.WATCH])
        elif occasion in ("travel", "daily", "campus"):
            slots.extend([ClothingSlot.BAG, ClothingSlot.SUNGLASSES])
        else:
            slots.extend([ClothingSlot.BAG])

        # 冬季额外配饰
        if season == "winter" or (temp is not None and temp < 5):
            slots.append(ClothingSlot.SCARF)

        return slots

    def _adjust_slots_for_anchor(
        self, slots: List[ClothingSlot], anchor: ClothingItem
    ) -> List[ClothingSlot]:
        """根据锚点品类调整槽位

        如果锚点是连衣裙，则不需要下装和内搭上装。
        如果锚点是外套，则不再需要外层。
        """
        adjusted: List[ClothingSlot] = []
        anchor_cat = anchor.category

        # 连衣裙特殊处理
        if anchor_cat == "dresses":
            for slot in slots:
                if slot in (ClothingSlot.INNER_TOP, ClothingSlot.OUTER_TOP, ClothingSlot.BOTTOM):
                    continue
                adjusted.append(slot)
            # 连衣裙场合需要外套
            adjusted.insert(0, ClothingSlot.OUTER_TOP)
            return adjusted

        # 外套作为锚点：不需要另一个外套，需要内搭
        if anchor_cat == "outerwear":
            for slot in slots:
                if slot == ClothingSlot.OUTER_TOP:
                    continue
                adjusted.append(slot)
            if ClothingSlot.INNER_TOP not in adjusted:
                adjusted.insert(0, ClothingSlot.INNER_TOP)
            return adjusted

        # 上装作为锚点：不需要内搭上装
        if anchor_cat == "tops":
            for slot in slots:
                if slot == ClothingSlot.INNER_TOP:
                    continue
                adjusted.append(slot)
            return adjusted

        return list(slots)

    @staticmethod
    def _slot_to_category(slot: ClothingSlot) -> Optional[List[str]]:
        """将槽位映射到商品品类"""
        mapping: Dict[ClothingSlot, List[str]] = {
            ClothingSlot.OUTER_TOP: ["outerwear"],
            ClothingSlot.INNER_TOP: ["tops"],
            ClothingSlot.DRESS: ["dresses"],
            ClothingSlot.BOTTOM: ["bottoms"],
            ClothingSlot.SHOES: ["footwear"],
            ClothingSlot.BAG: ["accessories"],
            ClothingSlot.NECKLACE: ["accessories"],
            ClothingSlot.SCARF: ["accessories"],
            ClothingSlot.WATCH: ["accessories"],
            ClothingSlot.HAT: ["accessories"],
            ClothingSlot.BELT: ["accessories"],
            ClothingSlot.EARRINGS: ["accessories"],
            ClothingSlot.SUNGLASSES: ["accessories"],
        }
        return mapping.get(slot)

    @staticmethod
    def _assign_slot_to_plan(plan: FullOutfitPlan, slot: ClothingSlot, item: ClothingItem) -> None:
        """将单品分配到方案的对应槽位"""
        if slot == ClothingSlot.OUTER_TOP:
            plan.outer_top = item
        elif slot == ClothingSlot.INNER_TOP:
            plan.inner_top = item
        elif slot == ClothingSlot.BOTTOM:
            plan.bottom = item
        elif slot == ClothingSlot.SHOES:
            plan.shoes = item
        else:
            # 所有配饰归入 accessories 列表
            plan.accessories.append(item)

    # ------------------------------------------------------------------
    # Compatibility scoring (single item vs. already-selected items)
    # ------------------------------------------------------------------

    def _item_compatibility_score(
        self,
        candidate: ClothingItem,
        selected_items: List[ClothingItem],
        user_profile: UserProfile,
        context: OutfitContext,
        target_styles: List[str],
        target_colors: List[str],
        target_formality: float,
    ) -> float:
        """计算候选单品与已选单品的综合兼容度

        维度权重：
        - 色彩兼容 0.25
        - 风格兼容 0.25
        - 场合/正式度 0.15
        - 体型适配 0.15
        - 季节适配 0.10
        - 价格合理 0.10
        """
        score = 0.0

        # 1. 色彩兼容
        color_compat = self._color_compatibility_with_existing(
            candidate, selected_items, target_colors
        )
        score += color_compat * 0.25

        # 2. 风格兼容
        style_compat = self._style_compatibility_with_existing(
            candidate, selected_items, target_styles
        )
        score += style_compat * 0.25

        # 3. 场合/正式度
        occasion_score = self._item_occasion_score(candidate, context)
        formality_diff = abs(candidate.formality - target_formality)
        formality_score = max(0.0, 1.0 - formality_diff * 1.5)
        score += (occasion_score * 0.5 + formality_score * 0.5) * 0.15

        # 4. 体型适配
        body_score = self._item_body_fit_score(candidate, user_profile)
        score += body_score * 0.15

        # 5. 季节适配
        season_score = self._item_season_score(candidate, context)
        score += season_score * 0.10

        # 6. 价格合理（价格适中的加分）
        if candidate.price > 0:
            price_score = 0.5
            if len(selected_items) > 0:
                avg_price = sum(i.price for i in selected_items) / len(selected_items)
                # 与已选单品价格水平接近的加分
                price_ratio = min(candidate.price, avg_price) / max(candidate.price, avg_price, 1)
                price_score = 0.3 + price_ratio * 0.7
            score += price_score * 0.10

        return score

    # ------------------------------------------------------------------
    # Color harmony
    # ------------------------------------------------------------------

    def _check_color_harmony(self, items: List[ClothingItem]) -> ColorHarmonyResult:
        """检查整体色彩协调性

        规则：
        - 不超过 3 个主色调（中性色不算）
        - 主色(60%) + 辅助色(30%) + 点缀色(10%)
        - 使用色环理论判断色彩搭配类型
        - 每种色彩方案有对应的场合适用性

        Args:
            items: 所有单品列表

        Returns:
            色彩协调检查结果
        """
        if not items:
            return ColorHarmonyResult(
                is_harmonious=False,
                score=0.0,
                issues=["没有单品"],
            )

        # 收集所有颜色
        color_families: Dict[str, int] = {}
        for item in items:
            primary = _resolve_color_family(item.color_primary)
            color_families[primary] = color_families.get(primary, 0) + 1
            if item.color_secondary:
                secondary = _resolve_color_family(item.color_secondary)
                color_families[secondary] = color_families.get(secondary, 0) + 1

        # 去掉中性色，统计非中性色族
        non_neutral = {k: v for k, v in color_families.items() if k != "neutral"}
        neutral_count = color_families.get("neutral", 0)
        total_colors = sum(color_families.values())

        # 1. 主色调数量检查
        issues: List[str] = []
        if len(non_neutral) > 3:
            issues.append(
                f"色彩过多（{len(non_neutral)}个主色调），建议控制在3个以内"
            )

        # 2. 色彩比例检查（60-30-10 法则）
        primary_ratio_score = 0.0
        if non_neutral:
            sorted_families = sorted(non_neutral.items(), key=lambda x: x[1], reverse=True)
            dominant_count = sorted_families[0][1]
            dominant_ratio = dominant_count / max(total_colors, 1)

            # 主色应占约 50-70%
            if 0.4 <= dominant_ratio <= 0.7:
                primary_ratio_score = 1.0
            elif 0.3 <= dominant_ratio <= 0.8:
                primary_ratio_score = 0.7
            else:
                primary_ratio_score = 0.4
                issues.append("主色比例不够突出，建议调整为主要颜色占60%")

        # 3. 色环协调检查
        harmony_type = self._classify_color_scheme(non_neutral)
        harmony_score = self._score_color_scheme_type(harmony_type, non_neutral)

        # 4. 中性色搭配检查
        neutral_score = 0.5
        if neutral_count > 0 and len(non_neutral) > 0:
            # 有中性色做平衡是好的
            neutral_score = 0.7 + min(neutral_count / total_colors, 0.3)
        elif neutral_count > 0 and len(non_neutral) == 0:
            # 纯中性色搭配
            neutral_score = 0.8
            harmony_type = ColorSchemeType.ACHROMATIC

        # 综合评分
        final_score = (
            (primary_ratio_score * 0.35)
            + (harmony_score * 0.45)
            + (neutral_score * 0.20)
        )

        # 如果有超过3个非中性色，扣分
        if len(non_neutral) > 3:
            final_score *= max(0.5, 1.0 - (len(non_neutral) - 3) * 0.15)

        is_harmonious = final_score >= 0.6 and len(issues) == 0

        dominant_colors = list(non_neutral.keys())[:3]
        accent_colors = list(non_neutral.keys())[3:] if len(non_neutral) > 3 else []

        suggestion = self._color_harmony_suggestion(harmony_type, issues)

        return ColorHarmonyResult(
            is_harmonious=is_harmonious,
            scheme_type=harmony_type,
            dominant_colors=dominant_colors,
            accent_colors=accent_colors,
            score=round(final_score * 100, 2),
            issues=issues,
            suggestion=suggestion,
        )

    def _classify_color_scheme(self, non_neutral: Dict[str, int]) -> ColorSchemeType:
        """根据色环分类色彩方案类型"""
        families = list(non_neutral.keys())
        if len(families) == 0:
            return ColorSchemeType.ACHROMATIC
        if len(families) == 1:
            return ColorSchemeType.MONOCHROMATIC

        # 计算所有色族之间的色环距离
        hues = [_FAMILY_HUE.get(f, 0.0) for f in families if f != "neutral"]

        if len(hues) < 2:
            return ColorSchemeType.NEUTRAL

        # 检查各种配色类型
        distances = []
        for i in range(len(hues)):
            for j in range(i + 1, len(hues)):
                dist = abs(hues[i] - hues[j])
                dist = min(dist, 360.0 - dist)
                distances.append(dist)

        avg_dist = sum(distances) / len(distances) if distances else 0

        # 互补色（约180度）
        if any(160 < d < 200 for d in distances):
            if len(families) == 2:
                return ColorSchemeType.COMPLEMENTARY
            # 检查分裂互补
            if len(families) == 3:
                small_dists = sorted(distances)[:2]
                if all(d < 60 for d in small_dists):
                    return ColorSchemeType.SPLIT_COMPLEMENTARY
            return ColorSchemeType.COMPLEMENTARY

        # 三角配色（约120度间隔）
        if len(families) == 3 and all(100 < d < 140 for d in distances):
            return ColorSchemeType.TRIADIC

        # 类似色（相邻色环，<60度）
        if all(d < 60 for d in distances):
            return ColorSchemeType.ANALOGOUS

        # 默认归为类似色
        return ColorSchemeType.ANALOGOUS

    def _score_color_scheme_type(
        self, scheme_type: ColorSchemeType, non_neutral: Dict[str, int]
    ) -> float:
        """对色彩方案类型打分

        不同方案类型有不同的基础分和容错度。
        """
        scores: Dict[ColorSchemeType, float] = {
            ColorSchemeType.MONOCHROMATIC: 0.85,      # 同类色安全
            ColorSchemeType.ANALOGOUS: 0.90,           # 类似色最和谐
            ColorSchemeType.NEUTRAL: 0.80,             # 中性色百搭
            ColorSchemeType.ACHROMATIC: 0.75,          # 黑白灰经典
            ColorSchemeType.COMPLEMENTARY: 0.75,       # 互补色需要技巧
            ColorSchemeType.TRIADIC: 0.65,             # 三角配色较难
            ColorSchemeType.SPLIT_COMPLEMENTARY: 0.70, # 分裂互补
        }
        return scores.get(scheme_type, 0.5)

    def _color_harmony_suggestion(
        self, scheme_type: ColorSchemeType, issues: List[str]
    ) -> str:
        """生成色彩建议文本"""
        scheme_names: Dict[ColorSchemeType, str] = {
            ColorSchemeType.MONOCHROMATIC: "同类色搭配",
            ColorSchemeType.ANALOGOUS: "类似色搭配",
            ColorSchemeType.COMPLEMENTARY: "互补色搭配",
            ColorSchemeType.TRIADIC: "三角配色",
            ColorSchemeType.SPLIT_COMPLEMENTARY: "分裂互补搭配",
            ColorSchemeType.NEUTRAL: "中性色搭配",
            ColorSchemeType.ACHROMATIC: "无彩色搭配",
        }
        base = f"当前色彩方案为{scheme_names.get(scheme_type, '混合搭配')}。"
        if issues:
            base += "建议：" + "；".join(issues)
        return base

    def _color_compatibility_with_existing(
        self,
        candidate: ClothingItem,
        selected_items: List[ClothingItem],
        target_colors: List[str],
    ) -> float:
        """计算候选单品与已选单品的色彩兼容度"""
        cand_family = _resolve_color_family(candidate.color_primary)
        if cand_family == "neutral":
            return 0.9  # 中性色百搭

        score = 0.0
        for existing in selected_items:
            ex_family = _resolve_color_family(existing.color_primary)
            if ex_family == "neutral":
                score += 0.85
                continue
            dist = _hue_distance(cand_family, ex_family)
            # 距离越小越和谐，同类色最高分
            if dist < 30:
                score += 0.9
            elif dist < 60:
                score += 0.8
            elif dist < 120:
                score += 0.6
            elif dist < 160:
                score += 0.4
            else:
                # 互补色需要技巧，给中等分
                score += 0.5

        if selected_items:
            score /= len(selected_items)

        # 如果候选颜色在用户目标颜色中，加分
        if target_colors:
            target_families = [_resolve_color_family(c) for c in target_colors]
            if cand_family in target_families:
                score = min(1.0, score + 0.1)

        return min(1.0, score)

    def _build_color_scheme(
        self, items: List[ClothingItem], harmony: ColorHarmonyResult
    ) -> ColorScheme:
        """根据单品和色彩协调结果构建 ColorScheme"""
        color_counts: Dict[str, int] = {}
        for item in items:
            fam = _resolve_color_family(item.color_primary)
            color_counts[fam] = color_counts.get(fam, 0) + 1

        sorted_colors = sorted(color_counts.items(), key=lambda x: x[1], reverse=True)

        primary = sorted_colors[0][0] if sorted_colors else "neutral"
        secondary = sorted_colors[1][0] if len(sorted_colors) > 1 else ""
        accent = sorted_colors[2][0] if len(sorted_colors) > 2 else ""

        scheme_names: Dict[ColorSchemeType, str] = {
            ColorSchemeType.MONOCHROMATIC: "同色系深浅搭配",
            ColorSchemeType.ANALOGOUS: "相近色和谐搭配",
            ColorSchemeType.COMPLEMENTARY: "对比色撞色搭配",
            ColorSchemeType.TRIADIC: "三角配色搭配",
            ColorSchemeType.SPLIT_COMPLEMENTARY: "分裂互补搭配",
            ColorSchemeType.NEUTRAL: "中性色百搭搭配",
            ColorSchemeType.ACHROMATIC: "黑白灰经典搭配",
        }

        return ColorScheme(
            scheme_type=harmony.scheme_type,
            primary_color=primary,
            secondary_color=secondary,
            accent_color=accent,
            description=scheme_names.get(harmony.scheme_type, "综合搭配"),
        )

    # ------------------------------------------------------------------
    # Style consistency
    # ------------------------------------------------------------------

    def _check_style_consistency(self, items: List[ClothingItem]) -> StyleConsistencyResult:
        """检查风格一致性

        规则：
        - 相邻风格可混搭
        - 对立风格不可（如 formal + sporty 不行）
        - 使用兼容矩阵量化风格冲突

        Args:
            items: 所有单品列表

        Returns:
            风格一致性检查结果
        """
        if not items:
            return StyleConsistencyResult(score=0.0)

        # 收集所有风格标签
        all_styles: Dict[str, int] = {}
        for item in items:
            for tag in item.style_tags:
                tag_lower = tag.lower().replace(" ", "_").replace("-", "_")
                all_styles[tag_lower] = all_styles.get(tag_lower, 0) + 1

        if not all_styles:
            # 无风格标签，默认中等一致性
            return StyleConsistencyResult(
                is_consistent=True,
                dominant_style="unknown",
                score=60.0,
            )

        # 找主导风格
        sorted_styles = sorted(all_styles.items(), key=lambda x: x[1], reverse=True)
        dominant_style = sorted_styles[0][0]

        # 检查风格冲突
        conflicts: List[Tuple[str, str]] = []
        issues: List[str] = []
        total_compat = 0.0
        pair_count = 0

        style_list = list(all_styles.keys())
        for i in range(len(style_list)):
            for j in range(i + 1, len(style_list)):
                s1 = style_list[i]
                s2 = style_list[j]
                compat = self._get_style_compatibility(s1, s2)
                total_compat += compat
                pair_count += 1

                if compat < 0.2:
                    conflicts.append((s1, s2))
                    issues.append(f"风格冲突：{s1} 与 {s2} 不搭")
                elif compat < 0.4:
                    issues.append(f"风格轻微不协调：{s1} 与 {s2}")

        avg_compat = total_compat / pair_count if pair_count > 0 else 0.5

        # 评分：兼容度转化为 0-100
        score = avg_compat * 100.0

        # 有严重冲突扣分
        if conflicts:
            score = max(0, score - len(conflicts) * 15)

        is_consistent = len(conflicts) == 0 and score >= 60

        return StyleConsistencyResult(
            is_consistent=is_consistent,
            dominant_style=dominant_style,
            style_conflict=conflicts,
            score=round(score, 2),
            issues=issues,
        )

    def _get_style_compatibility(self, style_a: str, style_b: str) -> float:
        """从兼容矩阵查询两个风格的兼容度"""
        if style_a == style_b:
            return 1.0
        compat = _STYLE_COMPATIBILITY.get(style_a, {}).get(style_b, 0.3)
        return compat

    def _style_compatibility_with_existing(
        self,
        candidate: ClothingItem,
        selected_items: List[ClothingItem],
        target_styles: List[str],
    ) -> float:
        """计算候选单品与已选单品的风格兼容度"""
        cand_styles = [s.lower().replace(" ", "_").replace("-", "_") for s in candidate.style_tags]
        if not cand_styles:
            return 0.5

        total_score = 0.0
        comparisons = 0

        for existing in selected_items:
            ex_styles = [s.lower().replace(" ", "_").replace("-", "_") for s in existing.style_tags]
            if not ex_styles:
                continue

            # 计算候选风格与已有风格的最大兼容度
            best_compat = 0.0
            for cs in cand_styles:
                for es in ex_styles:
                    compat = self._get_style_compatibility(cs, es)
                    best_compat = max(best_compat, compat)

            total_score += best_compat
            comparisons += 1

        avg = total_score / comparisons if comparisons > 0 else 0.5

        # 如果候选风格在目标风格中，加分
        if target_styles:
            target_lower = [s.lower() for s in target_styles]
            matching = [s for s in cand_styles if s in target_lower]
            if matching:
                avg = min(1.0, avg + 0.15)

        return min(1.0, avg)

    # ------------------------------------------------------------------
    # Weather suitability
    # ------------------------------------------------------------------

    def _check_weather_suitability(
        self, items: List[ClothingItem], temperature_celsius: float
    ) -> WeatherResult:
        """检查天气适配性

        规则：
        - <10C: 需要3层（内搭+中间层+外套），优先保暖材质
        - 10-20C: 2层（内搭+外套），可调节
        - 20-25C: 1-2层，轻薄材质
        - >25C: 1层，透气材质

        Args:
            items: 所有单品列表
            temperature_celsius: 当前温度

        Returns:
            天气适配检查结果
        """
        if not items:
            return WeatherResult(is_suitable=False, score=0.0, issues=["没有单品"])

        issues: List[str] = []
        total_warmth = sum(item.warmth_level for item in items)
        layer_count = len([i for i in items if i.category in ("tops", "outerwear", "dresses")])

        # 确定期望的层次和保暖度
        if temperature_celsius < 0:
            expected_layers = 3
            expected_warmth_min = 7
            expected_warmth_max = 12
            temp_label = "极寒"
        elif temperature_celsius < 10:
            expected_layers = 3
            expected_warmth_min = 5
            expected_warmth_max = 10
            temp_label = "寒冷"
        elif temperature_celsius < 15:
            expected_layers = 2
            expected_warmth_min = 3
            expected_warmth_max = 7
            temp_label = "较冷"
        elif temperature_celsius < 20:
            expected_layers = 2
            expected_warmth_min = 2
            expected_warmth_max = 5
            temp_label = "凉爽"
        elif temperature_celsius < 25:
            expected_layers = 1
            expected_warmth_min = 1
            expected_warmth_max = 3
            temp_label = "温暖"
        elif temperature_celsius < 30:
            expected_layers = 1
            expected_warmth_min = 0
            expected_warmth_max = 2
            temp_label = "炎热"
        else:
            expected_layers = 1
            expected_warmth_min = 0
            expected_warmth_max = 1
            temp_label = "酷热"

        # 层次检查
        layer_score = 0.0
        if layer_count >= expected_layers:
            layer_score = 1.0
        elif layer_count == expected_layers - 1:
            layer_score = 0.7
            if expected_layers > 1:
                issues.append(f"当前{temp_label}（{temperature_celsius:.0f}C），建议增加一层穿搭")
        else:
            layer_score = 0.3
            issues.append(f"当前{temp_label}（{temperature_celsius:.0f}C），穿衣层数不足")

        # 保暖度检查
        warmth_score = 0.0
        if expected_warmth_min <= total_warmth <= expected_warmth_max:
            warmth_score = 1.0
        elif total_warmth < expected_warmth_min:
            warmth_score = max(0.2, total_warmth / expected_warmth_min)
            issues.append(f"保暖度不足（当前{total_warmth}，建议{expected_warmth_min}+）")
        elif total_warmth > expected_warmth_max:
            excess_ratio = expected_warmth_max / total_warmth
            warmth_score = max(0.3, excess_ratio)
            issues.append(f"可能过热（保暖度{total_warmth}，建议{expected_warmth_max}以内）")

        final_score = layer_score * 0.5 + warmth_score * 0.5
        final_score *= 100

        is_suitable = len(issues) == 0 and final_score >= 60

        suggestion = ""
        if issues:
            suggestion = f"当前{temp_label}（{temperature_celsius:.0f}C），" + "；".join(issues)

        return WeatherResult(
            is_suitable=is_suitable,
            layer_count=layer_count,
            warmth_total=total_warmth,
            score=round(final_score, 2),
            issues=issues,
            suggestion=suggestion,
        )

    def _estimate_season_score(
        self, items: List[ClothingItem], season: str
    ) -> float:
        """当没有具体温度时，根据季节估算天气适配分"""
        if not items:
            return 0.0

        matching = 0
        total = len(items)
        for item in items:
            if not item.seasons:
                matching += 0.5  # 无季节信息给一半分
            elif season in item.seasons:
                matching += 1.0
            else:
                matching += 0.0

        return round((matching / total) * 100, 2) if total > 0 else 0.0

    # ------------------------------------------------------------------
    # Budget check
    # ------------------------------------------------------------------

    def _check_budget(
        self, items: List[ClothingItem], budget: float
    ) -> BudgetResult:
        """检查价格约束

        Args:
            items: 所有单品列表
            budget: 总预算上限

        Returns:
            价格约束检查结果
        """
        total_price = sum(item.price for item in items)
        remaining = budget - total_price
        is_within = budget <= 0 or total_price <= budget

        # 评分逻辑
        if budget <= 0:
            score = 70.0  # 无预算约束
        elif total_price == 0:
            score = 80.0  # 无价格信息
        else:
            ratio = total_price / budget
            if ratio <= 0.7:
                score = 95.0  # 预算充裕
            elif ratio <= 0.9:
                score = 85.0
            elif ratio <= 1.0:
                score = 70.0
            elif ratio <= 1.1:
                score = 50.0
            else:
                score = max(0, 50 - (ratio - 1.1) * 100)

        issues: List[str] = []
        if not is_within:
            issues.append(f"超出预算：总价{total_price:.0f}元，预算{budget:.0f}元")

        return BudgetResult(
            is_within_budget=is_within,
            total_price=total_price,
            budget_limit=budget,
            remaining_budget=max(0, remaining),
            score=round(score, 2),
            issues=issues,
        )

    # ------------------------------------------------------------------
    # Body fit check
    # ------------------------------------------------------------------

    def _check_body_fit(
        self, items: List[ClothingItem], user_profile: UserProfile
    ) -> BodyFitResult:
        """检查体型适配度

        Args:
            items: 所有单品列表
            user_profile: 用户档案

        Returns:
            体型适配检查结果
        """
        body_type = user_profile.body_type
        if not body_type:
            return BodyFitResult(score=70.0)

        recommendations = _BODY_TYPE_RECOMMENDATIONS.get(body_type)
        if not recommendations:
            return BodyFitResult(score=60.0)

        best_fits = recommendations["best_fits"]
        avoid_fits = recommendations["avoid_fits"]

        fitting_items: List[str] = []
        issues: List[str] = []
        total_score = 0.0

        for item in items:
            item_text = f"{item.name} {item.description} {' '.join(item.style_tags)}".lower()

            # 检查是否有推荐版型
            has_best = any(bf in item_text for bf in best_fits)
            has_avoid = any(af in item_text for af in avoid_fits)

            # 检查 body_type_fit 字段
            if item.body_type_fit:
                bt_match = body_type in item.body_type_fit or any(
                    bt in body_type for bt in item.body_type_fit
                )
                if bt_match:
                    has_best = True

            if has_avoid:
                issues.append(f"{item.name or item.item_id} 可能不适合{recommendations['name']}体型")
                total_score += 0.2
            elif has_best:
                fitting_items.append(item.name or item.item_id)
                total_score += 1.0
            else:
                total_score += 0.6  # 中等适配

        avg_score = (total_score / len(items) * 100) if items else 70.0
        return BodyFitResult(
            score=round(min(100, avg_score), 2),
            fitting_items=fitting_items,
            issues=issues,
        )

    def _item_body_fit_score(
        self, item: ClothingItem, user_profile: UserProfile
    ) -> float:
        """计算单品的体型适配分数"""
        body_type = user_profile.body_type
        if not body_type:
            return 0.6

        recs = _BODY_TYPE_RECOMMENDATIONS.get(body_type)
        if not recs:
            return 0.5

        item_text = f"{item.name} {item.description} {' '.join(item.style_tags)}".lower()

        if any(af in item_text for af in recs["avoid_fits"]):
            return 0.2
        if any(bf in item_text for bf in recs["best_fits"]):
            return 1.0
        if item.body_type_fit and body_type in item.body_type_fit:
            return 0.9
        return 0.6

    # ------------------------------------------------------------------
    # Overall scoring
    # ------------------------------------------------------------------

    def _score_outfit(
        self,
        items: List[ClothingItem],
        user_profile: UserProfile,
        context: OutfitContext,
    ) -> float:
        """综合评分：0-100分

        评分维度及权重：
        - 色彩协调 25%
        - 风格一致 25%
        - 体型适配 20%
        - 天气适配 15%
        - 场合适配 10%
        - 价格合理 5%
        """
        if not items:
            return 0.0

        # 色彩协调
        color = self._check_color_harmony(items)

        # 风格一致
        style = self._check_style_consistency(items)

        # 体型适配
        body = self._check_body_fit(items, user_profile)

        # 天气
        if context.temperature_celsius is not None:
            weather = self._check_weather_suitability(items, context.temperature_celsius)
            weather_score = weather.score
        else:
            weather_score = self._estimate_season_score(items, context.season or _get_season_from_month(datetime.now().month))

        # 场合
        occasion_score = self._overall_occasion_score(items, context) * 100

        # 价格合理性（单品的场合匹配度而非预算检查）
        price_score = 70.0  # 默认中等

        overall = (
            color.score * 0.25
            + style.score * 0.25
            + body.score * 0.20
            + weather_score * 0.15
            + occasion_score * 0.10
            + price_score * 0.05
        )

        return round(min(100.0, overall), 2)

    # ------------------------------------------------------------------
    # Occasion scoring helpers
    # ------------------------------------------------------------------

    def _item_occasion_score(
        self, item: ClothingItem, context: OutfitContext
    ) -> float:
        """计算单品与场合的匹配度"""
        occasion = context.occasion
        if not occasion:
            return 0.6

        # 检查 item.occasions 字段
        if item.occasions and occasion in item.occasions:
            return 1.0
        # 模糊匹配
        if item.occasions:
            for occ in item.occasions:
                if occ in occasion or occasion in occ:
                    return 0.8

        # 基于正式度推断
        target_formality = _OCCASION_FORMALITY.get(occasion, 0.5)
        formality_diff = abs(item.formality - target_formality)
        return max(0.2, 1.0 - formality_diff * 1.5)

    def _overall_occasion_score(
        self, items: List[ClothingItem], context: OutfitContext
    ) -> float:
        """计算整套搭配与场合的整体匹配度"""
        if not items:
            return 0.0
        total = sum(self._item_occasion_score(item, context) for item in items)
        return total / len(items)

    def _item_season_score(
        self, item: ClothingItem, context: OutfitContext
    ) -> float:
        """计算单品与季节的匹配度"""
        season = context.season or _get_season_from_month(datetime.now().month)

        if item.seasons and season in item.seasons:
            return 1.0
        if item.seasons:
            return 0.3
        return 0.5

    def _item_style_score(
        self, item: ClothingItem, target_styles: List[str]
    ) -> float:
        """计算单品风格与目标风格的匹配度"""
        if not target_styles:
            return 0.5

        item_lower = [s.lower().replace(" ", "_").replace("-", "_") for s in item.style_tags]
        target_lower = [s.lower().replace(" ", "_").replace("-", "_") for s in target_styles]

        if not item_lower:
            return 0.4

        matching = len(set(item_lower) & set(target_lower))
        return min(1.0, matching / max(len(target_lower), 1) + 0.3)

    # ------------------------------------------------------------------
    # Style / color resolution helpers
    # ------------------------------------------------------------------

    def _resolve_target_styles(
        self, user_profile: UserProfile, context: OutfitContext
    ) -> List[str]:
        """确定目标风格列表

        优先级：用户偏好 > 场合推荐 > 默认
        """
        styles: List[str] = []

        # 用户风格偏好
        if user_profile.style_preferences:
            styles.extend(user_profile.style_preferences)

        # 场合推荐风格
        occasion_styles = _OCCASION_STYLES.get(context.occasion, [])
        for s in occasion_styles:
            if s not in styles:
                styles.append(s)

        if not styles:
            styles = ["casual", "smart_casual"]

        return styles[:5]

    def _resolve_target_colors(
        self, user_profile: UserProfile, context: OutfitContext
    ) -> List[str]:
        """确定目标色彩列表

        优先级：用户色彩偏好 > 色彩季型推荐 > 场合色彩
        """
        colors: List[str] = []

        if user_profile.color_preferences:
            colors.extend(user_profile.color_preferences)

        # 色彩季型推荐色（复用 stylist 中的知识）
        season_guide = {
            "spring_warm": ["珊瑚粉", "暖黄", "草绿", "杏色"],
            "spring_light": ["浅蓝绿", "奶油白", "桃红"],
            "summer_cool": ["玫瑰粉", "薰衣草紫", "天蓝", "薄荷绿"],
            "summer_light": ["灰粉", "银灰", "浅蓝"],
            "autumn_warm": ["焦糖色", "酒红", "墨绿", "棕色"],
            "autumn_deep": ["芥末黄", "深棕", "驼色"],
            "winter_cool": ["正红", "宝蓝", "纯白", "黑色"],
            "winter_deep": ["翠绿", "玫红", "深灰"],
        }
        if user_profile.color_season:
            recommended = season_guide.get(user_profile.color_season, [])
            for c in recommended:
                if c not in colors:
                    colors.append(c)

        return colors[:8]

    def _resolve_formality(
        self, user_profile: UserProfile, context: OutfitContext
    ) -> float:
        """确定目标正式度"""
        if context.formality_hint is not None:
            return context.formality_hint

        occasion_formality = _OCCASION_FORMALITY.get(context.occasion, 0.5)

        # 如果用户有风格偏好，取中间值
        if user_profile.style_preferences:
            user_formalities = [
                _STYLE_FORMALITY.get(s.lower(), 0.5)
                for s in user_profile.style_preferences
            ]
            user_avg = sum(user_formalities) / len(user_formalities)
            return (occasion_formality + user_avg) / 2

        return occasion_formality

    # ------------------------------------------------------------------
    # Explanation generation
    # ------------------------------------------------------------------

    def _generate_explanation(
        self,
        plan: FullOutfitPlan,
        user_profile: UserProfile,
        context: OutfitContext,
        color_harmony: ColorHarmonyResult,
        style_consistency: StyleConsistencyResult,
    ) -> str:
        """生成自然语言搭配理由

        Args:
            plan: 搭配方案
            user_profile: 用户档案
            context: 搭配上下文
            color_harmony: 色彩协调结果
            style_consistency: 风格一致性结果

        Returns:
            搭配理由的自然语言描述
        """
        parts: List[str] = []

        # 1. 整体风格描述
        occasion_name = {
            "interview": "面试", "work": "通勤", "business": "商务",
            "date": "约会", "daily": "日常", "travel": "出游",
            "party": "聚会", "campus": "校园", "wedding": "婚礼",
            "ceremony": "典礼",
        }.get(context.occasion, context.occasion)

        style_str = ", ".join(plan.style_tags[:3]) if plan.style_tags else "百搭"
        parts.append(f"这套{occasion_name}搭配以{style_str}风格为主")

        # 2. 核心单品说明
        if plan.anchor_piece:
            anchor = plan.anchor_piece
            parts.append(f"以{anchor.name or '核心单品'}为搭配核心")
            if anchor.color_primary:
                parts.append(f"主色调为{anchor.color_primary}")

        # 3. 色彩方案说明
        scheme_desc = {
            ColorSchemeType.MONOCHROMATIC: "同色系深浅渐变，高级感十足",
            ColorSchemeType.ANALOGOUS: "相近色和谐搭配，自然舒适",
            ColorSchemeType.COMPLEMENTARY: "对比色撞色搭配，个性鲜明",
            ColorSchemeType.TRIADIC: "三角配色，时尚大胆",
            ColorSchemeType.SPLIT_COMPLEMENTARY: "分裂互补搭配，层次丰富",
            ColorSchemeType.NEUTRAL: "中性色为基调，百搭实用",
            ColorSchemeType.ACHROMATIC: "黑白灰经典搭配，永不过时",
        }
        cs = plan.color_scheme
        if cs and cs.scheme_type:
            parts.append(scheme_desc.get(cs.scheme_type, "色彩搭配协调"))

        # 4. 体型适配说明
        body_type = user_profile.body_type
        if body_type and body_type in _BODY_TYPE_RECOMMENDATIONS:
            rec = _BODY_TYPE_RECOMMENDATIONS[body_type]
            parts.append(f"针对{rec['name']}体型优化，{rec['focus']}")

        # 5. 评分总结
        parts.append(
            f"综合评分{plan.overall_score:.0f}分"
            f"（色彩{plan.color_harmony_score:.0f}/风格{plan.style_consistency_score:.0f}"
            f"/体型{plan.body_fit_score:.0f}/天气{plan.weather_score:.0f}）"
        )

        return "。".join(parts) + "。"

    # ------------------------------------------------------------------
    # Utility methods
    # ------------------------------------------------------------------

    def _extract_dominant_styles(self, items: List[ClothingItem]) -> List[str]:
        """提取方案的主导风格标签"""
        style_counts: Dict[str, int] = {}
        for item in items:
            for tag in item.style_tags:
                style_counts[tag] = style_counts.get(tag, 0) + 1
        sorted_styles = sorted(style_counts.items(), key=lambda x: x[1], reverse=True)
        return [s for s, _ in sorted_styles[:4]]

    @staticmethod
    def _plan_hash(plan: FullOutfitPlan) -> str:
        """计算方案的唯一标识 hash（用于去重）"""
        item_ids = sorted(item.item_id for item in plan.get_all_items())
        raw = "|".join(item_ids)
        return hashlib.md5(raw.encode("utf-8")).hexdigest()

    def clear_cache(self) -> None:
        """清空方案缓存"""
        with self._cache_lock:
            self._cache.clear()

    def get_stats(self) -> Dict[str, Any]:
        """获取引擎统计信息"""
        with self._cache_lock:
            return {
                "cache_size": len(self._cache),
                "max_cache_size": self._max_cache_size,
            }


# ---------------------------------------------------------------------------
# Module-level singleton & async helper
# ---------------------------------------------------------------------------

_engine_instance: Optional[FullOutfitEngine] = None
_engine_lock = threading.Lock()


def get_outfit_engine() -> FullOutfitEngine:
    """获取全局引擎实例（懒加载单例）"""
    global _engine_instance
    if _engine_instance is None:
        with _engine_lock:
            if _engine_instance is None:
                _engine_instance = FullOutfitEngine()
                logger.info("FullOutfitEngine initialized")
    return _engine_instance


async def generate_full_outfit(
    user_profile: UserProfile,
    context: OutfitContext,
    budget: float = 5000.0,
    candidates: Optional[List[ClothingItem]] = None,
    num_plans: int = 3,
) -> List[Dict[str, Any]]:
    """异步接口：生成全身搭配方案

    使用示例::

        plans = await generate_full_outfit(
            user_profile=user_profile,
            context=OutfitContext(occasion="date", temperature_celsius=18),
            budget=3000,
            candidates=item_pool,
        )
    """
    engine = get_outfit_engine()
    plans = engine.generate_outfit_plan(
        user_profile=user_profile,
        context=context,
        budget=budget,
        candidates=candidates,
        num_plans=num_plans,
    )
    return [plan.to_dict() for plan in plans]
