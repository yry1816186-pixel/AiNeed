"""
用户偏好学习模块

基于对比学习的用户偏好学习系统，用于AI换装推荐。
通过用户的选择历史（正样本）和拒绝历史（负样本）来学习用户偏好向量。

核心算法：
- 对比学习：拉近正样本，推远负样本
- 时间衰减：近期偏好权重更高
- 多维度偏好：风格、颜色、场合等多个维度

参考论文：
1. 李其京 等 - 2023 - 基于偏好学习的视频图像单目标跟踪算法研究
2. 侯磊 - 2024 - 基于图神经网络的用户个性化兼容性建模方法
"""

import os
import json
import hashlib
import numpy as np
from typing import Dict, List, Optional, Any, Tuple, Union
from dataclasses import dataclass, asdict, field
from datetime import datetime, timedelta
from pathlib import Path
from enum import Enum
from collections import defaultdict
import logging
from abc import ABC, abstractmethod

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PreferenceDimension(Enum):
    """偏好维度枚举"""
    STYLE = "style"           # 风格偏好
    COLOR = "color"           # 颜色偏好
    OCCASION = "occasion"     # 场合偏好
    SEASON = "season"         # 季节偏好
    MATERIAL = "material"     # 材质偏好
    PRICE = "price"           # 价格偏好
    FIT = "fit"               # 版型偏好
    BRAND = "brand"           # 品牌偏好


@dataclass
class PreferenceConfig:
    """偏好学习配置"""
    embedding_dim: int = 512
    learning_rate: float = 0.01
    margin: float = 0.2                 # 对比学习边界
    temperature: float = 0.07           # 温度参数（用于softmax）
    decay_rate: float = 0.95            # 时间衰减率
    decay_period_days: float = 30.0    # 衰减周期（天）
    min_samples_for_learning: int = 3   # 最小学习样本数
    max_history_size: int = 1000        # 最大历史记录数
    regularization_lambda: float = 0.01 # L2正则化系数

    # Redis配置
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0
    redis_password: Optional[str] = None
    redis_key_prefix: str = "preference:"

    # 存储路径（用于本地存储）
    storage_path: str = "./data/preferences"


@dataclass
class DecisionRecord:
    """用户决策记录"""
    user_id: str
    session_id: str
    timestamp: datetime
    chosen: Dict[str, Any]              # 用户选择的选项
    rejected: List[Dict[str, Any]]      # 用户拒绝的选项列表
    context: Dict[str, Any] = field(default_factory=dict)  # 决策上下文
    feedback_score: Optional[float] = None  # 用户反馈分数（可选）

    def to_dict(self) -> Dict:
        return {
            "user_id": self.user_id,
            "session_id": self.session_id,
            "timestamp": self.timestamp.isoformat(),
            "chosen": self.chosen,
            "rejected": self.rejected,
            "context": self.context,
            "feedback_score": self.feedback_score
        }

    @classmethod
    def from_dict(cls, data: Dict) -> "DecisionRecord":
        return cls(
            user_id=data["user_id"],
            session_id=data["session_id"],
            timestamp=datetime.fromisoformat(data["timestamp"]),
            chosen=data["chosen"],
            rejected=data["rejected"],
            context=data.get("context", {}),
            feedback_score=data.get("feedback_score")
        )


@dataclass
class PreferenceVector:
    """用户偏好向量"""
    user_id: str
    vector: np.ndarray
    dimension: str
    created_at: datetime
    updated_at: datetime
    sample_count: int = 0
    confidence: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict:
        return {
            "user_id": self.user_id,
            "vector": self.vector.tolist(),
            "dimension": self.dimension,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "sample_count": self.sample_count,
            "confidence": self.confidence,
            "metadata": self.metadata
        }

    @classmethod
    def from_dict(cls, data: Dict) -> "PreferenceVector":
        return cls(
            user_id=data["user_id"],
            vector=np.array(data["vector"]),
            dimension=data["dimension"],
            created_at=datetime.fromisoformat(data["created_at"]),
            updated_at=datetime.fromisoformat(data["updated_at"]),
            sample_count=data.get("sample_count", 0),
            confidence=data.get("confidence", 0.0),
            metadata=data.get("metadata", {})
        )


class StorageBackend(ABC):
    """存储后端抽象类"""

    @abstractmethod
    def save_preference(self, user_id: str, preference: PreferenceVector) -> bool:
        pass

    @abstractmethod
    def load_preference(self, user_id: str, dimension: str) -> Optional[PreferenceVector]:
        pass

    @abstractmethod
    def save_history(self, user_id: str, record: DecisionRecord) -> bool:
        pass

    @abstractmethod
    def load_history(self, user_id: str, limit: int = 100) -> List[DecisionRecord]:
        pass

    @abstractmethod
    def delete_preference(self, user_id: str, dimension: str) -> bool:
        pass


