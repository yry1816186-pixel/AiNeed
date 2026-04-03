"""
边缘计算服务
支持本地轻量级模型推理，实现云端与本地智能切换

NOTE: KMP_DUPLICATE_LIB_OK removed - ensure clean OpenMP environment
"""

import os
# Removed: os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'

import asyncio
import time
import json
import hashlib
from typing import Dict, List, Optional, Any, Callable, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from enum import Enum
import threading
from concurrent.futures import ThreadPoolExecutor
import numpy as np


class ExecutionLocation(Enum):
    LOCAL = "local"
    CLOUD = "cloud"
    EDGE = "edge"
    AUTO = "auto"


class ExecutionStatus(Enum):
    SUCCESS = "success"
    FAILED = "failed"
    TIMEOUT = "timeout"
    FALLBACK = "fallback"
    CACHED = "cached"


@dataclass
class ExecutionResult:
    success: bool
    result: Any
    location: ExecutionLocation
    status: ExecutionStatus
    execution_time_ms: float
    model_name: str
    error: Optional[str] = None
    fallback_used: bool = False
    cache_hit: bool = False


@dataclass
class ModelInfo:
    name: str
    version: str
    size_mb: float
    input_shape: Tuple[int, ...]
    output_shape: Tuple[int, ...]
    last_used: datetime
    load_count: int = 0
    avg_inference_time_ms: float = 0
    memory_usage_mb: float = 0


@dataclass
class EdgeConfig:
    max_local_models: int = 5
    max_memory_mb: int = 1024
    max_inference_time_ms: int = 5000
    cache_size: int = 1000
    cache_ttl_seconds: int = 3600
    enable_prefetch: bool = True
    enable_model_compression: bool = True
    cloud_timeout_ms: int = 10000
    fallback_enabled: bool = True


class ModelCache:
    """模型推理结果缓存"""

    def __init__(self, max_size: int = 1000, ttl_seconds: int = 3600):
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self._cache: Dict[str, Tuple[Any, datetime]] = {}
        self._lock = threading.Lock()
        self._hits = 0
        self._misses = 0

    def _generate_key(self, model_name: str, input_data: Any) -> str:
        if isinstance(input_data, np.ndarray):
            input_hash = hashlib.md5(input_data.tobytes()).hexdigest()
        elif isinstance(input_data, dict):
            input_hash = hashlib.md5(json.dumps(input_data, sort_keys=True).encode()).hexdigest()
        else:
            input_hash = hashlib.md5(str(input_data).encode()).hexdigest()
        return f"{model_name}:{input_hash}"

    def get(self, model_name: str, input_data: Any) -> Optional[Any]:
        key = self._generate_key(model_name, input_data)
        with self._lock:
            if key in self._cache:
                result, timestamp = self._cache[key]
                if datetime.now() - timestamp < timedelta(seconds=self.ttl_seconds):
                    self._hits += 1
                    return result
                else:
                    del self._cache[key]
            self._misses += 1
            return None

    def set(self, model_name: str, input_data: Any, result: Any):
        key = self._generate_key(model_name, input_data)
        with self._lock:
            if len(self._cache) >= self.max_size:
                self._evict_oldest()
            self._cache[key] = (result, datetime.now())

    def _evict_oldest(self):
        if not self._cache:
            return
        oldest_key = min(self._cache.keys(), key=lambda k: self._cache[k][1])
        del self._cache[oldest_key]

    def clear(self):
        with self._lock:
            self._cache.clear()

    def get_stats(self) -> Dict[str, int]:
        with self._lock:
            return {
                "size": len(self._cache),
                "hits": self._hits,
                "misses": self._misses,
                "hit_rate": self._hits / (self._hits + self._misses) if (self._hits + self._misses) > 0 else 0
            }


