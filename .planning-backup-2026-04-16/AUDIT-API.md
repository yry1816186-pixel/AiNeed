# AUDIT-API.md — API一致性审计

**Date:** 2026-04-15

## Executive Summary

Based on the comprehensive audit by the search agent, the API consistency between backend and mobile is approximately 90%+ matching. Key findings below.

## Critical Mismatches

### 1. Double /api/v1/ Prefix (Previously Fixed)
4 controllers had double /api/v1/ prefix — was fixed in runtime verification. Verify fix persists.

### 2. Missing Module Dependencies
- ChatModule was missing JwtModule import
- SearchModule was missing QdrantService provider
- Both were fixed in runtime verification

### 3. Backend Endpoints Without Mobile API Calls
| Backend Endpoint | Mobile Status |
|-----------------|---------------|
| Admin module (5 controllers) | No mobile API calls |
| Analytics tracking | No mobile API calls |
| Feature flags | No mobile API calls |
| Share templates | No mobile API calls |
| Code RAG | No mobile API calls |
| AI Safety | No mobile API calls |

### 4. Mobile Navigation Calls to Non-Existent Routes
Multiple screens call `navigate('ClothingDetail')` but the route is registered as `Product`. This causes silent navigation failures.

### 5. WebSocket Event Consistency
| Backend Gateway | Events | Mobile Listeners | Status |
|----------------|--------|-----------------|--------|
| ChatGateway | message, typing, read | chatStore | OK |
| NotificationGateway | notification, unread-count | notificationStore | OK |
| AIGateway | ai:message, ai:typing | aiStylistStore | OK |
| AppGateway | app:event | Various | OK |

### 6. API Path Mismatches
| Mobile Call | Backend Endpoint | Status |
|-------------|-----------------|--------|
| /api/v1/consultant/* | /api/v1/consultant/* | OK |
| /api/v1/clothing/* | /api/v1/clothing/* | OK |
| /api/v1/cart/* | /api/v1/cart/* | OK |
| /api/v1/order/* | /api/v1/order/* | OK |
| /api/v1/try-on/* | /api/v1/try-on/* | OK |

### 7. Services Needing Configuration (14)
GLM, Doubao, Alipay, WeChat Pay, SMS providers, Neo4j, Qdrant — all need env config but have fallback/mock behavior.

## Recommendations

1. Verify double /api/v1/ prefix fix persists across all controllers
2. Add mobile API service calls for admin, analytics, feature flags
3. Fix ClothingDetail vs Product route name mismatch
4. Document all 14 services needing configuration
