# Phase 2: AI 造型师 - Research

**Created:** 2026-04-14
**Status:** Complete
**Phase Requirements:** AIS-01 ~ AIS-12 (12 条)

---

## 1. 方案页交互模式 (AIS-01)

### 现状
- 移动端 `AiStylistScreen.tsx` (735行) 和 `AiStylistScreenV2.tsx` (1247行) 均为纯聊天 UI
- `OutfitCard.tsx` 组件存在但仅有 `onItemPress` 回调，无 `onReplace`/`onFeedback`/`onRate`
- 后端 `StylistResolution` 类型已定义 `lookSummary` + `whyItFits` + `outfits`，但无独立方案页端点
- `StylistOutfitPlan` 类型已定义 `items` + `overallScore` + `explanation`

### 需要实现
- **后端**: 新建 `OutfitPlanService` 聚合方案数据（整体效果图URL + 单品列表 + 推荐理由），新增 `GET /sessions/:sessionId/outfit-plan` 端点
- **移动端**: 新建 `OutfitPlanScreen` 替代纯聊天模式，聊天输入仅作为方案请求入口
- **方案页布局**: 顶部整体效果图区域 + 中部单品卡片列表 + 底部可折叠理由卡片

### 关键决策
- 整体效果图生成方式：MVP 使用单品图拼接（前端组合展示），不调用 GLM 文生图（节省成本和延迟）
- 方案页与聊天页的关系：方案页为主视图，聊天输入区嵌入方案页底部

---

## 2. MVP 输入方式 (AIS-02)

### 现状
- `ContextService` 已有 `OCCASION_GUIDE` 定义 7 种场合（通勤/约会/运动/面试/休闲/旅行/日常）
- `generateDynamicOccasionOptions()` 已实现动态场景选项生成
- 移动端输入框仅支持文字输入，无场景快捷按钮

### 需要实现
- **移动端**: 新建 `SceneQuickButtons` 组件（6个场景按钮：通勤/约会/运动/面试/休闲/旅行）
- **移动端**: 集成到 AiStylistScreen 输入框上方
- **交互**: 点击场景按钮自动发送对应场景消息到后端

### 关键决策
- 场景按钮固定 6 个，不做动态加载
- 点击场景按钮 = 发送预定义消息（如"帮我搭一套通勤穿搭"）

---

## 3. 画像驱动推荐 (AIS-03)

### 现状
- `ContextService.buildUserContext()` 已实现用户画像数据获取（bodyType, skinTone, colorSeason, stylePreferences, colorPreferences）
- `GLMStylistEngine` 已集成体型/色彩季型知识库（`BODY_TYPE_GUIDE`, `COLOR_SEASON_GUIDE`）
- `buildRecommendationPrompt()` 已包含 bodyType, colorSeason, occasion, styles, goals, budget

### 需要验证
- 推荐结果是否确实包含体型适配说明和色彩搭配解释
- 画像数据为空时的降级处理

### 关键决策
- 复用现有画像驱动逻辑，无需重写
- 画像不完整时使用基本信息（性别/年龄段）作为最低推荐依据

---

## 4. 可折叠推荐理由卡片 (AIS-04)

### 现状
- `RecommendationService.buildWhyItFits()` 已生成推荐理由（体型适配 + 色彩搭配 + 场合适合度）
- `StylistOutfitPlan` 类型有 `explanation` 字段
- 移动端无对应 UI 组件

### 需要实现
- **移动端**: 新建 `ReasoningCard` 组件（可折叠 + 动画，默认收起点击展开）
- **移动端**: 集成到 OutfitPlanScreen 方案下方

### 关键决策
- 使用 Reanimated 实现折叠/展开动画
- 默认收起，点击展开，展示体型适配 + 色彩搭配 + 场合适合度三段

---

## 5. 单品替换交互 (AIS-05)

### 现状
- `AgentToolsService.searchClothing()` 已实现服装搜索（支持 category/colors/styles 过滤）
- 无独立的同类商品检索服务
- 无单品替换端点
- `OutfitCard` 无替换回调

### 需要实现
- **后端**: 新建 `ItemReplacementService`（基于 category + 用户画像过滤同类商品）
- **后端**: 新增 `GET /sessions/:sessionId/items/:itemId/alternatives` 端点
- **后端**: 新增 `POST /sessions/:sessionId/items/:itemId/replace` 端点
- **移动端**: 新建 `ItemReplacementModal` 组件（商品列表 + 选择替换）
- **移动端**: OutfitItemCard 集成替换按钮和弹窗

### 关键决策
- 同类商品过滤维度：category（必须匹配）+ style tags + price range + body type fit
- 替换后重新计算搭配评分和推荐理由
- 替换操作修改 session payload 中的 outfit plan

