"""
Hallucination Detection API

FastAPI endpoints for hallucination detection service.
Integrates with the main AI service.
"""

import logging
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field

from .detector import (
    HallucinationDetector,
    HallucinationResult,
    DetectionConfig
)
from .knowledge_verifier import KnowledgeVerifier

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/v1/hallucination", tags=["hallucination"])

# Global detector instance
_detector: Optional[HallucinationDetector] = None


def get_detector() -> HallucinationDetector:
    """Get or create hallucination detector instance"""
    global _detector
    if _detector is None:
        _detector = HallucinationDetector(
            config=DetectionConfig(),
            knowledge_verifier=KnowledgeVerifier()
        )
    return _detector


# Request/Response Models
class DetectionRequest(BaseModel):
    """Request model for hallucination detection"""
    text: str = Field(..., description="Text to analyze for hallucinations")
    context: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Validation context (occasion, season, body_type, etc.)"
    )


class IssueResponse(BaseModel):
    """Response model for a single issue"""
    type: str
    severity: str
    description: str
    confidence: float
    location: Optional[str] = None
    suggestion: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class DetectionResponse(BaseModel):
    """Response model for hallucination detection"""
    is_hallucination: bool
    confidence_score: float
    issues: List[IssueResponse]
    processing_time_ms: float
    text_length: int
    validated_at: str


class BatchDetectionRequest(BaseModel):
    """Request model for batch detection"""
    texts: List[str] = Field(..., description="List of texts to analyze")
    contexts: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="Optional list of contexts (one per text)"
    )


class BatchStatsResponse(BaseModel):
    """Response model for batch statistics"""
    total: int
    hallucination_count: int
    hallucination_rate: float
    average_confidence: float
    total_issues: int
    issues_per_text: float
    issue_types: Dict[str, int]
    average_processing_time_ms: float


class BatchDetectionResponse(BaseModel):
    """Response model for batch detection"""
    results: List[DetectionResponse]
    stats: BatchStatsResponse


# API Endpoints
@router.post("/detect", response_model=DetectionResponse)
async def detect_hallucination(request: DetectionRequest):
    """
    Detect hallucinations in text

    Analyzes the provided text for potential hallucinations using
    multiple detection dimensions:
    - Factual consistency
    - Logical consistency
    - Numerical reasonableness
    - Fashion rule compliance
    - Context matching
    """
    try:
        detector = get_detector()
        result = detector.detect(request.text, request.context)

        return DetectionResponse(
            is_hallucination=result.is_hallucination,
            confidence_score=result.confidence_score,
            issues=[
                IssueResponse(
                    type=issue.type.value,
                    severity=issue.severity.value,
                    description=issue.description,
                    confidence=issue.confidence,
                    location=issue.location,
                    suggestion=issue.suggestion,
                    details=issue.details
                )
                for issue in result.issues
            ],
            processing_time_ms=result.processing_time_ms,
            text_length=result.text_length,
            validated_at=result.validated_at
        )
    except Exception as e:
        logger.error(f"Detection failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/detect/batch", response_model=BatchDetectionResponse)
async def detect_batch(request: BatchDetectionRequest):
    """
    Batch hallucination detection

    Analyzes multiple texts for hallucinations and returns
    aggregate statistics.
    """
    try:
        from .detector import BatchHallucinationDetector

        detector = get_detector()
        batch_detector = BatchHallucinationDetector(detector)

        contexts = request.contexts or [None] * len(request.texts)
        results = batch_detector.detect_batch(request.texts, contexts)
        stats = batch_detector.get_aggregate_stats(results)

        return BatchDetectionResponse(
            results=[
                DetectionResponse(
                    is_hallucination=r.is_hallucination,
                    confidence_score=r.confidence_score,
                    issues=[
                        IssueResponse(
                            type=issue.type.value,
                            severity=issue.severity.value,
                            description=issue.description,
                            confidence=issue.confidence,
                            location=issue.location,
                            suggestion=issue.suggestion,
                            details=issue.details
                        )
                        for issue in r.issues
                    ],
                    processing_time_ms=r.processing_time_ms,
                    text_length=r.text_length,
                    validated_at=r.validated_at
                )
                for r in results
            ],
            stats=BatchStatsResponse(
                total=stats['total'],
                hallucination_count=stats['hallucination_count'],
                hallucination_rate=stats['hallucination_rate'],
                average_confidence=stats['average_confidence'],
                total_issues=stats['total_issues'],
                issues_per_text=stats['issues_per_text'],
                issue_types=stats['issue_types'],
                average_processing_time_ms=stats['average_processing_time_ms']
            )
        )
    except Exception as e:
        logger.error(f"Batch detection failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/confidence", response_model=Dict[str, float])
async def get_confidence_score(request: DetectionRequest):
    """
    Get confidence score only (lightweight endpoint)

    Returns just the confidence score without detailed issue analysis.
    Useful for quick validation checks.
    """
    try:
        detector = get_detector()
        score = detector.get_confidence_score(request.text, request.context)
        return {"confidence_score": score}
    except Exception as e:
        logger.error(f"Confidence check failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate-correct")
async def validate_and_correct(request: DetectionRequest):
    """
    Validate text and get correction suggestions

    Analyzes text for hallucinations and provides suggested corrections
    for detected issues.
    """
    try:
        detector = get_detector()
        corrected_text, result = detector.validate_and_correct(
            request.text,
            request.context
        )

        return {
            "original_text": request.text,
            "corrected_text": corrected_text,
            "validation": {
                "is_hallucination": result.is_hallucination,
                "confidence_score": result.confidence_score,
                "issues": [
                    {
                        "type": issue.type.value,
                        "severity": issue.severity.value,
                        "description": issue.description,
                        "suggestion": issue.suggestion
                    }
                    for issue in result.issues
                ]
            }
        }
    except Exception as e:
        logger.error(f"Validation and correction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "hallucination_detection"}


def include_router(app):
    """Include this router in a FastAPI app"""
    app.include_router(router)
