import os
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

TEST_API_KEY = "test-api-key-12345678901234567890"


@pytest.fixture(scope="session", autouse=True)
def set_env():
    os.environ["ENVIRONMENT"] = "test"
    os.environ["GLM_API_KEY"] = "test-glm-key-00000000000000000000"
    os.environ["ZHIPU_API_KEY"] = "test-zhipu-key-000000000000000000"
    os.environ["REDIS_URL"] = "redis://localhost:6379"
    os.environ["QDRANT_URL"] = "http://localhost:6333"
    os.environ["ML_API_KEY"] = TEST_API_KEY
    yield


@pytest.fixture
def mock_body_service():
    svc = MagicMock()
    svc.analyze_user_photo.return_value = {
        "success": True,
        "body_profile": {
            "body_type": "rectangle",
            "confidence": 0.85,
            "proportions": {"shoulder_hip_ratio": 1.0},
            "measurements": {},
            "skin_tone": "medium",
            "color_season": "autumn",
        },
        "clothing_adaptations": {
            "suitable_styles": ["smart_casual"],
            "avoid_styles": ["oversized"],
            "emphasis": "structured silhouettes",
            "styling_tips": ["Layer for dimension"],
            "best_cuts": ["tailored"],
            "best_patterns": ["solid", "subtle stripes"],
            "best_colors": ["navy", "white"],
        },
        "body_type_info": {"description": "Balanced proportions"},
    }
    svc.get_recommendations_for_body_type.return_value = {
        "recommendations": [{"category": "tops", "items": ["blazer"]}],
    }
    svc.rank_items_by_fit.return_value = [
        {
            "item_id": "item_1",
            "item_name": "Navy Blazer",
            "category": "tops",
            "fit_score": 0.9,
            "recommendation": "highly recommended",
            "scores": {"overall": 0.9},
        },
    ]
    return svc


@pytest.fixture
def mock_style_api():
    svc = MagicMock()
    svc.analyze = AsyncMock(return_value={
        "style_name": "casual_minimalist",
        "confidence": 0.9,
        "core_elements": ["clean lines", "neutral palette"],
        "key_items": ["white tee", "dark jeans"],
        "color_palette": ["white", "navy", "grey"],
        "patterns": ["solid"],
        "materials": ["cotton", "denim"],
        "occasions": ["daily", "casual"],
        "seasons": ["spring", "fall"],
        "body_type_suggestions": {},
        "celebrity_references": [],
        "brand_references": [],
        "price_range": "$$",
        "similar_styles": ["scandinavian_minimalist"],
    })
    svc.get_suggestions = AsyncMock(return_value={
        "style_analysis": {
            "style_name": "smart_casual",
            "confidence": 0.85,
            "core_elements": [],
            "key_items": [],
            "color_palette": [],
            "patterns": [],
            "materials": [],
            "occasions": [],
            "seasons": [],
            "body_type_suggestions": {},
            "celebrity_references": [],
            "brand_references": [],
            "price_range": "",
            "similar_styles": [],
        },
        "outfit_suggestions": [
            {
                "category": "tops",
                "description": "Oxford shirt",
                "style_tags": ["smart_casual"],
                "color_suggestions": ["white", "light_blue"],
                "item_examples": ["Oxford button-down"],
                "pairing_tips": "Pair with chinos",
            },
        ],
        "embedding_prompts": ["smart casual outfit"],
        "style_weights": {"smart_casual": 0.85},
    })
    svc.quick_match_style.return_value = ("casual_minimalist", 0.9)
    return svc


@pytest.fixture
def mock_recommender_service():
    svc = MagicMock()
    svc.get_recommendations = AsyncMock(return_value={
        "style_analysis": {"style_name": "casual"},
        "recommendations": [
            {
                "item_id": "item_1",
                "score": 0.9,
                "category": "tops",
                "style_tags": ["casual"],
                "color_tags": ["blue"],
                "reasons": ["Matches style"],
                "image_url": None,
                "price": 59.99,
                "brand": "TestBrand",
            },
        ],
        "total": 1,
    })
    svc.get_outfit_recommendation = AsyncMock(return_value={
        "outfit_id": "outfit_1",
        "style_analysis": {"style_name": "smart_casual"},
        "items": [
            {
                "item_id": "item_1",
                "score": 0.9,
                "category": "tops",
                "style_tags": ["smart_casual"],
                "color_tags": ["navy"],
                "reasons": ["Versatile"],
                "image_url": None,
                "price": 89.99,
                "brand": "TestBrand",
            },
        ],
        "compatibility_score": 0.88,
        "total_price": 149.99,
    })
    return svc


@pytest.fixture
def mock_stylist_service():
    svc = MagicMock()
    svc.chat_interaction = AsyncMock(return_value={
        "response": "I recommend a navy blazer with white chinos.",
        "suggestions": [],
    })
    svc.generate_outfit_recommendation = AsyncMock(return_value={
        "outfit": {"top": "blazer", "bottom": "chinos"},
        "reasoning": "Smart casual for interview",
    })
    svc.analyze_body_type = AsyncMock(return_value={
        "body_type": "rectangle",
        "confidence": 0.85,
        "analysis": "Balanced proportions with similar shoulder and hip width.",
        "optimize_tips": ["Add structure with blazers", "Use layering"],
        "recommended_items": ["Structured blazer", "Straight-leg trousers"],
        "avoid_items": ["Oversized hoodies", "Baggy jeans"],
    })
    svc.get_conversation_history = AsyncMock(return_value=[
        {"role": "user", "content": "What should I wear?"},
        {"role": "assistant", "content": "I recommend a navy blazer."},
    ])
    svc.clear_conversation = AsyncMock(return_value=None)
    return svc


@pytest_asyncio.fixture
async def client(
    mock_body_service,
    mock_style_api,
    mock_recommender_service,
    mock_stylist_service,
):
    with patch("ml.api.routes.body_analysis._body_service", mock_body_service), \
         patch("ml.api.routes.body_analysis._service_available", True), \
         patch("ml.api.routes.style_analysis._style_api", mock_style_api), \
         patch("ml.api.routes.style_analysis._service_available", True), \
         patch("ml.api.routes.fashion_recommend._recommender_service", mock_recommender_service), \
         patch("ml.api.routes.fashion_recommend._service_available", True), \
         patch("ml.api.routes.stylist_chat._service_available", True):
        from ml.api.main import app

        with patch(
            "ml.api.routes.stylist_chat._get_stylist_service",
            return_value=mock_stylist_service,
        ):
            transport = ASGITransport(app=app)
            async with AsyncClient(
                transport=transport, base_url="http://test"
            ) as ac:
                yield ac


@pytest.fixture
def api_key_headers():
    return {"X-ML-API-Key": TEST_API_KEY}


@pytest.fixture
def sample_base64_image():
    import base64
    from io import BytesIO
    from PIL import Image

    img = Image.new("RGB", (100, 100), color="blue")
    buf = BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")
