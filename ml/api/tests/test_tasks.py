import pytest


@pytest.mark.asyncio
async def test_get_task_status(client, api_key_headers):
    from ml.api.routes.tasks import create_task

    task = create_task("test-task-123")

    response = await client.get(
        "/api/tasks/test-task-123",
        headers=api_key_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["task_id"] == "test-task-123"
    assert data["data"]["status"] == "pending"


@pytest.mark.asyncio
async def test_get_nonexistent_task(client, api_key_headers):
    response = await client.get(
        "/api/tasks/nonexistent",
        headers=api_key_headers,
    )
    assert response.status_code == 404
