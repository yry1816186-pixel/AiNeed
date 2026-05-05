---
phase: 03-platform-assessment
plan: 02
subsystem: platform
tags: [android, api-36, toolchain, behavior-changes, stability, crash-risk, lifecycle, upgrade-plan]

requires:
  - phase: 03-platform-assessment
    plan: 01
    provides: ANDROID_BASELINE.md, API36_RISK_ASSESSMENT.md

provides:
  - TOOLCHAIN_UPGRADE_PLAN.md — 5-group upgrade roadmap with execution order
  - TARGETSDK36_BEHAVIOR_CHANGES.md — 10-item behavior change assessment
  - STABILITY_RISK_REPORT.md — 5-dimension stability risk report

affects: [04-platform-upgrade, PLT-02, PLT-03]

tech-stack:
  added: []
  patterns: [group-by-group upgrade, risk-dimension analysis, CONCERNS.md correlation]

key-files:
  created:
    - .planning/phases/03-platform-assessment/TOOLCHAIN_UPGRADE_PLAN.md
    - .planning/phases/03-platform-assessment/TARGETSDK36_BEHAVIOR_CHANGES.md
    - .planning/phases/03-platform-assessment/STABILITY_RISK_REPORT.md
  modified: []

key-decisions:
  - "JDK 17 / Gradle 8.11.1 / AGP 8.9.1 / Kotlin 1.9.25 — 全部保持当前版本，buildToolsVersion 需对齐 compileSdk 36"
  - "K2 migration (Kotlin 2.0+) 标记为高风险延后项，建议 RN 版本升级后再执行"
  - "16KB 页面兼容性和 foregroundServiceType 审计为 Phase 4 最高优先级"

patterns-established:
  - "5-dimension stability analysis: Crash / Lifecycle / Coroutine / MainThread / Network-IO"
  - "CONCERNS.md correlation: P1-1 silent catches + P1-4 HTTP + P2-18 network block"

requirements-completed: [PLT-03, PLT-04, PLT-05]

duration: 10min
completed: 2026-05-05
---

# Phase 3 Plan 02: 工具链升级方案 + 行为变更评估 + 稳定性风险报告 Summary

5 组工具链升级路线图 (全部保持当前版本 + buildToolsVersion 修复) + 10 项 API 36 行为变更逐项评估 (2 High / 6 Medium / 2 Low) + 5 维稳定性风险报告 (2 Critical / 1 High / 11 Medium / 6 Low / 1 N/A)

## Performance

- **Duration:** 10 min
- **Started:** 2026-05-05T04:58:58Z
- **Completed:** 2026-05-05T05:08:45Z
- **Tasks:** 3
- **Files modified:** 0 (audit only, no source code changes)

## Accomplishments

- 生成 TOOLCHAIN_UPGRADE_PLAN.md — 5 组升级方案 (JDK/Gradle/AGP/Kotlin/AndroidX) + 执行顺序图 + 不可升级项清单 + 5 项待确认
- 全部 5 组建议保持当前版本: JDK 17 / Gradle 8.11.1 / AGP 8.9.1 / Kotlin 1.9.25 / AndroidX，仅 buildToolsVersion 需升级至 36.0.0
- 生成 TARGETSDK36_BEHAVIOR_CHANGES.md — 10 项行为变更逐项评估，每项含变更描述、影响等级、当前代码分析、涉及判断、修复位置
- 明确标注 2 项"不涉及": #4 后台任务限制（无后台任务）和 #9 非 SDK 接口（项目代码不使用反射）
- 生成 STABILITY_RISK_REPORT.md — 5 维风险评估: 崩溃 (7 项) / 生命周期 (4 项) / 协程 (2 项) / 主线程 (5 项) / 网络 IO (5 项)
- 识别 2 个 Critical 风险: foregroundServiceType 未声明 + 16KB 页面大小兼容
- 建立 CONCERNS.md 交叉关联: P1-1 (81 silent catches) + P1-4 (HTTP internal) + P2-18 (China network)
- 提出 Phase 4 优先级建议: 16KB 验证 > foregroundServiceType 审计 > veridex 扫描 > 明文流量检查 > 性能基线

## Task Commits

Each task was committed atomically:

1. **Task 1: TOOLCHAIN_UPGRADE_PLAN.md** - `9e5af7a1` (docs)
2. **Task 2: TARGETSDK36_BEHAVIOR_CHANGES.md** - `79a1da60` (docs)
3. **Task 3: STABILITY_RISK_REPORT.md** - `fda9f4c3` (docs)

## Files Created/Modified

- `.planning/phases/03-platform-assessment/TOOLCHAIN_UPGRADE_PLAN.md` - 5 组工具链升级方案 (16KB)
- `.planning/phases/03-platform-assessment/TARGETSDK36_BEHAVIOR_CHANGES.md` - 10 项行为变更评估 (24KB)
- `.planning/phases/03-platform-assessment/STABILITY_RISK_REPORT.md` - 5 维稳定性风险报告 (21KB)

## Decisions Made

- JDK 17 / Gradle 8.11.1 / AGP 8.9.1 / Kotlin 1.9.25 — 全部保持当前版本，API 36 不要求任何工具链强制升级
- buildToolsVersion 35.0.0 需升级至 36.0.0 以与 compileSdk 36 对齐，或移除声明让 AGP 自动选择
- Kotlin K2 迁移标记为高风险延后项: 项目 Kotlin 代码仅 56 行，但 RN 框架和第三方模块兼容性未确认
- 锁定模块 (screens 4.4.0 / reanimated 3.16.7) 如果触发 API 36 不兼容，需用户决策是否解除锁定（架构决策）

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- 部分评估项标记【信息待补充】需实际构建/运行验证 (veridex 扫描、16KB 验证工具、合并 Manifest 审计)
- 这是有意为之: 审计阶段仅基于文件系统分析，实际验证留给 Phase 4

## Next Phase Readiness

- 3 个文档可直接用于 Phase 4 (平台升级执行) 的操作指南
- Phase 4 第一优先级: 16KB 页面验证 + foregroundServiceType 审计 (预估 2.5 天)
- Phase 4 总预估工时: 4-5 天 (5 个优先级项)
- 所有版本引用已与 ANDROID_BASELINE.md 保持一致

## Self-Check: PASSED

- FOUND: TOOLCHAIN_UPGRADE_PLAN.md
- FOUND: TARGETSDK36_BEHAVIOR_CHANGES.md
- FOUND: STABILITY_RISK_REPORT.md
- FOUND: 9e5af7a1 (Task 1 commit)
- FOUND: 79a1da60 (Task 2 commit)
- FOUND: fda9f4c3 (Task 3 commit)
- No source code files modified (audit-only as specified)

---

_Phase: 03-platform-assessment_
_Completed: 2026-05-05_
