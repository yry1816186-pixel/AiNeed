from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException

from ml.api.routes.tasks import create_task, update_task
from ml.api.schemas.stylist import (
    StylistBodyAnalysisRequest,
    StylistBodyAnalysisResponse,
    StylistChatRequest,
    StylistOutfitRequest,
    StylistUserProfile,
    StylistSceneContext,
)

logger = logging.getLogger(__name__)

try:
    from ml.services.intelligent_stylist_service import (
        IntelligentStylistService,
        UserProfile,
        SceneContext,
        get_stylist_service,
    )
    _stylist_service: Optional[IntelligentStylistService] = None
    _service_available = True
except Exception as e:
    logger.warning(f"IntelligentStylistService import failed: {e}")
    _stylist_service = None
    _service_available = False

router = APIRouter(prefix="/api/stylist", tags=["Intelligent Stylist"])


async def _get_stylist_service():
    global _stylist_service
    if _stylist_service is not None:
        return _stylist_service
    try:
        _stylist_service = await get_stylist_service()
        return _stylist_service
    except Exception:
        try:
            _stylist_service = IntelligentStylistService()
            return _stylist_service
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"造型师服务不可用: {str(e)}")


def _to_user_profile(profile: StylistUserProfile) -> UserProfile:
    return UserProfile(
        body_type=profile.body_type,
        skin_tone=profile.skin_tone,
        color_season=profile.color_season,
        face_shape=profile.face_shape,
        height=profile.height,
        weight=profile.weight,
        age_range=profile.age_range,
        gender=profile.gender,
        style_preferences=profile.style_preferences,
        style_avoidances=profile.style_avoidances,
        color_preferences=profile.color_preferences,
        budget_range=profile.budget_range,
        lifestyle=profile.lifestyle,
        occupation=profile.occupation,
        fashion_goals=profile.fashion_goals,
    )


def _to_scene_context(ctx: StylistSceneContext) -> SceneContext:
    return SceneContext(
        occasion=ctx.occasion,
        weather=ctx.weather,
        season=ctx.season,
        time_of_day=ctx.time_of_day,
        formality_level=ctx.formality_level,
        special_requirements=ctx.special_requirements,
    )


async def _run_chat_task(task_id: str, service, message: str, history: List[Dict], user_profile):
    try:
        update_task(task_id, "processing")
        reply = await service.chat_interaction(
            user_message=message,
            conversation_history=history,
            user_profile=user_profile,
        )
        update_task(task_id, "completed", result=reply)
    except Exception as e:
        update_task(task_id, "failed", error=str(e))


async def _run_outfit_task(task_id: str, service, user_profile, scene_context, user_request: str):
    try:
        update_task(task_id, "processing")
        result = await service.generate_outfit_recommendation(
            user_profile=user_profile,
            scene_context=scene_context,
            user_request=user_request,
        )
        update_task(task_id, "completed", result=result)
    except Exception as e:
        update_task(task_id, "failed", error=str(e))


