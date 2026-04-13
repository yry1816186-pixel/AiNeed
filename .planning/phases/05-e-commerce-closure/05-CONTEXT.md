# Phase 05: e-commerce-closure - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

用户从推荐/试衣直接进入购买流程，支持自营和合作商家。交付完整电商闭环：商品浏览与搜索 → 购物车 → 支付 → 订单管理 → 商家体系，含 AI 尺码推荐和基础促销。

Requirements: COMM-01 ~ COMM-11 (11 条)
Depends on: Phase 3（试衣引导购买）, Phase 4（推荐引导发现）

</domain>

<decisions>
## Implementation Decisions

### 商品详情页体验
- **D-01:** 经典轮播式布局 — 顶部图片轮播（可左右滑动），下方价格/尺码/颜色/描述/搭配推荐，底部固定购买栏。类似淘宝/京东标准电商页
- **D-02:** 虚拟试衣入口放在底部购买栏并排 — 购买按钮旁边加"虚拟试衣"按钮，用户一眼可见
- **D-03:** 搭配推荐用横向滑动卡片 — 商品描述下方展示 3-5 套搭配方案，每套含上装+下装+鞋子，紧凑不占空间

### AI 智能尺码推荐
- **D-04:** 多源融合推荐逻辑 — 体型数据匹配 + 用户历史购买尺码 + 退换货记录综合判断，MVP 阶段以体型匹配为主，历史数据作为加分项
- **D-05:** 尺码旁标签展示 — AI 推荐的尺码旁显示"AI推荐"标签，点击可查看推荐理由，不改变现有选择流程
- **D-06:** 无体型数据时隐藏 AI 推荐 — 不显示 AI 推荐区域，只展示普通尺码表

### 促销体系范围
- **D-07:** 最小可行促销范围 — 仅实现首单自动优惠 + 优惠码系统，不做满减/秒杀/组合优惠
- **D-08:** 优惠码支持适用范围 — 基础规则（折扣类型/有效期/使用次数限制/每人限制）+ 最低消费门槛 + 指定品类/商品适用范围

### 商家审核 & 库存通知
- **D-09:** 自动初筛+人工终审 — 商家提交申请时自动校验基础信息（营业执照格式/联系方式），通过后进入人工审核队列
- **D-10:** 内部通知+用户可订阅到货通知 — 库存低于阈值时内部通知，缺货商品用户可订阅到货通知（App 内推送）
- **D-11:** 商家后台 API 驱动 — 复用现有 Merchant API 管理商品和订单，管理员通过 Admin API 审核商家

### 购物车交互细节
- **D-12:** 购物车空状态展示推荐商品 — 空购物车显示空状态图标+文案+"去逛逛"按钮，下方展示"猜你喜欢"推荐商品引导继续浏览
- **D-13:** 行内弹出选择器修改尺码颜色 — 点击商品卡片上的尺码/颜色文字弹出选择器，不跳转页面，类似淘宝
- **D-14:** 编辑模式含批量操作 — 顶部"编辑"按钮切换编辑模式，支持批量删除、移入收藏等操作；非编辑模式为标准全选/结算

### 支付 & 订单流程
- **D-15:** 双按钮直跳支付 — 结算页底部直接显示支付宝和微信支付两个按钮，点击跳转对应支付，最快路径
- **D-16:** 轮询等待页 — 支付跳转后显示等待页，每 2 秒轮询支付状态，成功后自动跳转订单详情
- **D-17:** 退款+退货退款两种类型 — 支持"仅退款"和"退货退款"两种申请类型，退货退款需填写物流单号，商家确认收货后退款
- **D-18:** 垂直时间线展示订单状态 — 订单详情页显示垂直时间线（待支付→已支付→已发货→已完成），每个节点显示时间和状态描述

