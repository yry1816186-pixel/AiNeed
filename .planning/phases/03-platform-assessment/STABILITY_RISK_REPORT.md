# 稳定性风险全量报告

**项目:** 寻裳 XunO
**评估日期:** 2026-05-05
**基线文档:** `ANDROID_BASELINE.md`, `API36_RISK_ASSESSMENT.md`, `TARGETSDK36_BEHAVIOR_CHANGES.md`
**当前配置:** compileSdk=36 / targetSdk=35 / RN 0.76.8 / New Architecture / Hermes

---

## 评估范围

本文档从 5 个维度评估 targetSdk 36 / compileSdk 36 场景下的稳定性风险:

1. **崩溃风险 (Crash Risk)** — 可能导致应用直接崩溃的场景
2. **生命周期风险 (Lifecycle Risk)** — Activity/Fragment/Application 生命周期回调异常
3. **协程泄漏风险 (Coroutine Leak Risk)** — Kotlin 协程资源泄漏
4. **主线程阻塞风险 (Main Thread Blocking)** — 可能导致 ANR 的场景
5. **网络/IO 异常兜底 (Network/IO Exception Handling)** — 网络和文件 IO 的异常处理健壮性

---

## 维度 1: 崩溃风险 (Crash Risk)

> 评估 targetSdk 36 / compileSdk 36 场景下可能导致应用直接崩溃的场景。

| #   | 风险场景                                      | 严重度       | 触发条件                                                                           | 当前保护措施                                                                                       | 评估                                                                                                                                                                                                                                                              |
| --- | --------------------------------------------- | ------------ | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C-1 | **foregroundServiceType 未声明**              | **Critical** | targetSdk 36 下启动前台服务但未声明必需的 `foregroundServiceType`                  | 项目自身不声明前台服务。但 `@react-native-voice/voice` 可能在录音时隐式启动前台服务                | **需审计合并 Manifest** — 执行 `./gradlew :app:processReleaseManifest` 查看所有合并的 `<service>` 声明。任何缺少 `foregroundServiceType` 的前台服务在 targetSdk 36 下将抛出 `ForegroundServiceStartNotAllowedException`                                           |
| C-2 | **16KB 页面大小兼容**                         | **Critical** | 运行在支持 16KB 页面大小的 Android 16 设备上；.so 库未正确对齐                     | NDK 26.1.10909125；`useLegacyPackaging false`（现代 AABI 对齐）。但锁定模块的预编译 .so 可能不兼容 | **最高优先级** — 检查项: (1) Hermes 引擎 .so (2) react-native-screens 4.4.0 .so (锁定) (3) react-native-reanimated 3.16.7 .so (锁定) (4) @shopify/react-native-skia .so (5) react-native-mmkv .so。【信息待补充：需用 Google 16KB 兼容验证工具检查所有 .so 文件】 |
| C-3 | **非 SDK 接口调用终止**                       | **High**     | 运行时通过反射或 JNI 调用 API 36 blacklist 中的非 SDK 接口                         | 项目原生代码（56 行 Kotlin）不使用反射。风险集中在锁定模块                                         | **锁定模块为最大风险** — react-native-screens 4.4.0 的 Fragment 管理和 react-native-reanimated 3.16.7 的 native 动画引擎最可能使用 greylisted API。如果这些接口在 API 36 被提升为 blacklist，锁定版本无法修复                                                     |
| C-4 | **窗口 insets 处理异常**                      | Medium       | edge-to-edge 强制开启后，window insets 值变化导致 View 布局异常（高度为 0 或负值） | `react-native-safe-area-context: ^4.12.0` 提供基本保护                                             | **需在 targetSdk 36 下实测** — 特别关注: (1) 全面屏手势导航栏高度 (2) 折叠屏展开/折叠时的 insets 变化 (3) `react-native-screens 4.4.0` 的 insets 传递行为                                                                                                         |
| C-5 | **资源 ID 变化**                              | Medium       | compileSdk 36 下 AndroidX 资源 ID 命名空间变化                                     | RN 应用通过 JS 层管理 UI，通常不直接使用 `findViewById`                                            | **影响低** — RN Bridge 不依赖 Android 资源 ID。但 `react-native-screens` 和 `core-splashscreen` 可能受影响                                                                                                                                                        |
| C-6 | **ForegroundServiceStartNotAllowedException** | Medium       | 应用从后台尝试启动前台服务（未满足豁免条件）                                       | RN 应用通常不启动前台服务                                                                          | **需确认场景** — `@react-native-voice/voice` 的语音识别如果在应用切后台后继续录音，可能触发此异常                                                                                                                                                                 |
| C-7 | **SecurityException — 权限撤销**              | Medium       | API 36 收紧了某些权限的默认授予行为                                                | AndroidManifest 中声明了 5 个危险权限 + 1 个特殊权限                                               | **需逐权限测试** — `CAMERA`、`RECORD_AUDIO`、`READ_MEDIA_IMAGES` 的授权流程需回归验证                                                                                                                                                                             |

