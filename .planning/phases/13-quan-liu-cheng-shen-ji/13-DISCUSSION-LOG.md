# Phase 13: 全流程深度审计 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-28
**Phase:** 13-全流程深度审计
**Areas discussed:** 截图工具与方式, 标杆对比维度, 审计输出格式, 性能基线目标

---

## 截图工具与方式

| Option                 | Description                                                                | Selected |
| ---------------------- | -------------------------------------------------------------------------- | -------- |
| Expo Web + Playwright  | 启动 Expo Web 用 Playwright 截图，自动化可 CI，但 Web 渲染可能与原生有差异 |          |
| Android 模拟器 + ADB   | 原生渲染真实，但需手动/半自动操作，无法 CI                                 |          |
| Detox e2e + screenshot | 原生渲染 + 自动化，已有 .detoxrc.js 配置                                   | ✓        |
| 混合方案               | Playwright + 模拟器手动截图双重验证                                        |          |

**Detox 执行方式:**

| Option                      | Description                    | Selected |
| --------------------------- | ------------------------------ | -------- |
| 复用现有 Detox 配置         | 确认环境可用，编写逐页截图测试 | ✓        |
| Detox 优先，Playwright 兜底 | 如果 Detox 失败则降级          |          |
| 全新搭建 Detox              | 从头搭建，可能耗时较长         |          |

**截图范围:**

| Option               | Description                      | Selected |
| -------------------- | -------------------------------- | -------- |
| 7 个核心页面         | 主要 Tab + Onboarding + Calendar |          |
| 全量页面（含子页面） | 核心 + 子页面，约 15-20 个页面   | ✓        |
| 仅主要 Tab 页        | 4 个 Tab + Onboarding，快速判断  |          |

**截图输出格式:**

| Option              | Description               | Selected |
| ------------------- | ------------------------- | -------- |
| PNG 截图 + 命名规则 | 命名如 01-today-light.png | ✓        |
| 亮/暗双模式截图     | 两套截图用于暗色模式审计  |          |
| 仅亮色截图          | 无特殊要求                |          |

**多状态截图:**

| Option     | Description                          | Selected |
| ---------- | ------------------------------------ | -------- |
| 截多状态   | 加载中、空状态、错误、有数据各截一张 | ✓        |
| 仅正常状态 | 只截正常数据状态                     |          |

**User's choice:** Detox e2e + screenshot，复用现有配置，全量页面 15-20 页，多状态截图，PNG + 命名规则
**Notes:** 用户对截图真实性要求高，选择了原生渲染方案而非 Web 替代

---

## 标杆对比维度

| Option          | Description                                           | Selected |
| --------------- | ----------------------------------------------------- | -------- |
| 全面 6 维对比   | 信息架构/视觉/交互/卡片/空状态/导航，每维度评分和建议 | ✓        |
| 视觉 + 交互聚焦 | 仅对比视觉设计和交互模式                              |          |
| 信息架构优先    | 仅对比结构是否正确                                    |          |

**对比粒度:**

| Option   | Description                | Selected |
| -------- | -------------------------- | -------- |
| 逐页对标 | 每个页面单独对比，针对性强 | ✓        |
| 整体对比 | 整体 UI 品质对比，粒度较粗 |          |

**标杆匹配:**

| Option                | Description                                        | Selected |
| --------------------- | -------------------------------------------------- | -------- |
| 灵活匹配标杆          | 不同页面选不同标杆（Today→ 小红书，对话 →ChatGPT） | ✓        |
| 每页对比全部 3 个标杆 | 完整但冗余                                         |          |

**User's choice:** 全面 6 维对比，逐页对标，灵活匹配最相关标杆
**Notes:** 标杆匹配策略：Today→ 小红书，Discover→ 得物/Pinterest，Stylist→ChatGPT/豆包，Wardrobe→Whering/Stylebook，Profile→NET-A-PORTER

---

## 审计输出格式

| Option               | Description                          | Selected |
| -------------------- | ------------------------------------ | -------- |
| Markdown 报告集      | 每个审计维度一个 .md 文件            |          |
| 单一综合报告         | 所有内容一个 AUDIT-REPORT.md         |          |
| JSON + Markdown 混合 | JSON 存机器可读数据，Markdown 存分析 | ✓        |

**优先级排序:**

| Option                | Description                | Selected |
| --------------------- | -------------------------- | -------- |
| P0/P1/P2 + Phase 映射 | 标注优先级和对应修复 Phase |          |
| 仅问题描述            | 不标注优先级               | ✓        |

**User's choice:** JSON + Markdown 混合，仅描述问题不标优先级
**Notes:** JSON 用于组件不一致项和可访问性违规的结构化数据，Markdown 用于差距分析和上下文叙述。报告集放 `.planning/audit/` 目录

---

## 性能基线目标

| Option            | Description                        | Selected |
| ----------------- | ---------------------------------- | -------- |
| 双平台模拟器      | Pixel 7 API 34 + iPhone 15，可重复 | ✓        |
| 仅 Android 模拟器 | 主要用户 Android，性能压力更大     |          |
| 真机测试          | 最真实但不可重复                   |          |

**性能指标:**

| Option           | Description                          | Selected |
| ---------------- | ------------------------------------ | -------- |
| 5 项核心指标     | 首屏/TTI/FPS/图片/内存               |          |
| 扩展指标（8 项） | 核心 + JS Bundle/启动到首屏/API 响应 | ✓        |

**测量粒度:**

| Option              | Description                                      | Selected |
| ------------------- | ------------------------------------------------ | -------- |
| 逐页测量 + 记录基线 | 每个 Tab + 子页面测量，记录到 perf-baseline.json | ✓        |
| 仅整体性能          | 首页加载和整体滚动                               |          |

**User's choice:** 双平台模拟器，8 项扩展指标，逐页测量记录到 JSON 基线
**Notes:** 8 项指标：首屏加载/TTI/列表 FPS/图片加载/内存峰值/JS Bundle/启动到首屏/API 响应

---

## Claude's Discretion

- 截图命名规则的细节设计
- 标杆对比每个维度的具体评估标准
- 性能测试工具选择
- JSON schema 字段设计

## Deferred Ideas

None — discussion stayed within phase scope
