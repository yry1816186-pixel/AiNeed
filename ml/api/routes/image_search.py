from __future__ import annotations

import io
import logging
from typing import List, Optional

from fastapi import APIRouter, File, Form, UploadFile
from pydantic import BaseModel, Field

from ml.api.middleware.error_handler import ModelNotLoadedError, InferenceError

logger = logging.getLogger(__name__)

try:
    from ml.services.rag.embeddings import EmbeddingService

    _embedding_service = EmbeddingService()
    _embedding_available = True
except Exception as e:
    logger.warning(f"EmbeddingService init failed: {e}")
    _embedding_service = None
    _embedding_available = False

try:
    from ml.services.rag.qdrant_client import QdrantVectorStore

    _vector_store = QdrantVectorStore()
    _vector_store_available = True
except Exception as e:
    logger.warning(f"QdrantVectorStore init failed: {e}")
    _vector_store = None
    _vector_store_available = False

router = APIRouter(prefix="/api/vector", tags=["Image Search"])

MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


class ImageEmbedResponse(BaseModel):
    embedding: List[float]
    dimension: int
    model: str


class ImageSearchResult(BaseModel):
    id: str
    score: float
    name: str = ""
    price: float = 0
    imageUrl: str = ""
    similarity: float = 0


class ImageSearchResponse(BaseModel):
    results: List[ImageSearchResult]
    total: int


def _validate_image(file: UploadFile, image_bytes: bytes) -> None:
    """Validate uploaded file is an image within size limits."""
    content_type = file.content_type or ""
    if not content_type.startswith("image/"):
        raise ModelNotLoadedError(model_name="image_validator") if False else ValueError(
            f"Invalid file type: {content_type}. Expected image/*"
        )
    if len(image_bytes) > MAX_IMAGE_SIZE:
        raise ValueError(
            f"Image size ({len(image_bytes)} bytes) exceeds limit ({MAX_IMAGE_SIZE} bytes)"
        )


@router.post("/embed/image", response_model=ImageEmbedResponse)
async def embed_image(file: UploadFile = File(...)) -> ImageEmbedResponse:
    """Embed an uploaded image into a FashionSigLIP 1152-dim vector."""
    if not _embedding_available or _embedding_service is None:
        raise ModelNotLoadedError(model_name="fashion-siglip")

    image_bytes = await file.read()

    content_type = file.content_type or ""
    if not content_type.startswith("image/"):
        raise InferenceError(message=f"Invalid file type: {content_type}. Expected image/*")

    if len(image_bytes) > MAX_IMAGE_SIZE:
        raise InferenceError(
            message=f"Image size ({len(image_bytes)} bytes) exceeds limit ({MAX_IMAGE_SIZE} bytes)"
        )

    try:
        from PIL import Image

        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        embedding = _embedding_service.encode_image([image])[0]

        return ImageEmbedResponse(
            embedding=embedding,
            dimension=len(embedding),
            model=_embedding_service.config.model_name,
        )
    except (ModelNotLoadedError, InferenceError):
        raise
    except Exception as e:
        logger.error(f"Image embedding failed: {e}")
        raise InferenceError(message=f"Image embedding failed: {str(e)}")


@router.post("/search/image", response_model=ImageSearchResponse)
async def search_by_image(
    file: UploadFile = File(...),
    top_k: int = Form(5),
) -> ImageSearchResponse:
    """Search for visually similar items using an uploaded image."""
    if not _embedding_available or _embedding_service is None:
        raise ModelNotLoadedError(model_name="fashion-siglip")
    if not _vector_store_available or _vector_store is None:
        raise ModelNotLoadedError(model_name="qdrant")

    image_bytes = await file.read()

    content_type = file.content_type or ""
    if not content_type.startswith("image/"):
        raise InferenceError(message=f"Invalid file type: {content_type}. Expected image/*")

    if len(image_bytes) > MAX_IMAGE_SIZE:
        raise InferenceError(
            message=f"Image size ({len(image_bytes)} bytes) exceeds limit ({MAX_IMAGE_SIZE} bytes)"
        )

    try:
        from PIL import Image

        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        embedding = _embedding_service.encode_image([image])[0]

        raw_results = _vector_store.search(
            query_embedding=embedding,
            top_k=top_k,
        )

        results = []
        for r in raw_results:
            meta = r.get("metadata", {})
            results.append(ImageSearchResult(
                id=r.get("doc_id", ""),
                score=r.get("score", 0),
                name=meta.get("name", ""),
                price=meta.get("price", 0),
                imageUrl=meta.get("imageUrl", ""),
                similarity=r.get("score", 0),
            ))

        return ImageSearchResponse(
            results=results,
            total=len(results),
        )
    except (ModelNotLoadedError, InferenceError):
        raise
    except Exception as e:
        logger.error(f"Image search failed: {e}")
        raise InferenceError(message=f"Image search failed: {str(e)}")
