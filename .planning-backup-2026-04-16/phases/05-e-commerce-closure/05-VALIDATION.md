---
phase: 5
slug: e-commerce-closure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.x |
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
| 05-01-01 | 01 | 1 | COMM-01 | T-05-01 | 商品详情仅返回 isActive 商品 | unit | `npx jest clothing.service.spec` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | COMM-01 | — | SKU 选择器返回正确库存 | unit | `npx jest clothing.service.spec` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 1 | COMM-02 | — | 图片搜索返回匹配结果 | unit | `npx jest search.service.spec` | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 1 | COMM-02 | — | 多维筛选正确过滤 | unit | `npx jest search.service.spec` | ❌ W0 | ⬜ pending |
| 05-03-01 | 03 | 1 | COMM-03 | — | 购物车汇总含折扣金额 | unit | `npx jest cart.service.spec` | ❌ W0 | ⬜ pending |
| 05-03-02 | 03 | 1 | COMM-03 | — | 库存不足时阻止加购 | unit | `npx jest cart.service.spec` | ❌ W0 | ⬜ pending |
| 05-04-01 | 04 | 1 | COMM-04 | T-05-02 | AI 尺码推荐基于体型数据 | unit | `npx jest size-recommendation.service.spec` | ❌ W0 | ⬜ pending |
| 05-05-01 | 05 | 2 | COMM-05 | — | 低库存触发通知 | unit | `npx jest stock-notification.service.spec` | ❌ W0 | ⬜ pending |
| 05-05-02 | 05 | 2 | COMM-05 | — | 到货通知订阅/取消 | unit | `npx jest stock-notification.service.spec` | ❌ W0 | ⬜ pending |
| 05-06-01 | 06 | 2 | COMM-06 | T-05-03 | 支付回调签名验证 | unit | `npx jest payment.service.spec` | ✅ | ⬜ pending |
| 05-06-02 | 06 | 2 | COMM-06 | T-05-04 | 支付幂等保护 | unit | `npx jest payment.service.spec` | ✅ | ⬜ pending |
| 05-07-01 | 07 | 2 | COMM-07 | T-05-05 | 优惠券使用次数限制 | unit | `npx jest coupon.service.spec` | ❌ W0 | ⬜ pending |
| 05-07-02 | 07 | 2 | COMM-07 | T-05-06 | 优惠券每人限用 | unit | `npx jest coupon.service.spec` | ❌ W0 | ⬜ pending |
| 05-08-01 | 08 | 2 | COMM-08 | — | 订单状态正确流转 | unit | `npx jest order.service.spec` | ✅ | ⬜ pending |
| 05-08-02 | 08 | 2 | COMM-08 | T-05-07 | 退款金额不超过实付金额 | unit | `npx jest refund-request.service.spec` | ❌ W0 | ⬜ pending |
| 05-09-01 | 09 | 3 | COMM-09 | T-05-08 | 商家审核前无商品管理权限 | unit | `npx jest merchant.service.spec` | ✅ | ⬜ pending |
| 05-10-01 | 10 | 3 | COMM-10 | T-05-09 | 商家自动初筛校验 | unit | `npx jest merchant.service.spec` | ✅ | ⬜ pending |
| 05-11-01 | 11 | 3 | COMM-11 | — | 子分类正确关联父分类 | unit | `npx jest clothing.service.spec` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/backend/src/modules/coupon/coupon.service.spec.ts` — stubs for COMM-07
- [ ] `apps/backend/src/modules/stock-notification/stock-notification.service.spec.ts` — stubs for COMM-05
- [ ] `apps/backend/src/modules/refund-request/refund-request.service.spec.ts` — stubs for COMM-08
- [ ] `apps/backend/src/modules/size-recommendation/size-recommendation.service.spec.ts` — stubs for COMM-04

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 支付宝/微信真实支付流程 | COMM-06 | 需要沙箱环境+真实回调 | 使用支付宝沙箱账号完成支付→回调→订单状态更新 |
| 图片搜索准确度 | COMM-02 | 需要真实图片和 ML 服务 | 上传服装图片，验证返回结果相关性 |
| AI 尺码推荐准确度 | COMM-04 | 需要体型数据+品牌尺码表 | 输入体型数据，验证推荐尺码合理性 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
