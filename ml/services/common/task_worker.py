"""
AI Task Worker - Async Task Processing Service

This module provides asynchronous processing for AI tasks using Redis queues.
It processes style analysis, virtual try-on, wardrobe matching, and other AI tasks.

Usage:
    python -m services.task_worker --queue style_analysis
    python -m services.task_worker --queue virtual_tryon
    python -m services.task_worker --all
"""

import os
import json
import asyncio
import signal
import logging
import time
import traceback
from typing import Dict, Any, Optional, Callable, Awaitable
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from enum import Enum

import redis.asyncio as redis
from redis.asyncio import Redis

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('TaskWorker')


class TaskStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMEOUT = "timeout"


class TaskPriority(int, Enum):
    """
    A-P2-7: 任务优先级枚举

    数值越小优先级越高。优先级影响任务出队顺序：
    - CRITICAL: 紧急任务（如付费用户试衣），立即处理
    - HIGH: 高优先级（如 VIP 用户请求）
    - NORMAL: 普通优先级（默认）
    - LOW: 低优先级（如批量分析、后台任务）
    """
    CRITICAL = 0
    HIGH = 1
    NORMAL = 5
    LOW = 10


@dataclass
class TaskProgress:
    job_id: str
    progress: int
    stage: str
    message: Optional[str] = None


@dataclass
class TaskResult:
    job_id: str
    status: TaskStatus
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    processed_at: Optional[str] = None
    duration: Optional[float] = None


