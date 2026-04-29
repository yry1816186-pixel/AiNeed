# Phase 23: 每周穿搭推荐算法增强 - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning

<domain>
## Phase Boundary

将每周穿搭推荐从基础 CRUD 升级为多维度可解释推荐系统。具体交付：

1. **两阶段推荐流水线**：粗排（NestJS CalendarPlanService）→ 精排（Python FullOutfitEngine）
2. **增强 API 响应**：score_breakdown（6 维细分）+ alternatives（top 2 备选）+ wardrobe_reuse_rate + risk_notes
3. **反馈回流机制**：新建 WeeklyPlanFeedback，维度独立衰减 + 硬排除
4. **Regenerate 策略**：单天重调引擎（lock/exclude）、全周整体重生成（保留锁定天）
5. **衣橱复用率**：计算展示 + reuse_boost 参数影响排序

**所有输入因子必须有已存在的代码/数据支撑。**

**明确排除**：

- 星座/星座运势（零实现，不在本 phase）
- SASRec 协同过滤（有代码无训练权重，冷启动严重）
- 如未来需星座：独立 feature flag + UI 标注娱乐性质 + 推荐权重 0 + 用户可关闭

**反欺诈约束**：

- 推荐结果必须可解释"为什么推荐这套"（score_breakdown 或 explanation 字段）
- 如果推荐基于规则匹配而非机器学习，UI 不得暗示"AI 深度学习"
- 推荐准确度描述为"基于规则+用户画像的智能推荐，非个性化机器学习模型"

</domain>

<decisions>
## Implementation Decisions

### D1 — 推荐引擎架构

- **D-01:** 方案 C — 两阶段流水线：CalendarPlanService 做粗排（快速筛选候选 outfit）→ FullOutfitEngine 做精排（6 维评分 + 色彩理论 + 风格兼容矩阵）
- **D-02:** 粗排阶段使用现有 CalendarPlanService 评分逻辑增强：增加 reuse_boost 参数、用户反馈维度权重调整
- **D-03:** 精排阶段调用 FullOutfitEngine via HTTP（NestJS → FastAPI），需超时和降级处理（FullOutfitEngine 不可用时回退到粗排结果）
- **D-04:** 精排评分维度：色彩协调 25% + 风格一致性 25% + 体型适配 20% + 天气 15% + 场合 10% + 预算 5%（与 FullOutfitEngine 现有权重一致）

### D2 — API 响应结构

- **D-05:** DayPlanResponseDto 增加 4 个字段：
  - `score_breakdown: { total, color: number, style: number, bodyFit: number, weather: number, occasion: number, budget: number }`
  - `alternatives: AlternativeOutfitDto[]`（top 2 备选，含 id/name/coverImage/totalScore）
  - `wardrobe_reuse_rate: number`（0-1，已有衣物数/总搭配单品数）
  - `risk_notes: string[]`（风险提示：天气变化/重复穿搭/场景不匹配等）
- **D-06:** score_breakdown 细粒度到每个维度（6 维），前端可展示雷达图或进度条
- **D-07:** DTO 变更需同步更新 `calendar-plan.dto.ts`，保持向后兼容（新字段 optional with defaults）

### D3 — 反馈回流机制

- **D-08:** 新建 `WeeklyPlanFeedback` 模型（不复用 RankingFeedback），关联 OutfitPlan
- **D-09:** 反馈类型枚举：`like | dislike | too_formal | too_casual | too_expensive | too_hot | too_cold | wrong_style | dont_want_this`
- **D-10:** 维度独立衰减：各负面反馈影响对应维度权重
  - `too_hot` / `too_cold` → 影响天气维度权重
  - `too_formal` / `too_casual` → 影响场合维度权重
  - `wrong_style` → 影响风格维度权重
  - `too_expensive` → 影响预算维度权重
- **D-11:** 硬排除仅用于 `dont_want_this`（该 outfit 加入用户排除列表，下次推荐不再出现）
- **D-12:** 衰减机制：反馈权重随时间递减（建议 30 天半衰期），避免一次反馈永久影响

### D4 — Regenerate 策略

- **D-13:** `regenerate_day`：重新调用搭配引擎（粗排+精排），考虑 lock_item 和 exclude_item 约束
- **D-14:** `regenerate_week`：整体重新生成，保留用户锁定天（isLocked=true），其余全部重新推荐
- **D-15:** `lock_item`：用户锁定的单品在重新生成时强制保留在该天的搭配中
- **D-16:** `exclude_item`：用户排除的单品加入黑名单，粗排阶段即过滤
- **D-17:** 需要 OutfitPlan 模型增加字段：`isLocked Boolean @default(false)`，`excludedItemIds Json?`

### D5 — 衣橱复用率

- **D-18:** `wardrobe_reuse_rate = 推荐搭配中使用用户已有衣橱衣物的单品数 / 总搭配单品数`
- **D-19:** 增加 `reuse_boost` 参数（默认 0.3），在粗排阶段给高复用率的搭配加分
- **D-20:** 复用率同时展示在前端 DayPlan 卡片上，让用户感知推荐在用已有衣物

### Agent's Discretion

- FullOutfitEngine HTTP 调用的超时时间（建议 5s）
- 衰减半衰期具体值（建议 30 天）
- reuse_boost 默认值（建议 0.3）
- alternatives 数量（建议 top 2）
- risk_notes 的具体规则和阈值

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 推荐引擎核心

