# XUNO 技术深度与壁垒审计报告

> **审计日期**: 2026-04-23
> **审计人**: AI/ML 系统架构师（残酷视角）
> **审计对象**: 寻裳 XUNO 完整代码库
> **方法**: 逐文件阅读源代码，交叉对比文档声明与实际实现

---

## 0. 总评

**技术深度总分: 4.2 / 10**
**技术壁垒评级: D+（几乎无壁垒，竞品 CTO 可在 4-6 周内复制 90% 功能）**

| 维度                            | 得分 | 标签                            |
| ------------------------------- | ---- | ------------------------------- |
| 1. 推荐管道真实度               | 3/10 | :red_circle: 致命问题           |
| 2. FashionSigLIP vs FashionCLIP | 5/10 | :large_orange_diamond: 重要风险 |
| 3. 264 条 JSON 规则引擎         | 6/10 | :green_circle: 改进建议         |
| 4. 对话状态机复杂度             | 4/10 | :large_orange_diamond: 重要风险 |
| 5. 向量检索实际效果             | 2/10 | :red_circle: 致命问题           |
| 6. 偏好学习模型冷启动           | 3/10 | :red_circle: 致命问题           |
| 7. 穿搭协调度模型训练信号       | 2/10 | :red_circle: 致命问题           |
| 8. 技术壁垒真实强度             | 2/10 | :red_circle: 致命问题           |

---

## 1. 推荐管道真实度 -- 3/10

:reg_circle: **致命问题：推荐管道是半成品，Orchestrator 是"平坦加权求和"而非文档声称的"六层漏斗"。**

### 证据

**文件**: `apps/backend/src/domains/platform/recommendations/orchestrator/recommendation.orchestrator.ts`

Orchestrator 的 import 列表暴露了真实状态（第 9-22 行）：

```typescript
import { CollaborativeFilteringService } from "../services/collaborative-filtering.service";
import { KnowledgeGraphService } from "../services/knowledge-graph.service";
import { GNNCompatibilityService } from "../services/gnn-compatibility.service";
import { TransformerEncoderService } from "../services/transformer-encoder.service";
import { MultimodalFusionService } from "../services/multimodal-fusion.service";
import { LearningToRankService } from "../services/learning-to-rank.service";
```

**事实 1**：Orchestrator 仍然导入并使用 `CollaborativeFilteringService` 和 `KnowledgeGraphService`，而 XUNO_FUSION_PLAN.md 第 5.1 节明确说"砍掉了协同过滤和知识图谱"。代码里没砍。

**事实 2**：Orchestrator 的 `breakdown` 接口（第 60-67 行）暴露了实际评分结构：

```typescript
breakdown?: {
  contentBased: number;
  collaborative: number;
  knowledgeGraph: number;
  theoryBased: number;
  preferenceLearning?: number;
  sasrec?: number;
};
```

这是一个**平坦的六路加权求和**，不是文档描述的"L1 硬过滤 -> L2 硬过滤 -> ... -> L5 软评分"六层漏斗。没有 L1 合规过滤、没有 L2 场景过滤、没有 L3 尺码过滤。全部是并行评分后加权。

**事实 3**：`cold-start.service.ts` 第 35-64 行仍然使用 male/female 分桶：

```typescript
private readonly demographicRules = {
  male: { young: {...}, middle: {...}, senior: {...} },
  female: { young: {...}, middle: {...}, senior: {...} },
};
```

文档声称"性别字段降级为可选"，但 ColdStartService 完全没改。

**事实 4**：推荐管道的"完整闭环"从代码看不存在。`RecommendationResult` 接口（第 55-68 行）只有 score/sources/reasons/breakdown，缺少文档定义的 `RecommendationOutput` 的关键字段：`outfit: OutfitSuggestion`、`explanation.nextAction`、`explanation.confidence`。

### 判定

