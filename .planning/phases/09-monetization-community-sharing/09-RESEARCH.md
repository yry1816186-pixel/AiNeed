# Phase 9: Monetization + Community + Sharing - Research

**Researched:** 2026-04-26
**Domain:** 商业化（限额/支付/分享/佣金）
**Confidence:** HIGH

## Summary

Phase 9 在已有的 NestJS 商业化基础设施（PaymentService + SubscriptionService + SubscriptionGuard）之上构建三层变现系统和一套分享裂变机制。核心工作量分为后端（Redis 限额守卫 + 内容购买模型 + 工作室佣金追踪 + BullMQ 月度账单）和前端（UsageLimitBottomSheet + 报告预览/解锁页 + 三种分享卡片 + QR 码生成）。

已有基础设施评估：PaymentService 已完整支持微信/支付宝双 provider、幂等回调、事件驱动订阅激活。SubscriptionGuard 已实现功能检查+用量记录+响应头透传模式。SharePosterScreen 已有 react-native-view-shot 截图 + react-native-share 分享的完整集成。RedisService 已提供 INCR/expire/lpush 等原子操作。BullMQ 已在 commerce 模块注册。这些意味着本阶段 70% 的基础设施已就绪，主要工作是**组合扩展**而非**从零搭建**。

**Primary recommendation:** 在 SubscriptionGuard 模式上扩展 UsageLimitGuard 复用 Redis INCR 模式；在 SharePosterScreen 基础上扩展三种卡片类型；在 PaymentService 事件链中增加 ContentPurchase 类型处理；新建 StudioReferral/ContentPurchase 两个 Prisma 模型。

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** BottomSheet 升级引导 -- 用户触达限额时弹出 BottomSheet，展示高级会员特权对比表 + "立即升级"按钮。与 TryOnBottomSheet 交互模式一致，不打断主浏览流
- **D-02:** Redis INCR 按天计数 -- 使用 `usage:{userId}:{actionType}:{date}` 键格式，INCR 自增 + EXPIRE 设 TTL 至次日零点。高性能，天然过期，已有 Redis 基础设施
- **D-03:** 每日零点重置 -- 计数器 key 包含日期，零点后新 key 自然从 0 开始。用户容易理解"每天 5 次"
- **D-04:** 限额守卫中间件 -- 新建 `UsageLimitGuard`，在 AI 对话/试穿/衣橱写入前检查 Redis 计数，超限抛出 `UsageLimitExceededException`，前端捕获后弹出 BottomSheet
- **D-05:** 渐进提示 -- 用量达 80% 时底部 toast 提示"今日还剩 X 次"，达 100% 弹 BottomSheet。避免突然阻断
- **D-06:** 应用内专属页面 -- 购买后永久解锁对应报告 Tab，横向滑动多页沉浸式浏览。复用 ProfileReportScreen 的报告 UI 模式，扩展为付费版
- **D-07:** "预览+解锁"模式 -- 免费用户可浏览报告预览版（关键数据模糊/打马赛克），点击"解锁完整报告"触发支付流程。转化率高、体验自然
- **D-08:** 胶囊衣橱方案整合用户单品 -- 读取用户 savedItems + wishlistedItems，AI 生成补充推荐，组成 30 件胶囊衣橱方案
- **D-09:** 一次性购买持久化 -- Prisma 新增 `ContentPurchase` 模型（userId + productType + orderId + unlockedAt），购买后永久访问
- **D-10:** 三种分享卡片类型: 穿搭方案卡片（四宫格+QR）、试衣对比图（需隐私确认）、报告摘要卡片
- **D-11:** 沉浸式图片优先布局 -- 全屏搭配图 + 底部品牌 Logo + "让 AI 帮你搭"文案 + 右下角小 QR 码
- **D-12:** QR -> 小程序体验 -> 引导下载 -- QR 编码小程序路径参数（分享者 userId + 卡片类型）
- **D-13:** react-native-view-shot 生成图片 -- 生成后支持保存到相册 + 分享到微信/朋友圈（使用 react-native-share）
- **D-14:** 无感点击追踪 -- 记录 `StudioReferral`（studioId + userId + timestamp + source），首次下单时自动关联 7 天窗口期
- **D-15:** 月度手动结算 -- BullMQ Cron 每月 1 日生成佣金账单，工作室确认后线下转账
- **D-16:** 佣金比例可配置 -- `StudioCommissionRate` 表存储每个工作室的抽佣比例（15-20%）

### Claude's Discretion

- BottomSheet 升级引导的具体 UI 布局和文案
- Redis key 的精确 TTL 计算（到次日零点的秒数）
- 80% 渐进提示的触发方式（响应头 vs 前端计数）
- 报告预览版的具体模糊区域和打码策略
- 胶囊衣橱 30 件方案的 AI 生成算法（如何平衡已有单品和推荐补充）
- 分享卡片的具体像素尺寸和品牌 Logo 大小
- QR 码编码格式和小程序路径参数设计
- 无感追踪的 7 天窗口期是否需要排除已购买用户
- 月度账单的具体字段和导出格式
- 佣金比例的初始默认值

### Deferred Ideas (OUT OF SCOPE)

