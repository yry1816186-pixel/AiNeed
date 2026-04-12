# Roadmap: AiNeed V3

## Overview

AiNeed V3 是一个 AI 私人造型师 App。项目从零开始构建，经过 7 个开发阶段完成 MVP。目前代码编写已完成（Phase 1-5），进入质量保证阶段（Phase 6）。

## Phases

- [x] **Phase 1: 项目骨架** - NestJS + Expo + Prisma + Docker 基础架构
- [x] **Phase 2: 核心后端** - 7 个基础后端模块（Auth/Users/Clothing/Upload/Search/Wardrobe/Favorites）
- [x] **Phase 2.5: Q 版形象服务** - Avatar + AvatarTemplate 后端 API
- [x] **Phase 3: AI 服务** - 造型师/知识图谱/推荐引擎/向量嵌入
- [x] **Phase 4: 核心移动端** - 7 个核心页面 + 组件/Hooks/服务层
- [x] **Phase 4.5: 定制页面** - Q 版形象页面 + Skia 渲染 + 图案编辑器 + 定制预览
- [x] **Phase 5: 高级功能** - 社区/社交/私信/通知/文生图/体型分析/定制市集/高端定制
- [ ] **Phase 6: 集成与质量** - 测试覆盖率 + E2E + 安全审计 + 性能优化
- [ ] **Phase 7: 部署与上线** - Docker 生产验证 + CI/CD + APK 构建 + 文档

## Phase Details

<details>
<summary>Phase 1: 项目骨架 (已完成)</summary>

**Goal**: 创建所有后续开发依赖的基础骨架
**Depends on**: Nothing
**Requirements**: INFRA-01~06
**Success Criteria**:
  1. Prisma schema 验证通过
  2. TypeScript 编译零错误
  3. Docker Compose 启动成功
  4. Expo 可启动

Plans:
- [x] 01-01: 后端骨架 (NestJS + Prisma + Docker)
- [x] 01-02: 移动端骨架 (Expo + Router + Theme)
- [x] 01-03: 共享类型 + 种子数据

</details>

<details>
<summary>Phase 2: 核心后端 (已完成)</summary>

**Goal**: 所有基础后端 API 可用
**Depends on**: Phase 1
**Requirements**: AUTH-01~03, USER-01~03, CLOTH-01~05, WARD-01~03
**Success Criteria**:
  1. 所有 7 个模块独立测试通过
  2. API 端点 curl 测试通过
  3. 统一响应格式验证

Plans:
- [x] 02-01: Auth 认证模块
- [x] 02-02: Users 用户模块
- [x] 02-03: Clothing 服装模块
- [x] 02-04: Upload 上传模块
- [x] 02-05: Search 搜索模块
- [x] 02-06: Wardrobe 衣橱模块
- [x] 02-07: Favorites 收藏模块

</details>

<details>
<summary>Phase 2.5: Q 版形象服务 (已完成)</summary>

**Goal**: Q 版形象参数管理 + 服装映射后端
**Depends on**: Phase 2
**Requirements**: AVATAR-01~04

Plans:
- [x] 02.5-01: Avatar 形象管理模块
- [x] 02.5-02: AvatarTemplate 模板管理模块

</details>

<details>
<summary>Phase 3: AI 服务 (已完成)</summary>

**Goal**: AI 造型师可进行真实对话并推荐搭配
**Depends on**: Phase 2
**Requirements**: AI-01~06, OUTFIT-01~02
**Success Criteria**:
  1. GLM-5 API 真实调用成功
  2. SSE 流式输出验证通过
  3. 推荐结果相关性合格

Plans:
- [x] 03-01: LLM 服务（GLM-5 + DeepSeek）
- [x] 03-02: 知识图谱（Neo4j）
- [x] 03-03: 推荐引擎
- [x] 03-04: AI 造型师组装
- [x] 03-05: 向量嵌入（FashionCLIP + BGE-M3）

</details>

<details>
<summary>Phase 4: 核心移动端 (已完成)</summary>

