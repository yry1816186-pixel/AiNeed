import io
import pytest


@pytest.mark.asyncio
async def test_analyze_photo_quality(client, api_key_headers):
    from PIL import Image

    img = Image.new("RGB", (640, 640), color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    response = await client.post(
        "/api/analysis/photo/analyze",
        files={"file": ("test.png", buf, "image/png")},
        headers=api_key_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert "quality_score" in data
    assert "metrics" in data
    assert "is_acceptable" in data


@pytest.mark.asyncio
async def test_analyze_no_image(client, api_key_headers):
    response = await client.post(
        "/api/analysis/photo/analyze",
        headers=api_key_headers,
    )
    assert response.status_code == 422
