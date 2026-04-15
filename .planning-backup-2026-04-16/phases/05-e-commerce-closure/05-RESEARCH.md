# Phase 05: e-commerce-closure - Research

**Researched:** 2026-04-14
**Status:** Complete

## Executive Summary

Phase 5 电商闭环的核心挑战是：**后端服务骨架完整但缺少关键业务逻辑**，移动端页面有框架但功能不完整。11 条需求中，约 40% 需要新建功能（优惠券、退款流程、到货通知），60% 需要增强现有模块（支付接入、商家审核、订单操作补全）。

## 1. Backend Services Analysis

### CartService — 基本完整，缺少促销和库存校验

**现有能力**: 完整购物车 CRUD + 全选/汇总，重复商品合并，并发安全 (FIX-BL-009)

**关键差距**:
- 无优惠券/折扣计算 — `getCartSummary` 只算原价，没有 discountAmount
- 无库存实时校验 — addItem 只检查 isActive，不检查 stock
- 无价格变动检测 — 商品加入购物车后价格可能变化，无提醒机制
- 无失效商品自动清理 — 下架商品仍在购物车中
- 无凑单提示 — 免运费门槛(99元)无进度提示

### OrderService — 生命周期完整，缺少退款和促销

**现有能力**: 完整订单生命周期（创建/支付/取消/确认/物流/软删除/库存扣减/库存恢复），事务保证

**关键差距**:
- 无优惠券/促销应用 — `discountAmount` 硬编码为 0
- 无退款申请流程 — cancel 只支持整单退款，无部分退款/退货退款
- 无退款记录关联 — 取消退款不创建 RefundRequest，直接调用 PaymentService.refund
- 无自动确认收货 — 缺少发货N天后自动确认的定时任务
- 物流信息简陋 — getTracking 只返回订单状态时间线，无真实物流API对接
- 无订单评价

### PaymentService — 双通道支付完整，前端未接入

**现有能力**: 支付宝+微信双通道支付 + 回调验证 + 退款 + 幂等保护 + 超时自动关闭

**关键模式**:
- Provider 模式：`Map<PaymentProvider, PaymentProviderInterface>` 支持多支付渠道
- Redis 分布式锁 + Lua 脚本原子释放，防回调重复处理
- EventEmitter2 事件驱动解耦：`PAYMENT_SUCCEEDED`, `PAYMENT_REFUNDED`, `PAYMENT_CLOSED`
- `@Cron("*/5 * * * *")` 自动关闭超时订单

**关键差距**:
- 前端 CheckoutScreen 未真正接入支付 — 注释明确说"完整支付链路后续继续接入"
- 缺少退款回调处理 — 退款结果只同步获取，无异步回调
- 无支付安全风控 — 缺少异常支付检测、频率限制

### MerchantService — CRUD 完整，缺少审核和订单管理

**现有能力**: 商家入驻/登录/商品管理/数据看板/趋势/受众分析

**关键差距**:
- 无商家审核流程 — `verified` 字段存在但无审核 API
- 无库存管理 — createProduct 不设置 stock
- 无订单管理 — 商家无法查看/处理自己的订单
- 无发货功能 — 缺少商家端发货操作
- 无结算触发 — getSettlements 只读，无自动结算
- 无商品审核 — 商品上架无审核机制

### SearchService — 搜索完整，筛选维度不足

**现有能力**: 文本搜索 + 图片搜索（ML + 属性降级）+ 搜索建议

**关键差距**:
- 无搜索结果排序优化 — 缺少销量/转化率加权
- 无品牌/颜色/尺码多维度筛选
- 无热门搜索实时更新

### ClothingService — 列表/详情完整，缺少电商增强

**关键差距**:
- 无库存展示 — 返回类型不含 stock 字段
- 无销量排序 — sortBy 不支持 sales 排序
- 无关联推荐 — 详情页无"相似商品"接口
- 无尺码指南 — 缺少尺码对照表

## 2. Prisma Schema Analysis

### Existing E-commerce Models (Complete)