### 崩溃风险总结

```
Critical: 2 项 ── foregroundServiceType + 16KB 页面大小
High:     1 项 ── 非 SDK 接口终止
Medium:   4 项 ── 窗口 insets + 资源 ID + 前台服务启动限制 + 权限撤销
```

---

## 维度 2: 生命周期风险 (Lifecycle Risk)

> 评估 targetSdk 36 对 Activity/Fragment/Application 生命周期回调的影响。

| #   | 风险场景                                | 严重度 | 描述                                                                                                                                                         | 当前代码状态                                                                                                                                                                                           | 评估                                                                                                                                                                               |
| --- | --------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L-1 | **onStop/onStart 顺序变化**             | Medium | API 36 在多窗口/分屏模式下的 `onStop`/`onStart` 回调顺序可能变化。某些场景下 `onStop` 可能在 `onPause` 之前触发（而非传统的 `onPause` -> `onStop`）          | `MainActivity.kt` 无重写 `onStop`/`onStart`/`onPause`/`onResume`。完全依赖 `ReactActivity` 基类处理                                                                                                    | **影响低** — 项目代码无自定义生命周期回调。RN 框架的 `onHostPause`/`onHostResume`/`onHostDestroy` 由 `ReactActivity` 内部管理                                                      |
| L-2 | **onConfigurationChanged 触发频率变化** | Low    | 折叠屏开合、窗口大小调整、暗色模式切换可能更频繁触发 `onConfigurationChanged`                                                                                | `AndroidManifest.xml` 中声明了全面的 `configChanges`: `keyboard\|keyboardHidden\|orientation\|screenSize\|screenLayout\|uiMode\|smallestScreenSize`。`MainActivity.kt` 无重写 `onConfigurationChanged` | **影响低** — RN 通过 `Dimensions.addEventListener('change')` 处理尺寸变化。但频繁的配置变更可能导致 JS 层频繁重渲染                                                                |
| L-3 | **Application.onCreate 初始化顺序**     | Medium | `MainApplication.onCreate()` 中执行 `SoLoader.init()` + `DefaultNewArchitectureEntryPoint.load()`。如果 API 36 修改了 Application 初始化约束，可能影响冷启动 | 当前代码 (MainApplication.kt L37-43): `SoLoader.init(this, OpenSourceMergedSoMapping)` 在 `super.onCreate()` 之后立即执行。New Architecture `load()` 紧随其后                                          | **需关注** — (1) SoLoader 在 API 36 下的 16KB 页面环境中加载 .so 可能更慢 (2) New Architecture 初始化在 API 36 下可能有新的约束 (3) 如果初始化时间超过 5 秒，系统将显示 ANR 对话框 |
| L-4 | **Process death / 状态恢复**            | Medium | targetSdk 36 可能对 `onSaveInstanceState` 和状态恢复有新要求。系统可能更积极地杀死后台进程                                                                   | 项目 Java/Kotlin 层无自定义状态保存逻辑。RN 应用状态恢复由 JS 层管理（React Navigation + MMKV/AsyncStorage）                                                                                           | **影响低** — 状态保存在 JS 层通过 MMKV（`react-native-mmkv: ^4.3.1`）和 React Navigation 的 state persistence 实现。Kotlin 层不参与状态管理                                        |

### 生命周期风险总结

```
Medium: 3 项 ── onStop/onStart 顺序 + Application.onCreate 初始化 + Process death
Low:    1 项 ── onConfigurationChanged 频率
```

