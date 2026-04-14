# MASTER-FIX-LIST.md — 全项目修复清单

**Date:** 2026-04-15
**Total Items:** 50
**P0:** 8 | **P1:** 22 | **P2:** 20

## Wave Schedule

- **Wave 1:** P0 items with no dependencies (parallel)
- **Wave 2:** P0 items depending on Wave 1 + P1 items with no dependencies
- **Wave 3:** P1 items depending on Wave 2 + P2 items with no dependencies
- **Wave 4:** Remaining P2 items + pre-existing error fixes

---

## P0 — Must Fix (Blocking)

### FIX-001: Queue Processor Retry Configuration
- **Source:** AUDIT-BACKEND #1
- **Files:** apps/backend/src/modules/queue/queue.processor.ts, apps/backend/src/modules/feature-flags/feature-flag.processor.ts
- **Issue:** All 6 BullMQ processors have zero retry/backoff/attempts. Failed jobs are never retried.
- **Fix:** Add `@Processor({ concurrency: N })` with `attempts: 3, backoff: { type: 'exponential', delay: 5000 }` to all processors
- **Dependencies:** None
- **Impact:** All async jobs (try-on, style analysis, content moderation, feature flags)

### FIX-002: Hardcoded localhost URLs → ConfigService
- **Source:** AUDIT-BACKEND #2
- **Files:** 26+ service files across ai/, recommendations/, photos/, health/, try-on/, payment/, auth/, ws/
- **Issue:** 26+ `http://localhost:XXXX` as fallback defaults. Should fail fast if env vars missing.
- **Fix:** Replace all `|| 'http://localhost:XXXX'` with ConfigService injection. Throw if env var not set in production.
- **Dependencies:** None
- **Impact:** All external service calls

### FIX-003: Weather Service Dev API in Production
- **Source:** AUDIT-BACKEND #9
- **Files:** apps/backend/src/modules/weather/weather.service.ts:40
- **Issue:** Uses `devapi.qweather.com` (development API) in production code
- **Fix:** Use production API endpoint `api.qweather.com` with env-based switching
- **Dependencies:** None
- **Impact:** Weather feature

### FIX-004: Test Account Password in Version Control
- **Source:** AUDIT-SECURITY SEC-01
- **Files:** apps/backend/.env.example:122-124
- **Issue:** `TEST_ACCOUNT_PASSWORD=Test123456!` committed to VCS
- **Fix:** Remove password from .env.example. Add startup validation rejecting known test passwords in non-test environments.
- **Dependencies:** None
- **Impact:** Security

### FIX-005: JWT Secret Minimum Length Inconsistency
- **Source:** AUDIT-SECURITY SEC-02
- **Files:** apps/backend/src/common/config/env.config.ts:55-61
- **Issue:** @MinLength(32) allows 32-char secrets, but production requires 64+ chars
- **Fix:** Change @MinLength(32) to @MinLength(64) for JWT_SECRET and JWT_REFRESH_SECRET
- **Dependencies:** None
- **Impact:** Authentication security

### FIX-006: Backend TS Compilation Error
- **Source:** AUDIT-COMPILE
- **Files:** apps/backend/src/modules/community/community.controller.ts:296
- **Issue:** Property 'getUserPublicProfile' does not exist on type 'CommunityService'
- **Fix:** Add getUserPublicProfile method to CommunityService or fix the controller call
- **Dependencies:** None
- **Impact:** Compilation

### FIX-007: Navigation Type System — Stale 6-Tab Definition
- **Source:** AUDIT-NAVIGATION #1
- **Files:** apps/mobile/src/types/navigation.d.ts:42-49
- **Issue:** MainTabParamList declares 6 tabs (Home/Explore/Heart/Cart/Wardrobe/Profile) but actual is 5-tab
- **Fix:** Update MainTabParamList to match 5-tab implementation (Home/Stylist/TryOn/Community/Profile)
- **Dependencies:** None
- **Impact:** All navigation type safety

