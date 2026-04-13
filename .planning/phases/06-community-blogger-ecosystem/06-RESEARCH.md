# Phase 6: 社区 & 博主生态 - Research

**Researched:** 2026-04-14
**Status:** Complete

## Research Question

"What do I need to know to PLAN this phase well?"

---

## 1. Existing Codebase Inventory

### Backend — Community Module (可复用)

| 文件 | 行数 | 现有功能 | 缺失功能 |
|------|------|----------|----------|
| `community.service.ts` | 662 | createPost, getPosts, getPostById, updatePost, deletePost, likePost, createComment, getComments, followUser, getFollowingPosts, getRecommendedPosts | bookmark, share, report, 热门算法, 内容审核, 博主商品 |
| `community.controller.ts` | 183 | 11 个 REST 端点（帖子CRUD+点赞+评论+关注+推荐） | 收藏/分享/举报/审核/博主商品端点 |
| `community.dto.ts` | — | PostCategory(5类), PostSortBy(3种), CreatePostDto, PostQueryDto, CreateCommentDto, LikePostDto | BookmarkDto, ReportDto, BloggerProductDto, ModerationDto |
| `community.module.ts` | — | 仅导入 PrismaModule + StorageModule | 需增加 RedisModule, QueueModule, NotificationModule, AISafetyModule |

### Backend — Wardrobe Collection Module (可复用)

- `wardrobe-collection.controller.ts` — 完整 CRUD + 批量添加 + 拖拽排序 API
- `wardrobe-collection.service.ts` — 灵感衣橱服务
- `wardrobe-collection.dto.ts` — DTOs
- **可直接复用**，需扩展一键导入（从帖子/AI方案/试衣结果）

### Backend — 支付与订单模块 (部分复用)

- `payment.service.ts` — 支付处理存在
- `payment.events.ts` — 支付事件基础设施存在
- `order.service.ts` — OrderService.create() 紧耦合 ClothingItem，**无佣金逻辑**
- `merchant.service.ts` — 商家模块 + MerchantAuthGuard 模式可参考

### Backend — AI 安全模块 (可复用)

- `ai-safety.service.ts`:
  - `quickCheck()` — 简单模式匹配（可扩展为关键词过滤）
  - `validateResponse()` — 完整 ML 服务验证
  - `callMLService()` — 调用 Python ML 服务
  - **可直接复用于内容审核**

### Backend — 通知模块 (部分复用)

- `notification.service.ts` — 通知服务存在
- `notification.gateway.ts` — WebSocket 网关存在
- 移动端 WebSocket 仅处理 try_on 事件，**未处理社交通知**

### Backend — 基础设施 (可复用)

| 服务 | 文件 | 可用方法 |
|------|------|----------|
| Redis | `redis.service.ts` | get, set, setWithTtl, setex, del |
| Storage | `storage.service.ts` | uploadImage, uploadBuffer, uploadTemporary, uploadEncrypted |
| Queue | `queue.service.ts` | BullMQ 队列服务 |
| Schedule | @nestjs/schedule | @Cron 装饰器已使用 |
| Events | EventEmitter2 | 事件驱动架构 |

### 移动端 (可复用)

| 组件 | 文件 | 现有功能 |
|------|------|----------|
| CommunityScreen | `CommunityScreen.tsx` (529行) | 分类切换、瀑布流、动画 |
| WaterfallFlashList | `WaterfallFlashList.tsx` | FlashList 双列瀑布流 + TanStack Query |
| SocialInteractions | `SocialInteractions.tsx` | AnimatedLikeButton, ShareSheet, CommentInput, CommentSheet, ReactionPicker |
| community.api.ts | `community.api.ts` (437行) | API 客户端，isBookmarked 字段（后端始终返回 false） |
| social.ts (types) | `types/social.ts` | PostCardData, Comment, UserInteraction, Notification, UserSocialStats, Tag, Topic 完整类型定义 |
| wardrobeStore | `stores/wardrobeStore.ts` | 衣橱状态管理 |

### 管理后台 (部分可复用)

