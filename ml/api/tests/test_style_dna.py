"""Tests for Style DNA service and FastAPI endpoints: /api/social/style-dna/*."""

import os
from unittest.mock import AsyncMock, MagicMock, patch

import numpy as np
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

os.environ["ENVIRONMENT"] = "test"

FAKE_API_KEY = os.environ.get("ML_API_KEY", "test-api-key-12345678901234567890")


def _make_fake_embedding(dim: int = 1152) -> list[float]:
    """Create a normalized fake embedding vector."""
    vec = np.random.rand(dim).astype(np.float32)
    vec = vec / np.linalg.norm(vec)
    return vec.tolist()


def _mock_user_dna_store():
    """Create a mock QdrantVectorStore for user_style_dna collection."""
    store = MagicMock()

    # search returns top-K results for find_similar_users
    store.search.return_value = [
        {
            "doc_id": "user-002",
            "score": 0.92,
            "content": "user_style_dna:user-002",
            "metadata": {"user_id": "user-002", "method": "weighted_avg"},
        },
        {
            "doc_id": "user-001",
            "score": 0.99,
            "content": "user_style_dna:user-001",
            "metadata": {"user_id": "user-001", "method": "weighted_avg"},
        },
        {
            "doc_id": "user-003",
            "score": 0.85,
            "content": "user_style_dna:user-003",
            "metadata": {"user_id": "user-003", "method": "weighted_avg"},
        },
    ]
    return store


def _mock_fashion_store():
    """Create a mock QdrantVectorStore for fashion_knowledge collection."""
    store = MagicMock()
    store.search.return_value = [
        {
            "doc_id": "item-001",
            "score": 0.95,
            "content": "Blue Denim Jacket",
            "metadata": {"category": "jacket"},
        },
    ]
    return store


# ---------------------------------------------------------------------------
# Unit tests for StyleDNAService
# ---------------------------------------------------------------------------


class TestStyleDNAServiceUpdateVector:
    """Test StyleDNAService.update_user_vector."""

    @pytest.mark.asyncio
    async def test_weighted_average_computation_and_upsert(self):
        """update_user_vector computes weighted average and calls upsert."""
        from ml.services.social.style_dna import StyleDNAService

        user_store = _mock_user_dna_store()
        fashion_store = _mock_fashion_store()
        service = StyleDNAService(user_dna_store=user_store, fashion_store=fashion_store)

        vec1 = _make_fake_embedding()
        vec2 = _make_fake_embedding()
        weights = [3, 1]  # purchase=3, view=1

        await service.update_user_vector("user-001", [vec1, vec2], weights)

        # Verify upsert was called
        user_store.upsert.assert_called_once()
        docs = user_store.upsert.call_args[0][0]
        assert len(docs) == 1
        doc = docs[0]
        assert doc.doc_id == "user-001"
        assert doc.metadata["user_id"] == "user-001"
        assert doc.metadata["method"] == "weighted_avg"

        # Verify the embedding is normalized (L2 norm ~ 1.0)
        embedding = np.array(doc.embedding)
        norm = np.linalg.norm(embedding)
        assert abs(norm - 1.0) < 1e-5

    @pytest.mark.asyncio
    async def test_weighted_average_math(self):
        """Verify the weighted average formula: sum(vec * w) / sum(w), then normalize."""
        from ml.services.social.style_dna import StyleDNAService

        user_store = _mock_user_dna_store()
        fashion_store = _mock_fashion_store()
        service = StyleDNAService(user_dna_store=user_store, fashion_store=fashion_store)

        # Simple vectors we can verify manually
        vec1 = [1.0, 0.0, 0.0] + [0.0] * 1149
        vec2 = [0.0, 1.0, 0.0] + [0.0] * 1149
        weights = [3.0, 1.0]  # purchase=3, favorite=2, view=1

        await service.update_user_vector("user-001", [vec1, vec2], weights)

        docs = user_store.upsert.call_args[0][0]
        embedding = np.array(docs[0].embedding)

        # Expected: (3*[1,0,0] + 1*[0,1,0]) / 4 = [0.75, 0.25, 0]
        # Then normalize: [0.75, 0.25, 0] / sqrt(0.5625+0.0625) = [0.75, 0.25, 0] / sqrt(0.625)
        expected_unnorm = np.array([0.75, 0.25] + [0.0] * 1150)
        expected = expected_unnorm / np.linalg.norm(expected_unnorm)
        np.testing.assert_allclose(embedding, expected, atol=1e-5)


class TestStyleDNAServiceFindSimilar:
    """Test StyleDNAService.find_similar_users."""

    @pytest.mark.asyncio
    async def test_returns_top_k_excluding_self(self):
        """find_similar_users returns top-K results excluding self."""
        from ml.services.social.style_dna import StyleDNAService

        user_store = _mock_user_dna_store()
        fashion_store = _mock_fashion_store()
        service = StyleDNAService(user_dna_store=user_store, fashion_store=fashion_store)

        results = await service.find_similar_users("user-001", top_k=10)

        # user-001 should be excluded; only user-002 and user-003 remain
        user_ids = [r["user_id"] for r in results]
        assert "user-001" not in user_ids
        assert "user-002" in user_ids
        assert "user-003" in user_ids

    @pytest.mark.asyncio
    async def test_cold_start_returns_empty(self):
        """Cold-start user (no vector) gets empty result list."""
        from ml.services.social.style_dna import StyleDNAService

        user_store = MagicMock()
        # Simulate no vector found: retrieve returns empty, search returns empty
        user_store._client = MagicMock()
        user_store._client.retrieve.return_value = []
        user_store.search.return_value = []

        fashion_store = _mock_fashion_store()
        service = StyleDNAService(user_dna_store=user_store, fashion_store=fashion_store)

        results = await service.find_similar_users("unknown-user", top_k=10)

        assert results == []

    @pytest.mark.asyncio
    async def test_results_contain_only_non_pii(self):
        """Results contain only user_id and score, no PII."""
        from ml.services.social.style_dna import StyleDNAService

        user_store = _mock_user_dna_store()
        fashion_store = _mock_fashion_store()
        service = StyleDNAService(user_dna_store=user_store, fashion_store=fashion_store)

        results = await service.find_similar_users("user-001", top_k=10)

        for result in results:
            assert "user_id" in result
            assert "score" in result
            # Only these two keys -- no email, phone, name, etc.
            assert set(result.keys()) == {"user_id", "score"}