- `apps/backend/src/domains/ai-core/ai-stylist/services/calendar-plan.service.ts` — 现有每周 plan 生成逻辑（粗排基础）
- `apps/backend/src/domains/ai-core/ai-stylist/decision-engine.service.ts` — 体型 → 版型映射 + 风格偏好学习 + LLM 推理
- `apps/backend/src/domains/ai-core/ai-stylist/decision-strategy.service.ts` — 策略逻辑提取
- `apps/backend/src/domains/ai-core/ai-stylist/decision-score.service.ts` — 评分服务
- `ml/services/stylist/full_outfit_engine.py` — FullOutfitEngine（精排）：色彩协调 + 14×14 风格矩阵 + 体型适配 + 6 维评分

### API 层

- `apps/backend/src/domains/ai-core/ai-stylist/calendar-plan.controller.ts` — REST 端点
- `apps/backend/src/domains/ai-core/ai-stylist/dto/calendar-plan.dto.ts` — DTO 定义

### 数据模型

- `apps/backend/prisma/schema.prisma` §OutfitPlan (line ~1808) — 现有模型
- `apps/backend/prisma/schema.prisma` §UserProfile (line ~198) — bodyType/skinTone/colorSeason/stylePreferences/priceRange
- `apps/backend/prisma/schema.prisma` §RankingFeedback (line ~257) — 现有反馈模型（参考但不复用）

### 服务依赖

- `apps/backend/src/domains/fashion/weather/weather.service.ts` — 天气服务 + fallback
- `apps/backend/src/domains/fashion/wardrobe/wardrobe.service.ts` — 衣橱 CRUD
- `apps/backend/src/domains/ai-core/ai-stylist/services/recommendation.service.ts` — 推荐编排

### 移动端

- `apps/mobile/src/services/api/calendar-plan.api.ts` — 移动端 API 层

### 反欺诈

- `.planning/ROADMAP.md` §Phase 20 — 反欺诈约束定义
- `.planning/ROADMAP.md` §Phase 21 — Week tab 反欺诈约束

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `CalendarPlanService.selectOutfitForDay()` — 已有评分逻辑（季节 30+温度 20+场景 25+多样性 15+穿着惩罚-50），可直接增强为粗排
- `FullOutfitEngine._score_outfit()` — 6 维评分（色彩 25+风格 25+体型 20+天气 15+场合 10+预算 5%），精排直接复用
- `FullOutfitEngine._check_color_harmony()` — 色彩协调检测（单色/类比/互补/三角/分裂互补）
- `FullOutfitEngine._STYLE_COMPATIBILITY` — 14×14 风格兼容矩阵
- `FullOutfitEngine._BODY_TYPE_RECOMMENDATIONS` — 5 种体型 → 版型推荐映射
- `DecisionEngineService.getUserProfile()` — 聚合 UserProfile + StyleProfile + UserBehaviorEvent + UserPreferenceWeight
- `WeatherService.get7DayForecast()` — 7 天天气预报 + fallback provider 标注

### Established Patterns

- 两进程通信：NestJS 通过 HTTP 调用 FastAPI（已有模式，如 AI 对话服务）
- Prisma schema 变更：使用 migration，保持向后兼容
- DTO 模式：请求/响应 DTO 分离，使用 class-validator
- 反馈持久化：RankingFeedback 使用 Decimal(5,4) 权重 + 复合索引

### Integration Points

- `CalendarPlanController` — API 端点入口，需增加 regenerate_day/regenerate_week 端点
- `CalendarPlanService.generateWeeklyPlan()` — 核心编排，需重构为粗排+精排流水线
- `OutfitPlan` Prisma 模型 — 需增加 isLocked/excludedItemIds/scoreBreakup 字段
- 移动端 `calendar-plan.api.ts` — 需同步更新调用层

</code_context>

<specifics>
## Specific Ideas

- 精排调用 FullOutfitEngine 时，需传入用户 UserProfile 全量数据（bodyType/colorSeason/stylePreferences/priceRange）+ 当天天气 + 场景标签
- risk_notes 应包含：天气突变警告（相邻 2 天温差 >10°C）、穿搭重复警告（已有 repeatWarning 基础）、场景不匹配提示（如周末推荐面试装）
- alternatives 应保留 FullOutfitEngine 精排的 top 3 中除首选外的 top 2
- reuse_boost 在粗排阶段计算：最终粗排分 = 原始分 _ (1 + reuse_boost _ wardrobe_reuse_rate)

</specifics>

<deferred>
## Deferred Ideas

- 星座/运势推荐：代码库零实现。如未来需要，必须满足：独立 feature flag、UI 标注娱乐性质、推荐权重为 0、用户可关闭
- SASRec 协同过滤：有代码但无训练权重，冷启动严重。待用户量 >1000 后重新评估
- 候选池预生成：每天预生成 5 套备选存储，regenerate 时从候选池重排（减少延迟，但增加存储和复杂度）
- A/B 实验框架：reuse_boost 参数和评分权重可通过 A/B 实验调优（依赖现有 RecommendationBatch/RecommendationImpression 表）

### Reviewed Todos

None — no pending todos matched this phase.

</deferred>

---

_Phase: 23-mei-zhou-chuan-da-tui-jian-suan-fa-zeng-qiang_
_Context gathered: 2026-04-29_
