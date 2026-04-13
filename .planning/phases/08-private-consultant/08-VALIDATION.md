---
phase: 08
slug: private-consultant
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.x |
| **Config file** | apps/backend/jest.config.js |
| **Quick run command** | `cd apps/backend && npx jest --testPathPattern="consultant|chat" --passWithNoTests` |
| **Full suite command** | `cd apps/backend && npx jest --passWithNoTests` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/backend && npx jest --testPathPattern="consultant|chat" --passWithNoTests`
- **After every plan wave:** Run `cd apps/backend && npx jest --passWithNoTests`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | ADV-03 | — | 匹配算法不泄露用户隐私数据 | unit | `npx jest consultant-matching` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | ADV-01/02 | — | 需求提交验证输入 | unit | `npx jest consultant` | ✅ | ⬜ pending |
| 08-02-01 | 02 | 1 | ADV-05 | T-08-01 | ChatGateway JWT 验证拒绝未认证连接 | unit | `npx jest chat-gateway` | ❌ W0 | ⬜ pending |
| 08-02-02 | 02 | 1 | ADV-06 | — | 方案卡片消息类型验证 | unit | `npx jest chat` | ❌ W0 | ⬜ pending |
| 08-03-01 | 03 | 2 | ADV-04 | — | 时段冲突检测正确性 | unit | `npx jest consultant-availability` | ❌ W0 | ⬜ pending |
| 08-04-01 | 04 | 2 | ADV-07 | T-08-02 | 分阶段付款金额不可篡改 | unit | `npx jest payment` | ✅ | ⬜ pending |
| 08-04-02 | 04 | 2 | ADV-08 | T-08-03 | 结算金额计算正确，佣金比例固定 | unit | `npx jest consultant-earning` | ❌ W0 | ⬜ pending |
| 08-05-01 | 05 | 2 | ADV-09 | — | 评价评分 1-5 范围验证 | unit | `npx jest consultant-review` | ❌ W0 | ⬜ pending |
| 08-05-02 | 05 | 2 | ADV-09 | — | 综合加权排名计算正确 | unit | `npx jest consultant-ranking` | ❌ W0 | ⬜ pending |
| 08-06-01 | 06 | 3 | ADV-10 | — | 审核状态流转验证 | unit | `npx jest consultant` | ✅ | ⬜ pending |
| 08-06-02 | 06 | 3 | ADV-11 | — | 案例展示 CRUD 验证 | unit | `npx jest consultant` | ✅ | ⬜ pending |
| 08-07-01 | 07 | 3 | ADV-01~11 | — | 移动端页面渲染 | e2e | manual | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/backend/src/modules/consultant/consultant-matching.service.spec.ts` — stubs for ADV-03
- [ ] `apps/backend/src/modules/chat/chat.gateway.spec.ts` — stubs for ADV-05
- [ ] `apps/backend/src/modules/consultant/consultant-availability.service.spec.ts` — stubs for ADV-04
- [ ] `apps/backend/src/modules/consultant/consultant-review.service.spec.ts` — stubs for ADV-09
- [ ] `apps/backend/src/modules/consultant/consultant-earning.service.spec.ts` — stubs for ADV-08

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| WebSocket 实时消息推送 | ADV-05 | 需要两个客户端同时连接 | 打开两个模拟客户端，发送消息验证实时到达 |
| 支付宝/微信支付回调 | ADV-07 | 需要真实支付环境 | 使用沙箱环境测试定金+尾款完整流程 |
| 移动端聊天 UI 交互 | ADV-05 | 需要真机/模拟器 | 在 Android 模拟器上测试聊天页面滚动、图片发送 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
