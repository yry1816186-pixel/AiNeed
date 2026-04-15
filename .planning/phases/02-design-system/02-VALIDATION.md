---
phase: 2
slug: design-system
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-16
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x |
| **Config file** | apps/mobile/jest.config.js |
| **Quick run command** | `cd apps/mobile && npx jest --changedSince=HEAD~1 --passWithNoTests` |
| **Full suite command** | `cd apps/mobile && npx jest` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/mobile && npx jest --changedSince=HEAD~1 --passWithNoTests`
- **After every plan wave:** Run `cd apps/mobile && npx jest`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | DSGN-06 | — | N/A | unit | `cd apps/mobile && npx jest --testPathPattern=tokens` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | DSGN-06 | — | N/A | unit | `cd apps/mobile && npx jest --testPathPattern=compat` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | DSGN-01 | — | N/A | unit | `cd apps/mobile && npx jest --testPathPattern=color-audit` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | DSGN-01 | — | N/A | unit | `cd apps/mobile && npx jest --testPathPattern=color-migration` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 2 | DSGN-02 | — | N/A | unit | `cd apps/mobile && npx jest --testPathPattern=typography-audit` | ❌ W0 | ⬜ pending |
| 02-03-02 | 03 | 2 | DSGN-02 | — | N/A | unit | `cd apps/mobile && npx jest --testPathPattern=typography-migration` | ❌ W0 | ⬜ pending |
| 02-04-01 | 04 | 2 | DSGN-03 | — | N/A | unit | `cd apps/mobile && npx jest --testPathPattern=spacing-audit` | ❌ W0 | ⬜ pending |
| 02-04-02 | 04 | 2 | DSGN-03 | — | N/A | unit | `cd apps/mobile && npx jest --testPathPattern=spacing-migration` | ❌ W0 | ⬜ pending |
| 02-05-01 | 05 | 3 | DSGN-04 | — | N/A | unit | `test ! -f apps/mobile/tailwind.config.js` | ✅ | ⬜ pending |
| 02-05-02 | 05 | 3 | DSGN-05 | — | N/A | unit | `cd apps/mobile && grep -r "from 'react-native-paper'" src/ \| wc -l` | ✅ | ⬜ pending |
| 02-06-01 | 06 | 3 | DSGN-01..06 | — | N/A | e2e | `cd apps/mobile && npx jest --testPathPattern=dark-mode` | ❌ W0 | ⬜ pending |
| 02-06-02 | 06 | 3 | DSGN-01..06 | — | N/A | e2e | `cd apps/mobile && npx jest --testPathPattern=visual-regression` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/mobile/src/theme/__tests__/tokens.test.ts` — stubs for DSGN-06 (token completeness)
- [ ] `apps/mobile/src/theme/__tests__/compat.test.ts` — stubs for theme.colors.* compatibility layer
- [ ] `apps/mobile/scripts/__tests__/color-audit.test.ts` — stubs for DSGN-01 audit script
- [ ] `apps/mobile/scripts/__tests__/typography-audit.test.ts` — stubs for DSGN-02 audit script
- [ ] `apps/mobile/scripts/__tests__/spacing-audit.test.ts` — stubs for DSGN-03 audit script

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 暗色模式视觉一致性 | DSGN-01..06 | 截图对比需要人工判断 | 切换暗色模式，逐页检查核心页面（Home, StylistChat, Cart, Profile） |
| 核心页面视觉回归 | DSGN-01..06 | 自动截图测试未配置 | 迁移前后截图对比，确认无视觉差异 |
| Paper 组件保留 | DSGN-05 | 需要运行时验证 | 确认 Dialog/BottomSheet 仍使用 Paper 渲染 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