### FIX-008: Broken Navigation Calls (13+ routes)
- **Source:** AUDIT-NAVIGATION #2
- **Files:** HomeScreen, SettingsScreen, RegisterScreen, WardrobeScreen, SearchScreen, NotificationsScreen, FavoritesScreen, OutfitRecommendationCards, ProfileScreen, CustomizationScreen, CustomizationEditorScreen, CameraScreen
- **Issue:** Navigation calls to non-existent routes (Explore, Heart, TermsOfService, PrivacyPolicy, ClothingDetail, RecommendationFeed, Customization, BrandQRScan, CustomizationPreview, PhotoPreview)
- **Fix:** Replace with correct route names: ClothingDetail→Product, TermsOfService→Legal{type:'terms'}, PrivacyPolicy→Legal{type:'privacy'}, etc.
- **Dependencies:** FIX-007

---

## P1 — Should Fix

### FIX-009: bcrypt/scrypt Documentation Mismatch
- **Source:** AUDIT-SECURITY SEC-03
- **Files:** apps/backend/src/common/security/bcrypt.ts:12-16
- **Fix:** Remove misleading _rounds param, update docs, add explicit scrypt cost parameter

### FIX-010: JWT Blacklist Bypass Without jti
- **Source:** AUDIT-SECURITY SEC-04
- **Files:** apps/backend/src/modules/auth/strategies/jwt.strategy.ts:33-39
- **Fix:** Add hard check that jti must be present; reject tokens without it

### FIX-011: Inconsistent PII Field Definitions
- **Source:** AUDIT-SECURITY SEC-05
- **Files:** common/encryption/pii-encryption.service.ts, modules/security/encryption/pii-encryption.service.ts
- **Fix:** Consolidate into single definition including both email and realName

### FIX-012: Notification Gateway JWT from Query Parameter
- **Source:** AUDIT-SECURITY SEC-06
- **Files:** apps/backend/src/common/gateway/notification.gateway.ts:176
- **Fix:** Remove query?.token, consistent with other gateways

### FIX-013: Backend `any` Types (34 in services)
- **Source:** AUDIT-BACKEND #3
- **Files:** cloud-communication.service.ts, community.service.ts, auth.service.ts, push-notification.service.ts, etc.
- **Fix:** Replace with proper types. Priority: cloud-communication (3x Promise<any>), community (7x), auth (5x)

### FIX-014: Missing Async Return Types (100+)
- **Source:** AUDIT-BACKEND #4
- **Files:** community, consultant, clothing, style-quiz, blogger, coupon, chat, order, admin services
- **Fix:** Add explicit Promise<ReturnType> annotations

### FIX-015: Bidirectional Circular Dependencies
- **Source:** AUDIT-BACKEND #5
- **Files:** AiStylistModule<->RecommendationsModule, QueueModule<->CommunityModule, BrandsModule<->BrandPortalModule
- **Fix:** Extract shared logic to break cycles

### FIX-016: WebSocket Auth Guard Standardization
- **Source:** AUDIT-BACKEND #6
- **Files:** chat.gateway.ts, ws.gateway.ts, ai.gateway.ts, app.gateway.ts
- **Fix:** Create shared WsGuard, replace manual JWT validation

### FIX-017: Silent Error Swallowing
- **Source:** AUDIT-BACKEND #8
- **Files:** apps/backend/src/modules/clothing/clothing.service.ts:443
- **Fix:** Replace `.catch(() => {})` with proper error logging

### FIX-018: DTO Validation Gaps
- **Source:** AUDIT-BACKEND #7
- **Files:** behavior-profile.dto.ts, size-recommendation/dto/index.ts
- **Fix:** Add class-validator decorators

### FIX-019: Mobile Navigation `any` Casts (~20)
- **Source:** AUDIT-MOBILE #1
- **Files:** AiStylistChatScreen, HomeScreen, PaymentScreen, RecommendationsScreen, etc.
- **Fix:** Add missing routes to navigation type definitions, remove `as any` casts
- **Dependencies:** FIX-007, FIX-008

