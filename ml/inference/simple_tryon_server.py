"""
简化版虚拟试衣服务
使用图像合成技术实现虚拟试衣效果
"""

import os
import io
import base64
import time
import asyncio
import aiohttp
from typing import Optional, Tuple
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from PIL import Image
import numpy as np

app = FastAPI(
    title="Virtual Try-On Service",
    description="Simplified virtual try-on using image composition",
    version="1.0.0"
)


class TryOnRequest(BaseModel):
    person_image: str = Field(..., description="Person image URL or base64")
    cloth_image: str = Field(..., description="Cloth image URL or base64")
    category: str = Field(default="upper_body", description="Category: upper_body, lower_body")


class TryOnResponse(BaseModel):
    success: bool
    result_image: Optional[str] = None
    message: str = ""
    processing_time: float = 0.0


async def download_image(url: str) -> bytes:
    async with aiohttp.ClientSession() as session:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as response:
            if response.status == 200:
                return await response.read()
            raise Exception(f"Failed to download image: {response.status}")


async def composite_images(
    person_bytes: bytes,
    cloth_bytes: bytes,
    category: str = "upper_body"
) -> Tuple[bytes, float]:
    start_time = time.time()
    
    person_img = Image.open(io.BytesIO(person_bytes)).convert("RGB")
    cloth_img = Image.open(io.BytesIO(cloth_bytes)).convert("RGB")
    
    target_width, target_height = 512, 384
    person_img = person_img.resize((target_width, target_height), Image.LANCZOS)
    cloth_img = cloth_img.resize((256, 256), Image.LANCZOS)
    
    person_np = np.array(person_img).astype(np.float32) / 255.0
    cloth_np = np.array(cloth_img).astype(np.float32) / 255.0
    
    result_np = person_np.copy()
    
    if category == "upper_body":
        y_start, y_end = 80, 280
        x_start, x_end = 130, 380
        
        # Vectorized blending using NumPy array operations (replaces slow Python loops)
        h_range = y_end - y_start
        w_range = x_end - x_start
        cloth_y_indices = np.clip(
            ((np.arange(h_range) / h_range) * 255).astype(int), 0, 255
        )
        cloth_x_indices = np.clip(
            ((np.arange(w_range) / w_range) * 255).astype(int), 0, 255
        )
        
        # Create coordinate grids for cloth sampling
        cloth_y_grid, cloth_x_grid = np.meshgrid(cloth_y_indices, cloth_x_indices, indexing='ij')
        cloth_sampled = cloth_np[cloth_y_grid, cloth_x_grid]
        
        # Apply blend factor
        blend = 0.65
        blended = result_np[y_start:y_end, x_start:x_end] * (1 - blend) + cloth_sampled * blend
        result_np[y_start:y_end, x_start:x_end] = blended
    
    elif category == "lower_body":
        y_start, y_end = 220, 380
        x_start, x_end = 100, 400
        
        # Same vectorized approach for lower body
        h_range = y_end - y_start
        w_range = x_end - x_start
        cloth_y_indices = np.clip(
            ((np.arange(h_range) / h_range) * 255).astype(int), 0, 255
        )
        cloth_x_indices = np.clip(
            ((np.arange(w_range) / w_range) * 255).astype(int), 0, 255
        )
        
        cloth_y_grid, cloth_x_grid = np.meshgrid(cloth_y_indices, cloth_x_indices, indexing='ij')
        cloth_sampled = cloth_np[cloth_y_grid, cloth_x_grid]
        
        blend = 0.55
        blended = result_np[y_start:y_end, x_start:x_end] * (1 - blend) + cloth_sampled * blend
        result_np[y_start:y_end, x_start:x_end] = blended
    
    result_img = Image.fromarray((result_np * 255).astype(np.uint8))
    
    buffer = io.BytesIO()
    result_img.save(buffer, format="PNG", quality=95)
    
    processing_time = time.time() - start_time
    
    return buffer.getvalue(), processing_time


def image_to_base64(image_bytes: bytes) -> str:
    return base64.b64encode(image_bytes).decode("utf-8")


def base64_to_image(base64_str: str) -> bytes:
    if base64_str.startswith("data:image"):
        base64_str = base64_str.split(",", 1)[1]
    return base64.b64decode(base64_str)


@app.post("/tryon", response_model=TryOnResponse)
async def tryon(request: TryOnRequest):
    try:
        if request.person_image.startswith("http"):
            person_bytes = await download_image(request.person_image)
        else:
            person_bytes = base64_to_image(request.person_image)
        
        if request.cloth_image.startswith("http"):
            cloth_bytes = await download_image(request.cloth_image)
        else:
            cloth_bytes = base64_to_image(request.cloth_image)
        
        result_bytes, processing_time = await composite_images(
            person_bytes,
            cloth_bytes,
            request.category
        )
        
        result_base64 = image_to_base64(result_bytes)
        
        return TryOnResponse(
            success=True,
            result_image=f"data:image/png;base64,{result_base64}",
            message="Virtual try-on completed successfully",
            processing_time=processing_time
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "virtual-tryon",
        "version": "1.0.0",
        "timestamp": time.time()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
