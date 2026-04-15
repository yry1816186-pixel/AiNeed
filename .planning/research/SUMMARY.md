# Research Summary — 寻裳代码规整

**Synthesized:** 2026-04-16

## Key Findings

### Stack
- 设计系统并非"四套并行"，而是**StyleSheet + Tokens 执行不彻底**（NativeWind/Paper 几乎未使用）
- 真正需迁移：778 硬编码颜色 + 921 硬编码字体 + 971 硬编码间距 → 已有 Token
- 推荐：Turborepo + husky + lint-staged + eslint-plugin-boundaries + dependency-cruiser
- 不推荐：Nx, Tamagui, Unistyles, 全面重写

### Table Stakes
- 统一 Token 体系（颜色/间距/字体）
- Git Hooks + CI 流水线
- 后端 6 域 + 1 平台层划分
- no-explicit-any: error
- 关键路径测试覆盖

### Architecture
- 后端 35+ 模块 → 6 域 + 1 平台层（identity, ai-core, fashion, commerce, social, customization + platform）
- 移动端 50+ 页面 → feature-based 结构
- AI 服务 → 按能力域重组 + pyproject.toml
- 构建顺序：准备 → 设计系统 → 后端域 → 移动端 → AI → 质量

### Watch Out For
- 🔴 无测试保障下大规模重构 → Phase 0 先建 CI 门禁
- 🔴 循环依赖重构导致运行时崩溃 → 逐步解耦，每次验证
- 🔴 PII 加密在重构中暴露 → 标记不可移动
- 🟠 设计系统 codemod 破坏 UI → 按语义分类替换
- 🟠 Polyfill 连锁崩溃 → 放最后，逐个替换
- 🟠 范围蔓延 → 明确"不改什么"

## Files

- `.planning/research/STACK.md` — 工具链推荐与量化基线
- `.planning/research/FEATURES.md` — 能力矩阵（table stakes / differentiators / anti-features）
- `.planning/research/ARCHITECTURE.md` — 目标架构设计
- `.planning/research/PITFALLS.md` — 10 个领域特定陷阱
