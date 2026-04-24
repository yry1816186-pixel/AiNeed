# Phase 4: Yiyi Agent + Voice + Onboarding + Studio - Context

**Gathered:** 2026-04-25
**Status:** Ready for planning
**Source:** User input + Codebase exploration + Discussion

<domain>
## Phase Boundary

Phase 4 delivers the core user experience layer:

1. Yiyi Agent 状态机 — 对话状态机驱动结构化穿搭对话，面试穿搭为展示场景
2. 新 4 步 Onboarding — 以"让伊伊搭第一套"结束，数据流入 ColdStartService
3. 语音交互基础 — 首页语音按钮 + STT + TTS 基础集成
4. Fashion Rules 注入 — full_outfit_engine.py 从 JSON 动态加载 + 过滤式注入
5. 工作室智能推荐 — 对话中信号触发工作室推荐（WKS-01~04）
6. 伦理红线 — Body-positive 语言强制执行（ETH-01~02）

验证标准：新用户可走完 Onboarding → 看到伊伊推荐 → 对话 → 试穿 → 保存，无崩溃无空白页
</domain>

<decisions>
## Implementation Decisions

### Python ↔ NestJS 对话架构同步

- **D-01:** 双端并行架构 — Python 和 NestJS 各自维护状态机，通过事件驱动同步
  - Python 推理完成后主动推送状态变更到 NestJS（事件驱动模式）
  - NestJS 负责 Redis 持久化 + API 转发给前端
  - Python 做全部推理（状态机 + LLM + 槽位提取）
- **D-02:** TS 枚举完全对齐 Python — DialogState 补齐 SCENE/DIRECT/CHAT，DialogSlotDto 补齐 company/position/colorSeason
  - 获得完整类型安全，零 JSON 解析开销
  - 两端枚举必须一一对应，任何新增状态必须同步更新

### TryOn BottomSheet 设计

- **D-03:** 半屏 BottomSheet 嵌入对话流
  - 交互流程：用户点"试穿" → BottomSheet 弹起半屏 → 选商品 → 显示试穿图 → 点"保存" → BottomSheet 收起 → 试穿结果作为新消息出现在对话中
  - 不跳转页面，不中断对话
  - 试穿完成后自动收起 BottomSheet
  - 结果嵌回对话流作为聊天气泡

### Onboarding 双轨合并

- **D-04:** 全新 4 步替代旧向导
  - 删除旧 OnboardingWizard（basicInfo → styleTest → photo → complete）
  - 新 4 步：SceneStep → ProfileStep（年龄+身高体重+尺码+garmentPreference）→ StyleStep + 穿搭图选择 → Step 4"让伊伊搭第一套"
  - Step 4 展示方式：3 套搭配方案卡片横向滑动，用户选一套 → 保存到衣橱 → 偏好信号回流
  - 数据立即流入 ColdStartService — 不需要额外 API 调用
  - 复用已有 SceneStep、StyleStep、PreferenceStep 组件

### STT/TTS 架构选择

- **D-05:** STT — Android 原生 SpeechRecognizer 直接调用（零延迟零成本，决策 #24）
  - 替换现有 placeholder speechRecognition.ts 中的 API URL
  - 语音识别结果直接作为用户消息发给伊伊
- **D-06:** TTS — 后端 Python Edge-TTS 生成音频流，前端播放（决策 #33）
  - NestJS 新增 TTS 端点，转发到 Python Edge-TTS
  - 音频流可缓存（同一文本不重复生成）
  - 支持后续升级到讯飞自定义声线（Phase 6+）

### Yiyi Agent 状态机（YIYI-01 ~ YIYI-07）

- 对话状态：GREET→CONTEXT→[SCENE|DIRECT|CHAT]→GENERATE→[ACTION|REFINE]→WRAP_UP
- Python dialog_engine.py 已实现完整状态机（9 状态），是推理核心
- NestJS context.service.ts 已实现 Redis 状态持久化（SETEX 1800s）
- 异常处理：用户放弃 → 温柔收尾 / 都不喜欢 → 引导描述偏好 / LLM 超时 → 规则推荐降级
- 偏好记忆：跨 session 记住用户明确的否定偏好（YIYI-07）

