"""
算法网关服务
统一API接口，处理认证、限流、负载均衡
支持多版本模型管理和A/B测试

NOTE: KMP_DUPLICATE_LIB_OK removed - ensure clean OpenMP environment
"""

import os

import numpy as np
import asyncio
import time
import json
import hashlib
from typing import Dict, List, Optional, Any, Callable, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from collections import defaultdict
import threading


class AlgorithmType(Enum):
    BODY_METRICS = "body_metrics"
    BODY_DETECTION = "body_detection"
    STYLE_RECOGNITION = "style_recognition"
    CLOTHING_SEGMENTATION = "clothing_segmentation"
    RECOMMENDATION = "recommendation"
    TREND_PREDICTION = "trend_prediction"
    AESTHETIC_SCORING = "aesthetic_scoring"
    VIRTUAL_TRYON = "virtual_tryon"
    VISUAL_SEARCH = "visual_search"


class RequestPriority(Enum):
    LOW = 1
    NORMAL = 5
    HIGH = 10
    CRITICAL = 20


class RateLimitStrategy(Enum):
    TOKEN_BUCKET = "token_bucket"
    SLIDING_WINDOW = "sliding_window"
    FIXED_WINDOW = "fixed_window"


@dataclass
class APIConfig:
    rate_limit_requests: int = 100
    rate_limit_window_seconds: int = 60
    max_concurrent_requests: int = 100
    request_timeout_seconds: int = 30
    enable_authentication: bool = True
    enable_rate_limiting: bool = True
    enable_caching: bool = True
    cache_ttl_seconds: int = 300


@dataclass
class APIRequest:
    request_id: str
    algorithm: AlgorithmType
    version: str
    payload: Dict[str, Any]
    priority: RequestPriority
    user_id: Optional[str]
    api_key: Optional[str]
    timestamp: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class APIResponse:
    request_id: str
    success: bool
    result: Optional[Any]
    error: Optional[str]
    execution_time_ms: float
    cache_hit: bool
    model_version: str
    timestamp: datetime


@dataclass
class RateLimitInfo:
    requests_remaining: int
    reset_time: datetime
    total_requests: int


class RateLimiter:
    """API限流器"""

    def __init__(
        self,
        max_requests: int = 100,
        window_seconds: int = 60,
        strategy: RateLimitStrategy = RateLimitStrategy.SLIDING_WINDOW
    ):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.strategy = strategy
        self._request_history: Dict[str, List[datetime]] = defaultdict(list)
        self._token_buckets: Dict[str, Dict] = {}
        self._lock = threading.Lock()

    def check_rate_limit(self, client_id: str) -> Tuple[bool, RateLimitInfo]:
        with self._lock:
            now = datetime.now()
            window_start = now - timedelta(seconds=self.window_seconds)

            if self.strategy == RateLimitStrategy.SLIDING_WINDOW:
                self._request_history[client_id] = [
                    t for t in self._request_history[client_id]
                    if t > window_start
                ]

                current_count = len(self._request_history[client_id])
                allowed = current_count < self.max_requests

                if allowed:
                    self._request_history[client_id].append(now)

                reset_time = now + timedelta(seconds=self.window_seconds)

                return allowed, RateLimitInfo(
                    requests_remaining=max(0, self.max_requests - current_count - (1 if allowed else 0)),
                    reset_time=reset_time,
                    total_requests=current_count
                )

            elif self.strategy == RateLimitStrategy.TOKEN_BUCKET:
                return self._token_bucket_check(client_id, now)

            else:
                return self._fixed_window_check(client_id, now)

    def _token_bucket_check(
        self,
        client_id: str,
        now: datetime
    ) -> Tuple[bool, RateLimitInfo]:
        if client_id not in self._token_buckets:
            self._token_buckets[client_id] = {
                "tokens": self.max_requests,
                "last_refill": now
            }

        bucket = self._token_buckets[client_id]
        time_passed = (now - bucket["last_refill"]).total_seconds()
        tokens_to_add = time_passed * (self.max_requests / self.window_seconds)
        bucket["tokens"] = min(self.max_requests, bucket["tokens"] + tokens_to_add)
        bucket["last_refill"] = now

        if bucket["tokens"] >= 1:
            bucket["tokens"] -= 1
            return True, RateLimitInfo(
                requests_remaining=int(bucket["tokens"]),
                reset_time=now + timedelta(seconds=(self.max_requests - bucket["tokens"]) / (self.max_requests / self.window_seconds)),
                total_requests=self.max_requests - int(bucket["tokens"])
            )
        else:
            return False, RateLimitInfo(
                requests_remaining=0,
                reset_time=now + timedelta(seconds=(1 - bucket["tokens"]) / (self.max_requests / self.window_seconds)),
                total_requests=self.max_requests
            )

    def _fixed_window_check(
        self,
        client_id: str,
        now: datetime
    ) -> Tuple[bool, RateLimitInfo]:
        window_key = now.strftime("%Y%m%d%H%M")
        key = f"{client_id}:{window_key}"

        if key not in self._request_history:
            self._request_history[key] = []

        current_count = len(self._request_history[key])
        allowed = current_count < self.max_requests

        if allowed:
            self._request_history[key].append(now)

        window_end = now.replace(second=0, microsecond=0) + timedelta(minutes=1)

        return allowed, RateLimitInfo(
            requests_remaining=max(0, self.max_requests - current_count - (1 if allowed else 0)),
            reset_time=window_end,
            total_requests=current_count
        )


