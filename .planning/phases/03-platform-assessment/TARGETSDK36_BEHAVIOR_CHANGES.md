# targetSdk 36 行为变更逐项评估

**项目:** 寻裳 XunO
**评估日期:** 2026-05-05
**基线文档:** `ANDROID_BASELINE.md`, `API36_RISK_ASSESSMENT.md`
**当前配置:** compileSdk=36 / targetSdk=35 / RN 0.76.8 / minSdk=24

---

## 评估说明

本文档逐项评估 Android API 36 (Android 16) 对 targetSdk 升级引入的 10 项行为变更。每项评估包含:

- **(a)** 变更描述
- **(b)** 影响等级 (Critical / High / Medium / Low)
- **(c)** 当前代码关联分析（基于实际文件内容）
- **(d)** 涉及/不涉及判断
- **(e)** 修复位置（如需）

---

## 1. 预测性返回 (Predictive Back)

### (a) 变更描述

targetSdk 35+ 要求支持预测性返回手势。系统会拦截返回手势并显示预览动画，应用必须通过 `OnBackInvokedCallback` 正确处理返回事件。targetSdk 36 进一步强化此要求，可能移除 `android:enableOnBackInvokedCallback="false"` 的豁免能力。

### (b) 影响等级: Medium

### (c) 当前代码关联分析

**AndroidManifest.xml (L20):**

```xml
android:enableOnBackInvokedCallback="false"
```

项目显式禁用了预测性返回回调。这意味着当前所有返回手势走传统 `onBackPressed()` 路径。

**MainActivity.kt:**

```kotlin
class MainActivity : ReactActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
    }
    override fun getMainComponentName(): String = "XunO"
}
```

无自定义 back 处理逻辑。React Navigation 的返回导航完全由 JS 层处理。

**React Navigation 依赖:**

- `@react-navigation/native: ^6.1.18`
- `@react-navigation/bottom-tabs: ^6.6.0`
- `@react-navigation/native-stack: ^6.11.0`

React Navigation 6.x 通过 `react-native-screens` 管理原生导航栈。`react-native-screens 4.4.0`（锁定版本）的预测性返回适配状态需确认。

### (d) 涉及判断: **涉及**

升级 targetSdk 36 后，`enableOnBackInvokedCallback="false"` 可能被系统忽略，强制启用预测性返回。需验证:

1. RN 0.76.8 的 `ReactActivity` 是否已适配 `OnBackInvokedCallback`
2. `react-native-screens 4.4.0`（锁定）是否正确处理预测性返回手势
3. React Navigation 6.x 的返回动画是否与系统预览动画冲突

### (e) 修复位置

| 修复项                                            | 位置                                     | 负责方                |
| ------------------------------------------------- | ---------------------------------------- | --------------------- |
| `enableOnBackInvokedCallback` 属性移除或改为 true | `AndroidManifest.xml` L20                | 项目                  |
| ReactActivity 预测性返回适配                      | `node_modules/react-native/` (RN 框架层) | Meta / RN 社区        |
| react-native-screens 预测性返回支持               | `react-native-screens 4.4.0` (锁定)      | Software Mansion      |
| React Navigation 返回动画适配                     | `@react-navigation/native` 6.x           | React Navigation 团队 |

**项目代码修改量: 低** — 仅需移除/修改 Manifest 属性，但依赖 RN 框架和锁定模块的适配。

---

## 2. 边到边布局 (Edge-to-Edge)

### (a) 变更描述

targetSdk 35+ 强制启用 edge-to-edge 显示模式（状态栏和导航栏透明，内容延伸到系统栏下方）。targetSdk 36 继续保持此要求并可能进一步收紧窗口 insets 处理规则。

### (b) 影响等级: Medium

### (c) 当前代码关联分析

**AndroidManifest.xml (L24):**

```xml
android:windowSoftInputMode="adjustResize"
```

使用 `adjustResize` 模式处理键盘弹出，与 edge-to-edge 兼容但需配合正确的 insets 处理。

**MainActivity.kt:**
无自定义 window insets 处理。完全依赖 RN 框架和 `react-native-safe-area-context` 处理安全区域。

