# AiNeed 业务逻辑审计报告

> 审计日期: 2026-04-13
> 审计范围: C:\AiNeed 全代码库后端业务闭环完整性
> 审计方法: 逐模块代码审查，追踪端到端业务流程

---

## 1. 认证闭环：注册 -> 登录 -> Refresh -> 登出

**完整度评估: 完整**

### 已实现环节

| 环节 | 端点/方法 | 状态 |
|------|-----------|------|
| 邮箱注册 | `POST /auth/register` | 已实现 - 含邮箱查重、密码哈希、自动创建 UserProfile |
| 邮箱登录 | `POST /auth/login` | 已实现 - 含凭证校验、Token 生成 |
| 微信登录 | `POST /auth/wechat/login` | 已实现 - OAuth2.0 授权码模式，自动注册 |
| 手机号登录 | `POST /auth/sms/login` | 已实现 - 验证码校验，自动注册 |
| 发送验证码 | `POST /auth/sms/send` | 已实现 - 含 60s 节流 |
| 刷新 Token | `POST /auth/refresh` | 已实现 - Refresh Token 验证 + 轮转 |
| 登出 | `POST /auth/logout` | 已实现 - 支持单设备/全设备登出 |
| 忘记密码 | `POST /auth/forgot-password` | 已实现 - Redis 存储重置 Token |
| 重置密码 | `POST /auth/reset-password` | 已实现 - 含旧 Token 清理 |
| 获取当前用户 | `GET /auth/me` | 已实现 |

### 缺失环节

- 无明显缺失

### 严重程度: 无

---

## 2. 引导闭环：注册 -> 基本信息 -> 照片 -> 测试 -> 首页

**完整度评估: 部分实现**

### 已实现环节

| 环节 | 端点/方法 | 状态 |
|------|-----------|------|
| 获取引导状态 | `GET /onboarding/state` | 已实现 - 返回当前步骤和已完成步骤 |
| 完成基本信息 | `POST /onboarding/basic-info` | 已实现 - 更新性别/身高/体重，推进到 PHOTO 步骤 |
| 跳过步骤 | `POST /onboarding/skip/:step` | 已实现 - 仅允许跳过 PHOTO 和 STYLE_TEST |
| 获取引导进度 | `GET /onboarding/progress` | 已实现 - 返回百分比和各步骤状态 |

### 缺失环节

| 缺失环节 | 严重程度 | 说明 |
|----------|----------|------|
| 照片上传步骤推进 | **高** | `onboarding.service.ts` 中没有 `completePhoto` 方法。照片上传在 `photos` 模块完成，但从未调用 onboarding 模块将步骤从 PHOTO 推进到 STYLE_TEST。用户上传照片后引导流程卡在 PHOTO 步骤。 |
| 风格测试步骤推进 | **高** | 同理，`style-quiz` 模块完成测试后没有调用 onboarding 模块将步骤从 STYLE_TEST 推进到 COMPLETED。 |
| onboardingCompletedAt 未设置 | **中** | `skipStep` 方法将 `onboardingCompletedAt` 设为 null，但正常完成流程时也没有代码设置 `onboardingCompletedAt = new Date()`。进度展示中依赖此字段判断完成状态。 |
| 引导完成后的首页跳转 | **低** | 后端无引导完成后的首页跳转逻辑（应由前端处理，但需确认前端是否正确读取 `onboardingStep === COMPLETED` 来决定跳转） |

### 严重程度: 高 - 照片和风格测试步骤无法自动推进，引导流程断裂

---

## 3. 风格测试：选题 -> 作答 -> 保存 -> 计算 -> 结果

**完整度评估: 完整**

### 已实现环节

| 环节 | 端点/方法 | 状态 |
|------|-----------|------|
| 创建问卷 | `POST /style-quiz/quizzes` | 已实现 |
| 获取问卷列表 | `GET /style-quiz/quizzes` | 已实现 |
| 获取问卷详情 | `GET /style-quiz/quizzes/:quizId` | 已实现 |
| 智能选题 | `GET /style-quiz/questions` | 已实现 - QuestionSelectorService 智能选题 |
| 提交单题答案 | `POST /style-quiz/answer` | 已实现 - 自动保存，支持重复作答覆盖 |
| 批量提交答案 | `POST /style-quiz/answers/batch` | 已实现 |
| 完成测试计算 | `POST /style-quiz/complete` | 已实现 - 颜色偏好推导 + 风格关键词提取 + 结果保存 |
| 获取测试进度 | `GET /style-quiz/progress` | 已实现 |
| 获取测试结果 | `GET /style-quiz/results` | 已实现 |
| 获取最新结果 | `GET /style-quiz/results/latest` | 已实现 |
| 颜色偏好推导 | ColorDeriverService | 已实现 - 从图片选择推导色相分布 |
| 风格关键词提取 | StyleKeywordExtractorService | 已实现 - 从图片选择提取风格标签 |