@router.post("/chat")
async def stylist_chat(request: StylistChatRequest) -> Dict[str, Any]:
    if not _service_available:
        raise HTTPException(status_code=503, detail="造型师服务不可用")

    service = await _get_stylist_service()
    try:
        user_profile = _to_user_profile(request.user_profile) if request.user_profile else None
        history = request.conversation_history or []

        try:
            existing_history = await service.get_conversation_history(request.session_id)
            if existing_history:
                history = existing_history
        except Exception:
            pass

        task_id = str(uuid.uuid4())
        create_task(task_id)

        asyncio.create_task(
            _run_chat_task(task_id, service, request.message, history, user_profile)
        )

        return {
            "task_id": task_id,
            "session_id": request.session_id,
            "status": "pending",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("stylist chat failed", extra={"service": "stylist", "endpoint": "chat", "error": str(e)})
        raise HTTPException(status_code=500, detail=f"对话失败: {str(e)}")


@router.post("/outfit")
async def stylist_outfit(request: StylistOutfitRequest) -> Dict[str, Any]:
    if not _service_available:
        raise HTTPException(status_code=503, detail="造型师服务不可用")

    service = await _get_stylist_service()
    try:
        user_profile = _to_user_profile(request.user_profile)
        scene_context = _to_scene_context(request.scene_context)

        task_id = str(uuid.uuid4())
        create_task(task_id)

        asyncio.create_task(
            _run_outfit_task(task_id, service, user_profile, scene_context, request.user_request)
        )

        return {
            "task_id": task_id,
            "status": "pending",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("stylist outfit failed", extra={"service": "stylist", "endpoint": "outfit", "error": str(e)})
        raise HTTPException(status_code=500, detail=f"穿搭推荐失败: {str(e)}")


@router.post("/analyze-body", response_model=StylistBodyAnalysisResponse)
async def analyze_body(request: StylistBodyAnalysisRequest) -> StylistBodyAnalysisResponse:
    if not _service_available:
        raise HTTPException(status_code=503, detail="造型师服务不可用")

    service = await _get_stylist_service()
    try:
        result = await service.analyze_body_type(request.description)

        if isinstance(result, dict):
            return StylistBodyAnalysisResponse(
                body_type=result.get("body_type", "unknown"),
                confidence=result.get("confidence", 0.0),
                analysis=result.get("analysis", ""),
                optimize_tips=result.get("optimize_tips", []),
                recommended_items=result.get("recommended_items", []),
                avoid_items=result.get("avoid_items", []),
            )
        return StylistBodyAnalysisResponse(
            body_type="unknown",
            confidence=0.0,
            analysis=str(result),
            optimize_tips=[],
            recommended_items=[],
            avoid_items=[],
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("stylist analyze-body failed", extra={"service": "stylist", "endpoint": "analyze-body", "error": str(e)})
        raise HTTPException(status_code=500, detail=f"体型分析失败: {str(e)}")


@router.get("/conversation/{session_id}")
async def get_conversation(session_id: str) -> Dict[str, Any]:
    if not _service_available:
        raise HTTPException(status_code=503, detail="造型师服务不可用")

    service = await _get_stylist_service()
    try:
        history = await service.get_conversation_history(session_id)
        return {
            "session_id": session_id,
            "history": history,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("stylist get conversation failed", extra={"service": "stylist", "endpoint": "conversation", "error": str(e)})
        raise HTTPException(status_code=500, detail=f"获取对话历史失败: {str(e)}")


@router.delete("/conversation/{session_id}")
async def clear_conversation(session_id: str) -> Dict[str, Any]:
    if not _service_available:
        raise HTTPException(status_code=503, detail="造型师服务不可用")

    service = await _get_stylist_service()
    try:
        await service.clear_conversation(session_id)
        return {
            "session_id": session_id,
            "cleared": True,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("stylist clear conversation failed", extra={"service": "stylist", "endpoint": "conversation", "error": str(e)})
        raise HTTPException(status_code=500, detail=f"清除对话历史失败: {str(e)}")


@router.get("/fashion-trends/{season}")
async def get_fashion_trends(season: str) -> Dict[str, Any]:
    valid_seasons = ["spring", "summer", "fall", "winter"]
    if season.lower() not in valid_seasons:
        raise HTTPException(status_code=400, detail=f"无效的季节，请选择: {valid_seasons}")

    service = await _get_stylist_service()
    trends = service.FASHION_TRENDS_2025.get(season.lower(), {})

    return {
        "success": True,
        "season": season,
        "trends": trends,
        "timestamp": datetime.now().isoformat(),
    }


@router.get("/color-guide/{color_season}")
async def get_color_guide(color_season: str) -> Dict[str, Any]:
    valid_seasons = ["spring", "summer", "autumn", "winter"]
    if color_season.lower() not in valid_seasons:
        raise HTTPException(status_code=400, detail=f"无效的色彩季型，请选择: {valid_seasons}")

    service = await _get_stylist_service()
    guide = service.COLOR_SEASON_GUIDE.get(color_season.lower(), {})

    return {
        "success": True,
        "color_season": color_season,
        "guide": guide,
        "timestamp": datetime.now().isoformat(),
    }


@router.get("/body-type-guide/{body_type}")
async def get_body_type_guide(body_type: str) -> Dict[str, Any]:
    valid_types = ["rectangle", "triangle", "inverted_triangle", "hourglass", "oval"]
    if body_type.lower() not in valid_types:
        raise HTTPException(status_code=400, detail=f"无效的体型，请选择: {valid_types}")

    service = await _get_stylist_service()
    guide = service.BODY_TYPE_GUIDE.get(body_type.lower(), {})

    return {
        "success": True,
        "body_type": body_type,
        "guide": guide,
        "timestamp": datetime.now().isoformat(),
    }


@router.get("/occasion-guide/{occasion}")
async def get_occasion_guide(occasion: str) -> Dict[str, Any]:
    valid_occasions = ["interview", "work", "date", "travel", "party", "daily", "campus"]
    if occasion.lower() not in valid_occasions:
        raise HTTPException(status_code=400, detail=f"无效的场合，请选择: {valid_occasions}")

    service = await _get_stylist_service()
    guide = service.OCCASION_GUIDE.get(occasion.lower(), {})

    return {
        "success": True,
        "occasion": occasion,
        "guide": guide,
        "timestamp": datetime.now().isoformat(),
    }


@router.get("/health")
async def stylist_health():
    return {
        "status": "healthy",
        "service": "intelligent-stylist",
        "model": "GLM-5",
        "timestamp": datetime.now().isoformat(),
    }
