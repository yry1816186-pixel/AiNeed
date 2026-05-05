# 工具链升级方案: 分组升级路线图

**项目:** 寻裳 XunO
**生成日期:** 2026-05-05
**基线文档:** `ANDROID_BASELINE.md`, `API36_RISK_ASSESSMENT.md`
**当前配置:** compileSdk=36 / targetSdk=35 / RN 0.76.8 / AGP 8.9.1 / Kotlin 1.9.25 / Gradle 8.11.1 / JDK 17

---

## 约束条件

| 约束                                    | 来源       | 说明                                                   |
| --------------------------------------- | ---------- | ------------------------------------------------------ |
| **零业务侵入**                          | PROJECT.md | 不可修改核心业务逻辑、鉴权、支付、订单、AI 对话等      |
| **分组升级 + 构建验证**                 | PROJECT.md | 每组升级后执行 `./gradlew assembleDebug`，失败立即停止 |
| **react-native-screens 4.4.0 锁定**     | PROJECT.md | 明确锁定，不可升级                                     |
| **react-native-reanimated 3.16.7 锁定** | PROJECT.md | 明确锁定，不可升级                                     |

---

## 执行顺序图

```
Phase 4 执行顺序（按依赖关系排列）:

  Group 1          Group 2          Group 3          Group 4           Group 5
  JDK              Gradle           AGP              Kotlin/           AndroidX/
  兼容性评估       版本评估         评估             KSP 评估          第三方原生库
  ┌──────┐        ┌──────┐        ┌──────┐         ┌──────┐          ┌──────┐
  │ JDK  │───────>│Gradle│───────>│ AGP  │────────>│Kotlin│─────────>│ 三方库 │
  │  17  │        │8.11.1│        │8.9.1 │         │1.9.25│          │       │
  └──┬───┘        └──┬───┘        └──┬───┘         └──┬───┘          └──┬───┘
     │               │               │                │                 │
     v               v               v                v                 v
  [验证]          [验证]          [验证]           [验证]            [验证]
  assembleDebug   assembleDebug   assembleDebug    assembleDebug     assembleDebug

  所有 5 组通过后 ──────────────> targetSdk 35 -> 36 升级
                                  [最终验证]
                                  assembleRelease
```

**每组验证命令:**

```bash
./gradlew assembleDebug        # 编译验证
./gradlew installDebug         # 安装验证（可选）
./gradlew assembleRelease      # Release 构建验证（最终）
```

---

## Group 1: JDK 兼容性评估

### 当前状态

| 配置项                    | 当前值                                        | 来源文件               |
| ------------------------- | --------------------------------------------- | ---------------------- |
| JDK 运行时                | **17** (Microsoft OpenJDK 17.0.18)            | 环境变量               |
| `sourceCompatibility`     | **JavaVersion.VERSION_17**                    | `app/build.gradle` L81 |
| `targetCompatibility`     | **JavaVersion.VERSION_17**                    | `app/build.gradle` L82 |
| `kotlinOptions.jvmTarget` | **'17'**                                      | `app/build.gradle` L85 |
| Gradle JVM args           | `-Xmx4g -XX:MaxMetaspaceSize=1g -XX:+UseG1GC` | `gradle.properties` L3 |

### 评估

| 检查项                        | 结论         | 说明                                                    |
| ----------------------------- | ------------ | ------------------------------------------------------- |
| JDK 17 对 AGP 8.9.1 的兼容性  | **完全兼容** | AGP 8.x 最低要求 JDK 17，推荐 JDK 17 或 21              |
| JDK 17 对 API 36 编译的兼容性 | **兼容**     | Android SDK 编译不依赖 JDK 版本，JDK 17 已足够          |
| JDK 17 对 RN 0.76.8 的兼容性  | **完全兼容** | RN 0.76.8 官方推荐 JDK 17                               |
| API 36 是否强制要求 JDK 21+   | **否**       | 截至 Android 16 Developer Preview，API 36 不要求 JDK 21 |
| JDK 21 可选升级收益           | **低收益**   | 性能微提升（ZGC、虚拟线程），非必需                     |

### 风险评估: 低

JDK 17 是 AGP 8.x / RN 0.76.8 / Gradle 8.11.1 的黄金版本，无需升级。

### 建议: **保持 JDK 17**

