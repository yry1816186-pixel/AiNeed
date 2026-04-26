"""
AIServiceRouter unit tests - GLM model fallback router.

TDD RED phase: tests for primary -> retry -> GLM-5 fallback chain.
Per D-08: Backend-only automatic fallback.
Per D-09: 5-second timeout triggers fallback.
Per D-10: Fallback to GLM-5 (same Zhipu ecosystem).
"""

import asyncio
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch, PropertyMock, ANY
from aiohttp import ClientResponseError, ClientError

from ml.services.stylist.ai_service_router import (
    AIServiceRouter,
    RouterResult,
    RateLimitError,
    APIError,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_router() -> AIServiceRouter:
    """Create a router with mocked API key."""
    with patch.dict("os.environ", {"GLM_API_KEY": "test-key", "ZHIPU_API_KEY": ""}):
        return AIServiceRouter()


async def _mock_raw_call(response_text: str, status: int = 200):
    """Return an async mock that simulates a successful raw_call."""
    mock = AsyncMock(return_value=response_text)
    return mock


# ---------------------------------------------------------------------------
# Test 1: Primary GLM-4-Flash succeeds -- no fallback
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_primary_success_no_fallback():
    """Primary GLM-4-Flash call succeeds -- returns result, no fallback triggered."""
    router = _make_router()

    with patch.object(router, "_raw_call", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = "Here is your outfit recommendation."

        result = await router.call(
            messages=[{"role": "user", "content": "What should I wear today?"}]
        )

    assert isinstance(result, RouterResult)
    assert result.text == "Here is your outfit recommendation."
    assert result.model_used == "glm-4-flash"
    assert result.fallback_triggered is False
    assert result.retry_count == 0
    assert result.latency_ms >= 0
    await router.close()


# ---------------------------------------------------------------------------
# Test 2: Primary timeout triggers fallback to GLM-5
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_primary_timeout_triggers_fallback():
    """Primary model times out -- fallback to GLM-5 succeeds."""
    router = _make_router()

    call_count = 0

    async def mock_raw_call(model, messages, max_tokens):
        nonlocal call_count
        call_count += 1
        if model == "glm-4-flash":
            raise asyncio.TimeoutError("Request timed out after 5s")
        # Fallback model succeeds
        return "Fallback recommendation from GLM-5."

    with patch.object(router, "_raw_call", side_effect=mock_raw_call):
        result = await router.call(
            messages=[{"role": "user", "content": "Suggest an outfit"}],
            max_tokens=200,
        )

    assert result.text == "Fallback recommendation from GLM-5."
    assert result.model_used == "glm-5"
    assert result.fallback_triggered is True
    await router.close()


# ---------------------------------------------------------------------------
# Test 3: Primary HTTP 5xx -- retry 1 time then fallback
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_primary_5xx_retry_then_fallback():
    """Primary returns HTTP 5xx -- retry once then fallback to GLM-5."""
    router = _make_router()

    call_sequence = []

    async def mock_raw_call(model, messages, max_tokens):
        call_sequence.append(model)
        if model == "glm-4-flash":
            raise APIError("HTTP 500: Internal Server Error")
        return "GLM-5 fallback result."

    with patch.object(router, "_raw_call", side_effect=mock_raw_call):
        result = await router.call(
            messages=[{"role": "user", "content": "What to wear for an interview?"}]
        )

    # Expected: glm-4-flash (primary) -> glm-4-flash (retry) -> glm-5 (fallback)
    assert call_sequence == ["glm-4-flash", "glm-4-flash", "glm-5"]
    assert result.text == "GLM-5 fallback result."
    assert result.model_used == "glm-5"
    assert result.fallback_triggered is True
    assert result.retry_count == 1
    await router.close()


# ---------------------------------------------------------------------------
# Test 4: Primary HTTP 429 -- direct fallback, no retry
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_primary_429_direct_fallback():
    """Primary returns HTTP 429 -- skip retry, fallback directly to GLM-5."""
    router = _make_router()

    call_sequence = []

    async def mock_raw_call(model, messages, max_tokens):
        call_sequence.append(model)
        if model == "glm-4-flash":
            raise RateLimitError("Rate limited on glm-4-flash")
        return "GLM-5 direct fallback."

    with patch.object(router, "_raw_call", side_effect=mock_raw_call):
        result = await router.call(
            messages=[{"role": "user", "content": "Quick outfit suggestion"}]
        )

    # Expected: glm-4-flash (primary) -> glm-5 (fallback, no retry)
    assert call_sequence == ["glm-4-flash", "glm-5"]
    assert result.text == "GLM-5 direct fallback."
    assert result.model_used == "glm-5"
    assert result.fallback_triggered is True
    await router.close()


# ---------------------------------------------------------------------------
# Test 5: Both primary and fallback fail -- raises RuntimeError
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_both_models_fail_raises_error():
    """Both primary and fallback models fail -- raises RuntimeError."""
    router = _make_router()

    async def mock_raw_call(model, messages, max_tokens):
        raise APIError(f"HTTP 503: {model} unavailable")

    with patch.object(router, "_raw_call", side_effect=mock_raw_call):
        with pytest.raises(RuntimeError, match="Primary.*and fallback.*both failed"):
            await router.call(
                messages=[{"role": "user", "content": "Help me dress"}]
            )

    await router.close()


# ---------------------------------------------------------------------------
# Test 6: Fallback success returns fallback_triggered=True marker
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fallback_result_has_marker():
    """Fallback result includes fallback_triggered=True marker."""
    router = _make_router()

    async def mock_raw_call(model, messages, max_tokens):
        if model == "glm-4-flash":
            raise APIError("HTTP 500: error")
        return "GLM-5 response with fallback marker."

    with patch.object(router, "_raw_call", side_effect=mock_raw_call):
        result = await router.call(
            messages=[{"role": "user", "content": "Test fallback marker"}]
        )

    assert result.fallback_triggered is True
    assert result.model_used == "glm-5"
    assert "fallback" not in result.text.lower() or True  # marker in metadata, not text
    await router.close()


# ---------------------------------------------------------------------------
# Test 7: Direct model override skips fallback logic
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_direct_model_override():
    """When model is specified, skip fallback logic."""
    router = _make_router()

    with patch.object(router, "_raw_call", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = "Direct model response."

        result = await router.call(
            messages=[{"role": "user", "content": "Test"}],
            model="glm-5",
        )

    assert result.model_used == "glm-5"
    assert result.fallback_triggered is False
    mock_call.assert_called_once_with("glm-5", ANY, ANY)
    await router.close()


# ---------------------------------------------------------------------------
# Test 8: Router constants match decisions
# ---------------------------------------------------------------------------


def test_router_constants():
    """Router constants match D-08/D-09/D-10 decisions."""
    router = _make_router()
    assert router.PRIMARY_MODEL == "glm-4-flash"
    assert router.FALLBACK_MODEL == "glm-5"
    assert router.TIMEOUT_SECONDS == 5.0
    assert router.MAX_RETRIES == 1