### 缺失环节

| 缺失环节 | 严重程度 | 说明 |
|----------|----------|------|
| 测试结果与 onboarding 联动 | **高** | 风格测试完成后未通知 onboarding 模块推进步骤（同闭环 2 的问题） |
| 测试结果写入用户画像 | **中** | `calculateResult` 将结果保存到 `StyleQuizResult` 表，但未将 styleKeywords/colorPreferences 同步写入 UserProfile，导致 AI 造型师可能无法获取用户的风格偏好 |

### 严重程度: 中 - 核心测试流程完整，但与引导流程和用户画像的联动缺失

---

## 4. 照片管道：拍照 -> 质检 -> 上传 -> 加密 -> 分析

**完整度评估: 部分实现**

### 已实现环节

| 环节 | 端点/方法 | 状态 |
|------|-----------|------|
| 照片上传 | `POST /photos/upload` | 已实现 - 支持多种照片类型 |
| 文件校验 | validateImageFile | 已实现 - 格式/大小校验 |
| 恶意文件扫描 | MalwareScannerService | 已实现 - 上传前扫描 |
| EXIF 剥离 | stripExifFromBuffer | 已实现 - 隐私保护 |
| 加密存储 | storage.uploadEncrypted | 已实现 - MinIO 加密上传 |
| AI 分析 | AiAnalysisService.analyzeBodyAndFace | 已实现 - 异步分析，含超时/重试 |
| 分析结果缓存 | AIAnalysisCache | 已实现 - SHA256 哈希去重 |
| 分析结果写回画像 | updateUserProfile | 已实现 - bodyType/skinTone/faceShape/colorSeason |
| 照片列表 | `GET /photos` | 已实现 |
| 照片详情 | `GET /photos/:id` | 已实现 |
| 原图/缩略图 | `GET /photos/:id/asset`, `GET /photos/:id/thumbnail` | 已实现 |
| 删除照片 | `DELETE /photos/:id` | 已实现 |
| 质量检测 | `POST /photos/quality-check` | 已实现 - PhotoQualityService |
| 自动增强 | `POST /photos/enhance` | 已实现 - 本地 fallback |

### 缺失环节

| 缺失环节 | 严重程度 | 说明 |
|----------|----------|------|
| 质检与上传流程断裂 | **高** | 质量检测 (`quality-check`) 和上传 (`upload`) 是两个独立端点，上传流程中并未先调用质检。用户可以直接上传低质量照片，质检形同虚设。应在 `uploadPhoto` 中集成质检前置检查，或前端强制先质检再上传。 |
| 质检本地 fallback 不准确 | **中** | 本地 `estimateComposition` 方法仅根据文件大小判断是否有人像（size > 50000），极不可靠。Python AI 服务不可用时质检结果基本无意义。 |
| 照片上传后未推进 onboarding | **高** | 同闭环 2 问题，照片上传成功后未调用 onboarding 模块推进步骤 |

### 严重程度: 高 - 质检未集成到上传流程，引导步骤无法推进

---

## 5. AI 配额：计数 -> 超限 -> 倒计时 -> 升级引导

**完整度评估: 部分实现**

### 已实现环节

| 环节 | 端点/方法 | 状态 |
|------|-----------|------|
| 配额检查 | AiQuotaService.checkQuota | 已实现 - Redis 计数 |
| 配额消费 | AiQuotaService.consumeQuota | 已实现 - 原子递增 + 自动过期 |
| 配额状态查询 | AiQuotaService.getQuotaStatus | 已实现 - 返回已用/限额/重置时间 |
| 配额重置 | AiQuotaService.resetQuota | 已实现 |
| 超限拦截 | AiQuotaGuard | 已实现 - 返回 429 + retryAfter + 响应头 |
| 倒计时 | calculateResetAt | 已实现 - 返回重置时间戳 |
| 限额配置 | 环境变量 | 已实现 - AI_STYLIST_DAILY_LIMIT / TRY_ON_DAILY_LIMIT |

