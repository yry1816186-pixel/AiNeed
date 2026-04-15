# AiNeed API 一致性审计报告

> 审计时间: 2026-04-13
> 审计范围: C:\AiNeed\apps\backend 全部 Controller (42个) + DTO (36个文件)
> 审计维度: 6 项

---

## 审计摘要

| 维度 | 严重程度 | 问题数量 | 合规率 |
|------|----------|----------|--------|
| /api/v1/ 前缀覆盖率 | 高 | 2 | 95% |
| JSON:API 响应格式一致性 | 高 | 3 | 0% |
| Cursor 分页一致性 | 高 | 2 | 10% |
| 错误响应格式统一性 | 高 | 2 | 50% |
| Swagger 文档覆盖率 | 中 | 4 | 85% |
| DTO 验证装饰器完整性 | 中 | 3 | 75% |

---

## 1. /api/v1/ 前缀覆盖率

### 当前状态

`main.ts` 中配置了全局前缀和 URI 版本控制:

```typescript
app.setGlobalPrefix("api");
app.enableVersioning({
  type: VersioningType.URI,
  defaultVersion: "1",
});
```

这意味着所有 Controller 的路由会自动变为 `/api/v1/{controller-route}`，无需在每个 Controller 中手动添加 `v1` 前缀。

### 问题清单

#### 问题 1.1: DemoController 硬编码了 api/v1 前缀

- **涉及文件**: `src/modules/demo/demo.controller.ts`
- **当前状态**: `@Controller('api/v1/demo')` - 硬编码了完整路径
- **期望状态**: `@Controller('demo')` - 依赖全局前缀机制
- **严重程度**: 高
- **影响**: 实际路由变为 `/api/v1/api/v1/demo`，路径重复，导致端点不可达

#### 问题 1.2: PosterController 与 ProfileController 路由冲突

- **涉及文件**: `src/modules/profile/poster.controller.ts`, `src/modules/profile/profile.controller.ts`
- **当前状态**: 两个 Controller 都使用 `@Controller("profile")`，路由前缀完全相同
- **期望状态**: PosterController 应使用独立前缀如 `@Controller("profile/poster")` 或合并到 ProfileController
- **严重程度**: 高
- **影响**: NestJS 会合并两个 Controller 的路由到同一前缀下，可能导致路由注册顺序问题和方法冲突

---

## 2. JSON:API 响应格式一致性

### 期望标准

统一使用 `{ data, meta, links }` 格式:
```json
{
  "data": { ... },
  "meta": { "total": 100, "page": 1 },
  "links": { "self": "/api/v1/xxx", "next": "/api/v1/xxx?page=2" }
}
```

### 当前状态

项目中定义了多种响应 DTO，但**没有任何 Controller 实际使用** `{ data, meta, links }` 格式。实际存在以下多种不一致的响应格式:

#### 问题 2.1: 响应格式碎片化 - 至少 6 种不同格式

- **涉及文件**: 全部 42 个 Controller
- **当前状态**: 存在以下格式混用:

| 格式 | 使用场景 | 示例 Controller |
|------|----------|-----------------|
| 裸对象直接返回 | 单资源查询 | ProfileController, UsersController, ClothingController |
| `{ items, total }` | 列表查询 | RecommendationsController, ClothingController |
| `{ items, total, page, limit, totalPages }` | 分页列表 | ClothingListResponseDto |
| `{ success: true }` | 操作确认 | CartController, OrderController, AddressController |
| `{ success: true, message: "..." }` | 带消息确认 | RecommendationsController, AuthController |
| `{ success: true, data: ... }` | AI 服务 | AIController |

- **期望状态**: 统一使用 `{ data, meta, links }` 格式
- **严重程度**: 高
- **影响**: 前端需要为每种格式编写不同的解析逻辑，增加维护成本和出错概率

#### 问题 2.2: 公共响应 DTO 未被实际使用

- **涉及文件**: `src/common/dto/response.dto.ts`
- **当前状态**: 定义了 `ApiResponseDto<T>` (含 success/data/error/message/timestamp/path)、`PagedResponseDto<T>` (含 items/total/page/pageSize/hasMore/totalPages)、`PaginatedResponseDto<T>` (含 items/meta) 等多个响应 DTO，但没有任何 Controller 引用或使用它们
- **期望状态**: 所有 Controller 统一使用公共响应 DTO 包装返回值
- **严重程度**: 高
- **影响**: 公共 DTO 形同虚设，响应格式完全取决于各 Controller 的内联返回