**关键结论:** 项目 Kotlin 代码极其精简（仅 2 个文件，~56 行），生命周期风险主要来自 RN 框架层。`ReactActivity` 和 `DefaultReactNativeHost` 的 API 36 适配由 Meta 负责。

---

## 维度 3: 协程泄漏风险 (Coroutine Leak Risk)

> 项目 Java/Kotlin 层极简（仅 MainActivity + MainApplication），协程使用风险低。

| #   | 风险场景               | 严重度 | 描述                                                                                                                                         | 评估                                                                                                                                       |
| --- | ---------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| K-1 | **无协程使用**         | N/A    | `MainActivity.kt`（12 行）和 `MainApplication.kt`（44 行）均未使用 Kotlin Coroutines。无 `CoroutineScope`、`launch`、`async`、`suspend` 函数 | **不涉及** — 项目原生 Kotlin 代码无协程                                                                                                    |
| K-2 | **第三方库的协程使用** | Low    | 原生模块（reanimated worklet、skia rendering、mmkv）可能内部使用协程。泄漏风险由库维护者负责                                                 | **影响低** — 项目代码无需处理。如果 Kotlin 升级到 2.0+（Group 4），协程 API 可能有 breaking change，但这属于工具链升级风险而非 API 36 风险 |

### RN JS 层异步泄漏（补充评估）

虽然本报告聚焦 Android 原生层稳定性，但 JS 层的异步泄漏同样影响应用稳定性:

| 关联                        | CONCERNS 编号 | 影响                                                                                                                         |
| --------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 81 silent `catch {}` blocks | **P1-1**      | 在 targetSdk 36 下，新的权限拒绝、服务绑定失败等原生桥接异常可能被静默吞噬，导致 UI 无响应但无错误提示                       |
| 2 `.catch(() => {})`        | **P3-2**      | `profile.service.ts:598`、`clothing.service.ts:462` 的异步异常被忽略，可能在 API 36 行为变更后产生未捕获的 Promise rejection |

**建议:** Phase 4 升级前，至少为关键 catch 块添加日志输出（`logger.warn` 或 `Sentry.captureException`），特别是涉及权限请求、原生模块调用、Bridge 通信的代码路径。

### 协程泄漏风险总结

```
N/A:  1 项 ── 项目原生代码无协程
Low:  1 项 ── 第三方模块内部协程
```

---

## 维度 4: 主线程阻塞风险 (Main Thread Blocking)

> 评估可能导致 ANR (Application Not Responding) 的场景。

| #   | 风险场景                       | 严重度 | 描述                                                                                                                                                                 | 评估                                                                                                                                                                                                                            |
| --- | ------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M-1 | **SoLoader 初始化**            | Medium | `MainApplication.onCreate()` 中 `SoLoader.init(this, OpenSourceMergedSoMapping)` 在主线程加载所有原生库。如果 16KB 页面环境导致 .so 文件加载更慢，冷启动时间可能延长 | **需关注** — 加载的 .so 包括: (1) libfb.so (RN 框架) (2) libhermes.so (Hermes 引擎) (3) libjsi.so (JSI) (4) 各第三方模块的 .so。在 16KB 页面设备上，每个 .so 的 mmap 操作可能略有延迟。多个 .so 叠加可能导致冷启动增加 50-200ms |
| M-2 | **New Architecture 初始化**    | Medium | `DefaultNewArchitectureEntryPoint.load()` 初始化 Fabric 渲染器 + TurboModules。API 36 下如果有新的初始化要求，可能增加启动时间                                       | **需测量** — 建议在 targetSdk 36 下测量: (1) `Application.onCreate` 到 `Activity.onCreate` 的耗时 (2) JS Bundle 加载完成时间 (3) 首帧渲染时间                                                                                   |
| M-3 | **Bridge / JSI 通信阻塞**      | Medium | RN Bridge/JSI 调用在主线程同步执行时（如同步 Native Module 调用、大 JSON 序列化），可能阻塞主线程                                                                    | **非 API 36 特有** — 但 16KB 页面可能放大内存分配延迟。项目中的 `socket.io-client` 消息解析、`@shopify/flash-list` 大列表渲染、图片解码等场景需关注                                                                             |
| M-4 | **第三方原生模块初始化**       | Low    | reanimated、skia、mmkv、sentry 等模块在应用启动时初始化。如果未适配 API 36，可能在初始化阶段阻塞主线程                                                               | **需验证** — `react-native-reanimated 3.16.7` 的 worklet 初始化、`@shopify/react-native-skia` 的 Skia 引擎初始化是潜在瓶颈。【信息待补充：需测量各模块初始化耗时】                                                              |
| M-5 | **ProGuard/R8 导致的启动延迟** | Low    | Release 构建启用 ProGuard (`enableProguardInReleaseBuilds = true`) + 资源压缩 (`shrinkResources true`)。R8 优化在构建时而非运行时执行                                | **影响低** — R8 优化通常减少启动时间（代码缩减 + 类合并）。但需确认 R8 未错误移除反射调用的类（特别是锁定模块的 native 方法）                                                                                                   |

