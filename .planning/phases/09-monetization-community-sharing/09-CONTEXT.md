# Phase 9: Monetization + Community + Sharing - Context

**Gathered:** 2026-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 9 delivers the monetization and viral growth layer:

1. **免费层限额系统** — 每日 5 次 AI 对话 + 3 次试穿 + 20 件衣橱的限额计数、BottomSheet 升级引导
2. **内容产品付费** — 色彩报告 9.9 元、体型报告、胶囊衣橱方案 19 元，应用内专属页面 + "预览+解锁"模式
3. **高级会员订阅** — 9.9 元/月，连续穿搭计划 + 深度衣橱诊断 + AI 主动推送
4. **分享裂变** — 穿搭方案/试衣对比/报告摘要三种分享卡片，沉浸式布局 + QR 码 → 小程序体验 → 引导下载
5. **工作室佣金** — 无感点击追踪 + 月度手动结算，15-20% 抽佣闭环

验证标准：免费用户触达限额时收到升级引导；内容产品可购买并解锁完整内容；分享卡片含 QR 码可正常生成和分享；工作室推荐可追踪至成交并计算佣金
</domain>

<decisions>
## Implementation Decisions

### 免费层限额 UX

- **D-01:** BottomSheet 升级引导 — 用户触达限额时弹出 BottomSheet，展示高级会员特权对比表 + "立即升级"按钮。与 TryOnBottomSheet 交互模式一致，不打断主浏览流
- **D-02:** Redis INCR 按天计数 — 使用 `usage:{userId}:{actionType}:{date}` 键格式，INCR 自增 + EXPIRE 设 TTL 至次日零点。高性能，天然过期，已有 Redis 基础设施
- **D-03:** 每日零点重置 — 计数器 key 包含日期，零点后新 key 自然从 0 开始。用户容易理解"每天 5 次"
- **D-04:** 限额守卫中间件 — 新建 `UsageLimitGuard`，在 AI 对话/试穿/衣橱写入前检查 Redis 计数，超限抛出 `UsageLimitExceededException`，前端捕获后弹出 BottomSheet
- **D-05:** 渐进提示 — 用量达 80% 时底部 toast 提示"今日还剩 X 次"，达 100% 弹 BottomSheet。避免突然阻断

### 内容产物形态

- **D-06:** 应用内专属页面 — 购买后永久解锁对应报告 Tab，横向滑动多页沉浸式浏览。复用 ProfileReportScreen (518 行) 的报告 UI 模式，扩展为付费版
- **D-07:** "预览+解锁"模式 — 免费用户可浏览报告预览版（关键数据模糊/打马赛克），点击"解锁完整报告"触发支付流程。转化率高、体验自然
- **D-08:** 胶囊衣橱方案整合用户单品 — 读取用户 savedItems + wishlistedItems，AI 生成补充推荐，组成 30 件胶囊衣橱方案。含搭配组合图 + 购买链接 + 单品复用率统计
- **D-09:** 一次性购买持久化 — Prisma 新增 `ContentPurchase` 模型（userId + productType + orderId + unlockedAt），购买后永久访问

### 分享裂变

- **D-10:** 三种分享卡片类型:
  - **穿搭方案卡片** — 上/下/鞋/配饰四宫格 + 总价 + 场景标签 + QR 码（传播性最强）
  - **试衣对比图** — 用户试衣效果 + AI 评价 + QR 码（需隐私确认后才能分享）
  - **报告摘要卡片** — 色彩分析/风格类型摘要 + QR 码（专业感强）
- **D-11:** 沉浸式图片优先布局 — 全屏搭配图 + 底部品牌 Logo（"寻裳 XUNO"）+ "让 AI 帮你搭"文案 + 右下角小 QR 码。类似小红书笔记风格
- **D-12:** QR → 小程序体验 → 引导下载 — QR 码编码小程序路径参数（分享者 userId + 卡片类型），扫描后进入小程序体验穿搭推荐，底部 RegistrationCTA 引导下载 App
- **D-13:** react-native-view-shot 生成图片 — 决策 #26 已锁定。生成后支持保存到相册 + 分享到微信/朋友圈（使用 react-native-share）

### 工作室佣金

- **D-14:** 无感点击追踪 — 用户点击工作室推荐时，记录 `StudioReferral`（studioId + userId + timestamp + source）。首次下单时自动关联最近的有效推荐（7 天窗口期），无需用户手动填写推荐码
- **D-15:** 月度手动结算 — BullMQ Cron 每月 1 日生成佣金账单（汇总上月工作室推荐产生的已完成订单 + 佣金金额），工作室确认后线下转账。资金安全、纠纷少
- **D-16:** 佣金比例可配置 — `StudioCommissionRate` 表存储每个工作室的抽佣比例（15-20%），支持差异化

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

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 订阅与支付

