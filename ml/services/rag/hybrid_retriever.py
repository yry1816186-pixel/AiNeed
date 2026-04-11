"""
Hybrid Retriever for Fashion RAG
Implements Reciprocal Rank Fusion (RRF) for combining BM25 and Vector search
2026 Standard Implementation
"""

import os
import json
import logging
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Tuple, Callable
from dataclasses import dataclass, field
from pathlib import Path
import numpy as np
from collections import defaultdict

logger = logging.getLogger(__name__)


@dataclass
class RetrievalResult:
    """Single retrieval result"""
    doc_id: str
    score: float
    content: str
    metadata: Dict[str, Any]
    source: str = "unknown"  # 'bm25', 'vector', 'hybrid'

    def to_dict(self) -> Dict[str, Any]:
        return {
            "doc_id": self.doc_id,
            "score": self.score,
            "content": self.content,
            "metadata": self.metadata,
            "source": self.source
        }


@dataclass
class HybridRetrievalConfig:
    """Configuration for hybrid retrieval"""
    # RRF parameters
    rrf_k: int = 60  # RRF constant

    # Retrieval weights
    bm25_weight: float = 0.5
    vector_weight: float = 0.5

    # Search parameters
    bm25_top_k: int = 50
    vector_top_k: int = 50
    final_top_k: int = 10

    # Re-ranking
    enable_reranking: bool = True
    rerank_top_k: int = 20


class BaseRetriever(ABC):
    """Abstract base class for retrievers"""

    @abstractmethod
    def search(
        self,
        query: str,
        top_k: int = 10,
        **kwargs
    ) -> List[RetrievalResult]:
        """Search for documents matching the query"""
        pass


class BM25Searcher(BaseRetriever):
    """BM25-based searcher wrapper"""

    def __init__(self, bm25_retriever):
        """
        Args:
            bm25_retriever: BM25Retriever instance
        """
        self.retriever = bm25_retriever

    def search(
        self,
        query: str,
        top_k: int = 10,
        filter_fn: Optional[Callable] = None,
        **kwargs
    ) -> List[RetrievalResult]:
        """Search using BM25"""
        results = self.retriever.search(query, top_k=top_k, filter_fn=filter_fn)

        return [
            RetrievalResult(
                doc_id=doc_id,
                score=score,
                content=self.retriever.get_document_content(doc_id) or "",
                metadata=metadata,
                source="bm25"
            )
            for doc_id, score, metadata in results
        ]


