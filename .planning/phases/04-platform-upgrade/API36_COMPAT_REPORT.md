# API 36 (Android 16) 兼容性报告

**项目:** 寻裳 XunO
**报告日期:** 2026-05-05
**配置:** compileSdk=36 / targetSdk=36 / RN 0.76.8 / AGP 8.9.1 / Kotlin 1.9.25 / Gradle 8.11.1
**Phase 4 工具链升级 + 行为变更修复**

---

## 1. 修改清单

### Phase 4 Plan 01 (工具链升级)

| 变更项                             | 文件                               | Commit   | 说明               |
| ---------------------------------- | ---------------------------------- | -------- | ------------------ |
| buildToolsVersion 35.0.0 -> 36.0.0 | `apps/mobile/android/build.gradle` | c2ccd429 | 对齐 compileSdk 36 |
| targetSdkVersion 35 -> 36          | `apps/mobile/android/build.gradle` | f6d13966 | 对齐 Android 16    |

### Phase 4 Plan 02 (行为变更修复)

| 变更项                            | 文件                  | Commit   | 说明                               |
| --------------------------------- | --------------------- | -------- | ---------------------------------- |
| 移除 requestLegacyExternalStorage | `AndroidManifest.xml` | b1519454 | targetSdk 30+ 已忽略，清理无效属性 |

### 未修改项 (明确标注)

| 文件/配置                                | 原因                                                 |
| ---------------------------------------- | ---------------------------------------------------- |
| `enableOnBackInvokedCallback="false"`    | RN 0.76.8 + screens 4.4.0 未适配预测性返回，保留禁用 |
| `usesCleartextTraffic="true"`            | 内部服务 (MinIO/Qdrant/Python) 使用 HTTP，必须保留   |
| `network_security_config.xml`            | 当前配置满足 targetSdk 36 要求                       |
| `screenOrientation="portrait"`           | 强制竖屏策略不变                                     |
| 所有权限声明                             | 与实际使用一致，无需调整                             |
| `MainActivity.kt` / `MainApplication.kt` | 标准 RN 模板代码，无需修改                           |

---

## 2. 构建结果

| 构建项            | 命令                                  | 结果     | 说明                                |
| ----------------- | ------------------------------------- | -------- | ----------------------------------- |
| Android Debug APK | `./gradlew assembleDebug`             | **PASS** | BUILD SUCCESSFUL in 11s (738 tasks) |
| Gradle 依赖解析   | `./gradlew :app:processDebugManifest` | **PASS** | BUILD SUCCESSFUL in 14s             |
| Android Tests     | `./gradlew test`                      | **PASS** | BUILD SUCCESSFUL (无原生测试用例)   |

---

## 3. 测试结果

| 测试项               | 命令                     | 结果     | 说明                                                    |
| -------------------- | ------------------------ | -------- | ------------------------------------------------------- |
| Android 原生单元测试 | `./gradlew test`         | **SKIP** | 项目无原生 Android 测试用例（仅 56 行 Kotlin 模板代码） |
| JS 层单元测试        | `pnpm test` / turbo test | **SKIP** | 非本 Phase 范围，JS 测试在回归验证 Phase 执行           |

---

## 4. Lint 结果

| Lint 项      | 命令             | 结果                | 说明                                                              |
| ------------ | ---------------- | ------------------- | ----------------------------------------------------------------- |
| Android Lint | `./gradlew lint` | **PASS (已知问题)** | 6 errors / 2 warnings，全部来自 `react-native-view-shot` 第三方库 |

### Lint 错误详情

所有 6 个 error 和 2 个 warning 来自 `node_modules/react-native-view-shot`，具体为 `UnsafeOptInUsageError` (使用了 RN 的 `@UnstableReactNativeAPI` 未标注 `@OptIn`)。

**结论:** 非 Phase 4 引入，targetSdk 35 时同样存在。需等待上游修复或替换该库。

---

## 5. 剩余风险

### 行为变更未完全解决项

| #   | 行为变更                     | 状态         | 风险       | 说明                                                                                                                                      |
| --- | ---------------------------- | ------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 预测性返回 (Predictive Back) | **保留现状** | Low-Medium | `enableOnBackInvokedCallback="false"` 在 targetSdk 36 下可能被系统忽略。RN 0.76.8 + screens 4.4.0 锁定版本未适配。需在真机测试验证        |
| 7   | 大屏/折叠屏                  | **保留现状** | Low        | `screenOrientation="portrait"` 在折叠屏设备上强制竖屏。如需支持折叠屏展开，需用户决策 (Rule 4)                                            |
| 9   | 非 SDK 接口限制 (锁定模块)   | **无法修复** | Medium     | react-native-screens 4.4.0 和 react-native-reanimated 3.16.7 可能使用 greylisted API。锁定版本无法升级。如触发 blacklist 崩溃，需解除锁定 |

