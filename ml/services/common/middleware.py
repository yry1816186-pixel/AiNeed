"""
Request Validation Middleware for FastAPI
Provides request size limits, request ID tracking, and security headers.

@deprecated This module is superseded by ml/api/middleware/ which is the
authoritative implementation. Use ml.api.middleware.auth, ml.api.middleware.logging,
and ml.api.middleware.error_handler instead. This file is retained only for
backward compatibility and will be removed in a future release.
"""

import uuid
import logging
import time
from typing import Callable, Optional
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

MAX_REQUEST_SIZE = 50 * 1024 * 1024
MAX_REQUEST_TIME = 300


class RequestValidationMiddleware(BaseHTTPMiddleware):
    """
    Request Validation Middleware
    
    Features:
    - Request ID tracking
    - Request size limits
    - Request timeout
    - Security headers
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_REQUEST_SIZE:
            return JSONResponse(
                status_code=413,
                content={
                    "error": "Request too large",
                    "max_size_mb": MAX_REQUEST_SIZE / (1024 * 1024),
                    "request_id": request_id
                },
                headers={"X-Request-ID": request_id}
            )
        
        start_time = time.time()
        
        try:
            response = await call_next(request)
            
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Response-Time"] = f"{(time.time() - start_time) * 1000:.2f}ms"
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["X-XSS-Protection"] = "1; mode=block"
            
            return response
            
        except Exception as e:
            logger.error(f"Request processing error: {e}", extra={"request_id": request_id})
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Internal server error",
                    "request_id": request_id
                },
                headers={"X-Request-ID": request_id}
            )


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Request Logging Middleware
    
    Logs all requests with timing and status.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        start_time = time.time()
        
        logger.info(
            f"Request started: {request.method} {request.url.path}",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "client_ip": request.client.host if request.client else None
            }
        )
        
        response = await call_next(request)
        
        duration_ms = (time.time() - start_time) * 1000
        
        logger.info(
            f"Request completed: {request.method} {request.url.path} - {response.status_code} ({duration_ms:.2f}ms)",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms
            }
        )
        
        return response
