"""
服务降级策略
网络不稳定时自动切换到本地模型或简化算法
保证服务可用性和用户体验

NOTE: KMP_DUPLICATE_LIB_OK removed - ensure clean OpenMP environment
"""

import os
# Removed: os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'

import asyncio
import time
import random
from typing import Dict, List, Optional, Any, Callable, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from collections import deque
import threading
import json


class ServiceLevel(Enum):
    FULL = "full"
    DEGRADED = "degraded"
    MINIMAL = "minimal"
    OFFLINE = "offline"


class DegradationTrigger(Enum):
    NETWORK_LATENCY = "network_latency"
    NETWORK_ERROR = "network_error"
    SERVICE_UNAVAILABLE = "service_unavailable"
    TIMEOUT = "timeout"
    RATE_LIMIT = "rate_limit"
    RESOURCE_EXHAUSTION = "resource_exhaustion"
    MANUAL = "manual"


class RecoveryStrategy(Enum):
    GRADUAL = "gradual"
    IMMEDIATE = "immediate"
    SCHEDULED = "scheduled"
    PROACTIVE = "proactive"


@dataclass
class ServiceHealth:
    name: str
    is_available: bool
    latency_ms: float
    error_rate: float
    last_check: datetime
    consecutive_failures: int = 0
    consecutive_successes: int = 0


@dataclass
class DegradationRule:
    trigger: DegradationTrigger
    threshold: float
    action: str
    cooldown_seconds: int = 60
    auto_recover: bool = True


@dataclass
class DegradationState:
    current_level: ServiceLevel
    active_triggers: List[DegradationTrigger]
    degraded_features: List[str]
    fallback_active: bool
    last_degradation: Optional[datetime]
    recovery_attempts: int


class NetworkMonitor:
    """网络状态监控器

    A-P2-8: 健康检查阈值支持从配置读取
    """

    def __init__(
        self,
        window_size: int = 100,
        latency_threshold_ms: float = 3000,
        error_rate_threshold: float = 0.1,
    ):
        self.window_size = window_size
        self.latency_threshold_ms = latency_threshold_ms
        self.error_rate_threshold = error_rate_threshold
        self._latency_history: deque = deque(maxlen=window_size)
        self._error_history: deque = deque(maxlen=window_size)
        self._lock = threading.Lock()

    def record_request(
        self,
        latency_ms: float,
        success: bool,
        error_type: Optional[str] = None
    ):
        with self._lock:
            self._latency_history.append(latency_ms)
            self._error_history.append({
                "success": success,
                "error_type": error_type,
                "timestamp": datetime.now()
            })

    def get_stats(self) -> Dict[str, Any]:
        with self._lock:
            if not self._latency_history:
                return {
                    "avg_latency_ms": 0,
                    "max_latency_ms": 0,
                    "error_rate": 0,
                    "request_count": 0
                }

            latencies = list(self._latency_history)
            errors = list(self._error_history)

            error_count = sum(1 for e in errors if not e["success"])

            return {
                "avg_latency_ms": sum(latencies) / len(latencies),
                "max_latency_ms": max(latencies),
                "min_latency_ms": min(latencies),
                "error_rate": error_count / len(errors) if errors else 0,
                "request_count": len(errors),
                "recent_errors": [
                    e for e in errors[-10:]
                    if not e["success"]
                ]
            }

    def is_network_healthy(
        self,
        latency_threshold_ms: Optional[float] = None,
        error_rate_threshold: Optional[float] = None
    ) -> Tuple[bool, Optional[str]]:
        # A-P2-8: 使用实例属性作为默认阈值，允许调用时覆盖
        latency_threshold = latency_threshold_ms if latency_threshold_ms is not None else self.latency_threshold_ms
        error_threshold = error_rate_threshold if error_rate_threshold is not None else self.error_rate_threshold

        stats = self.get_stats()

        if stats["avg_latency_ms"] > latency_threshold:
            return False, f"High latency: {stats['avg_latency_ms']:.0f}ms"

        if stats["error_rate"] > error_threshold:
            return False, f"High error rate: {stats['error_rate']:.1%}"

        return True, None


