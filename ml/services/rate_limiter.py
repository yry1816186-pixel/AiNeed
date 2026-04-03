"""
Rate Limiter for LLM API Calls
Implements token bucket algorithm with async support.
"""

import asyncio
import time
import logging
from typing import Optional, Dict, Any
from dataclasses import dataclass, field
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


class MultiProviderRateLimiter:
    """
    Rate limiter for multiple LLM providers.
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
    
    def get_limiter(self, provider: str) -> TokenBucketRateLimiter:
        if provider not in self._limiters:
            self._limiters[provider] = TokenBucketRateLimiter()
        return self._limiters[provider]
    
    async def acquire(self, provider: str, tokens: int = 1) -> bool:
        return await self.get_limiter(provider).acquire(tokens)
    
    async def wait_and_acquire(self, provider: str, tokens: int = 1, max_wait_ms: int = 30000) -> bool:
        return await self.get_limiter(provider).wait_and_acquire(tokens, max_wait_ms)
    
    def get_all_stats(self) -> Dict[str, Dict[str, Any]]:
        return {name: limiter.get_stats() for name, limiter in self._limiters.items()}


rate_limiter = MultiProviderRateLimiter()
