import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class QdrantConfig:
    host: str = "localhost"
    port: int = 6333
    collection_name: str = "fashion_knowledge"
    embedding_dim: int = 1152
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
        self._connect()
        logger.info(f"QdrantVectorStore initialized (host={self.config.host}:{self.config.port})")

    def _connect(self):
        if self._client is not None:
            return
        try:
            from qdrant_client import QdrantClient
            self._client = QdrantClient(
                host=self.config.host,
                port=self.config.port,
                api_key=self.config.api_key,
            )
            self._ensure_collection()
            logger.info("Connected to Qdrant")
        except ImportError:
            raise RuntimeError(
                "qdrant_client not installed. Install: pip install qdrant-client"
            )
        except Exception as e:
            raise RuntimeError(
                f"Failed to connect to Qdrant at {self.config.host}:{self.config.port}: {e}"
            )

    def _ensure_collection(self):
        from qdrant_client.models import Distance, VectorParams
        collections = self._client.get_collections().collections
        if self.config.collection_name not in [c.name for c in collections]:
            self._client.create_collection(
                collection_name=self.config.collection_name,
                vectors_config=VectorParams(
                    size=self.config.embedding_dim,
                    distance=Distance.COSINE,
                ),
            )
            logger.info(f"Created Qdrant collection: {self.config.collection_name}")

    def create_collection(self):
        self._ensure_collection()

    def upsert(self, documents: List[VectorDocument]):
        from qdrant_client.models import PointStruct
        points = [
            PointStruct(
                id=doc.doc_id,
                vector=doc.embedding,
                payload={"content": doc.content, **doc.metadata},
            )
            for doc in documents
        ]
        self._client.upsert(
            collection_name=self.config.collection_name,
            points=points,
        )
        logger.info(f"Upserted {len(points)} points to Qdrant")

    def upsert_documents(self, documents: List[VectorDocument]):
        self.upsert(documents)

    def search(self, query_embedding: List[float], top_k: int = 10, filters=None) -> List[Dict[str, Any]]:
        try:
            hits = self._client.search(
                collection_name=self.config.collection_name,
                query_vector=query_embedding,
                limit=top_k,
                query_filter=filters,
            )
            return [
                {
                    "doc_id": str(h.id),
                    "score": h.score,
                    "content": h.payload.get("content", ""),
                    "metadata": {
                        k: v for k, v in h.payload.items() if k != "content"
                    },
                }
                for h in hits
            ]
        except Exception as e:
            logger.error(f"Qdrant search failed: {e}")
            raise

    def get_collection_info(self) -> Optional[Dict[str, Any]]:
        try:
            info = self._client.get_collection(self.config.collection_name)
            return {
                "name": self.config.collection_name,
                "vector_count": info.points_count or 0,
                "indexed_vector_count": info.indexed_vectors_count or 0,
                "status": str(info.status),
            }
        except Exception as e:
            logger.warning(f"Failed to get collection info: {e}")
            return None
