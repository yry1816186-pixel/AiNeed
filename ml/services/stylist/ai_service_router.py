"""
AIServiceRouter - GLM model fallback router for competition demo stability.

Per D-08: Backend-only automatic fallback.
Per D-09: 5-second timeout triggers fallback.
Per D-10: Fallback to GLM-5 (same Zhipu ecosystem).
Per D-15: Demo uses real-time AI, no pre-set responses.
"""

import os
import time
import logging
import asyncio
from typing import Optional, Dict, Any, List
from dataclasses import dataclass

import aiohttp

logger = logging.getLogger(__name__)


@dataclass
class RouterResult:
    """Result from AIServiceRouter call."""

    text: str
    model_used: str
    fallback_triggered: bool = False
    latency_ms: float = 0.0
    retry_count: int = 0


class RateLimitError(Exception):
    """Raised when the API returns HTTP 429."""

    pass


class APIError(Exception):
    """Raised on non-rate-limit HTTP errors from the GLM API."""

    pass


class AIServiceRouter:
    """Routes LLM calls through primary -> retry -> fallback chain.

    Chain logic (per D-08/D-09/D-10):
    1. Try primary model (GLM-4-Flash) with 5s timeout.
    2. On failure: retry once (unless rate-limited).
    3. On continued failure: fallback to GLM-5.
    4. If both fail: raise RuntimeError.

    Frontend is unaware of fallback (backend-only change).
    """

    PRIMARY_MODEL = "glm-4-flash"
    FALLBACK_MODEL = "glm-5"  # Per D-10
    TIMEOUT_SECONDS = 5.0  # Per D-09
    MAX_RETRIES = 1  # Per D-08

    def __init__(self):
        self._api_key = os.getenv("GLM_API_KEY", "") or os.getenv("ZHIPU_API_KEY", "")
        self._endpoint = os.getenv(
            "GLM_API_ENDPOINT", "https://open.bigmodel.cn/api/paas/v4"
        )
        self._session: Optional[aiohttp.ClientSession] = None

    async def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        return self._session

    async def close(self):
        if self._session and not self._session.closed:
            await self._session.close()

    async def call(
        self,
        messages: List[Dict[str, str]],
        max_tokens: int = 200,
        model: Optional[str] = None,
    ) -> RouterResult:
        """Call LLM with automatic fallback.

        Args:
            messages: Chat messages list.
            max_tokens: Max output tokens.
            model: Override model -- skips fallback logic when set.

        Returns:
            RouterResult with text, model_used, and fallback metadata.
        """
        start = time.monotonic()

        # Direct model call -- skip fallback logic
        if model:
            text = await self._raw_call(model, messages, max_tokens)
            return RouterResult(
                text=text,
                model_used=model,
                latency_ms=(time.monotonic() - start) * 1000,
            )

        # Primary -> retry -> fallback chain
        try:
            text = await self._raw_call(self.PRIMARY_MODEL, messages, max_tokens)
            return RouterResult(
                text=text,
                model_used=self.PRIMARY_MODEL,
                latency_ms=(time.monotonic() - start) * 1000,
            )
        except Exception as primary_error:
            logger.warning(
                "Primary model %s failed: %s", self.PRIMARY_MODEL, primary_error
            )

            # Retry once (per D-08) unless rate-limited
            if not self._is_rate_limit(primary_error):
                try:
                    text = await self._raw_call(
                        self.PRIMARY_MODEL, messages, max_tokens
                    )
                    return RouterResult(
                        text=text,
                        model_used=self.PRIMARY_MODEL,
                        latency_ms=(time.monotonic() - start) * 1000,
                        retry_count=1,
                    )
                except Exception:
                    pass  # Fall through to fallback

            # Fallback to GLM-5 (per D-10)
            try:
                text = await self._raw_call(
                    self.FALLBACK_MODEL, messages, max_tokens
                )
                logger.info("Fallback to %s succeeded", self.FALLBACK_MODEL)
                return RouterResult(
                    text=text,
                    model_used=self.FALLBACK_MODEL,
                    fallback_triggered=True,
                    latency_ms=(time.monotonic() - start) * 1000,
                    retry_count=1,
                )
            except Exception as fallback_error:
                total_ms = (time.monotonic() - start) * 1000
                logger.error(
                    "Both models failed. Total latency: %.0fms", total_ms
                )
                raise RuntimeError(
                    f"Primary ({self.PRIMARY_MODEL}) and fallback "
                    f"({self.FALLBACK_MODEL}) both failed"
                ) from fallback_error

    async def _raw_call(
        self, model: str, messages: List[Dict[str, str]], max_tokens: int
    ) -> str:
        """Raw API call to Zhipu GLM endpoint."""
        session = await self._get_session()
        url = f"{self._endpoint}/chat/completions"
        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": 0.7,
        }
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

        async with session.post(
            url,
            json=payload,
            headers=headers,
            timeout=aiohttp.ClientTimeout(total=self.TIMEOUT_SECONDS),
        ) as response:
            if response.status == 429:
                raise RateLimitError(f"Rate limited on {model}")
            if response.status >= 400:
                text = await response.text()
                raise APIError(f"HTTP {response.status}: {text[:200]}")
            data = await response.json()
            return data["choices"][0]["message"]["content"].strip()

    def _is_rate_limit(self, error: Exception) -> bool:
        return isinstance(error, RateLimitError) or "429" in str(error)
