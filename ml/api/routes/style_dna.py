"""FastAPI routes for Style DNA computation and matching."""

from __future__ import annotations

import logging
from typing import Any, List, Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from ml.api.middleware.error_handler import ModelNotLoadedError

logger = logging.getLogger(__name__)

try:
    from ml.services.rag.qdrant_client import QdrantVectorStore, QdrantConfig
    from ml.services.social.style_dna import StyleDNAService

    _fashion_store = QdrantVectorStore(QdrantConfig(collection_name="fashion_knowledge"))
    _user_dna_store = QdrantVectorStore(QdrantConfig(collection_name="user_style_dna"))
    _style_dna_service = StyleDNAService(_user_dna_store, _fashion_store)
    _style_dna_available = True
except Exception as e:
    logger.warning(f"StyleDNAService init failed: {e}")
    _style_dna_service = None
    _style_dna_available = False

router = APIRouter(prefix="/api/social/style-dna", tags=["Style DNA"])


class ComputeRequest(BaseModel):
    user_id: str = Field(..., description="User ID to compute style DNA for")
    item_ids: List[str] = Field(..., description="List of item IDs the user interacted with")
    interaction_types: List[str] = Field(
        ..., description="Interaction types corresponding to each item (purchase, favorite, try_on, view)"
    )


class ComputeResponse(BaseModel):
    success: bool


class MatchResult(BaseModel):
    user_id: str
    score: float


class MatchesResponse(BaseModel):
    matches: List[MatchResult]


@router.post("/compute", response_model=ComputeResponse)
async def compute_style_dna(request: ComputeRequest) -> ComputeResponse:
    """Compute user style DNA from interaction history."""
    if not _style_dna_available or _style_dna_service is None:
        raise ModelNotLoadedError(model_name="style-dna")

    await _style_dna_service.compute_from_behaviors(
        user_id=request.user_id,
        item_ids=request.item_ids,
        interaction_types=request.interaction_types,
    )
    return ComputeResponse(success=True)


@router.get("/matches", response_model=MatchesResponse)
async def get_matches(
    user_id: str = Query(..., description="User ID to find similar users for"),
    top_k: int = Query(10, description="Number of results", ge=1, le=50),
) -> MatchesResponse:
    """Find top-K similar users by style DNA cosine similarity."""
    if not _style_dna_available or _style_dna_service is None:
        raise ModelNotLoadedError(model_name="style-dna")

    results = await _style_dna_service.find_similar_users(user_id, top_k=top_k)
    matches = [MatchResult(user_id=r["user_id"], score=r["score"]) for r in results]
    return MatchesResponse(matches=matches)


@router.get("/health")
async def style_dna_health():
    """Return Style DNA service availability status."""
    return {
        "available": _style_dna_available,
        "service": "style-dna" if _style_dna_available else None,
    }
