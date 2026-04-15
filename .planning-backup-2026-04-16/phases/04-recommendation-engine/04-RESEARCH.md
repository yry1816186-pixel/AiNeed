# Phase 4: 推荐引擎 - Research

**Researched:** 2026-04-14
**Mode:** ecosystem
**Status:** Complete

---

## Executive Summary

Phase 4 需要在现有推荐引擎骨架上实现完整的生产级推荐系统。代码库已有 6 策略融合的统一引擎、ALS 矩阵分解、内存知识图谱、伪 SASRec、Qdrant 客户端（含内存降级）等实现，但均存在严重性能和准确性问题。核心差距：无 Neo4j 图数据库、无真实 SASRec Transformer、无 CIEDE2000 色彩计算、无 Masonry 瀑布流 UI、行为追踪系统重复且无衰减机制。

---

## Standard Stack

### 后端算法层

| 组件 | 标准方案 | 项目现状 | 差距 |
|------|---------|---------|------|
| 协同过滤 | PostgreSQL 物化视图 + pgvector 扩展 | 内存 Map 全量加载 UserBehavior | 需改为 PG 物化视图，避免 OOM |
| 知识图谱 | Neo4j Community Edition + Cypher 查询 | 内存 Map + DFS 遍历（限 1000 items） | 需引入 Neo4j，支持图推理 |
| 向量检索 | Qdrant（已有客户端） | QdrantService 已实现，含内存降级 | 需部署 Qdrant 实例 + 构建向量索引 |
| 序列推荐 | SASRec Python 微服务（PyTorch） | 伪 SASRec（硬编码嵌入 + 余弦相似度） | 需实现真实 Transformer 模型 |
| 学习排序 | LambdaMART / XGBoost Ranker | 简单线性加权 + 梯度下降 | MVP 可保留线性加权，后续升级 |
| 色彩评分 | CIEDE2000 (Delta E 2000) | RGB→LAB 转换 + HSL 色距 | 需实现 CIEDE2000 公式 |
| 行为追踪 | Redis Stream + 时间衰减 | 双写 PG（UserBehavior + UserBehaviorEvent） | 需统一 + 添加衰减 |

### 基础设施

| 组件 | 标准方案 | 项目现状 |
|------|---------|---------|
| Neo4j | Docker Community Edition 5.x | 未部署 |
| Qdrant | Docker v1.8+ | 未部署（代码已就绪） |
| SASRec 微服务 | FastAPI + PyTorch | 未实现 |

### 前端 UI 层

| 组件 | 标准方案 | 项目现状 |
|------|---------|---------|
| 瀑布流 | `@shopify/flash-list` MasonryLayout | FlashList 已用，但无 Masonry 模式 |
| Tab 切换 | 顶部固定 Tab + 指示器 | 未实现 |
| 色彩评分展示 | 色块 + 圆环进度条 | 未实现 |
| 滑动反馈 | react-native-gesture-handler | 未实现 |

---

## Architecture Patterns

### 1. 推荐引擎分层架构

```
┌─────────────────────────────────────────┐
│           API Layer (Controller)         │
│  /recommendations, /daily, /occasion...  │
├─────────────────────────────────────────┤
│        Orchestration Layer               │
│  UnifiedRecommendationEngine             │
│  - Adaptive weight selection             │
│  - Strategy fusion                       │
│  - Diversity reranking                   │
├─────────────────────────────────────────┤
│        Strategy Layer                    │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌────────┐ │
│  │Rule  │ │ CF   │ │ KG   │ │SASRec  │ │
│  │Engine│ │(PG)  │ │(Neo4j)│ │(PySvc) │ │
│  └──────┘ └──────┘ └──────┘ └────────┘ │
│  ┌──────┐ ┌──────┐ ┌──────┐            │
│  │Color │ │ LTR  │ │Vector│            │
│  │Match │ │Rank  │ │(Qdrant)│          │
│  └──────┘ └──────┘ └──────┘            │
├─────────────────────────────────────────┤
│        Data Layer                        │
│  PG + Redis + Neo4j + Qdrant + MinIO    │
└─────────────────────────────────────────┘
```

