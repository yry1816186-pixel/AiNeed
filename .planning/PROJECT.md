# 寻裳 (XunO)

## What This Is

AI 驱动的全年龄段智能穿搭决策平台。用户通过对话式 AI 造型师「伊伊」获取个性化穿搭方案，支持虚拟试穿效果预览，完成从发现到购买的完整闭环。面向追求品质穿搭的普通消费者，以体验壁垒替代技术壁垒。

## Core Value

伊伊（AI 造型师）通过自然对话理解用户需求，精准推荐穿搭方案，让每个人都能获得专业级的形象建议。

## Requirements

### Validated

- ✓ 用户注册/登录 — Phase 1
- ✓ 4 步引导式注册（场景/画像/风格/首搭） — Phase 2
- ✓ Today 首页 — 场景卡 + 伊伊推荐 + 语音 — Phase 3
- ✓ Stylist AI 对话 — 状态机 SCENE/DIRECT/CHAT — Phase 3
- ✓ 虚拟试穿效果图生成（GLM 多模态） — Phase 3
- ✓ Discover 发现页 — 推荐流 + 策展空间 — Phase 4
- ✓ Me 个人中心 — 个人信息 + 设置 — Phase 4
- ✓ 电商闭环 — 商品浏览/购物车/支付/订单 — Phase 4
- ✓ 风格测评 — Phase 4
- ✓ 衣橱管理 — Phase 4
- ✓ 社区 — Phase 4
- ✓ 搜索 — Phase 4
- ✓ 通知 — Phase 4

### Active

- [ ] Phase 5: E2E 集成测试 + 比赛演示
- [ ] Phase 6: 软著申请 + 模型多样性约束 + 备案

### Out of Scope

- 鸿蒙版 (harmony) — 框架仍在迭代，暂不激活
- OAuth 第三方登录 — 邮箱注册即可
- 实时聊天 — 非核心路径

## Context

- **当前进度**: Phase 1-4 完成 (80%)，17 plans 执行完毕
- **Next**: Phase 5 — 端到端集成测试 + 比赛演示准备
- 42 项冻结决策记录在 `docs/XUNO_FINAL_PLAN.md`
- GLM-4-Flash 免费层不稳定，需 Qwen fallback 方案
- FashionCLIP 有隐性性别偏见，Phase 6 需多样性约束
- 软著申请 60-90 天关键路径
- React Native 某些依赖版本锁定（react-native-screens 4.4.0, reanimated 3.16.7）

## Constraints

- **Tech stack**: NestJS 11.x / React Native 0.76.8 (Expo 52) / Python 3.11+ / Prisma / PostgreSQL
- **AI**: GLM-4-Flash 为主，Qwen 为 fallback，FashionCLIP→Marqo-FashionSigLIP
- **Timeline**: Phase 5 为比赛演示准备
- **Compatibility**: Node 20+, pnpm 8+, Docker 20.10+
- **Dependencies**: react-native-screens 4.4.0, reanimated 3.16.7 — 锁定不可升级

## Key Decisions

| Decision                               | Rationale            | Outcome               |
| -------------------------------------- | -------------------- | --------------------- |
| 对话状态机 SCENE/DIRECT/CHAT           | 精准控制 AI 对话流程 | ✓ Good                |
| GLM-4-Flash + Qwen fallback            | 成本控制 + 可靠性    | ✓ Good                |
| FashionCLIP→Marqo-FashionSigLIP        | 减少性别偏见         | ⚠️ Revisit in Phase 6 |
| 4 步引导式注册                         | 快速建立用户画像     | ✓ Good                |
| 4-Tab 导航 (Today/Discover/Stylist/Me) | 核心场景覆盖         | ✓ Good                |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):

1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):

1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

_Last updated: 2026-04-29 after initialization_