class LocalStorageBackend(StorageBackend):
    """本地文件存储后端"""

    def __init__(self, storage_path: str):
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)
        logger.info(f"Local storage initialized at {self.storage_path}")

    def _get_user_path(self, user_id: str) -> Path:
        user_hash = hashlib.md5(user_id.encode()).hexdigest()
        return self.storage_path / user_hash[:2] / user_hash

    def save_preference(self, user_id: str, preference: PreferenceVector) -> bool:
        try:
            user_path = self._get_user_path(user_id)
            user_path.mkdir(parents=True, exist_ok=True)

            pref_file = user_path / f"preference_{preference.dimension}.json"
            with open(pref_file, 'w', encoding='utf-8') as f:
                json.dump(preference.to_dict(), f, ensure_ascii=False, indent=2)

            logger.debug(f"Saved preference for user {user_id}, dimension {preference.dimension}")
            return True
        except Exception as e:
            logger.error(f"Failed to save preference: {e}")
            return False

    def load_preference(self, user_id: str, dimension: str) -> Optional[PreferenceVector]:
        try:
            user_path = self._get_user_path(user_id)
            pref_file = user_path / f"preference_{dimension}.json"

            if not pref_file.exists():
                return None

            with open(pref_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            return PreferenceVector.from_dict(data)
        except Exception as e:
            logger.error(f"Failed to load preference: {e}")
            return None

    def save_history(self, user_id: str, record: DecisionRecord) -> bool:
        try:
            user_path = self._get_user_path(user_id)
            user_path.mkdir(parents=True, exist_ok=True)

            history_file = user_path / "history.jsonl"

            with open(history_file, 'a', encoding='utf-8') as f:
                f.write(json.dumps(record.to_dict(), ensure_ascii=False) + '\n')

            return True
        except Exception as e:
            logger.error(f"Failed to save history: {e}")
            return False

    def load_history(self, user_id: str, limit: int = 100) -> List[DecisionRecord]:
        try:
            user_path = self._get_user_path(user_id)
            history_file = user_path / "history.jsonl"

            if not history_file.exists():
                return []

            records = []
            with open(history_file, 'r', encoding='utf-8') as f:
                lines = f.readlines()[-limit:]  # 读取最新的记录
                for line in lines:
                    if line.strip():
                        records.append(DecisionRecord.from_dict(json.loads(line)))

            return records
        except Exception as e:
            logger.error(f"Failed to load history: {e}")
            return []

    def delete_preference(self, user_id: str, dimension: str) -> bool:
        try:
            user_path = self._get_user_path(user_id)
            pref_file = user_path / f"preference_{dimension}.json"

            if pref_file.exists():
                pref_file.unlink()

            return True
        except Exception as e:
            logger.error(f"Failed to delete preference: {e}")
            return False


class RedisStorageBackend(StorageBackend):
    """Redis存储后端"""

    def __init__(
        self,
        host: str = "localhost",
        port: int = 6379,
        db: int = 0,
        password: Optional[str] = None,
        key_prefix: str = "preference:"
    ):
        self.host = host
        self.port = port
        self.db = db
        self.password = password
        self.key_prefix = key_prefix
        self._client = None

    @property
    def client(self):
        if self._client is None:
            try:
                import redis
                self._client = redis.Redis(
                    host=self.host,
                    port=self.port,
                    db=self.db,
                    password=self.password,
                    decode_responses=True
                )
                # 测试连接
                self._client.ping()
                logger.info(f"Redis connected: {self.host}:{self.port}")
            except ImportError:
                logger.warning("Redis package not installed, falling back to local storage")
                raise
            except Exception as e:
                logger.error(f"Redis connection failed: {e}")
                raise
        return self._client

    def _get_pref_key(self, user_id: str, dimension: str) -> str:
        return f"{self.key_prefix}{user_id}:{dimension}"

    def _get_history_key(self, user_id: str) -> str:
        return f"{self.key_prefix}{user_id}:history"

    def save_preference(self, user_id: str, preference: PreferenceVector) -> bool:
        try:
            key = self._get_pref_key(user_id, preference.dimension)
            data = json.dumps(preference.to_dict(), ensure_ascii=False)
            self.client.set(key, data)
            return True
        except Exception as e:
            logger.error(f"Failed to save preference to Redis: {e}")
            return False

    def load_preference(self, user_id: str, dimension: str) -> Optional[PreferenceVector]:
        try:
            key = self._get_pref_key(user_id, dimension)
            data = self.client.get(key)

            if not data:
                return None

            return PreferenceVector.from_dict(json.loads(data))
        except Exception as e:
            logger.error(f"Failed to load preference from Redis: {e}")
            return None

    def save_history(self, user_id: str, record: DecisionRecord) -> bool:
        try:
            key = self._get_history_key(user_id)
            data = json.dumps(record.to_dict(), ensure_ascii=False)
            # 使用列表存储历史，保持时间顺序
            self.client.rpush(key, data)
            # 限制历史记录数量
            self.client.ltrim(key, -1000, -1)
            return True
        except Exception as e:
            logger.error(f"Failed to save history to Redis: {e}")
            return False

    def load_history(self, user_id: str, limit: int = 100) -> List[DecisionRecord]:
        try:
            key = self._get_history_key(user_id)
            records_data = self.client.lrange(key, -limit, -1)

            records = []
            for data in records_data:
                records.append(DecisionRecord.from_dict(json.loads(data)))

            return records
        except Exception as e:
            logger.error(f"Failed to load history from Redis: {e}")
            return []

    def delete_preference(self, user_id: str, dimension: str) -> bool:
        try:
            key = self._get_pref_key(user_id, dimension)
            self.client.delete(key)
            return True
        except Exception as e:
            logger.error(f"Failed to delete preference from Redis: {e}")
            return False


class OptionEncoder:
    """选项编码器 - 将选项转换为向量表示"""

    def __init__(self, embedding_dim: int = 512):
        self.embedding_dim = embedding_dim
        # 预定义的特征映射
        self.style_features = self._init_style_features()
        self.color_features = self._init_color_features()
        self.occasion_features = self._init_occasion_features()
        self.category_features = self._init_category_features()
        self.price_range_features = self._init_price_range_features()

    def _init_price_range_features(self) -> Dict[str, np.ndarray]:
        """初始化价格区间特征"""
        # 定义价格区间（单位：元）
        price_ranges = [
            "budget",         # 预算型 (<100)
            "affordable",     # 平价 (100-300)
            "mid_range",      # 中档 (300-800)
            "premium",        # 高档 (800-2000)
            "luxury",         # 奢侈 (2000-5000)
            "ultra_luxury",   # 超奢侈 (>5000)
            # 中文标签
            "预算型", "平价", "中档", "高档", "奢侈", "超奢侈"
        ]
        features = {}
        for price_range in price_ranges:
            np.random.seed(hash(price_range) % (2**32) + 4000)
            features[price_range] = self._normalize(np.random.randn(self.embedding_dim))
        return features

    def _init_style_features(self) -> Dict[str, np.ndarray]:
        """初始化风格特征"""
        styles = [
            "casual", "formal", "sporty", "streetwear", "minimalist",
            "bohemian", "vintage", "romantic", "edgy", "elegant",
            "korean", "french", "japanese", "chinese_modern", "preppy",
            "smart_casual", "小红书", "法式", "韩系", "日系", "复古", "极简"
        ]
        features = {}
        for style in styles:
            np.random.seed(hash(style) % (2**32))
            features[style] = self._normalize(np.random.randn(self.embedding_dim))
        return features

    def _init_color_features(self) -> Dict[str, np.ndarray]:
        """初始化颜色特征"""
        colors = [
            "black", "white", "gray", "red", "blue", "green", "yellow",
            "orange", "purple", "pink", "brown", "beige", "navy",
            "黑色", "白色", "灰色", "红色", "蓝色", "米色", "卡其色",
            "雾霾蓝", "奶茶色", "酒红", "墨绿"
        ]
        features = {}
        for color in colors:
            np.random.seed(hash(color) % (2**32) + 1000)
            features[color] = self._normalize(np.random.randn(self.embedding_dim))
        return features

    def _init_occasion_features(self) -> Dict[str, np.ndarray]:
        """初始化场合特征"""
        occasions = [
            "daily", "work", "date", "party", "casual", "formal",
            "sport", "travel", "wedding", "meeting", "shopping",
            "日常", "上班", "约会", "派对", "运动", "旅行", "正式场合"
        ]
        features = {}
        for occasion in occasions:
            np.random.seed(hash(occasion) % (2**32) + 2000)
            features[occasion] = self._normalize(np.random.randn(self.embedding_dim))
        return features

    def _init_category_features(self) -> Dict[str, np.ndarray]:
        """初始化品类特征"""
        categories = [
            "tops", "bottoms", "dress", "outerwear", "footwear", "accessories",
            "上衣", "下装", "连衣裙", "外套", "鞋子", "配饰",
            "t-shirt", "shirt", "pants", "skirt", "jacket", "coat", "sneakers"
        ]
        features = {}
        for cat in categories:
            np.random.seed(hash(cat) % (2**32) + 3000)
            features[cat] = self._normalize(np.random.randn(self.embedding_dim))
        return features

    def encode(self, option: Dict[str, Any]) -> np.ndarray:
        """
        将选项编码为向量

        Args:
            option: 选项字典，包含风格、颜色、场合、价格等信息

        Returns:
            归一化的向量表示
        """
        embedding = np.zeros(self.embedding_dim)
        weight_sum = 0.0

        # 编码风格特征（权重0.25）
        style_tags = option.get("style_tags", option.get("styles", []))
        if isinstance(style_tags, str):
            style_tags = [style_tags]
        for style in style_tags:
            if style in self.style_features:
                embedding += 0.25 * self.style_features[style]
                weight_sum += 0.25

        # 编码颜色特征（权重0.2）
        color_tags = option.get("color_tags", option.get("colors", []))
        if isinstance(color_tags, str):
            color_tags = [color_tags]
        for color in color_tags:
            if color in self.color_features:
                embedding += 0.2 * self.color_features[color]
                weight_sum += 0.2

        # 编码场合特征（权重0.15）
        occasion_tags = option.get("occasion_tags", option.get("occasions", []))
        if isinstance(occasion_tags, str):
            occasion_tags = [occasion_tags]
        for occasion in occasion_tags:
            if occasion in self.occasion_features:
                embedding += 0.15 * self.occasion_features[occasion]
                weight_sum += 0.15

        # 编码品类特征（权重0.15）
        category = option.get("category", "")
        if category in self.category_features:
            embedding += 0.15 * self.category_features[category]
            weight_sum += 0.15

        # 编码价格区间特征（权重0.1）
        price_range = self._get_price_range(option)
        if price_range and price_range in self.price_range_features:
            embedding += 0.1 * self.price_range_features[price_range]
            weight_sum += 0.1

        # 如果有预计算的embedding，使用它（权重0.15）
        if "embedding" in option:
            pre_embedding = np.array(option["embedding"])
            if len(pre_embedding) == self.embedding_dim:
                embedding += 0.15 * self._normalize(pre_embedding)
                weight_sum += 0.15

        # 归一化
        if weight_sum > 0:
            embedding = embedding / weight_sum

        return self._normalize(embedding)

    def _get_price_range(self, option: Dict[str, Any]) -> Optional[str]:
        """
        根据价格确定价格区间标签

        Args:
            option: 选项字典，可能包含 price, price_range 等字段

        Returns:
            价格区间标签
        """
        # 如果直接提供了价格区间标签
        price_range = option.get("price_range", option.get("priceRange"))
        if price_range and price_range in self.price_range_features:
            return price_range

        # 根据价格数值计算区间
        price = option.get("price", option.get("original_price"))
        if price is not None:
            try:
                price = float(price)
                if price < 100:
                    return "budget"
                elif price < 300:
                    return "affordable"
                elif price < 800:
                    return "mid_range"
                elif price < 2000:
                    return "premium"
                elif price < 5000:
                    return "luxury"
                else:
                    return "ultra_luxury"
            except (ValueError, TypeError):
                pass

        return None

    def get_price_preference_vector(self, price_ranges: List[str]) -> np.ndarray:
        """
        根据价格区间列表生成价格偏好向量

        Args:
            price_ranges: 价格区间标签列表

        Returns:
            价格偏好向量
        """
        embedding = np.zeros(self.embedding_dim)
        count = 0

        for price_range in price_ranges:
            if price_range in self.price_range_features:
                embedding += self.price_range_features[price_range]
                count += 1

        if count > 0:
            return self._normalize(embedding / count)
        return embedding

    def _normalize(self, vector: np.ndarray) -> np.ndarray:
        """L2归一化"""
        norm = np.linalg.norm(vector)
        if norm > 0:
            return vector / norm
        return vector


class ContrastiveLoss:
    """对比学习损失函数"""

    def __init__(self, margin: float = 0.2, temperature: float = 0.07):
        self.margin = margin
        self.temperature = temperature

    def compute(
        self,
        anchor: np.ndarray,
        positive: np.ndarray,
        negatives: List[np.ndarray]
    ) -> float:
        """
        计算对比损失

        Args:
            anchor: 锚点（用户偏好向量）
            positive: 正样本（用户选择的选项）
            negatives: 负样本列表（用户拒绝的选项）

        Returns:
            损失值
        """
        # 正样本距离
        pos_sim = np.dot(anchor, positive)

        # 负样本距离
        neg_sims = [np.dot(anchor, neg) for neg in negatives]

        # 使用InfoNCE损失
        if len(neg_sims) > 0:
            # 计算logits
            logits = np.concatenate([[pos_sim], neg_sims]) / self.temperature

            # Softmax
            exp_logits = np.exp(logits - np.max(logits))
            probs = exp_logits / np.sum(exp_logits)

            # 负对数似然
            loss = -np.log(probs[0] + 1e-10)

            return loss

        # 如果没有负样本，使用triplet loss
        if len(neg_sims) > 0:
            max_neg_sim = max(neg_sims)
            loss = max(0, self.margin - pos_sim + max_neg_sim)
            return loss

        return 0.0

    def compute_gradient(
        self,
        anchor: np.ndarray,
        positive: np.ndarray,
        negatives: List[np.ndarray]
    ) -> Tuple[np.ndarray, np.ndarray, List[np.ndarray]]:
        """
        计算梯度用于更新

        Returns:
            (anchor梯度, positive梯度, negatives梯度列表)
        """
        n_neg = len(negatives)
        if n_neg == 0:
            return np.zeros_like(anchor), np.zeros_like(positive), []

        # 计算相似度
        pos_sim = np.dot(anchor, positive)
        neg_sims = np.array([np.dot(anchor, neg) for neg in negatives])

        # InfoNCE梯度
        logits = np.concatenate([[pos_sim], neg_sims]) / self.temperature
        exp_logits = np.exp(logits - np.max(logits))
        probs = exp_logits / np.sum(exp_logits)

        # 梯度
        grad_anchor = np.zeros_like(anchor)
        grad_positive = -probs[0] * (positive - pos_sim * anchor) / self.temperature
        grad_negatives = []

        for i, neg in enumerate(negatives):
            grad_neg = probs[i + 1] * (neg - neg_sims[i] * anchor) / self.temperature
            grad_negatives.append(grad_neg)
            grad_anchor += grad_neg

        grad_anchor -= probs[0] * (positive - pos_sim * anchor) / self.temperature

        return grad_anchor, grad_positive, grad_negatives


class TimeDecayCalculator:
    """时间衰减计算器"""

    def __init__(
        self,
        decay_rate: float = 0.95,
        decay_period_days: float = 30.0
    ):
        self.decay_rate = decay_rate
        self.decay_period_days = decay_period_days

    def compute_weight(self, timestamp: datetime) -> float:
        """
        计算时间衰减权重

        使用指数衰减: weight = decay_rate ^ (days / decay_period_days)
        """
        now = datetime.now()
        delta = now - timestamp
        days = delta.total_seconds() / (24 * 3600)

        weight = self.decay_rate ** (days / self.decay_period_days)
        return max(weight, 0.1)  # 最小权重0.1

    def compute_weights_batch(self, timestamps: List[datetime]) -> np.ndarray:
        """批量计算时间衰减权重"""
        weights = np.array([self.compute_weight(ts) for ts in timestamps])
        # 归一化
        total = np.sum(weights)
        if total > 0:
            weights = weights / total
        return weights


class PreferenceLearner:
    """
    基于对比学习的用户偏好学习器

    核心思想：
    - 用户选择的选项作为正样本
    - 用户拒绝的选项作为负样本
    - 通过对比学习更新偏好向量
    - 支持时间衰减机制
    """

    def __init__(self, config: Optional[PreferenceConfig] = None):
        self.config = config or PreferenceConfig()
        self.encoder = OptionEncoder(self.config.embedding_dim)
        self.loss_fn = ContrastiveLoss(
            margin=self.config.margin,
            temperature=self.config.temperature
        )
        self.decay_calculator = TimeDecayCalculator(
            decay_rate=self.config.decay_rate,
            decay_period_days=self.config.decay_period_days
        )

        # 用户偏好向量缓存
        self._preference_cache: Dict[str, Dict[str, PreferenceVector]] = defaultdict(dict)

        # 存储后端
        self.storage = self._init_storage()

        logger.info(f"PreferenceLearner initialized with embedding_dim={self.config.embedding_dim}")

    def _init_storage(self) -> StorageBackend:
        """初始化存储后端"""
        # 首先尝试Redis（仅当明确配置了redis_host时）
        if self.config.redis_host:
            try:
                backend = RedisStorageBackend(
                    host=self.config.redis_host,
                    port=self.config.redis_port,
                    db=self.config.redis_db,
                    password=self.config.redis_password,
                    key_prefix=self.config.redis_key_prefix
                )
                # 测试连接是否成功
                _ = backend.client  # 这会在连接失败时抛出异常
                logger.info(f"Using Redis storage backend: {self.config.redis_host}:{self.config.redis_port}")
                return backend
            except ImportError:
                logger.info("Redis package not installed, using local file storage")
            except Exception as e:
                logger.info(f"Redis not available ({e}), using local file storage")

        # 回退到本地存储
        logger.info(f"Using local file storage: {self.config.storage_path}")
        return LocalStorageBackend(self.config.storage_path)

    def learn_from_decision(
        self,
        user_id: str,
        chosen: Dict[str, Any],
        rejected: List[Dict[str, Any]],
        session_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        feedback_score: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        从用户决策中学习

        Args:
            user_id: 用户ID
            chosen: 用户选择的选项
            rejected: 用户拒绝的选项列表
            session_id: 会话ID
            context: 决策上下文
            feedback_score: 用户反馈分数

        Returns:
            学习结果，包含更新信息和损失值
        """
        # 记录决策
        record = DecisionRecord(
            user_id=user_id,
            session_id=session_id or datetime.now().strftime("%Y%m%d%H%M%S"),
            timestamp=datetime.now(),
            chosen=chosen,
            rejected=rejected,
            context=context or {},
            feedback_score=feedback_score
        )
        self.storage.save_history(user_id, record)

        # 编码选项
        chosen_embedding = self.encoder.encode(chosen)
        rejected_embeddings = [self.encoder.encode(r) for r in rejected]

        # 获取或初始化偏好向量
        preference = self._get_or_create_preference(user_id, PreferenceDimension.STYLE.value)

        # 计算损失
        loss = self.loss_fn.compute(
            preference.vector,
            chosen_embedding,
            rejected_embeddings
        )

        # 更新偏好向量
        updated_vector = self._update_preference_vector(
            preference.vector,
            chosen_embedding,
            rejected_embeddings,
            feedback_score
        )

        # 更新偏好
        preference.vector = updated_vector
        preference.updated_at = datetime.now()
        preference.sample_count += 1
        preference.confidence = self._compute_confidence(preference.sample_count, loss)

        # 保存偏好
        self._save_preference(user_id, preference)

        # 更新多维度偏好
        self._update_multidimensional_preferences(
            user_id, chosen, rejected, feedback_score
        )

        return {
            "success": True,
            "loss": float(loss),
            "sample_count": preference.sample_count,
            "confidence": preference.confidence,
            "preference_norm": float(np.linalg.norm(preference.vector))
        }

    def _update_preference_vector(
        self,
        current_vector: np.ndarray,
        positive: np.ndarray,
        negatives: List[np.ndarray],
        feedback_score: Optional[float] = None
    ) -> np.ndarray:
        """
        更新偏好向量

        使用对比学习更新规则：
        - 拉近正样本
        - 推远负样本
        """
        # 学习率调整
        lr = self.config.learning_rate
        if feedback_score is not None:
            lr *= (0.5 + feedback_score)  # 根据反馈调整学习率

        # 计算梯度
        grad_anchor, grad_pos, grad_negs = self.loss_fn.compute_gradient(
            current_vector, positive, negatives
        )

        # 更新向量
        new_vector = current_vector - lr * grad_anchor

        # 对比学习更新：拉近正样本，推远负样本
        for neg_embedding in negatives:
            # 拉近正样本，推远负样本
            direction = positive - neg_embedding
            new_vector += lr * direction

        # L2正则化
        reg_term = self.config.regularization_lambda * current_vector
        new_vector -= reg_term

        # L2归一化
        new_vector = self._normalize(new_vector)

        return new_vector

    def _update_multidimensional_preferences(
        self,
        user_id: str,
        chosen: Dict[str, Any],
        rejected: List[Dict[str, Any]],
        feedback_score: Optional[float] = None
    ):
        """更新多维度偏好"""
        # 颜色偏好
        if "color_tags" in chosen or "colors" in chosen:
            self._update_dimension_preference(
                user_id, PreferenceDimension.COLOR, chosen, rejected, feedback_score
            )

        # 场合偏好
        if "occasion_tags" in chosen or "occasions" in chosen:
            self._update_dimension_preference(
                user_id, PreferenceDimension.OCCASION, chosen, rejected, feedback_score
            )

        # 价格偏好 - 始终尝试更新，因为价格信息可能存在
        if "price" in chosen or "price_range" in chosen or "priceRange" in chosen:
            self._update_dimension_preference(
                user_id, PreferenceDimension.PRICE, chosen, rejected, feedback_score
            )

    def get_price_preference_summary(self, user_id: str) -> Dict[str, Any]:
        """
        获取用户价格偏好摘要

        Args:
            user_id: 用户ID

        Returns:
            价格偏好摘要，包含偏好区间和分布
        """
        preference = self._get_or_create_preference(user_id, PreferenceDimension.PRICE.value)

        # 分析价格偏好向量与各价格区间的相似度
        price_similarities = {}
        for price_range, feature in self.encoder.price_range_features.items():
            similarity = float(np.dot(preference.vector, feature))
            price_similarities[price_range] = similarity

        # 找出最偏好的价格区间
        sorted_ranges = sorted(price_similarities.items(), key=lambda x: x[1], reverse=True)

        # 计算价格偏好分布
        total_sim = sum(max(0, s) for _, s in sorted_ranges[:6])  # 只取英文标签
        distribution = {}
        for price_range, sim in sorted_ranges[:6]:  # 只取英文标签
            if total_sim > 0:
                distribution[price_range] = max(0, sim) / total_sim
            else:
                distribution[price_range] = 0

        # 确定主要价格偏好
        primary_range = sorted_ranges[0][0] if sorted_ranges else "mid_range"
        range_names = {
            "budget": "预算型 (<100元)",
            "affordable": "平价 (100-300元)",
            "mid_range": "中档 (300-800元)",
            "premium": "高档 (800-2000元)",
            "luxury": "奢侈 (2000-5000元)",
            "ultra_luxury": "超奢侈 (>5000元)"
        }

        return {
            "primary_range": primary_range,
            "primary_range_name": range_names.get(primary_range, primary_range),
            "distribution": distribution,
            "confidence": preference.confidence,
            "sample_count": preference.sample_count,
            "price_sensitivities": price_similarities
        }

    def _update_dimension_preference(
        self,
        user_id: str,
        dimension: PreferenceDimension,
        chosen: Dict[str, Any],
        rejected: List[Dict[str, Any]],
        feedback_score: Optional[float] = None
    ):
        """更新特定维度的偏好"""
        preference = self._get_or_create_preference(user_id, dimension.value)

        chosen_embedding = self.encoder.encode(chosen)
        rejected_embeddings = [self.encoder.encode(r) for r in rejected]

        updated_vector = self._update_preference_vector(
            preference.vector,
            chosen_embedding,
            rejected_embeddings,
            feedback_score
        )

        preference.vector = updated_vector
        preference.updated_at = datetime.now()
        preference.sample_count += 1

        self._save_preference(user_id, preference)

    def _get_or_create_preference(
        self,
        user_id: str,
        dimension: str
    ) -> PreferenceVector:
        """获取或创建偏好向量"""
        # 检查缓存
        if user_id in self._preference_cache and dimension in self._preference_cache[user_id]:
            return self._preference_cache[user_id][dimension]

        # 从存储加载
        preference = self.storage.load_preference(user_id, dimension)

        if preference is None:
            # 创建新的偏好向量
            preference = PreferenceVector(
                user_id=user_id,
                vector=np.zeros(self.config.embedding_dim),
                dimension=dimension,
                created_at=datetime.now(),
                updated_at=datetime.now(),
                sample_count=0,
                confidence=0.0
            )

        # 缓存
        self._preference_cache[user_id][dimension] = preference
        return preference

    def _save_preference(self, user_id: str, preference: PreferenceVector):
        """保存偏好向量"""
        self._preference_cache[user_id][preference.dimension] = preference
        self.storage.save_preference(user_id, preference)

    def _compute_confidence(self, sample_count: int, loss: float) -> float:
        """计算置信度"""
        # 基于样本数量
        sample_confidence = min(1.0, sample_count / 50)

        # 基于损失值
        loss_confidence = max(0.0, 1.0 - loss)

        # 综合置信度
        confidence = 0.6 * sample_confidence + 0.4 * loss_confidence
        return min(1.0, max(0.0, confidence))

    def _normalize(self, vector: np.ndarray) -> np.ndarray:
        """L2归一化"""
        norm = np.linalg.norm(vector)
        if norm > 0:
            return vector / norm
        return vector

    def get_preference_vector(
        self,
        user_id: str,
        dimension: str = "style",
        apply_decay: bool = True
    ) -> np.ndarray:
        """
        获取用户偏好向量

        Args:
            user_id: 用户ID
            dimension: 偏好维度
            apply_decay: 是否应用时间衰减

        Returns:
            偏好向量
        """
        preference = self._get_or_create_preference(user_id, dimension)

        if apply_decay and preference.sample_count > 0:
            # 加载历史并应用时间衰减
            history = self.storage.load_history(user_id, limit=100)

            if history:
                # 重新计算带时间衰减的偏好向量
                weighted_vector = np.zeros(self.config.embedding_dim)
                weight_sum = 0.0

                for record in history:
                    weight = self.decay_calculator.compute_weight(record.timestamp)
                    chosen_embedding = self.encoder.encode(record.chosen)
                    weighted_vector += weight * chosen_embedding
                    weight_sum += weight

                if weight_sum > 0:
                    weighted_vector = weighted_vector / weight_sum
                    # 融合历史偏好和当前偏好
                    alpha = min(0.7, preference.confidence)
                    preference.vector = alpha * preference.vector + (1 - alpha) * weighted_vector
                    preference.vector = self._normalize(preference.vector)

        return preference.vector

    def get_preference_scores(
        self,
        user_id: str,
        items: List[Dict[str, Any]],
        dimension: str = "style"
    ) -> List[float]:
        """
        计算用户对物品的偏好分数

        Args:
            user_id: 用户ID
            items: 物品列表
            dimension: 偏好维度

        Returns:
            偏好分数列表
        """
        preference_vector = self.get_preference_vector(user_id, dimension)

        scores = []
        for item in items:
            item_embedding = self.encoder.encode(item)
            score = float(np.dot(preference_vector, item_embedding))
            scores.append(score)

        return scores

    def rank_items(
        self,
        user_id: str,
        items: List[Dict[str, Any]],
        dimension: str = "style",
        top_k: int = 10
    ) -> List[Tuple[int, float, Dict[str, Any]]]:
        """
        根据用户偏好对物品排序

        Args:
            user_id: 用户ID
            items: 物品列表
            dimension: 偏好维度
            top_k: 返回前k个

        Returns:
            排序后的物品列表，每项为(索引, 分数, 物品信息)
        """
        scores = self.get_preference_scores(user_id, items, dimension)

        # 排序
        indexed_scores = list(enumerate(scores))
        indexed_scores.sort(key=lambda x: x[1], reverse=True)

        results = []
        for i, score in indexed_scores[:top_k]:
            results.append((i, score, items[i]))

        return results

    def batch_learn(
        self,
        user_id: str,
        decisions: List[Tuple[Dict, List[Dict], Optional[float]]]
    ) -> Dict[str, Any]:
        """
        批量学习用户决策

        Args:
            user_id: 用户ID
            decisions: 决策列表，每项为(chosen, rejected, feedback_score)

        Returns:
            批量学习结果
        """
        total_loss = 0.0
        success_count = 0

        for chosen, rejected, feedback in decisions:
            result = self.learn_from_decision(
                user_id,
                chosen,
                rejected,
                feedback_score=feedback
            )
            if result["success"]:
                total_loss += result["loss"]
                success_count += 1

        avg_loss = total_loss / success_count if success_count > 0 else 0.0

        preference = self._get_or_create_preference(user_id, PreferenceDimension.STYLE.value)

        return {
            "success": True,
            "total_samples": len(decisions),
            "processed_samples": success_count,
            "average_loss": avg_loss,
            "final_confidence": preference.confidence
        }

    def apply_time_decay(self, user_id: str) -> Dict[str, Any]:
        """
        应用时间衰减到用户偏好

        根据历史记录重新计算偏好向量，应用时间衰减
        """
        history = self.storage.load_history(user_id, limit=self.config.max_history_size)

        if not history:
            return {"success": False, "message": "No history found"}

        # 按维度分组
        dimension_vectors: Dict[str, List[Tuple[np.ndarray, datetime]]] = defaultdict(list)

        for record in history:
            # 为每个维度提取特征
            for dim in [PreferenceDimension.STYLE, PreferenceDimension.COLOR]:
                embedding = self.encoder.encode(record.chosen)
                dimension_vectors[dim.value].append((embedding, record.timestamp))

        updated_dimensions = []

        for dimension, vectors_with_time in dimension_vectors.items():
            if len(vectors_with_time) < self.config.min_samples_for_learning:
                continue

            # 计算时间衰减加权的偏好向量
            weighted_vector = np.zeros(self.config.embedding_dim)
            weight_sum = 0.0

            for vector, timestamp in vectors_with_time:
                weight = self.decay_calculator.compute_weight(timestamp)
                weighted_vector += weight * vector
                weight_sum += weight

            if weight_sum > 0:
                weighted_vector = self._normalize(weighted_vector / weight_sum)

                # 更新偏好
                preference = self._get_or_create_preference(user_id, dimension)
                preference.vector = weighted_vector
                preference.updated_at = datetime.now()

                self._save_preference(user_id, preference)
                updated_dimensions.append(dimension)

        return {
            "success": True,
            "updated_dimensions": updated_dimensions,
            "history_size": len(history)
        }

    def get_user_profile(self, user_id: str) -> Dict[str, Any]:
        """
        获取用户偏好档案

        Returns:
            包含各维度偏好的完整档案
        """
        profile = {
            "user_id": user_id,
            "dimensions": {},
            "history_count": 0,
            "last_updated": None
        }

        # 加载各维度偏好
        for dim in PreferenceDimension:
            preference = self.storage.load_preference(user_id, dim.value)
            if preference:
                profile["dimensions"][dim.value] = {
                    "confidence": preference.confidence,
                    "sample_count": preference.sample_count,
                    "updated_at": preference.updated_at.isoformat(),
                    "vector_norm": float(np.linalg.norm(preference.vector))
                }

                if profile["last_updated"] is None or preference.updated_at > datetime.fromisoformat(profile["last_updated"]):
                    profile["last_updated"] = preference.updated_at.isoformat()

        # 统计历史记录
        history = self.storage.load_history(user_id, limit=1000)
        profile["history_count"] = len(history)

        return profile

    def reset_preference(
        self,
        user_id: str,
        dimension: Optional[str] = None
    ) -> bool:
        """
        重置用户偏好

        Args:
            user_id: 用户ID
            dimension: 要重置的维度，None表示重置所有维度

        Returns:
            是否成功
        """
        try:
            if dimension:
                self.storage.delete_preference(user_id, dimension)
                if user_id in self._preference_cache and dimension in self._preference_cache[user_id]:
                    del self._preference_cache[user_id][dimension]
            else:
                for dim in PreferenceDimension:
                    self.storage.delete_preference(user_id, dim.value)
                if user_id in self._preference_cache:
                    del self._preference_cache[user_id]

            logger.info(f"Reset preference for user {user_id}, dimension {dimension or 'all'}")
            return True
        except Exception as e:
            logger.error(f"Failed to reset preference: {e}")
            return False

    def export_preferences(self, user_id: str) -> Dict[str, Any]:
        """导出用户偏好数据"""
        export_data = {
            "user_id": user_id,
            "exported_at": datetime.now().isoformat(),
            "preferences": {},
            "history": []
        }

        # 导出偏好向量
        for dim in PreferenceDimension:
            preference = self.storage.load_preference(user_id, dim.value)
            if preference:
                export_data["preferences"][dim.value] = preference.to_dict()

        # 导出历史
        history = self.storage.load_history(user_id, limit=1000)
        export_data["history"] = [r.to_dict() for r in history]

        return export_data

    def import_preferences(self, user_id: str, data: Dict[str, Any]) -> bool:
        """导入用户偏好数据"""
        try:
            # 导入偏好向量
            for dimension, pref_data in data.get("preferences", {}).items():
                preference = PreferenceVector.from_dict(pref_data)
                self._save_preference(user_id, preference)

            # 导入历史
            for record_data in data.get("history", []):
                record = DecisionRecord.from_dict(record_data)
                self.storage.save_history(user_id, record)

            logger.info(f"Imported preferences for user {user_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to import preferences: {e}")
            return False


class PreferenceBasedRecommender:
    """基于偏好的推荐器"""

    def __init__(self, learner: PreferenceLearner):
        self.learner = learner

    def recommend(
        self,
        user_id: str,
        candidates: List[Dict[str, Any]],
        top_k: int = 10,
        diversity_factor: float = 0.3
    ) -> List[Dict[str, Any]]:
        """
        基于用户偏好推荐物品

        Args:
            user_id: 用户ID
            candidates: 候选物品列表
            top_k: 返回数量
            diversity_factor: 多样性因子

        Returns:
            推荐结果列表
        """
        if not candidates:
            return []

        # 获取偏好分数
        scores = self.learner.get_preference_scores(user_id, candidates)

        # 多样化重排
        recommendations = []
        selected_indices = set()

        while len(recommendations) < top_k and len(selected_indices) < len(candidates):
            best_idx = -1
            best_score = -float('inf')

            for i, score in enumerate(scores):
                if i in selected_indices:
                    continue

                # 计算与已选物品的相似度惩罚
                diversity_penalty = 0.0
                if recommendations and diversity_factor > 0:
                    for rec in recommendations:
                        sim = self._compute_similarity(candidates[i], rec["item"])
                        diversity_penalty += sim

                final_score = score - diversity_factor * diversity_penalty

                if final_score > best_score:
                    best_score = final_score
                    best_idx = i

            if best_idx >= 0:
                selected_indices.add(best_idx)
                recommendations.append({
                    "item": candidates[best_idx],
                    "score": scores[best_idx],
                    "final_score": best_score,
                    "index": best_idx
                })

        return recommendations

    def _compute_similarity(self, item1: Dict, item2: Dict) -> float:
        """计算两个物品的相似度"""
        emb1 = self.learner.encoder.encode(item1)
        emb2 = self.learner.encoder.encode(item2)
        return float(np.dot(emb1, emb2))


def create_preference_learner(
    embedding_dim: int = 512,
    learning_rate: float = 0.01,
    use_redis: bool = False,
    redis_config: Optional[Dict] = None,
    storage_path: str = "./data/preferences"
) -> PreferenceLearner:
    """
    创建偏好学习器的便捷函数

    Args:
        embedding_dim: 嵌入维度
        learning_rate: 学习率
        use_redis: 是否使用Redis
        redis_config: Redis配置
        storage_path: 本地存储路径

    Returns:
        PreferenceLearner实例
    """
    config = PreferenceConfig(
        embedding_dim=embedding_dim,
        learning_rate=learning_rate,
        storage_path=storage_path
    )

    if use_redis and redis_config:
        config.redis_host = redis_config.get("host", "localhost")
        config.redis_port = redis_config.get("port", 6379)
        config.redis_db = redis_config.get("db", 0)
        config.redis_password = redis_config.get("password")

    return PreferenceLearner(config)


# 便捷API
class PreferenceAPI:
    """偏好学习API"""

    def __init__(self, learner: Optional[PreferenceLearner] = None):
        self.learner = learner or create_preference_learner()

    async def record_choice(
        self,
        user_id: str,
        chosen_item: Dict,
        rejected_items: List[Dict],
        session_id: Optional[str] = None
    ) -> Dict:
        """记录用户选择"""
        return self.learner.learn_from_decision(
            user_id,
            chosen_item,
            rejected_items,
            session_id=session_id
        )

    async def get_recommendations(
        self,
        user_id: str,
        items: List[Dict],
        top_k: int = 10
    ) -> List[Dict]:
        """获取推荐"""
        recommender = PreferenceBasedRecommender(self.learner)
        return recommender.recommend(user_id, items, top_k)

    async def get_user_preferences(self, user_id: str) -> Dict:
        """获取用户偏好"""
        return self.learner.get_user_profile(user_id)


if __name__ == "__main__":
    # 测试代码
    print("="*60)
    print("Preference Learner Test")
    print("="*60)

    # 创建学习器
    learner = create_preference_learner(
        embedding_dim=512,
        learning_rate=0.01,
        storage_path="./test_preferences"
    )

    # 模拟用户决策
    user_id = "test_user_001"

    decisions = [
        (
            {
                "category": "tops",
                "style_tags": ["casual", "minimalist"],
                "color_tags": ["白色", "米色"],
                "occasion_tags": ["日常", "上班"]
            },
            [
                {
                    "category": "tops",
                    "style_tags": ["streetwear"],
                    "color_tags": ["黑色"],
                    "occasion_tags": ["派对"]
                },
                {
                    "category": "tops",
                    "style_tags": ["sporty"],
                    "color_tags": ["荧光色"],
                    "occasion_tags": ["运动"]
                }
            ]
        ),
        (
            {
                "category": "bottoms",
                "style_tags": ["casual", "韩系"],
                "color_tags": ["蓝色", "灰色"],
                "occasion_tags": ["日常", "约会"]
            },
            [
                {
                    "category": "bottoms",
                    "style_tags": ["formal"],
                    "color_tags": ["黑色"],
                    "occasion_tags": ["正式场合"]
                }
            ]
        ),
        (
            {
                "category": "dress",
                "style_tags": ["romantic", "vintage"],
                "color_tags": ["酒红", "米色"],
                "occasion_tags": ["约会", "派对"]
            },
            [
                {
                    "category": "dress",
                    "style_tags": ["sporty"],
                    "color_tags": ["黑色"],
                    "occasion_tags": ["运动"]
                }
            ]
        )
    ]

    # 学习决策
    print("\n1. Learning from decisions...")
    for i, (chosen, rejected) in enumerate(decisions):
        result = learner.learn_from_decision(user_id, chosen, rejected)
        print(f"   Decision {i+1}: loss={result['loss']:.4f}, confidence={result['confidence']:.4f}")

    # 获取偏好向量
    print("\n2. Getting preference vector...")
    pref_vector = learner.get_preference_vector(user_id)
    print(f"   Vector norm: {np.linalg.norm(pref_vector):.4f}")
    print(f"   Vector shape: {pref_vector.shape}")

    # 测试推荐
    print("\n3. Testing recommendations...")
    test_items = [
        {
            "item_id": "item_001",
            "category": "tops",
            "style_tags": ["casual", "minimalist"],
            "color_tags": ["白色"],
            "occasion_tags": ["日常"]
        },
        {
            "item_id": "item_002",
            "category": "tops",
            "style_tags": ["streetwear"],
            "color_tags": ["黑色"],
            "occasion_tags": ["派对"]
        },
        {
            "item_id": "item_003",
            "category": "dress",
            "style_tags": ["romantic"],
            "color_tags": ["酒红"],
            "occasion_tags": ["约会"]
        },
        {
            "item_id": "item_004",
            "category": "outerwear",
            "style_tags": ["韩系"],
            "color_tags": ["米色"],
            "occasion_tags": ["日常"]
        }
    ]

    recommender = PreferenceBasedRecommender(learner)
    recommendations = recommender.recommend(user_id, test_items, top_k=4)

    print("   Recommendations:")
    for i, rec in enumerate(recommendations):
        print(f"   {i+1}. {rec['item']['item_id']} - score: {rec['score']:.4f}")

    # 获取用户档案
    print("\n4. User profile:")
    profile = learner.get_user_profile(user_id)
    print(f"   User ID: {profile['user_id']}")
    print(f"   History count: {profile['history_count']}")
    print(f"   Dimensions: {list(profile['dimensions'].keys())}")

    # 测试时间衰减
    print("\n5. Applying time decay...")
    decay_result = learner.apply_time_decay(user_id)
    print(f"   Updated dimensions: {decay_result.get('updated_dimensions', [])}")

    print("\n" + "="*60)
    print("Test completed successfully!")
    print("="*60)
