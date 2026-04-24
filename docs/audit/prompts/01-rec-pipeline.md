# 轨道 1: 后端推荐管道重构

你是 XUNO 项目的高级后端工程师。你的任务是重构推荐管道，使代码实现与文档设计的"六层漏斗"一致。

## 当前问题

1. `apps/backend/src/domains/platform/recommendations/orchestrator/recommendation.orchestrator.ts` 第 9-22 行仍然 import 已声明砍掉的模块：

   - `CollaborativeFilteringService` — 已砍
   - `KnowledgeGraphService` — 已砍
   - `GNNCompatibilityService` — 未规划
   - `TransformerEncoderService` — 未规划
   - `MultimodalFusionService` — 未规划
   - `LearningToRankService` — 未规划

2. 第 60-67 行的 breakdown 结构是平坦六路加权求和，不是六层漏斗

3. `apps/backend/src/domains/platform/recommendations/services/cold-start.service.ts` 第 35-64 行仍用 male/female 分桶

4. 没有"六层漏斗"的实现：缺 L1 合规过滤、L2 场景过滤、L3 尺码过滤

## 目标架构：真正的六层漏斗

```
L1 硬过滤: 场景匹配（interview/date/travel/seasonal/bodypositive/career）
L2 硬过滤: 尺码适配（用户尺码 vs 商品尺码可用性）
L3 硬过滤: 预算约束（用户预算max vs 商品价格）
L4 软评分: 规则引擎（读JSON文件，264条规则注入评分）
L5 软评分: 向量相似度（FashionCLIP嵌入 + Qdrant检索）
L6 软排序: 偏好学习（SASRec序列信号）
→ 最终: 加权融合 + LLM解释生成
```

## 具体修改指令

### 步骤 1: 清理 Orchestrator

文件: `apps/backend/src/domains/platform/recommendations/orchestrator/recommendation.orchestrator.ts`

1. 删除所有已砍服务的 import（CollaborativeFiltering, KnowledgeGraph, GNN, Transformer, Multimodal, LearningToRank）
2. 删除这些服务在 constructor 中的注入
3. 重写`recommend()`方法为六层漏斗结构：

```typescript
async recommend(request: RecommendationRequest): Promise<RecommendationOutput> {
  // L1: 场景硬过滤
  const sceneFiltered = this.filterByScene(allItems, request.scene);
  // L2: 尺码硬过滤
  const sizeFiltered = this.filterBySize(sceneFiltered, request.userProfile);
  // L3: 预算硬过滤
  const budgetFiltered = this.filterByBudget(sizeFiltered, request.budget);
  // L4: 规则引擎评分
  const ruleScored = await this.scoreByRules(budgetFiltered, request);
  // L5: 向量相似度评分
  const vectorScored = await this.scoreByVector(ruleScored, request);
  // L6: SASRec偏好信号
  const finalScored = await this.applyPreferenceLearning(vectorScored, request);
  // 加权融合 + 生成解释
  return this.fuseAndExplain(finalScored, request);
}
```

4. 更新 breakdown 接口：

```typescript
breakdown?: {
  totalCandidates: number;
  afterSceneFilter: number;
  afterSizeFilter: number;
  afterBudgetFilter: number;
  topCandidates: Array<{
    itemId: string;
    ruleScore: number;
    vectorScore: number;
    preferenceScore: number;
    finalScore: number;
  }>;
};
```

### 步骤 2: 实现规则引擎加载 JSON

文件: `apps/backend/src/domains/platform/recommendations/services/rule-engine.service.ts`（新建或修改现有）

1. 读取 `C:\AiNeed\ml\data\fashion_rules\` 下所有 JSON 文件：

   - body_type_rules.json (30+条)
   - color_season_rules.json (24+条)
   - chinese_occasion_rules.json (20+条)
   - fabric_rules.json (20+条)
   - item_compatibility.json (40+条)
   - weather_outfit_rules.json (30+条)

2. 实现 `scoreByRules()`:
   - 根据用户的 bodyType + occasion 查询匹配规则
   - 匹配推荐项加分，匹配避免项减分
   - 色彩协调度评分
   - 返回 0-100 的规则分数

### 步骤 3: 向量检索调用

确保 Orchestrator 调用 QdrantService 进行向量检索（轨道 7 会灌入数据）：

```typescript
async scoreByVector(items: Item[], request: RecommendationRequest): Promise<ScoredItem[]> {
  const queryEmbedding = await this.vectorService.getEmbedding(request.scene + ' ' + request.stylePreference.join(' '));
  const results = await this.vectorService.search(queryEmbedding, { topK: items.length });
  // 合并向量分数到items
}
```

### 步骤 4: 接口契约

输出必须符合 RecommendationOutput 接口：

```typescript
interface RecommendationOutput {
  outfits: OutfitSuggestion[];
  explanation: {
    why: string;
    confidence: number;
    factors: {
      bodyType: number;
      occasion: number;
      color: number;
      style: number;
      budget: number;
    };
    nextAction?: string;
  };
  source: "rules" | "vector" | "hybrid";
  breakdown?: {
    /* 如上 */
  };
}
```

## 验收标准

1. `npx tsc --noEmit` 在 backend 目录 0 错误
2. orchestrator 不再 import CollaborativeFiltering/KnowledgeGraph/GNN/Transformer/Multimodal/LearningToRank
3. recommend()方法内部有明确的 L1-L6 六层处理步骤
4. 规则引擎从 JSON 文件读取，不是硬编码
5. 输出符合 RecommendationOutput 接口

## 不要做的事情

- 不要修改移动端代码
- 不要修改 ML Python 代码
- 不要修改数据库 schema
- 不要添加新的 npm 依赖（使用已有的）