#### 问题 2.3: 分页响应格式不统一

- **涉及文件**: 多个 Controller
- **当前状态**: 分页响应字段命名不一致:
  - `ClothingListResponseDto`: `items, total, page, limit, totalPages`
  - `TryOnHistoryResponseDto`: `items, total, page, limit`
  - `PagedResponseDto`: `items, total, page, pageSize, hasMore, totalPages`
  - `PaginatedResponseDto`: `items, meta { nextCursor, hasMore, total }`
  - `SessionListResponseDto`: `sessions, total`
- **期望状态**: 统一使用一种分页响应格式
- **严重程度**: 高
- **影响**: 前端无法编写通用的分页解析逻辑

---

## 3. Cursor 分页一致性

### 期望标准

所有分页端点统一使用 cursor-based 分页（而非 offset/page）。

### 当前状态

项目已定义了 `CursorPaginationDto` (含 cursor/limit/sort/order) 和 `PaginatedResponseDto` (含 nextCursor/hasMore/total)，但**几乎没有 Controller 实际使用 cursor 分页**。

#### 问题 3.1: 绝大多数分页端点使用 offset/page 分页

- **涉及文件**: 以下 Controller 使用 page/offset 分页:

| Controller | 端点 | 分页方式 |
|------------|------|----------|
| ClothingController | GET /clothing | page + limit |
| TryOnController | GET /try-on/history | page + limit |
| FavoritesController | GET /favorites | page + limit |
| OrderController | GET /orders | page + limit |
| SearchController | GET /search | page + limit |
| BrandsController | GET /brands | page + limit |
| CustomizationController | GET /customization | page + limit |
| CommunityController | GET /community/posts/following | page + pageSize |
| PaymentController | GET /payment/records | page + pageSize |
| AiStylistController | GET /ai-stylist/sessions | offset + limit |
| NotificationController | GET /notifications | offset + limit |
| MerchantController | GET /merchant/products | offset + limit |

- **期望状态**: 统一使用 cursor-based 分页
- **严重程度**: 高
- **影响**: (1) 大数据量下 offset 分页性能差; (2) 数据变更时出现重复/遗漏; (3) 与已定义的 CursorPaginationDto 不一致

#### 问题 3.2: 分页参数命名不一致

- **涉及文件**: 多个 Controller
- **当前状态**:
  - 大部分使用 `page` + `limit`
  - CommunityController 使用 `page` + `pageSize`
  - PaymentController 使用 `page` + `pageSize`
  - AiStylistController 使用 `offset` + `limit`
  - NotificationController 使用 `offset` + `limit`
  - MerchantController 使用 `offset` + `limit`
- **期望状态**: 统一使用 `cursor` + `limit` + `sort` + `order`
- **严重程度**: 高
- **影响**: 前端需要为不同端点编写不同的分页参数构造逻辑

---

## 4. 错误响应格式统一性

### 期望标准

统一使用 `{ error: { code, message, details } }` 格式。

### 当前状态

项目中存在**两套互斥的异常过滤器**，输出格式完全不同:

#### 问题 4.1: 两套异常过滤器格式冲突

- **涉及文件**:
  - `src/common/filters/all-exceptions.filter.ts` (当前全局注册)
  - `src/common/filters/http-exception.filter.ts` (未注册但存在)
- **当前状态**:

**AllExceptionsFilter** (全局生效) 输出格式:
```json
{
  "code": 40000,
  "message": "Validation failed",
  "errors": [{ "field": "email", "message": "..." }],
  "timestamp": "2026-04-13T12:00:00.000Z",
  "path": "/api/v1/auth/register",
  "requestId": "xxx"
}
```

**HttpExceptionFilter** (未生效) 输出格式 (JSON:API 规范):
```json
{
  "errors": [{
    "status": "400",
    "code": "VALIDATION_ERROR",
    "title": "Bad Request",
    "detail": "...",
    "source": { "pointer": "/data/attributes/email" },
    "meta": { "timestamp": "...", "requestId": "..." }
  }]
}
```