推荐管道是典型的"全量评分 + 加权求和"架构。没有漏斗、没有硬过滤、没有层次化淘汰。性能上，对全量商品库做 FashionCLIP + SASRec + 协同过滤 + 知识图谱评分，复杂度是 O(N) 而非 O(log N)。文档声称的"六层漏斗"是**设计文档而非实现**。

---

## 2. FashionCLIP 在 RTX 4060 上的推理延迟 -- 5/10

:large_orange_diamond: **重要风险：FashionCLIP 实际上还没接入。当前嵌入服务用的是 BAAI/bge-small-zh-v1.5 文本模型，不是视觉模型。**

### 证据

**文件**: `ml/services/rag/embeddings.py`（第 9-14 行）

```python
@dataclass
class EmbeddingConfig:
    model_name: str = "BAAI/bge-small-zh-v1.5"   # <-- 文本嵌入，不是 FashionCLIP
    dimension: int = 512
```

**文件**: `ml/services/rag/embeddings.py`（第 30-32 行）

```python
except ImportError:
    logger.warning("sentence_transformers not available, using random embeddings")
    self._model = "fallback"
```

当 `sentence_transformers` 不可用时，**返回随机向量**。

### 延迟预估（FashionCLIP fp32 ONNX, RTX 4060）

基于 CLIP ViT-B/32 在 RTX 4060（8GB VRAM）上的典型性能：

| 指标                 | 预估值                       |
| -------------------- | ---------------------------- |
| 模型加载到 VRAM      | ~1.5GB，单次加载             |
| 单图推理延迟         | 15-30ms（CUDA EP）           |
| 单文本推理延迟       | 5-10ms                       |
| 批量推理（batch=32） | 200-400ms                    |
| VRAM 常驻占用        | ~2GB（含 ONNX Runtime 开销） |

**关键问题**：FashionCLIP 的 ONNX 导出还没做。`STACK.md` 建议用 `optimum-cli export onnx`，但代码里没有任何导出脚本或 ONNX 模型文件。当前部署路径完全依赖 Python transformers 运行时。

### 判定

文档声称的"FashionCLIP ONNX fp32 推理"是规划而非现实。当前嵌入用的是中文通用文本模型 bge-small-zh-v1.5，不是时尚领域视觉-语言模型。而且有随机 fallback —— 这意味着在无 sentence_transformers 环境下，向量检索返回的是**完全随机的结果**。

---

## 3. 264 条 JSON 规则引擎 -- 6/10

:green_circle: **改进建议：规则质量不错，但与引擎存在严重脱节。**

### 证据

**文件**: `ml/data/fashion_rules/body_type_rules.json`

规则确实丰富且结构化。每条规则包含：

- `id`, `body_type`, `body_type_zh`, `occasion`, `occasion_zh`
- `strategy`, `recommended`（分 tops/bottoms/shoes）, `recommended_colors`
- `avoid_items`, `tips`, `formality`

```json
{
  "id": "bt_hourglass_interview",
  "body_type": "hourglass",
  "occasion": "interview",
  "strategy": "含蓄展现曲线优势，传达专业可靠形象",
  "recommended": { "tops": ["修身西装外套", "V领衬衫", "收腰针织衫"], ... },
  "recommended_colors": ["#2C3E50", "#1A1A2E", "#FFFFFF", ...],
  "avoid_items": ["宽松卫衣", "低腰裤", ...],
  "tips": "用腰带突出腰线...",
  "formality": 0.9
}
```

**但是** -- `full_outfit_engine.py` 有自己的**硬编码简化版**：

第 377-408 行，`_BODY_TYPE_RECOMMENDATIONS` 是内联的简化版本，只有 5 个体型各 3 个字段（name/best_fits/avoid_fits），没有 JSON 文件里的 `recommended_colors`、`avoid_items`、`tips`、`formality` 等丰富字段。

同样，`intelligent_stylist_service.py` 第 849-1001 行，`BODY_TYPE_GUIDE` 和 `COLOR_SEASON_GUIDE` 是另一套独立的硬编码简化版本。