### 主线程阻塞风险总结

```
Medium: 3 项 ── SoLoader + New Architecture + Bridge/JSI
Low:    2 项 ── 第三方模块初始化 + ProGuard/R8
```

**关键结论:** 主线程阻塞风险不是 API 36 的特有风险，但 16KB 页面大小可能放大现有延迟。建议在 targetSdk 36 升级前后分别测量冷启动时间作为对比基线。

---

## 维度 5: 网络/IO 异常兜底 (Network / IO Exception Handling)

> 评估 API 36 下网络和 IO 操作的异常处理健壮性。

| #   | 风险场景                               | 严重度 | 描述                                                                                                                          | 评估                                                                                                                                                                                                                                                                                                                                                 |
| --- | -------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N-1 | **明文流量 (Cleartext) 限制**          | Medium | targetSdk 36 可能默认阻止 HTTP（非 HTTPS）流量。如果后端 API 或内部服务使用 HTTP，应用将无法连接                              | **涉及** — `AndroidManifest.xml` L20: `android:usesCleartextTraffic="true"`（显式允许明文流量）。`network_securityConfig="@xml/network_security_config"` 提供了网络安全配置。**但** CONCERNS.md P1-4 已标记: MinIO、Qdrant、Node->Python 均使用 HTTP 内部通信。如果 targetSdk 36 忽略 `usesCleartextTraffic`（不太可能但需确认），内部服务通信将中断 |
| N-2 | **DNS over TLS / 私有 DNS**            | Low    | Android 16 可能增加对 DNS 配置的新限制（强制 DoT/DoH）                                                                        | **影响低** — DNS 解析由系统层处理，应用层 HTTP 客户端（axios / fetch）通常不受影响。但中国网络环境中私有 DNS 配置可能影响连接建立                                                                                                                                                                                                                    |
| N-3 | **WebSocket 连接稳定性**               | Low    | `socket.io-client: ^4.7.0` 管理 WebSocket 长连接。CONCERNS.md P1-5 标记了 `ws://localhost:8081`（开发环境 Metro），不影响生产 | **影响低** — 生产环境 WebSocket 使用 `wss://`。API 36 对 WebSocket 协议本身无新限制。但后台 WebSocket 重连可能受 Doze 模式影响（非 API 36 特有）                                                                                                                                                                                                     |
| N-4 | **文件 IO 在 Scoped Storage 下的异常** | Low    | RN 文件操作通过 `expo-file-system`、`expo-image-picker` 等高层库封装。不直接使用 `java.io.File` 访问非应用目录                | **影响低** — 项目已适配 Scoped Storage（`READ_MEDIA_IMAGES` 用于 API 33+，`READ_EXTERNAL_STORAGE` 限制在 API 32 及以下）。API 36 进一步强化不影响当前实现                                                                                                                                                                                            |
| N-5 | **网络切换连接泄漏**                   | Medium | 移动网络 <-> WiFi 切换时，HTTP 连接池中的连接可能泄漏或超时。`socket.io-client` 长连接在切换时需要重连                        | **非 API 36 特有** — 但 Android 16 可能改变网络切换时的连接管理行为。需测试: (1) WiFi -> 4G 切换时的 axios 请求行为 (2) socket.io 自动重连延迟 (3) 文件上传/下载在网络切换时的中断恢复                                                                                                                                                               |

### 网络/IO 异常风险总结

```
Medium: 2 项 ── 明文流量限制 + 网络切换连接泄漏
Low:    3 项 ── DNS + WebSocket + Scoped Storage 文件 IO
```