None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID     | Description                                                                 | Research Support                                                             |
| ------ | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| MON-01 | 免费层限额（每日 5 次 AI 对话 + 3 次试穿 + 20 件衣橱）                      | D-02 Redis INCR + D-04 UsageLimitGuard + D-05 渐进提示                       |
| MON-02 | 内容产物付费（色彩报告 9.9 元 + 体型报告 + 胶囊衣橱方案 19 元，一次性购买） | D-09 ContentPurchase 模型 + D-07 预览解锁 + PaymentService 事件链扩展        |
| MON-03 | 高级会员（连续穿搭计划 + 深度衣橱诊断 + AI 主动推送，9.9 元/月）            | SubscriptionService 已有续订/取消逻辑 + SubscriptionScreen 已有 UI           |
| MON-04 | 分享种子功能（穿搭方案图+试衣图+报告图，含 QR 码）                          | D-10~D-13 三种卡片 + react-native-view-shot + react-native-share + QR 码生成 |
| SOC-02 | 分享裂变（react-native-view-shot + QR，穿搭方案分享图+二维码）              | SharePosterScreen 已有 view-shot+share 集成，需扩展三种卡片+QR               |

</phase_requirements>

## Architectural Responsibility Map

| Capability                | Primary Tier           | Secondary Tier | Rationale                                      |
| ------------------------- | ---------------------- | -------------- | ---------------------------------------------- |
| 每日限额计数 + 检查       | API / Backend (Redis)  | --             | Redis INCR 原子操作，需在后端 Guard 中强制执行 |
| 限额超限异常 + 响应头透传 | API / Backend          | --             | UsageLimitGuard 抛异常 + X-RateLimit-\* 响应头 |
| BottomSheet 升级引导      | Browser / Client       | --             | 纯前端交互，捕获后端异常后弹出                 |
| 内容产品支付订单创建      | API / Backend          | --             | PaymentService 复用已有双 provider 链路        |
| 报告预览/解锁 UI          | Browser / Client       | --             | 前端 BlurView + "解锁"按钮，支付状态本地判断   |
| 胶囊衣橱 AI 生成          | API / Backend (Python) | --             | 调用 AI 服务生成方案                           |
| 分享卡片截图              | Browser / Client       | --             | react-native-view-shot 在客户端截图            |
| QR 码生成                 | Browser / Client       | --             | react-native-qrcode-svg 本地生成，无需服务端   |
| 分享到微信/保存相册       | Browser / Client       | --             | react-native-share 调用系统分享                |
| 工作室推荐追踪记录        | API / Backend          | --             | POST /studio/referral/record 静默调用          |
| 月度佣金账单生成          | API / Backend (BullMQ) | --             | BullMQ Cron 每月 1 日汇总                      |
| QR -> 小程序路由          | Mini-program (Taro)    | --             | 小程序端接收路径参数 + RegistrationCTA         |

## Standard Stack

### Core

| Library                 | Version              | Purpose                      | Why Standard                                                              |
| ----------------------- | -------------------- | ---------------------------- | ------------------------------------------------------------------------- |
| ioredis                 | ^5.3.2 (已安装)      | Redis 客户端，限额 INCR 操作 | 项目已用，RedisService 封装完善 [VERIFIED: package.json]                  |
| @nestjs/bullmq          | ^11.0.4 (已安装)     | 月度佣金 Cron 调度           | 项目已用，commerce 模块已注册 [VERIFIED: package.json]                    |
| react-native-view-shot  | ^4.0.3 (npm latest)  | 分享卡片截图                 | CONTEXT D-13 锁定，SharePosterScreen 已集成 [VERIFIED: npm registry]      |
| react-native-share      | ^11.0.0 (已安装)     | 分享到微信/朋友圈            | SharePosterScreen 已集成 [VERIFIED: package.json]                         |
| @gorhom/bottom-sheet    | ^5.0.0 (已安装)      | 限额 BottomSheet + 升级引导  | TryOnBottomSheet 已使用，D-01 要求交互一致 [VERIFIED: package.json]       |
| react-native-qrcode-svg | ^6.3.21 (npm latest) | 分享卡片 QR 码生成           | 轻量 SVG 方案，无原生依赖，配合 react-native-svg [VERIFIED: npm registry] |
| qrcode                  | ^1.5.4 (npm latest)  | 后端 QR 码数据编码（备选）   | 纯 JS，用于生成 QR 内容字符串 [VERIFIED: npm registry]                    |

### Supporting

| Library                               | Version  | Purpose          | When to Use                               |
| ------------------------------------- | -------- | ---------------- | ----------------------------------------- |
| @react-native-masked-view/masked-view | latest   | 报告预览模糊效果 | 仅 MON-02 报告预览页使用                  |
| react-native-svg                      | (已安装) | QR 码 SVG 渲染   | react-native-qrcode-svg 依赖              |
| @ blurred - BlurView                  | latest   | 报告预览模糊遮罩 | 替代方案：用半透明 overlay + opacity 渐变 |

### Alternatives Considered

| Instead of                | Could Use            | Tradeoff                                                                |
| ------------------------- | -------------------- | ----------------------------------------------------------------------- |
| react-native-qrcode-svg   | expo-barcode-builder | expo-barcode-builder 仅限 Expo Go；项目用 dev-client，qrcode-svg 更通用 |
| @react-native-masked-view | CSS opacity overlay  | MaskedView 原生模糊效果更好但需原生依赖；CSS overlay 更简单但效果差     |
| 后端 QR 生成              | 前端 QR 生成         | 前端生成无需网络请求，离线可用；后端生成可统一控制但增加延迟            |