**关键依赖:**

- `react-native-safe-area-context: ^4.12.0` — 提供 `SafeAreaView` 组件
- `react-native-screens: 4.4.0`（锁定）— 管理原生屏幕和导航栏

**项目已在 compileSdk 36 + targetSdk 35 下运行。** 此时 edge-to-edge 已经生效（targetSdk 35 强制启用）。但 targetSdk 36 可能引入额外的 insets 行为变化。

### (d) 涉及判断: **涉及**

需逐页验证 SafeAreaView 覆盖范围:

1. 启动页/闪屏 — SplashScreen 边缘显示
2. 底部 Tab 导航栏 — `@react-navigation/bottom-tabs` 的 tab bar 与系统导航栏的间距
3. 全屏模态 — Modal 组件的顶部安全区域
4. 键盘弹出时的布局适配 — `adjustResize` + edge-to-edge 的交互

### (e) 修复位置

| 修复项                           | 位置                                 | 负责方           |
| -------------------------------- | ------------------------------------ | ---------------- |
| SafeAreaView 覆盖检查            | `apps/mobile/src/` 所有屏幕组件      | 项目             |
| react-native-screens insets 行为 | `react-native-screens 4.4.0` (锁定)  | Software Mansion |
| SafeAreaProvider 配置            | `apps/mobile/src/` 根组件            | 项目             |
| SplashScreen 过渡                | `AndroidManifest.xml` + `styles.xml` | 项目             |

**项目代码修改量: 中** — 需逐页检查 SafeAreaView，但框架层已提供基本支持。

---

## 3. 权限行为变化

### (a) 变更描述

API 36 对以下权限行为进行变更或收紧:

- `POST_NOTIFICATIONS` — API 33 引入的运行时通知权限，API 36 可能进一步收紧默认行为和授权弹窗频率
- `READ_MEDIA_IMAGES` — 细粒度媒体权限可能有新的授权流程
- `RECORD_AUDIO` — 音频录制权限可能增加用户可见的指示器要求
- `CAMERA` — 相机权限可能增加新的隐私指示器
- `SYSTEM_ALERT_WINDOW` — 特殊权限的授予流程可能变化
- `SCHEDULE_EXACT_ALARM` — 精确闹钟权限可能进一步收紧

### (b) 影响等级: High

### (c) 当前代码关联分析

**AndroidManifest.xml 声明的危险权限:**

| 权限                     | 声明位置 | maxSdk 限制 | 用途                       |
| ------------------------ | -------- | ----------- | -------------------------- |
| `CAMERA`                 | L3       | 无          | 拍照/虚拟试穿              |
| `READ_MEDIA_IMAGES`      | L7       | 无          | 读取图片 (API 33+)         |
| `POST_NOTIFICATIONS`     | L8       | 无          | 推送通知 (API 33+)         |
| `RECORD_AUDIO`           | L9       | 无          | 语音输入（伊伊对话）       |
| `READ_EXTERNAL_STORAGE`  | L6       | maxSdk=32   | 读取外部存储（仅 API<=32） |
| `WRITE_EXTERNAL_STORAGE` | L12      | maxSdk=32   | 写入外部存储（仅 API<=32） |

**特殊权限:**

- `SYSTEM_ALERT_WINDOW` (L10) — 系统悬浮窗

**RN 层权限请求代码（推测位置）:**

- `expo-image-picker` — 请求 CAMERA / READ_MEDIA_IMAGES
- `@react-native-voice/voice` — 请求 RECORD_AUDIO
- Expo Notifications / 推送服务 — 请求 POST_NOTIFICATIONS

【信息待补充：需搜索 `apps/mobile/src/` 中 `PermissionsAndroid.request` 和 `expo-permissions` 的调用位置】

### (d) 涉及判断: **涉及**

项目使用了 5 个危险权限 + 1 个特殊权限，每个权限的授权流程均需在 targetSdk 36 下重新测试:

1. `CAMERA` — 虚拟试穿拍照功能，权限弹窗行为可能变化
2. `RECORD_AUDIO` — 伊伊语音对话核心功能，权限拒绝降级需验证
3. `POST_NOTIFICATIONS` — 推送通知，授权弹窗频率限制可能变化
4. `READ_MEDIA_IMAGES` — 图片选择/上传，API 36 可能细化媒体权限
5. `SYSTEM_ALERT_WINDOW` — 特殊权限，API 36 可能修改自动授权条件

### (e) 修复位置

| 修复项                             | 位置                                  | 负责方 |
| ---------------------------------- | ------------------------------------- | ------ |
| 权限请求逻辑适配                   | `apps/mobile/src/` 中所有权限请求调用 | 项目   |
| 权限拒绝降级处理                   | 各功能模块的错误处理                  | 项目   |
| AndroidManifest 权限声明审计       | `AndroidManifest.xml` L3-L12          | 项目   |
| expo-image-picker 权限适配         | Expo SDK 52 原生模块                  | Expo   |
| @react-native-voice/voice 权限适配 | 原生模块                              | 社区   |

**项目代码修改量: 中** — 需审计所有权限请求代码，但大部分权限逻辑由 Expo/RN 库封装。

---

## 4. 后台任务限制

### (a) 变更描述

API 36 可能进一步限制后台任务执行:

- JobScheduler 最小间隔可能增加
- WorkManager 约束条件可能收紧
- 后台服务启动限制可能加强
- Doze 模式豁免条件可能收紧

### (b) 影响等级: Medium

### (c) 当前代码关联分析

**AndroidManifest.xml:** 未声明任何 `<service>`、`<receiver>`（静态）、`<provider>` 组件。

**package.json 依赖分析:**

| 模块                              | 后台任务相关? | 说明                                              |
| --------------------------------- | ------------- | ------------------------------------------------- |
| `@sentry/react-native: 6.9.0`     | 可能          | 崩溃上报可能在后台发送，但通常不依赖 JobScheduler |
| `socket.io-client: ^4.7.0`        | 可能          | WebSocket 心跳在后台可能受 Doze 影响              |
| `expo-task-manager`               | **未安装**    | 无后台任务管理                                    |
| `expo-background-fetch`           | **未安装**    | 无后台 fetch                                      |
| `react-native-background-fetch`   | **未安装**    | 无后台 fetch                                      |
| `react-native-background-actions` | **未安装**    | 无后台长任务                                      |

项目未使用任何专门的后台任务管理库。

### (d) 涉及判断: **不涉及**

项目当前无长时间运行后台任务:

- 无 WorkManager / JobScheduler 使用
- 无后台 fetch / 后台同步
- WebSocket 心跳由 socket.io-client 管理，在后台受系统标准 Doze 约束（非 API 36 特有）
- Sentry 崩溃上报在应用进程内完成，不需要独立后台任务

### (e) 修复位置: 无需修复

**项目代码修改量: 无**

---

## 5. 通知权限与通知渠道

### (a) 变更描述

API 36 可能对通知行为增加新要求:

- NotificationChannel 可能需要新字段（conversationId、audioAttributes 等）
- 前台服务通知模板要求可能更新
- 通知权限授予后的行为可能变化（静默通知 vs 可见通知）
- 通知删除/更新行为可能调整

### (b) 影响等级: Medium

### (c) 当前代码关联分析