- `CommunityManage/index.tsx` — 有 PostList, ReportList, TagList/TagFormModal 标签页
- `ReportList.tsx` — 举报 UI 存在（pending/resolved/rejected 状态）
- `community.ts` (admin API) — reportApi with getList and resolve methods
- **后端未实现 `/api/v1/admin/community/*` 端点**
- **无博主管理页面**

---

## 2. Gap Analysis (SOC-01 ~ SOC-12)

### SOC-01: 穿搭内容社区
- ✅ CommunityModule 已有基础 CRUD
- ✅ CommunityScreen 已有社区页面
- ❌ 缺少内容定位聚焦（穿搭专属分类/标签体系）

### SOC-02: 穿搭发帖
- ✅ CreatePostDto 已有 title, content, images?, tags?, category?, relatedItemIds?
- ✅ photos.api.ts 有上传基础设施（FormData）
- ❌ MulterModule 全局配置仅支持单文件（10MB），需覆盖为多文件（9图）
- ❌ 缺少本地草稿保存（AsyncStorage）
- ❌ 缺少关联平台商品标注 UI

### SOC-03: 社区信息流
- ✅ WaterfallFlashList 双列瀑布流组件
- ✅ PostSortBy 枚举有 LATEST, POPULAR, TRENDING
- ❌ 排序逻辑过于简单（popular=likeCount desc, trending=commentCount desc），需时间衰减热门算法
- ❌ 无 Redis 缓存热门帖子
- ❌ 无定时任务重算热门分数

### SOC-04: 互动系统
- ✅ PostLike 模型存在
- ✅ PostComment 有 parentId 支持嵌套
- ✅ SocialInteractions 组件（点赞/评论/分享）
- ❌ 缺少 PostBookmark 模型（D-21）
- ❌ 评论仅支持一级回复（D-30），需验证现有 parentId 逻辑
- ❌ 缺少通知触发（点赞/评论/收藏/关注/回复@你）

### SOC-05: 关注系统
- ✅ UserFollow 模型存在
- ✅ followUser, getFollowingPosts API 存在
- ❌ 缺少 FollowButton 组件
- ❌ 缺少关注 tab 动态混合展示（帖子+点赞/试衣动态）
- ❌ 缺少静默取关逻辑

### SOC-06: 一键导入灵感衣橱
- ✅ WardrobeCollectionModule 完整 CRUD + 批量添加
- ✅ CollectionItemType 枚举已有 post, outfit, try_on
- ❌ 缺少从帖子/AI方案/试衣结果一键导入的 API 和 UI
- ❌ 缺少导入时选择单品功能（D-15）

### SOC-07: 灵感衣橱自定义分类
- ✅ WardrobeCollection 有 name, icon, sortOrder, isDefault
- ✅ 后端已有拖拽排序 API
- ❌ 移动端未安装拖拽排序库（react-native-gesture-handler + reanimated 可作为基础）
- ❌ 缺少收藏即归档流程（D-23：收藏时选择分类）

### SOC-08: 博主自然分化机制
- ❌ User 模型缺少 bloggerLevel, bloggerScore, bloggerBadge 字段
- ❌ 缺少博主评分计算逻辑（D-03: 粉丝40%+互动率30%+内容数20%+收藏率10%）
- ❌ 缺少定期重算 + 缓冲期降级（D-06）
- ❌ 缺少博主等级标识 UI

### SOC-09: 博主商品认证和上架
- ❌ 缺少 BloggerProduct 模型（数字方案 + 关联实体）
- ❌ 缺少先上后审流程（D-08）
- ❌ 缺少社区内闭环购买（D-09，复用 Phase 5 支付）
- ❌ OrderService.create() 紧耦合 ClothingItem，需扩展支持博主商品
- ❌ 缺少佣金结算逻辑

### SOC-10: 博主内容数据面板
- ❌ 缺少数据面板 API（浏览量趋势+互动数据+粉丝增长+转化率）
- ❌ 移动端未安装图表库
- ❌ 缺少 7天/30天 切换逻辑

