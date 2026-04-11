# AiNeed V3 - 全栈开发主计划

> **版本**: 3.3 | **日期**: 2026-04-12 | **状态**: 执行计划
> **范围**: 覆盖全部20个开发领域的系统化方案
> **前置**: 阅读 00-PROJECT-CONSTITUTION.md (v3.3)
> **执行**: Trae GLM5.1 并行Session + Claude Code 质量审查

---

## 零、V2失败复盘 - 这一次必须不同

### 0.1 V2核心问题诊断

| 问题 | 根因 | 后果 | V3对策 |
|------|------|------|--------|
| 架构混乱 | 无模块边界约束，单文件>800行 | 改一处坏一片 | 严格模块隔离，每文件<500行，ESLint强制 |
| 功能半成品 | Session无完成标准 | 到处是TODO和placeholder | 每Session必须通过测试，零TODO零placeholder |
| 零测试覆盖 | 没有TDD要求 | Bug多，不敢重构 | 每模块80%+覆盖率，不合格不合并 |
| AI效果差 | Prompt粗糙，无知识注入 | 回复空洞无价值 | 系统化Prompt工程+Neo4j知识图谱+上下文注入 |
| 审美灾难 | 无设计系统，用默认组件 | 时尚App丑=死 | 先建设计Token系统，审美评审作为Quality Gate |
| 无全局协调 | Session各自为政 | 代码冲突，集成灾难 | Foundation Session先建骨架，合约化并行开发 |
| 无市场验证 | 跳过调研直接开发 | 方向可能全错 | Phase 0先做市场调研，数据驱动决策 |
| 缺少情绪价值 | 纯工具型产品无情感连接 | 用户无粘性 | Q版形象(Skia)提供情绪价值 |

### 0.2 这一次的核心原则

1. **先验证再开发** - 市场调研先行，可行性分析先行
2. **合约化并行** - 每个Session有严格的读写边界，零文件冲突
3. **测试驱动** - 每个模块必须有测试，不合格不入主干
4. **审美第一** - 时尚App的审美是生存底线，不是锦上添花
5. **增量交付** - 每个Phase产出可演示、可测试的成果
6. **诚实评估** - 不乐观估计，不回避风险，不虚报进度

---

## 一、可行性冷峻分析

### 1.1 各组件可行性评级

| # | 组件 | 技术可行性 | 成本可行性 | 时间可行性 | 综合评级 | 备注 |
|---|------|-----------|-----------|-----------|---------|------|
| 1 | NestJS Backend | ★★★★★ | ★★★★★ | ★★★★★ | **A** | 成熟框架，无风险 |
| 2 | React Native + Expo SDK 52 | ★★★★☆ | ★★★★★ | ★★★★☆ | **A-** | Dev Client模式可装原生模块 |
| 3 | PostgreSQL 16 + Prisma 6 | ★★★★★ | ★★★★★ | ★★★★★ | **A** | 极其成熟 |
| 4 | Redis 7 缓存/会话 | ★★★★★ | ★★★★★ | ★★★★★ | **A** | 成熟 |
| 5 | MinIO 对象存储 | ★★★★★ | ★★★★★ | ★★★★★ | **A** | S3兼容，成熟 |
| 6 | JWT + SMS 认证 | ★★★★★ | ★★★★☆ | ★★★★★ | **A** | 短信有成本但可控 |
| 7 | GLM-5 API (AI造型师) | ★★★★☆ | ★★★★☆ | ★★★★★ | **A** | 智谱AI稳定，有DeepSeek兜底 |
| 8 | SSE 流式输出 | ★★★★★ | ★★★★★ | ★★★★★ | **A** | NestJS原生支持 |
| 9 | Elasticsearch 8 全文搜索 | ★★★★★ | ★★★★☆ | ★★★★☆ | **A** | 中文分词需配置 |
| 10 | Neo4j 知识图谱 | ★★★★☆ | ★★★★★ | ★★★☆☆ | **B+** | 种子数据需人工整理 |
| 11 | Qdrant 向量搜索 | ★★★★☆ | ★★★★★ | ★★★★☆ | **A-** | 社区版免费，API简洁 |
| 12 | 推荐引擎(内容+协同) | ★★★★☆ | ★★★★★ | ★★★★☆ | **A** | MVP用SQL实现，够用 |
| 13 | 社区(帖/评/赞) | ★★★★★ | ★★★★★ | ★★★★★ | **A** | 标准CRUD |
| 14 | 社交(关注/粉丝) | ★★★★★ | ★★★★★ | ★★★★★ | **A** | 标准关系模型 |
| 15 | 私信系统 | ★★★★☆ | ★★★★★ | ★★★★☆ | **A-** | 需WebSocket或轮询 |
| 16 | 虚拟试衣(云端API) | ★★★★★ | ★★★★☆ | ★★★☆☆ | **B+** | 延后到Phase 5+，MVP用文生图替代 |
| 17 | Q版形象(Skia绘制) | ★★★★★ | ★★★★★ | ★★★★★ | **A** | react-native-skia客户端实时绘制，MVP极简占位 |
| 18 | FashionCLIP 嵌入 | ★★★★☆ | ★★★★☆ | ★★★★☆ | **A** | 可延后LoRA微调 |
| 19 | TanStack Query缓存 | ★★★★★ | ★★★★★ | ★★★★★ | **A** | 替代WatermelonDB，简单可靠 |
| 20 | 搭配兼容性GNN | ★★★☆☆ | ★★★★★ | ★★★☆☆ | **B+** | 延后到P1 |
| 21 | Q版形象组件(Skia素材) | ★★★★★ | ★★★★★ | ★★★★★ | **A** | MVP极简占位(圆形头+五官+色块) |
| 22 | 图案编辑器(核心功能) | ★★★★☆ | ★★★★★ | ★★★★☆ | **A** | 核心功能: 上传+定位+缩放+旋转+文字，不做画笔/滤镜/平铺 |
| 23 | POD订单对接(EPROLO) | ★★★★★ | ★★★★★ | ★★★★★ | **A** | MVP全Mock Provider，上线前真实对接 |
| 24 | 文生图搭配可视化 | ★★★★★ | ★★★★★ | ★★★★★ | **A** | GLM-5文生图API，~0.01元/张，MVP主力可视化 |
| 25 | 高端私人定制(全流程) | ★★★★☆ | ★★★★★ | ★★★☆☆ | **A-** | 全流程App内集成: 工作室入驻+沟通+报价+支付+跟踪 |

### 1.2 关键决策：MVP策略调整

基于可行性分析，做出以下关键决策：

