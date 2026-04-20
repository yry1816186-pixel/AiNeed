// @ts-nocheck
import {
  PrismaClient,
  OrderStatus,
  CouponType,
  UserCouponStatus,
  MembershipPlan,
  Coupon,
  UserAddress,
  FeatureFlag,
  SubscriptionStatus,
} from "@prisma/client";

const MEMBERSHIP_PLANS = [
  {
    name: "monthly",
    displayName: "月度会员",
    price: 29.9,
    features: {
      tryOnLimit: 30,
      stylistSessions: 5,
      priorityRecommendation: false,
      exclusiveDiscount: true,
      discountPercent: 5,
      adFree: false,
    },
    sortOrder: 1,
  },
  {
    name: "quarterly",
    displayName: "季度会员",
    price: 79.0,
    features: {
      tryOnLimit: 100,
      stylistSessions: 20,
      priorityRecommendation: true,
      exclusiveDiscount: true,
      discountPercent: 10,
      adFree: true,
    },
    sortOrder: 2,
  },
  {
    name: "yearly",
    displayName: "年度会员",
    price: 269.0,
    features: {
      tryOnLimit: -1,
      stylistSessions: -1,
      priorityRecommendation: true,
      exclusiveDiscount: true,
      discountPercent: 15,
      adFree: true,
      exclusiveBrands: true,
      earlyAccess: true,
    },
    sortOrder: 3,
  },
];

const COUPONS_DATA = [
  {
    code: "WELCOME10",
    name: "新人专享9折券",
    type: CouponType.PERCENTAGE,
    value: 10.0,
    minOrderAmount: 99.0,
    maxDiscount: 50.0,
    validFrom: new Date("2026-01-01T00:00:00Z"),
    validUntil: new Date("2026-12-31T23:59:59Z"),
    usageLimit: 10000,
    perUserLimit: 1,
    applicableCategories: [],
    applicableBrandIds: [],
  },
  {
    code: "SPRING30",
    name: "春季满减券",
    type: CouponType.FIXED,
    value: 30.0,
    minOrderAmount: 299.0,
    maxDiscount: null,
    validFrom: new Date("2026-03-01T00:00:00Z"),
    validUntil: new Date("2026-05-31T23:59:59Z"),
    usageLimit: 5000,
    perUserLimit: 2,
    applicableCategories: ["tops", "dresses", "outerwear"],
    applicableBrandIds: [],
  },
  {
    code: "FREESHIP",
    name: "全场包邮券",
    type: CouponType.SHIPPING,
    value: 0,
    minOrderAmount: 0,
    maxDiscount: null,
    validFrom: new Date("2026-01-01T00:00:00Z"),
    validUntil: new Date("2026-12-31T23:59:59Z"),
    usageLimit: null,
    perUserLimit: 5,
    applicableCategories: [],
    applicableBrandIds: [],
  },
  {
    code: "VIP50",
    name: "会员专享满500减50",
    type: CouponType.FIXED,
    value: 50.0,
    minOrderAmount: 500.0,
    maxDiscount: null,
    validFrom: new Date("2026-04-01T00:00:00Z"),
    validUntil: new Date("2026-06-30T23:59:59Z"),
    usageLimit: 2000,
    perUserLimit: 1,
    applicableCategories: [],
    applicableBrandIds: [],
  },
  {
    code: "XUNO20",
    name: "寻裳自营满200减20",
    type: CouponType.FIXED,
    value: 20.0,
    minOrderAmount: 200.0,
    maxDiscount: null,
    validFrom: new Date("2026-04-01T00:00:00Z"),
    validUntil: new Date("2026-04-30T23:59:59Z"),
    usageLimit: 3000,
    perUserLimit: 3,
    applicableCategories: [],
    applicableBrandIds: [],
  },
];

