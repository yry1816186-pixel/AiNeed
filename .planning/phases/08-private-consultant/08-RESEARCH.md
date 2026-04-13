# Phase 8: 私人形象顾问对接 - Research

**Gathered:** 2026-04-14
**Status:** Complete

## Executive Summary

Phase 8 实现平台撮合模式，让高价值用户对接专业造型工作室/顾问。后端已有 ConsultantModule（6 端点）+ ChatModule（7 端点）完整骨架，Prisma 模型 ConsultantProfile/ServiceBooking/ChatRoom/ChatMessage 已定义，移动端 4 条路由已注册（PlaceholderScreen）。核心缺口：智能匹配算法、ChatGateway 实时推送、评价模型、排期管理、分阶段付款、结算/提现、4 个移动端页面实现。

---

## 1. Existing Code Analysis

### 1.1 后端 ConsultantModule（可扩展）

**文件:** `apps/backend/src/modules/consultant/`

| 端点 | 方法 | 路径 | 现状 |
|------|------|------|------|
| 创建顾问档案 | POST | /consultant/profiles | ✅ 完整 |
| 顾问列表 | GET | /consultant/profiles | ✅ 支持排序(rating/experience/reviews/latest) |
| 我的档案 | GET | /consultant/profiles/me | ✅ 完整 |
| 顾问详情 | GET | /consultant/profiles/:id | ✅ 完整 |
| 更新档案 | PUT | /consultant/profiles/:id | ✅ 完整 |
| 创建预约 | POST | /consultant/bookings | ✅ 基础 |
| 我的预约 | GET | /consultant/bookings | ✅ 分页+筛选 |
| 预约详情 | GET | /consultant/bookings/:id | ✅ 完整 |
| 更新预约 | PUT | /consultant/bookings/:id | ✅ 状态流转 |
| 顾问端预约 | GET | /consultant/consultants/:id/bookings | ✅ 完整 |

**关键缺失：**
- 无智能匹配端点（需要 POST /consultant/match）
- 无审核管理端点（需要 PUT /consultant/profiles/:id/review）
- 无排期管理端点（需要 GET/POST /consultant/availability）
- 无评价端点（需要 POST /consultant/reviews）
- 无结算端点（需要 GET /consultant/earnings, POST /consultant/withdrawals）

### 1.2 后端 ChatModule（需升级 WebSocket）

**文件:** `apps/backend/src/modules/chat/`

| 端点 | 方法 | 路径 | 现状 |
|------|------|------|------|
| 创建聊天室 | POST | /chat/rooms | ✅ 去重逻辑 |
| 聊天室列表 | GET | /chat/rooms | ✅ 含未读计数 |
| 聊天室详情 | GET | /chat/rooms/:id | ✅ 权限验证 |
| 更新聊天室 | PUT | /chat/rooms/:id | ✅ 启用/禁用 |
| 发送消息 | POST | /chat/messages | ✅ 事务更新 |
| 消息列表 | GET | /chat/rooms/:roomId/messages | ✅ 游标分页 |
| 标记已读 | PUT | /chat/rooms/:roomId/read | ✅ 批量标记 |
| 未读计数 | GET | /chat/rooms/:roomId/unread-count | ✅ 完整 |

**关键缺失：**
- 无 ChatGateway（/ws/chat 命名空间）— 仅 REST，无实时推送
- 无方案卡片消息类型（MessageType 需新增 `proposal`）
- 无文件上传集成（图片/文件消息的 URL 如何生成？需 MinIO 签名 URL）

### 1.3 WebSocket 基础设施

**现有架构：**
- `AppGateway` → `/ws/app` 命名空间（profile/quiz/notification/community 事件）
- `AiGateway` → `/ws/ai` 命名空间（AI 任务事件）
- `EventBusService` → Redis pub/sub + EventEmitter2 桥接
- 事件常量在 `events/index.ts`

**扩展方案（D-04 决策）：**
- 新建 `ChatGateway` → `/ws/chat` 命名空间
- 新增 CHAT_EVENTS 事件常量
- EventBusService 已支持动态注册事件，无需修改核心

### 1.4 Prisma Schema 现状

**已有模型：**
- `ConsultantProfile` — userId, studioName, specialties(Json), yearsOfExperience, certifications(Json), portfolioCases(Json), rating, reviewCount, bio, avatar, status
- `ServiceBooking` — userId, consultantId, serviceType, scheduledAt, durationMinutes, status, notes, cancelReason, price, currency, completedAt, cancelledAt
- `ChatRoom` — userId, consultantId, lastMessageAt, lastMessagePreview, isActive
- `ChatMessage` — roomId, senderId, senderType, content, messageType, imageUrl, fileUrl, isRead, readAt

**需要新增的模型：**
- `ConsultantReview` — 评价模型（rating, content, tags, beforeImages, afterImages）
- `ConsultantAvailability` — 排期模板（dayOfWeek, startTime, endTime, isAvailable）
- `ConsultantEarning` — 收入记录（amount, status, settlementDate）
- `ConsultantWithdrawal` — 提现记录（amount, status, bankInfo）

