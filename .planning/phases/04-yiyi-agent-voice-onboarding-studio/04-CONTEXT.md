# Phase 4: Yiyi Agent + Voice + Onboarding + Studio - Context

**Gathered:** 2026-04-24
**Status:** Ready for planning
**Source:** User input + Codebase exploration

<domain>
## Phase Boundary

Phase 4 delivers the core user experience layer:

1. Yiyi Agent 状态机 — 对话状态机驱动结构化穿搭对话，面试穿搭为展示场景
2. 新 4 步 Onboarding — 以"让伊伊搭第一套"结束，数据流入 ColdStartService
3. 语音交互基础 — 首页语音按钮 + STT + TTS 基础集成
4. Fashion Rules 注入 — full_outfit_engine.py 从 JSON 动态加载 + 过滤式注入
5. 工作室智能推荐 — 对话中信号触发工作室推荐（WKS-01~04）
6. 伦理红线 — Body-positive 语言强制执行（ETH-01~02）

验证标准：新用户可走完 Onboarding→ 看到伊伊推荐 → 对话 → 试穿 → 保存，无崩溃无空白页
</domain>

<decisions>
## Implementation Decisions

### Yiyi Agent 状态机（YIYI-01 ~ YIYI-07）

- 对话状态：GREET→CONTEXT→[SCENE|DIRECT|CHAT]→GENERATE→[ACTION|REFINE]→WRAP_UP
- Python dialog_engine.py 已实现状态机核心（DialogState enum + transition logic）
- NestJS context.service.ts 已实现状态持久化（Redis）
- 两者存在重叠逻辑，需要统一为 Python 做推理、NestJS 做状态管理
- 异常处理：用户放弃 → 温柔收尾 / 都不喜欢 → 引导描述偏好 / LLM 超时 → 规则推荐降级

### 面试穿搭场景（完整流程）

- 流程：什么公司?→ 什么岗位?→ 预算?→3 套方案 → 试穿 → 保存
- 试穿触发为 BottomSheet 内嵌（不跳转页面）— YIYI-04
- 快速回复按钮：根据当前状态动态生成（YIYI-06）

### 伊伊人格 Prompt

- 性格：温柔有主见的朋友（decision #1）
- 禁止：亲~、根据算法分析、描述身体缺点
- 必须：描述服装不描述身体、试穿失败归因于衣服（ETH-01）
- 声音人设：25-28 岁温暖女声，略慢于日常对话（TTS 侧）
- 偏好记忆：跨 session 记住用户偏好（YIYI-07）

### 新 4 步 Onboarding（ONB-01 ~ ONB-05）

- Step 1: 场景选择（8 卡片多选 1-3）— primaryScenarios
- Step 2: 快速画像（年龄+身高体重+尺码+garmentPreference）— garmentPreference MUST be here (STATE.md blocker)
- Step 3: 风格表达（5 选 1）+ 穿搭图选择（6 选 2）
- Step 4（新）: "让伊伊搭第一套"
  - 伊伊: "基于你刚才的选择，给你搭了 3 套，看看喜欢哪个？"
  - 展示 3 套搭配方案
  - 用户选择一套 → 保存到衣橱 → 偏好信号回流
- 数据立即流入 ColdStartService — 不需要额外 API 调用
- 已有 OnboardingWizard.tsx 实现，需要重构步骤内容

### 语音交互基础（VOI-01 ~ VOI-03）

- 首页语音按钮：按住录音+波形动画+松开发送（decision #15）
- 状态：默认 → 按住录音（波形）→ 伊伊回复（播放中）
- STT：Android 原生 SpeechRecognizer（decision #24）— 已有 speechRecognition.ts 但指向 placeholder
- TTS：Edge-TTS（decision #33）— 免费，微软语音引擎，中文质量好
- 已有 VoiceButton.tsx（56x56 pulse animation）但未接入主聊天流程

### Fashion Rules 注入（RUL-01 ~ RUL-03）

- full_outfit_engine.py 从 JSON 规则文件动态加载（当前可能硬编码或不加载）
- 过滤式注入：按 bodyType+occasion+colorSeason 筛选
- 264+ JSON 规则文件已存在（ml/data/fashion_rules/ 7 个文件）
- 规则引擎服务已存在（rule-engine.service.ts）但需要与 outfit engine 集成

### 工作室智能推荐（WKS-01 ~ WKS-04）

- 信号触发：预算 premium/luxury、连续 3 次拒绝、特殊事件、"独一无二"
- 伊伊推荐工作室是因为"这是对你最好的选择"
- Sprint: 手工 5-10 家工作室目录

### Claude's Discretion

- Python dialog_engine vs NestJS context.service 的具体分工边界
- STT 集成方式（原生 SpeechRecognizer vs 后端代理）
- Edge-TTS 集成位置（后端生成音频流 vs 端侧直接调用）
- Onboarding 向导内部组件分解
- 快速回复按钮的动态生成策略
  </decisions>

<canonical_refs>

## Canonical References

### Yiyi 对话系统

