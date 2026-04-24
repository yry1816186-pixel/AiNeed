# Phase 5: E2E Integration + Competition Demo - Research

**Researched:** 2026-04-25
**Status:** Complete

## Research Question

"What do I need to know to PLAN this phase well?"

---

## 1. E2E 数据接线 — 硬编码数据审计

### TodayScreen 硬编码清单

| 位置                | 硬编码内容                                   | 替换方案                                     |
| ------------------- | -------------------------------------------- | -------------------------------------------- |
| TodayScreen.tsx L13 | `HAS_RECOMMENDATION_DATA = false`            | 删除，直接调用 API                           |
| TodayScreen.tsx L45 | `{ temp: 22, condition: "晴", icon: "sun" }` | 调用 weatherService / 后端 GET /weather      |
| TodayScreen.tsx L46 | `{ title: "周末出行", description: "..." }`  | 从推荐 API 获取场景                          |
| TodayScreen.tsx L49 | AiInsightBubble 硬编码消息                   | 从 RecommendationOutput.explanation.why 获取 |
| TodayScreen.tsx L51 | QuickReplyButtons 硬编码选项                 | 从推荐 API 或对话 API 获取                   |

### DiscoverScreen 硬编码清单

| 位置                             | 硬编码内容                                                    | 替换方案                       |
| -------------------------------- | ------------------------------------------------------------- | ------------------------------ |
| DiscoverScreen.tsx L10           | `SAMPLE_SCENES = ["通勤","约会","运动","街头","度假","派对"]` | 从后端获取热门场景             |
| HotScenes.tsx L5-12              | `SCENES` 数组含 emoji 图标                                    | API 获取 + 本地 fallback       |
| ProductFeed.tsx L8               | `MOCK_PRODUCTS` fallback                                      | 删除 mock fallback，使用空状态 |
| RecommendationCarousel.tsx L7-32 | `MOCK_OUTFITS` fallback                                       | 删除 mock fallback，使用空状态 |

### 前后端类型不匹配（关键发现）

**前端 `RecommendedItem`**（tryon.api.ts）:

```typescript
interface RecommendedItem {
  id: string;
  name: string;
  brand?: string;
  price: number;
  mainImage: string;
  category: string;
  score?: number;
  matchReasons?: string[];
}
```

**后端 `RecommendationOutput`**（recommendation.types.ts）:

```typescript
interface RecommendationOutput {
  items: RecommendationOutputItem[];
  outfit?: OutfitSuggestion;
  explanation: RecommendationExplanationDetail;
  experimentId?: string;
  degraded?: boolean;
}
interface RecommendationOutputItem {
  id: string;
  name: string;
  imageUrl: string;
  category: string;
  price?: number;
  score: number;
  explanation: string;
}
interface RecommendationExplanationDetail {
  why: string;
  alternative: string;
  nextAction: string;
  confidence: number;
}
```

**差距**: 前端类型缺少 `explanation`（单条+整体）、`outfit`、`experimentId`、`degraded`、`breakdown`。必须对齐。

### 后端 API 端点（已就绪）

| 端点                            | 方法 | 状态 | 用途             |
| ------------------------------- | ---- | ---- | ---------------- |
| `/recommendations/personalized` | GET  | ✓    | TodayScreen 推荐 |
| `/recommendations/daily-outfit` | GET  | ✓    | 每日穿搭         |
| `/recommendations/occasion`     | GET  | ✓    | 场景推荐         |
| `/recommendations/discover`     | GET  | ✓    | Discover feed    |
| `/weather`                      | GET  | ✓    | 天气（lat/lon）  |
| `/weather/city`                 | GET  | ✓    | 天气（城市名）   |
| `/weather/styles`               | GET  | ✓    | 天气风格推荐     |
| `/ai-stylist/sessions/calendar` | GET  | ✓    | 日历数据         |

### 天气 API 现状

