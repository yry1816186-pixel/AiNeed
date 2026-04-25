# Phase 6: Model Upgrade + Compliance + Security - Context

**Gathered:** 2026-04-25
**Status:** Ready for planning (updated — codebase more mature than initial context)

<domain>
## Phase Boundary

Phase 6 delivers production-grade recommendation pipeline + legal compliance + security hardening. Key scope:

1. **FashionSigLIP 微调+偏见审计** — 统一微调框架适配 SigLIP + 两层偏见审计 + 双重偏见缓解
2. **6 层漏斗管道重构** — 独立 FunnelPipeline 可插拔架构 + L5/L6 软评分补全
3. **偏好模型+SASRec 集成** — 5M params 偏好模型集成到 SASRec 服务 + 重写 NestJS 集成层
4. **全面 PIPL 合规** — 跨境确认 + 影响评估文档 + 数据保留策略 + 数据处理者协议
5. **全量安全加固** — Nginx 速率限制 + K8s 安全上下文 + Docker Secrets/Vault + 网络策略
6. **数据管道补全** — 全量电商功能 + ML 侧颜色标准化 + 行为追踪修复增强
7. **软著+商标** — 材料准备 + 自动化源代码文档完整性检查

**Critical update from codebase scout**: Many components are more mature than initially scoped — FashionSigLIP already replaced, SASRec Python service complete, privacy service complete, Nginx TLS configured, e-commerce API multi-source integrated. Phase 6 focuses on **gap-filling and production hardening**, not greenfield builds.

</domain>

<decisions>
## Implementation Decisions

### 偏见审计 + 微调适配

- **D-01:** 统一微调框架 — 新建 `ml/scripts/finetune_unified.py`，支持 CLIP/SigLIP/自定义模型，通过 `--model-type` 参数切换。保留原 `finetune_fashionclip.py` 作为参考。框架需支持 LoRA (rank=16) + 全量微调两种模式。
- **D-02:** 两层偏见审计法:
  - **Layer 1 (功能测试)**: 5 个不同风格 Profile，同场景请求推荐，检查结果多样性（D-03 原决策）
  - **Layer 2 (深度审计)**: 分析 FashionSigLIP 编码空间中不同性别的向量分布，检查是否存在性别聚类
  - 审计脚本: `ml/scripts/bias_audit.py`
- **D-03:** 双重偏见缓解:
  - **后处理**: 在 Orchestrator 的评分融合后添加多样性重排 (MMR 或类似算法)，确保结果不集中于单一风格/性别
  - **训练数据**: 在微调数据中添加多样性约束样本，从模型层面减少偏见
  - 多样性重排集成到 FunnelPipeline 的最终阶段

### 漏斗 + 偏好模型补全

- **D-04:** 重构为管道模式 — 将 Orchestrator 中的漏斗逻辑抽取为独立 `FunnelPipeline` 类:
  - 每层 (L1-L6) 作为可插拔的 Filter/Scorer 接口
  - L1 合规 → L2 场景 → L3 尺码 → L4 预算 (硬过滤)
  - L5 风格 → L6 衣橱互补 (软评分)
  - 管道输出统一 `RecommendationBreakdown` 类型
  - 现有 Orchestrator 调用 FunnelPipeline 而非内联逻辑
- **D-05:** 偏好模型集成到 SASRec 服务 — 在 `ml/services/recommender/sasrec_service.py` 中添加 5M params 偏好模型:
  - 双塔架构 (用户塔 + 物品塔)，输入: UserProfile + scene + candidate items，输出: preference score
  - 共享 SASRec 服务的 FastAPI 基础设施、模型持久化、健康检查
  - 新增端点: `/preference/predict`, `/preference/train`
  - 训练数据: UserBehaviorEvent 表 + 用户 Profile 特征
