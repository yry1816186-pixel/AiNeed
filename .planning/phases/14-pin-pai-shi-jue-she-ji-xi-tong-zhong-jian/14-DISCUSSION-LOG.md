# Phase 14: 品牌视觉 + 设计系统重建 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-28
**Phase:** 14-品牌视觉+设计系统重建
**Areas discussed:** Logo 与品牌资产, 三层 Token 架构, ThemeManager 替换方案, 暗色模式独立设计

---

## 品牌色 WCAG 修正

| Option                  | Description                       | Selected |
| ----------------------- | --------------------------------- | -------- |
| 加深 terracotta         | 调暗至 ~#9A5B3E (5.33:1)          |          |
| 对齐冻结决策 #C4956A    | 回归决策 #35 的暖驼色 (4.96:1)    |          |
| 保留 #C67B5C 用于非文字 | 品牌色用于大面积/图标，文字用深色 | ✓        |
| Claude 决定             | 让 planner 决定最优色值           |          |

**User's choice:** 保留 #C67B5C 用于非文字
**Notes:** 品牌色用于大面积/图标/按钮（AA Large 3:1 通过），文字使用 terracottaDark #A86548 (4.56:1)

---

## 主色方向（关键变更）

| Option            | Description              | Selected |
| ----------------- | ------------------------ | -------- |
| 暖色系加深/加饱和 | 保留暖驼色系但调向更饱和 |          |
| 暖红/珊瑚色系     | 转向更有辨识度的暖红     | ✓        |
| 我来指定          | 用户自己指定颜色         |          |

**User's choice:** 暖红/珊瑚色系
**Notes:** 用户明确否决暖驼色——"这个项目不许用暖驼色这种毫无辨识度的颜色作为主题颜色"。这将更新决策 #35。

### 暖红色系具体方向

| Option         | Description                | Selected |
| -------------- | -------------------------- | -------- |
| 珊瑚红(偏粉)   | ~#E8636F，温暖不刺眼       |          |
| 陶土红(偏深)   | ~#C44536/#B83B32，有力量感 | ✓        |
| 暖橘红(中间调) | ~#E05A47，介于两者之间     |          |

**User's choice:** 陶土红（偏深）
**Notes:** 如 FARFETCH 的品牌红。对比度天然高，WCAG AA 无压力。注意 semantic.error 当前为 #C44536，需偏移以避免冲突。

---

## Logo 设计方向

| Option          | Description             | Selected |
| --------------- | ----------------------- | -------- |
| 纯字标 Wordmark | 如 Chanel/Celine 风格   |          |
| 字标+几何图标   | 字标 + 独立图形         |          |
| 伊伊符号化 Logo | 伊伊视觉符号提炼 + 字标 | ✓        |

**User's choice:** 伊伊符号化 Logo
**Notes:** 后续讨论中用户明确拒绝晾衣架形象——"不许使用现在的晾衣架形象，太丑了也毫无设计感"

### 伊伊符号具体方向

| Option          | Description                | Selected |
| --------------- | -------------------------- | -------- |
| 圆形头像剪影    | Headspace 风格             |          |
| 字母+织物几何   | XUNO 字母 + 织物曲线几何化 | ✓        |
| 穿衣镜/领口轮廓 | 极简轮廓                   |          |

**User's choice:** 字母+织物几何
**Notes:** XUNO 字母的几何化处理融合布料/织物的曲线感

---

## Splash 启动动画

| Option       | Description                 | Selected |
| ------------ | --------------------------- | -------- |
| 布料展开揭示 | Logo 从布料纹理中展开       |          |
| 色彩晕染淡入 | 品牌色从中心晕染，Logo 淡入 | ✓        |
| 笔画描绘动画 | Logo 逐笔描绘               |          |

**User's choice:** 色彩晕染淡入
**Notes:** ≤1.5s，品牌陶土红从中心晕染扩散

---

## App Icon

| Option               | Description | Selected |
| -------------------- | ----------- | -------- |
| Logo 图标即 App Icon | 直接复用    |          |
| 独立但同风格         | 可以更丰富  | ✓        |