### 搜索体验细节
- **D-19:** 相机图标入口 — 搜索栏右侧相机图标，点击弹出"拍照/相册"选择，上传后显示图片搜索结果
- **D-20:** 横向滚动标签筛选 — 搜索结果页顶部横向滚动标签（价格/品牌/颜色/尺码/风格），点击展开筛选选项
- **D-21:** 综合/价格/销量排序 — 默认综合排序 + 价格升/降 + 销量排序，3 种排序覆盖主要场景

### 商品分类导航
- **D-22:** 横向滚动图标导航 — 探索页顶部横向滚动图标（每个分类一个图标+文字），点击后下方显示子分类
- **D-23:** 二级子分类 — 主分类 → 子分类 → 细分类三级导航，例如"上装"→"T恤"→"短袖/长袖"

### Claude's Discretion
- 商品页图片轮播的具体交互细节（指示器样式/自动播放等）
- 优惠码生成算法和编码规则
- 库存阈值的具体数值配置
- 到货通知的推送频率和去重策略
- 购物车推荐商品的推荐逻辑和数量
- 退货退款的商家确认收货超时自动退款机制
- 图片搜索的结果展示布局（网格 vs 列表）
- 二级子分类的数据结构和 Prisma 模型设计

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Backend Modules (Existing - Must Understand Before Modifying)
- `apps/backend/src/modules/cart/cart.service.ts` — 完整购物车服务（增删改查/全选/汇总）
- `apps/backend/src/modules/order/order.service.ts` — 完整订单服务（创建/支付/取消/确认/物流/软删除）
- `apps/backend/src/modules/payment/payment.service.ts` — 支付服务（支付宝+微信/回调/退款/幂等/超时关闭）
- `apps/backend/src/modules/payment/providers/alipay.provider.ts` — 支付宝 Provider
- `apps/backend/src/modules/payment/providers/wechat.provider.ts` — 微信 Provider
- `apps/backend/src/modules/merchant/merchant.service.ts` — 商家服务（入驻/登录/商品CRUD/数据看板/趋势/受众分析）
- `apps/backend/src/modules/search/search.service.ts` — 搜索服务（文字搜索/图片搜索/建议）
- `apps/backend/src/modules/search/services/visual-search.service.ts` — 视觉搜索
- `apps/backend/src/modules/search/services/ai-image.service.ts` — AI 图片搜索
- `apps/backend/src/modules/clothing/clothing.service.ts` — 服装服务（列表/详情/分类）
- `apps/backend/src/modules/address/address.service.ts` — 地址管理
- `apps/backend/src/modules/favorites/favorites.service.ts` — 收藏服务
- `apps/backend/src/modules/brands/brands.service.ts` — 品牌服务
- `apps/backend/prisma/schema.prisma` — 数据模型（Brand/ClothingItem/BrandMerchant/BrandSettlement/CartItem/Order/OrderItem/OrderAddress/PaymentRecord/RefundRecord/UserAddress）

### Mobile Screens (Existing - Must Understand Before Modifying)
- `apps/mobile/src/screens/ClothingDetailScreen.tsx` — 商品详情页（需增强）
- `apps/mobile/src/screens/CartScreen.tsx` — 购物车页
- `apps/mobile/src/screens/CheckoutScreen.tsx` — 结算页
- `apps/mobile/src/screens/OrdersScreen.tsx` — 订单列表
- `apps/mobile/src/screens/OrderDetailScreen.tsx` — 订单详情
- `apps/mobile/src/screens/SearchScreen.tsx` — 搜索页
- `apps/mobile/src/screens/FavoritesScreen.tsx` — 收藏页

### Mobile API Layer (Existing)
- `apps/mobile/src/services/api/commerce.api.ts` — 完整电商 API 层（cart/order/address/favorites/search）

