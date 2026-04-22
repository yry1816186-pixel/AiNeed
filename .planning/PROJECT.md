# 寻裳 (XUNO) — AI 穿搭决策平台

## What This Is

寻裳是面向全年龄段、跨性别、满足适龄与合规要求的 AI 穿搭决策平台。平台只围绕三个核心问题组织一切能力：**我今天穿什么**（场景化穿搭方案）、**这件衣服适不适合我**（候选单品适配判断）、**我值不值得买它**（购买决策辅助）。

这是一个已完成代码规整（设计系统统一、后端域划分、移动端重组、AI 服务清理）的 pnpm monorepo 项目，现进入产品重构阶段：将现有功能收束成一条清晰、可信、可复用、可变现的 AI 穿搭决策闭环。

## Core Value

用户在 Today Tab 1-2 步内获得当天穿搭决策——每个建议有清晰理由和下一步动作，底层不分性别，全人群覆盖。

## Requirements

### Validated

<!-- 代码规整里程碑已完成的工作，作为新阶段的基础设施 -->

- ✓ 用户认证（邮箱/微信/短信） — existing
- ✓ AI 造型师对话 — existing
- ✓ 虚拟试衣（GLM API，无性别设计） — existing
- ✓ 服装目录与推荐 — existing
- ✓ 用户画像与体型分析 — existing
- ✓ 风格测试 — existing
- ✓ 购物车与订单 — existing
- ✓ 支付（支付宝/微信） — existing
- ✓ 社区动态 — existing
- ✓ 博主系统 — existing
- ✓ 私人顾问 — existing
- ✓ 定制设计 — existing
- ✓ VIP 订阅 — existing
- ✓ 通知系统 — existing
- ✓ 管理后台 — existing
- ✓ 后端 6 域 + 1 平台层架构 — Phase 3-4 完成
- ✓ 移动端 feature-based 架构 — Phase 5 完成
- ✓ AI 服务按能力域重组 — Phase 6 完成
- ✓ 设计系统统一（Theme Tokens） — Phase 2 完成
- ✓ ESLint no-explicit-any: error — Phase 7 完成
- ✓ 后端测试覆盖率 50%+ — Phase 7 完成

### Active

<!-- 融合计划 §14 48小时执行计划 -->

- [ ] 消灭移动端 137 个 TypeScript 编译错误
- [ ] 接通推荐管道（Orchestrator 唯一入口 + StyleQuiz 回流 + 冷启动重构）
- [ ] 性别字段降级（gender→ 可选 + BodyMetrics 去性别化 + Profile 权重重算）
- [ ] 4 Tab 导航重构（今日/探索/造型师/我的）
- [ ] Today Screen（场景卡 + 今日方案 + 降级方案）
- [ ] Discover Screen（冷启动推荐 + 衣橱管理混合体）
- [ ] AI 造型师单屏体验（合并对话 + 试衣为决策流）
- [ ] 新 Onboarding 4 步流程（场景 → 画像 → 风格 → 可选照片，无 gender）
- [ ] 试衣嵌入决策流（从独立 Tab 降为决策动作）
- [ ] 商品数据种子（100+ Mock 商品）
- [ ] 时尚规则修复（above_30 场合差异化 + full_outfit_engine JSON 动态加载）

<!-- 融合计划 §14.9 长期路线图 -->

- [ ] 产品契约冻结（4 Tab 定义 + 6 层画像模型 + 商品属性 taxonomy）
- [ ] 合规前置（未成年人保护 + PIPL 敏感信息 + 电商资质 + 内容版权）
- [ ] BLOCKER 安全修复（TLS + 端口 + API 密钥）
- [ ] 统一推荐引擎入口（规则引擎 → 向量检索 → 生成解释三层管道）
- [ ] FashionCLIP 向量检索接入
- [ ] SASRec 序列推荐接入
- [ ] 六层漏斗推荐管道（L1 合规 →L2 场景 →L3 尺码 →L4 预算 →L5 风格 →L6 衣橱互补）
- [ ] 体型计算去性别化（BodyMetrics 连续函数 + ColdStart 体型+风格驱动）
- [ ] 商品数据同步（淘宝客 + 京东联盟）
- [ ] RecommendationBatch + Impression 归因
- [ ] 会员三层模型（免费层 + 内容产物付费 + 体验升级+电商佣金）
- [ ] 社区灵感层嵌入（Today 底部 + 商品详情 + 方案详情）
- [ ] 分享种子功能（穿搭方案分享图 + 试衣效果图 + 会员报告分享图）
- [ ] 端侧推理架构（MediaPipe + CIELAB + 规则引擎 + SASRec ONNX）
- [ ] Nginx + TLS + 监控告警生产部署

