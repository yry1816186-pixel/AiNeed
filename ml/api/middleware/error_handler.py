from __future__ import annotations

import uuid
import traceback
import logging
from typing import Optional, Dict, Any
from datetime import datetime

from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

logger = logging.getLogger(__name__)


class MLError(Exception):
    def __init__(
        self,
        message: str,
        error_code: str,
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class ModelNotLoadedError(MLError):
    def __init__(self, model_name: str):
        super().__init__(
            message=f"Model '{model_name}' is not loaded",
            error_code="MODEL_NOT_LOADED",
            status_code=503,
            details={"model": model_name},
        )


class InferenceError(MLError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="INFERENCE_ERROR",
            status_code=500,
            details=details,
        )


class RateLimitError(MLError):
    def __init__(self, retry_after: int = 60):
        super().__init__(
            message="Rate limit exceeded. Please try again later.",
            error_code="RATE_LIMIT_EXCEEDED",
            status_code=429,
            details={"retry_after_seconds": retry_after},
        )


class ValidationError(MLError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            status_code=422,
            details=details,
        )


def _build_error_response(
    error_code: str,
    message: str,
    status_code: int,
    path: str,
    details: Optional[Dict[str, Any]] = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "error": {
                "code": error_code,
                "message": message,
                "details": details or {},
                "timestamp": datetime.now().isoformat(),
                "path": path,
            },
        },
    )


async def ml_error_handler(request: Request, exc: MLError) -> JSONResponse:
    logger.error(
        "MLError: %s [%s]",
        exc.message,
        exc.error_code,
        extra={"path": request.url.path, "error_code": exc.error_code},
    )
    return _build_error_response(
        error_code=exc.error_code,
        message=exc.message,
        status_code=exc.status_code,
        path=request.url.path,
        details=exc.details,
    )


async def validation_error_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    errors = []
    for error in exc.errors():
        errors.append(
            {
                "field": ".".join(str(loc) for loc in error["loc"]),
                "message": error["msg"],
                "type": error["type"],
            }
        )
    logger.warning(
        "Validation error on %s: %s",
        request.url.path,
        errors,
    )
    return _build_error_response(
        error_code="VALIDATION_ERROR",
        message="Request validation failed",
        status_code=422,
        path=request.url.path,
        details={"errors": errors},
    )


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    error_id = uuid.uuid4().hex[:8]
    error_trace = traceback.format_exc()

    logger.error(
        "Unhandled exception [%s]: %s\n%s",
        error_id,
        exc,
        error_trace,
    )
    return _build_error_response(
        error_code="INTERNAL_ERROR",
        message="An unexpected error occurred. Please try again later.",
        status_code=500,
        path=request.url.path,
        details={"error_id": error_id, "type": type(exc).__name__},
    )