| 原方案 | 调整后方案 | 原因 |
|--------|-----------|------|
| 自部署AnyDressing | **文生图搭配可视化(GLM-5 API)** | ~0.01元/张，核心是AI推荐不是VTO |
| 真实VTO(阿里云百炼) | **延后到Phase 5+** | MVP先验证AI推荐需求，VTO成本高且非核心 |
| WatermelonDB离线 | **TanStack Query缓存** | Expo兼容性风险高，TanStack Query更简单可靠 |
| 潮玩风3D头像+预渲染 | **react-native-skia Q版形象(极简占位)** | MVP用圆形头+五官+色块，后续迭代POP MART风 |
| 无服装定制 | **核心功能编辑器+EPROLO POD(全Mock)+免费分享市集** | 定制化差异化竞争力 |
| 轻量入口高端定制 | **全流程App内集成** | 工作室入驻+在线沟通+报价+支付+订单跟踪 |
| 设计师分成市集 | **免费分享+仅收定制费** | 简化商业模式，市集分享免费 |
| 全部20张表同时建 | **分批建表，随功能扩展** | 减少初始复杂度 |
| 7个ML模型同时训 | **先MVP用Agent模式调LLM API** | 嵌入和推荐后补，AI造型师先用Agent模式上线 |

### 1.3 诚实的风险评估

**最大风险: 做了但没人用**
- 概率: 40% (没有市场验证就开发)
- 影响: 致命 (浪费所有时间和金钱)
- 缓解: Phase 0先做市场调研，确认需求存在

**第二大风险: 并行开发质量失控**
- 概率: 50% (Trae GLM5.1质量不如Claude)
- 影响: 高 (代码质量差=重构成本>重写成本)
- 缓解: Claude Code做质量审查，不合格的代码打回重写

**第三大风险: 成本超支**
- 概率: 30% (GPU+API+云服务)
- 影响: 中 (月¥15K上限)
- 缓解: 分阶段投入，按效果决定是否继续

**第四大风险: Q版形象审美质量不达标**
- 概率: 25%
- 影响: 高 (丑=减分项)
- 缓解: 参考POP MART/小红书高赞Q版风格，上线前审美焦点小组测试，Skia实时调整迭代成本低

---

## 二、分阶段开发计划

### 总览

```
Phase 0:   验证与设计 ─────── Day 1-3 ──── (3-5个并行Session)
Phase 1:   项目骨架 ────────── Day 3-5 ──── (3个顺序Session)
Phase 2:   核心后端 ────────── Day 5-10 ── (7个并行Session)
Phase 2.5: 虚拟形象服务 ────── Day 8-12 ── (2个并行Session)
Phase 3:   AI服务 ──────────── Day 8-14 ── (5个并行Session)
Phase 4:   核心移动端 ──────── Day 10-17 ── (7个并行Session)
Phase 4.5: 虚拟形象+定制页面 ─ Day 14-19 ── (4个并行Session)
Phase 5:   高级功能 ────────── Day 14-20 ── (6+2个并行Session)
Phase 6:   集成与质量 ──────── Day 18-25 ── (4个并行Session)
Phase 7:   部署与上线 ──────── Day 23-30 ── (5个并行Session)
```

**注意**: Phase之间有重叠，并行Session加速开发。实际日历时间约30天。

---

### Phase 0: 验证与设计 (Day 1-3)

**目标**: 确认产品值得做 + 建立设计基础

