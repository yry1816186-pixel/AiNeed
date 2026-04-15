"""
Rate Limiter for LLM API Calls
Implements token bucket algorithm with async support.

A-P2-6: Added SlidingWindowRateLimiter using Redis sorted set
to eliminate fixed-window boundary burst issues.
"""

import asyncio
import time
import logging
from typing import Optional, Dict, Any
from dataclasses import dataclass
from datetime import datetime
import threading

logger = logging.getLogger(__name__)


@dataclass
class RateLimitConfig:
    requests_per_minute: int = 60
    tokens_per_minute: int = 100000
    min_interval_ms: int = 100
    burst_size: int = 10


class TokenBucketRateLimiter:
    """
    Token Bucket Rate Limiter

    Features:
    - Request rate limiting
    - Token rate limiting
    - Burst handling
    - Async support
    """

    def __init__(self, config: Optional[RateLimitConfig] = None):
        self.config = config or RateLimitConfig()
        self._request_tokens = float(self.config.requests_per_minute)
        self._token_tokens = float(self.config.tokens_per_minute)
        self._last_refill = time.time()
        self._lock = asyncio.Lock()
        self._last_request_time = 0.0
        self._request_count = 0
        self._token_count = 0

    async def acquire(self, tokens: int = 1) -> bool:
        """
        Acquire permission to make a request.

        Args:
            tokens: Number of tokens consumed by the request

        Returns:
            True if request is allowed, False if rate limited
        """
        async with self._lock:
            now = time.time()
            elapsed = now - self._last_refill

            self._request_tokens = min(
                self.config.requests_per_minute,
                self._request_tokens + elapsed * (self.config.requests_per_minute / 60.0)
            )
            self._token_tokens = min(
                self.config.tokens_per_minute,
                self._token_tokens + elapsed * (self.config.tokens_per_minute / 60.0)
            )
            self._last_refill = now

            min_interval = self.config.min_interval_ms / 1000.0
            if now - self._last_request_time < min_interval:
                await asyncio.sleep(min_interval - (now - self._last_request_time))

            if self._request_tokens >= 1 and self._token_tokens >= tokens:
                self._request_tokens -= 1
                self._token_tokens -= tokens
                self._last_request_time = time.time()
                self._request_count += 1
                self._token_count += tokens
                return True

            logger.warning(
                f"Rate limit reached: requests={self._request_tokens:.1f}, "
                f"tokens={self._token_tokens:.1f}"
            )
            return False

    async def wait_and_acquire(self, tokens: int = 1, max_wait_ms: int = 30000) -> bool:
        """
        Wait for permission if rate limited.

        Args:
            tokens: Number of tokens needed
            max_wait_ms: Maximum wait time in milliseconds

        Returns:
            True if acquired, False if timeout
        """
        start_time = time.time()
        max_wait_seconds = max_wait_ms / 1000.0

        while True:
            if await self.acquire(tokens):
                return True

            elapsed = time.time() - start_time
            if elapsed >= max_wait_seconds:
                logger.error(f"Rate limit wait timeout after {elapsed:.1f}s")
                return False

            wait_time = min(1.0, max_wait_seconds - elapsed)
            await asyncio.sleep(wait_time)

    def get_stats(self) -> Dict[str, Any]:
        return {
            "requests_available": self._request_tokens,
            "tokens_available": self._token_tokens,
            "total_requests": self._request_count,
            "total_tokens": self._token_count,
            "config": {
                "requests_per_minute": self.config.requests_per_minute,
                "tokens_per_minute": self.config.tokens_per_minute,
            }
        }


