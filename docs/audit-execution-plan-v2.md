# 80 条 AI 审计 — 校正后精准执行计划

## 已验证的 15 项项目现状（基于代码实际扫描，非推测）

| #   | 现状                                                   | 证据                                                                              |
| --- | ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| 1   | DialogEngine 是分支状态机(9 状态)，非线性的，已验证    | `dialog_engine.py:469-479` handler map + `_classify_greet_intent` 分支到 4 个目标 |
| 2   | 无一键 Tool 注册机制，无 tools/目录                    | 仅有 `_call_llm` 回调                                                             |
| 3   | SlotExtractor 正确则优先 →LLM 兜底，已验证             | `slot_extractor.py:4-7` 文档                                                      |
| 4   | HybridRetriever 不自己算 cosine，委托 Qdrant 服务端做  | `hybrid_retriever.py:77-90` 仅做 RRF 融合，纯 Python 循环                         |
| 5   | torch.backends.cudnn.benchmark **从未设置**            | embeddings.py 全文件搜索 0 匹配                                                   |
| 6   | STYLIST_SYSTEM_PROMPT 是 150 行/2197 字符整块字符串    | `stylist_prompts.py:125-274`                                                      |
| 7   | 所有 prompt 用 Python .format()，无目录，无 Jinja2     | 全项目无 `ml/prompts/` 目录                                                       |
| 8   | AI API 调用分散，后端 6 个 service 各自建 axios        | `ai-core/` 下 5 子模块各自独立调用                                                |
| 9   | ml/services/common/ 无统一 API 客户端                  | 13 个文件，缺 `api_client.py`                                                     |
| 10  | 移动端有 AsyncStorage 持久化，但无离线优先架构         | Zustand persist + AsyncStorage，缺 NetInfo 检测                                   |
| 11  | OCR 全项目零代码                                       | glob `**/*ocr*` 零文件                                                            |
| 12  | ml/tests/ 共 5 个测试文件，无 prompt 测试              | 无 `ml/tests/prompt_tests/`                                                       |
| 13  | GNN 兼容性服务用加权平均(0.35/0.35/0.3)，无 Platt 校准 | `gnn-compatibility.service.ts:223-283`                                            |
| 14  | Qdrant collection 仅设 COSINE 距离，无量化和 HNSW 调优 | `qdrant_client.py:77-88`                                                          |
| 15  | jieba 仅 `jieba.cut(text)` 无自定义词典                | `bm25_retriever.py:44-45`                                                         |

---

## 已识别并移除的过度设计项

| 移除项                            | 原因                                   |
| --------------------------------- | -------------------------------------- |
| 本地 LLM 部署(Qwen 7B)            | 对话/试穿全是 API，不做本地推理        |
| 多 Agent 拆分为 4 独立 Agent      | 当前 DialogEngine 对单一穿搭场景已够用 |
| MCP PoC                           | 项目零 MCP 需求，标准未成熟            |
| OCR 全链路建设                    | 产品定位无 OCR 功能需求                |
| K8s HPA 自动调优/混沌工程         | 对当前阶段过度运维                     |
| 编写 CUDA kernel                  | 仅轻量推理不需要                       |
| AutoGen/LangChain/LlamaIndex 评估 | 已确认不使用                           |

---

## 校正后的执行窗口 Prompt

在 C:\AiNeed 项目中，按以下顺序执行精准优化。对话/试穿模型均为 API 调用(GLM-5/Doubao Seedream)，不涉及自训练 LLM。

---

### Phase 1: Prompt 工程体系（最高 ROI，直接影响用户体验和成本）

**1.1 System Prompt 精简与结构化**

- 重构 `STYLIST_SYSTEM_PROMPT`（`stylist_prompts.py:125-274`）：从 150 行压缩到<80 行
- 四段式结构：`[角色身份]/[能力边界-明确不能做什么]/[语气谱-热情不谄媚专业不冷漠]/[行为约束]`
- 移除硬编码的体型/色季搭配规则（应改为从 `fashion_rules.json` 动态加载）
- 动态上下文（用户画像/天气）从 System Prompt 移到首条 user message 注入，使 System Prompt 可被缓存

**1.2 Prompt 模板化**

- 创建 `ml/prompts/` 目录，将所有 prompt 从 Python f-string 迁移到 YAML+Jinja2 模板
- 定义基模板(base.j2)含共享角色定义和安全约束
- 每个模板文件含：version/template/variables/few_shots 字段
- 所有 `.format()` 调用替换为 Jinja2 渲染

**1.3 GLM Function Calling 标准化**

- `slot_extractor.py` 改为完全依赖 GLM Function Calling（定义 `extract_slots` function schema）
- 所有需要 JSON 输出的 prompt 启用 `response_format: { type: "json_object" }`
- 在 `stylist_prompts.py` 的推荐生成 prompt 中引入 Chain-of-Thought

**1.4 上下文管理优化**

- DialogEngine 重构记忆为三层：working_memory(≤10 轮) + episodic_memory(关键摘要) + semantic_memory(持久化偏好)
- 上下文>80%容量时 LLM 自动压缩前 5 轮为 100 字摘要
- 每 5 轮检测对话是否偏离主题，偏离则拉回

---

### Phase 2: Token 成本管控（直接影响运营成本）

**2.1 精确 Token 计量**

- 创建 `ml/services/common/token_counter.py`：封装 `count_tokens()` 和 `truncate_by_tokens()`
- 在所有 prompt 构建处接入，日志格式：`[TOKEN] template=xxx prompt=N history=N total=N`

**2.2 API 调用费用追踪**

