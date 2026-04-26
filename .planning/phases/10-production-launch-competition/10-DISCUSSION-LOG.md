# Phase 10: Production + Launch + Competition - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-26
**Phase:** 10-production-launch-competition
**Areas discussed:** 部署环境与方案, Android 商店上架, 离线能力实现, 比赛材料策略

---

## 部署环境与方案

| Option                       | Description                                   | Selected |
| ---------------------------- | --------------------------------------------- | -------- |
| 云服务器 Docker Compose      | 4C16G 云服务器，Docker Compose 部署，稳定可靠 |          |
| 云服务器 Kubernetes          | K8s 部署，可扩展但复杂度高                    |          |
| 本地机器 + Docker Compose    | RTX 4060 本地部署，零成本但网络不可靠         |          |
| 混合部署（本地 AI + 云后端） | 本地 AI 推理 + 云后端，兼顾成本和稳定性       |          |

**User's choice:** 云服务器 Docker Compose，进一步选择 4C8G 腾讯云轻量应用服务器
**Notes:** 用户尚未购买服务器，需要推荐规格。AI 推理走远程 API（GLM-4-Flash 免费），不需 GPU

### 域名

| Option              | Description                     | Selected |
| ------------------- | ------------------------------- | -------- |
| xuno.ai 域名 + 备案 | 已有 Nginx TLS 配置指向 xuno.ai |          |
| 暂用 IP（无域名）   | 先用 IP 访问，无 HTTPS          |          |
| 其他域名            | 使用免费域名或其他域名          |          |

**User's choice:** .cn 域名（如 xuno.cn）
**Notes:** .cn 域名支持 ICP 备案，适合应用商店上架要求

---

## Android 商店上架

| Option        | Description                             | Selected |
| ------------- | --------------------------------------- | -------- |
| 华为应用市场  | 审核最严、用户量最大，需软著 + ICP 备案 | ✓        |
| 小米应用商店  | 审核较宽松，3-5 天                      | ✓        |
| OPPO 软件商店 | 审核中等                                | ✓        |
| vivo 应用商店 | 审核中等                                | ✓        |

**User's choice:** 全部 4 家
**Notes:** 目标是 2+ 商店，用户选择全上

### 上架节奏

| Option              | Description                                  | Selected |
| ------------------- | -------------------------------------------- | -------- |
| 小米先行 → 其余跟上 | 先提交小米（审核最宽松），通过后同步提交其余 | ✓        |
| 同时提交            | 同时提交 4 家                                |          |
| 先搞定合规再决定    | 先做软著 + ICP 备案                          |          |

**User's choice:** 小米先行 → 其余跟上

---

## 离线能力实现

| Option       | Description                           | Selected |
| ------------ | ------------------------------------- | -------- |
| WatermelonDB | SQLite 封装，支持复杂查询、关联、迁移 | ✓        |
| MMKV + JSON  | 轻量 key-value，性能高但无复杂查询    |          |
| AsyncStorage | RN 内置，简单但性能差                 |          |

**User's choice:** WatermelonDB
**Notes:** 选择功能最完整的方案

### 离线 UX

| Option              | Description                             | Selected |
| ------------------- | --------------------------------------- | -------- |
| 明确提示 + 部分可用 | toast 显示"离线模式" + 禁用需网络的操作 | ✓        |
| 纯查看模式          | 离线时仅展示缓存数据                    |          |

**User's choice:** 明确提示 + 部分可用

---

## 比赛材料策略

### 优先级

| Option   | Description                   | Selected |
| -------- | ----------------------------- | -------- |
| 比赛优先 | 先做 PPT/视频/文档            |          |
| 部署优先 | 先完成部署和上架              |          |
| 全部并行 | 所有事并行做，用多 agent 并发 | ✓        |

**User's choice:** 全部并行

### PPT 叙事

| Option       | Description                              | Selected |
| ------------ | ---------------------------------------- | -------- |
| 三层叙事     | 体验革命 → 面试 Agent → 包容性设计       | ✓        |
| 技术驱动叙事 | 技术架构 → 数据飞轮 → 商业模式           |          |
| 用户故事驱动 | 用户故事 → 痛点 → 解决方案 → 技术 → 商业 |          |

**User's choice:** 三层叙事（Phase 5 已验证）

### Demo 视频

| Option              | Description                                   | Selected |
| ------------------- | --------------------------------------------- | -------- |
| 录屏 + 配音         | 1-3 分钟录屏 + 配音，使用 Phase 5 demo script | ✓        |
| 真机拍摄            | 真实手机拍摄 + 后期剪辑                       |          |
| 混合（录屏 + 真机） | 录屏为主，关键场景插入真机镜头                |          |

**User's choice:** 录屏 + 配音

### 种子用户数据

| Option          | Description                    | Selected |
| --------------- | ------------------------------ | -------- |
| 真实内测 + 调查 | 5-10 名目标用户内测 + 调查问卷 |          |
| 模拟数据        | 模拟用户行为数据 + AI 生成反馈 | ✓        |
| 不提交          | 仅展示技术能力                 |          |

**User's choice:** 模拟数据

---

## Claude's Discretion

- 腾讯云服务器购买和初始化具体流程
- ICP 备案步骤和材料
- WatermelonDB schema 设计
- 各 Android 商店审核要求和提交流程
- PPT 模板和视觉风格
- Demo 视频录制工具
- 模拟种子用户数据格式和内容
- 负载测试场景设计
- Nginx rate limiting 阈值

## Deferred Ideas

None — discussion stayed within phase scope