**关键模式**：策略模式 + 自适应权重融合。`UnifiedRecommendationEngine` 已实现此模式，需在此基础上增强各策略实现。

### 2. 渐进式算法演进模式

```typescript
interface DataMaturitySignals {
  totalUsers: number;
  totalInteractions: number;
  userInteractions: number;
  sequenceLength: number;
}

function selectWeights(signals: DataMaturitySignals): StrategyWeights {
  if (signals.userInteractions < 5) return coldStartWeights;
  if (signals.totalInteractions < 10000) return earlyStageWeights;
  if (signals.sequenceLength < 3) return noSasrecWeights;
  return fullWeights;
}
```

**已有实现**：`UnifiedRecommendationEngine.getAdaptiveWeights()` 已实现基于交互数的权重调整。需扩展为基于多维度数据成熟度信号的自动权重选择。

### 3. 冷启动三阶段模式

```
Stage 1: 注册时 → 人口统计规则（性别/年龄段 → 风格映射）
Stage 2: 画像完成 → 内容匹配（体型/肤色/色彩季型 → 规则评分）
Stage 3: 行为积累 → 协同过滤 + 序列推荐（5+ 交互后激活）
```

**已有实现**：`ColdStartService` 已实现 Stage 1-2，`UnifiedRecommendationEngine` 的自适应权重处理 Stage 3。

### 4. 前端推荐信息流架构

```
HomeScreen
├── TopBar (天气 + 搜索)
├── TabBar (每日 | 场合 | 趋势 | 探索)
│   └── 场合子标签 (横向滚动)
├── MasonryList (双列瀑布流)
│   ├── RecommendationCard
│   │   ├── 图片 (全宽)
│   │   ├── 渐变层
│   │   │   ├── 品牌 + 价格
│   │   │   └── 风格标签 + 色彩评分
│   │   └── 推荐理由摘要
│   └── ...
└── LoadMore (无限滚动)
```

### 5. 行为反馈闭环模式

```
用户操作 → BehaviorTrackingService.track()
  ├── 写入 PG (UserBehavior) — 持久化
  ├── 更新 Redis (偏好缓存) — 实时
  └── 触发推荐缓存失效 — 下次刷新生效
```

**已有实现**：`BehaviorTrackingService` 已实现 PG 双写 + Redis 缓存更新。需添加时间衰减和统一事件模型。

---

## Don't Hand-Roll

### 必须使用专业工具的领域

1. **向量检索** — 使用 Qdrant，不要自己实现暴力余弦搜索
   - `QdrantService` 已有完整实现，只需部署 Qdrant 实例
   - 内存降级模式已就绪，开发环境无需 Qdrant 也可运行

2. **图数据库** — 使用 Neo4j，不要用内存 Map 模拟
   - 知识图谱需要 Cypher 查询语言的路径查询能力
   - 内存 Map 在 1000+ 节点时 DFS 性能极差

3. **序列推荐模型** — 使用 PyTorch 实现 SASRec，不要用硬编码嵌入
   - 现有 `SASRecService` 的 `CATEGORY_EMBEDDINGS` 和 `STYLE_EMBEDDINGS` 是手工编写的
   - 真实 SASRec 需要自注意力机制训练

4. **色彩距离计算** — 使用 CIEDE2000 公式，不要用 RGB 欧氏距离
   - `ColorMatchingService` 已有 RGB→LAB 转换，但色距计算用的是 HSL 色相角差
   - CIEDE2000 是感知均匀的色彩差异标准，专利创新点要求

5. **瀑布流布局** — 使用 `@shopify/flash-list` 的 MasonryLayout，不要自己计算列高
   - 项目已依赖 FlashList，只需配置 Masonry 模式

6. **手势交互** — 使用 `react-native-gesture-handler`，不要用 PanResponder
   - 项目已依赖此库，左右滑动反馈需用它实现

---

## Common Pitfalls

### 后端

