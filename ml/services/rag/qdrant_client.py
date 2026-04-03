"""
Qdrant Vector Store for Fashion RAG
Manages vector embeddings in Qdrant
2026 Standard Implementation

Features:
- Connection pooling with retry mechanism
- Tenacity-based retry decorator for resilience
- Graceful error handling
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional, Union
from dataclasses import dataclass, asdict
from pathlib import Path
import numpy as np
import uuid
from datetime import datetime
from functools import wraps

# Import tenacity for retry mechanism
try:
    from tenacity import (
        retry,
        stop_after_attempt,
        wait_exponential,
        retry_if_exception_type,
        before_sleep_log
    )
    TENACITY_AVAILABLE = True
except ImportError:
    TENACITY_AVAILABLE = False
    # Fallback: create a no-op decorator
    def retry(*args, **kwargs):
        def decorator(func):
            return func
        return decorator
    stop_after_attempt = lambda x: None
    wait_exponential = lambda **kwargs: None
    retry_if_exception_type = lambda x: None
    before_sleep_log = lambda logger, level: None

logger = logging.getLogger(__name__)


# Connection pool configuration
QDRANT_POOL_SIZE = int(os.getenv("QDRANT_POOL_SIZE", "10"))
QDRANT_MAX_RETRIES = int(os.getenv("QDRANT_MAX_RETRIES", "3"))
QDRANT_RETRY_MIN_WAIT = float(os.getenv("QDRANT_RETRY_MIN_WAIT", "1.0"))
QDRANT_RETRY_MAX_WAIT = float(os.getenv("QDRANT_RETRY_MAX_WAIT", "10.0"))


def qdrant_retry(func):
    """
    Retry decorator for Qdrant operations with exponential backoff.
    """
    if TENACITY_AVAILABLE:
        return retry(
            stop=stop_after_attempt(QDRANT_MAX_RETRIES),
            wait=wait_exponential(
                multiplier=1,
                min=QDRANT_RETRY_MIN_WAIT,
                max=QDRANT_RETRY_MAX_WAIT
            ),
            retry=retry_if_exception_type((
                ConnectionError,
                TimeoutError,
                OSError,
            )),
            before_sleep=before_sleep_log(logger, logging.WARNING),
            reraise=True
        )(func)
    else:
        return func


@dataclass
class QdrantConfig:
    """Configuration for Qdrant vector store"""
    host: str = "localhost"
    port: int = 6333
    grpc_port: int = 6334
    prefer_grpc: bool = False
    api_key: Optional[str] = None
    collection_name: str = "fashion_knowledge"
    vector_size: int = 512
    distance: str = "Cosine"

    # Connection pool settings
    pool_size: int = QDRANT_POOL_SIZE
    max_retries: int = QDRANT_MAX_RETRIES
    retry_min_wait: float = QDRANT_RETRY_MIN_WAIT
    retry_max_wait: float = QDRANT_RETRY_MAX_WAIT
    connection_timeout: float = 30.0

    # Index settings - Optimized HNSW configuration for fashion RAG
    # m: Number of edges per node (16 is good balance between recall and speed)
    # ef_construct: Build-time search depth (higher = better quality, slower build)
    # full_scan_threshold: Threshold for choosing full scan over index
    hnsw_config: Dict[str, Any] = None
    quantization_config: Dict[str, Any] = None

    # Search optimization
    search_ef: int = 64  # Search-time ef parameter (higher = better recall, slower)

    def __post_init__(self):
        if self.hnsw_config is None:
            # Optimized HNSW config for fashion knowledge retrieval
            # These values are tuned for medium-sized datasets (10K-1M vectors)
            self.hnsw_config = {
                "m": 16,                    # Connections per layer
                "ef_construct": 128,        # Build-time search depth (increased for better quality)
                "full_scan_threshold": 10000,  # Use full scan for small datasets
            }


@dataclass
class VectorDocument:
    """Document representation for vector storage"""
    id: str
    vector: List[float]
    content: str
    metadata: Dict[str, Any]
    created_at: str = None

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now().isoformat()


class QdrantVectorStore:
    """
    Qdrant Vector Store

    Manages vector embeddings in Qdrant for semantic search
    Includes connection pooling and retry mechanisms for resilience.
    """

    def __init__(self, config: Optional[QdrantConfig] = None):
        """
        Initialize Qdrant vector store

        Args:
            config: Qdrant configuration
        """
        self.config = config or QdrantConfig()
        self._client = None
        self._connected = False
        self._connection_pool = []

    @property
    def client(self):
        """Lazy load Qdrant client"""
        if self._client is None:
            self._connect()
        return self._client

    @qdrant_retry
    def _connect(self):
        """Connect to Qdrant server with retry mechanism"""
        try:
            from qdrant_client import QdrantClient
            from qdrant_client.http import models

            # Build connection kwargs with pool settings
            connection_kwargs = {
                "prefer_grpc": self.config.prefer_grpc,
                "grpc_port": self.config.grpc_port,
                "timeout": self.config.connection_timeout,
            }

            if self.config.api_key:
                connection_kwargs["url"] = f"http://{self.config.host}:{self.config.port}"
                connection_kwargs["api_key"] = self.config.api_key
            else:
                connection_kwargs["host"] = self.config.host
                connection_kwargs["port"] = self.config.port

            # Create client with connection pooling support
            self._client = QdrantClient(**connection_kwargs)

            # Test connection
            self._client.get_collections()
            self._connected = True

            logger.info(f"Connected to Qdrant at {self.config.host}:{self.config.port} "
                       f"(pool_size={self.config.pool_size}, max_retries={self.config.max_retries})")

        except Exception as e:
            logger.error(f"Failed to connect to Qdrant after retries: {e}")
            raise

    @qdrant_retry
    def create_collection(self, collection_name: Optional[str] = None) -> bool:
        """
        Create a collection if it doesn't exist

        Args:
            collection_name: Collection name (uses config if not provided)

        Returns:
            True if collection was created or already exists
        """
        from qdrant_client.http import models

        collection_name = collection_name or self.config.collection_name

        try:
            # Check if collection exists
            collections = self.client.get_collections()
            existing_names = [c.name for c in collections.collections]

            if collection_name in existing_names:
                logger.info(f"Collection '{collection_name}' already exists")
                return True

            # Create collection
            distance_map = {
                "Cosine": models.Distance.COSINE,
                "Euclidean": models.Distance.EUCLID,
                "Dot": models.Distance.DOT
            }

            self.client.create_collection(
                collection_name=collection_name,
                vectors_config=models.VectorParams(
                    size=self.config.vector_size,
                    distance=distance_map.get(self.config.distance, models.Distance.COSINE)
                ),
                hnsw_config=models.HnswConfigDiff(
                    **self.config.hnsw_config
                ) if self.config.hnsw_config else None
            )

            logger.info(f"Created collection '{collection_name}'")
            return True

        except Exception as e:
            logger.error(f"Failed to create collection: {e}")
            return False

    @qdrant_retry
    def delete_collection(self, collection_name: Optional[str] = None) -> bool:
        """Delete a collection"""
        collection_name = collection_name or self.config.collection_name

        try:
            self.client.delete_collection(collection_name)
            logger.info(f"Deleted collection '{collection_name}'")
            return True
        except Exception as e:
            logger.error(f"Failed to delete collection: {e}")
            return False

    @qdrant_retry
    def upsert_documents(
        self,
        documents: List[VectorDocument],
        collection_name: Optional[str] = None,
        batch_size: int = 100
    ) -> int:
        """
        Upsert documents to the collection

        Args:
            documents: List of VectorDocument objects
            collection_name: Collection name
            batch_size: Batch size for upsert

        Returns:
            Number of documents upserted

        Raises:
            ValueError: If vector dimension mismatch
        """
        from qdrant_client.http import models

        collection_name = collection_name or self.config.collection_name

        for doc in documents:
            if len(doc.vector) != self.config.vector_size:
                raise ValueError(
                    f"Vector dimension mismatch for doc {doc.id}: "
                    f"expected {self.config.vector_size}, got {len(doc.vector)}"
                )

        self.create_collection(collection_name)

        upserted = 0

        for i in range(0, len(documents), batch_size):
            batch = documents[i:i + batch_size]

            points = [
                models.PointStruct(
                    id=doc.id,
                    vector=doc.vector,
                    payload={
                        "content": doc.content,
                        "metadata": doc.metadata,
                        "created_at": doc.created_at
                    }
                )
                for doc in batch
            ]

            try:
                self.client.upsert(
                    collection_name=collection_name,
                    points=points
                )
                upserted += len(batch)

            except Exception as e:
                logger.error(f"Failed to upsert batch: {e}")

        logger.info(f"Upserted {upserted} documents to '{collection_name}'")
        return upserted

    def upsert_vectors(
        self,
        ids: List[str],
        vectors: List[List[float]],
        contents: List[str],
        metadatas: Optional[List[Dict[str, Any]]] = None,
        collection_name: Optional[str] = None
    ) -> int:
        """
        Upsert vectors with content and metadata

        Args:
            ids: Document IDs
            vectors: Vector embeddings
            contents: Document contents
            metadatas: Optional metadata dicts
            collection_name: Collection name

        Returns:
            Number of documents upserted
        """
        documents = [
            VectorDocument(
                id=ids[i],
                vector=vectors[i],
                content=contents[i],
                metadata=metadatas[i] if metadatas else {}
            )
            for i in range(len(ids))
        ]

        return self.upsert_documents(documents, collection_name)

    @qdrant_retry
    def search(
        self,
        query_vector: List[float],
        top_k: int = 10,
        filter_conditions: Optional[Dict[str, Any]] = None,
        collection_name: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for similar vectors

        Args:
            query_vector: Query vector
            top_k: Number of results to return
            filter_conditions: Optional filter conditions
            collection_name: Collection name

        Returns:
            List of search results with id, score, content, metadata
        """
        from qdrant_client.http import models

        collection_name = collection_name or self.config.collection_name

        # Build filter if provided
        query_filter = None
        if filter_conditions:
            must_conditions = []

            for key, value in filter_conditions.items():
                if isinstance(value, list):
                    # Match any of the values
                    must_conditions.append(
                        models.FieldCondition(
                            key=f"metadata.{key}",
                            match=models.MatchAny(any=value)
                        )
                    )
                else:
                    must_conditions.append(
                        models.FieldCondition(
                            key=f"metadata.{key}",
                            match=models.MatchValue(value=value)
                        )
                    )

            if must_conditions:
                query_filter = models.Filter(must=must_conditions)

        try:
            results = self.client.search(
                collection_name=collection_name,
                query_vector=query_vector,
                limit=top_k,
                query_filter=query_filter,
                search_params=models.SearchParams(
                    hnsw_ef=self.config.search_ef,
                    exact=False  # Use approximate search for better performance
                )
            )

            formatted_results = []
            for result in results:
                formatted_results.append({
                    "id": result.id,
                    "score": result.score,
                    "content": result.payload.get("content", ""),
                    "metadata": result.payload.get("metadata", {}),
                    "created_at": result.payload.get("created_at")
                })

            return formatted_results

        except Exception as e:
            logger.error(f"Search failed: {e}")
            return []

    def search_by_text(
        self,
        query_text: str,
        embedding_service,
        top_k: int = 10,
        filter_conditions: Optional[Dict[str, Any]] = None,
        collection_name: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Search by text query (requires embedding service)

        Args:
            query_text: Query text
            embedding_service: Service to encode text to vector
            top_k: Number of results
            filter_conditions: Optional filter conditions
            collection_name: Collection name

        Returns:
            List of search results
        """
        # Get embedding for query
        query_vector = embedding_service.encode_text(query_text)

        return self.search(
            query_vector=query_vector.tolist(),
            top_k=top_k,
            filter_conditions=filter_conditions,
            collection_name=collection_name
        )

    @qdrant_retry
    def get_document(
        self,
        doc_id: str,
        collection_name: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Get a document by ID"""
        collection_name = collection_name or self.config.collection_name

        try:
            result = self.client.retrieve(
                collection_name=collection_name,
                ids=[doc_id]
            )

            if result:
                return {
                    "id": result[0].id,
                    "vector": result[0].vector,
                    "content": result[0].payload.get("content", ""),
                    "metadata": result[0].payload.get("metadata", {})
                }

        except Exception as e:
            logger.error(f"Failed to get document {doc_id}: {e}")

        return None

    def delete_document(
        self,
        doc_id: str,
        collection_name: Optional[str] = None
    ) -> bool:
        """Delete a document by ID"""
        collection_name = collection_name or self.config.collection_name

        try:
            self.client.delete(
                collection_name=collection_name,
                points_selector=[doc_id]
            )
            return True
        except Exception as e:
            logger.error(f"Failed to delete document {doc_id}: {e}")
            return False

    def delete_documents(
        self,
        doc_ids: List[str],
        collection_name: Optional[str] = None
    ) -> bool:
        """Delete multiple documents by IDs"""
        collection_name = collection_name or self.config.collection_name

        try:
            self.client.delete(
                collection_name=collection_name,
                points_selector=doc_ids
            )
            return True
        except Exception as e:
            logger.error(f"Failed to delete documents: {e}")
            return False

    def get_collection_info(
        self,
        collection_name: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Get collection information"""
        collection_name = collection_name or self.config.collection_name

        try:
            info = self.client.get_collection(collection_name)

            return {
                "name": collection_name,
                "points_count": info.points_count,
                "vectors_count": info.vectors_count,
                "indexed_vectors_count": info.indexed_vectors_count,
                "segments_count": info.segments_count,
                "status": info.status.value,
                "config": {
                    "vector_size": info.config.params.vectors.size,
                    "distance": info.config.params.vectors.distance.value
                }
            }
        except Exception as e:
            logger.error(f"Failed to get collection info: {e}")
            return None

    def scroll_documents(
        self,
        limit: int = 100,
        offset: Optional[str] = None,
        collection_name: Optional[str] = None
    ) -> tuple:
        """
        Scroll through all documents

        Args:
            limit: Number of documents per page
            offset: Pagination offset
            collection_name: Collection name

        Returns:
            Tuple of (documents, next_offset)
        """
        collection_name = collection_name or self.config.collection_name

        try:
            results, next_offset = self.client.scroll(
                collection_name=collection_name,
                limit=limit,
                offset=offset,
                with_payload=True,
                with_vectors=False
            )

            documents = [
                {
                    "id": r.id,
                    "content": r.payload.get("content", ""),
                    "metadata": r.payload.get("metadata", {})
                }
                for r in results
            ]

            return documents, next_offset

        except Exception as e:
            logger.error(f"Scroll failed: {e}")
            return [], None

    def count_documents(self, collection_name: Optional[str] = None) -> int:
        """Count documents in collection"""
        info = self.get_collection_info(collection_name)
        return info["points_count"] if info else 0

    def health_check(self) -> Dict[str, Any]:
        """Check connection health"""
        try:
            collections = self.client.get_collections()
            return {
                "status": "healthy",
                "connected": True,
                "collections_count": len(collections.collections)
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "connected": False,
                "error": str(e)
            }
