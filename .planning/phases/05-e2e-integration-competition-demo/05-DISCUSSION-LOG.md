# Phase 5: E2E Integration + Competition Demo - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-25
**Phase:** 05-e2e-integration-competition-demo
**Areas discussed:** E2E 数据接线, 比赛 Demo 路径, 视觉一致性收尾, 编译零错误 + 验证

---

## E2E 数据接线

| Option        | Description                                         | Selected |
| ------------- | --------------------------------------------------- | -------- |
| 实时 API 调用 | TodayScreen 直接调推荐 API + 天气 API，数据实时获取 | ✓        |
| Store 缓存层  | 启动时预加载到 Zustand store，屏幕从 store 读取     |          |
| Mock 数据驱动 | Demo 用固定 mock 数据，上线前再接真实 API           |          |

**User's choice:** 实时 API 调用
**Notes:** 最接近生产体验，与"伊伊主动推送"产品定位一致

| Option         | Description                                  | Selected |
| -------------- | -------------------------------------------- | -------- |
| 和风天气 API   | 调用和风天气 API（1000 次/天免费，决策 #27） | ✓        |
| 本地模拟天气   | 根据用户设置城市，用季节+随机模拟天气        |          |
| API + 降级模拟 | 优先调 API，失败时降级到本地模拟             |          |

**User's choice:** 和风天气 API
**Notes:** 决策 #27 已锁定，真实体验优先

| Option              | Description                           | Selected |
| ------------------- | ------------------------------------- | -------- |
| 进入页面自动触发    | 用户打开 Today Tab 时自动请求当日推荐 | ✓        |
| 手动触发            | 用户点击"让伊伊搭一套"按钮才触发      |          |
| 首次自动 + 下拉刷新 | 首次进入自动触发，后续下拉刷新更新    |          |

**User's choice:** 进入页面自动触发
**Notes:** 体现"伊伊主动找上门"核心体验

| Option                    | Description                       | Selected |
| ------------------------- | --------------------------------- | -------- |
| Orchestrator 输出直接渲染 | 后端生成完整方案，前端直接渲染    | ✓        |
| 前端组合搭配              | 前端拿到 items 后本地组合搭配方案 |          |

**User's choice:** Orchestrator 输出直接渲染
**Notes:** 与 REC-04 一致，前端不承担搭配逻辑

---

## 比赛 Demo 路径

| Option          | Description                    | Selected |
| --------------- | ------------------------------ | -------- |
| 固定脚本演示    | 评委看到预设固定流程，不会出错 |          |
| 自由交互演示    | 评委自由操作，伊伊实时响应     | ✓        |
| 脚本 + 允许偏移 | 主流程固定，允许中途插话       |          |

**User's choice:** 自由交互演示
**Notes:** 高风险高回报，需配合预缓存+本地降级

| Option        | Description                               | Selected |
| ------------- | ----------------------------------------- | -------- |
| 漏斗图 + 数据 | 6 层过滤漏斗可视化，每层显示通过/过滤数量 | ✓        |
| 文字解释      | 只展示"为什么推荐这个"文字解释            |          |
| 点击展开漏斗  | 点击推荐结果时弹出漏斗详情                |          |

**User's choice:** 漏斗图 + 数据
**Notes:** 技术深度关键展示点

| Option                | Description                          | Selected |
| --------------------- | ------------------------------------ | -------- |
| 预设 Profile 切换     | 预设 3 个 Profile，演示时切换        |          |
| 单 Profile + 口头说明 | 只用一个 Profile，口头说明差异       |          |
| 实时修改属性          | 演示中实时修改用户属性，观察推荐变化 | ✓        |

**User's choice:** 实时修改属性
**Notes:** 最动态展示包容性，需 Profile 调试面板

| Option          | Description                  | Selected |
| --------------- | ---------------------------- | -------- |
| 录制 Demo 视频  | 1-3 分钟视频，完整展示       |          |
| 仅现场演示      | 只做现场演示，不录制视频     |          |
| 视频 + 现场演示 | 视频为主展示，现场演示为补充 | ✓        |

