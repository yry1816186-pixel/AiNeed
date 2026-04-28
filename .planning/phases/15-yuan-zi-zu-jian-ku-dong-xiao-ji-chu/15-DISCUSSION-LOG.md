# Phase 15: 原子组件库 + 动效基础 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-28
**Phase:** 15-原子组件库+动效基础
**Areas discussed:** 组件重建策略, SmartImage 实现方案, 动效预设与 Lottie 集成, 组件 API 设计风格

---

## 组件重建策略

| Option   | Description                                           | Selected |
| -------- | ----------------------------------------------------- | -------- |
| 全量重建 | 重写所有 8 个组件，确保 100% token 引用 + 新 API 统一 | ✓        |
| 增量增强 | 保留现有组件核心逻辑，仅替换硬编码值                  |          |
| 混合策略 | 关键组件全量重建，次要组件增量增强                    |          |

**User's choice:** 全量重建
**Notes:** 用户追求组件库的完全一致性

| Option           | Description                              | Selected |
| ---------------- | ---------------------------------------- | -------- |
| primitives/ 统一 | 统一放在 primitives/，每个组件一个文件夹 | ✓        |
| 新建 components/ | 新建 design-system/components/ 目录      |          |
| 合并到 ui/       | 直接在 ui/ 下重建                        |          |

**User's choice:** primitives/ 统一

| Option        | Description             | Selected |
| ------------- | ----------------------- | -------- |
| 立即清理重叠  | 删除 ui/ 中重叠组件     |          |
| 保留 ui/ 不动 | 留技术债务              |          |
| 全量迁移引用  | 重建同时更新所有 import | ✓        |

**User's choice:** 全量迁移引用

| Option                   | Description          | Selected |
| ------------------------ | -------------------- | -------- |
| ui/index.ts 做 re-export | 兼容层零破坏性迁移   |          |
| 直接更新 import          | 全量更新 import 路径 | ✓        |
| 不管 ui/index.ts         | 保留旧导出           |          |

**User's choice:** 直接更新 import

| Option             | Description       | Selected |
| ------------------ | ----------------- | -------- |
| 保留业务组件在 ui/ | 仅更新内部 import |          |
| 清空 ui/ 目录      | 完全清空          | ✓        |

**User's choice:** 清空 ui/ 目录

| Option              | Description                       | Selected |
| ------------------- | --------------------------------- | -------- |
| 迁移到 feature 目录 | ChatBubble → features/stylist/ 等 | ✓        |
| 新建 composed/ 目录 | primitives + composed 分层        |          |
| 直接删除            | 后续 Phase 重建                   |          |

**User's choice:** 迁移到 feature 目录

---

## SmartImage 实现方案

| Option                  | Description                         | Selected |
| ----------------------- | ----------------------------------- | -------- |
| expo-image 封装         | 安装 expo-image，封装为 SmartImage  | ✓        |
| 原生 Image + 自定义缓存 | 零新依赖但复杂                      |          |
| react-native-fast-image | Abandonware，REQUIREMENTS.md 已排除 |          |

**User's choice:** expo-image 封装

| Option                          | Description        | Selected |
| ------------------------------- | ------------------ | -------- |
| blurhash 优先 + 缩略图 fallback | 渐进式加载效果最佳 | ✓        |
| 仅缩略图占位                    | 简单但效果差       |          |
| 纯色占位                        | 无内容暗示         |          |

**User's choice:** blurhash 优先 + 缩略图 fallback

| Option       | Description                  | Selected |
| ------------ | ---------------------------- | -------- |
| 后端计算存储 | Prisma 新增字段 + 上传时计算 | ✓        |
| 前端计算缓存 | 首次加载延迟                 |          |
| 延后后端部分 | 先用缩略图占位               |          |

**User's choice:** 后端计算存储

| Option          | Description              | Selected |
| --------------- | ------------------------ | -------- |
| 内置 CDN 参数化 | 根据容器尺寸自动附加参数 | ✓        |
| 外部拼接参数    | 灵活但重复逻辑           |          |
| 不做 CDN 参数化 | 后续 Phase               |          |

**User's choice:** 内置 CDN 参数化

| Option            | Description            | Selected |
| ----------------- | ---------------------- | -------- |
| 延后替换          | Phase 15 只做组件      |          |
| Phase 15 全量替换 | 替换所有 86 个裸 Image | ✓        |

**User's choice:** Phase 15 全量替换

---

## 动效预设与 Lottie 集成

| Option                   | Description                          | Selected |
| ------------------------ | ------------------------------------ | -------- |
| 扩展为 Preset Hooks      | usePressAnimation/useFadeIn 等 hooks | ✓        |
| 新建 animationPresets.ts | 组件友好格式                         |          |
| 沿用现有 animations.ts   | 已足够                               |          |

**User's choice:** 扩展为 Preset Hooks

| Option            | Description           | Selected |
| ----------------- | --------------------- | -------- |
| 延后替换          | Phase 15 只做 hooks   |          |
| Phase 15 全量替换 | 替换 253 个硬编码动效 | ✓        |

**User's choice:** Phase 15 全量替换

| Option                | Description                | Selected |
| --------------------- | -------------------------- | -------- |
| Phase 15 集成启动流程 | lottie-react-native 已安装 | ✓        |
| 不属于 Phase 15       | Phase 14 负责              |          |

**User's choice:** Phase 15 集成启动流程

---

## 组件 API 设计风格

| Option                   | Description                            | Selected |
| ------------------------ | -------------------------------------- | -------- |
| Variant 系统             | variant/size/tone Props 控制，内部封装 | ✓        |
| 开放 style 覆盖          | 灵活但易破坏一致性                     |          |
| 混合：Variant + 有限覆盖 | style 仅限布局调整                     |          |

**User's choice:** Variant 系统

| Option               | Description                | Selected |
| -------------------- | -------------------------- | -------- |
| variants.ts 集中定义 | 每个 folder 下 variants.ts | ✓        |
| 组件内处理           | switch/if 处理 variant     |          |

**User's choice:** variants.ts 集中定义

| Option     | Description                        | Selected |
| ---------- | ---------------------------------- | -------- |
| 3 文件结构 | index.tsx + types.ts + variants.ts | ✓        |
| 单文件     | 所有逻辑一个文件                   |          |
| 5 文件结构 | + styles.ts + animations.ts        |          |

**User's choice:** 3 文件结构

| Option     | Description                               | Selected |
| ---------- | ----------------------------------------- | -------- |
| 内置无障碍 | accessibilityLabel/role/state + 44px 触控 | ✓        |
| 可选无障碍 | 调用方负责传入                            |          |
| 延后无障碍 | 后续 Phase                                |          |

**User's choice:** 内置无障碍

| Option              | Description                              | Selected |
| ------------------- | ---------------------------------------- | -------- |
| Children + Slots    | 简单直观                                 |          |
| Compound Components | <Card><Card.Header>... 嵌套              | ✓        |
| 混合模式            | 简单组件用 children，复杂组件用 Compound |          |

**User's choice:** Compound Components

---

## the agent's Discretion

- 具体 variant 名称和样式值
- Preset Hooks 具体签名和返回值
- CDN URL 模板格式
- blurhash 编码参数
- Splash Lottie 播放逻辑
- 后端 blurhash 库选择
- 业务组件迁移到 feature 的具体位置

## Deferred Ideas

None — discussion stayed within phase scope