- **期望状态**: 只保留一套异常过滤器，统一错误格式
- **严重程度**: 高
- **影响**: 如果有人误注册 HttpExceptionFilter，错误格式会突变; 两套代码增加维护负担

#### 问题 4.2: 错误码类型不统一

- **涉及文件**: `src/common/filters/all-exceptions.filter.ts`
- **当前状态**: AllExceptionsFilter 使用数字型业务错误码 (如 40000, 40100, 40400)，而 HttpExceptionFilter 使用字符串型错误码 (如 "VALIDATION_ERROR", "NOT_FOUND")
- **期望状态**: 统一错误码类型（建议使用字符串，更语义化且与 JSON:API 兼容）
- **严重程度**: 中
- **影响**: 前端需要处理两种错误码类型，增加判断逻辑

#### 问题 4.3: 部分 Controller 手动返回错误格式

- **涉及文件**: `src/modules/queue/queue.controller.ts`
- **当前状态**: getJobStatus 和 cancelJob 方法在错误时手动返回 `{ error: "...", statusCode: 404 }`，绕过了全局异常过滤器
- **期望状态**: 应抛出 HttpException/BusinessException，由全局过滤器统一处理
- **严重程度**: 中
- **影响**: 错误响应格式不一致，部分错误缺少 timestamp/path/requestId 等标准字段

---

## 5. Swagger 文档覆盖率

### 当前状态

- 39 个 Controller 文件中有 39 个使用了 `@ApiTags` (100%)
- 279 个端点使用了 `@ApiOperation` (覆盖率高)
- 656 个 `@ApiResponse` 装饰器分布在 38 个文件中

#### 问题 5.1: 3 个 Controller 缺少 @ApiTags

- **涉及文件**:
  - `src/common/storage/storage.controller.ts` - 无 @ApiTags
  - `src/common/guards/csrf/csrf.controller.ts` - 无 @ApiTags
  - `src/modules/analytics/controllers/analytics.controller.ts` - 无 @ApiTags
- **当前状态**: 这 3 个 Controller 在 Swagger 文档中不会被分组显示
- **期望状态**: 添加 @ApiTags 装饰器
- **严重程度**: 低

#### 问题 5.2: 部分 Controller @ApiResponse 缺少 type 声明

- **涉及文件**: CartController, FavoritesController, OrderController, NotificationController 等
- **当前状态**: 多个端点的 `@ApiResponse` 只有 `status` 和 `description`，缺少 `type` 或 `schema` 声明，例如:
  ```typescript
  @ApiResponse({ status: 200, description: "获取成功" })
  ```
- **期望状态**: 每个 @ApiResponse 都应声明返回类型
- **严重程度**: 中
- **影响**: Swagger 文档无法展示响应结构，前端开发者无法从文档了解返回数据格式

#### 问题 5.3: DemoController 的 @ApiTags 使用中文

- **涉及文件**: `src/modules/demo/demo.controller.ts`
- **当前状态**: `@ApiTags('Demo - 比赛演示')`
- **期望状态**: 与其他 Controller 保持一致，使用英文标签名
- **严重程度**: 低

#### 问题 5.4: QueueController 的 @ApiTags 使用英文但与其他不一致

- **涉及文件**: `src/modules/queue/queue.controller.ts`
- **当前状态**: `@ApiTags('AI Task Queue')` - 使用空格和大写
- **期望状态**: 使用 kebab-case 格式如 `@ApiTags('queue')` 或 `@ApiTags('ai-queue')`，与项目其他标签保持一致
- **严重程度**: 低

---

## 6. DTO 验证装饰器完整性

### 当前状态

36 个 DTO 文件中，31 个导入了 class-validator。5 个 DTO 文件缺少 class-validator 导入。

#### 问题 6.1: 5 个 DTO 文件缺少 class-validator 装饰器

- **涉及文件**:
  - `src/modules/photos/dto/photos.dto.ts` - 无 class-validator 导入
  - `src/modules/payment/dto/payment-response.dto.ts` - 无 class-validator 导入
  - `src/modules/analytics/dto/behavior-profile.dto.ts` - 无 class-validator 导入
  - `src/common/dto/paginated-response.dto.ts` - 无 class-validator 导入（响应 DTO，可接受）
  - `src/common/dto/response.dto.ts` - 无 class-validator 导入（响应 DTO，可接受）