**需要修改的模型：**
- `MessageType` 枚举 → 新增 `proposal` 类型
- `ServiceBooking` → 新增 depositAmount, finalPaymentAmount, platformFee, consultantPayout 字段
- `ConsultantProfile` → 新增 location, responseTimeAvg 字段

### 1.5 移动端现状

**路由（已注册，PlaceholderScreen）：**
- `AdvisorList` → 顾问列表页
- `AdvisorProfile` → 顾问详情页
- `Booking` → 预约页
- `Chat` → 聊天页

**路由守卫：** AdvisorList/AdvisorProfile → auth, Booking/Chat → auth+vip

**已有组件可复用：**
- `ChatBubble` — 用户/AI 变体，渐变背景，需扩展为用户/顾问变体
- `Rating` — readonly/interactive + compact/default/large，可直接用于评价
- `RatingBadge` — 评分徽章，可用于顾问卡片

**WebSocket 客户端：**
- `wsService` — Socket.IO 客户端，JWT auth + 重连
- 当前仅处理 try_on_complete / try_on_progress 事件
- 需扩展为多命名空间连接（/ws/app + /ws/chat）

---

## 2. Technical Research

### 2.1 智能匹配算法（ADV-03, D-01/02/03）

**四维匹配模型：**

| 维度 | 数据源 | 权重 | 计算方式 |
|------|--------|------|----------|
| 用户画像 | UserProfile.styleProfile | 30% | 体型/肤色/风格偏好与顾问专长的余弦相似度 |
| 需求关键词 | 用户提交的 serviceType + notes | 25% | 关键词与 specialties 的 TF-IDF 匹配 |
| 顾问专长 | ConsultantProfile.specialties | 25% | 专长领域标签精确匹配 + 评分加权 |
| 地理位置 | UserProfile.location + ConsultantProfile.location | 20% | Haversine 距离衰减函数 |

**实现方案：**
- 新建 `ConsultantMatchingService` — 纯计算服务，不依赖外部 AI API
- 匹配度 = Σ(维度分数 × 权重)，输出 0-100 百分比
- 结果附带匹配理由字符串数组
- MVP 不做实时计算，用户提交需求后异步计算（BullMQ 队列）

### 2.2 ChatGateway 设计（ADV-05, D-04/05/06/07/08）

**事件协议设计：**

```typescript
// 客户端 → 服务端
'chat:join'       → { roomId: string }
'chat:leave'      → { roomId: string }
'chat:message'    → { roomId, content, messageType, imageUrl?, fileUrl? }
'chat:typing'     → { roomId, isTyping: boolean }
'chat:read'       → { roomId, lastMessageId? }

// 服务端 → 客户端
'chat:message'    → { message: ChatMessage }
'chat:typing'     → { roomId, senderId, senderType, isTyping }
'chat:read'       → { roomId, readerId, lastMessageId }
'chat:notification' → { type: 'booking_confirmed'|'payment_received'|'proposal_shared', ... }
```

**架构：**
- ChatGateway 注入 ChatService 复用现有消息逻辑
- 发送消息时：REST 写入 DB → EventBus 发布 chat.message.created → ChatGateway 推送
- 离线消息：上线后 REST 拉取未读 → 之后 WebSocket 实时推送

### 2.3 预约排期管理（ADV-04, D-09/10/11）

**时段模板模型：**

```prisma
model ConsultantAvailability {
  id            String   @id @default(uuid())
  consultantId  String
  dayOfWeek     Int      // 0=周日, 1=周一, ..., 6=周六
  startTime     String   // "09:00"
  endTime       String   // "18:00"
  slotDuration  Int      @default(60) // 每个时段时长(分钟)
  isAvailable   Boolean  @default(true)
  // ...
}
```

**冲突检测逻辑：**
1. 顾问设置每周可用时段模板
2. 用户选择日期 → 系统根据模板生成当日可用时段
3. 查询 ServiceBooking 中该日期的已有预约
4. 排除已预约时段，返回可用时段列表
5. MVP 不做实时日历同步，预约创建时再次检查冲突

### 2.4 评价体系（ADV-09, D-12/13）

**评价模型设计：**

```prisma
model ConsultantReview {
  id            String   @id @default(uuid())
  bookingId     String   @unique
  userId        String
  consultantId  String
  rating        Int      // 1-5
  content       String?  @db.Text
  tags          Json     // ["专业", "耐心", "有创意", "准时"]
  beforeImages  Json     // string[]
  afterImages   Json     // string[]
  isAnonymous   Boolean  @default(false)
  // ...
}
```

**综合加权排名（D-13）：**
- 评分 40% + 完成订单数 20% + 回复速度 20% + 匹配度 20%
- 回复速度 = 平均首次响应时间（从 ChatMessage 统计）
- 新顾问保护：完成订单数 < 5 时，用平台均值填充

### 2.5 分阶段付款与结算（ADV-07/08, CC-36/37/38）