class RequestAuthenticator:
    """请求认证器"""

    def __init__(self):
        self._api_keys: Dict[str, Dict] = {}
        self._user_sessions: Dict[str, Dict] = {}
        self._lock = threading.Lock()

    def register_api_key(
        self,
        api_key: str,
        user_id: str,
        permissions: List[str],
        rate_limit: int = 100
    ):
        with self._lock:
            self._api_keys[api_key] = {
                "user_id": user_id,
                "permissions": permissions,
                "rate_limit": rate_limit,
                "created_at": datetime.now(),
                "last_used": None,
                "usage_count": 0
            }

    def authenticate(
        self,
        api_key: str,
        required_permission: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        with self._lock:
            if api_key not in self._api_keys:
                return False, "Invalid API key"

            key_info = self._api_keys[api_key]
            key_info["last_used"] = datetime.now()
            key_info["usage_count"] += 1

            if required_permission:
                if required_permission not in key_info["permissions"]:
                    return False, f"Permission denied: {required_permission}"

            return True, key_info["user_id"]

    def get_api_key_info(self, api_key: str) -> Optional[Dict]:
        with self._lock:
            return self._api_keys.get(api_key)


class LoadBalancer:
    """负载均衡器"""

    def __init__(self, strategy: str = "round_robin"):
        self.strategy = strategy
        self._backends: Dict[str, Dict] = {}
        self._current_index = 0
        self._lock = threading.Lock()

    def register_backend(
        self,
        backend_id: str,
        endpoint: str,
        weight: int = 1,
        max_connections: int = 100
    ):
        with self._lock:
            self._backends[backend_id] = {
                "endpoint": endpoint,
                "weight": weight,
                "max_connections": max_connections,
                "current_connections": 0,
                "total_requests": 0,
                "failed_requests": 0,
                "avg_latency_ms": 0,
                "healthy": True,
                "last_check": datetime.now()
            }

    def get_backend(self) -> Optional[str]:
        with self._lock:
            healthy_backends = {
                k: v for k, v in self._backends.items()
                if v["healthy"] and v["current_connections"] < v["max_connections"]
            }

            if not healthy_backends:
                return None

            if self.strategy == "round_robin":
                backend_ids = list(healthy_backends.keys())
                selected = backend_ids[self._current_index % len(backend_ids)]
                self._current_index += 1
                return selected

            elif self.strategy == "weighted":
                total_weight = sum(v["weight"] for v in healthy_backends.values())
                r = np.random.random() * total_weight
                cumulative = 0
                for backend_id, info in healthy_backends.items():
                    cumulative += info["weight"]
                    if r <= cumulative:
                        return backend_id
                return list(healthy_backends.keys())[0]

            elif self.strategy == "least_connections":
                return min(
                    healthy_backends.keys(),
                    key=lambda k: healthy_backends[k]["current_connections"]
                )

            else:
                return list(healthy_backends.keys())[0]

    def record_request_start(self, backend_id: str):
        with self._lock:
            if backend_id in self._backends:
                self._backends[backend_id]["current_connections"] += 1
                self._backends[backend_id]["total_requests"] += 1

    def record_request_end(
        self,
        backend_id: str,
        success: bool,
        latency_ms: float
    ):
        with self._lock:
            if backend_id in self._backends:
                self._backends[backend_id]["current_connections"] -= 1
                if not success:
                    self._backends[backend_id]["failed_requests"] += 1

                current_avg = self._backends[backend_id]["avg_latency_ms"]
                total = self._backends[backend_id]["total_requests"]
                self._backends[backend_id]["avg_latency_ms"] = (
                    current_avg * (total - 1) + latency_ms
                ) / total

    def mark_unhealthy(self, backend_id: str):
        with self._lock:
            if backend_id in self._backends:
                self._backends[backend_id]["healthy"] = False

    def get_backend_stats(self) -> Dict[str, Dict]:
        with self._lock:
            return {
                k: {
                    "endpoint": v["endpoint"],
                    "healthy": v["healthy"],
                    "current_connections": v["current_connections"],
                    "total_requests": v["total_requests"],
                    "failed_requests": v["failed_requests"],
                    "avg_latency_ms": v["avg_latency_ms"]
                }
                for k, v in self._backends.items()
            }


class AlgorithmRegistry:
    """算法注册表"""

    def __init__(self):
        self._algorithms: Dict[str, Dict] = {}
        self._versions: Dict[str, Dict[str, Dict]] = defaultdict(dict)
        self._default_versions: Dict[str, str] = {}
        self._lock = threading.Lock()

    def register_algorithm(
        self,
        algorithm_id: str,
        version: str,
        handler: Callable,
        description: str = "",
        input_schema: Dict = None,
        output_schema: Dict = None,
        is_default: bool = False
    ):
        with self._lock:
            self._versions[algorithm_id][version] = {
                "handler": handler,
                "description": description,
                "input_schema": input_schema or {},
                "output_schema": output_schema or {},
                "registered_at": datetime.now(),
                "request_count": 0,
                "avg_latency_ms": 0
            }

            if is_default or algorithm_id not in self._default_versions:
                self._default_versions[algorithm_id] = version

    def get_handler(
        self,
        algorithm_id: str,
        version: Optional[str] = None
    ) -> Optional[Callable]:
        with self._lock:
            version = version or self._default_versions.get(algorithm_id)
            if not version:
                return None

            version_info = self._versions.get(algorithm_id, {}).get(version)
            return version_info["handler"] if version_info else None

    def get_version_info(
        self,
        algorithm_id: str,
        version: Optional[str] = None
    ) -> Optional[Dict]:
        with self._lock:
            version = version or self._default_versions.get(algorithm_id)
            return self._versions.get(algorithm_id, {}).get(version)

    def list_algorithms(self) -> List[Dict]:
        with self._lock:
            return [
                {
                    "algorithm_id": alg_id,
                    "default_version": self._default_versions.get(alg_id),
                    "available_versions": list(versions.keys())
                }
                for alg_id, versions in self._versions.items()
            ]

    def record_usage(
        self,
        algorithm_id: str,
        version: str,
        latency_ms: float
    ):
        with self._lock:
            if algorithm_id in self._versions and version in self._versions[algorithm_id]:
                info = self._versions[algorithm_id][version]
                info["request_count"] += 1
                current_avg = info["avg_latency_ms"]
                info["avg_latency_ms"] = (
                    current_avg * (info["request_count"] - 1) + latency_ms
                ) / info["request_count"]


class APIGateway:
    """API网关主类"""

    def __init__(self, config: APIConfig = None):
        self.config = config or APIConfig()
        self.rate_limiter = RateLimiter(
            max_requests=self.config.rate_limit_requests,
            window_seconds=self.config.rate_limit_window_seconds
        )
        self.authenticator = RequestAuthenticator()
        self.load_balancer = LoadBalancer()
        self.algorithm_registry = AlgorithmRegistry()

        self._request_queue: asyncio.Queue = None
        self._active_requests: Dict[str, APIRequest] = {}
        self._response_cache: Dict[str, Tuple[Any, datetime]] = {}
        self._stats: Dict[str, Any] = defaultdict(int)
        self._lock = threading.Lock()

    def register_algorithm(
        self,
        algorithm_id: str,
        handler: Callable,
        version: str = "v1",
        is_default: bool = True
    ):
        self.algorithm_registry.register_algorithm(
            algorithm_id=algorithm_id,
            version=version,
            handler=handler,
            is_default=is_default
        )

    async def process_request(
        self,
        algorithm: str,
        payload: Dict[str, Any],
        api_key: Optional[str] = None,
        version: Optional[str] = None,
        priority: RequestPriority = RequestPriority.NORMAL
    ) -> APIResponse:
        start_time = time.time()
        request_id = self._generate_request_id()

        if self.config.enable_authentication and api_key:
            auth_success, user_id = self.authenticator.authenticate(api_key, algorithm)
            if not auth_success:
                return APIResponse(
                    request_id=request_id,
                    success=False,
                    result=None,
                    error=f"Authentication failed: {user_id}",
                    execution_time_ms=0,
                    cache_hit=False,
                    model_version=version or "unknown",
                    timestamp=datetime.now()
                )
        else:
            user_id = None

        if self.config.enable_rate_limiting:
            client_id = user_id or api_key or "anonymous"
            allowed, rate_info = self.rate_limiter.check_rate_limit(client_id)
            if not allowed:
                return APIResponse(
                    request_id=request_id,
                    success=False,
                    result=None,
                    error=f"Rate limit exceeded. Reset at {rate_info.reset_time}",
                    execution_time_ms=0,
                    cache_hit=False,
                    model_version=version or "unknown",
                    timestamp=datetime.now()
                )

        cache_key = self._generate_cache_key(algorithm, payload, version)
        if self.config.enable_caching and cache_key in self._response_cache:
            cached_result, cached_time = self._response_cache[cache_key]
            if datetime.now() - cached_time < timedelta(seconds=self.config.cache_ttl_seconds):
                self._stats["cache_hits"] += 1
                return APIResponse(
                    request_id=request_id,
                    success=True,
                    result=cached_result,
                    error=None,
                    execution_time_ms=(time.time() - start_time) * 1000,
                    cache_hit=True,
                    model_version=version or "cached",
                    timestamp=datetime.now()
                )

        handler = self.algorithm_registry.get_handler(algorithm, version)
        if handler is None:
            return APIResponse(
                request_id=request_id,
                success=False,
                result=None,
                error=f"Algorithm not found: {algorithm}",
                execution_time_ms=0,
                cache_hit=False,
                model_version=version or "unknown",
                timestamp=datetime.now()
            )

        try:
            if asyncio.iscoroutinefunction(handler):
                result = await handler(payload)
            else:
                result = handler(payload)

            execution_time_ms = (time.time() - start_time) * 1000

            self.algorithm_registry.record_usage(algorithm, version or "v1", execution_time_ms)

            if self.config.enable_caching:
                self._response_cache[cache_key] = (result, datetime.now())

            self._stats["successful_requests"] += 1

            return APIResponse(
                request_id=request_id,
                success=True,
                result=result,
                error=None,
                execution_time_ms=execution_time_ms,
                cache_hit=False,
                model_version=version or "v1",
                timestamp=datetime.now()
            )

        except Exception as e:
            self._stats["failed_requests"] += 1
            return APIResponse(
                request_id=request_id,
                success=False,
                result=None,
                error=str(e),
                execution_time_ms=(time.time() - start_time) * 1000,
                cache_hit=False,
                model_version=version or "unknown",
                timestamp=datetime.now()
            )

    def _generate_request_id(self) -> str:
        return hashlib.md5(f"{time.time()}{np.random.random()}".encode()).hexdigest()[:16]

    def _generate_cache_key(
        self,
        algorithm: str,
        payload: Dict,
        version: Optional[str]
    ) -> str:
        payload_str = json.dumps(payload, sort_keys=True)
        payload_hash = hashlib.md5(payload_str.encode()).hexdigest()
        return f"{algorithm}:{version or 'default'}:{payload_hash}"

    def get_stats(self) -> Dict[str, Any]:
        return {
            "total_requests": self._stats["successful_requests"] + self._stats["failed_requests"],
            "successful_requests": self._stats["successful_requests"],
            "failed_requests": self._stats["failed_requests"],
            "cache_hits": self._stats["cache_hits"],
            "cache_hit_rate": (
                self._stats["cache_hits"] / 
                (self._stats["successful_requests"] + self._stats["failed_requests"])
                if (self._stats["successful_requests"] + self._stats["failed_requests"]) > 0
                else 0
            ),
            "algorithms": self.algorithm_registry.list_algorithms(),
            "backends": self.load_balancer.get_backend_stats()
        }

    def clear_cache(self):
        self._response_cache.clear()


def create_api_gateway(
    rate_limit: int = 100,
    enable_auth: bool = True,
    enable_cache: bool = True
) -> APIGateway:
    config = APIConfig(
        rate_limit_requests=rate_limit,
        enable_authentication=enable_auth,
        enable_caching=enable_cache
    )
    return APIGateway(config)


if __name__ == "__main__":
    import asyncio

    async def main():
        gateway = create_api_gateway(rate_limit=100, enable_auth=False, enable_cache=True)

        print("\n" + "="*60)
        print("算法网关服务已初始化")
        print("="*60)

        def body_metrics_handler(payload: Dict) -> Dict:
            height = payload.get("height", 170)
            weight = payload.get("weight", 65)
            bmi = weight / ((height / 100) ** 2)
            return {"bmi": round(bmi, 2), "status": "normal" if 18.5 <= bmi <= 24.9 else "abnormal"}

        async def recommendation_handler(payload: Dict) -> Dict:
            user_id = payload.get("user_id", "anonymous")
            await asyncio.sleep(0.1)
            return {
                "user_id": user_id,
                "recommendations": ["item1", "item2", "item3"],
                "confidence": 0.85
            }

        gateway.register_algorithm("body_metrics", body_metrics_handler, "v1")
        gateway.register_algorithm("recommendation", recommendation_handler, "v1")

        print("\n已注册算法:")
        for alg in gateway.algorithm_registry.list_algorithms():
            print(f"  - {alg['algorithm_id']}: {alg['available_versions']}")

        print("\n测试API请求:")
        response = await gateway.process_request(
            algorithm="body_metrics",
            payload={"height": 175, "weight": 70}
        )
        print(f"响应: success={response.success}, result={response.result}")
        print(f"执行时间: {response.execution_time_ms:.2f}ms")

        print("\n测试缓存命中:")
        response2 = await gateway.process_request(
            algorithm="body_metrics",
            payload={"height": 175, "weight": 70}
        )
        print(f"缓存命中: {response2.cache_hit}")

        print("\n测试异步处理器:")
        response3 = await gateway.process_request(
            algorithm="recommendation",
            payload={"user_id": "user123"}
        )
        print(f"响应: {response3.result}")

        print("\n测试不存在的算法:")
        response4 = await gateway.process_request(
            algorithm="nonexistent",
            payload={}
        )
        print(f"错误: {response4.error}")

        print("\n网关统计:")
        stats = gateway.get_stats()
        print(json.dumps(stats, indent=2, default=str))

    asyncio.run(main())