class CircuitBreaker:
    """熔断器"""

    STATE_CLOSED = "closed"
    STATE_OPEN = "open"
    STATE_HALF_OPEN = "half_open"

    def __init__(
        self,
        failure_threshold: int = 5,
        success_threshold: int = 3,
        timeout_seconds: int = 30
    ):
        self.failure_threshold = failure_threshold
        self.success_threshold = success_threshold
        self.timeout_seconds = timeout_seconds

        self._state = self.STATE_CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._last_failure_time: Optional[datetime] = None
        self._lock = threading.Lock()

    def can_execute(self) -> bool:
        with self._lock:
            if self._state == self.STATE_CLOSED:
                return True

            if self._state == self.STATE_OPEN:
                if self._last_failure_time:
                    elapsed = (datetime.now() - self._last_failure_time).total_seconds()
                    if elapsed >= self.timeout_seconds:
                        self._state = self.STATE_HALF_OPEN
                        self._success_count = 0
                        return True
                return False

            if self._state == self.STATE_HALF_OPEN:
                return True

            return False

    def record_success(self):
        with self._lock:
            self._failure_count = 0

            if self._state == self.STATE_HALF_OPEN:
                self._success_count += 1
                if self._success_count >= self.success_threshold:
                    self._state = self.STATE_CLOSED
                    self._success_count = 0

    def record_failure(self):
        with self._lock:
            self._failure_count += 1
            self._last_failure_time = datetime.now()

            if self._state == self.STATE_HALF_OPEN:
                self._state = self.STATE_OPEN
            elif self._failure_count >= self.failure_threshold:
                self._state = self.STATE_OPEN

    def get_state(self) -> str:
        with self._lock:
            return self._state

    def reset(self):
        with self._lock:
            self._state = self.STATE_CLOSED
            self._failure_count = 0
            self._success_count = 0
            self._last_failure_time = None


