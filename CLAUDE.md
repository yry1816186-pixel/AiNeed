# 寻裳 XUNO — CLAUDE.md

## 项目概述

AI 驱动全年龄段穿搭决策平台。核心交互：用户打开 App → 伊伊（AI 角色）主动推送当日穿搭方案 → 对话逼近最优决策 → 虚拟试穿 → 购买闭环。**体验壁垒替代技术壁垒**。

NestJS 后端 + React Native 移动端 + Python AI 服务，pnpm monorepo。

## 技术栈

- **前端**: React Native 0.76.8 (Expo 52) / TypeScript 5.x / React Navigation 6 / Zustand / TanStack Query / React Paper
- **后端**: NestJS 11.x / Prisma 5.x / PostgreSQL 16 / Redis 7 / MinIO / BullMQ
- **AI 服务 (Python)**: FastAPI / GLM-4-Flash / FashionCLIP→Marqo-FashionSigLIP / Edge-TTS
- **构建**: Turborepo / pnpm / Husky + commitlint

## Monorepo 结构

```
AiNeed/
├── apps/
│   ├── backend/          # NestJS 后端 (端口 3001)
│   │   ├── src/domains/  # 8 域: ai-core, commerce, customization, fashion, identity, mobile-api, platform, social
│   │   ├── src/modules/  # 5 公共模块: cache, database, security, system, ws
│   │   └── prisma/       # Schema + migrations + seeds
│   ├── mobile/           # React Native 移动端
│   │   └── src/features/ # 16 功能: auth, commerce, community, consultant, customization, discover, home, notifications, onboarding, profile, search, style-quiz, stylist, today, tryon, wardrobe
│   ├── admin/            # 管理后台 (React)
│   └── harmony/          # 鸿蒙版 (未激活)
├── ml/                   # Python AI 服务
│   ├── services/stylist/ # DialogEngine + FashionRuleLoader + StudioSignalDetector
│   ├── services/tryon/   # VirtualTryOnService
│   └── data/             # JSON 规则 + mock 数据
├── packages/shared/      # 共享 TypeScript 类型
├── .planning/            # GSD 项目管理 (PROJECT/REQUIREMENTS/ROADMAP/STATE)
└── docs/                 # 文档
```

## 核心导航

4-Tab: **Today** / **Discover** / **Stylist** / **Me**

- Today: 场景卡 + 伊伊推荐 + 语音按钮
- Discover: 推荐流 + 策展空间 (saved/wishlist/purchased)
- Stylist: Agent 对话 (状态机 SCENE/DIRECT/CHAT) + 试穿 BottomSheet + 语音
- Me: 个人信息 + 设置

## Onboarding

4 步: 场景选择 → 快速画像(年龄/身高/体重/garmentPreference) → 风格表达 → 让伊伊搭第一套

## 服务端口

| 服务        | 端口      |
| ----------- | --------- |
| Backend API | 3001      |
| Metro       | 8081      |
| PostgreSQL  | 5432      |
| Redis       | 6379      |
| MinIO       | 9000/9001 |

## 常用命令

```bash
pnpm install --registry=https://registry.npmmirror.com
pnpm dev              # 后端
pnpm dev:mobile       # 移动端
pnpm build            # 全量构建
pnpm typecheck        # 类型检查
pnpm lint             # ESLint
pnpm test             # 测试
```

## 当前状态

- **GSD Phase 4 完成** (2026-04-25)，17 plans executed，80% 进度
- **Next: Phase 5** — E2E Integration + Competition Demo
- 42 项冻结决策在 `docs/XUNO_FINAL_PLAN.md`
- 权威 GSD 状态: `.planning/STATE.md`

## 已知约束

- GLM-4-Flash 免费层不保证，需 Qwen fallback
- FashionCLIP 有隐性性别偏见，需多样性约束 (Phase 6)
- 软著 60-90 天关键路径 (Phase 6)
- `react-native-screens 4.4.0`, `reanimated 3.16.7` 不能升级

## 环境要求

Node 20+ | pnpm 8+ | Python 3.11+ | Docker 20.10+

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.

<!-- GSD:workflow-end -->