**User's choice:** 视频 + 现场演示
**Notes:** 双重保险，视频保证不崩

| Option              | Description                                       | Selected |
| ------------------- | ------------------------------------------------- | -------- |
| 预缓存 + 本地降级   | 预缓存推荐结果 + 本地 LLM fallback + 规则引擎降级 | ✓        |
| 纯网络依赖          | 只依赖网络，不做本地降级                          |          |
| 视频为主 + 现场补充 | 录制完整视频作为主展示                            |          |

**User's choice:** 预缓存 + 本地降级
**Notes:** 兼顾自由交互和稳定性

---

## 视觉一致性收尾

| Option       | Description                                  | Selected |
| ------------ | -------------------------------------------- | -------- |
| 全量替换     | 一次性替换所有硬编码颜色为 DesignTokens 引用 | ✓        |
| 核心屏幕优先 | 只替换用户可见的核心屏幕                     |          |
| 仅品牌色替换 | 只替换品牌色相关的硬编码值                   |          |

**User's choice:** 全量替换
**Notes:** 彻底统一，不留遗留

| Option               | Description                              | Selected |
| -------------------- | ---------------------------------------- | -------- |
| 三态统一覆盖         | Loading + Empty + Error 三种状态统一实现 | ✓        |
| Loading + Empty 两态 | 只处理 Loading 和 Empty                  |          |
| 仅 Empty 状态        | 只处理空状态                             |          |

**User's choice:** 三态统一覆盖
**Notes:** 已有共享组件，需在核心屏幕统一接入

| Option       | Description                  | Selected |
| ------------ | ---------------------------- | -------- |
| 品牌色骨架屏 | 暖驼色系 shimmer，与品牌一致 | ✓        |
| 中性灰骨架屏 | 中性灰色，通用但无品牌感     |          |
| Claude 决定  | 根据屏幕复杂度选择           |          |

**User's choice:** 品牌色骨架屏
**Notes:** 暖驼色 #C4956A 低透明度

---

## 编译零错误 + 验证

| Option            | Description                     | Selected |
| ----------------- | ------------------------------- | -------- |
| 系统化修复        | 先获取错误列表，按文件分组修复  | ✓        |
| Demo 关键路径优先 | 只修复影响 Demo 流程的文件      |          |
| 快速压制          | 用 @ts-expect-error 或 any 压制 |          |

**User's choice:** 系统化修复
**Notes:** 不使用压制手段，逐一修复

| Option           | Description                  | Selected |
| ---------------- | ---------------------------- | -------- |
| Phase 5 首先执行 | Phase 4 人工验证在集成前完成 | ✓        |
| 集成后统一验证   | 先做集成，最后验证           |          |
| 并行执行         | 边开发边验证                 |          |

**User's choice:** Phase 5 首先执行
**Notes:** 确保基础功能正常后再做 E2E 集成

| Option          | Description                   | Selected |
| --------------- | ----------------------------- | -------- |
| 自动化 E2E 测试 | 关键路径可重复验证            | ✓        |
| 手动测试        | 每次修改后手动走流程          |          |
| 自动 + 手动结合 | 自动化核心路径 + 手动边缘情况 |          |

**User's choice:** 自动化 E2E 测试
**Notes:** 降低 R4 风险（Demo 崩溃 HIGH/致命）

| Option         | Description                       | Selected |
| -------------- | --------------------------------- | -------- |
| 每 Plan 验证   | 每个 Plan 完成后运行 tsc --noEmit | ✓        |
| Phase 结束验证 | 只在 Phase 结束时验证             |          |
| 自动 CI 检查   | CI 中自动运行                     |          |

**User's choice:** 每 Plan 验证
**Notes:** 不允许编译错误在 Plan 间积累

---

## Claude's Discretion

- 和风天气 API 具体集成细节
- RecommendationFunnel 组件视觉设计
- Profile 调试面板 UI 布局
- Demo 视频录制工具和格式
- E2E 测试框架选择
- ShimmerSkeleton 品牌色改造具体色值
- DiscoverScreen 数据接线策略

## Deferred Ideas

None — discussion stayed within phase scope
