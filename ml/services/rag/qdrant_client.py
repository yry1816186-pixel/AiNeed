import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class QdrantConfig:
    host: str = "localhost"
    port: int = 6333
    collection_name: str = "fashion_knowledge"
    embedding_dim: int = 512
    api_key: Optional[str] = None


@dataclass
class VectorDocument:
    doc_id: str
    content: str
    embedding: List[float]
    metadata: Dict[str, Any] = field(default_factory=dict)


class QdrantVectorStore:
    def __init__(self, config: Optional[QdrantConfig] = None):
        self.config = config or QdrantConfig()
        self._client = None
        self._documents: Dict[str, VectorDocument] = {}
        logger.info(f"QdrantVectorStore initialized (host={self.config.host}:{self.config.port})")

    def _connect(self):
        if self._client is None:
            try:
                from qdrant_client import QdrantClient
                self._client = QdrantClient(host=self.config.host, port=self.config.port, api_key=self.config.api_key)
                logger.info("Connected to Qdrant")
            except ImportError:
                logger.warning("qdrant_client not available, using in-memory fallback")
                self._client = "fallback"

    def upsert(self, documents: List[VectorDocument]):
        self._connect()
        for doc in documents:
            self._documents[doc.doc_id] = doc
        if self._client != "fallback":
            try:
                points = [{"id": doc.doc_id, "vector": doc.embedding, "payload": {"content": doc.content, **doc.metadata}} for doc in documents]
                self._client.upsert(collection_name=self.config.collection_name, points=points)
            except Exception as e:
                logger.warning(f"Qdrant upsert failed: {e}")

    def search(self, query_embedding: List[float], top_k: int = 10) -> List[Dict[str, Any]]:
        self._connect()
        if self._client == "fallback":
            import numpy as np
            query_vec = np.array(query_embedding)
            results = []
            for doc in self._documents.values():
                doc_vec = np.array(doc.embedding)
                score = float(np.dot(query_vec, doc_vec) / (np.linalg.norm(query_vec) * np.linalg.norm(doc_vec) + 1e-8))
                results.append({"doc_id": doc.doc_id, "score": score, "content": doc.content, "metadata": doc.metadata})
            results.sort(key=lambda x: x["score"], reverse=True)
            return results[:top_k]
        try:
            hits = self._client.search(collection_name=self.config.collection_name, query_vector=query_embedding, limit=top_k)
            return [{"doc_id": str(h.id), "score": h.score, "content": h.payload.get("content", ""), "metadata": {k: v for k, v in h.payload.items() if k != "content"}} for h in hits]
        except Exception as e:
            logger.warning(f"Qdrant search failed: {e}")
            return []
