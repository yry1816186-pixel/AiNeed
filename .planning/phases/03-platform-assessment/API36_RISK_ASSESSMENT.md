# API 36 风险评估: compileSdk 36 环境兼容性 + targetSdk 36 升级路径

**项目:** 寻裳 XunO
**评估日期:** 2026-05-05
**基线文档:** `ANDROID_BASELINE.md`（同目录）
**当前配置:** compileSdk=36 / targetSdk=35 / RN 0.76.8 / AGP 8.9.1

---

## 1. 当前状态分析

### 1.1 compileSdk 36 + targetSdk 35 的含义

| 维度         | 当前值 | 说明                                                                                       |
| ------------ | ------ | ------------------------------------------------------------------------------------------ |
| `compileSdk` | 36     | 编译器可见 Android 16 (API 36) 全部 API。可使用 API 36 新增的类/方法，但不会改变运行时行为 |
| `targetSdk`  | 35     | 运行时行为以 API 35 (Android 15) 为准。系统根据此值决定是否启用 API 36 的行为变更          |
| `minSdk`     | 24     | 最低支持 Android 7.0                                                                       |

**核心结论:** 项目目前处于"编译看 36，运行为 35"状态。这意味着:

- 可以编译调用 API 36 的新 API（如有 `@RequiresApi(36)` 注解的代码）
- 但 API 36 的所有运行时行为变更（权限收紧、新限制等）**尚未生效**
- 如果 Google Play 要求 targetSdk 36（预计 2026 年 8 月起对新应用/更新强制），需要升级

### 1.2 RN 0.76.8 对 API 36 的支持状态

| 项目         | RN 0.76.8 官方配置 | 当前项目配置 | 偏差      |
| ------------ | ------------------ | ------------ | --------- |
| `compileSdk` | 35                 | 36           | +1 大版本 |
| `targetSdk`  | 34                 | 35           | +1 大版本 |
| `buildTools` | 35.0.0             | 35.0.0       | 一致      |
| `minSdk`     | 24                 | 24           | 一致      |

**RN 0.76.8 官方推荐值来源:** `node_modules/react-native/gradle/libs.versions.toml`

- `compileSdk = "35"`, `targetSdk = "34"`, `minSdk = "24"`, `buildTools = "35.0.0"`

RN 0.76.8 官方尚未声明支持 targetSdk 36。【信息待补充：需查 RN 0.76 release notes 或 RN 0.77+ 版本的 targetSdk 声明】

---

## 2. compileSdk 36 环境风险评估

### 2.1 已废弃 API 风险

**代码扫描范围:** `apps/mobile/android/app/src/main/java/com/xuno/app/`

| 文件                 | 行数  | 使用的 Android API                                                      | API 36 废弃风险                      |
| -------------------- | ----- | ----------------------------------------------------------------------- | ------------------------------------ |
| `MainActivity.kt`    | 12 行 | `ReactActivity`, `onCreate()`, `Bundle`                                 | 低 — 标准 RN Activity，无废弃调用    |
| `MainApplication.kt` | 44 行 | `Application`, `SoLoader`, `DefaultReactNativeHost`, `DefaultReactHost` | 低 — 标准 RN Application，无废弃调用 |

**结论:** 项目原生 Kotlin 代码量极少（仅 MainActivity + MainApplication，共 ~56 行），未发现已废弃的 Android API 调用。风险集中在第三方原生模块（react-native-screens、react-native-reanimated 等）。

### 2.2 编译兼容性

| 检查项                                    | 状态           | 说明                                                                                             |
| ----------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------ |
| AGP 8.9.1 对 compileSdk 36 的支持         | 【信息待补充】 | AGP 8.9.1 发布于 2025 年，Android 16 SDK 需确认是否已包含在该版本支持范围                        |
| buildToolsVersion 35.0.0 vs compileSdk 36 | **不匹配**     | buildTools 大版本号应与 compileSdk 匹配。当前 35.0.0 与 36 不匹配。可能导致资源编译或 AAPT2 问题 |
| Kotlin 1.9.25 对 API 36 编译产物支持      | 【信息待补充】 | Kotlin 1.9.x 已停止更新。需确认是否完整支持 Android 16 的 DEX/R8 产物格式                        |

