# 推荐引擎多维约束集成状态

审计日期: 2026-04-19

---

## 天气集成

- 状态: **部分集成** -- 天气数据采集链路完整，但未接入推荐引擎主路径
- 文件:
  - `apps/backend/src/domains/fashion/weather/weather.service.ts` -- 天气API服务 (QWeather + OpenWeatherMap + mock fallback)
  - `apps/backend/src/domains/fashion/weather/weather.controller.ts` -- 天气REST端点
  - `apps/backend/src/domains/ai-core/ai-stylist/services/weather-integration.service.ts` -- 天气上下文聚合(带Redis缓存)
  - `apps/mobile/src/services/weatherService.ts` -- 移动端天气服务 (Open-Meteo API)
  - `apps/mobile/src/features/home/services/weatherService.ts` -- 移动端天气服务(重复)
  - `apps/backend/src/domains/platform/recommendations/types/recommendation.types.ts` -- 类型定义中有 `weather?: string` 字段
  - `apps/backend/src/domains/platform/recommendations/services/unified-recommendation.engine.ts` -- 引擎中有天气评分逻辑

- 问题:
  1. **推荐控制器不接收天气参数**: `recommendations.controller.ts` 的 `getRecommendations` 端点只接受 `category`, `occasion`, `season`, `limit` 四个查询参数。`GetRecommendationsQueryDto` 中没有 `weather` 字段。天气数据从API层面就无法传入推荐引擎。

  2. **推荐引擎内部有天气评分但权重极低**: `unified-recommendation.engine.ts` 第673-677行有天气匹配逻辑:

     ```typescript
     if (context?.weather && attributes?.weather) {
       if (attributes.weather.includes(context.weather)) {
         score += 0.05;
       }
     }
     ```

     仅+0.05分，相比其他因素(风格匹配+0.15, 体型+0.15, 季节+0.08)影响微乎其微。

  3. **天气匹配依赖商品attributes.weather字段**: 商品需要预先标注 `weather` 数组属性(如 ["sunny", "rainy"])，但 `ClothingItemAttributes` 中该字段为可选，不确定实际数据库中是否有填充。

  4. **WeatherIntegrationService只被AI Stylist Chat使用**: 天气集成服务只在 `ai-stylist` 模块的 `chat.service.ts` 和 `ai-stylist.controller.ts` 中被注入和调用。推荐引擎(`recommendations`模块)完全没有引用 `WeatherIntegrationService`。

  5. **后端天气服务与移动端天气服务使用不同的API**: 后端使用 QWeather/OpenWeatherMap，移动端使用 Open-Meteo + Nominatim。两者获取的数据格式和精度不一致，无法保证推荐上下文中天气数据的一致性。

- 修复方案:

  **P0 - 推荐控制器接收天气参数**
  - 在 `GetRecommendationsQueryDto` 中添加 `weather` 可选参数
  - 在 `recommendations.controller.ts` 的 `getRecommendations` 方法中将 `weather` 传入 service
  - 同样在 `GetAdvancedRecommendationsQueryDto` 中添加

  **P1 - 推荐服务自动获取天气**
  - 在 `RecommendationsService` 或 `RecommendationFeedService` 中注入 `WeatherIntegrationService`
  - 当请求中没有显式传 weather 但提供了 lat/lon 时，自动调用天气服务获取当前天气
  - 将天气上下文注入到 `RecommendationContext` 中

  **P2 - 提升天气评分权重**
  - `unified-recommendation.engine.ts` 中天气匹配分数从 0.05 提升到 0.10-0.15
  - 添加温度区间匹配逻辑(而不仅仅是 weather 字符串匹配)
  - 参考 `weather-integration.service.ts` 中的 `getWeatherBasedStyles()` 方法，将天气风格标签纳入内容匹配

  **P3 - 统一天气数据源**
  - 移动端统一通过后端 `/weather` API 获取天气，而非直接调用 Open-Meteo
  - 或者在推荐请求中传递 lat/lon，由后端统一处理

---

## 趋势集成

- 状态: **部分集成** -- 有趋势计算逻辑，但数据来源单一，无外部趋势接入
- 文件:
  - `apps/backend/src/domains/platform/recommendations/services/unified-recommendation.engine.ts` 第545-573行 `calculatePopularityScore()`
  - `apps/backend/src/domains/platform/recommendations/services/advanced-recommendation.service.ts` 第587-629行 `getTrendingRecommendations()`
  - `apps/backend/src/domains/social/community/community-trending.service.ts` -- 社区热门服务
  - `apps/backend/src/domains/platform/recommendations/recommendations.service.ts` 第82-83行 WEIGHTS.popularityBoost

