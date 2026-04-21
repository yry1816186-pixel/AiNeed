# 任务: 推荐系统管道接通（最高商业价值）

## 项目路径

C:\AiNeed

## 上下文

这是审计发现的最大断层 — 推荐管道架构完整但数据流断裂。具体问题:

1. **控制器绕过 Orchestrator** — recommendations.controller 直接调用 RecommendationsService，绕过了 RecommendationOrchestrator
2. **SASRec 未接入** — 在 orchestrator 中导入但从未调用
3. **偏好学习结果未被消费** — preference-learning 采集了用户行为但不回流到推荐评分
4. **冷启动问卷答案未回流** — 新用户看到的推荐本质是热门排序
5. **两套推荐引擎互不通信** — 引擎 A (recommendations.service.ts) 和引擎 B (advanced-recommendation.service.ts)

## 关键文件

| 文件                               | 路径                                               | 作用                |
| ---------------------------------- | -------------------------------------------------- | ------------------- |
| recommendations.controller.ts      | src/domains/platform/recommendations/              | API 入口            |
| recommendations.service.ts         | 同上                                               | 引擎 A — 被直接调用 |
| recommendation.orchestrator.ts     | src/domains/platform/recommendations/orchestrator/ | 编排器 — 被绕过     |
| advanced-recommendation.service.ts | src/domains/platform/recommendations/services/     | 引擎 B              |
| unified-recommendation.engine.ts   | 同上                                               | 统一引擎            |
| cold-start.service.ts              | 同上                                               | 冷启动服务          |
| collaborative-filtering.service.ts | 同上                                               | 协同过滤            |
| preference-learning.service.ts     | src/domains/ai-core/ai-stylist/                    | 偏好学习            |
| behavior-tracking.service.ts       | src/domains/platform/recommendations/services/     | 行为追踪            |
| sasrec_service.py                  | ml/services/recommender/                           | SASRec Python 服务  |

## 修复步骤

### Step 1: 统一入口 — Controller 改为调用 Orchestrator

读取 `recommendations.controller.ts`，找到直接调用 `RecommendationsService` 的方法。

改为调用 `RecommendationOrchestrator.getRecommendations()`:

```typescript
// 之前: 直接调用 this.recommendationsService.getRecommendations(userId, ...)
// 之后: 调用 this.orchestrator.getRecommendations(userId, ...)

@Get()
async getRecommendations(@CurrentUser() user: any, @Query() query: any) {
  return this.orchestrator.getRecommendations(user.id, {
    limit: query.limit || 20,
    scene: query.scene,
    // ...
  });
}
```

确保 Controller 注入 Orchestrator:

```typescript
constructor(
  private readonly orchestrator: RecommendationOrchestrator,
  // 保留旧服务作为 fallback
  private readonly fallbackService: RecommendationsService,
) {}
```

### Step 2: Orchestrator 接入所有策略

读取 `recommendation.orchestrator.ts`，确保它:

1. 调用 cold-start.service（新用户时）
2. 调用 collaborative-filtering（有足够行为数据时）
3. 调用 SASRec（通过 HTTP 调用 Python 服务）
4. 调用 FashionCLIP embedding（通过 Qdrant 向量搜索）
5. 调用规则引擎（兜底）
6. 汇总所有策略分数，加权排序

伪代码:

```typescript
async getRecommendations(userId: string, options: RecOptions): Promise<ScoredItem[]> {
  const userProfile = await this.getUserProfile(userId);
  const isColdStart = await this.isColdStartUser(userId);

  let candidates: ScoredItem[] = [];

  if (isColdStart) {
    // 冷启动: 问卷偏好 → 规则引擎
    candidates = await this.coldStartService.getRecommendations(userId, userProfile);
  } else {
    // 策略并行执行
    const [sasrecResults, cfResults, embeddingResults] = await Promise.allSettled([
      this.getSASRecRecommendations(userId, options),
      this.collaborativeFiltering.getRecommendations(userId),
      this.getEmbeddingRecommendations(userId, userProfile),
    ]);

    // 合并候选
    candidates = this.mergeResults([
      sasrecResults, cfResults, embeddingResults
    ]);
  }

  // 规则引擎过滤 + 重排
  candidates = this.applyFashionRules(candidates, userProfile);
  candidates = this.diversityRerank(candidates);

  // 记录推荐展示（归因闭环）
  await this.recordImpressions(userId, candidates);

  return candidates.slice(0, options.limit || 20);
}
```

### Step 3: 偏好学习结果回流

读取 `preference-learning.service.ts`，找到学习结果存储位置。

确认 Orchestrator 在生成推荐时读取偏好学习结果:

```typescript
// 在 orchestrator 中:
const preferences = await this.preferenceLearningService.getUserPreferences(userId);
// 将 preferences 作为推荐评分的权重因子
```

### Step 4: 冷启动问卷回流

读取 `style-quiz.service.ts` 和 `cold-start.service.ts`。

确认 quiz 完成后的数据流转:

1. 用户完成 quiz → 结果存入 StyleQuizResult 表
2. cold-start.service 读取 StyleQuizResult → 生成初始推荐评分
3. 推荐展示时记录 RecommendationImpression

### Step 5: 归因闭环

确保每次推荐展示时写入 RecommendationImpression 表:

```typescript
async recordImpressions(userId: string, items: ScoredItem[]): Promise<void> {
  await this.prisma.recommendationImpression.createMany({
    data: items.map((item, position) => ({
      userId,
      clothingItemId: item.id,
      position,
      score: item.score,
      strategy: item.source || 'unknown',
      createdAt: new Date(),
    })),
  });
}
```

### Step 6: 端到端测试

模拟完整流程:

1. 创建新用户 → 完成问卷 → 获得冷启动推荐
2. 浏览几个商品 → 触发行为追踪
3. 再次请求推荐 → 验证推荐结果受行为影响
4. 点击推荐商品 → 验证归因记录

## 验证

- Controller 的所有推荐请求都经过 Orchestrator
- Orchestrator 调用了至少 2 个策略
- 新用户能获得基于问卷的推荐
- 推荐展示写入 RecommendationImpression