| Session | 任务 | 产出物 | 文件位置 | 依赖 |
|---------|------|--------|---------|------|
| M1 | 市场调研报告 | MARKET-RESEARCH.md | docs/ | 无 |
| M2 | 竞品分析报告 | COMPETITIVE-ANALYSIS.md | docs/ | 无 |
| M3 | 商业模式评估 | BUSINESS-MODEL.md | docs/ | 无 |
| D1 | 设计系统+UI组件库 | theme/* + components/ui/* | mobile/src/ | 无 |
| D2 | AI造型师Prompt工程 | prompts/*.ts | backend/src/modules/stylist/prompts/ | 无 |

**Quality Gate**:
- 市场调研确认目标用户群存在真实需求
- 竞品分析发现差异化机会 >= 3个
- 设计系统有完整的Token定义(颜色/字体/间距/阴影)
- AI Prompt经过3轮测试回复质量合格

**Go/No-Go决策**: 如果市场调研显示"不值得做"，到此为止，节省后续所有成本。

---

### Phase 1: 项目骨架 (Day 3-5)

**目标**: 创建所有后续Session依赖的基础骨架

| Session | 任务 | 产出物 | 文件位置 | 依赖 |
|---------|------|--------|---------|------|
| F1 | 后端骨架+NestJS+Prisma | 项目结构+Schema+Docker | apps/backend/ | Phase 0 |
| F2 | 移动端骨架+Expo+Router | 项目结构+导航+主题 | apps/mobile/ | Phase 0 |
| F3 | 共享类型+种子数据 | types/* + seed.ts | apps/shared/ + apps/backend/prisma/ | F1 |

**这三个Session必须顺序执行**，因为F2和F3依赖F1的目录结构和Schema。

**F1详细产出**:
```
apps/backend/
├── prisma/schema.prisma (35张表的完整定义)
├── src/main.ts
├── src/app.module.ts
├── src/config/env.ts
├── src/common/
│   ├── interceptors/transform.interceptor.ts
│   ├── filters/http-exception.filter.ts
│   ├── decorators/current-user.decorator.ts
│   └── types/api.types.ts
├── src/prisma/prisma.module.ts
├── src/prisma/prisma.service.ts
├── .env
├── .env.example
├── docker-compose.yml (引用 ../../docker/)
└── tsconfig.json (strict: true)
```

**F2详细产出**:
```
apps/mobile/
├── app/_layout.tsx (根布局: QueryClientProvider + AuthGate)
├── app/(auth)/_layout.tsx
├── app/(tabs)/_layout.tsx (4个Tab占位)
├── src/theme/ (从D1的设计系统)
├── src/types/ (从F3的共享类型)
├── src/services/api.ts (Axios实例)
├── src/stores/auth.store.ts
├── app.json
├── babel.config.js
└── tsconfig.json (strict: true)
```

**F3详细产出**:
```
apps/shared/types/
├── enums.ts
├── models.ts
├── api.ts
apps/backend/prisma/
├── seed.ts (200条服装 + 10品牌 + 分类 + 时尚规则)
```

**Quality Gate**:
- `npx prisma validate` 通过
- `npx tsc --noEmit` 后端+移动端均通过
- `docker-compose up -d` PostgreSQL + Redis + MinIO 启动成功
- `npx prisma db push` 创建表成功
- `npx tsx prisma/seed.ts` 种子数据导入成功
- `npx expo start` 移动端可启动

---

### Phase 2: 核心后端模块 (Day 5-10)

**目标**: 所有基础后端API可用，每个模块独立可测试

**所有7个Session可完全并行**，因为它们写入隔离的目录。

| Session | 模块 | 写入范围 | 禁止触碰 | API端点 |
|---------|------|---------|---------|---------|
| B1 | Auth认证 | src/modules/auth/ | 其他模块 | POST /auth/send-code, /auth/verify-code, /auth/refresh, /auth/logout |
| B2 | Users用户 | src/modules/users/ | 其他模块 | GET/PATCH /users/me, POST /users/me/avatar |
| B3 | Clothing服装 | src/modules/clothing/ | 其他模块 | GET /clothing, /clothing/:id, /clothing/search |
| B4 | Upload上传 | src/modules/upload/ | 其他模块 | POST /upload/image |
| B5 | Search搜索 | src/modules/search/ | 其他模块 | GET /search |
| B6 | Wardrobe衣橱 | src/modules/wardrobe/ | 其他模块 | GET/POST/DELETE /wardrobe |
| B7 | Favorites收藏 | src/modules/favorites/ | 其他模块 | POST/GET /favorites |

**每个Session必须产出**:
```
src/modules/{module}/
├── {module}.module.ts
├── {module}.controller.ts
├── {module}.service.ts
├── dto/
│   ├── create-*.dto.ts
│   └── update-*.dto.ts
└── __tests__/
    ├── {module}.service.spec.ts
    └── {module}.controller.spec.ts
```

**Quality Gate (每个Session独立)**:
- TypeScript strict编译通过
- 所有端点有对应的DTO (class-validator)
- Service层80%+测试覆盖率
- 统一响应格式 { success, data, meta }
- 统一错误处理 { success: false, error: { code, message } }
- 零any类型，零TODO，零placeholder

---

### Phase 2.5: Q版形象服务 (Day 8-12, 并行)

**目标**: Q版形象参数管理+服装映射后端服务可用

| Session | 模块 | 写入范围 | 依赖 | 关键交付 |
|---------|------|---------|------|---------|
| AV1 | Q版形象管理 | src/modules/avatar/ | Phase 2 | 形象参数CRUD+服装颜色类型映射 |
| AV2 | 形象模板管理 | src/modules/avatar-template/ | Phase 2 | 模板CRUD+Skia绘制配置管理 |

**Quality Gate**:
- 形象API: POST /avatar/create 创建用户形象，GET /avatar/me 获取参数
- 模板API: CRUD /avatar/templates 完整可用
- 换装映射: POST /avatar/me/dress 更新clothing_map {slot: {color, type}}
- Skia绘制配置存储正确，客户端可读取并渲染

---

### Phase 3: AI服务 (Day 8-14)

**目标**: AI造型师可进行真实对话并推荐搭配

| Session | 模块 | 写入范围 | 依赖 | 关键交付 |
|---------|------|---------|------|---------|
| A1 | LLM服务 | src/modules/stylist/services/ | Phase 2 | GLM-5+DeepSeek双Provider |
| A2 | 知识图谱 | src/modules/knowledge/ | Phase 2 | Neo4j CRUD + 种子数据 |
| A3 | 推荐引擎 | src/modules/recommendation/ | Phase 2 | 内容+协同+热门三通道 |
| A4 | AI造型师 | src/modules/stylist/ | A1+A2+A3 | 完整聊天+推荐流程 |
| A5 | 向量嵌入 | src/modules/embedding/ | Phase 2 | FashionCLIP+BGE-M3嵌入 |

**Quality Gate**:
- GLM-5 API真实调用成功(非mock)
- SSE流式输出在浏览器/Postman可见
- AI回复包含搭配推荐(outfit JSON块)
- 推荐结果相关性人工评估 > 7/10
- 知识图谱种子数据 >= 100条规则

---

### Phase 4: 核心移动端 (Day 10-17)

**目标**: 核心页面在Android真机可交互

**所有7个Session可完全并行**，各自写入隔离的页面文件。

| Session | 页面 | 写入范围 | 依赖 | 关键交付 |
|---------|------|---------|------|---------|
| MB1 | 认证+引导 | app/(auth)/* + app/onboarding/* | Phase 1 | 登录/注册/6步引导+创建Q形象引导 |
| MB2 | 首页(Q版形象为核心) | app/(tabs)/index.tsx | Phase 2+3+AV4 | Q版形象+今日推荐卡片+快捷操作 |
| MB3 | AI造型师(卡片交互式) | app/(tabs)/stylist.tsx | Phase 3+AV4 | 场合/预算/风格卡片选择→搭配卡片结果 |
| MB4 | 衣橱(Q版形象可视化) | app/(tabs)/wardrobe.tsx | Phase 2+AV4 | Q版形象点击部位管理+服装网格 |
| MB5 | 个人中心(经典布局) | app/(tabs)/profile.tsx + app/settings/* | Phase 2 | 数据卡片+定制菜单+设置 |
| MB6 | 搜索 | app/search/* | Phase 2 | 双列结果+过滤+历史+热门 |
| MB7 | 服装详情 | app/clothing/[id].tsx | Phase 2 | 大图+属性+试穿+收藏+加入衣橱 |

**每个移动端Session额外产出**:
```
src/components/{feature}/
├── {Component}.tsx (UI组件)
src/hooks/
├── use{Feature}.ts (数据Hook)
src/services/
├── {feature}.service.ts (API调用)
```

**Quality Gate**:
- 所有页面在Android真机正常渲染
- 导航流程完整(登录→引导→首页→详情→返回)
- 首页Q版形象渲染+idle动画正常
- AI造型师卡片选择→搭配卡片结果完整流程
- 衣橱Q版形象可视化+部位点击交互
- 白底设计系统一致(颜色/字体/间距来自theme/)
- SVG图标全部到位(零emoji)
- 无TypeScript编译错误
- 无console.log(使用Logger)

---

### Phase 4.5: Q版形象+定制页面 (Day 14-19, 并行)

**目标**: Q版形象展示与服装定制页面可用

| Session | 模块 | 写入范围(后端) | 写入范围(前端) | 关键交付 |
|---------|------|---------------|---------------|---------|
| AV3 | Q版形象页面 | - | app/avatar/* | 形象选择/参数编辑/展示页 |
| AV4 | Skia渲染组件 | - | src/components/avatar/ | QAvatarRenderer+QAvatarMini+本地动画 |
| CU1 | 图案编辑器 | src/modules/customize/ | app/customize/editor/* | WebView+Canvas图案编辑 |
| CU2 | 定制预览页面 | - | app/customize/preview/* | 图案映射到服装预览+EPROLO下单 |

**Quality Gate**:
- Q版形象: 用户可选择肤色/发型/五官组合，Skia实时渲染
- Skia动画: 至少idle/happy/wave 3种本地动画流畅
- 图案编辑: 基础绘图(画笔/文字/贴纸)可用
- 定制预览: 图案映射到服装模板效果真实

---

### Phase 5: 高级功能 (Day 14-20)

**目标**: 完整功能集

| Session | 模块 | 写入范围(后端) | 写入范围(前端) |
|---------|------|---------------|---------------|
| C1 | 社区帖子 | src/modules/community/ | app/community/* |
| C2 | 社交关系 | src/modules/social/ | app/community/user/* |
| C3 | 私信系统 | src/modules/messaging/ | app/messages/* |
| C4 | 通知系统 | src/modules/notification/ | (集成到各页面) |
| C5 | 文生图搭配可视化 | src/modules/outfit-image/ | 集成到AI造型师结果页 |
| C6 | 体型分析 | src/modules/body-analysis/ | app/(tabs)/profile.tsx扩展 |
| CU3 | 定制订单管理 | src/modules/custom-order/ | app/customize/orders/* |
| CU4 | 设计市集(免费分享) | src/modules/design-market/ | app/market/* |
| BESPOKE1 | 高端定制-工作室管理 | src/modules/bespoke/ | app/bespoke/index+studios |
| BESPOKE2 | 高端定制-订单流程 | src/modules/bespoke/(订单部分) | app/bespoke/submit+chat+quote+orders |

**Quality Gate**:
- 发帖→评论→点赞完整流程
- 关注→粉丝列表正常
- 私信收发正常
- 文生图搭配可视化: AI推荐→生成穿搭效果图→展示
- 通知实时接收
- 定制订单: 创建订单→Mock POD→状态追踪
- 设计市集: 上传设计→浏览→免费分享→AI预审
- 高端定制: 工作室列表→提交需求→在线沟通→报价→确认
- 定制产品不支持退货(仅质量问题例外)

---

### Phase 6: 集成与质量 (Day 18-25)

**目标**: 生产就绪

| Session | 任务 | 写入范围 | 依赖 |
|---------|------|---------|------|
| T1 | E2E测试 | test/**/*.e2e-spec.ts | Phase 2-5 |
| T2 | Bug修复 | 跨模块(只修复不改功能) | T1 |
| T3 | 性能优化 | 各模块(只优化不改功能) | T2 |
| T4 | 安全审计+修复 | 各模块(只修安全不改功能) | T2 |

