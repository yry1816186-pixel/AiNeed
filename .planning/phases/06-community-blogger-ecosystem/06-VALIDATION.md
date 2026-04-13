---
phase: 06
slug: community-blogger-ecosystem
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.x (backend + mobile) |
| **Config file** | apps/backend/jest.config.js, apps/mobile/jest.config.js |
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
| 06-01-01 | 01 | 1 | SOC-01/SOC-04/SOC-12 | T-06-04 | ContentReport unique约束防重复举报 | unit | `npx jest community.service.spec` | ✅ | ⬜ pending |
| 06-01-02 | 01 | 1 | SOC-01 | — | Schema push blocking task | manual | `npx prisma db push` | ✅ | ⬜ pending |
| 06-01-03 | 01 | 1 | SOC-03/SOC-04/SOC-05/SOC-12 | T-06-04 | 举报限流20次/天 | unit | `npx jest community.service.spec` | ✅ | ⬜ pending |
| 06-01-04 | 01 | 1 | SOC-03/SOC-05 | — | N/A | unit | `npx jest community.service.spec` | ✅ | ⬜ pending |
| 06-01-05 | 01 | 1 | SOC-02 | — | N/A | unit | `npx jest community.service.spec` | ✅ | ⬜ pending |
| 06-02-01 | 02 | 2 | SOC-08/SOC-09/SOC-10 | T-06-01/T-06-02 | bloggerLevel防篡改+价格校验 | unit | `npx jest blogger-score.service.spec` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 2 | SOC-08 | T-06-01 | bloggerLevel仅系统计算 | unit | `npx jest blogger-score.service.spec` | ❌ W0 | ⬜ pending |
| 06-02-03 | 02 | 2 | SOC-09 | T-06-02 | 博主商品价格0.01-99999，先上后审 | unit | `npx jest blogger-product.service.spec` | ❌ W0 | ⬜ pending |
| 06-02-04 | 02 | 2 | SOC-10 | — | N/A | unit | `npx jest blogger-dashboard.service.spec` | ❌ W0 | ⬜ pending |
| 06-02-05 | 02 | 2 | SOC-08/SOC-09/SOC-10 | — | N/A | unit | `npx jest blogger.controller.spec` | ❌ W0 | ⬜ pending |
| 06-03-01 | 03 | 2 | SOC-11 | T-06-03 | 审核日志append-only不可篡改 | unit | `npx jest content-moderation.service.spec` | ❌ W0 | ⬜ pending |
| 06-03-02 | 03 | 2 | SOC-11 | T-06-03 | 内容审核集成 | unit | `npx jest community.service.spec` | ✅ | ⬜ pending |
| 06-03-03 | 03 | 2 | SOC-11/SOC-12 | T-06-05 | AdminGuard保护管理端点 | unit | `npx jest admin-community.controller.spec` | ❌ W0 | ⬜ pending |
| 06-04-01 | 04 | 3 | SOC-01/SOC-03/SOC-12 | — | N/A | component | `npx jest CommunityScreen.test` | ✅ | ⬜ pending |
| 06-04-02 | 04 | 3 | SOC-02 | — | N/A | component | `npx jest CreatePostScreen.test` | ❌ W0 | ⬜ pending |
| 06-04-03 | 04 | 3 | SOC-04/SOC-05 | — | N/A | component | `npx jest PostDetailScreen.test` | ❌ W0 | ⬜ pending |
| 06-04-04 | 04 | 3 | SOC-04 | — | N/A | component | `npx jest NotificationsScreen.test` | ✅ | ⬜ pending |
| 06-05-01 | 05 | 3 | SOC-08/SOC-09/SOC-10 | — | N/A | unit | `npx jest blogger.api.test` | ❌ W0 | ⬜ pending |
| 06-05-02 | 05 | 3 | SOC-08 | — | N/A | component | `npx jest BloggerProfileScreen.test` | ❌ W0 | ⬜ pending |
| 06-05-03 | 05 | 3 | SOC-09 | T-06-06 | 支付金额校验 | component | `npx jest BloggerProductScreen.test` | ❌ W0 | ⬜ pending |
| 06-05-04 | 05 | 3 | SOC-10 | — | N/A | component | `npx jest BloggerDashboardScreen.test` | ❌ W0 | ⬜ pending |
| 06-05-05 | 05 | 3 | SOC-06/SOC-07 | — | N/A | component | `npx jest WardrobeScreen.test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/backend/src/modules/community/community.service.spec.ts` — 扩展现有测试覆盖收藏/分享/举报/热门
- [ ] `apps/backend/src/modules/blogger/blogger-score.service.spec.ts` — 博主评分计算+防篡改测试
- [ ] `apps/backend/src/modules/blogger/blogger-product.service.spec.ts` — 博主商品上架+购买测试
- [ ] `apps/backend/src/modules/blogger/blogger-dashboard.service.spec.ts` — 数据面板测试
- [ ] `apps/backend/src/modules/community/content-moderation.service.spec.ts` — 内容审核+日志不可篡改测试
- [ ] `apps/backend/src/modules/admin/admin-community.controller.spec.ts` — 管理后台API测试

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 热门趋势展示 UI | SOC-12 | 视觉验证 | 查看社区热门标签卡片是否正确展示趋势方向 |
| 博主等级标识 badge | SOC-08 | 视觉验证 | 查看博主/大V头像旁 badge 展示 |
| 拖拽排序交互 | SOC-07 | 手势交互 | 在灵感衣橱中拖拽分类卡片验证排序 |
| 收藏即归档底部 sheet | SOC-04/SOC-06 | 交互流程 | 收藏帖子时弹出分类选择 sheet |
| 大V专属客服入口 | SOC-08/D-05 | 功能验证 | 大V博主商品详情页显示客服入口 |

---

## Deferred Verifications (v3)

| Behavior | Requirement | Why Deferred | Notes |
|----------|-------------|-------------|-------|
| APNs/FCM 系统推送 | SOC-04/D-28 | expo-notifications 未安装 | MVP 仅 App 内通知 + WebSocket |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
