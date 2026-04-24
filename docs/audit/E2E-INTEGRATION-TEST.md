# E2E 全链路集成审计报告

**日期**: 2026-04-23
**范围**: 4 条核心用户路径代码连通性检查
**方法**: 静态代码追踪（import 路径、TypeScript 类型、DTO 对齐、错误处理、Loading 状态）
**状态**: 已修复所有 P0/P1 问题

---

## 总览

| 路径                          | 原始状态    | 修复后状态 |
| ----------------------------- | ----------- | ---------- |
| 路径 1: Onboarding → 推荐结果 | ⚠️ 部分通畅 | ✅ 通畅    |
| 路径 2: 今天 Tab → 每日推荐   | ✅ 基本通畅 | ✅ 通畅    |
| 路径 3: 造型师对话            | ⚠️ 部分通畅 | ✅ 通畅    |
| 路径 4: 发现 Tab → 商品浏览   | ⚠️ 部分通畅 | ✅ 通畅    |

---

## 修复记录

### P0 修复 (3 项)

| #   | 问题                  | 修复文件                                                      | 修复内容                                                                                                                         |
| --- | --------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Onboarding 状态机断开 | `onboardingService.ts`, `ResultStep.tsx`                      | 新增 `completeOnboarding()` 方法，调 POST /onboarding/basic-info + skip PHOTO/STYLE_TEST，handleComplete 使用 newOnboarding 数据 |
| 2   | 对话状态机未接入      | `ai-stylist.api.ts`, `aiStylistStore.ts`, `StylistScreen.tsx` | 添加 dialog API + store 方法，handleSend/handleQuickReply 优先使用对话状态机，启用后端 quickReplies                              |
| 3   | 占位 embedding        | `recommendation.orchestrator.ts`                              | 替换 `generateQueryEmbedding` hash 为 `qdrantService.getTextEmbedding()` 真实 ML 调用                                            |

### P1 修复 (3 项)

| #   | 问题                       | 修复文件                        | 修复内容                                                    |
| --- | -------------------------- | ------------------------------- | ----------------------------------------------------------- |
| 4   | ProductFeedCard 死代码     | `ProductFeed.tsx`               | 导入并使用 ProductFeedCard，添加 RecommendedItem→props 适配 |
| 5   | ML URL 不匹配              | `ai-stylist.service.ts`         | 默认值改为 `http://localhost:8001/api` 匹配 ML 路由前缀     |
| 6   | GetDiscoverQueryDto 未应用 | `recommendations.controller.ts` | 改用 `@Query() dto?: GetDiscoverQueryDto`                   |

### P2 修复 (1 项)

| #   | 问题           | 修复文件                                      | 修复内容                               |
| --- | -------------- | --------------------------------------------- | -------------------------------------- |
| 7   | 年龄范围不匹配 | `onboardingService.ts`                        | 添加 `AGE_RANGE_MAP` 映射前端 → 后端值 |
| 8   | 死代码文件     | `features/stylist/services/ai-stylist.api.ts` | 已删除                                 |

---

## 路径 1: Onboarding → 推荐结果

### 链路图

```
OnboardingNavigator (4步)
  → SceneStep → StyleStep → PreferenceStep → ResultStep
    → onboardingStore (newOnboarding 状态)
    → goldenRecommendationApi.findMatchingGoldenRecommendation()
      → GET /recommendations/golden/profiles ✅
      → GET /recommendations/golden/:profileId ✅
    → goldenOutfitToRecommendation() 类型转换 ✅
    → MatchRadarChart 渲染 ✅
  → "开始使用" → onboardingService.saveOnboardingData()
    → PUT /profile (ProfileController) ⚠️
    → markOnboardingComplete() (AsyncStorage only)
    → navigation.reset → MainTabs ✅
```

### 检查点

