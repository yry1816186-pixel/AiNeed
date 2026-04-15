# AiNeed API Documentation Coverage Report

Generated: 2026-04-15

## Swagger Infrastructure

- Swagger UI served at `/api/docs` (non-production only)
- DocumentBuilder configured with Bearer auth + API key security
- 27 tagged groups in swagger.config.ts

## Coverage Scorecard

| Check | Status | Coverage |
|-------|--------|----------|
| Swagger setup | PASS | 100% |
| @ApiTags (grouping) | PASS | 52/52 controllers |
| @ApiOperation (descriptions) | PASS | 133/133 endpoints |
| @ApiResponse (response docs) | PARTIAL | ~95% |
| @ApiBearerAuth (auth docs) | PARTIAL | ~97% |
| @ApiBody/@ApiParam/@ApiQuery | PARTIAL | ~75% |
| DTO @ApiProperty | PARTIAL | 7/10 focus modules |

## Gaps

### Missing DTO Files (CRITICAL)
- **cart**: No DTO files at all; controller uses inline body types
- **order**: No DTO files; CreateOrderDto embedded in service
- **search**: No DTO files; uses inline schemas in @ApiBody

### Missing @ApiResponse (10-12 endpoints)
- Cart Phase 5: GET /invalid, DELETE /batch, POST /move-to-favorites, PATCH /:id/sku
- Order Phase 5: PATCH /:id/confirm, DELETE /:id, GET /tab/:tab
- Demo: 5 of 6 endpoints
- Brands, code-rag: 1 each

### Missing @ApiBody
- Cart: 5 endpoints with inline body (addItem, updateItem, selectAll, batchDelete, moveToFavorite, updateSku)
- Order: POST /create, POST /:id/pay
- Payment: POST /create, POST /refund, POST /close

## Action Items

1. Create DTO files with @ApiProperty for cart, order, and search modules
2. Add missing @ApiResponse decorators to cart/order Phase 5 and demo endpoints
3. Add @ApiBody decorators to cart (5), order (2), and payment (3) endpoints

## Positive Findings

- Auth, users, profile, clothing, try-on, payment modules have excellent documentation coverage
- All controllers properly tagged with @ApiTags
- All endpoints have @ApiOperation descriptions
- 793 @ApiProperty decorators across 44 DTO files
- Bearer auth properly documented on protected endpoints