### 规则覆盖度分析

| 规则文件                    | 规则数 | 被 full_outfit_engine.py 引用？ | 被 intelligent_stylist_service.py 引用？ |
| --------------------------- | ------ | ------------------------------- | ---------------------------------------- |
| body_type_rules.json        | 30+    | **否**（硬编码替代）            | **否**（硬编码替代）                     |
| color_season_rules.json     | 24+    | **否**                          | **否**                                   |
| chinese_occasion_rules.json | 20+    | **否**                          | **否**                                   |
| fabric_rules.json           | 20+    | **否**                          | **否**                                   |
| item_compatibility.json     | 40+    | **否**                          | **否**                                   |
| weather_outfit_rules.json   | 30+    | **否**                          | **否**                                   |
| trend_rules.json            | 4      | **否**                          | **否**                                   |

**264 条 JSON 规则存在于磁盘上，但没有任何 Python 引擎代码实际加载并使用它们。** 所有引擎都使用自己的内联硬编码简化版。

### 判定

规则本身质量可以，覆盖了 5 个体型 x 7+ 场合 x 色彩季型 x 天气 x 面料 x 单品兼容度的组合空间。但"264 条规则"这个数字在技术上是**虚假的**，因为它们存在于 `.json` 文件里但从未被任何运行时代码加载。实际使用的是约 20 条硬编码简化规则。

---

## 4. 对话状态机复杂度 -- 4/10

:large_orange_diamond: **重要风险：当前状态机是线性管道，不支持 refinement loop。每轮对话至少 1 次 LLM 调用，搭配生成额外 1 次。**

### 证据

**文件**: `ml/services/stylist/intelligent_stylist_service.py`

**LLM 调用链分析**：

一次完整的"用户打开 Stylist -> 得到穿搭方案"流程：

| 步骤                 | LLM 调用                                     | 模型  | 预估 tokens               | 成本（GLM-4-Flash 免费） |
| -------------------- | -------------------------------------------- | ----- | ------------------------- | ------------------------ |
| GREET - 问候         | 1 次                                         | glm-5 | ~1500 input + 200 output  | 0 元                     |
| CONTEXT - 提取 slots | 1 次                                         | glm-5 | ~800 input + 300 output   | 0 元                     |
| GENERATE - 生成搭配  | 1 次（FashionCLIP + 规则 + SASRec 本地计算） | glm-5 | ~3000 input + 2000 output | 0 元                     |
| ACTION - 解释理由    | 1 次                                         | glm-5 | ~1500 input + 300 output  | 0 元                     |
| WRAP - 总结          | 0 次                                         | 模板  | N/A                       | 0 元                     |

**单次完整对话：4 次 LLM 调用，约 9600 tokens**。

如果用户做 refinement（"换个上衣"），当前代码**不支持**。`intelligent_stylist_service.py` 的 `chat_interaction` 方法（第 1479-1514 行）是无状态的：

```python
async def chat_interaction(
    self,
    user_message: str,
    conversation_history: List[Dict[str, str]],
    user_profile: Optional[UserProfile] = None
) -> str:
```

它直接把整个对话历史传给 LLM，没有 slot 提取、没有状态机推进、没有结构化输出。这意味着：

1. **对话质量完全依赖 LLM 的自由发挥**，没有任何规则约束
2. **没有 structured output** -- LLM 返回的是纯文本，不是 JSON
3. **ConversationMemory** 存在（第 594-719 行），但只是简单的 append + trim to 20 条消息

### 成本估算（GLM-4-Flash 免费）

由于 GLM-4-Flash 目前免费，成本问题暂时不存在。但：

- 如果切换到收费模型（GLM-4-Plus 约 0.1 元/百万 token 输入）
- 1000 DAU x 每天 2 次对话 x 9600 tokens = 19.2M tokens/天
- 月成本 = 19.2M x 30 x 0.05 元/M = **28.8 元/月**（可接受）