- 问题:
  1. **热门度计算仅依赖数据库内部指标**: `calculatePopularityScore()` 使用 `viewCount`, `likeCount`, `createdAt` 和硬编码的流行品牌列表。没有接入任何外部趋势数据源(微博热搜、小红书趋势、Google Trends等)。

  2. **硬编码的流行品牌列表**: 第567-569行:

     ```typescript
     const popularBrands = ["Nike", "Adidas", "Zara", "H&M", "Uniqlo", "Gucci", "LV"];
     ```

     这是静态硬编码，不会随时间变化。不适合中国市场趋势。

  3. **社区趋势与推荐引擎未联动**: `CommunityTrendingService` 有完整的热门帖子计算(基于点赞*3 + 评论*2 + 收藏*5 + 分享*4，加上时间衰减)，每10分钟重算。但推荐引擎完全没有引用这个服务。社区热门标签(tags)和热门帖子中的服装信息未被推荐引擎利用。

  4. **趋势API返回的是简单排序**: `getTrendingRecommendations()` 仅按 `viewCount + likeCount + recency + isFeatured` 排序，没有考虑时间衰减、社交传播等维度。所有返回结果的 matchReasons 都是固定的 `["热门单品", "近期爆款"]`，没有真实理由。

  5. **popularity 权重偏低**: 在默认权重中 popularity 仅占 0.10 (10%)，新用户冷启动时也仅 0.25。对于新用户来说虽然能提供基本的"大家都在看"体验，但趋势内容本身没有做任何数据融合。

- 修复方案:

  **P0 - 接入社区趋势数据**
  - 在推荐引擎中注入 `CommunityTrendingService`
  - 从社区热门标签中提取当前流行风格/品类
  - 将社区热门标签作为额外的 popularity boost 因子

  **P1 - 动态化流行品牌和趋势关键词**
  - 将硬编码品牌列表改为从数据库查询(按近期销量/浏览量动态计算)
  - 添加时间衰减函数(类似社区的 `(1.0 / (1 + hours / 168))` 公式)
  - 替换固定 matchReasons 为实际趋势原因

  **P2 - 引入外部趋势源(可选)**
  - 接入小红书/微博热搜 API 或爬虫
  - 将趋势关键词映射到商品标签
  - 添加 `TrendingService` 统一管理内外部趋势数据

---

## 价格集成

- 状态: **部分集成** -- 后端有价格过滤和评分逻辑，但多个推荐路径未使用
- 文件:
  - `apps/backend/src/domains/platform/recommendations/recommendations.service.ts` 第594-604行价格范围匹配评分
  - `apps/backend/src/domains/platform/recommendations/services/unified-recommendation.engine.ts` 第451-466行 `getCandidates()` 价格过滤
  - `apps/backend/src/domains/platform/recommendations/services/cold-start.service.ts` 第283-286行价格范围过滤
  - `apps/backend/src/domains/platform/recommendations/types/recommendation.types.ts` 第94-95行 `priceRangeMin/Max`
  - `apps/backend/src/domains/platform/recommendations/orchestrator/recommendation.orchestrator.ts` 第46-47行 `minPrice/maxPrice`

- 问题:
  1. **推荐控制器不接收价格参数**: `GetRecommendationsQueryDto` 和 `GetAdvancedRecommendationsQueryDto` 中没有 `minPrice`/`maxPrice` 参数。用户无法在API请求中指定价格范围。尽管 orchestrator 和 engine 的类型定义中支持 `minPrice`/`maxPrice`，但控制器层没有暴露这些参数。

  2. **价格范围匹配仅在一处实现**: `recommendations.service.ts` 的 `computeRuleBasedScore()` 中有价格匹配逻辑(+10分)，但 `advanced-recommendation.service.ts` 和 `unified-recommendation.engine.ts` 的评分计算中**完全没有**价格匹配评分。这意味着高级推荐路径完全不考虑用户预算。

  3. **用户profile的价格范围未被推荐引擎使用**: `UserProfileData` 中有 `priceRangeMin`/`priceRangeMax` 字段，`recommendations.service.ts` 会从用户档案读取，但 `unified-recommendation.engine.ts` 的 `calculateContentBasedScore()` 方法没有价格匹配逻辑，尽管它可以访问 userProfile。

  4. **推荐Feed不传递价格信息给引擎**: `RecommendationFeedService.getFeed()` 调用 `engine.getRecommendations()` 时只传了 `{ occasion: subCategory }`，没有传用户的价格偏好。

  5. **冷启动有价格过滤但不完整**: `ColdStartService` 从 onboarding quiz 获取价格范围并做数据库过滤，这是目前唯一真正使用价格约束的路径。