**Installation:**

```bash
# 新增依赖
cd apps/mobile
pnpm add react-native-view-shot react-native-qrcode-svg

# 后端无需新增依赖 -- RedisService + BullMQ + Prisma 已完备
```

**Version verification:**

- react-native-view-shot: 4.0.3 (2025-11, npm registry) [VERIFIED]
- react-native-share: 11.0.0 (已安装于 apps/mobile) [VERIFIED]
- react-native-qrcode-svg: 6.3.21 (npm latest) [VERIFIED]
- @gorhom/bottom-sheet: ^5.0.0 (已安装) [VERIFIED]
- ioredis: ^5.3.2 (已安装于 apps/backend) [VERIFIED]

## Architecture Patterns

### System Architecture Diagram

```
用户操作 (AI对话/试穿/衣橱保存)
    |
    v
[UsageLimitGuard] -- Redis INCR --> usage:{userId}:{type}:{date}
    |                                     |
    | 允许 (count < limit)                | 超限
    v                                     v
正常处理                          UsageLimitExceededException
    |                                     |
    | X-UsageLimit-Remaining 响应头        | HTTP 429 + limit info
    v                                     v
前端检查响应头:                   前端捕获异常:
  remaining <= 20%? -> toast      -> UsageLimitBottomSheet
  正常渲染                        -> 特权对比 + "立即升级"

---

报告浏览流程:
免费用户                        付费用户
    |                              |
    v                              v
[ProfileReportScreen]          [ProfileReportScreen]
    | 预览模式                      | 完整模式
    v                              v
BlurView 遮罩                 完整数据展示
核心色板模糊                   色板清晰
"解锁完整报告 ¥9.9"            无 CTA
    |
    v
PaymentService.createPayment()
    |
    v
支付回调 -> ContentPurchase 写入
    |
    v
报告页刷新 -> 检测已购买 -> 完整模式

---

分享裂变流程:
穿搭方案/试衣/报告页 -> "分享"按钮
    |
    v
选择卡片类型 (方案/试衣/报告)
    |
    v
[ShareCardView] (react-native-view-shot ref)
    |-- 品牌内容区 (搭配图/评价/摘要)
    |-- 底部品牌条 (#2D3436)
    |     |-- "寻裳 XUNO" Logo
    |     |-- "让 AI 帮你搭"
    |     |-- QR 码 (小程序路径)
    v
captureRef() -> PNG tmpfile
    |
    v
Share.open({ url, type: 'image/png' })
    |-- 保存到相册
    |-- 分享到微信
    |-- 分享到朋友圈

---

工作室佣金流程:
StudioRecommendCard 点击
    |
    v
POST /studio/referral/record
    { studioId, userId, source }
    |
    v
Prisma: StudioReferral 写入
    |
    v (用户 7 天内下单)
Order 完成事件
    |
    v
查找最近 StudioReferral
    |
    v
关联 Order + StudioReferral
    |
    v (每月 1 日)
BullMQ Cron 汇总
    |
    v
生成 StudioCommissionBill
```

### Recommended Project Structure

```
apps/backend/src/domains/commerce/
├── usage-limit/                          # 新模块
│   ├── usage-limit.module.ts
│   ├── usage-limit.service.ts            # Redis INCR + TTL 逻辑
│   ├── usage-limit.guard.ts              # NestJS Guard
│   ├── usage-limit.decorator.ts          # @RequireLimit('ai_chat') 装饰器
│   ├── dto/
│   │   └── usage-limit.dto.ts
│   └── __tests__/
│       └── usage-limit.service.spec.ts
├── content-product/                      # 新模块
│   ├── content-product.module.ts
│   ├── content-product.service.ts        # 购买/解锁/检查
│   ├── content-product.controller.ts     # REST 端点
│   ├── dto/
│   │   └── content-product.dto.ts
│   └── __tests__/
│       └── content-product.service.spec.ts
├── studio-commission/                    # 新模块
│   ├── studio-commission.module.ts
│   ├── studio-commission.service.ts      # 追踪/关联/月度汇总
│   ├── studio-commission.controller.ts   # REST 端点
│   ├── dto/
│   │   └── studio-commission.dto.ts
│   └── __tests__/
│       └── studio-commission.service.spec.ts

apps/mobile/src/features/
├── commerce/
│   ├── components/
│   │   ├── UsageLimitBottomSheet.tsx      # 限额升级引导
│   │   └── ContentUnlockCTA.tsx          # "解锁完整报告" 按钮
│   ├── screens/
│   │   ├── ContentProductScreen.tsx      # 内容产品详情/购买页
│   │   └── CapsuleWardrobeScreen.tsx     # 胶囊衣橱方案页
│   └── hooks/
│       └── useUsageLimit.ts              # 限额状态 hook
├── sharing/                              # 新功能目录
│   ├── components/
│   │   ├── ShareCardLayout.tsx           # 通用分享卡片布局
│   │   ├── OutfitShareCard.tsx           # 穿搭方案卡片
│   │   ├── TryOnShareCard.tsx            # 试衣对比卡片
│   │   ├── ReportShareCard.tsx           # 报告摘要卡片
│   │   └── ShareQRCode.tsx              # QR 码组件
│   ├── hooks/
│   │   ├── useShareCapture.ts            # 截图+分享封装
│   │   └── useSharePrivacy.ts            # 试衣隐私确认
│   └── utils/
│       └── qr-encoder.ts                # QR 内容编码工具

apps/backend/prisma/
└── migrations/
    └── XXX_add_content_purchase_studio_referral/
```

