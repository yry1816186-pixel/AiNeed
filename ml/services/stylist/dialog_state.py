"""
对话状态机模型定义

定义对话状态枚举、Slot模型和对话上下文，
支撑 GREET→CONTEXT→GENERATE→REFINE→ACTION→WRAP 状态流转。
"""

from enum import Enum
from typing import Optional, List, Dict
from pydantic import BaseModel, Field


class DialogState(str, Enum):
    GREET = "GREET"
    CONTEXT = "CONTEXT"
    GENERATE = "GENERATE"
    REFINE = "REFINE"
    ACTION = "ACTION"
    WRAP = "WRAP"


class DialogSlot(BaseModel):
    occasion: Optional[str] = Field(
        None,
        description="场合: interview/date/travel/commute/seasonal/career/party/daily/campus"
    )
    body_type: Optional[str] = Field(
        None,
        description="体型: apple/pear/hourglass/rectangle/inverted-triangle"
    )
    style_preference: List[str] = Field(
        default_factory=list,
        description="风格偏好词列表"
    )
    budget: Optional[Dict[str, float]] = Field(
        None,
        description="预算范围 {min, max}"
    )
    color_preference: List[str] = Field(
        default_factory=list,
        description="颜色偏好列表"
    )
    avoid_items: List[str] = Field(
        default_factory=list,
        description="避免的单品列表"
    )
    temperature: Optional[float] = Field(
        None,
        description="天气温度(摄氏度)"
    )


class DialogContext(BaseModel):
    state: DialogState = DialogState.GREET
    slots: DialogSlot = Field(default_factory=DialogSlot)
    turn_count: int = 0
    generated_outfits: List[Dict] = Field(default_factory=list)
    user_feedback: List[str] = Field(default_factory=list)

    def is_slot_filled(self, slot_name: str) -> bool:
        val = getattr(self.slots, slot_name, None)
        if isinstance(val, list):
            return len(val) > 0
        return val is not None

    def missing_required_slots(self) -> List[str]:
        missing = []
        if not self.is_slot_filled("occasion"):
            missing.append("occasion")
        if not self.is_slot_filled("style_preference"):
            missing.append("style_preference")
        return missing

    def can_generate(self) -> bool:
        return self.is_slot_filled("occasion") and len(self.slots.style_preference) > 0
