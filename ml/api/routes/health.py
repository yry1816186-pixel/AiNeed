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

    # P1-13: GLM API reachability check
    glm_api_key = os.getenv("GLM_API_KEY") or os.getenv("ZHIPU_API_KEY")
    glm_endpoint = os.getenv("GLM_API_ENDPOINT", "https://open.bigmodel.cn/api/paas/v4")
    glm_reachable = False
    if glm_api_key:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(
                    f"{glm_endpoint}/models",
                    headers={"Authorization": f"Bearer {glm_api_key}"},
                )
                glm_reachable = resp.status_code == 200
        except Exception as e:
            logger.warning("GLM API reachability check failed: %s", str(e))
            glm_reachable = False

    services["glm_api"] = {
        "available": bool(glm_api_key),
        "reachable": glm_reachable,
        "endpoint": glm_endpoint,
        "model": os.getenv("GLM_MODEL", "glm-5"),
    }

    # P1-13: Redis connection status check
    redis_url = os.getenv("REDIS_URL", "")
    redis_connected = False
    if redis_url:
        try:
            import redis.asyncio as aioredis
            r = aioredis.from_url(redis_url)
            redis_connected = await r.ping()
            await r.close()
        except Exception as e:
            logger.warning("Redis connection check failed: %s", str(e))
            redis_connected = False

    services["redis"] = {
        "available": bool(redis_url),
        "connected": redis_connected,
        "url": redis_url.replace(":redis://", "://***@") if redis_url else None,
    }

    qdrant_url = os.getenv("QDRANT_URL", "")
    services["qdrant"] = {
        "available": bool(qdrant_url),
        "url": qdrant_url or None,
    }

    # P1-13: Model loading status checks
    model_status: Dict[str, Any] = {}

    try:
        from ml.services.analysis.body_analyzer import get_body_analyzer_service
        body_service = get_body_analyzer_service()
        model_status["body_analyzer"] = {
            "loaded": body_service is not None,
        }
    except Exception:
        model_status["body_analyzer"] = {"loaded": False, "error": "Import failed"}

    try:
        from ml.services.analysis.photo_quality_analyzer import get_photo_quality_analyzer
        analyzer = get_photo_quality_analyzer()
        model_status["photo_quality"] = {
            "loaded": analyzer is not None,
        }
    except Exception:
        model_status["photo_quality"] = {"loaded": False, "error": "Import failed"}

    try:
        from ml.services.recommender.sasrec_service import model as sasrec_model
        model_status["sasrec"] = {
            "loaded": True,
            "trained": sasrec_model.trained if sasrec_model else False,
            "items_count": len(sasrec_model.item_embeddings) if sasrec_model else 0,
        }
    except Exception:
        model_status["sasrec"] = {"loaded": False, "error": "Import failed"}

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
        "models": model_status,
        "resources": resources,
    }