**buildToolsVersion 不匹配风险评级:** 中 — 当前可编译通过（因 AGP 8.9.1 可能内含 buildTools），但建议在升级 targetSdk 36 时同步升级 buildToolsVersion 至 36.x.x

### 2.3 构建工具版本匹配

```
compileSdk          = 36
buildToolsVersion   = 35.0.0  ← 应为 36.0.0+
AGP                 = 8.9.1
Gradle              = 8.11.1
Kotlin              = 1.9.25
JDK                 = 17
```

**风险标记:**

- `buildToolsVersion 35.0.0` 与 `compileSdk 36` 不匹配 — 需确认 AGP 8.9.1 是否自动处理此差异
- `Kotlin 1.9.25` 已停止维护 — 无法获得针对 API 36 的编译器修复

---

## 3. targetSdk 35 -> 36 升级风险矩阵

### 3.1 九维风险评估

#### (a) 预测性返回动画 — Medium

| 维度                 | 详情                                                                                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Android 行为变更** | targetSdk 36 要求支持预测性返回 (Predictive Back)。系统会拦截返回手势并显示预览动画                                                                            |
| **当前代码依据**     | `AndroidManifest.xml` 第 20 行: `android:enableOnBackInvokedCallback="false"` — **显式禁用**                                                                   |
| **影响分析**         | RN 0.76.8 的 `ReactActivity` 默认处理 `onBackPressed()`。禁用 `enableOnBackInvokedCallback` 意味着当前不走预测性返回路径                                       |
| **升级影响**         | 升级 targetSdk 36 后，`enableOnBackInvokedCallback="false"` 可能被系统忽略，强制启用预测性返回。需验证 RN 0.76.8 Activity 是否正确处理 `OnBackInvokedCallback` |
| **建议操作**         | 1. 验证 RN 0.76.8 是否已适配预测性返回; 2. 测试所有 RN 导航栈的返回行为; 3. 如不兼容，需移除 `enableOnBackInvokedCallback="false"` 并在代码中适配              |

#### (b) 边到边布局 (Edge-to-Edge) — Medium

| 维度                 | 详情                                                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Android 行为变更** | targetSdk 35+ 已强制 edge-to-edge。targetSdk 36 继续保持并可能进一步收紧                                               |
| **当前代码依据**     | `AndroidManifest.xml` 第 24 行: `android:windowSoftInputMode="adjustResize"`                                           |
| **影响分析**         | 项目已使用 `react-native-safe-area-context` (4.12.0) 处理安全区域。RN 0.76.8 默认支持 edge-to-edge                     |
| **升级影响**         | 需确认所有页面 SafeAreaView 覆盖完整，特别是: 1. 启动页/闪屏; 2. 底部 Tab 导航栏; 3. 全屏模态; 4. 键盘弹出时的布局适配 |
| **建议操作**         | 全量回归测试所有页面的 SafeAreaView 行为                                                                               |

#### (c) 权限模型变更 — High

| 维度                 | 详情                                                                                                                                                                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Android 行为变更** | API 36 可能引入新的权限限制（通知权限、精确闹钟、后台位置等进一步收紧）                                                                                                                                                    |
| **当前代码依据**     | `AndroidManifest.xml` 声明了 5 个危险权限: `CAMERA`, `READ_MEDIA_IMAGES`, `POST_NOTIFICATIONS`, `RECORD_AUDIO`, `WRITE_EXTERNAL_STORAGE`                                                                                   |
| **影响分析**         | 1. `POST_NOTIFICATIONS` (第 8 行) — API 33 引入，API 36 可能进一步收紧默认行为; 2. `READ_MEDIA_IMAGES` (第 7 行) — Scoped Storage 细粒度权限可能变更; 3. `RECORD_AUDIO` (第 9 行) — 语音输入核心功能，权限弹窗行为可能变化 |
| **升级影响**         | 每个危险权限的授权流程需重新测试，确保: 1. 权限请求弹窗正常弹出; 2. 用户拒绝后的降级处理正确; 3. "不再询问"后的引导流程有效                                                                                                |
| **建议操作**         | 逐个权限进行 targetSdk 36 下的授权流程回归测试                                                                                                                                                                             |

