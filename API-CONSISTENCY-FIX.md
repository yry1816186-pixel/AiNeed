# API Consistency Fix Report

**Generated:** 2026-04-15
**Scope:** apps/backend/src/modules/*/dto/ + *controller.ts + *module.ts
**Total Controllers:** 52 | **Total DTOs:** ~130 | **Total Endpoints:** ~280 | **Mobile API Calls:** 241

---

## 1. Path Mismatches (Mobile vs Backend)

| # | Mobile Path | Backend Path | Issue | Fix |
|---|------------|-------------|-------|-----|
| 1 | `/merchants/apply` | `/merchant/apply` | Singular vs plural | Change backend `@Controller("merchant")` → `@Controller("merchants")` |
| 2 | `/merchants/application` | `/merchant/applications/:id` | Singular + path diff | Covered by fix #1 |
| 3 | `/merchants/applications` | `/merchant/applications` | Singular vs plural | Covered by fix #1 |
| 4 | `/wardrobe/collections` | `/wardrobe-collections` | Hyphenated vs nested | Change backend `@Controller("wardrobe-collections")` → `@Controller("wardrobe/collections")` |
| 5 | `/quiz/questions` | `/style-quiz/questions` | Different prefix | Change backend `@Controller("style-quiz")` → `@Controller("quiz")` |
| 6 | `/quiz/submit` | `/style-quiz/answers/batch` | Path diff | Add alias route in style-quiz controller |
| 7 | `/quiz/result` | `/style-quiz/results/latest` | Path diff | Add alias route in style-quiz controller |
| 8 | `/outfits/*` (13 endpoints) | NO controller | Missing backend | Outfit routes handled by wardrobe-collection; mobile calls non-existent endpoints |
| 9 | `/community/users/:userId/profile` | No endpoint | Missing | Add user profile endpoint to community controller |
| 10 | `/cart/summary?couponCode=` | `/cart/summary` (no couponCode) | Missing query param | Add couponCode query param to cart summary |

## 2. Missing @ApiResponse Decorators (~50 endpoints)

### Admin Modules (6 controllers, ~35 endpoints)
- admin-community.controller.ts: 5 endpoints missing @ApiResponse
- admin-content-review.controller.ts: 4 endpoints missing @ApiResponse
- admin-users.controller.ts: 5 endpoints missing @ApiResponse
- admin-audit.controller.ts: 2 endpoints missing @ApiResponse
- admin-config.controller.ts: 4 endpoints missing @ApiResponse
- admin-dashboard.controller.ts: 3 endpoints missing @ApiResponse

### Other Modules (~15 endpoints)
- size-recommendation.controller.ts: 2 endpoints
- refund-request.controller.ts: 4 endpoints
- stock-notification.controller.ts: 3 endpoints
- coupon.controller.ts: 4 endpoints (missing @ApiResponse entirely)
- cart.controller.ts: 6 endpoints (Phase 5 enhanced routes missing @ApiResponse)

## 3. DTO Decorator Issues

### High Priority (Input DTOs missing validation)

| # | File | DTO Class | Issue |
|---|------|-----------|-------|
| 1 | profile/dto/profile.dto.ts | ProfileDetailDto | 12 properties missing @IsOptional, @IsEnum, @IsNumber |
| 2 | profile/dto/profile.dto.ts | UpdateStylePreferencesDto | Missing @IsArray, @IsString({each:true}) |
| 3 | profile/dto/profile.dto.ts | UpdateColorPreferencesDto | Missing @IsArray, @IsString({each:true}) |
| 4 | profile/dto/profile.dto.ts | UpdatePriceRangeDto | Missing @IsOptional, @IsNumber |
| 5 | analytics/dto/track-event.dto.ts | TrackEventDto | 13 properties missing @ApiProperty/@ApiPropertyOptional |
| 6 | analytics/dto/behavior-profile.dto.ts | BehaviorProfileDto | 3 properties missing @ApiProperty + validation |
| 7 | recommendations/dto/recommendations.dto.ts | FeedItemDto | 9 properties missing @ApiProperty + validation |
| 8 | recommendations/dto/recommendations.dto.ts | FeedResponseDto | 3 properties missing @ApiProperty + validation |
| 9 | consultant/dto/match.dto.ts | MatchResultDto | 9 properties missing @ApiProperty + validation |

### Medium Priority (Partial issues)

| # | File | DTO Class | Issue |
|---|------|-----------|-------|
| 1 | admin/dto/admin-community.dto.ts | ModeratePostDto | action: @ApiPropertyOptional → @ApiProperty |
| 2 | admin/dto/admin-community.dto.ts | HandleReportDto | action: @ApiPropertyOptional → @ApiProperty |
| 3 | brands/brand-portal/dto/index.ts | ProductDataUpdateDto | sizeChart: missing @IsObject() |
| 4 | brands/dto/qr-code.dto.ts | BatchGenerateQRCodeDto | products: missing @IsArray, @ValidateNested, @Type |
| 5 | customization/dto/customization-editor.dto.ts | DesignLayerDto | type: @IsString → @IsIn(["image","text","shape"]) |
| 6 | notification/dto/push-notification.dto.ts | SendPushDto | data: missing @IsObject() |
| 7 | size-recommendation/dto/index.ts | SizeRecommendationResponse | confidence: missing @IsIn validation |
| 8 | queue/dto/queue.dto.ts | CreateRecommendationDto | userProfile: missing @IsObject() |
| 9 | admin/dto/content-review.dto.ts | ReviewQueueQueryDto | page/pageSize: missing @IsNumber, @Min, @Max |

## 4. Inline Body Types (should use DTO classes)

| # | Controller | Endpoint | Current | Fix |
|---|-----------|----------|---------|-----|
| 1 | cart.controller.ts | POST / | inline `{ itemId, color, size, quantity? }` | Create AddToCartDto |
| 2 | cart.controller.ts | PUT /:id | inline `{ quantity?, selected? }` | Create UpdateCartItemDto |
| 3 | cart.controller.ts | PUT /select-all | inline `{ selected: boolean }` | Create SelectAllCartDto |
| 4 | cart.controller.ts | DELETE /batch | inline `{ cartItemIds: string[] }` | Create BatchDeleteCartDto |
| 5 | cart.controller.ts | POST /move-to-favorites | inline `{ cartItemIds: string[] }` | Create MoveToFavoritesDto |
| 6 | cart.controller.ts | PATCH /:id/sku | inline `{ color?, size? }` | Create UpdateCartSkuDto |
| 7 | order.controller.ts | POST /:id/pay | inline `{ paymentMethod: string }` | Create PayOrderDto |
| 8 | merchant.controller.ts | PATCH /applications/:id/reject | inline `{ reason: string }` | Use existing or create DTO |
| 9 | merchant.controller.ts | POST /:id/orders/:orderId/ship | inline `{ trackingNumber, carrier }` | Create ShipOrderDto |
| 10 | merchant.controller.ts | PATCH /:id/items/:itemId/stock | inline `{ stock: number }` | Create UpdateStockDto |
| 11 | style-quiz.controller.ts | POST /quizzes/:quizId/progress | inline `{ questionIndex, answers }` | Use QuizProgressDto |

## 5. API Version Consistency

- Global prefix: `api` (set in main.ts)
- URI versioning: `v1` (default version)
- All endpoints resolve to `/api/v1/...` ✅
- No double `/api/v1/` prefix issues found ✅

## 6. Response Format Consistency

- JSON:API interceptor registered globally ✅
- All responses wrapped in `{ data: ..., meta: ... }` format ✅
- Some controllers return raw objects without wrapping (need verification)

## 7. Missing Pagination DTO

- No shared `PaginationQueryDto` base class exists
- Each module defines its own page/limit query params
- Need to create shared `PaginationQueryDto` in common/dto/

---

## Fix Plan (Priority Order)

### Wave 1: Path Mismatches (Critical - breaks mobile)
1. merchant controller: `"merchant"` → `"merchants"`
2. wardrobe-collection controller: `"wardrobe-collections"` → `"wardrobe/collections"`
3. style-quiz controller: `"style-quiz"` → `"quiz"` + add alias routes
4. Add missing community user profile endpoint
5. Add couponCode query param to cart summary

### Wave 2: DTO Validation (High - data integrity)
1. Fix ProfileDetailDto + related DTOs
2. Fix TrackEventDto + BehaviorProfileDto
3. Fix FeedItemDto + FeedResponseDto
4. Fix MatchResultDto
5. Fix all medium-priority DTOs

### Wave 3: Swagger Decorators (Medium - documentation)
1. Add @ApiResponse to all admin controllers
2. Add @ApiResponse to other missing controllers
3. Create DTO classes for inline body types
4. Create shared PaginationQueryDto

### Wave 4: Verification
1. Start backend, verify Swagger UI at /api/docs
2. Verify all endpoints have documentation
3. Verify all DTOs have validation
4. Verify mobile API paths match backend
