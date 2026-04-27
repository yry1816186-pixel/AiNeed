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
    """Basic health check with connectivity checks for Redis, Qdrant, and GLM API."""
    result: Dict[str, Any] = {
        "status": "healthy",
        "service": "xuno-ml-api",
        "timestamp": datetime.now().isoformat(),
    }

    # Report failed route loads (from main.py)
    try:
        from ml.api.main import failed_routes
    except ImportError:
        failed_routes = []
    if failed_routes:
        result["status"] = "degraded"
        result["failed_routes"] = failed_routes

    # Quick connectivity checks (non-blocking, timeout 2s each)
    import os as _os
    checks: Dict[str, Any] = {}

    # Redis check
    redis_url = _os.getenv("REDIS_URL", "")
    if redis_url:
        try:
            import redis.asyncio as aioredis
            r = aioredis.from_url(redis_url)
            checks["redis"] = await r.ping()
            await r.close()
        except Exception:
            checks["redis"] = False
    else:
        checks["redis"] = None

    # Qdrant check
    qdrant_url = _os.getenv("QDRANT_URL", "")
    if qdrant_url:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=2.0) as client:
                resp = await client.get(f"{qdrant_url.rstrip('/')}/health")
                checks["qdrant"] = resp.status_code == 200
        except Exception:
            checks["qdrant"] = False
    else:
        checks["qdrant"] = None

    # GLM API check
    glm_key = _os.getenv("GLM_API_KEY") or _os.getenv("ZHIPU_API_KEY")
    if glm_key:
        try:
            import httpx
            glm_endpoint = _os.getenv("GLM_API_ENDPOINT", "https://open.bigmodel.cn/api/paas/v4")
            async with httpx.AsyncClient(timeout=2.0) as client:
                resp = await client.get(
                    f"{glm_endpoint.rstrip('/')}/models",
                    headers={"Authorization": f"Bearer {glm_key}"},
                )
                checks["glm_api"] = resp.status_code == 200
        except Exception:
            checks["glm_api"] = False
    else:
        checks["glm_api"] = None

    # Determine overall status from checks
    failed_checks = [k for k, v in checks.items() if v is False]
    if failed_checks:
        result["status"] = "degraded"
        result["failed_checks"] = failed_checks

    result["checks"] = checks
    return result


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