除非未来 AGP 或 Kotlin 版本明确要求 JDK 21，否则不升级。升级 JDK 21 需要:

- `sourceCompatibility` / `targetCompatibility` 改为 `VERSION_21`
- `kotlinOptions.jvmTarget` 改为 `'21'`
- 测试构建环境 JDK 21 安装状态

---

## Group 2: Gradle 版本评估

### 当前状态

| 配置项                | 当前值                                                           | 来源文件                       |
| --------------------- | ---------------------------------------------------------------- | ------------------------------ |
| Gradle 版本           | **8.11.1**                                                       | `gradle-wrapper.properties` L3 |
| Distribution URL      | `https://mirrors.cloud.tencent.com/gradle/gradle-8.11.1-all.zip` | `gradle-wrapper.properties`    |
| `configuration-cache` | **false**                                                        | `gradle.properties` L7         |
| `parallel`            | **false**                                                        | `gradle.properties` L4         |

### 评估

| 检查项                               | 结论       | 说明                                                 |
| ------------------------------------ | ---------- | ---------------------------------------------------- |
| Gradle 8.11.1 对 AGP 8.9.1 的兼容性  | **兼容**   | AGP 8.9.x 要求 Gradle 8.9+，8.11.1 满足              |
| Gradle 8.11.1 对 API 36 编译的兼容性 | **兼容**   | Gradle 版本与 compileSdk/targetSdk 无直接依赖关系    |
| API 36 是否强制要求更高 Gradle       | **否**     | Android SDK 通过 AGP 间接使用 Gradle，非 Gradle 本身 |
| 腾讯云镜像可用性                     | **可用**   | 腾讯云 Gradle 镜像在中国境内加速，与 API 36 无关     |
| `configuration-cache` 关闭的影响     | **无影响** | 关闭 configuration-cache 避免了 AGP 兼容性问题       |
| 升级到 Gradle 8.12+ 的收益           | **低**     | 性能微优化，非必需                                   |

### 风险评估: 低

Gradle 8.11.1 是相当新的版本，完全满足 API 36 编译需求。

### 建议: **维持 Gradle 8.11.1**

仅在 Group 3 (AGP 升级) 明确要求更高 Gradle 版本时再同步升级。升级时需同步更新 `gradle-wrapper.properties` 中的 Distribution URL（建议保留腾讯镜像路径格式）。

---

## Group 3: AGP (Android Gradle Plugin) 评估

### 当前状态

| 配置项                   | 当前值     | 来源文件                                                                |
| ------------------------ | ---------- | ----------------------------------------------------------------------- |
| AGP 版本                 | **8.9.1**  | `build.gradle` L15: `classpath("com.android.tools.build:gradle:8.9.1")` |
| buildToolsVersion        | **35.0.0** | `build.gradle` L3                                                       |
| compileSdk               | **36**     | `build.gradle` L5                                                       |
| `android.enableJetifier` | **true**   | `gradle.properties` L10                                                 |
| `android.useAndroidX`    | **true**   | `gradle.properties` L9                                                  |

### 评估

| 检查项                                           | 结论       | 说明                                                                                     |
| ------------------------------------------------ | ---------- | ---------------------------------------------------------------------------------------- |
| AGP 8.9.1 对 compileSdk 36 的支持                | **支持**   | AGP 8.9.x 发布于 2025 年，支持 Android 16 SDK。当前项目已在 compileSdk 36 下成功编译     |
| buildToolsVersion 35.0.0 vs compileSdk 36 不匹配 | **需关注** | buildTools 大版本号通常应与 compileSdk 匹配。AGP 8.9.1 可能内含适配，但建议升级至 36.x.x |
| AGP 8.9.1 对 targetSdk 36 的支持                 | **需验证** | AGP 8.9.1 支持编译到 API 36，但 targetSdk 36 的运行时行为变更验证需要实际测试            |
| `android.enableJetifier` 在 AGP 8.9+ 的状态      | **仍可用** | Jetifier 尚未被废弃，但可考虑禁用以加速构建（项目已全量 AndroidX）                       |
| AGP 8.10+ 的 breaking changes                    | **待确认** | 【信息待补充：需查阅 AGP 8.10 release notes】                                            |

### buildToolsVersion 不匹配详细分析