### Pattern 1: UsageLimitGuard (扩展 SubscriptionGuard 模式)

**What:** 在已有 SubscriptionGuard 模式上，新增基于 Redis INCR 的每日限额守卫
**When to use:** 所有需要限额检查的端点（AI 对话、试穿、衣橱写入）
**Example:**

```typescript
// Source: 基于 SubscriptionGuard (apps/backend/src/domains/commerce/subscription/guards/subscription.guard.ts)
// 参考 RedisService.incr() (apps/backend/src/common/redis/redis.service.ts)

// usage-limit.decorator.ts
import { SetMetadata } from "@nestjs/common";
export const USAGE_LIMIT_KEY = "usage_limit";
export const RequireLimit = (actionType: string) => SetMetadata(USAGE_LIMIT_KEY, actionType);

// usage-limit.guard.ts
@Injectable()
export class UsageLimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private redisService: RedisService,
    private prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const actionType = this.reflector.getAllAndOverride<string>(USAGE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!actionType) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new ForbiddenException("User not authenticated");

    // 检查是否为付费会员 -- 会员无限制
    const subscription = await this.prisma.userSubscription.findFirst({
      where: { userId: user.id, status: "active", expiresAt: { gt: new Date() } },
    });
    if (subscription) {
      this.setResponseHeaders(context, -1, -1, true);
      return true;
    }

    // Redis INCR 按天计数
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const key = `usage:${user.id}:${actionType}:${today}`;
    const count = await this.redisService.incr(key);

    // 首次计数时设置 TTL 到次日零点
    if (count === 1) {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const ttlSeconds = Math.floor((tomorrow.getTime() - now.getTime()) / 1000);
      await this.redisService.expire(key, ttlSeconds);
    }

    const limit = this.getLimit(actionType);
    const remaining = Math.max(0, limit - count);

    this.setResponseHeaders(context, limit, remaining, false);

    if (count > limit) {
      throw new UsageLimitExceededException(actionType, limit, count);
    }

    return true;
  }

  private getLimit(actionType: string): number {
    const limits: Record<string, number> = {
      ai_chat: 5,
      try_on: 3,
      wardrobe_item: 20,
    };
    return limits[actionType] ?? 10;
  }
}
```

### Pattern 2: ContentPurchase 事件链扩展

**What:** 在 PaymentService 的事件驱动架构中增加内容产品购买类型
**When to use:** 报告/胶囊衣橱等一次性内容购买
**Example:**

```typescript
// Source: 基于 PaymentService 事件链 (apps/backend/src/domains/commerce/payment/events/payment.events.ts)
// 支付回调成功后，检查 metadata.productType 区分内容购买 vs 订阅

// payment.events.ts 扩展
export const PAYMENT_EVENTS = {
  // ...existing events
  CONTENT_PURCHASE_COMPLETED: "payment.content.purchase.completed",
} as const;

export interface ContentPurchasePayload {
  userId: string;
  orderId: string;
  productType: "color_report" | "body_report" | "capsule_wardrobe";
  amount: number;
}

// payment.service.ts handleCallback 中扩展：
if (status === "paid") {
  const metadata = paymentOrder?.metadata as PaymentOrderMetadata;
  if (metadata?.productType) {
    // 内容产品购买
    this.eventEmitter.emit(PAYMENT_EVENTS.CONTENT_PURCHASE_COMPLETED, {
      userId: record.userId,
      orderId,
      productType: metadata.productType,
      amount: record.amount.toNumber(),
    });
  } else if (metadata?.planId) {
    // 订阅激活（已有逻辑）
    this.eventEmitter.emit(PAYMENT_EVENTS.SUBSCRIPTION_ACTIVATION_REQUIRED, payload);
  }
}
```

### Pattern 3: ShareCard 截图+分享 (扩展现有 SharePosterScreen)

**What:** 在 SharePosterScreen 的 view-shot + share 模式上，扩展三种卡片类型
**When to use:** 穿搭方案/试衣对比/报告摘要分享
**Example:**

