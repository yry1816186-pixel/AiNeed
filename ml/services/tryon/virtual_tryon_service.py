from __future__ import annotations

import asyncio
import base64
import io
import logging
import time
from typing import Any, Dict, Optional

import httpx
from PIL import Image

from ml.api.config import settings
from ml.services.tryon.tryon_preprocessor import TryonPreprocessor
from ml.services.tryon.tryon_prompt_engine import TryonPromptEngine
from ml.services.tryon.tryon_postprocessor import TryonPostprocessor

# P1-9: Import externalized prompts
from .stylist_prompts import VIRTUAL_TRYON_PROMPT_TEMPLATE

logger = logging.getLogger(__name__)


class VirtualTryonService:
    def __init__(self) -> None:
        self.doubao_api_key = settings.DOUBAO_SEEDREAM_API_KEY
        self.doubao_api_url = settings.DOUBAO_SEEDREAM_API_URL
        self.doubao_result_url = settings.DOUBAO_SEEDREAM_RESULT_URL
        self.doubao_model = settings.DOUBAO_SEEDREAM_MODEL

        self.glm_api_key = settings.GLM_API_KEY or settings.ZHIPU_API_KEY
        self.glm_api_endpoint = settings.GLM_API_ENDPOINT

        # Algorithm pipeline components
        self.preprocessor = TryonPreprocessor()
        self.prompt_engine = TryonPromptEngine()
        self.postprocessor = TryonPostprocessor()

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

        # Stage 1: Preprocessing - analyze person and garment images
        preprocess_result = None
        try:
            person_img = self._decode_image(person_image)
            garment_img = self._decode_image(garment_image)
            preprocess_result = await self.preprocessor.analyze(
                person_img, garment_img, category
            )
            logger.info(
                "Preprocessing complete: alignment=%s, lighting=%s, garment=%s",
                preprocess_result.alignment.pose_description,
                preprocess_result.lighting.color_temperature,
                preprocess_result.garment_features.formality,
            )
        except Exception as e:
            logger.warning("Preprocessing failed (non-critical): %s", str(e))

        # Stage 2: Intelligent prompt generation
        if preprocess_result:
            enhanced_prompt = self.prompt_engine.generate(
                preprocess_result, category, prompt
            )
        else:
            default_prompt = f"穿着这件{category_desc}的人物照片，保持人物面部和姿势不变，高质量真实感"
            enhanced_prompt = prompt or default_prompt

        # Stage 3: API call (existing logic)
        try:
            result = await self._call_doubao_seedream(
                person_image, garment_image, enhanced_prompt
            )
            result["processing_time"] = time.time() - start_time
            result["prompt_used"] = enhanced_prompt
            result["preprocessing_applied"] = preprocess_result is not None

            # Stage 4: Postprocessing quality validation
            if preprocess_result and result.get("result_url"):
                try:
                    async with httpx.AsyncClient(timeout=15.0) as client:
                        img_resp = await client.get(result["result_url"])
                        img_resp.raise_for_status()
                        result_img = Image.open(io.BytesIO(img_resp.content))
                    quality = await self.postprocessor.validate(
                        person_img, garment_img, result_img, preprocess_result
                    )
                    result["quality_metrics"] = quality.to_dict()
                except Exception as e:
                    logger.warning("Postprocessing validation failed: %s", str(e))

            return result
        except Exception as e:
            logger.warning(
                "Doubao-Seedream failed, falling back to GLM: %s", str(e)
            )

        try:
            # Use GLM-specific prompt if preprocessing is available
            if preprocess_result:
                glm_prompt = self.prompt_engine.generate_for_glm(
                    preprocess_result, category
                )
            else:
                glm_prompt = None

            result = await self._call_glm_fallback(
                person_image, garment_image, category_desc, glm_prompt
            )
            result["processing_time"] = time.time() - start_time
            result["prompt_used"] = glm_prompt or enhanced_prompt
            result["preprocessing_applied"] = preprocess_result is not None
            return result
        except Exception as e:
            logger.error("GLM fallback also failed: %s", str(e))
            return {
                "success": False,
                "error": f"All providers failed: {str(e)}",
                "provider": "none",
                "processing_time": time.time() - start_time,
            }

    def _decode_image(self, image_input: str) -> Image.Image:
        """Decode base64 or URL image to PIL Image."""
        if image_input.startswith("data:image"):
            b64 = image_input.split(",", 1)[1]
            img_bytes = base64.b64decode(b64)
            return Image.open(io.BytesIO(img_bytes))
        if image_input.startswith("http"):
            raise ValueError("URL images need to be fetched first")
        # Assume raw base64
        img_bytes = base64.b64decode(image_input)
        return Image.open(io.BytesIO(img_bytes))

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
        custom_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """GLM fallback for virtual try-on.

        P0-2: Uses images/generations endpoint instead of chat/completions.
        The chat/completions endpoint returns text-only responses for image generation
        requests, which is incorrect. The images/generations endpoint is the proper
        endpoint for GLM image generation APIs.

        If images/generations is not available, raises an explicit error instead
        of silently returning an invalid result.
        """
        if not self.glm_api_key:
            raise ValueError("GLM API key not configured")

        person_b64 = self._ensure_base64(person_b64)
        garment_b64 = self._ensure_base64(garment_b64)

        prompt = custom_prompt or VIRTUAL_TRYON_PROMPT_TEMPLATE.format(category_desc=category_desc)

        # P0-2: Try images/generations endpoint first (correct for image generation)
        images_url = f"{self.glm_api_endpoint}/images/generations"

        payload = {
            "model": "cogview-3-plus",
            "prompt": prompt,
            "size": "1024x1024",
        }

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.glm_api_key}",
        }

        # Attempt 1: images/generations endpoint
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    images_url,
                    json=payload,
                    headers=headers,
                )

                if response.status_code == 200:
                    data = response.json()
                    # Extract image URL from response
                    result_url = None
                    if isinstance(data.get("data"), list) and len(data["data"]) > 0:
                        result_url = data["data"][0].get("url")
                    elif data.get("url"):
                        result_url = data["url"]

                    if result_url:
                        return {
                            "success": True,
                            "result_url": result_url,
                            "provider": "glm-cogview",
                        }
                    else:
                        logger.warning(
                            "GLM images/generations returned 200 but no image URL found: %s",
                            list(data.keys()),
                        )
                elif response.status_code == 404:
                    logger.info(
                        "GLM images/generations endpoint not available (404), "
                        "falling back to chat/completions with vision model"
                    )
                else:
                    logger.warning(
                        "GLM images/generations returned status %d, falling back to chat/completions",
                        response.status_code,
                    )
        except Exception as e:
            logger.warning("GLM images/generations call failed: %s, falling back", str(e))

        # Attempt 2: Fallback to chat/completions with vision model
        # This may return text-only responses, so we validate the output carefully
        chat_payload = {
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

        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                f"{self.glm_api_endpoint}/chat/completions",
                json=chat_payload,
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
            # P0-2: Explicitly raise error instead of silently returning invalid result
            raise ValueError(
                "GLM API returned text-only response, no image generated. "
                "The images/generations endpoint is not available and the "
                "chat/completions endpoint does not support image generation. "
                "Please check GLM API configuration or use a different provider."
            )

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
