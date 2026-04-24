"""
Slot提取器 - 从用户消息中提取穿搭偏好信息

使用LLM从自然语言中结构化提取：
- 场合(occasion)
- 体型(body_type)
- 风格偏好(style_preference)
- 预算(budget)
- 颜色偏好(color_preference)
- 避免单品(avoid_items)
- 温度(temperature)
"""

import json
import logging
from typing import Optional

from ml.services.stylist.dialog_state import DialogSlot

logger = logging.getLogger(__name__)

SLOT_EXTRACTION_PROMPT = """从用户消息中提取穿搭偏好信息。当前已知信息: {current_slots}
用户消息: {user_message}

请返回JSON格式的更新后信息:
{{
  "occasion": "interview/date/travel/commute/seasonal/career/party/daily/campus 或 null",
  "body_type": "apple/pear/hourglass/rectangle/inverted-triangle 或 null",
  "style_preference": ["风格词列表"] 或 [],
  "budget": {{"min": 数字, "max": 数字}} 或 null,
  "color_preference": ["颜色列表"] 或 [],
  "avoid_items": ["避免的单品"] 或 [],
  "temperature": 数字 或 null
}}

只更新从用户消息中能明确推断的字段，其他保持null或空列表。"""


class SlotExtractor:
    def __init__(self, llm_call_fn):
        self._call_llm = llm_call_fn

    async def extract(self, user_message: str, current_slots: DialogSlot) -> DialogSlot:
        prompt = SLOT_EXTRACTION_PROMPT.format(
            current_slots=current_slots.model_dump_json(),
            user_message=user_message,
        )

        try:
            raw = await self._call_llm(
                messages=[{"role": "user", "content": prompt}],
                max_tokens=500,
            )
            parsed = self._parse_json_response(raw)
            if parsed is None:
                return current_slots
            updated = DialogSlot(**parsed)
            return self._merge_slots(current_slots, updated)
        except Exception as e:
            logger.warning(f"Slot extraction failed: {e}")
            return current_slots

    def _parse_json_response(self, raw: str) -> Optional[dict]:
        text = raw.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            lines = [l for l in lines if not l.startswith("```")]
            text = "\n".join(lines).strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            start = text.find("{")
            end = text.rfind("}")
            if start != -1 and end != -1 and end > start:
                try:
                    return json.loads(text[start : end + 1])
                except json.JSONDecodeError:
                    pass
            logger.warning(f"Failed to parse slot JSON: {text[:200]}")
            return None

    def _merge_slots(self, current: DialogSlot, update: DialogSlot) -> DialogSlot:
        merged = current.model_copy()
        for field_name in update.model_fields:
            val = getattr(update, field_name)
            if val is not None and val != [] and val != {}:
                setattr(merged, field_name, val)
        return merged
