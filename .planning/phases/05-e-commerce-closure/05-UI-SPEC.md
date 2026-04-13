---
phase: 5
slug: e-commerce-closure
status: draft
shadcn_initialized: false
preset: none
created: 2026-04-14
---

# Phase 5 — UI Design Contract

> Visual and interaction contract for 电商闭环 frontend phases.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | React Native Paper |
| Preset | AiNeed fashion app |
| Component library | React Native Paper 5.x |
| Icon library | @expo/vector-icons (MaterialCommunityIcons) |
| Font | System default (PingFang SC / Roboto) |

---

## Spacing Scale

Declared values (must be multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, inline padding |
| sm | 8px | Compact element spacing |
| md | 16px | Default element spacing |
| lg | 24px | Section padding |
| xl | 32px | Layout gaps |
| 2xl | 48px | Major section breaks |
| 3xl | 64px | Page-level spacing |

Exceptions: none

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 14px | 400 | 1.5 |
| Label | 12px | 500 | 1.3 |
| Heading | 18px | 600 | 1.4 |
| Display | 24px | 700 | 1.3 |
| Price | 20px | 700 | 1.2 |
| Price Original | 14px | 400 | 1.2 (with strikethrough) |

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | #FFFFFF | Background, surfaces |
| Secondary (30%) | #F5F5F5 | Cards, section backgrounds |
| Accent (10%) | #FF4D4F | "立即购买" button, sale tags, AI推荐标签 |
| Destructive | #FF4D4F | 取消订单, 删除 |
| Success | #52C41A | 支付成功, 确认收货, 到货通知 |
| Warning | #FAAD14 | 库存不足, 优惠券即将过期 |
| Info | #1890FF | 物流信息, 查看详情链接 |
| Text Primary | #333333 | 标题, 正文 |
| Text Secondary | #999999 | 描述, 时间, 辅助信息 |
| Price | #FF4D4F | 价格数字 |
| Price Original | #CCCCCC | 原价 (strikethrough) |

Accent reserved for: "立即购买" CTA, sale/discount tags, AI推荐标签, 优惠券标签

---

## Screen Contracts

### 1. Product Detail Screen (商品详情页) — COMM-01

**Layout (D-01):** 经典轮播式 — 顶部图片轮播，下方信息区，底部固定购买栏

| Section | Content | Interaction |
|---------|---------|-------------|
| Image Carousel | 商品图片 (3-8张), 左右滑动, 指示器点 | Swipe left/right, tap to zoom |
| Price Bar | 现价(大号红字) + 原价(删除线) + 优惠标签 | — |
| SKU Selector | 颜色选择(圆形色块) + 尺码选择(方形按钮) | Tap to select, out-of-stock grayed out |
| AI Size Tag (D-05) | 绿色"AI推荐"标签在推荐尺码旁 | Tap to expand recommendation reason |
| Product Info | 名称/品牌/描述/材质/洗涤说明 | Scrollable |
| Outfit Recommendations (D-03) | 横向滑动卡片, 3-5套搭配方案 | Swipe left/right, tap to view outfit |
| Bottom Bar (D-02) | 左侧: 收藏♡ + 虚拟试衣 | 右侧: 加入购物车 + 立即购买 |

**Copywriting:**
- Primary CTA: "立即购买"
- Secondary CTA: "加入购物车"
- AI Size: "AI推荐" (green badge)
- Out of stock: "该尺码暂时缺货，到货通知我"
- Try-on: "虚拟试衣"

### 2. Search Screen Enhancement (搜索增强) — COMM-02, COMM-11

**Layout (D-19, D-20, D-21, D-22, D-23):**

| Section | Content | Interaction |
|---------|---------|-------------|
| Search Bar | 文字输入 + 右侧相机图标(D-19) | Tap camera → 拍照/相册选择 |
| Category Navigation (D-22) | 横向滚动图标(8大分类), 图标+文字 | Tap → 子分类展开 |
| Subcategory (D-23) | 二级子分类横向标签 | Tap → 筛选结果 |
| Filter Tags (D-20) | 横向滚动标签: 价格/品牌/颜色/尺码/风格 | Tap → 展开筛选选项 |
| Sort Bar | 综合/价格↑/价格↓/销量(D-21) | Tap to switch sort |
| Results Grid | 双列商品卡片 | Scroll, tap to view detail |

**Copywriting:**
- Camera CTA: "拍照搜索"
- Sort options: "综合" / "价格" / "销量"
- Filter label: "筛选"
- No results: "没有找到相关商品，试试其他搜索词"

### 3. Cart Screen Enhancement (购物车增强) — COMM-03

**Layout (D-12, D-13, D-14):**

| Section | Content | Interaction |
|---------|---------|-------------|
| Empty State (D-12) | 空状态图标 + "购物车空空如也" + "去逛逛"按钮 + "猜你喜欢"推荐 | Tap "去逛逛" → 首页 |
| Cart Items | 商品卡片: 图片/名称/规格/价格/数量 | Swipe left to delete |
| Inline SKU Editor (D-13) | 点击尺码/颜色文字 → 行内弹出选择器 | Select → update cart |
| Edit Mode (D-14) | 顶部"编辑"按钮 → 批量操作模式 | 批量删除/移入收藏 |
| Summary Bar | 已选N件 / 合计¥XX / 结算按钮 | Tap "结算" → CheckoutScreen |
| Coupon Entry | "使用优惠券"入口 | Tap → 优惠券选择弹窗 |
| Free Shipping Progress | "再买¥XX免运费" 进度条 | — |

**Copywriting:**
- Empty heading: "购物车空空如也"
- Empty body: "去发现喜欢的穿搭吧"
- Edit mode: "编辑" / "完成"
- Batch actions: "删除" / "移入收藏"
- Free shipping: "再买¥{amount}免运费"
- Coupon: "{N}张优惠券可用"

### 4. Checkout Screen Enhancement (结算增强) — COMM-06, COMM-07

**Layout (D-15, D-16):**

| Section | Content | Interaction |
|---------|---------|-------------|
| Address Card | 收货地址(默认) + 修改按钮 | Tap → 地址选择 |
| Items Summary | 商品列表(缩略图+名称+规格+价格) | — |
| Coupon Section | 已选优惠券 + 更换按钮 | Tap → 优惠券选择 |
| Price Breakdown | 商品合计 + 运费 + 优惠 + 实付 | — |
| Payment Buttons (D-15) | 支付宝按钮 + 微信支付按钮(并排) | Tap → 跳转支付 |
| Payment Waiting (D-16) | 等待页: 加载动画 + "正在查询支付结果" | Auto-poll every 2s |

**Copywriting:**
- Alipay CTA: "支付宝支付"
- WeChat CTA: "微信支付"
- Waiting: "正在查询支付结果..."
- Success: "支付成功！"
- Timeout: "支付超时，请手动查看订单状态"

### 5. Order Detail Enhancement (订单详情增强) — COMM-08

**Layout (D-17, D-18):**

| Section | Content | Interaction |
|---------|---------|-------------|
| Status Timeline (D-18) | 垂直时间线: 待支付→已支付→已发货→已完成 | Each node shows time + description |
| Order Items | 商品列表(图片+名称+规格+价格) | Tap item → 商品详情 |
| Shipping Info | 收货地址 + 物流公司+单号 | Tap tracking number → copy |
| Price Breakdown | 商品合计 + 运费 + 优惠 + 实付 | — |
| Action Buttons | 状态相关: 取消订单/确认收货/申请退款/再次购买 | Tap → corresponding action |
| Refund Entry (D-17) | "申请退款" / "申请退货退款" | Tap → 退款申请表单 |

**Copywriting:**
- Timeline nodes: "待支付" / "已支付" / "已发货" / "已完成"
- Cancel: "取消订单"
- Confirm receipt: "确认收货"
- Refund types: "仅退款" / "退货退款"
- Refund reason: "请选择退款原因"

### 6. Merchant Application Screen (商家入驻) — COMM-09, COMM-10

**Layout (D-09, D-11):**

| Section | Content | Interaction |
|---------|---------|-------------|
| Application Form | 品牌名/营业执照号/联系人/手机号/品牌简介 | Fill in fields |
| Auto Validation (D-09) | 实时校验: 营业执照格式/手机号有效性/品牌名唯一 | Inline error messages |
| Submit | "提交申请" 按钮 | Tap → submit for review |
| Status Page | 审核中/已通过/已拒绝 + 原因 | — |

**Copywriting:**
- Submit CTA: "提交申请"
- Validating: "正在验证..."
- Submitted: "申请已提交，我们将在1-3个工作日内完成审核"
- Approved: "恭喜！您的商家申请已通过"
- Rejected: "很抱歉，您的申请未通过。原因：{reason}"

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | "立即购买" |
| Secondary CTA | "加入购物车" |
| Empty state heading (cart) | "购物车空空如也" |
| Empty state body (cart) | "去发现喜欢的穿搭吧" + "去逛逛" button |
| Error state (payment) | "支付遇到问题，请重试或选择其他支付方式" |
| Destructive confirmation | "取消订单": "确定要取消此订单吗？已支付金额将原路退回" |
| AI recommendation | "AI推荐" (green badge) |
| Out of stock | "暂时缺货" |
| Free shipping progress | "再买¥{amount}免运费" |
| Coupon available | "{N}张优惠券可用" |
| Refund request | "申请退款" / "申请退货退款" |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| React Native Paper | Card, Button, TextInput, Chip, FAB, Dialog, Portal, List | not required |
| @expo/vector-icons | MaterialCommunityIcons | not required |
| react-native-swiper | Image carousel | Review version compatibility |
| react-native-modal | SKU selector popup, filter panels | Review version compatibility |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
