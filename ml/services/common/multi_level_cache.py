"""
多级缓存系统
支持内存缓存、本地磁盘缓存、分布式缓存的多层架构
智能缓存策略，减少重复计算，提升响应速度

NOTE: KMP_DUPLICATE_LIB_OK removed - ensure clean OpenMP environment
"""

import os

# Removed: os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'
# This workaround was causing runtime instability.

import json
import hashlib
import pickle
import threading
import time
from typing import Dict, List, Optional, Any, Tuple, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from collections import OrderedDict
import numpy as np


class CacheLevel(Enum):
    L1_MEMORY = "l1_memory"
    L2_DISK = "l2_disk"
    L3_DISTRIBUTED = "l3_distributed"


class CacheStrategy(Enum):
    LRU = "lru"
    LFU = "lfu"
    FIFO = "fifo"
    TTL = "ttl"
    ADAPTIVE = "adaptive"


class EvictionPolicy(Enum):
    TIME_BASED = "time_based"
    SIZE_BASED = "size_based"
    PRIORITY_BASED = "priority_based"
    HYBRID = "hybrid"


@dataclass
class CacheEntry:
    key: str
    value: Any
    created_at: datetime
    expires_at: Optional[datetime]
    access_count: int = 0
    last_accessed: datetime = field(default_factory=datetime.now)
    size_bytes: int = 0
    priority: int = 5
    tags: List[str] = field(default_factory=list)
    computation_cost: float = 1.0


@dataclass
class CacheStats:
    hits: int = 0
    misses: int = 0
    evictions: int = 0
    total_size_bytes: int = 0
    entry_count: int = 0

    @property
    def hit_rate(self) -> float:
        total = self.hits + self.misses
        return self.hits / total if total > 0 else 0


@dataclass
class CacheConfig:
    max_size_mb: int = 100
    max_entries: int = 10000
    default_ttl_seconds: int = 3600
    eviction_policy: EvictionPolicy = EvictionPolicy.HYBRID
    enable_compression: bool = True
    enable_persistence: bool = True
    persistence_path: str = "cache"