1. **协同过滤全量内存加载** — 现有 `CollaborativeFilteringService.buildInteractionMatrix()` 加载所有 UserBehavior 到内存，用户量 >10K 时会 OOM
   - **解决**：改用 PostgreSQL 物化视图预计算用户相似度，定时刷新

2. **知识图谱 DFS 无剪枝** — `KnowledgeGraphService.dfs()` 在稠密图上会指数级爆炸
   - **解决**：Neo4j 的 Cypher 查询自带查询优化和路径限制

3. **SASRec 嵌入维度不匹配** — 现有 `hiddenSize: 64` 但 `CATEGORY_EMBEDDINGS` 只有 8 维，拼接后维度不一致
   - **解决**：真实 SASRec 使用统一的嵌入层，维度由模型配置决定

4. **推荐缓存失效不精确** — 行为追踪后只删除用户级缓存键，不删除相关推荐缓存
   - **解决**：使用 Redis 键空间通知或精确的缓存标签系统

5. **矩阵分解训练阻塞主线程** — `trainMatrixFactorizationModel()` 在 NestJS 主线程执行，20 次迭代 + 全量数据会阻塞请求
   - **解决**：使用 BullMQ 队列异步训练

6. **Qdrant 向量维度** — 现有 `vectorDimension: 512`，但 SASRec 输出维度是 64，需要统一
   - **解决**：使用 GLM embedding API 生成 512 维向量，或调整 Qdrant 集合维度

### 前端

7. **Masonry 列高不平衡** — 双列瀑布流如果不做高度预计算，会出现一列明显长于另一列
   - **解决**：FlashList MasonryLayout 自动平衡，或使用预估高度算法

8. **手势冲突** — 左右滑动反馈与页面水平滚动/Tab 切换冲突
   - **解决**：使用 `react-native-gesture-handler` 的 `SimultaneousGestures` 和 `waitFor` 配置

9. **无限滚动重复请求** — 快速滚动时触发多次 loadMore
   - **解决**：TanStack Query 的 `getNextPageParam` + `isFetchingNextPage` 防重

10. **色彩评分圆环性能** — 每个卡片都有动画圆环，大量卡片时掉帧
    - **解决**：使用 `react-native-reanimated` 的 `useAnimatedStyle` + `runOnUI`

---

## Code Examples

### 1. PostgreSQL 物化视图协同过滤

```sql
-- 用户交互矩阵物化视图
CREATE MATERIALIZED VIEW mv_user_item_matrix AS
SELECT
  ub.userId,
  ub.itemId,
  SUM(CASE ub.type
    WHEN 'view' THEN 1
    WHEN 'like' THEN 2
    WHEN 'favorite' THEN 3
    WHEN 'purchase' THEN 5
    ELSE 1
  END) AS implicit_rating
FROM UserBehavior ub
WHERE ub.itemId IS NOT NULL
GROUP BY ub.userId, ub.itemId;

-- 用户相似度物化视图（余弦相似度 Top-K）
CREATE MATERIALIZED VIEW mv_user_similarity AS
WITH user_vectors AS (
  SELECT
    userId,
    ARRAY_AGG(implicit_rating ORDER BY itemId) AS rating_vector
  FROM mv_user_item_matrix
  GROUP BY userId
)
SELECT
  u1.userId AS user_id,
  u2.userId AS similar_user_id,
  -- pgvector cosine similarity
  (u1.rating_vector <=> u2.rating_vector) AS similarity
FROM user_vectors u1
JOIN user_vectors u2 ON u1.userId < u2.userId
ORDER BY u1.userId, similarity DESC;

-- 定时刷新（每小时）
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_item_matrix;
```

### 2. Neo4j 时尚知识图谱 Schema

