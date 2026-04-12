# AiNeed - AI 私人形象定制平台

## What This Is

AiNeed 是一个 AI 驱动的移动端平台，为用户提供智能私人形象定制服务。核心流程：用户建立个人画像 -> AI 造型师精准推荐穿搭 -> 多模态 API 生成换装效果图 -> 电商购买闭环。

技术架构：NestJS 后端 + React Native 移动端 + Python AI 服务层，pnpm monorepo。

## Core Value

**基于用户画像（体型/肤色/风格偏好/场合需求）的精准穿搭推荐。** AI 换装效果图是呈现手段，核心壁垒在于推荐算法和用户理解的深度。

## Requirements

### Validated

<!-- 已有代码实现的能力 -->

- [x] 用户认证系统（注册/登录/JWT/密码重置） — apps/backend/src/modules/auth
- [x] 用户画像管理（体型/肤色/脸型） — apps/backend/src/modules/user-profile
- [x] 服装数据模型与浏览 — apps/backend/src/modules/clothing
- [x] 移动端导航框架（6-tab） — apps/mobile/src/App.tsx
- [x] 后端 API 模块（35个） — apps/backend/src/modules/
- [x] PostgreSQL + Prisma ORM — apps/backend/prisma/schema.prisma
- [x] Redis 缓存 + BullMQ 队列 — apps/backend/src/modules/queue
- [x] MinIO 对象存储 — apps/backend/src/modules/storage
- [x] WebSocket 实时通信 — apps/backend/src/modules/ws
- [x] Docker Compose 开发环境 — docker-compose.dev.yml
- [x] GLM API 调用封装 — ml/services/ (intelligent_stylist, visual_outfit, body_analyzer)

### Active

<!-- 当前需要推进的目标 -->

- [ ] 用户画像精准化（风格测试问卷、体型分析、色彩偏好）
- [ ] AI 造型师对话功能完整可用（多轮对话、穿搭推荐、天气集成）
- [ ] 虚拟试衣功能跑通（GLM 文生图/图生图 API 调用链路）
- [ ] 电商基础闭环（商品浏览、购物车、支付、订单）
- [ ] 移动端 UX 达到上线标准
- [ ] 工程质量达标（测试、CI/CD）

### Out of Scope

| Feature | Reason |
|---------|--------|
| Web 端应用 | 移动端优先，Web 后期考虑 |
| 国际化多语言 | v1 先中文 |
| 本地 ML 推理（CatVTON/SASRec/DensePose） | 已决定用 GLM API 替代 |
| 社区功能 | v2 功能 |
| 通知系统 | v2 功能 |
| K8s 部署 | Docker Compose 足够 MVP |
| Prometheus+Grafana 完整监控 | v2 功能 |
| Qdrant 向量数据库 | v2 功能，MVP 不需要 |
| 联邦学习/数字孪生/边缘认知 | 过度工程化，不需要 |
| V3 版本 | 已删除，统一维护主项目 |

## Context

- **架构决策**: pnpm monorepo（backend + mobile + shared packages + ml）
- **ML 策略**: 调用 GLM（智谱 AI）多模态 API 实现换装和推荐，不使用本地推理
- **核心壁垒**: 基于用户画像的 AI 穿搭推荐算法
- **AI 集成**: GLM API 多模态能力，文生图/图生图接口
- **代码状态**: 框架搭建完整，大部分模块已有骨架代码，GLM API 封装已实现
- **用户环境**: Windows 11, Node v24, PNPM
- **多会话策略**: 用户使用 Claude Code + Trae 多开并行工作

## Constraints

- **Tech Stack**: NestJS + React Native + Python，不更换框架
- **数据库**: PostgreSQL + Redis，不更换
- **Package Manager**: pnpm workspace
- **ML 策略**: GLM API 调用，不做本地推理
- **GPU**: 不依赖本地 GPU

## Key Decisions

| Decision | Rationale | Status |
|----------|-----------|--------|
| pnpm monorepo | 统一管理后端、移动端、共享包 | Good |
| NestJS 模块化架构 | 35 模块隔离，可独立开发和测试 | Good |
| GLM API 多模态 | 文生图/图生图接口，降本增效，不需要本地推理 | Active |
| Zustand + TanStack Query | 服务端状态和 UI 状态分离 | Good |
| React Native + Expo | 跨平台移动开发，一套代码 Android+iOS | Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-04-13 after project cleanup*
