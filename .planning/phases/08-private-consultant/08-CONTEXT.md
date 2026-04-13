# Phase 8: 私人形象顾问对接 - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

高价值用户对接专业造型工作室/顾问，平台撮合模式。用户提交需求 → 智能匹配顾问 → App 内沟通预约 → 分阶段付款 → 评价评分。包含：需求提交、四维智能匹配、在线预约、App 内即时通讯、方案文件分享、分阶段付款与平台抽成、评价评分体系、顾问入驻审核、服务案例展示。

**不包含：** AI 造型师对话（Phase 2）、虚拟试衣（Phase 3）、社区功能（Phase 6）、定制服务（Phase 7）

**已有骨架：**
- 后端 ConsultantModule（6 端点）+ ChatModule（7 端点）已实现
- Prisma ConsultantProfile / ServiceBooking / ChatRoom / ChatMessage 模型已定义
- 移动端 4 条路由（AdvisorList / AdvisorProfile / Booking / Chat）已注册（PlaceholderScreen）
- WebSocket 基础设施（3 Gateway + EventBusService）
- 支付模块（支付宝 + 微信）
- ChatBubble / Rating 移动端组件

</domain>

<decisions>
## Implementation Decisions

### 顾问匹配方式
- **D-01:** 智能匹配优先 — 用户提交需求后，系统基于画像+需求关键词自动推荐 3-5 个最合适的顾问，用户从中选择
- **D-02:** 四维匹配算法 — 用户画像（体型/肤色/风格偏好）+ 需求关键词 + 顾问专长领域 + 地理位置，权重可配置
- **D-03:** 匹配结果展示 — 推荐 3-5 个候选，每个显示匹配度百分比 + 匹配理由（"擅长你的体型"/"距离最近"/"评分最高"），用户可查看详情后选择

### 即时通讯架构
- **D-04:** 新建 Chat Gateway — 在 `/ws/chat` 命名空间下专门处理聊天消息实时推送，与现有 `/ws/app` 和 `/ws/ai` 隔离
- **D-05:** 四类消息类型 — 文字 + 图片 + 文件 + 系统消息（预约确认/支付通知/方案分享），复用 Prisma MessageType 枚举和 ChatBubble 组件
- **D-06:** 方案文件内嵌分享 — 顾问创建方案文档（穿搭建议/购物清单/色彩分析报告），作为特殊消息类型（方案卡片）发送，用户可保存到灵感衣橱
- **D-07:** 已读回执 — 显示已读/未读状态，复用 Prisma ChatMessage.isRead + readAt 字段和 ChatService.markAsRead
- **D-08:** 离线消息处理 — 上线拉取 + 实时推送结合：用户上线后通过 REST API 拉取离线期间未读消息，之后通过 WebSocket 实时推送新消息

### 预约与排期
- **D-09:** 时段模板 + 自动冲突检测 — 顾问设置每周可用时段模板（如"周一至周五 10:00-18:00"），用户在可用时段中选择，系统自动检测时间冲突
- **D-10:** 日历 + 时段列表视图 — 用户端展示日历视图（已预约标灰，可选时段高亮），点击日期显示当日可用时段列表
- **D-11:** 线上服务为主 — MVP 以线上视频/语音咨询为主，线下见面为辅。线上服务不受地理位置限制，匹配范围更广

### 评价与信任体系
- **D-12:** 多维评价模型 — 1-5 星总体评分 + 文字评价 + 标签选择（专业/耐心/有创意/准时等）+ before/after 图片
- **D-13:** 综合加权排名 — 评分（40%）+ 完成订单数（20%）+ 回复速度（20%）+ 匹配度（20%），多维度公平，避免新顾问无法上榜
- **D-14:** 资质 + 作品集审核 — 顾问申请时提交个人信息 + 从业经验 + 作品集 + 资质证书，平台审核通过后上架，审核状态：待审核/已通过/已拒绝
- **D-15:** 卡片式案例展示 — 顾问主页展示服务案例卡片：before/after 对比图 + 服务类型标签 + 客户评价摘要 + 服务价格参考