class TaskWorker:
    """
    Async task worker for processing AI tasks from Redis queues.
    """

    def __init__(
        self,
        redis_url: str = "redis://localhost:6379",
        queue_names: list[str] = None,
        max_concurrent_tasks: int = 3,
        task_timeout: int = 300,
    ):
        self.redis_url = redis_url
        self.queue_names = queue_names or ["ai_tasks"]
        self.max_concurrent_tasks = max_concurrent_tasks
        self.task_timeout = task_timeout

        self.redis: Optional[Redis] = None
        self.running = False
        self.active_tasks: Dict[str, asyncio.Task] = {}

        # Initialize services lazily
        self._style_service = None
        self._inference_service = None
        self._recommender_service = None

        # Task handlers registry
        self.handlers: Dict[str, Callable[[Dict], Awaitable[Dict]]] = {
            "style_analysis": self._handle_style_analysis,
            "virtual_tryon": self._handle_virtual_tryon,
            "wardrobe_match": self._handle_wardrobe_match,
            "image_analysis": self._handle_image_analysis,
            "body_analysis": self._handle_body_analysis,
            "recommendation": self._handle_recommendation,
        }

    @staticmethod
    async def enqueue_task(
        redis_client,
        queue_name: str,
        task: Dict[str, Any],
        priority: int = TaskPriority.NORMAL,
    ) -> None:
        """
        A-P2-7: 将任务推入优先级队列

        使用 Redis sorted set 存储，score 为优先级数值（越小越优先）。
        同优先级内按入队时间排序（使用时间戳作为二级排序）。

        Args:
            redis_client: Redis 异步客户端
            queue_name: 队列名称
            task: 任务数据字典，必须包含 jobId
            priority: 优先级（TaskPriority 枚举值），默认 NORMAL
        """
        task["priority"] = priority
        priority_key = f"{queue_name}:priority_pending"

        # 使用优先级作为主 score，时间戳作为二级排序（确保同优先级 FIFO）
        # score 格式: priority * 1e13 + timestamp_ms
        # 这样 priority=0 的任务总是排在 priority=1 前面
        # 同 priority 内按时间先后排序
        timestamp_ms = time.time() * 1000
        score = priority * 1e13 + timestamp_ms

        await redis_client.zadd(
            priority_key,
            {json.dumps(task, default=str): score}
        )

        # 发布通知
        await redis_client.publish(
            f"worker:{queue_name}",
            json.dumps({"jobId": task.get("jobId"), "priority": priority})
        )

    async def start(self):
        """Start the worker and connect to Redis."""
        logger.info(f"Starting TaskWorker for queues: {self.queue_names}")

        self.redis = redis.from_url(self.redis_url, decode_responses=True)

        # Subscribe to worker channels
        pubsub = self.redis.pubsub()
        for queue_name in self.queue_names:
            await pubsub.subscribe(f"worker:{queue_name}")
            logger.info(f"Subscribed to worker:{queue_name}")

        self.running = True

        # Start listening for tasks
        await self._run_worker(pubsub)

    async def stop(self):
        """Stop the worker gracefully."""
        logger.info("Stopping TaskWorker...")
        self.running = False

        # Wait for active tasks to complete
        if self.active_tasks:
            logger.info(f"Waiting for {len(self.active_tasks)} active tasks to complete...")
            await asyncio.gather(*self.active_tasks.values(), return_exceptions=True)

        if self.redis:
            await self.redis.close()

        logger.info("TaskWorker stopped")

    async def _run_worker(self, pubsub):
        """Main worker loop."""
        logger.info("Worker loop started")

        # Start polling tasks from queues
        poll_task = asyncio.create_task(self._poll_queues())
        listen_task = asyncio.create_task(self._listen_for_tasks(pubsub))

        try:
            await asyncio.gather(poll_task, listen_task)
        except asyncio.CancelledError:
            logger.info("Worker tasks cancelled")

    async def _poll_queues(self):
        """
        Periodically poll queues for pending tasks.

        A-P2-7: 使用 Redis sorted set 实现优先级队列。
        优先级数值越小越先处理。使用 zpopmin 原子性地取出
        优先级最高（score 最小）的任务。

        兼容旧格式：如果 pending 队列是普通 list（非 sorted set），
        则降级为 FIFO 模式。
        """
        while self.running:
            try:
                for queue_name in self.queue_names:
                    task_data = None

                    # A-P2-7: 优先尝试从 sorted set 优先级队列取任务
                    priority_key = f"{queue_name}:priority_pending"
                    try:
                        # zpopmin 返回 [(member, score)] 或空列表
                        result = await self.redis.zpopmin(priority_key)
                        if result:
                            task_data = result[0][0] if isinstance(result[0], tuple) else result[0]
                    except Exception as e:
                        logger.debug(f"Priority queue not available for {queue_name}: {e}")

                    # 降级：从普通 list 队列取任务（兼容旧格式）
                    if not task_data:
                        task_data = await self.redis.rpoplpush(
                            f"{queue_name}:pending",
                            f"{queue_name}:processing"
                        )

                    if task_data:
                        try:
                            task = json.loads(task_data)
                            # A-P2-7: 如果任务没有 priority 字段，设置默认优先级
                            if "priority" not in task:
                                task["priority"] = TaskPriority.NORMAL
                            await self._process_task(task)
                        except json.JSONDecodeError as e:
                            logger.error(f"Invalid task data: {e}")

                # Short sleep to prevent busy waiting
                await asyncio.sleep(0.1)

            except Exception as e:
                logger.error(f"Error polling queues: {e}")
                await asyncio.sleep(1)

    async def _listen_for_tasks(self, pubsub):
        """Listen for task notifications via pub/sub."""
        while self.running:
            try:
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1)
                if message and message["type"] == "message":
                    try:
                        task = json.loads(message["data"])
                        logger.info(f"Received task notification: {task.get('jobId')}")
                    except json.JSONDecodeError:
                        pass
            except Exception as e:
                logger.error(f"Error listening for tasks: {e}")
                await asyncio.sleep(1)

    async def _process_task(self, task: Dict[str, Any]):
        """Process a single task."""
        job_id = task.get("jobId")
        task_type = task.get("type")
        user_id = task.get("userId")

        logger.info(f"Processing task {job_id} of type {task_type}")

        start_time = time.time()

        try:
            # Report progress: Starting
            await self._report_progress(job_id, user_id, 0, "initializing", "Task started")

            # Get handler for task type
            handler = self.handlers.get(task_type)
            if not handler:
                raise ValueError(f"Unknown task type: {task_type}")

            # Execute the handler with timeout
            result = await asyncio.wait_for(
                handler(task),
                timeout=task.get("timeout", self.task_timeout)
            )

            # Calculate duration
            duration = time.time() - start_time

            # Report completion
            await self._report_completed(job_id, user_id, result, duration)

            logger.info(f"Task {job_id} completed in {duration:.2f}s")

        except asyncio.TimeoutError:
            duration = time.time() - start_time
            error_msg = f"Task timed out after {duration:.2f}s"
            await self._report_failed(job_id, user_id, error_msg)
            logger.warning(f"Task {job_id} timed out")

        except Exception as e:
            duration = time.time() - start_time
            error_msg = f"{str(e)}\n{traceback.format_exc()}"
            await self._report_failed(job_id, user_id, str(e))
            logger.error(f"Task {job_id} failed: {e}")

    async def _handle_style_analysis(self, task: Dict) -> Dict:
        """Handle style analysis task."""
        user_input = task.get("userInput", "")
        user_profile = task.get("userProfile", {})

        await self._report_progress(
            task["jobId"], task["userId"], 20, "loading_model", "Loading style analysis model"
        )

        # Get or initialize style service
        if self._style_service is None:
            from ml.services.style_understanding_service import StyleUnderstandingService
            self._style_service = StyleUnderstandingService(use_mock=False)
            logger.info("Style understanding service initialized")

        await self._report_progress(
            task["jobId"], task["userId"], 40, "analyzing", "Analyzing style description"
        )

        # Perform analysis
        analysis = await self._style_service.analyze_style_description(user_input, user_profile)

        await self._report_progress(
            task["jobId"], task["userId"], 80, "generating_suggestions", "Generating outfit suggestions"
        )

        # Generate suggestions
        suggestions = await self._style_service.generate_outfit_suggestions(
            analysis, user_profile.get("bodyType")
        )

        await self._report_progress(
            task["jobId"], task["userId"], 100, "completed", "Analysis complete"
        )

        return {
            "styleAnalysis": asdict(analysis),
            "outfitSuggestions": [asdict(s) for s in suggestions],
            "embeddingPrompts": self._style_service.map_style_to_embedding_prompts(analysis),
        }

    async def _handle_virtual_tryon(self, task: Dict) -> Dict:
        """Handle virtual try-on task using GLM multimodal API."""
        import base64
        from pathlib import Path

        user_photo_url = task.get("userPhotoUrl")
        clothing_image_url = task.get("clothingImageUrl")
        category = task.get("category", "upper_body")
        user_photo_base64 = task.get("userPhotoBase64")
        clothing_image_base64 = task.get("clothingImageBase64")

        await self._report_progress(
            task["jobId"], task["userId"], 10, "downloading_images", "Downloading images"
        )

        try:
            if user_photo_base64:
                person_image = user_photo_base64
                if not person_image.startswith("data:image"):
                    person_image = f"data:image/png;base64,{person_image}"
            elif user_photo_url:
                person_image = await self._download_image_as_base64(user_photo_url)
            else:
                raise ValueError("No user photo provided (userPhotoUrl or userPhotoBase64 required)")

            if clothing_image_base64:
                garment_image = clothing_image_base64
                if not garment_image.startswith("data:image"):
                    garment_image = f"data:image/png;base64,{garment_image}"
            elif clothing_image_url:
                garment_image = await self._download_image_as_base64(clothing_image_url)
            else:
                raise ValueError("No clothing image provided (clothingImageUrl or clothingImageBase64 required)")

        except Exception as e:
            logger.error(f"Failed to download images: {e}")
            raise ValueError(f"Image download failed: {str(e)}")

        await self._report_progress(
            task["jobId"], task["userId"], 30, "processing", "Running virtual try-on via GLM API"
        )

        try:
            from ml.services.virtual_tryon_service import virtual_tryon_service

            result = await virtual_tryon_service.generate_tryon(
                person_image=person_image,
                garment_image=garment_image,
                category=category,
            )

            if result.get("success"):
                result_url = result.get("result_url", "")
                processing_time = result.get("processing_time", 0)
                provider = result.get("provider", "glm-tryon")
                logger.info(f"GLM virtual try-on completed in {processing_time:.2f}s")
            else:
                raise Exception(result.get("error", "GLM try-on failed"))

        except Exception as e:
            logger.error(f"GLM virtual try-on failed: {e}")
            logger.warning("Falling back to mock try-on result")
            await asyncio.sleep(2)
            result_url = ""
            processing_time = 2.0
            provider = "mock"

        await self._report_progress(
            task["jobId"], task["userId"], 90, "uploading_result", "Uploading result"
        )

        if not result_url:
            result_url = await self._upload_tryon_result(
                result_image=None,
                job_id=task["jobId"],
                user_id=task["userId"]
            )

        await self._report_progress(
            task["jobId"], task["userId"], 100, "completed", "Try-on complete"
        )

        return {
            "tryOnId": task["jobId"],
            "resultImageUrl": result_url,
            "provider": provider,
            "processingTime": processing_time,
        }

    async def _download_image_as_base64(self, image_url: str) -> str:
        """Download an image from URL and convert to base64."""
        import aiohttp

        async with aiohttp.ClientSession() as session:
            async with session.get(image_url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                if resp.status != 200:
                    raise ValueError(f"Failed to download image: HTTP {resp.status}")

                image_data = await resp.read()
                image_base64 = base64.b64encode(image_data).decode("utf-8")

                # Detect content type
                content_type = resp.headers.get("Content-Type", "image/png")
                return f"data:{content_type};base64,{image_base64}"

    async def _upload_tryon_result(
        self,
        result_image: str,
        job_id: str,
        user_id: str
    ) -> str:
        """Upload try-on result to storage."""
        import aiohttp

        # If we have a base64 result, upload to storage service
        if result_image:
            storage_url = os.getenv("STORAGE_SERVICE_URL", "http://localhost:8080/api/storage")

            try:
                async with aiohttp.ClientSession() as session:
                    # Upload to storage service
                    upload_payload = {
                        "file": result_image,
                        "filename": f"tryon_{job_id}.png",
                        "folder": "tryon_results",
                        "userId": user_id
                    }

                    async with session.post(
                        f"{storage_url}/upload/base64",
                        json=upload_payload,
                        timeout=aiohttp.ClientTimeout(total=30)
                    ) as resp:
                        if resp.status == 200:
                            upload_result = await resp.json()
                            return upload_result.get("url", upload_result.get("fileUrl", ""))
            except Exception as e:
                logger.warning(f"Failed to upload to storage service: {e}")

            # Fall back to local storage path
            results_dir = Path("data/tryon_results")
            results_dir.mkdir(parents=True, exist_ok=True)

            # Save locally
            image_data = result_image.split(",")[-1] if "," in result_image else result_image
            image_bytes = base64.b64decode(image_data)
            local_path = results_dir / f"{job_id}.png"

            with open(local_path, "wb") as f:
                f.write(image_bytes)

            return f"/api/storage/tryon_results/{job_id}.png"

        # Mock result URL if no actual result
        return f"https://storage.example.com/results/{job_id}.png"

    async def _handle_wardrobe_match(self, task: Dict) -> Dict:
        """Handle wardrobe matching task."""
        wardrobe_items = task.get("wardrobeItems", [])
        target_style = task.get("targetStyle")
        occasion = task.get("occasion")
        season = task.get("season")

        await self._report_progress(
            task["jobId"], task["userId"], 20, "loading_wardrobe", "Loading wardrobe data"
        )

        # Get or initialize inference service
        if self._inference_service is None:
            from inference.inference_service import AIInferenceService
            self._inference_service = AIInferenceService(device="auto")
            logger.info("Inference service initialized")

        await self._report_progress(
            task["jobId"], task["userId"], 50, "matching", "Matching wardrobe items"
        )

        # Perform matching
        # TODO: Implement actual matching logic
        matches = []
        for item_id in wardrobe_items[:5]:  # Mock: just take first 5
            matches.append({
                "itemId": item_id,
                "score": 0.85,
                "reasons": ["Matches target style", "Suitable for occasion"],
            })

        await self._report_progress(
            task["jobId"], task["userId"], 100, "completed", "Matching complete"
        )

        return {
            "matches": matches,
            "suggestions": [
                "Consider adding a blazer for a more polished look",
                "A scarf can add color interest",
            ],
        }

    async def _handle_image_analysis(self, task: Dict) -> Dict:
        """Handle image analysis task."""
        image_path = task.get("imagePath")
        analysis_type = task.get("analysisType", "full")

        await self._report_progress(
            task["jobId"], task["userId"], 20, "loading_image", "Loading image"
        )

        # Get or initialize inference service
        if self._inference_service is None:
            from inference.inference_service import AIInferenceService
            self._inference_service = AIInferenceService(device="auto")
            logger.info("Inference service initialized")

        await self._report_progress(
            task["jobId"], task["userId"], 50, "analyzing", "Analyzing image"
        )

        # Perform analysis
        result = self._inference_service.analyze_image(image_path)

        await self._report_progress(
            task["jobId"], task["userId"], 100, "completed", "Analysis complete"
        )

        return result

    async def _handle_body_analysis(self, task: Dict) -> Dict:
        """Handle body analysis task."""
        image_path = task.get("imagePath")

        await self._report_progress(
            task["jobId"], task["userId"], 20, "loading_image", "Loading image"
        )

        # Get or initialize inference service
        if self._inference_service is None:
            from inference.inference_service import AIInferenceService
            self._inference_service = AIInferenceService(device="auto")
            logger.info("Inference service initialized")

        await self._report_progress(
            task["jobId"], task["userId"], 50, "analyzing", "Analyzing body shape"
        )

        # Perform analysis
        result = self._inference_service.analyze_body(image_path)

        await self._report_progress(
            task["jobId"], task["userId"], 100, "completed", "Analysis complete"
        )

        return result

    async def _handle_recommendation(self, task: Dict) -> Dict:
        """Handle recommendation task."""
        user_input = task.get("userInput", "")
        user_profile = task.get("userProfile", {})
        occasion = task.get("occasion")
        category = task.get("category")
        top_k = task.get("topK", 10)

        await self._report_progress(
            task["jobId"], task["userId"], 20, "loading_model", "Loading recommendation model"
        )

        # Get or initialize recommender service
        if self._recommender_service is None:
            try:
                from ml.services.intelligent_style_recommender import StyleRecommendationAPI
                self._recommender_service = StyleRecommendationAPI()
                logger.info("Recommender service initialized")
            except Exception as e:
                logger.warning(f"Recommender service not available: {e}")
                # Fall back to style service
                pass

        await self._report_progress(
            task["jobId"], task["userId"], 50, "generating", "Generating recommendations"
        )

        # Get recommendations
        if self._recommender_service:
            result = await self._recommender_service.get_recommendations(
                user_input=user_input,
                user_profile=user_profile,
                occasion=occasion,
                category=category,
                top_k=top_k,
            )
        else:
            # Mock result
            result = {
                "recommendations": [
                    {
                        "itemId": f"item_{i}",
                        "name": f"Recommended Item {i}",
                        "score": 0.9 - i * 0.05,
                        "reasons": ["Matches your style preferences"],
                    }
                    for i in range(top_k)
                ]
            }

        await self._report_progress(
            task["jobId"], task["userId"], 100, "completed", "Recommendations ready"
        )

        return result

    async def _report_progress(
        self, job_id: str, user_id: str, progress: int, stage: str, message: str = None
    ):
        """Report task progress to Redis."""
        try:
            await self.redis.publish(
                "task:progress",
                json.dumps({
                    "jobId": job_id,
                    "userId": user_id,
                    "progress": progress,
                    "stage": stage,
                    "message": message,
                    "timestamp": datetime.now().isoformat(),
                })
            )
        except Exception as e:
            logger.warning(f"Failed to report progress: {e}")

    async def _report_completed(
        self, job_id: str, user_id: str, result: Dict, duration: float
    ):
        """Report task completion to Redis."""
        try:
            # Store result in Redis
            job_key = f"job:{job_id}"
            existing = await self.redis.get(job_key)
            if existing:
                job_data = json.loads(existing)
                job_data.update({
                    "status": TaskStatus.COMPLETED.value,
                    "result": result,
                    "processedAt": datetime.now().isoformat(),
                    "duration": duration,
                })
                await self.redis.set(job_key, json.dumps(job_data))

            # Publish completion event
            await self.redis.publish(
                "task:completed",
                json.dumps({
                    "jobId": job_id,
                    "userId": user_id,
                    "result": result,
                    "duration": duration,
                    "timestamp": datetime.now().isoformat(),
                })
            )
        except Exception as e:
            logger.error(f"Failed to report completion: {e}")

    async def _report_failed(self, job_id: str, user_id: str, error: str):
        """Report task failure to Redis."""
        try:
            # Update job status
            job_key = f"job:{job_id}"
            existing = await self.redis.get(job_key)
            if existing:
                job_data = json.loads(existing)
                job_data.update({
                    "status": TaskStatus.FAILED.value,
                    "error": error,
                    "processedAt": datetime.now().isoformat(),
                })
                await self.redis.set(job_key, json.dumps(job_data))

            # Publish failure event
            await self.redis.publish(
                "task:failed",
                json.dumps({
                    "jobId": job_id,
                    "userId": user_id,
                    "error": error,
                    "timestamp": datetime.now().isoformat(),
                })
            )
        except Exception as e:
            logger.error(f"Failed to report failure: {e}")


async def main():
    """Main entry point for the task worker."""
    import argparse

    parser = argparse.ArgumentParser(description="AI Task Worker")
    parser.add_argument(
        "--queue",
        type=str,
        default="ai_tasks",
        help="Queue name to process (default: ai_tasks)",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Process all queues",
    )
    parser.add_argument(
        "--redis-url",
        type=str,
        default=os.getenv("REDIS_URL", "redis://localhost:6379"),
        help="Redis URL",
    )
    parser.add_argument(
        "--max-concurrent",
        type=int,
        default=3,
        help="Maximum concurrent tasks",
    )

    args = parser.parse_args()

    if args.all:
        queue_names = ["ai_tasks", "style_analysis", "virtual_tryon", "wardrobe_match"]
    else:
        queue_names = [args.queue]

    worker = TaskWorker(
        redis_url=args.redis_url,
        queue_names=queue_names,
        max_concurrent_tasks=args.max_concurrent,
    )

    # Handle shutdown signals
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    def signal_handler():
        logger.info("Shutdown signal received")
        asyncio.create_task(worker.stop())

    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, signal_handler)

    try:
        await worker.start()
    except KeyboardInterrupt:
        logger.info("Worker interrupted")
    finally:
        await worker.stop()


if __name__ == "__main__":
    asyncio.run(main())