class SlidingWindowRateLimiter:
    """
    A-P2-6: 滑动窗口限流器

    使用 Redis sorted set 实现滑动窗口算法，消除固定窗口边界突发问题。

    原理：
    - 每次请求在 Redis sorted set 中添加一条记录，score 为时间戳
    - 检查限流时，先清除窗口外的旧记录，再统计窗口内的请求数
    - 窗口大小为 60 秒，限制为 requests_per_minute

    优势：
    - 消除固定窗口边界处的突发问题（两个相邻窗口边界处不会出现 2x 突发）
    - 精确控制任意 60 秒内的请求数
    - 支持 Redis 持久化，多实例共享限流状态
    """

    def __init__(
        self,
        redis_client=None,
        key_prefix: str = "rate_limit",
        requests_per_minute: int = 60,
        tokens_per_minute: int = 100000,
        min_interval_ms: int = 100,
    ):
        """
        Args:
            redis_client: Redis 异步客户端实例。如果为 None，降级为本地滑动窗口。
            key_prefix: Redis key 前缀
            requests_per_minute: 每分钟最大请求数
            tokens_per_minute: 每分钟最大 token 数
            min_interval_ms: 请求最小间隔（毫秒）
        """
        self._redis = redis_client
        self._key_prefix = key_prefix
        self._requests_per_minute = requests_per_minute
        self._tokens_per_minute = tokens_per_minute
        self._min_interval_ms = min_interval_ms
        self._window_seconds = 60

        # 本地降级存储（无 Redis 时使用）
        self._local_request_times: list = []
        self._local_token_usage: list = []  # [(timestamp, tokens)]
        self._local_lock = asyncio.Lock()
        self._last_request_time = 0.0
        self._request_count = 0
        self._token_count = 0

    def _get_request_key(self, provider: str) -> str:
        return f"{self._key_prefix}:{provider}:requests"

    def _get_token_key(self, provider: str) -> str:
        return f"{self._key_prefix}:{provider}:tokens"

    async def acquire(self, provider: str, tokens: int = 1) -> bool:
        """
        Acquire permission to make a request using sliding window.

        Args:
            provider: Provider name (e.g., "glm", "openai")
            tokens: Number of tokens consumed by the request

        Returns:
            True if request is allowed, False if rate limited
        """
        now = time.time()
        window_start = now - self._window_seconds

        # 最小间隔检查
        min_interval = self._min_interval_ms / 1000.0
        if now - self._last_request_time < min_interval:
            await asyncio.sleep(min_interval - (now - self._last_request_time))

        if self._redis:
            return await self._acquire_redis(provider, tokens, now, window_start)
        else:
            return await self._acquire_local(provider, tokens, now, window_start)

    async def _acquire_redis(
        self, provider: str, tokens: int, now: float, window_start: float
    ) -> bool:
        """Redis sorted set 滑动窗口实现"""
        try:
            request_key = self._get_request_key(provider)
            token_key = self._get_token_key(provider)

            # 使用 pipeline 保证原子性
            pipe = self._redis.pipeline()

            # 1. 清除窗口外的旧记录
            pipe.zremrangebyscore(request_key, "-inf", window_start)
            pipe.zremrangebyscore(token_key, "-inf", window_start)

            # 2. 统计当前窗口内的请求数和 token 数
            pipe.zcard(request_key)
            pipe.zcard(token_key)

            results = await pipe.execute()
            current_requests = results[2]
            # token_key 的 card 值是记录数，需要求和
            # 改用 zrange 获取窗口内所有 token 记录并求和
            token_records = await self._redis.zrangebyscore(
                token_key, window_start, "+inf", withscores=False
            )
            current_tokens = sum(float(t) for t in token_records) if token_records else 0

            # 3. 检查是否超限
            if current_requests >= self._requests_per_minute:
                logger.warning(
                    f"Sliding window rate limit: requests={current_requests}/{self._requests_per_minute}"
                )
                return False

            if current_tokens + tokens > self._tokens_per_minute:
                logger.warning(
                    f"Sliding window rate limit: tokens={current_tokens + tokens}/{self._tokens_per_minute}"
                )
                return False

            # 4. 添加当前请求记录
            member_request = f"{now}:{self._request_count}"
            member_token = str(tokens)

            pipe2 = self._redis.pipeline()
            pipe2.zadd(request_key, {member_request: now})
            pipe2.zadd(token_key, {member_token: now})
            # 设置 key 过期时间，避免残留数据
            pipe2.expire(request_key, self._window_seconds + 10)
            pipe2.expire(token_key, self._window_seconds + 10)
            await pipe2.execute()

            self._last_request_time = time.time()
            self._request_count += 1
            self._token_count += tokens
            return True

        except Exception as e:
            logger.warning(f"Redis sliding window error, falling back to local: {e}")
            return await self._acquire_local(provider, tokens, now, window_start)

    async def _acquire_local(
        self, provider: str, tokens: int, now: float, window_start: float
    ) -> bool:
        """本地内存滑动窗口实现（无 Redis 降级方案）"""
        async with self._local_lock:
            # 清除窗口外的旧记录
            self._local_request_times = [
                t for t in self._local_request_times if t > window_start
            ]
            self._local_token_usage = [
                (t, tok) for t, tok in self._local_token_usage if t > window_start
            ]

            # 统计当前窗口内的请求数和 token 数
            current_requests = len(self._local_request_times)
            current_tokens = sum(tok for _, tok in self._local_token_usage)

            # 检查是否超限
            if current_requests >= self._requests_per_minute:
                logger.warning(
                    f"Local sliding window rate limit: requests={current_requests}/{self._requests_per_minute}"
                )
                return False

            if current_tokens + tokens > self._tokens_per_minute:
                logger.warning(
                    f"Local sliding window rate limit: tokens={current_tokens + tokens}/{self._tokens_per_minute}"
                )
                return False

            # 添加当前请求记录
            self._local_request_times.append(now)
            self._local_token_usage.append((now, tokens))
            self._last_request_time = time.time()
            self._request_count += 1
            self._token_count += tokens
            return True

    async def wait_and_acquire(
        self, provider: str, tokens: int = 1, max_wait_ms: int = 30000
    ) -> bool:
        """
        Wait for permission if rate limited.

        Args:
            provider: Provider name
            tokens: Number of tokens needed
            max_wait_ms: Maximum wait time in milliseconds

        Returns:
            True if acquired, False if timeout
        """
        start_time = time.time()
        max_wait_seconds = max_wait_ms / 1000.0

        while True:
            if await self.acquire(provider, tokens):
                return True

            elapsed = time.time() - start_time
            if elapsed >= max_wait_seconds:
                logger.error(f"Sliding window rate limit wait timeout after {elapsed:.1f}s")
                return False

            wait_time = min(1.0, max_wait_seconds - elapsed)
            await asyncio.sleep(wait_time)

    def get_stats(self) -> Dict[str, Any]:
        return {
            "total_requests": self._request_count,
            "total_tokens": self._token_count,
            "algorithm": "sliding_window",
            "redis_enabled": self._redis is not None,
            "config": {
                "requests_per_minute": self._requests_per_minute,
                "tokens_per_minute": self._tokens_per_minute,
                "window_seconds": self._window_seconds,
            }
        }


