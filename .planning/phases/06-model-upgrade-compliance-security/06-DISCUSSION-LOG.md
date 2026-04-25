# Phase 6: Model Upgrade + Compliance + Security - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-25
**Phase:** 06-model-upgrade-compliance-security
**Areas discussed:** 偏见审计+微调适配, 漏斗+偏好模型补全, 合规文档+安全加固, 数据管道+颜色标准化

---

## 偏见审计 + 微调适配

### 微调脚本适配

| Option       | Description                                                                            | Selected |
| ------------ | -------------------------------------------------------------------------------------- | -------- |
| 新建专用脚本 | 新建 finetune_fashionsiglip.py，使用 SiglipModel + SiglipProcessor，保留原脚本作为参考 |          |
| 扩展现有脚本 | 在现有 finetune_fashionclip.py 中添加 --model-type siglip 参数                         |          |
| 统一微调框架 | 新建 finetune_unified.py，支持 CLIP/SigLIP/自定义模型，--model-type 切换               | ✓        |

**User's choice:** 统一微调框架
**Notes:** 用户选择最灵活的方案，支持未来模型迭代

### 偏见审计方法

| Option         | Description                                          | Selected |
| -------------- | ---------------------------------------------------- | -------- |
| Profile 对比法 | 5 个不同风格 Profile，同场景请求推荐，检查结果多样性 |          |
| 编码空间分析法 | 分析 FashionSigLIP 编码空间中不同性别的向量分布      |          |
| 两层审计法     | Profile 对比（功能测试）+ 编码空间分析（深度审计）   | ✓        |

**User's choice:** 两层审计法
**Notes:** 最彻底的审计方案，功能测试+深度分析双保障

### 偏见缓解策略

| Option             | Description                                   | Selected |
| ------------------ | --------------------------------------------- | -------- |
| 后处理多样性重排   | 在 Orchestrator 评分融合后添加 MMR 多样性重排 |          |
| 训练数据多样性增强 | 在微调数据中添加多样性约束样本                |          |
| 双重缓解           | 后处理重排 + 训练数据增强双管齐下             | ✓        |

**User's choice:** 双重缓解
**Notes:** 从模型层面和推理层面同时缓解偏见

---

## 漏斗 + 偏好模型补全

### 6 层漏斗补全

| Option         | Description                                      | Selected |
| -------------- | ------------------------------------------------ | -------- |
| 扩展现有管道   | 在 Orchestrator 中添加 L5/L6 软评分，最小改动    |          |
| 重构为管道模式 | 独立 FunnelPipeline 类，每层可插拔 Filter/Scorer | ✓        |
| 仅补全 L-t-R   | 保持现有管道，仅补全 Learning-to-Rank 多样性惩罚 |          |

**User's choice:** 重构为管道模式
**Notes:** 最灵活的架构，每层可独立测试和替换

### 偏好模型实现

| Option              | Description                                       | Selected |
| ------------------- | ------------------------------------------------- | -------- |
| Python FastAPI 服务 | 新建 preference_model_service.py，独立服务        |          |
| 集成到 SASRec 服务  | 在 sasrec_service.py 中添加偏好模型，共享基础设施 | ✓        |
| NestJS 简化实现     | 在 learning-to-rank.service.ts 中实现线性模型     |          |

**User's choice:** 集成到 SASRec 服务
**Notes:** 减少服务数量，共享 FastAPI 基础设施和模型持久化

### SASRec 集成

| Option         | Description                           | Selected |
| -------------- | ------------------------------------- | -------- |
| 启用现有客户端 | SASRecClientService 已存在，启用+配置 |          |
| 重写集成层     | 断路器+重试+监控+灰度发布             | ✓        |
| 延后到 Phase 7 | Phase 7 数据飞轮时再启用              |          |

**User's choice:** 重写集成层
**Notes:** 生产级集成需要断路器、重试、监控等基础设施

---

## 合规文档 + 安全加固

### PIPL 合规范围

| Option            | Description                                              | Selected |
| ----------------- | -------------------------------------------------------- | -------- |
| 补全跨境确认      | 添加 ai_domestic_no_crossborder 同意类型                 |          |
| 全面合规文档包    | 跨境确认 + PIPL 影响评估 + 数据保留策略 + 数据处理者协议 | ✓        |
| 最小代码+延后文档 | 仅代码补全，文档延后到 Phase 10                          |          |

**User's choice:** 全面合规文档包
**Notes:** 一次性完成所有合规要求，避免后续补课

### 安全加固范围

| Option       | Description                                                       | Selected |
| ------------ | ----------------------------------------------------------------- | -------- |
| 全量安全加固 | Nginx 速率限制 + K8s 安全上下文 + Docker Secrets/Vault + 网络策略 | ✓        |
| 紧急项优先   | 仅 secrets 替换 + 端口绑定 + API 代理                             |          |
| 先审计后修复 | 先做安全审计报告再决定修复范围                                    |          |

**User's choice:** 全量安全加固
**Notes:** 一次性完成所有安全修复

### 软著+商标范围

| Option          | Description                               | Selected |
| --------------- | ----------------------------------------- | -------- |
| 仅准备材料      | 源代码文档 + 42 决策 + 申请表             |          |
| 材料+自动化检查 | 准备材料 + 自动化脚本检查源代码文档完整性 | ✓        |

**User's choice:** 材料+自动化检查
**Notes:** 自动化检查确保文档质量，减少人工遗漏

---

## 数据管道 + 颜色标准化

### 电商 API 补全

| Option       | Description                    | Selected |
| ------------ | ------------------------------ | -------- |
| 联盟链接生成 | 淘宝客/京东联盟转链 API        |          |
| 全量电商功能 | 联盟链接 + 跨源比价 + 库存状态 | ✓        |
| 最小修复     | 仅修复 API4AI 空壳             |          |

**User's choice:** 全量电商功能
**Notes:** 完整电商闭环，支持佣金收入和用户购买决策

### 颜色标准化

| Option          | Description                                     | Selected |
| --------------- | ----------------------------------------------- | -------- |
| ML 侧标准化服务 | FashionSigLIP 编码 + 颜色名映射到 ColorStandard | ✓        |
| 规则映射表      | 在 color-matching.service.ts 中添加文本映射     |          |
| 延后            | Phase 7 数据飞轮时再做                          |          |

**User's choice:** ML 侧标准化服务
**Notes:** 利用 FashionSigLIP 编码能力，更准确地标准化中文颜色名

### 行为追踪修复

| Option       | Description                       | Selected |
| ------------ | --------------------------------- | -------- |
| 修复+增强    | 实现偏好稳定性计算 + 添加同步调度 | ✓        |
| 仅修复硬编码 | 用简单方差计算替换 0.7            |          |
| 延后         | Phase 7 数据飞轮                  |          |

**User's choice:** 修复+增强
**Notes:** 数据飞轮的基础，需要可靠的偏好稳定性计算和定期同步

---

## Claude's Discretion

- 统一微调框架的具体模型加载和适配器模式细节
- FunnelPipeline 接口设计 (Filter/Scorer 抽象)
- 偏好模型双塔架构的具体层设计 (在 5M params 约束内)
- 断路器阈值和降级策略的具体参数
- PIPL 影响评估文档的具体格式和内容深度
- Nginx 速率限制的具体阈值
- 颜色标准化服务的向量匹配阈值
- 跨源比价的展示策略

## Deferred Ideas

None — discussion stayed within phase scope
