# Phase 1: 用户画像 & 风格测试 - Context

**Gathered:** 2026-04-13
**Updated:** 2026-04-13 (supplementary deep-dive)
**Status:** Ready for planning

<domain>
## Phase Boundary

新用户注册后完成个人画像建立和风格测试，AI 系统获得精准的用户理解基础。包含：双通道注册、强制基本信息收集、照片上传与体型分析、图片选择式风格测试、可视化画像报告、隐私保护。

**不包含：** AI 造型师对话（Phase 2）、虚拟试衣生成（Phase 3）、推荐信息流（Phase 4）、社区功能（Phase 6）

</domain>

<decisions>
## Implementation Decisions

### 注册与引导
- **D-01:** 双通道注册 — 手机号+验证码（阿里云/腾讯云短信）+ 微信一键登录（微信开放平台）
- **D-02:** 强制基本信息 — 注册后必须填写性别和年龄段，确保 AI 推荐有最低数据基础
- **D-03:** 最短链路引导 — 基本信息（必填）→ 照片上传（可选）→ 风格测试（可选）→ 进入首页；照片和风格测试可跳过但首页持续提示补全

### 照片上传与分析
- **D-04:** 实时参考线引导 — 上传照片时显示人体轮廓参考线 + 姿势提示（"请稍向左"/"请站直"），类似小米证件照引导
- **D-05:** 照片质量检测 — 自动检测清晰度/光线/构图，不合格提示重新上传或自动增强
- **D-06:** 照片加密永久存储 — AES-256-GCM 加密存储在 MinIO，永久保留（用于后续虚拟试衣），用户可手动删除
- **D-07:** 隐私承诺展示 — 上传页面明确标注"仅用于体型分析和试衣效果生成"

### 风格测试
- **D-08:** 图片选择式问卷 — 每题展示 4-6 张穿搭图片，用户点选喜欢的。5-8 题总量，控制完成时间
- **D-09:** 四维度覆盖 — 场合偏好 + 色彩偏好（隐性推导）+ 风格关键词 + 价格区间
- **D-10:** 色彩隐性推导 — 不直接问色彩偏好，从图片选择行为中推导
- **D-15:** 风格测试自动保存进度 — 每选一题自动保存，重新进入从上次位置继续

### 画像展示
- **D-11:** 可视化报告 — 体型分类 + 身体比例可视化 + 肤色分析 + 色彩季型（四型+暖冷×浅深细分）+ 个性化穿搭建议摘要
- **D-12:** 分享海报 — 画像结果支持生成可分享的海报图片，增强仪式感和社交传播

### 数据架构
- **D-13:** 伴随式画像构建 — 用户行为数据（浏览/收藏/试衣/购买/AI对话）持续优化画像
- **D-14:** 画像数据同步 — UserProfile/StyleProfile 变更后自动通知 AI 造型师和推荐引擎

### Claude's Discretion
- 手机验证码具体服务商选择（阿里云 vs 腾讯云短信）
- 参考线引导的具体 UI 实现（Canvas overlay vs 原生组件）
- 图片选择式问卷的图片素材来源和分类
- 可视化报告的具体 UI 布局和图表类型
- 分享海报的模板设计

</decisions>

<cross_cutting_decisions>
## Cross-Cutting Decisions (Supplementary Deep-Dive 2026-04-13)

> These decisions apply across ALL phases. Downstream agents MUST read this section.

### 数据模型策略
- **CC-01:** 一次性补齐所有 8 个 Phase 需要的新增数据模型 — 包括 StyleQuiz/QuizQuestion/QuizAnswer/StyleQuizResult、WardrobeCollection、ConsultantProfile、ServiceBooking、ChatMessage/ChatRoom、ShareTemplate 等。前期工作量集中但后续不阻塞。

### 订阅/会员体系
- **CC-02:** MVP 全免费 — Phase 1-4 所有功能免费使用，Phase 5（电商）后再引入付费
- **CC-03:** 付费档位设计为两档：免费 + Pro — Pro 月费约 29-49 元，解锁无限 AI 和试衣。后续 Phase 启用时实现