class ModelRegistry:
    """本地模型注册表"""

    def __init__(self, max_models: int = 5, max_memory_mb: int = 1024):
        self.max_models = max_models
        self.max_memory_mb = max_memory_mb
        self._models: Dict[str, Any] = {}
        self._model_info: Dict[str, ModelInfo] = {}
        self._lock = threading.Lock()
        self._current_memory_mb = 0

    def register(self, name: str, model: Any, info: ModelInfo) -> bool:
        with self._lock:
            if name in self._models:
                return True

            if len(self._models) >= self.max_models:
                self._evict_lru()

            if self._current_memory_mb + info.size_mb > self.max_memory_mb:
                self._evict_until_fits(info.size_mb)

            self._models[name] = model
            self._model_info[name] = info
            self._current_memory_mb += info.size_mb
            return True

    def get(self, name: str) -> Optional[Any]:
        with self._lock:
            if name in self._models:
                info = self._model_info[name]
                info.last_used = datetime.now()
                info.load_count += 1
                return self._models[name]
            return None

    def has(self, name: str) -> bool:
        with self._lock:
            return name in self._models

    def _evict_lru(self):
        if not self._model_info:
            return
        lru_name = min(self._model_info.keys(), key=lambda k: self._model_info[k].last_used)
        self._evict(lru_name)

    def _evict_until_fits(self, required_mb: float):
        sorted_models = sorted(
            self._model_info.keys(),
            key=lambda k: self._model_info[k].last_used
        )
        for name in sorted_models:
            if self._current_memory_mb + required_mb <= self.max_memory_mb:
                break
            self._evict(name)

    def _evict(self, name: str):
        if name in self._models:
            del self._models[name]
            info = self._model_info.pop(name)
            self._current_memory_mb -= info.size_mb

    def get_stats(self) -> Dict[str, Any]:
        with self._lock:
            return {
                "model_count": len(self._models),
                "max_models": self.max_models,
                "current_memory_mb": self._current_memory_mb,
                "max_memory_mb": self.max_memory_mb,
                "models": {
                    name: {
                        "size_mb": info.size_mb,
                        "last_used": info.last_used.isoformat(),
                        "load_count": info.load_count,
                        "avg_inference_time_ms": info.avg_inference_time_ms,
                    }
                    for name, info in self._model_info.items()
                }
            }


class CloudConnector:
    """云端服务连接器"""

    def __init__(self, endpoint: str, timeout_ms: int = 10000):
        self.endpoint = endpoint
        self.timeout_ms = timeout_ms
        self._is_available = True
        self._last_check = datetime.now()
        self._failure_count = 0
        self._success_count = 0

    async def check_availability(self) -> bool:
        try:
            self._is_available = True
            self._last_check = datetime.now()
            return True
        except Exception:
            self._is_available = False
            return False

    async def execute(
        self,
        model_name: str,
        input_data: Any,
        timeout_ms: Optional[int] = None
    ) -> ExecutionResult:
        start_time = time.time()
        timeout = (timeout_ms or self.timeout_ms) / 1000

        try:
            await asyncio.wait_for(
                self._send_request(model_name, input_data),
                timeout=timeout
            )

            execution_time = (time.time() - start_time) * 1000
            self._success_count += 1

            return ExecutionResult(
                success=True,
                result={"status": "cloud_execution_simulated"},
                location=ExecutionLocation.CLOUD,
                status=ExecutionStatus.SUCCESS,
                execution_time_ms=execution_time,
                model_name=model_name
            )

        except asyncio.TimeoutError:
            self._failure_count += 1
            return ExecutionResult(
                success=False,
                result=None,
                location=ExecutionLocation.CLOUD,
                status=ExecutionStatus.TIMEOUT,
                execution_time_ms=timeout * 1000,
                model_name=model_name,
                error="Cloud request timed out"
            )

        except Exception as e:
            self._failure_count += 1
            return ExecutionResult(
                success=False,
                result=None,
                location=ExecutionLocation.CLOUD,
                status=ExecutionStatus.FAILED,
                execution_time_ms=(time.time() - start_time) * 1000,
                model_name=model_name,
                error=str(e)
            )

    async def _send_request(self, model_name: str, input_data: Any) -> Any:
        await asyncio.sleep(0.1)
        return {"result": "simulated"}

    def get_stats(self) -> Dict[str, Any]:
        return {
            "endpoint": self.endpoint,
            "is_available": self._is_available,
            "last_check": self._last_check.isoformat(),
            "success_count": self._success_count,
            "failure_count": self._failure_count,
            "success_rate": self._success_count / (self._success_count + self._failure_count)
            if (self._success_count + self._failure_count) > 0 else 0
        }


