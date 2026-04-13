# Phase 6: 社区 & 博主生态 - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

建立穿搭内容社区，支持博主入驻和商品销售，形成内容-电商闭环。包含：
- 穿搭内容社区（发帖/信息流/互动/关注）
- 博主自然分化与等级权益
- 博主商品认证和上架（数字方案 + 关联实体）
- 灵感衣橱（一键导入 + 自定义分类 + 拖拽排序）
- 博主数据面板
- 内容审核与热门趋势
- 举报机制

已有骨架：CommunityModule（662行 service + controller + DTOs）、WardrobeCollectionModule（完整 CRUD + 批量 + 排序）、Prisma 模型（CommunityPost/PostLike/PostComment/UserFollow/WardrobeCollection）、移动端 CommunityScreen（529行）+ community.api.ts（437行）+ WaterfallFeed 组件。

**不包含：** AI 造型师对话（Phase 2）、虚拟试衣（Phase 3）、推荐引擎（Phase 4）、电商购买流程（Phase 5）、定制服务（Phase 7）、私人顾问（Phase 8）

</domain>

<decisions>
## Implementation Decisions

### 博主等级与权益
- **D-01:** 综合评分自动升级 — 粉丝数 + 内容质量分综合评估，无需申请
- **D-02:** 两档等级 — 博主 + 大V
- **D-03:** 四维度加权评分 — 粉丝数 40% + 互动率（点赞+评论+收藏/浏览量）30% + 内容数量 20% + 收藏率 10%
- **D-04:** 低门槛升级 — 博主：综合分≥60 且粉丝≥500；大V：综合分≥80 且粉丝≥5000
- **D-05:** 分层权益 — 博主：可上架商品 + 数据面板 + 博主标识；大V：额外首页推荐位 + 优先审核 + 专属客服
- **D-06:** 定期重算 + 缓冲期降级 — 每月重新计算评分，不达标自动降级，给 7 天缓冲期

### 博主商品上架流程
- **D-07:** 双类型商品 — 博主可上架数字穿搭方案（1-99 元自由定价），也可关联平台实体商品（取原价）
- **D-08:** 先上后审 — 博主提交后立即上架，平台事后抽审
- **D-09:** 社区内闭环购买 — 复用 Phase 5 支付和订单系统，用户在社区内完成购买
- **D-10:** 融入内容场景展示 — 博主主页展示"TA 的方案"tab，帖子详情页显示"购买此方案"按钮

### 内容审核与热门机制
- **D-11:** 关键词前置 + 抽样后审 — 发帖时先过关键词过滤，命中则拦截需人工审核；未命中则直接发布，平台事后抽样审核
- **D-12:** 互动加权 + 时间衰减热门算法 — 点赞×3 + 评论×2 + 收藏×5 + 分享×4，乘以时间衰减因子（7 天内权重最高）
- **D-13:** 热门趋势展示 — 帖子排行 + 上升最快的标签/风格趋势
- **D-14:** 举报流程 — 确认 CC-40：累积 3 次举报后隐藏内容 + AI 初审 + 人工复核

### 灵感衣橱导入与数据面板
- **D-15:** 可选单品导入 — 导入时用户可选择导入整个方案或勾选单品
- **D-16:** 核心指标 + 趋势图数据面板 — 浏览量趋势 + 点赞/收藏/评论数 + 粉丝增长 + 方案转化率，7 天/30 天切换
- **D-17:** 全员基础 + 博主增强 — 所有用户看基础数据（浏览量/点赞/收藏），博主额外看转化率和粉丝增长
- **D-18:** 全来源导入 — 社区帖子 + AI 造型师方案 + 虚拟试衣效果图均可导入灵感衣橱

### 发帖流程细节
- **D-19:** 本地草稿保存 — AsyncStorage 存储，退出编辑自动保存，下次进入恢复
- **D-20:** 关联平台商品标注 — 发帖时从平台商品库搜索选择单品，关联到帖子（复用 CommunityPostItem 模型）

### 收藏与关注信息流
- **D-21:** 新增 PostBookmark 模型 — userId + postId，与 PostLike 分离
- **D-22:** 关注 tab 纯时间倒序 — 后端已有 getFollowingPosts API
- **D-23:** 收藏即归档 — 收藏帖子时弹出选择保存到灵感衣橱的哪个分类，一步完成收藏+归档
- **D-24:** 关注 tab 展示帖子 + 其他动态 — 关注用户的帖子 + 点赞/试衣等动态
- **D-25:** 关注数无上限
- **D-26:** 静默取关 — 取关后对方不知晓，粉丝数实时减少

### 互动通知机制
- **D-27:** 5 类核心通知 — 点赞/评论/收藏/关注/回复@你
- **D-28:** App 内通知列表 + 系统推送 — App 内通知列表页 + APNs/FCM 系统推送
- **D-29:** 智能合并 — 同一帖子的多个点赞合并为"小明等 5 人赞了你的帖子"

### 评论回复结构
- **D-30:** 一级回复 — 只支持对顶级评论的回复，不支持回复的回复
- **D-31:** 折叠展示 — 顶级评论平铺，回复折叠在评论下方（点击展开），类似微博/小红书

