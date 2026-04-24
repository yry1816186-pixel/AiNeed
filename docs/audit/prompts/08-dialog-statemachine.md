# 轨道 8: ML 对话状态机 Python 实现

你是 XUNO 项目的 ML/对话系统工程师。你的任务是让 intelligent_stylist_service.py 从"无状态 LLM 自由发挥"变为"有状态的对话 Agent"。

## 当前问题

1. `ml/services/stylist/intelligent_stylist_service.py` 第 1479-1514 行 `chat_interaction()` 是无状态的：

   - 直接把对话历史传给 LLM
   - 没有 slot 提取
   - 没有状态机推进
   - 没有结构化输出
   - 对话质量完全依赖 LLM 自由发挥

2. AI_STYLIST_DESIGN.md 设计了 GREET→CONTEXT→GENERATE→ACTION→WRAP 状态机，但 Python 侧完全不存在

3. ConversationMemory（第 594-719 行）只是简单的 append + trim to 20 条消息

## 目标

实现 3 步核心状态机（GREET→CONTEXT→GENERATE），支持：

- slot 提取（场景、体型、风格偏好、预算）
- 结构化 JSON 输出
- 对话上下文记忆
- 快速回复建议

## 具体修改指令

### 步骤 1: 定义状态和 Slot 模型

在 `ml/services/stylist/` 下新建 `dialog_state.py`：

```python
from enum import Enum
from typing import Optional, List, Dict
from pydantic import BaseModel

class DialogState(str, Enum):
    GREET = "GREET"           # 初始问候
    CONTEXT = "CONTEXT"       # 提取场景/偏好
    GENERATE = "GENERATE"     # 生成搭配方案
    REFINE = "REFINE"         # 用户要求调整
    ACTION = "ACTION"         # 展示详情/试穿
    WRAP = "WRAP"             # 结束

class DialogSlot(BaseModel):
    occasion: Optional[str] = None
    bodyType: Optional[str] = None
    stylePreference: List[str] = []
    budget: Optional[Dict[str, float]] = None  # {min, max}
    colorPreference: List[str] = []
    avoidItems: List[str] = []
    temperature: Optional[float] = None  # 天气

class DialogContext(BaseModel):
    state: DialogState = DialogState.GREET
    slots: DialogSlot = DialogSlot()
    turn_count: int = 0
    generated_outfits: List[Dict] = []
    user_feedback: List[str] = []

    def is_slot_filled(self, slot_name: str) -> bool:
        val = getattr(self.slots, slot_name, None)
        if isinstance(val, list):
            return len(val) > 0
        return val is not None

    def missing_required_slots(self) -> List[str]:
        """返回尚未填充的必填slot"""
        missing = []
        if not self.is_slot_filled('occasion'):
            missing.append('occasion')
        if not self.is_slot_filled('stylePreference'):
            missing.append('stylePreference')
        return missing

    def can_generate(self) -> bool:
        """是否有足够信息生成推荐"""
        return self.is_slot_filled('occasion') and len(self.slots.stylePreference) > 0
```

### 步骤 2: 实现 Slot 提取器

在 `ml/services/stylist/` 下新建 `slot_extractor.py`：

```python
class SlotExtractor:
    def __init__(self, llm_client):
        self.llm = llm_client

    async def extract(self, user_message: str, current_slots: DialogSlot) -> DialogSlot:
        """用LLM从用户消息中提取slot"""
        prompt = f"""从用户消息中提取穿搭偏好信息。当前已知信息: {current_slots.model_dump_json()}
用户消息: {user_message}

请返回JSON格式的更新后信息:
{{
  "occasion": "interview/date/travel/commut/seasonal/career 或 null",
  "bodyType": "apple/pear/hourglass/rectangle/inverted-triangle 或 null",
  "stylePreference": ["风格词列表"],
  "budget": {{"min": 数字, "max": 数字}} 或 null,
  "colorPreference": ["颜色列表"],
  "avoidItems": ["避免的单品"],
  "temperature": 数字 或 null
}}

只更新从用户消息中能明确推断的字段，其他保持null。"""

        response = await self.llm.generate(prompt, response_format="json")
        # 解析response更新slots
        updated = DialogSlot(**response)
        # 合并：只更新非null字段
        return self._merge_slots(current_slots, updated)

    def _merge_slots(self, current: DialogSlot, update: DialogSlot) -> DialogSlot:
        merged = current.model_copy()
        for field in update.model_fields:
            val = getattr(update, field)
            if val is not None and val != [] and val != {}:
                setattr(merged, field, val)
        return merged
```

### 步骤 3: 实现状态机

在 `ml/services/stylist/` 下新建 `dialog_engine.py`：