- **D-06:** 重写 SASRec 集成层 — 替换现有 `sasrec-client.service.ts`:
  - 断路器模式 (opossum 或自实现): 连续失败后自动降级
  - 指数退避重试: 1s → 2s → 4s，最多 3 次
  - 健康检查集成: 定期 ping `/health`，更新服务状态
  - 灰度发布: 通过 FeatureFlagService 控制流量比例
  - 监控指标: 请求延迟/成功率/降级次数

### 合规文档 + 安全加固

- **D-07:** 全面 PIPL 合规文档包:
  - 代码: 在 `consent-types.ts` 添加 `ai_domestic_no_crossborder` 同意类型 + 前端确认弹窗
  - 文档: PIPL 影响评估报告 (数据流图+风险评估+缓解措施)
  - 文档: 数据保留策略 (各数据类型保留期限+自动清理规则)
  - 文档: 数据处理者协议模板 (与第三方服务的数据处理约定)
  - 文档: GB/T 45574-2025 逐项合规检查清单
- **D-08:** 全量安全加固:
  - Nginx: 添加速率限制 (limit_req_zone) + 请求 ID 追踪 (X-Request-ID) + 机器人防护 (User-Agent 检查)
  - K8s: 安全上下文 (runAsNonRoot, readOnlyRootFilesystem, drop ALL capabilities) + NetworkPolicy (仅允许必要端口通信)
  - Secrets: 替换 `k8s/secrets.yml` 占位符为 Docker Secrets 或 HashiCorp Vault 引用
  - 端口: 所有服务绑定 127.0.0.1，仅 Nginx 暴露 443
  - 移动端: EXPO_PUBLIC_API_URL 改为服务端代理路径，不在客户端暴露 API 地址
- **D-09:** 软著+商标:
  - 材料准备: 源代码文档 (60 页) + 42 冻结决策作为原创设计证据 + 用户手册
  - 自动化: 编写脚本检查源代码文档完整性 (注释覆盖率+API 文档完整性+类型定义完整性)
  - 商标: "寻裳" + "伊伊" 在第 9 类 (软件) 和第 42 类 (SaaS) 的申请材料
  - 算法备案: 准备推荐算法说明文档 + 数据处理流程图

### 数据管道 + 颜色标准化

- **D-10:** 全量电商功能:
  - 联盟链接: 淘宝客 `tbk_spread.getTbkSpread` + 京东联盟 `jd.union.open.promotion/common/get`
  - 跨源比价: 同一商品在淘宝/京东/得物的价格对比展示
  - 库存状态: 检查商品是否可购买 (淘宝 `item_detail` + 京东 `jingfen/query`)
  - API4AI: 移除空壳或实现基础功能
- **D-11:** ML 侧颜色标准化服务 — 在 `ml/services/` 新建 `color_standardization_service.py`:
  - 输入: 自由文本颜色名 (如 "雾霾蓝", "燕麦色")
  - 处理: FashionSigLIP 编码颜色名 → 与 ColorStandard 数据库向量匹配 → 返回标准色
  - 输出: ColorStandard ID + hex + colorFamily + confidence
  - FastAPI 端点: `/color/standardize`
  - 后端集成: `color-matching.service.ts` 调用 Python 服务替代本地规则
- **D-12:** 行为追踪修复增强:
  - 修复 `calculatePreferenceStability()` 硬编码 0.7 → 基于用户历史偏好变化频率计算 (方差/标准差)
  - 添加同步调度: 每日全量同步行为数据到推荐特征 + 每周重算偏好权重
  - 添加 BullMQ 定时任务: `behavior-sync-daily`, `preference-recalc-weekly`

### Claude's Discretion

- 统一微调框架的具体模型加载和适配器模式细节
- FunnelPipeline 接口设计 (Filter/Scorer 抽象)
- 偏好模型双塔架构的具体层设计 (在 5M params 约束内)
- 断路器阈值和降级策略的具体参数
- PIPL 影响评估文档的具体格式和内容深度
- Nginx 速率限制的具体阈值 (通用 API vs AI API)
- 颜色标准化服务的向量匹配阈值
- 跨源比价的展示策略 (价格排序/推荐最优源)

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Model & Fine-tune

