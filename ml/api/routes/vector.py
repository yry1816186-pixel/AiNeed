from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from ml.api.middleware.error_handler import ModelNotLoadedError, InferenceError

logger = logging.getLogger(__name__)

try:
    from ml.services.rag.embeddings import EmbeddingService, EmbeddingConfig
    _embedding_service = EmbeddingService()
    _embedding_available = True
except Exception as e:
    logger.warning(f"EmbeddingService init failed: {e}")
    _embedding_service = None
    _embedding_available = False

try:
    from ml.services.rag.qdrant_client import QdrantVectorStore, QdrantConfig
    _vector_store = QdrantVectorStore()
    _vector_store_available = True
except Exception as e:
    logger.warning(f"QdrantVectorStore init failed: {e}")
    _vector_store = None
    _vector_store_available = False

router = APIRouter(prefix="/api/vector", tags=["Vector Search"])


class TextEmbedRequest(BaseModel):
    text: str = Field(..., description="Text to embed")
    model: Optional[str] = Field(None, description="Model name override")


class TextEmbedResponse(BaseModel):
    embedding: List[float]
    dimension: int
    model: str


class BatchTextEmbedRequest(BaseModel):
    texts: List[str] = Field(..., description="Texts to embed")
    model: Optional[str] = Field(None, description="Model name override")


class BatchTextEmbedResponse(BaseModel):
    embeddings: List[List[float]]
    dimension: int
    model: str
    count: int


class VectorSearchRequest(BaseModel):
    query: str = Field(..., description="Search query text")
    top_k: int = Field(10, description="Number of results")
    occasion: Optional[str] = Field(None, description="Filter by occasion")
    category: Optional[str] = Field(None, description="Filter by category")
    gender: Optional[str] = Field(None, description="Filter by gender")


class VectorSearchResult(BaseModel):
    id: str
    score: float
    name: str
    description: str
    occasion: str = ""
    style: str = ""
    category: str = ""
    gender: str = ""
    colors: List[str] = Field(default_factory=list)
    price: float = 0
    tags: List[str] = Field(default_factory=list)


class VectorSearchResponse(BaseModel):
    results: List[VectorSearchResult]
    total: int
    query: str


@router.post("/embed/text", response_model=TextEmbedResponse)
async def embed_text(request: TextEmbedRequest) -> TextEmbedResponse:
    if not _embedding_available or _embedding_service is None:
        raise ModelNotLoadedError(model_name="fashion-clip")

    try:
        embedding = _embedding_service.encode_query(request.text)
        return TextEmbedResponse(
            embedding=embedding,
            dimension=len(embedding),
            model=_embedding_service.config.model_name,
        )
    except Exception as e:
        logger.error(f"Text embedding failed: {e}")
        raise InferenceError(message=f"文本嵌入失败: {str(e)}")


@router.post("/embed/batch", response_model=BatchTextEmbedResponse)
async def embed_batch(request: BatchTextEmbedRequest) -> BatchTextEmbedResponse:
    if not _embedding_available or _embedding_service is None:
        raise ModelNotLoadedError(model_name="fashion-clip")

    try:
        embeddings = _embedding_service.encode_text(request.texts)
        return BatchTextEmbedResponse(
            embeddings=embeddings,
            dimension=len(embeddings[0]) if embeddings else 0,
            model=_embedding_service.config.model_name,
            count=len(embeddings),
        )
    except Exception as e:
        logger.error(f"Batch embedding failed: {e}")
        raise InferenceError(message=f"批量嵌入失败: {str(e)}")


@router.post("/search", response_model=VectorSearchResponse)
async def vector_search(request: VectorSearchRequest) -> VectorSearchResponse:
    if not _embedding_available or _embedding_service is None:
        raise ModelNotLoadedError(model_name="fashion-clip")
    if not _vector_store_available or _vector_store is None:
        raise ModelNotLoadedError(model_name="qdrant")

    try:
        query_embedding = _embedding_service.encode_query(request.query)

        filters = None
        must_conditions = []
        if request.occasion:
            must_conditions.append({"key": "occasion", "match": {"value": request.occasion}})
        if request.category:
            must_conditions.append({"key": "category", "match": {"value": request.category}})
        if request.gender:
            must_conditions.append({"key": "gender", "match": {"value": request.gender}})
        if must_conditions:
            filters = {"must": must_conditions}

        raw_results = _vector_store.search(
            query_embedding=query_embedding,
            top_k=request.top_k,
            filters=filters,
        )

        results = []
        for r in raw_results:
            meta = r.get("metadata", {})
            results.append(VectorSearchResult(
                id=r.get("doc_id", ""),
                score=r.get("score", 0),
                name=meta.get("name", ""),
                description=meta.get("description", ""),
                occasion=meta.get("occasion", ""),
                style=meta.get("style", ""),
                category=meta.get("category", ""),
                gender=meta.get("gender", ""),
                colors=meta.get("colors", []),
                price=meta.get("price", 0),
                tags=meta.get("tags", []),
            ))

        return VectorSearchResponse(
            results=results,
            total=len(results),
            query=request.query,
        )
    except (ModelNotLoadedError, InferenceError):
        raise
    except Exception as e:
        logger.error(f"Vector search failed: {e}")
        raise InferenceError(message=f"向量检索失败: {str(e)}")


@router.get("/health")
async def vector_health():
    return {
        "status": "healthy" if (_embedding_available and _vector_store_available) else "degraded",
        "embedding": _embedding_available,
        "vector_store": _vector_store_available,
        "model": _embedding_service.config.model_name if _embedding_service else None,
    }