### Requirements
- `.planning/REQUIREMENTS.md` §Phase 5 — COMM-01 ~ COMM-11 需求定义
- `.planning/ROADMAP.md` §Phase 5 — 成功标准

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **CartService**: 完整购物车 CRUD + 全选/汇总，直接可用
- **OrderService**: 完整订单生命周期（创建/支付/取消/确认/物流/软删除/库存扣减/库存恢复），直接可用
- **PaymentService**: 支付宝+微信双通道支付 + 回调验证 + 退款 + 幂等保护 + 超时自动关闭，直接可用
- **MerchantService**: 商家入驻/登录/商品管理/数据看板/趋势/受众分析，需增加审核流程
- **SearchService**: 文字搜索 + 图片搜索（ML + 属性降级）+ 搜索建议，直接可用
- **commerce.api.ts**: 完整移动端 API 层（cart/order/address/favorites/search + 数据归一化），直接可用

### Established Patterns
- **Prisma ORM**: 所有数据访问通过 PrismaService，事务用 `$transaction`
- **事件驱动**: PaymentService 使用 EventEmitter2 解耦（PAYMENT_EVENTS），新功能应遵循
- **数据归一化**: commerce.api.ts 中 normalize* 函数处理后端→前端数据转换
- **支付 Provider 模式**: PaymentProviderInterface 抽象，AlipayProvider/WechatProvider 实现
- **缓存**: CacheService + CacheKeyBuilder 模式
- **队列**: BullMQ + QueueService 处理异步任务

### Integration Points
- **商品详情页 → 虚拟试衣**: ClothingDetailScreen 需添加试衣入口，调用 tryon.api.ts
- **商品详情页 → 搭配推荐**: 需调用 recommendations API 获取搭配方案
- **购物车 → 结算 → 支付**: CartScreen → CheckoutScreen → PaymentService 完整链路已存在
- **订单 → 支付回调**: OrderService.pay() → PaymentService.createPayment() → callback → OrderService.updateOrderStatus()
- **商家入驻 → 审核**: MerchantService.applyForMerchant() 需增加审核状态和审核流程
- **库存 → 通知**: OrderService 已有库存扣减，需增加低库存检测和通知触发

### New Models Needed
- **Coupon/Promotion**: Prisma schema 需新增 Coupon 和 Promotion 模型
- **StockNotification**: 用户订阅缺货到货通知需新增模型
- **MerchantReview/BrandVerification**: 商家审核流程需扩展 Brand 或 BrandMerchant 模型
- **RefundRequest**: 退货退款申请模型（类型/物流单号/商家确认/超时自动退款）
- **Subcategory**: 二级子分类模型（主分类→子分类→细分类）

</code_context>

<specifics>
## Specific Ideas

- 商品页底部购买栏参考淘宝/京东标准电商页：左侧收藏+试衣，右侧立即购买/加入购物车
- AI 尺码推荐标签样式：绿色"AI推荐"标签，点击展开推荐理由（体型匹配度+历史尺码参考）
- 优惠码编码：前缀区分类型（FIRST=首单，PROMO=通用），8位随机字符
- 商家自动初筛：校验营业执照号格式、手机号有效性、品牌名唯一性
- 购物车推荐商品：空状态时展示 4-6 个"猜你喜欢"商品，基于用户画像推荐
- 支付轮询：每 2 秒查询一次，最多轮询 60 次（2 分钟），超时提示用户手动查看
- 退货退款流程：用户申请 → 商家审核 → 用户填写物流单号 → 商家确认收货 → 退款到原支付方式
- 分类图标：8 大分类使用统一风格线性图标，横向可滑动

</specifics>

<deferred>
## Deferred Ideas

- **独立 Web 商家后台** — REQUIREMENTS.md 明确标记为 v3，Phase 5 先用 API 驱动方式
- **满减/秒杀/组合优惠** — 复杂促销规则，v3 功能
- **商家独立结算系统** — 当前 MerchantService 有 getSettlements 但缺完整结算流程，后续完善

</deferred>

---

*Phase: 05-e-commerce-closure*
*Context gathered: 2026-04-14*