---

## 6. 天气智能集成 (AIS-06)

### 现状
- `WeatherService` (159行) 仅集成 OpenWeatherMap，无国内 API
- `WeatherModule` 未被 `AiStylistModule` 导入
- `ContextService.buildUserContext()` 不调用 WeatherService
- `buildRecommendationPrompt()` 不包含天气数据
- `buildWhyItFits()` 不包含天气因素
- `StylistSlots` 类型有 `weather?: string` 字段但从未自动填充
- 移动端 `homeStore` 使用 OpenMeteo（免费，无需 API Key）
- `system-prompt.ts` 的 `SLOT_EXTRACTION_PROMPT` 有天气槽位但仅从用户文本提取

### 需要实现
- **后端**: 集成和风天气（QWeather）API 作为主数据源，OpenWeatherMap 作为备选
- **后端**: AiStylistModule 导入 WeatherModule
- **后端**: ContextService.buildUserContext() 注入天气数据
- **后端**: buildRecommendationPrompt() 包含天气因素
- **后端**: buildWhyItFits() 包含天气适配说明
- **移动端**: 方案页展示天气信息和建议

### 关键决策
- 和风天气免费版支持 1000次/天，足够 MVP
- 天气数据缓存 30 分钟（Redis）
- 用户位置通过移动端传递经纬度，后端不存储位置
- 天气注入到 StylistSlots.weather 字段

---

## 7. 方案历史按日归档 (AIS-07)

### 现状
- `SessionService.listSessions()` 已实现会话列表查询（支持 page/limit/isActive）
- `AiStylistSession` 模型有 `createdAt` 字段
- 无按日归档查询逻辑
- 无日历视图端点
- 移动端无历史会话列表页面

### 需要实现
- **后端**: 新建 `SessionArchiveService`（按日归档查询）
- **后端**: 新增 `GET /sessions/calendar` 日历视图端点（返回有方案的日期列表）
- **后端**: 新增 `GET /sessions/date/:date` 指定日期方案列表端点
- **移动端**: 新建 `SessionCalendarScreen`（日历 + 方案列表）
- **移动端**: AiStylistScreen 增加历史入口按钮

### 关键决策
- 日历视图使用 react-native-calendars 库
- 归档基于 AiStylistSession.createdAt 的日期部分
- 方案数据从 payload JSON 中提取

---

## 8. AI 安全过滤 (AIS-08)

### 现状
- `system-prompt.ts` 的 `STYLIST_SYSTEM_PROMPT` 已包含安全约束
- GLM API 自带内容安全过滤
- `AiQuotaService` 实现每日配额限制（10次/天）
- CC-22 决策：MVP 阶段不做独立内容审核服务

### 需要验证
- GLM API 内容安全过滤的实际效果
- SYSTEM_PROMPT 安全约束的完整性

### 关键决策
- 复用现有安全机制，MVP 不新增独立审核服务
- 后续可增加关键词过滤作为额外防护

---

## 9. API 限流降级 (AIS-09)

### 现状
- Python 层 `rate_limiter.py` (177行) 已实现令牌桶限流（GLM: 60 req/min, 100K tokens/min）
- Python 层 `CircuitBreaker` 已实现断路器模式
- Python 层 `degradation_service.py` (857行) 已实现 4 级降级（FULL/DEGRADED/MINIMAL/OFFLINE）
- NestJS 层 `LlmProviderService` (877行) 已实现多供应商故障转移
- `AiQuotaGuard` 已实现用户维度配额限制

### 需要验证
- 限流和降级配置参数是否合理
- 降级到静态参考方案的实现是否完整

### 关键决策
- 复用所有限流降级机制
- 验证配置参数并调整到合理值

---

## 10. 推荐反馈机制 (AIS-10)

### 现状
- `SubmitFeedbackDto` 仅有 `outfitIndex`, `action` (like/dislike), `itemId`
- `RecommendationService.submitFeedback()` 仅处理 like/dislike，权重 ±1.0/−0.5
- 无评分（1-5）字段
- 无不喜欢原因枚举
- 无方案调整指令

### 需要实现
- **后端**: 扩展 `SubmitFeedbackDto` 增加评分(1-5)和不喜欢原因枚举
- **后端**: FeedbackService 记录详细反馈用于后续优化
- **移动端**: 新建 `FeedbackModal`（评分 + 原因选择）
- **移动端**: OutfitPlanScreen 集成反馈入口

### 关键决策
- 不喜欢原因枚举：太贵/不适合/颜色不对/风格不符/其他
- 评分影响偏好权重：5星 +2.0, 4星 +1.0, 3星 0, 2星 -1.0, 1星 -2.0
- 方案调整指令通过聊天输入发送（复用现有对话机制）

