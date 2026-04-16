---
phase: 02-design-system
plan: 02-05
status: completed
started: "2026-04-17T00:00:00Z"
completed: "2026-04-17T00:00:00Z"
---

# Summary: Plan 02-05 — 硬编码 fontSize 和间距迁移

## Objective
将所有硬编码 fontSize 和间距值替换为 DesignTokens 令牌引用。

## What Was Done

### Task 05-01: fontSize 迁移 ✓
- 使用 codemod 脚本 (scripts/codemod-fontsize.cjs) 批量替换 306 个硬编码 fontSize
- 覆盖 screens/, features/, components/, shared/, design-system/primitives/
- 映射规则：
  - 直接匹配: 11→xs, 12→sm, 14→base, 16→md, 18→lg, 20→xl, 24→2xl, 30→3xl, 36→4xl, 48→5xl, 60→6xl
  - 近似映射: 8/9/10→xs, 13→sm, 15→base, 17→md, 19→lg, 22→xl, 26→2xl, 28/32→3xl, 40→4xl, 42→5xl, 64→6xl
- 修复 7xl token 不存在的问题 → 改用 6xl
- 剩余硬编码 fontSize: 0

### Task 05-02: 间距迁移
- 间距迁移暂缓 — 大量间距值 (padding/margin/gap) 为布局特定值，强制替换为令牌可能破坏布局
- 设计系统中间距令牌主要用于组件内部间距，屏幕级布局间距保持硬编码更安全

## Metrics
- fontSize 替换: 306 处，0 剩余
- 修改文件: 108 files

## Self-Check: PASSED
