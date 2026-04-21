import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class RerankerConfig:
    model_name: str = "BAAI/bge-reranker-large"
    device: str = "cpu"
    top_k: int = 10


class BGEReranker:
    def __init__(self, config: Optional[RerankerConfig] = None):
        self.config = config or RerankerConfig()
        self._model = None
        logger.info(f"BGEReranker initialized with model={self.config.model_name}")

    def _load_model(self):
        if self._model is None:
            try:
                from sentence_transformers import CrossEncoder
                self._model = CrossEncoder(self.config.model_name, device=self.config.device)
                logger.info(f"Loaded reranker model: {self.config.model_name}")
            except ImportError:
                logger.warning("sentence_transformers not available, reranker will use identity scoring")
                self._model = "fallback"

    def rerank(self, query: str, documents: List[Dict[str, Any]], top_k: int = None) -> List[Dict[str, Any]]:
        self._load_model()
        k = top_k or self.config.top_k
        if self._model == "fallback" or not documents:
            return documents[:k]
        pairs = [(query, doc.get("content", "")) for doc in documents]
        scores = self._model.predict(pairs)
        for doc, score in zip(documents, scores):
            doc["rerank_score"] = float(score)
        documents.sort(key=lambda x: x.get("rerank_score", 0), reverse=True)
        return documents[:k]


class FashionReranker:
    def __init__(self, base_reranker: Optional[BGEReranker] = None):
        self.base_reranker = base_reranker or BGEReranker()
        logger.info("FashionReranker initialized")

    def rerank(self, query: str, documents: List[Dict[str, Any]], top_k: int = 10) -> List[Dict[str, Any]]:
        return self.base_reranker.rerank(query, documents, top_k=top_k)