- `ml/services/stylist/dialog_engine.py` — Python 状态机核心（GREET→CONTEXT→GENERATE→REFINE→ACTION→WRAP）
- `ml/services/stylist/dialog_state.py` — DialogState enum + DialogSlot + DialogContext
- `ml/services/stylist/full_outfit_engine.py` — 多槽位搭配生成引擎
- `ml/services/stylist/intelligent_stylist_service.py` — GLM-5 智能造型师核心
- `apps/backend/src/domains/ai-core/ai-stylist/dialog-state.service.ts` — Redis 状态持久化
- `apps/backend/src/domains/ai-core/ai-stylist/services/context.service.ts` — 上下文构建（556 行）
- `apps/backend/src/domains/ai-core/ai-stylist/dto/dialog.dto.ts` — DialogState enum (TS)
- `apps/backend/src/domains/ai-core/ai-stylist/prompts/system-prompt.ts` — 系统提示词

### 聊天 UI

- `apps/mobile/src/features/stylist/screens/AiStylistUnifiedScreen.tsx` — 主聊天屏（1494 行）
- `apps/mobile/src/features/stylist/components/AICompanionChat.tsx` — 浮动聊天面板（858 行）
- `apps/mobile/src/features/stylist/components/VoiceButton.tsx` — 语音按钮（147 行）
- `apps/mobile/src/features/stylist/components/QuickReplyBar.tsx` — 快速回复条
- `apps/mobile/src/features/stylist/components/SceneQuickButtons.tsx` — 场景快速按钮

### Onboarding

- `apps/mobile/src/features/onboarding/screens/OnboardingWizard.tsx` — 4 步向导
- `apps/mobile/src/features/onboarding/stores/onboardingStore.ts` — Zustand store
- `apps/mobile/src/features/onboarding/services/onboardingService.ts` — API service

### 语音服务

- `apps/mobile/src/services/speech/speechRecognition.ts` — STT 服务（309 行，placeholder URL）
- `apps/mobile/src/services/speech/ttsService.ts` — TTS 服务（45 行，react-native-tts）
- `apps/mobile/src/features/today/components/QuickChatBar.tsx` — 首页快捷聊条

### Fashion Rules

- `ml/data/fashion_rules/` — 7 个 JSON 规则文件
- `apps/backend/src/domains/platform/recommendations/services/rule-engine.service.ts` — 规则引擎服务
- `apps/backend/src/domains/platform/recommendations/services/cold-start.service.ts` — 冷启动服务

### 设计系统

- `apps/mobile/src/design-system/ui/YiyiAvatar.tsx` — 伊伊形象组件
- `apps/mobile/src/design-system/theme/tokens/design-tokens.ts` — 设计令牌

</canonical_refs>

<specifics>
## Specific Requirements

### YIYI-01 ~ YIYI-07 需求

- YIYI-01: Agent 状态机（GREET→CONTEXT→SCENE/DIRECT/CHAT→GENERATE→ACTION/REFINE→WRAP）
- YIYI-02: 面试穿搭完整流程（公司 → 岗位 → 预算 → 方案 → 试穿 → 保存）
- YIYI-03: 伊伊人格 Prompt（温柔有主见的朋友，禁止用语列表）
- YIYI-04: Try-on BottomSheet 内嵌（不跳转）
- YIYI-05: 偏好记忆（跨 session）
- YIYI-06: 快速回复按钮（状态感知动态生成）
- YIYI-07: 异常处理（放弃/都不喜欢/超时降级）

### VOI-01 ~ VOI-03 需求

- VOI-01: 首页语音按钮（按住录音+波形+松开发送）
- VOI-02: Android SpeechRecognizer 集成
- VOI-03: Edge-TTS 基础集成

### ONB-01 ~ ONB-05 需求

- ONB-01: Step 1 场景选择（8 卡片多选 1-3）
- ONB-02: Step 2 快速画像（年龄+身高体重+尺码+garmentPreference）
- ONB-03: Step 3 风格表达（5 选 1）+ 穿搭图选择（6 选 2）
- ONB-04: Step 4 "让伊伊搭第一套"（3 方案 → 选 1→ 保存衣橱 → 偏好信号）
- ONB-05: 数据立即流入 ColdStartService

### WKS-01 ~ WKS-04 需求

- WKS-01: 工作室推荐信号检测（预算/拒绝次数/特殊事件/独一无二）
- WKS-02: 工作室卡片展示
- WKS-03: 工作室目录（Sprint 手工 5-10 家）
- WKS-04: 工作室推荐触发的优雅降级

### RUL-01 ~ RUL-03 需求

- RUL-01: full_outfit_engine.py 从 JSON 动态加载规则
- RUL-02: 过滤式注入（bodyType+occasion+colorSeason）
- RUL-03: 规则与向量检索协同（不是替代）

### ETH-01 ~ ETH-02 需求

- ETH-01: Body-positive 语言（描述衣服不描述身体）
- ETH-02: 试穿失败归因于衣服
  </specifics>

<deferred>
## Deferred Ideas
- 讯飞自定义声线（Sprint 后，Phase 6+）
- 规则学习化（264规则→soft constraints，Phase 7+）
- FashionDNA 连续嵌入（Phase 7+）
- 工作室 BD 拓展（Sprint 后）
</deferred>

---

_Phase: 04-yiyi-agent-voice-onboarding-studio_
_Context gathered: 2026-04-24_
