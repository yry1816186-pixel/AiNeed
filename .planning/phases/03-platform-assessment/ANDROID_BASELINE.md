# Android 构建基线盘点

**项目:** 寻裳 XunO
**审计日期:** 2026-05-05
**来源文件:** `apps/mobile/android/` 目录下所有 Gradle 配置文件
**React Native 版本:** 0.76.8
**Expo SDK 版本:** 52 (expo-\* v55 系列模块)

---

## 1. SDK 版本

| 配置项              | 当前值            | RN 0.76.8 官方推荐值      | 状态           |
| ------------------- | ----------------- | ------------------------- | -------------- |
| `compileSdkVersion` | **36**            | 35 (`libs.versions.toml`) | 高于官方推荐   |
| `targetSdkVersion`  | **35**            | 34 (`libs.versions.toml`) | 高于官方推荐   |
| `minSdkVersion`     | **24**            | 24                        | 一致           |
| `buildToolsVersion` | **35.0.0**        | 35.0.0                    | 一致           |
| `ndkVersion`        | **26.1.10909125** | --                        | 未找到官方推荐 |

**关键发现:**

- `compileSdk=36` 高于 RN 0.76.8 官方推荐的 `compileSdk=35`，意味着项目提前采用了 Android 16 / API 36 的编译 SDK
- `targetSdk=35` 高于官方推荐的 `targetSdk=34`，但低于 `compileSdk=36`
- `buildToolsVersion=35.0.0` 与 `compileSdk=36` 存在大版本号不匹配（通常 buildTools 应与 compileSdk 同大版本号）
- **RN 官方推荐值来源:** `node_modules/react-native/gradle/libs.versions.toml`

---

## 2. 构建工具链

| 配置项                          | 当前值                                                           | 来源文件                                                             |
| ------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------- |
| **AGP (Android Gradle Plugin)** | **8.9.1**                                                        | `build.gradle` → `classpath("com.android.tools.build:gradle:8.9.1")` |
| **React Native Gradle Plugin**  | **0.76.8**                                                       | `@react-native/gradle-plugin` package.json                           |
| **Kotlin Gradle Plugin**        | **1.9.25**                                                       | `build.gradle` → `ext.kotlinVersion = "1.9.25"`                      |
| **Gradle**                      | **8.11.1**                                                       | `gradle-wrapper.properties` → `distributionUrl`                      |
| **Distribution URL**            | `https://mirrors.cloud.tencent.com/gradle/gradle-8.11.1-all.zip` | `gradle-wrapper.properties`                                          |

**关键发现:**

- AGP 8.9.1 是较新版本，应支持 compileSdk 36
- Kotlin 1.9.25 是 1.9.x 系列最后一个 release，官方已停止对该分支更新。K2 compiler 迁移需要升级到 Kotlin 2.0+
- Distribution URL 使用腾讯云镜像（中国境内加速）

---

## 3. JDK 配置

| 配置项                    | 当前值                                        | 来源文件                              |
| ------------------------- | --------------------------------------------- | ------------------------------------- |
| `sourceCompatibility`     | **JavaVersion.VERSION_17**                    | `app/build.gradle` → `compileOptions` |
| `targetCompatibility`     | **JavaVersion.VERSION_17**                    | `app/build.gradle` → `compileOptions` |
| `kotlinOptions.jvmTarget` | **'17'**                                      | `app/build.gradle` → `kotlinOptions`  |
| Gradle JVM args           | `-Xmx4g -XX:MaxMetaspaceSize=1g -XX:+UseG1GC` | `gradle.properties`                   |

**关键发现:**

- JDK 17 是当前 Android 开发推荐版本
- AGP 8.x 已支持 JDK 21，可选择性升级（低风险）
- Gradle JVM 配置为 4GB 堆内存 + 1GB Metaspace + G1GC

---

## 4. RN 框架配置 & 特性开关

| 配置项                     | 当前值                                            | 来源文件                                |
| -------------------------- | ------------------------------------------------- | --------------------------------------- |
| `newArchEnabled`           | **true**                                          | `gradle.properties`                     |
| `hermesEnabled`            | **true**                                          | `gradle.properties`                     |
| `android.useAndroidX`      | **true**                                          | `gradle.properties`                     |
| `android.enableJetifier`   | **true**                                          | `gradle.properties`                     |
| `reactNativeArchitectures` | `armeabi-v7a,arm64-v8a,x86,x86_64`                | `gradle.properties`                     |
| **NDK ABI filters**        | `arm64-v8a, x86_64`                               | `app/build.gradle` → `ndk.abiFilters`   |
| **ProGuard/R8 (Release)**  | **启用** (`enableProguardInReleaseBuilds = true`) | `app/build.gradle`                      |
| **资源压缩 (Release)**     | **启用** (`shrinkResources true`)                 | `app/build.gradle`                      |
| **Debug minify**           | 禁用                                              | `app/build.gradle`                      |
| **Legacy Packaging**       | 禁用 (`useLegacyPackaging false`)                 | `app/build.gradle` → `packagingOptions` |

**关键发现:**