### 缺失环节

| 缺失环节 | 严重程度 | 说明 |
|----------|----------|------|
| AiQuotaGuard 未挂载到控制器 | **严重** | `SetQuotaType` 装饰器和 `AiQuotaGuard` 已实现，但在 `ai-stylist.controller.ts` 和 `try-on.controller.ts` 的任何端点上均未使用。AI 配额拦截完全失效，用户可以无限调用 AI 服务。 |
| 无配额查询端点 | **高** | `AiQuotaService.getQuotaStatus` 方法存在，但没有暴露为 API 端点。前端无法查询用户当前配额使用情况。 |
| 升级引导缺失 | **中** | 配额超限后仅返回 429 错误，没有引导用户升级订阅的逻辑（如返回升级页面 URL 或订阅方案信息）。 |
| 订阅用户配额提升 | **中** | 配额限额为硬编码的环境变量，未根据用户订阅等级动态调整。订阅用户和免费用户使用相同限额。 |

### 严重程度: 严重 - AI 配额守卫未挂载，核心限流机制完全失效

---

## 6. 支付闭环：下单 -> 支付 -> 回调 -> 对账 -> 状态更新

**完整度评估: 部分实现**

### 已实现环节

| 环节 | 端点/方法 | 状态 |
|------|-----------|------|
| 创建支付 | `POST /payment/create` | 已实现 - 支持支付宝/微信 |
| 查询支付状态 | `GET /payment/query/:orderId` | 已实现 - 含主动查询支付提供商 |
| 轮询支付状态 | `GET /payment/poll/:orderId` | 已实现 - 含频率限制 |
| 支付宝回调 | `POST /payment/callback/alipay` | 已实现 - 含签名验证 |
| 微信回调 | `POST /payment/callback/wechat` | 已实现 |
| 申请退款 | `POST /payment/refund` | 已实现 |
| 关闭订单 | `POST /payment/close` | 已实现 |
| 支付记录列表 | `GET /payment/records` | 已实现 |
| 幂等性保护 | Redis 分布式锁 | 已实现 |
| 金额校验 | handleCallback | 已实现 - 误差 0.01 |
| 超时自动关闭 | handleCloseExpiredPayments | 已实现 - 每 5 分钟 Cron |
| 事件驱动 | EventEmitter2 | 已实现 - PAYMENT_SUCCEEDED/FAILED/REFUNDED/CLOSED |
| 订阅激活 | activateSubscription | 已实现 - 事件驱动解耦 |

### 缺失环节

| 缺失环节 | 严重程度 | 说明 |
|----------|----------|------|
| 支付成功后未更新订单状态 | **严重** | `handleCallback` 中支付成功后仅更新 `PaymentRecord` 和激活订阅，但未调用 `OrderService.updateOrderStatus` 将关联的 `Order` 状态从 `pending` 更新为 `paid`。仅在超时关闭时更新了订单状态为 `cancelled`。用户支付成功后订单仍显示"待支付"。 |
| 主动对账缺失 | **高** | 没有定期对账任务（如每日 T+1 对账），仅依赖回调通知。若回调丢失，支付记录和订单状态将永久不一致。 |
| 退款后订阅降级未实现 | **中** | `PaymentEventListener.handlePaymentRefunded` 中标注 "can be implemented based on business requirements"，但实际未实现订阅降级/取消逻辑。 |
| 支付失败事件未触发 | **中** | `PAYMENT_EVENTS.PAYMENT_FAILED` 事件已定义，但 `handleCallback` 中支付失败时未 emit 此事件，仅更新了记录状态。 |

### 严重程度: 严重 - 支付成功后订单状态不更新，用户支付后仍看到"待支付"

---

## 7. 购物车闭环：添加 -> 修改 -> 删除 -> 结算

**完整度评估: 完整**

### 已实现环节

| 环节 | 端点/方法 | 状态 |
|------|-----------|------|
| 获取购物车 | `GET /cart` | 已实现 - 含商品详情和品牌信息 |
| 购物车统计 | `GET /cart/summary` | 已实现 - 总价/选中价/数量 |
| 添加商品 | `POST /cart` | 已实现 - 含颜色/尺码校验、重复合并 |
| 修改商品 | `PUT /cart/:id` | 已实现 - 数量/选中状态 |
| 删除商品 | `DELETE /cart/:id` | 已实现 |
| 清空购物车 | `DELETE /cart` | 已实现 |
| 全选/取消全选 | `PUT /cart/select-all` | 已实现 |
| 结算（创建订单） | `POST /orders` | 已实现 - OrderService.create，含库存校验/扣减、购物车清理 |