- **当前状态**: photos.dto.ts 和 behavior-profile.dto.ts 作为输入 DTO 缺少验证装饰器
- **期望状态**: 所有输入 DTO 都应有 class-validator 装饰器
- **严重程度**: 中
- **影响**: 缺少验证的 DTO 可能导致无效数据通过

#### 问题 6.2: 多个 Controller 内联定义 Body 类型而非使用 DTO

- **涉及文件**:
  - `src/modules/cart/cart.controller.ts` - addItem 方法内联 `{ itemId, color, size, quantity? }`
  - `src/modules/order/order.controller.ts` - pay 方法内联 `{ paymentMethod }`
  - `src/modules/community/community.controller.ts` - followUser 无 body
  - `src/modules/customization/customization.controller.ts` - createRequest/updateRequest 内联 body 类型
  - `src/modules/ai/ai.controller.ts` - recommendOutfit 内联 body 类型
  - `src/modules/ai-stylist/ai-stylist.controller.ts` - chat/submitFeedback 内联 body 类型
- **当前状态**: 这些内联类型不受 class-validator 验证，全局 ValidationPipe 的 whitelist 和 forbidNonWhitelisted 对它们无效
- **期望状态**: 提取为独立的 DTO 类并添加验证装饰器
- **严重程度**: 高
- **影响**: (1) 输入验证缺失，安全风险; (2) Swagger 文档无法展示请求体结构; (3) 与项目其他端点不一致

#### 问题 6.3: CreateOrderDto 定义在 Service 而非 DTO 文件中

- **涉及文件**: `src/modules/order/order.service.ts`
- **当前状态**: `CreateOrderDto` 接口定义在 order.service.ts 中而非独立的 DTO 文件
- **期望状态**: 移至 `src/modules/order/dto/` 目录下的独立文件，并改为 class + class-validator 装饰器
- **严重程度**: 中
- **影响**: (1) 无法被 ValidationPipe 验证; (2) 无法被 Swagger 识别; (3) 违反项目分层约定

---

## 附录: 全部 Controller 路由前缀一览

| Controller | @Controller 前缀 | @ApiTags | 全局前缀后实际路由 |
|------------|-------------------|----------|-------------------|
| AuthController | `auth` | `auth` | /api/v1/auth |
| ClothingController | `clothing` | `clothing` | /api/v1/clothing |
| AiStylistController | `ai-stylist` | `ai-stylist` | /api/v1/ai-stylist |
| TryOnController | `try-on` | `try-on` | /api/v1/try-on |
| RecommendationsController | `recommendations` | `recommendations` | /api/v1/recommendations |
| ProfileController | `profile` | `profile` | /api/v1/profile |
| PosterController | `profile` | `profile` | /api/v1/profile (冲突!) |
| UsersController | `users` | `users` | /api/v1/users |
| CartController | `cart` | `cart` | /api/v1/cart |
| FavoritesController | `favorites` | `favorites` | /api/v1/favorites |
| OrderController | `orders` | `orders` | /api/v1/orders |
| PaymentController | `payment` | `payment` | /api/v1/payment |
| ChatController | `chat` | `chat` | /api/v1/chat |
| NotificationController | `notifications` | `notification` | /api/v1/notifications |
| SearchController | `search` | `search` | /api/v1/search |
| CommunityController | `community` | `community` | /api/v1/community |
| WeatherController | `weather` | `weather` | /api/v1/weather |
| HealthController | `health` | `health` | /api/v1/health |
| SubscriptionController | `subscriptions` | `subscription` | /api/v1/subscriptions |
| ConsultantController | `consultant` | `consultant` | /api/v1/consultant |
| WardrobeCollectionController | `wardrobe-collections` | `wardrobe-collection` | /api/v1/wardrobe-collections |
| MerchantController | `merchant` | `merchant` | /api/v1/merchant |
| PrivacyController | `privacy` | `privacy` | /api/v1/privacy |
| StyleQuizController | `style-quiz` | `style-quiz` | /api/v1/style-quiz |
| StyleProfilesController | `style-profiles` | `style-profiles` | /api/v1/style-profiles |
| PhotosController | `photos` | `photos` | /api/v1/photos |
| PhotoQualityController | `photos` | `photos` | /api/v1/photos (冲突!) |
| ShareTemplateController | `share-template` | `share-template` | /api/v1/share-template |
| BrandsController | `brands` | `brands` | /api/v1/brands |
| OnboardingController | `onboarding` | `onboarding` | /api/v1/onboarding |
| AIController | `ai` | `ai` | /api/v1/ai |
| AddressController | `addresses` | `addresses` | /api/v1/addresses |
| CustomizationController | `customization` | `customization` | /api/v1/customization |
| DemoController | `api/v1/demo` | `Demo - 比赛演示` | /api/v1/api/v1/demo (重复!) |
| QueueController | `queue` | `AI Task Queue` | /api/v1/queue |
| AnalyticsController | `analytics` | (缺失) | /api/v1/analytics |
| StorageController | `storage` | (缺失) | /api/v1/storage |
| CsrfController | `csrf` | (缺失) | /api/v1/csrf |
| MetricsController | `metrics` | `metrics` | /api/v1/metrics |
| FeatureFlagController | `feature-flags` | `feature-flags` | /api/v1/feature-flags |
| CodeRagController | `code-rag` | `code-rag` | /api/v1/code-rag |
| AISafetyController | `ai-safety` | `ai-safety` | /api/v1/ai-safety |

