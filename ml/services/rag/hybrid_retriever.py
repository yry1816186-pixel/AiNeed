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


class HybridRetriever:
    def __init__(self, bm25_retriever=None, vector_store=None, config: Optional[HybridRetrievalConfig] = None):
        self.bm25_retriever = bm25_retriever
        self.vector_store = vector_store
        self.config = config or HybridRetrievalConfig()
        logger.info("HybridRetriever initialized")

    def search(self, query: str, query_embedding: List[float], top_k: int = None) -> List[RetrievalResult]:
        k = top_k or self.config.top_k
        bm25_results = []
        vector_results = []
        if self.bm25_retriever:
            bm25_results = self.bm25_retriever.search(query, top_k=k * 2)
        if self.vector_store:
            vector_results = self.vector_store.search(query_embedding, top_k=k * 2)
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
        return [RetrievalResult(doc_id=did, content=doc_data[did]["content"], score=score, metadata=doc_data[did]["metadata"], source=doc_data[did]["source"]) for did, score in sorted_docs[:k]]