#### (d) 前台服务限制 — High

| 维度                 | 详情                                                                                                                                                                              |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Android 行为变更** | targetSdk 36 可能进一步收紧前台 service 类型声明和启动限制                                                                                                                        |
| **当前代码依据**     | `AndroidManifest.xml` — **未声明任何 `<service>` 组件**                                                                                                                           |
| **影响分析**         | 项目自身不声明前台服务。但第三方模块可能隐式声明: 1. `@sentry/react-native` (6.9.0) — 可能使用前台服务上报崩溃; 2. `@react-native-voice/voice` — 语音识别可能依赖前台服务保持录音 |
| **升级影响**         | 需扫描第三方模块的 AndroidManifest 合并结果，确认是否有隐式 `<service>` 声明缺少 `foregroundServiceType`                                                                          |
| **建议操作**         | 1. 执行 `./gradlew :app:processReleaseManifest` 查看合并后的 Manifest; 2. 检查所有合并的 `<service>` 是否有正确的 `foregroundServiceType`                                         |

#### (e) 广播接收器限制 — Medium

| 维度                 | 详情                                                                                                                               |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Android 行为变更** | targetSdk 36 可能进一步限制静态注册的 BroadcastReceiver                                                                            |
| **当前代码依据**     | `AndroidManifest.xml` — **未声明任何静态 `<receiver>` 组件**                                                                       |
| **影响分析**         | 项目自身无静态广播接收器。风险同上，集中在第三方模块的合并 Manifest                                                                |
| **升级影响**         | 需确认第三方模块无依赖静态广播接收器的功能。`@react-native-community/netinfo` (11.5.2) 可能使用 BroadcastReceiver 监听网络状态变化 |
| **建议操作**         | 检查合并 Manifest 中所有 `<receiver>` 声明，确认动态注册替代方案                                                                   |

#### (f) 非 SDK 接口限制 — Medium

| 维度                 | 详情                                                                                                                                                                                                                             |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Android 行为变更** | 每个新 API level 都会将 greylist 接口提升为 blacklist，通过反射/JNI 调用会抛异常                                                                                                                                                 |
| **当前代码依据**     | 项目原生代码（MainActivity.kt + MainApplication.kt）未使用反射或非 SDK 接口                                                                                                                                                      |
| **影响分析**         | 风险集中在: 1. RN 框架自身 (`react-android`) 是否使用非 SDK 接口; 2. react-native-screens (4.4.0, 锁定版本) — 可能使用非 SDK 接口实现自定义转场动画; 3. react-native-reanimated (3.16.7, 锁定版本) — 动画引擎可能依赖非 SDK 接口 |
| **升级影响**         | 锁定的第三方模块无法通过升级修复。如果 RN 0.76.8 或锁定模块依赖的接口被 blacklist，将导致运行时崩溃                                                                                                                              |
| **建议操作**         | 1. 使用 `veridex` 工具扫描 APK 的非 SDK 接口使用; 2. 检查 RN 0.76.8 + screens 4.4.0 + reanimated 3.16.7 的已知 issues 【信息待补充：veridex 运行结果】                                                                           |

#### (g) Scoped Storage 强化 — Low

| 维度                 | 详情                                                                                                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Android 行为变更** | API 36 可能进一步强化 Scoped Storage 限制                                                                                                                                                                                       |
| **当前代码依据**     | `AndroidManifest.xml` 第 20 行: `android:requestLegacyExternalStorage="true"` — 仍使用旧版存储模式                                                                                                                              |
| **影响分析**         | `requestLegacyExternalStorage` 在 targetSdk 30+ 已被忽略。项目实际使用: 1. `expo-file-system` (v55) — 通过 RN bridge 访问文件; 2. `expo-image-picker` (v55) — 通过系统 picker 选择图片; 3. `READ_MEDIA_IMAGES` — 细粒度媒体权限 |
| **升级影响**         | 低风险。RN 生态已基本适配 Scoped Storage。`requestLegacyExternalStorage="true"` 可安全移除（已无效）                                                                                                                            |
| **建议操作**         | 移除无效的 `requestLegacyExternalStorage="true"` 属性                                                                                                                                                                           |