```
当前状态:
  compileSdk        = 36
  buildToolsVersion = 35.0.0  <-- 不匹配

风险:
  - AAPT2 资源编译器可能缺少 API 36 新增的资源类型支持
  - 可能导致某些新资源 ID 编译失败
  - 当前编译通过可能是因为 AGP 8.9.1 内含了兼容的 AAPT2

建议:
  - buildToolsVersion 升级至 "36.0.0"（如果已发布）
  - 或移除 buildToolsVersion 声明，让 AGP 自动选择匹配版本
```

### 风险评估: 中

AGP 本身无需升级，但 buildToolsVersion 需要与 compileSdk 36 对齐。`enableJetifier` 可考虑禁用以加速构建。

### 建议: **暂不升级 AGP，优先修复 buildToolsVersion**

1. 将 `buildToolsVersion = "35.0.0"` 改为 `"36.0.0"`（或移除该声明）
2. 保持 AGP 8.9.1
3. 考虑禁用 `android.enableJetifier=true`（项目已全量 AndroidX）
4. 仅当 targetSdk 36 强制要求更高 AGP 版本时再升级

---

## Group 4: Kotlin / KSP 评估

### 当前状态

| 配置项                  | 当前值     | 来源文件                                                                     |
| ----------------------- | ---------- | ---------------------------------------------------------------------------- |
| Kotlin 版本             | **1.9.25** | `build.gradle` L8: `ext.kotlinVersion = "1.9.25"`                            |
| kotlin-gradle-plugin    | **1.9.25** | `build.gradle` L17: `classpath("org.jetbrains.kotlin:kotlin-gradle-plugin")` |
| kotlinOptions.jvmTarget | **'17'**   | `app/build.gradle` L85                                                       |
| KSP 使用                | **无**     | 项目未使用 KSP 或 kapt                                                       |

### 评估

| 检查项                               | 结论         | 说明                                                                                |
| ------------------------------------ | ------------ | ----------------------------------------------------------------------------------- |
| Kotlin 1.9.25 对 API 36 编译的兼容性 | **基本兼容** | Kotlin 1.9.x 编译产物格式不变。API 36 不引入新的字节码要求                          |
| Kotlin 1.9.25 维护状态               | **已停止**   | Kotlin 1.9.x 分支已停止更新。无法获得针对 API 36 的编译器修复                       |
| K2 编译器 (Kotlin 2.0+) 迁移风险     | **高**       | K2 是完全重写的编译器前端，可能改变类型推断、lambda 处理等行为                      |
| RN 0.76.8 对 Kotlin 2.x 的兼容性     | **待确认**   | 【信息待补充：RN 0.76.8 可能未针对 Kotlin 2.x 测试。RN 0.77+ 更可能支持】           |
| kapt -> KSP 迁移                     | **不涉及**   | 项目未使用 kapt，无需迁移至 KSP                                                     |
| Kotlin 升级对锁定模块的影响          | **需验证**   | react-native-screens 4.4.0 和 react-native-reanimated 3.16.7 的 Kotlin 互操作需测试 |

### K2 迁移风险详情

```
Kotlin 1.9.25 -> 2.0.x 的变更点:
1. 编译器前端完全重写 (K2)
2. 类型推断行为微妙变化
3. Lambda 表达式处理方式不同
4. 与 Java 互操作的边缘情况
5. kapt 兼容性变化（本项目无 kapt，此项不影响）

项目影响分析:
- 项目原生 Kotlin 代码仅 2 个文件（MainActivity.kt 12行 + MainApplication.kt 44行）
- 自身代码 K2 兼容性风险极低
- 风险集中在 AGP + RN 框架层 + 第三方原生模块的 Kotlin 互操作
```

### 风险评估: 高

K2 编译器是 Kotlin 生态的重大变更。虽然项目自身 Kotlin 代码极少，但 RN 框架和第三方模块的兼容性未确认。

### 建议: **暂不升级 Kotlin**

1. 保持 Kotlin 1.9.25，先在 targetSdk 36 下验证编译和运行时行为
2. 标记为 Phase 4 高风险项，在 AGP 和 targetSdk 升级完成后再考虑 Kotlin 升级
3. Kotlin 升级时机建议: RN 版本升级至 0.77+ 后（RN 0.77 预期更好地支持 Kotlin 2.x）
4. 升级前需在测试环境验证所有第三方原生模块的兼容性

