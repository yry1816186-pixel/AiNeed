import pytest


@pytest.mark.asyncio
async def test_analyze_with_base64(client, api_key_headers, sample_base64_image):
    response = await client.post(
        "/api/body-analysis/analyze",
        json={"image_base64": sample_base64_image},
        headers=api_key_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["body_profile"]["body_type"] == "rectangle"


@pytest.mark.asyncio
async def test_analyze_no_image(client, api_key_headers):
    response = await client.post(
        "/api/body-analysis/analyze",
        headers=api_key_headers,
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_recommendations(client, api_key_headers):
    response = await client.post(
        "/api/body-analysis/recommendations",
        json={"body_type": "rectangle"},
        headers=api_key_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True


@pytest.mark.asyncio
async def test_fit_score(client, api_key_headers):
    response = await client.post(
        "/api/body-analysis/fit-score",
        json={
            "items": [{"item_id": "item_1", "category": "tops"}],
            "body_profile": {"body_type": "rectangle"},
        },
        headers=api_key_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["results"]) > 0
    assert data["results"][0]["fit_score"] > 0
