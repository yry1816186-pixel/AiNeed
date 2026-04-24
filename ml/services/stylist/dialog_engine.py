"""
对话状态机引擎

实现 GREET->CONTEXT->[SCENE|DIRECT|CHAT]->GENERATE->[ACTION|REFINE]->WRAP 状态流转，
驱动有状态的对话Agent行为。

核心逻辑：
1. GREET: 初始问候，尝试从首条消息提取slot，路由到SCENE/DIRECT/CONTEXT/CHAT
2. CONTEXT: 收集场景/偏好信息，追问缺失的必填slot
3. SCENE: 场景化slot收集（面试：公司/岗位/预算）
4. DIRECT: 用户给足信息，直接生成搭配
5. CHAT: 自由对话，检测场景意图后路由
6. GENERATE: 信息足够后生成搭配方案
7. REFINE: 用户要求调整，重新生成
8. ACTION: 展示详情/试穿
9. WRAP: 对话结束
"""

import json
import logging
from typing import Dict, List, Optional

from ml.services.stylist.dialog_state import DialogState, DialogContext, DialogSlot
from ml.services.stylist.slot_extractor import SlotExtractor

logger = logging.getLogger(__name__)

YIYI_PERSONALITY_PROMPT = """你是伊伊(Yiyi)，用户最信任的穿搭搭子。

## 性格
你是温柔但有主见的朋友。你会给出明确建议，不是和稀泥。
你有自己的审美判断，但永远尊重用户的选择。

## 禁止用语（绝对不能出现）
- "亲~"、"亲爱的"、"宝子"
- "根据算法分析"、"系统推荐"、"数据分析显示"
- 任何描述身体缺点或身材缺陷的语言
- "这个风格很适合你的体型"（改为"这个风格很适合你的气质"）

## 必须遵循
- 用"适合你的风格"而非"适合你的体型"
- 用"这件衣服的版型"而非"遮住/修饰你的XXX"
- 推荐时从"衣服特点"出发，不从"身体缺点"出发
- 试穿失败时归因于"这件衣服的剪裁可能不是最佳选择"
- 语气像一个25-28岁的有品味的朋友，温暖但不甜腻

## 说话风格
- 简短自然，不啰嗦
- 可以用"我觉得"、"依我看"表达观点
- 偶尔用"诶"、"嗯"等语气词让对话更自然
"""

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

SCENE_ASK_PROMPT = """你是伊伊，正在帮用户准备{scene_name}的穿搭。

已了解：{slots_summary}
还需要了解：{missing}

请用自然、温暖的方式询问。要求：
1. 一次问一个问题
2. 给出具体选项引导
3. 语气像朋友聊天

{body_positive_rule}"""

CHAT_REPLY_PROMPT = """用户在和你闲聊。请用伊伊的风格自然回应。

用户消息: {message}

要求：
1. 简短自然
2. 如果用户提到穿搭需求，引导到具体场景
3. 体现你作为穿搭搭子的专业性

{personality}
"""