```typescript
// Source: 基于 SharePosterScreen (apps/mobile/src/features/profile/screens/SharePosterScreen.tsx)
// 关键点: collapsable={false}, captureRef tmpfile 格式, Share.open url

import { captureRef } from "react-native-view-shot";
import Share from "react-native-share";
import QRCode from "react-native-qrcode-svg";

// useShareCapture.ts
export function useShareCapture() {
  const viewRef = useRef<View>(null);
  const [isSharing, setIsSharing] = useState(false);

  const captureAndShare = useCallback(async (title: string, message: string) => {
    if (!viewRef.current) return;
    setIsSharing(true);
    try {
      const uri = await captureRef(viewRef, {
        format: "png",
        quality: 0.9,
        result: "tmpfile",
      });
      await Share.open({
        url: uri.startsWith("file://") ? uri : `file://${uri}`,
        type: "image/png",
        title,
        message,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      if (!msg.includes("cancelled") && !msg.includes("CANCEL")) {
        Alert.alert("分享失败", "请稍后重试");
      }
    } finally {
      setIsSharing(false);
    }
  }, []);

  return { viewRef, isSharing, captureAndShare };
}
```

### Anti-Patterns to Avoid

- **限额检查只在前端:** 前端可被绕过，必须在后端 Guard 强制执行。前端计数仅用于 UI 提示
- **Redis key 无 TTL:** 必须在首次 INCR 后设 expire，否则 key 永不过期占用内存
- **分享卡片内放远程图:** react-native-view-shot 要求图片先加载完成，否则截图空白。使用 collapsable={false} + onLoad 回调
- **QR 码内容过长:** 微信小程序路径参数限制，编码内容控制在 128 字符以内
- **佣金实时结算:** 决策 D-15 明确月度手动结算，不要实现实时转账

## Don't Hand-Roll

| Problem      | Don't Build             | Use Instead                 | Why                                                     |
| ------------ | ----------------------- | --------------------------- | ------------------------------------------------------- |
| 每日限额计数 | 自建计数器表 + 定时清理 | Redis INCR + TTL            | 原子操作，天然过期，O(1) 性能。已有 RedisService.incr() |
| 支付订单管理 | 自建支付流程            | PaymentService 已有完整链路 | 微信/支付宝双 provider + 幂等回调 + 事件驱动已实现      |
| 订阅权限检查 | 自建权限系统            | SubscriptionGuard 模式      | 已实现 checkPermission + recordUsage + 响应头透传       |
| 截图功能     | 自建截图 API            | react-native-view-shot      | 跨平台稳定，项目已有集成（SharePosterScreen）           |
| 社交分享     | 自建分享通道            | react-native-share          | 微信/朋友圈/系统分享全支持，项目已安装                  |
| QR 码生成    | 自建 QR 渲染            | react-native-qrcode-svg     | SVG 高清渲染，无原生依赖，离线可用                      |
| 月度定时任务 | 自建 Cron               | BullMQ repeatable jobs      | 项目已用 @nestjs/bullmq，commerce 模块已注册队列        |

**Key insight:** 本阶段的核心价值在**业务逻辑组合**（限额规则 + 支付类型 + 追踪关联），不在基础设施。所有基础设施层已有成熟实现。

## Common Pitfalls

### Pitfall 1: React Native View Shot 截图空白

**What goes wrong:** captureRef 返回的图片是空白或部分空白
**Why it happens:** Android 上 View 组件 collapsable 默认 true，系统可能合并/跳过不可见 View；远程图片未加载完成就截图
**How to avoid:** 1) 所有截图目标 View 必须设 `collapsable={false}`；2) 远程 Image 加 onLoad 确认后才允许截图；3) 避免在 unmounted 组件上调用 captureRef
**Warning signs:** 用户反馈"分享图片是空白的"

### Pitfall 2: Redis TTL 计算错误（时区问题）

**What goes wrong:** 限额不在零点重置，或提前/延后几小时
**Why it happens:** 使用 `new Date()` 默认本地时区，服务器可能 UTC，导致日期 key 和 TTL 到零点的秒数不一致
**How to avoid:** 统一使用 `Asia/Shanghai` 时区计算 today key 和 TTL。`const now = new Date()` 配合 `toLocaleString('en-US', { timeZone: 'Asia/Shanghai' })` 或使用 dayjs/timezone
**Warning signs:** 测试时零点前后限额不重置

### Pitfall 3: 支付回调重复处理

**What goes wrong:** 同一笔支付被重复处理，创建多个 ContentPurchase 记录
**Why it happens:** 网络超时导致支付平台重发回调，或前端重复点击
**How to avoid:** PaymentService 已有 Redis 分布式锁幂等保护（`PAYMENT_IDEMPOTENCY_PREFIX`），ContentPurchase 需加 `@@unique([userId, productType])` 约束
**Warning signs:** 同一用户有多条相同产品的购买记录

### Pitfall 4: 工作室推荐窗口期失效

**What goes wrong:** 用户从推荐到下单超过 7 天，或推荐记录被错误关联到其他工作室
**Why it happens:** 查询 `最近的 StudioReferral` 逻辑不严谨，未过滤 source/未排序
**How to avoid:** 查询条件: `WHERE userId = ? AND createdAt > NOW() - 7d ORDER BY createdAt DESC LIMIT 1`。关联前检查是否已被其他订单关联
**Warning signs:** 佣金账单中工作室推荐量与实际不符

### Pitfall 5: react-native-qrcode-svg 与 react-native-svg 版本冲突

**What goes wrong:** QR 码组件渲染报错或崩溃
**Why it happens:** react-native-qrcode-svg 依赖 react-native-svg，但版本不兼容
**How to avoid:** 安装前检查 `apps/mobile/package.json` 中 react-native-svg 版本，确保 >= 15.0.0
**Warning signs:** Metro bundler 报 SVG 组件错误

## Code Examples

### Redis INCR + TTL 到次日零点

```typescript
// Source: 基于 RedisService (apps/backend/src/common/redis/redis.service.ts)
// D-02 锁定: usage:{userId}:{actionType}:{date} 键格式