### Out of Scope

- Feature Flag 体系 — 一次性重构，不需要并存机制
- Deep Link 路由迁移 — Demo 不需要推送通知，上线前处理
- 未成年人合规法务流程 — 非代码问题，上线前处理
- PIPL 合规法务流程 — 同上
- 电商 API 真实对接 — Mock 数据足够 Demo，上线前处理
- SASRec ONNX 导出 — 服务端推理够用，用户量 >1000 时再做
- 协同过滤 / 知识图谱 — 伪实现直接砍掉
- 社区 Tab — 降为灵感层，日活 5 万+ 时启动
- 端侧推理迁移 — 服务端够用，成本压力时再做
- PDF 报告生成 — 会员上线时做
- 银发用户规则 — 市场有限，用户反馈驱动
- 微服务拆分 — 不提前拆

## Context

**项目经历了两轮大型迭代**：

1. **业务迭代**（8 个开发阶段）：用户画像 → AI 造型师 → 虚拟试衣 → 推荐引擎 → 电商闭环 → 社区博主 → 定制品牌 → 私人顾问
2. **代码规整**（GSD v1 里程碑，68% 完成）：设计系统统一 → 后端域划分 → 移动端重组 → AI 服务清理 → 代码质量提升

**当前状态基线**：

- 后端 (apps/backend): 0 个 TS 错误
- 移动端 (apps/mobile): 137 个 TS 错误（集中在 ~20 个文件）
- ML 服务 (ml/): Python，独立运行

**技术栈**：pnpm monorepo + NestJS 11 + React Native 0.76.8 + Prisma 5 + Python FastAPI + PostgreSQL/Redis/Qdrant

**关键架构决策**：

- 属性优先：用户建模围绕场景、体型、尺码、风格、预算、气候展开，性别仅为可选辅助信号
- 决策优先：首页是决策入口，不是功能目录
- 闭环优先：推荐 → 试穿 → 购买 → 反馈必须形成闭环
- 试衣是无性别的：输入 photo + item，不读用户性别

## Constraints

- **Timeline**: 48 小时极限开发（5 个 Phase），后续长期路线图 13-19 周
- **Tech Stack**: NestJS 11 + React Native 0.76.8 + Prisma 5 + Python FastAPI
- **Locked Deps**: react-native-screens 4.4.0, reanimated 3.16.7, svg 15.8.0 不可升级
- **Node.js**: v24 (当前), 需兼容 v20+
- **Execution**: 3 个 Agent 并行，绝不串行等待；每个 Agent 只负责独立目录
- **Priority**: 能改就不新建，能跑就不重构；先通后美，先连后优
- **AI Cost**: RTX 4060 本地推理 + 云端 API 按量付费，1000 DAU 约 350 元/月
- **Safety**: 数据库迁移、支付逻辑、用户数据、生产环境必须串行+人工确认

## Key Decisions

| Decision                                  | Rationale                                                          | Outcome   |
| ----------------------------------------- | ------------------------------------------------------------------ | --------- |
| gender 降为 L6 可选字段                   | garmentPreference 比性别更有预测力，styleExpression 更接近真实决策 | — Pending |
| 4 Tab 导航（今日/探索/造型师/我的）       | 决策入口优先，功能目录降级                                         | — Pending |
| 虚拟试衣从独立 Tab 降为决策动作           | 试衣服务判断而非展示，嵌入 Stylist 对话流                          | — Pending |
| 社区不设 Tab                              | v1 社区作为灵感证据层嵌入 Today/商品详情                           | — Pending |
| 推荐系统简化为 3 层（规则 → 检索 → 解释） | 协同过滤和知识图谱为伪实现，砍掉降低复杂度                         | — Pending |
| 得物 API 移除，专注淘宝客+京东联盟        | 得物 API 为虚构，真实 API 需企业资质                               | — Pending |
| 会员三层混合模型                          | 内容产物付费比体验升级更可感知                                     | — Pending |
| 48 小时先 Demo 后优化                     | 先通后美，先连后优                                                 | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):

1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):

1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

_Last updated: 2026-04-22 after initialization from XUNO_FUSION_PLAN.md_