const ADDRESSES_DATA = [
  {
    email: "test@example.com",
    addresses: [
      {
        name: "张测试",
        phone: "13800138000",
        province: "上海市",
        city: "上海市",
        district: "浦东新区",
        address: "张江高科技园区博云路2号",
        isDefault: true,
      },
      {
        name: "张测试",
        phone: "13800138000",
        province: "北京市",
        city: "北京市",
        district: "朝阳区",
        address: "望京SOHO T3 2801室",
        isDefault: false,
      },
    ],
  },
  {
    email: "demo@xuno.app",
    addresses: [
      {
        name: "李演示",
        phone: "13800138001",
        province: "浙江省",
        city: "杭州市",
        district: "西湖区",
        address: "文三路478号华星科技大厦",
        isDefault: true,
      },
    ],
  },
  {
    email: "judge@competition.ai",
    addresses: [
      {
        name: "王评委",
        phone: "13800138002",
        province: "北京市",
        city: "北京市",
        district: "海淀区",
        address: "中关村大街1号海龙大厦",
        isDefault: true,
      },
    ],
  },
  {
    email: "admin@xuno.app",
    addresses: [
      {
        name: "赵管理",
        phone: "13800138003",
        province: "广东省",
        city: "深圳市",
        district: "南山区",
        address: "科技园南区深南大道9966号",
        isDefault: true,
      },
    ],
  },
  {
    email: "user10@test.com",
    addresses: [
      {
        name: "David王",
        phone: "13800138009",
        province: "上海市",
        city: "上海市",
        district: "静安区",
        address: "南京西路1266号恒隆广场",
        isDefault: true,
      },
    ],
  },
];

const FEATURE_FLAGS_DATA = [
  {
    key: "ai_stylist_v2",
    name: "AI造型师V2",
    description: "启用多轮对话和场景化推荐",
    type: "boolean",
    value: { enabled: true },
    enabled: true,
    rules: { rolloutPercent: 100 },
  },
  {
    key: "virtual_try_on_hd",
    name: "高清虚拟试衣",
    description: "启用高清分辨率试衣效果图",
    type: "boolean",
    value: { enabled: false },
    enabled: false,
    rules: { rolloutPercent: 0 },
  },
  {
    key: "social_sharing",
    name: "社交分享功能",
    description: "允许用户分享穿搭到微信/微博",
    type: "boolean",
    value: { enabled: true },
    enabled: true,
    rules: { rolloutPercent: 100 },
  },
  {
    key: "membership_tier",
    name: "会员等级体系",
    description: "启用会员等级和积分系统",
    type: "boolean",
    value: { enabled: true },
    enabled: true,
    rules: { rolloutPercent: 100 },
  },
  {
    key: "dark_mode",
    name: "深色模式",
    description: "启用深色模式主题切换",
    type: "boolean",
    value: { enabled: true },
    enabled: true,
    rules: { rolloutPercent: 50 },
  },
  {
    key: "recommendation_engine_v3",
    name: "推荐引擎V3",
    description: "基于深度学习的个性化推荐",
    type: "boolean",
    value: { enabled: false },
    enabled: false,
    rules: { rolloutPercent: 0, betaUsers: [] },
  },
  {
    key: "max_cart_items",
    name: "购物车最大商品数",
    description: "限制购物车最大商品数量",
    type: "number",
    value: { maxItems: 50 },
    enabled: true,
    rules: {},
  },
  {
    key: "try_on_daily_limit",
    name: "每日试衣次数限制",
    description: "非会员每日虚拟试衣次数上限",
    type: "number",
    value: { freeLimit: 3, vipLimit: 30 },
    enabled: true,
    rules: {},
  },
];

