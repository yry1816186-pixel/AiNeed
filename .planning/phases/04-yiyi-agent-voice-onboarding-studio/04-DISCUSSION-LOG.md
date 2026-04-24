# Phase 4: Yiyi Agent + Voice + Onboarding + Studio - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-25
**Phase:** 04-yiyi-agent-voice-onboarding-studio
**Areas discussed:** Python↔NestJS 架构同步, TryOn BottomSheet 设计, Onboarding 双轨合并, STT/TTS 架构选择

---

## Python ↔ NestJS 对话架构同步

| Option      | Description                                          | Selected |
| ----------- | ---------------------------------------------------- | -------- |
| Python 主导 | Python 做全部推理，NestJS 只做 Redis 读写 + API 转发 |          |
| NestJS 主导 | NestJS 做状态管理和路由，Python 只做 LLM 调用        |          |
| 双端并行    | Python 和 NestJS 各自维护状态机，通过 API 同步       | ✓        |

**同步机制：**

| Option        | Description                                            | Selected |
| ------------- | ------------------------------------------------------ | -------- |
| 请求-响应模式 | NestJS 转发 Python → Python 返回状态 → NestJS 存 Redis |          |
| 事件驱动模式  | Python 推理后主动推送状态变更到 NestJS                 | ✓        |

**TS 枚举对齐：**

| Option              | Description                                              | Selected |
| ------------------- | -------------------------------------------------------- | -------- |
| 完全对齐 Python     | TS 补齐 SCENE/DIRECT/CHAT + company/position/colorSeason | ✓        |
| TS 通用 + JSON 扩展 | TS 只定义通用字段，Python 专属通过 JSON 透传             |          |

**Notes:** 用户选择"性能更好更优秀的"方案 → 完全对齐 Python（类型安全 + 零解析开销）

---

## TryOn BottomSheet 设计

| Option           | Description                      | Selected |
| ---------------- | -------------------------------- | -------- |
| 半屏 BottomSheet | 保留对话可见，试穿结果嵌回对话流 | ✓        |
| 全屏 Modal       | 展示空间大，但打断对话流         |          |
| 内联气泡         | 最无缝但图片小                   |          |

**交互流程：**

| Option                          | Description                                                     | Selected |
| ------------------------------- | --------------------------------------------------------------- | -------- |
| 弹起 → 试穿 → 收起 → 结果回对话 | BottomSheet 弹出半屏 → 试穿 → 收起 → 结果作为新消息出现在对话中 | ✓        |
| BottomSheet 内完成全部操作      | 一直保持半屏直到用户关闭                                        |          |

---

## Onboarding 双轨合并

| Option              | Description                                                           | Selected |
| ------------------- | --------------------------------------------------------------------- | -------- |
| 全新 4 步替代旧向导 | 删除旧向导，用新屏幕重构。复用已有 SceneStep/StyleStep/PreferenceStep | ✓        |
| 旧向导内部替换      | 保留旧框架，替换步骤内容                                              |          |

**Step 4 展示方式：**

| Option         | Description                                         | Selected |
| -------------- | --------------------------------------------------- | -------- |
| 3 套卡片横滑   | 展示 3 套搭配方案卡片，用户选一套 → 保存 → 偏好回流 | ✓        |
| 对话式逐个展示 | 伊伊一第一套展示，用户说"下一个"或"就这套"          |          |

---

## STT/TTS 架构选择

**STT 架构：**

| Option               | Description                                         | Selected |
| -------------------- | --------------------------------------------------- | -------- |
| Android 原生直接调用 | SpeechRecognizer 免费直接调用，零延迟零成本         | ✓        |
| 后端代理             | 前端录音 → 后端转发 → 返回文字，支持 iOS 但增加延迟 |          |

**TTS 架构：**

| Option               | Description                                    | Selected |
| -------------------- | ---------------------------------------------- | -------- |
| 后端 Edge-TTS 音频流 | Python Edge-TTS 生成音频流，可缓存，支持多声线 | ✓        |
| 端侧直接调用         | 前端调 Edge-TTS HTTP API，简单但无法缓存       |          |

---

## Claude's Discretion

- 事件驱动同步的具体实现细节（消息队列 vs HTTP callback）
- BottomSheet 高度和动画细节
- Onboarding 各步骤的具体组件分解
- 快速回复按钮的动态生成策略
- Edge-TTS 音频流格式和缓存策略

## Deferred Ideas

- 讯飞自定义声线 — Sprint 后 Phase 6+
- 规则学习化 — 264 规则 →soft constraints, Phase 7+
- iOS STT 支持 — Sprint 后
- 工作室 BD 拓展 — Sprint 后