### 判定

状态机实际上不存在。当前是"自由对话 + 记忆窗口"，不是 AI_STYLIST_DESIGN.md 设计的 GREET -> CONTEXT -> GENERATE -> ACTION -> WRAP 状态机。文档声称的"slot 提取"、"deriveOrchestration"、"结构化 JSON 输出"在 Python 侧完全没有实现。只有 NestJS 侧的 `context.service.ts` 有状态机雏形。

---

## 5. 向量检索实际效果 -- 2/10

:red_circle: **致命问题：Qdrant 在 Mock 数据下是内存 fallback 的随机向量搜索。**

### 证据

**文件**: `ml/services/rag/qdrant_client.py`（第 25-70 行）

```python
class QdrantVectorStore:
    def __init__(self, config=None):
        self._client = None
        self._documents: Dict[str, VectorDocument] = {}  # <-- 内存字典
```

第 38-40 行：

```python
except ImportError:
    logger.warning("qdrant_client not available, using in-memory fallback")
    self._client = "fallback"
```

第 56-63 行（内存 fallback 搜索）：

```python
if self._client == "fallback":
    import numpy as np
    query_vec = np.array(query_embedding)
    results = []
    for doc in self._documents.values():
        doc_vec = np.array(doc.embedding)
        score = float(np.dot(query_vec, doc_vec) / (np.linalg.norm(query_vec) * np.linalg.norm(doc_vec) + 1e-8))
        results.append({"doc_id": doc.doc_id, "score": score, ...})
    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_k]
```

**文件**: `ml/services/rag/embeddings.py`（第 36-38 行）

```python
if self._model == "fallback":
    import numpy as np
    return [np.random.randn(self.config.dimension).tolist() for _ in texts]
```

### 致命链条

1. 如果 `sentence_transformers` 未安装 -> 嵌入是**随机向量**
2. 如果 `qdrant_client` 未安装 -> 搜索是**内存 cosine similarity**
3. 随机向量 + 内存搜索 = **随机结果**

即使两者都安装了，当前代码也**从未向 Qdrant 写入任何 FashionCLIP 嵌入**。没有商品数据同步脚本、没有预计算管线、没有 embedding upsert 调用。`QdrantVectorStore` 的 `upsert` 方法存在但从未被业务代码调用。

**NestJS 侧** (`apps/backend/src/domains/platform/recommendations/services/qdrant.service.ts`) 同样有问题：

```typescript
private memoryStore: Map<string, { vector: number[]; payload: Record<string, unknown> }> = new Map();
```

第 43-46 行：当 Qdrant 连接失败时，fallback 到 `Map` 内存存储。而且 NestJS 侧的 `VectorSimilarityService` 使用的是 `QdrantService`，搜索逻辑依赖事先写入的向量数据 -- 但**没有任何数据写入管道**。

### 判定

向量检索在当前代码中是**完全不可用的**。无论 Qdrant 是否安装，都不会有任何有意义的向量数据可供检索。FashionCLIP 嵌入生成管线不存在。`HybridRetriever`（BM25 + Qdrant RRF fusion）代码写得不错，但上游没有数据流入。

---

## 6. 偏好学习模型冷启动 -- 3/10

:red_circle: **致命问题：SASRec 模型存在且代码质量高，但"5M params 偏好学习模型"不存在。冷启动依赖硬编码的 male/female 分桶。**

### 证据

**文件**: `ml/services/recommender/sasrec_service.py`

SASRec 实现确实完整：

| 组件                 | 存在 | 行号      |
| -------------------- | ---- | --------- |
| Multi-head attention | 是   | 398-436   |
| Layer normalization  | 是   | 379-389   |
| Residual connections | 是   | 458-480   |
| Feed-forward network | 是   | 442-451   |
| BPR loss             | 是   | 1024-1026 |
| NumPy 完整反向传播   | 是   | 638-817   |
| PyTorch 后端         | 是   | 1231-1343 |
| 线程安全训练锁       | 是   | 555-557   |
| 属性冷启动嵌入       | 是   | 261-350   |
| 模型 save/load       | 是   | 177-259   |

