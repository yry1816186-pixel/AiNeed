from __future__ import annotations

import uuid
import logging
from typing import Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from ml.api.config import settings

logger = logging.getLogger(__name__)

EXEMPT_PATHS = {"/health", "/health/detailed", "/docs", "/openapi.json", "/metrics", "/redoc"}


class APIKeyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if request.url.path in EXEMPT_PATHS:
            return await call_next(request)

        if request.method == "OPTIONS":
            return await call_next(request)

        if not settings.ML_API_KEY:
            return await call_next(request)

        api_key = request.headers.get("X-ML-API-Key", "")

        if api_key != settings.ML_API_KEY:
            request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
            logger.warning(
                "API key authentication failed",
                extra={
                    "request_id": request_id,
                    "path": request.url.path,
                    "client_ip": request.client.host if request.client else None,
                },
            )
            return JSONResponse(
                status_code=401,
                content={
                    "success": False,
                    "error": {
                        "code": "UNAUTHORIZED",
                        "message": "Invalid or missing API key",
                        "details": {},
                        "timestamp": __import__("datetime").datetime.now().isoformat(),
                        "path": request.url.path,
                    },
                },
            )

        return await call_next(request)