**分阶段付款流程：**
1. 用户创建预约 → 支付定金 30% → PaymentModule 创建支付订单
2. 服务完成 → 顾问标记完成 → 系统通知用户支付尾款 70%
3. 用户支付尾款 → 平台扣除佣金 15-20% → 剩余结算给顾问

**现有 PaymentModule 扩展点：**
- PaymentService.createPayment 已支持 alipay/wechat 双通道
- 需新增 `paymentCategory: 'consultant_deposit' | 'consultant_final'` 区分定金/尾款
- 需新增 ConsultantEarning/ConsultantWithdrawal 模型
- 结算周期 T+7/T+15 通过定时任务（@Cron）执行

**取消规则（CC-38）：**
- 提前 24h 取消 → 全额退定金
- 24h 内取消 → 扣定金 20% 给用户补偿，80% 退回

### 2.6 顾问入驻审核（ADV-10, D-14）

**审核流程：**
1. 用户提交顾问申请 → ConsultantProfile.status = pending
2. 管理员审核 → PUT /consultant/profiles/:id/review → status = active/rejected
3. 审核内容：个人信息 + 从业经验 + 作品集 + 资质证书

**现有支持：**
- ConsultantProfile 已有 status 字段（pending/active/suspended/inactive）
- certifications/portfolioCases 已为 Json 类型
- 缺少审核管理端点和审核记录模型

---

## 3. Validation Architecture

### 3.1 Critical User Journeys to Validate

| Journey | Steps | Validation Points |
|---------|-------|-------------------|
| 顾问匹配 | 提交需求 → 匹配 → 查看候选 → 选择 | 匹配算法准确性、响应时间 < 2s |
| 在线预约 | 选顾问 → 查看时段 → 预约 → 支付定金 | 时段冲突检测、支付成功回调 |
| 即时通讯 | 进入聊天 → 发消息 → 收消息 → 已读回执 | WebSocket 连接稳定性、消息不丢失 |
| 分阶段付款 | 支付定金 → 服务完成 → 支付尾款 | 支付状态同步、佣金计算正确 |
| 评价 | 服务完成 → 评价 → 影响排名 | 评分计算、排名更新 |

### 3.2 Edge Cases

- 顾问同时收到多个预约请求的时间冲突
- 用户在服务进行中取消预约的退款逻辑
- WebSocket 断连后消息不丢失（离线消息拉取）
- 评价中的 before/after 图片存储和展示
- 新顾问无评价时的排名公平性
- 高并发下的匹配计算性能

### 3.3 Security Considerations

- 聊天消息内容安全过滤（敏感词/图片审核）
- 顾问资质审核防伪造
- 支付金额篡改防护
- 用户隐私保护（评价匿名选项）
- 聊天室权限验证（仅参与者可访问）

---

## 4. Dependency Analysis

### 4.1 Phase Dependencies

| 依赖 | Phase | 需要的功能 | 现状 |
|------|-------|-----------|------|
| 支付系统 | Phase 5 | 支付宝+微信支付 | ✅ 已实现 |
| 评价体系参考 | Phase 6 | 评价模式参考 | ⚠️ Phase 6 未实现，需自行设计 |
| 用户画像 | Phase 1 | 匹配算法输入 | ⚠️ Phase 1 未实现，需 mock 数据 |

### 4.2 Internal Dependencies

| 模块 | 依赖 | 说明 |
|------|------|------|
| ConsultantMatchingService | UserProfile, StyleProfile | 匹配算法需要画像数据 |
| ChatGateway | ChatService, EventBusService | 实时推送需要事件桥接 |
| 分阶段付款 | PaymentService, ServiceBooking | 扩展现有支付流程 |
| 评价系统 | ConsultantProfile.rating | 写入时需更新评分统计 |

---

## 5. Implementation Complexity Assessment

| 功能 | 复杂度 | 工作量估计 | 风险 |
|------|--------|-----------|------|
| 智能匹配算法 | 中 | 后端 1 个服务 + 1 个端点 | 低 — 纯计算 |
| ChatGateway 实时推送 | 高 | 后端 1 个 Gateway + 事件集成 | 中 — WebSocket 稳定性 |
| 预约排期管理 | 中 | 后端 1 个服务 + 2 个模型 + 2 个端点 | 低 |
| 分阶段付款 | 高 | 后端扩展 PaymentService + 2 个模型 | 高 — 涉及资金 |
| 评价体系 | 中 | 后端 1 个模型 + 2 个端点 + 排名算法 | 低 |
| 结算/提现 | 高 | 后端 2 个模型 + 定时任务 + 银行对接 | 高 — 涉及资金 |
| 顾问入驻审核 | 低 | 后端 1 个端点 + 状态流转 | 低 |
| 移动端 4 个页面 | 高 | 4 个完整页面 + API + Store + WS 集成 | 中 |
| 移动端 WS 扩展 | 中 | wsService 多命名空间 + 事件监听 | 中 |

---

## RESEARCH COMPLETE