- **后端**: QWeather（和风天气）+ OpenWeather fallback + mock fallback
  - `WeatherService.getWeatherByLocationQWeather()` — 主路径
  - `WeatherService.getWeatherByLocation()` — OpenWeather fallback
  - `WeatherService.getWeatherBasedStyles()` — 天气 → 风格推荐
- **移动端**: Open-Meteo API（免费，无需 key）+ Nominatim 城市查找
  - `weatherService.ts` 返回 `WeatherInfo`（temperature, description, icon, suggestion, city）
  - 已有 fallback 默认值

**决策**: TodayScreen 应调用后端 GET /weather（已集成和风天气），而非移动端 Open-Meteo，保持数据源一致。

### TanStack Query 现状

`useQueryHooks.ts` 已定义 query keys:

- `queryKeys.recommendations.personalized`
- `queryKeys.recommendations.feed`
- `queryKeys.recommendations.daily`
- `queryKeys.recommendations.trending`

使用 `unwrap()` 辅助函数从 `ApiResponse` 提取数据。

---

## 2. 6 层漏斗可视化 — 数据可用性

### 后端 Orchestrator breakdown 数据

`recommendation.orchestrator.ts` 已产出:

```typescript
breakdown: {
  totalCandidates: number; // L1 后总数
  afterSceneFilter: number; // L2 场景过滤后
  afterSizeFilter: number; // L3 尺码过滤后
  afterBudgetFilter: number; // L4 预算过滤后
  ruleScore: number; // L5 规则评分
  vectorScore: number; // L5 向量评分
  preferenceScore: number; // L6 偏好评分
  finalScore: number; // 最终得分
}
```

**差距**: L5/L6 只有评分，没有"通过数量"。需要:

1. 在 Orchestrator 中添加 `afterStyleFilter` 和 `afterWardrobeFilter` 计数
2. 或在 RecommendationOutput 中暴露 breakdown 对象
3. 前端新建 `RecommendationFunnel` 组件渲染漏斗图

### 漏斗可视化组件设计参考

6 层从上到下收窄:

- L1 合规: totalCandidates → L2 场景: afterSceneFilter → L3 尺码: afterSizeFilter → L4 预算: afterBudgetFilter → L5 风格: afterStyleFilter → L6 衣橱互补: afterWardrobeFilter

每层显示: 层名 + 通过数量 + 过滤比例

---

## 3. 视觉一致性 — 硬编码颜色审计

### 当前状态

- **780 处硬编码颜色**分布在 **88 个文件**中
- Phase 3 已替换 55 处核心硬编码颜色
- 剩余 ~725 处需在 Phase 5 处理

### ShimmerSkeleton 品牌色差距

当前（ShimmerSkeleton.tsx）:

- `skeletonBase: "#F0E8E4"` — 中性灰粉
- `shimmer: borders.light = "rgba(0, 0, 0, 0.06)"` — 中性灰

目标（D-11）:

- skeletonBase: `#C4956A` 20% 透明度 = `rgba(196, 149, 106, 0.2)`
- shimmer: `#C4956A` 40% 透明度 = `rgba(196, 149, 106, 0.4)`

### EmptyState 组件重复

发现 3+ 个不同 EmptyState 实现:

1. `shared/components/states/EmptyState.tsx` — 完整版（动画、插图、操作按钮）
2. `design-system/primitives/` — 简化版
3. `shared/components/ux/` — 工具版

**建议**: 统一使用 `shared/components/states/EmptyState.tsx`（功能最完整）

### 三态覆盖现状

| 屏幕           | Loading                                | Empty          | Error |
| -------------- | -------------------------------------- | -------------- | ----- |
| TodayScreen    | ✗ (HAS_RECOMMENDATION_DATA=false 跳过) | ✓ (EmptyState) | ✗     |
| DiscoverScreen | ✗                                      | ✗              | ✗     |
| StylistScreen  | ✓ (ActivityIndicator)                  | ✓              | ✓     |
| CalendarScreen | ✓                                      | ✓              | ✓     |
| Onboarding     | ✓                                      | ✗              | ✗     |

