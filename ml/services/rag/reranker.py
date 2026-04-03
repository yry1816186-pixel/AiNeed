"""
Reranker Module for Fashion RAG
Implements BGE-Reranker and Cross-Encoder reranking
2026 Standard Implementation

Features:
- BGE-Reranker and Cross-Encoder support
- Redis caching for reranking results
- Fashion-specific keyword boosting
- Memory protection with batch processing and limits
"""

import os
import json
import logging
import hashlib
import asyncio
import sys
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
import numpy as np

logger = logging.getLogger(__name__)


# Memory protection settings
MAX_DOCUMENTS_PER_RERANK = int(os.getenv("RERANK_MAX_DOCS", "100"))
MAX_DOCUMENT_LENGTH = int(os.getenv("RERANK_MAX_DOC_LENGTH", "2000"))
MEMORY_WARNING_THRESHOLD = int(os.getenv("RERANK_MEMORY_WARNING_MB", "500"))


def check_memory_usage() -> int:
    """Check current memory usage in MB."""
    try:
        import psutil
        process = psutil.Process()
        return process.memory_info().rss // (1024 * 1024)
    except ImportError:
        return 0


def truncate_document(doc: str, max_length: int = MAX_DOCUMENT_LENGTH) -> str:
    """
    Truncate document to prevent memory issues.

    Args:
        doc: Document text
        max_length: Maximum characters

    Returns:
        Truncated document
    """
    if len(doc) <= max_length:
        return doc
    return doc[:max_length] + "...[truncated]"


@dataclass
class RerankerConfig:
    """Configuration for reranker models"""
    model_name: str = "BAAI/bge-reranker-base"
    device: str = "auto"
    batch_size: int = 16
    max_length: int = 512
    cache_dir: Optional[str] = None

    # Redis cache settings
    enable_cache: bool = True
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    cache_ttl: int = 3600  # 1 hour default TTL
    cache_prefix: str = "rag:rerank:"

    # Memory protection settings
    max_documents: int = MAX_DOCUMENTS_PER_RERANK
    max_document_length: int = MAX_DOCUMENT_LENGTH
    memory_warning_threshold_mb: int = MEMORY_WARNING_THRESHOLD
    enable_memory_protection: bool = True


