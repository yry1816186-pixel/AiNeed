import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class RetrievalResult:
    doc_id: str
    content: str
    score: float
    metadata: Dict[str, Any] = field(default_factory=dict)
    source: str = "unknown"


@dataclass
class HybridRetrievalConfig:
    bm25_weight: float = 0.4
    vector_weight: float = 0.6
    top_k: int = 10
    rrf_k: int = 60
    bm25_top_k: int = 30
    vector_top_k: int = 30
    final_top_k: int = 10
    enable_reranking: bool = True


class HybridRetriever:
    def __init__(
        self,
        bm25_retriever=None,
        vector_store=None,
        embedding_service=None,
        reranker=None,
        config: Optional[HybridRetrievalConfig] = None,
    ):
        self.bm25_retriever = bm25_retriever
        self.vector_store = vector_store
        self.embedding_service = embedding_service
        self.reranker = reranker
        self.config = config or HybridRetrievalConfig()
        logger.info("HybridRetriever initialized")

    def search(
        self,
        query: str,
        query_embedding: Optional[List[float]] = None,
        top_k: Optional[int] = None,
        filter_conditions: Optional[Dict[str, Any]] = None,
    ) -> List[RetrievalResult]:
        k = top_k or self.config.final_top_k or self.config.top_k

        if query_embedding is None and self.embedding_service is not None:
            query_embedding = self.embedding_service.encode_query(query)

        bm25_results = []
        vector_results = []

        if self.bm25_retriever:
            bm25_k = self.config.bm25_top_k or k * 2
            bm25_results = self.bm25_retriever.search(query, top_k=bm25_k)

        if self.vector_store and query_embedding is not None:
            vector_k = self.config.vector_top_k or k * 2
            filters = None
            if filter_conditions:
                must_conditions = []
                for key, value in filter_conditions.items():
                    must_conditions.append({"key": key, "match": {"value": value}})
                if must_conditions:
                    filters = {"must": must_conditions}
            vector_results = self.vector_store.search(
                query_embedding, top_k=vector_k, filters=filters
            )

        rrf_scores: Dict[str, float] = {}
        doc_data: Dict[str, Dict[str, Any]] = {}

        for rank, r in enumerate(bm25_results):
            doc_id = r["doc_id"]
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0) + self.config.bm25_weight / (self.config.rrf_k + rank + 1)
            doc_data[doc_id] = {"content": r.get("content", ""), "metadata": r.get("metadata", {}), "source": "bm25"}

        for rank, r in enumerate(vector_results):
            doc_id = r["doc_id"]
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0) + self.config.vector_weight / (self.config.rrf_k + rank + 1)
            if doc_id not in doc_data:
                doc_data[doc_id] = {"content": r.get("content", ""), "metadata": r.get("metadata", {}), "source": "vector"}

        sorted_docs = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
        results = [
            RetrievalResult(
                doc_id=did,
                content=doc_data[did]["content"],
                score=score,
                metadata=doc_data[did]["metadata"],
                source=doc_data[did]["source"],
            )
            for did, score in sorted_docs[:k]
        ]

        if self.config.enable_reranking and self.reranker is not None and results:
            rerank_input = [
                {"doc_id": r.doc_id, "content": r.content, "metadata": r.metadata}
                for r in results
            ]
            reranked = self.reranker.rerank(query, rerank_input, top_k=k)
            results = []
            for item in reranked:
                doc_id = item.get("doc_id", "")
                original = next((r for r in sorted_docs[:k] if r[0] == doc_id), None)
                results.append(RetrievalResult(
                    doc_id=doc_id,
                    content=item.get("content", ""),
                    score=item.get("rerank_score", 0),
                    metadata=item.get("metadata", {}),
                    source="reranker",
                ))

        return results
