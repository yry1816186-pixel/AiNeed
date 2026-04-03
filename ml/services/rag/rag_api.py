"""
Fashion Knowledge RAG API
FastAPI endpoints for RAG system
2026 Standard Implementation
"""

import os
import sys
import logging
from typing import Dict, List, Optional, Any
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import APIRouter, HTTPException, Query, Body, Depends
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/rag", tags=["RAG"])

# Global RAG instance
_rag_instance = None


def get_rag():
    """Get RAG instance"""
    global _rag_instance
    if _rag_instance is None:
        from services.fashion_knowledge_rag import FashionKnowledgeRAG, FashionRAGConfig

        config = FashionRAGConfig(
            qdrant_host=os.getenv("QDRANT_URL", "http://localhost:6333").replace("http://", "").split(":")[0],
            qdrant_port=int(os.getenv("QDRANT_URL", "http://localhost:6333").split(":")[-1].split("/")[0])
        )
        _rag_instance = FashionKnowledgeRAG(config)

        # Build index on startup
        _rag_instance.build_index()

    return _rag_instance


# Request/Response Models
class SearchRequest(BaseModel):
    """Search request"""
    query: str = Field(..., description="Search query", min_length=1)
    top_k: int = Field(default=10, ge=1, le=100, description="Number of results")
    category: Optional[str] = Field(default=None, description="Filter by category")
    include_evaluation: bool = Field(default=False, description="Include RAGAS evaluation")


class SearchResponse(BaseModel):
    """Search response"""
    query: str
    results: List[Dict[str, Any]]
    total: int
    retrieval_time_ms: float
    evaluation: Optional[Dict[str, Any]] = None


class ContextRequest(BaseModel):
    """Context generation request"""
    body_type: Optional[str] = Field(default=None, description="Body type code")
    color_season: Optional[str] = Field(default=None, description="Color season code")
    occasion: Optional[str] = Field(default=None, description="Occasion code")
    preferred_styles: Optional[List[str]] = Field(default=None, description="Preferred style codes")
    additional_query: Optional[str] = Field(default=None, description="Additional query text")


class ContextResponse(BaseModel):
    """Context response"""
    context: str
    knowledge_entries: int


class OutfitSuggestionRequest(BaseModel):
    """Outfit suggestion request"""
    body_type: str = Field(..., description="Body type code")
    occasion: str = Field(..., description="Occasion code")
    color_season: Optional[str] = Field(default=None, description="Color season code")
    preferred_styles: Optional[List[str]] = Field(default=None, description="Preferred styles")


class IndexStatusResponse(BaseModel):
    """Index status response"""
    is_indexed: bool
    total_entries: int
    categories: Dict[str, int]
    bm25_stats: Optional[Dict[str, Any]] = None
    qdrant_stats: Optional[Dict[str, Any]] = None


class EvaluationRequest(BaseModel):
    """Evaluation request"""
    query: str
    answer: str
    contexts: List[str]
    ground_truth: Optional[str] = None


class EvaluationResponse(BaseModel):
    """Evaluation response"""
    metrics: Dict[str, float]
    harmonic_mean: float


# API Endpoints
@router.get("/health")
async def health_check():
    """RAG system health check"""
    try:
        rag = get_rag()
        stats = rag.get_stats()

        return {
            "status": "healthy",
            "is_indexed": stats["is_indexed"],
            "total_entries": stats["total_entries"]
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }


@router.get("/status", response_model=IndexStatusResponse)
async def get_index_status():
    """Get RAG index status"""
    rag = get_rag()
    stats = rag.get_stats()

    return IndexStatusResponse(
        is_indexed=stats["is_indexed"],
        total_entries=stats["total_entries"],
        categories=stats.get("categories", {}),
        bm25_stats=stats.get("bm25"),
        qdrant_stats=stats.get("qdrant")
    )


@router.post("/search", response_model=SearchResponse)
async def search_knowledge(request: SearchRequest):
    """
    Search fashion knowledge using hybrid retrieval

    Combines BM25 (keyword) and vector (semantic) search with RRF fusion
    """
    try:
        rag = get_rag()

        import time
        start_time = time.time()

        if request.include_evaluation:
            result = rag.search_with_evaluation(
                query=request.query,
                top_k=request.top_k
            )

            return SearchResponse(
                query=request.query,
                results=result["results"],
                total=len(result["results"]),
                retrieval_time_ms=result["retrieval_time_ms"],
                evaluation=result.get("evaluation")
            )
        else:
            results = rag.search(
                query=request.query,
                top_k=request.top_k,
                category_filter=request.category
            )

            elapsed = (time.time() - start_time) * 1000

            return SearchResponse(
                query=request.query,
                results=results,
                total=len(results),
                retrieval_time_ms=elapsed
            )

    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search")
async def search_knowledge_get(
    q: str = Query(..., description="Search query"),
    top_k: int = Query(default=10, ge=1, le=100),
    category: Optional[str] = Query(default=None)
):
    """Quick search endpoint (GET)"""
    request = SearchRequest(query=q, top_k=top_k, category=category)
    return await search_knowledge(request)