const SUBSCRIPTIONS_DATA = [
  {
    email: "test@example.com",
    planName: "quarterly",
    status: SubscriptionStatus.active,
    startedAt: new Date("2026-04-01T00:00:00Z"),
    expiresAt: new Date("2026-07-01T00:00:00Z"),
    paymentMethod: "wechat",
    autoRenew: true,
    usageThisMonth: { tryOnCount: 12, stylistSessions: 5 },
  },
  {
    email: "judge@competition.ai",
    planName: "yearly",
    status: SubscriptionStatus.active,
    startedAt: new Date("2026-04-15T00:00:00Z"),
    expiresAt: new Date("2027-04-15T00:00:00Z"),
    paymentMethod: "alipay",
    autoRenew: true,
    usageThisMonth: { tryOnCount: 45, stylistSessions: 18 },
  },
  {
    email: "demo@xuno.app",
    planName: "monthly",
    status: SubscriptionStatus.active,
    startedAt: new Date("2026-03-20T00:00:00Z"),
    expiresAt: new Date("2026-04-20T00:00:00Z"),
    paymentMethod: "wechat",
    autoRenew: true,
    usageThisMonth: { tryOnCount: 8, stylistSessions: 2 },
  },
  {
    email: "user10@test.com",
    planName: "quarterly",
    status: SubscriptionStatus.active,
    startedAt: new Date("2026-04-10T00:00:00Z"),
    expiresAt: new Date("2026-07-10T00:00:00Z"),
    paymentMethod: "alipay",
    autoRenew: true,
    usageThisMonth: { tryOnCount: 22, stylistSessions: 8 },
  },
  {
    email: "user7@test.com",
    planName: "monthly",
    status: SubscriptionStatus.cancelled,
    startedAt: new Date("2026-03-01T00:00:00Z"),
    expiresAt: new Date("2026-04-01T00:00:00Z"),
    cancelledAt: new Date("2026-03-25T00:00:00Z"),
    paymentMethod: "wechat",
    autoRenew: false,
    usageThisMonth: { tryOnCount: 0, stylistSessions: 0 },
  },
];

const FAVORITES_DATA = [
  {
    email: "test@example.com",
    skus: ["AN-TOP-002", "AN-DRE-001", "AN-OUT-001", "AN-FOT-002", "AN-ACC-004"],
  },
  { email: "demo@xuno.app", skus: ["AN-DRE-002", "AN-TOP-002", "AN-BOT-003", "AN-FOT-006"] },
  { email: "judge@competition.ai", skus: ["AN-OUT-006", "AN-TOP-003", "AN-BOT-007", "AN-ACC-001"] },
  { email: "admin@xuno.app", skus: ["AN-TOP-003", "AN-DRE-003", "AN-OUT-002"] },
  { email: "user5@test.com", skus: ["AN-TOP-002", "AN-DRE-002", "AN-ACC-003", "AN-BOT-006"] },
  { email: "user6@test.com", skus: ["AN-ACT-001", "AN-FOT-005", "AN-TOP-006"] },
  {
    email: "user7@test.com",
    skus: ["AN-DRE-001", "AN-DRE-004", "AN-OUT-001", "AN-FOT-002", "AN-ACC-004"],
  },
  { email: "user8@test.com", skus: ["AN-OUT-003", "AN-TOP-006", "AN-BOT-004", "AN-FOT-004"] },
  { email: "user9@test.com", skus: ["AN-TOP-003", "AN-DRE-003", "AN-BOT-002"] },
  { email: "user10@test.com", skus: ["AN-OUT-006", "AN-BOT-007", "AN-TOP-003", "AN-ACC-001"] },
];

