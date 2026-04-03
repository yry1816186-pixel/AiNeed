# APP 全量深度体检报告（移动端本轮）

- 日期：2026-03-15
- 体检范围：`apps/mobile`、`apps/mobile/android`
- 稳定基线：`main@126bd1da`
- 目标：先清 P0 可执行性硬伤，再验证 Android 可编译性和关键运行时配置

## 自动体检结果

| 检查项 | 命令 | 结果 | 备注 |
| --- | --- | --- | --- |
| TypeScript | `pnpm --dir apps/mobile exec tsc --noEmit` | 通过 | 本轮新增 `runtime.test.ts` 后仍可通过类型检查 |
| Android Debug 构建 | `cmd.exe /c gradlew.bat :app:assembleDebug` | 通过 | 初次失败于 `react-native-worklets-core` 的 `.cxx` / `build.ninja` 中间产物，清理后通过 |
| Android Release 构建 | `cmd.exe /c gradlew.bat :app:assembleRelease` | 未通过 | 阻断点在 NativeWind v2 + 当前 Tailwind/PostCSS 组合的 JS bundle 阶段 |
| Jest 启动 | `pnpm --dir apps/mobile exec jest ...` / `node ../../node_modules/jest/bin/jest.js ...` | 已从“秒挂”修到“可启动” | WSL 挂载盘下执行极慢，本轮未拿到最终通过输出 |
| ESLint 启动 | `pnpm --dir apps/mobile exec eslint ...` | 已修正配置名错误 | 旧错误为 `@typescript-eslint/recommended` 写法不合法 |

## 已确认问题清单

### P0

1. Jest 配置不可执行
   - 现象：`Preset jest-expo not found`
   - 根因：移动端包内缺少测试入口脚本，且测试配置未稳定对齐当前依赖树
   - 处理：补 `test` 脚本、收敛 `jest.config.js` 到 pnpm 目录结构，并新增最小单测文件

2. Demo 开关逻辑与配置脱节
   - 文件：`apps/mobile/src/config/runtime.ts`
   - 现象：`ENABLE_UNVERIFIED_MOBILE_DEMOS` 未真正生效，逻辑只看 `DISABLE_UNVERIFIED_MOBILE_DEMOS`
   - 影响：功能门禁与产品配置不一致，容易误放开演示能力
   - 处理：抽出 `resolveUnverifiedMobileDemosFlag`，明确优先级并补最小测试覆盖

3. ESLint 共享配置名错误
   - 文件：`apps/mobile/.eslintrc.json`
   - 现象：`ESLint couldn't find the config "@typescript-eslint/recommended"`
   - 根因：legacy `.eslintrc` 下应使用 `plugin:@typescript-eslint/recommended`
   - 处理：修正 extends 写法

4. Android Debug 构建被原生中间产物阻断
   - 现象：`react-native-worklets-core` 的 `.cxx` 目录先报删除失败，后报 `build.ninja` 无法加载
   - 处理：清理 `node_modules/react-native-worklets-core/android/.cxx` 与 Android 构建产物后重建
   - 结果：`assembleDebug` 成功

5. Android Release 构建仍被 NativeWind/Tailwind 兼容问题阻断
   - 现象：`Use process(css).then(cb) to work with async plugins`
   - 触发点：`app/(tabs)/profile.tsx`、`app/(tabs)/explore.tsx` 的 bundle 阶段
   - 当前判断：`nativewind@2.0.11` 本地包自身开发依赖使用 `tailwindcss@3.1.8`，而仓库当前解析到 `tailwindcss@3.4.19`
   - 已尝试：
     - 将 PostCSS 配置改为 NativeWind 官方推荐的 `tailwindcss + nativewind/postcss`
     - 将 `tailwindcss` 锁回 `3.1.8`
   - 未闭环原因：网络波动导致 Tailwind 版本替换尚未安装完成，release 仍使用旧版依赖

### P1

1. 真实产品内容与演示内容混用
   - `picsum.photos` 占位图在多个页面和组件内存在
   - 多处页面仍依赖 mock 数据

2. 资源版权来源未形成可追溯台账
   - `assets/icon.png`、`assets/splash.png`、`assets/adaptive-icon.png`、`assets/favicon.png` 未在仓库内找到来源/协议记录

### P4

1. 可见文案乱码
   - 文件：`apps/mobile/src/components/screens/AllScreens.tsx`
   - 现象：`宸插敭`、`楼{price}` 等乱码文案

## 本轮实际修改

| 文件 | 修改内容 |
| --- | --- |
| `apps/mobile/package.json` | 增加移动端 `test` 脚本，补充 Jest 相关 devDependency，锁定 `tailwindcss` 到 `3.1.8` |
| `apps/mobile/jest.config.js` | 补 pnpm 路径下的 transform ignore 规则 |
| `apps/mobile/src/config/runtime.ts` | 修正 demo 开关解析逻辑 |
| `apps/mobile/src/config/runtime.test.ts` | 新增最小运行时配置单测 |
| `apps/mobile/.eslintrc.json` | 修正 `plugin:@typescript-eslint/recommended` legacy 写法 |
| `apps/mobile/postcss.config.js` | 改为 NativeWind 官方推荐的 PostCSS 插件组合 |
| `apps/mobile/postcss.config.cjs` | 改为 NativeWind 官方推荐的 PostCSS 插件组合 |

## 权威来源与依据

1. Expo unit testing
   - https://docs.expo.dev/develop/unit-testing/

2. Expo Router testing
   - https://docs.expo.dev/router/reference/testing/

3. Expo app config / `Constants.expoConfig.extra`
   - https://docs.expo.dev/workflow/configuration/

4. `typescript-eslint` legacy ESLint 配置写法
   - https://typescript-eslint.io/getting-started/legacy-eslint-setup
   - https://typescript-eslint.io/users/configs/

5. NativeWind v2 安装与 PostCSS 配置
   - https://v2.nativewind.dev/getting-started/installation

6. NativeWind 官方 Tailwind v3 安装说明
   - https://www.nativewind.dev/docs/tailwind/installation

7. 本地权威开源证据：当前安装包 `nativewind@2.0.11` 的 `package.json`
   - 路径：`/mnt/c/AiNeed/node_modules/nativewind/package.json`
   - 关键事实：其 `devDependencies.tailwindcss` 为 `3.1.8`

## 结论

- P0 已闭环：
  - TypeScript 可通过
  - Android Debug 可编译并产出 APK
  - Demo 配置逻辑错误已修复
  - ESLint 配置名错误已修复
- P0 未完全闭环：
  - Android Release 仍受 NativeWind v2 / Tailwind 版本兼容问题影响
  - Jest 在当前 WSL 挂载盘环境下未拿到最终完成输出
