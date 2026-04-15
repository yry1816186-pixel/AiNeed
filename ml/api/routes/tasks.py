from __future__ import annotations

import asyncio
import heapq
import logging
import time
from datetime import datetime
from typing import Dict, Any, Optional, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])

# P0-3: Task TTL constant (1 hour)
TASK_TTL = 3600

_task_store: Dict[str, Dict[str, Any]] = {}

# P1-8: Priority queue for task ordering (lower number = higher priority)
# Format: (priority, creation_time, task_id)
_task_priority_queue: list = []
_task_priority_map: Dict[str, int] = {}  # task_id -> priority


class TaskStatus(BaseModel):
    task_id: str
    status: Literal["pending", "processing", "completed", "failed"]
    result: Optional[Any] = None
    error: Optional[str] = None
    created_at: str
    updated_at: str
    priority: int = 5  # P1-8: Default priority (1=highest, 10=lowest)


class CreateTaskRequest(BaseModel):
    """P1-12: Request validation for task creation."""
    task_type: str = Field(..., min_length=1, max_length=100, description="Type of task to create")
    payload: Dict[str, Any] = Field(default_factory=dict, description="Task payload")
    priority: int = Field(default=5, ge=1, le=10, description="Task priority (1=highest, 10=lowest)")
    user_id: Optional[str] = Field(None, max_length=100, description="User ID for VIP priority")
    ttl_seconds: int = Field(default=TASK_TTL, ge=60, le=86400, description="Task TTL in seconds")


def _cleanup_expired_tasks() -> int:
    """P0-3: Remove expired tasks from the store.

    Tasks older than TASK_TTL seconds are removed.
    Returns the number of tasks removed.
    """
    now = time.time()
    expired_ids = []

    for task_id, task in _task_store.items():
        created = task.get("created_at", "")
        try:
            created_dt = datetime.fromisoformat(created)
            created_ts = created_dt.timestamp()
            ttl = task.get("ttl_seconds", TASK_TTL)
            if now - created_ts > ttl:
                expired_ids.append(task_id)
        except (ValueError, TypeError):
            # If we can't parse the timestamp, check updated_at as fallback
            updated = task.get("updated_at", "")
            try:
                updated_dt = datetime.fromisoformat(updated)
                if now - updated_dt.timestamp() > TASK_TTL * 2:
                    expired_ids.append(task_id)
            except (ValueError, TypeError):
                pass

    for task_id in expired_ids:
        del _task_store[task_id]
        _task_priority_map.pop(task_id, None)

    if expired_ids:
        # Rebuild priority queue without expired tasks
        _rebuild_priority_queue()
        logger.info("Cleaned up %d expired tasks", len(expired_ids))

    return len(expired_ids)


def _rebuild_priority_queue():
    """P1-8: Rebuild the priority queue after cleanup."""
    global _task_priority_queue
    _task_priority_queue = []
    for task_id, task in _task_store.items():
        if task.get("status") == "pending":
            priority = _task_priority_map.get(task_id, 5)
            created = task.get("created_at", "")
            try:
                created_ts = datetime.fromisoformat(created).timestamp()
            except (ValueError, TypeError):
                created_ts = 0
            heapq.heappush(_task_priority_queue, (priority, created_ts, task_id))


def create_task(task_id: str, priority: int = 5, user_id: Optional[str] = None,
                ttl_seconds: int = TASK_TTL) -> Dict[str, Any]:
    """Create a new task with optional priority and TTL.

    P1-8: VIP users (user_id starts with 'vip_') get priority boost.
    P0-3: Tasks have a TTL and will be cleaned up after expiry.
    """
    # P0-3: Trigger cleanup on each task creation
    _cleanup_expired_tasks()

    # P1-8: VIP users get priority boost
    effective_priority = priority
    if user_id and user_id.startswith("vip_"):
        effective_priority = max(1, priority - 3)  # VIP gets 3-level boost
        logger.info("VIP user %s: priority boosted from %d to %d", user_id, priority, effective_priority)

    now = datetime.now().isoformat()
    task = {
        "task_id": task_id,
        "status": "pending",
        "result": None,
        "error": None,
        "created_at": now,
        "updated_at": now,
        "priority": effective_priority,
        "user_id": user_id,
        "ttl_seconds": ttl_seconds,
    }
    _task_store[task_id] = task
    _task_priority_map[task_id] = effective_priority

    # P1-8: Add to priority queue
    try:
        created_ts = datetime.now().timestamp()
    except Exception:
        created_ts = 0
    heapq.heappush(_task_priority_queue, (effective_priority, created_ts, task_id))

    return task


def update_task(
    task_id: str,
    status: str,
    result: Optional[Any] = None,
    error: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    # P0-3: Trigger cleanup on each task update
    _cleanup_expired_tasks()

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
    # P0-3: Trigger cleanup on each read
    _cleanup_expired_tasks()

    task = _task_store.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task not found: {task_id}")
    return {"success": True, "data": task}


@router.get("/")
async def list_tasks(
    status: Optional[Literal["pending", "processing", "completed", "failed"]] = None,
    limit: int = Field(default=50, ge=1, le=200),
) -> Dict[str, Any]:
    """List tasks with optional status filter, ordered by priority."""
    _cleanup_expired_tasks()

    tasks = list(_task_store.values())

    if status:
        tasks = [t for t in tasks if t.get("status") == status]

    # Sort by priority (lower = higher priority), then by creation time
    tasks.sort(key=lambda t: (t.get("priority", 5), t.get("created_at", "")))

    return {
        "success": True,
        "data": tasks[:limit],
        "total": len(tasks),
    }


@router.post("/")
async def create_task_endpoint(request: CreateTaskRequest) -> Dict[str, Any]:
    """P1-12: Create a new task with validated request body."""
    import uuid
    task_id = str(uuid.uuid4())
    task = create_task(
        task_id=task_id,
        priority=request.priority,
        user_id=request.user_id,
        ttl_seconds=request.ttl_seconds,
    )
    task["task_type"] = request.task_type
    task["payload"] = request.payload
    return {"success": True, "data": task}


@router.get("/queue/next")
async def get_next_pending_task() -> Dict[str, Any]:
    """P1-8: Get the highest priority pending task from the queue."""
    _cleanup_expired_tasks()

    while _task_priority_queue:
        priority, created_ts, task_id = heapq.heappop(_task_priority_queue)

        if task_id in _task_store and _task_store[task_id].get("status") == "pending":
            return {"success": True, "data": _task_store[task_id]}

    return {"success": True, "data": None, "message": "No pending tasks"}
