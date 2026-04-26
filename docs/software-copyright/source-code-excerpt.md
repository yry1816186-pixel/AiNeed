# 源代码鉴别材料 — 前后各 30 页

> 软件名称：寻裳智能穿搭推荐系统 V1.0
> 每页约 50 行，前 30 页 + 后 30 页 = 60 页

---

## 前 30 页（核心业务逻辑）

### 第 1-8 页：推荐编排器 (recommendation.orchestrator.ts)

**文件路径**：`apps/backend/src/domains/platform/recommendations/orchestrator/recommendation.orchestrator.ts`

**功能说明**：6 层推荐漏斗的核心编排器，协调场景过滤、风格匹配、体型适配、色彩协调、价格区间、个性化排序六个阶段。

**代码行数**：约 400 行

---

### 第 9-14 页：AI 造型师智能推荐服务 (intelligent_style_recommender.py)

**文件路径**：`ml/services/stylist/intelligent_style_recommender.py`

**功能说明**：基于用户画像和场景需求的智能穿搭推荐引擎，集成 FashionSigLIP 向量检索和规则引擎。

**代码行数**：约 300 行

---

### 第 15-20 页：向量嵌入服务 (embeddings.py)

**文件路径**：`ml/services/rag/embeddings.py`

**功能说明**：FashionSigLIP/Marqo-FashionSigLIP 模型封装，负责服装图片和文本的向量嵌入生成，支持批量处理和缓存。

**代码行数**：约 300 行

---

### 第 21-25 页：对话引擎 (dialog_engine.py)

**文件路径**：`ml/services/stylist/dialog_engine.py`

**功能说明**：AI 造型师对话状态机引擎，实现 SCENE/DIRECT/CHAT 三态切换，结合规则引擎与大语言模型实现可控对话流程。

**代码行数**：约 250 行

---

### 第 26-30 页：风格理解服务 (style_understanding_service.py)

**文件路径**：`ml/services/stylist/style_understanding_service.py`

**功能说明**：用户风格偏好理解与建模服务，结合 FashionSigLIP 语义特征和用户行为数据进行风格画像构建。

**代码行数**：约 250 行

---

## 后 30 页（推荐算法与前端展示）

### 第 31-37 页：SASRec 序列推荐服务 (sasrec_service.py)

**文件路径**：`ml/services/recommender/sasrec_service.py`

**功能说明**：基于自注意力机制的序列推荐算法实现，捕捉用户行为序列中的时序模式，支持实时推理和模型热更新。

**代码行数**：约 350 行

---

### 第 38-43 页：混合检索器 (hybrid_retriever.py)

**文件路径**：`ml/services/rag/hybrid_retriever.py`

**功能说明**：融合向量检索与关键词检索的混合检索服务，支持 RRF(Reciprocal Rank Fusion)结果融合和多样性约束。

**代码行数**：约 300 行

---

### 第 44-48 页：时尚知识 RAG 服务 (fashion_knowledge_rag.py)

**文件路径**：`ml/services/recommender/fashion_knowledge_rag.py`

**功能说明**：基于 RAG 架构的时尚知识检索增强服务，将专业知识库融入推荐流程，提升推荐的专业性和可解释性。

**代码行数**：约 250 行

---

### 第 49-55 页：推荐漏斗可视化组件 (RecommendationFunnel.tsx)

**文件路径**：`apps/mobile/src/features/today/components/RecommendationFunnel.tsx`

**功能说明**：6 层推荐漏斗的可视化展示组件，展示每层筛选的通过率和结果数量，支持动画过渡和交互展开。

**代码行数**：约 350 行

---

### 第 56-60 页：隐私合规同意守卫 (consent.guard.ts)

**文件路径**：`apps/backend/src/domains/identity/privacy/consent.guard.ts`

**功能说明**：PIPL 合规同意守卫，在 API 请求处理前检查用户是否已授予所需的敏感信息同意类型，支持@RequireConsent 装饰器声明式标注。

**代码行数**：约 70 行

---

## 页码索引

| 页码范围 | 文件                             | 起始行 | 结束行 |
| -------- | -------------------------------- | ------ | ------ |
| 1-8      | recommendation.orchestrator.ts   | 1      | 400    |
| 9-14     | intelligent_style_recommender.py | 1      | 300    |
| 15-20    | embeddings.py                    | 1      | 300    |
| 21-25    | dialog_engine.py                 | 1      | 250    |
| 26-30    | style_understanding_service.py   | 1      | 250    |
| 31-37    | sasrec_service.py                | 1      | 350    |
| 38-43    | hybrid_retriever.py              | 1      | 300    |
| 44-48    | fashion_knowledge_rag.py         | 1      | 250    |
| 49-55    | RecommendationFunnel.tsx         | 1      | 350    |
| 56-60    | consent.guard.ts                 | 1      | 70     |

> **注意**：正式提交时需将上述源代码文件按页码顺序打印，每页约 50 行，确保连续无删减。源代码应包含完整的版权声明头和注释。
