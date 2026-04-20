# 任务09: 推荐归因链路补全 + 行为事件扩展

## 你的角色

寻裳(AiNeed)项目后端工程师。项目位于 C:\AiNeed，NestJS + Prisma。

## 背景

当前推荐→浏览→点击→购买的归因链路断裂：

- StyleRecommendation.items 是Json，无法JOIN到UserBehaviorEvent
- UserBehaviorEvent 没有 recommendationId 字段
- Order 没有归因来源字段
- 行为事件类型缺少14种关键事件

## 必读文件

1. `apps/backend/prisma/schema.prisma` — 完整读取
2. `apps/backend/src/domains/platform/analytics/` — 行为追踪相关
3. `apps/backend/src/domains/platform/recommendations/` — 推荐相关

## 任务

### 1. Schema修改 — 增加归因字段

**UserBehaviorEvent** 增加字段：

```prisma
model UserBehaviorEvent {
  // ... 现有字段 ...
  recommendationId String?   // 关联推荐ID
  experimentId     String?   // A/B测试分组
  searchQuery      String?   // 搜索事件的关键词
  position         Int?      // 商品在列表中的位置
}
```

**StyleRecommendation** 增加字段：

```prisma
model StyleRecommendation {
  // ... 现有字段 ...
  algorithm       String?      // 记录使用了哪个算法
  experimentGroup String?      // AB测试分组
  responseTimeMs  Int?         // 推荐生成耗时
  viewedCount     Int    @default(0) // 用户看到几条
  clickedCount    Int    @default(0) // 点击了几条
}
```

**Favorite** 增加来源：

```prisma
model Favorite {
  // ... 现有字段 ...
  source   String?  // 'recommendation' | 'search' | 'browse' | 'try_on' | 'community'
  sourceId String?  // 来源ID
}
```

**VirtualTryOn** 增加来源：

```prisma
model VirtualTryOn {
  // ... 现有字段 ...
  source         String?  // 'recommendation' | 'search' | 'browse' | 'community'
  sourceId       String?  // 来源ID
  userRating     Int?     // 试穿后用户评分 1-5
}
```

**Order** 增加归因：

```prisma
model Order {
  // ... 现有字段 ...
  attributionSource           String?  // 'recommendation' | 'search' | 'try_on' | 'direct'
  attributionRecommendationId String?  // 推荐ID
}
```

**AiStylistSession** 增加结束状态：

```prisma
// 在枚举区域添加
enum AiSessionOutcome {
  completed
  abandoned
  timeout
  error
}

model AiStylistSession {
  // ... 现有字段 ...
  outcome      AiSessionOutcome?
  messageCount Int     @default(0)
  durationSec  Int?
}
```

### 2. 扩展行为事件类型

找到 BehaviorEventType 枚举，添加缺失的事件：

```prisma
enum BehaviorEventType {
  // ... 现有的20种 ...
  recommendation_dismiss  // 推荐被划过/关闭
  item_zoom              // 放大查看商品
  size_guide_view        // 查看尺码表
  color_switch           // 切换商品颜色
  try_on_share           // 试穿结果分享
  outfit_save            // 保存穿搭方案
  outfit_apply           // 应用穿搭方案
  return_initiated       // 发起退货
  review_submitted       // 提交评价
  wishlist_add           // 加入心愿单
  wishlist_remove        // 移除心愿单
  push_notification_open // 推送打开
  deep_link_open         // 深链打开
  coupon_use             // 使用优惠券
}
```

### 3. 新增分析聚合表

```prisma
model DailyUserMetric {
  id             String   @id @default(uuid())
  userId         String
  date           DateTime @db.Date

  sessionCount   Int    @default(0)
  pageViewCount  Int    @default(0)
  totalDuration  Int    @default(0)
  itemViewCount  Int    @default(0)
  searchCount    Int    @default(0)
  tryOnCount     Int    @default(0)
  favoriteCount  Int    @default(0)
  shareCount     Int    @default(0)
  cartAddCount   Int    @default(0)
  orderCount     Int    @default(0)
  orderAmount    Decimal @default(0) @db.Decimal(12, 2)

  activityLevel  String?  // high/medium/low/churned
  spendingTier   String?  // high/medium/low/none

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date])
  @@index([date])
  @@index([activityLevel, date])
}

model RecommendationImpression {
  id               String   @id @default(uuid())
  userId           String
  recommendationId String?
  algorithm        String?
  experimentGroup  String?
  position         Int
  itemId           String

  isClicked        Boolean  @default(false)
  clickTime        Int?
  isFavorited      Boolean  @default(false)
  isTryOn          Boolean  @default(false)
  isCarted         Boolean  @default(false)
  isPurchased      Boolean  @default(false)

  createdAt        DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@index([itemId])
  @@index([algorithm, createdAt])
}

model OnboardingStepLog {
  id          String   @id @default(uuid())
  userId      String
  step        String
  enteredAt   DateTime @default(now())
  completedAt DateTime?
  duration    Int?
  skipped     Boolean  @default(false)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, step])
  @@index([step, createdAt])
}
```

### 4. 运行迁移

```bash
cd apps/backend && npx prisma migrate dev --name add_attribution_and_analytics_tables
```

### 5. 更新行为追踪DTO

找到行为追踪的DTO文件，更新 eventType 枚举值以匹配新增的类型。

## 验证标准

- [ ] UserBehaviorEvent 有 recommendationId/experimentId/position 字段
- [ ] StyleRecommendation 有 algorithm/experimentGroup 字段
- [ ] Favorite/VirtualTryOn 有 source/sourceId 字段
- [ ] Order 有 attributionSource 字段
- [ ] BehaviorEventType 新增14种事件类型
- [ ] DailyUserMetric / RecommendationImpression / OnboardingStepLog 表创建
- [ ] prisma migrate 成功