### 缺失环节

| 缺失环节 | 严重程度 | 说明 |
|----------|----------|------|
| 购物车商品失效检测 | **低** | 获取购物车时未检查商品是否已下架或库存变化，用户可能添加已下架商品后结算失败。 |
| 购物车数量上限 | **低** | 未限制购物车商品数量，极端情况下可能影响性能。 |

### 严重程度: 低 - 核心流程完整，仅有边缘优化空间

---

## 8. AI 造型师：会话创建 -> 发消息 -> 推荐 -> 反馈

**完整度评估: 完整**

### 已实现环节

| 环节 | 端点/方法 | 状态 |
|------|-----------|------|
| 创建会话 | `POST /ai-stylist/sessions` | 已实现 - 含用户画像上下文构建 |
| 会话列表 | `GET /ai-stylist/sessions` | 已实现 |
| 会话状态 | `GET /ai-stylist/sessions/:sessionId` | 已实现 |
| 发送消息 | `POST /ai-stylist/sessions/:sessionId/messages` | 已实现 - 含 NLU 槽位提取 |
| 上传照片 | `POST /ai-stylist/sessions/:sessionId/photo` | 已实现 |
| 生成穿搭方案 | `POST /ai-stylist/sessions/:sessionId/resolve` | 已实现 - 推荐服务 |
| 删除会话 | `DELETE /ai-stylist/sessions/:sessionId` | 已实现 |
| 提交反馈 | `POST /ai-stylist/sessions/:sessionId/feedback` | 已实现 - like/dislike |
| 获取反馈 | `GET /ai-stylist/sessions/:sessionId/feedback` | 已实现 |
| 快捷建议 | `GET /ai-stylist/suggestions` | 已实现 |
| 风格选项 | `GET /ai-stylist/options/styles` | 已实现 |
| 场景选项 | `GET /ai-stylist/options/occasions` | 已实现 |
| 上下文编排 | ContextService.deriveOrchestration | 已实现 - 场景/体型/风格/候选/商务五阶段 |
| 旧版兼容 | `POST /ai-stylist/chat` | 已实现 (deprecated) |

### 缺失环节

| 缺失环节 | 严重程度 | 说明 |
|----------|----------|------|
| AI 配额未挂载 | **严重** | 同闭环 5，AiQuotaGuard 未在控制器上使用，AI 造型师调用无配额限制 |
| 反馈未用于优化推荐 | **低** | 反馈数据已保存，但推荐算法未利用反馈数据调整后续推荐权重 |

### 严重程度: 严重（因配额问题）- 核心业务流程完整，但配额限制失效

---

## 9. 虚拟试衣：上传照片 -> 选择服装 -> 生成 -> 保存 -> 分享

**完整度评估: 部分实现**

### 已实现环节

| 环节 | 端点/方法 | 状态 |
|------|-----------|------|
| 创建试衣请求 | `POST /try-on` | 已实现 - 含照片/服装校验、并发限制(3)、缓存复用 |
| 试衣状态查询 | `GET /try-on/:id` | 已实现 |
| 结果图片获取 | `GET /try-on/:id/result-image` | 已实现 |
| 试衣历史 | `GET /try-on/history` | 已实现 - 含分页和状态筛选 |
| 删除试衣记录 | `DELETE /try-on/:id` | 已实现 - 含 MinIO 文件清理 |
| 异步队列处理 | QueueService.addVirtualTryOnTask | 已实现 - BullMQ 异步任务 |
| 结果缓存 | Redis stableCacheKey | 已实现 - 相同照片+服装直接返回缓存 |
| 通知 | NotificationService | 已实现 - 排队通知 |

### 缺失环节

| 缺失环节 | 严重程度 | 说明 |
|----------|----------|------|
| 分享功能缺失 | **高** | 试衣结果没有分享端点。`share-template` 模块存在但未与 try-on 集成，用户无法将试衣结果分享到社区或社交平台。 |
| AI 配额未挂载 | **严重** | 同闭环 5，AiQuotaGuard 未在 try-on 控制器上使用 |
| 试衣结果保存到衣橱 | **中** | 试衣结果未提供"添加到衣橱"或"收藏"功能，用户无法将满意的试衣效果持久化到个人衣橱 |
| 试衣任务完成通知 | **低** | 创建时发送了排队通知，但任务完成时未发送完成通知（依赖前端轮询） |

