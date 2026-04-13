from __future__ import annotations

import os
import logging
from datetime import datetime
from typing import Dict, Any

from fastapi import APIRouter

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "service": "xuno-ml-api",
        "timestamp": datetime.now().isoformat(),
    }


@router.get("/health/detailed")
async def detailed_health_check() -> Dict[str, Any]:
    import psutil

    services: Dict[str, Any] = {}

    services["glm_api"] = {
        "available": bool(os.getenv("GLM_API_KEY") or os.getenv("ZHIPU_API_KEY")),
        "endpoint": os.getenv("GLM_API_ENDPOINT", "https://open.bigmodel.cn/api/paas/v4"),
        "model": os.getenv("GLM_MODEL", "glm-5"),
    }

    redis_url = os.getenv("REDIS_URL", "")
    services["redis"] = {
        "available": bool(redis_url),
        "url": redis_url.replace(":redis://", "://***@") if redis_url else None,
    }

    qdrant_url = os.getenv("QDRANT_URL", "")
    services["qdrant"] = {
        "available": bool(qdrant_url),
        "url": qdrant_url or None,
    }

    try:
        stylist_available = True
    except Exception:
        stylist_available = False
    services["intelligent_stylist"] = {"available": stylist_available}

    try:
        visual_available = True
    except Exception:
        visual_available = False
    services["visual_outfit"] = {"available": visual_available}

    all_healthy = all(
        s.get("available", False) for s in services.values()
    )

    cpu_percent = psutil.cpu_percent(interval=0.1)
    memory = psutil.virtual_memory()

    resources = {
        "cpu_percent": cpu_percent,
        "memory_percent": memory.percent,
        "memory_available_gb": round(memory.available / (1024**3), 2),
    }

    status = "healthy" if all_healthy else "degraded"
    if memory.percent > 90 or cpu_percent > 95:
        status = "degraded"

    return {
        "status": status,
        "timestamp": datetime.now().isoformat(),
        "services": services,
        "resources": resources,
    }