**User's choice:** 独立但同风格
**Notes:** 可包含更多元素（布料纹理、立体感等），但与 Logo 风格统一

---

## 三层 Token 架构 — 扩展 vs 重建

| Option       | Description           | Selected |
| ------------ | --------------------- | -------- |
| 扩展现有结构 | 在现有 610 行上添加层 |          |
| 重建整个体系 | 完全重新设计三层      | ✓        |

**User's choice:** 重建整个体系

### Token 源格式

| Option              | Description          | Selected |
| ------------------- | -------------------- | -------- |
| 纯 TS 对象          | 与现有一致，无新依赖 |          |
| YAML/JSON → TS 生成 | 支持未来小程序复用   | ✓        |

**User's choice:** YAML/JSON → TS 生成

### 硬编码替换策略

| Option            | Description         | Selected |
| ----------------- | ------------------- | -------- |
| Phase 14 全量替换 | 一次性清理 1,980 项 | ✓        |
| 先建体系后续替换  | 留给 Phase 16-18    |          |

**User's choice:** Phase 14 全量替换

### 文件组织

| Option       | Description                   | Selected |
| ------------ | ----------------------------- | -------- |
| 按类别分文件 | colors.yaml, spacing.yaml 等  | ✓        |
| 按层分文件   | tokens.yaml, semantic.yaml 等 |          |

**User's choice:** 按类别分文件

### semantic 命名体系

| Option        | Description                     | Selected |
| ------------- | ------------------------------- | -------- |
| 功能语义      | surface/text/interactive/status | ✓        |
| 亮/暗模式分层 | light.bg, dark.bg 等            |          |

**User's choice:** 功能语义 (surface/text/interactive/status)

---

## ThemeManager 替换范围

| Option       | Description              | Selected |
| ------------ | ------------------------ | -------- |
| 全量清理重建 | 删所有废弃文件，一次清理 | ✓        |
| 渐进式迁移   | 保留旧文件过渡           |          |

**User's choice:** 全量清理重建

### Zustand store 职责

| Option          | Description                  | Selected |
| --------------- | ---------------------------- | -------- |
| 仅存 mode       | 组件从 Token 层查色值        |          |
| mode + 完整色表 | store.colors.surface.primary | ✓        |

**User's choice:** mode + 完整色表

### ThemeSystem.tsx UI 组件处理

| Option     | Description              | Selected |
| ---------- | ------------------------ | -------- |
| 先提取再删 | 提取到 design-system/ui/ |          |
| 直接删除   | Phase 15 会重建          | ✓        |

**User's choice:** 直接删除

---

## 暗色模式基底色

| Option   | Description          | Selected |
| -------- | -------------------- | -------- |
| 暖灰黑   | ~#1A1A18，保持温暖感 | ✓        |
| 纯黑     | ~#0D0D0C，对比度最高 |          |
| 暖红调黑 | 加入陶土红底调       |          |

**User's choice:** 暖灰黑

### 暗色 accent 色

| Option        | Description    | Selected |
| ------------- | -------------- | -------- |
| 统一用陶土红  | 品牌一致性最强 |          |
| 珊瑚色 accent | 视觉层次更丰富 | ✓        |

**User's choice:** 珊瑚色 accent
**Notes:** 暗色模式使用珊瑚色作为 accent，区别于亮色的陶土红

### 暗色色板定义方式

| Option             | Description             | Selected |
| ------------------ | ----------------------- | -------- |
| Token 层静态双色板 | 亮色+暗色各一套完整色板 | ✓        |
| 动态映射生成       | 运行时亮度调整          |          |

**User's choice:** Token 层静态双色板

---

## Claude's Discretion

- 陶土红具体色值微调（需通过 WCAG AA）
- semantic.error 的替代色值选择
- YAML→TS 生成脚本工具链选择
- Token 文件的具体目录结构
- MMKV key 设计与 Appearance API 监听实现细节
- legacyTokenMap 的具体映射策略
- 图标集风格与装饰图案
- 品牌指南文档的详细内容结构

## Deferred Ideas

None — all discussion stayed within Phase 14 scope
