# 寻裳 项目 CLAUDE.md

## 项目概述

寻裳是 AI 驱动的私人形象定制平台。用户建立画像 -> AI 造型师推荐穿搭 -> 多模态 API 生成换装效果图 -> 电商购买。NestJS 后端 + React Native 移动端 + Python AI 服务，pnpm monorepo。

## 技术栈

### 前端
- **React Native 0.76.8** (Expo 52) - 跨平台移动端
- **TypeScript 5.x** - 类型安全
- **React Navigation 6** - Stack + Bottom Tabs 导航
- **Zustand** - 状态管理
- **TanStack Query** - 服务端状态
- **React Paper** - UI 组件库

### 后端
- **NestJS 11.x** - Node.js 框架
- **Prisma 5.x** - ORM
- **PostgreSQL 16** - 主数据库
- **Redis 7** - 缓存 + 队列
- **MinIO** - 对象存储
- **JWT + Passport** - 认证
- **BullMQ** - 异步任务队列
- **Socket.IO** - WebSocket 实时通信

### AI 服务 (Python)
- **GLM API (智谱 AI)** - 多模态 AI，文生图/图生图
- **FastAPI** - Python AI 服务框架
- 虚拟换装通过调用 GLM 多模态 API 实现，不使用本地推理

## Monorepo 结构

```
XunO/
├── apps/
│   ├── backend/          # NestJS 后端 (端口 3001)
│   └── mobile/           # React Native 移动端
├── ml/                   # Python AI 服务层
│   └── services/         # GLM API 封装 (造型师/试衣/分析)
├── packages/
│   └── types/            # 共享 TypeScript 类型
├── scripts/              # 工具脚本
└── docs/                 # 项目文档
```

## 服务端口

| 服务 | 端口 |
|------|------|
| Backend API | 3001 |
| Metro (移动端) | 8081 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| MinIO | 9000/9001 |

## 关键路径

### 后端
- `apps/backend/src/modules/` - 业务模块 (35 个)
- `apps/backend/src/common/` - guards, filters, middleware, encryption
- `apps/backend/prisma/schema.prisma` - 数据库 Schema
- `apps/backend/src/main.ts` - 入口

### 移动端
- `apps/mobile/src/screens/` - 页面组件
- `apps/mobile/src/stores/` - Zustand stores
- `apps/mobile/src/services/` - API 服务层
- `apps/mobile/App.tsx` - 6-tab 导航 (Home/Explore/Heart/Cart/Wardrobe/Profile)

### AI 服务
- `ml/services/intelligent_stylist_service.py` - GLM-5 造型师核心
- `ml/services/visual_outfit_service.py` - GLM-5 穿搭可视化
- `ml/services/body_analyzer.py` - 体型分析
- `ml/services/ai_service.py` - 主 AI 服务入口

## 常用命令

```bash
# 安装依赖（使用国内镜像源，避免下载超时）
pnpm install --registry=https://registry.npmmirror.com
# 备用：官方源（国内较慢）
# pnpm install --registry=https://registry.npmjs.org

# 启动后端
cd apps/backend && pnpm dev

# 启动移动端
cd apps/mobile && npx react-native start --port 8081

# 数据库
cd apps/backend && npx prisma db push
cd apps/backend && npx tsx prisma/seed.ts

# Docker 基础设施
docker-compose -f docker-compose.dev.yml up -d

# Android 构建
cd apps/mobile && npx react-native run-android

# Python AI 服务（使用国内镜像源安装依赖）
cd ml && pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple --trusted-host pypi.tuna.tsinghua.edu.cn
# 备用：阿里云镜像
# cd ml && pip install -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple/ --trusted-host mirrors.aliyun.com
# 备用：官方 PyPI（国内较慢）
# cd ml && pip install -r requirements.txt
```

## API 端点 (v1)

### 认证
- `POST /api/v1/auth/register` - 注册
- `POST /api/v1/auth/login` - 登录
- `POST /api/v1/auth/refresh` - 刷新 Token
- `GET /api/v1/auth/me` - 当前用户

### AI 造型师
- `POST /api/v1/ai-stylist/sessions` - 创建会话
- `GET /api/v1/ai-stylist/sessions` - 会话列表
- `POST /api/v1/ai-stylist/sessions/:id/messages` - 发消息

### 虚拟试衣
- `POST /api/v1/try-on` - 创建试衣任务
- `GET /api/v1/try-on/history` - 试衣历史

### 服装 & 推荐
- `GET /api/v1/clothing` - 服装列表
- `GET /api/v1/clothing/categories` - 分类
- `GET /api/v1/recommendations` - 推荐

### 用户
- `GET /api/v1/profile` - 用户画像
- `PUT /api/v1/profile` - 更新画像

## 已知问题

- TypeScript errors: `imagePicker.ts` (includeExif), `user-key.service.ts` (encryptionKeySalt)
- TryOn 服务已迁移至 GLM API（CatVTON/IDM-VTON 已移除）
- 后端 `any` 类型约 226 处，移动端约 105 处
- 测试覆盖率低 (后端 ~15%，移动端 ~5%)
- `react-native-screens 4.4.0`, `reanimated 3.16.7`, `svg 15.8.0` 不能升级

## 环境要求

- Node.js 20+ (当前 v24)
- pnpm 8+
- Python 3.11+ (AI 服务)
- Docker 20.10+

## 测试账号

- 邮箱: test@example.com
- 密码: Test123456!

## 安全

- JWT 512-bit 密钥, bcrypt 12 轮
- API 限流 100 req/min/IP
- PII 字段 AES-256-GCM 加密
- Helmet 安全头, CORS 白名单

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

## 高并发子 Agent 协作策略

遇到问题经评估后，在保证安全的前提下，优先使用高等级模型进行高并发子 Agent 并行协作，加速开发进程。

### 核心原则

1. **评估优先**：遇到复杂问题时，先评估任务复杂度、影响范围和安全风险
2. **安全底线**：涉及数据库迁移、支付逻辑、用户数据、生产环境等高风险操作时，必须串行执行并人工确认
3. **高并发并行**：无安全风险的独立任务，尽可能启动多个子 Agent 并行处理
4. **高等级模型**：复杂推理、架构设计、代码审计等任务，优先使用高等级模型（如 chief-architect、backend-architect、security-auditor）

### 适用场景

| 场景 | 策略 | 安全要求 |
|------|------|----------|
| 多文件批量修改 | 并行子 Agent 各负责一组文件 | 每组文件无交叉依赖 |
| 跨模块 Bug 修复 | 并行诊断 + 串行修复 | 修复前确认影响范围 |
| 代码质量审计 | 并行子 Agent 审计不同模块 | 审计只读，不修改代码 |
| 类型修复（any 消除） | 高并发子 Agent 各负责一批文件 | 修复后统一 typecheck 验证 |
| 测试编写 | 并行子 Agent 各负责一个模块 | 测试代码不影响业务逻辑 |
| 架构设计 | 高等级模型（chief-architect） | 设计方案需评审后执行 |

### 执行规则

- **并行上限**：同时启动的子 Agent 不超过 5 个，避免资源争抢
- **结果合并**：所有子 Agent 完成后，统一检查冲突和一致性
- **回滚保障**：每个子 Agent 的修改必须可独立回滚
- **验证门禁**：并行修改后必须运行全量 lint + typecheck + 测试