### Claude's Discretion
- 综合评分的具体计算公式和归一化方法
- 博主标识的 UI 设计（badge/icon）
- 数据面板的具体图表类型和布局
- 热门趋势的更新频率
- 关键词过滤的词库来源和维护
- 系统推送的具体实现（APNs/FCM 集成）
- 通知合并的时间窗口和策略

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Backend Community Module
- `apps/backend/src/modules/community/community.service.ts` — 核心服务（662行），createPost/getPosts/getFollowingPosts/getRecommendedPosts/getPostById/likePost/createComment/followUser
- `apps/backend/src/modules/community/community.controller.ts` — REST API 端点（183行）
- `apps/backend/src/modules/community/community.module.ts` — 模块注册
- `apps/backend/src/modules/community/dto/community.dto.ts` — DTOs（PostCategory enum, PostSortBy enum, CreatePostDto, UpdatePostDto, PostQueryDto, CreateCommentDto, CommentQueryDto）

### Backend Wardrobe Collection Module
- `apps/backend/src/modules/wardrobe-collection/wardrobe-collection.controller.ts` — 完整 CRUD + 批量 + 排序 API
- `apps/backend/src/modules/wardrobe-collection/wardrobe-collection.service.ts` — 灵感衣橱服务
- `apps/backend/src/modules/wardrobe-collection/dto/wardrobe-collection.dto.ts` — DTOs

### Database Schema
- `apps/backend/prisma/schema.prisma` — CommunityPost/CommunityPostItem/PostLike/PostComment/UserFollow/WardrobeCollection/WardrobeCollectionItem 模型定义

### Mobile
- `apps/mobile/src/screens/CommunityScreen.tsx` — 社区页面（529行），含分类切换、瀑布流、动画
- `apps/mobile/src/services/api/community.api.ts` — 社区 API 客户端（437行）
- `apps/mobile/src/components/community/WaterfallFeed.tsx` — 瀑布流组件

### Seed Data
- `apps/backend/prisma/seeds/community.seed.ts` — 社区种子数据（305行，含丰富中文内容）

### Related Backend Modules
- `apps/backend/src/modules/payment/` — 支付模块（博主商品购买复用）
- `apps/backend/src/modules/notifications/` — 通知模块（已有 Notification/UserNotificationSetting 模型）
- `apps/backend/src/modules/queue/` — BullMQ 队列（异步审核任务）

### Cross-Cutting Decisions
- `.planning/phases/01-user-profile-style-test/01-CONTEXT.md` — CC-16(FlashList)/CC-11(空状态)/CC-12(骨架屏)/CC-22(审核)/CC-33(佣金)/CC-40(举报) 等跨阶段决策

### Project Docs
- `.planning/REQUIREMENTS.md` — SOC-01 ~ SOC-12 需求定义
- `.planning/PROJECT.md` — 项目架构和技术栈

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **CommunityModule**: 完整的帖子 CRUD + 点赞 + 评论 + 关注，已有 662 行 service 和 183 行 controller
- **WardrobeCollectionModule**: 完整的灵感衣橱 CRUD + 批量添加 + 拖拽排序，可直接复用
- **CommunityScreen**: 529 行移动端社区页面，含分类切换、瀑布流、动画
- **community.api.ts**: 437 行 API 客户端，含类型定义和接口封装
- **WaterfallFeed**: 瀑布流组件，双列布局
- **PaymentModule**: 支付模块（支付宝+微信），博主商品购买可复用
- **Notification model**: 已有 Notification/UserNotificationSetting 模型
- **BullMQ QueueService**: 异步任务处理，可用于审核任务

### Schema 现状
已有模型：CommunityPost（含 images[]/tags[]/category/viewCount/likeCount/commentCount/shareCount/isFeatured）、CommunityPostItem（postId+itemId 关联）、PostLike（userId+postId）、PostComment（含 parentId 支持嵌套、images[]）、UserFollow（followerId+followingId）、WardrobeCollection（name/icon/coverImage/sortOrder/isDefault）、WardrobeCollectionItem（itemType enum/itemId/sortOrder）

### 需要新增的模型
- PostBookmark（userId + postId）— 帖子收藏
- BloggerProduct / BloggerScheme — 博主商品/方案
- ContentReport — 举报记录
- BloggerScore — 博主综合评分（可选，也可用 Redis 缓存）
- ContentModerationLog — 审核日志

### Established Patterns
- **Zustand + TanStack Query**: 移动端状态管理
- **NestJS Guards/Interceptors**: 后端认证/限流/日志
- **Redis 缓存**: 带 typed key builder
- **BullMQ 队列**: 异步任务处理
- **Prisma Middleware**: PII 自动加密

### Integration Points
- CommunityModule → 扩展博主等级/商品/审核功能
- WardrobeCollectionModule → 扩展一键导入（从帖子/AI方案/试衣结果）
- PaymentModule → 博主商品购买复用支付流程
- NotificationModule → 社区互动通知
- QueueService → 异步审核任务
- User model → 扩展 bloggerLevel/bloggerScore 字段

</code_context>

<specifics>
## Specific Ideas

- 博主等级标识：在头像旁显示博主/大V badge
- 收藏即归档：收藏帖子时弹出底部 sheet 选择灵感衣橱分类
- 热门趋势：展示"本周流行：法式风↑""热门标签：OOTD"等标签趋势卡片
- 数据面板：7天/30天切换的趋势图，核心指标卡片
- 关注 tab：帖子流 + 夹杂"XX 赞了某帖子""XX 试穿了某服装"动态卡片
- 评论折叠：默认显示前 2 条回复，点击"查看更多回复"展开
- 博主商品：帖子详情页底部"购买此方案"按钮，点击弹出方案详情+购买

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-community-blogger-ecosystem*
*Context gathered: 2026-04-14*