---

## Group 5: AndroidX / Jetpack / 第三方原生库

### 当前状态

**AndroidX 直接依赖（app/build.gradle）:**

| 依赖                                | 版本       | 来源                          |
| ----------------------------------- | ---------- | ----------------------------- |
| `androidx.core:core-splashscreen`   | **1.0.1**  | `app/build.gradle` L91        |
| `com.facebook.react:react-android`  | **0.76.8** | `app/build.gradle` L90 (隐式) |
| `com.facebook.react:hermes-android` | **0.76.8** | `app/build.gradle` L94 (条件) |

**第三方原生模块（从 package.json 提取）:**

| 模块                              | 版本       | 状态     | API 36 兼容性评估                                                     |
| --------------------------------- | ---------- | -------- | --------------------------------------------------------------------- |
| `react-native-screens`            | **4.4.0**  | **锁定** | 中-高风险 — 屏幕/窗口管理可能使用 greylisted API；16KB .so 对齐待验证 |
| `react-native-reanimated`         | **3.16.7** | **锁定** | 中-高风险 — 动画引擎可能依赖非 SDK 接口；native .so 对齐待验证        |
| `react-native-gesture-handler`    | **2.20.2** | 可升级   | 低风险 — 手势处理标准实现                                             |
| `react-native-svg`                | **15.8.0** | 可升级   | 低风险 — 标准 SVG 渲染                                                |
| `@shopify/react-native-skia`      | **1.12.4** | 可升级   | 中风险 — Skia native 渲染引擎，.so 较大，16KB 兼容性待验证            |
| `react-native-mmkv`               | **4.3.1**  | 可升级   | 低风险 — MMKV 由腾讯维护，通常及时更新                                |
| `react-native-safe-area-context`  | **4.12.0** | 可升级   | 中风险 — edge-to-edge 强制后 SafeArea 行为可能变化                    |
| `@react-native-community/netinfo` | **11.5.2** | 可升级   | 低风险 — 标准 BroadcastReceiver 监听网络                              |
| `@sentry/react-native`            | **6.9.0**  | 可升级   | 低风险 — Sentry 通常及时适配新 API level                              |
| `@react-native-voice/voice`       | **3.2.4**  | 可升级   | 中风险 — 可能依赖前台服务维持录音                                     |
| `lottie-react-native`             | **7.3.6**  | 可升级   | 低风险 — 动画渲染标准实现                                             |
| `react-native-fast-image`         | **8.6.3**  | 可升级   | 低风险 — 图片缓存标准实现                                             |
| `socket.io-client`                | **4.7.0**  | 可升级   | 低风险 — 纯 JS 库，无原生代码                                         |
| `@gorhom/bottom-sheet`            | **5.0.0**  | 可升级   | 中风险 — 底部弹出面板使用手势+动画，依赖 reanimated                   |
| `react-native-paper`              | **5.12.0** | 可升级   | 低风险 — Material Design 组件库                                       |

### `core-splashscreen` 评估

```
当前版本: 1.0.1
最新版本: 1.2.x（需确认）
API 36 影响:
  - SplashScreen API 在 Android 12+ 引入
  - core-splashscreen 1.0.1 兼容 Android 12-15
  - API 36 可能引入 SplashScreen API 2.0（待确认）
  - 项目 AndroidManifest 中已配置: android:theme="@style/Theme.App.SplashScreen"
建议: 如果 API 36 要求新版 SplashScreen，升级至 core-splashscreen 1.2+
```

### RN 框架层 AndroidX 传递依赖

RN 0.76.8 内置的 AndroidX 版本（从 `node_modules/react-native/gradle/libs.versions.toml` 推断）:

- `androidx.appcompat:appcompat` — RN 0.76.8 内含
- `androidx.swiperefreshlayout` — RN 0.76.8 内含
- `androidx.core:core-ktx` — RN 0.76.8 内含

【信息待补充：需 grep `node_modules/react-native/` 中的 AndroidX 版本声明以确认传递依赖版本】

### Expo SDK 52 原生模块

项目使用 Expo v55 系列（expo-file-system v55、expo-image-picker v55 等），这些模块的 AndroidX 版本由 Expo SDK 52 统一管理。