**Goal**: 核心页面在 Android 真机可交互
**Depends on**: Phase 2, 3
**Success Criteria**:
  1. 所有页面正常渲染
  2. 导航流程完整
  3. 设计系统统一

Plans:
- [x] 04-01: 认证+引导页面
- [x] 04-02: 首页
- [x] 04-03: AI 造型师页面
- [x] 04-04: 衣橱页面
- [x] 04-05: 个人中心
- [x] 04-06: 搜索页面
- [x] 04-07: 服装详情页

</details>

<details>
<summary>Phase 4.5: Q 版形象+定制页面 (已完成)</summary>

**Goal**: Q 版形象展示与服装定制页面可用
**Depends on**: Phase 4
**Requirements**: CUSTOM-01~03

Plans:
- [x] 04.5-01: Q 版形象页面
- [x] 04.5-02: Skia 渲染组件
- [x] 04.5-03: 图案编辑器
- [x] 04.5-04: 定制预览页面

</details>

<details>
<summary>Phase 5: 高级功能 (已完成)</summary>

**Goal**: 完整功能集
**Depends on**: Phase 4
**Requirements**: COMM-01~05, BESP-01~05, CUSTOM-04~05, BODY-01~02, OUTFIT-03
**Success Criteria**:
  1. 社区完整流程
  2. 高端定制全流程
  3. 设计市集可用
  4. 文生图搭配可视化

Plans:
- [x] 05-01: 社区模块
- [x] 05-02: 社交关系
- [x] 05-03: 私信系统
- [x] 05-04: 通知系统
- [x] 05-05: 文生图搭配可视化
- [x] 05-06: 体型分析
- [x] 05-07: 定制订单管理
- [x] 05-08: 设计市集
- [x] 05-09: 高端定制-工作室管理
- [x] 05-10: 高端定制-订单流程

</details>

### Phase 6: 集成与质量

**Goal**: 测试覆盖率达到 80%+，安全审计通过，性能达标
**Depends on**: Phase 5
**Requirements**: QUAL-01~06
**Success Criteria**:
  1. 后端测试覆盖率 >= 80%
  2. 6 条 E2E 关键流程测试通过
  3. 无 OWASP Top 10 高危漏洞
  4. API P95 响应 < 500ms

Plans:
- [ ] 06-01: 0% 覆盖率模块测试（bespoke/orders, bespoke/studios, community, messaging, outfit-image）
- [ ] 06-02: 低覆盖率模块测试提升（12 个模块从 <80% 提升到 >=80%）
- [ ] 06-03: E2E 关键流程测试（6 条核心路径）
- [ ] 06-04: 安全审计 + 修复
- [ ] 06-05: 性能优化 + 验证

### Phase 7: 部署与上线

**Goal**: 可分发的 APK + 生产环境就绪
**Depends on**: Phase 6
**Requirements**: DEPLOY-01~03
**Success Criteria**:
  1. Docker 全服务启动
  2. CI/CD 全绿
  3. Android APK 可安装运行
  4. API 文档完整

Plans:
- [ ] 07-01: Docker 生产配置验证
- [ ] 07-02: CI/CD 管线验证
- [ ] 07-03: 移动端构建导出
- [ ] 07-04: API 文档生成
- [ ] 07-05: 部署文档

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. 项目骨架 | 3/3 | Complete | 2026-04-10 |
| 2. 核心后端 | 7/7 | Complete | 2026-04-11 |
| 2.5 Q 版形象 | 2/2 | Complete | 2026-04-11 |
| 3. AI 服务 | 5/5 | Complete | 2026-04-11 |
| 4. 核心移动端 | 7/7 | Complete | 2026-04-12 |
| 4.5 定制页面 | 4/4 | Complete | 2026-04-12 |
| 5. 高级功能 | 10/10 | Complete | 2026-04-12 |
| 6. 集成与质量 | 0/5 | In progress | - |
| 7. 部署与上线 | 0/5 | Not started | - |
