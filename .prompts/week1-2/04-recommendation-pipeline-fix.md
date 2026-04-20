# 任务04: 推荐系统管道修复 — 统一入口 + SASRec接入 + 偏好回流

## 你的角色

你是寻裳(AiNeed)项目的算法工程师。项目位于 C:\AiNeed，NestJS后端。

## 背景（务必理解）

推荐系统存在严重的管道断裂问题：

1. **控制器绕过Orchestrator** — 直接调用 RecommendationsService（引擎A），SASRec/知识图谱/协同过滤（引擎B）全部架空
2. **SASRec完全未接入** — Orchestrator导入了SASRecService但从未调用
3. **偏好学习结果未被消费** — preference-learning.service.ts 的 getPersonalizedScores() 存在但推荐评分函数没用它
4. **冷启动问卷答案未回流** — 用户填了问卷，但问卷偏好要等行为累积才生效

## 任务

### Step 1: 理解现有代码

必须读取以下文件（不要跳过）：

1. `apps/backend/src/domains/platform/recommendations/recommendations.controller.ts` — 看控制器调用哪个服务
2. `apps/backend/src/domains/platform/recommendations/recommendations.service.ts` — 引擎A，找到 computeRuleBasedScore 方法
3. `apps/backend/src/domains/platform/recommendations/advanced-recommendation.service.ts` — 引擎B
4. `apps/backend/src/domains/platform/recommendations/orchestrator/recommendation.orchestrator.ts` — 编排器
5. `apps/backend/src/domains/ai-core/ai-stylist/preference-learning.service.ts` — 偏好学习
6. `apps/backend/src/domains/ai-core/ai-stylist/cold-start.service.ts` — 冷启动
7. `apps/backend/src/domains/platform/recommendations/services/sasrec.service.ts` — SASRec服务（如果存在于NestJS侧）

### Step 2: 修改控制器路由

修改 recommendations.controller.ts，将所有请求路由到 Orchestrator 而非直接调 RecommendationsService：

```typescript
// 之前: 直接调用引擎A
// constructor(private readonly recommendationsService: RecommendationsService) {}

// 之后: 通过Orchestrator
constructor(
  private readonly orchestrator: RecommendationOrchestrator,
) {}

@Get()
async getRecommendations(@Query() dto: GetRecommendationsDto, @CurrentUser() user: UserPayload) {
  return this.orchestrator.getRecommendations(user.userId, dto);
}
```

### Step 3: 重构 Orchestrator 为唯一入口

修改 recommendation.orchestrator.ts，使其成为真正的统一入口：

1. 注入 RecommendationsService（引擎A的评分逻辑）作为 `theoryBased` 策略
2. 注入 AdvancedRecommendationService（引擎B）
3. 注入 SASRecService（如果NestJS侧有的话；如果SASRec是Python服务，通过HTTP调用）

```typescript
async getRecommendations(userId: string, dto: GetRecommendationsDto): Promise<RecommendationResult> {
  // 1. 判断冷启动 vs 常规
  const userContext = await this.buildUserContext(userId);

  // 2. 根据用户行为数决定策略
  if (userContext.behaviorCount < 10) {
    return this.coldStartService.handleNewUser(userId, dto);
  }

  // 3. 并行获取各策略候选
  const [ruleCandidates, advancedCandidates, sasrecCandidates] = await Promise.all([
    this.recommendationsService.getRuleBasedCandidates(userId, dto),
    this.advancedService.getCandidates(userId, dto),
    this.getSasrecCandidates(userId, dto),
  ]);

  // 4. 合并去重
  const merged = this.mergeCandidates(ruleCandidates, advancedCandidates, sasrecCandidates);

  // 5. 统一评分（偏好加权）
  const scored = await this.applyPreferenceScores(userId, merged);

  // 6. 多样性重排
  const reranked = this.diversityRerank(scored, dto.limit || 20);

  return reranked;
}
```

### Step 4: 偏好学习回流

在 Orchestrator 中新增 `applyPreferenceScores` 方法，调用偏好学习服务：

```typescript
private async applyPreferenceScores(userId: string, candidates: any[]): Promise<ScoredCandidate[]> {
  const preferenceScores = await this.preferenceLearningService.getPersonalizedScores(userId);

  return candidates.map(candidate => {
    const ruleScore = candidate.score; // 0-100
    let preferenceBonus = 0;

    // 根据偏好权重加分
    if (preferenceScores.categories[candidate.category]) {
      preferenceBonus += preferenceScores.categories[candidate.category] * 20;
    }
    if (preferenceScores.colors[candidate.mainColor]) {
      preferenceBonus += preferenceScores.colors[candidate.mainColor] * 10;
    }
    if (preferenceScores.styles[candidate.style]) {
      preferenceBonus += preferenceScores.styles[candidate.style] * 15;
    }

    return {
      ...candidate,
      finalScore: Math.min(100, ruleScore + preferenceBonus),
    };
  });
}
```

### Step 5: 冷启动问卷回流

修改 cold-start.service.ts 的 handleNewUser 方法，在收集问卷结果后直接写入偏好：

```typescript
// 在收集到问卷结果后
if (quizResult) {
  await this.prisma.userPreferenceWeight.createMany({
    data: [
      { userId, category: "style", key: quizResult.preferredStyle, weight: 0.8, source: "quiz" },
      { userId, category: "color", key: quizResult.preferredColor, weight: 0.7, source: "quiz" },
      { userId, category: "price", key: quizResult.priceRange, weight: 0.6, source: "quiz" },
      {
        userId,
        category: "occasion",
        key: quizResult.preferredOccasion,
        weight: 0.7,
        source: "quiz",
      },
    ],
    skipDuplicates: true,
  });
}
```

### Step 6: 多样性重排增强

将 diversityPenalty 从 -5 提升到 -15，并增加颜色维度：

```typescript
private diversityRerank(candidates: ScoredCandidate[], limit: number): ScoredCandidate[] {
  const result: ScoredCandidate[] = [];
  const categoryCount: Record<string, number> = {};
  const colorCount: Record<string, number> = {};

  const sorted = candidates.sort((a, b) => b.finalScore - a.finalScore);

  for (const candidate of sorted) {
    if (result.length >= limit) break;

    // 类别惩罚
    const catPenalty = (categoryCount[candidate.category] || 0) * 15;
    // 颜色惩罚
    const colorPenalty = (colorCount[candidate.mainColor] || 0) * 10;

    const adjustedScore = candidate.finalScore - catPenalty - colorPenalty;

    // 最低分数门槛
    if (adjustedScore < 20) continue;

    result.push({ ...candidate, displayScore: adjustedScore });
    categoryCount[candidate.category] = (categoryCount[candidate.category] || 0) + 1;
    colorCount[candidate.mainColor] = (colorCount[candidate.mainColor] || 0) + 1;
  }

  return result.sort((a, b) => b.displayScore - a.displayScore);
}
```

## 验证标准

- [ ] 控制器调用Orchestrator而非直接调RecommendationsService
- [ ] Orchestrator整合引擎A评分+引擎B策略
- [ ] preferenceLearningService.getPersonalizedScores() 的结果被用于推荐评分
- [ ] 冷启动问卷结果直接写入UserPreferenceWeight
- [ ] 多样性惩罚从-5提升到-15，增加了颜色维度
- [ ] TypeScript编译通过
- [ ] 手动测试：调用 GET /api/v1/recommendations 返回推荐结果