【信息待补充：需确认 Expo SDK 52 对 compileSdk/targetSdk 36 的官方立场】

### 风险评估: 中

大部分第三方原生库可升级，风险集中在:

1. 锁定模块（screens 4.4.0、reanimated 3.16.7）无法升级，需验证现有版本的 API 36 兼容性
2. `@shopify/react-native-skia` 的 Skia .so 文件较大，16KB 页面对齐待验证
3. `core-splashscreen:1.0.1` 可能需要升级

### 建议: **暂不升级，标记为 Phase 4 逐模块验证**

1. 可升级模块在 Phase 4 按需逐个升级，每个升级后执行构建验证
2. 锁定模块执行 veridex 扫描 + 16KB 模拟器测试
3. `core-splashscreen` 检查是否有 API 36 要求的更新版本
4. 禁用 `android.enableJetifier=true`（项目已全量 AndroidX，可减少构建时间）

---

## 不可升级项清单

| 依赖                      | 锁定版本   | 原因                | API 36 风险                                     | 缓解策略                       |
| ------------------------- | ---------- | ------------------- | ----------------------------------------------- | ------------------------------ |
| `react-native-screens`    | **4.4.0**  | PROJECT.md 明确锁定 | 中-高 — 非 SDK 接口 + 16KB .so 对齐             | veridex 扫描 + 16KB 模拟器测试 |
| `react-native-reanimated` | **3.16.7** | PROJECT.md 明确锁定 | 中-高 — 非 SDK 接口 + 16KB .so + 预测性返回冲突 | veridex 扫描 + 16KB 模拟器测试 |

**锁定模块不兼容时的应急方案:**

- 如果锁定模块在 targetSdk 36 下出现崩溃或不兼容行为，需重新评估版本锁定策略
- 此决策需用户参与（Rule 4 — 架构决策），不可自行解除锁定

---

## 待确认清单（Phase 4 执行前需解决）

| #   | 待确认项                                                   | 获取方式                                           | 阻塞程度                  |
| --- | ---------------------------------------------------------- | -------------------------------------------------- | ------------------------- |
| 1   | **AGP 8.9.1 对 targetSdk 36 的完整支持状态**               | 查阅 AGP 8.9 release notes (developer.android.com) | 高 — 决定是否需升级 AGP   |
| 2   | **RN 0.76.8 对 Kotlin 2.x 的官方支持声明**                 | 查阅 RN 0.76/0.77 release notes + GitHub issues    | 高 — 决定 Kotlin 升级时机 |
| 3   | **各第三方原生库的 compileSdk 36 / targetSdk 36 兼容声明** | 逐个检查各模块的 build.gradle / README / changelog | 中 — 影响升级优先级       |
| 4   | **腾讯 Gradle 镜像在 API 36 构建工具链中的可用性**         | 尝试构建并观察下载情况                             | 低 — 可切换为官方源       |
| 5   | **buildToolsVersion 36.0.0 发布状态及 AGP 8.9.1 对其支持** | 查阅 Android SDK Manager / AGP release notes       | 中 — 影响编译兼容性       |

---

## 升级摘要

| Group | 组件              | 当前版本 | 建议动作                           | 风险 | Phase 4 优先级 |
| ----- | ----------------- | -------- | ---------------------------------- | ---- | -------------- |
| 1     | JDK               | 17       | **保持**                           | 低   | P5 (最后)      |
| 2     | Gradle            | 8.11.1   | **保持**                           | 低   | P5 (最后)      |
| 3     | AGP               | 8.9.1    | **保持**（修复 buildToolsVersion） | 中   | P2             |
| 3     | buildToolsVersion | 35.0.0   | **升级至 36.0.0 或移除声明**       | 低   | P1 (最先)      |
| 4     | Kotlin            | 1.9.25   | **保持**（标记高风险）             | 高   | P4 (延后)      |
| 5     | AndroidX/三方库   | 各版本   | **保持**（逐模块验证）             | 中   | P3             |
| -     | targetSdk         | 35       | **升级至 36**（依赖以上全部）      | 高   | P6 (最终)      |

---

_工具链升级方案生成完成: 2026-05-05 | 基于 ANDROID_BASELINE.md + API36_RISK_ASSESSMENT.md_