```cypher
// 节点类型
CREATE CONSTRAINT FOR (c:Category) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT FOR (s:Style) REQUIRE s.id IS UNIQUE;
CREATE CONSTRAINT FOR (o:Occasion) REQUIRE o.id IS UNIQUE;
CREATE CONSTRAINT FOR (i:ClothingItem) REQUIRE i.id IS UNIQUE;
CREATE CONSTRAINT FOR (b:Brand) REQUIRE b.id IS UNIQUE;
CREATE CONSTRAINT FOR (cs:ColorSeason) REQUIRE cs.name IS UNIQUE;

// 关系类型
// (:ClothingItem)-[:BELONGS_TO]->(:Category)
// (:ClothingItem)-[:HAS_STYLE]->(:Style)
// (:ClothingItem)-[:SUITABLE_FOR]->(:Occasion)
// (:ClothingItem)-[:MADE_BY]->(:Brand)
// (:ClothingItem)-[:COMPATIBLE_COLOR]->(:ColorSeason)
// (:Style)-[:COMPATIBLE_WITH]->(:Style)
// (:Occasion)-[:REQUIRES_STYLE]->(:Style)

// 图推理查询：为用户推荐场合穿搭
MATCH (user:User {id: $userId})-[:PREFERS]->(s:Style)
MATCH (occ:Occasion {name: $occasion})-[:REQUIRES_STYLE]->(reqStyle:Style)
MATCH (reqStyle)-[:COMPATIBLE_WITH*1..2]-(compStyle:Style)
MATCH (item:ClothingItem)-[:HAS_STYLE]->(compStyle)
MATCH (item)-[:SUITABLE_FOR]->(occ)
WHERE NOT EXISTS((user)-[:VIEWED|DISLIKED]->(item))
RETURN item.id, item.name, score(item) AS relevance
ORDER BY relevance DESC
LIMIT 20
```

### 3. SASRec Python 微服务 API

```python
# ml/services/sasrec_service/main.py
from fastapi import FastAPI
from pydantic import BaseModel
import torch
from sasrec.model import SASRec

app = FastAPI()
model = SASRec(item_num=50000, hidden_units=64, max_len=50, num_heads=2, num_blocks=2)
model.load_state_dict(torch.load("checkpoints/sasrec.pt"))
model.eval()

class RecommendRequest(BaseModel):
    user_id: str
    item_sequence: list[int]
    top_k: int = 10
    include_scores: bool = False

class RecommendResponse(BaseModel):
    success: bool
    recommendations: list[int]
    scores: list[float] | None = None
    processing_time: float

@app.post("/api/recommend")
async def recommend(req: RecommendRequest) -> RecommendResponse:
    with torch.no_grad():
        seq = torch.tensor([req.item_sequence]).long()
        scores = model.predict(seq)  # [1, item_num]
        top_k_scores, top_k_indices = scores.topk(req.top_k)
    return RecommendResponse(
        success=True,
        recommendations=top_k_indices[0].tolist(),
        scores=top_k_scores[0].tolist() if req.include_scores else None,
        processing_time=0.0,
    )

@app.get("/health")
async def health():
    return {"status": "ok"}
```

### 4. CIEDE2000 色彩距离实现

```typescript
function ciede2000(lab1: LAB, lab2: LAB): number {
  const L1 = lab1.L, a1 = lab1.a, b1 = lab1.b;
  const L2 = lab2.L, a2 = lab2.a, b2 = lab2.b;

  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cab = (C1 + C2) / 2;

  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cab, 7) / (Math.pow(Cab, 7) + Math.pow(25, 7))));
  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);

  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);

  const h1p = Math.atan2(b1, a1p) * 180 / Math.PI + (Math.atan2(b1, a1p) < 0 ? 360 : 0);
  const h2p = Math.atan2(b2, a2p) * 180 / Math.PI + (Math.atan2(b2, a2p) < 0 ? 360 : 0);

  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp: number;
  if (C1p * C2p === 0) {
    dhp = 0;
  } else if (Math.abs(h2p - h1p) <= 180) {
    dhp = h2p - h1p;
  } else if (h2p - h1p > 180) {
    dhp = h2p - h1p - 360;
  } else {
    dhp = h2p - h1p + 360;
  }

  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(dhp * Math.PI / 360);

  const Lbp = (L1 + L2) / 2;
  const Cbp = (C1p + C2p) / 2;

  let hbp: number;
  if (C1p * C2p === 0) {
    hbp = h1p + h2p;
  } else if (Math.abs(h1p - h2p) <= 180) {
    hbp = (h1p + h2p) / 2;
  } else if (h1p + h2p < 360) {
    hbp = (h1p + h2p + 360) / 2;
  } else {
    hbp = (h1p + h2p - 360) / 2;
  }

  const T = 1
    - 0.17 * Math.cos((hbp - 30) * Math.PI / 180)
    + 0.24 * Math.cos(2 * hbp * Math.PI / 180)
    + 0.32 * Math.cos((3 * hbp + 6) * Math.PI / 180)
    - 0.20 * Math.cos((4 * hbp - 63) * Math.PI / 180);

  const SL = 1 + 0.015 * Math.pow(Lbp - 50, 2) / Math.sqrt(20 + Math.pow(Lbp - 50, 2));
  const SC = 1 + 0.045 * Cbp;
  const SH = 1 + 0.015 * Cbp * T;

  const RT = -Math.sin(2 * (30 * Math.PI / 180))
    * 2 * Math.sqrt(Math.pow(Cbp, 7) / (Math.pow(Cbp, 7) + Math.pow(25, 7)));

  const dE = Math.sqrt(
    Math.pow(dLp / SL, 2)
    + Math.pow(dCp / SC, 2)
    + Math.pow(dHp / SH, 2)
    + RT * (dCp / SC) * (dHp / SH)
  );

  return dE;
}
```