---

## 全局风险摘要

| 严重度       | 数量 | 关键项                                                                                                                                                                                                                |
| ------------ | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Critical** | 2    | C-1: foregroundServiceType 未声明; C-2: 16KB 页面大小兼容                                                                                                                                                             |
| **High**     | 1    | C-3: 非 SDK 接口终止（锁定模块）                                                                                                                                                                                      |
| **Medium**   | 11   | C-4: 窗口 insets; C-6: 前台服务启动限制; C-7: 权限撤销; L-1: onStop/onStart 顺序; L-3: Application.onCreate; L-4: Process death; M-1: SoLoader; M-2: New Architecture; M-3: Bridge 阻塞; N-1: 明文流量; N-5: 网络切换 |
| **Low**      | 6    | C-5: 资源 ID; L-2: onConfigurationChanged; K-2: 第三方协程; M-4: 第三方模块初始化; M-5: ProGuard; N-2/N-3/N-4: DNS/WebSocket/Scoped Storage                                                                           |
| **N/A**      | 1    | K-1: 协程泄漏（项目无协程）                                                                                                                                                                                           |

### 风险分布图

```
                    Critical  High  Medium  Low  N/A
崩溃风险 (C)          2        1      4      0    0
生命周期风险 (L)       0        0      3      1    0
协程泄漏风险 (K)       0        0      0      1    1
主线程阻塞风险 (M)     0        0      3      2    0
网络/IO 异常 (N)       0        0      2      3    0
──────────────────────────────────────────────────
合计                   2        1     12      7    1
```

---

## CONCERNS.md 关联分析

本报告中的稳定性风险与 CONCERNS.md 中已发现的问题存在交叉影响:

### P1-1: 81 silent catch{} blocks

| 关联         | 本报告编号                   | 影响分析                                                                                                                                                                                                                                                                                                        |
| ------------ | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 静默异常吞噬 | C-1, C-3, C-6, C-7, N-1, N-5 | 在 targetSdk 36 下，新的权限拒绝 (`SecurityException`)、前台服务启动失败 (`ForegroundServiceStartNotAllowedException`)、非 SDK 接口调用异常 (`HiddenApiUsageException`) 等 Android 运行时异常可能被 `catch {}` 静默吞噬。**后果:** 用户看到 UI 无响应或功能静默失败，但无错误提示，开发者也无法从日志中定位问题 |
| **建议**     | --                           | Phase 4 升级前，为所有涉及原生模块调用、权限请求、Bridge 通信的 catch 块添加 `logger.warn()` 或 `Sentry.captureException()`                                                                                                                                                                                     |

### P1-4: 内部服务 HTTP 通信

| 关联         | 本报告编号 | 影响分析                                                                                                                                                                                                                                  |
| ------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 明文流量风险 | N-1        | `android:usesCleartextTraffic="true"` 当前允许 HTTP 流量。如果 targetSdk 36 进一步收紧明文流量策略（虽然不太可能，但需确认），MinIO、Qdrant、Python 服务的 HTTP 通信将中断。**后果:** 虚拟试穿图片上传、向量搜索、AI 推理等功能完全不可用 |
| **建议**     | --         | (1) 确认 targetSdk 36 下 `usesCleartextTraffic="true"` 仍然有效; (2) 长期建议内部服务迁移至 HTTPS                                                                                                                                         |

### P2-18: 中国网络环境阻断 pnpm audit

| 关联              | 本报告编号     | 影响分析                                                                                                                                                          |
| ----------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 构建环境稳定性    | C-2 (间接)     | 无法执行 `pnpm audit` 意味着无法自动检测依赖中的已知安全漏洞和兼容性问题。在 API 36 升级过程中，如果某个依赖存在已知的 API 36 不兼容问题，无法通过 audit 自动发现 |
| Gradle 镜像可用性 | Group 2 (间接) | 腾讯云 Gradle 镜像在中国境内加速。如果 API 36 构建需要下载新的 Android SDK 组件，镜像可用性影响构建成功率                                                         |
| **建议**          | --             | (1) 配置国内镜像源（阿里云/腾讯云）用于 Gradle 和 npm; (2) 手动检查关键依赖的 API 36 兼容性 changelog                                                             |