#### (h) 后台任务限制 — Medium

| 维度                 | 详情                                                                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Android 行为变更** | WorkManager/JobScheduler 最小间隔可能变化，后台执行窗口可能收紧                                                                          |
| **当前代码依据**     | 项目未直接使用 WorkManager 或 JobScheduler（AndroidManifest 中无相关声明）                                                               |
| **影响分析**         | 潜在影响来自: 1. `@sentry/react-native` — 可能使用后台任务发送崩溃报告; 2. `socket.io-client` — WebSocket 心跳在后台可能受 Doze 模式影响 |
| **升级影响**         | 需确认后台场景下 WebSocket 连接和 Sentry 上报的可靠性                                                                                    |
| **建议操作**         | 测试应用切后台后 WebSocket 重连和崩溃上报的完整性                                                                                        |

#### (i) 16KB 页面大小支持 — High

| 维度                 | 详情                                                                                                                                                                                                                                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Android 行为变更** | Android 16 要求应用支持 16KB 页面大小（传统为 4KB）。影响所有 native .so 库的对齐方式                                                                                                                                                                                                                      |
| **当前代码依据**     | 1. `ndkVersion = "26.1.10909125"` — NDK r26; 2. `app/build.gradle` 第 77 行: `useLegacyPackaging false` — 使用现代 AABI 对齐                                                                                                                                                                               |
| **影响分析**         | **关键风险点:** 1. NDK r26 需确认是否默认支持 16KB 页面对齐; 2. Hermes 引擎 (.so) — RN 0.76.8 Hermes 是否已针对 16KB 编译; 3. react-native-skia (1.12.4) — Skia .so 库的对齐; 4. react-native-reanimated (3.16.7, 锁定) — native 动画引擎 .so; 5. react-native-screens (4.4.0, 锁定) — native 屏幕管理 .so |
| **升级影响**         | 任何不兼容 16KB 页面大小的 .so 库将在支持 16KB 的设备上崩溃。锁定版本的模块无法通过升级修复                                                                                                                                                                                                                |
| **建议操作**         | 1. 确认 NDK 26.1.10909125 的 16KB 支持状态; 2. 使用 `--warn-unstable-headers` 编译标记测试; 3. 在支持 16KB 页面大小的模拟器上运行完整回归 【信息待补充：NDK r26 16KB 支持状态】                                                                                                                            |

---

### 3.2 风险矩阵总览

| #   | 风险维度            | 等级     | 代码影响点                                          | 可升级修复?                       |
| --- | ------------------- | -------- | --------------------------------------------------- | --------------------------------- |
| (c) | 权限模型变更        | **High** | AndroidManifest.xml 5 个危险权限声明                | 可适配（代码修改）                |
| (d) | 前台服务限制        | **High** | 无直接声明，但第三方模块可能有隐式 `<service>`      | 部分可修复（需检查合并 Manifest） |
| (i) | 16KB 页面大小       | **High** | NDK 26.1 + 锁定模块的 .so 库                        | **锁定模块不可升级** — 高风险     |
| (a) | 预测性返回动画      | Medium   | `enableOnBackInvokedCallback="false"` 将失效        | 需验证 RN 0.76.8 适配             |
| (b) | 边到边布局          | Medium   | `windowSoftInputMode="adjustResize"` + SafeAreaView | 可适配                            |
| (e) | 广播接收器限制      | Medium   | 无直接声明，第三方模块可能隐式声明                  | 部分可修复                        |
| (f) | 非 SDK 接口限制     | Medium   | 锁定模块 (screens/reanimated) 可能使用非 SDK 接口   | **锁定模块不可升级**              |
| (h) | 后台任务限制        | Medium   | socket.io-client 心跳 + Sentry 后台上报             | 可适配                            |
| (g) | Scoped Storage 强化 | Low      | `requestLegacyExternalStorage="true"` (已无效)      | 可清理                            |