- 在 `algorithm_gateway.py` 或新建统一客户端中加入：从 API response 提取 usage → × 单价 → Prometheus 埋点(total_cost/cost_per_user)
- Grafana 创建「AI Cost Dashboard」

**2.3 Token 消耗优化**

- 用户输入口语去冗余预处理（去"那个"/"就是说"）
- RAG 检索结果每个 chunk 截断到 300 token，最多 5 个
- 对话历史滑动窗口：保留最近 5 轮完整 + 前 5 轮压缩摘要

---

### Phase 3: API 调用稳定性（直接影响服务可用性）

**3.1 统一 API 客户端**

- 创建 `ml/services/common/api_client.py`：httpx AsyncClient 单例 + 连接池(pool_limits=50) + 指数退避重试(3 次) + 超时(connect=5s read=30s) + request_id 追踪
- 所有 AI API 调用统一走此客户端

**3.2 后端 AI Gateway**

- 创建 `apps/backend/src/modules/ai-gateway/`：统一管理所有 AI API 调用，替代各 domain 分散的 axios 调用
- 内置：多模型路由(GLM-5 → DeepSeek fallback)、熔断(5 次失败熔断 30s)、请求 ID 贯穿全链路

**3.3 多级降级策略**

- DialogEngine LLM 不可用时降级链：GLM-5 → GLM-4-Flash → 缓存回复 → 规则回复
- 每次降级记录日志和 metrics

---

### Phase 4: RAG 检索质量提升（直接影响推荐准确率）

**4.1 jieba 时尚专用词典**

- 在 `bm25_retriever.py` 的 jieba 初始化处加载自定义词典（200+时尚术语：品牌名/风格/面料/版型）
- 创建词典文件 `ml/data/jieba_fashion_dict.txt`

**4.2 检索策略优化**

- HybridRetriever 改为两阶段：BM25 先召回 top-50 → BGE Reranker 精排 → 返回 top-5
- 增加 MMR(Maximum Marginal Relevance)去重：避免返回高度相似单品
- 相关性阈值过滤：Reranker<0.3 的 chunk 丢弃，全不达标触发"知识库无信息"fallback

**4.3 Query 改写**

- 用户 query → LLM 扩展为 3-5 个语义变体(同义词/上下位词/搭配场景) → 合并 BM25+向量检索结果

**4.4 Qdrant 基础优化**

- HNSW 参数调优：`m=32 ef_construct=200`（初始值，后续 benchmark 调优）
- 启用 scalar int8 量化：`quantization_config: {scalar: {type:"int8", quantile:0.99}}`
- 快照备份：定时创建 → 上传 MinIO

---

### Phase 5: AI 安全加固（实际线上风险）

**5.1 Prompt 注入防御升级**

- 从关键词黑名单升级为语义注入检测（创建 `ml/services/common/injection_detector.py`）
- 输入规范化：移除 Unicode 同形字、零宽字符、不可见控制字符
- 图片间接注入防护：GLM-4V-Plus 分析前检测图片中可疑文字

**5.2 偏见检测**

- 创建 `ml/scripts/bias_audit.py`：不同体型/风格测试 case → 检查推荐是否有系统性偏差
- System Prompt 增加"健康优先"原则和消费伦理约束

**5.3 隐私增强**

- 用户人脸照片 → 设备端 MediaPipe 处理，原始照片不上传
- 服装照片上传前做人脸模糊
- Qdrant 用户向量加 Laplace 噪声(ε=1.0)

---

### Phase 6: 评估与监控（保障质量不退化）

**6.1 Prompt 回归测试**

- 创建 `ml/tests/prompt_tests/`：每个场景 prompt 10+标准用例，LLM-as-judge 打分
- CI 加入 `pytest ml/tests/prompt_tests/`，均分<0.8 阻断

**6.2 LLM 输出质量监控**

- 每周采样 100 条对话 → LLM-as-judge 评分 → 连续 2 周下降>10%告警
- 数据漂移检测：用户请求特征分布与基线的 KL 散度

**6.3 用户反馈闭环**

- 推荐后收集 👍/👎 + 理由 → 存入 feedback 表 → 周度分析高频差评模式

---

### Phase 7: 代码质量收尾

**7.1 Python 工程化**

- 全局替换 `ml/` 下所有裸 `except:` 为具体异常类型
- `ml/services/stylist/dialog_state.py` 已有 `StrEnum`，无需新建（已验证）
- 创建 `.python-version` 写入 `3.11`

**7.2 向量计算改为批量**

- 所有向量聚合操作（StyleDNA 等）从 Python for 循环改为 numpy 批量 `np.mean(vectors, axis=0)`

**7.3 推荐权重回测**

- `UnifiedRecommendationEngine` 权重用历史用户行为计算不同组合的 NDCG@20 选最优

**7.4 GNN Platt Scaling 校准**

- `gnn-compatibility.service.ts` 的 `fuseScores` 输出用 sigmoid 校准为真实概率

**7.5 cudnn benchmark**

- 所有 torch 使用文件顶部加 `torch.backends.cudnn.benchmark = True`

---

### 不执行项（明确排除）

- 本地 LLM 部署（全部 API 调用）
- 多 Agent 拆分（当前单 Agent 架构满足需求）
- MCP（标准未成熟 + 零需求）
- OCR（产品无此功能定位）
- LangChain/LlamaIndex/AutoGen（已自研替代）
- RL/RLHF/RLAIF（不使用自训练 LLM）
- 视频生成（无此功能）
- K8s 运维调优（当前阶段过度）
- 微积分基础（无此需求）
- AGI 架构（无此需求）