class VectorSearcher(BaseRetriever):
    """Vector-based searcher wrapper"""

    def __init__(
        self,
        vector_store,
        embedding_service
    ):
        """
        Args:
            vector_store: QdrantVectorStore instance
            embedding_service: EmbeddingService instance
        """
        self.vector_store = vector_store
        self.embedding_service = embedding_service

    def search(
        self,
        query: str,
        top_k: int = 10,
        filter_conditions: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> List[RetrievalResult]:
        """Search using vector similarity"""
        results = self.vector_store.search_by_text(
            query_text=query,
            embedding_service=self.embedding_service,
            top_k=top_k,
            filter_conditions=filter_conditions
        )

        return [
            RetrievalResult(
                doc_id=result["id"],
                score=result["score"],
                content=result["content"],
                metadata=result["metadata"],
                source="vector"
            )
            for result in results
        ]


class RRFFusion:
    """
    Reciprocal Rank Fusion (RRF) algorithm

    RRF score = sum(1 / (k + rank_i)) for all retrievers

    Reference: Cormack, G. V., Clarke, C. L. A., & Buettcher, S. (2009).
    "Reciprocal rank fusion outperforms condorcet and individual rank learning methods."
    """

    def __init__(self, k: int = 60):
        """
        Args:
            k: RRF constant (typically 60)
        """
        self.k = k

    def fuse(
        self,
        result_lists: List[List[RetrievalResult]],
        weights: Optional[List[float]] = None
    ) -> List[RetrievalResult]:
        """
        Fuse multiple result lists using RRF

        Args:
            result_lists: List of result lists from different retrievers
            weights: Optional weights for each retriever

        Returns:
            Fused and ranked result list
        """
        if weights is None:
            weights = [1.0] * len(result_lists)
        elif len(weights) != len(result_lists):
            raise ValueError("Number of weights must match number of result lists")

        # Normalize weights
        total_weight = sum(weights)
        weights = [w / total_weight for w in weights]

        # Calculate RRF scores
        doc_scores: Dict[str, float] = defaultdict(float)
        doc_info: Dict[str, RetrievalResult] = {}

        for result_list, weight in zip(result_lists, weights):
            for rank, result in enumerate(result_list):
                # RRF formula with weight
                rrf_score = weight / (self.k + rank + 1)
                doc_scores[result.doc_id] += rrf_score

                # Store document info (prefer first occurrence)
                if result.doc_id not in doc_info:
                    doc_info[result.doc_id] = result

        # Sort by fused score
        sorted_docs = sorted(
            doc_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )

        # Create final result list
        fused_results = []
        for doc_id, score in sorted_docs:
            result = doc_info[doc_id]
            fused_results.append(RetrievalResult(
                doc_id=doc_id,
                score=score,
                content=result.content,
                metadata=result.metadata,
                source="hybrid"
            ))

        return fused_results


class HybridRetriever(BaseRetriever):
    """
    Hybrid Retriever combining BM25 and Vector search

    Uses Reciprocal Rank Fusion to combine results from
    multiple retrieval methods
    """

    def __init__(
        self,
        bm25_retriever=None,
        vector_store=None,
        embedding_service=None,
        reranker=None,
        config: Optional[HybridRetrievalConfig] = None
    ):
        """
        Initialize hybrid retriever

        Args:
            bm25_retriever: BM25Retriever instance
            vector_store: QdrantVectorStore instance
            embedding_service: EmbeddingService instance
            reranker: Optional reranker for re-ranking results
            config: Hybrid retrieval configuration
        """
        self.config = config or HybridRetrievalConfig()
        self.rrf = RRFFusion(k=self.config.rrf_k)
        self.reranker = reranker

        # Initialize searchers
        self.bm25_searcher = BM25Searcher(bm25_retriever) if bm25_retriever else None
        self.vector_searcher = None

        if vector_store and embedding_service:
            self.vector_searcher = VectorSearcher(vector_store, embedding_service)

    def search(
        self,
        query: str,
        top_k: Optional[int] = None,
        bm25_top_k: Optional[int] = None,
        vector_top_k: Optional[int] = None,
        filter_conditions: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> List[RetrievalResult]:
        """
        Perform hybrid search

        Args:
            query: Search query
            top_k: Final number of results to return
            bm25_top_k: Number of results from BM25
            vector_top_k: Number of results from vector search
            filter_conditions: Optional filter conditions

        Returns:
            List of retrieval results
        """
        top_k = top_k or self.config.final_top_k
        bm25_top_k = bm25_top_k or self.config.bm25_top_k
        vector_top_k = vector_top_k or self.config.vector_top_k

        result_lists = []
        weights = []

        # BM25 search
        if self.bm25_searcher:
            bm25_results = self.bm25_searcher.search(
                query=query,
                top_k=bm25_top_k,
                **kwargs
            )
            result_lists.append(bm25_results)
            weights.append(self.config.bm25_weight)

        # Vector search
        if self.vector_searcher:
            vector_results = self.vector_searcher.search(
                query=query,
                top_k=vector_top_k,
                filter_conditions=filter_conditions,
                **kwargs
            )
            result_lists.append(vector_results)
            weights.append(self.config.vector_weight)

        if not result_lists:
            return []

        # Fuse results
        if len(result_lists) == 1:
            fused_results = result_lists[0]
        else:
            fused_results = self.rrf.fuse(result_lists, weights)

        # Re-ranking
        if self.config.enable_reranking and self.reranker and len(fused_results) > 0:
            fused_results = self._rerank(query, fused_results)

        return fused_results[:top_k]

    def _rerank(
        self,
        query: str,
        results: List[RetrievalResult]
    ) -> List[RetrievalResult]:
        """Apply re-ranking to results"""
        if not results:
            return results

        # Get top-k for reranking
        rerank_input = results[:self.config.rerank_top_k]

        # Create query-document pairs
        pairs = [(query, result.content) for result in rerank_input]

        # Get reranker scores
        rerank_scores = self.reranker.rerank(pairs)

        # Update scores and re-sort
        for result, new_score in zip(rerank_input, rerank_scores):
            result.score = new_score
            result.source = "reranked"

        rerank_input.sort(key=lambda x: x.score, reverse=True)

        # Combine with remaining results
        remaining = results[self.config.rerank_top_k:]
        return rerank_input + remaining

    def search_with_details(
        self,
        query: str,
        top_k: int = 10,
        include_intermediate: bool = False
    ) -> Dict[str, Any]:
        """
        Search with detailed intermediate results

        Args:
            query: Search query
            top_k: Number of final results
            include_intermediate: Include BM25 and vector results

        Returns:
            Dictionary with results and optional intermediate data
        """
        response = {
            "query": query,
            "results": [],
            "intermediate": {}
        }

        result_lists = []
        weights = []

        # BM25 search
        if self.bm25_searcher:
            bm25_results = self.bm25_searcher.search(
                query=query,
                top_k=self.config.bm25_top_k
            )
            result_lists.append(bm25_results)
            weights.append(self.config.bm25_weight)

            if include_intermediate:
                response["intermediate"]["bm25"] = [r.to_dict() for r in bm25_results[:top_k]]

        # Vector search
        if self.vector_searcher:
            vector_results = self.vector_searcher.search(
                query=query,
                top_k=self.config.vector_top_k
            )
            result_lists.append(vector_results)
            weights.append(self.config.vector_weight)

            if include_intermediate:
                response["intermediate"]["vector"] = [r.to_dict() for r in vector_results[:top_k]]

        # Fuse results
        if len(result_lists) > 1:
            fused_results = self.rrf.fuse(result_lists, weights)
        elif result_lists:
            fused_results = result_lists[0]
        else:
            fused_results = []

        # Re-ranking
        if self.config.enable_reranking and self.reranker and fused_results:
            fused_results = self._rerank(query, fused_results)

            if include_intermediate:
                response["intermediate"]["before_rerank"] = [
                    r.to_dict() for r in fused_results[:top_k]
                ]

        response["results"] = [r.to_dict() for r in fused_results[:top_k]]

        return response


class RRFHybridRetriever(HybridRetriever):
    """
    Alias for HybridRetriever with explicit RRF naming
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)


class MultiQueryRetriever(BaseRetriever):
    """
    Multi-Query Retriever

    Generates multiple query variations and aggregates results
    """

    def __init__(
        self,
        base_retriever: BaseRetriever,
        query_generator: Optional[Callable] = None,
        num_queries: int = 3
    ):
        """
        Args:
            base_retriever: Base retriever to use
            query_generator: Function to generate query variations
            num_queries: Number of query variations to generate
        """
        self.base_retriever = base_retriever
        self.query_generator = query_generator or self._default_query_generator
        self.num_queries = num_queries

    def _default_query_generator(self, query: str) -> List[str]:
        """Generate simple query variations"""
        variations = [query]

        # Add variation with different phrasing
        if len(query) > 10:
            # Simple heuristic variations
            variations.append(query.replace("吗", "").replace("？", ""))

            # Add context prefix
            variations.append(f"穿搭 {query}")

            # Add synonym-based variation (simplified)
            synonyms = {
                "好看": "漂亮 美丽 时尚",
                "推荐": "建议 适合",
                "搭配": "穿搭 穿着"
            }

            modified = query
            for word, syns in synonyms.items():
                if word in query:
                    modified = query.replace(word, syns.split()[0])
                    break

            if modified != query:
                variations.append(modified)

        return variations[:self.num_queries]

    def search(
        self,
        query: str,
        top_k: int = 10,
        **kwargs
    ) -> List[RetrievalResult]:
        """Search using multiple query variations"""
        # Generate query variations
        queries = self.query_generator(query)

        # Search with each variation
        all_results: Dict[str, RetrievalResult] = {}
        doc_scores: Dict[str, float] = defaultdict(float)

        for q in queries:
            results = self.base_retriever.search(q, top_k=top_k, **kwargs)

            for rank, result in enumerate(results):
                if result.doc_id not in all_results:
                    all_results[result.doc_id] = result

                # Score based on rank
                doc_scores[result.doc_id] += 1.0 / (rank + 1)

        # Aggregate and sort
        sorted_docs = sorted(
            doc_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )

        return [
            RetrievalResult(
                doc_id=doc_id,
                score=score,
                content=all_results[doc_id].content,
                metadata=all_results[doc_id].metadata,
                source="multi_query"
            )
            for doc_id, score in sorted_docs[:top_k]
        ]


class ContextualCompressionRetriever(BaseRetriever):
    """
    Contextual Compression Retriever

    Compresses retrieved documents to extract only relevant parts
    """

    def __init__(
        self,
        base_retriever: BaseRetriever,
        compressor=None,
        threshold: float = 0.5
    ):
        """
        Args:
            base_retriever: Base retriever
            compressor: Optional compressor (LLM-based)
            threshold: Minimum relevance score
        """
        self.base_retriever = base_retriever
        self.compressor = compressor
        self.threshold = threshold

    def search(
        self,
        query: str,
        top_k: int = 10,
        **kwargs
    ) -> List[RetrievalResult]:
        """Search and compress results"""
        results = self.base_retriever.search(query, top_k=top_k * 2, **kwargs)

        if self.compressor:
            compressed = []
            for result in results:
                compressed_content, score = self.compressor.compress(
                    query,
                    result.content
                )

                if score >= self.threshold:
                    compressed.append(RetrievalResult(
                        doc_id=result.doc_id,
                        score=score,
                        content=compressed_content,
                        metadata=result.metadata,
                        source="compressed"
                    ))

            results = compressed

        return results[:top_k]


class AdaptiveWeightCalculator:
    """
    自适应权重计算器

    根据查询特征动态调整 BM25 和向量检索的权重：
    - 短查询、关键词密集 -> 提高 BM25 权重
    - 长查询、语义丰富 -> 提高向量检索权重
    - 包含专业术语 -> 提高 BM25 权重
    - 包含语义描述 -> 提高向量检索权重
    """

    def __init__(
        self,
        default_bm25_weight: float = 0.5,
        default_vector_weight: float = 0.5,
        min_weight: float = 0.2,
        max_weight: float = 0.8
    ):
        """
        Args:
            default_bm25_weight: 默认 BM25 权重
            default_vector_weight: 默认向量检索权重
            min_weight: 最小权重
            max_weight: 最大权重
        """
        self.default_bm25_weight = default_bm25_weight
        self.default_vector_weight = default_vector_weight
        self.min_weight = min_weight
        self.max_weight = max_weight

        # 专业术语关键词（适合 BM25）
        self.exact_match_keywords = {
            # 体型术语
            "H型", "X型", "A型", "Y型", "O型", "沙漏型", "梨形", "苹果型",
            "矩形", "倒三角", "椭圆型",
            # 色彩季节
            "春季型", "夏季型", "秋季型", "冬季型", "暖色调", "冷色调",
            # 场合
            "约会", "通勤", "面试", "聚会", "日常", "校园", "旅行", "派对",
            "婚礼", "商务", "休闲",
            # 风格
            "极简风", "法式", "韩系", "日系", "街头", "学院风", "复古",
            "优雅", "休闲风", "运动风",
            # 服装品类
            "衬衫", "针织衫", "西装", "牛仔裤", "连衣裙", "半身裙", "阔腿裤",
            "A字裙", "铅笔裙", "风衣", "大衣", "毛衣", "T恤", "卫衣"
        }

        # 语义描述词（适合向量检索）
        self.semantic_keywords = {
            "显瘦", "显高", "遮肉", "修身", "宽松", "舒适", "时尚", "气质",
            "优雅", "知性", "可爱", "帅气", "温柔", "干练", "休闲", "正式",
            "搭配", "穿搭", "怎么穿", "如何穿", "适合", "推荐", "建议"
        }

    def calculate_weights(self, query: str) -> Tuple[float, float]:
        """
        计算自适应权重

        Args:
            query: 查询文本

        Returns:
            (bm25_weight, vector_weight) 元组
        """
        if not query:
            return self.default_bm25_weight, self.default_vector_weight

        query_lower = query.lower()

        # 特征分数
        exact_score = 0.0  # 精确匹配特征分数
        semantic_score = 0.0  # 语义特征分数

        # 1. 检查专业术语匹配
        for keyword in self.exact_match_keywords:
            if keyword in query:
                exact_score += 1.0

        # 2. 检查语义描述词
        for keyword in self.semantic_keywords:
            if keyword in query:
                semantic_score += 1.0

        # 3. 查询长度特征
        query_length = len(query)
        if query_length < 10:
            # 短查询更依赖精确匹配
            exact_score += 2.0
        elif query_length > 30:
            # 长查询更依赖语义理解
            semantic_score += 2.0

        # 4. 检查是否有问句结构
        if any(q in query for q in ["怎么", "如何", "怎样", "什么", "哪些"]):
            semantic_score += 1.0

        # 5. 检查是否有具体数值/尺寸
        import re
        if re.search(r'\d+', query):
            exact_score += 0.5

        # 计算最终权重
        total_score = exact_score + semantic_score
        if total_score == 0:
            return self.default_bm25_weight, self.default_vector_weight

        # BM25 权重基于精确匹配特征
        bm25_ratio = exact_score / total_score

        # 应用权重范围限制
        bm25_weight = max(self.min_weight, min(self.max_weight, bm25_ratio))
        vector_weight = 1.0 - bm25_weight

        logger.debug(
            f"Adaptive weights for query '{query[:30]}...': "
            f"BM25={bm25_weight:.3f}, Vector={vector_weight:.3f} "
            f"(exact={exact_score:.1f}, semantic={semantic_score:.1f})"
        )

        return bm25_weight, vector_weight

    def get_weight_explanation(self, query: str) -> Dict[str, Any]:
        """
        获取权重计算的详细解释

        Args:
            query: 查询文本

        Returns:
            包含权重和解释的字典
        """
        bm25_weight, vector_weight = self.calculate_weights(query)

        # 收集匹配的关键词
        matched_exact = [k for k in self.exact_match_keywords if k in query]
        matched_semantic = [k for k in self.semantic_keywords if k in query]

        return {
            "query": query,
            "bm25_weight": bm25_weight,
            "vector_weight": vector_weight,
            "matched_exact_keywords": matched_exact,
            "matched_semantic_keywords": matched_semantic,
            "query_length": len(query),
            "reasoning": {
                "has_exact_terms": len(matched_exact) > 0,
                "has_semantic_terms": len(matched_semantic) > 0,
                "is_short_query": len(query) < 10,
                "is_long_query": len(query) > 30
            }
        }


class ResultDeduplicator:
    """
    检索结果去重器

    支持多种去重策略：
    1. 基于 doc_id 的精确去重
    2. 基于内容相似度的模糊去重
    3. 基于元数据的去重
    """

    def __init__(
        self,
        similarity_threshold: float = 0.85,
        use_content_dedup: bool = True,
        use_metadata_dedup: bool = True
    ):
        """
        Args:
            similarity_threshold: 内容相似度阈值
            use_content_dedup: 是否启用内容去重
            use_metadata_dedup: 是否启用元数据去重
        """
        self.similarity_threshold = similarity_threshold
        self.use_content_dedup = use_content_dedup
        self.use_metadata_dedup = use_metadata_dedup

    def deduplicate(
        self,
        results: List[RetrievalResult],
        keep_first: bool = True
    ) -> List[RetrievalResult]:
        """
        对检索结果进行去重

        Args:
            results: 检索结果列表
            keep_first: 保留第一个出现的（分数更高的）

        Returns:
            去重后的结果列表
        """
        if not results:
            return results

        # 第一层：基于 doc_id 的精确去重
        deduped = self._dedupe_by_id(results, keep_first)

        # 第二层：基于内容相似度的去重
        if self.use_content_dedup:
            deduped = self._dedupe_by_content(deduped, keep_first)

        # 第三层：基于元数据的去重
        if self.use_metadata_dedup:
            deduped = self._dedupe_by_metadata(deduped, keep_first)

        return deduped

    def _dedupe_by_id(
        self,
        results: List[RetrievalResult],
        keep_first: bool
    ) -> List[RetrievalResult]:
        """基于 doc_id 去重"""
        seen_ids = set()
        deduped = []

        for result in results:
            if result.doc_id not in seen_ids:
                seen_ids.add(result.doc_id)
                deduped.append(result)
            elif not keep_first:
                # 替换为分数更高的
                for i, existing in enumerate(deduped):
                    if existing.doc_id == result.doc_id:
                        if result.score > existing.score:
                            deduped[i] = result
                        break

        return deduped

    def _dedupe_by_content(
        self,
        results: List[RetrievalResult],
        keep_first: bool
    ) -> List[RetrievalResult]:
        """基于内容相似度去重"""
        if len(results) <= 1:
            return results

        deduped = []
        content_hashes = []

        for result in results:
            # 计算内容哈希
            content_hash = self._compute_content_hash(result.content)

            # 检查是否与已有内容相似
            is_duplicate = False
            for existing_hash in content_hashes:
                similarity = self._compute_hash_similarity(content_hash, existing_hash)
                if similarity >= self.similarity_threshold:
                    is_duplicate = True
                    break

            if not is_duplicate:
                deduped.append(result)
                content_hashes.append(content_hash)

        return deduped

    def _dedupe_by_metadata(
        self,
        results: List[RetrievalResult],
        keep_first: bool
    ) -> List[RetrievalResult]:
        """基于元数据去重（同一来源只保留最佳）"""
        # 按 category 或 source 分组去重
        category_keys = ["category", "type", "source", "style"]

        deduped = []
        seen_categories = {}

        for result in results:
            # 构建分类键
            category_key = tuple(
                result.metadata.get(k, "")
                for k in category_keys
                if result.metadata.get(k)
            )

            if not category_key:
                # 无分类信息，直接保留
                deduped.append(result)
                continue

            if category_key not in seen_categories:
                seen_categories[category_key] = result
                deduped.append(result)
            elif not keep_first:
                # 检查是否应该替换
                existing = seen_categories[category_key]
                if result.score > existing.score:
                    # 替换
                    deduped = [r for r in deduped if r.doc_id != existing.doc_id]
                    deduped.append(result)
                    seen_categories[category_key] = result

        return deduped

    def _compute_content_hash(self, content: str) -> Dict[str, int]:
        """计算内容的 n-gram 哈希"""
        import jieba

        # 分词
        tokens = list(jieba.cut(content))
        tokens = [t for t in tokens if len(t) > 1]  # 过滤单字

        # 计算 2-gram 频率
        ngram_freq = {}
        for i in range(len(tokens) - 1):
            ngram = tokens[i] + tokens[i + 1]
            ngram_freq[ngram] = ngram_freq.get(ngram, 0) + 1

        return ngram_freq

    def _compute_hash_similarity(
        self,
        hash1: Dict[str, int],
        hash2: Dict[str, int]
    ) -> float:
        """计算两个哈希的相似度（Jaccard 相似度）"""
        if not hash1 or not hash2:
            return 0.0

        keys1 = set(hash1.keys())
        keys2 = set(hash2.keys())

        intersection = len(keys1 & keys2)
        union = len(keys1 | keys2)

        if union == 0:
            return 0.0

        return intersection / union


class AdaptiveHybridRetriever(HybridRetriever):
    """
    自适应混合检索器

    在 HybridRetriever 基础上增加：
    1. 自适应权重调整
    2. 智能去重
    3. 查询特征分析
    """

    def __init__(
        self,
        bm25_retriever=None,
        vector_store=None,
        embedding_service=None,
        reranker=None,
        config: Optional[HybridRetrievalConfig] = None,
        enable_adaptive_weights: bool = True,
        enable_deduplication: bool = True,
        dedup_similarity_threshold: float = 0.85
    ):
        """
        初始化自适应混合检索器

        Args:
            bm25_retriever: BM25 检索器
            vector_store: 向量存储
            embedding_service: 嵌入服务
            reranker: 重排序器
            config: 配置
            enable_adaptive_weights: 是否启用自适应权重
            enable_deduplication: 是否启用去重
            dedup_similarity_threshold: 去重相似度阈值
        """
        super().__init__(
            bm25_retriever=bm25_retriever,
            vector_store=vector_store,
            embedding_service=embedding_service,
            reranker=reranker,
            config=config
        )

        self.enable_adaptive_weights = enable_adaptive_weights
        self.enable_deduplication = enable_deduplication

        # 初始化自适应权重计算器
        self.weight_calculator = AdaptiveWeightCalculator(
            default_bm25_weight=self.config.bm25_weight,
            default_vector_weight=self.config.vector_weight
        )

        # 初始化去重器
        self.deduplicator = ResultDeduplicator(
            similarity_threshold=dedup_similarity_threshold,
            use_content_dedup=True,
            use_metadata_dedup=True
        )

        # 统计信息
        self.stats = {
            "total_queries": 0,
            "adaptive_weight_used": 0,
            "deduplication_applied": 0,
            "avg_bm25_weight": 0.0,
            "avg_vector_weight": 0.0
        }

    def search(
        self,
        query: str,
        top_k: Optional[int] = None,
        bm25_top_k: Optional[int] = None,
        vector_top_k: Optional[int] = None,
        filter_conditions: Optional[Dict[str, Any]] = None,
        use_adaptive: Optional[bool] = None,
        **kwargs
    ) -> List[RetrievalResult]:
        """
        执行自适应混合检索

        Args:
            query: 查询文本
            top_k: 最终返回结果数
            bm25_top_k: BM25 检索数量
            vector_top_k: 向量检索数量
            filter_conditions: 过滤条件
            use_adaptive: 是否使用自适应权重（覆盖默认设置）

        Returns:
            检索结果列表
        """
        self.stats["total_queries"] += 1

        top_k = top_k or self.config.final_top_k
        bm25_top_k = bm25_top_k or self.config.bm25_top_k
        vector_top_k = vector_top_k or self.config.vector_top_k

        # 计算自适应权重
        use_adaptive = use_adaptive if use_adaptive is not None else self.enable_adaptive_weights
        if use_adaptive:
            bm25_weight, vector_weight = self.weight_calculator.calculate_weights(query)
            self.stats["adaptive_weight_used"] += 1
            self.stats["avg_bm25_weight"] = (
                (self.stats["avg_bm25_weight"] * (self.stats["adaptive_weight_used"] - 1) + bm25_weight)
                / self.stats["adaptive_weight_used"]
            )
            self.stats["avg_vector_weight"] = (
                (self.stats["avg_vector_weight"] * (self.stats["adaptive_weight_used"] - 1) + vector_weight)
                / self.stats["adaptive_weight_used"]
            )
        else:
            bm25_weight = self.config.bm25_weight
            vector_weight = self.config.vector_weight

        result_lists = []
        weights = []

        # BM25 检索
        if self.bm25_searcher:
            bm25_results = self.bm25_searcher.search(
                query=query,
                top_k=bm25_top_k,
                **kwargs
            )
            result_lists.append(bm25_results)
            weights.append(bm25_weight)

        # 向量检索
        if self.vector_searcher:
            vector_results = self.vector_searcher.search(
                query=query,
                top_k=vector_top_k,
                filter_conditions=filter_conditions,
                **kwargs
            )
            result_lists.append(vector_results)
            weights.append(vector_weight)

        if not result_lists:
            return []

        # 融合结果
        if len(result_lists) == 1:
            fused_results = result_lists[0]
        else:
            fused_results = self.rrf.fuse(result_lists, weights)

        # 去重
        if self.enable_deduplication:
            original_count = len(fused_results)
            fused_results = self.deduplicator.deduplicate(fused_results)
            if len(fused_results) < original_count:
                self.stats["deduplication_applied"] += 1
                logger.debug(
                    f"Deduplication: {original_count} -> {len(fused_results)} results"
                )

        # 重排序
        if self.config.enable_reranking and self.reranker and len(fused_results) > 0:
            fused_results = self._rerank(query, fused_results)

        return fused_results[:top_k]

    def search_with_analysis(
        self,
        query: str,
        top_k: int = 10
    ) -> Dict[str, Any]:
        """
        检索并返回详细分析信息

        Args:
            query: 查询文本
            top_k: 返回结果数

        Returns:
            包含结果和分析信息的字典
        """
        # 获取权重分析
        weight_info = self.weight_calculator.get_weight_explanation(query)

        # 执行检索
        results = self.search(query, top_k=top_k)

        return {
            "query": query,
            "results": [r.to_dict() for r in results],
            "analysis": {
                "weight_info": weight_info,
                "deduplication_enabled": self.enable_deduplication,
                "adaptive_weights_enabled": self.enable_adaptive_weights
            },
            "stats": self.get_stats()
        }

    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        return {
            **self.stats,
            "config": {
                "bm25_weight": self.config.bm25_weight,
                "vector_weight": self.config.vector_weight,
                "rrf_k": self.config.rrf_k,
                "enable_reranking": self.config.enable_reranking
            }
        }

    def reset_stats(self):
        """重置统计信息"""
        self.stats = {
            "total_queries": 0,
            "adaptive_weight_used": 0,
            "deduplication_applied": 0,
            "avg_bm25_weight": 0.0,
            "avg_vector_weight": 0.0
        }