| 模型 | 关键字段 | 状态 |
|------|---------|------|
| Brand | name, slug, categories[], priceRange, commissionRate, verified, bankInfo | 完整 |
| ClothingItem | category, subcategory, colors[], sizes[], price, stock, lowStockThreshold | 完整 |
| BrandMerchant | email, password, role(admin/editor/viewer), isActive | 完整 |
| BrandSettlement | period, totalSales, commission, netAmount, status | 完整 |
| CartItem | userId+itemId+color+size (unique), quantity, selected | 完整 |
| Order | orderNo, status(7种), totalAmount, shippingFee, discountAmount, finalAmount | 完整 |
| OrderItem | orderId, itemId, itemName, itemImage, color, size, quantity, price | 完整 |
| OrderAddress | orderId(unique), name, phone, province, city, district, address | 完整 |
| PaymentRecord | orderId(unique), provider, amount, status(6种), tradeNo | 完整 |
| RefundRecord | paymentRecordId, amount, reason, status(3种), refundNo | 完整 |
| UserAddress | userId, name, phone, province, city, district, address, isDefault | 完整 |
| ProductSalesStats | itemId+date(unique), views, clicks, tryOns, favorites, purchases | 完整 |

### Schema Conventions

1. **ID 策略**: `@id @default(uuid())` — 全部 UUID
2. **软删除**: Order/ClothingItem 有 `isDeleted + deletedAt`
3. **PII 加密**: 注释标记 `// @encrypted`，Service 层 EncryptionService 处理
4. **金额**: 统一 `Decimal @db.Decimal(10,2)` 或 `Decimal(12,2)`
5. **枚举**: OrderStatus(7), PaymentRecordStatus(6), ClothingCategory(8)
6. **索引策略**: 外键优先 > 复合索引 > 高频单列 > 排序索引
7. **数组字段**: colors[], sizes[], tags[], categories[] 使用 PostgreSQL 数组类型
8. **onDelete**: Cascade(强依赖), SetNull(弱依赖), Restrict(财务合规)

### New Models Needed

| 新模型 | 用途 | 关键字段 |
|--------|------|---------|
| Coupon | 优惠券 | code, type(percentage/fixed/shipping), value, minOrderAmount, maxDiscount, validFrom, validUntil, usageLimit, usedCount, applicableCategories[], applicableBrandIds[] |
| UserCoupon | 用户优惠券 | userId, couponId, status(available/used/expired), usedAt, orderId |
| StockNotification | 到货通知 | userId, itemId, color?, size?, status(pending/notified/cancelled), notifiedAt |
| RefundRequest | 退款申请 | orderId, userId, type(refund_only/return_refund), reason, status(pending/approved/rejected/processing/completed), images[], amount |
| OrderItemRefund | 单品退款 | orderItemId, refundRequestId, quantity, amount |
| Subcategory | 子分类 | parentId, name, slug, level, sortOrder |

## 3. Mobile Screens Analysis

### ClothingDetailScreen — 需要新建电商版本

当前是**用户衣橱**的服装详情页（UserClothing），不是电商商品详情页。需要全新的电商商品详情页，包含：商品图片轮播、价格/原价、库存状态、SKU选择（颜色+尺码）、加入购物车/立即购买按钮、优惠券领取入口、店铺信息、搭配推荐、评价列表。

### CartScreen — 基本完整，需增强

缺少：优惠券输入/选择区域、失效商品展示、免运费进度提示、库存不足提示、价格变动提示、编辑模式批量操作。

### CheckoutScreen — 三步流程有，支付未接入

注释明确说"当前先验证真实下单链路，完整支付链路后续继续接入"。缺少：优惠券使用、发票信息、备注输入、配送方式选择。

### OrdersScreen — 基本框架有，需补全

缺少：退款/售后Tab、待评价入口、删除订单功能、订单搜索。

### OrderDetailScreen — 需要增强

缺少：申请退款/退货按钮、确认收货按钮、再次购买、评价入口、物流详情、支付信息展示。

### SearchScreen — 基本完整，需增加筛选维度

缺少：品牌筛选、销量排序、搜索结果商品卡片上的"加入购物车"快捷操作。

## 4. Mobile API Layer Analysis

commerce.api.ts 提供完整的 cart/order/address/favorites/search API 调用 + normalize 函数。

