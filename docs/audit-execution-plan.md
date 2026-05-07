# 80 条 AI 审计 — 全量优化执行计划

## 执行窗口 Prompt（复制到新会话使用）

---

请在 C:\AiNeed 项目中，按以下 6 个 Phase 逐 Phase 执行全量优化（基于 80 条审计报告），每个 Phase 完成后汇报进度再继续下一 Phase。所有代码可直接写入无需确认。对话和试穿模型均为 API 调用（GLM-5/GLM-4V-Plus/Doubao Seedream），跳过自训练 LLM/RLHF/RLAIF/AGI 架构相关项。

---

### Phase 1: 基础设施标准化（审计项 3-4-5-6-9-11-26-65-66）

**一、Python 工程化强化（审计 3-4）**

1. 全局搜索 `ml/` 下所有裸 `except:` 替换为具体异常类型
2. 创建 `ml/services/stylist/states.py`，将 DialogEngine 状态定义为 StrEnum
3. 创建 `ml/services/common/api_client.py`：统一 httpx AsyncClient 单例 + 连接池(pool_limits=100) + 指数退避重试(3 次/backoff_factor=0.5) + 超时(connect=5s,read=30s) + request_id 生成 + 日志
4. 创建 `.python-version` 写入 `3.11`，`pyproject.toml` 改为 `==3.11.*`
5. 设置 `torch.backends.cudnn.benchmark = True` 在 `ml/services/rag/embeddings.py` 和所有使用 torch 的文件顶部

**二、数据清洗管道（审计 11）** 6. 创建 `ml/services/common/data_cleaner.py`：缺失值填充策略（枚举 mode/数值 median/文本"未知"）、异常值 IQR 检测、图片 URL 异步有效性校验 7. 移动端创建 `apps/mobile/src/utils/storage.ts`：处理 Date→ISO string、undefined→null、BigInt→string 的序列化工具

**三、Token 精确计量（审计 26）** 8. 创建 `ml/services/common/token_counter.py`：封装 `count_tokens(text)` 和 `truncate_by_tokens(text, max_tokens)`，使用 tiktoken cl100k_base 近似 9. 在所有 prompt 构建处接入 token_counter，日志格式：`[TOKEN] template=xxx, prompt=N, history=N, total=N`

**四、GPU 精细管理（审计 65-66）** 10. 创建 `ml/services/common/gpu_manager.py`：封装 `pynvml` 采集 GPU 利用率/SM 占用率/温度/功耗，暴露给 Prometheus 11. 编写 `docs/gpu-memory-budget.md`：列出每个模型 VRAM 占用 → 8GB 最优化配置方案

---

### Phase 2: Prompt 工程体系（审计 18-19-20-21-22-23-24-25-27-28-29-30-31）

**五、Prompt 模板体系（审计 18-22-24）**

1. 创建 `ml/prompts/` 目录，将所有 prompt 迁移到 YAML+Jinja2 模板文件（每个含 version/template/variables/few_shots）
2. 创建基模板 `ml/prompts/base_stylist.j2` 含角色定义+安全约束，各场景模板用 `{% extends %}` 继承
3. System Prompt 四段式重构：`[身份]/[能力边界]/[语气谱]/[行为约束]` 目标<80 行
4. 动态 few-shot：在 Qdrant 存储历史高质量对话 → query 检索相似 top-3 → 注入 prompt

**六、结构化 Prompt（审计 20-21）** 5. 所有 JSON 输出 prompt 启用 GLM-5 的 `response_format: { type: "json_object" }` 参数 6. SlotExtractor 改为完全依赖 GLM Function Calling：定义 `extract_slots` function schema 7. 在 StyleRecommendation prompt 中引入 Chain-of-Thought：分析特征 → 匹配风格 → 推荐单品 8. 创建 `docs/prompt-design-guide.md`：checklist(角色 → 任务 → 约束 → 格式 → 示例 →fallback)