- `ml/services/rag/embeddings.py` — FashionSigLIP embedding service (already using SiglipModel, auto-detects local fine-tuned model)
- `ml/scripts/finetune_fashionclip.py` — Existing fine-tune script (uses CLIPModel, reference for unified framework)
- `ml/scripts/prepare_finetune_data.py` — Data preparation (mock + real modes, Chinese description templates)
- `ml/scripts/benchmark_fashionclip.py` — Benchmark script (adapt for FashionSigLIP)
- `ml/scripts/seed_qdrant.py` — Qdrant vector DB seeding

### Recommendation Pipeline

- `apps/backend/src/domains/platform/recommendations/orchestrator/recommendation.orchestrator.ts` — Full funnel pipeline (1518 lines, to be refactored into FunnelPipeline)
- `apps/backend/src/domains/platform/recommendations/types/recommendation.types.ts` — RecommendationBreakdown type (577 lines)
- `apps/backend/src/domains/platform/recommendations/services/learning-to-rank.service.ts` — Learning-to-rank (409 lines, diversity penalty not implemented)
- `apps/backend/src/domains/platform/recommendations/services/color-matching.service.ts` — Color matching (RGB/LAB/HSL + harmony rules)

### SASRec + Preference Model

- `ml/services/recommender/sasrec_service.py` — SASRec Python service (1342 lines, complete, preference model to be integrated here)
- `apps/backend/src/domains/platform/recommendations/services/sasrec.service.ts` — SASRec NestJS service (748 lines, local approximation, to be replaced with client)
- `apps/backend/src/domains/platform/recommendations/services/sasrec-client.service.ts` — SASRec client (134 lines, to be rewritten with circuit breaker)

### Privacy & Compliance

- `apps/backend/src/domains/identity/privacy/privacy.service.ts` — Privacy service (362 lines, complete)
- `apps/backend/src/domains/identity/privacy/consent-types.ts` — 7 consent types (needs ai_domestic_no_crossborder)
- `apps/backend/src/domains/identity/privacy/consent.guard.ts` — @RequireConsent() decorator
- `apps/backend/src/domains/identity/privacy/consent.controller.ts` — PIPL consent endpoints
- `apps/backend/src/domains/identity/privacy/privacy.controller.ts` — Full REST API
- `apps/backend/src/domains/identity/privacy/privacy-version.ts` — Policy versioning

### Security

- `infrastructure/nginx/nginx.conf` — Nginx config (108 lines, TLS done, needs rate limiting)
- `k8s/ingress.yml` — K8s ingress (27 lines, needs WAF annotations)
- `k8s/deployment.yml` — K8s deployment (60 lines, needs security context)
- `k8s/secrets.yml` — K8s secrets (placeholders only, needs Vault/Docker Secrets)

### Data Pipeline

- `apps/backend/src/domains/fashion/clothing/clothing-data-source.service.ts` — Multi-source e-commerce API (593 lines, Taobao+JD+Dewu)
- `apps/backend/prisma/seed-colors.ts` — 30 color standards (seed data)
- `apps/backend/src/domains/platform/analytics/services/behavior-tracker.service.ts` — Behavior tracking (934 lines, hardcoded preference stability)

### Project-Level