---

## 4. 工具链升级路径概要

> 详细计划见 PLT-03（工具链升级）。

### 4.1 当前工具链

```
JDK 17 --> Gradle 8.11.1 --> AGP 8.9.1 --> Kotlin 1.9.25 --> RN 0.76.8
                                    |                          |
                                    v                          v
                              compileSdk 36              targetSdk 35
                              buildTools 35.0.0
```

### 4.2 升级路径建议（按优先级）

| 升级项            | 当前 -> 目标      | 风险   | 前置条件             | 说明                                     |
| ----------------- | ----------------- | ------ | -------------------- | ---------------------------------------- |
| buildToolsVersion | 35.0.0 -> 36.0.0+ | 低     | AGP 8.9.1 支持       | 与 compileSdk 36 对齐                    |
| Kotlin            | 1.9.25 -> 2.0.x   | **高** | K2 compiler 迁移     | 1.9.x 已停止维护                         |
| AGP               | 8.9.1 -> 8.10+    | 中     | Kotlin 升级完成      | 【信息待补充：API 36 对 AGP 的最低要求】 |
| JDK               | 17 -> 21          | 低     | AGP 8.x 已支持       | 可选升级，长期推荐                       |
| Gradle            | 8.11.1 -> 保持    | 低     | 当前版本足够         | API 36 不要求更高 Gradle                 |
| targetSdk         | 35 -> 36          | **高** | 以上工具链兼容性确认 | Play Store 2026 年 8 月预计强制          |

### 4.3 升级顺序建议

1. **Phase 1 (低风险):** buildToolsVersion -> 36.0.0
2. **Phase 2 (中风险):** JDK 17 -> 21（可选）
3. **Phase 3 (高风险):** Kotlin 1.9.25 -> 2.0.x（K2 migration）
4. **Phase 4 (中风险):** AGP 8.9.1 -> 8.10+（依赖 Phase 3）
5. **Phase 5 (高风险):** targetSdk 35 -> 36（依赖以上全部）

---

## 5. 不可升级项清单

以下依赖由 PROJECT.md 约束锁定，不得升级。这些锁定版本可能与 API 36 行为变更产生冲突。

| 锁定依赖                  | 锁定版本   | API 36 风险 | 说明                                                                                                                          |
| ------------------------- | ---------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `react-native-screens`    | **4.4.0**  | **中-高**   | (f) 非 SDK 接口 — 屏幕管理可能使用 greylisted API; (i) 16KB 页面 — native .so 对齐                                            |
| `react-native-reanimated` | **3.16.7** | **中-高**   | (f) 非 SDK 接口 — 动画引擎可能使用非 SDK 接口; (i) 16KB 页面 — native .so 对齐; (a) 预测性返回 — 自定义手势可能与返回动画冲突 |

**缓解策略:**

- 对锁定模块进行 veridex 扫描，确认非 SDK 接口使用情况
- 在 16KB 页面模拟器上验证 .so 兼容性
- 如果发现不兼容，需要重新评估版本锁定策略（需用户决策）

---

## 6. CONCERNS.md 关联分析

### 6.1 直接关联风险

| CONCERNS 编号 | 内容                                                                                   | API 36 关联                                                                                                            |
| ------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **P1-5**      | CSP hardcodes `ws://localhost:8081` — 生产环境 Helmet 配置中硬编码 Metro WebSocket URL | **间接关联** — 如果 targetSdk 36 收紧明文网络策略 (`usesCleartextTraffic="true"` 当前已启用)，WebSocket 连接可能受影响 |
| **P1-6**      | Production `console.log` in mobile logger — 生产环境日志泄露                           | **间接关联** — 非 SDK 接口限制 (f) 不影响 JS 层日志，但 ProGuard/R8 在 Release 构建中可能移除 console 调用             |
| **P2-18**     | Cannot run pnpm audit — 中国网络阻断 npmjs.org                                         | **直接关联** — 无法执行 `pnpm audit` 意味着无法自动检测依赖中的已知安全漏洞。API 36 升级后需确认所有依赖无安全风险     |

### 6.2 额外相关风险