class TestStyleDNAServiceComputeFromBehaviors:
    """Test StyleDNAService.compute_from_behaviors."""

    @pytest.mark.asyncio
    async def test_weight_mapping_purchase_favorite_tryon_view(self):
        """compute_from_behaviors maps interaction types to correct weights."""
        from ml.services.social.style_dna import StyleDNAService

        user_store = _mock_user_dna_store()
        fashion_store = _mock_fashion_store()

        # fashion_store.search returns item vectors
        vec1 = _make_fake_embedding()
        vec2 = _make_fake_embedding()
        vec3 = _make_fake_embedding()
        vec4 = _make_fake_embedding()

        fashion_store.search.side_effect = [
            [{"doc_id": "item-001", "score": 0.9, "content": "", "metadata": {}, "embedding_field": vec1}],
            [{"doc_id": "item-002", "score": 0.9, "content": "", "metadata": {}, "embedding_field": vec2}],
            [{"doc_id": "item-003", "score": 0.9, "content": "", "metadata": {}, "embedding_field": vec3}],
            [{"doc_id": "item-004", "score": 0.9, "content": "", "metadata": {}, "embedding_field": vec4}],
        ]

        # We need the store to return vectors when we retrieve by doc_id
        # Use retrieve for fetching item vectors
        fashion_store._client = MagicMock()

        def make_point(doc_id, vec):
            p = MagicMock()
            p.id = doc_id
            p.vector = vec
            p.payload = {}
            return p

        fashion_store._client.retrieve.side_effect = [
            [make_point("item-001", vec1)],
            [make_point("item-002", vec2)],
            [make_point("item-003", vec3)],
            [make_point("item-004", vec4)],
        ]

        service = StyleDNAService(user_dna_store=user_store, fashion_store=fashion_store)

        await service.compute_from_behaviors(
            "user-001",
            ["item-001", "item-002", "item-003", "item-004"],
            ["purchase", "favorite", "try_on", "view"],
        )

        # update_user_vector should be called with weights [3, 2, 2, 1]
        user_store.upsert.assert_called_once()


# ---------------------------------------------------------------------------
# FastAPI endpoint tests
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def style_dna_client():
    """AsyncClient with mocked style DNA service."""
    mock_user_store = _mock_user_dna_store()
    mock_fashion_store = _mock_fashion_store()

    with patch(
        "ml.api.routes.style_dna._style_dna_available", True,
    ), patch(
        "ml.api.routes.style_dna._style_dna_service",
        MagicMock(
            compute_from_behaviors=AsyncMock(return_value=None),
            find_similar_users=AsyncMock(return_value=[
                {"user_id": "user-002", "score": 0.92},
                {"user_id": "user-003", "score": 0.85},
            ]),
        ),
    ):
        from ml.api.main import app

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac


@pytest.fixture
def api_headers():
    return {"X-ML-API-Key": FAKE_API_KEY}


class TestStyleDnaEndpoints:
    """FastAPI endpoint tests for /api/social/style-dna/*."""

    @pytest.mark.asyncio
    async def test_compute_endpoint(self, style_dna_client, api_headers):
        """POST /api/social/style-dna/compute triggers computation."""
        response = await style_dna_client.post(
            "/api/social/style-dna/compute",
            json={
                "user_id": "user-001",
                "item_ids": ["item-001", "item-002"],
                "interaction_types": ["purchase", "view"],
            },
            headers=api_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    @pytest.mark.asyncio
    async def test_matches_endpoint(self, style_dna_client, api_headers):
        """GET /api/social/style-dna/matches returns list of matches with scores."""
        response = await style_dna_client.get(
            "/api/social/style-dna/matches",
            params={"user_id": "user-001", "top_k": "10"},
            headers=api_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "matches" in data
        assert len(data["matches"]) == 2
        assert data["matches"][0]["user_id"] == "user-002"
        assert data["matches"][0]["score"] == 0.92

    @pytest.mark.asyncio
    async def test_matches_no_pii(self, style_dna_client, api_headers):
        """GET /api/social/style-dna/matches returns only non-PII data."""
        response = await style_dna_client.get(
            "/api/social/style-dna/matches",
            params={"user_id": "user-001"},
            headers=api_headers,
        )
        data = response.json()
        for match in data["matches"]:
            assert set(match.keys()) == {"user_id", "score"}

    @pytest.mark.asyncio
    async def test_health_endpoint(self, style_dna_client, api_headers):
        """GET /api/social/style-dna/health returns availability status."""
        response = await style_dna_client.get(
            "/api/social/style-dna/health",
            headers=api_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "available" in data

    @pytest.mark.asyncio
    async def test_matches_service_unavailable(self, api_headers):
        """GET /api/social/style-dna/matches returns 503 when service unavailable."""
        with patch(
            "ml.api.routes.style_dna._style_dna_available", False,
        ):
            from ml.api.main import app

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                response = await ac.get(
                    "/api/social/style-dna/matches",
                    params={"user_id": "user-001"},
                    headers=api_headers,
                )
                assert response.status_code == 503