@router.post("/context", response_model=ContextResponse)
async def generate_context(request: ContextRequest):
    """
    Generate context for AI stylist

    Retrieves relevant knowledge based on user profile parameters
    """
    try:
        rag = get_rag()

        context = rag.get_context_for_stylist(
            body_type=request.body_type,
            color_season=request.color_season,
            occasion=request.occasion,
            preferred_styles=request.preferred_styles,
            query=request.additional_query
        )

        return ContextResponse(
            context=context,
            knowledge_entries=len(context.split("\n\n")) if context else 0
        )

    except Exception as e:
        logger.error(f"Context generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/outfit-suggestion")
async def generate_outfit_suggestion(request: OutfitSuggestionRequest):
    """
    Generate outfit suggestion based on parameters

    Combines body type, occasion, color season, and style preferences
    """
    try:
        rag = get_rag()

        suggestion = rag.generate_outfit_suggestion(
            body_type=request.body_type,
            occasion=request.occasion,
            color_season=request.color_season,
            preferred_styles=request.preferred_styles
        )

        return suggestion

    except Exception as e:
        logger.error(f"Outfit suggestion failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/evaluate", response_model=EvaluationResponse)
async def evaluate_rag_response(request: EvaluationRequest):
    """
    Evaluate a RAG response using RAGAS metrics

    Computes faithfulness, answer_relevancy, context_recall, context_precision
    """
    try:
        from services.rag.rag_evaluator import RAGEvaluator, EvaluationSample

        evaluator = RAGEvaluator()

        sample = EvaluationSample(
            question=request.query,
            answer=request.answer,
            contexts=request.contexts,
            ground_truth=request.ground_truth
        )

        metrics = evaluator.evaluate_sample(sample)

        return EvaluationResponse(
            metrics=metrics.to_dict(),
            harmonic_mean=metrics.harmonic_mean
        )

    except Exception as e:
        logger.error(f"Evaluation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/index/rebuild")
async def rebuild_index(
    force: bool = Query(default=False, description="Force rebuild")
):
    """Rebuild RAG index"""
    try:
        global _rag_instance

        if _rag_instance is None:
            _rag_instance = get_rag()

        success = _rag_instance.build_index(force=force)

        if success:
            stats = _rag_instance.get_stats()
            return {
                "status": "success",
                "message": "Index rebuilt successfully",
                "stats": stats
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to rebuild index")

    except Exception as e:
        logger.error(f"Index rebuild failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Legacy endpoints for backward compatibility
@router.get("/body-type/{body_type}")
async def get_body_type_advice(body_type: str):
    """Get body type advice (legacy)"""
    rag = get_rag()
    advice = rag.get_body_type_advice(body_type)

    if advice is None:
        raise HTTPException(status_code=404, detail="Body type not found")

    return {
        "body_type": advice.body_type,
        "name": advice.name,
        "characteristics": advice.characteristics,
        "goals": advice.goals,
        "suitable_styles": advice.suitable_styles,
        "style_tips": advice.style_tips
    }


@router.get("/color-season/{season}")
async def get_color_season_advice(season: str):
    """Get color season advice (legacy)"""
    rag = get_rag()
    advice = rag.get_color_season_advice(season)

    if advice is None:
        raise HTTPException(status_code=404, detail="Color season not found")

    return {
        "season": advice.season,
        "name": advice.name,
        "characteristics": advice.characteristics,
        "best_colors": advice.best_colors,
        "avoid_colors": advice.avoid_colors,
        "metal": advice.metal
    }


@router.get("/occasion/{occasion}")
async def get_occasion_advice(occasion: str):
    """Get occasion advice (legacy)"""
    rag = get_rag()
    advice = rag.get_occasion_advice(occasion)

    if advice is None:
        raise HTTPException(status_code=404, detail="Occasion not found")

    return {
        "occasion": advice.occasion,
        "name": advice.name,
        "formality": advice.formality,
        "keywords": advice.keywords,
        "recommended": advice.recommended,
        "avoid": advice.avoid,
        "tips": advice.tips
    }


@router.get("/style/{style}")
async def get_style_keywords(style: str):
    """Get style keywords (legacy)"""
    rag = get_rag()
    keywords = rag.get_style_keywords(style)

    if keywords is None:
        raise HTTPException(status_code=404, detail="Style not found")

    return keywords


@router.get("/templates")
async def get_outfit_templates(
    occasion: Optional[str] = Query(default=None)
):
    """Get outfit templates (legacy)"""
    rag = get_rag()
    templates = rag.get_outfit_templates(occasion)
    return {"templates": templates}


@router.get("/color-combinations")
async def get_color_combinations(
    scenario: str = Query(default="classic")
):
    """Get color combinations (legacy)"""
    rag = get_rag()
    combinations = rag.get_color_combinations(scenario)
    return {"scenario": scenario, "combinations": combinations}


def register_rag_routes(app):
    """Register RAG routes with FastAPI app"""
    app.include_router(router)
    logger.info("RAG API routes registered")