| #   | 检查点                                          | 状态 | 位置                                                                         |
| --- | ----------------------------------------------- | ---- | ---------------------------------------------------------------------------- |
| 1   | OnboardingNavigator 4 步导航                    | ✅   | `features/onboarding/navigation/OnboardingNavigator.tsx:9-13`                |
| 2   | SceneStep/StyleStep/PreferenceStep 导入         | ✅   | 所有文件存在且路径正确                                                       |
| 3   | ResultStep 导入                                 | ✅   | `features/onboarding/screens/ResultStep.tsx`                                 |
| 4   | onboardingStore 状态管理                        | ✅   | 新版 `newOnboarding` 状态正确                                                |
| 5   | goldenRecommendationApi 调用                    | ✅   | `ResultStep.tsx:146`                                                         |
| 6   | GET /recommendations/golden/profiles 后端路由   | ✅   | `recommendations.controller.ts:515-524`                                      |
| 7   | GET /recommendations/golden/:profileId 后端路由 | ✅   | `recommendations.controller.ts:526-537`                                      |
| 8   | MatchRadarChart 渲染                            | ✅   | `ResultStep.tsx:310-315`                                                     |
| 9   | Loading 状态                                    | ✅   | `isFetchingRecs` + 预览动画                                                  |
| 10  | 错误处理 + mock 回退                            | ✅   | 黄金 API → 冷启动 API → mock 三级回退                                        |
| 11  | onboardingStore.submit()                        | ❌   | **不存在** — store 无 submit 方法                                            |
| 12  | POST /onboarding/complete                       | ❌   | **后端无此端点** — 前端也不调用它                                            |
| 13  | onboardingService → 后端 OnboardingController   | ❌   | **断裂** — 前端调 PUT /profile，后端 OnboardingController 的状态机从未被推进 |

### ❌ 关键问题

**1. 后端 Onboarding 状态机完全断开**

- 前端 `saveOnboardingData()` 调用 `PUT /profile`（ProfileController），不调后端 OnboardingController
- 后端 `GET /onboarding/state` 将永远返回 `BASIC_INFO`，即使用户已完成
- **修复方案**: 在 `onboardingService` 中添加调用 `POST /onboarding/basic-info` 和推进状态的逻辑，或在后端 OnboardingController 添加 `POST /onboarding/complete`

**2. 新旧状态不兼容**

- Store 中存在两套步骤系统（旧版 `basicInfo|photo|styleTest|complete`，新版 `scene|style|preference|result`）
- `handleComplete` 将旧版 `formData` 传给 `saveOnboardingData()`，但新版步骤收集的数据存在 `newOnboarding` 中
- **修复方案**: `handleComplete` 应从 `newOnboarding` 构建后端需要的 DTO，或在 store 中合并为统一状态

**3. 年龄范围枚举不匹配**

- 前端: `"18-24" | "25-30" | "31-40" | "41-50" | "50+"`
- 后端: `"under_18" | "18_24" | "25_34" | "35_44" | "45_54" | "55_plus"`
- **修复方案**: 在 `onboardingService` 中添加值映射函数

### ✅ 正常部分

- 黄金推荐完整链路（profiles 获取 → 本地匹配 → 按 ID 获取 → 类型转换 → 雷达图渲染）全部通畅
- 三级回退策略（黄金 → 冷启动 → mock）健壮
- 后端 golden 端点标记 `@Public()` 无需认证

---

## 路径 2: 今天 Tab → 每日推荐

### 链路图

```
TodayScreen
  → WeatherSceneCard (hardcoded mock) ⚠️
  → RecommendationCarousel
    → recommendationsApi.getPersonalized({ limit: 6 })
      → GET /recommendations ✅
      → 后端 RecommendationsController.getRecommendations()
        → orchestrator.getRecommendations()
          → 六层漏斗: fetchCandidates → filterByScene → filterBySize
            → filterByBudget → scoreByRules + scoreByVector → applyPreferenceLearning
          → scoreFusion (rule 0.4 + vector 0.35 + preference 0.25) ✅
        → 返回 { items, total } ✅
    → getNormalizedRecommendations() 类型转换 ✅
    → 渲染推荐卡片列表 ✅
```

### 检查点

| #   | 检查点                                         | 状态 | 位置                                                                                                       |
| --- | ---------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------- |
| 1   | TodayScreen 导入 WeatherSceneCard              | ✅   | `TodayScreen.tsx:3`                                                                                        |
| 2   | TodayScreen 导入 RecommendationCarousel        | ✅   | `TodayScreen.tsx:4`                                                                                        |
| 3   | RecommendationCarousel 导入 recommendationsApi | ✅   | `RecommendationCarousel.tsx:4`                                                                             |
| 4   | recommendationsApi.getPersonalized()           | ✅   | `tryon.api.ts:255-267` → `GET /recommendations`                                                            |
| 5   | 后端 GET /recommendations 路由                 | ✅   | `recommendations.controller.ts:141-201`                                                                    |
| 6   | orchestrator.getRecommendations()              | ✅   | `recommendation.orchestrator.ts:147-174`                                                                   |
| 7   | 六层漏斗完整实现                               | ✅   | `orchestrator.recommend()` 6 步漏斗                                                                        |
| 8   | Loading 状态                                   | ✅   | `isLoading` + `ActivityIndicator`                                                                          |
| 9   | 错误处理 + mock 回退                           | ✅   | try/catch → `MOCK_OUTFITS`                                                                                 |
| 10  | 类型对齐（front/back）                         | ✅   | normalization layer 正确映射                                                                               |
| 11  | WeatherSceneCard 实时天气                      | ❌   | **使用 hardcoded mock 数据**                                                                               |
| 12  | recommendation store 未使用                    | ⚠️   | `features/home/stores/recommendation.store.ts` 和 `stores/recommendation.store.ts` 都未被 TodayScreen 使用 |

