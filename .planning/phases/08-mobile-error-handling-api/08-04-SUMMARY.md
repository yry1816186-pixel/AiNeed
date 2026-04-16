# Phase 08-04 Summary: console.log 清理与重复 Store 修复

## 执行日期
2026-04-17

## 完成的任务

### Task 1: logger.ts -- 将 console.log 改为条件输出
- **文件**: `apps/mobile/src/shared/utils/logger.ts`, `apps/mobile/src/utils/logger.ts`
- **变更**:
  - 移除 `const isDev = __DEV__` 变量，直接使用 `__DEV__` 全局常量
  - `log` 方法添加 `[LOG]` 前缀：`console.log('[LOG]', ...args)`
  - 所有 dev-only 方法（log, warn, debug, info）统一使用 `__DEV__` 条件

### Task 2: ScreenErrorBoundaries.ts -- console.log 替换为 console.error
- **文件**: `apps/mobile/src/shared/components/screens/ScreenErrorBoundaries.ts`, `apps/mobile/src/components/screens/ScreenErrorBoundaries.ts`
- **变更**: 26 处 `console.log("[XXXScreen] Error boundary reset")` 替换为 `console.error("[XXXScreen] error boundary reset")`

### Task 3: offline-cache.ts -- console.log 替换为 logger
- **文件**: `apps/mobile/src/shared/services/offline-cache.ts`, `apps/mobile/src/services/offline-cache.ts`
- **变更**:
  - 导入 `logger`：`import { logger } from '../utils/logger'`
  - 6 处 `console.log(...)` 替换为 `logger.info(...)`
  - `console.error` 和 `console.warn` 保持不变

### Task 4: performanceMonitor.ts / performanceUtils.ts -- console.log 包裹 __DEV__
- **文件**: `apps/mobile/src/shared/utils/performanceMonitor.ts`, `apps/mobile/src/utils/performanceMonitor.ts`
- **变更**:
  - `logPerformanceMetrics` 函数中的 `console.log` 包裹在 `if (__DEV__)` 中
  - `PerformanceTimer.end()` 和 `measureRenderTime` 已有 `__DEV__` 保护，无需修改
  - `performanceUtils.ts` 中 `console.log` 已在 `__DEV__` 块内，无需修改

### Task 5: 其他 console.log 清理
- **wechat.ts**: `console.log("Share to WeChat:")` -> `console.error("Share to WeChat failed:")`
- **client.ts**: API 请求/响应日志已在 `__DEV__` 条件内，无需修改
- **AICompanionProvider.tsx**: `console.log("AI companion sendMessage failed:")` -> `console.error(...)`
- **ProfileScreen.tsx**: `console.log("[ProfileScreen] Error boundary reset")` -> `console.error(...)`
- **CartScreen.tsx**: `console.log("[CartScreen] Error boundary reset")` -> `console.error(...)`

### Task 6: 修复重复 Auth Store 引用
- **features/auth/hooks/useAuth.ts**: `import { useAuthStore } from "../stores/auth.store"` -> `from "../stores/authStore"`
- **hooks/useAuth.ts**: 文件已不存在（之前阶段已删除），无需处理
- **shared/hooks/index.ts**: `export * from "../../hooks/useAuth"` -> `export * from "../../features/auth/hooks/useAuth"`
- **验证**: `grep -rn "auth.store" apps/mobile/src/ --include="*.ts" --include="*.tsx"` 返回 0

### Task 7: 清理旧版 stores/index.ts 中的 Stub 代码
- **文件**: 5 个 stores/index.ts 文件
  - `features/wardrobe/stores/index.ts`
  - `features/style-quiz/stores/index.ts`
  - `features/onboarding/stores/index.ts`
  - `features/consultant/stores/index.ts`
  - `features/commerce/stores/index.ts`
- **变更**: 每个文件顶部添加 `@deprecated` JSDoc 标记

## 验证结果

1. `grep -rn "console.log" apps/mobile/src/ --include="*.ts" --include="*.tsx" | grep -v "__DEV__" | grep -v "logger"` -- 仅剩 `__DEV__` 条件内的和 logger 内的 console.log
2. `grep -rn "auth.store" apps/mobile/src/ --include="*.ts" --include="*.tsx"` -- 返回 0
3. 5 个旧版 stores/index.ts 均有 `@deprecated` 标记
4. TypeScript 编译无新增错误

## Git 提交
- `eeddd4e3` - feat(mobile): logger.ts - make log method conditional on __DEV__ with [LOG] prefix
- `3b8e941d` - fix(mobile): console.log cleanup, auth store fix, deprecated stub stores (Phase 08-04)