---

## 4. Phase 4 人工验证项（D-13 前置）

### 5 项待验证

1. Python 对话引擎测试（50 pytest）
2. 面试穿搭流程端到端
3. 语音按钮 STT/TTS
4. Onboarding Step 4 "让伊伊搭第一套"
5. Edge-TTS 音频播放

### 2 项 Warning

- **TryOnBottomSheet save 是 no-op**（仅 dismiss，不实际保存到衣橱）— Phase 5 必须修复
- **QuickChatBar quick replies 是静态装饰按钮**（非后端驱动）— Phase 5 必须修复

---

## 5. 比赛 Demo 路径

### Profile 调试面板需求

- Demo 模式下可见（`__DEV__` 或 feature flag）
- 可修改: 体型(bodyType)、风格(styleExpression)、场景(primaryScenarios)
- 修改后立即触发重新推荐
- 展示"不同人不同结果"的包容性叙事

### 预缓存策略

- 3 套方案 × 3 个 Profile = 9 组预缓存推荐
- LLM 不可用时降级到规则引擎（REC-05 已实现 12 套模板）
- 网络断时使用本地缓存数据（TanStack Query cacheTime）

### Demo 视频需求

- 1-3 分钟
- 面试穿搭场景完整 Agent 对话
- 6 层漏斗可视化
- Profile 切换展示包容性
- 录制工具: Android 屏幕录制或 ADB screenrecord

---

## 6. E2E 测试

### 当前状态

- `detox.d.ts` 类型声明存在
- **无任何 E2E 框架安装**（package.json 无 detox/maestro 依赖）
- **无任何 E2E 测试文件**

### 框架选择建议

| 框架     | 优势                    | 劣势                     | 推荐   |
| -------- | ----------------------- | ------------------------ | ------ |
| Detox    | RN 生态成熟，灰色盒测试 | 配置复杂，Windows 支持差 | ✗      |
| Maestro  | 轻量，YAML 定义，快速   | 功能较少                 | ✓ 推荐 |
| 手动脚本 | 零配置                  | 不可重复                 | 备选   |

**建议**: Sprint 阶段使用手动测试脚本 + 关键路径 checklist，不引入 E2E 框架（降低复杂度）。Phase 6 再引入 Maestro。

---

## 7. 编译错误

### 当前状态

- 后端: 0 个 TS 错误
- 移动端: Phase 1 时 137 个错误，Phase 4 后状态未知
- D-12 要求: 系统化修复，不用 @ts-expect-error 或 any 压制
- D-15 要求: 每 Plan 完成后运行 tsc --noEmit

---

## 8. Schema 相关文件

Phase 5 可能涉及的 Prisma schema 变更:

- RecommendationOutput 暴露 breakdown → 可能需要新增 DTO
- Profile 调试面板 → 可能需要新增 DemoProfile 模型（或纯前端）

**Prisma schema 文件**: `apps/backend/prisma/schema.prisma`
**Push 命令**: `npx prisma db push`

---

## Validation Architecture

### 关键验证维度

1. **E2E 路径完整性**: 注册 →Onboarding→Today→ 对话 → 试穿 → 保存 → 日历，每步无崩溃无空白
2. **数据接线正确性**: TodayScreen 显示真实推荐+天气数据，非硬编码
3. **漏斗可视化准确性**: 6 层数据与后端 breakdown 一致
4. **视觉一致性**: 零硬编码颜色，三态统一覆盖
5. **编译零错误**: tsc --noEmit 后端+移动端均零错误
6. **Demo 稳定性**: 自由交互+预缓存+降级，不崩溃
7. **包容性展示**: 不同 Profile 获得不同推荐结果
8. **Phase 4 验证通过**: 5 项人工验证 + 2 项 Warning 修复

---

_Phase: 05-e2e-integration-competition-demo_
_Research completed: 2026-04-25_
