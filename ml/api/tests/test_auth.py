import os
import pytest


@pytest.mark.asyncio
async def test_no_api_key(client):
    saved = os.environ.get("ML_API_KEY", "")
    os.environ["ML_API_KEY"] = "required-key-00000000000000000000"

    try:
        from ml.api.config import Settings
        new_settings = Settings()

        with pytest.MonkeyPatch.context() as mp:
            mp.setattr("ml.api.config.settings", new_settings)
            mp.setattr("ml.api.middleware.auth.settings", new_settings)

            response = await client.post(
                "/api/style/analyze",
                json={"user_input": "test"},
            )
            assert response.status_code == 401
    finally:
        os.environ["ML_API_KEY"] = saved


@pytest.mark.asyncio
async def test_invalid_api_key(client):
    saved = os.environ.get("ML_API_KEY", "")
    os.environ["ML_API_KEY"] = "required-key-00000000000000000000"

    try:
        from ml.api.config import Settings
        new_settings = Settings()

        with pytest.MonkeyPatch.context() as mp:
            mp.setattr("ml.api.config.settings", new_settings)
            mp.setattr("ml.api.middleware.auth.settings", new_settings)

            response = await client.post(
                "/api/style/analyze",
                json={"user_input": "test"},
                headers={"X-ML-API-Key": "wrong-key"},
            )
            assert response.status_code == 401
    finally:
        os.environ["ML_API_KEY"] = saved


@pytest.mark.asyncio
async def test_valid_api_key(client, api_key_headers):
    response = await client.post(
        "/api/style/analyze",
        json={"user_input": "test"},
        headers=api_key_headers,
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_health_no_auth_needed(client):
    response = await client.get("/health")
    assert response.status_code == 200

    response = await client.get("/health/detailed")
    assert response.status_code == 200