### 5. React Native Masonry 瀑布流

```typescript
import { MasonryFlashList } from '@shopify/flash-list';

const RecommendationFeed: React.FC<{ items: RecommendationItem[] }> = ({ items }) => {
  const renderItem = ({ item }: { item: RecommendationItem }) => (
    <RecommendationCard
      image={item.mainImage}
      brand={item.brand?.name}
      price={Number(item.price)}
      styleTags={item.attributes?.style?.slice(0, 2) || []}
      colorScore={item.colorHarmonyScore}
      reason={item.matchReasons[0]}
      onSwipeLeft={() => handleDislike(item.id)}
      onSwipeRight={() => handleLike(item.id)}
    />
  );

  return (
    <MasonryFlashList
      data={items}
      renderItem={renderItem}
      estimatedItemSize={280}
      numColumns={2}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    />
  );
};
```

### 6. Docker Compose 新增服务

```yaml
neo4j:
  image: neo4j:5-community
  container_name: xuno-dev-neo4j
  restart: unless-stopped
  environment:
    NEO4J_AUTH: ${NEO4J_USER:-neo4j}/${NEO4J_PASSWORD:-neo4j123}
    NEO4J_PLUGINS: '["apoc"]'
  ports:
    - "7474:7474"
    - "7687:7687"
  volumes:
    - neo4j_dev_data:/data

qdrant:
  image: qdrant/qdrant:v1.8.4
  container_name: xuno-dev-qdrant
  restart: unless-stopped
  ports:
    - "6333:6333"
    - "6334:6334"
  volumes:
    - qdrant_dev_data:/qdrant/storage
```

---

## Implementation Priority

基于数据依赖和用户价值，建议分 4 个优先级实施：

### P0: 核心体验（MVP 必须）
- Masonry 瀑布流 UI + Tab 切换
- 行为追踪统一 + 时间衰减
- 冷启动策略优化（衔接 Phase 1 画像）
- 推荐缓存策略优化
- 色彩评分 UI 组件（色块 + 圆环）

### P1: 算法增强（推荐质量提升）
- PostgreSQL 物化视图协同过滤（替代内存全量加载）
- Qdrant 向量索引部署 + 商品向量化
- 渐进式权重融合框架完善
- GLM 推荐理由生成

### P2: 高级算法（差异化竞争力）
- Neo4j 知识图谱 + 图推理
- SASRec Python 微服务（真实 Transformer）
- CIEDE2000 感知色彩和谐评分
- 专利创新点实现

### P3: 精细化优化
- Learning-to-Rank 升级（LambdaMART）
- 探索与惊喜推荐策略
- A/B 测试框架
- 推荐效果指标监控

---

## Confidence Levels

