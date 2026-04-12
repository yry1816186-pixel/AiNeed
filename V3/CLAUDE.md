# AiNeed V3 - Project Instructions

## Project Overview

AI 私人造型师 App (NestJS + React Native + Expo)。面向中国大陆市场。

**项目宪法**: `DELIVERY-V3/00-PROJECT-CONSTITUTION.md` (v3.3) -- 所有开发必须遵守
**主计划**: `DELIVERY-V3/04-MASTER-PLAN.md`
**GSD 规划**: `.planning/` 目录

## Architecture

```
apps/
├── backend/     # NestJS 11.x + Prisma 6.x + PostgreSQL 16.x
├── mobile/      # React Native + Expo SDK 52
└── shared/      # 共享 TypeScript 类型
```

## Key Conventions

- TypeScript strict mode, 零 any
- 函数 <50 行, 文件 <500 行
- 后端: 模块化结构 (.module/.controller/.service/dto)
- 移动端: Expo Router 文件路由 + Zustand + TanStack Query
- 统一 API 响应: `{ success, data, error?, meta? }`
- 测试覆盖率目标: 80%+

## Commands

```bash
# 后端
cd apps/backend && npx tsc --noEmit     # 类型检查
cd apps/backend && npm test              # 运行测试
cd apps/backend && npx jest --coverage   # 测试覆盖率

# 移动端
cd apps/mobile && npx tsc --noEmit       # 类型检查

# Docker
cd docker && docker-compose up -d         # 启动服务

# 数据库
cd apps/backend && npx prisma db push     # 推送 schema
cd apps/backend && npx tsx prisma/seed.ts # 种子数据
```

## Module Boundaries

每个后端模块写入隔离的 `src/modules/{module}/` 目录。禁止跨模块修改。
文件隔离矩阵详见主计划文档。
