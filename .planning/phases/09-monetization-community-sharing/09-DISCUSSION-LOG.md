# Phase 9: Monetization + Community + Sharing - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-25
**Phase:** 09-monetization-community-sharing
**Areas discussed:** 免费层限额 UX, 内容产物形态, 分享图设计, 工作室佣金系统

---

## 免费层限额 UX

| Option                    | Description                                     | Selected |
| ------------------------- | ----------------------------------------------- | -------- |
| BottomSheet (BottomSheet) | 底部弹窗展示会员特权对比表+升级按钮，不打断浏览 | ✓        |
| 全屏模态弹窗              | 全屏覆盖，强调升级价值，转化率高但体验重        |          |
| 内联渐进限制              | 按钮变灰/带倒计数，最轻量但转化最低             |          |

**User's choice:** BottomSheet 升级引导
**Notes:** 与 TryOnBottomSheet 交互模式一致

| Option           | Description            | Selected |
| ---------------- | ---------------------- | -------- |
| 每日零点重置     | 简单明确，用户容易理解 | ✓        |
| 滚动 24 小时重置 | 更公平但难解释         |          |

**User's choice:** 每日零点重置

| Option         | Description                               | Selected |
| -------------- | ----------------------------------------- | -------- |
| Redis 按天计数 | Redis INCR + EXPIRE，高性能，天然过期     | ✓        |
| 复用行为追踪表 | 从 UserBehaviorEvent 表统计，简单但查询慢 |          |

**User's choice:** Redis 按天计数

---

## 内容产物形态

| Option         | Description                                 | Selected |
| -------------- | ------------------------------------------- | -------- |
| 应用内专属页面 | 沉浸式多页浏览，购买后永久解锁              | ✓        |
| 图片卡片生成   | 生成高清图片保存/分享，传播性强但信息量有限 |          |
| PDF 报告下载   | 专业感强但移动端体验差                      |          |

**User's choice:** 应用内专属页面
**Notes:** 复用 ProfileReportScreen 报告 UI 模式

| Option          | Description                    | Selected |
| --------------- | ------------------------------ | -------- |
| "预览+解锁"模式 | 关键数据模糊，点击解锁触发支付 | ✓        |
| "摘要+完整"模式 | 展示 3-4 条洞察后引导购买      |          |

**User's choice:** "预览+解锁"模式

| Option            | Description                              | Selected |
| ----------------- | ---------------------------------------- | -------- |
| 衣橱整合+补充推荐 | 用户现有单品 + AI 补充推荐组成 30 件胶囊 | ✓        |
| 标准胶囊模板      | 纯风格理论指导，不含用户单品             |          |

**User's choice:** 衣橱整合+补充推荐

---

## 分享图设计

| Option       | Description                     | Selected |
| ------------ | ------------------------------- | -------- |
| 穿搭方案卡片 | 四宫格+总价+场景+QR，传播性最强 | ✓        |
| 试衣对比图   | 试衣效果+AI 评价+QR，体验感强   | ✓        |
| 报告摘要卡片 | 色彩/风格摘要+QR，专业感强      | ✓        |

**User's choice:** 全选（三种卡片）
**Notes:** 三种分享场景覆盖不同传播需求

| Option         | Description                        | Selected |
| -------------- | ---------------------------------- | -------- |
| 沉浸式图片优先 | 全屏图+底部品牌+QR，类似小红书笔记 | ✓        |
| 信息式左右分栏 | 左图右文，信息更全但冲击力弱       |          |

**User's choice:** 沉浸式图片优先

| Option             | Description                      | Selected |
| ------------------ | -------------------------------- | -------- |
| QR → 小程序 → 下载 | 零摩擦体验，Phase 8 小程序已就绪 | ✓        |
| QR → 直接下载      | 简单直接但缺少体验环节           |          |

**User's choice:** QR → 小程序体验 → 引导下载

---

## 工作室佣金系统

| Option       | Description                               | Selected |
| ------------ | ----------------------------------------- | -------- |
| 推荐码追踪   | 工作室分配唯一码，用户下单填写            |          |
| 无感点击追踪 | 自动记录 studioId+timestamp，首次下单关联 | ✓        |

**User's choice:** 无感点击追踪
**Notes:** 7 天窗口期，首次下单自动关联最近有效推荐

| Option       | Description                        | Selected |
| ------------ | ---------------------------------- | -------- |
| 月度手动结算 | 每月生成账单，工作室确认后线下转账 | ✓        |
| 实时自动分账 | 自动分账但需企业资质+复杂合规      |          |

**User's choice:** 月度手动结算

---

## Claude's Discretion

- BottomSheet 升级引导的具体 UI 布局和文案
- Redis key 精确 TTL 计算
- 报告预览版模糊区域策略
- 胶囊衣橱 AI 生成算法
- 分享卡片像素尺寸和品牌 Logo 大小
- QR 码编码格式
- 月度账单字段和导出格式

## Deferred Ideas

None — discussion stayed within phase scope
