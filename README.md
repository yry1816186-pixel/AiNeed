# 寻裳 (XunO)

AI 驱动的智能私人形象定制平台。基于用户画像（体型/肤色/风格/场合），提供精准穿搭推荐，通过多模态 AI 生成换装效果图。

## 核心功能

- **AI 造型师** — 多轮对话式穿搭咨询，基于用户画像精准推荐
- **虚拟试衣** — 调用 GLM 多模态 API 生成换装效果图
- **智能推荐** — 基于用户偏好和风格的个性化推荐
- **电商闭环** — 商品浏览、购物车、支付、订单

## 技术架构

```
XunO/                     # pnpm monorepo
├── apps/backend/          # NestJS 11.x API (TypeScript)
├── apps/mobile/           # React Native 0.76.8 (Expo 52)
├── ml/services/           # Python AI 服务层 (GLM API)
└── packages/types/        # 共享 TypeScript 类型
```

**后端**: NestJS + Prisma + PostgreSQL + Redis + BullMQ + MinIO
**移动端**: React Native + Zustand + TanStack Query
**AI**: GLM API (智谱 AI) 多模态，文生图/图生图

## 快速开始

### 前置条件

- Node.js 20+
- pnpm 8+
- Python 3.11+
- Docker (可选，用于本地基础设施)

### 安装

```bash
# 安装依赖
pnpm install

# 配置环境变量
cp apps/backend/.env.example apps/backend/.env
cp ml/.env.example ml/.env

# 启动基础设施 (PostgreSQL, Redis, MinIO)
docker-compose -f docker-compose.dev.yml up -d

# 初始化数据库
cd apps/backend && npx prisma db push && npx tsx prisma/seed.ts

# 启动后端
cd apps/backend && pnpm dev

# 启动移动端
cd apps/mobile && npx react-native start --port 8081
```

### 测试账号

- 邮箱: `test@example.com`
- 密码: `Test123456!`

## API 文档

后端启动后访问: `http://localhost:3001/api/docs` (Swagger)

## License

MIT