### 额外关联

| CONCERNS                       | 本报告关联 | 说明                                                                                                                      |
| ------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| P0-1 明文 API keys             | N-1 (间接) | `usesCleartextTraffic="true"` 加剧了密钥暴露风险。API 36 下如果 HTTPS 强制化，反而可能帮助缓解此问题                      |
| P1-5 CSP 硬编码 ws://localhost | N-3        | 仅影响开发环境，与 targetSdk 36 无直接关联                                                                                |
| P1-6 Production console.log    | K (间接)   | console.log 在 Release 构建中由 Hermes 优化处理，不直接导致崩溃。但在 API 36 行为变更调试期间，过多的日志输出可能影响性能 |

---

## Phase 4 优先级建议

基于稳定性风险的严重度和修复依赖关系，建议 Phase 4 按以下优先级执行:

### 优先级 1: [Critical] 16KB 页面验证

**风险编号:** C-2
**操作:**

1. 确认 NDK 26.1.10909125 对 16KB 页面大小的支持状态
2. 使用 Google 提供的 16KB 兼容验证工具检查所有 .so 文件
3. 在 16KB 页面模拟器上运行完整回归测试
4. 重点关注锁定模块: react-native-screens 4.4.0、react-native-reanimated 3.16.7

**阻塞项:** 无 — 可立即执行
**预估工作量:** 1-2 天

### 优先级 2: [Critical] foregroundServiceType 审计

**风险编号:** C-1
**操作:**

1. 执行 `./gradlew :app:processReleaseManifest` 获取合并后的 Manifest
2. 检查所有合并的 `<service>` 声明
3. 确认每个前台服务都有正确的 `foregroundServiceType`
4. 特别检查 `@react-native-voice/voice` 的录音服务

**阻塞项:** 无 — 可立即执行
**预估工作量:** 0.5 天

### 优先级 3: [High] veridex 非 SDK 接口扫描

**风险编号:** C-3
**操作:**

1. 下载 Android Veridex 工具
2. 扫描 Debug APK 的非 SDK 接口使用
3. 分析扫描结果中 blacklist 接口的调用来源
4. 确认锁定模块是否使用了 API 36 的 blacklist 接口

**阻塞项:** 需要先成功构建 APK
**预估工作量:** 1 天（含结果分析）

### 优先级 4: [Medium] 明文流量配置检查

**风险编号:** N-1
**操作:**

1. 确认 targetSdk 36 下 `usesCleartextTraffic="true"` 是否仍然有效
2. 检查 `network_security_config.xml` 的配置是否满足 API 36 要求
3. 测试内部服务 HTTP 通信在 targetSdk 36 下的连通性

**阻塞项:** 无 — 可立即执行
**预估工作量:** 0.5 天

### 优先级 5: [Medium] 冷启动 / ANR 性能基线测量

**风险编号:** M-1, M-2
**操作:**

1. 在 targetSdk 35 下测量冷启动时间基线
2. 升级至 targetSdk 36 后再次测量
3. 对比 SoLoader 初始化、New Architecture 初始化、JS Bundle 加载、首帧渲染时间
4. 如发现显著退化，定位瓶颈并优化

**阻塞项:** 需要完成优先级 1-3（确认基本兼容性）
**预估工作量:** 1 天

---

## 风险矩阵总览

| 优先级 | 操作                       | 风险编号 | 严重度   | 依赖     | 预估工时 |
| ------ | -------------------------- | -------- | -------- | -------- | -------- |
| P1     | 16KB 页面验证              | C-2      | Critical | 无       | 1-2 天   |
| P2     | foregroundServiceType 审计 | C-1      | Critical | 无       | 0.5 天   |
| P3     | veridex 非 SDK 接口扫描    | C-3      | High     | APK 构建 | 1 天     |
| P4     | 明文流量配置检查           | N-1      | Medium   | 无       | 0.5 天   |
| P5     | 冷启动/ANR 性能基线        | M-1, M-2 | Medium   | P1-P3    | 1 天     |

**总预估工时: 4-5 天**

---

_稳定性风险报告完成: 2026-05-05 | 基于 ANDROID_BASELINE.md + API36_RISK_ASSESSMENT.md + TARGETSDK36_BEHAVIOR_CHANGES.md + CONCERNS.md_
