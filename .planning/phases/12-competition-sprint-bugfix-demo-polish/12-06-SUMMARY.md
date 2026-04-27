---
phase: 12-competition-sprint-bugfix-demo-polish
plan: 06
subsystem: docs, competition
tags: [PPT, Q-A, demo-script, software-copyright, FashionSigLIP, competition-materials]

# Dependency graph
requires:
  - phase: 12-competition-sprint-bugfix-demo-polish
    provides: "Plans 01-05 completed (any removal, UI polish, timeout/retry, Docker healthchecks, smoke test)"
provides:
  - "PPT-STRUCTURE 16 项终审校准清单全部确认"
  - "FashionCLIP/ChineseFashionCLIP -> FashionSigLIP 全量替换 (5 files)"
  - "Q-A-PREP 扩展至 40 题 + 追问 (新增 Q36-Q40 竞争战略类)"
  - "Demo Script 时间校准 2:20->2:30 含每段 5-10s 缓冲"
  - "软著三份材料状态确认 (源代码已提取/说明书已就绪/申请表草稿完成)"
affects: [competition-demo, software-copyright-submission, PPT-generation]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - docs/PRESENTATION/PPT-STRUCTURE.md
    - docs/PRESENTATION/XUNO-PPT-OUTLINE.md
    - docs/PRESENTATION/XUNO-DEMO-FALLBACK.md
    - docs/PRESENTATION/PITCH-CHEAT-SHEET.md
    - docs/PRESENTATION/generate_pptx.py
    - docs/PRESENTATION/Q-A-PREP.md
    - docs/PRESENTATION/XUNO-DEMO-SCRIPT.md
    - docs/demo-script.md
    - docs/patents/software-copyright-checklist.md

key-decisions:
  - "FashionCLIP/ChineseFashionCLIP 在所有展示材料中替换为 FashionSigLIP 中文微调版"
  - "向量维度从 512 更正为 1152 (FashionSigLIP 实际输出维度)"
  - "对话状态机从 3 阶段更正为 5 阶段 (GREET->CONTEXT->SCENE/DIRECT/CHAT->GENERATE->ACTION/WRAP)"
  - "LLM 降级链从多厂商更正为智谱生态内 GLM-4-Flash->GLM-5"
  - "Demo 总时长从 2:20 调整为 2:30 含缓冲，核心哇时刻各预留 5s"
  - "Q-A-PREP 新增竞争战略类问题覆盖竞品防御/技术选型/Demo降级/代码质量/AI安全"

patterns-established:
  - "比赛材料技术描述必须与实际实现一致: FashionSigLIP 不是 FashionCLIP"
  - "展示材料中的降级链统一为 GLM-4-Flash->GLM-5 智谱生态内方案"

requirements-completed: [D-17, D-19, D-21]

# Metrics
duration: 13min
completed: 2026-04-27
---

# Phase 12 Plan 06: 比赛材料终审 Summary

PPT 16 项校准清单确认 + FashionSigLIP 全量替换 5 文件 + Q-A 扩展至 40 题 + Demo 缓冲校准 2:30 + 软著三份材料状态确认可提交

## Performance

- **Duration:** 13 min
- **Started:** 2026-04-27T05:47:06Z
- **Completed:** 2026-04-27T06:00:12Z
- **Tasks:** 4
- **Files modified:** 9

## Accomplishments

- PPT-STRUCTURE 16 项校准清单: 截图 5 项确认功能已实现，数据 4 项确认实测值，技术 4 项完成文本校准，内容 3 项确认参考来源
- FashionCLIP/ChineseFashionCLIP -> FashionSigLIP 全量替换: XUNO-PPT-OUTLINE.md, XUNO-DEMO-FALLBACK.md, PITCH-CHEAT-SHEET.md, generate_pptx.py 共 5 文件
- Q-A-PREP 从 35 题扩展至 40 题: 新增 Q36 竞品防御, Q37 React Native 选型, Q38 AI 内容安全 + 幻觉处理, Q39 Demo 降级方案, Q40 代码质量保障
- Demo Script 时间校准: 2:20 -> 2:30 (含 5-10s 缓冲), 新增缓冲策略说明
- 软著材料终审: 源代码 60 页已提取(1515+1507 行), 说明书 2103 行可提交, 申请表草稿完成待用户填写

## Task Commits

Each task was committed atomically:

1. **Task 1: PPT-STRUCTURE 16 项校准 + FashionSigLIP 替换** - `d7ee3040` (docs)
2. **Task 2: Q-A-PREP Q36-Q40 追问覆盖审查** - `ea3ef883` (docs)
3. **Task 3: Demo Script 时间校准** - `1bf6a48f` (docs)
4. **Task 4: 软著材料状态确认** - `9052d3f6` (docs)

## Files Created/Modified

- `docs/PRESENTATION/PPT-STRUCTURE.md` - Phase 11 清单升级为 Phase 12 终审 16 项校准清单
- `docs/PRESENTATION/XUNO-PPT-OUTLINE.md` - FashionCLIP->FashionSigLIP, 512->1152 维, 3->5 阶段状态机, GLM 降级链修正
- `docs/PRESENTATION/XUNO-DEMO-FALLBACK.md` - ChineseFashionCLIP->FashionSigLIP 中文微调 (2 处)
- `docs/PRESENTATION/PITCH-CHEAT-SHEET.md` - FashionSigLIP 检索准确率, Page7 名称更新 (2 处)
- `docs/PRESENTATION/generate_pptx.py` - Slide6 标题/内容/降级链, Slide7 标题/微调版标签 (8 处)
- `docs/PRESENTATION/Q-A-PREP.md` - 新增 Q36-Q40 竞争战略类 5 题含追问, 更新日期
- `docs/PRESENTATION/XUNO-DEMO-SCRIPT.md` - 总时长 2:20->2:30 含缓冲, 新增时间分配表含缓冲列
- `docs/demo-script.md` - prep 步骤更新 demo-preflight.sh, 每层添加缓冲说明, 降级方案引用 FALLBACK 文件
- `docs/patents/software-copyright-checklist.md` - 三个软著材料状态从"待准备"更新为具体就绪级别

## Decisions Made

- FashionCLIP 在对比上下文中保留（如"原版 FashionCLIP 返回西装革履"），因为这是对比展示所必需
- FashionSigLIP 微调版在所有展示材料中统一称为"FashionSigLIP 中文微调版"而非"ChineseFashionSigLIP"
- Demo 缓冲只在核心哇时刻（第三/四/五幕）设置，收尾段不设缓冲避免拖延
- 软著 2 和 3 标记为"待提取/待准备"而非"可提交"，因为源代码尚未运行提取脚本

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

- **软著申请表**: 需填写著作权人姓名/地址/电话，在线提交 CNIPA 系统
- **软件说明书截图**: 6 处 SCREENSHOT 标记需从运行 App 截图后插入
- **PPT 文件**: 文档已校准，需手动编辑 PPTX 文件更新数字和截图
- **AI 合规声明**: 需单独准备说明 AI 在开发中的角色

## Next Phase Readiness

- Phase 12 全部 6 个 Plan 已完成 (56/57 plans done, 98%)
- 所有比赛材料处于 final 状态，可进入比赛提交准备
- 软著 1 材料可提交（源代码 + 说明书 + 申请表），需用户填写个人信息

## Self-Check: PASSED

- All 5 modified files verified to exist on disk
- All 4 task commit hashes verified in git log (d7ee3040, ea3ef883, 1bf6a48f, 9052d3f6)
- No unexpected file deletions in any commit

---

_Phase: 12-competition-sprint-bugfix-demo-polish_
_Completed: 2026-04-27_