### 面试穿搭场景

- 流程：什么公司?→ 什么岗位?→ 预算?→3 套方案 → 试穿 → 保存
- 试穿触发为半屏 BottomSheet（D-03）
- 快速回复按钮：根据当前状态和缺失槽位动态生成

### 伊伊人格 Prompt

- 性格：温柔有主见的朋友（decision #1）
- 禁止：亲~、根据算法分析、描述身体缺点
- 必须：描述服装不描述身体、试穿失败归因于衣服（ETH-01）
- 声音人设：25-28 岁温暖女声，略慢于日常对话（TTS 侧）

### Fashion Rules 注入（RUL-01 ~ RUL-03）

- full_outfit_engine.py 从 JSON 规则文件动态加载（当前可能硬编码或不加载）
- 过滤式注入：按 bodyType+occasion+colorSeason 筛选
- 264+ JSON 规则文件已存在（ml/data/fashion_rules/ 7 个文件）
- 规则引擎服务已存在（rule-engine.service.ts）但需要与 outfit engine 集成

### 工作室智能推荐（WKS-01 ~ WKS-04）

- 信号触发：预算 premium/luxury、连续 3 次拒绝、特殊事件、"独一无二"
- studio_signal_detector.py 已存在但仅部分集成（仅 multiple_rejections）
- 后端 ConsultantService 完整（匹配+预约+档案），需接入对话流
- Sprint: 手工 5-10 家工作室目录

### Claude's Discretion

- 事件驱动同步的具体实现细节（消息队列 vs HTTP callback）
- BottomSheet 高度和动画细节
- Onboarding 各步骤的具体组件分解
- 快速回复按钮的动态生成策略
- Edge-TTS 音频流格式和缓存策略

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Yiyi 对话系统

- `ml/services/stylist/dialog_engine.py` — Python 状态机核心（9 状态完整实现）
- `ml/services/stylist/dialog_state.py` — DialogState enum + DialogSlot + DialogContext（权威枚举定义）
- `ml/services/stylist/slot_extractor.py` — LLM 槽位提取器
- `ml/services/stylist/full_outfit_engine.py` — 多槽位搭配生成引擎
- `ml/services/stylist/intelligent_stylist_service.py` — GLM-5 智能造型师核心
- `ml/services/stylist/studio_signal_detector.py` — 工作室信号检测器（仅部分集成）
- `apps/backend/src/domains/ai-core/ai-stylist/dialog-state.service.ts` — Redis 状态持久化
- `apps/backend/src/domains/ai-core/ai-stylist/services/context.service.ts` — 上下文构建（556 行）
- `apps/backend/src/domains/ai-core/ai-stylist/dto/dialog.dto.ts` — TS DialogState 枚举（**需同步对齐 Python**）
- `apps/backend/src/domains/ai-core/ai-stylist/prompts/system-prompt.ts` — 系统提示词

### 聊天 UI

- `apps/mobile/src/features/stylist/screens/AiStylistUnifiedScreen.tsx` — 主聊天屏
- `apps/mobile/src/features/stylist/components/AICompanionChat.tsx` — 浮动聊天面板
- `apps/mobile/src/features/stylist/components/VoiceButton.tsx` — 语音按钮（UI 完善）
- `apps/mobile/src/features/stylist/components/QuickReplyBar.tsx` — 快速回复条
- `apps/mobile/src/features/stylist/components/SceneQuickButtons.tsx` — 场景快速按钮

### TryOn（试穿 — 需新建 BottomSheet）

- `apps/mobile/src/features/try-on/` — 已有试穿功能（GLM API）
- **不存在 TryOnBottomSheet — 必须新建**

### Onboarding

