# AiNeed V3

## What This Is

AiNeed 是一个 AI 私人造型师 App，面向全球市场（首发中国大陆）。核心功能包括 AI 造型师对话（GLM-5 Agent 模式）、文生图搭配可视化、Q 版个人形象、服装定制（EPROLO POD）、高端私人定制全流程、设计市集、用户衣橱管理、社区和电商导购。面向注重穿搭品质的年轻用户群体。

## Core Value

AI 理解用户意图 + 画像 + 衣橱 -> 生成完整搭配方案 -> 可视化展示 -> 定制生产 -> 社区分享。

## Requirements

### Validated

- [x] **TECH-01**: NestJS 后端骨架 + Prisma ORM + 26 个模块已实现 -- Phase 1-2
- [x] **TECH-02**: React Native + Expo 移动端骨架 + 40+ 页面已实现 -- Phase 1,4
- [x] **TECH-03**: TypeScript strict mode 零错误编译通过 -- Phase 1-5
- [x] **TECH-04**: Docker 开发/预发/生产环境配置完成 -- Phase 1
- [x] **TECH-05**: 803 个测试通过（63 个测试套件） -- Phase 2-5
- [x] **TECH-06**: CI/CD GitHub Actions 工作流配置完成 -- Phase 7
- [x] **AUTH-01**: 手机号+短信验证码认证系统 -- Phase 2
- [x] **CLOTH-01**: 服装目录 CRUD + 搜索 + 推荐 -- Phase 2
- [x] **AI-01**: AI 造型师对话（GLM-5 + DeepSeek 双 Provider） -- Phase 3
- [x] **AI-02**: 知识图谱（Neo4j）+ 推荐引擎 + 向量嵌入 -- Phase 3
- [x] **AVATAR-01**: Q 版形象管理（Skia 参数化）+ 模板系统 -- Phase 2.5
- [x] **CUSTOM-01**: 服装定制设计 + EPROLO POD Mock -- Phase 4.5
- [x] **COMMUNITY-01**: 社区帖子/评论/点赞/关注/私信/通知 -- Phase 5
- [x] **BESPOKE-01**: 高端定制全流程（工作室+订单+沟通+报价） -- Phase 5
- [x] **MARKET-01**: 设计市集（免费分享+AI 预审） -- Phase 5

### Active

- [ ] **QUAL-01**: 后端测试覆盖率达到 80%+
- [ ] **QUAL-02**: 5 个 0% 覆盖率模块完成测试（bespoke/orders, bespoke/studios, community, messaging, outfit-image）
- [ ] **QUAL-03**: 12 个低覆盖率模块提升到 80%+（common/filters, common/interceptors, health, body-analysis, social, embedding, custom-order, upload, knowledge, recommendation, common/decorators, common/logger）
- [ ] **QUAL-04**: 6 条 E2E 关键流程测试通过
- [ ] **QUAL-05**: 安全审计无高危漏洞（OWASP Top 10）
- [ ] **QUAL-06**: API P95 响应时间 < 500ms
- [ ] **DEPLOY-01**: docker-compose up -d 全部服务启动成功
- [ ] **DEPLOY-02**: 移动端 Expo 构建/导出成功
- [ ] **DEPLOY-03**: CI/CD 管线全绿色

### Out of Scope

- 真实 VTO 虚拟试衣 -- 延后到 v2.0（阿里云百炼 OutfitAnyone）
- 搭配兼容性 GNN 训练 -- 延后到 v2.0
- FashionCLIP LoRA 微调 -- 延后到 v2.0
- 淘宝/京东 CPS 电商导购对接 -- 延后到 v2.0
- iOS App Store 上架 -- 延后到 v2.0（先 Android）
- ICP 备案 -- 上线前再处理

## Context

AiNeed V3 是一个大型全栈项目，代码主要由 Trae GLM5.1 并行会话生成，Claude Code 负责质量审查。项目采用 monorepo 结构（pnpm workspaces），后端 NestJS + Prisma + PostgreSQL，移动端 React Native + Expo SDK 52。

**当前代码库状态（2026-04-12 诊断）：**
- 后端：26 个模块全部实现，803 测试通过，TS 零错误
- 移动端：40+ 页面，22 服务，25+ hooks，7 stores，完整主题系统
- 总体测试覆盖率 47%（目标 80%）
- 5 个模块 0% 覆盖率，12 个模块低于 80%
- 零 TODO/FIXME/placeholder，零 any 类型，零 console.log

**技术栈锁定：** NestJS 11.x, Prisma 6.x, PostgreSQL 16.x, Redis 7.x, React Native + Expo SDK 52, TypeScript 5.x strict, Zustand + TanStack Query

## Constraints

- **Tech Stack**: 项目宪法（00-PROJECT-CONSTITUTION.md v3.3）已锁定技术栈，不可更改
- **Testing**: 每模块 80%+ 覆盖率，不合格不入主干
- **Code Style**: 零 any，函数 <50 行，文件 <500 行，不可变数据
- **Cost**: 运营月成本上限 ¥3,400（MVP 阶段）
- **Language**: 中文优先（面向中国大陆市场）
- **Architecture**: 模块化单体，合约化开发（文件隔离）

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| AI 造型师 Agent 模式 | 先 MVP 用 LLM API，积累数据后再微调 | ✓ Good -- 成本低，迭代快 |
| 文生图搭配可视化替代 VTO | GLM-5 文生图 ~0.01 元/张 vs VTO ~0.50 元/张 | ✓ Good -- 成本降低 98% |
| Skia 动态绘制替代预渲染 | 零服务端成本，客户端实时渲染 | ✓ Good |
| EPROLO POD 全 Mock | MVP 先验证需求，上线前再对接真实 API | — Pending |
| TanStack Query 替代 WatermelonDB | Expo 兼容性更好，更简单可靠 | ✓ Good |
| 免费分享市集 + 仅收定制费 | 简化商业模式，降低运营复杂度 | — Pending |

## Evolution

- 项目宪法: C:\AiNeed\DELIVERY-V3\00-PROJECT-CONSTITUTION.md (v3.3)
- 主计划: C:\AiNeed\DELIVERY-V3\04-MASTER-PLAN.md
- AI 深度研究: C:\AiNeed\DELIVERY-V3\03-CORE-AI-DEEP-DIVE.md

---
*Last updated: 2026-04-12 after GSD initialization*
