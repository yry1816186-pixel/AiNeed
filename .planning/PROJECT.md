# AiNeed - 智能私人形象定制与服装设计助手平台

## What This Is

AiNeed 是一个 AI 驱动的移动端平台，为用户提供智能私人形象定制和服装设计服务。通过虚拟试衣、AI 造型师、个性化推荐和社区功能，让 AI 成为用户的专属形象顾问。后端 NestJS + React Native 移动端 + Python ML 服务的 pnpm monorepo 架构，已具备 35 个后端模块和 28 个移动端页面。

## Core Value

基于用户个人画像（体型、肤色、风格偏好、场合需求）的精准穿搭推荐——让每个用户获得真正适合自己的私人定制形象方案。AI 换装效果图只是呈现手段，核心壁垒在于推荐算法和用户理解的深度。

## Requirements

### Validated

<!-- 已有代码实现的能力 -->

- ✓ 用户认证系统（注册/登录/JWT/密码重置） — existing
- ✓ 用户画像管理（体型/肤色/脸型） — existing
- ✓ 服装数据模型与浏览 — existing
- ✓ 28 个移动端页面框架 — existing
- ✓ 35 个后端 API 模块 — existing
- ✓ PostgreSQL 数据库 + Prisma ORM — existing
- ✓ Redis 缓存 + BullMQ 队列 — existing
- ✓ Docker Compose 基础设施 — existing
- ✓ Prometheus + Grafana 监控 — existing
- ✓ K8s 部署清单 — existing
- ✓ MinIO 对象存储 — existing
- ✓ WebSocket 实时通信 — existing

### Active

<!-- 当前需要推进的目标 -->

- [ ] 核心 AI 功能完整跑通（虚拟试衣、AI 造型师、推荐引擎）
- [ ] ML 服务与后端真正集成（文生图/图生图多模态策略）
- [ ] 商业闭环完整（支付、订单、订阅、商家后台全流程可用）
- [ ] 移动端用户体验达到上线标准（UI/UX 打磨、性能优化、稳定性）
- [ ] 工程质量达到商业级（测试覆盖、CI/CD、文档、运维自动化）
- [ ] AI 安全与内容审核机制完善
- [ ] 社区功能完整可用

### Out of Scope

- Web 端应用 — 移动端优先，Web 后期考虑
- 国际化多语言 — v1 先中文
- iOS App Store 上架 — 先确保 Android 可用
- 自建 ML 训练集群 — 使用现成模型和 API

## Context

- **架构决策**: 采用 pnpm monorepo（backend + mobile + shared packages）
- **ML 策略**: 调用多模态大模型（文生图/图生图）实现换装效果，非传统专用换装模型（CatVTON/IDM-VTON）。换装只是最后"画图"，核心难点在于精准推荐和尺码匹配
- **核心壁垒**: 基于用户画像的 AI 穿搭推荐算法——怎么给用户搭出真正满意的、合身的搭配
- **AI 集成**: GLM API（智谱）多模态能力，文生图/图生图接口
- **代码状态**: 框架搭建完整，大部分模块已有骨架代码，需要填充真实业务逻辑和 AI 集成
- **用户环境**: RTX 4060 8GB GPU，可本地运行部分 ML 推理
- **多会话策略**: 用户使用 Claude Code + Trae (GLM5.1) 多开并行工作，通过时间间隔协调
- **已有 Code RAG**: Qdrant 向量检索实现代码语义搜索，供云端 AI 理解项目

## Constraints

- **GPU**: RTX 4060 8GB VRAM — ML 模型选择受限于显存
- **Tech Stack**: 已锁定 NestJS + React Native + Python，不更换框架
- **数据库**: PostgreSQL 16 + Redis 7，不更换存储方案
- **Package Manager**: pnpm workspace，不更换
- **API 版本**: 当前 v1，URI versioning

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| pnpm monorepo | 统一管理后端、移动端、共享包 | ✓ Good |
| NestJS 模块化架构 | 35 模块隔离，可独立开发和测试 | ✓ Good |
| 文生图/图生图多模态策略 | 调用GLM等多模态API生成换装图，降本增效，不需要专用换装模型 | — Pending |
| Zustand + TanStack Query | 服务端状态和 UI 状态分离 | ✓ Good |
| GLM API 多模态 | 文生图/图生图接口，用户画像+穿搭描述→换装效果图 | — Pending |
| 多会话并行（Claude Code + Trae） | 加速开发，减少 token 消耗 | — Pending |

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
*Last updated: 2026-04-13 after initialization*
