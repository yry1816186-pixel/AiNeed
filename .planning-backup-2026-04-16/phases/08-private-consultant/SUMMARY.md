# Phase 08-01 Summary: Schema 扩展 + 智能匹配算法 + 需求提交

## 完成状态: DONE

## 目标
扩展 Prisma Schema 新增 ConsultantReview、ConsultantAvailability、ConsultantEarning、ConsultantWithdrawal 模型，实现四维智能匹配算法和需求提交端点 POST /consultant/match。

## 变更清单

### 08-01-01: Schema 扩展
- **MessageType 枚举** 新增 `proposal` 类型
- **ConsultantProfile** 新增 `location` (Text?) 和 `responseTimeAvg` (Int?) 字段
- **ServiceBooking** 新增分阶段付款字段: `depositAmount`, `finalPaymentAmount`, `platformFee`, `consultantPayout`, `depositPaidAt`, `finalPaidAt`
- **ConsultantReview** 模型: 评价系统 (rating 1-5, tags, before/after images, isAnonymous)
- **ConsultantAvailability** 模型: 顾问可用时段 (dayOfWeek, startTime, endTime, slotDuration)
- **ConsultantEarning** 模型: 收益记录 (amount, platformFee, netAmount, EarningStatus)
- **ConsultantWithdrawal** 模型: 提现记录 (amount, WithdrawalStatus, bankInfo)
- **EarningStatus** 枚举: pending / settled / failed
- **WithdrawalStatus** 枚举: pending / processing / completed / rejected
- User 模型新增关系: consultantReviews, consultantEarnings, consultantWithdrawals
- ServiceBooking 新增关系: review (1:1), earning (1:1)

### 08-01-02: 匹配 DTO
- `ConsultantMatchRequestDto`: serviceType (必填), budgetMin, budgetMax, notes, preferOnline
- `MatchResultDto`: consultantId, studioName, avatar, specialties, rating, reviewCount, matchPercentage, matchReasons, price
- 已更新 `dto/index.ts` 导出新 DTO

### 08-01-03: 四维智能匹配服务
- `ConsultantMatchingService.findMatches(userId, dto)` 返回最多 5 个匹配结果
- 四维匹配算法权重:
  - 画像维度 (profile): 30% - 用户风格偏好与顾问专长重叠度
  - 关键词维度 (keywords): 25% - 需求描述与顾问专长匹配度
  - 专长维度 (specialty): 25% - 服务类型与顾问专长匹配度
  - 位置维度 (location): 20% - 同城优先 (1.0 vs 0.3)
- matchPercentage 上限 99，matchReasons 最多 3 条
- 服务类型关键词映射: styling_consultation / wardrobe_audit / shopping_companion / color_analysis / special_event

### 08-01-04: 控制器与模块
- `POST /consultant/match` 端点，需 AuthGuard 认证
- ConsultantMatchingService 注册到 ConsultantModule providers
- ConsultantController 构造函数注入 ConsultantMatchingService

### 08-01-05: 单元测试
- 10 个测试用例全部通过:
  1. should be defined
  2. findMatches 返回最多 5 个结果按 matchPercentage 降序
  3. findMatches 无 active 顾问时返回空数组
  4. 每个结果包含 matchPercentage (0-99) 和 matchReasons
  5. calcProfileScore 用户风格偏好与顾问专长重叠时高分
  6. calcProfileScore 用户无风格画像时优雅降级
  7. calcKeywordScore 需求关键词与顾问专长匹配时高分
  8. calcSpecialtyScore 服务类型与顾问专长匹配时高分
  9. calcLocationScore 同城顾问更高分
  10. buildMatchReasons 根据维度分数生成匹配理由

### 08-01-06: Prisma 验证
- `prisma validate` 通过 (schema 语法正确)
- `prisma generate` 成功 (Prisma Client v5.22.0 生成)
- `prisma db push` 未执行 (PostgreSQL 未运行，需 Docker 启动后手动执行)

## 验证结果
| 验证项 | 结果 |
|--------|------|
| prisma validate | PASS |
| prisma generate | PASS |
| jest consultant-matching | 10/10 PASS |
| POST /consultant/match 端点 | 已注册 |

## Git 提交
- `9dc8516` feat(06-01): extend Prisma schema with community/blogger models
- `7d68fff` feat(08-01): add consultant match request/response DTOs
- `7a8702c` feat(08-01): implement four-dimension consultant matching service
- `d6ca0da` feat(08-01): register match endpoint and matching service in controller/module
- `62a73fa` test(08-01): add unit tests for consultant matching service

## 待后续处理
- `prisma db push` 需在 PostgreSQL 启动后执行以同步数据库
- ConsultantEarning 模型中 bookingId 为 @unique（一对一关系），与 ServiceBooking.earning 对应
- ConsultantWithdrawal 通过 userId 关联 User，支持顾问提现到银行账户
