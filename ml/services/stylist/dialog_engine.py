"""
对话状态机引擎

实现 GREET→CONTEXT→GENERATE→REFINE→ACTION→WRAP 状态流转，
驱动有状态的对话Agent行为。

核心逻辑：
1. GREET: 初始问候，尝试从首条消息提取slot
2. CONTEXT: 收集场景/偏好信息，追问缺失的必填slot
3. GENERATE: 信息足够后生成搭配方案
4. REFINE: 用户要求调整，重新生成
5. ACTION: 展示详情/试穿
6. WRAP: 对话结束
"""

import json
import logging
from typing import Dict, List, Optional

from ml.services.stylist.dialog_state import DialogState, DialogContext, DialogSlot
from ml.services.stylist.slot_extractor import SlotExtractor

logger = logging.getLogger(__name__)

BODY_POSITIVE_PROMPT = """你必须遵循以下措辞原则：
1. 描述服装特点，不描述身体特征
2. 用"这件衣服的版型很适合你的比例"而非"遮住XXX"
3. 用"利落的剪裁让整体线条更流畅"而非"显瘦"
4. 试穿效果不理想时归因于"这件衣服的剪裁可能不是最佳选择"
5. 推荐时用"适合你的风格"而非"适合你的体型"
6. 永远从"衣服特点"出发，不从"身体缺点"出发"""

FEEDBACK_ANALYSIS_PROMPT = """分析用户对推荐方案的反馈。

用户消息: {message}
当前推荐方案数: {outfit_count}

请返回JSON:
{{
  "sentiment": "positive" | "refine" | "negative",
  "selected_index": 0,
  "reason": "简短原因"
}}

判断规则：
- positive: 用户明确表示喜欢、满意、选择某个方案
- refine: 用户要求调整风格/颜色/价位等，但仍在寻找推荐
- negative: 用户不满意且没有给出具体调整方向"""

CONTEXT_ASK_PROMPT = """你是一位专业的私人造型师，正在了解客户的穿搭需求。

目前已了解的信息: {slots_summary}
还需要了解: {missing_summary}

请用亲切自然的语气，询问客户关于缺失信息的问题。要求：
1. 一次最多问1-2个问题
2. 给出具体的选项引导
3. 不要重复已经了解的信息
4. 保持专业但亲切的语气

{body_positive_rule}"""

OUTFIT_REPLY_PROMPT = """你是一位专业的私人造型师，刚刚为客户生成了搭配方案。

客户需求: {slots_summary}
方案数量: {outfit_count}
方案概要: {outfits_summary}

请用自然语言向客户介绍这些方案。要求：
1. 简要概括每个方案的特色
2. 说明为什么适合客户的需求
3. 语气亲切专业
4. 不要超过200字

{body_positive_rule}"""