- 修复方案:

  **P0 - 控制器添加价格参数**
  - 在 `GetRecommendationsQueryDto` 和 `GetAdvancedRecommendationsQueryDto` 中添加 `minPrice`/`maxPrice` 可选参数
  - 在控制器方法中传递到 service 层

  **P1 - 统一价格评分逻辑**
  - 在 `unified-recommendation.engine.ts` 的 `calculateContentBasedScore()` 中添加价格匹配评分
  - 在 `advanced-recommendation.service.ts` 的 `contentBasedScore()` 中添加价格匹配评分
  - 从 userProfile 中读取 priceRangeMin/priceRangeMax 进行匹配

  **P2 - Feed服务传递价格偏好**
  - `RecommendationFeedService.getFeed()` 从用户档案中读取价格偏好
  - 将价格范围传入引擎的 options 参数

---

## 需要立即修复的问题

### 优先级 P0 (阻塞级 - 推荐核心功能缺失)

1. **推荐控制器缺少天气参数**
   - 文件: `apps/backend/src/domains/platform/recommendations/dto/recommendations.dto.ts`
   - 文件: `apps/backend/src/domains/platform/recommendations/recommendations.controller.ts`
   - 影响: 天气数据完全无法进入推荐流程，即使后端有完整的天气服务
   - 修复: 在 DTO 和 Controller 中添加 weather/lat/lon 参数

2. **推荐控制器缺少价格参数**
   - 文件: `apps/backend/src/domains/platform/recommendations/dto/recommendations.dto.ts`
   - 文件: `apps/backend/src/domains/platform/recommendations/recommendations.controller.ts`
   - 影响: 用户无法指定预算范围，价格过滤形同虚设
   - 修复: 在 DTO 和 Controller 中添加 minPrice/maxPrice 参数

### 优先级 P1 (重要 - 推荐质量严重受损)

3. **天气评分权重过低 (+0.05)**
   - 文件: `apps/backend/src/domains/platform/recommendations/services/unified-recommendation.engine.ts` 第673-677行
   - 影响: 即使天气数据能传入，对推荐结果的影响也几乎可以忽略
   - 修复: 提升至 0.10-0.15，并增加温度区间匹配逻辑

4. **高级推荐路径完全忽略价格**
   - 文件: `apps/backend/src/domains/platform/recommendations/services/advanced-recommendation.service.ts`
   - 影响: 通过 `/recommendations/advanced` 获取的推荐不考虑用户预算
   - 修复: 在 `contentBasedScore()` 中添加价格匹配逻辑

5. **社区趋势与推荐引擎未联动**
   - 文件: `apps/backend/src/domains/platform/recommendations/services/unified-recommendation.engine.ts`
   - 影响: 社区有完善的趋势计算，但推荐引擎完全不知道
   - 修复: 注入 CommunityTrendingService，将热门标签作为 popularity boost

### 优先级 P2 (改善 - 提升推荐精准度)

6. **硬编码流行品牌列表**
   - 文件: `apps/backend/src/domains/platform/recommendations/services/unified-recommendation.engine.ts` 第567-569行
   - 影响: 流行品牌判定是静态的，不适合中国市场和季节变化
   - 修复: 改为从数据库动态查询

7. **推荐Feed不传价格偏好**
   - 文件: `apps/backend/src/domains/platform/recommendations/services/recommendation-feed.service.ts`
   - 影响: Feed 推荐不考虑用户价格偏好
   - 修复: 从用户档案读取价格范围并传入引擎

8. **移动端/后端天气数据源不一致**
   - 文件: `apps/mobile/src/services/weatherService.ts` vs `apps/backend/src/domains/fashion/weather/weather.service.ts`
   - 影响: 移动端展示的天气与后端推荐依据的天气可能不同
   - 修复: 统一通过后端API获取天气数据

---

## 总结

| 维度 | 状态     | 数据源                        | 评分逻辑           | API暴露             | 实际生效                 |
| ---- | -------- | ----------------------------- | ------------------ | ------------------- | ------------------------ |
| 天气 | 部分集成 | QWeather/OWM/Open-Meteo       | 仅engine中+0.05    | 不暴露给推荐API     | 仅AI Stylist Chat使用    |
| 趋势 | 部分集成 | DB内部(viewCount/likeCount)   | popularity权重0.10 | `/trending`端点暴露 | 社区趋势未接入引擎       |
| 价格 | 部分集成 | UserProfile.priceRangeMin/Max | 仅rule-based中有   | 不暴露给推荐API     | 仅冷启动和rule-based路径 |

**核心问题**: 三条推荐路径(RecommendationsService / AdvancedRecommendationService / UnifiedRecommendationEngine)各自独立，集成程度不一致。最严重的是控制器层缺少参数暴露，导致后端已实现的功能无法被调用。