class EdgeComputeService:
    """边缘计算服务主类"""

    def __init__(self, config: EdgeConfig = None):
        self.config = config or EdgeConfig()
        self.model_cache = ModelCache(
            max_size=self.config.cache_size,
            ttl_seconds=self.config.cache_ttl_seconds
        )
        self.model_registry = ModelRegistry(
            max_models=self.config.max_local_models,
            max_memory_mb=self.config.max_memory_mb
        )
        self.cloud_connector = CloudConnector(
            endpoint="https://api.stylemind.com/ml",
            timeout_ms=self.config.cloud_timeout_ms
        )
        self._executor = ThreadPoolExecutor(max_workers=4)
        self._local_handlers: Dict[str, Callable] = {}
        self._fallback_handlers: Dict[str, Callable] = {}
        self._execution_history: List[ExecutionResult] = []
        self._lock = threading.Lock()

    def register_local_handler(
        self,
        model_name: str,
        handler: Callable,
        model_info: Optional[ModelInfo] = None
    ):
        self._local_handlers[model_name] = handler
        if model_info:
            self.model_registry.register(model_name, handler, model_info)

    def register_fallback_handler(self, model_name: str, handler: Callable):
        self._fallback_handlers[model_name] = handler

    async def execute(
        self,
        model_name: str,
        input_data: Any,
        preferred_location: ExecutionLocation = ExecutionLocation.AUTO,
        use_cache: bool = True
    ) -> ExecutionResult:
        start_time = time.time()

        if use_cache:
            cached_result = self.model_cache.get(model_name, input_data)
            if cached_result is not None:
                return ExecutionResult(
                    success=True,
                    result=cached_result,
                    location=ExecutionLocation.LOCAL,
                    status=ExecutionStatus.CACHED,
                    execution_time_ms=(time.time() - start_time) * 1000,
                    model_name=model_name,
                    cache_hit=True
                )

        location = self._determine_location(model_name, preferred_location)

        if location == ExecutionLocation.LOCAL:
            result = await self._execute_local(model_name, input_data)
        elif location == ExecutionLocation.CLOUD:
            result = await self._execute_cloud(model_name, input_data)
        else:
            result = await self._execute_auto(model_name, input_data)

        if result.success and use_cache:
            self.model_cache.set(model_name, input_data, result.result)

        self._record_execution(result)
        return result

    def _determine_location(
        self,
        model_name: str,
        preferred_location: ExecutionLocation
    ) -> ExecutionLocation:
        if preferred_location != ExecutionLocation.AUTO:
            return preferred_location

        has_local = model_name in self._local_handlers
        has_cloud = self.cloud_connector._is_available

        if has_local and has_cloud:
            return ExecutionLocation.LOCAL
        elif has_local:
            return ExecutionLocation.LOCAL
        elif has_cloud:
            return ExecutionLocation.CLOUD
        else:
            return ExecutionLocation.LOCAL

    async def _execute_local(
        self,
        model_name: str,
        input_data: Any
    ) -> ExecutionResult:
        start_time = time.time()

        handler = self._local_handlers.get(model_name)
        if handler is None:
            return ExecutionResult(
                success=False,
                result=None,
                location=ExecutionLocation.LOCAL,
                status=ExecutionStatus.FAILED,
                execution_time_ms=0,
                model_name=model_name,
                error=f"No local handler for {model_name}"
            )

        try:
            if asyncio.iscoroutinefunction(handler):
                result = await handler(input_data)
            else:
                loop = asyncio.get_running_loop()
                result = await loop.run_in_executor(
                    self._executor,
                    handler,
                    input_data
                )

            execution_time = (time.time() - start_time) * 1000

            return ExecutionResult(
                success=True,
                result=result,
                location=ExecutionLocation.LOCAL,
                status=ExecutionStatus.SUCCESS,
                execution_time_ms=execution_time,
                model_name=model_name
            )

        except Exception as e:
            return ExecutionResult(
                success=False,
                result=None,
                location=ExecutionLocation.LOCAL,
                status=ExecutionStatus.FAILED,
                execution_time_ms=(time.time() - start_time) * 1000,
                model_name=model_name,
                error=str(e)
            )

    async def _execute_cloud(
        self,
        model_name: str,
        input_data: Any
    ) -> ExecutionResult:
        return await self.cloud_connector.execute(model_name, input_data)

    async def _execute_auto(
        self,
        model_name: str,
        input_data: Any
    ) -> ExecutionResult:
        local_result = await self._execute_local(model_name, input_data)

        if local_result.success:
            return local_result

        if self.config.fallback_enabled:
            cloud_result = await self._execute_cloud(model_name, input_data)
            if cloud_result.success:
                cloud_result.fallback_used = True
                return cloud_result

            fallback_handler = self._fallback_handlers.get(model_name)
            if fallback_handler:
                try:
                    fallback_result = fallback_handler(input_data)
                    return ExecutionResult(
                        success=True,
                        result=fallback_result,
                        location=ExecutionLocation.LOCAL,
                        status=ExecutionStatus.FALLBACK,
                        execution_time_ms=0,
                        model_name=model_name,
                        fallback_used=True
                    )
                except Exception:
                    pass

        return local_result

    def _record_execution(self, result: ExecutionResult):
        with self._lock:
            self._execution_history.append(result)
            if len(self._execution_history) > 1000:
                self._execution_history = self._execution_history[-1000:]

    def get_stats(self) -> Dict[str, Any]:
        with self._lock:
            history = self._execution_history[-100:]

        success_count = sum(1 for r in history if r.success)
        local_count = sum(1 for r in history if r.location == ExecutionLocation.LOCAL)
        cloud_count = sum(1 for r in history if r.location == ExecutionLocation.CLOUD)
        cache_hits = sum(1 for r in history if r.cache_hit)
        fallbacks = sum(1 for r in history if r.fallback_used)

        avg_time = np.mean([r.execution_time_ms for r in history]) if history else 0

        return {
            "execution_stats": {
                "total_executions": len(history),
                "success_count": success_count,
                "success_rate": success_count / len(history) if history else 0,
                "local_count": local_count,
                "cloud_count": cloud_count,
                "cache_hits": cache_hits,
                "fallbacks": fallbacks,
                "avg_execution_time_ms": avg_time,
            },
            "cache_stats": self.model_cache.get_stats(),
            "model_registry_stats": self.model_registry.get_stats(),
            "cloud_stats": self.cloud_connector.get_stats(),
        }

    def clear_cache(self):
        self.model_cache.clear()

    async def health_check(self) -> Dict[str, bool]:
        cloud_available = await self.cloud_connector.check_availability()

        return {
            "local_models": len(self._local_handlers) > 0,
            "cloud_available": cloud_available,
            "cache_operational": True,
            "overall_healthy": cloud_available or len(self._local_handlers) > 0
        }


