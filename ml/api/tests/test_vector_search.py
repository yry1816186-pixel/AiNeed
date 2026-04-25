"""Tests for image search endpoints: /api/vector/embed/image and /api/vector/search/image."""

import io
from unittest.mock import MagicMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from PIL import Image

# Ensure test environment
import os

os.environ["ENVIRONMENT"] = "test"

FAKE_API_KEY = os.environ.get("ML_API_KEY", "test-api-key-12345678901234567890")


def _make_jpeg_bytes() -> bytes:
    """Create a minimal valid JPEG-like image as PNG bytes."""
    img = Image.new("RGB", (64, 64), color="red")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def _make_fake_embedding(dim: int = 1152) -> list[float]:
    return [0.1] * dim


def _mock_embedding_service():
    svc = MagicMock()
    svc.encode_image.return_value = [_make_fake_embedding()]
    svc.config = MagicMock()
    svc.config.model_name = "test-fashion-siglip"
    return svc


def _mock_vector_store():
    store = MagicMock()
    store.search.return_value = [
        {
            "doc_id": "item-001",
            "score": 0.95,
            "metadata": {
                "name": "Blue Denim Jacket",
                "price": 299.0,
                "imageUrl": "https://example.com/img/001.jpg",
            },
        },
        {
            "doc_id": "item-002",
            "score": 0.88,
            "metadata": {
                "name": "Black Leather Jacket",
                "price": 599.0,
                "imageUrl": "https://example.com/img/002.jpg",
            },
        },
    ]
    return store


@pytest.fixture
def mock_embedding():
    return _mock_embedding_service()


@pytest.fixture
def mock_vector_store():
    return _mock_vector_store()


@pytest_asyncio.fixture
async def image_client(mock_embedding, mock_vector_store):
    """AsyncClient with mocked embedding and vector store for image search routes."""
    with patch(
        "ml.api.routes.image_search._embedding_service", mock_embedding
    ), patch(
        "ml.api.routes.image_search._embedding_available", True
    ), patch(
        "ml.api.routes.image_search._vector_store", mock_vector_store
    ), patch(
        "ml.api.routes.image_search._vector_store_available", True
    ):
        from ml.api.main import app

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac


@pytest.fixture
def api_headers():
    return {"X-ML-API-Key": FAKE_API_KEY}


class TestEmbedImage:
    """POST /api/vector/embed/image tests."""

    @pytest.mark.asyncio
    async def test_embed_image_valid_jpeg(self, image_client, api_headers):
        """Valid JPEG image returns 200 with embedding array of correct dimension."""
        image_bytes = _make_jpeg_bytes()
        files = {"file": ("photo.jpg", image_bytes, "image/jpeg")}
        response = await image_client.post(
            "/api/vector/embed/image", files=files, headers=api_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "embedding" in data
        assert len(data["embedding"]) == 1152
        assert data["dimension"] == 1152
        assert data["model"] == "test-fashion-siglip"

    @pytest.mark.asyncio
    async def test_embed_image_non_image_file(self, image_client, api_headers):
        """Non-image file returns error (400-level via InferenceError)."""
        files = {"file": ("data.txt", b"hello world", "text/plain")}
        response = await image_client.post(
            "/api/vector/embed/image", files=files, headers=api_headers
        )
        assert response.status_code == 500
        data = response.json()
        assert "error" in data

    @pytest.mark.asyncio
    async def test_embed_image_service_unavailable(self, api_headers):
        """Returns 503 ModelNotLoadedError when EmbeddingService unavailable."""
        with patch(
            "ml.api.routes.image_search._embedding_available", False
        ), patch(
            "ml.api.routes.image_search._embedding_service", None
        ):
            from ml.api.main import app

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                image_bytes = _make_jpeg_bytes()
                files = {"file": ("photo.jpg", image_bytes, "image/jpeg")}
                response = await ac.post(
                    "/api/vector/embed/image", files=files, headers=api_headers
                )
                assert response.status_code == 503


class TestSearchImage:
    """POST /api/vector/search/image tests."""

    @pytest.mark.asyncio
    async def test_search_image_valid_returns_results(self, image_client, api_headers):
        """Valid image returns 200 with list of results."""
        image_bytes = _make_jpeg_bytes()
        files = {"file": ("photo.jpg", image_bytes, "image/jpeg")}
        response = await image_client.post(
            "/api/vector/search/image", files=files, headers=api_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert data["total"] == 2
        result = data["results"][0]
        assert "id" in result
        assert "score" in result
        assert "name" in result
        assert "price" in result
        assert "imageUrl" in result
        assert "similarity" in result

    @pytest.mark.asyncio
    async def test_search_image_non_image_file(self, image_client, api_headers):
        """Non-image file returns error."""
        files = {"file": ("data.txt", b"hello world", "text/plain")}
        response = await image_client.post(
            "/api/vector/search/image", files=files, headers=api_headers
        )
        assert response.status_code == 500

    @pytest.mark.asyncio
    async def test_search_image_service_unavailable(self, api_headers):
        """Returns 503 when EmbeddingService unavailable."""
        with patch(
            "ml.api.routes.image_search._embedding_available", False
        ), patch(
            "ml.api.routes.image_search._embedding_service", None
        ):
            from ml.api.main import app

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                image_bytes = _make_jpeg_bytes()
                files = {"file": ("photo.jpg", image_bytes, "image/jpeg")}
                response = await ac.post(
                    "/api/vector/search/image", files=files, headers=api_headers
                )
                assert response.status_code == 503

    @pytest.mark.asyncio
    async def test_search_image_top_k_limit(self, mock_embedding, api_headers):
        """With top_k=1, search returns at most 1 result."""
        vector_store = MagicMock()
        vector_store.search.return_value = [
            {
                "doc_id": "item-001",
                "score": 0.95,
                "metadata": {
                    "name": "Blue Denim Jacket",
                    "price": 299.0,
                    "imageUrl": "https://example.com/img/001.jpg",
                },
            },
        ]
        with patch(
            "ml.api.routes.image_search._embedding_service", mock_embedding
        ), patch(
            "ml.api.routes.image_search._embedding_available", True
        ), patch(
            "ml.api.routes.image_search._vector_store", vector_store
        ), patch(
            "ml.api.routes.image_search._vector_store_available", True
        ):
            from ml.api.main import app

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                image_bytes = _make_jpeg_bytes()
                # top_k is a Form field, sent as form data alongside file
                files = {"file": ("photo.jpg", image_bytes, "image/jpeg")}
                data = {"top_k": "1"}
                response = await ac.post(
                    "/api/vector/search/image",
                    files=files,
                    data=data,
                    headers=api_headers,
                )
                assert response.status_code == 200
                result = response.json()
                assert result["total"] == 1
                # Verify vector_store.search was called with top_k=1
                vector_store.search.assert_called_once()
                call_kwargs = vector_store.search.call_args
                assert call_kwargs.kwargs.get("top_k") == 1