- `apps/mobile/src/features/onboarding/screens/OnboardingWizard.tsx` — 旧向导（**将被替换**）
- `apps/mobile/src/features/onboarding/screens/SceneStep.tsx` — 新场景选择（复用）
- `apps/mobile/src/features/onboarding/screens/StyleStep.tsx` — 新风格选择（复用）
- `apps/mobile/src/features/onboarding/screens/PreferenceStep.tsx` — 新偏好选择（复用）
- `apps/mobile/src/features/onboarding/stores/onboardingStore.ts` — Zustand store（已有 NewOnboardingState）

### 语音服务

- `apps/mobile/src/services/speech/speechRecognition.ts` — STT 服务（**placeholder API，需替换为原生**）
- `apps/mobile/src/services/speech/ttsService.ts` — TTS 服务（react-native-tts，**需替换为 Edge-TTS 流**）
- `apps/mobile/src/features/today/components/QuickChatBar.tsx` — 首页快捷聊条

### Fashion Rules

- `ml/data/fashion_rules/` — 7 个 JSON 规则文件（body_type, chinese_occasion, color_season, fabric, item_compatibility, weather_outfit, trend）
- `apps/backend/src/domains/platform/recommendations/services/rule-engine.service.ts` — 规则引擎服务（生产级）

### 工作室/顾问

- `apps/backend/src/domains/social/consultant/` — 完整 ConsultantService（匹配+预约+档案）
- `apps/mobile/src/features/consultant/` — 移动端顾问界面

### 设计系统

- `apps/mobile/src/design-system/ui/YiyiAvatar.tsx` — 伊伊形象组件
- `apps/mobile/src/design-system/theme/tokens/design-tokens.ts` — 设计令牌

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `dialog_engine.py`：完整 9 状态状态机 + LLM 集成，直接作为推理核心
- `AiStylistUnifiedScreen.tsx`：主聊天屏已处理完整对话流，只需集成 BottomSheet
- `SceneStep/StyleStep/PreferenceStep`：新 Onboarding 步骤已构建，可直接复用
- `VoiceButton.tsx`：展示型组件完善（56x56 脉冲动画），只需接入 STT 逻辑
- `ConsultantService`：后端工作室完整服务，只需接入对话流
- `rule-engine.service.ts`：7 维度评分引擎，可直接为 dialog_engine 提供降级方案

### Established Patterns

- 对话状态：Redis key `dialog:<sessionId>`，TTL 1800s
- 聊天存储：Zustand + AsyncStorage 持久化
- 品牌色：terracotta (#E17055 warmOrange) 为 VoiceButton 主色
- 导航：4-Tab（Today/Discover/Stylist/Me），MainStackNavigator 管理 Stack

### Integration Points

- STT 结果 → 作为用户消息 → 发给伊伊对话 API
- TTS 音频流 → 后端 Edge-TTS 端点 → 前端播放
- BottomSheet → 在 AiStylistUnifiedScreen 中嵌入 → 触发点在对话引擎 ACTION 状态
- Onboarding Step 4 → 调推荐 API 生成 3 套方案 → 用户选择 → 保存衣橱 + 偏好回流
- Studio 信号 → dialog_engine 检测 → 嵌入对话消息 → ConsultantCard 内联展示

</code_context>

<specifics>
## Specific Ideas

- VoiceButton 按住录音+波形动画+松开发送（已有 UI 基础）
- 伊伊声音人设：25-28 岁温暖女声，略慢于日常对话
- Step 4 "让伊伊搭第一套"：伊伊说"基于你刚才的选择，给你搭了 3 套，看看喜欢哪个？"
- 工作室推荐是因为"这是对你最好的选择"

</specifics>

<deferred>
## Deferred Ideas

- 讯飞自定义声线（Sprint 后，Phase 6+）
- 规则学习化（264 规则 →soft constraints，Phase 7+）
- FashionDNA 连续嵌入（Phase 7+）
- 工作室 BD 拓展（Sprint 后）
- iOS STT 支持（Sprint 后）

</deferred>

---

_Phase: 04-yiyi-agent-voice-onboarding-studio_
_Context gathered: 2026-04-25_