**Quality Gate**:
- E2E测试通过率 > 95%
- 无P0/P1 bug
- API响应时间 P95 < 500ms
- 无OWASP Top 10漏洞
- 无硬编码密钥/密码

---

### Phase 7: 部署与上线 (Day 23-30)

**目标**: 可分发的APK + 生产环境

| Session | 任务 | 产出物 |
|---------|------|--------|
| K1 | Docker生产配置 | docker-compose.prod.yml + Dockerfile |
| K2 | CI/CD流水线 | .github/workflows/*.yml |
| K3 | EAS Build配置 | eas.json + Android签名 |
| K4 | 文档编写 | docs/*.md (API/部署/运维/用户手册) |
| K5 | ICP备案指南 | docs/ICP-GUIDE.md |

**Quality Gate**:
- `docker-compose up -d` 全部服务启动
- GitHub Actions CI绿色
- Android APK可安装运行
- API文档完整覆盖所有端点

---

## 三、Session协调架构

### 3.1 合约化开发原则

每个Trae Session接收一个"开发合约"，包含：

```
开发合约 = {
  会话ID: "B1-Auth",
  
  只读范围: [
    "C:\AiNeed\DELIVERY-V3\00-PROJECT-CONSTITUTION.md",  // 项目宪法
    "C:\AiNeed\V3\apps\backend\prisma\schema.prisma",     // 数据库Schema
    "C:\AiNeed\V3\apps\shared\types\",                     // 共享类型
    "C:\AiNeed\V3\apps\backend\src\common\"                // 通用工具
  ],
  
  写入范围: [
    "C:\AiNeed\V3\apps\backend\src\modules\auth\"          // 只允许写这个目录
  ],
  
  禁止操作: [
    "不修改其他模块的代码",
    "不修改schema.prisma",
    "不修改shared/types",
    "不修改common/下的任何文件"
  ],
  
  接口契约: {
    输入依赖: [
      "PrismaService (全局提供)",
      "JwtModule (全局提供)",
      "ConfigService (全局提供)"
    ],
    输出API: [
      "POST /api/v1/auth/send-code",
      "POST /api/v1/auth/verify-code",
      "POST /api/v1/auth/refresh",
      "POST /api/v1/auth/logout"
    ],
    输出类型: [
      "AuthService (可被其他模块import)"
    ]
  },
  
  质量标准: {
    TypeScript: "strict模式, 零any",
    测试: "80%+覆盖率",
    代码行数: "单文件<500行, 单函数<50行",
    禁止: "无TODO, 无placeholder, 无console.log"
  }
}
```

### 3.2 文件隔离矩阵

```
后端模块隔离:
  auth/        → B1 Session独占
  users/       → B2 Session独占
  clothing/    → B3 Session独占
  upload/      → B4 Session独占
  search/      → B5 Session独占
  wardrobe/    → B6 Session独占
  favorites/   → B7 Session独占
  stylist/     → A1+A4 Session (先A1建LLM服务, 后A4组装)
  knowledge/   → A2 Session独占
  recommendation/ → A3 Session独占
  embedding/   → A5 Session独占
  avatar/      → AV1 Session独占 (Q版形象CRUD+服装映射)
  avatar-template/ → AV2 Session独占 (模板+Skia配置管理)
  customize/   → CU1 Session独占
  custom-order/ → CU3 Session独占 (定制订单+全Mock POD)
  design-market/ → CU4 Session独占 (免费分享+AI预审)
  community/   → C1 Session独占
  social/      → C2 Session独占
  messaging/   → C3 Session独占
  notification/ → C4 Session独占
  outfit-image/ → C5 Session独占 (文生图搭配可视化)
  body-analysis/ → C6 Session独占
  bespoke/     → BESPOKE1+BESPOKE2 Session (工作室管理+订单流程)
  tryon/       → 延后到Phase 5+ (真实VTO)

移动端页面隔离:
  app/(auth)/*      → MB1 Session独占
  app/(tabs)/index.tsx → MB2 Session独占
  app/(tabs)/stylist.tsx → MB3 Session独占
  app/(tabs)/wardrobe.tsx → MB4 Session独占
  app/(tabs)/profile.tsx → MB5 Session独占
  app/search/*      → MB6 Session独占
  app/clothing/*    → MB7 Session独占
  app/avatar/*      → AV3 Session独占
  app/customize/*   → CU1+CU2 Session
  app/market/*      → CU4 Session独占
  app/community/*   → C1+C2 Session
  app/messages/*    → C3 Session独占
  app/bespoke/*     → BESPOKE1+BESPOKE2 Session
  app/tryon/*       → 延后到Phase 5+
```

### 3.3 合并协议

```
1. 每个Session在独立Git分支工作: feature/{session-id}
2. Session完成后:
   a. 运行 npx tsc --noEmit 确保编译通过
   b. 运行 npm run test 确保测试通过
   c. git commit (conventional commit格式)
3. Phase完成后:
   a. 用Claude Code打开一个新会话做质量审查
   b. 审查所有Session的代码
   c. 合并到main分支
   d. 运行全量测试
4. 冲突解决:
   a. 文件隔离设计应避免冲突
   b. 如果出现冲突，由Claude Code审查会话解决
```

---

## 四、测试策略

### 4.1 测试金字塔

```
        /\
       /  \
      / E2E \           5% - 关键用户流程
     /--------\
    /  集成测试  \       15% - API端点+数据库交互
   /------------\
  /    单元测试    \     80% - Service/函数/组件
 /----------------\
```

### 4.2 后端测试要求

| 测试类型 | 覆盖对象 | 最低覆盖率 | 框架 |
|---------|---------|-----------|------|
| 单元测试 | Service方法 | 80% | Jest |
| 单元测试 | Controller | 70% | Jest + Supertest |
| 集成测试 | API端点+DB | 关键路径100% | Supertest |
| E2E测试 | 完整用户流程 | 6条核心路径 | Supertest |

**6条必测E2E流程**:
1. 注册 → 登录 → 获取用户信息
2. 浏览服装列表 → 查看详情 → 收藏
3. 创建AI会话 → 发送消息 → 收到SSE回复
4. 搜索 → 过滤 → 查看结果
5. 发帖 → 评论 → 点赞
6. 关注用户 → 查看粉丝列表

### 4.3 移动端测试要求

| 测试类型 | 覆盖对象 | 最低覆盖率 | 框架 |
|---------|---------|-----------|------|
| 单元测试 | Hooks | 80% | Jest |
| 单元测试 | Stores (Zustand) | 80% | Jest |
| 组件测试 | UI组件 | 60% | React Testing Library |
| 快照测试 | 关键页面 | 5个核心页面 | Jest |

---

## 五、设计系统规范

### 5.1 设计Token (时尚App的生命线)

**颜色系统 (白底+深色强调+玫瑰红点缀, 类似得物/小红书风格)**:
```typescript
const colors = {
  // 背景色系 - 白底为主, 干净明亮
  background: '#FFFFFF',
  backgroundSecondary: '#F5F5F5',
  backgroundCard: '#FFFFFF',

  // 主色调 - 深邃黑蓝, 用于标题/图标/强调
  primary: '#1A1A2E',
  primaryLight: '#2D2D44',

  // 强调色 - 玫瑰红, 用于按钮/Tag/关键交互
  accent: '#E94560',
  accentLight: '#FF6B81',
  accentDark: '#C73E54',

  // 中性色 (文字层级)
  textPrimary: '#1A1A1A',    // 主标题
  textSecondary: '#666666',  // 正文
  textTertiary: '#999999',   // 辅助文字
  textDisabled: '#B0B0B0',   // 禁用态
  textInverse: '#FFFFFF',    // 反色文字(深色背景上)

  // 分割线和边框
  divider: '#E8E8E8',
  border: '#D1D1D1',

  // 中性色阶 (组件用)
  white: '#FFFFFF',
  gray50: '#FAFAFA',
  gray100: '#F5F5F5',
  gray200: '#E8E8E8',
  gray300: '#D1D1D1',
  gray400: '#B0B0B0',
  gray500: '#999999',
  gray600: '#666666',
  gray700: '#444444',
  gray800: '#333333',
  gray900: '#1A1A1A',
  black: '#000000',

  // 语义色
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',

  // 渐变
  gradientPrimary: ['#1A1A2E', '#2D2D44'],
  gradientAccent: ['#E94560', '#FF6B81'],
};
```

**字体系统**:
```typescript
const typography = {
  h1: { fontSize: 24, fontWeight: '700', lineHeight: 32 },
  h2: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
  h3: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  bodySmall: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
  button: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  overline: { fontSize: 11, fontWeight: '500', lineHeight: 14, letterSpacing: 1 },
};
```

**间距系统 (8px网格)**:
```typescript
const spacing = {
  xs: 4,   // 微间距(图标与文字)
  sm: 8,   // 小间距(同组元素)
  md: 12,  // 中间距(卡片内padding)
  lg: 16,  // 大间距(页面边距)
  xl: 24,  // 超大间距(区块分隔)
  xxl: 32, // 极大间距(页面分隔)
  xxxl: 48, // 超极大间距(大区块)
};
```

**圆角系统**:
```typescript
const borderRadius = {
  sm: 4,    // 小元素(Tag, Badge)
  md: 8,    // 卡片
  lg: 16,   // 按钮
  xl: 24,   // 头像
  full: 9999, // 圆形
};
```

### 5.2 UI原则 (已确认)

1. **大留白** - 每屏元素少，留白多。高端品牌都这样做。
2. **图片为王** - 服装图片占屏幕60%以上面积。图片用全宽圆角卡片。
3. **少即是多** - 每个页面只做一件事。不要塞满功能。
4. **精致微交互** - 按钮按压反馈、页面切换动画、下拉刷新动效。动效必须丝滑流畅。
5. **中国时尚审美** - 不是欧美极简，是精致、优雅、有温度。
6. **禁止通用UI风格** - 不许使用人机感通用的UI设计风格，必须参考国内外顶尖App
7. **SVG精致图标** - 使用精心设计的SVG图标，不使用emoji表情
8. **白底设计** - 主背景白色/浅灰，文字深色，强调色克制使用

### 5.3 参考App审美

- **得物(Dewu)** - 产品卡片设计、底部导航、商品详情页
- **小红书** - 双列Feed流(社区+市集)、卡片交互
- **NET-A-PORTER** - 高端时尚App的留白和排版
- **SSENSE** - 时尚搜索和过滤体验
- **ZEPETO** - Q版形象交互参考

### 5.4 页面设计规范 (已确认)

| 页面 | 设计方案 | 核心元素 |
|------|---------|---------|
| 底部Tab | 5 Tab + 中间"+"大按钮 | 首页/AI造型/+操作/衣橱/我的 |
| 首页 | Q版形象为核心 | 会动Q版形象+今日推荐+快捷操作 |
| AI造型师 | 卡片交互式 | 选场合/预算/风格→生成搭配卡片, 非纯对话 |
| 衣橱 | Q版形象可视化 | 点击形象部位查看/管理服装 |
| 个人页 | 经典个人中心 | 头像+数据卡片(收藏/试衣/定制数)+菜单列表 |
| 定制 | 5步向导 | 选产品→上传图案→编辑布局→预览→下单 |
| 设计市集 | 双列瀑布流 | 预览图+设计师+价格+点赞数, 类似小红书 |
| 虚拟试衣 | 双入口 | 服装详情页+个人页均可发起 |
| 社区 | 小红书风格 | 双列Feed+发帖/评论/点赞/关注 |
| 高端定制 | 全流程App内集成 | 工作室列表+在线沟通+报价+支付+订单跟踪 |

### 5.4.1 首页详细布局

```
┌─────────────────────────┐
│ 早上好, Richard ☀️ 20°C │  ← 问候+天气+Q版小头像
├─────────────────────────┤
│                         │
│   ┌───────────────┐     │
│   │  Q版形象       │     │  ← 居中大区域(占屏幕~40%)
│   │  (Skia动态渲染)│     │  ← idle呼吸动画, 会动!
│   │  今日穿着预览   │     │  ← clothingMap可视化
│   └───────────────┘     │
│                         │
├─────────────────────────┤
│ 今日推荐    [换一套]    │  ← AI生成的搭配方案
│ ┌────┐ ┌────┐ ┌────┐   │  ← 横向滚动卡片
│ │上衣│ │裤子│ │鞋子│   │
│ └────┘ └────┘ └────┘   │
├─────────────────────────┤
│ 快捷操作                │
│ [试衣] [定制] [社区]    │  ← 快捷入口按钮(带SVG图标)
├─────────────────────────┤
│ △首页 △AI △+ △衣橱 △我│  ← 5 Tab + 中间大按钮
└─────────────────────────┘
```

### 5.4.2 AI造型师页面布局

```
┌─────────────────────────┐
│ ← AI造型师              │
├─────────────────────────┤
│  ┌───────────────┐      │
│  │ Q版小形象     │      │  ← 顶部小形象(带wave动画)
│  │ "来帮你搭配!" │      │
│  └───────────────┘      │
├─────────────────────────┤
│                         │
│ 今天要去哪里?           │  ← 卡片式交互, 非纯对话
│ ┌────┐ ┌────┐ ┌────┐   │
│ │工作│ │约会│ │运动│   │  ← 点击选择
│ └────┘ └────┘ └────┘   │
│ ┌────┐ ┌────┐ ┌────┐   │
│ │休闲│ │聚会│ │校园│   │
│ └────┘ └────┘ └────┘   │
│                         │
│ 预算范围?               │
│ [100内] [200内] [500+]  │
│                         │
│ 风格偏好?               │
│ [简约] [韩系] [国潮]   │
│ [日系] [欧美] [新中式]  │
│                         │
│      [生成搭配方案]      │  ← 主按钮
├─────────────────────────┤
│ △首页 △AI △+ △衣橱 △我│
└─────────────────────────┘
```

生成搭配后显示:
```
├─────────────────────────┤
│ 为你推荐这套:           │
│                         │
│ ┌─────────────────────┐ │
│ │ ┌────┐ ┌────┐ ┌──┐ │ │  ← 搭配卡片(可左右滑动)
│ │ │上衣│ │裤子│ │鞋│ │ │
│ │ │¥199│ │¥299│ │¥ │ │ │
│ │ └────┘ └────┘ └──┘ │ │
│ │ 简约通勤风, 适合...  │ │
│ │ [试穿] [收藏] [换]  │ │
│ └─────────────────────┘ │
│                         │
│    [换一套] [全部试穿]   │
├─────────────────────────┤
```

---

## 5.5 Q版形象设计规范 (react-native-skia)

### 5.5.1 Q版风核心特征

| 特征 | 规范 | 说明 |
|------|------|------|
| 头身比 | 1:2.5 ~ 1:3 | 大头小身，可爱感核心 |
| 线条风格 | 圆润矢量路径，无锐角 | Skia Path绘制，圆弧过渡 |
| 色彩质感 | 平涂+渐变高光 | 矢量色块+少量渐变，精致简洁 |
| 面部比例 | 大眼+小鼻+小嘴 | 眼睛占面部1/3以上 |
| 整体风格 | POP MART质感矢量版 | 高饱和度、精致细节、治愈系 |

### 5.5.2 肤色选项 (6档)

| 档位 | 名称 | 色值 | 适用人群 |
|------|------|------|---------|
| 1 | 瓷白 | #FFE4D6 | 白皙肤色 |
| 2 | 自然 | #F5D0B0 | 自然肤色 |
| 3 | 小麦 | #E8B88A | 健康肤色 |
| 4 | 蜜糖 | #D4956A | 蜜色肤色 |
| 5 | 深棕 | #A06840 | 深色肤色 |
| 6 | 黑 | #6B4423 | 深肤色 |

### 5.5.3 发型选项 (20+)

| 类别 | 发型 | 变体数 |
|------|------|--------|
| 短发 | 波波头、 pixie、 齐耳短发、 纹理短发 | 4 |
| 长发 | 直发、 微卷、 大波浪、 层次长发 | 4 |
| 卷发 | 羊毛卷、 水波纹、 螺旋卷、 非洲卷 | 4 |
| 束发 | 马尾、 双马尾、 丸子头、 双丸子头 | 4 |
| 编发 | 麻花辫、 双麻花辫、 鱼骨辫 | 3 |
| 特殊 | 寸头、 莫西干、 渐变短发、 刘海造型 | 4+ |

每种发型支持基础色(黑/深棕/浅棕/金/红棕/灰白)6色。发型用Skia Path定义SVG路径。

### 5.5.4 服装映射规范 (简化颜色+类型)

| 项目 | 规范 | 说明 |
|------|------|------|
| 映射级别 | 颜色+类型，非精确UV纹理 | 简化方案，换装时映射主色+服装类型 |
| 颜色提取 | 从服装图片提取主色(hex) | 后端Python提取或前端取色 |
| 类型映射 | tshirt/hoodie/jacket/dress/jeans/skirt等 | Skia按类型绘制对应轮廓+填色 |
| 配饰映射 | 帽子/围巾/眼镜/包包 | 简化图形叠加 |
| 鞋类映射 | sneakers/boots/sandals/heels | 简化鞋型轮廓+填色 |

### 5.5.5 动画规范 (Skia本地动画)

| 项目 | 规范 | 说明 |
|------|------|------|
| 渲染方式 | react-native-skia + useFrameCallback | 客户端实时绘制，无预渲染 |
| 帧率 | 60fps (设备原生) | Skia硬件加速 |
| 基础动画 | 呼吸(缩放)/挥手(旋转)/点头(位移) | 3个标配动画，Skia属性动画 |
| 情绪动画 | 开心(跳跃)/思考(歪头)/比心(手部) | 3个情绪动画 |
| 换装动画 | 淡入淡出颜色/类型切换 | 换装时平滑过渡 |
| 交互触发 | 点击/长按/页面切换 | 触发对应动画状态 |

### 5.5.6 参考风格

| 参考产品 | 借鉴点 | 差异化方向 |
|---------|--------|-----------|
| POP MART | 搪胶质感、精致细节、高饱和度 | 矢量版潮玩风，融入服装搭配元素 |
| Zepeto | 虚拟形象社交、换装玩法 | 更轻量的Q版，非3D |
| 小红书Q版头像 | 简洁可爱、时尚感 | AI搭配联动，非静态头像 |
| 元气骑士 | Q版角色设计、圆润线条 | 时尚感更强，非游戏角色 |

---

## 六、AI Prompt工程方案

### 6.1 AI造型师系统Prompt架构

```
系统Prompt = 身份定义 + 能力边界 + 行为规则 + 输出格式 + 知识注入
```

**分层Prompt设计**:

| 层 | 内容 | 注入时机 | 长度 |
|----|------|---------|------|
| 基础身份 | "你是AI造型师小衣..." | 创建会话时 | ~500字 |
| 用户画像 | 体型/色彩季型/风格偏好 | 创建会话时 | ~200字 |
| 场景知识 | 当前季节/热门趋势/场合规则 | 每次对话时 | ~300字 |
| 对话上下文 | 最近10轮对话历史 | 每次对话时 | ~2000字 |
| 商品知识 | 匹配到的商品属性 | 推荐时 | ~500字 |

### 6.2 Prompt质量标准

- 回复长度: 100-300字(简洁有力)
- 必须包含具体理由(为什么推荐这个搭配)
- 推荐搭配时必须输出结构化JSON(outfit块)
- 语气: 温暖专业，像时尚杂志编辑
- 不确定时主动追问，不瞎推荐
- 回复必须包含emoji增加亲和力(可选)

---

## 七、数据策略

### 7.1 种子数据方案 (LLM生成+质量管控)

**Phase 1种子数据 (由F3 Session生成)**:
- 10个品牌 (UNIQLO, ZARA, H&M, MUJI, 太平鸟, 波司登, 李宁, 安踏, Nike, Adidas)
- 6个分类树 (上装/下装/外套/鞋履/配饰/连衣裙, 含子分类)
- 200条服装商品 (覆盖所有分类, 中文真实名称)
- 50条时尚搭配规则 (色彩/场合/体型/季节)

**质量管控流程**:
```
LLM生成数据 → JSON Schema验证 → 去重检查 → 合理性检查 → 导入
```

**合理性检查规则**:
- 价格范围合理 (T恤49-399, 外套199-2999, 鞋履99-1999)
- 季节/场合/风格标签组合合理
- 颜色名称在预定义列表中
- 材质名称在预定义列表中

### 7.2 后续数据扩展 (Phase 5+)

| 数据来源 | 数量 | 方式 | 时间 |
|---------|------|------|------|
| LLM继续生成 | 1000条 | 自动脚本 | Phase 2期间 |
| 淘宝开放平台 | 5000条 | API采集 | Phase 5 |
| 小红书OOTD | 规则数据 | 爬虫+LLM提取 | Phase 5 |
| 用户上传 | 持续增长 | App内功能 | 上线后 |

---

## 八、成本与资源规划

### 8.1 开发期成本

| 项目 | 成本 | 时机 |
|------|------|------|
| Q版形象极简素材 | ¥0 (极简占位自绘) | Phase 2.5 |
| 时尚规则+标注数据 | ¥1,000-2,000 | Phase 3 |
| FashionCLIP LoRA微调(可选) | ¥500 | Phase 3+ |
| **开发期总计** | **¥1,500-2,500** | |

### 8.2 运营期月成本 (MVP阶段)

| 项目 | 月成本 | 说明 |
|------|--------|------|
| 云服务器(阿里云2C4G) | ¥200 | 后端+数据库 |
| GLM-5 API | ¥500-2,000 | AI造型师+文生图搭配可视化 |
| CDN | ¥100-300 | 静态资源加速 |
| 对象存储 | ¥50-200 | 图片+头像素材 |
| 短信(阿里云) | ¥100-500 | 登录验证 |
| 文生图搭配展示 | ¥10-100 | ~0.01元/张，日均<50张 |
| 域名+SSL | ¥100 | |
| **MVP月总计** | **¥1,060-3,400** | 无GPU、无VTO API、EPROLO全Mock |

**关键省钱策略**: 移除A100 GPU依赖，Q版形象用react-native-skia客户端渲染(零服务端成本)，AI用Agent模式调LLM API(无需GPU训练)，虚拟试衣用云端API按量付费。成本较v3.0降低85%。

**注意**: 宪法(00-PROJECT-CONSTITUTION.md)的月度成本为 ¥960-3,100(不含CDN)。本计划含CDN ¥100-300，因此为 ¥1,060-3,400。两份文档的差额来自CDN成本。

### 8.3 预算时间线

| 阶段 | 月成本 | 累计 | 触发条件 |
|------|--------|------|---------|
| 开发期(月1) | ¥1,500-2,500(一次性) | ¥1,500-2,500 | 一次性 |
| MVP上线(月2) | ¥950-3,500 | ¥2,450-6,000 | 产品上线 |
| 用户增长(月3-6) | ¥2,000-6,000 | 按效果决定 | DAU > 100 |
| 自部署ML(月6+) | ¥3,000-8,000 | 需求验证后 | 日均试衣 > 100 |

---

## 九、质量门控汇总

### Phase 0 → Phase 1 的门控

- [ ] 市场调研报告完成，确认需求存在
- [ ] 竞品分析发现 >= 3个差异化机会
- [ ] 设计Token系统定义完成
- [ ] AI Prompt初步测试通过
- **Go/No-Go**: 如果市场调研否定，到此为止

### Phase 1 → Phase 2 的门控

- [ ] Prisma schema验证通过
- [ ] TypeScript编译零错误(后端+移动端)
- [ ] Docker Compose启动成功
- [ ] 种子数据导入成功
- [ ] Expo可启动

### Phase 2 → Phase 3 的门控

- [ ] 所有7个后端模块独立测试通过
- [ ] API端点Postman/curl测试通过
- [ ] 每模块80%+测试覆盖率
- [ ] 统一响应格式验证通过

### Phase 3 → Phase 4 的门控

- [ ] GLM-5 API真实调用成功
- [ ] SSE流式输出验证通过
- [ ] AI回复质量人工评估 >= 7/10
- [ ] 推荐结果相关性合格

### Phase 4 → Phase 5 的门控

- [ ] 核心页面Android真机可运行
- [ ] 导航流程完整(登录→引导→首页→详情→返回)
- [ ] 首页Q版形象渲染+动画正常
- [ ] AI造型师卡片交互→搭配卡片结果完整
- [ ] 衣橱Q版形象可视化可交互
- [ ] 白底设计系统统一(零emoji, SVG图标)
- [ ] 无TypeScript编译错误

### Phase 5 → Phase 6 的门控

- [ ] 社区发帖/评论/点赞完整(独立页面, 小红书风格)
- [ ] 社交关注系统正常
- [ ] 试衣完整流程(选照片→等待→看结果)
- [ ] 定制订单: 创建→EPROLO POD→状态追踪
- [ ] 设计市集: 上传设计→浏览→购买
- [ ] 高端定制: 工作室列表→提交需求→在线沟通→报价→确认支付
- [ ] 全功能E2E测试通过

### Phase 6 → Phase 7 的门控

- [ ] E2E测试通过率 > 95%
- [ ] 无P0/P1 bug
- [ ] API P95响应 < 500ms
- [ ] 安全审计无高危漏洞

### 上线门控

- [ ] APK可安装运行
- [ ] CI/CD流水线绿色
- [ ] API文档完整
- [ ] 运维文档就绪
- [ ] ICP备案材料准备

---

## 十、技术架构细节补充

### 10.1 中间件选型

| 中间件 | 用途 | 版本 | 备注 |
|--------|------|------|------|
| BullMQ | 任务队列(试衣/通知) | 最新 | 基于Redis，NestJS原生支持 |
| NestJS Schedule | 定时任务(趋势更新) | 最新 | 内置 |
| Passport | 认证策略 | 最新 | JWT策略 |
| Helmet | HTTP安全头 | 最新 | NestJS集成 |
| Throttler | API限流 | 最新 | 防滥用 |

### 10.2 安全架构

| 层 | 措施 | 实现 |
|----|------|------|
| 传输层 | HTTPS | Nginx反向代理 |
| 认证层 | JWT + 短信验证码 | Passport + bcrypt |
| 授权层 | RBAC | 自定义Guard |
| 输入层 | 参数验证 | class-validator |
| 输出层 | XSS过滤 | 管道过滤 |
| 数据层 | SQL参数化 | Prisma自动防注入 |
| 文件层 | 类型+大小限制 | Multer配置 |
| 限流层 | IP+用户维度 | ThrottlerModule |

### 10.3 监控方案

| 指标 | 工具 | 告警阈值 |
|------|------|---------|
| API响应时间 | NestJS Logger + 自定义 | P95 > 1000ms |
| 错误率 | NestJS Logger | > 5% |
| 数据库连接 | Prisma Logger | 连接池满 |
| Redis连接 | ioredis事件 | 断连 |
| 磁盘使用 | Node.js os模块 | > 80% |
| GPU使用 | AutoDL监控 | > 90% |

---

## 十一、风险缓解计划

### 11.1 最高优先级风险

**风险: Trae GLM5.1代码质量不如Claude**
- 概率: 60%
- 影响: 高
- 缓解:
  1. 每个Session提示词极其详细，减少自由发挥空间
  2. Claude Code做Phase级别的质量审查
  3. 不合格的代码由Claude Code重写，不返给Trae修改
  4. 测试覆盖率作为硬性门槛

**风险: 市场验证发现产品不可行**
- 概率: 30%
- 影响: 低(如果Phase 0就发现)
- 缓解: Phase 0做充分的市场调研，Go/No-Go决策点

**风险: 并行Session集成失败**
- 概率: 25%
- 影响: 高
- 缓解:
  1. 文件隔离设计确保零冲突
  2. 接口合约确保模块可互操作
  3. Phase 6专门的集成Session
  4. Claude Code做集成审查

### 11.2 技术降级方案

| 功能 | 主方案 | 降级方案 | 触发条件 |
|------|--------|---------|---------|
| Q版形象 | Skia极简占位动态绘制 | 静态SVG图片 | Skia兼容性问题 |
| 搭配可视化 | GLM-5文生图穿搭效果图 | 纯文字推荐+搭配卡片 | 文生图API不可用或成本过高 |
| 真实VTO | 延后到Phase 5+(阿里云百炼) | 继续使用文生图 | 文生图效果足够好 |
| AI造型师 | GLM-5 | DeepSeek | GLM-5 API故障 |
| 全文搜索 | Elasticsearch | PostgreSQL tsvector | ES资源不足 |
| 向量搜索 | Qdrant | pgvector | Qdrant资源不足 |
| 知识图谱 | Neo4j | PostgreSQL JSONB规则表 | Neo4j复杂度过高 |
| 推荐算法 | 内容+协同 | 纯热门推荐 | 用户数据不足 |
| 图案编辑器 | WebView+Canvas(核心功能) | 预设图案选择 | Canvas兼容性问题 |
| EPROLO POD | MVP全Mock Provider | 保持Mock直到上线 | 上线前对接真实API |
| 高端定制 | 全流程App内集成 | 轻量入口转微信 | 开发时间不足 |

---

## 十二、文档计划

| 文档 | 负责Session | 阶段 | 位置 |
|------|------------|------|------|
| 市场调研报告 | M1 | Phase 0 | docs/MARKET-RESEARCH.md |
| 竞品分析 | M2 | Phase 0 | docs/COMPETITIVE-ANALYSIS.md |
| 商业模式 | M3 | Phase 0 | docs/BUSINESS-MODEL.md |
| API文档 | 自动生成 | Phase 2 | Swagger/OpenAPI |
| 部署指南 | K1 | Phase 7 | docs/DEPLOYMENT.md |
| 运维手册 | K1 | Phase 7 | docs/OPS-GUIDE.md |
| ICP备案指南 | K5 | Phase 7 | docs/ICP-GUIDE.md |
| 用户手册 | K4 | Phase 7 | docs/USER-GUIDE.md |

---

*本文档为AiNeed V3.3的全面开发计划。与00-PROJECT-CONSTITUTION.md(v3.3)配合使用。所有Trae Session必须先读宪法再读本计划。*
