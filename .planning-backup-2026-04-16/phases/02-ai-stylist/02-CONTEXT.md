# Phase 2: AI 造型师 - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning
**Source:** User input + REQUIREMENTS.md + codebase analysis

<domain>
## Phase Boundary

用户与 AI 造型师交互，获取基于个人画像的精准穿搭方案。核心交互模式为方案页（非纯聊天），支持文字输入+场景快捷按钮，推荐基于用户画像驱动，集成天气数据，方案历史按日归档。

**包含：** 方案页交互模式、MVP输入方式、画像驱动推荐、可折叠推荐理由、单品替换、天气智能集成、方案历史归档、AI安全过滤、API限流降级、推荐反馈机制、场景化快捷推荐、预设引导问题

**不包含：** 虚拟试衣生成（Phase 3）、推荐信息流（Phase 4）、图片/语音输入（v3）、社区分享（Phase 6）

</domain>

<decisions>
## Implementation Decisions

### 方案页交互模式 (AIS-01)
- **D-01:** 方案页为核心交互 — 顶部展示 AI 生成的穿搭整体效果图 + 下方是每件单品卡片（图片/名称/价格/购买链接），可点击替换单品
- **D-02:** 方案页数据由后端 OutfitPlanService 聚合 — 整体效果图URL + 单品列表 + 推荐理由，通过 GET /sessions/:sessionId/outfit-plan 端点获取
- **D-03:** 移动端新建 OutfitPlanScreen — 替代当前纯聊天模式，聊天输入仅作为方案请求的入口

### MVP 输入方式 (AIS-02)
- **D-04:** MVP 仅支持文字输入 + 6个场景快捷按钮（通勤/约会/运动/面试/休闲/旅行）
- **D-05:** 图片上传和语音输入推迟到 v3

### 画像驱动推荐 (AIS-03)
- **D-06:** AI 基于用户体型（适合的版型/剪裁）、肤色（适合的色彩）、风格偏好、色彩季型生成穿搭方案
- **D-07:** 复用已有 ContextService.buildUserContext + GLMStylistEngine 知识库

### 可折叠推荐理由 (AIS-04)
- **D-08:** 每个推荐方案下方展示可折叠理由：体型适配说明 + 色彩搭配解释 + 场合适合度，默认收起点击展开
- **D-09:** 复用 RecommendationService 已有的 whyItFits/styleExplanation 字段

### 单品替换交互 (AIS-05)
- **D-10:** 点击单品卡片的"替换"按钮，弹出同类商品列表（已按用户画像过滤），选择后方案实时更新
- **D-11:** 后端新建 ItemReplacementService — 基于 category + 用户画像过滤同类商品

### 天气智能集成 (AIS-06)
- **D-12:** 集成国内免费天气 API — 和风天气（QWeather）作为主数据源，OpenWeatherMap 作为备选
- **D-13:** 自动获取用户位置天气 — AI 在推荐时考虑温度/湿度/风力/紫外线
- **D-14:** 天气数据注入到 ContextService 推荐上下文

### 方案历史归档 (AIS-07)
- **D-15:** 所有生成的穿搭方案按日期归档保存，支持日历视图快速定位
- **D-16:** 后端新建 SessionArchiveService — 按日归档查询

### AI 安全过滤 (AIS-08)
- **D-17:** 复用 GLM API 自带内容安全 + SYSTEM_PROMPT 安全约束
- **D-18:** MVP 阶段不做独立内容审核服务（CC-22 决策）

### API 限流降级 (AIS-09)
- **D-19:** 复用已有 rate_limiter.py（令牌桶）+ CircuitBreaker（断路器）+ degradation_service.py（降级）
- **D-20:** 验证限流和降级配置参数合理，确保高峰期优雅降级

### 推荐反馈机制 (AIS-10)
- **D-21:** 用户对穿搭方案可：喜欢/不喜欢 + 评分(1-5)、替换单个单品、发送方案调整指令、选择不喜欢原因
- **D-22:** 扩展 SubmitFeedbackDto 增加评分和不喜欢原因枚举

### 场景化快捷推荐 (AIS-11)
- **D-23:** 复用 generateDynamicOccasionOptions 已有场景选项生成
- **D-24:** 移动端新建 SceneQuickButtons 组件（6个场景按钮）

### 预设引导问题 (AIS-12)
- **D-25:** 新用户首次进入 AI 造型师时展示预设问题（"今天穿什么"/"我适合什么风格"/"帮我搭一套通勤装"）
- **D-26:** 后端新建 PresetQuestionsService — 预设问题列表 + 新用户判断逻辑