# Interview scene keywords
INTERVIEW_KEYWORDS = ["面试", "interview", "应聘", "面谈"]
# Give-up keywords
GIVE_UP_KEYWORDS = ["算了", "不要了", "不想要了", "放弃", "不需要了", "不用了"]


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
            DialogState.SCENE: self._handle_scene,
            DialogState.DIRECT: self._handle_direct,
            DialogState.CHAT: self._handle_chat,
            DialogState.GENERATE: self._handle_generate,
            DialogState.REFINE: self._handle_refine,
            DialogState.ACTION: self._handle_action,
            DialogState.WRAP: self._handle_wrap,
        }
        handler = handler_map.get(context.state, self._handle_wrap)
        return await handler(user_message, context)

    def _classify_greet_intent(
        self, message: str, context: DialogContext
    ) -> DialogState:
        """Classify the user's initial intent after GREET slot extraction."""
        # Check if user gave enough info for direct generation
        if context.can_generate():
            return DialogState.DIRECT

        # Check if user mentioned a specific scene (e.g., interview)
        if any(kw in message for kw in INTERVIEW_KEYWORDS):
            return DialogState.SCENE
        if context.slots.occasion and context.slots.occasion not in ("", None):
            return DialogState.SCENE

        # Check if message is a social greeting with no intent
        social_kw = ["你好", "嗨", "hi", "hello", "嘿", "早上好", "下午好", "晚上好"]
        if any(message.strip().lower().startswith(kw) for kw in social_kw):
            if not context.slots.occasion and not context.slots.style_preference:
                return DialogState.CHAT

        # Default: go to CONTEXT for slot filling
        return DialogState.CONTEXT

    async def _handle_greet(self, message: str, context: DialogContext) -> Dict:
        # Apply preference memory to personalize the interaction
        memory_context = ""
        if context.preference_memory:
            memory_parts = [f"{k}: {v}" for k, v in context.preference_memory.items() if v]
            if memory_parts:
                memory_context = f"\n\n用户偏好记忆: {', '.join(memory_parts)}"

        context.slots = await self.slot_extractor.extract(message, context.slots)

        # Route to appropriate state based on intent
        next_state = self._classify_greet_intent(message, context)

        if next_state == DialogState.DIRECT:
            context.state = DialogState.DIRECT
            return await self._generate_outfits(context)

        if next_state == DialogState.SCENE:
            context.state = DialogState.SCENE
            return await self._handle_scene(message, context)

        if next_state == DialogState.CHAT:
            context.state = DialogState.CHAT
            # Include preference memory in the chat prompt
            if memory_context:
                personalized_prompt = CHAT_REPLY_PROMPT.format(
                    message=message,
                    personality=YIYI_PERSONALITY_PROMPT + "\n" + memory_context,
                )
                try:
                    reply = await self._call_llm(
                        messages=[
                            {"role": "system", "content": YIYI_PERSONALITY_PROMPT},
                            {"role": "user", "content": personalized_prompt},
                        ],
                        max_tokens=200,
                    )
                    reply = reply.strip()
                except Exception as e:
                    logger.warning(f"Greet chat LLM failed: {e}")
                    reply = "嗯，有什么穿搭问题都可以问我哦"

                return {
                    "reply": reply,
                    "quick_replies": ["面试穿搭", "约会穿搭", "日常穿搭", "帮我搭配"],
                    "state": DialogState.CHAT.value,
                    "slots": context.slots.model_dump(),
                }
            return await self._handle_chat(message, context)

        # Default: CONTEXT
        context.state = DialogState.CONTEXT
        missing = context.missing_required_slots()
        reply = await self._ask_for_slots(missing, context, memory_context)
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

    async def _handle_scene(self, message: str, context: DialogContext) -> Dict:
        """Scene-specific slot collection. For interview: company, position, budget."""
        context.slots = await self.slot_extractor.extract(message, context.slots)

        occasion = context.slots.occasion or ""

        # Interview scene: check for company, position, budget
        if occasion == "interview" or any(
            kw in message for kw in INTERVIEW_KEYWORDS
        ):
            if not context.slots.occasion:
                context.slots.occasion = "interview"

            # Check if all interview-specific slots are filled
            interview_missing = []
            if not context.slots.company:
                interview_missing.append("company")
            if not context.slots.position:
                interview_missing.append("position")
            if not context.slots.budget:
                interview_missing.append("budget")

            # Also need style_preference for generation
            if not context.slots.style_preference:
                interview_missing.append("style_preference")

            if not interview_missing:
                # All slots filled, proceed to generate
                context.state = DialogState.GENERATE
                return await self._generate_outfits(context)

            # Ask for missing interview slots
            missing_names = {
                "company": "目标公司类型",
                "position": "应聘岗位",
                "budget": "预算范围",
                "style_preference": "风格偏好",
            }
            missing_desc = "、".join(
                missing_names.get(m, m) for m in interview_missing
            )
            slots_summary = context.slots.model_dump_json(
                exclude_none=True, exclude_defaults=True
            )
            prompt = SCENE_ASK_PROMPT.format(
                scene_name="面试穿搭",
                slots_summary=slots_summary,
                missing=missing_desc,
                body_positive_rule=BODY_POSITIVE_PROMPT,
            )

            try:
                reply = await self._call_llm(
                    messages=[
                        {"role": "system", "content": YIYI_PERSONALITY_PROMPT + "\n" + BODY_POSITIVE_PROMPT},
                        {"role": "user", "content": prompt},
                    ],
                    max_tokens=300,
                )
                reply = reply.strip()
            except Exception as e:
                logger.warning(f"Scene ask LLM failed: {e}")
                reply_parts = []
                if "company" in interview_missing:
                    reply_parts.append("什么类型的公司？互联网、金融、还是外企？")
                if "position" in interview_missing:
                    reply_parts.append("什么岗位呢？")
                if "budget" in interview_missing:
                    reply_parts.append("预算大概多少？")
                reply = " ".join(reply_parts)

            return {
                "reply": reply,
                "quick_replies": self._get_scene_quick_replies(context, interview_missing),
                "state": context.state.value,
                "slots": context.slots.model_dump(),
            }

        # Generic scene: check if can generate
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

    async def _handle_direct(self, message: str, context: DialogContext) -> Dict:
        """User gave enough info -- skip directly to outfit generation."""
        context.state = DialogState.GENERATE
        return await self._generate_outfits(context)

    async def _handle_chat(self, message: str, context: DialogContext) -> Dict:
        """Free-form conversation with Yiyi personality. Detect scene intent."""
        # Check if user shifts to a specific request
        if any(kw in message for kw in INTERVIEW_KEYWORDS):
            context.state = DialogState.SCENE
            return await self._handle_scene(message, context)

        # Check for other scene keywords
        scene_kw = ["穿搭", "搭配", "穿什么", "造型", "约会", "通勤", "旅行", "面试"]
        if any(kw in message for kw in scene_kw):
            context.slots = await self.slot_extractor.extract(message, context.slots)
            if context.slots.occasion:
                context.state = DialogState.SCENE
                return await self._handle_scene(message, context)

        # Regular chat reply with Yiyi personality
        prompt = CHAT_REPLY_PROMPT.format(
            message=message,
            personality=YIYI_PERSONALITY_PROMPT,
        )

        try:
            reply = await self._call_llm(
                messages=[
                    {"role": "system", "content": YIYI_PERSONALITY_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=200,
            )
            reply = reply.strip()
        except Exception as e:
            logger.warning(f"Chat LLM failed: {e}")
            reply = "嗯，有什么穿搭问题都可以问我哦"

        return {
            "reply": reply,
            "quick_replies": ["面试穿搭", "约会穿搭", "日常穿搭", "帮我搭配"],
            "state": DialogState.CHAT.value,
            "slots": context.slots.model_dump(),
        }

    async def _handle_generate(self, message: str, context: DialogContext) -> Dict:
        feedback = await self._analyze_feedback(message, len(context.generated_outfits))

        if feedback.get("sentiment") == "positive":
            context.state = DialogState.ACTION
            selected_idx = feedback.get("selected_index", 0)
            context.user_feedback.append(f"positive:{selected_idx}")
            # Reset negative counter on positive feedback
            context.negative_feedback_count = 0
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

        # Negative feedback
        context.state = DialogState.REFINE
        context.negative_feedback_count += 1
        context.user_feedback.append("negative")

        result = {
            "reply": "没关系，告诉我你更想要什么感觉的？",
            "quick_replies": self._get_refine_quick_replies(context),
            "state": context.state.value,
            "slots": context.slots.model_dump(),
        }

        # Studio signal on 3+ consecutive negative feedback
        if context.negative_feedback_count >= 3:
            result["studio_signal"] = "multiple_rejections"
            result["reply"] = (
                "看来线上挑不到完全满意的？要不试试工作室定制？"
            )

        return result

    async def _handle_refine(self, message: str, context: DialogContext) -> Dict:
        # Check for give-up intent
        if any(kw in message for kw in GIVE_UP_KEYWORDS):
            context.state = DialogState.WRAP
            return {
                "reply": "没问题，下次想聊穿搭随时找我",
                "quick_replies": ["开始新对话"],
                "state": DialogState.WRAP.value,
                "slots": context.slots.model_dump(),
            }

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
            "reply": "很高兴能帮到你！下次需要穿搭建议随时找我",
            "quick_replies": ["开始新对话"],
            "state": DialogState.WRAP.value,
            "slots": context.slots.model_dump(),
        }

    async def _generate_outfits(self, context: DialogContext) -> Dict:
        outfits = []
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

        # Rule-based fallback when no outfits generated
        if not context.generated_outfits:
            return {
                "reply": "我先用基础规则帮你搭了一套，之后再细聊你的喜好",
                "outfits": [],
                "quick_replies": ["换个风格", "换个价位", "详细说说喜好"],
                "state": context.state.value,
                "slots": context.slots.model_dump(),
            }

        reply = await self._format_outfit_reply(context)

        # State-aware quick replies
        quick_replies = self._get_generate_quick_replies(context)

        return {
            "reply": reply,
            "outfits": context.generated_outfits,
            "quick_replies": quick_replies,
            "state": context.state.value,
            "slots": context.slots.model_dump(),
        }

    def _get_generate_quick_replies(self, context: DialogContext) -> List[str]:
        """Generate state-aware quick replies for outfit display."""
        base_replies = []
        for i, outfit in enumerate(context.generated_outfits[:3]):
            label = chr(65 + i)
            base_replies.append(f"喜欢方案{label}")
        base_replies.append("都不喜欢")

        occasion = context.slots.occasion or ""
        if occasion == "interview":
            return base_replies[:-1] + ["换个价位", "换个风格", "都不喜欢"]
        if occasion == "date":
            return base_replies[:-1] + ["更甜一点", "更酷一点", "都不喜欢"]

        return base_replies

    def _get_refine_quick_replies(self, context: DialogContext) -> List[str]:
        """Quick replies for refine state."""
        return ["换个风格", "换个颜色", "换个价位"]

    def _get_scene_quick_replies(
        self, context: DialogContext, missing: List[str]
    ) -> List[str]:
        """Scene-specific quick replies based on missing slots."""
        replies = []
        if "company" in missing and context.slots.occasion == "interview":
            replies.extend(["互联网公司", "金融公司", "外企", "国企", "创业公司"])
        if "position" in missing and context.slots.occasion == "interview":
            replies.extend(["技术岗", "产品岗", "设计岗", "运营岗", "管理岗"])
        if "budget" in missing:
            replies.extend(["500以内", "500-1500", "1500-3000", "3000以上"])
        if "style_preference" in missing:
            replies.extend(["简约利落", "温柔优雅", "专业正式"])
        return replies[:6]

    async def _ask_for_slots(self, missing: List[str], context: DialogContext, memory_context: str = "") -> str:
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
        ) + memory_context

        try:
            reply = await self._call_llm(
                messages=[
                    {"role": "system", "content": YIYI_PERSONALITY_PROMPT + "\n" + BODY_POSITIVE_PROMPT},
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
                messages=[
                    {"role": "system", "content": YIYI_PERSONALITY_PROMPT},
                    {"role": "user", "content": prompt},
                ],
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
                    {"role": "system", "content": YIYI_PERSONALITY_PROMPT + "\n" + BODY_POSITIVE_PROMPT},
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
        occasion = context.slots.occasion or ""
        if not context.is_slot_filled("occasion"):
            replies.extend(["面试穿搭", "约会穿搭", "日常通勤", "旅行穿搭"])
        elif occasion == "interview":
            replies.extend(["互联网公司", "金融公司", "外企", "国企", "创业公司"])
        if not context.is_slot_filled("style_preference"):
            replies.extend(["简约利落", "温柔优雅", "活力运动", "前卫个性"])
        if not context.is_slot_filled("budget"):
            replies.extend(["500以内", "500-1500", "1500-3000"])
        return replies[:6]