export async function seedEcommerce(
  prisma: PrismaClient,
  userMap: Map<string, any>,
  itemMap: Map<string, any>
): Promise<{
  cartCount: number;
  orderCount: number;
  planCount: number;
  couponCount: number;
  addressCount: number;
  flagCount: number;
  subscriptionCount: number;
  favoriteCount: number;
}> {
  const userIds = Array.from(userMap.values()).map((u: any) => u.id);
  const testUser = userMap.get("test@example.com");
  const demoUser = userMap.get("demo@xuno.app");
  const judgeUser = userMap.get("judge@competition.ai");

  const itemSkus = [
    "AN-TOP-002",
    "AN-BOT-001",
    "AN-DRE-001",
    "AN-OUT-001",
    "AN-FOT-002",
    "AN-ACC-004",
    "AN-TOP-003",
    "AN-BOT-002",
    "AN-TOP-005",
    "AN-OUT-006",
  ];
  const items: any[] = [];
  for (const sku of itemSkus) {
    const item = itemMap.get(sku);
    if (item) items.push(item);
  }

  let cartCount = 0;
  let orderCount = 0;
  let planCount = 0;
  let couponCount = 0;
  let addressCount = 0;
  let flagCount = 0;
  let subscriptionCount = 0;
  let favoriteCount = 0;

  // ===== MembershipPlan =====
  const planMap = new Map<string, MembershipPlan>();
  for (const plan of MEMBERSHIP_PLANS) {
    const existing = await prisma.membershipPlan.findUnique({ where: { name: plan.name } });
    if (existing) {
      planMap.set(plan.name, existing);
      planCount++;
      continue;
    }
    const created = await prisma.membershipPlan.create({
      data: {
        name: plan.name,
        displayName: plan.displayName,
        price: plan.price,
        currency: "CNY",
        features: plan.features,
        isActive: true,
        sortOrder: plan.sortOrder,
      },
    });
    planMap.set(plan.name, created);
    planCount++;
  }

  // ===== Coupon =====
  const couponMap = new Map<string, Coupon>();
  for (const coupon of COUPONS_DATA) {
    const existing = await prisma.coupon.findUnique({ where: { code: coupon.code } });
    if (existing) {
      couponMap.set(coupon.code, existing);
      couponCount++;
      continue;
    }
    const created = await prisma.coupon.create({
      data: {
        code: coupon.code,
        name: coupon.name,
        type: coupon.type,
        value: coupon.value,
        minOrderAmount: coupon.minOrderAmount,
        maxDiscount: coupon.maxDiscount,
        validFrom: coupon.validFrom,
        validUntil: coupon.validUntil,
        usageLimit: coupon.usageLimit,
        usedCount: 0,
        perUserLimit: coupon.perUserLimit,
        applicableCategories: coupon.applicableCategories,
        applicableBrandIds: coupon.applicableBrandIds,
        isActive: true,
      },
    });
    couponMap.set(coupon.code, created);
    couponCount++;
  }

  // ===== UserCoupon =====
  const userCouponPairs = [
    { email: "test@example.com", code: "WELCOME10", status: UserCouponStatus.AVAILABLE },
    { email: "test@example.com", code: "SPRING30", status: UserCouponStatus.AVAILABLE },
    {
      email: "demo@xuno.app",
      code: "WELCOME10",
      status: UserCouponStatus.USED,
      usedAt: new Date("2026-04-10T14:30:00Z"),
    },
    { email: "demo@xuno.app", code: "FREESHIP", status: UserCouponStatus.AVAILABLE },
    { email: "judge@competition.ai", code: "VIP50", status: UserCouponStatus.AVAILABLE },
    { email: "judge@competition.ai", code: "FREESHIP", status: UserCouponStatus.AVAILABLE },
    { email: "user5@test.com", code: "WELCOME10", status: UserCouponStatus.AVAILABLE },
    { email: "user5@test.com", code: "XUNO20", status: UserCouponStatus.AVAILABLE },
    { email: "user7@test.com", code: "SPRING30", status: UserCouponStatus.EXPIRED },
    { email: "user10@test.com", code: "VIP50", status: UserCouponStatus.AVAILABLE },
  ];

  for (const ucp of userCouponPairs) {
    const user = userMap.get(ucp.email);
    const coupon = couponMap.get(ucp.code);
    if (!user || !coupon) continue;

    const existing = await prisma.userCoupon.findUnique({
      where: { userId_couponId: { userId: user.id, couponId: coupon.id } },
    });
    if (existing) continue;

    await prisma.userCoupon.create({
      data: {
        userId: user.id,
        couponId: coupon.id,
        status: ucp.status,
        usedAt: ucp.usedAt ?? null,
      },
    });
  }

  // ===== UserAddress =====
  for (const entry of ADDRESSES_DATA) {
    const user = userMap.get(entry.email);
    if (!user) continue;

    for (const addr of entry.addresses) {
      const existing = await prisma.userAddress.findFirst({
        where: {
          userId: user.id,
          province: addr.province,
          city: addr.city,
          district: addr.district,
          address: addr.address,
        },
      });
      if (existing) {
        addressCount++;
        continue;
      }
      await prisma.userAddress.create({
        data: {
          userId: user.id,
          name: addr.name,
          phone: addr.phone,
          province: addr.province,
          city: addr.city,
          district: addr.district,
          address: addr.address,
          isDefault: addr.isDefault,
        },
      });
      addressCount++;
    }
  }

  // ===== CartItem =====
  const cartItems = [
    {
      email: "test@example.com",
      sku: "AN-TOP-002",
      color: "奶白色",
      size: "M",
      quantity: 1,
      selected: true,
    },
    {
      email: "test@example.com",
      sku: "AN-BOT-001",
      color: "深蓝色",
      size: "M",
      quantity: 1,
      selected: true,
    },
    {
      email: "test@example.com",
      sku: "AN-ACC-004",
      color: "黑色",
      size: "均码",
      quantity: 1,
      selected: false,
    },
    {
      email: "demo@xuno.app",
      sku: "AN-DRE-002",
      color: "粉底碎花",
      size: "S",
      quantity: 1,
      selected: true,
    },
    {
      email: "demo@xuno.app",
      sku: "AN-FOT-003",
      color: "黑色",
      size: "37",
      quantity: 1,
      selected: true,
    },
    {
      email: "judge@competition.ai",
      sku: "AN-OUT-006",
      color: "黑色",
      size: "L",
      quantity: 1,
      selected: true,
    },
    {
      email: "user5@test.com",
      sku: "AN-TOP-002",
      color: "樱花粉",
      size: "S",
      quantity: 2,
      selected: true,
    },
    {
      email: "user7@test.com",
      sku: "AN-DRE-001",
      color: "黑色",
      size: "M",
      quantity: 1,
      selected: true,
    },
  ];

  for (const ci of cartItems) {
    const user = userMap.get(ci.email);
    const item = itemMap.get(ci.sku);
    if (!user || !item) continue;

    const existing = await prisma.cartItem
      .findUnique({
        where: {
          userId_itemId_color_size: {
            userId: user.id,
            itemId: item.id,
            color: ci.color,
            size: ci.size,
          },
        },
      })
      .catch(() => null);
    if (existing) continue;

    await prisma.cartItem.create({
      data: {
        userId: user.id,
        itemId: item.id,
        color: ci.color,
        size: ci.size,
        quantity: ci.quantity,
        selected: ci.selected,
      },
    });
    cartCount++;
  }

  // ===== Order =====
  const now = new Date();
  const ordersData = [
    {
      email: "test@example.com",
      orderNo: "XN20260415001",
      status: OrderStatus.delivered,
      items: [
        {
          sku: "AN-TOP-001",
          name: "经典圆领纯棉T恤",
          color: "白色",
          size: "M",
          quantity: 2,
          price: 79.0,
        },
        {
          sku: "AN-BOT-005",
          name: "弹力修身小脚裤",
          color: "黑色",
          size: "M",
          quantity: 1,
          price: 149.0,
        },
      ],
      totalAmount: 307.0,
      shippingFee: 0,
      discountAmount: 30.0,
      finalAmount: 277.0,
      paymentMethod: "wechat",
      address: {
        name: "张测试",
        phone: "13800138000",
        province: "上海市",
        city: "上海市",
        district: "浦东新区",
        address: "张江高科技园区博云路2号",
      },
      paidAt: new Date("2026-04-15T10:30:00Z"),
      shipTime: new Date("2026-04-16T09:00:00Z"),
      receiveTime: new Date("2026-04-18T14:00:00Z"),
      expressCompany: "顺丰速运",
      expressNo: "SF1234567890",
    },
    {
      email: "test@example.com",
      orderNo: "XN20260417001",
      status: OrderStatus.paid,
      items: [
        {
          sku: "AN-OUT-001",
          name: "经典双排扣风衣",
          color: "卡其色",
          size: "M",
          quantity: 1,
          price: 599.0,
        },
      ],
      totalAmount: 599.0,
      shippingFee: 0,
      discountAmount: 50.0,
      finalAmount: 549.0,
      paymentMethod: "alipay",
      address: {
        name: "张测试",
        phone: "13800138000",
        province: "上海市",
        city: "上海市",
        district: "浦东新区",
        address: "张江高科技园区博云路2号",
      },
      paidAt: new Date("2026-04-17T16:20:00Z"),
    },
    {
      email: "judge@competition.ai",
      orderNo: "XN20260412001",
      status: OrderStatus.shipped,
      items: [
        {
          sku: "AN-BOT-007",
          name: "羊毛混纺宽腰头西裤",
          color: "藏青色",
          size: "L",
          quantity: 1,
          price: 499.0,
        },
        {
          sku: "AN-TOP-003",
          name: "极简高领羊绒毛衣",
          color: "驼色",
          size: "L",
          quantity: 1,
          price: 599.0,
        },
      ],
      totalAmount: 1098.0,
      shippingFee: 0,
      discountAmount: 50.0,
      finalAmount: 1048.0,
      paymentMethod: "wechat",
      address: {
        name: "王评委",
        phone: "13800138002",
        province: "北京市",
        city: "北京市",
        district: "海淀区",
        address: "中关村大街1号海龙大厦",
      },
      paidAt: new Date("2026-04-12T11:00:00Z"),
      shipTime: new Date("2026-04-13T08:30:00Z"),
      expressCompany: "京东物流",
      expressNo: "JD9876543210",
    },
  ];

  for (const orderData of ordersData) {
    const user = userMap.get(orderData.email);
    if (!user) continue;

    const existing = await prisma.order.findUnique({ where: { orderNo: orderData.orderNo } });
    if (existing) {
      orderCount++;
      continue;
    }

    const order = await prisma.order.create({
      data: {
        orderNo: orderData.orderNo,
        userId: user.id,
        status: orderData.status,
        totalAmount: orderData.totalAmount,
        shippingFee: orderData.shippingFee,
        discountAmount: orderData.discountAmount,
        finalAmount: orderData.finalAmount,
        paymentMethod: orderData.paymentMethod,
        paidAt: orderData.paidAt ?? null,
        shipTime: orderData.shipTime ?? null,
        receiveTime: orderData.receiveTime ?? null,
        expressCompany: orderData.expressCompany ?? null,
        expressNo: orderData.expressNo ?? null,
      },
    });

    for (const oi of orderData.items) {
      const item = itemMap.get(oi.sku);
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          itemId: item?.id ?? null,
          itemName: oi.name,
          itemImage: item?.mainImage ?? `https://picsum.photos/seed/${oi.sku}/400/400`,
          color: oi.color,
          size: oi.size,
          quantity: oi.quantity,
          price: oi.price,
        },
      });
    }

    if (orderData.address) {
      await prisma.orderAddress.create({
        data: {
          orderId: order.id,
          name: orderData.address.name,
          phone: orderData.address.phone,
          province: orderData.address.province,
          city: orderData.address.city,
          district: orderData.address.district,
          address: orderData.address.address,
        },
      });
    }

    orderCount++;
  }

  // ===== FeatureFlag =====
  for (const ff of FEATURE_FLAGS_DATA) {
    const existing = await prisma.featureFlag.findUnique({ where: { key: ff.key } });
    if (existing) {
      flagCount++;
      continue;
    }
    await prisma.featureFlag.create({
      data: {
        key: ff.key,
        name: ff.name,
        description: ff.description,
        type: ff.type,
        value: ff.value,
        enabled: ff.enabled,
        rules: ff.rules,
      },
    });
    flagCount++;
  }

  // ===== UserSubscription =====
  for (const sub of SUBSCRIPTIONS_DATA) {
    const user = userMap.get(sub.email);
    const plan = planMap.get(sub.planName);
    if (!user || !plan) continue;

    const existing = await prisma.userSubscription.findFirst({
      where: { userId: user.id, planId: plan.id, startedAt: sub.startedAt },
    });
    if (existing) {
      subscriptionCount++;
      continue;
    }
    await prisma.userSubscription.create({
      data: {
        userId: user.id,
        planId: plan.id,
        status: sub.status,
        startedAt: sub.startedAt,
        expiresAt: sub.expiresAt,
        cancelledAt: sub.cancelledAt ?? null,
        paymentMethod: sub.paymentMethod ?? null,
        autoRenew: sub.autoRenew,
        usageThisMonth: sub.usageThisMonth,
      },
    });
    subscriptionCount++;
  }

  // ===== Favorite =====
  for (const entry of FAVORITES_DATA) {
    const user = userMap.get(entry.email);
    if (!user) continue;

    for (const sku of entry.skus) {
      const item = itemMap.get(sku);
      if (!item) continue;

      const existing = await prisma.favorite
        .findUnique({
          where: { userId_itemId: { userId: user.id, itemId: item.id } },
        })
        .catch(() => null);
      if (existing) continue;

      await prisma.favorite.create({
        data: {
          userId: user.id,
          itemId: item.id,
        },
      });
      favoriteCount++;
    }
  }

  return {
    cartCount,
    orderCount,
    planCount,
    couponCount,
    addressCount,
    flagCount,
    subscriptionCount,
    favoriteCount,
  };
}
