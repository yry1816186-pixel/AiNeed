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

- [ ] 基础设施基线（CI/CD、测试框架、错误追踪、日志策略）
- [ ] 用户画像精准化（风格测试问卷、体型分析、色彩偏好）
- [ ] AI 造型师对话功能完整可用（多轮对话、穿搭推荐、天气集成）
- [ ] 虚拟试衣功能跑通（Doubao-Seedream + GLM 图生图双 API 链路）
- [ ] 电商基础闭环（商品浏览、购物车、支付、订单、退款）
- [ ] App 上架合规与推送通知
- [ ] 移动端 UX 达到上线标准
- [ ] 工程质量达标（测试覆盖率 50%+、CI/CD 自动化）

### Out of Scope

| Feature | Reason |
|---------|--------|
| Web 端应用 | 移动端优先，Web 后期考虑 |
| 国际化多语言 | v1 先中文 |
| 本地 ML 推理（CatVTON/SASRec/DensePose） | 已决定用 GLM API 替代 |
| K8s 部署 | Docker Compose 足够 MVP |
| Prometheus+Grafana 完整监控 | v2 功能 |
| Qdrant 向量数据库 | v2 功能，MVP 不需要 |
| 联邦学习/数字孪生/边缘认知 | 过度工程化，不需要 |
| V3 版本 | 已删除，统一维护主项目 |
| AI 图片输入（上传衣服问怎么搭） | Phase 2.1 后续补充 |
| 语音输入 | Phase 2.1 后续补充 |
| 协同过滤推荐 | 等用户数据积累 |
| 3D 虚拟试衣 | v3 探索 |
| 商家独立 Web 管理后台 | v3 |
| FashionCLIP 向量检索图片搜索 | v3 升级 |
| 复杂促销体系（满减/秒杀/组合优惠） | v3 |
| 完整监控 (Prometheus/Grafana) | v3 |
| 完整测试覆盖 (80%+) | v3 |
| 退款完整流程（争议仲裁） | v3 完善 |

## Context

- **架构决策**: pnpm monorepo（backend + mobile + shared packages + ml）
- **ML 策略**: 调用 GLM（智谱 AI）多模态 API 实现换装和推荐，不使用本地推理
- **核心壁垒**: 基于用户画像的 AI 穿搭推荐算法
- **AI 集成**: GLM API 多模态能力，文生图/图生图接口
- **代码状态**: 框架搭建完整，大部分模块已有骨架代码，GLM API 封装已实现
- **用户环境**: Windows 11, Node v24, PNPM
- **多会话策略**: 用户使用 Claude Code + Trae 多开并行工作
- **Phase 扩展**: 8 Phase → 11 Phase，新增 Phase 0（基础设施）、Phase 5.5（上架&推送）、Phase 9（运营&性能）
- **需求扩展**: 92 条 → 130 条，补齐现有 Phase 遗漏需求
- **推送通知**: 从 v2 提升到 MVP Phase 5.5，用户留存关键
- **退款流程**: 从 v3 提升到 MVP Phase 5，电商基本信任要求

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
| CI/CD GitHub Actions | 免费，与 GitHub 深度集成 | Active |
| Sentry 错误追踪 | 行业标准，多平台支持 | Active |
| 推送通知提升到 MVP | 用户留存关键，不能等到 v2 | Active |
| 退款流程加入 MVP | 电商无退款不可接受 | Active |
| prisma migrate 替代 db push | 生产级 Schema 管理 | Active |

## Evolution

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-04-14 after phase expansion (8→11)*
