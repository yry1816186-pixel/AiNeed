# GSD Phase 1: 移动端审计修复计划

- 创建日期: 2026-04-13
- 基线: main 分支
- 范围: `apps/mobile`
- 目标: 清零 P0 阻断项，收敛 P1 质量问题，建立可执行的质量门禁

---

## 一、当前状态快照

| 检查项 | 状态 | 详情 |
|--------|------|------|
| TypeScript `tsc --noEmit` | ✅ 通过 | 无类型错误 |
| ESLint | ❌ 失败 | 找不到 `expo` 配置 |
| Jest | ❌ 失败 | 模块路径问题 |
| `any` 类型 | ⚠️ 43 处/21 文件 | 需逐步收敛 |
| picsum 占位图 | ⚠️ 2 处 | SwipeCard + HeartRecommendScreen |
| mock 数据混用 | ⚠️ 多处 | HeartRecommendScreen, wechat, device-integrity |
| Demo 开关 | ⚠️ 逻辑缺陷 | ENABLE 未生效 |
| 单元测试 | ❌ 零覆盖 | 无 *.test.ts(x) |
| Android Release 构建 | ❌ 阻断 | NativeWind/Tailwind 兼容问题 |

---

## 二、任务分解

### Phase 1A: 工具链修复 (P0)

#### 1A-1: 修复 ESLint 配置
- **问题**: `.eslintrc.json` extends `expo`，但 `eslint-config-expo` 未安装
- **修复方案**: 安装 `eslint-config-expo` 或改用 `eslint-config-universe`（Expo 推荐）
- **验证**: `npx eslint src --max-warnings=1000` 成功执行
- **文件**: `apps/mobile/.eslintrc.json`, `apps/mobile/package.json`

#### 1A-2: 修复 Jest 配置
- **问题**: monorepo hoisting 导致 `node_modules/jest/bin/jest.js` 不存在
- **修复方案**:
  1. 确认 `jest` 和 `jest-expo` 在 `devDependencies` 中
  2. 修正 `jest.config.js` 的 `transformIgnorePatterns` 适配 pnpm hoisting
  3. 添加 `test` script 使用 `npx jest` 而非直接路径
- **验证**: `npx jest --passWithNoTests` 成功执行
- **文件**: `apps/mobile/jest.config.js`, `apps/mobile/package.json`

#### 1A-3: 修复 Demo 开关逻辑
- **问题**: `ENABLE_UNVERIFIED_MOBILE_DEMOS` 被定义但未使用，逻辑只看 `DISABLE_UNVERIFIED_MOBILE_DEMOS`
- **修复方案**:
  1. 实现 `resolveUnverifiedMobileDemosFlag()` 函数，优先级: ENABLE > DISABLE > __DEV__
  2. 添加单元测试覆盖
- **验证**: 单元测试通过
- **文件**: `apps/mobile/src/config/runtime.ts`

### Phase 1B: 单元测试基础设施 (P0)

#### 1B-1: 建立 Jest 测试基础设施
- **目标**: 让 Jest 可运行，添加最小测试文件
- **任务**:
  1. 修复 Jest 配置（与 1A-2 协同）
  2. 添加 `src/config/__tests__/runtime.test.ts`
  3. 添加 `src/services/api/__tests__/client.test.ts`（mock axios）
  4. 添加 `src/utils/__tests__/` 基础工具测试
- **验证**: `npx jest` 执行通过，至少 3 个测试文件

### Phase 1C: 类型安全收敛 (P1)

#### 1C-1: 收敛 `any` 类型
- **目标**: 从 43 处收敛到 ≤15 处
- **策略**:
  1. 优先修复 API 层和 Store 层的 `any`（影响面最大）
  2. 组件层 `any` 用 `unknown` + 类型守卫替代
  3. 无法确定的保留并加 `// @ts-expect-error - reason` 注释
- **重点文件**:
  - `services/offline-cache.ts` (6处)
  - `components/visualization/AlgorithmVisualization.tsx` (6处)
  - `components/skeleton/Skeleton.tsx` (5处)
  - `utils/performanceUtils.ts` (4处)

### Phase 1D: Mock 数据清理 (P1)

#### 1D-1: 替换 picsum 占位图
- **文件**: `SwipeCard.tsx`, `HeartRecommendScreen.tsx`
- **方案**: 使用项目 assets 中的占位图或后端返回的真实图片 URL

#### 1D-2: 清理组件层 mock 数据
- **文件**: `HeartRecommendScreen.tsx`
- **方案**: 接入推荐 API，移除 `generateMockProducts()`

#### 1D-3: 标记开发环境 mock
- **文件**: `wechat.ts`, `device-integrity.ts`
- **方案**: 添加 `__DEV__` 守卫 + 明确注释标记为开发专用

### Phase 1E: Android Release 构建 (P1, 可选)

#### 1E-1: 修复 NativeWind/Tailwind 兼容问题
- **问题**: `nativewind@2.0.11` + `tailwindcss@3.4.19` 导致 Release bundle 失败
- **方案**:
  1. 锁定 `tailwindcss@3.1.8`（NativeWind v2 官方兼容版本）
  2. 修正 PostCSS 配置
- **验证**: `gradlew.bat :app:assembleRelease` 成功
- **注意**: 此任务依赖 Java/Android SDK 环境，可能需要在特定环境中执行

---

## 三、执行顺序

```
1A-1 (ESLint) ──┐
1A-2 (Jest)   ──┼── 1A-3 (Demo开关) ── 1B-1 (测试基建) ── 1C-1 (any收敛) ── 1D-1~3 (Mock清理) ── 1E-1 (Android)
                │
                └── 可并行
```

1. **1A 阶段**（工具链修复）: 3 个任务，1A-1 和 1A-2 可并行
2. **1B 阶段**（测试基建）: 依赖 1A-2 完成
3. **1C 阶段**（类型安全）: 可与 1B 并行启动
4. **1D 阶段**（Mock 清理）: 依赖 1B 的测试基础设施
5. **1E 阶段**（Android 构建）: 独立，环境就绪后执行

---

## 四、完成标准

| 门禁项 | 目标 | 验证命令 |
|--------|------|----------|
| TypeScript 零错误 | 0 errors | `npx tsc --noEmit` |
| ESLint 可执行 | 0 config errors | `npx eslint src` |
| Jest 可执行 | ≥3 test files pass | `npx jest` |
| `any` 类型 | ≤15 处 | `grep -r ": any" src/ \| wc -l` |
| picsum 占位图 | 0 处 | `grep -r "picsum" src/` |
| Demo 开关逻辑 | 单元测试覆盖 | `npx jest runtime` |

---

## 五、风险与依赖

| 风险 | 影响 | 缓解 |
|------|------|------|
| pnpm hoisting 导致更多模块找不到 | Jest/ESLint 不可用 | 使用 `shamefully-hoist=true` 或 `public-hoist-pattern` |
| NativeWind v2 与 Tailwind 版本锁定可能影响其他依赖 | 样式回归 | 锁定后全量 UI 验证 |
| Android 构建需要 Java SDK | 无法本地验证 | 在 CI 或有 Java 环境的机器上执行 |
| mock 数据清理可能暴露 API 层缺陷 | 功能回归 | 逐步替换，每步验证 |

---

## 六、不在范围内

- 后端代码修改
- AI 服务层修改
- 新功能开发
- 国际化
- 性能优化（除 any 收敛带来的间接收益）
