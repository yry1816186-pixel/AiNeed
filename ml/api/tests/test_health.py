import pytest


@pytest.mark.asyncio
async def test_health_check(client):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("healthy", "degraded")
    assert "service" in data
    assert "timestamp" in data


@pytest.mark.asyncio
async def test_detailed_health_check(client):
    response = await client.get("/health/detailed")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("healthy", "degraded")
    assert "services" in data
    assert "resources" in data
    assert "timestamp" in data