---

## 11. 场景化快捷推荐 (AIS-11)

### 现状
- `generateDynamicOccasionOptions()` 已实现场景选项生成
- 与 AIS-02 场景按钮复用同一套场景定义

### 需要实现
- 复用 AIS-02 的 SceneQuickButtons 组件
- 点击场景按钮触发一键推荐流程（跳过对话，直接生成方案）

### 关键决策
- 场景按钮同时满足 AIS-02（输入方式）和 AIS-11（快捷推荐）
- 一键推荐 = 自动创建会话 + 填充场景槽位 + 直接 resolve

---

## 12. 预设引导问题 (AIS-12)

### 现状
- `AiStylistController` 有 `GET /suggestions` 端点返回快捷建议
- 无新用户判断逻辑
- 无预设问题弹窗 UI

### 需要实现
- **后端**: 新建 `PresetQuestionsService`（预设问题列表 + 新用户判断逻辑）
- **后端**: 新增 `GET /stylist/preset-questions` 端点
- **移动端**: 新建 `PresetQuestionsModal` 组件
- **移动端**: AiStylistScreen 首次进入展示预设问题弹窗

### 关键决策
- 新用户判断：会话数 = 0 即为新用户
- 预设问题固定列表：["今天穿什么", "我适合什么风格", "帮我搭一套通勤装", "约会怎么穿", "运动穿搭推荐"]
- 点击预设问题 = 发送对应消息

---

## 13. 移动端状态管理

### 现状
- AiStylistScreen 和 AiStylistScreenV2 全部使用 useState
- AICompanionProvider 也使用 useState
- 无 aiStylistStore
- 现有 13 个 Zustand Store 可参考（auth, clothing, home, onboarding, photo, profile, quiz, styleQuiz, ui, user, wardrobe, app, index）
- `homeStore` 已有天气数据（OpenMeteo）和 fetchWeather() 方法

### 需要实现
- **移动端**: 新建 `aiStylistStore` (Zustand) 管理当前方案/历史/偏好
- 替代组件内 useState

### 关键决策
- Store 结构：currentSession, currentOutfitPlan, sessionHistory, presetQuestions, isLoading, error
- 不使用 persist（方案数据量大，不适合 AsyncStorage）
- 方案数据通过 TanStack Query 缓存

---

## 14. ML API 路由冲突

### 现状
- `ml/api/routes/stylist_chat.py` 注册在 `/api/stylist` 前缀
- `ml/services/intelligent_stylist_api.py` 也注册在 `/api/stylist` 前缀
- `ml/api/main.py` 同时加载了两个路由
- 两者都有 `POST /chat` 端点，后注册的会覆盖先注册的

### 需要修复
- 将 `intelligent_stylist_api.py` 的前缀改为 `/api/stylist/v2` 或合并到 `stylist_chat.py`
- 或将 `intelligent_stylist_api.py` 的端点整合到 `stylist_chat.py` 中

### 关键决策
- 保留 `stylist_chat.py` 作为主路由，将 `intelligent_stylist_api.py` 的独有端点合并进来
- 废弃 `intelligent_stylist_api.py` 的独立路由注册

---

## 15. Validation Architecture

### 关键验证维度

| 维度 | 验证方法 |
|------|----------|
| API 端点完整性 | 每个 AIS-XX 需求对应至少一个端点 |
| 类型安全 | TypeScript 编译无错误 |
| 限流降级 | 模拟高并发场景验证 |
| 天气集成 | Mock 天气数据验证推荐结果包含天气因素 |
| 方案页渲染 | 移动端截图对比 |
| 单品替换 | 替换后方案一致性验证 |
| 反馈闭环 | 反馈数据写入数据库验证 |
| 安全过滤 | 注入测试用例验证 |

---

## RESEARCH COMPLETE

**Key findings:**
1. 后端 ai-stylist 模块骨架完整（11 providers, 14 endpoints），但缺少方案页/归档/替换/天气/预设相关服务和端点
2. 移动端仅有聊天 UI，需要新建方案页、状态管理、多个交互组件
3. 天气模块存在但未与 ai-stylist 集成，需要注入到推荐上下文
4. ML API 存在路由冲突需要修复
5. 反馈机制需要扩展（评分+原因）
6. 大量可直接复用的代码（LLM多供应商、限流降级、槽位提取、决策引擎）

**Risk assessment:**
- 低风险：复用已有代码（画像驱动、限流降级、安全过滤）
- 中风险：方案页 UI 交互复杂度、天气 API 集成、单品替换逻辑
- 需关注：ML 路由冲突、AiStylistSession Json payload 查询效率