async incrementUsage(userId: string, actionType: string): Promise<{ count: number; ttl: number }> {
  const shanghaiNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
  const dateStr = shanghaiNow.toISOString().slice(0, 10);
  const key = `usage:${userId}:${actionType}:${dateStr}`;

  const count = await this.redis.incr(key);

  if (count === 1) {
    // 首次计数，设置 TTL 到次日零点（上海时间）
    const tomorrow = new Date(shanghaiNow);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const ttlSeconds = Math.floor((tomorrow.getTime() - shanghaiNow.getTime()) / 1000);
    await this.redis.expire(key, ttlSeconds);
  }

  const ttl = await this.redis.ttl(key);
  return { count, ttl };
}
```

### ContentPurchase Prisma 模型

```typescript
// D-09: 一次性购买持久化
// 需要添加到 schema.prisma

model ContentPurchase {
  id          String   @id @default(uuid())
  userId      String
  productType ContentProductType
  orderId     String?  // 关联 PaymentOrder
  amount      Decimal  @db.Decimal(10, 2)
  currency    String   @default("CNY")
  status      ContentPurchaseStatus @default(active)

  unlockedAt  DateTime @default(now())
  expiresAt   DateTime? // null = 永久

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id], onDelete: Restrict)

  @@unique([userId, productType]) // 每种产品只能买一次
  @@index([userId])
  @@index([productType])
  @@index([userId, status])
}

enum ContentProductType {
  color_report
  body_report
  capsule_wardrobe
}

enum ContentPurchaseStatus {
  active
  refunded
  expired
}

model StudioReferral {
  id          String   @id @default(uuid())
  studioId    String   // 关联 ConsultantProfile 或 Studio 实体
  userId      String
  source      String   // "chat_recommend" | "profile" | "share_link"
  orderId     String?  // 关联的 Order（首次下单时填入）
  referredAt  DateTime @default(now())
  convertedAt DateTime? // 下单时间
  status      StudioReferralStatus @default(pending)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([studioId])
  @@index([userId])
  @@index([userId, studioId])
  @@index([referredAt])
  @@index([status])
  @@index([userId, referredAt]) // 7天窗口查询
}

enum StudioReferralStatus {
  pending    // 已推荐，未下单
  converted  // 已下单
  expired    // 超过7天窗口
  cancelled  // 订单取消/退款
}

model StudioCommissionBill {
  id            String   @id @default(uuid())
  studioId      String
  period        String   // "2026-04" 格式
  totalReferrals Int     @default(0)
  convertedOrders Int    @default(0)
  totalOrderAmount Decimal @db.Decimal(12, 2) @default(0)
  commissionRate Decimal @db.Decimal(5, 4) // 0.15 ~ 0.20
  commissionAmount Decimal @db.Decimal(12, 2) @default(0)
  status        CommissionBillStatus @default(pending)
  confirmedAt   DateTime?
  paidAt        DateTime?

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([studioId, period])
  @@index([studioId])
  @@index([status])
  @@index([period])
}

enum CommissionBillStatus {
  pending      // 待确认
  confirmed    // 工作室已确认
  paid         // 已线下转账
  disputed     // 有争议
}

model StudioCommissionRate {
  id              String   @id @default(uuid())
  studioId        String   @unique
  rate            Decimal  @db.Decimal(5, 4) // 0.15 ~ 0.20
  effectiveFrom   DateTime @default(now())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([studioId])
}
```

### 渐进提示响应头模式

```typescript
// D-05: 渐进提示 -- 后端在响应头中透传用量信息，前端据此决定提示方式

// Guard 中设置响应头:
private setResponseHeaders(
  context: ExecutionContext,
  limit: number,
  remaining: number,
  unlimited: boolean,
): void {
  const response = context.switchToHttp().getResponse();
  response.setHeader('X-Usage-Limit', unlimited ? -1 : limit);
  response.setHeader('X-Usage-Remaining', unlimited ? -1 : remaining);
  response.setHeader('X-Usage-Reset', this.getSecondsUntilMidnight()); // TTL
}

// 前端拦截器中检查:
// apps/mobile/src/services/api/client.ts 的 response interceptor
const remaining = parseInt(response.headers['x-usage-remaining'] ?? '-1', 10);
const limit = parseInt(response.headers['x-usage-limit'] ?? '-1', 10);
if (limit > 0 && remaining >= 0) {
  const usagePercent = (limit - remaining) / limit;
  if (usagePercent >= 0.8 && remaining > 0) {
    // 80% 渐进提示: toast
    Toast.show({ text: `今日还剩 ${remaining} 次`, type: 'info' });
  }
}
```

### QR 码小程序路径编码

```typescript
// D-12: QR 编码小程序路径参数
// 限制: 微信小程序路径总长度 <= 128 字符

interface ShareQRParams {
  referrerId: string; // 分享者 userId
  cardType: "outfit" | "tryon" | "report";
  cardId?: string; // 卡片关联 ID（可选）
}