class RerankCache:
    """
    Redis-based cache for reranking results.

    Caches query-document pair scores to avoid repeated model inference
    for identical queries.
    """

    def __init__(
        self,
        redis_url: str = "redis://localhost:6379",
        ttl: int = 3600,
        prefix: str = "rag:rerank:",
        enabled: bool = True
    ):
        self.redis_url = redis_url
        self.ttl = ttl
        self.prefix = prefix
        self.enabled = enabled
        self._redis = None
        self._local_cache: Dict[str, Tuple[List[float], float]] = {}
        self._max_local_cache_size = 1000

    async def _get_redis(self):
        """Get or create Redis connection (async)."""
        if self._redis is None and self.enabled:
            try:
                import redis.asyncio as redis
                self._redis = redis.from_url(self.redis_url, decode_responses=True)
                logger.info(f"RerankCache connected to Redis: {self.redis_url}")
            except Exception as e:
                logger.warning(f"Failed to connect to Redis: {e}, using local cache only")
                self.enabled = False
        return self._redis

    def _get_sync_redis(self):
        """Get or create Redis connection (sync)."""
        if self._redis is None and self.enabled:
            try:
                import redis
                self._redis = redis.from_url(self.redis_url, decode_responses=True)
                logger.info(f"RerankCache connected to Redis: {self.redis_url}")
            except Exception as e:
                logger.warning(f"Failed to connect to Redis: {e}, using local cache only")
                self.enabled = False
        return self._redis

    def _generate_cache_key(self, query: str, documents: List[str]) -> str:
        """Generate a cache key for query-document pairs."""
        # Create a hash of the query and documents
        content = query + "".join(documents[:10])  # Limit to first 10 docs for key
        content_hash = hashlib.sha256(content.encode()).hexdigest()[:16]
        return f"{self.prefix}{content_hash}"

    def get(self, query: str, documents: List[str]) -> Optional[List[float]]:
        """
        Get cached reranking scores (synchronous).

        Args:
            query: Query string
            documents: List of document strings

        Returns:
            Cached scores or None if not found
        """
        if not self.enabled:
            return None

        cache_key = self._generate_cache_key(query, documents)

        # Check local cache first
        if cache_key in self._local_cache:
            scores, _ = self._local_cache[cache_key]
            return scores

        # Try Redis
        try:
            redis_client = self._get_sync_redis()
            if redis_client:
                cached = redis_client.get(cache_key)
                if cached:
                    scores = json.loads(cached)
                    # Store in local cache for faster access
                    self._update_local_cache(cache_key, scores)
                    return scores
        except Exception as e:
            logger.debug(f"Cache get error: {e}")

        return None

    async def async_get(self, query: str, documents: List[str]) -> Optional[List[float]]:
        """
        Get cached reranking scores (asynchronous).

        Args:
            query: Query string
            documents: List of document strings

        Returns:
            Cached scores or None if not found
        """
        if not self.enabled:
            return None

        cache_key = self._generate_cache_key(query, documents)

        # Check local cache first
        if cache_key in self._local_cache:
            scores, _ = self._local_cache[cache_key]
            return scores

        # Try Redis
        try:
            redis_client = await self._get_redis()
            if redis_client:
                cached = await redis_client.get(cache_key)
                if cached:
                    scores = json.loads(cached)
                    # Store in local cache for faster access
                    self._update_local_cache(cache_key, scores)
                    return scores
        except Exception as e:
            logger.debug(f"Cache get error: {e}")

        return None

    def set(self, query: str, documents: List[str], scores: List[float]) -> bool:
        """
        Store reranking scores in cache (synchronous).

        Args:
            query: Query string
            documents: List of document strings
            scores: List of reranking scores

        Returns:
            True if cached successfully
        """
        if not self.enabled:
            return False

        cache_key = self._generate_cache_key(query, documents)

        # Update local cache
        self._update_local_cache(cache_key, scores)

        # Try Redis
        try:
            redis_client = self._get_sync_redis()
            if redis_client:
                redis_client.setex(
                    cache_key,
                    self.ttl,
                    json.dumps(scores)
                )
                return True
        except Exception as e:
            logger.debug(f"Cache set error: {e}")

        return False

    async def async_set(self, query: str, documents: List[str], scores: List[float]) -> bool:
        """
        Store reranking scores in cache (asynchronous).

        Args:
            query: Query string
            documents: List of document strings
            scores: List of reranking scores

        Returns:
            True if cached successfully
        """
        if not self.enabled:
            return False

        cache_key = self._generate_cache_key(query, documents)

        # Update local cache
        self._update_local_cache(cache_key, scores)

        # Try Redis
        try:
            redis_client = await self._get_redis()
            if redis_client:
                await redis_client.setex(
                    cache_key,
                    self.ttl,
                    json.dumps(scores)
                )
                return True
        except Exception as e:
            logger.debug(f"Cache set error: {e}")

        return False

    def _update_local_cache(self, key: str, scores: List[float]):
        """Update local cache with LRU eviction."""
        import time

        # Evict old entries if cache is full
        if len(self._local_cache) >= self._max_local_cache_size:
            # Remove oldest 20% of entries
            sorted_items = sorted(
                self._local_cache.items(),
                key=lambda x: x[1][1]
            )
            for old_key, _ in sorted_items[:int(self._max_local_cache_size * 0.2)]:
                del self._local_cache[old_key]

        self._local_cache[key] = (scores, time.time())

    def clear(self):
        """Clear all cached entries."""
        self._local_cache.clear()

        try:
            redis_client = self._get_sync_redis()
            if redis_client:
                # Delete all keys with our prefix
                keys = redis_client.keys(f"{self.prefix}*")
                if keys:
                    redis_client.delete(*keys)
        except Exception as e:
            logger.debug(f"Cache clear error: {e}")

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        return {
            "enabled": self.enabled,
            "local_cache_size": len(self._local_cache),
            "ttl": self.ttl,
            "prefix": self.prefix
        }


# Global cache instance
_rerank_cache: Optional[RerankCache] = None


def get_rerank_cache(config: Optional[RerankerConfig] = None) -> RerankCache:
    """Get or create the global rerank cache instance."""
    global _rerank_cache
    if _rerank_cache is None:
        config = config or RerankerConfig()
        _rerank_cache = RerankCache(
            redis_url=config.redis_url,
            ttl=config.cache_ttl,
            prefix=config.cache_prefix,
            enabled=config.enable_cache
        )
    return _rerank_cache


class BaseReranker(ABC):
    """Abstract base class for rerankers"""

    @abstractmethod
    def rerank(
        self,
        pairs: List[Tuple[str, str]],
        **kwargs
    ) -> List[float]:
        """
        Rerank query-document pairs

        Args:
            pairs: List of (query, document) tuples

        Returns:
            List of relevance scores
        """
        pass

    def rerank_documents(
        self,
        query: str,
        documents: List[Dict[str, Any]],
        content_field: str = "content"
    ) -> List[Dict[str, Any]]:
        """
        Rerank documents and return with updated scores

        Args:
            query: Query string
            documents: List of document dictionaries
            content_field: Field containing document content

        Returns:
            Documents sorted by new relevance scores
        """
        pairs = [(query, doc.get(content_field, "")) for doc in documents]
        scores = self.rerank(pairs)

        reranked = []
        for doc, score in zip(documents, scores):
            reranked.append({
                **doc,
                "rerank_score": score
            })

        reranked.sort(key=lambda x: x["rerank_score"], reverse=True)
        return reranked


