# AiNeed 项目 CLAUDE.md

## 项目概述

AiNeed 是 AI 驱动的私人形象定制平台。用户建立画像 -> AI 造型师推荐穿搭 -> 多模态 API 生成换装效果图 -> 电商购买。NestJS 后端 + React Native 移动端 + Python AI 服务，pnpm monorepo。

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
AiNeed/
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
# 安装依赖
pnpm install

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
- TryOn 服务仍引用 CatVTON，需改为 GLM API
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