**缺失的 API**:
- 无支付 API — 缺少 createPayment/pollPaymentStatus
- 无优惠券 API — 缺少 coupon 相关接口
- 无退款 API — 缺少 refundRequest 相关接口
- 无商品评价 API — 缺少 review 相关接口
- 无到货通知 API — 缺少 stockNotification 相关接口
- 无确认收货 API — 缺少 confirm 接口
- 无删除订单 API — 缺少 softDelete 接口

## 5. Integration Points

```
OrderService --> PaymentService --> AlipayProvider/WechatProvider
            --> AddressService (地址复制到 OrderAddress)
            --> CartService (创建订单后清理购物车)
            --> NotificationService (订单状态通知)

PaymentService --> RedisService (幂等锁)
               --> EventEmitter2 (支付事件)
               --> SubscriptionService (订阅激活)

MerchantService --> Brand/ClothingItem (商品管理)
                --> UserBehaviorEvent (销售统计)

SearchService --> ML Service (图像搜索)
             --> VisualSearchService --> AIImageService

ClothingService --> CacheService (缓存)
                --> Brand (品牌关联)
```

## 6. Key Architecture Patterns to Follow

1. **Service 层模式**: `@Injectable()` + PrismaService 注入，Logger 标准化
2. **类型安全**: Prisma 类型 + 自定义 interface，避免 `any`
3. **事务使用**: 涉及多表写操作用 `$transaction`
4. **PII 加密**: EncryptionService 在 Service 层加密/解密，数据库存密文
5. **事件驱动**: EventEmitter2 解耦模块间通信
6. **缓存策略**: CacheService + TTL + CacheKeyBuilder
7. **错误处理**: NestJS 内置异常 (NotFoundException, BadRequestException)
8. **DTO 验证**: class-validator + class-transformer + Swagger 装饰器
9. **前端 API 层**: apiClient 封装 + normalize 函数 + ApiResponse 泛型
10. **支付 Provider 模式**: PaymentProviderInterface 抽象，AlipayProvider/WechatProvider 实现

## 7. Requirements Gap Matrix

| 需求 | 描述 | 当前状态 | 工作量 |
|------|------|---------|--------|
| COMM-01 | 商品详情+SKU选择+加购 | ClothingDetailScreen 是衣橱详情 | 需新建电商商品详情页 |
| COMM-02 | 图片搜索+多维筛选 | SearchService 基本完整 | 增加品牌筛选/销量排序 |
| COMM-03 | 完整购物车 | CartScreen 基本完整 | 增加优惠券/库存校验/编辑模式 |
| COMM-04 | AI 智能尺码推荐 | 完全缺失 | 需新建全栈功能 |
| COMM-05 | 库存管理与通知 | ClothingItem 有 stock 字段 | 需建到货通知+低库存提醒 |
| COMM-06 | 双通道支付 | 后端 Provider 完整 | 需前端接入支付SDK |
| COMM-07 | 基础促销体系 | 完全缺失 | 需新建 Coupon/UserCoupon 全栈 |
| COMM-08 | 完整订单生命周期 | OrderService 基本完整 | 需补全退款/确认收货/自动确认 |
| COMM-09 | 平台自营+合作商家 | MerchantService 有基础 | 需增加审核流程+订单管理 |
| COMM-10 | 商家入驻审核 | verified 字段存在 | 需建审核API+流程 |
| COMM-11 | 多级商品分类 | ClothingCategory enum 有8类 | 需建子分类模型+导航 |

## 8. Validation Architecture

### Critical Validation Points

1. **支付安全**: 回调签名验证 + 金额校验 + 幂等保护（已有）
2. **库存一致性**: 扣减/恢复必须在事务中（已有），新增低库存检测
3. **优惠券防刷**: 使用次数限制 + 每人限制 + 有效期校验
4. **退款安全**: 退款金额不超过实付金额，退款状态机严格流转
5. **商家审核**: 自动初筛+人工终审，审核通过前无商品管理权限

### State Machines

**订单状态**: pending → paid → processing → shipped → completed
           pending → cancelled (with auto-refund if paid)
           paid → refund_requested → refund_processing → refunded

**退款状态**: pending → approved → processing → completed
           pending → rejected

**优惠券状态**: available → used / expired

**商家审核状态**: pending → approved / rejected

## RESEARCH COMPLETE