### FIX-020: Store Interfaces Entirely `any`
- **Source:** AUDIT-MOBILE #2
- **Files:** apps/mobile/src/stores/consultantStore.ts, apps/mobile/src/stores/chatStore.ts
- **Fix:** Create proper Consultant, Booking, Slot, MatchResult, Room, Message interfaces

### FIX-021: `fontWeight as any` Pattern (~28)
- **Source:** AUDIT-MOBILE #3
- **Files:** TryOnScreen, ProfileScreen, TryOnHistoryScreen, OutfitCard + typography tokens
- **Fix:** Update typography.fontWeight token type to match RN's FontWeight union

### FIX-022: `icon as any` Pattern (~15)
- **Source:** AUDIT-MOBILE #4
- **Files:** 15+ files using Ionicons
- **Fix:** Type icon name constants as `keyof typeof Ionicons.glyphMap`

### FIX-023: Two Competing ThemeProviders
- **Source:** AUDIT-THEME #1
- **Files:** ThemeContext.tsx, ThemeSystem.tsx
- **Fix:** Deprecate ThemeSystem.tsx provider, migrate accent feature into ThemeContext.tsx

### FIX-024: Hardcoded Colors in Consultant Screens (~80)
- **Source:** AUDIT-MOBILE #5
- **Files:** AdvisorListScreen, AdvisorProfileScreen, BookingScreen, ChatScreen
- **Fix:** Replace hardcoded hex with theme token references

### FIX-025: Missing accessibilityLabel (~50+)
- **Source:** AUDIT-MOBILE #6
- **Files:** AiStylistChatScreen, ClothingDetailScreen, PaymentScreen, AdvisorListScreen, CommunityScreen
- **Fix:** Add accessibilityLabel to all interactive TouchableOpacity/Pressable elements

### FIX-026: Index as Key in Data Lists (~20 high-risk)
- **Source:** AUDIT-MOBILE #7
- **Files:** SwipeCard, BookingScreen, ProductImageCarousel, AlgorithmVisualization, etc.
- **Fix:** Replace key={index} with key={item.id}

### FIX-027: Memory Leak Risks (2)
- **Source:** AUDIT-MOBILE #8
- **Files:** HomeScreen (Geolocation), PaymentScreen (async setState)
- **Fix:** Add unmount guards (isMounted ref or AbortController)

### FIX-028: @nestjs/jwt Version Mismatch
- **Source:** AUDIT-DEPS DEP-01
- **Files:** apps/backend/package.json
- **Fix:** Upgrade @nestjs/jwt from ^10.2.0 to ^11.0.0

### FIX-029: Mobile TypeScript Outdated
- **Source:** AUDIT-DEPS DEP-02
- **Files:** apps/mobile/package.json, apps/mobile/tsconfig.json
- **Fix:** Upgrade typescript from 5.0.4 to ^5.7.3, remove ignoreDeprecations

### FIX-030: Misplaced Type Packages in Production Dependencies
- **Source:** AUDIT-DEPS DEP-04, DEP-05
- **Files:** apps/backend/package.json
- **Fix:** Remove @types/csurf, move @types/compression and @types/multer to devDependencies

---

## P2 — Nice to Have

### FIX-031: Orphaned Screen Files (12)
- **Source:** AUDIT-NAVIGATION #3
- **Fix:** Register in navigators or delete

### FIX-032: Parameter Name Mismatches (5+)
- **Source:** AUDIT-NAVIGATION #4
- **Fix:** Align navigation param types

### FIX-033: GuardedScreen RouteName Mismatch
- **Source:** AUDIT-NAVIGATION #5
- **Fix:** Fix AiStylistChat routeName, add Notifications to GUARDED_ROUTES

### FIX-034: Cart Badge on Profile Tab
- **Source:** AUDIT-NAVIGATION #6
- **Fix:** Move or remove misleading cart badge

