import pytest


@pytest.mark.asyncio
async def test_recommend_outfit(client, api_key_headers):
    response = await client.post(
        "/api/recommend/outfit",
        json={
            "user_input": "smart casual for interview",
            "occasion": "interview",
        },
        headers=api_key_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert "outfit_id" in data
    assert "items" in data
    assert "compatibility_score" in data


@pytest.mark.asyncio
async def test_recommend_items(client, api_key_headers):
    response = await client.post(
        "/api/recommend/items",
        json={
            "user_input": "summer dress",
            "category": "dresses",
            "top_k": 5,
        },
        headers=api_key_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert "recommendations" in data
    assert "total" in data