- `apps/backend/src/domains/commerce/subscription/subscription.service.ts` — 订阅服务（已有续订/取消/升级逻辑）
- `apps/backend/src/domains/commerce/subscription/subscription.controller.ts` — 订阅 REST 端点
- `apps/backend/src/domains/commerce/subscription/guards/subscription.guard.ts` — 订阅守卫（可参考扩展为 UsageLimitGuard）
- `apps/backend/src/domains/commerce/subscription/dto/subscribe.dto.ts` — 订阅 DTO
- `apps/backend/src/domains/commerce/payment/payment.service.ts` — 支付服务（WeChat + Alipay providers）
- `apps/backend/src/domains/commerce/payment/payment.controller.ts` — 支付 REST 端点
- `apps/backend/src/domains/commerce/payment/providers/wechat.provider.ts` — 微信支付
- `apps/backend/src/domains/commerce/payment/providers/alipay.provider.ts` — 支付宝
- `apps/backend/src/domains/commerce/payment/events/payment.events.ts` — 支付事件

### 报告与内容

- `apps/mobile/src/features/profile/screens/ProfileReportScreen.tsx` — 体型/色彩分析报告（518 行，可扩展为付费版）
- `apps/mobile/src/features/commerce/screens/SubscriptionScreen.tsx` — 订阅页面（引用"每周风格报告"作为高级功能）

### 分享与社交

- `apps/mobile/src/shared/hooks/useAnalytics.ts` — AnalyticsEvents 常量（可扩展分享事件）
- `apps/backend/src/domains/social/` — 社交域模块

### 工作室推荐

- `ml/services/stylist/dialog_engine.py` — StudioSignalDetector（5 个触发信号）
- `apps/mobile/src/features/stylist/components/AICompanionProvider.tsx` — StudioRecommendCard 渲染

### 行为追踪与限额

- `apps/backend/src/domains/platform/analytics/services/behavior-tracker.service.ts` — 行为追踪（934 行，Redis 队列）
- `apps/backend/src/domains/platform/analytics/dto/track-event.dto.ts` — 16 种事件类型

### Prisma Schema

- `apps/backend/prisma/schema.prisma` — User + Subscription + Order 模型

### 项目级

- `docs/XUNO_FINAL_PLAN.md` — 42 冻结决策（#12 商业模型、#26 分享图、#38 金融模型）
- `.planning/REQUIREMENTS.md` — MON-01~04, SOC-02

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `SubscriptionGuard`: 已有订阅守卫，可参考模式创建 `UsageLimitGuard`
- `PaymentService` + WeChat/Alipay providers: 完整支付链路，新增内容产品支付复用此基础设施
- `ProfileReportScreen` (518 行): 报告 UI 模式，可扩展为付费版
- `SubscriptionScreen`: 已有会员页面，可扩展加入内容产品购买区
- `StudioSignalDetector`: 工作室推荐触发逻辑已完成
- `BehaviorTrackerService` (934 行): Redis 队列行为追踪，限额计数可复用 Redis 连接
- Phase 8 小程序分享钩子: useShareAppMessage + useShareTimeline，RN 端需新建对应功能

### Established Patterns

- 守卫模式: NestJS @UseGuards() + 自定义 Guard + 抛异常 → 前端捕获
- 支付流程: 创建订单 → 调支付 provider → 回调确认 → 更新状态 → 触发事件
- 事件驱动: PaymentEvents → listeners 异步处理订阅/通知
- Redis 缓存: 行为追踪使用 Redis LPUSH 队列 + @Cron 批量处理
- BottomSheet: TryOnBottomSheet 已有 snapPoints=["70%"] 模式

### Integration Points

- AI 对话/试穿端点 → UsageLimitGuard 前置检查 → Redis INCR 计数
- 报告页面 → "预览+解锁" → PaymentService 创建订单 → 支付回调 → ContentPurchase 解锁
- 穿搭方案/试衣/报告页面 → "分享"按钮 → react-native-view-shot 截图 → react-native-share
- QR 码生成 → 编码小程序路径 → 扫码进入小程序 → RegistrationCTA
- 工作室推荐点击 → StudioReferral 记录 → 下单时关联 → 月度账单汇总

</code_context>

<specifics>
## Specific Ideas

- 限额 BottomSheet 文案参考："今天的 AI 穿搭搭子服务已用完，升级会员无限畅享" + 特权对比（免费 vs 会员）
- 色彩报告预览：展示色环图但核心色板模糊，"解锁你的专属色彩密码 ¥9.9"
- 胶囊衣橱方案：伊伊说"帮你整理了 30 件胶囊衣橱方案，你已有 18 件，只需补充 12 件"
- 分享卡片品牌区：底部深炭灰条带 + "寻裳 XUNO"Logo + "让 AI 帮你搭" + QR 码
- 试衣分享隐私确认：首次分享时弹窗"分享图仅展示试衣效果，不会暴露真实照片"
- 工作室无感追踪：点击 StudioRecommendCard 时前端静默调用 POST /studio/referral/record
- 月度账单：管理后台新增"佣金管理"模块，按工作室维度展示推荐量/成交量/佣金金额

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope
</deferred>

---

_Phase: 09-monetization-community-sharing_
_Context gathered: 2026-04-25_
