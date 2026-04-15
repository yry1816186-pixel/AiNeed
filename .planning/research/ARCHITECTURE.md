# Architecture Research — 规整目标架构

**Project:** 寻裳 (XunO) 代码规整
**Researched:** 2026-04-16

## 核心发现：循环依赖是最大架构问题

通过分析所有 `forwardRef` 使用，发现 11 处循环依赖。最严重的是 `AiStylistModule <-> RecommendationsModule`，表明 AI 造型师和推荐引擎的边界划分有误。

## 后端目标架构：6 域 + 1 平台层

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ identity │ │ ai-core  │ │ fashion  │ │ commerce │  │
│  │   域     │ │   域     │ │   域     │ │   域     │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘  │
│       │             │             │             │        │
│  ┌────┴─────┐ ┌────┴─────┐                         │
│  │  social  │ │customiz- │                         │
│  │   域     │ │  ation域 │                         │
│  └────┬─────┘ └────┬─────┘                         │
│       │             │                                  │
├───────┴─────────────┴──────────────────────────────────┤
│                    Platform Layer                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ recommendations, admin, merchant, analytics,     │  │
│  │ notification, feature-flags, health, queue       │  │
│  └──────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│                    Common Layer                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ prisma, redis, storage, encryption, guards,      │  │
│  │ interceptors, filters, middleware, logger, etc.   │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 域划分详情

| 域 | 包含模块 | 依赖方向 |
|---|---|---|
| **identity** | auth, users, profile, onboarding, privacy | 仅依赖 common + platform |
| **ai-core** | ai-stylist, try-on, ai, ai-safety, photos | 依赖 identity + platform |
| **fashion** | clothing, brands, search, favorites, wardrobe-collection, style-quiz, style-profiles, weather | 依赖 identity + platform |
| **commerce** | cart, order, payment, coupon, address, refund-request, subscription, stock-notification, size-recommendation | 依赖 identity + fashion + platform |
| **social** | community, blogger, consultant, chat | 依赖 identity + fashion + platform |
| **customization** | customization, share-template | 依赖 identity + fashion + platform |
| **platform** | recommendations, admin, merchant, analytics, notification, feature-flags, health, queue, metrics, demo, code-rag | 仅依赖 common |

### 废弃模块

| 模块 | 原因 | 风险 |
|------|------|------|
| demo | 仅自引用，无外部消费者 | 低 |
| code-rag | 仅自引用，无外部消费者 | 低 |

### 合并建议

| 合并后 | 合并来源 | 理由 |
|--------|----------|------|
| style-profiles | style-profiles + style-quiz | 同一业务域（风格评估） |
| wardrobe | wardrobe-collection + favorites | 同一业务域（个人衣橱管理） |
| notification | notification + stock-notification | 同一业务域（消息推送） |

## 移动端目标架构：Feature-Based

```
src/
├── app/                    # 应用入口、导航、Provider
│   ├── App.tsx
│   ├── navigation/
│   └── providers/
├── features/               # 按功能域组织
│   ├── auth/               # 认证域
│   │   ├── screens/
│   │   ├── components/
│   │   ├── stores/
│   │   ├── hooks/
│   │   └── services/
│   ├── home/               # 首页域
│   ├── stylist/            # AI 造型师域
│   ├── tryon/              # 虚拟试衣域
│   ├── wardrobe/           # 衣橱域
│   ├── shopping/           # 购物域
│   ├── community/          # 社区域
│   ├── profile/            # 个人域
│   └── onboarding/         # 引导域
├── shared/                 # 跨功能共享
│   ├── components/         # 基础 UI 组件
│   ├── hooks/              # 通用 hooks
│   ├── stores/             # 全局 stores
│   ├── services/           # API 客户端等
│   ├── utils/              # 工具函数
│   └── types/              # 类型定义
├── design-system/          # 设计系统
│   ├── tokens/             # 颜色、间距、字体等
│   ├── primitives/         # 原子组件
│   └── patterns/           # 组合模式
└── polyfills/              # Expo 模块 polyfill
```

### Store 合并建议

| 合并后 | 合并来源 | 理由 |
|--------|----------|------|
| authStore | auth.store + user.store | 用户和认证不可分 |
| quizStore | quizStore + styleQuizStore | 同一业务域 |
| clothingStore | clothingStore + homeStore | 首页数据即服装数据 |

## AI 服务目标架构

```
ml/
├── api/
│   ├── main.py             # 入口（移除 sys.path hack）
│   ├── routes/
│   │   ├── stylist.py      # 合并 stylist_chat + intelligent_stylist_api
│   │   ├── tryon.py        # 虚拟试衣
│   │   ├── analysis.py     # 合并 body_analysis + style_analysis + photo_quality
│   │   └── health.py       # 健康检查
│   └── schemas/
├── services/
│   ├── stylist/            # 造型师相关服务
│   ├── tryon/              # 试衣相关服务
│   ├── analysis/           # 分析相关服务
│   └── common/             # 共享服务
├── config/
└── pyproject.toml          # 替代 requirements.txt
```

## 构建顺序

```
Phase 0: 准备（Git Hooks, CI, 清理）
    ↓
Phase 1: 设计系统统一（Token 迁移, codemod）
    ↓
Phase 2: 后端域划分（identity → platform → fashion → ai-core → commerce → social → customization）
    ↓
Phase 3: 移动端重组（shared → design-system → features/*）
    ↓
Phase 4: AI 服务规整
    ↓
Phase 5: 质量提升（any 消灭, 测试覆盖）
```

每步都有回归测试保障，确保不破坏现有功能。
