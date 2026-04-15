# 寻裳 (XunO) — 代码规整项目

## What This Is

寻裳是 AI 驱动的私人形象定制平台（用户画像 → AI 造型师 → 虚拟试衣 → 电商购买），经过多次迭代后代码库积累了大量技术债。本项目旨在**保留现有业务代码**的前提下，对全栈进行系统性规整：统一设计系统、重新划分后端模块、清理工程基础设施、提升代码质量。

## Core Value

让寻裳代码库回到健康、可维护、可扩展的状态——每一次修改都有信心，每一个模块都有清晰的边界。

## Requirements

### Validated

- ✓ 用户认证（邮箱/微信/短信） — existing
- ✓ AI 造型师对话 — existing
- ✓ 虚拟试衣（GLM API） — existing
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

### Active

- [ ] 统一移动端设计系统（保留 Theme Tokens，去掉 Tailwind/Paper 混用）
- [ ] 重新划分后端模块边界（按业务域重新组织 35+ 模块）
- [ ] 清理根目录杂乱文件（ESLint 输出、截图、临时文件等）
- [ ] 统一命名规范（文件名、模块名、API 端点）
- [ ] 消灭 TypeScript `any` 类型（后端 ~226 处，移动端 ~105 处）
- [ ] 提升测试覆盖率（后端 15% → 50%+，移动端 5% → 30%+）
- [ ] 规整移动端页面组织（50+ 页面重新分类）
- [ ] 清理 Python AI 服务代码
- [ ] 修复已知 TypeScript 错误（imagePicker.ts, user-key.service.ts）
- [ ] 解决 N+1 查询问题
- [ ] 统一 polyfill 模式
- [ ] 清理未使用模块（demo, code-rag）

### Out of Scope

- 新功能开发 — 本次只规整，不新增业务功能
- 数据库 Schema 重设计 — 保留现有数据模型
- 替换核心技术栈 — 不更换 NestJS/RN/Prisma 等
- HarmonyOS 应用 — 不在本次规整范围
- 升级锁定的 RN 依赖 — react-native-screens/reanimated/svg 暂不升级

## Context

寻裳是一个 pnpm monorepo 项目，包含：
- **后端** (NestJS 11): 35+ 业务模块，Prisma ORM，PostgreSQL/Redis/Neo4j/Qdrant
- **移动端** (React Native 0.76.8): 50+ 页面，Zustand + TanStack Query，4 种样式方案混用
- **AI 服务** (Python FastAPI): GLM API 集成，造型师/试衣/分析
- **管理后台** (React + Vite): 最小化实现

项目经历了 8 个主要开发阶段（用户画像、AI 造型师、虚拟试衣、推荐引擎、电商闭环、社区博主、定制品牌、私人顾问），每次迭代都在已有基础上叠加，导致：
1. 模块边界模糊，职责重叠
2. 代码质量下降（any 泛滥、测试缺失）
3. 样式方案不统一（Paper + Tailwind + Tokens + 内联）
4. 工程规范缺失（根目录杂乱、命名不一致）

## Constraints

- **Tech Stack**: 保留 NestJS 11 + React Native 0.76.8 + Prisma 5 + Python FastAPI
- **Locked Deps**: react-native-screens 4.4.0, reanimated 3.16.7, svg 15.8.0 不可升级
- **No Downtime**: 规整过程不能破坏现有功能
- **Node.js**: v24 (当前), 需兼容 v20+
- **Priority Order**: 样式统一 > 工程规范 > 代码质量

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 保留现有 Theme Tokens 方案 | 已有完整的颜色/间距/字体 token 体系，比重建成本低 | — Pending |
| 去掉 Tailwind/NativeWind 混用 | 与 Paper 和 Theme Tokens 三重混用导致样式不一致 | — Pending |
| 重新划分后端模块 | 35+ 模块按业务域重新组织，合并/拆分/废弃 | — Pending |
| 规整优先级：样式 > 工程 > 质量 | 用户可见的体验问题最紧迫，工程规范是基础，质量是长期目标 | — Pending |

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
*Last updated: 2026-04-16 after initialization*