class EdgeServiceFactory:
    """边缘服务工厂"""

    _instance: Optional[EdgeComputeService] = None

    @classmethod
    def get_service(cls, config: EdgeConfig = None) -> EdgeComputeService:
        if cls._instance is None:
            cls._instance = EdgeComputeService(config)
        return cls._instance

    @classmethod
    def reset(cls):
        cls._instance = None


def create_edge_service(
    max_local_models: int = 5,
    max_memory_mb: int = 1024,
    cache_size: int = 1000
) -> EdgeComputeService:
    config = EdgeConfig(
        max_local_models=max_local_models,
        max_memory_mb=max_memory_mb,
        cache_size=cache_size
    )
    return EdgeComputeService(config)


def register_body_metrics_handler(service: EdgeComputeService):
    def calculate_body_metrics(input_data: Dict) -> Dict:
        height = input_data.get("height", 170)
        weight = input_data.get("weight", 65)
        waist = input_data.get("waist", 75)
        hip = input_data.get("hip", 95)

        bmi = weight / ((height / 100) ** 2)
        whr = waist / hip if hip > 0 else 0

        return {
            "bmi": round(bmi, 2),
            "whr": round(whr, 3),
            "body_type": "rectangle" if 0.8 <= whr <= 0.85 else "hourglass" if whr < 0.8 else "apple"
        }

    service.register_local_handler(
        "body_metrics",
        calculate_body_metrics,
        ModelInfo(
            name="body_metrics",
            version="1.0.0",
            size_mb=0.1,
            input_shape=(4,),
            output_shape=(3,),
            last_used=datetime.now()
        )
    )


def register_style_classifier_handler(service: EdgeComputeService):
    def classify_style_lightweight(input_data: Dict) -> Dict:
        colors = input_data.get("colors", [])
        patterns = input_data.get("patterns", [])

        style_scores = {
            "casual": 0.5,
            "formal": 0.3,
            "sporty": 0.2,
        }

        if "black" in colors or "navy" in colors:
            style_scores["formal"] += 0.2
        if "bright" in str(colors).lower():
            style_scores["casual"] += 0.2
        if "striped" in patterns or "solid" in patterns:
            style_scores["formal"] += 0.1

        best_style = max(style_scores, key=style_scores.get)
        return {
            "style": best_style,
            "confidence": style_scores[best_style],
            "all_scores": style_scores
        }

    service.register_local_handler(
        "style_classifier_light",
        classify_style_lightweight,
        ModelInfo(
            name="style_classifier_light",
            version="1.0.0",
            size_mb=0.5,
            input_shape=(None,),
            output_shape=(3,),
            last_used=datetime.now()
        )
    )

    service.register_fallback_handler(
        "style_classifier",
        classify_style_lightweight
    )


if __name__ == "__main__":
    async def main():
        service = create_edge_service()

        register_body_metrics_handler(service)
        register_style_classifier_handler(service)

        print("\n" + "="*60)
        print("边缘计算服务已初始化")
        print("="*60)

        print("\n测试本地身体指标计算:")
        result = await service.execute(
            "body_metrics",
            {"height": 175, "weight": 70, "waist": 80, "hip": 95},
            preferred_location=ExecutionLocation.LOCAL
        )
        print(f"结果: {result.result}")
        print(f"执行位置: {result.location.value}")
        print(f"执行时间: {result.execution_time_ms:.2f}ms")

        print("\n测试缓存命中:")
        result2 = await service.execute(
            "body_metrics",
            {"height": 175, "weight": 70, "waist": 80, "hip": 95}
        )
        print(f"缓存命中: {result2.cache_hit}")

        print("\n服务统计:")
        stats = service.get_stats()
        print(json.dumps(stats, indent=2, default=str))

        print("\n健康检查:")
        health = await service.health_check()
        print(health)

    asyncio.run(main())