```python
class DialogEngine:
    def __init__(self, slot_extractor, outfit_engine, llm_client):
        self.slot_extractor = slot_extractor
        self.outfit_engine = outfit_engine
        self.llm = llm_client

    async def process_message(
        self,
        user_message: str,
        context: DialogContext
    ) -> Dict:
        """处理一条用户消息，返回回复+快速回复选项"""
        context.turn_count += 1

        if context.state == DialogState.GREET:
            return await self._handle_greet(user_message, context)
        elif context.state == DialogState.CONTEXT:
            return await self._handle_context(user_message, context)
        elif context.state == DialogState.GENERATE:
            return await self._handle_generate(user_message, context)
        elif context.state == DialogState.REFINE:
            return await self._handle_refine(user_message, context)
        elif context.state == DialogState.ACTION:
            return await self._handle_action(user_message, context)
        else:
            return await self._handle_wrap(context)

    async def _handle_greet(self, message: str, context: DialogContext) -> Dict:
        """初始问候，尝试提取场景"""
        # 提取slot
        context.slots = await self.slot_extractor.extract(message, context.slots)

        if context.can_generate():
            # 信息足够，直接跳到生成
            context.state = DialogState.GENERATE
            return await self._generate_outfits(context)
        else:
            # 需要追问
            context.state = DialogState.CONTEXT
            missing = context.missing_required_slots()
            reply = await self._ask_for_slots(missing, context)
            return {
                "reply": reply,
                "quick_replies": self._get_context_quick_replies(context),
                "state": context.state,
                "slots": context.slots.model_dump()
            }

    async def _handle_context(self, message: str, context: DialogContext) -> Dict:
        """上下文收集阶段"""
        context.slots = await self.slot_extractor.extract(message, context.slots)

        if context.can_generate():
            context.state = DialogState.GENERATE
            return await self._generate_outfits(context)
        else:
            missing = context.missing_required_slots()
            reply = await self._ask_for_slots(missing, context)
            return {
                "reply": reply,
                "quick_replies": self._get_context_quick_replies(context),
                "state": context.state,
                "slots": context.slots.model_dump()
            }

    async def _handle_generate(self, message: str, context: DialogContext) -> Dict:
        """用户对推荐的反馈"""
        # 分析反馈：满意/不满意/要调整
        feedback = await self._analyze_feedback(message)

        if feedback["sentiment"] == "positive":
            context.state = DialogState.ACTION
            return {
                "reply": "太好了！要不要试试穿上看看效果？",
                "quick_replies": ["试穿效果", "查看搭配详情", "再来一套"],
                "state": context.state,
                "selected_outfit": feedback.get("selected_index", 0)
            }
        elif feedback["sentiment"] == "refine":
            context.state = DialogState.REFINE
            context.slots = await self.slot_extractor.extract(message, context.slots)
            return await self._generate_outfits(context)  # 重新生成
        else:
            # 不满意，追问原因
            return {
                "reply": "没关系，告诉我你更想要什么感觉的？",
                "quick_replies": ["换个风格", "换个颜色", "换个价位"],
                "state": DialogState.REFINE,
                "slots": context.slots.model_dump()
            }

    async def _generate_outfits(self, context: DialogContext) -> Dict:
        """调用full_outfit_engine生成搭配方案"""
        outfits = await self.outfit_engine.generate_outfits(
            occasion=context.slots.occasion,
            style_preference=context.slots.stylePreference,
            body_type=context.slots.bodyType,
            budget=context.slots.budget,
            color_preference=context.slots.colorPreference,
            avoid_items=context.slots.avoidItems,
        )
        context.generated_outfits = outfits
        context.state = DialogState.GENERATE

        # 用LLM生成自然语言推荐解释
        reply = await self._format_outfit_reply(outfits, context)

        return {
            "reply": reply,
            "outfits": outfits,
            "quick_replies": ["喜欢方案A", "喜欢方案B", "喜欢方案C", "都不喜欢"],
            "state": context.state,
            "slots": context.slots.model_dump()
        }

    def _get_context_quick_replies(self, context: DialogContext) -> List[str]:
        """根据当前缺失的slot生成快速回复选项"""
        replies = []
        if not context.is_slot_filled('occasion'):
            replies.extend(["面试穿搭", "约会穿搭", "日常通勤", "旅行穿搭"])
        if not context.is_slot_filled('stylePreference'):
            replies.extend(["简约利落", "温柔优雅", "活力运动", "前卫个性"])
        return replies[:6]  # 最多6个
```

### 步骤 4: 修改 chat_interaction 使用状态机

文件: `ml/services/stylist/intelligent_stylist_service.py`

修改 `chat_interaction()` 方法：

```python
async def chat_interaction(
    self,
    user_message: str,
    conversation_history: List[Dict[str, str]],
    user_profile: Optional[UserProfile] = None
) -> Dict:  # 返回Dict而不是str
    """有状态的对话交互"""
    # 从Redis或内存中获取对话上下文
    context = await self._get_or_create_context(user_profile)

    # 通过状态机处理
    result = await self.dialog_engine.process_message(user_message, context)

    # 保存更新后的上下文
    await self._save_context(user_profile, context)

    return result  # {reply, outfits?, quick_replies, state, slots}
```

### 步骤 5: 添加体正面措辞约束

在所有 LLM 调用中注入体正面 system prompt：

```python
BODY_POSITIVE_PROMPT = """你必须遵循以下措辞原则：
1. 描述服装特点，不描述身体特征
2. 用"这件衣服的版型很适合你的比例"而非"遮住XXX"
3. 用"利落的剪裁让整体线条更流畅"而非"显瘦"
4. 试穿效果不理想时归因于"这件衣服的剪裁可能不是最佳选择"
5. 推荐时用"适合你的风格"而非"适合你的体型"
6. 永远从"衣服特点"出发，不从"身体缺点"出发"""
```

## 验收标准

1. 发送"我后天有面试" → 状态从 GREET→CONTEXT，slot 提取出 occasion=interview
2. 发送"喜欢简约利落的" → slot 提取出 stylePreference=["minimalist"]
3. 信息足够后自动跳到 GENERATE → 返回搭配方案
4. 对话上下文在多轮之间保持（Redis 或内存存储）
5. 快速回复选项根据缺失 slot 动态生成
6. LLM 输出不含"粗""胖""瘦""遮"等体型负面措辞

## 接口契约

DialogState: 'GREET' | 'CONTEXT' | 'GENERATE' | 'REFINE' | 'ACTION' | 'WRAP'
输出格式:

```json
{
  "reply": "自然语言回复",
  "outfits": [{"id": "xxx", "items": [...], "score": 0.85}],
  "quick_replies": ["选项1", "选项2"],
  "state": "GENERATE",
  "slots": {"occasion": "interview", "stylePreference": ["minimalist"]}
}
```