**七、Prompt 评估体系（审计 25）** 9. 创建 `ml/tests/prompt_tests/`，每个 prompt 对应一个测试文件，10+标准用例 10. 设计评估 KPI：任务完成率、风格一致性、安全性、效率（token/task） 11. CI 加入 `pytest ml/tests/prompt_tests/`，平均分<0.8 阻断合并

**八、Token 成本管控（审计 27-28-29）** 12. 在 AI Gateway 中从 API response 提取 usage 字段 → 计算费用 → Prometheus 埋点(total_cost/cost_per_user/cost_per_endpoint) 13. Grafana 创建「AI Cost Dashboard」：按 API/用户/时间维度的费用趋势 14. 对话历史滑动窗口+摘要：最近 5 轮完整+前 5 轮 100 字摘要+用户偏好持久字段 15. 用户输入口语去冗余预处理：去"那个"/"就是说"/"嗯"，压缩率目标 10-15% 16. 分层 AI 额度：免费 50 对话+3 试穿/天，会员 200+15/天，VIP 无限制

**九、上下文管理升级（审计 30-31）** 17. 重构记忆模型为三层：working_memory(≤10 轮) + episodic_memory(关键决策摘要) + semantic_memory(用户画像持久化) 18. 上下文窗口>80%触发压缩：LLM 将前 5 轮压缩为 100 字摘要 19. 长上下文收益评估文档 `docs/long-context-evaluation.md`：32K vs 128K 的效果/成本对比

---

### Phase 3: AI 安全与治理（审计 76-77-78-79）

**十、Prompt 注入深度防御（审计 76）**

1. Prompt 注入检测从关键词黑名单升级为语义检测：创建 `ml/services/common/injection_detector.py` → 用规则+轻量分类器识别注入攻击
2. 输入规范化：移除 Unicode 同形字(homoglyph)、零宽字符、不可见控制字符
3. 图片间接注入防护：GLM-4V-Plus 分析前用 OCR 检测图片中是否有可疑文字指令
4. Few-shot 投毒防护：历史对话标记 `verified=true` 后才可被选为 few-shot

**十一、AI 对齐与偏见检测（审计 77）** 5. 创建 `ml/scripts/bias_audit.py`：模板生成不同体型/肤色/年龄测试 case → 检查推荐系统性偏差 6. 价值观引导：System Prompt 加入"健康优先""消费伦理"原则 7. 推荐涵盖多价格区间，默认不按价格排序

**十二、隐私计算强化（审计 78）** 8. 照片隐私分级实施：人脸照片 → 设备端 MediaPipe 处理(不出设备)；服装照片 → 人脸模糊后上传 9. 向量隐私：Qdrant 中用户向量加 Laplace 噪声(ε=1.0)后用于聚合分析 10. 更新 `docs/privacy/ai-data-processing-declaration.md`：明确告知第三方 API 数据处理

**十三、AI 治理框架（审计 79）** 11. 创建 `docs/ai-governance/ethics_review_template.md`：AI 功能上线前 12 项检查 12. AI 生成内容添加"AI 生成,仅供参考"标识 13. 创建 AI 事故响应 SOP：5 级事故 → 对应响应流程 14. 对照中国《生成式 AI 服务管理办法》合规自查 → 生成差距报告

---

### Phase 4: Agent 架构升级（审计 39-40-41-42-43-44-45）

**十四、单 Agent 能力强化（审计 39-42-43）**

1. 实现可插拔 Tool 注册：创建 `ml/services/stylist/tools/base.py` Tool 基类(name/description/parameters/execute)，各 Tool 继承实现，ToolRegistry 动态加载
2. 迁移到 GLM-5 原生 Function Calling：定义 Tool schema → 注册到 API 调用 → tool_choice 自动决策
3. Agent 自我反思步骤：生成推荐后 →LLM 二次检查配色/季节/场合 → 不通过重新生成
4. 会话生命周期管理：空闲 30 分钟提醒 →60 分钟自动保存关闭
5. 多级降级策略：GLM-5 不可用 → GLM-4-Flash → 缓存回复/规则回复
6. 创建 `ml/services/stylist/tools/` 并拆分现有功能为独立 Tool 文件(search_catalog/analyze_body/get_weather/check_match/recommend_outfit)

