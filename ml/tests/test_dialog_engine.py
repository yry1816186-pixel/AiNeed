"""
Tests for DialogEngine state machine, interview flow, personality, and exception handling.

Covers: YIYI-01 (state machine), YIYI-02 (interview flow), YIYI-03 (personality),
        YIYI-06 (quick replies), YIYI-07 (exception handling), ETH-01/02 (body-positive).
"""

import pytest
from unittest.mock import AsyncMock, MagicMock

from ml.services.stylist.dialog_state import DialogState, DialogSlot, DialogContext
from ml.services.stylist.dialog_engine import (
    DialogEngine,
    YIYI_PERSONALITY_PROMPT,
    BODY_POSITIVE_PROMPT,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_engine(
    outfit_generator=None,
    llm_reply: str = "好的",
) -> DialogEngine:
    """Create a DialogEngine with mocked dependencies."""
    extractor = MagicMock()
    extractor.extract = AsyncMock(side_effect=lambda msg, slots: slots)
    llm_fn = AsyncMock(return_value=llm_reply)
    return DialogEngine(
        slot_extractor=extractor,
        llm_call_fn=llm_fn,
        outfit_generator=outfit_generator,
    )


def _context(state=DialogState.GREET, **slot_overrides) -> DialogContext:
    """Build a DialogContext with optional slot overrides."""
    slots = DialogSlot(**slot_overrides)
    return DialogContext(state=state, slots=slots)


# ---------------------------------------------------------------------------
# Test 1: DialogState enum contains SCENE, DIRECT, CHAT
# ---------------------------------------------------------------------------

class TestDialogStateEnum:
    def test_scene_exists(self):
        assert DialogState.SCENE == "SCENE"

    def test_direct_exists(self):
        assert DialogState.DIRECT == "DIRECT"

    def test_chat_exists(self):
        assert DialogState.CHAT == "CHAT"


# ---------------------------------------------------------------------------
# Test 2: GREET -> SCENE when user specifies interview scene
# ---------------------------------------------------------------------------

class TestGreetToSceneTransition:
    @pytest.mark.asyncio
    async def test_greet_to_scene_interview(self):
        engine = _make_engine()
        # Mock extractor to detect interview occasion
        async def fake_extract(msg, slots):
            slots.occasion = "interview"
            return slots
        engine.slot_extractor.extract = AsyncMock(side_effect=fake_extract)

        ctx = _context(state=DialogState.GREET)
        result = await engine.process_message("我要准备面试", ctx)

        assert ctx.state == DialogState.SCENE
        assert result["state"] == "SCENE"


# ---------------------------------------------------------------------------
# Test 3: GREET -> DIRECT when user gives full details
# ---------------------------------------------------------------------------

class TestGreetToDirectTransition:
    @pytest.mark.asyncio
    async def test_greet_to_direct(self):
        engine = _make_engine()
        async def fake_extract(msg, slots):
            slots.occasion = "interview"
            slots.style_preference = ["简约利落"]
            return slots
        engine.slot_extractor.extract = AsyncMock(side_effect=fake_extract)

        ctx = _context(state=DialogState.GREET)
        result = await engine.process_message("面试穿简约利落的风格", ctx)

        assert ctx.state == DialogState.DIRECT


# ---------------------------------------------------------------------------
# Test 4: GREET -> CONTEXT when message is vague
# ---------------------------------------------------------------------------

class TestGreetToContextTransition:
    @pytest.mark.asyncio
    async def test_greet_to_context_vague(self):
        engine = _make_engine()
        async def fake_extract(msg, slots):
            # No slots filled - vague message
            return slots
        engine.slot_extractor.extract = AsyncMock(side_effect=fake_extract)

        ctx = _context(state=DialogState.GREET)
        result = await engine.process_message("你好", ctx)

        assert ctx.state == DialogState.CONTEXT


# ---------------------------------------------------------------------------
# Test 5: Interview flow: company -> position -> budget -> can_generate
# ---------------------------------------------------------------------------

class TestInterviewFlow:
    @pytest.mark.asyncio
    async def test_interview_slot_extraction(self):
        engine = _make_engine()
        async def fake_extract_company(msg, slots):
            if "公司" in msg or "互联网" in msg:
                slots.company = "互联网公司"
            return slots
        engine.slot_extractor.extract = AsyncMock(side_effect=fake_extract_company)

        ctx = _context(state=DialogState.SCENE, occasion="interview")
        result = await engine.process_message("我要去互联网公司面试", ctx)

        assert ctx.slots.company == "互联网公司"
        assert result["state"] == "SCENE"

    @pytest.mark.asyncio
    async def test_interview_all_slots_filled_generates(self):
        engine = _make_engine(outfit_generator=AsyncMock(return_value=[
            {"items": [{"name": "西装"}], "overall_score": 0.9}
        ]))
        async def fake_extract(msg, slots):
            slots.occasion = "interview"
            slots.company = "互联网公司"
            slots.position = "技术岗"
            slots.budget = {"min": 1000, "max": 3000}
            slots.style_preference = ["简约利落"]
            return slots
        engine.slot_extractor.extract = AsyncMock(side_effect=fake_extract)

        ctx = _context(state=DialogState.SCENE, occasion="interview")
        ctx.slots.company = "互联网公司"
        ctx.slots.position = "技术岗"
        ctx.slots.budget = {"min": 1000, "max": 3000}

        result = await engine.process_message("准备好了", ctx)
        assert ctx.state == DialogState.GENERATE


# ---------------------------------------------------------------------------
# Test 6: GENERATE with sentiment "positive" transitions to ACTION
# ---------------------------------------------------------------------------

class TestGeneratePositiveFeedback:
    @pytest.mark.asyncio
    async def test_positive_feedback_to_action(self):
        engine = _make_engine()

        ctx = _context(state=DialogState.GENERATE)
        ctx.generated_outfits = [{"items": [], "overall_score": 0.8}]

        # Mock feedback analysis to return positive
        engine._analyze_feedback = AsyncMock(return_value={
            "sentiment": "positive",
            "selected_index": 0,
            "reason": "likes it",
        })

        result = await engine.process_message("喜欢方案A", ctx)

        assert ctx.state == DialogState.ACTION
        assert result["state"] == "ACTION"


# ---------------------------------------------------------------------------
# Test 7: GENERATE with 3 consecutive negative feedback triggers studio signal
# ---------------------------------------------------------------------------

class TestGenerateNegativeFeedbackStudioSignal:
    @pytest.mark.asyncio
    async def test_three_negatives_trigger_studio_signal(self):
        engine = _make_engine()

        ctx = _context(state=DialogState.GENERATE)
        ctx.generated_outfits = [{"items": [], "overall_score": 0.8}]
        ctx.negative_feedback_count = 2  # Already 2 negatives

        engine._analyze_feedback = AsyncMock(return_value={
            "sentiment": "negative",
            "selected_index": 0,
            "reason": "dislikes",
        })

        result = await engine.process_message("都不喜欢", ctx)

        # negative_feedback_count should be incremented to 3
        assert ctx.negative_feedback_count >= 3
        # Should include studio signal
        assert result.get("studio_signal") is not None


# ---------------------------------------------------------------------------
# Test 8: WRAP with "give up" intent returns gentle close message
# ---------------------------------------------------------------------------

class TestWrapGentleClose:
    @pytest.mark.asyncio
    async def test_give_up_in_refine_transitions_to_wrap(self):
        engine = _make_engine()

        ctx = _context(state=DialogState.REFINE)
        ctx.generated_outfits = [{"items": [], "overall_score": 0.8}]

        result = await engine.process_message("算了不要了", ctx)

        assert ctx.state == DialogState.WRAP
        # Gentle close message should be present
        assert "下次" in result["reply"] or "随时" in result["reply"]


# ---------------------------------------------------------------------------
# Test 9: GENERATE with empty outfits returns rule-based fallback
# ---------------------------------------------------------------------------

class TestGenerateEmptyOutfitsFallback:
    @pytest.mark.asyncio
    async def test_empty_outfits_gives_fallback(self):
        engine = _make_engine(outfit_generator=AsyncMock(return_value=[]))

        ctx = _context(state=DialogState.DIRECT)
        ctx.slots.occasion = "interview"
        ctx.slots.style_preference = ["简约利落"]

        result = await engine.process_message("直接给我搭配", ctx)

        # Should contain rule-based fallback message
        assert "基础规则" in result["reply"] or "搭配方案" in result["reply"]


# ---------------------------------------------------------------------------
# Test 10: YIYI_PERSONALITY_PROMPT exists with forbidden phrases
# ---------------------------------------------------------------------------

class TestYiyiPersonalityPrompt:
    def test_personality_prompt_exists(self):
        assert YIYI_PERSONALITY_PROMPT is not None
        assert len(YIYI_PERSONALITY_PROMPT) > 100

    def test_forbidden_phrases_listed(self):
        assert "亲~" in YIYI_PERSONALITY_PROMPT
        assert "根据算法分析" in YIYI_PERSONALITY_PROMPT

    def test_body_positive_rules_in_personality(self):
        assert "衣服" in YIYI_PERSONALITY_PROMPT
        assert "适合你的风格" in YIYI_PERSONALITY_PROMPT


# ---------------------------------------------------------------------------
# Test 11: DialogSlot new fields
# ---------------------------------------------------------------------------

class TestDialogSlotNewFields:
    def test_company_field(self):
        slot = DialogSlot(company="互联网公司")
        assert slot.company == "互联网公司"

    def test_position_field(self):
        slot = DialogSlot(position="技术岗")
        assert slot.position == "技术岗"

    def test_color_season_field(self):
        slot = DialogSlot(color_season="spring_warm")
        assert slot.color_season == "spring_warm"


# ---------------------------------------------------------------------------
# Test 12: DialogContext new fields
# ---------------------------------------------------------------------------

class TestDialogContextNewFields:
    def test_preference_memory(self):
        ctx = DialogContext()
        assert ctx.preference_memory == {}

    def test_negative_feedback_count(self):
        ctx = DialogContext()
        assert ctx.negative_feedback_count == 0


# ---------------------------------------------------------------------------
# Test 13: CHAT handler
# ---------------------------------------------------------------------------

class TestChatHandler:
    @pytest.mark.asyncio
    async def test_chat_handler_returns_reply(self):
        engine = _make_engine(llm_reply="嗯，有什么穿搭问题都可以问我哦")
        ctx = _context(state=DialogState.CHAT)
        result = await engine.process_message("你好呀", ctx)
        assert result["reply"] is not None
        assert result["state"] == "CHAT"

    @pytest.mark.asyncio
    async def test_chat_transitions_to_scene_on_intent(self):
        engine = _make_engine()
        async def fake_extract(msg, slots):
            slots.occasion = "interview"
            return slots
        engine.slot_extractor.extract = AsyncMock(side_effect=fake_extract)

        ctx = _context(state=DialogState.CHAT)
        result = await engine.process_message("我要准备面试穿搭", ctx)

        assert ctx.state == DialogState.SCENE


# ---------------------------------------------------------------------------
# Test 14: Quick replies are state-aware for interview
# ---------------------------------------------------------------------------

class TestStateAwareQuickReplies:
    @pytest.mark.asyncio
    async def test_interview_quick_replies_in_generate(self):
        outfits = [
            {"items": [{"name": "西装"}], "overall_score": 0.9},
            {"items": [{"name": "衬衫"}], "overall_score": 0.85},
            {"items": [{"name": "针织"}], "overall_score": 0.8},
        ]
        engine = _make_engine(outfit_generator=AsyncMock(return_value=outfits))

        ctx = _context(state=DialogState.DIRECT)
        ctx.slots.occasion = "interview"
        ctx.slots.style_preference = ["简约利落"]

        result = await engine.process_message("给我搭配", ctx)
        quick_replies = result.get("quick_replies", [])
        # Should contain interview-specific options
        assert any("价位" in r or "风格" in r for r in quick_replies)

    def test_interview_context_quick_replies(self):
        engine = _make_engine()
        ctx = _context()
        ctx.slots.occasion = "interview"
        replies = engine._get_context_quick_replies(ctx)
        assert any("公司" in r for r in replies)


# ---------------------------------------------------------------------------
# Test 15: All LLM calls use YIYI_PERSONALITY_PROMPT
# ---------------------------------------------------------------------------

class TestLLMPersonalityIntegration:
    @pytest.mark.asyncio
    async def test_ask_for_slots_uses_personality(self):
        calls = []
        async def capture_llm(messages, **kwargs):
            calls.append(messages)
            return "什么场合呢？"

        engine = _make_engine()
        engine._call_llm = capture_llm

        ctx = _context(state=DialogState.CONTEXT)
        await engine._ask_for_slots(["occasion"], ctx)

        # System message should contain personality prompt
        assert len(calls) > 0
        system_msgs = [m for m in calls[0] if m["role"] == "system"]
        assert any(YIYI_PERSONALITY_PROMPT[:20] in m["content"] for m in system_msgs)