class FallbackHandler:
    """降级处理器"""

    def __init__(self):
        self._handlers: Dict[str, Callable] = {}
        self._cache: Dict[str, Any] = {}
        self._lock = threading.Lock()
        self._degradation_events: List[Dict[str, Any]] = []
        self._max_events = 1000

    def register_handler(
        self,
        service_name: str,
        handler: Callable,
        use_cache: bool = True
    ):
        self._handlers[service_name] = {
            "handler": handler,
            "use_cache": use_cache
        }

    def execute(
        self,
        service_name: str,
        *args,
        **kwargs
    ) -> Tuple[Any, bool]:
        if service_name not in self._handlers:
            # Return mock data if no handler registered
            mock_data = self._get_mock_data(service_name, *args, **kwargs)
            self._record_degradation_event(service_name, "no_handler", mock_data is not None)
            return mock_data, mock_data is not None

        handler_info = self._handlers[service_name]
        handler = handler_info["handler"]

        cache_key = self._generate_cache_key(service_name, args, kwargs)

        if handler_info["use_cache"]:
            with self._lock:
                if cache_key in self._cache:
                    cached_result, timestamp = self._cache[cache_key]
                    if datetime.now() - timestamp < timedelta(minutes=30):
                        self._record_degradation_event(service_name, "cache_hit", True)
                        return cached_result, True

        try:
            result = handler(*args, **kwargs)

            if handler_info["use_cache"]:
                with self._lock:
                    self._cache[cache_key] = (result, datetime.now())

            self._record_degradation_event(service_name, "handler_success", True)
            return result, True
        except Exception as e:
            self._record_degradation_event(service_name, "handler_error", False, str(e))
            mock_data = self._get_mock_data(service_name, *args, **kwargs)
            return mock_data if mock_data else {"error": str(e), "fallback": True}, False

    def _get_mock_data(self, service_name: str, *args, **kwargs) -> Optional[Any]:
        """Generate mock data for degraded service responses."""
        mock_data_map = {
            "body_metrics": {
                "bmi": 22.0,
                "body_type": "rectangle",
                "confidence": 0.5,
                "fallback": True,
                "message": "Service degraded - using default values"
            },
            "style_recognition": {
                "style": "casual",
                "confidence": 0.4,
                "fallback": True,
                "message": "Service degraded - using default style"
            },
            "recommendation": {
                "items": [
                    {"id": "default_1", "name": "Classic White Shirt", "score": 0.7},
                    {"id": "default_2", "name": "Blue Jeans", "score": 0.65},
                    {"id": "default_3", "name": "Casual Sneakers", "score": 0.6}
                ],
                "reason": "Popular items (degraded mode)",
                "fallback": True
            },
            "virtual_tryon": {
                "status": "unavailable",
                "message": "Virtual try-on service is temporarily unavailable",
                "fallback": True
            },
            "visual_search": {
                "results": [],
                "message": "Visual search is temporarily unavailable",
                "fallback": True
            },
            "body_analysis": {
                "body_type": "rectangle",
                "body_type_confidence": 0.5,
                "skin_tone": "medium",
                "color_season": "autumn",
                "measurements": {},
                "proportions": {},
                "fallback": True,
                "message": "Body analysis service degraded - using default values"
            },
            "sasrec_recommendation": {
                "recommendations": [1, 2, 3, 4, 5],
                "scores": [0.8, 0.75, 0.7, 0.65, 0.6],
                "fallback": True,
                "message": "Using popular items due to service degradation"
            },
            "color_analysis": {
                "dominant_colors": ["black", "white", "gray"],
                "color_season": "winter",
                "confidence": 0.5,
                "fallback": True
            }
        }

        return mock_data_map.get(service_name)

    def _record_degradation_event(
        self,
        service_name: str,
        event_type: str,
        success: bool,
        error: Optional[str] = None
    ):
        """Record degradation event for monitoring and analysis."""
        event = {
            "timestamp": datetime.now().isoformat(),
            "service": service_name,
            "event_type": event_type,
            "success": success,
            "error": error
        }

        with self._lock:
            self._degradation_events.append(event)
            # Keep only recent events
            if len(self._degradation_events) > self._max_events:
                self._degradation_events = self._degradation_events[-self._max_events:]

    def get_degradation_events(
        self,
        service_name: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get recent degradation events."""
        with self._lock:
            events = self._degradation_events.copy()

        if service_name:
            events = [e for e in events if e["service"] == service_name]

        return events[-limit:]

    def get_degradation_stats(self) -> Dict[str, Any]:
        """Get statistics about degradation events."""
        with self._lock:
            events = self._degradation_events.copy()

        if not events:
            return {"total_events": 0}

        # Count by service
        service_counts: Dict[str, int] = {}
        for event in events:
            service = event["service"]
            service_counts[service] = service_counts.get(service, 0) + 1

        # Count by event type
        type_counts: Dict[str, int] = {}
        for event in events:
            etype = event["event_type"]
            type_counts[etype] = type_counts.get(etype, 0) + 1

        # Calculate success rate
        success_count = sum(1 for e in events if e["success"])
        success_rate = success_count / len(events) if events else 0

        # Recent events (last hour)
        one_hour_ago = datetime.now() - timedelta(hours=1)
        recent_events = [
            e for e in events
            if datetime.fromisoformat(e["timestamp"]) > one_hour_ago
        ]

        return {
            "total_events": len(events),
            "events_last_hour": len(recent_events),
            "success_rate": success_rate,
            "by_service": service_counts,
            "by_type": type_counts
        }

    def _generate_cache_key(
        self,
        service_name: str,
        args: tuple,
        kwargs: dict
    ) -> str:
        key_parts = [service_name]
        key_parts.extend(str(arg) for arg in args)
        key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
        return ":".join(key_parts)

    def clear_cache(self):
        with self._lock:
            self._cache.clear()


class DegradationManager:
    """降级管理器

    A-P2-8: 降级阈值和策略支持从配置读取
    - 构造参数 config 可覆盖默认规则
    - 环境变量 DEGRADATION_CONFIG_JSON 可配置降级规则
    - 优先级：构造参数 > 环境变量 > 默认值
    """

    # 默认降级规则配置
    DEFAULT_RULES_CONFIG = {
        "network_latency": {
            "trigger": "network_latency",
            "threshold": 3000,
            "action": "degrade_to_local",
            "cooldown_seconds": 60,
        },
        "network_error": {
            "trigger": "network_error",
            "threshold": 0.2,
            "action": "enable_fallback",
            "cooldown_seconds": 30,
        },
        "timeout": {
            "trigger": "timeout",
            "threshold": 0.15,
            "action": "reduce_timeout",
            "cooldown_seconds": 45,
        },
        "service_unavailable": {
            "trigger": "service_unavailable",
            "threshold": 3,
            "action": "switch_to_offline",
            "cooldown_seconds": 120,
        },
    }

    # 默认网络监控阈值
    DEFAULT_NETWORK_CONFIG = {
        "latency_threshold_ms": 3000,
        "error_rate_threshold": 0.1,
        "window_size": 100,
    }

    # 默认熔断器配置
    DEFAULT_CIRCUIT_BREAKER_CONFIG = {
        "failure_threshold": 5,
        "success_threshold": 3,
        "timeout_seconds": 30,
    }

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        # A-P2-8: 从配置和环境变量合并设置
        merged_config = self._load_config(config)

        network_config = merged_config.get("network", self.DEFAULT_NETWORK_CONFIG)
        self.network_monitor = NetworkMonitor(
            window_size=network_config.get("window_size", 100),
            latency_threshold_ms=network_config.get("latency_threshold_ms", 3000),
            error_rate_threshold=network_config.get("error_rate_threshold", 0.1),
        )

        cb_config = merged_config.get("circuit_breaker", self.DEFAULT_CIRCUIT_BREAKER_CONFIG)
        self._cb_failure_threshold = cb_config.get("failure_threshold", 5)
        self._cb_success_threshold = cb_config.get("success_threshold", 3)
        self._cb_timeout_seconds = cb_config.get("timeout_seconds", 30)

        self.circuit_breakers: Dict[str, CircuitBreaker] = {}
        self.fallback_handler = FallbackHandler()

        self._current_level = ServiceLevel.FULL
        self._active_triggers: List[DegradationTrigger] = []
        self._degraded_features: List[str] = []
        self._rules: List[DegradationRule] = []
        self._service_health: Dict[str, ServiceHealth] = {}
        self._lock = threading.Lock()

        self._setup_rules(merged_config.get("rules", {}))

    def _load_config(self, user_config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """A-P2-8: 从环境变量和用户配置加载配置"""
        import os as _os

        merged = {
            "network": dict(self.DEFAULT_NETWORK_CONFIG),
            "circuit_breaker": dict(self.DEFAULT_CIRCUIT_BREAKER_CONFIG),
            "rules": dict(self.DEFAULT_RULES_CONFIG),
        }

        # 从环境变量加载
        env_config_json = _os.getenv("DEGRADATION_CONFIG_JSON")
        if env_config_json:
            try:
                env_config = json.loads(env_config_json)
                for section in ("network", "circuit_breaker", "rules"):
                    if section in env_config and isinstance(env_config[section], dict):
                        merged[section].update(env_config[section])
                logger.info("Loaded degradation config from environment variable")
            except (json.JSONDecodeError, TypeError) as e:
                logger.warning(f"Failed to parse DEGRADATION_CONFIG_JSON: {e}")

        # 用户配置优先级最高
        if user_config:
            for section in ("network", "circuit_breaker", "rules"):
                if section in user_config and isinstance(user_config[section], dict):
                    merged[section].update(user_config[section])

        return merged

    def _setup_rules(self, rules_config: Dict[str, Any]):
        """A-P2-8: 根据配置创建降级规则"""
        self._rules = []
        for rule_name, rule_data in rules_config.items():
            trigger_str = rule_data.get("trigger", "network_latency")
            try:
                trigger = DegradationTrigger(trigger_str)
            except ValueError:
                logger.warning(f"Unknown degradation trigger: {trigger_str}, skipping")
                continue

            self._rules.append(DegradationRule(
                trigger=trigger,
                threshold=rule_data.get("threshold", 3000),
                action=rule_data.get("action", "degrade_to_local"),
                cooldown_seconds=rule_data.get("cooldown_seconds", 60),
                auto_recover=rule_data.get("auto_recover", True),
            ))

    def register_service(
        self,
        service_name: str,
        fallback_handler: Optional[Callable] = None
    ):
        # A-P2-8: 使用可配置的熔断器参数
        self.circuit_breakers[service_name] = CircuitBreaker(
            failure_threshold=self._cb_failure_threshold,
            success_threshold=self._cb_success_threshold,
            timeout_seconds=self._cb_timeout_seconds,
        )
        self._service_health[service_name] = ServiceHealth(
            name=service_name,
            is_available=True,
            latency_ms=0,
            error_rate=0,
            last_check=datetime.now()
        )

        if fallback_handler:
            self.fallback_handler.register_handler(service_name, fallback_handler)

    def check_and_degrade(self) -> ServiceLevel:
        network_healthy, network_issue = self.network_monitor.is_network_healthy()

        with self._lock:
            if not network_healthy:
                if DegradationTrigger.NETWORK_LATENCY not in self._active_triggers:
                    self._active_triggers.append(DegradationTrigger.NETWORK_LATENCY)

            open_breakers = [
                name for name, breaker in self.circuit_breakers.items()
                if breaker.get_state() == CircuitBreaker.STATE_OPEN
            ]

            if len(open_breakers) >= len(self.circuit_breakers) * 0.5:
                if DegradationTrigger.SERVICE_UNAVAILABLE not in self._active_triggers:
                    self._active_triggers.append(DegradationTrigger.SERVICE_UNAVAILABLE)

            self._update_service_level()

            return self._current_level

    def _update_service_level(self):
        if not self._active_triggers:
            self._current_level = ServiceLevel.FULL
            self._degraded_features = []
        elif len(self._active_triggers) == 1:
            self._current_level = ServiceLevel.DEGRADED
            self._degraded_features = self._get_degraded_features_for_level(ServiceLevel.DEGRADED)
        elif len(self._active_triggers) <= 3:
            self._current_level = ServiceLevel.MINIMAL
            self._degraded_features = self._get_degraded_features_for_level(ServiceLevel.MINIMAL)
        else:
            self._current_level = ServiceLevel.OFFLINE
            self._degraded_features = self._get_degraded_features_for_level(ServiceLevel.OFFLINE)

    def _get_degraded_features_for_level(self, level: ServiceLevel) -> List[str]:
        features_by_level = {
            ServiceLevel.FULL: [],
            ServiceLevel.DEGRADED: [
                "high_precision_segmentation",
                "advanced_trend_prediction",
                "detailed_aesthetic_scoring"
            ],
            ServiceLevel.MINIMAL: [
                "high_precision_segmentation",
                "advanced_trend_prediction",
                "detailed_aesthetic_scoring",
                "collaborative_filtering",
                "knowledge_graph"
            ],
            ServiceLevel.OFFLINE: [
                "high_precision_segmentation",
                "advanced_trend_prediction",
                "detailed_aesthetic_scoring",
                "collaborative_filtering",
                "knowledge_graph",
                "virtual_tryon",
                "visual_search"
            ],
        }
        return features_by_level.get(level, [])

    async def execute_with_fallback(
        self,
        service_name: str,
        primary_handler: Callable,
        *args,
        **kwargs
    ) -> Tuple[Any, Dict[str, Any]]:
        start_time = time.time()
        execution_info = {
            "service": service_name,
            "used_fallback": False,
            "level": self._current_level.value,
            "latency_ms": 0
        }

        circuit_breaker = self.circuit_breakers.get(service_name)

        if circuit_breaker and not circuit_breaker.can_execute():
            result, success = self.fallback_handler.execute(service_name, *args, **kwargs)
            execution_info["used_fallback"] = True
            execution_info["fallback_success"] = success
            execution_info["latency_ms"] = (time.time() - start_time) * 1000
            return result, execution_info

        if self._current_level in [ServiceLevel.MINIMAL, ServiceLevel.OFFLINE]:
            if service_name in self._degraded_features:
                result, success = self.fallback_handler.execute(service_name, *args, **kwargs)
                execution_info["used_fallback"] = True
                execution_info["fallback_success"] = success
                execution_info["latency_ms"] = (time.time() - start_time) * 1000
                return result, execution_info

        try:
            if asyncio.iscoroutinefunction(primary_handler):
                result = await primary_handler(*args, **kwargs)
            else:
                result = primary_handler(*args, **kwargs)

            latency_ms = (time.time() - start_time) * 1000
            self.network_monitor.record_request(latency_ms, True)

            if circuit_breaker:
                circuit_breaker.record_success()

            self._update_service_health(service_name, latency_ms, True)

            execution_info["latency_ms"] = latency_ms
            return result, execution_info

        except Exception as e:
            latency_ms = (time.time() - start_time) * 1000
            self.network_monitor.record_request(latency_ms, False, str(type(e).__name__))

            if circuit_breaker:
                circuit_breaker.record_failure()

            self._update_service_health(service_name, latency_ms, False)

            result, success = self.fallback_handler.execute(service_name, *args, **kwargs)
            execution_info["used_fallback"] = True
            execution_info["fallback_success"] = success
            execution_info["error"] = str(e)
            execution_info["latency_ms"] = latency_ms

            return result, execution_info

    def _update_service_health(
        self,
        service_name: str,
        latency_ms: float,
        success: bool
    ):
        with self._lock:
            if service_name in self._service_health:
                health = self._service_health[service_name]
                health.latency_ms = latency_ms
                health.last_check = datetime.now()

                if success:
                    health.consecutive_failures = 0
                    health.consecutive_successes += 1
                    health.is_available = True
                else:
                    health.consecutive_successes = 0
                    health.consecutive_failures += 1
                    if health.consecutive_failures >= 3:
                        health.is_available = False

    def recover(self, strategy: RecoveryStrategy = RecoveryStrategy.GRADUAL):
        with self._lock:
            if strategy == RecoveryStrategy.IMMEDIATE:
                self._active_triggers = []
                self._current_level = ServiceLevel.FULL
                for breaker in self.circuit_breakers.values():
                    breaker.reset()

            elif strategy == RecoveryStrategy.GRADUAL:
                if self._active_triggers:
                    self._active_triggers.pop(0)
                self._update_service_level()

            elif strategy == RecoveryStrategy.PROACTIVE:
                for name, breaker in self.circuit_breakers.items():
                    if breaker.get_state() == CircuitBreaker.STATE_OPEN:
                        breaker.reset()
                self._active_triggers = []
                self._current_level = ServiceLevel.FULL

    def get_status(self) -> Dict[str, Any]:
        with self._lock:
            return {
                "current_level": self._current_level.value,
                "active_triggers": [t.value for t in self._active_triggers],
                "degraded_features": self._degraded_features,
                "network_stats": self.network_monitor.get_stats(),
                "circuit_breakers": {
                    name: breaker.get_state()
                    for name, breaker in self.circuit_breakers.items()
                },
                "service_health": {
                    name: {
                        "available": health.is_available,
                        "latency_ms": health.latency_ms,
                        "consecutive_failures": health.consecutive_failures
                    }
                    for name, health in self._service_health.items()
                },
                "degradation_stats": self.fallback_handler.get_degradation_stats()
            }

    def get_degradation_events(
        self,
        service_name: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get recent degradation events for monitoring."""
        return self.fallback_handler.get_degradation_events(service_name, limit)

    def force_degrade(
        self,
        level: ServiceLevel,
        reason: str = "Manual degradation"
    ):
        with self._lock:
            self._current_level = level
            self._active_triggers.append(DegradationTrigger.MANUAL)
            self._degraded_features = self._get_degraded_features_for_level(level)


class AdaptiveDegradationStrategy:
    """自适应降级策略"""

    def __init__(self, degradation_manager: DegradationManager):
        self.manager = degradation_manager
        self._history: List[Dict[str, Any]] = []
        self._learning_rate = 0.1

    def analyze_and_adjust(self):
        stats = self.manager.network_monitor.get_stats()
        current_level = self.manager._current_level

        self._history.append({
            "timestamp": datetime.now().isoformat(),
            "stats": stats,
            "level": current_level.value
        })

        if len(self._history) > 100:
            self._history = self._history[-100:]

        if stats["error_rate"] > 0.3 and current_level != ServiceLevel.OFFLINE:
            self.manager.force_degrade(ServiceLevel.OFFLINE, "High error rate detected")
        elif stats["error_rate"] > 0.15 and current_level == ServiceLevel.FULL:
            self.manager.force_degrade(ServiceLevel.DEGRADED, "Moderate error rate")
        elif stats["avg_latency_ms"] > 5000 and current_level == ServiceLevel.FULL:
            self.manager.force_degrade(ServiceLevel.DEGRADED, "High latency detected")

    def predict_degradation_need(self) -> Dict[str, Any]:
        if len(self._history) < 10:
            return {"prediction": "insufficient_data"}

        recent = self._history[-10:]
        error_rates = [h["stats"]["error_rate"] for h in recent]
        latencies = [h["stats"]["avg_latency_ms"] for h in recent]

        error_trend = self._calculate_trend(error_rates)
        latency_trend = self._calculate_trend(latencies)

        prediction = {
            "error_trend": "increasing" if error_trend > 0.01 else "stable",
            "latency_trend": "increasing" if latency_trend > 100 else "stable",
            "recommendation": None
        }

        if error_trend > 0.02 or latency_trend > 500:
            prediction["recommendation"] = "proactive_degradation"
        elif error_trend < -0.01 and latency_trend < -100:
            prediction["recommendation"] = "proactive_recovery"

        return prediction

    def _calculate_trend(self, values: List[float]) -> float:
        if len(values) < 2:
            return 0

        n = len(values)
        x = list(range(n))
        y = values

        x_mean = sum(x) / n
        y_mean = sum(y) / n

        numerator = sum((x[i] - x_mean) * (y[i] - y_mean) for i in range(n))
        denominator = sum((x[i] - x_mean) ** 2 for i in range(n))

        if denominator == 0:
            return 0

        return numerator / denominator


def create_degradation_manager() -> DegradationManager:
    manager = DegradationManager()

    def body_metrics_fallback(data: Dict) -> Dict:
        return {
            "bmi": data.get("weight", 65) / ((data.get("height", 170) / 100) ** 2),
            "body_type": "rectangle",
            "confidence": 0.5,
            "fallback": True
        }

    def style_recognition_fallback(image_data: Any) -> Dict:
        return {
            "style": "casual",
            "confidence": 0.4,
            "fallback": True
        }

    def recommendation_fallback(user_id: str) -> Dict:
        return {
            "items": [],
            "reason": "Popular items",
            "fallback": True
        }

    manager.register_service("body_metrics", body_metrics_fallback)
    manager.register_service("style_recognition", style_recognition_fallback)
    manager.register_service("recommendation", recommendation_fallback)
    manager.register_service("virtual_tryon")
    manager.register_service("visual_search")

    return manager


if __name__ == "__main__":
    async def main():
        manager = create_degradation_manager()
        adaptive = AdaptiveDegradationStrategy(manager)

        print("\n" + "="*60)
        print("服务降级策略已初始化")
        print("="*60)

        print("\n初始状态:")
        print(json.dumps(manager.get_status(), indent=2, default=str))

        print("\n模拟网络延迟:")
        for i in range(5):
            manager.network_monitor.record_request(3500 + i * 500, True)

        level = manager.check_and_degrade()
        print(f"当前服务级别: {level.value}")

        print("\n模拟服务错误:")
        for i in range(5):
            manager.network_monitor.record_request(100, False, "ConnectionError")

        level = manager.check_and_degrade()
        print(f"当前服务级别: {level.value}")

        print("\n执行带降级的请求:")
        async def primary_service(data):
            await asyncio.sleep(0.1)
            return {"result": "primary", "data": data}

        result, info = await manager.execute_with_fallback(
            "body_metrics",
            primary_service,
            {"height": 175, "weight": 70}
        )
        print(f"结果: {result}")
        print(f"执行信息: {json.dumps(info, indent=2)}")

        print("\n自适应分析:")
        adaptive.analyze_and_adjust()
        prediction = adaptive.predict_degradation_need()
        print(f"预测: {json.dumps(prediction, indent=2)}")

        print("\n恢复服务:")
        manager.recover(RecoveryStrategy.GRADUAL)
        print(f"恢复后级别: {manager._current_level.value}")

    asyncio.run(main())