### AI 成本与配额管理
- **CC-04:** 用户维度限制 — 每用户每日 AI 造型师 10 次、虚拟试衣 3 次
- **CC-05:** 超限提示 — 显示"今日 AI 额度已用完" + 倒计时 + 升级 Pro 引导
- **CC-06:** 全局预算熔断 — 设平台每日总预算，超预算降级到静态参考方案
- **CC-07:** AI 宕机降级 — 显示降级提示 + 预设穿搭参考作为临时方案

### API 设计规范
- **CC-08:** URL Path 版本化 — `/api/v1/` 前缀，NestJS 标准做法
- **CC-09:** JSON:API 规范式响应格式 — 遵循 JSON:API 标准，统一 data/included/errors/meta 结构
- **CC-10:** Cursor 分页 — 所有列表端点统一使用 cursor-based 分页（适合无限滚动场景）

### 移动端 UX 规范
- **CC-11:** 引导式空状态 — 每个空状态有图标 + 文案 + 行动按钮，引导用户去做某事
- **CC-12:** 骨架屏加载 — 列表页统一使用骨架屏模拟内容结构
- **CC-13:** MVP 只做浅色模式 — 深色模式后续补充
- **CC-14:** 简单网络错误提示 — 展示"网络不给力" + 重试按钮，不做离线缓存
- **CC-15:** 渐进式图片加载 — 先加载缩略图再渐进加载高清图，需后端支持多尺寸图片
- **CC-16:** FlashList 瀑布流 — Shopify 出品的高性能列表组件，用于信息流和社区
- **CC-17:** 基本无障碍合规 — accessibilityLabel 等基本属性，满足 App Store 上架要求
- **CC-18:** 统一重试机制 — 每个可操作操作都有重试按钮，网络错误自动重试 1-2 次

### 安全
- **CC-19:** 选择性字段加密 — 加密手机号、真实姓名、身份证号；不加密邮箱、性别、年龄段
- **CC-20:** HashiCorp Vault 密钥管理 — 自建 Vault 管理 AES-256-GCM 密钥，自动轮换
- **CC-21:** 移动端安全全量 — SSL Pinning + 安全存储（expo-secure-store）+ 防篡改检测 + 越狱/Root 检测
- **CC-22:** AI 内容审核 — 关键词过滤 + 抽样人工审核。MVP 阶段不做实时 GLM 安全审核（节省成本）

### 测试策略
- **CC-23:** TDD 严格模式，90%+ 覆盖率目标 — 核心模块必须先写测试再写代码
- **CC-24:** Detox — React Native E2E 测试框架
- **CC-25:** 录制/回放 AI Mock — 录制真实 GLM/Doubao 响应存为 fixture，测试时回放
- **CC-26:** 负载测试目标 1000 并发用户、500 QPS — 用 k6 或 Artillery 压测

### Admin 管理后台
- **CC-27:** 独立 Admin Web — React + Ant Design，monorepo 内新增 apps/admin
- **CC-28:** Admin MVP 功能 — 用户管理 + 风格测试题库管理 + 商家与商品管理 + 内容与社区管理

### 埋点与分析
- **CC-29:** 全量埋点 — 所有用户操作（点击、滚动、停留、分享等）50+ 事件。存储使用 UserBehaviorEvent 模型

### Feature Flag
- **CC-30:** Feature Flag 系统 — 用 Unleash 或自建简单 flag 表，支持灰度发布和推荐算法 A/B 测试

### 监控与可观测性
- **CC-31:** 完整可观测性 — Grafana + Prometheus + Loki（日志）+ AlertManager。设关键阈值告警（错误率>5%、AI 调用失败>10%、P99>3s）

### 业务规则 — 电商
- **CC-32:** 商家佣金阶梯式 — 月销售额 <5万抽 5%，5-20万抽 10%，>20万抽 15%
- **CC-33:** 博主商品同商家佣金结构
- **CC-34:** 退款策略 — 仅质量问题可退款，需用户提供图片证据

### 业务规则 — 定制服务
- **CC-35:** 自动报价 — 基础成本 + 人工费 + 平台服务费（20%）

### 业务规则 — 私人顾问
- **CC-36:** 平台抽成 15-20%
- **CC-37:** 分阶段付款 — 30% 定金 + 70% 尾款
- **CC-38:** 顾问取消规则 — 提前 24h 取消免费，24h 内取消扣定金 20% 给用户补偿

