# Phase 23: 每周穿搭推荐算法增强 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-29
**Phase:** 23-每周穿搭推荐算法增强
**Areas discussed:** D1 架构选择, D2 API 结构, D3 反馈机制, D4 Regenerate 策略, D5 衣橱复用率

---

## D1 — 推荐引擎架构

| Option                      | Description                                                           | Selected |
| --------------------------- | --------------------------------------------------------------------- | -------- |
| 方案 A：纯规则引擎          | DecisionEngineService + CalendarPlanService 增强，纯 NestJS，最短路径 |          |
| 方案 B：纯 FullOutfitEngine | Python 做核心搭配，NestJS 调 FastAPI                                  |          |
| 方案 C：粗排+精排           | CalendarPlanService 粗排 → FullOutfitEngine 精排                      | ✓        |

**User's choice:** 方案 C 粗排+精排
**Notes:** 最优质量路径。粗排快速筛选候选，精排用 6 维评分提升质量。需处理 FullOutfitEngine 不可用时的降级回退。

---

## D2 — API 响应结构

| Option                    | Description                                                                      | Selected |
| ------------------------- | -------------------------------------------------------------------------------- | -------- |
| 4 字段全加 + 细粒度 score | score_breakdown 6 维细分 + alternatives top 2 + wardrobe_reuse_rate + risk_notes | ✓        |
| 精简：核心 2 字段         | 只加 score_breakdown + alternatives                                              |          |
| 全加 + 粗粒度 score       | 4 字段全加但 score 只返回总分                                                    |          |

**User's choice:** 4 字段全加 + 细粒度 score
**Notes:** 前端可展示 6 维雷达图或进度条，提升推荐透明度。

---

## D3 — 反馈回流机制

### 反馈模型

| Option                  | Description                                                  | Selected |
| ----------------------- | ------------------------------------------------------------ | -------- |
| 新建 WeeklyPlanFeedback | 关联 OutfitPlan，丰富反馈类型枚举，不影响现有 LearningToRank | ✓        |
| 复用 RankingFeedback    | 扩展 action 枚举，最小化 schema 变更                         |          |

**User's choice:** 新建 WeeklyPlanFeedback

### 反馈影响方式

| Option                | Description                                       | Selected |
| --------------------- | ------------------------------------------------- | -------- |
| 维度独立衰减 + 硬排除 | 各负面反馈影响对应维度权重，dont_want_this 硬排除 | ✓        |
| 统一衰减 + 无硬排除   | 所有负面反馈统一降低总分                          |          |
| 全部硬排除            | 任何负面反馈立即排除                              |          |

**User's choice:** 维度独立衰减 + 硬排除
**Notes:** too_hot/too_cold→ 天气权重，too_formal/too_casual→ 场合权重，wrong_style→ 风格权重，too_expensive→ 预算权重。dont_want_this 触发硬排除。

---

## D4 — Regenerate 策略

### regenerate_day

| Option                  | Description                                 | Selected |
| ----------------------- | ------------------------------------------- | -------- |
| 重调引擎 + lock/exclude | 每次重新调粗排+精排，考虑 lock/exclude 约束 | ✓        |
| 候选池重排              | 预生成候选池，regenerate 时重排             |          |

**User's choice:** 重调引擎 + lock/exclude

### regenerate_week

| Option                | Description                    | Selected |
| --------------------- | ------------------------------ | -------- |
| 整体重生成 + 保留锁定 | 整体重新生成，保留 isLocked 天 | ✓        |
| 逐天独立 regenerate   | 每天独立重新生成               |          |

**User's choice:** 整体重生成 + 保留锁定

---

## D5 — 衣橱复用率

| Option                    | Description                         | Selected |
| ------------------------- | ----------------------------------- | -------- |
| 复用率 + reuse_boost 参数 | 计算展示 + reuse_boost 影响粗排排序 | ✓        |
| 纯展示，不影响排序        | 只计算和展示                        |          |
| 复用率硬约束              | 低于阈值不推荐                      |          |

**User's choice:** 复用率 + reuse_boost 参数
**Notes:** 粗排阶段：最终分 = 原始分 _ (1 + reuse_boost _ wardrobe_reuse_rate)，reuse_boost 默认 0.3。

---

## Agent's Discretion

- FullOutfitEngine HTTP 超时（建议 5s）
- 衰减半衰期（建议 30 天）
- reuse_boost 默认值（建议 0.3）
- alternatives 数量（建议 top 2）
- risk_notes 规则和阈值

## Deferred Ideas

- 星座/运势推荐：如未来需要，需独立 feature flag + 娱乐标注 + 权重 0 + 可关闭
- SASRec 协同过滤：待用户量 >1000 评估
- 候选池预生成：减少延迟但增加复杂度
- A/B 实验框架：reuse_boost 参数调优