class BGEReranker(BaseReranker):
    """
    BGE Reranker

    BAAI/bge-reranker series models for document re-ranking
    Provides high-quality cross-encoder reranking with Redis caching
    Includes memory protection for large document sets
    """

    def __init__(self, config: Optional[RerankerConfig] = None):
        """
        Initialize BGE reranker

        Args:
            config: Reranker configuration
        """
        self.config = config or RerankerConfig()
        self._model = None
        self._tokenizer = None
        self._device = self._get_device()
        self._cache = get_rerank_cache(self.config) if self.config.enable_cache else None

    def _get_device(self) -> str:
        if self.config.device == "auto":
            import torch
            return "cuda" if torch.cuda.is_available() else "cpu"
        return self.config.device

    def _load_model(self):
        """Lazy load model on first use"""
        if self._model is not None:
            return

        try:
            import torch
            from transformers import AutoModelForSequenceClassification, AutoTokenizer

            logger.info(f"Loading BGE reranker: {self.config.model_name}")

            self._tokenizer = AutoTokenizer.from_pretrained(
                self.config.model_name,
                cache_dir=self.config.cache_dir
            )

            self._model = AutoModelForSequenceClassification.from_pretrained(
                self.config.model_name,
                cache_dir=self.config.cache_dir
            )

            self._model.to(self._device)
            self._model.eval()

            logger.info(f"BGE reranker loaded on {self._device}")

        except Exception as e:
            logger.error(f"Failed to load BGE reranker: {e}")
            raise

    def _check_memory_and_limit_documents(
        self,
        pairs: List[Tuple[str, str]]
    ) -> List[Tuple[str, str]]:
        """
        Check memory usage and limit documents if necessary.

        Args:
            pairs: List of (query, document) tuples

        Returns:
            Limited and truncated pairs
        """
        if not self.config.enable_memory_protection:
            return pairs

        # Check memory usage
        mem_mb = check_memory_usage()
        if mem_mb > self.config.memory_warning_threshold_mb:
            logger.warning(
                f"High memory usage detected: {mem_mb}MB "
                f"(threshold: {self.config.memory_warning_threshold_mb}MB)"
            )

        # Limit number of documents
        if len(pairs) > self.config.max_documents:
            logger.warning(
                f"Limiting rerank from {len(pairs)} to {self.config.max_documents} documents"
            )
            pairs = pairs[:self.config.max_documents]

        # Truncate long documents
        truncated_pairs = []
        for query, doc in pairs:
            truncated_doc = truncate_document(doc, self.config.max_document_length)
            truncated_pairs.append((query, truncated_doc))

        return truncated_pairs

    def rerank(
        self,
        pairs: List[Tuple[str, str]],
        normalize: bool = True,
        use_cache: bool = True
    ) -> List[float]:
        """
        Rerank query-document pairs

        Args:
            pairs: List of (query, document) tuples
            normalize: Whether to normalize scores to [0, 1]
            use_cache: Whether to use Redis cache

        Returns:
            List of relevance scores
        """
        if not pairs:
            return []

        # Apply memory protection
        original_count = len(pairs)
        pairs = self._check_memory_and_limit_documents(pairs)
        if len(pairs) < original_count:
            logger.info(f"Memory protection: reduced from {original_count} to {len(pairs)} documents")

        # Extract query and documents for caching
        query = pairs[0][0] if pairs else ""
        documents = [pair[1] for pair in pairs]

        # Try to get from cache first
        if use_cache and self._cache:
            cached_scores = self._cache.get(query, documents)
            if cached_scores is not None and len(cached_scores) == len(pairs):
                logger.debug(f"Rerank cache hit for query: {query[:50]}...")
                return cached_scores

        self._load_model()

        import torch

        all_scores = []

        # Process in batches with memory monitoring
        for i in range(0, len(pairs), self.config.batch_size):
            batch_pairs = pairs[i:i + self.config.batch_size]

            # Tokenize
            inputs = self._tokenizer(
                batch_pairs,
                padding=True,
                truncation=True,
                max_length=self.config.max_length,
                return_tensors="pt"
            )

            inputs = {k: v.to(self._device) for k, v in inputs.items()}

            # Get scores
            with torch.no_grad():
                scores = self._model(**inputs).logits.squeeze(-1)
                scores = torch.sigmoid(scores)  # Convert to probabilities

            all_scores.extend(scores.cpu().numpy().tolist())

            # Clear GPU cache periodically
            if self._device == "cuda" and (i // self.config.batch_size) % 10 == 0:
                torch.cuda.empty_cache()

        # Normalize to [0, 1]
        if normalize and all_scores:
            min_score = min(all_scores)
            max_score = max(all_scores)

            if max_score > min_score:
                all_scores = [
                    (s - min_score) / (max_score - min_score)
                    for s in all_scores
                ]

        # Store in cache
        if use_cache and self._cache:
            self._cache.set(query, documents, all_scores)
            logger.debug(f"Rerank scores cached for query: {query[:50]}...")

        return all_scores


class CrossEncoderReranker(BaseReranker):
    """
    Cross-Encoder Reranker using sentence-transformers

    Generic cross-encoder implementation for reranking
    """

    def __init__(self, config: Optional[RerankerConfig] = None):
        """
        Initialize cross-encoder reranker

        Args:
            config: Reranker configuration
        """
        self.config = config or RerankerConfig(
            model_name="cross-encoder/ms-marco-MiniLM-L-6-v2"
        )
        self._model = None

    def _load_model(self):
        """Lazy load model on first use"""
        if self._model is not None:
            return

        try:
            from sentence_transformers import CrossEncoder

            logger.info(f"Loading cross-encoder: {self.config.model_name}")

            device = "cuda" if self.config.device == "auto" else self.config.device
            if device == "auto":
                import torch
                device = "cuda" if torch.cuda.is_available() else "cpu"

            self._model = CrossEncoder(
                self.config.model_name,
                max_length=self.config.max_length,
                device=device
            )

            logger.info(f"Cross-encoder loaded on {device}")

        except Exception as e:
            logger.error(f"Failed to load cross-encoder: {e}")
            raise

    def rerank(
        self,
        pairs: List[Tuple[str, str]],
        normalize: bool = True
    ) -> List[float]:
        """
        Rerank query-document pairs

        Args:
            pairs: List of (query, document) tuples
            normalize: Whether to normalize scores to [0, 1]

        Returns:
            List of relevance scores
        """
        self._load_model()

        scores = self._model.predict(
            pairs,
            batch_size=self.config.batch_size,
            convert_to_numpy=True
        )

        scores = scores.tolist()

        # Normalize to [0, 1]
        if normalize and scores:
            import numpy as np
            scores = np.array(scores)

            # Apply sigmoid if not already probabilities
            if scores.min() < 0 or scores.max() > 1:
                scores = 1 / (1 + np.exp(-scores))

            scores = scores.tolist()

        return scores


class FashionReranker(BaseReranker):
    """
    Fashion-specific Reranker

    Combines semantic reranking with fashion-domain features
    Includes Redis caching for improved performance
    """

    def __init__(
        self,
        base_reranker: Optional[BaseReranker] = None,
        config: Optional[RerankerConfig] = None
    ):
        """
        Initialize fashion reranker

        Args:
            base_reranker: Base reranker model
            config: Reranker configuration
        """
        self.config = config or RerankerConfig()
        self.base_reranker = base_reranker or BGEReranker(self.config)
        self._cache = get_rerank_cache(self.config) if self.config.enable_cache else None

        # Fashion-specific keywords for boosting
        self.fashion_keywords = {
            "body_type": ["H型", "X型", "A型", "Y型", "O型", "沙漏", "梨形", "椭圆", "矩形", "倒三角"],
            "occasion": ["约会", "通勤", "面试", "聚会", "日常", "校园", "旅行", "派对"],
            "style": ["极简风", "法式慵懒", "韩系", "街头潮流", "学院风", "复古", "优雅"],
            "color": ["春季型", "夏季型", "秋季型", "冬季型", "暖色调", "冷色调"],
            "garment": ["衬衫", "针织衫", "西装", "牛仔裤", "连衣裙", "半身裙", "阔腿裤", "A字裙"]
        }

    def rerank(
        self,
        pairs: List[Tuple[str, str]],
        query_context: Optional[Dict[str, Any]] = None,
        use_cache: bool = True
    ) -> List[float]:
        """
        Rerank with fashion-specific features

        Args:
            pairs: List of (query, document) tuples
            query_context: Optional context about the query (body_type, occasion, etc.)
            use_cache: Whether to use Redis cache

        Returns:
            List of relevance scores
        """
        if not pairs:
            return []

        # Extract query and documents for caching
        query = pairs[0][0] if pairs else ""
        documents = [pair[1] for pair in pairs]

        # Generate cache key with context
        cache_key_suffix = ""
        if query_context:
            cache_key_suffix = json.dumps(query_context, sort_keys=True)

        # Try to get from cache first
        if use_cache and self._cache:
            cached_scores = self._cache.get(query + cache_key_suffix, documents)
            if cached_scores is not None and len(cached_scores) == len(pairs):
                logger.debug(f"Fashion rerank cache hit for query: {query[:50]}...")
                return cached_scores

        # Get base scores
        base_scores = self.base_reranker.rerank(pairs, use_cache=use_cache)

        # Apply fashion-specific boosting
        boosted_scores = []

        for i, (query_text, doc) in enumerate(pairs):
            score = base_scores[i]

            # Keyword matching boost
            keyword_boost = self._calculate_keyword_boost(query_text, doc, query_context)

            # Combine scores (weighted average)
            final_score = 0.7 * score + 0.3 * keyword_boost
            boosted_scores.append(final_score)

        # Normalize
        if boosted_scores:
            min_score = min(boosted_scores)
            max_score = max(boosted_scores)

            if max_score > min_score:
                boosted_scores = [
                    (s - min_score) / (max_score - min_score)
                    for s in boosted_scores
                ]

        # Store in cache
        if use_cache and self._cache:
            self._cache.set(query + cache_key_suffix, documents, boosted_scores)
            logger.debug(f"Fashion rerank scores cached for query: {query[:50]}...")

        return boosted_scores

    def _calculate_keyword_boost(
        self,
        query: str,
        document: str,
        context: Optional[Dict[str, Any]] = None
    ) -> float:
        """Calculate boost based on keyword matching"""
        boost = 0.0
        query_lower = query.lower()
        doc_lower = document.lower()

        # Check category matches
        for category, keywords in self.fashion_keywords.items():
            for keyword in keywords:
                if keyword in query_lower and keyword in doc_lower:
                    boost += 0.1

        # Context-based boosting
        if context:
            if "body_type" in context and context["body_type"] in doc_lower:
                boost += 0.15
            if "occasion" in context and context["occasion"] in doc_lower:
                boost += 0.15
            if "color_season" in context and context["color_season"] in doc_lower:
                boost += 0.1

        return min(boost, 1.0)

    def clear_cache(self):
        """Clear the reranker cache."""
        if self._cache:
            self._cache.clear()

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        if self._cache:
            return self._cache.get_stats()
        return {"enabled": False}


class RerankerFactory:
    """Factory for creating rerankers"""

    @staticmethod
    def create(
        model_type: str = "bge",
        config: Optional[RerankerConfig] = None
    ) -> BaseReranker:
        """
        Create a reranker by type

        Args:
            model_type: Type of reranker ('bge', 'cross_encoder', 'fashion')
            config: Reranker configuration

        Returns:
            Reranker instance
        """
        if model_type == "bge":
            return BGEReranker(config)
        elif model_type == "cross_encoder":
            return CrossEncoderReranker(config)
        elif model_type == "fashion":
            return FashionReranker(config=config)
        else:
            raise ValueError(f"Unknown reranker type: {model_type}")

    @staticmethod
    def create_bge_reranker(
        model_name: str = "BAAI/bge-reranker-base",
        device: str = "auto"
    ) -> BGEReranker:
        """Create a BGE reranker with specified model"""
        config = RerankerConfig(model_name=model_name, device=device)
        return BGEReranker(config)

    @staticmethod
    def create_fashion_reranker(
        base_model: str = "BAAI/bge-reranker-base",
        device: str = "auto"
    ) -> FashionReranker:
        """Create a fashion-specific reranker"""
        config = RerankerConfig(model_name=base_model, device=device)
        return FashionReranker(config=config)


# ============================================================================
# 多样性重排序模块
# ============================================================================

@dataclass
class DiversityConfig:
    """多样性重排序配置"""
    # 多样性权重（0-1，越大多样性越重要）
    diversity_weight: float = 0.3

    # 相似度计算方法
    similarity_method: str = "embedding"  # 'embedding', 'token', 'metadata'

    # 元数据多样性字段
    metadata_fields: List[str] = field(default_factory=lambda: ["category", "style", "occasion"])

    # 最小间隔（相邻结果的相似度阈值）
    min_gap_threshold: float = 0.7

    # 启用 MMR 算法
    use_mmr: bool = True

    # MMR lambda 参数（相关性 vs 多样性权衡）
    mmr_lambda: float = 0.7


class DiversityReranker:
    """
    多样性重排序器

    确保检索结果具有足够的多样性，避免结果过于相似。
    支持多种多样性策略：
    1. MMR (Maximal Marginal Relevance)
    2. 基于元数据的多样性
    3. 基于内容相似度的多样性
    """

    def __init__(
        self,
        base_reranker: Optional[BaseReranker] = None,
        embedding_service=None,
        config: Optional[DiversityConfig] = None
    ):
        """
        初始化多样性重排序器

        Args:
            base_reranker: 基础重排序器
            embedding_service: 嵌入服务（用于计算相似度）
            config: 多样性配置
        """
        self.base_reranker = base_reranker
        self.embedding_service = embedding_service
        self.config = config or DiversityConfig()

    def rerank(
        self,
        pairs: List[Tuple[str, str]],
        documents: Optional[List[Dict[str, Any]]] = None,
        **kwargs
    ) -> List[float]:
        """
        执行多样性重排序

        Args:
            pairs: (query, document) 元组列表
            documents: 可选的文档元数据列表

        Returns:
            重排序后的分数列表
        """
        if not pairs:
            return []

        # 先获取基础相关性分数
        if self.base_reranker:
            relevance_scores = self.base_reranker.rerank(pairs, **kwargs)
        else:
            # 如果没有基础重排序器，使用均匀分数
            relevance_scores = [1.0 - i * 0.01 for i in range(len(pairs))]

        # 应用多样性重排序
        if self.config.use_mmr:
            return self._mmr_rerank(pairs, relevance_scores, documents)
        else:
            return self._simple_diversity_rerank(pairs, relevance_scores, documents)

    def _mmr_rerank(
        self,
        pairs: List[Tuple[str, str]],
        relevance_scores: List[float],
        documents: Optional[List[Dict[str, Any]]] = None
    ) -> List[float]:
        """
        MMR (Maximal Marginal Relevance) 重排序

        MMR = λ * Relevance(d) - (1-λ) * max_sim(d, S)

        其中 S 是已选择的文档集合
        """
        n = len(pairs)
        if n == 0:
            return []

        # 计算文档间的相似度矩阵
        similarity_matrix = self._compute_similarity_matrix(pairs, documents)

        # MMR 选择过程
        selected_indices = []
        remaining_indices = list(range(n))
        final_scores = [0.0] * n

        while remaining_indices:
            best_score = float('-inf')
            best_idx = -1

            for idx in remaining_indices:
                # 相关性分数
                relevance = relevance_scores[idx]

                # 与已选文档的最大相似度
                if selected_indices:
                    max_sim = max(
                        similarity_matrix[idx][sel_idx]
                        for sel_idx in selected_indices
                    )
                else:
                    max_sim = 0.0

                # MMR 分数
                mmr_score = (
                    self.config.mmr_lambda * relevance -
                    (1 - self.config.mmr_lambda) * max_sim
                )

                if mmr_score > best_score:
                    best_score = mmr_score
                    best_idx = idx

            if best_idx >= 0:
                selected_indices.append(best_idx)
                remaining_indices.remove(best_idx)
                final_scores[best_idx] = best_score

        return final_scores

    def _simple_diversity_rerank(
        self,
        pairs: List[Tuple[str, str]],
        relevance_scores: List[float],
        documents: Optional[List[Dict[str, Any]]] = None
    ) -> List[float]:
        """
        简单多样性重排序

        根据相似度阈值跳过过于相似的结果
        """
        n = len(pairs)
        if n == 0:
            return []

        # 计算相似度矩阵
        similarity_matrix = self._compute_similarity_matrix(pairs, documents)

        # 按相关性排序
        sorted_indices = sorted(
            range(n),
            key=lambda i: relevance_scores[i],
            reverse=True
        )

        # 选择多样化的结果
        selected_indices = []
        final_scores = [0.0] * n

        for idx in sorted_indices:
            # 检查与已选结果的相似度
            is_too_similar = False
            for sel_idx in selected_indices:
                if similarity_matrix[idx][sel_idx] > self.config.min_gap_threshold:
                    is_too_similar = True
                    break

            if not is_too_similar:
                selected_indices.append(idx)
                # 分数 = 相关性分数 * (1 - 多样性惩罚)
                diversity_penalty = self.config.diversity_weight * sum(
                    similarity_matrix[idx][sel_idx]
                    for sel_idx in selected_indices[:-1]
                ) / max(len(selected_indices) - 1, 1)
                final_scores[idx] = relevance_scores[idx] * (1 - diversity_penalty)

        return final_scores

    def _compute_similarity_matrix(
        self,
        pairs: List[Tuple[str, str]],
        documents: Optional[List[Dict[str, Any]]] = None
    ) -> np.ndarray:
        """计算文档间的相似度矩阵"""
        n = len(pairs)
        similarity_matrix = np.zeros((n, n))

        if self.config.similarity_method == "embedding" and self.embedding_service:
            # 使用嵌入向量计算相似度
            embeddings = []
            for query, doc in pairs:
                emb = self.embedding_service.encode_text(doc)
                embeddings.append(emb)

            embeddings = np.array(embeddings)

            # 计算余弦相似度
            for i in range(n):
                for j in range(i + 1, n):
                    sim = np.dot(embeddings[i], embeddings[j]) / (
                        np.linalg.norm(embeddings[i]) * np.linalg.norm(embeddings[j])
                    )
                    similarity_matrix[i][j] = sim
                    similarity_matrix[j][i] = sim

        elif self.config.similarity_method == "metadata" and documents:
            # 使用元数据计算相似度
            for i in range(n):
                for j in range(i + 1, n):
                    sim = self._compute_metadata_similarity(
                        documents[i], documents[j]
                    )
                    similarity_matrix[i][j] = sim
                    similarity_matrix[j][i] = sim

        else:
            # 使用 token 重叠计算相似度
            for i in range(n):
                for j in range(i + 1, n):
                    sim = self._compute_token_similarity(
                        pairs[i][1], pairs[j][1]
                    )
                    similarity_matrix[i][j] = sim
                    similarity_matrix[j][i] = sim

        return similarity_matrix

    def _compute_metadata_similarity(
        self,
        doc1: Dict[str, Any],
        doc2: Dict[str, Any]
    ) -> float:
        """计算基于元数据的相似度"""
        if not doc1 or not doc2:
            return 0.0

        matches = 0
        total = 0

        for field in self.config.metadata_fields:
            val1 = doc1.get(field)
            val2 = doc2.get(field)

            if val1 is not None and val2 is not None:
                total += 1
                if val1 == val2:
                    matches += 1

        if total == 0:
            return 0.0

        return matches / total

    def _compute_token_similarity(self, text1: str, text2: str) -> float:
        """计算基于 token 的相似度（Jaccard）"""
        try:
            import jieba

            tokens1 = set(jieba.lcut(text1))
            tokens2 = set(jieba.lcut(text2))

            # 过滤短词
            tokens1 = {t for t in tokens1 if len(t) > 1}
            tokens2 = {t for t in tokens2 if len(t) > 1}

            if not tokens1 or not tokens2:
                return 0.0

            intersection = len(tokens1 & tokens2)
            union = len(tokens1 | tokens2)

            return intersection / union if union > 0 else 0.0

        except ImportError:
            # jieba 不可用，使用字符级相似度
            set1 = set(text1)
            set2 = set(text2)

            if not set1 or not set2:
                return 0.0

            intersection = len(set1 & set2)
            union = len(set1 | set2)

            return intersection / union if union > 0 else 0.0


# ============================================================================
# 自定义重排序策略接口
# ============================================================================

class RerankStrategy(ABC):
    """
    重排序策略抽象基类

    定义自定义重排序策略的标准接口
    """

    @abstractmethod
    def compute_score(
        self,
        query: str,
        document: str,
        base_score: float,
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> float:
        """
        计算重排序分数

        Args:
            query: 查询文本
            document: 文档文本
            base_score: 基础相关性分数
            metadata: 文档元数据
            **kwargs: 额外参数

        Returns:
            最终重排序分数
        """
        pass

    @property
    @abstractmethod
    def strategy_name(self) -> str:
        """策略名称"""
        pass


class KeywordBoostStrategy(RerankStrategy):
    """
    关键词提升策略

    当文档包含特定关键词时提升分数
    """

    def __init__(
        self,
        boost_keywords: Dict[str, float],
        penalty_keywords: Optional[Dict[str, float]] = None
    ):
        """
        Args:
            boost_keywords: 提升关键词及其权重 {keyword: boost_factor}
            penalty_keywords: 惩罚关键词及其权重 {keyword: penalty_factor}
        """
        self.boost_keywords = boost_keywords
        self.penalty_keywords = penalty_keywords or {}

    @property
    def strategy_name(self) -> str:
        return "keyword_boost"

    def compute_score(
        self,
        query: str,
        document: str,
        base_score: float,
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> float:
        """计算关键词提升后的分数"""
        score = base_score

        # 应用关键词提升
        for keyword, boost in self.boost_keywords.items():
            if keyword in document:
                score *= (1 + boost)

        # 应用关键词惩罚
        for keyword, penalty in self.penalty_keywords.items():
            if keyword in document:
                score *= (1 - penalty)

        return min(score, 1.0)  # 限制最大分数


class RecencyBoostStrategy(RerankStrategy):
    """
    时效性提升策略

    根据文档的时效性提升分数
    """

    def __init__(
        self,
        decay_rate: float = 0.1,
        max_age_days: int = 365
    ):
        """
        Args:
            decay_rate: 衰减率
            max_age_days: 最大年龄（天）
        """
        self.decay_rate = decay_rate
        self.max_age_days = max_age_days

    @property
    def strategy_name(self) -> str:
        return "recency_boost"

    def compute_score(
        self,
        query: str,
        document: str,
        base_score: float,
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> float:
        """计算时效性提升后的分数"""
        if not metadata:
            return base_score

        # 获取文档时间戳
        timestamp = metadata.get("timestamp") or metadata.get("created_at") or metadata.get("date")
        if not timestamp:
            return base_score

        try:
            from datetime import datetime

            if isinstance(timestamp, str):
                doc_date = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
            elif isinstance(timestamp, datetime):
                doc_date = timestamp
            else:
                return base_score

            # 计算文档年龄
            age_days = (datetime.now(doc_date.tzinfo) - doc_date).days

            # 应用时间衰减
            if age_days <= 0:
                recency_factor = 1.0
            elif age_days >= self.max_age_days:
                recency_factor = 1.0 - self.decay_rate
            else:
                recency_factor = 1.0 - (self.decay_rate * age_days / self.max_age_days)

            return base_score * recency_factor

        except Exception as e:
            logger.debug(f"Recency boost calculation failed: {e}")
            return base_score


class UserPreferenceStrategy(RerankStrategy):
    """
    用户偏好策略

    根据用户历史偏好提升分数
    """

    def __init__(
        self,
        user_preferences: Optional[Dict[str, float]] = None
    ):
        """
        Args:
            user_preferences: 用户偏好字典 {feature: weight}
        """
        self.user_preferences = user_preferences or {}

    @property
    def strategy_name(self) -> str:
        return "user_preference"

    def update_preferences(self, preferences: Dict[str, float]):
        """更新用户偏好"""
        self.user_preferences.update(preferences)

    def compute_score(
        self,
        query: str,
        document: str,
        base_score: float,
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> float:
        """计算用户偏好提升后的分数"""
        if not metadata or not self.user_preferences:
            return base_score

        preference_score = 0.0

        # 检查元数据中的偏好匹配
        for feature, weight in self.user_preferences.items():
            # 检查元数据字段
            if feature in metadata:
                if metadata[feature] == weight or str(metadata[feature]) == str(weight):
                    preference_score += 0.1
            # 检查文档内容
            elif feature in document:
                preference_score += 0.05

        # 组合分数
        final_score = base_score * (1 + preference_score)
        return min(final_score, 1.0)


class CompositeReranker(BaseReranker):
    """
    组合重排序器

    支持组合多个重排序策略，按优先级和权重组合
    """

    def __init__(
        self,
        base_reranker: Optional[BaseReranker] = None,
        strategies: Optional[List[RerankStrategy]] = None,
        strategy_weights: Optional[List[float]] = None
    ):
        """
        初始化组合重排序器

        Args:
            base_reranker: 基础重排序器
            strategies: 重排序策略列表
            strategy_weights: 策略权重列表
        """
        self.base_reranker = base_reranker
        self.strategies = strategies or []
        self.strategy_weights = strategy_weights or [1.0] * len(self.strategies)

        if len(self.strategy_weights) != len(self.strategies):
            self.strategy_weights = [1.0] * len(self.strategies)

    def add_strategy(
        self,
        strategy: RerankStrategy,
        weight: float = 1.0
    ):
        """添加重排序策略"""
        self.strategies.append(strategy)
        self.strategy_weights.append(weight)

    def rerank(
        self,
        pairs: List[Tuple[str, str]],
        documents: Optional[List[Dict[str, Any]]] = None,
        **kwargs
    ) -> List[float]:
        """执行组合重排序"""
        if not pairs:
            return []

        # 获取基础分数
        if self.base_reranker:
            base_scores = self.base_reranker.rerank(pairs, **kwargs)
        else:
            base_scores = [1.0] * len(pairs)

        # 如果没有策略，直接返回基础分数
        if not self.strategies:
            return base_scores

        # 应用所有策略
        final_scores = []

        for i, (query, document) in enumerate(pairs):
            doc_metadata = documents[i] if documents and i < len(documents) else None
            base_score = base_scores[i]

            # 计算策略分数
            strategy_scores = []
            for strategy, weight in zip(self.strategies, self.strategy_weights):
                try:
                    score = strategy.compute_score(
                        query=query,
                        document=document,
                        base_score=base_score,
                        metadata=doc_metadata,
                        **kwargs
                    )
                    strategy_scores.append(score * weight)
                except Exception as e:
                    logger.warning(f"Strategy {strategy.strategy_name} failed: {e}")
                    strategy_scores.append(base_score * weight)

            # 加权平均
            if strategy_scores:
                total_weight = sum(self.strategy_weights)
                final_score = sum(strategy_scores) / total_weight
            else:
                final_score = base_score

            final_scores.append(final_score)

        return final_scores

    def get_strategy_info(self) -> List[Dict[str, Any]]:
        """获取策略信息"""
        return [
            {
                "name": strategy.strategy_name,
                "weight": weight
            }
            for strategy, weight in zip(self.strategies, self.strategy_weights)
        ]


# ============================================================================
# 高级重排序器工厂
# ============================================================================

class AdvancedRerankerFactory:
    """高级重排序器工厂"""

    @staticmethod
    def create_diversity_reranker(
        base_reranker: Optional[BaseReranker] = None,
        embedding_service=None,
        diversity_weight: float = 0.3,
        use_mmr: bool = True
    ) -> DiversityReranker:
        """创建多样性重排序器"""
        config = DiversityConfig(
            diversity_weight=diversity_weight,
            use_mmr=use_mmr
        )
        return DiversityReranker(
            base_reranker=base_reranker,
            embedding_service=embedding_service,
            config=config
        )

    @staticmethod
    def create_composite_reranker(
        base_reranker: Optional[BaseReranker] = None,
        enable_keyword_boost: bool = True,
        enable_recency: bool = False,
        enable_user_preference: bool = False,
        user_preferences: Optional[Dict[str, float]] = None
    ) -> CompositeReranker:
        """创建组合重排序器"""
        composite = CompositeReranker(base_reranker=base_reranker)

        # 添加关键词提升策略
        if enable_keyword_boost:
            fashion_keywords = {
                "显瘦": 0.2,
                "显高": 0.2,
                "遮肉": 0.15,
                "修身": 0.1,
                "时尚": 0.1
            }
            composite.add_strategy(
                KeywordBoostStrategy(fashion_keywords),
                weight=1.0
            )

        # 添加时效性策略
        if enable_recency:
            composite.add_strategy(
                RecencyBoostStrategy(decay_rate=0.1, max_age_days=180),
                weight=0.5
            )

        # 添加用户偏好策略
        if enable_user_preference:
            composite.add_strategy(
                UserPreferenceStrategy(user_preferences),
                weight=1.0
            )

        return composite

    @staticmethod
    def create_fashion_pipeline(
        embedding_service=None,
        enable_diversity: bool = True,
        diversity_weight: float = 0.25
    ) -> CompositeReranker:
        """
        创建时尚领域重排序流水线

        包含：
        1. BGE 基础重排序
        2. 时尚关键词提升
        3. 多样性重排序
        """
        # 基础 BGE 重排序器
        base_reranker = BGEReranker()

        # 时尚关键词
        fashion_keywords = {
            "显瘦": 0.15,
            "显高": 0.15,
            "遮肉": 0.1,
            "修身": 0.1,
            "气质": 0.1,
            "时尚": 0.08
        }

        # 创建组合重排序器
        composite = CompositeReranker(base_reranker=base_reranker)
        composite.add_strategy(KeywordBoostStrategy(fashion_keywords), weight=1.0)

        # 如果启用多样性
        if enable_diversity and embedding_service:
            diversity_config = DiversityConfig(
                diversity_weight=diversity_weight,
                use_mmr=True,
                mmr_lambda=0.75
            )
            diversity_reranker = DiversityReranker(
                base_reranker=composite,
                embedding_service=embedding_service,
                config=diversity_config
            )
            return diversity_reranker

        return composite
