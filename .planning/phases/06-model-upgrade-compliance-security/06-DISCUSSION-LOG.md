# Phase 6: Model Upgrade + Compliance + Security - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-25
**Phase:** 06-model-upgrade-compliance-security
**Areas discussed:** 模型替换策略, 漏斗+SASRec, 合规+软著, 安全修复

---

## 模型替换策略

| Option                | Description                                             | Selected |
| --------------------- | ------------------------------------------------------- | -------- |
| 硬替换                | 直接替换所有 FashionCLIP 调用为 FashionSigLIP，一步到位 | ✓        |
| 双模型共存 + fallback | FashionSigLIP 主模型，FashionCLIP 作为 fallback         |          |
| 抽象层 + 配置切换     | 先实现适配层，通过配置切换模型                          |          |

**User's choice:** 硬替换（推荐）
**Notes:** 降级时用 Phase 2 的规则模板，不维护两套模型代码

### 中文 Fine-tune

| Option                   | Description                                        | Selected |
| ------------------------ | -------------------------------------------------- | -------- |
| LoRA fine-tune           | rank=16，淘宝客 5000 商品图 + DeepFashion 中文子集 | ✓        |
| 仅替换基础模型           | 不做中文 fine-tune                                 |          |
| 分步：先替换后 fine-tune | 先替换基础模型，fine-tune 作为后续迭代             |          |

**User's choice:** LoRA fine-tune（推荐）
**Notes:** 需要 AutoDL GPU 资源

### 偏见审计

| Option             | Description              | Selected |
| ------------------ | ------------------------ | -------- |
| 编码相似度审计     | 5 Profile 检查编码相似度 |          |
| 推荐结果多样性审计 | 用真实推荐结果检查多样性 | ✓        |
| 两层审计           | 先编码审计再推荐结果审计 |          |

**User's choice:** 推荐结果多样性审计
**Notes:** 更贴近用户体验，使用 demoStore 的 3 个预设 Profile 做测试

---

## 漏斗 + SASRec

### 6 层漏斗

| Option       | Description                       | Selected |
| ------------ | --------------------------------- | -------- |
| 完整 6 层    | L1-L4 硬筛选 + L5-L6 软评分       | ✓        |
| 先硬后软分步 | 先 L2-L4 硬筛选，L5-L6 用规则引擎 |          |
| 仅硬筛选     | 只实现 L1-L4                      |          |

**User's choice:** 完整 6 层（推荐）

### SASRec 训练

| Option              | Description                  | Selected |
| ------------------- | ---------------------------- | -------- |
| 本地训练            | RTX 4060，PyTorch 实现       | ✓        |
| 云 GPU 训练         | AutoDL 云 GPU                |          |
| 骨架 + 数据管道先行 | 先实现管道，训练留给 Phase 7 |          |

**User's choice:** 本地训练（推荐）

### 偏好模型

| Option         | Description                  | Selected |
| -------------- | ---------------------------- | -------- |
| 5M 轻量模型    | Profile+场景+候选 → 偏好得分 | ✓        |
| 规则引擎替代   | 不做偏好模型                 |          |
| 推迟到 Phase 7 | 只做 SASRec                  |          |

**User's choice:** 5M 轻量模型（推荐）

---

## 合规 + 软著

### 同意机制

| Option              | Description                            | Selected |
| ------------------- | -------------------------------------- | -------- |
| 完整同意机制        | PIPL + GB/T 45574 + 国产 AI 无跨境确认 | ✓        |
| 仅 PIPL 同意        | 只做敏感信息单独同意                   |          |
| 前端同意 + 后端记录 | 不做 GB/T 45574 完整架构               |          |

**User's choice:** 完整同意机制（推荐）

### 软著 + 商标

| Option             | Description                     | Selected |
| ------------------ | ------------------------------- | -------- |
| 立即启动           | 软著 60-90 天关键路径，立即申请 | ✓        |
| 准备材料，灵活提交 | 降低时间压力                    |          |
| 仅准备文档         | 不实际提交                      |          |

**User's choice:** 立即启动（推荐）

---

## 安全修复

| Option             | Description                         | Selected |
| ------------------ | ----------------------------------- | -------- |
| 完整安全修复       | Nginx+TLS+端口+密钥+代理            | ✓        |
| 仅 Nginx+TLS       | 最紧急的安全项                      |          |
| 分步：先紧急后重要 | 先 Nginx+TLS+端口，密钥和代理留后续 |          |

**User's choice:** 完整安全修复（推荐）

---

## Claude's Discretion

- 漏斗各层筛选阈值和评分权重
- FashionSigLIP 模型加载和缓存策略
- 同意 UI 设计细节
- Nginx 配置细节
- 偏好模型架构细节（5M params 约束内）

## Deferred Ideas

None