### 移动端状态管理
- **D-27:** 新建 aiStylistStore (Zustand) — 管理当前方案/历史/偏好，替代组件内 useState

### Claude's Discretion
- 和风天气 API Key 配置方式（环境变量 vs 配置文件）
- 方案页整体效果图的生成方式（GLM 文生图 vs 拼接单品图 vs 占位图）
- 日历视图组件选型（react-native-calendars vs 自建）
- 单品替换后的方案一致性保障策略
- 预设问题的具体内容和数量
- 反馈弹窗的具体 UI 布局

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 后端核心模块
- `apps/backend/src/modules/ai-stylist/` — AI 造型师完整模块（11个Provider，14个端点）
- `apps/backend/src/modules/ai-stylist/services/context.service.ts` — 用户上下文构建、槽位管理、编排状态机
- `apps/backend/src/modules/ai-stylist/services/recommendation.service.ts` — 穿搭方案生成、反馈处理
- `apps/backend/src/modules/ai-stylist/services/session.service.ts` — 会话持久化（Redis+PG）
- `apps/backend/src/modules/ai-stylist/services/chat.service.ts` — 多轮对话处理
- `apps/backend/src/modules/ai-stylist/llm-provider.service.ts` — LLM 多供应商故障转移（877行）
- `apps/backend/src/modules/ai-stylist/decision-engine.service.ts` — 决策树偏好学习（1457行）
- `apps/backend/src/modules/ai-stylist/nl-slot-extractor.service.ts` — 自然语言槽位提取
- `apps/backend/src/modules/ai-stylist/agent-tools.service.ts` — GLM-5 Function Calling
- `apps/backend/src/modules/ai-stylist/types/index.ts` — 完整类型体系（~700行）
- `apps/backend/src/modules/ai-stylist/dto/ai-stylist.dto.ts` — DTO 定义
- `apps/backend/src/modules/ai-stylist/prompts/system-prompt.ts` — Prompt 系统
- `apps/backend/src/modules/weather/weather.service.ts` — OpenWeatherMap 天气集成（159行）
- `apps/backend/src/modules/security/rate-limit/ai-quota.service.ts` — AI 调用配额管理

### Python ML 服务
- `ml/services/intelligent_stylist_service.py` — GLM-5 核心引擎（1396行）
- `ml/services/rate_limiter.py` — 令牌桶限流（177行）
- `ml/services/degradation_service.py` — 断路器降级（857行）
- `ml/api/routes/stylist_chat.py` — 造型师聊天路由
- `ml/api/routes/intelligent_stylist_api.py` — 智能造型师 API 路由

### 移动端
- `apps/mobile/src/screens/AiStylistScreen.tsx` — 当前聊天 UI（735行，纯 useState）
- `apps/mobile/src/services/api/ai-stylist.api.ts` — API 客户端（183行）
- `apps/mobile/src/stores/` — 11个 Zustand Store（无 AI 造型师专用 Store）

### 数据模型
- `apps/backend/prisma/schema.prisma` — AiStylistSession（payload Json 字段）、UserDecision、UserProfile、ClothingItem

### 跨切面决策
- `.planning/phases/01-user-profile-style-test/01-CONTEXT.md` — CC-01 到 CC-48 全部跨切面决策

</canonical_refs>

<specifics>
## Specific Ideas

- 方案页参考小红书穿搭笔记的卡片式布局，信息密度高
- 场景快捷按钮参考淘宝"场景穿搭"入口的交互方式
- 可折叠理由卡片参考知乎回答的"展开阅读更多"交互
- 天气集成参考墨迹天气的穿衣指数建议
- 日历视图参考 Apple 日历的简洁设计
- 预设引导问题参考 ChatGPT 的首次对话引导
- 单品替换参考淘宝"找同款"的交互模式

</specifics>

<deferred>
## Deferred Ideas

- AI 图片输入（上传衣服问怎么搭）— v3
- 语音输入 — v3
- 流式响应（SSE/WebSocket）— 后续优化
- 数据模型优化（AiStylistSession.payload 扁平化）— 后续重构
- A/B 测试与效果追踪 — Phase 4 推荐引擎
- ML API 路由冲突修复 — 本 Phase 顺带处理

</deferred>

---
*Phase: 02-ai-stylist*
*Context gathered: 2026-04-14 via auto mode*