**AndroidManifest.xml (L8):**

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
```

声明了通知权限，但 `POST_NOTIFICATIONS` 仅在 API 33+ 需要，API 36 可能进一步收紧。

**通知库使用情况:**

- 项目 `package.json` 中未包含 `@notifee/react-native`、`react-native-push-notification`、`expo-notifications` 等通知库
- `POST_NOTIFICATIONS` 权限可能是为推送通知（如 Firebase Cloud Messaging）预留的
- 项目中有 `expo.modules.updates` 相关 meta-data (AndroidManifest.xml L21-L23)，但 `ENABLED` 设为 `false`

【信息待补充：需确认项目是否实际发送通知，以及使用什么通知机制】

### (d) 涉及判断: **涉及（低影响）**

项目声明了 `POST_NOTIFICATIONS` 权限，但可能尚未实际使用通知功能。如果后续启用推送通知:

1. 需确保 NotificationChannel 配置符合 API 36 要求
2. 需验证通知权限请求弹窗行为
3. 需确认通知库（FCM / OneSignal / Expo Push）的 API 36 兼容性

### (e) 修复位置

| 修复项                                   | 位置                     | 负责方 |
| ---------------------------------------- | ------------------------ | ------ |
| POST_NOTIFICATIONS 权限声明保留/移除决策 | `AndroidManifest.xml` L8 | 项目   |
| 通知渠道配置（如启用通知）               | 待确认通知库             | 待确认 |
| 通知权限请求逻辑（如启用通知）           | 待确认                   | 待确认 |

**项目代码修改量: 低（如当前不使用通知） / 中（如后续启用通知）**

---

## 6. Scoped Storage / Media 权限

### (a) 变更描述

API 33+ 已强制 Scoped Storage。API 36 可能进一步细化:

- `READ_MEDIA_IMAGES` 可能拆分为更细粒度的权限
- `READ_MEDIA_VIDEO`、`READ_MEDIA_AUDIO` 可能有新的授权流程
- 媒体文件的元数据访问可能受限
- 文件 URI 分享可能增加限制

### (b) 影响等级: Low

### (c) 当前代码关联分析

**AndroidManifest.xml:**

```xml
<!-- L6: 已正确使用 maxSdkVersion -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32"/>
<!-- L7: API 33+ 细粒度权限 -->
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES"/>
<!-- L12: 已正确使用 maxSdkVersion -->
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="32"/>
<!-- L20: 旧版存储模式声明（已无效） -->
android:requestLegacyExternalStorage="true"
```

项目已正确区分了 API 32 及以下和 API 33+ 的存储权限。

**文件访问库:**

- `expo-file-system: ^55.0.17` — 高层文件系统 API
- `expo-image-picker: ^55.0.19` — 通过系统 picker 选择图片
- `expo-image-manipulator: ^55.0.15` — 图片编辑
- `react-native-fast-image: ^8.6.3` — 图片缓存（不直接访问文件系统）

RN 层文件访问完全通过 Expo 高层库封装，不直接使用 `java.io.File` 或 `ContentResolver`。

### (d) 涉及判断: **涉及（低影响）**

项目已适配 Scoped Storage 的基本要求:

1. `READ_EXTERNAL_STORAGE` 正确设置 `maxSdkVersion="32"`
2. `READ_MEDIA_IMAGES` 用于 API 33+
3. 文件操作通过 Expo 高层库封装

风险极低，主要需关注:

- `requestLegacyExternalStorage="true"` 在 targetSdk 30+ 已被忽略，可安全移除
- `READ_MEDIA_IMAGES` 在 API 36 下是否需要额外的授权步骤

### (e) 修复位置

| 修复项                                    | 位置                                                  | 负责方 |
| ----------------------------------------- | ----------------------------------------------------- | ------ |
| 移除无效的 `requestLegacyExternalStorage` | `AndroidManifest.xml` L20                             | 项目   |
| Expo 原生模块 API 36 适配                 | `expo-file-system`, `expo-image-picker` (Expo SDK 52) | Expo   |

**项目代码修改量: 低** — 仅需移除一个无效属性。

---

## 7. 大屏/折叠屏/横竖屏限制

### (a) 变更描述

Android 16 可能引入:

- 新的多窗口模式约束
- 折叠屏折叠角度感知 API
- 屏幕方向锁定限制（`screenOrientation` 可能部分失效）
- App Pairs（分屏对）功能要求
- 窗口尺寸变化通知频率变化

### (b) 影响等级: Medium

### (c) 当前代码关联分析

**AndroidManifest.xml (L24):**

```xml
<activity
    android:name=".MainActivity"
    android:screenOrientation="portrait"
    android:configChanges="keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode|smallestScreenSize"
    android:launchMode="singleTask"
    ...>
