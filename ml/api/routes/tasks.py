from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, Optional, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])

_task_store: Dict[str, Dict[str, Any]] = {}


class TaskStatus(BaseModel):
    task_id: str
    status: Literal["pending", "processing", "completed", "failed"]
    result: Optional[Any] = None
    error: Optional[str] = None
    created_at: str
    updated_at: str


def create_task(task_id: str) -> Dict[str, Any]:
    now = datetime.now().isoformat()
    task = {
        "task_id": task_id,
        "status": "pending",
        "result": None,
        "error": None,
        "created_at": now,
        "updated_at": now,
    }
    _task_store[task_id] = task
    return task


def update_task(
    task_id: str,
    status: str,
    result: Optional[Any] = None,
    error: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    if task_id not in _task_store:
        return None
    task = _task_store[task_id]
    task["status"] = status
    task["result"] = result
    task["error"] = error
    task["updated_at"] = datetime.now().isoformat()
    return task


@router.get("/{task_id}")
async def get_task_status(task_id: str) -> Dict[str, Any]:
    task = _task_store.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task not found: {task_id}")
    return {"success": True, "data": task}