---

## 附录: 分页方式一览

| Controller | 端点 | 分页参数 | 分页方式 |
|------------|------|----------|----------|
| ClothingController | GET / | page, limit | offset (page-based) |
| TryOnController | GET /history | page, limit | offset (page-based) |
| FavoritesController | GET / | page, limit | offset (page-based) |
| OrderController | GET / | page, limit | offset (page-based) |
| SearchController | GET / | page, limit | offset (page-based) |
| BrandsController | GET / | page, limit | offset (page-based) |
| CustomizationController | GET / | page, limit | offset (page-based) |
| PaymentController | GET /records | page, pageSize | offset (page-based) |
| CommunityController | GET /posts/following | page, pageSize | offset (page-based) |
| CommunityController | GET /posts/recommended | page, pageSize | offset (page-based) |
| AiStylistController | GET /sessions | offset, limit | offset (直接偏移) |
| NotificationController | GET / | offset, limit | offset (直接偏移) |
| MerchantController | GET /products | offset, limit | offset (直接偏移) |
| FeatureFlagController | GET / | skip, take | offset (Prisma 风格) |
| QueueController | GET /jobs | limit | 仅限制数量，无分页 |

**结论**: 0 个端点使用 cursor-based 分页。CursorPaginationDto 已定义但完全未被使用。

---

## 修复优先级建议

### P0 - 立即修复 (影响功能正确性)

1. **DemoController 路由重复** - `@Controller('api/v1/demo')` 导致实际路径为 `/api/v1/api/v1/demo`
2. **PosterController 与 ProfileController 路由冲突** - 两个 Controller 注册同一前缀

### P1 - 尽快修复 (影响 API 一致性和安全性)

3. **内联 Body 类型提取为 DTO** - 6+ 个 Controller 的请求体缺少验证
4. **统一错误响应格式** - 删除未使用的 HttpExceptionFilter，确保 QueueController 使用异常而非手动返回
5. **统一分页方式** - 至少统一参数命名 (page+limit vs offset+limit vs page+pageSize)

### P2 - 计划修复 (影响开发体验和文档质量)

6. **统一响应格式** - 引入统一的响应拦截器，包装为 `{ data, meta, links }`
7. **补充 @ApiResponse type 声明** - 提升 Swagger 文档质量
8. **补充缺失的 class-validator 装饰器** - photos.dto.ts, behavior-profile.dto.ts

### P3 - 优化改进

9. **迁移到 cursor-based 分页** - 利用已有的 CursorPaginationDto
10. **统一 @ApiTags 命名风格** - 全部使用 kebab-case 英文
11. **补充缺失 @ApiTags** - StorageController, CsrfController, AnalyticsController
