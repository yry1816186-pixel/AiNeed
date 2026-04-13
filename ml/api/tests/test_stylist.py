import pytest


@pytest.mark.asyncio
async def test_stylist_chat(client, api_key_headers):
    response = await client.post(
        "/api/stylist/chat",
        json={
            "session_id": "test-session-1",
            "message": "What should I wear for an interview?",
        },
        headers=api_key_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert "task_id" in data
    assert data["status"] == "pending"


@pytest.mark.asyncio
async def test_stylist_outfit(client, api_key_headers):
    response = await client.post(
        "/api/stylist/outfit",
        json={
            "user_profile": {"body_type": "rectangle"},
            "scene_context": {"occasion": "interview"},
        },
        headers=api_key_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert "task_id" in data
    assert data["status"] == "pending"


@pytest.mark.asyncio
async def test_stylist_analyze_body(client, api_key_headers):
    response = await client.post(
        "/api/stylist/analyze-body",
        json={"description": "I have broad shoulders and narrow hips"},
        headers=api_key_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert "body_type" in data
    assert "confidence" in data


@pytest.mark.asyncio
async def test_conversation_history(client, api_key_headers):
    response = await client.get(
        "/api/stylist/conversation/test-session-id",
        headers=api_key_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data
    assert "history" in data


@pytest.mark.asyncio
async def test_clear_conversation(client, api_key_headers):
    response = await client.delete(
        "/api/stylist/conversation/test-session-id",
        headers=api_key_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["cleared"] is True
