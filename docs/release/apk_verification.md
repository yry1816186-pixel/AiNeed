# APK Verification

审计时间：2026-03-10

## 结论

结论：**未通过，阻断发布**

## Android 链路判定

- 仓库具备 Android 原生产物链路：`apps/mobile/android`
- 已修复 release signing 配置：
  - `apps/mobile/android/app/build.gradle:69`
  - `apps/mobile/android/app/build.gradle:112`
  - `apps/mobile/android/app/build.gradle:131`
- CI 构建工作流已修复：
  - `.github/workflows/build-android.yml`

## 本地验证结果

### 工具链检查
- `which java`：无
- `which javac`：无
- `which adb`：无
- 结论：当前 Linux 审计环境无法执行 Gradle Android 构建与安装验证

### 应执行但当前未能完成的命令
- `cd apps/mobile/android && ./gradlew assembleDebug`
- `cd apps/mobile/android && ./gradlew assembleRelease`
- `adb install -r ...apk`
- 启动后执行登录 / 首页 / 搜索 / 推荐 / 试衣冒烟

### 当前已完成的相关修复
- release 签名不再复用 debug keystore
- 生产构建必须显式提供：
  - `AINEED_UPLOAD_STORE_FILE`
  - `AINEED_UPLOAD_STORE_PASSWORD`
  - `AINEED_UPLOAD_KEY_ALIAS`
  - `AINEED_UPLOAD_KEY_PASSWORD`
  - `EXPO_PUBLIC_API_URL`
  - `EXPO_PUBLIC_AI_SERVICE_URL`
  - `EAS_PROJECT_ID`
- demo/mock 移动端页面默认关闭，需显式开启 `EXPO_PUBLIC_ENABLE_UNVERIFIED_MOBILE_DEMOS=true`

## 当前阻断

1. 本机无 Java/adb，无法 assemble/install。
2. `pnpm --dir apps/mobile exec tsc --noEmit` 仍失败，移动端源码未达可发布基线。
3. 因 1 和 2，无法形成“可构建、可安装、可运行、可回归”的 APK 证据链。

## 最小可行闭环

1. 安装 Java 17+/Android SDK/adb 到当前 Linux PATH。
2. 修复移动端 TypeScript 阻断。
3. 执行 debug/release 构建。
4. 在模拟器或真机执行安装与核心流程冒烟。
5. 将实际 APK 名称、SHA256、安装截图/日志补录到本文件。