### SOC-11: 内容审核
- ✅ AISafetyService 可复用（quickCheck + validateResponse）
- ✅ BullMQ QueueService 可用于异步审核任务
- ❌ 缺少关键词前置过滤 + 抽样后审流程（D-11）
- ❌ 缺少 ContentModerationLog 模型
- ❌ 后端未实现 admin/community/* 端点
- ❌ 缺少审核管理后台完善

### SOC-12: 举报与热门趋势
- ❌ 缺少 ContentReport 模型
- ❌ 缺少举报流程（累积3次隐藏+AI初审+人工复核，D-14/CC-40）
- ❌ 缺少热门趋势算法（D-12: 互动加权+时间衰减）
- ❌ 缺少热门趋势展示（帖子排行+标签/风格趋势）

---

## 3. Prisma Schema 变更清单

### 需要新增的模型

```prisma
model PostBookmark {
  id        String   @id @default(cuid())
  userId    String
  postId    String
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
  post      CommunityPost @relation(fields: [postId], references: [id])
  @@unique([userId, postId])
}

model ContentReport {
  id          String   @id @default(cuid())
  reporterId  String
  contentType String   // "post" | "comment"
  contentId   String
  reason      String
  status      String   @default("pending") // pending | reviewing | resolved | rejected
  reviewedBy  String?
  reviewNote  String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  reporter    User     @relation(fields: [reporterId], references: [id])
}

model BloggerProduct {
  id          String   @id @default(cuid())
  bloggerId   String
  type        String   // "digital_scheme" | "physical_product"
  title       String
  description String?
  price       Decimal  @db.Decimal(10, 2)
  images      String[]
  relatedItemId String?  // 关联平台实体商品
  status      String   @default("active") // active | under_review | removed
  salesCount  Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  blogger     User     @relation(fields: [bloggerId], references: [id])
}

model ContentModerationLog {
  id          String   @id @default(cuid())
  contentType String   // "post" | "comment"
  contentId   String
  action      String   // "auto_block" | "auto_pass" | "manual_approve" | "manual_reject"
  reason      String?
  moderatorId String?
  createdAt   DateTime @default(now())
}
```

### 需要修改的模型

**User 模型 — 新增字段：**
- `bloggerLevel` String? // null | "blogger" | "big_v"
- `bloggerScore` Float? @default(0)
- `bloggerBadge` String?

**CommunityPost 模型 — 新增字段：**
- `bookmarkCount` Int @default(0)
- `hotScore` Float @default(0)
- `moderationStatus` String @default("approved") // pending | approved | rejected
- `reportCount` Int @default(0)

**NotificationType 枚举 — 新增值：**
- `bookmark`
- `reply_mention`
- `blogger_product_sold`
- `content_approved`
- `content_rejected`
- `report_resolved`

---

## 4. 技术决策要点

### 4.1 热门算法实现 (D-12)

```
hot_score = (likes×3 + comments×2 + bookmarks×5 + shares×4) × time_decay
time_decay = 1 / (1 + hours_since_creation / 168)  // 168小时=7天半衰期
```

- 用 Redis 缓存热门帖子列表（TTL 5分钟）
- @Cron 定时任务每 10 分钟重算 hotScore
- 首次计算可用 SQL 批量更新，后续增量更新

### 4.2 博主评分计算 (D-03)

```
composite_score = followers×0.4 + engagement_rate×0.3 + content_count×0.2 + bookmark_rate×0.1
```

- 各维度需归一化到 0-100 分
- 每月 @Cron 重算，7天缓冲期降级
- 评分结果可存 User.bloggerScore 或 Redis 缓存

### 4.3 内容审核流程 (D-11)

```
发帖 → quickCheck(关键词过滤) → 命中? → 拦截+人工审核队列
                                → 未命中 → 直接发布 → 抽样后审(BullMQ异步)
```

- 关键词过滤复用 AISafetyService.quickCheck()
- 抽样比例可配置（默认 10%）
- 审核结果写入 ContentModerationLog

### 4.4 博主商品购买流程 (D-09)

- 复用 PaymentModule 支付流程
- OrderService 需扩展支持 BloggerProduct（当前紧耦合 ClothingItem）
- 佣金计算：平台抽成比例可配置，结算周期 T+7/T+15
- 数字方案购买后即时解锁，实体商品走物流

### 4.5 多图上传

- MulterModule 全局配置需在 CommunityController 覆盖
- 使用 `@FilesInterceptor('images', 9)` 支持最多 9 张图
- 单文件大小限制 10MB，总大小限制 50MB

### 4.6 移动端拖拽排序

- 已有 react-native-gesture-handler + reanimated 3.16.7
- 方案选择：
  - A) 自实现拖拽排序（利用 gesture-handler + reanimated）
  - B) 安装 react-native-draggable-flatlist
- 推荐 A 方案，避免新依赖与 reanimated 版本冲突

### 4.7 移动端图表

- 需安装图表库用于博主数据面板
- 推荐 react-native-svg-charts 或 victory-native（轻量级）
- 需验证与 react-native-svg 15.8.0 兼容性

### 4.8 推送通知

- expo-notifications 未安装
- MVP 阶段可先实现 App 内通知列表（复用 NotificationsScreen）
- 系统推送（APNs/FCM）可延后到 v3

---

## 5. 依赖分析

### Phase 依赖

| 依赖 | 需要的数据/功能 | 当前状态 |
|------|----------------|----------|
| Phase 1（用户画像） | 用户基本信息、风格档案 | 已有 User 模型 + Profile 模块 |
| Phase 2（AI 方案） | 穿搭方案数据用于导入灵感衣橱 | AI 造型师方案数据结构待确认 |
| Phase 3（试衣） | 试衣效果图用于导入灵感衣橱 | TryOn 结果数据结构待确认 |
| Phase 5（电商） | 支付流程、订单系统 | PaymentModule + OrderModule 存在 |

### 技术依赖

| 依赖 | 用途 | 当前状态 |
|------|------|----------|
| Redis | 热门帖子缓存、博主评分缓存 | ✅ 已有 RedisService |
| BullMQ | 异步审核任务 | ✅ 已有 QueueService |
| MinIO | 帖子图片存储 | ✅ 已有 StorageService |
| WebSocket | 实时通知推送 | ✅ 已有 NotificationGateway |
| @nestjs/schedule | 定时任务（热门重算、博主评分） | ✅ 已集成 |

---

## 6. 风险评估

| 风险 | 严重度 | 缓解措施 |
|------|--------|----------|
| OrderService 紧耦合 ClothingItem | 高 | 扩展 OrderService 支持多商品类型，或创建 BloggerOrderService |
| MulterModule 全局单文件配置 | 中 | 在 Controller 层用 @FilesInterceptor 覆盖 |
| 移动端拖拽排序库兼容性 | 中 | 自实现，利用现有 gesture-handler + reanimated |
| 图表库与 react-native-svg 15.8.0 兼容 | 中 | 先验证再安装，备选方案用 SVG 自绘 |
| 博主评分算法准确性 | 低 | MVP 用简单加权公式，后续可迭代优化 |
| 内容审核关键词词库维护 | 低 | MVP 用基础词库 + GLM API 辅助审核 |

---

## 7. Validation Architecture

### Dimension 1: 功能完整性
- SOC-01~SOC-12 每条需求至少有一个测试用例覆盖

### Dimension 2: 数据完整性
- 新增模型有迁移脚本
- 博主评分计算有边界值测试
- 热门分数有时间衰减验证

### Dimension 3: API 契约
- 所有新增端点有 Swagger 文档
- DTO 验证完整（class-validator）
- 错误响应格式统一

### Dimension 4: 性能
- 热门帖子列表有 Redis 缓存（TTL 5min）
- 信息流分页查询有索引支持
- 图片上传有大小限制和格式验证

### Dimension 5: 安全
- 举报内容有权限校验
- 博主商品上架有等级校验
- 管理后台有 AdminGuard

### Dimension 6: 可观测性
- 审核操作有 ContentModerationLog
- 博主评分变更有日志
- 举报处理有状态追踪

### Dimension 7: 兼容性
- 移动端新组件与现有导航兼容
- 后端新模块与现有 Guard/Interceptor 体系兼容
- 管理后台新页面与现有路由兼容

### Dimension 8: 验证策略
- 后端：单元测试（Service 层）+ 集成测试（Controller 层）
- 移动端：组件渲染测试 + 交互测试
- E2E：关键用户流程（发帖→互动→收藏→购买）

---

## RESEARCH COMPLETE
