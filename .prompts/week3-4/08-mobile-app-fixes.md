# 任务: 移动端编译修复

## 项目路径

C:\AiNeed

## 上下文

React Native (Expo) 移动端应用，位于 `apps/mobile/`。65 个屏幕，预期有编译错误。

## 步骤

### 1. 检查依赖

```bash
cd /c/AiNeed/apps/mobile
cat package.json | head -60
```

确认所有依赖在 workspace 中可用:

```bash
cd /c/AiNeed && pnpm install
```

### 2. 尝试启动 Expo

```bash
cd /c/AiNeed/apps/mobile
npx expo start --no-dev --minify 2>&1 | head -100
```

或者直接用 TypeScript 检查:

```bash
cd /c/AiNeed && node node_modules/typescript/bin/tsc --project apps/mobile/tsconfig.json --noEmit 2>&1 | tail -100
```

### 3. 常见问题模式

#### 3.1 缺少包

错误: `Cannot find module 'xxx'`
修复: `pnpm --filter @xuno/mobile add xxx`

#### 3.2 类型不匹配

错误: TS 类型错误
修复: 修正类型定义

#### 3.3 未导出的模块

错误: `Module has no exported member 'xxx'`
修复: 检查目标模块是否确实导出了该成员

#### 3.4 路径别名

错误: `@/src/xxx` 找不到
修复: 检查 `babel.config.js` 和 `tsconfig.json` 中的路径别名配置

### 4. 关键页面验证

修复编译错误后，检查这些关键页面是否能正常渲染:

#### 4.1 OnboardingScreen

路径: `apps/mobile/src/features/auth/screens/` 或 `apps/mobile/src/features/onboarding/`
确认 3 步引导流程的导入完整

#### 4.2 HomeScreen

路径: `apps/mobile/src/features/home/screens/`
检查 WeatherGreeting、QuickActions、推荐流组件的导入

#### 4.3 AiStylistUnifiedScreen

路径: `apps/mobile/src/features/ai-stylist/`
检查对话式 UI 组件

#### 4.4 VirtualTryOnScreen

路径: `apps/mobile/src/features/try-on/`
检查试穿相关组件

#### 4.5 CheckoutScreen

路径: `apps/mobile/src/features/commerce/`
检查 2 步结账流程

### 5. 修复策略

- 先修复所有 TS 编译错误
- 然后修复所有 import/模块错误
- 最后处理运行时问题

### 6. 验证

```bash
cd /c/AiNeed && node node_modules/typescript/bin/tsc --project apps/mobile/tsconfig.json --noEmit 2>&1 | grep "^apps/" | wc -l
```

目标: 错误数尽可能少，最好为 0。