- 新架构 (New Architecture) 已启用，MainApplication.kt 使用 `DefaultNewArchitectureEntryPoint.load()`
- Hermes 引擎已启用
- ABI filters 限制了实际打包的架构为 `arm64-v8a` 和 `x86_64`（后者用于模拟器调试），但 `reactNativeArchitectures` 声明了全部 4 种架构
- Jetifier 仍启用 — 如果项目已完全迁移至 AndroidX，可考虑禁用以加快构建

---

## 5. 应用签名配置

| 配置项            | 当前值                                                  | 来源文件                                 |
| ----------------- | ------------------------------------------------------- | ---------------------------------------- |
| Debug keystore    | `debug.keystore`（标准 Android debug key）              | `app/build.gradle`                       |
| Release keystore  | `xuno-release.keystore`                                 | `app/build.gradle` + `gradle.properties` |
| Release key alias | `xuno`                                                  | `gradle.properties`                      |
| Release 密码来源  | 环境变量 `XUNO_KEYSTORE_PASSWORD` / `XUNO_KEY_PASSWORD` | `app/build.gradle`                       |
| Application ID    | `com.xuno.app`                                          | `app/build.gradle`                       |
| Version Code      | `1`                                                     | `app/build.gradle`                       |
| Version Name      | `1.0.0`                                                 | `app/build.gradle`                       |

---

## 6. AndroidManifest.xml 权限清单

| 权限                                 | 用途                       | 风险等级 |
| ------------------------------------ | -------------------------- | -------- |
| `ACCESS_NETWORK_STATE`               | 网络状态检测               | 普通     |
| `CAMERA`                             | 拍照/虚拟试穿              | 危险权限 |
| `INTERNET`                           | 网络访问                   | 普通     |
| `MODIFY_AUDIO_SETTINGS`              | TTS 语音播放调整           | 普通     |
| `READ_EXTERNAL_STORAGE` (maxSdk=32)  | 读取外部存储（仅 API<=32） | 危险权限 |
| `READ_MEDIA_IMAGES`                  | 读取图片（API 33+）        | 危险权限 |
| `POST_NOTIFICATIONS`                 | 推送通知（API 33+）        | 危险权限 |
| `RECORD_AUDIO`                       | 语音输入（伊伊对话）       | 危险权限 |
| `SYSTEM_ALERT_WINDOW`                | 系统悬浮窗                 | 特殊权限 |
| `VIBRATE`                            | 触觉反馈                   | 普通     |
| `WRITE_EXTERNAL_STORAGE` (maxSdk=32) | 写入外部存储（仅 API<=32） | 危险权限 |

**关键发现:**

- 已正确区分 `READ_EXTERNAL_STORAGE`（maxSdk=32）和 `READ_MEDIA_IMAGES`（API 33+）
- 未声明任何 `<service>` 组件（无前台服务风险）
- 未声明静态 `<receiver>` 组件（无广播接收器风险）
- `android:enableOnBackInvokedCallback="false"` — 显式禁用了预测性返回回调
- `android:requestLegacyExternalStorage="true"` — 使用旧版外部存储模式

---

## 7. 第三方依赖版本（Android 原生相关）

| 依赖                             | 版本              | 来源                           |
| -------------------------------- | ----------------- | ------------------------------ |
| `react-native`                   | **0.76.8**        | `apps/mobile/package.json`     |
| `react-native-screens`           | **4.4.0** (锁定)  | `apps/mobile/package.json`     |
| `react-native-reanimated`        | **3.16.7** (锁定) | `apps/mobile/package.json`     |
| `react-native-gesture-handler`   | **2.20.2**        | `apps/mobile/package.json`     |
| `react-native-svg`               | **15.8.0**        | `apps/mobile/package.json`     |
| `@shopify/react-native-skia`     | **1.12.4**        | `apps/mobile/package.json`     |
| `react-native-mmkv`              | **4.3.1**         | `apps/mobile/package.json`     |
| `react-native-safe-area-context` | **4.12.0**        | `apps/mobile/package.json`     |
| `@react-native/gradle-plugin`    | **0.76.8**        | `devDependencies`              |
| `@react-native-community/cli`    | **15.0.1**        | `devDependencies`              |
| `expo-*` 模块                    | **v55 系列**      | `dependencies/devDependencies` |

---

## 8. 待补充信息

以下信息无法从当前文件系统获取，标注为【信息待补充】：

| 待补充项                                         | 说明                                                 |
| ------------------------------------------------ | ---------------------------------------------------- |
| Expo SDK 52 官方 compileSdk/targetSdk 要求       | 需访问 docs.expo.dev 确认                            |
| AGP 8.9.1 是否完整支持 compileSdk 36             | 需查阅 AGP 8.9 release notes (developer.android.com) |
| Kotlin 1.9.25 对 API 36 编译产物的完整兼容性     | 需查阅 JetBrains Kotlin changelog                    |
| 实际构建验证结果（compileSdk 36 下是否成功编译） | 需在构建环境中执行 `./gradlew assembleRelease`       |
| `veridex` 工具扫描结果（非 SDK 接口使用情况）    | 需下载并运行 Android Veridex 工具                    |
| NDK 26.1.10909125 对 16KB 页面大小的支持状态     | 需查阅 NDK r26 changelog                             |

---

_基线盘点完成: 2026-05-05 | 审计范围: Android 构建配置全量_