**但关键问题**：

1. **参数量**: 默认配置是 `hidden_size=64, num_blocks=2, num_heads=4`。这远不是"5M params"。粗算：

   - Item embedding: 100K items x 64 dim = 6.4M (但这不是模型参数，是嵌入表)
   - Transformer: (64x64x4 x 2 块) + (64x256x2 x 2 块) = ~90K
   - 总模型参数: ~90K，不是 5M

2. **训练数据**: 第 1215-1224 行暴露了真相：

```python
def _generate_mock_sequences() -> List[List[str]]:
    items = [f"item_{i}" for i in range(1, 51)]  # 50个假商品
    rng = np.random.default_rng(42)
    sequences = []
    for _ in range(100):  # 100条假序列
        seq_len = rng.integers(3, 10)
        seq = rng.choice(items, size=seq_len, replace=False).tolist()
        sequences.append(seq)
    return sequences
```

训练数据是**50 个假商品的 100 条随机序列**。这什么也学不到。

3. **冷启动**: `ColdStartService` 的 `getDemographicRecommendations`（cold-start.service.ts 第 79 行起）使用 male/female 分桶 + 硬编码 styleItemMapping，没有使用 FashionCLIP 种子、没有 SASRec 信号、没有规则引擎注入。

### 判定

SASRec 的代码工程质量高 -- 完整的 transformer 实现，NumPy 和 PyTorch 双后端，线程安全。但它是"没有子弹的枪"：没有训练数据、没有商品嵌入、没有行为序列管道。冷启动策略仍然是 2024 年初的 male/female 硬编码分桶。

---

## 7. 穿搭协调度模型训练信号 -- 2/10

:red_circle: **致命问题：不存在独立的"穿搭协调度模型"。协调度评估是手工规则，不是学习出来的。**

### 证据

**文件**: `ml/services/stylist/full_outfit_engine.py`

穿搭评估的 5 个维度全部是**手工编码的规则评分**：

| 维度     | 方法                         | 行号      | 实现                                  |
| -------- | ---------------------------- | --------- | ------------------------------------- |
| 色彩协调 | `_check_color_harmony`       | 1032-1131 | 色环距离 + 60-30-10 法则 + 中性色规则 |
| 风格一致 | `_check_style_consistency`   | 1294-1368 | 风格兼容矩阵查询（14x14 硬编码）      |
| 体型适配 | `_check_body_fit`            | 1599-1655 | 关键词匹配 best_fits/avoid_fits       |
| 天气适配 | `_check_weather_suitability` | 1421-1523 | 温度区间 -> 层数 + 保暖度规则         |
| 预算检查 | `_check_budget`              | 1548-1593 | 价格比较 + 比率评分                   |

**没有任何机器学习成分。** 全部是 if/else + lookup table + 启发式评分。

"10M params 穿搭协调度模型"在代码库中**完全不存在**。不存在训练脚本、不存在模型定义、不存在训练数据构造逻辑。

### 正负样本问题

如果要训练一个穿搭协调度模型，需要：

- **正样本**：被用户采纳的搭配方案、时尚编辑的标注、社交媒体高赞穿搭
- **负样本**：被用户拒绝的搭配、风格冲突的组合、色彩不协调的搭配

当前代码中：

- 没有用户反馈收集机制
- 没有搭配方案的 accept/reject 记录
- 没有 `RecommendationImpression` 表的实际写入代码
- 没有 A/B 测试框架
- 没有 annotation 工具或标注流程

### 判定

穿搭协调度评估是纯规则的。对于 MVP 来说这其实不是致命问题 -- Stitch Fix、Amazon Fashion 的早期版本也是规则驱动的。但文档不应该暗示存在"10M params 模型"。

