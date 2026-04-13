import pytest


@pytest.mark.asyncio
async def test_analyze_style(client, api_key_headers):
    response = await client.post(
        "/api/style/analyze",
        json={"user_input": "casual minimalist"},
        headers=api_key_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert "style_name" in data
    assert data["confidence"] > 0


@pytest.mark.asyncio
async def test_style_suggestions(client, api_key_headers):
    response = await client.post(
        "/api/style/suggestions",
        json={"user_input": "office wear", "body_type": "rectangle"},
        headers=api_key_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert "style_analysis" in data
    assert "outfit_suggestions" in data


@pytest.mark.asyncio
async def test_quick_match(client, api_key_headers):
    response = await client.get(
        "/api/style/quick-match",
        params={"user_input": "casual"},
        headers=api_key_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert "style_name" in data
    assert "confidence" in data