**十五、多 Agent 协作体系（审计 40-41-44）** 7. 拆分四个专业 Agent：ColorConsultantAgent/BodyShapeAgent/TrendAgent/CoordinatorAgent 8. 定义 Agent 通信协议 `ml/services/agent/protocol.py`：结构化消息格式 `{from/to/type/content/metadata}` 9. 冲突解决机制：Coordinator 检测冲突 → 触发辩论(双方举证)→LLM 仲裁 → 输出最终决策 10. 任务优先级：用户显式约束 > 场合匹配 > 风格偏好 > 潮流趋势 11. 超时管控：每个 Agent 10s 超时/最多 3 次重试 12. 用户反馈闭环：推荐后收集 👍/👎+理由 → 存入 feedback 表 → 周度分析改进

**十六、工作流自动化（审计 45）** 13. BullMQ 构建 AI 工作流调度器：cron 触发 → 执行 ml 脚本 → 记录结果 14. 周期性 AI 报告自动生成：周一趋势分析 → 推送管理后台 15. Qdrant 磁盘>80%自动清理 cron

---

### Phase 5: RAG 与检索优化（审计 14-33-34-35-36-37-38）

**十七、向量技术深化（审计 14-33-34）**

1. Qdrant 按商品类别拆分 collection：fashion_tops/bottoms/dresses/accessories
2. HNSW 参数调优：grid search m(16/32/64) × ef_construct(100/200/400) → 选召回>0.95 最快配置
3. 启用 Qdrant scalar quantization(int8)：`quantization_config: {scalar: {type:"int8", quantile:0.99}}`
4. 写入 ADR `docs/adr/003-embedding-model-selection.md` 记录 FashionSigLIP 选型理由
5. 创建 `ml/scripts/benchmark_embeddings.py`：Silhouette Score/Davies-Bouldin Index/Precision@10

**十八、混合检索升级（审计 35-36-37）** 6. HybridRetriever 两阶段检索：BM25 先召回 top-K→ 向量重排序 7. Query 改写：LLM 将用户 query 扩展为 3-5 个搜索变体 → 合并检索结果 8. MMR 重排：在相关性和多样性之间平衡 9. 检索结果相关性阈值过滤：BGE Reranker<0.3 丢弃，全<0.3 触发 fallback 10. jieba 自定义词典：添加 200+时尚专有词汇 11. 创建语义搜索 benchmark：50+标准 query → Recall@K/MRR/NDCG

**十九、知识库工程化（审计 37-38）** 12. 集成文档解析 `ml/services/rag/document_parser.py`：支持 PDF/HTML/Markdown(用 unstructured/markitdown) 13. 知识更新自动 Pipeline：爬取 →LLM 抽取结构化知识 → 冲突检测 → 人工审核 → 更新 Qdrant+Neo4j 14. Qdrant 和 Neo4j 同步机制：每次更新同时写入两处+synced_at 时间戳

---

### Phase 6: MLOps、OCR 与多模态（审计 52-53-54-55-57-58-59-60-67-68-69-70-71-72）

**二十、MLOps/LLMOps（审计 67-68-69-70-71）**

1. 创建 `ml/models/registry.yaml` 模型注册表：版本/训练日期/评估指标/部署状态
2. 创建统一评测框架 `ml/tests/evaluation/eval_framework.py`：L1 单元/L2 集成/L3 用户评测
3. 建设标准评测集(Golden Dataset)：200+标准穿搭问题+人工标注最佳答案
4. 创建 4 类 benchmark：retrieval/dialog/recommendation/e2e，CI 中指标下降>5%阻断
5. LLM 输出质量漂移检测：每周采样 100 条 →LLM-as-judge→ 连续 2 周下降>10%告警
6. 模型监控增强：推荐采纳率/置信度分布/P50-P99 延迟/数据漂移 KL 散度
7. Grafana 创建 model-ab-comparison dashboard

