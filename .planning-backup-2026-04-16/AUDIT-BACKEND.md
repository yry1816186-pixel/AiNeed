# AUDIT-BACKEND.md — 后端逐模块审计

**Date:** 2026-04-15
**Modules Audited:** 49 module files across 35+ feature modules

## Executive Summary

| Check | Status | Severity |
|-------|--------|----------|
| DTO class-validator | MOSTLY PASS (3 gaps) | Medium |
| Controller Swagger | PASS (all 52 controllers) | -- |
| Service error handling | PARTIAL | High |
| Prisma select | PARTIAL (inconsistent) | Medium |
| Hardcoded URLs | FAIL (26+ localhost URLs) | High |
| Circular dependencies | WARNING (15 forwardRef) | Medium |
| Queue retry config | FAIL (0/6 processors have retry) | High |
| WebSocket auth guards | PARTIAL (manual JWT, no NestJS guard) | Medium |
| Async return types | PARTIAL (100+ missing) | Medium |
| `any` types | FAIL (34 in services, ~83 total) | High |
| TODO/FIXME | 2 TODOs | Low |

## Critical Findings

### 1. Queue Processors — Zero Retry Configuration (P0)
All 6 BullMQ processors have NO retry/backoff/attempts configuration:
- QueueProcessor, StyleAnalysisProcessor, VirtualTryOnProcessor, WardrobeMatchProcessor, ContentModerationProcessor, FeatureFlagProcessor
- Failed jobs will NOT be automatically retried

### 2. Hardcoded localhost URLs (P0)
26+ instances of `http://localhost:XXXX` as fallback defaults in production code:
- AI services: ai-integration, hybrid-processing, ai-safety, agent-tools (all :8001)
- Recommendations: gnn-compatibility, multimodal-fusion, sasrec-client, sasrec (:8001-:8100)
- Photos: photo-quality, ai-analysis (:8001), body-image-analysis (:8003)
- Health/System: health.service, system-readiness (:8001)
- Try-on: try-on.service (:8000)
- Payment: payment.service (:3001 BACKEND_URL)
- Auth: auth.service (:3000 FRONTEND_URL)
- WS Gateways: all 4 gateways (:3000 CORS)
- Weather: dev API URL in production code

### 3. `any` Types (P1)
34 occurrences in service files, ~83 total across backend:
- cloud-communication.service.ts: 3x `Promise<any>` on public methods
- community.service.ts: 7x `as any` casts
- auth.service.ts: 5x `as any` for wechat/gender fields
- push-notification.service.ts: 2x `any` typed fields

### 4. Missing Async Return Types (P1)
100+ async methods lack explicit return type annotations across:
- community (~16), consultant (~15), clothing (~8), style-quiz (~10), blogger (~8)

### 5. Bidirectional Circular Dependencies (P1)
3 pairs of modules with bidirectional forwardRef:
- AiStylistModule <-> RecommendationsModule
- QueueModule <-> CommunityModule
- BrandsModule <-> BrandPortalModule

### 6. WebSocket Auth — Manual JWT (P2)
All 4 gateways use manual `jwtService.verify()` in `handleConnection` instead of NestJS `@UseGuards(AuthGuard)`. Duplicated logic, no centralized guard composition.

### 7. DTO Validation Gaps (P2)
- behavior-profile.dto.ts: NO class-validator, NO @ApiProperty
- size-recommendation/dto/index.ts: Has @ApiProperty but NO class-validator

### 8. Silent Error Swallowing (P1)
- clothing.service.ts:443 — `.catch(() => {})` silently discards errors

### 9. Weather Service Dev API in Production (P0)
- weather.service.ts:40 — Uses `devapi.qweather.com` (development API) in production code

### 10. TODO Comments (P2)
- profile.controller.ts:201,278 — "TODO: integrate with external ML analysis API for real results"
