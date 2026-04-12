# AiNeed V3

AI私人造型师App — AI理解用户意图+画像+衣橱，生成搭配方案，文生图可视化展示，Q版形象映射，定制生产，社区分享。

## 技术栈

| 层 | 技术 |
|----|------|
| 移动端 | React Native + Expo SDK 52 + TypeScript (strict) |
| 状态管理 | Zustand + TanStack Query |
| 后端 | NestJS 11.x + Prisma 6.x |
| 数据库 | PostgreSQL 16 (pgvector) + Redis 7 |
| 向量搜索 | Qdrant v1.12+ |
| 知识图谱 | Neo4j 5.x |
| 全文搜索 | Elasticsearch 8.x |
| 对象存储 | MinIO |
| AI | GLM-5 API + DeepSeek (fallback) |
| Q版形象 | react-native-skia 动态绘制 |
| 定制 | EPROLO POD (MVP全Mock) |

## 目录结构

```
V3/
├── apps/
│   ├── backend/          # NestJS 后端
│   ├── mobile/           # React Native App
│   └── shared/types/     # 共享 TypeScript 类型定义
├── docker/               # Docker Compose (PG/Redis/Qdrant/Neo4j/ES/MinIO)
├── data/                 # 种子数据 + 知识图谱
├── docs/                 # 项目文档
├── package.json          # Monorepo 根配置
├── tsconfig.base.json    # 共享 TS 配置
└── .env.example          # 环境变量模板
```

## 快速启动

```bash
# 1. 启动基础设施
cd docker && docker-compose up -d

# 2. 配置环境变量
cp .env.example .env

# 3. 安装依赖 & 初始化数据库
cd apps/backend && npm install
npx prisma db push
npx tsx prisma/seed.ts

# 4. 启动后端
npm run start:dev

# 5. 启动移动端
cd ../mobile && npm install
npx expo start
```

## 开发规范

- TypeScript strict mode，零 any
- 后端模块结构: `.module.ts / .controller.ts / .service.ts / .dto.ts`
- 移动端: Expo Router 文件路由 + Zustand + TanStack Query
- Git 分支: `main / feature/* / fix/*`
- 提交格式: `feat: / fix: / refactor: / chore:`
- Count 字段必须通过 Prisma 原子操作更新