### ❌ 关键问题

**1. WeatherSceneCard 无实时天气数据**

- `TodayScreen.tsx:24` 写死 `weather={{ temp: 22, condition: '晴', icon: 'sun' }}`
- 后端有 weather domain（`domains/fashion/weather/`），但前端未接入
- **修复方案**: 调用后端天气 API 获取实时数据，或使用设备定位+天气服务

**2. 推荐 Store 死代码**

- 存在两个推荐相关 store（`features/home/stores/recommendation.store.ts`、`stores/recommendation.store.ts`），但 RecommendationCarousel 使用自己的 `useState`
- `recommendation-feed.api.ts`（带分页的 feed API）也未被 TodayTab 使用
- **修复方案**: 统一为 store-based 状态管理，移除死代码或迁移 carousel 到 store

### ✅ 正常部分

- 推荐核心链路完整通畅：前端 API → 后端 Controller → Orchestrator 六层漏斗 → 返回
- 类型对齐：normalization layer 正确处理后端 `RecommendationResult` → 前端 `RecommendedItem`
- Orchestrator 实现完整的六层漏斗（候选 → 场景 → 尺码 → 预算 → 规则+向量 → 偏好学习）
- 冷启动检测（行为 < 10 条走 ColdStartService）

---

## 路径 3: 造型师对话

### 链路图

```
StylistScreen.handleSend
  → useAiStylistStore.createSession(text)
    → POST /ai-stylist/sessions ✅
  → useAiStylistStore.sendMessage(text)
    → POST /ai-stylist/sessions/:id/messages ✅
    → 后端 AiStylistService.sendMessage()
      → AiStylistChatService + ContextService (本地slot提取)
      → LlmProviderService (LLM调用) ✅
    → 返回 ChatResult { assistantMessage, sessionState } ✅
  → mapStateToStage() → 更新 conversationStage ✅
  → QuickReplyBar 渲染 ✅

⚠️ 对话状态机路径（存在但未连接）:
POST /ai-stylist/dialog/session → DialogStateService (Redis)
POST /ai-stylist/dialog/chat → ML /api/stylist/chat → DialogEngine
  GREET→CONTEXT→GENERATE→REFINE→ACTION→WRAP ✅ (后端+ML已实现)
```

### 检查点

| #   | 检查点                                 | 状态 | 位置                                                                  |
| --- | -------------------------------------- | ---- | --------------------------------------------------------------------- |
| 1   | StylistScreen 导入所有组件             | ✅   | ChatBubble, TypingIndicator, VoiceButton, QuickReplyBar 等            |
| 2   | useAiStylistStore 导入                 | ✅   | `StylistScreen.tsx:24`                                                |
| 3   | useAiStylistChatStore 导入             | ✅   | `StylistScreen.tsx:25`                                                |
| 4   | aiStylistStore → ai-stylist.api        | ✅   | `aiStylistStore.ts` → `services/api/ai-stylist.api.ts`                |
| 5   | POST /ai-stylist/sessions 后端路由     | ✅   | `ai-stylist.controller.ts:227`                                        |
| 6   | POST /ai-stylist/sessions/:id/messages | ✅   | `ai-stylist.controller.ts:316`                                        |
| 7   | AiStylistService.sendMessage           | ✅   | 使用 session-based chat                                               |
| 8   | mapStateToStage 函数                   | ✅   | `StylistScreen.tsx:37-47`                                             |
| 9   | Loading 状态                           | ✅   | `isGenerating` + TypingIndicator + 发送按钮禁用                       |
| 10  | 错误处理                               | ✅   | error 状态横幅 + 清除按钮                                             |
| 11  | 对话状态机端点被前端调用               | ❌   | **StylistScreen 未使用 dialog/\* 端点**                               |
| 12  | ML 路由 URL 匹配                       | ❌   | **后端调 /stylist/chat，ML 路由 /api/stylist/chat**                   |
| 13  | 前端快速回复来自后端                   | ❌   | **apiQuickReplies 始终被设为 null**，总用静态 QUICK_REPLIES           |
| 14  | 响应 DTO 匹配                          | ❌   | session 路径返回 `assistantMessage`，dialog 路径返回 `reply` — 不兼容 |

