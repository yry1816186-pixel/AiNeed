# Phase 05: e-commerce-closure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-14
**Phase:** 05-e-commerce-closure
**Areas discussed:** 商品详情页体验, AI 智能尺码推荐, 促销体系范围, 商家审核 & 库存通知

---

## 商品详情页体验

### 商品页布局

| Option | Description | Selected |
|--------|-------------|----------|
| 经典轮播式 | 顶部图片轮播，下方商品信息，底部固定购买栏。类似淘宝/京东 | ✓ |
| 沉浸式大图滚动 | 大图占满屏幕，向上滚动过渡到信息。类似小红书 | |
| 分屏 Tab 式 | 上半屏图片，下半屏 Tab 切换详情/搭配/评价 | |

**User's choice:** 经典轮播式
**Notes:** 用户熟悉度高，信息获取效率好

### 虚拟试衣入口

| Option | Description | Selected |
|--------|-------------|----------|
| 底部购买栏并排 | 购买按钮旁加"虚拟试衣"按钮 | ✓ |
| 图片区浮动按钮 | 图片轮播区浮动"试穿效果"按钮 | |
| 尺码区下方卡片 | 尺码选择下方"看看上身效果"卡片 | |

**User's choice:** 底部购买栏并排
**Notes:** 转化路径最短，用户一眼可见

### 搭配推荐展示

| Option | Description | Selected |
|--------|-------------|----------|
| 横向滑动卡片 | 3-5 套搭配方案横向滑动，紧凑 | ✓ |
| 垂直列表式 | 每个搭配方案占一行，信息更完整 | |

**User's choice:** 横向滑动卡片
**Notes:** 紧凑不占空间，适合移动端浏览

---

## AI 智能尺码推荐

### 推荐逻辑

| Option | Description | Selected |
|--------|-------------|----------|
| 体型数据匹配 | 体型数据与品牌尺码表规则匹配，简单可解释 | |
| 多源融合推荐 | 体型+历史购买+退换货综合判断 | ✓ |
| GLM AI 推荐 | 调用 GLM API 分析，灵活但慢且贵 | |

**User's choice:** 多源融合推荐
**Notes:** MVP 以体型匹配为主，历史数据作为加分项，随数据积累逐步提升

### 展示方式

| Option | Description | Selected |
|--------|-------------|----------|
| 尺码旁标签 | AI 推荐尺码旁显示"AI推荐"标签 | ✓ |
| 弹窗展示 | 选择尺码时弹出 AI 推荐弹窗 | |

**User's choice:** 尺码旁标签
**Notes:** 不改变现有选择流程，侵入性最小

### 无数据降级

| Option | Description | Selected |
|--------|-------------|----------|
| 隐藏 AI 推荐 | 无体型数据时不显示 AI 推荐 | ✓ |
| 引导补全画像 | 显示"完善画像获取 AI 尺码推荐"卡片 | |

**User's choice:** 隐藏 AI 推荐
**Notes:** 简单直接，避免干扰选购流程

---

## 促销体系范围

### MVP 复杂度

| Option | Description | Selected |
|--------|-------------|----------|
| 最小可行 | 首单优惠 + 优惠码 | ✓ |
| 加入满减规则 | 首单 + 优惠码 + 满减 | |
| 完整促销平台 | 首单 + 优惠码 + 满减 + 秒杀 + 组合优惠 | |

**User's choice:** 最小可行
**Notes:** 不做复杂促销规则

### 优惠码规则粒度

| Option | Description | Selected |
|--------|-------------|----------|
| 基础规则 | 折扣类型/有效期/使用次数/每人限制 | |
| 加入适用范围 | 基础规则 + 最低消费 + 品类/商品限制 | ✓ |

**User's choice:** 加入适用范围
**Notes:** 支持最低消费门槛和指定品类/商品适用范围，更灵活

---

## 商家审核 & 库存通知

### 商家审核方式

| Option | Description | Selected |
|--------|-------------|----------|
| 人工审核 | 商家提交后管理员审核 | |
| 自动初筛+人工终审 | 基础信息自动校验 + 人工最终审核 | ✓ |
| 免审核入驻 | 提交即通过，违规再处理 | |

**User's choice:** 自动初筛+人工终审
**Notes:** 提高效率同时保证品质管控

### 库存通知机制

| Option | Description | Selected |
|--------|-------------|----------|
| 内部通知+自动下架 | 低库存内部通知，缺货自动标记不可购买 | |
| 加入用户到货通知 | 内部通知 + 用户可订阅缺货到货通知 | ✓ |

**User's choice:** 加入用户到货通知
**Notes:** COMM-05 明确要求缺货到货通知（用户可订阅）

### 商家后台实现

| Option | Description | Selected |
|--------|-------------|----------|
| API 驱动 | 复用 Merchant API，开发量最小 | |
| 独立 Web 后台 | 为商家开发独立 Web 管理页面 | ✓* |

**User's choice:** 独立 Web 后台（*被重定向为 API 驱动）
**Notes:** 用户选择独立 Web 后台，但 REQUIREMENTS.md 明确标记为 v3 延迟项。Phase 5 先用 API 驱动方式，独立 Web 后台延迟到 v3。

---

## Claude's Discretion

- 商品页图片轮播的具体交互细节（指示器样式/自动播放等）
- 优惠码生成算法和编码规则
- 库存阈值的具体数值配置
- 到货通知的推送频率和去重策略

## Deferred Ideas

- 独立 Web 商家后台 — REQUIREMENTS.md v3 延迟项，Phase 5 先用 API 驱动