class MemoryCache:
    """L1 内存缓存"""

    def __init__(self, config: CacheConfig):
        self.config = config
        self._cache: OrderedDict[str, CacheEntry] = OrderedDict()
        self._lock = threading.RLock()
        self._stats = CacheStats()
        self._access_times: Dict[str, List[datetime]] = {}

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            if key not in self._cache:
                self._stats.misses += 1
                return None

            entry = self._cache[key]

            if entry.expires_at and datetime.now() > entry.expires_at:
                self._evict(key)
                self._stats.misses += 1
                return None

            entry.access_count += 1
            entry.last_accessed = datetime.now()

            self._cache.move_to_end(key)

            if key not in self._access_times:
                self._access_times[key] = []
            self._access_times[key].append(datetime.now())

            self._stats.hits += 1
            return entry.value

    def set(
        self,
        key: str,
        value: Any,
        ttl_seconds: Optional[int] = None,
        priority: int = 5,
        tags: List[str] = None,
        computation_cost: float = 1.0
    ) -> bool:
        with self._lock:
            ttl = ttl_seconds or self.config.default_ttl_seconds
            expires_at = datetime.now() + timedelta(seconds=ttl) if ttl > 0 else None

            size_bytes = self._estimate_size(value)

            entry = CacheEntry(
                key=key,
                value=value,
                created_at=datetime.now(),
                expires_at=expires_at,
                size_bytes=size_bytes,
                priority=priority,
                tags=tags or [],
                computation_cost=computation_cost
            )

            if key in self._cache:
                old_entry = self._cache[key]
                self._stats.total_size_bytes -= old_entry.size_bytes
                del self._cache[key]

            while self._should_evict(size_bytes):
                if not self._evict_one():
                    return False

            self._cache[key] = entry
            self._stats.total_size_bytes += size_bytes
            self._stats.entry_count = len(self._cache)

            return True

    def delete(self, key: str) -> bool:
        with self._lock:
            if key in self._cache:
                self._evict(key)
                return True
            return False

    def clear(self):
        with self._lock:
            self._cache.clear()
            self._access_times.clear()
            self._stats = CacheStats()

    def get_stats(self) -> CacheStats:
        with self._lock:
            return CacheStats(
                hits=self._stats.hits,
                misses=self._stats.misses,
                evictions=self._stats.evictions,
                total_size_bytes=self._stats.total_size_bytes,
                entry_count=len(self._cache)
            )

    def _should_evict(self, new_size: int) -> bool:
        max_size_bytes = self.config.max_size_mb * 1024 * 1024
        return (
            len(self._cache) >= self.config.max_entries or
            self._stats.total_size_bytes + new_size > max_size_bytes
        )

    def _evict_one(self) -> bool:
        if not self._cache:
            return False

        key_to_evict = self._select_eviction_candidate()
        if key_to_evict:
            self._evict(key_to_evict)
            return True
        return False

    def _select_eviction_candidate(self) -> Optional[str]:
        if not self._cache:
            return None

        if self.config.eviction_policy == EvictionPolicy.TIME_BASED:
            expired = [
                k for k, v in self._cache.items()
                if v.expires_at and datetime.now() > v.expires_at
            ]
            if expired:
                return expired[0]
            return next(iter(self._cache))

        elif self.config.eviction_policy == EvictionPolicy.SIZE_BASED:
            return max(self._cache.keys(), key=lambda k: self._cache[k].size_bytes)

        elif self.config.eviction_policy == EvictionPolicy.PRIORITY_BASED:
            return min(self._cache.keys(), key=lambda k: self._cache[k].priority)

        else:
            def score(key: str) -> float:
                entry = self._cache[key]
                age = (datetime.now() - entry.created_at).total_seconds()
                recency = (datetime.now() - entry.last_accessed).total_seconds()
                return (
                    entry.priority * 0.3 +
                    (entry.access_count / max(age, 1)) * 0.3 +
                    (entry.computation_cost / max(recency, 1)) * 0.2 +
                    (1 / max(entry.size_bytes / 1024, 1)) * 0.2
                )

            return min(self._cache.keys(), key=score)

    def _evict(self, key: str):
        if key in self._cache:
            entry = self._cache[key]
            self._stats.total_size_bytes -= entry.size_bytes
            self._stats.evictions += 1
            del self._cache[key]
            if key in self._access_times:
                del self._access_times[key]

    def _estimate_size(self, value: Any) -> int:
        try:
            if isinstance(value, np.ndarray):
                return value.nbytes
            elif isinstance(value, (str, bytes)):
                return len(value)
            elif isinstance(value, (list, dict)):
                return len(pickle.dumps(value))
            else:
                return len(pickle.dumps(value))
        except Exception:
            return 1024

    def get_by_tags(self, tags: List[str]) -> List[Tuple[str, Any]]:
        with self._lock:
            results = []
            for key, entry in self._cache.items():
                if any(tag in entry.tags for tag in tags):
                    results.append((key, entry.value))
            return results

    def invalidate_by_tags(self, tags: List[str]) -> int:
        with self._lock:
            keys_to_delete = [
                key for key, entry in self._cache.items()
                if any(tag in entry.tags for tag in tags)
            ]
            for key in keys_to_delete:
                self._evict(key)
            return len(keys_to_delete)