---

## 8. 技术壁垒真实强度 -- 2/10

:red_circle: **致命问题：如果我是竞品 CTO，复制 XUNO 90% 的功能需要 4-6 周。**

### 复制成本估算

| 组件                    | 复制工时                  | 理由                                  |
| ----------------------- | ------------------------- | ------------------------------------- |
| 4 Tab React Native 导航 | 2 天                      | 标准模板                              |
| Onboarding 4 步流程     | 2 天                      | 表单 + 图片选择                       |
| FashionCLIP 集成        | 3 天                      | pip install + 调用 API                |
| Qdrant 向量检索         | 2 天                      | Docker 启动 + SDK 调用                |
| SASRec 序列推荐         | 5 天                      | 开源实现，不需要自己写 NumPy 反向传播 |
| 规则引擎 (264 条 JSON)  | 3 天                      | JSON 加载 + 过滤注入 LLM context      |
| GLM 对话式造型师        | 3 天                      | Prompt engineering + 流式 API         |
| 虚拟试穿                | 1 天                      | 调用豆包 API，不需要自建              |
| NestJS 后端骨架         | 3 天                      | 标准 CRUD + 推荐编排                  |
| **总计**                | **~24 工作日（约 5 周）** | 1 个全栈工程师可完成                  |

### 真正的壁垒在哪里

| 声称的壁垒               | 实际壁垒 | 说明                                       |
| ------------------------ | -------- | ------------------------------------------ |
| FashionCLIP              | **零**   | 开源模型，pip install 即用                 |
| SASRec                   | **零**   | 2018 论文，GitHub 上 50+ 实现              |
| 264 条规则               | **极低** | 手工编写，无法防御复制                     |
| "六层漏斗"架构           | **零**   | 不存在（见维度 1）                         |
| 无性别设计               | **极低** | 产品定位，不是技术壁垒                     |
| **用户行为数据**         | **中**   | 唯一可能建立壁垒的方向，但需要大量用户     |
| **微调后的 FashionCLIP** | **中**   | 如果在中国时尚数据上 fine-tune，有一定壁垒 |
| **搭配协调度模型**       | **中**   | 如果真的训练出来，有一定壁垒               |

### 提升壁垒的具体路径

1. **ChineseFashionCLIP fine-tune** (2-3 周): 在淘宝/小红书中国时尚图片上微调 FashionCLIP，解决 Farfetch 西方数据偏见。这需要一个标注团队 + 10K+ 高质量 (image, text) 对。

2. **Outfit Coordination Model** (4-6 周): 基于 Polyvore/Delight 数据集训练搭配协调度二分类器。正样本=实际搭配，负样本=随机组合。模型不大但数据标注成本高。

3. **用户行为飞轮** (持续): 一旦有了 1000+ 用户的行为数据，SASRec 才能产出有意义的推荐。这是时间壁垒，竞品无法跳过。

---

## 附录 A: 代码质量亮点

虽然壁垒不足，但以下代码展示了工程能力：

:large_blue_diamond: **SASRec 双后端实现** (`sasrec_service.py`): 完整的 NumPy 反向传播 + PyTorch 自动微分，支持热切换。手动实现了 multi-head attention、layer norm、FFN 的反向传播（第 638-817 行），这是扎实的 ML 工程功底。

:large_blue_diamond: **FullOutfitEngine** (`full_outfit_engine.py`): 2000 行精心设计的搭配生成引擎，色彩理论（色环距离、60-30-10 法则、7 种配色类型）、风格兼容矩阵（14x14）、体型适配规则、天气分层。虽然不是 ML，但领域知识建模很扎实。

:large_blue_diamond: **12 季色彩分析系统** (`color_season_analyzer.py`): 基于 CIELAB 色彩空间的科学化肤色分析，不是随便分的"春夏秋冬"。