### 严重程度: 高 - 分享功能缺失，配额限制失效

---

## 审计总结

### 严重程度统计

| 严重程度 | 数量 | 问题 |
|----------|------|------|
| **严重** | 3 | AI 配额守卫未挂载、支付成功后订单状态不更新、配额守卫未挂载(重复) |
| **高** | 5 | 引导步骤无法推进(2处)、质检未集成到上传流程、分享功能缺失、配额查询端点缺失 |
| **中** | 5 | onboardingCompletedAt 未设置、测试结果未写入画像、本地质检 fallback 不可靠、退款后订阅降级缺失、支付失败事件未触发、试衣结果保存到衣橱 |
| **低** | 4 | 购物车商品失效检测、购物车数量上限、反馈未用于优化推荐、试衣完成通知 |

### 核心问题清单（按优先级排序）

1. **[严重] AI 配额守卫未挂载** - `AiQuotaGuard` + `SetQuotaType` 已完整实现但未在任何控制器端点上使用。AI 造型师和虚拟试衣的每日限额完全失效，用户可无限调用。
   - 影响模块: `ai-stylist.controller.ts`, `try-on.controller.ts`
   - 修复建议: 在 `sendMessage`, `resolveSession` 端点添加 `@SetQuotaType('ai-stylist')` 和 `@UseGuards(AiQuotaGuard)`；在 `createTryOn` 端点添加 `@SetQuotaType('try-on')` 和 `@UseGuards(AiQuotaGuard)`

2. **[严重] 支付成功后订单状态不更新** - `PaymentService.handleCallback` 中支付成功后更新了 PaymentRecord 但未更新关联 Order 的状态为 `paid`。
   - 影响模块: `payment.service.ts`
   - 修复建议: 在 `handleCallback` 的事务中添加 `tx.order.update({ where: { id: orderId }, data: { status: OrderStatus.paid, paymentTime: new Date() } })`

3. **[高] 引导步骤无法自动推进** - 照片上传和风格测试完成后未调用 onboarding 模块推进步骤，引导流程卡在 PHOTO/STYLE_TEST。
   - 影响模块: `photos.service.ts`, `style-quiz.service.ts`, `onboarding.service.ts`
   - 修复建议: 在 `PhotosService.uploadPhoto` 和 `StyleQuizService.calculateResult` 完成后调用 `OnboardingService` 推进步骤并设置 `onboardingCompletedAt`

4. **[高] 质检未集成到上传流程** - 质量检测和照片上传是两个独立端点，上传时未强制质检。
   - 影响模块: `photos.service.ts`
   - 修复建议: 在 `uploadPhoto` 方法中先调用 `PhotoQualityService.analyzeQuality`，质量不达标时拒绝上传或给出警告

5. **[高] 虚拟试衣分享功能缺失** - 试衣结果无法分享，`share-template` 模块未与 try-on 集成。
   - 影响模块: `try-on.controller.ts`, `share-template.service.ts`
   - 修复建议: 添加 `POST /try-on/:id/share` 端点，生成分享海报或社交分享链接

6. **[高] AI 配额查询端点缺失** - `AiQuotaService.getQuotaStatus` 方法存在但未暴露为 API。
   - 影响模块: `security` 模块
   - 修复建议: 在 SecurityController 或新建 QuotaController 中暴露 `GET /quota/status` 端点

### 闭环完整度总览

| 闭环 | 完整度 | 关键缺失 |
|------|--------|----------|
| 认证闭环 | **完整** | - |
| 引导闭环 | **部分实现** | 步骤推进断裂、completedAt 未设置 |
| 风格测试 | **完整** | 与引导/画像联动缺失 |
| 照片管道 | **部分实现** | 质检未集成到上传、引导步骤不推进 |
| AI 配额 | **部分实现** | 守卫未挂载、查询端点缺失、升级引导缺失 |
| 支付闭环 | **部分实现** | 订单状态不更新、对账缺失 |
| 购物车闭环 | **完整** | - |
| AI 造型师 | **完整** | 配额守卫未挂载 |
| 虚拟试衣 | **部分实现** | 分享缺失、配额守卫未挂载 |