class DiskCache:
    """L2 磁盘缓存"""

    def __init__(self, config: CacheConfig):
        self.config = config
        self.cache_dir = Path(config.persistence_path)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self._index: Dict[str, Dict] = {}
        self._lock = threading.RLock()
        self._stats = CacheStats()
        self._load_index()

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            if key not in self._index:
                self._stats.misses += 1
                return None

            entry_info = self._index[key]

            if entry_info.get("expires_at"):
                expires_at = datetime.fromisoformat(entry_info["expires_at"])
                if datetime.now() > expires_at:
                    self.delete(key)
                    self._stats.misses += 1
                    return None

            cache_file = self.cache_dir / f"{self._hash_key(key)}.cache"

            if not cache_file.exists():
                del self._index[key]
                self._stats.misses += 1
                return None

            try:
                with open(cache_file, "rb") as f:
                    import collections

                    class _RestrictedUnpickler(pickle.Unpickler):
                        """Only allow safe types from pickle to prevent code execution."""
                        _SAFE = {
                            "dict", "list", "tuple", "str", "int", "float",
                            "bool", "NoneType", "bytes", "set", "frozenset",
                            "OrderedDict", "_code", "mappingproxy",
                        }

                        def find_class(self, module, name):
                            if name in self._SAFE or f"{module}.{name}" in self._SAFE:
                                return super().find_class(module, name)
                            raise pickle.UnpicklingError(
                                f"Global '{module}.{name}' is blocked"
                            )

                    value = _RestrictedUnpickler(f).load()

                entry_info["access_count"] = entry_info.get("access_count", 0) + 1
                entry_info["last_accessed"] = datetime.now().isoformat()
                self._save_index()

                self._stats.hits += 1
                return value

            except Exception:
                self.delete(key)
                self._stats.misses += 1
                return None

    def set(
        self,
        key: str,
        value: Any,
        ttl_seconds: Optional[int] = None,
        priority: int = 5,
        tags: List[str] = None
    ) -> bool:
        with self._lock:
            ttl = ttl_seconds or self.config.default_ttl_seconds
            expires_at = (datetime.now() + timedelta(seconds=ttl)).isoformat() if ttl > 0 else None

            cache_file = self.cache_dir / f"{self._hash_key(key)}.cache"

            try:
                with open(cache_file, "wb") as f:
                    pickle.dump(value, f)

                size_bytes = cache_file.stat().st_size

                self._index[key] = {
                    "file": str(cache_file),
                    "created_at": datetime.now().isoformat(),
                    "expires_at": expires_at,
                    "access_count": 0,
                    "last_accessed": datetime.now().isoformat(),
                    "size_bytes": size_bytes,
                    "priority": priority,
                    "tags": tags or []
                }

                self._save_index()
                self._stats.entry_count = len(self._index)
                self._stats.total_size_bytes = sum(
                    info.get("size_bytes", 0) for info in self._index.values()
                )

                return True

            except Exception:
                return False

    def delete(self, key: str) -> bool:
        with self._lock:
            if key not in self._index:
                return False

            entry_info = self._index[key]
            cache_file = Path(entry_info.get("file", ""))

            if cache_file.exists():
                try:
                    cache_file.unlink()
                except Exception:
                    pass

            del self._index[key]
            self._save_index()
            return True

    def clear(self):
        with self._lock:
            for key in list(self._index.keys()):
                self.delete(key)
            self._stats = CacheStats()

    def get_stats(self) -> CacheStats:
        with self._lock:
            return CacheStats(
                hits=self._stats.hits,
                misses=self._stats.misses,
                evictions=self._stats.evictions,
                total_size_bytes=self._stats.total_size_bytes,
                entry_count=len(self._index)
            )

    def _hash_key(self, key: str) -> str:
        return hashlib.md5(key.encode()).hexdigest()

    def _load_index(self):
        index_file = self.cache_dir / "index.json"
        if index_file.exists():
            try:
                with open(index_file, "r") as f:
                    self._index = json.load(f)
            except Exception:
                self._index = {}

    def _save_index(self):
        index_file = self.cache_dir / "index.json"
        try:
            with open(index_file, "w") as f:
                json.dump(self._index, f, indent=2)
        except Exception:
            pass


