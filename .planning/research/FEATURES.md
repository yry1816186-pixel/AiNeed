# Features Research — 代码规整能力矩阵

**Project:** 寻裳 (XunO) 代码规整
**Researched:** 2026-04-16

## Table Stakes（必须有，否则开发者无法有效工作）

### 设计系统

| 能力 | 复杂度 | 依赖 |
|------|--------|------|
| 统一颜色 Token 体系 | 低 | 无 |
| 统一间距 Token 体系 | 低 | 无 |
| 统一字体 Token 体系 | 低 | 无 |
| 基础 UI 组件库（Button, Card, Input, etc.） | 中 | Token 体系 |
| 暗色模式支持 | 中 | Token 体系 |
| 加载/空/错误状态组件 | 低 | 基础组件 |

### 工程规范

| 能力 | 复杂度 | 依赖 |
|------|--------|------|
| Git Hooks（pre-commit lint, commit-msg 格式） | 低 | husky + lint-staged |
| 统一 ESLint 配置（monorepo 级别） | 低 | 无 |
| 统一 Prettier 配置 | 低 | 无 |
| CI 流水线基础（lint + typecheck + test） | 中 | 无 |
| 根目录清理 | 低 | 无 |
| 命名规范强制 | 低 | ESLint 规则 |

### 后端架构

| 能力 | 复杂度 | 依赖 |
|------|--------|------|
| 模块域划分（6 域 + 1 平台层） | 高 | 无 |
| 循环依赖消除 | 高 | 域划分 |
| 模块边界规则强制 | 中 | eslint-plugin-boundaries |
| 共享包实际使用（@xuno/types, @xuno/shared） | 中 | 无 |

### 代码质量

| 能力 | 复杂度 | 依赖 |
|------|--------|------|
| no-explicit-any: error | 低 | ESLint 配置 |
| 现有 any 类型修复 | 高 | codemod |
| 关键路径单元测试 | 中 | 无 |
| E2E 测试覆盖核心流程 | 中 | 无 |

## Differentiators（竞争优势，提升开发体验）

| 能力 | 复杂度 | 依赖 | 价值 |
|------|--------|------|------|
| Turborepo 增量构建 | 中 | pnpm workspace | 构建速度 3-5x |
| dependency-cruiser 可视化 | 低 | 无 | 架构理解 |
| Design Token codemod 自动迁移 | 中 | Token 体系 | 批量替换 2600+ 处 |
| Changesets 版本管理 | 低 | Turborepo | 包版本一致性 |
| NestJS 模块域文档自动生成 | 中 | 域划分 | 新人上手 |
| 移动端 feature-based 架构 | 高 | 无 | 代码组织清晰度 |

## Anti-Features（明确不做）

| 功能 | 原因 |
|------|------|
| 引入新 UI 框架（Tamagui/Unistyles） | 现有 Token 体系已足够，迁移成本远大于收益 |
| 全面重写任何模块 | 规整不是重写，保留现有业务逻辑 |
| 数据库 Schema 重设计 | 超出规整范围，风险过高 |
| 升级锁定的 RN 依赖 | 兼容性问题未解决，暂不碰 |
| 100% 测试覆盖率 | 不现实，优先覆盖关键路径 |
| 微服务拆分 | 过度工程，monorepo 内模块化已足够 |
| HarmonyOS 应用规整 | 不在本次范围 |
| Nx monorepo 工具 | 过于重量级，Turborepo 更轻量 |

## 依赖关系图

```
Token 体系 ──→ 基础组件 ──→ 状态组件
    │              │
    └──→ codemod ──┘

Git Hooks ──→ CI 流水线
    │
    └──→ 命名规范

域划分 ──→ 循环依赖消除 ──→ 边界规则
    │
    └──→ 共享包使用

ESLint strict ──→ any 修复 ──→ 测试覆盖
```
