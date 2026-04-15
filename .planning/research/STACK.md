# Stack Research — 代码规整工具链

**Project:** 寻裳 (XunO) 代码规整
**Researched:** 2026-04-16

## 量化基线

| 指标 | 后端 | 移动端 | AI 服务 |
|------|------|--------|---------|
| `any` 类型 | ~668 处 / 100 文件 | ~121 处 / 57 文件 | — |
| 测试覆盖率 | ~15% | ~5% | 有限 |
| 硬编码颜色 | — | 778 处 | — |
| 硬编码 fontSize | — | 921 处 | — |
| 硬编码间距 | — | 971 处 | — |
| 循环依赖 (forwardRef) | 16 文件 / 34 处 | — | — |
| Theme Tokens 引用 | — | 140 处 / 100 文件 | — |
| StyleSheet.create | — | 101 文件 | — |
| 内联样式 | — | 35 文件 | — |
| React Native Paper 引用 | — | 仅 1 文件 | — |
| Polyfill 文件 | — | 13 个，被 100+ 文件引用 | — |

## 关键发现

### 1. 设计系统现状比预期更清晰

项目并非"四套方案并行"，而是**一套方案（StyleSheet + Design Tokens）执行不彻底**：
- NativeWind/Tailwind 是死配置（零代码引用）
- React Native Paper 仅 1 文件引用（PaperThemeProvider.tsx）
- 真正的问题是 778 处硬编码颜色、921 处硬编码 fontSize、971 处硬编码间距需要迁移到已有 Token

### 2. TypeScript strict 已开启但执行不力

两端 tsconfig 均有 `strict: true`，但 `no-explicit-any` 仅 "warn"。移动端 ESLint 缺少 `recommended-requiring-type-checking`，比后端弱一档。

### 3. Monorepo 基础设施缺失

无构建编排、无 Git Hooks、无版本管理、ESLint/Prettier 配置分散。

### 4. NestJS 无架构边界保护

仅有 `import/no-cycle: warn`，35+ 模块间可随意导入。

## 推荐方案

### 设计系统统一

| 推荐 | 不推荐 | 置信度 |
|------|--------|--------|
| 原地强化 StyleSheet + Tokens + Primitives | NativeWind, Paper, Unistyles, Tamagui | 90% |

**理由**: 已有 Theme Tokens 体系（colors/spacing/typography/shadows/animations），只需将硬编码值迁移到 Token 引用。引入新方案成本远高于强化现有方案。

**迁移路径**:
1. 创建 `codemod` 脚本批量替换硬编码颜色 → `theme.colors.xxx`
2. 创建 `codemod` 脚本批量替换硬编码间距 → `theme.spacing.xxx`
3. 创建 `codemod` 脚本批量替换硬编码字体 → `theme.typography.xxx`
4. 移除 NativeWind/Tailwind 死配置
5. 保留 Paper 仅用于 Dialog/BottomSheet 等复杂组件

### TypeScript 严格化

| 推荐 | 不推荐 | 置信度 |
|------|--------|--------|
| ESLint v8 + no-explicit-any: error + codemod | 完全禁止 any 无例外 | 85% |

**工具链**:
- `eslint-plugin-deprecation` — 标记废弃 API
- `@typescript-eslint/no-explicit-any: error` — 阻止新增 any
- `ts-morph` — 编写 codemod 批量修复现有 any
- 移动端添加 `recommended-requiring-type-checking` 配置

### Monorepo 基础设施

| 推荐 | 不推荐 | 置信度 |
|------|--------|--------|
| Turborepo + husky + lint-staged + Changesets | Nx, Lerna, Rush | 85% |

**理由**: Turborepo 与 pnpm workspace 天然兼容，增量构建和远程缓存对 monorepo 效果显著。Nx 过于重量级，Lerna 已被 Nx 吸收。

### NestJS 边界保护

| 推荐 | 不推荐 | 置信度 |
|------|--------|--------|
| eslint-plugin-boundaries + dependency-cruiser | Nx, ArchUnit-TS | 80% |

**理由**: eslint-plugin-boundaries 可定义模块域和依赖规则，dependency-cruiser 可可视化依赖关系。两者结合可在 CI 中强制执行架构约束。

## 分阶段迁移路径

| 阶段 | 工具 | 风险 |
|------|------|------|
| Phase 0: 准备 | husky + lint-staged | 低 |
| Phase 1: 清理 | 移除死配置/文件 | 低 |
| Phase 2: 设计系统 | codemod + Token 迁移 | 中（778+921+971 处替换） |
| Phase 3: 后端域划分 | boundaries + dependency-cruiser | 高（16 处循环依赖） |
| Phase 4: 移动端重组 | feature-based 结构 | 中 |
| Phase 5: 质量提升 | strict ESLint + codemod | 中（668+121 处 any） |
