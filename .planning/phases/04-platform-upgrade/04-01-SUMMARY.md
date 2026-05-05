---
plan_id: "04-01"
phase: "4 - 平台升级"
wave: 1
tags: ["toolchain", "android", "sdk-upgrade", "build-verification"]
duration: "22m"
completed: "2026-05-05"
status: complete
---

# Phase 4 Plan 01: 工具链升级与 SDK 版本升级 Summary

buildToolsVersion 35->36 对齐 + targetSdk 35->36 升级; JDK/Gradle/AGP/Kotlin 经评估保持不变,每组构建验证通过

## 执行结果

| Task | 名称                               | 状态          | Commit   | 变更文件                                                              |
| ---- | ---------------------------------- | ------------- | -------- | --------------------------------------------------------------------- |
| 1    | JDK & Gradle 兼容处理              | 完成          | c2ccd429 | apps/mobile/android/build.gradle (buildToolsVersion 35.0.0 -> 36.0.0) |
| 2    | AGP & Kotlin 兼容处理              | 完成 (无变更) | N/A      | 无 -- 确认性验证通过                                                  |
| 3    | AndroidX & 三方库 + targetSdk 升级 | 完成          | f6d13966 | apps/mobile/android/build.gradle (targetSdkVersion 35 -> 36)          |

## 工具链升级决策表

| 组件                    | 原版本  | 目标版本 | 决策   | 依据                                           |
| ----------------------- | ------- | -------- | ------ | ---------------------------------------------- |
| JDK                     | 17.0.18 | 17.0.18  | 保持   | AGP 8.9.1 / RN 0.76.8 / Gradle 8.11.1 黄金版本 |
| Gradle                  | 8.11.1  | 8.11.1   | 保持   | 满足 AGP 8.9.x 最低要求 (Gradle 8.9+)          |
| AGP                     | 8.9.1   | 8.9.1    | 保持   | 支持 compileSdk 36                             |
| Kotlin                  | 1.9.25  | 1.9.25   | 保持   | K2 迁移高风险，待 RN 0.77+ 再考虑              |
| KSP                     | N/A     | N/A      | 不涉及 | 项目无 kapt/KSP                                |
| Compose                 | N/A     | N/A      | 不涉及 | 项目未使用 Jetpack Compose                     |
| buildToolsVersion       | 35.0.0  | 36.0.0   | 升级   | 对齐 compileSdk 36，确保 AAPT2 完整支持        |
| targetSdkVersion        | 35      | 36       | 升级   | PLT-07 要求，对齐 Android 16                   |
| compileSdkVersion       | 36      | 36       | 保持   | 已是目标版本                                   |
| core-splashscreen       | 1.0.1   | 1.0.1    | 保持   | 与 API 36 兼容                                 |
| react-native-screens    | 4.4.0   | 4.4.0    | 锁定   | PROJECT.md 明确锁定                            |
| react-native-reanimated | 3.16.7  | 3.16.7   | 锁定   | PROJECT.md 明确锁定                            |

## 构建验证记录

| 验证点                         | 命令                    | 结果                                                             |
| ------------------------------ | ----------------------- | ---------------------------------------------------------------- |
| 基线构建 (pnpm install 修复后) | ./gradlew assembleDebug | BUILD SUCCESSFUL (7m 45s)                                        |
| buildToolsVersion 36.0.0       | ./gradlew assembleDebug | BUILD SUCCESSFUL (26s)                                           |
| AGP/Kotlin 确认验证            | ./gradlew assembleDebug | BUILD SUCCESSFUL (8s)                                            |
| targetSdk 36                   | ./gradlew assembleDebug | BUILD SUCCESSFUL (8s)                                            |
| targetSdk 36 lint              | ./gradlew lint          | 6 errors / 2 warnings (全部来自 react-native-view-shot 第三方库) |

## 偏差与发现

### 前置修复: pnpm install 依赖不完整

- **发现时间:** Task 1 基线构建
- **问题:** `@react-native/codegen` 包未正确安装在 node_modules 中，导致 codegen 任务失败
- **修复:** 执行 `rm -rf node_modules` + `pnpm install` 全量重装
- **文件修改:** 无代码变更（仅依赖重装）

### 自动修复: Jetifier 禁用回退

- **发现时间:** Task 1 buildToolsVersion 升级后
- **问题:** 禁用 `android.enableJetifier=false` 导致 Duplicate class 错误（`com.android.support:versionedparcelable:28.0.0` 与 `androidx.versionedparcelable:1.1.1` 冲突）
- **修复:** 恢复 `android.enableJetifier=true` -- 部分第三方依赖仍在使用旧版 Support Library
- **影响:** 构建时间略长于理想状态，但不影响功能
- **文件修改:** gradle.properties 改动已回退

### 预先存在: Lint 错误 (不在范围内)

- **发现时间:** Task 3 lint 检查
- **问题:** 6 errors + 2 warnings，全部来自 `react-native-view-shot` 第三方库 (`node_modules/`)
- **验证:** targetSdk 35 时同样存在，非升级引入
- **处理:** 不修复（超出范围），记录在此

## 已知限制

| 项目                        | 状态     | 说明                                       |
| --------------------------- | -------- | ------------------------------------------ |
| Jetifier                    | 仍启用   | 部分第三方库依赖 Support Library，无法禁用 |
| react-native-view-shot lint | 6 errors | 第三方库代码问题，需等待上游修复           |
| Kotlin K2 迁移              | 延后     | 高风险，建议 RN 0.77+ 后再执行             |

## Decisions Made

1. **buildToolsVersion 对齐策略**: 选择显式设置为 36.0.0（而非移除声明让 AGP 自动选择），确保版本可追溯
2. **Jetifier 保持启用**: 虽然项目已全量 AndroidX，但传递依赖中仍有 Support Library，无法安全禁用
3. **Kotlin 不升级**: K2 编译器重写带来的风险超过收益，等待 RN 生态适配
4. **core-splashscreen 不升级**: 1.0.1 与 API 36 兼容，无升级必要

## Metrics

- Duration: ~22 minutes
- Commits: 2 (c2ccd429, f6d13966)
- Files modified: 1 (apps/mobile/android/build.gradle)
- Build verifications: 4 (all passed)
- Core business code modified: 0

## Self-Check: PASSED

- [x] apps/mobile/android/build.gradle exists
- [x] apps/mobile/android/app/build.gradle exists
- [x] apps/mobile/android/gradle.properties exists
- [x] 04-01-SUMMARY.md exists
- [x] Commit c2ccd429 found in git log
- [x] Commit f6d13966 found in git log
- [x] react-native-screens remains 4.4.0 (locked)
- [x] react-native-reanimated remains 3.16.7 (locked)
- [x] buildToolsVersion = 36.0.0 (upgraded from 35.0.0)
- [x] targetSdkVersion = 36 (upgraded from 35)
- [x] compileSdkVersion = 36 (unchanged)
- [x] Zero core business code modified or deleted
