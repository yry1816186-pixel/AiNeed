---
phase: 03
slug: virtual-try-on
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.x (backend) + Python pytest (ML) |
| **Config file** | apps/backend/jest.config.js |
| **Quick run command** | `cd apps/backend && npx jest --passWithNoTests --no-coverage` |
| **Full suite command** | `cd apps/backend && npx jest --no-coverage` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/backend && npx jest --passWithNoTests --no-coverage`
- **After every plan wave:** Run `cd apps/backend && npx jest --no-coverage`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | VTO-03 | T-03-01 | Doubao-Seedream API key 不暴露在日志中 | unit | `npx jest doubao-seedream.provider.spec` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | VTO-04 | — | GLM 降级熔断器正确触发 | unit | `npx jest glm-tryon.provider.spec` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | VTO-03/VTO-04 | — | Orchestrator 按 priority 排序选择 provider | unit | `npx jest tryon-orchestrator.service.spec` | ✅ | ⬜ pending |
| 03-01-04 | 01 | 1 | VTO-06 | — | 30s 超时 Promise.race 正确终止 | unit | `npx jest queue.processor.spec` | ✅ | ⬜ pending |
| 03-02-01 | 02 | 2 | VTO-07 | T-03-02 | 每日重试限制不可绕过（Redis+DB 双层） | unit | `npx jest try-on.service.spec` | ✅ | ⬜ pending |
| 03-02-02 | 02 | 2 | VTO-05/VTO-06 | — | WebSocket 进度推送包含正确 stage/progress | unit | `npx jest notification.service.spec` | ✅ | ⬜ pending |
| 03-02-03 | 02 | 2 | VTO-08 | — | Prisma schema 新字段正确迁移 | structural | `npx prisma validate` | ✅ | ⬜ pending |
| 03-02-04 | 02 | 2 | VTO-08 | — | 历史查询支持多维筛选 | unit | `npx jest try-on.service.spec` | ✅ | ⬜ pending |
| 03-02-05 | 02 | 2 | VTO-01/VTO-02 | — | 照片质量低于阈值时自动增强 | unit | `npx jest try-on.service.spec` | ✅ | ⬜ pending |
| 03-03-01 | 03 | 3 | VTO-05/VTO-06 | — | WebSocket 进度实时更新 UI | structural | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 03-03-02 | 03 | 3 | VTO-11 | — | 原图/效果图对比交互正常 | structural | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 03-03-03 | 03 | 3 | VTO-10 | — | 分享功能截图+水印+系统分享菜单 | structural | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 03-03-04 | 03 | 3 | VTO-08 | — | 试衣历史页面加载+筛选+删除 | structural | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 03-04-01 | 04 | 4 | VTO-12 | — | MinIO 水印图生成正确 | unit | `npx jest storage.service.spec` | ✅ | ⬜ pending |
| 03-04-02 | 04 | 4 | VTO-12 | — | Prisma watermarkedImageUrl 字段迁移 | structural | `npx prisma validate` | ✅ | ⬜ pending |
| 03-04-03 | 04 | 4 | VTO-03/VTO-04 | — | ML 虚拟试衣路由 Doubao+GLM 双链路 | unit | `pytest ml/tests/test_virtual_tryon.py` | ❌ W0 | ⬜ pending |
| 03-04-04 | 04 | 4 | VTO-08 | — | 试衣结果自动归档到灵感衣橱 | unit | `npx jest try-on.service.spec` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/backend/src/modules/try-on/services/doubao-seedream.provider.spec.ts` — stubs for VTO-03
- [ ] `apps/backend/src/modules/try-on/services/glm-tryon.provider.spec.ts` — stubs for VTO-04
- [ ] `ml/tests/test_virtual_tryon.py` — stubs for ML virtual tryon route

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Doubao-Seedream 真实换装效果 | VTO-03 | 需要真实 API 调用和图片 | 上传人物照+服装图，验证生成效果图质量 |
| GLM 降级自动切换 | VTO-04 | 需要 Doubao-Seedream 不可用 | 模拟 Doubao 故障，验证 GLM 自动接管 |
| 30 秒超时降级提示 | VTO-06 | 需要真实网络延迟 | 模拟慢速 API，验证 30s 后降级提示 |
| 微信/QQ 分享功能 | VTO-10 | 需要真实平台 SDK | 在真机上测试分享到微信/QQ |
| 照片自动修复效果 | VTO-02 | 需要真实低质量照片 | 上传暗光/杂乱背景照片，验证增强效果 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
