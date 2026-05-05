---
phase: 03-platform-assessment
plan: 01
subsystem: platform
tags:
  [android, api-36, compileSdk, targetSdk, risk-assessment, gradle, agp, kotlin, ndk, react-native]

requires:
  - phase: 00-baseline
    provides: codebase inventory, STACK.md, CONCERNS.md
  - phase: 02-dependency-governance
    provides: dependency audit context

provides:
  - ANDROID_BASELINE.md — complete Android build toolchain inventory
  - API36_RISK_ASSESSMENT.md — 9-dimension targetSdk 36 upgrade risk matrix
  - RN 0.76.8 official SDK version baseline from libs.versions.toml
  - Toolchain upgrade path (buildTools -> JDK -> Kotlin K2 -> AGP -> targetSdk)
  - Locked dependency impact analysis for API 36 compatibility

affects: [04-platform-upgrade, PLT-02, PLT-03]

tech-stack:
  added: []
  patterns: [audit-first risk assessment, version mismatch detection, merge manifest analysis]

key-files:
  created:
    - .planning/phases/03-platform-assessment/ANDROID_BASELINE.md
    - .planning/phases/03-platform-assessment/API36_RISK_ASSESSMENT.md
  modified: []

key-decisions:
  - "compileSdk=36 已高于 RN 0.76.8 官方推荐值 35，buildToolsVersion 35.0.0 与 compileSdk 36 不匹配需对齐"
  - "锁定模块 (screens 4.4.0, reanimated 3.16.7) 的 16KB 页面大小兼容性为最高风险项"
  - "Kotlin 1.9.25 已停止维护，K2 migration 是 targetSdk 36 升级的前置条件"

patterns-established:
  - "Audit-first: 从 libs.versions.toml 提取 RN 官方推荐值作为基线对比"
  - "9-dimension risk matrix: 预测性返回/边到边/权限/前台服务/广播/非SDK/ScopedStorage/后台任务/16KB"

requirements-completed: [PLT-01, PLT-02]

duration: 5min
completed: 2026-05-05
---

# Phase 3 Plan 01: Android 基线盘点 + API 36 风险评估 Summary

Android 构建工具链完整基线盘点 (compileSdk 36/targetSdk 35) + 9 维 targetSdk 36 升级风险矩阵 (3 High / 5 Medium / 1 Low)

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-05T04:50:57Z
- **Completed:** 2026-05-05T04:55:45Z
- **Tasks:** 2
- **Files modified:** 0 (audit only, no source code changes)

## Accomplishments

- 生成 ANDROID_BASELINE.md — 覆盖 SDK 版本、构建工具链、JDK 配置、RN 框架开关、签名配置、权限清单、第三方依赖共 8 个分组
- 发现 RN 0.76.8 官方推荐 compileSdk=35 / targetSdk=34，项目已超前使用 compileSdk=36 / targetSdk=35
- 生成 API36_RISK_ASSESSMENT.md — 9 维风险矩阵，识别 3 个 High 风险 (16KB 页面大小、权限模型变更、前台服务限制)
- 识别 buildToolsVersion 35.0.0 与 compileSdk 36 不匹配问题
- 建立 5 阶段工具链升级路径 (buildTools -> JDK -> Kotlin K2 -> AGP -> targetSdk)
- 关联 CONCERNS.md 中 P1-5/P1-6/P2-18 与 API 36 风险的交叉影响

## Task Commits

Each task was committed atomically:

1. **Task 1: ANDROID_BASELINE.md** - `c50a1894` (docs)
2. **Task 2: API36_RISK_ASSESSMENT.md** - `50eb4897` (docs)

## Files Created/Modified

- `.planning/phases/03-platform-assessment/ANDROID_BASELINE.md` - Android 构建基线盘点（8 分组完整清单）
- `.planning/phases/03-platform-assessment/API36_RISK_ASSESSMENT.md` - API 36 风险评估（9 维矩阵 + 升级路径）

## Decisions Made

- compileSdk=36 高于 RN 官方推荐，但当前可编译，风险聚焦在 buildTools 不匹配和 Kotlin 停维
- 锁定模块 (screens 4.4.0, reanimated 3.16.7) 无法升级，16KB 页面大小和 非 SDK 接口 限制是最高优先级风险
- 工具链升级建议按 buildTools -> JDK -> Kotlin K2 -> AGP -> targetSdk 顺序执行

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- RN 0.76.8 ReactAndroid 目录中无 `gradle.properties` 文件包含推荐 SDK 版本，需从 `gradle/libs.versions.toml` 提取 (compileSdk=35, targetSdk=34, minSdk=24, buildTools=35.0.0)

## Next Phase Readiness

- ANDROID_BASELINE.md 和 API36_RISK_ASSESSMENT.md 可直接用于 PLT-02 (平台升级与兼容修复) 的执行计划
- 3 个 High 风险需在升级前逐一验证（特别是 16KB 页面大小的锁定模块兼容性）
- veridex 扫描和实际构建验证为后续 PLT-03 的必做项

## Self-Check: PASSED

- FOUND: ANDROID_BASELINE.md
- FOUND: API36_RISK_ASSESSMENT.md
- FOUND: 03-01-SUMMARY.md
- FOUND: c50a1894 (Task 1 commit)
- FOUND: 50eb4897 (Task 2 commit)
- No source code files modified (audit-only as specified)

---

_Phase: 03-platform-assessment_
_Completed: 2026-05-05_