### 边界条件
- **CC-39:** 支付对账 — 对账任务（每小时）+ 主动查询支付平台状态 + Redis 分布式锁
- **CC-40:** 举报处理 — 累积 3 次举报后隐藏内容 + AI 初审 + 人工复核
- **CC-41:** 商家违规三级处罚 — 1次警告，2次下架7天，3次封店
- **CC-42:** 风格测试中断恢复 — 每题自动保存进度，重新进入从上次位置继续

### 推荐引擎
- **CC-43:** 季节性推荐 — 天气驱动 + 季节标签，根据用户所在地实时天气调整推荐权重
- **CC-44:** 趋势时间衰减 — 7天权重最高，超过30天逐步衰减的衰减函数

### 基础设施
- **CC-45:** 完善 GitHub Actions — PR 自动测试 + merge 自动部署（dev/staging/production 三环境）
- **CC-46:** 三环境分离 — dev（本地）→ staging（测试）→ production（正式），独立 .env 配置
- **CC-47:** 结构化 JSON 日志 — Winston/Pino，格式：timestamp + level + service + traceId + message + meta
- **CC-48:** 云厂商自动备份 — 每日全量 + 每小时增量（WAL），保留 30 天

</cross_cutting_decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 数据模型
- `apps/backend/prisma/schema.prisma` — UserProfile, UserPhoto, StyleProfile, UserBehavior 模型定义（1464行，45个模型）
- **需要新增的模型**：StyleQuiz, QuizQuestion, QuizAnswer, StyleQuizResult, WardrobeCollection, ShareTemplate, ConsultantProfile, ServiceBooking, ChatRoom, ChatMessage 等

### 后端模块
- `apps/backend/src/modules/auth/` — 已实现的双通道认证（JWT + refresh token）
- `apps/backend/src/modules/profile/` — 已实现的体型分析（5种体型 + BMI/腰臀比 + 色彩季型）
- `apps/backend/src/modules/photos/` — 已实现的照片上传（EXIF stripping + 加密存储 + AI 分析）
- `apps/backend/src/modules/style-profiles/` — 已实现的风格档案（行为学习 + 关键词/调色板）
- `apps/backend/src/modules/privacy/` — 已实现的隐私合规（GDPR/PIPL + 数据导出/删除）
- `apps/backend/src/modules/subscription/` — 已实现的订阅系统（MembershipPlan + UserSubscription + guards）
- `apps/backend/src/modules/ai-stylist/` — 已实现的 AI 造型师
- `apps/backend/src/modules/community/` — 已实现的社区模块
- `apps/backend/src/modules/customization/` — 已实现的定制服务
- `apps/backend/src/modules/payment/` — 已实现的支付（支付宝 + 微信）
- `apps/backend/src/modules/recommendations/` — 已实现的推荐引擎
- `apps/backend/src/modules/search/` — 已实现的搜索模块

### ML 服务
- `ml/services/body_analyzer.py` — MediaPipe 33关键点 + 体型分类 + 色彩季型匹配
- `ml/services/intelligent_stylist_service.py` — GLM API 调用封装

### 移动端
- `apps/mobile/src/screens/OnboardingScreen.tsx` — 已有的新用户引导页
- `apps/mobile/src/screens/ProfileScreen.tsx` — 已有的个人资料页
- `apps/mobile/src/screens/RegisterScreen.tsx` — 已有的注册页
- `apps/mobile/src/screens/LoginScreen.tsx` — 已有的登录页
- `apps/mobile/src/screens/SubscriptionScreen.tsx` — 已有的订阅页
- `apps/mobile/src/navigation/` — 导航结构（底部5 tab + 懒加载）

### 项目文档
- `.planning/REQUIREMENTS.md` — 完整需求列表（92 条）
- `.planning/PROJECT.md` — 项目架构决策和技术栈
- `.planning/phases/01-user-profile-style-test/01-DISCUSSION-LOG.md` — 讨论审计日志