- `docs/XUNO_FINAL_PLAN.md` — 42 frozen decisions (decisions #7, #41 relevant)
- `.planning/REQUIREMENTS.md` — MOD-01~04, RAD-01~04, DAT-01~05, CMP-01~05, SEC-01~04

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `embeddings.py`: FashionSigLIP service with auto-detect local fine-tuned model — no replacement needed, only bias mitigation
- `sasrec_service.py`: Full SASRec implementation (1342 lines) — preference model integrates here
- `recommendation.orchestrator.ts`: Full funnel pipeline (1518 lines) — refactored into FunnelPipeline
- `privacy.service.ts` + 13 privacy files: Complete PIPL/GDPR compliance — only cross-border consent gap
- `nginx.conf`: TLS 1.2/1.3 + security headers — only rate limiting gap
- `clothing-data-source.service.ts`: Multi-source e-commerce — only affiliate links + comparison gap
- `behavior-tracker.service.ts`: High-performance Redis queue design — only hardcoded stability gap
- `RecommendationBreakdown` type: Already has 6-layer fields — pipeline refactoring preserves this

### Established Patterns

- NestJS service pattern: injectable services with Prisma repositories
- Python ML services: FastAPI endpoints called from NestJS gateway
- SASRec service pattern: Python FastAPI + NestJS client + graceful degradation
- Privacy pattern: ConsentGuard decorator + ConsentRecord Prisma table
- Behavior tracking: Redis LPUSH queue → batch processing via @Cron
- K8s deployment: 3 replicas + rolling update + resource limits

### Integration Points

- `embeddings.py` → Qdrant vector DB → Orchestrator scoring (bias mitigation goes here)
- `sasrec.service.ts` → `sasrec_service.py` (Python) → model inference (rewrite client layer)
- `FunnelPipeline` ← extracted from `recommendation.orchestrator.ts` (new abstraction)
- `color_standardization_service.py` → `color-matching.service.ts` (new ML service)
- `clothing-data-source.service.ts` → Taobao/JD/Dewu APIs (add affiliate + comparison)
- Privacy consent → `behavior-tracker.service.ts` (consent-gated tracking, add cross-border)
- Nginx → NestJS backend (port 3001) → mobile API proxy (add rate limiting)

### Codebase Maturity Assessment

| Component               | State    | Key Gap                                          |
| ----------------------- | -------- | ------------------------------------------------ |
| FashionSigLIP Embedding | Complete | No bias mitigation                               |
| SASRec Python           | Complete | Production hardening                             |
| SASRec NestJS           | Partial  | Local approximation, needs real client           |
| Orchestrator            | Complete | L5/L6 soft scoring, needs pipeline refactor      |
| Privacy Service         | Complete | Cross-border consent, formal docs                |
| Nginx                   | Complete | Rate limiting, request tracing                   |
| K8s Config              | Partial  | Security context, network policies, real secrets |
| E-commerce API          | Complete | Affiliate links, cross-source comparison         |
| Color Matching          | Partial  | No ML-side standardization                       |
| Behavior Tracking       | Complete | Hardcoded preference stability                   |
| Learning-to-Rank        | Partial  | Diversity penalty not implemented                |
| Fine-tune Scripts       | Complete | Uses CLIPModel, needs SigLIP adaptation          |

</code_context>

<specifics>
## Specific Ideas

- Bias audit should use the same 5 profiles as demo preset profiles (default/professional/creative from demoStore) for consistency with Phase 5 demo
- Software copyright source code documentation should include the 42 frozen decisions as evidence of original design
- Nginx config should support both API proxy and MinIO static assets (already configured)
- FunnelPipeline should output the existing RecommendationBreakdown type to maintain frontend compatibility
- Preference model dual-tower: user tower encodes (bodyType + styleExpression + primaryScenarios + budget + colorPreferences), item tower encodes (FashionSigLIP vector + category + color + price)
- Circuit breaker for SASRec: 5 consecutive failures → open for 30s → half-open with 1 request → close if success
- Color standardization confidence threshold: 0.85 for auto-accept, below that flag for manual review
- PIPL impact assessment should cover: recommendation algorithm, virtual try-on, behavior tracking, body analysis

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope
</deferred>

---

_Phase: 06-model-upgrade-compliance-security_
_Context gathered: 2026-04-25_
_Context updated: 2026-04-25 (codebase scout revealed higher maturity than initial context)_