### FIX-035: React Navigation linking Prop
- **Source:** AUDIT-NAVIGATION #7
- **Fix:** Add linking prop to NavigationContainer

### FIX-036: Typography Size Conflict
- **Source:** AUDIT-THEME #3
- **Fix:** Align DesignTokens and typography.ts font sizes

### FIX-037: Missing Dark Mode Tokens
- **Source:** AUDIT-THEME #4
- **Fix:** Add dark variants for WarmPrimary, PrimaryColors, FashionColors, ColorSeasons

### FIX-038: Six Different "Purple" Values
- **Source:** AUDIT-THEME #5
- **Fix:** Consolidate into semantic tokens

### FIX-039: Missing Feature Color Tokens
- **Source:** AUDIT-THEME #6
- **Fix:** Add blogger, payment, order, notification, cart, swipe color tokens

### FIX-040: ColorSeasons Dark Mode
- **Source:** AUDIT-THEME #8
- **Fix:** Create separate dark mode colorSeasons with appropriate dark backgrounds

### FIX-041: console.log Statements (~80+)
- **Source:** AUDIT-MOBILE #10
- **Fix:** Migrate to logger utility

### FIX-042: Hardcoded Chinese Strings (~80+)
- **Source:** AUDIT-MOBILE #11
- **Fix:** Extract to i18n

### FIX-043: Missing React.memo (~20 components)
- **Source:** AUDIT-MOBILE #12
- **Fix:** Wrap pure display components

### FIX-044: Clothing Service Test Timeouts
- **Source:** AUDIT-TEST
- **Fix:** Mock executeQueryWithTimeout properly in test files

### FIX-045: Qdrant Docker Version Mismatch
- **Source:** AUDIT-DEPS DEP-08
- **Fix:** Update dev.yml to v1.12.1

### FIX-046: Missing Docker Health Checks
- **Source:** AUDIT-DEPS DEP-09
- **Fix:** Add health checks to neo4j, qdrant, ai-task-worker, promtail

### FIX-047: CatVTON References in Docker-Compose
- **Source:** AUDIT-DEPS DEP-10
- **Fix:** Replace with GLM API references

### FIX-048: Mobile ESLint Packages Outdated
- **Source:** AUDIT-DEPS DEP-07
- **Fix:** Align with backend versions

### FIX-049: Gateways Use Built-in Logger
- **Source:** AUDIT-SECURITY SEC-07
- **Fix:** Migrate to StructuredLoggerService

### FIX-050: Unused Dependencies
- **Source:** AUDIT-DEPS DEP-06, DEP-13
- **Fix:** Remove react-native-ratings, evaluate jsonwebtoken and react-native-vector-icons

---

## Topological Execution Order

```
Wave 1 (P0, no deps):
  FIX-001, FIX-002, FIX-003, FIX-004, FIX-005, FIX-006, FIX-007

Wave 2 (P0 with deps + P1 no deps):
  FIX-008 (depends FIX-007)
  FIX-009, FIX-010, FIX-011, FIX-012, FIX-013, FIX-014, FIX-015
  FIX-016, FIX-017, FIX-018, FIX-028, FIX-029, FIX-030

Wave 3 (P1 with deps + P2 no deps):
  FIX-019 (depends FIX-007, FIX-008)
  FIX-020, FIX-021, FIX-022, FIX-023, FIX-024, FIX-025, FIX-026, FIX-027
  FIX-031, FIX-032, FIX-033, FIX-034, FIX-035, FIX-036, FIX-037, FIX-038
  FIX-039, FIX-040, FIX-044, FIX-045, FIX-046, FIX-047, FIX-048, FIX-049, FIX-050

Wave 4 (P2 with deps + remaining):
  FIX-041, FIX-042, FIX-043
```

## Wave Gate Criteria

After each wave:
- [ ] Backend tsc --noEmit zero errors
- [ ] Mobile tsc --noEmit zero errors
- [ ] All FIX-IDs in wave marked completed
- [ ] No new TODO/FIXME/any/@ts-ignore introduced