function encodeMiniProgramPath(params: ShareQRParams): string {
  // 格式: pages/share/index?r={shortId}&t={type}&c={cardId}
  // r: referrerId 取前 8 位缩短
  // t: 卡片类型缩写 o=outfit, t=tryon, r=report
  const typeMap = { outfit: "o", tryon: "t", report: "r" };
  const shortId = params.referrerId.slice(0, 8);
  let path = `pages/share/index?r=${shortId}&t=${typeMap[params.cardType]}`;
  if (params.cardId) {
    path += `&c=${params.cardId.slice(0, 8)}`;
  }
  return path; // 长度约 50-60 字符，安全
}
```

## State of the Art

| Old Approach                       | Current Approach            | When Changed | Impact                       |
| ---------------------------------- | --------------------------- | ------------ | ---------------------------- |
| 自建计时器限额                     | Redis INCR + date-based key | 2023+        | 零运维成本，天然过期         |
| 会员统一解锁                       | 分层变现（限额+内容+订阅）  | 2024+        | 小红书/得物等主流模式        |
| 前端截图用 react-native-screenshot | react-native-view-shot      | 2020+        | 更稳定，跨平台 API 一致      |
| 分享用 expo-sharing                | react-native-share          | 2023+        | 更多自定义选项，微信直接支持 |
| QR 码后端生成                      | QR 码前端 SVG 渲染          | 2022+        | 无网络延迟，离线可用         |

**Deprecated/outdated:**

- expo-sharing: 功能有限，react-native-share 更全面 [ASSUMED]
- react-native-screenshot: 不维护，react-native-view-shot 是事实标准 [ASSUMED]

## Assumptions Log

| #   | Claim                                                                  | Section        | Risk if Wrong                      |
| --- | ---------------------------------------------------------------------- | -------------- | ---------------------------------- |
| A1  | react-native-svg 版本 >= 15.0.0 兼容 react-native-qrcode-svg 6.x       | Standard Stack | QR 码渲染失败，需降级或升级        |
| A2  | SharePosterScreen 的 react-native-view-shot 已通过 dev-client 验证可用 | Architecture   | 截图功能不可用，需排查 Expo 配置   |
| A3  | 工作室推荐与 ConsultantProfile 一一对应（studioId = consultantId）     | Code Examples  | 需确认工作室数据模型，可能需要新表 |
| A4  | 微信小程序路径参数长度限制 128 字符                                    | Code Examples  | QR 内容过长导致扫码失败            |
| A5  | react-native-qrcode-svg 无需原生链接步骤（纯 JS + SVG）                | Standard Stack | 需额外配置原生链接                 |

## Open Questions

1. **工作室模型映射**

   - What we know: StudioSignalDetector 检测 5 个信号触发推荐，StudioRecommendCard 渲染推荐
   - What's unclear: 工作室是复用 ConsultantProfile 还是独立 Studio 表？CONTEXT 说 "studioId" 但 Prisma 中只有 ConsultantProfile
   - Recommendation: 确认 studioId 是否映射到 consultantProfile.id，还是需要新建 Studio 表

2. **react-native-view-shot 在 Expo dev-client 中的兼容性**

   - What we know: SharePosterScreen 已集成 view-shot，但用 try/catch fallback
   - What's unclear: 是否在 dev-client 环境验证过截图功能正常
   - Recommendation: Plan 01 中先验证 view-shot 截图可用，再实现三种卡片

3. **支付回调中如何区分内容产品 vs 订阅**
   - What we know: PaymentOrder.metadata 是 JSON 字段，可放 productType
   - What's unclear: 现有 PaymentService.getOrderInfo() 如何处理非订阅订单
   - Recommendation: 在 getOrderInfo 中增加 productType 分支，或新建 ContentProductOrder 类型

## Environment Availability

| Dependency              | Required By         | Available  | Version        | Fallback       |
| ----------------------- | ------------------- | ---------- | -------------- | -------------- |
| Redis                   | 限额计数            | Y          | ioredis ^5.3.2 | --             |
| PostgreSQL              | 内容购买/工作室追踪 | Y          | Prisma 5.x     | --             |
| BullMQ                  | 月度佣金 Cron       | Y          | ^5.71.0        | --             |
| react-native-view-shot  | 分享截图            | Y (待验证) | 4.0.3          | expo-sharing   |
| react-native-share      | 社交分享            | Y          | ^11.0.0        | --             |
| react-native-qrcode-svg | QR 码               | N (需安装) | 6.3.21         | 后端 qrcode 库 |
| react-native-svg        | QR 渲染依赖         | Y          | (已安装)       | --             |
| @gorhom/bottom-sheet    | 升级引导            | Y          | ^5.0.0         | --             |

**Missing dependencies with no fallback:**

- 无阻塞性缺失

**Missing dependencies with fallback:**

- react-native-qrcode-svg: 需安装，备选方案为后端生成 QR 图片 URL

## Validation Architecture

### Test Framework

| Property           | Value                                                                         |
| ------------------ | ----------------------------------------------------------------------------- |
| Framework          | Jest + ts-jest (backend), Jest (mobile)                                       |
| Config file        | apps/backend/jest.config.js                                                   |
| Quick run command  | `cd apps/backend && npx jest --testPathPattern=usage-limit --passWithNoTests` |
| Full suite command | `cd apps/backend && npx jest --testPathPattern=commerce`                      |

### Phase Requirements -> Test Map

| Req ID | Behavior                                     | Test Type | Automated Command                                                    | File Exists? |
| ------ | -------------------------------------------- | --------- | -------------------------------------------------------------------- | ------------ |
| MON-01 | Redis INCR 按天计数 + TTL 自动过期           | unit      | `npx jest usage-limit.service.spec --testNamePattern="increment"`    | Wave 0       |
| MON-01 | 超限抛出 UsageLimitExceededException         | unit      | `npx jest usage-limit.guard.spec`                                    | Wave 0       |
| MON-01 | 会员用户跳过限额检查                         | unit      | `npx jest usage-limit.guard.spec --testNamePattern="subscription"`   | Wave 0       |
| MON-02 | ContentPurchase 创建 + 唯一约束              | unit      | `npx jest content-product.service.spec`                              | Wave 0       |
| MON-02 | 支付回调触发 CONTENT_PURCHASE_COMPLETED 事件 | unit      | `npx jest content-product.service.spec --testNamePattern="callback"` | Wave 0       |
| MON-03 | 高级会员订阅（复用 SubscriptionService）     | unit      | `npx jest subscription.service.spec`                                 | Y (existing) |
| MON-04 | captureRef 截图不崩溃                        | unit      | `npx jest useShareCapture.test`                                      | Wave 0       |
| MON-04 | QR 编码路径长度 < 128 字符                   | unit      | `npx jest qr-encoder.test`                                           | Wave 0       |
| SOC-02 | 分享卡片渲染 + Share.open 调用               | manual    | --                                                                   | N/A          |

### Sampling Rate

- **Per task commit:** `cd apps/backend && npx jest --testPathPattern="{usage-limit|content-product|studio-commission}" --passWithNoTests`
- **Per wave merge:** `cd apps/backend && npx jest --testPathPattern="commerce"`
- **Phase gate:** Full commerce suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `apps/backend/src/domains/commerce/usage-limit/__tests__/usage-limit.service.spec.ts` -- covers MON-01
- [ ] `apps/backend/src/domains/commerce/usage-limit/__tests__/usage-limit.guard.spec.ts` -- covers MON-01
- [ ] `apps/backend/src/domains/commerce/content-product/__tests__/content-product.service.spec.ts` -- covers MON-02
- [ ] `apps/backend/src/domains/commerce/studio-commission/__tests__/studio-commission.service.spec.ts` -- covers MON-04
- [ ] `apps/mobile/src/features/sharing/utils/__tests__/qr-encoder.test.ts` -- covers MON-04

## Security Domain

### Applicable ASVS Categories

| ASVS Category         | Applies | Standard Control                                    |
| --------------------- | ------- | --------------------------------------------------- |
| V2 Authentication     | yes     | JWT Guard (已有) -- 所有限额/支付/佣金端点需认证    |
| V3 Session Management | yes     | Redis session -- 限额 key 绑定 userId               |
| V4 Access Control     | yes     | UsageLimitGuard + SubscriptionGuard -- 会员 vs 免费 |
| V5 Input Validation   | yes     | class-validator DTO -- 所有新增端点                 |
| V6 Cryptography       | no      | --                                                  |
| V9 Communication      | yes     | HTTPS -- 支付回调必须 TLS                           |
| V11 Business Logic    | yes     | 限额检查 + 支付金额校验 + 幂等保护                  |

### Known Threat Patterns for NestJS + Redis + Payment Stack

| Pattern                | STRIDE    | Standard Mitigation                                       |
| ---------------------- | --------- | --------------------------------------------------------- |
| 限额绕过（伪造请求头） | Tampering | 后端 Guard 强制检查，不信任前端计数                       |
| 支付金额篡改           | Tampering | PaymentService 已有金额校验 + Order 表二次校验            |
| 支付回调重放           | Spoofing  | Redis 分布式锁幂等保护（已有）                            |
| 佣金刷单               | Elevation | 7 天窗口期 + IP/设备关联 + 异常频率检测                   |
| QR 码钓鱼              | Spoofing  | QR 仅编码官方小程序路径，不含外部 URL                     |
| 限额计数器溢出         | Denial    | Redis INCR 无溢出风险（64 bit int），但需监控异常高频 key |

## Sources

### Primary (HIGH confidence)

- Codebase audit: SubscriptionGuard pattern (apps/backend/src/domains/commerce/subscription/guards/subscription.guard.ts)
- Codebase audit: PaymentService full chain (apps/backend/src/domains/commerce/payment/payment.service.ts)
- Codebase audit: RedisService INCR/expire API (apps/backend/src/common/redis/redis.service.ts)
- Codebase audit: SharePosterScreen view-shot + share integration (apps/mobile/src/features/profile/screens/SharePosterScreen.tsx)
- Codebase audit: Prisma schema (apps/backend/prisma/schema.prisma)
- Codebase audit: BehaviorTrackerService Redis queue pattern (apps/backend/src/domains/platform/analytics/services/behavior-tracker.service.ts)
- Codebase audit: membership-plans config (apps/backend/src/config/membership-plans.ts)

### Secondary (MEDIUM confidence)

- npm registry version checks: react-native-view-shot 4.0.3, react-native-share 11.0.0, react-native-qrcode-svg 6.3.21 [VERIFIED: npm view]
- react-native-view-shot API patterns from web search results (captureRef options, collapsable requirement)

### Tertiary (LOW confidence)

- react-native-qrcode-svg 无原生链接需求的假设 [ASSUMED] -- 需在安装时验证
- 微信小程序路径 128 字符限制 [ASSUMED] -- 需查微信官方文档确认

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH -- 所有核心依赖已在项目中使用或 npm 验证
- Architecture: HIGH -- 基于 SubscriptionGuard/PaymentService 已有模式扩展
- Pitfalls: HIGH -- 来自代码审计发现的实际风险点
- Code examples: HIGH -- 来自项目中已有的实际代码模式

**Research date:** 2026-04-26
**Valid until:** 2026-05-26