### 继承的跨阶段决策
- **CC-36:** 平台抽成 15-20%
- **CC-37:** 分阶段付款 — 30% 定金 + 70% 尾款
- **CC-38:** 顾问取消规则 — 提前 24h 取消免费，24h 内取消扣定金 20% 给用户补偿
- **CC-09:** JSON:API 规范式响应格式
- **CC-10:** Cursor 分页
- **CC-11-18:** 移动端 UX 规范（骨架屏、引导式空状态、浅色模式、FlashList 等）

### Claude's Discretion
- 四维匹配算法的具体权重和评分公式
- Chat Gateway 的具体事件协议设计
- 顾问时段模板的 Prisma 模型设计
- 评价标签的具体列表
- 结算/提现的具体实现方案
- 顾问入驻审核的 Admin 后台界面

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 后端 Consultant 模块
- `apps/backend/src/modules/consultant/consultant.module.ts` — 模块注册
- `apps/backend/src/modules/consultant/consultant.controller.ts` — 6 个端点（顾问档案 + 服务预约）
- `apps/backend/src/modules/consultant/consultant.service.ts` — 完整 CRUD + 预约生命周期
- `apps/backend/src/modules/consultant/dto/consultant.dto.ts` — 验证 DTO + 枚举（ConsultantStatus, ServiceType, BookingStatus）

### 后端 Chat 模块
- `apps/backend/src/modules/chat/chat.module.ts` — 模块注册
- `apps/backend/src/modules/chat/chat.controller.ts` — 7 个端点（聊天室 + 消息）
- `apps/backend/src/modules/chat/chat.service.ts` — 聊天室创建/消息发送/已读回执/未读计数
- `apps/backend/src/modules/chat/dto/chat.dto.ts` — SenderType/MessageType 枚举 + cursor 分页

### 后端 WebSocket 基础设施
- `apps/backend/src/modules/ws/ws.module.ts` — WS 模块注册
- `apps/backend/src/modules/ws/gateways/app.gateway.ts` — /ws/app 命名空间
- `apps/backend/src/modules/ws/gateways/ai.gateway.ts` — /ws/ai 命名空间
- `apps/backend/src/modules/ws/ws.gateway.ts` — /ws/ai 命名空间（legacy）
- `apps/backend/src/modules/ws/services/event-bus.service.ts` — Redis pub/sub + EventEmitter2
- `apps/backend/src/modules/ws/events/index.ts` — 事件常量

### 后端支付模块
- `apps/backend/src/modules/payment/` — 支付宝 + 微信支付 + 支付事件 + 安全守卫

### Prisma Schema
- `apps/backend/prisma/schema.prisma` §ConsultantProfile (L1621-1647) — 顾问档案模型
- `apps/backend/prisma/schema.prisma` §ServiceBooking (L1666-1696) — 服务预约模型
- `apps/backend/prisma/schema.prisma` §ChatRoom (L1710-1731) — 聊天室模型
- `apps/backend/prisma/schema.prisma` §ChatMessage (L1733-1754) — 聊天消息模型
- `apps/backend/prisma/schema.prisma` §Enums (L1614-1708) — ConsultantStatus/ServiceType/BookingStatus/SenderType/MessageType

### 移动端导航
- `apps/mobile/src/navigation/types.ts` — Phase 8 路由定义 + guards (auth+vip) + 深链接
- `apps/mobile/src/navigation/MainStackNavigator.tsx` — PlaceholderScreen 注册

### 移动端组件
- `apps/mobile/src/components/ui/ChatBubble.tsx` — 聊天气泡组件（用户/AI 变体 + 动画）
- `apps/mobile/src/components/ui/Rating.tsx` — 星级评分组件（readonly/interactive + 多尺寸）

### 移动端服务
- `apps/mobile/src/services/websocket.ts` — Socket.IO 客户端（JWT auth + 重连）