### ❌ 关键问题

**1. 对话状态机路径完全未接入前端**

- 前端 `handleSend` 调用 session-based 路径（`/ai-stylist/sessions/:id/messages`）
- 后端已完整实现对话状态机（`/ai-stylist/dialog/session` + `/dialog/chat`）含 Redis 状态管理
- ML `DialogEngine` 已实现完整 GREET→CONTEXT→GENERATE→REFINE→ACTION→WRAP
- **修复方案**: 将 StylistScreen 的 `handleSend` 改为先调 `POST /ai-stylist/dialog/session` 创建会话，再调 `POST /ai-stylist/dialog/chat` 发送消息

**2. ML 服务 URL 不匹配**

- 后端 `ai-stylist.service.ts:307` 调 `${mlServiceUrl}/stylist/chat`
- ML `stylist.py` 路由前缀为 `/api/stylist`
- 仅当 `ML_SERVICE_URL` 包含 `/api`（如 `http://localhost:8001/api`）时才匹配
- **修复方案**: 确认环境变量 `ML_SERVICE_URL` 配置，或统一路由前缀

**3. 快速回复未使用后端数据**

- `StylistScreen` 每次响应后将 `apiQuickReplies` 设为 null（175/223 行）
- 后端 `dialogChat` 返回的 `quickReplies` 从未被使用
- **修复方案**: 解析后端响应中的 `quickReplies` 字段并渲染

**4. 功能级 API 文件是死代码**

- `features/stylist/services/ai-stylist.api.ts` 是 `services/api/ai-stylist.api.ts` 的完全复制
- aiStylistStore 从后者导入，前者从未使用
- **修复方案**: 删除 `features/stylist/services/ai-stylist.api.ts`

### ✅ 正常部分

- Session-based 对话路径完整通畅
- 所有组件导入路径正确
- ChatStore 使用 Zustand + persist（AsyncStorage）
- QuickReplyBar 组件渲染正确（弹簧动画 + 无障碍）
- 后端 fallbackDialogChat 在 ML 不可用时提供基于规则的降级
- Redis 状态管理 TTL 30 分钟合理

---

## 路径 4: 发现 Tab → 商品浏览

### 链路图

```
DiscoverScreen
  → SearchBar + ScenePills + HotScenes + ProductFeed ✅
  → ProductFeed
    → recommendationsApi.getDiscover(20)
      → GET /recommendations/discover ✅
      → 后端 RecommendationsController (OptionalAuthGuard)
        → logged-in: orchestrator.getRecommendations() ✅
        → anonymous: orchestrator.getTrendingRecommendations() ✅
        → scoreByVector → QdrantService.searchSimilar() ⚠️
          → generateQueryEmbedding() 是 hash 占位符，非真实ML embedding
    → getNormalizedRecommendations() ✅
    → 渲染 inline product cards ⚠️ (未使用 ProductFeedCard)
```

### 检查点

| #   | 检查点                              | 状态 | 位置                                                               |
| --- | ----------------------------------- | ---- | ------------------------------------------------------------------ |
| 1   | DiscoverScreen 导入 ProductFeed     | ✅   | `DiscoverScreen.tsx`                                               |
| 2   | ProductFeed 导入 recommendationsApi | ✅   | `ProductFeed.tsx:4`                                                |
| 3   | recommendationsApi.getDiscover()    | ✅   | `tryon.api.ts:333-340` → `GET /recommendations/discover`           |
| 4   | 后端 GET /recommendations/discover  | ✅   | `recommendations.controller.ts:378-409`                            |
| 5   | OptionalAuthGuard (登录/匿名)       | ✅   | 支持两种状态                                                       |
| 6   | Orchestrator 向量搜索               | ⚠️   | 使用 hash 占位 embedding，非真实语义向量                           |
| 7   | QdrantService.searchSimilar()       | ✅   | 正确实现                                                           |
| 8   | Loading 状态                        | ✅   | `isLoading` + `ActivityIndicator` + `RefreshControl`               |
| 9   | 错误处理 + mock 回退                | ✅   | try/catch → `MOCK_PRODUCTS`                                        |
| 10  | ProductFeedCard 被使用              | ❌   | **ProductFeed 渲染自己的 inline card**                             |
| 11  | ProductFeedCard props 匹配          | ❌   | `image` vs `mainImage`, `title` vs `name`, `matchScore` vs `score` |
| 12  | recommendation-feed.api.ts 被使用   | ❌   | **Discover 流程未使用**                                            |

### ❌ 关键问题

**1. ProductFeedCard 是死代码**