**二十二、多模态深度融合（审计 52-53-54-55）** 8. MultimodalFusionService 升级：从拼接改为 cross-attention 融合 9. 语音情感分析：STT 后增加轻量情感分类(高兴/中性/沮丧/急切)→Agent 调整回复 10. 试穿图质量自动评估：GLM-4V-Plus 对比生成图 vs 原商品图，评估颜色/款式/细节一致性 11. Edge-TTS SSML 支持：不同场景用不同韵律 `<prosody rate="slow" pitch="high">` 12. 离线 TTS：集成 Piper TTS 中文模型到移动端 13. 创建 `docs/tts-pre-cache-strategy.md`：分析高频回复 top-100 预生成音频

**二十三、数据合成（审计 72）** 14. GLM-5 生成 1000+模拟穿搭对话数据（各种体型/风格/场景/季节） 15. GLM-5 生成 200+评测用例（正例+负例：模糊/超范围/含偏见输入） 16. LLM 从时尚文章中抽取新搭配规则 → 人工审核 → 补充到 `ml/data/rules/`

**二十四、推荐系统优化（审计 15-16）** 17. 推荐权重离线回测：用历史用户行为计算不同权重组合的 NDCG@20，选最优 18. GNN 兼容性输出 Platt Scaling 校准 19. 创建 `ml/scripts/ab_test_analyzer.py`：t-test/Mann-Whitney U→p 值+效应量 20. 所有向量计算改为批量矩阵运算：`query @ candidates.T` 替代 Python 循环

---

### Phase 7: OCR 全链路建设（审计 57-58-59-60）

**二十五、OCR 基础 → 极致全链路**

1. 集成 PaddleOCR → `ml/services/common/ocr_service.py`
2. 图像预处理管线：光照归一化 → 透视矫正 → 超分辨率增强 → 自适应二值化 →OCR
3. 多语言 OCR 策略：fastText 语言检测 → 中文 PaddleOCR/日韩 EasyOCR/英文 Tesseract
4. 结构化提取：LLM 对 OCR 原文做 NER → 提取{品牌/材质/尺码/颜色/价格/产地}
5. OCR 后处理纠错：时尚领域纠错词典+LLM 语义纠错
6. 创建时尚 OCR benchmark：200 张真实场景图片+人工标注 ground truth
7. 移动端"拍照识标签"功能：拍照 →OCR API→ 提取面料/尺码 → 自动存衣橱
8. OCR→ 推荐打通：识别品牌名 → 自动触发"找相似款"

---

### Phase 8: SDK、MCP 与文档（审计 46-47-48-49-50-51-78）

**二十六、AI SDK 统一封装（审计 50-51）**

1. 创建 `ml/services/sdk/` Python AI SDK 包：统一封装 GLM-5/GLM-4V-Plus/Seedream/Edge-TTS
2. SDK 内置：熔断器(5 次失败熔断 30s)+限流+metrics 埋点
3. 创建 `packages/shared/src/ai-sdk.ts` Node.js 侧 SDK，完整 TypeScript 类型定义
4. 创建 `docs/ai-sdk-guide.md` 快速上手指南

**二十七、MCP 评估与 PoC（审计 49）** 5. 编写 `docs/adr/004-mcp-evaluation.md`：列出可 MCP 化的能力、评估成本收益 6. MCP PoC：实现 Qdrant 检索的 MCP server (search_fashion_items tool)

**二十八、文档与正则（审计 10-78-79）** 7. 创建 `packages/shared/src/regex/` 统一管理所有正则 → 运行 `npx redos-detector` 8. 敏感词过滤增加 Unicode 同形字检测和零宽字符过滤 9. 创建 `docs/ai-capability-matrix.md`：所有 AI 模块 → 技术分类 → 可控度 → 失效模式 10. 创建 `docs/token-fundamentals.md` 和 `docs/llmops-playbook.md`