### 项目文档
- `.planning/REQUIREMENTS.md` — ADV-01 ~ ADV-11 (11 条需求)
- `.planning/ROADMAP.md` — Phase 8 定义
- `.planning/phases/01-user-profile-style-test/01-CONTEXT.md` — 跨阶段决策（CC-36/37/38 等）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **ConsultantModule**: 完整的顾问档案 CRUD + 预约生命周期（6 端点），可直接扩展匹配算法和审核流程
- **ChatModule**: 完整的聊天室 + 消息管理（7 端点），已实现已读回执和未读计数，需升级为 WebSocket 实时推送
- **ChatBubble 组件**: 已有用户/AI 变体 + 渐变背景 + 时间戳 + 头像 + FadeInUp 动画，可扩展为用户/顾问变体
- **Rating 组件**: 已有 Rating + RatingBadge 导出，支持 readonly/interactive + compact/default/large 变体 + 评价数展示
- **wsService**: 移动端 Socket.IO 客户端，JWT auth + 重连逻辑，当前只处理 try_on_complete 事件，可扩展聊天事件
- **EventBusService**: Redis pub/sub + EventEmitter2 桥接，可直接添加聊天事件类型
- **PaymentModule**: 支付宝 + 微信支付完整实现，可扩展为顾问服务分阶段付款
- **AiQuotaGuard**: AI 配额守卫模式，可参考实现顾问服务配额

### Established Patterns
- **NestJS 模块结构**: module.ts + controller.ts + service.ts + dto/ 目录
- **DTO 验证**: class-validator + class-transformer + Swagger @ApiProperty
- **分页**: { page, pageSize } 查询 DTO → { data, meta: { total, page, pageSize, totalPages } }
- **认证**: @UseGuards(AuthGuard) + @Request() req: RequestWithUser
- **WebSocket**: Socket.IO Gateway + JWT auth + Redis pub/sub + EventBusService
- **Zustand + TanStack Query**: 移动端状态管理
- **移动端导航**: 懒加载 + Suspense + PlaceholderScreen

### Integration Points
- ConsultantModule → 新增匹配算法服务（ConsultantMatchingService）
- ChatModule → 新增 ChatGateway（/ws/chat 命名空间）+ EventBusService 聊天事件
- Prisma Schema → 新增 ConsultantReview 模型 + ConsultantAvailability 模型
- PaymentModule → 扩展分阶段付款（定金 + 尾款）+ 顾问结算/提现
- 移动端 4 个 PlaceholderScreen → 实现为完整页面
- wsService → 扩展聊天事件监听
- 移动端 stores/ → 新增 consultant store + chat store
- 移动端 services/api/ → 新增 consultant.api.ts + chat.api.ts

### 缺失的关键组件
| 组件 | 状态 | 说明 |
|------|------|------|
| ConsultantReview 模型 | 缺失 | Prisma 无评价模型，ConsultantProfile.rating/reviewCount 字段存在但无 CRUD |
| ConsultantAvailability 模型 | 缺失 | 无顾问可用时段模型，ServiceBooking.scheduledAt 存在但无排期管理 |
| ConsultantMatchingService | 缺失 | 无匹配算法服务 |
| ChatGateway | 缺失 | 聊天仅 REST，无 WebSocket 实时推送 |
| 结算/提现 | 缺失 | PaymentModule 无顾问结算功能 |
| 移动端页面 | Placeholder | 4 个页面均为 PlaceholderScreen |
| 移动端 API + Store | 缺失 | 无 consultant.api.ts / chat.api.ts / 对应 Zustand store |

</code_context>

<specifics>
## Specific Ideas

- 智能匹配类似滴滴派单但用户有选择权：系统推荐 3-5 个候选，每个显示匹配度百分比 + 匹配理由
- 四维匹配：用户画像 + 需求关键词 + 顾问专长 + 地理位置，权重可配置
- Chat Gateway 新建 /ws/chat 命名空间，与现有 /ws/app 和 /ws/ai 隔离
- 顾问方案以消息内嵌卡片形式分享，用户可保存到灵感衣橱
- 预约采用 Calendly 模式：顾问设置时段模板，用户日历视图选择
- 线上服务为主（视频/语音咨询），线下为辅
- 评价包含 before/after 对比图，类似小红书笔记卡片展示
- 综合加权排名：评分 40% + 订单数 20% + 回复速度 20% + 匹配度 20%
- 顾问入驻需提交资质 + 作品集，平台审核后上架

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---
*Phase: 08-private-consultant*
*Context gathered: 2026-04-14*