:large_blue_diamond: **GLMStylistEngine 的熔断和降级** (`intelligent_stylist_service.py`): CircuitBreaker + 指数退避重试 + fallback 缓存 + prompt 截断。生产级可靠性设计。

---

## 附录 B: 术语校正表

| 文档声称                    | 实际情况                               | 证据位置                                  |
| --------------------------- | -------------------------------------- | ----------------------------------------- |
| "六层漏斗管道"              | 平坦六路加权求和                       | orchestrator 第 60-67 行 breakdown 结构   |
| "砍掉协同过滤和知识图谱"    | 仍然在 import 和使用                   | orchestrator 第 11-14 行                  |
| "264 条规则驱动推荐"        | 0 条被引擎加载                         | full_outfit_engine.py 使用硬编码内联规则  |
| "FashionCLIP ONNX fp32"     | 使用 bge-small-zh-v1.5 文本模型        | embeddings.py 第 10 行                    |
| "性别字段降级为可选"        | ColdStartService 仍用 male/female 分桶 | cold-start.service.ts 第 35-64 行         |
| "5M params 偏好学习模型"    | SASRec 参数量约 90K                    | sasrec_service.py 默认配置 hidden_size=64 |
| "10M params 穿搭协调度模型" | 不存在                                 | full_outfit_engine.py 全部手工规则        |
| "Qdrant 向量检索"           | 无数据的内存 fallback                  | qdrant_client.py 第 56-63 行              |
| "GLM-4-Flash 免费"          | 目前免费，但非永久                     | 外部因素，无法从代码验证                  |

---

## 附录 C: 文件证据索引

| 文件                                          | 行号      | 审计维度 | 问题                               |
| --------------------------------------------- | --------- | -------- | ---------------------------------- |
| `orchestrator/recommendation.orchestrator.ts` | 9-22      | 1        | 导入已声明砍掉的模块               |
| `orchestrator/recommendation.orchestrator.ts` | 60-67     | 1        | breakdown 是平坦加权               |
| `services/cold-start.service.ts`              | 35-64     | 1, 6     | male/female 硬编码分桶             |
| `services/qdrant.service.ts`                  | 43-46     | 5        | 内存 Map fallback                  |
| `rag/qdrant_client.py`                        | 25-70     | 5        | 内存 fallback + 随机嵌入           |
| `rag/embeddings.py`                           | 9-14      | 2        | 使用 bge-small-zh 不是 FashionCLIP |
| `rag/embeddings.py`                           | 36-38     | 5        | 随机向量 fallback                  |
| `stylist/full_outfit_engine.py`               | 377-408   | 3        | 硬编码体型规则替代 JSON            |
| `stylist/intelligent_stylist_service.py`      | 849-1001  | 3, 4     | 硬编码简化版知识库                 |
| `stylist/intelligent_stylist_service.py`      | 1479-1514 | 4        | 无状态对话，无 slot 提取           |
| `recommender/sasrec_service.py`               | 1215-1224 | 6        | Mock 训练数据（50 假商品）         |
| `recommender/sasrec_service.py`               | 48-56     | 6        | hidden_size=64, ~90K params        |
| `stylist/full_outfit_engine.py`               | 1032-1731 | 7        | 全部手工规则评分                   |
| `rag/hybrid_retriever.py`                     | 25-52     | 5        | RRF fusion 代码正确但无上游数据    |

---

**最终判定**: XUNO 的技术文档写得非常专业，但代码实现与文档之间存在系统性差距。核心 AI 能力（向量检索、偏好学习、搭配协调度评估）要么是空壳、要么是 fallback 随机值、要么是手工规则。项目目前的价值在于**架构设计和规则建模**的深度，而非 ML 模型的实际运行效果。

**要走向真正的技术壁垒，需要：(1) FashionCLIP 在中国数据上 fine-tune (2) 真实的用户行为数据管道 (3) 穿搭协调度的学习化。** 这三条路径中，(2) 是时间壁垒无法跳过，(1) 和 (3) 是工程投入可以解决的。
