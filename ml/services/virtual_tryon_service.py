from __future__ import annotations

import asyncio
import base64
import logging
import time
from typing import Any, Dict, Optional

import httpx

from ml.api.config import settings

logger = logging.getLogger(__name__)


class VirtualTryonService:
    def __init__(self) -> None:
        self.doubao_api_key = settings.DOUBAO_SEEDREAM_API_KEY
        self.doubao_api_url = settings.DOUBAO_SEEDREAM_API_URL
        self.doubao_result_url = settings.DOUBAO_SEEDREAM_RESULT_URL
        self.doubao_model = settings.DOUBAO_SEEDREAM_MODEL

        self.glm_api_key = settings.GLM_API_KEY or settings.ZHIPU_API_KEY
        self.glm_api_endpoint = settings.GLM_API_ENDPOINT

    async def generate_tryon(
        self,
        person_image: str,
        garment_image: str,
        category: str = "upper_body",
        prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        start_time = time.time()

        category_desc = {
            "upper_body": "上装",
            "lower_body": "下装",
            "dress": "连衣裙",
            "full_body": "全身装",
        }.get(category, "服装")

        default_prompt = f"穿着这件{category_desc}的人物照片，保持人物面部和姿势不变，高质量真实感"
        final_prompt = prompt or default_prompt

        try:
            result = await self._call_doubao_seedream(
                person_image, garment_image, final_prompt
            )
            result["processing_time"] = time.time() - start_time
            return result
        except Exception as e:
            logger.warning(
                "Doubao-Seedream failed, falling back to GLM: %s", str(e)
            )

        try:
            result = await self._call_glm_fallback(
                person_image, garment_image, category_desc
            )
            result["processing_time"] = time.time() - start_time
            return result
        except Exception as e:
            logger.error("GLM fallback also failed: %s", str(e))
            return {
                "success": False,
                "error": f"All providers failed: {str(e)}",
                "provider": "none",
                "processing_time": time.time() - start_time,
            }

    async def _call_doubao_seedream(
        self,
        person_b64: str,
        garment_b64: str,
        prompt: str,
    ) -> Dict[str, Any]:
        if not self.doubao_api_key:
            raise ValueError("Doubao-Seedream API key not configured")

        person_b64 = self._ensure_base64(person_b64)
        garment_b64 = self._ensure_base64(garment_b64)

        payload = {
            "req_key": "high_aes_general_v21_L",
            "model": self.doubao_model,
            "parameters": {
                "image": person_b64,
                "ref_image": garment_b64,
                "prompt": prompt,
                "strength": 0.75,
                "seed": -1,
            },
        }

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.doubao_api_key}",
        }

        async with httpx.AsyncClient(timeout=25.0) as client:
            response = await client.post(
                self.doubao_api_url, json=payload, headers=headers
            )
            response.raise_for_status()
            data = response.json()

        task_id = data.get("data", {}).get("task_id") or data.get("task_id")
        status = data.get("data", {}).get("status") or data.get("status")
        results = data.get("data", {}).get("results") or data.get("results")

        if status == "succeeded" and results and len(results) > 0:
            return {
                "success": True,
                "result_url": results[0].get("url", ""),
                "provider": "doubao-seedream",
            }

        if task_id:
            result = await self._poll_seedream_result(task_id, headers)
            return {
                "success": True,
                "result_url": result,
                "provider": "doubao-seedream",
            }

        raise ValueError(f"Doubao-Seedream returned no result: {data}")

    async def _poll_seedream_result(
        self, task_id: str, headers: Dict[str, str]
    ) -> str:
        max_attempts = 10
        interval = 2.0

        for attempt in range(max_attempts):
            await asyncio.sleep(interval)

            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.doubao_result_url}/{task_id}", headers=headers
                )
                response.raise_for_status()
                data = response.json()

            status = data.get("data", {}).get("status") or data.get("status")
            results = data.get("data", {}).get("results") or data.get("results")

            if status == "succeeded" and results and len(results) > 0:
                return results[0].get("url", "")

            if status == "failed":
                raise ValueError(f"Seedream task {task_id} failed: {data}")

            logger.debug(
                "Polling Seedream task %s, attempt %d, status: %s",
                task_id,
                attempt + 1,
                status,
            )

        raise TimeoutError(
            f"Seedream task {task_id} timed out after {max_attempts} polls"
        )

    async def _call_glm_fallback(
        self,
        person_b64: str,
        garment_b64: str,
        category_desc: str,
    ) -> Dict[str, Any]:
        if not self.glm_api_key:
            raise ValueError("GLM API key not configured")

        person_b64 = self._ensure_base64(person_b64)
        garment_b64 = self._ensure_base64(garment_b64)

        prompt = f"请生成一张图片：将第二张图片中的{category_desc}穿在第一张图片的人物身上，保持人物面部和姿势不变，生成高质量真实感的换装效果图。"

        payload = {
            "model": "glm-4v-plus",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{person_b64}"
                            },
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{garment_b64}"
                            },
                        },
                        {"type": "text", "text": prompt},
                    ],
                }
            ],
            "max_tokens": 1024,
            "temperature": 0.3,
        }

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.glm_api_key}",
        }

        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                f"{self.glm_api_endpoint}/chat/completions",
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
            data = response.json()

        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")

        result_url = None
        if isinstance(content, str):
            import re

            url_match = re.search(
                r"https?://[^\s\"'<>]+\.(png|jpg|jpeg|webp)", content, re.IGNORECASE
            )
            if url_match:
                result_url = url_match.group(0)

        if isinstance(content, list):
            for item in content:
                if item.get("type") == "image_url" and item.get("image_url", {}).get(
                    "url"
                ):
                    result_url = item["image_url"]["url"]
                    break

        if not result_url:
            raise ValueError("GLM returned text-only response, no image generated")

        return {
            "success": True,
            "result_url": result_url,
            "provider": "glm-tryon",
        }

    def _ensure_base64(self, image_input: str) -> str:
        if image_input.startswith("data:image"):
            return image_input.split(",", 1)[1]
        if image_input.startswith("http"):
            return image_input
        return image_input


virtual_tryon_service = VirtualTryonService()