### CI/CD
- `.github/workflows/` — 6 个 GitHub Actions workflow（build, test, deploy, ci, code-quality, build-android）
- `docker-compose.yml` / `docker-compose.dev.yml` — Docker 编排
- `apps/backend/Dockerfile` — 后端容器化

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Auth 模块**: 完整的 JWT 认证（access + refresh token rotation + bcrypt），可直接扩展微信登录
- **Profile 模块**: 完整的体型分析引擎（5种体型分类 + BMI + 腰臀比 + 色彩季型分析指导），无需重写
- **Photos 模块**: 完整的安全上传管道（EXIF stripping + 恶意软件扫描 + AES 加密 + MinIO 存储 + 异步 AI 分析 + 重试），可直接复用
- **Style-Profiles 模块**: 行为学习驱动的风格档案（关键词/调色板/置信度评分），已实现
- **Privacy 模块**: GDPR/PIPL 合规（同意记录/数据导出/删除请求/审计日志），可直接使用
- **Subscription 模块**: 完整的订阅系统（MembershipPlan + UserSubscription + guards/decorators），MVP 全免费但基础设施就绪
- **Community 模块**: 完整的社区功能（帖子/评论/点赞/关注/趋势），Schema 有 CommunityPost + CommunityPostItem
- **OnboardingScreen**: 已有的引导页，可扩展为多步骤引导流程
- **body_analyzer.py**: MediaPipe 33关键点提取 + 体型比例计算 + 体型分类 + 适配建议

### Schema 现状 (45 models)
完整模型列表：User, UserProfile, UserBehavior, RankingFeedback, SystemConfig, StyleProfile, UserPhoto, Brand, ClothingItem, Favorite, VirtualTryOn, CustomizationRequest, CustomizationQuote, StyleRecommendation, SearchHistory, AIAnalysisCache, UserBehaviorEvent, UserPreferenceWeight, UserSession, AiStylistSession, UserDecision, MembershipPlan, UserSubscription, PaymentOrder, Notification, UserNotificationSetting, UserConsent, DataExportRequest, DataDeletionRequest, BrandMerchant, BrandSettlement, ProductSalesStats, PaymentRecord, RefundRecord, CartItem, Order, OrderItem, OrderAddress, UserAddress, UserClothing, Outfit, OutfitItem, CommunityPost, CommunityPostItem, PostLike, PostComment, UserFollow, RefreshToken, AuditLog

### 缺失的模型（需一次性补齐）
- Phase 1: StyleQuiz, QuizQuestion, QuizAnswer, StyleQuizResult, ShareTemplate
- Phase 6: WardrobeCollection, WardrobeCollectionItem
- Phase 8: ConsultantProfile, ServiceBooking, ChatRoom, ChatMessage

### Established Patterns
- **Zustand + TanStack Query**: 移动端状态管理（auth store 已有）
- **NestJS Guards/Interceptors**: 后端认证/限流/日志模式
- **Redis 缓存**: 带 typed key builder 的缓存基础设施
- **BullMQ 队列**: 异步任务处理（body analysis, photo processing）
- **Prometheus metrics**: 跨所有业务域的指标收集

### Integration Points
- Auth 模块 → 扩展微信 OAuth2.0 登录
- Profile 模块 → 新增实时参考线引导的前端交互
- Photos 模块 → 新增质量检测前置校验 + 多尺寸图片生成
- Style-Profiles 模块 → 新增图片选择式风格测试入口 + 风格测试数据存储
- OnboardingScreen → 重构为多步骤引导流程（基本信息 → 照片 → 风格测试）
- Subscription 模块 → MVP 全免费，但 AI 配额限制通过 subscription guards 实现
- Prisma Schema → 一次性新增所有缺失模型

</code_context>

<specifics>
## Specific Ideas

- 拍照引导参考小米证件照的实时参考线体验
- 风格测试参考 Stitch Fix 和 WEAR 的图片选择式问卷
- 色彩季型四型系统（春夏秋冬）+ 暖冷×浅深细分维度
- 画像可视化报告支持生成分享海报，类似"你的时尚人格测试报告"
- 首页"完善画像解锁个性化推荐"的提示机制，引导用户补全数据
- Admin 后台用 React + Ant Design，monorepo 内新增 apps/admin
- FlashList 替代 FlatList 实现高性能瀑布流
- 结构化 JSON 日志统一格式：timestamp + level + service + traceId + message + meta
- Feature Flag 系统支持灰度发布和推荐算法 A/B 测试
- Vault 密钥管理支持自动轮换

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---
*Phase: 01-user-profile-style-test*
*Context gathered: 2026-04-13*
*Supplementary deep-dive: 2026-04-13*