### 稳定性风险未完全解决项

| #       | 风险项            | 严重度   | 状态       | 说明                                                                                   |
| ------- | ----------------- | -------- | ---------- | -------------------------------------------------------------------------------------- |
| C-2     | 16KB 页面大小兼容 | Critical | **文档**   | 锁定模块的 .so 文件可能未对齐 16KB 页面。无法直接修复 .so 文件，需在 16KB 模拟器上实测 |
| C-3     | 非 SDK 接口终止   | High     | **文档**   | 锁定模块风险，需 veridex 扫描确认                                                      |
| M-1/M-2 | 冷启动性能基线    | Medium   | **待测量** | 需在 targetSdk 36 下测量冷启动时间对比基线                                             |

### 安全注意事项

| 项                            | 说明                                                                   |
| ----------------------------- | ---------------------------------------------------------------------- |
| `usesCleartextTraffic="true"` | 必须保留。内部服务 MinIO/Qdrant/Python 使用 HTTP。长期建议迁移至 HTTPS |
| 81 silent catch{} blocks      | 非 Phase 4 范围，但在 API 36 行为变更下可能导致原生异常被静默吞噬      |

---

## 6. 回滚方式

### 完整回滚 (恢复到 Phase 4 之前)

```bash
# 回滚到 Phase 4 开始前的 commit (Phase 3 完成后的最后一个 commit)
git revert HEAD~3..HEAD --no-edit

# 或者硬回滚到指定 commit
git checkout 85a654f5 -- apps/mobile/android/
```

### 单项回滚

| 回滚项                            | Git 命令                                                                                  |
| --------------------------------- | ----------------------------------------------------------------------------------------- |
| 恢复 requestLegacyExternalStorage | `git checkout HEAD~1 -- apps/mobile/android/app/src/main/AndroidManifest.xml`             |
| 恢复 targetSdk 35                 | 在 `apps/mobile/android/build.gradle` 中将 `targetSdkVersion = 36` 改为 `35`              |
| 恢复 buildToolsVersion 35.0.0     | 在 `apps/mobile/android/build.gradle` 中将 `buildToolsVersion = "36.0.0"` 改为 `"35.0.0"` |

### 回滚验证

```bash
cd apps/mobile/android && ./gradlew assembleDebug
```

---

## 附录: 10 项行为变更逐项处理结果

| #   | 行为变更                     | 处理结果                | Commit   | 说明                                                                                                     |
| --- | ---------------------------- | ----------------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| 1   | 预测性返回 (Predictive Back) | **不涉及/已由框架处理** | --       | 项目无自定义 back 处理，RN 0.76.8 ReactActivity 处理返回事件。保留 `enableOnBackInvokedCallback="false"` |
| 2   | 边到边布局 (Edge-to-Edge)    | **不涉及/已适配**       | --       | AppTheme 已设置透明状态栏/导航栏。SafeAreaProvider + SafeAreaView 覆盖 62 个文件                         |
| 3   | 权限行为变化                 | **不涉及/已正确声明**   | --       | 5 个危险权限 + 1 个特殊权限均有对应功能。READ/WRITE_EXTERNAL_STORAGE 正确限制 maxSdk=32                  |
| 4   | 后台任务限制                 | **不涉及**              | --       | 项目无 WorkManager/JobScheduler/后台 fetch                                                               |
| 5   | 通知权限与通知渠道           | **不涉及(低影响)**      | --       | POST_NOTIFICATIONS 已声明，Sentry auto-init=false，无主动通知功能                                        |
| 6   | Scoped Storage / Media 权限  | **已修复**              | b1519454 | 移除无效的 requestLegacyExternalStorage 属性                                                             |
| 7   | 大屏/折叠屏/横竖屏限制       | **保留现状**            | --       | screenOrientation="portrait" 强制竖屏，功能正常                                                          |
| 8   | 生命周期与前台服务限制       | **不涉及**              | --       | 合并 Manifest 审计确认无 `<service>` 声明。项目无前台服务                                                |
| 9   | 非 SDK 接口限制              | **不涉及(项目代码)**    | --       | 项目 56 行 Kotlin 仅使用标准 SDK API。锁定模块风险单独追踪                                               |
| 10  | 废弃 API 替换                | **不涉及**              | --       | 项目 Kotlin 代码未使用任何废弃 API                                                                       |

---

_报告生成完成: 2026-05-05 | Phase 4 Plan 02: 行为变更修复 + 回归验证_