- `ProductFeed.tsx` 渲染自己的内联卡片（91-111 行），未导入 ProductFeedCard
- ProductFeedCard 包含动画、匹配分数、收藏等高级功能全部浪费
- **修复方案**: 在 ProductFeed 中导入并使用 ProductFeedCard，添加 RecommendedItem → ProductFeedCard props 的映射

**2. ProductFeedCard props 与 RecommendedItem 不匹配**

- `ProductFeedCard` 期望: `{ id, image, title, price, matchScore, isFavorite, onPress, onFavorite }`
- `RecommendedItem` 提供: `{ id, mainImage, name, price, score }`
- 字段名不同: `image`↔`mainImage`, `title`↔`name`, `matchScore`↔`score`
- **修复方案**: 添加适配函数或统一类型定义

**3. Orchestrator 使用占位 embedding**

- `generateQueryEmbedding()`（orchestrator:799-818）生成确定性 hash 向量，不是真实 ML embedding
- QdrantService 有 `searchByText()` 方法可调用 ML 获取真实 embedding，但 orchestrator 未使用
- 向量搜索结果本质上是随机相似度
- **修复方案**: 在 orchestrator 的 `scoreByVector` 中使用 `QdrantService.searchByText()` 或调用 ML embedding 服务

### ⚠️ 次要问题

**4. 后端 DiscoverResponseDto 声明但未使用**

- Controller 返回原始 `RecommendationResult[]`，未包装为声明的 `{ items, categories, personalized }`

**5. GetDiscoverQueryDto 导入但未应用**

- Controller 使用原始 `@Query("limit")`，DTO 的验证装饰器被跳过

**6. apiClient 导入风格不一致**

- `tryon.api.ts` 用 default import，`recommendation-feed.api.ts` 用 named import

### ✅ 正常部分

- 核心链路通畅：DiscoverScreen → ProductFeed → API → 后端 → Orchestrator
- 认证双路径（登录/匿名）正确
- Qdrant 服务实现完整（自动建集合、HNSW 配置、payload 索引）
- 向量搜索不可用时降级为纯规则评分
- normalization layer 正确映射后端 → 前端类型

---

## 交叉问题汇总

| #   | 问题                                             | 影响路径 | 严重程度 |
| --- | ------------------------------------------------ | -------- | -------- |
| 1   | 后端 OnboardingController 状态机未被前端推进     | 路径 1   | HIGH     |
| 2   | 新旧 onboarding 状态不兼容                       | 路径 1   | HIGH     |
| 3   | 年龄范围枚举不匹配                               | 路径 1   | MEDIUM   |
| 4   | 对话状态机路径未接入前端                         | 路径 3   | HIGH     |
| 5   | ML 路由 URL 可能不匹配                           | 路径 3   | MEDIUM   |
| 6   | 快速回复未使用后端数据                           | 路径 3   | MEDIUM   |
| 7   | 功能级 ai-stylist.api.ts 死代码                  | 路径 3   | LOW      |
| 8   | Orchestrator 使用占位 embedding                  | 路径 2/4 | HIGH     |
| 9   | ProductFeedCard 死代码 + props 不匹配            | 路径 4   | MEDIUM   |
| 10  | WeatherSceneCard hardcoded mock                  | 路径 2   | LOW      |
| 11  | recommendation-feed.api.ts 和多个 store 未被使用 | 路径 2/4 | LOW      |
| 12  | DiscoverResponseDto / GetDiscoverQueryDto 未应用 | 路径 4   | LOW      |
| 13  | 无 Error Boundary 在 Screen 级别                 | 所有     | LOW      |

## 修复优先级建议

### P0 — 必须修复（影响功能正确性）

1. **路径 1**: 统一 onboarding 完成逻辑 — 让前端正确调用后端，传递新版状态数据
2. **路径 3**: 将前端 StylistScreen 接入对话状态机路径
3. **路径 2/4**: 将 orchestrator 的 `generateQueryEmbedding` 替换为真实 ML embedding 调用

### P1 — 应该修复（影响用户体验）

4. **路径 3**: 确认 ML_SERVICE_URL 配置，消除 URL 不匹配风险
5. **路径 3**: 启用后端返回的 quickReplies
6. **路径 4**: ProductFeed 集成 ProductFeedCard 组件

### P2 — 可以优化（代码质量）

7. **路径 1**: 添加年龄范围值映射
8. **路径 3**: 删除死代码 `features/stylist/services/ai-stylist.api.ts`
9. **路径 4**: 应用 GetDiscoverQueryDto 验证
10. **所有路径**: 添加 Screen 级 Error Boundary
11. **路径 2/4**: 清理未使用的 store 和 API 文件