class MultiLevelCache:
    """多级缓存系统"""

    def __init__(self, config: CacheConfig = None):
        self.config = config or CacheConfig()
        self.l1_cache = MemoryCache(self.config)
        self.l2_cache = DiskCache(self.config)

        self._prefetch_queue: List[str] = []
        self._warmup_keys: List[str] = []
        self._lock = threading.Lock()

        # Cache invalidation tracking
        self._invalidation_history: List[Dict[str, Any]] = []
        self._max_history = 1000

        # Hit rate tracking with time windows
        self._hit_rate_windows: Dict[str, List[Tuple[datetime, bool]]] = {}
        self._window_size_seconds = 60  # 1-minute windows

    def get(
        self,
        key: str,
        fetch_func: Optional[Callable] = None
    ) -> Optional[Any]:
        value = self.l1_cache.get(key)
        if value is not None:
            self._record_hit_rate(key, True)
            return value

        value = self.l2_cache.get(key)
        if value is not None:
            self.l1_cache.set(key, value)
            self._record_hit_rate(key, True)
            return value

        self._record_hit_rate(key, False)

        if fetch_func:
            try:
                value = fetch_func()
                if value is not None:
                    self.set(key, value)
                return value
            except Exception:
                return None

        return None

    def set(
        self,
        key: str,
        value: Any,
        ttl_seconds: Optional[int] = None,
        priority: int = 5,
        tags: List[str] = None,
        computation_cost: float = 1.0
    ):
        self.l1_cache.set(
            key, value, ttl_seconds, priority, tags, computation_cost
        )

        if self.config.enable_persistence:
            self.l2_cache.set(key, value, ttl_seconds, priority, tags)

    def delete(self, key: str):
        self.l1_cache.delete(key)
        self.l2_cache.delete(key)
        self._record_invalidation(key, "manual_delete")

    def clear(self):
        self.l1_cache.clear()
        self.l2_cache.clear()
        self._record_invalidation("all", "clear_all")

    def get_stats(self) -> Dict[str, CacheStats]:
        return {
            "l1_memory": self.l1_cache.get_stats(),
            "l2_disk": self.l2_cache.get_stats(),
        }

    def get_combined_stats(self) -> Dict[str, Any]:
        l1_stats = self.l1_cache.get_stats()
        l2_stats = self.l2_cache.get_stats()

        total_hits = l1_stats.hits + l2_stats.hits
        total_misses = l1_stats.misses + l2_stats.misses

        return {
            "total_hits": total_hits,
            "total_misses": total_misses,
            "overall_hit_rate": total_hits / (total_hits + total_misses) if (total_hits + total_misses) > 0 else 0,
            "l1_hit_rate": l1_stats.hit_rate,
            "l2_hit_rate": l2_stats.hit_rate,
            "l1_size_mb": l1_stats.total_size_bytes / (1024 * 1024),
            "l2_size_mb": l2_stats.total_size_bytes / (1024 * 1024),
            "l1_entries": l1_stats.entry_count,
            "l2_entries": l2_stats.entry_count,
        }

    def get_hit_rate_by_time_window(
        self,
        window_minutes: int = 5
    ) -> Dict[str, Any]:
        """Get hit rate statistics for a specific time window."""
        cutoff_time = datetime.now() - timedelta(minutes=window_minutes)

        total_requests = 0
        total_hits = 0

        with self._lock:
            for key, requests in self._hit_rate_windows.items():
                recent_requests = [
                    (t, hit) for t, hit in requests
                    if t > cutoff_time
                ]
                total_requests += len(recent_requests)
                total_hits += sum(1 for _, hit in recent_requests if hit)

        hit_rate = total_hits / total_requests if total_requests > 0 else 0

        return {
            "window_minutes": window_minutes,
            "total_requests": total_requests,
            "total_hits": total_hits,
            "total_misses": total_requests - total_hits,
            "hit_rate": hit_rate,
            "requests_per_minute": total_requests / window_minutes if window_minutes > 0 else 0
        }

    def get_top_keys_by_access(
        self,
        limit: int = 10,
        window_minutes: int = 60
    ) -> List[Dict[str, Any]]:
        """Get top accessed keys in a time window."""
        cutoff_time = datetime.now() - timedelta(minutes=window_minutes)

        key_access_counts: Dict[str, int] = {}

        with self._lock:
            for key, requests in self._hit_rate_windows.items():
                recent_requests = [
                    (t, hit) for t, hit in requests
                    if t > cutoff_time
                ]
                key_access_counts[key] = len(recent_requests)

        sorted_keys = sorted(
            key_access_counts.items(),
            key=lambda x: x[1],
            reverse=True
        )[:limit]

        return [
            {"key": key, "access_count": count}
            for key, count in sorted_keys
        ]

    def _record_hit_rate(self, key: str, is_hit: bool):
        """Record hit/miss for rate calculation."""
        with self._lock:
            if key not in self._hit_rate_windows:
                self._hit_rate_windows[key] = []

            self._hit_rate_windows[key].append((datetime.now(), is_hit))

            # Clean old entries
            cutoff_time = datetime.now() - timedelta(hours=1)
            self._hit_rate_windows[key] = [
                (t, hit) for t, hit in self._hit_rate_windows[key]
                if t > cutoff_time
            ]

            # Limit number of tracked keys
            if len(self._hit_rate_windows) > 10000:
                # Remove keys with least recent access
                oldest_keys = sorted(
                    self._hit_rate_windows.keys(),
                    key=lambda k: self._hit_rate_windows[k][-1][0] if self._hit_rate_windows[k] else datetime.min
                )[:len(self._hit_rate_windows) - 5000]
                for k in oldest_keys:
                    del self._hit_rate_windows[k]

    def _record_invalidation(self, key: str, reason: str):
        """Record cache invalidation event."""
        event = {
            "timestamp": datetime.now().isoformat(),
            "key": key,
            "reason": reason
        }

        with self._lock:
            self._invalidation_history.append(event)
            if len(self._invalidation_history) > self._max_history:
                self._invalidation_history = self._invalidation_history[-self._max_history:]

    def get_invalidation_history(
        self,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get recent invalidation events."""
        with self._lock:
            return self._invalidation_history[-limit:]

    def invalidate_by_pattern(self, pattern: str) -> int:
        """Invalidate cache entries matching a pattern."""
        import fnmatch

        invalidated = 0

        # Get all keys from L1 cache
        with self.l1_cache._lock:
            keys_to_invalidate = [
                k for k in self.l1_cache._cache.keys()
                if fnmatch.fnmatch(k, pattern)
            ]

        for key in keys_to_invalidate:
            self.delete(key)
            invalidated += 1

        return invalidated

    def invalidate_by_ttl_expiry(self) -> int:
        """Force invalidation of expired entries."""
        expired_count = 0
        now = datetime.now()

        # Check L1 cache for expired entries
        with self.l1_cache._lock:
            expired_keys = [
                k for k, v in self.l1_cache._cache.items()
                if v.expires_at and now > v.expires_at
            ]

        for key in expired_keys:
            self.delete(key)
            expired_count += 1

        return expired_count

    def prefetch(self, keys: List[str], fetch_func: Callable[[str], Any]):
        for key in keys:
            if self.l1_cache.get(key) is None and self.l2_cache.get(key) is None:
                try:
                    value = fetch_func(key)
                    if value is not None:
                        self.set(key, value, priority=3)
                except Exception:
                    pass

    def warmup(self, key_value_pairs: Dict[str, Any]):
        for key, value in key_value_pairs.items():
            self.set(key, value, priority=8, ttl_seconds=86400)

    def invalidate_by_tags(self, tags: List[str]) -> int:
        count = self.l1_cache.invalidate_by_tags(tags)
        return count

    def get_or_compute(
        self,
        key: str,
        compute_func: Callable[[], Any],
        ttl_seconds: Optional[int] = None,
        computation_cost: float = 1.0
    ) -> Any:
        value = self.get(key)
        if value is not None:
            return value

        start_time = time.time()
        value = compute_func()
        actual_cost = time.time() - start_time

        self.set(
            key,
            value,
            ttl_seconds=ttl_seconds,
            computation_cost=max(computation_cost, actual_cost)
        )

        return value


class CacheDecorator:
    """缓存装饰器"""

    def __init__(self, cache: MultiLevelCache):
        self.cache = cache

    def cached(
        self,
        key_prefix: str = "",
        ttl_seconds: int = 3600,
        tags: List[str] = None
    ):
        def decorator(func: Callable) -> Callable:
            def wrapper(*args, **kwargs):
                key = self._generate_key(key_prefix, func.__name__, args, kwargs)

                result = self.cache.get(key)
                if result is not None:
                    return result

                result = func(*args, **kwargs)

                if result is not None:
                    self.cache.set(
                        key,
                        result,
                        ttl_seconds=ttl_seconds,
                        tags=tags
                    )

                return result

            return wrapper
        return decorator

    def _generate_key(
        self,
        prefix: str,
        func_name: str,
        args: tuple,
        kwargs: dict
    ) -> str:
        key_parts = [prefix, func_name]
        key_parts.extend(str(arg) for arg in args)
        key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
        return ":".join(key_parts)


class SmartCacheManager:
    """智能缓存管理器"""

    def __init__(self, cache: MultiLevelCache):
        self.cache = cache
        self._access_patterns: Dict[str, List[datetime]] = {}
        self._lock = threading.Lock()

    def analyze_access_patterns(self) -> Dict[str, Any]:
        with self._lock:
            if not self._access_patterns:
                return {"patterns": "no_data"}

            analysis = {
                "total_keys": len(self._access_patterns),
                "hot_keys": [],
                "cold_keys": [],
                "periodic_keys": [],
            }

            now = datetime.now()

            for key, accesses in self._access_patterns.items():
                if not accesses:
                    continue

                recent_accesses = [
                    a for a in accesses
                    if (now - a).total_seconds() < 3600
                ]

                if len(recent_accesses) >= 10:
                    analysis["hot_keys"].append(key)
                elif len(recent_accesses) == 0:
                    analysis["cold_keys"].append(key)

            return analysis

    def optimize_cache(self):
        patterns = self.analyze_access_patterns()

        for key in patterns.get("cold_keys", []):
            self.cache.delete(key)

    def record_access(self, key: str):
        with self._lock:
            if key not in self._access_patterns:
                self._access_patterns[key] = []
            self._access_patterns[key].append(datetime.now())

            if len(self._access_patterns[key]) > 100:
                self._access_patterns[key] = self._access_patterns[key][-100:]


def create_cache_system(
    max_size_mb: int = 100,
    persistence_path: str = "cache"
) -> MultiLevelCache:
    config = CacheConfig(
        max_size_mb=max_size_mb,
        persistence_path=persistence_path,
        enable_persistence=True
    )
    return MultiLevelCache(config)


if __name__ == "__main__":
    cache = create_cache_system(max_size_mb=50, persistence_path="cache")

    print("\n" + "="*60)
    print("多级缓存系统已初始化")
    print("="*60)

    print("\n测试基本缓存操作:")
    cache.set("user:123:profile", {"name": "张三", "age": 25}, tags=["user", "profile"])
    cache.set("recommendation:123", ["item1", "item2", "item3"], ttl_seconds=300)

    result = cache.get("user:123:profile")
    print(f"获取用户资料: {result}")

    result = cache.get("recommendation:123")
    print(f"获取推荐: {result}")

    print("\n测试缓存未命中:")
    result = cache.get("nonexistent:key")
    print(f"不存在的键: {result}")

    print("\n测试get_or_compute:")
    def expensive_computation():
        print("  执行昂贵计算...")
        time.sleep(0.1)
        return {"computed": True, "timestamp": datetime.now().isoformat()}

    result1 = cache.get_or_compute("compute:test", expensive_computation)
    print(f"首次计算: {result1}")

    result2 = cache.get_or_compute("compute:test", expensive_computation)
    print(f"缓存命中: {result2}")

    print("\n缓存统计:")
    stats = cache.get_combined_stats()
    print(json.dumps(stats, indent=2))

    print("\n测试标签失效:")
    cache.set("style:casual", {"popular": True}, tags=["style", "trending"])
    cache.set("style:formal", {"popular": False}, tags=["style"])
    count = cache.invalidate_by_tags(["trending"])
    print(f"失效标签条目数: {count}")

    print("\n最终统计:")
    stats = cache.get_combined_stats()
    print(json.dumps(stats, indent=2))