| CONCERNS 编号 | 内容                                      | API 36 关联                                                   |
| ------------- | ----------------------------------------- | ------------------------------------------------------------- |
| P0-1          | 明文 API keys 在 `.env` 文件中            | 无直接关联，但 `usesCleartextTraffic="true"` 加剧密钥暴露风险 |
| P1-8          | 7 个 mobile store TODO stubs — API 未连接 | 无直接关联，但升级过程中需确保这些 stub 不影响回归测试        |
| P2-15         | pnpm 版本不匹配 (8.15 vs 10.32)           | 升级工具链前应先解决，避免 lockfile 损坏                      |

---

## 7. 风险摘要矩阵（按优先级排序）

### 7.1 High (3 项) — 必须解决

| 优先级 | 风险              | 影响                        | 行动项                                                             |
| ------ | ----------------- | --------------------------- | ------------------------------------------------------------------ |
| **H1** | 16KB 页面大小 (i) | .so 库不兼容导致启动崩溃    | 1. 确认 NDK r26 支持; 2. 验证锁定模块 .so 对齐; 3. 16KB 模拟器测试 |
| **H2** | 权限模型变更 (c)  | 危险权限授权流程异常        | 1. 逐权限回归测试; 2. 检查权限拒绝降级逻辑                         |
| **H3** | 前台服务限制 (d)  | 第三方模块隐式 service 崩溃 | 1. 检查合并 Manifest; 2. 补充 foregroundServiceType                |

### 7.2 Medium (5 项) — 建议解决

| 优先级 | 风险                | 影响                              | 行动项                                     |
| ------ | ------------------- | --------------------------------- | ------------------------------------------ |
| **M1** | 预测性返回动画 (a)  | 返回手势行为异常                  | 验证 RN 0.76.8 + react-navigation 6.x 适配 |
| **M2** | 非 SDK 接口限制 (f) | 锁定模块使用 blacklisted API 崩溃 | 运行 veridex 扫描                          |
| **M3** | 边到边布局 (b)      | 安全区域显示异常                  | 全量 SafeAreaView 回归                     |
| **M4** | 广播接收器限制 (e)  | 网络状态检测异常                  | 检查 @react-native-community/netinfo 适配  |
| **M5** | 后台任务限制 (h)    | WebSocket 心跳中断                | 后台 Sentry + socket.io 测试               |

### 7.3 Low (1 项) — 建议清理

| 优先级 | 风险                    | 影响       | 行动项                                           |
| ------ | ----------------------- | ---------- | ------------------------------------------------ |
| **L1** | Scoped Storage 强化 (g) | 无实际影响 | 移除无效的 `requestLegacyExternalStorage="true"` |

---

## 8. 待补充信息汇总

| 标记           | 内容                                                     | 获取方式                                         |
| -------------- | -------------------------------------------------------- | ------------------------------------------------ |
| 【信息待补充】 | RN 0.76.8 是否声明支持 targetSdk 36                      | 查阅 RN 0.76 release notes 或 RN 0.77+ changelog |
| 【信息待补充】 | AGP 8.9.1 是否完整支持 compileSdk 36                     | 查阅 developer.android.com AGP 8.9 release notes |
| 【信息待补充】 | Kotlin 1.9.25 对 API 36 编译产物完整兼容性               | 查阅 JetBrains Kotlin changelog                  |
| 【信息待补充】 | veridex 非 SDK 接口扫描结果                              | 下载 Android Veridex 工具并扫描 APK              |
| 【信息待补充】 | NDK r26 (26.1.10909125) 对 16KB 页面大小支持状态         | 查阅 NDK r26 changelog / Google 16KB 兼容文档    |
| 【信息待补充】 | Expo SDK 52 对 compileSdk/targetSdk 36 的官方立场        | 查阅 docs.expo.dev                               |
| 【信息待补充】 | 实际构建验证 — compileSdk 36 下 assembleRelease 是否成功 | 在构建环境中执行 `./gradlew assembleRelease`     |

---

_风险评估完成: 2026-05-05 | 基于 ANDROID_BASELINE.md 基线 + CONCERNS.md 关联分析_