| 领域 | 置信度 | 说明 |
|------|--------|------|
| Masonry UI | 95% | FlashList Masonry 是成熟方案，项目已依赖 |
| PG 物化视图 CF | 90% | 标准 PostgreSQL 特性，但需验证 pgvector 兼容性 |
| Neo4j 知识图谱 | 85% | Neo4j 是标准图数据库，但时尚领域图谱 Schema 需要领域专家验证 |
| Qdrant 向量检索 | 95% | 代码已实现，只需部署实例 |
| SASRec 微服务 | 75% | SASRec 论文实现成熟，但训练数据和模型部署需要验证 |
| CIEDE2000 | 90% | 公式明确，但与色彩季型融合评分的权重需要调优 |
| 渐进式融合框架 | 80% | 已有骨架，但数据成熟度阈值需要实际数据验证 |
| 滑动反馈交互 | 85% | react-native-gesture-handler 成熟，但手势冲突需要仔细处理 |

---

## Key Risks

1. **SASRec 训练数据不足** — 新平台用户行为数据稀疏，序列推荐模型可能欠拟合
   - **缓解**：先用规则+CF 满足基本推荐，SASRec 作为增强策略

2. **Neo4j 运维复杂度** — 新增一个数据库增加运维负担
   - **缓解**：Neo4j Community Edition 免费，Docker 部署简单，初始数据量小

3. **向量维度统一** — GLM embedding（1024/512维）vs SASRec embedding（64维）vs 自定义特征向量
   - **缓解**：Qdrant 支持多集合，不同模型使用不同集合

4. **推荐延迟** — 6 策略并行计算可能导致 P99 延迟过高
   - **缓解**：预计算 + 缓存 + 异步策略（SASRec/CF 结果预计算缓存）

5. **前端手势冲突** — 左右滑动 vs 水平滚动 vs Tab 切换
   - **缓解**：使用手势优先级配置，滑动反馈仅在卡片区域生效

---

## Existing Code Assessment

### 可直接复用（质量好）

| 文件 | 评估 | 复用方式 |
|------|------|---------|
| `recommendations.service.ts` | 完整规则引擎，9 维评分 | 保留作为内容匹配策略 |
| `color-matching.service.ts` | RGB→LAB + 色彩和谐规则 | 扩展 CIEDE2000 |
| `cold-start.service.ts` | 4 种冷启动策略 | 保留，优化权重 |
| `behavior-tracking.service.ts` | PG 双写 + Redis 缓存 | 统一事件模型 + 衰减 |
| `qdrant.service.ts` | 完整 Qdrant 客户端 + 内存降级 | 部署 Qdrant 后直接使用 |
| `unified-recommendation.engine.ts` | 6 策略融合 + 自适应权重 | 保留架构，增强各策略 |

### 需要重写（质量差/架构问题）

| 文件 | 问题 | 重写方案 |
|------|------|---------|
| `collaborative-filtering.service.ts` | 全量内存加载，OOM 风险 | PG 物化视图 + 定时刷新 |
| `knowledge-graph.service.ts` | 内存 Map + DFS，限 1000 items | Neo4j + Cypher |
| `sasrec.service.ts` | 硬编码嵌入，非真实模型 | Python 微服务 + PyTorch |
| `learning-to-rank.service.ts` | 简单线性加权 | MVP 保留，后续升级 |

### 需要新建

| 组件 | 说明 |
|------|------|
| `ciede2000.service.ts` | CIEDE2000 感知色彩距离计算 |
| `neo4j.service.ts` | Neo4j 客户端封装 |
| `recommendation-feed.service.ts` | 信息流编排（分页 + 缓存 + 预加载） |
| `sasrec-client.service.ts` | SASRec 微服务 HTTP 客户端 |
| `RecommendationFeed` 组件 | 瀑布流信息流 UI |
| `RecommendationCard` 组件 | 推荐卡片（图片+渐变+色彩评分） |
| `ColorScoreRing` 组件 | 色彩评分圆环动画 |
| `SwipeableCard` 组件 | 左右滑动反馈卡片 |

---

*Phase: 04-recommendation-engine*
*Research completed: 2026-04-14*