```

关键配置:

- `android:screenOrientation="portrait"` — 锁定竖屏
- `android:configChanges` — 自行处理所有配置变更，不重建 Activity
- `android:launchMode="singleTask"` — 单任务模式

**RN 层屏幕方向控制:**

- 项目 `package.json` 中未包含 `expo-screen-orientation`
- 屏幕方向完全通过 AndroidManifest 的 `screenOrientation="portrait"` 控制

### (d) 涉及判断: **涉及（中等影响）**

1. `screenOrientation="portrait"` 在折叠屏/大屏设备上可能导致用户体验问题（强制竖屏在展开后不自然）
2. API 36 可能限制 `screenOrientation` 的强制能力（特别是在多窗口模式下）
3. `configChanges` 覆盖了所有配置变更，需要确保 RN 框架正确处理 `onConfigurationChanged`
4. 项目未安装 `expo-screen-orientation`，无法在运行时动态调整方向

### (e) 修复位置

| 修复项                       | 位置                       | 负责方             |
| ---------------------------- | -------------------------- | ------------------ |
| `screenOrientation` 策略评估 | `AndroidManifest.xml` L24  | 项目（需用户决策） |
| 折叠屏/大屏布局适配          | `apps/mobile/src/` UI 组件 | 项目               |
| configChanges 处理验证       | RN 0.76.8 框架层           | Meta               |

**项目代码修改量: 中** — 取决于是否需要支持横屏/折叠屏。如保持强制竖屏，修改量低但需验证 API 36 兼容性。

---

## 8. 生命周期与前台服务限制

### (a) 变更描述

targetSdk 36 可能:

- 要求所有前台服务必须声明 `foregroundServiceType`
- 添加新的 `foregroundServiceType` 枚举值
- 进一步限制从后台启动 Activity
- 修改 `onStart`/`onStop` 在多窗口模式下的回调顺序
- 收紧 `startForeground()` 的调用时机

### (b) 影响等级: High

### (c) 当前代码关联分析

**AndroidManifest.xml:**

- **无 `<service>` 声明** — 项目自身不声明任何前台/后台服务
- **无 `<receiver>` 声明** — 无静态广播接收器

**MainActivity.kt:**

```kotlin
class MainActivity : ReactActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
    }
    override fun getMainComponentName(): String = "XunO"
}
```

标准 ReactActivity，无自定义生命周期处理。无 `onStart`/`onStop`/`onResume`/`onPause` 重写。

**MainApplication.kt:**

```kotlin
override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, OpenSourceMergedSoMapping)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
        load()
    }
}
```

标准 Application.onCreate 初始化: SoLoader + New Architecture 加载。无前台服务启动。

**潜在第三方模块影响:**

- `@react-native-voice/voice: ^3.2.4` — 语音识别可能在录音时使用前台服务
- `@sentry/react-native: 6.9.0` — 崩溃上报通常不使用前台服务
- `socket.io-client: ^4.7.0` — 纯 JS 库，无前台服务

【信息待补充：需执行 `./gradlew :app:processReleaseManifest` 查看合并后的 Manifest，确认第三方模块是否隐式声明了 `<service>`】

### (d) 涉及判断: **涉及**

1. 项目自身无前台服务，但第三方模块可能隐式声明
2. 合并 Manifest 中可能包含未声明的 `<service>` 组件
3. 如果第三方模块注册了前台服务但缺少 `foregroundServiceType`，targetSdk 36 下将崩溃
4. `@react-native-voice/voice` 的录音功能最可能涉及前台服务

### (e) 修复位置

| 修复项                                 | 位置                                         | 负责方      |
| -------------------------------------- | -------------------------------------------- | ----------- |
| 合并 Manifest 审计                     | `./gradlew :app:processReleaseManifest` 输出 | 项目        |
| 补充 foregroundServiceType（如需要）   | `AndroidManifest.xml` 或第三方模块 Manifest  | 项目/第三方 |
| @react-native-voice/voice 前台服务适配 | 原生模块                                     | 社区        |
| 生命周期回调验证                       | RN 0.76.8 ReactActivity                      | Meta        |

**项目代码修改量: 中** — 取决于合并 Manifest 审计结果。如第三方模块隐式声明前台服务，需补充 `foregroundServiceType`。

---

## 9. 非 SDK 接口限制

### (a) 变更描述

Android 每个新 API level 都会将更多非公开 API（greylist）提升为黑名单（blacklist）。通过反射或 JNI 调用黑名单中的接口会抛出异常并导致崩溃。API 36 预计新增数百个受限接口。

### (b) 影响等级: Medium

### (c) 当前代码关联分析

**项目原生代码（MainActivity.kt + MainApplication.kt）:**

- 总计 ~56 行 Kotlin 代码
- 仅使用标准 Android SDK API（`Application`、`Bundle`、`SoLoader`）
- 无反射调用 (`Class.forName`、`getDeclaredMethod` 等)
- 无 JNI 直接调用
- 未使用任何 `android.*` internal 包

**锁定模块风险评估:**

| 模块                         | 版本          | 非 SDK 接口使用概率 | 说明                                     |
| ---------------------------- | ------------- | ------------------- | ---------------------------------------- |
| `react-native-screens`       | 4.4.0 (锁定)  | **中**              | 屏幕管理/Fragment 转场可能使用非标准 API |
| `react-native-reanimated`    | 3.16.7 (锁定) | **中**              | 动画引擎的 native 驱动可能依赖非标准接口 |
| `@shopify/react-native-skia` | 1.12.4        | **低-中**           | Skia 渲染主要通过标准 JNI 接口           |
| `react-native-mmkv`          | 4.3.1         | **低**              | MMKV 使用标准 NDK/JNI                    |
| RN 0.76.8 框架               | 0.76.8        | **低**              | Meta 维护，通常及时适配                  |

【信息待补充：需运行 `veridex` 工具扫描 APK 确认非 SDK 接口使用情况】

### (d) 涉及判断: **不涉及（项目代码层面）**

项目自身 Kotlin 代码不使用任何非 SDK 接口。但第三方原生模块（特别是锁定的 screens 和 reanimated）可能使用 greylisted API，风险由模块维护者负责。锁定版本无法通过升级修复。

### (e) 修复位置

| 修复项                              | 位置                         | 负责方             |
| ----------------------------------- | ---------------------------- | ------------------ |
| veridex 扫描                        | 构建环境                     | 项目               |
| react-native-screens 非 SDK 修复    | 4.4.0 (锁定) — **无法升级**  | 需重新评估锁定策略 |
| react-native-reanimated 非 SDK 修复 | 3.16.7 (锁定) — **无法升级** | 需重新评估锁定策略 |
| RN 框架层适配                       | `node_modules/react-native/` | Meta               |

**项目代码修改量: 无（直接修改）** — 风险集中在第三方模块。如果锁定模块触发 blacklist 崩溃，需用户决策是否解除版本锁定（Rule 4 — 架构决策）。

---

## 10. 废弃 API 替换

### (a) 变更描述

compileSdk 36 将更多 API 标记为 `@Deprecated`:

- 部分 `android.app.Activity` 方法（如 `onBackPressed()`）
- 部分 `android.view.Window` 方法
- `android.app.Notification` 中的旧字段
- `SplashScreen` 相关的旧 API
- AndroidX 传递依赖中的废弃 API

废弃 API 在编译时产生 warning，某些在运行时可能行为异常或直接抛出异常。

### (b) 影响等级: Medium

### (c) 当前代码关联分析

**项目直接依赖的 Android API:**

| 文件                 | 使用的 API                                                 | 废弃风险                                 |
| -------------------- | ---------------------------------------------------------- | ---------------------------------------- |
| `MainActivity.kt`    | `ReactActivity`, `onCreate()`, `Bundle`                    | 低 — 标准 API，非废弃                    |
| `MainApplication.kt` | `Application`, `SoLoader.init()`, `DefaultReactNativeHost` | 低 — 标准 API                            |
| `app/build.gradle`   | `androidx.core:core-splashscreen:1.0.1`                    | 中 — SplashScreen 1.0.1 可能使用废弃 API |

**RN 框架层:**

- `ReactActivity` 基类可能使用了废弃的 `onBackPressed()`（在 API 33+ 已废弃，推荐使用 `OnBackInvokedCallback`）
- Hermes 引擎的 JNI 调用链不经过标准 Java API，无废弃风险

**`core-splashscreen:1.0.1`:**

- 版本较旧（1.0.1 vs 当前 1.2.x）
- 可能在 API 36 下使用废弃的 SplashScreen 安装方法

【信息待补充：需执行 `./gradlew assembleDebug` 检查编译 warning 中是否有 `@Deprecated` 警告】

### (d) 涉及判断: **涉及（低影响）**

1. 项目原生代码不直接使用废弃 API
2. RN 框架层（`ReactActivity`）可能使用 `onBackPressed()`，但这是 RN 0.76.8 框架内部问题
3. `core-splashscreen:1.0.1` 可能需要升级
4. 编译时可能有 `@Deprecated` warning 但不影响运行

### (e) 修复位置

| 修复项                       | 位置                                | 负责方 |
| ---------------------------- | ----------------------------------- | ------ |
| 检查编译 warning             | 构建输出                            | 项目   |
| `core-splashscreen` 版本评估 | `app/build.gradle` L91              | 项目   |
| RN 框架层废弃 API 清理       | `node_modules/react-native/`        | Meta   |
| `onBackPressed()` 迁移       | RN 0.76.8 ReactActivity（框架内部） | Meta   |

**项目代码修改量: 低** — 可能需升级 `core-splashscreen` 版本，其余由框架层处理。

---

## 行为变更汇总表

| #   | 行为变更                     | 等级     | 涉及?                  | 修复预估工作量           | 依赖外部                          | 优先级 |
| --- | ---------------------------- | -------- | ---------------------- | ------------------------ | --------------------------------- | ------ |
| 1   | 预测性返回 (Predictive Back) | Medium   | **涉及**               | 低（框架层）             | RN 0.76.8 + screens 4.4.0 适配    | M1     |
| 2   | 边到边布局 (Edge-to-Edge)    | Medium   | **涉及**               | 中（逐页检查）           | screens 4.4.0 + safe-area-context | M2     |
| 3   | 权限行为变化                 | **High** | **涉及**               | 中（权限审计）           | expo-image-picker + voice 适配    | H2     |
| 4   | 后台任务限制                 | Medium   | **不涉及**             | 无                       | 无                                | --     |
| 5   | 通知权限与渠道               | Medium   | **涉及（低）**         | 低（当前不用通知）       | 通知库（如启用）                  | L1     |
| 6   | Scoped Storage / Media       | Low      | **涉及（低）**         | 低（移除无效属性）       | Expo SDK 52                       | L2     |
| 7   | 大屏/折叠屏/横竖屏           | Medium   | **涉及**               | 中（策略决策）           | 用户决策（是否支持横屏）          | M3     |
| 8   | 生命周期/前台服务            | **High** | **涉及**               | 中（合并 Manifest 审计） | @react-native-voice/voice 适配    | H3     |
| 9   | 非 SDK 接口限制              | Medium   | **不涉及**（项目代码） | 无（锁定模块风险）       | veridex 扫描 + 用户决策           | M4     |
| 10  | 废弃 API 替换                | Medium   | **涉及（低）**         | 低                       | RN 0.76.8 + core-splashscreen     | L3     |

### 风险分布

| 等级       | 数量 | 项目                                                                                               |
| ---------- | ---- | -------------------------------------------------------------------------------------------------- |
| **High**   | 2    | #3 权限行为变化、#8 生命周期/前台服务限制                                                          |
| **Medium** | 6    | #1 预测性返回、#2 边到边、#4 后台任务（不涉及）、#7 大屏/折叠屏、#9 非 SDK（不涉及）、#10 废弃 API |
| **Low**    | 2    | #5 通知（低影响）、#6 Scoped Storage                                                               |

### "不涉及"项目汇总

| #   | 行为变更        | 判定依据                                                                    |
| --- | --------------- | --------------------------------------------------------------------------- |
| 4   | 后台任务限制    | 项目无 WorkManager/JobScheduler/后台 fetch/后台同步，无长时间运行后台任务   |
| 9   | 非 SDK 接口限制 | 项目原生代码（56 行 Kotlin）不使用反射或非 SDK 接口；第三方模块风险单独追踪 |

---

_行为变更评估完成: 2026-05-05 | 基于 ANDROID_BASELINE.md + API36_RISK_ASSESSMENT.md + 源码分析_