class MultiProviderRateLimiter:
    """
    Rate limiter for multiple LLM providers.

    A-P2-6: 优先使用滑动窗口算法，当 Redis 可用时使用 Redis 实现，
    否则降级为本地内存滑动窗口或 Token Bucket。
    """

    _instance: Optional['MultiProviderRateLimiter'] = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self._initialized = True
        self._limiters: Dict[str, TokenBucketRateLimiter] = {}
        self._sliding_window_limiters: Dict[str, SlidingWindowRateLimiter] = {}
        self._redis_client = None

        # 尝试连接 Redis
        self._init_redis()

        # 初始化 Token Bucket 限流器（降级方案）
        self._limiters["glm"] = TokenBucketRateLimiter(RateLimitConfig(
            requests_per_minute=60,
            tokens_per_minute=100000,
            min_interval_ms=100
        ))

        self._limiters["openai"] = TokenBucketRateLimiter(RateLimitConfig(
            requests_per_minute=500,
            tokens_per_minute=200000,
            min_interval_ms=50
        ))

        # 初始化滑动窗口限流器（优先使用）
        self._init_sliding_window_limiters()

    def _init_redis(self):
        """尝试初始化 Redis 连接"""
        try:
            import os
            import redis.asyncio as aioredis

            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
            self._redis_client = aioredis.from_url(redis_url, decode_responses=True)
            logger.info("Redis client initialized for sliding window rate limiter")
        except ImportError:
            logger.info("redis.asyncio not available, using local sliding window")
            self._redis_client = None
        except Exception as e:
            logger.warning(f"Failed to initialize Redis for rate limiter: {e}")
            self._redis_client = None

    def _init_sliding_window_limiters(self):
        """初始化滑动窗口限流器"""
        self._sliding_window_limiters["glm"] = SlidingWindowRateLimiter(
            redis_client=self._redis_client,
            key_prefix="rate_limit:glm",
            requests_per_minute=60,
            tokens_per_minute=100000,
            min_interval_ms=100,
        )

        self._sliding_window_limiters["openai"] = SlidingWindowRateLimiter(
            redis_client=self._redis_client,
            key_prefix="rate_limit:openai",
            requests_per_minute=500,
            tokens_per_minute=200000,
            min_interval_ms=50,
        )

    def get_limiter(self, provider: str) -> TokenBucketRateLimiter:
        if provider not in self._limiters:
            self._limiters[provider] = TokenBucketRateLimiter()
        return self._limiters[provider]

    def get_sliding_window_limiter(self, provider: str) -> SlidingWindowRateLimiter:
        """获取滑动窗口限流器"""
        if provider not in self._sliding_window_limiters:
            self._sliding_window_limiters[provider] = SlidingWindowRateLimiter(
                redis_client=self._redis_client,
                key_prefix=f"rate_limit:{provider}",
                requests_per_minute=60,
                tokens_per_minute=100000,
                min_interval_ms=100,
            )
        return self._sliding_window_limiters[provider]

    async def acquire(self, provider: str, tokens: int = 1) -> bool:
        # A-P2-6: 优先使用滑动窗口
        limiter = self.get_sliding_window_limiter(provider)
        return await limiter.acquire(provider, tokens)

    async def wait_and_acquire(self, provider: str, tokens: int = 1, max_wait_ms: int = 30000) -> bool:
        # A-P2-6: 优先使用滑动窗口
        limiter = self.get_sliding_window_limiter(provider)
        return await limiter.wait_and_acquire(provider, tokens, max_wait_ms)

    def get_all_stats(self) -> Dict[str, Dict[str, Any]]:
        stats = {}
        for name, limiter in self._sliding_window_limiters.items():
            stats[name] = limiter.get_stats()
        # 也包含 token bucket 统计
        for name, limiter in self._limiters.items():
            if name not in stats:
                stats[name] = limiter.get_stats()
        return stats


rate_limiter = MultiProviderRateLimiter()