class DialogEngine:
    def __init__(
        self,
        slot_extractor: SlotExtractor,
        llm_call_fn,
        outfit_generator=None,
    ):
        self.slot_extractor = slot_extractor
        self._call_llm = llm_call_fn
        self._outfit_generator = outfit_generator

    async def process_message(
        self,
        user_message: str,
        context: DialogContext,
    ) -> Dict:
        context.turn_count += 1

        handler_map = {
            DialogState.GREET: self._handle_greet,
            DialogState.CONTEXT: self._handle_context,
            DialogState.GENERATE: self._handle_generate,
            DialogState.REFINE: self._handle_refine,
            DialogState.ACTION: self._handle_action,
            DialogState.WRAP: self._handle_wrap,
        }
        handler = handler_map.get(context.state, self._handle_wrap)
        return await handler(user_message, context)

    async def _handle_greet(self, message: str, context: DialogContext) -> Dict:
        context.slots = await self.slot_extractor.extract(message, context.slots)

        if context.can_generate():
            context.state = DialogState.GENERATE
            return await self._generate_outfits(context)

        context.state = DialogState.CONTEXT
        missing = context.missing_required_slots()
        reply = await self._ask_for_slots(missing, context)
        return {
            "reply": reply,
            "quick_replies": self._get_context_quick_replies(context),
            "state": context.state.value,
            "slots": context.slots.model_dump(),
        }

    async def _handle_context(self, message: str, context: DialogContext) -> Dict:
        context.slots = await self.slot_extractor.extract(message, context.slots)

        if context.can_generate():
            context.state = DialogState.GENERATE
            return await self._generate_outfits(context)

        missing = context.missing_required_slots()
        reply = await self._ask_for_slots(missing, context)
        return {
            "reply": reply,
            "quick_replies": self._get_context_quick_replies(context),
            "state": context.state.value,
            "slots": context.slots.model_dump(),
        }

    async def _handle_generate(self, message: str, context: DialogContext) -> Dict:
        feedback = await self._analyze_feedback(message, len(context.generated_outfits))

        if feedback.get("sentiment") == "positive":
            context.state = DialogState.ACTION
            selected_idx = feedback.get("selected_index", 0)
            context.user_feedback.append(f"positive:{selected_idx}")
            return {
                "reply": "太好了！要不要试试穿上看看效果？",
                "quick_replies": ["试穿效果", "查看搭配详情", "再来一套"],
                "state": context.state.value,
                "selected_outfit": selected_idx,
                "slots": context.slots.model_dump(),
            }

        if feedback.get("sentiment") == "refine":
            context.state = DialogState.REFINE
            context.slots = await self.slot_extractor.extract(message, context.slots)
            context.user_feedback.append(f"refine:{feedback.get('reason', '')}")
            return await self._generate_outfits(context)

        context.state = DialogState.REFINE
        context.user_feedback.append("negative")
        return {
            "reply": "没关系，告诉我你更想要什么感觉的？",
            "quick_replies": ["换个风格", "换个颜色", "换个价位"],
            "state": context.state.value,
            "slots": context.slots.model_dump(),
        }

    async def _handle_refine(self, message: str, context: DialogContext) -> Dict:
        context.slots = await self.slot_extractor.extract(message, context.slots)

        if context.can_generate():
            return await self._generate_outfits(context)

        missing = context.missing_required_slots()
        reply = await self._ask_for_slots(missing, context)
        return {
            "reply": reply,
            "quick_replies": self._get_context_quick_replies(context),
            "state": context.state.value,
            "slots": context.slots.model_dump(),
        }

    async def _handle_action(self, message: str, context: DialogContext) -> Dict:
        msg_lower = message.lower()

        if any(kw in msg_lower for kw in ["试穿", "穿上", "效果", "看看"]):
            return {
                "reply": "正在为你生成试穿效果图，请稍等...",
                "quick_replies": ["查看其他方案", "调整搭配"],
                "state": DialogState.ACTION.value,
                "action": "try_on",
                "slots": context.slots.model_dump(),
            }

        if any(kw in msg_lower for kw in ["详情", "详细", "单品"]):
            return {
                "reply": "这是搭配的详细信息。",
                "quick_replies": ["试穿效果", "再来一套", "结束"],
                "state": DialogState.ACTION.value,
                "action": "detail",
                "slots": context.slots.model_dump(),
            }

        if any(kw in msg_lower for kw in ["再来", "换一套", "其他"]):
            context.state = DialogState.GENERATE
            return await self._generate_outfits(context)

        context.state = DialogState.WRAP
        return await self._handle_wrap(message, context)

    async def _handle_wrap(self, message: str, context: DialogContext) -> Dict:
        return {
            "reply": "很高兴能帮到你！下次需要穿搭建议随时找我哦 ✨",
            "quick_replies": ["开始新对话"],
            "state": DialogState.WRAP.value,
            "slots": context.slots.model_dump(),
        }

    async def _generate_outfits(self, context: DialogContext) -> Dict:
        if self._outfit_generator is not None:
            try:
                outfits = await self._outfit_generator(context)
                context.generated_outfits = outfits
            except Exception as e:
                logger.warning(f"Outfit generation failed: {e}")
                context.generated_outfits = []
        else:
            context.generated_outfits = []

        context.state = DialogState.GENERATE
        reply = await self._format_outfit_reply(context)

        quick_replies = []
        for i, outfit in enumerate(context.generated_outfits[:3]):
            label = chr(65 + i)
            quick_replies.append(f"喜欢方案{label}")
        quick_replies.append("都不喜欢")

        return {
            "reply": reply,
            "outfits": context.generated_outfits,
            "quick_replies": quick_replies,
            "state": context.state.value,
            "slots": context.slots.model_dump(),
        }

    async def _ask_for_slots(self, missing: List[str], context: DialogContext) -> str:
        slots_summary = context.slots.model_dump_json(exclude_none=True, exclude_defaults=True)
        missing_names = {
            "occasion": "穿搭场合",
            "style_preference": "风格偏好",
            "body_type": "体型",
            "budget": "预算",
            "color_preference": "颜色偏好",
            "temperature": "天气/温度",
        }
        missing_summary = "、".join(missing_names.get(m, m) for m in missing)

        prompt = CONTEXT_ASK_PROMPT.format(
            slots_summary=slots_summary,
            missing_summary=missing_summary,
            body_positive_rule=BODY_POSITIVE_PROMPT,
        )

        try:
            reply = await self._call_llm(
                messages=[
                    {"role": "system", "content": BODY_POSITIVE_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=300,
            )
            return reply.strip()
        except Exception as e:
            logger.warning(f"Ask for slots LLM call failed: {e}")
            fallback_parts = []
            if "occasion" in missing:
                fallback_parts.append("你这次穿搭是什么场合呢？比如面试、约会、日常通勤？")
            if "style_preference" in missing:
                fallback_parts.append("你喜欢什么风格？比如简约利落、温柔优雅、活力运动？")
            return " ".join(fallback_parts) if fallback_parts else "能告诉我更多你的需求吗？"

    async def _analyze_feedback(self, message: str, outfit_count: int) -> Dict:
        prompt = FEEDBACK_ANALYSIS_PROMPT.format(
            message=message,
            outfit_count=outfit_count,
        )
        try:
            raw = await self._call_llm(
                messages=[{"role": "user", "content": prompt}],
                max_tokens=200,
            )
            text = raw.strip()
            if text.startswith("```"):
                lines = text.split("\n")
                lines = [l for l in lines if not l.startswith("```")]
                text = "\n".join(lines).strip()
            start = text.find("{")
            end = text.rfind("}")
            if start != -1 and end != -1:
                return json.loads(text[start : end + 1])
        except Exception as e:
            logger.warning(f"Feedback analysis failed: {e}")

        msg_lower = message.lower()
        positive_kw = ["喜欢", "好", "不错", "可以", "满意", "就要", "选"]
        refine_kw = ["换", "调整", "改", "但", "不过", "太", "有点"]
        if any(kw in msg_lower for kw in positive_kw):
            return {"sentiment": "positive", "selected_index": 0, "reason": "keyword_match"}
        if any(kw in msg_lower for kw in refine_kw):
            return {"sentiment": "refine", "selected_index": 0, "reason": "keyword_match"}
        return {"sentiment": "negative", "selected_index": 0, "reason": "unknown"}

    async def _format_outfit_reply(self, context: DialogContext) -> str:
        if not context.generated_outfits:
            return "抱歉，暂时没有找到合适的搭配方案。能告诉我更多你的需求吗？"

        outfits_summary_parts = []
        for i, outfit in enumerate(context.generated_outfits[:3]):
            label = chr(65 + i)
            score = outfit.get("overall_score", 0)
            items = outfit.get("items", [])
            item_names = [it.get("name", "") for it in items[:4] if it.get("name")]
            outfits_summary_parts.append(
                f"方案{label}(评分{score:.1f}): {', '.join(item_names)}"
            )
        outfits_summary = "\n".join(outfits_summary_parts)

        slots_summary = context.slots.model_dump_json(exclude_none=True, exclude_defaults=True)

        prompt = OUTFIT_REPLY_PROMPT.format(
            slots_summary=slots_summary,
            outfit_count=len(context.generated_outfits),
            outfits_summary=outfits_summary,
            body_positive_rule=BODY_POSITIVE_PROMPT,
        )

        try:
            reply = await self._call_llm(
                messages=[
                    {"role": "system", "content": BODY_POSITIVE_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=400,
            )
            return reply.strip()
        except Exception as e:
            logger.warning(f"Format outfit reply failed: {e}")
            return f"为你找到了{len(context.generated_outfits)}套搭配方案，看看哪个更合心意？"

    def _get_context_quick_replies(self, context: DialogContext) -> List[str]:
        replies = []
        if not context.is_slot_filled("occasion"):
            replies.extend(["面试穿搭", "约会穿搭", "日常通勤", "旅行穿搭"])
        if not context.is_slot_filled("style_preference"):
            replies.extend(["简约利落", "温柔优雅", "活力运动", "前卫个性"])
        if not context.is_slot_filled("budget"):
            replies.extend(["500以内", "500-1500", "1500-3000"])
        return replies[:6]
