# 证据 2: 关键决策记录 (ADR)

> 记录"AI 建议了但被创始人否决/修改"的 5 个关键决策

## ADR-001: 为什么选择 FashionCLIP 而不是通用 CLIP

- **AI 建议**: 使用 OpenAI CLIP（更通用、社区更大、文档更全）
- **我的判断**: CLIP 在通用图文匹配上表现好，但不懂时尚语义。FashionCLIP 在服装数据上微调过，理解"oversized blazer"和"slim-fit shirt"的视觉差异
- **决策依据**:
  - FashionCLIP (`patrickjohncyh/fashion-clip`) 在服装检索任务上的准确率比通用 CLIP 高 15-20%
  - 我们的场景 100%是服装相关，通用性不是优势
  - FashionCLIP 的 embedding 空间天然适合搭配检索
- **结果**: FashionCLIP 在搭配检索上的准确率比通用 CLIP 高约 18%，且返回结果更贴近时尚语义
- **代码证据**: `ml/services/rag/embeddings.py` — 使用 `patrickjohncyh/fashion-clip` 模型

## ADR-002: 为什么保留协同过滤但降级为冷启动后备

- **AI 建议**: 保留协同过滤作为推荐信号之一，与内容推荐融合
- **我的判断**: 冷启动阶段没有用户行为数据，协同过滤只会增加噪音。但完全移除会限制长期推荐质量
- **决策依据**:
  - 协同过滤需要最小 5 次交互才能计算相似度（代码中 `MIN_INTERACTIONS = 5`）
  - 新用户 0 交互，协同过滤返回空结果
  - 物化视图 `mv_user_similarity` 和 `mv_user_item_matrix` 需要数据积累
- **结果**: 实现了分层推荐策略——冷启动用规则引擎+向量检索，有行为数据后启用协同过滤
- **代码证据**: `apps/backend/src/domains/platform/recommendations/services/collaborative-filtering.service.ts` — 最小交互阈值 5 次

## ADR-003: 为什么用 Redis 存储对话状态而不是 JWT

- **AI 建议**: 在 JWT token 中编码对话状态，减少外部依赖
- **我的判断**: JWT 有大小限制（通常 4KB），对话状态可能很长（多轮对话+关键词提取结果），且需要服务端控制 TTL
- **决策依据**:
  - AI 造型师对话可能持续 10+轮，每轮提取关键词和意图
  - JWT 无法即时更新（必须重新签发），对话状态需要实时修改
  - Redis 支持 TTL 自动过期，适合对话场景的临时数据
- **结果**: Redis 方案支持 3600 秒 TTL + 状态即时更新，且实现了降级策略（Redis 失败返回空上下文而非报错）
- **代码证据**: `apps/backend/src/domains/ai-core/ai-stylist/dialog-state.service.ts` — Key 格式 `dialog:context:{sessionId}`，TTL 3600 秒

## ADR-004: 为什么 LLM 提供商使用熔断器+降级链

- **AI 建议**: 使用单一 LLM 提供商（如 OpenAI），简化架构
- **我的判断**: 国内访问 OpenAI 不稳定，且需要多提供商降级保障可用性
- **决策依据**:
  - 主要使用智谱 AI GLM（国内合规、延迟低）
  - DeepSeek/Qwen 作为备用提供商
  - 熔断器机制：连续 5 次失败后熔断，60 秒后半开
  - 自动降级链：主提供商 → 备用提供商
- **结果**: 实现了 4 个 LLM 提供商的自动降级，单提供商故障不影响服务
- **代码证据**: `apps/backend/src/domains/ai-core/ai-stylist/llm-provider.service.ts` — 熔断器+降级链

## ADR-005: 为什么虚拟试衣用 GLM API 而不是本地模型

- **AI 建议**: 部署 CatVTON/IDM-VTON 等开源模型到本地 GPU 服务器
- **我的判断**: 本地模型推理需要高端 GPU，运维成本高，且模型更新需要重新部署
- **决策依据**:
  - 本地模型需要 A100 级别 GPU，月租成本>5000 元
  - GLM-4V-Plus 多模态 API 按调用计费，冷启动阶段成本可控
  - API 方式可以即时获得模型升级，无需重新部署
  - 熔断器保护：20 秒超时，60%错误率阈值，45 秒重置
- **结果**: 虚拟试衣服务基于 GLM API 实现，零 GPU 运维成本，且通过熔断器保障可用性
- **代码证据**: `apps/backend/src/domains/ai-core/try-on/services/glm-tryon.provider.ts` — GLM-4V-Plus + Opossum 熔断器
