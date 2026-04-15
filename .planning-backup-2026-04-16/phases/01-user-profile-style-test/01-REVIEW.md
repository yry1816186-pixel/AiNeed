---
phase: 01-user-profile-style-test
reviewed: 2026-04-14T05:15:00Z
depth: standard
files_reviewed: 51
files_reviewed_list:
  - apps/mobile/src/services/api/sms.api.ts
  - apps/mobile/src/services/auth/wechat.ts
  - apps/mobile/src/services/api/style-quiz.api.ts
  - apps/mobile/src/components/profile/ProfileCompletenessBar.tsx
  - apps/mobile/src/components/photo/PhotoGuideOverlay.tsx
  - apps/mobile/src/components/photo/PhotoQualityIndicator.tsx
  - apps/mobile/src/components/privacy/PrivacyConsentModal.tsx
  - apps/mobile/src/stores/styleQuizStore.ts
  - apps/mobile/src/stores/profileStore.ts
  - apps/mobile/src/stores/index.ts
  - apps/mobile/src/screens/OnboardingScreen.tsx
  - apps/mobile/src/screens/PhoneLoginScreen.tsx
  - apps/mobile/src/screens/ProfileEditScreen.tsx
  - apps/mobile/src/screens/BodyAnalysisScreen.tsx
  - apps/mobile/src/screens/ColorAnalysisScreen.tsx
  - apps/mobile/src/screens/SharePosterScreen.tsx
  - apps/mobile/src/screens/ProfileScreen.tsx
  - apps/mobile/src/screens/HomeScreen.tsx
  - apps/mobile/src/screens/style-quiz/StyleQuizScreen.tsx
  - apps/mobile/src/navigation/MainStackNavigator.tsx
  - apps/backend/src/modules/auth/services/sms.service.ts
  - apps/backend/src/modules/auth/strategies/wechat.strategy.ts
  - apps/backend/src/modules/photos/services/photo-quality-validator.service.ts
  - apps/backend/src/modules/profile/services/profile-completeness.service.ts
  - apps/backend/src/modules/profile/services/profile-event-emitter.service.ts
  - apps/backend/src/modules/profile/services/share-poster.service.ts
  - apps/backend/src/modules/style-quiz/services/color-derivation.service.ts
  - apps/backend/src/modules/style-quiz/services/quiz-progress.service.ts
  - apps/backend/src/modules/ai-stylist/services/profile-event-subscriber.service.ts
  - apps/backend/src/modules/recommendations/services/profile-event-subscriber.service.ts
  - apps/backend/test/integration/phase1-auth-flow.integration.spec.ts
  - apps/backend/test/integration/phase1-quiz-flow.integration.spec.ts
  - apps/backend/test/integration/phase1-profile-sync.integration.spec.ts
  - apps/mobile/e2e/phase1-onboarding.e2e.test.ts
  - apps/backend/prisma/schema.prisma
  - apps/backend/prisma/seed-style-quiz.ts
  - apps/backend/src/modules/auth/auth.controller.ts
  - apps/backend/src/modules/auth/auth.module.ts
  - apps/backend/src/modules/auth/auth.service.ts
  - apps/backend/src/modules/auth/dto/auth.dto.ts
  - apps/backend/src/modules/photos/photos.controller.ts
  - apps/backend/src/modules/photos/photos.module.ts
  - apps/backend/src/modules/profile/profile.controller.ts
  - apps/backend/src/modules/profile/profile.module.ts
  - apps/backend/src/modules/profile/profile.service.ts
  - apps/backend/src/modules/style-quiz/style-quiz.controller.ts
  - apps/backend/src/modules/style-quiz/style-quiz.module.ts
  - apps/backend/src/modules/style-quiz/style-quiz.service.ts
  - apps/backend/src/modules/ai-stylist/ai-stylist.module.ts
  - apps/backend/src/modules/recommendations/recommendations.module.ts
findings:
  critical: 2
  warning: 8
  info: 6
  total: 16
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-04-14T05:15:00Z
**Depth:** standard
**Files Reviewed:** 51
**Status:** issues_found

## Summary

Reviewed 51 source files across the AiNeed mobile (React Native) and backend (NestJS) applications spanning Plans 01-06. The codebase demonstrates solid architectural patterns including proper rate limiting on auth endpoints, timing-safe code comparison, event-driven cross-module communication via Redis Pub/Sub, and well-structured Zustand stores with immutability. However, there are 2 critical security findings and 8 warnings requiring attention before this phase is considered complete.

**Key concerns:** The AuthService has a duplicate SMS code generation path using `Math.random()` instead of the secure `randomInt()` used in SmsService, creating a weaker code in one auth path. The WeChat OAuth state parameter uses `Math.random()` which is not cryptographically secure. Several mobile screens use `as any` type assertions for API calls that should be properly typed.

## Critical Issues

### CR-01: AuthService uses Math.random() for SMS code generation (insecure RNG)

**File:** `apps/backend/src/modules/auth/auth.service.ts:338`
**Issue:** The `sendSmsCode` method in AuthService generates the verification code using `Math.floor(100000 + Math.random() * 900000)`. This is mathematically biased and uses a non-cryptographic PRNG, making the code predictable. Meanwhile, the dedicated `SmsService.sendVerificationCode` at `apps/backend/src/modules/auth/services/sms.service.ts:70` correctly uses `randomInt(100000, 999999)` from the `crypto` module. Two different code paths exist for the same security-critical operation, and the weaker one is used in the `auth.service.ts` flow.
**Fix:**
```typescript
// apps/backend/src/modules/auth/auth.service.ts line 338
// BEFORE:
const code = String(Math.floor(100000 + Math.random() * 900000));

// AFTER:
import { randomInt } from "crypto";
// ...
const code = String(randomInt(100000, 999999));
```
Additionally, the `sendSmsCode` method in `AuthService` duplicates the logic already present in `SmsService`. Consider delegating entirely to `SmsService.sendVerificationCode()` to eliminate the duplicate path.

### CR-02: WeChat OAuth state parameter uses non-cryptographic Math.random()

**File:** `apps/mobile/src/services/auth/wechat.ts:65`
**Issue:** The OAuth `state` parameter used for CSRF protection in the WeChat authorization flow is generated with `Math.random().toString(36).substring(7)`. `Math.random()` is not cryptographically secure and produces predictable values. An attacker could guess the state parameter and forge the callback, enabling CSRF attacks on the WeChat login flow.
**Fix:**
```typescript
// apps/mobile/src/services/auth/wechat.ts line 65
// BEFORE:
const state = Math.random().toString(36).substring(7);

// AFTER (using expo-crypto or a secure alternative):
import * as Crypto from 'expo-crypto';
const state = await Crypto.getRandomBytesAsync(16)
  .then(bytes => Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(''));
```
If `expo-crypto` is not available, use `react-native-sensitive-info` or another cryptographically secure random source.

## Warnings

### WR-01: OnboardingScreen silences profile save failure -- marks onboarding complete regardless

**File:** `apps/mobile/src/screens/OnboardingScreen.tsx:125-148`
**Issue:** In `handleComplete`, when `profileApi.updateProfile` throws, the catch block still calls `AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, "true")` and navigates to MainTabs. This means a user whose profile data was never saved to the server still appears "onboarded" locally, losing their gender/age data silently.
**Fix:** Either re-throw after setting the local flag so the user sees an error, or navigate to a retry screen instead of MainTabs. At minimum, log the failure:
```typescript
} catch (error) {
  // Profile save failed -- data will not be persisted server-side
  // Still mark local onboarding complete to avoid blocking the user,
  // but schedule a background retry
  await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
  navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
}
```

### WR-02: WechatAuthStrategy exposes appSecret in URL query parameter

**File:** `apps/backend/src/modules/auth/strategies/wechat.strategy.ts:40`
**Issue:** The WeChat code-to-token exchange URL includes the `appSecret` as a query parameter: `appid=${this.appId}&secret=${this.appSecret}&code=${code}`. While this is the WeChat OAuth API design, the URL (including the secret) could appear in server access logs, proxy logs, or error tracking. The code already has the secret loaded from ConfigService, which is correct, but the URL construction should be noted as a log-redaction point.
**Fix:** Ensure any logger or error tracker redacts URLs containing `secret=`. No code change needed in the service itself, but consider adding a comment noting this concern for future maintainers.

### WR-03: `as any` type assertions bypass type safety on API update calls

**File:** `apps/mobile/src/screens/OnboardingScreen.tsx:133`
**File:** `apps/mobile/src/screens/ProfileEditScreen.tsx:121`
**Issue:** Both screens cast the update payload as `as any` when calling `profileApi.updateProfile()` and `updateProfile()`, bypassing compile-time type checking. If the API contract changes, these calls will fail at runtime without any TypeScript warning.
**Fix:** Define a proper `UpdateProfileRequest` type in the API layer and use it consistently:
```typescript
// In profile.api.ts or types file:
export interface UpdateProfileRequest {
  nickname?: string;
  gender?: string;
  height?: number;
  weight?: number;
  // ...other fields
}

// Then in screens:
const updateData: UpdateProfileRequest = { gender, ageRange };
await profileApi.updateProfile(updateData); // No 'as any' needed
```

### WR-04: `as any` on Prisma where clause for WeChat login bypasses type checking

**File:** `apps/backend/src/modules/auth/auth.service.ts:429-430`
**File:** `apps/backend/src/modules/auth/auth.service.ts:451`
**Issue:** The WeChat user lookup uses `as any` on the Prisma where clause for `wechatOpenId` and `wechatUnionId`. If the Prisma schema field names change, this will silently fail at runtime. Similar `as any` at lines 504 and 512 for `gender` in phone registration.
**Fix:** Remove `as any` and ensure the Prisma schema enum `Gender` values align with the string values coming from the DTO. The Prisma-generated types should already support these fields if the schema is correct.

### WR-05: StyleQuiz auto-advance timer has no-op body

**File:** `apps/mobile/src/screens/style-quiz/StyleQuizScreen.tsx:94-96`
**Issue:** The auto-advance timer callback body is empty: `autoAdvanceTimer.current = setTimeout(() => { /* The selectAnswer already incremented questionIndex in the store */ }, 300)`. While the comment explains why, this pattern is confusing and wastes resources by setting a timer that does nothing. The `selectAnswer` call on line 82 already increments `questionIndex` in the store synchronously, so the 300ms timer serves no functional purpose.
**Fix:** Remove the timer entirely for non-last questions, since the store already advances the index:
```typescript
const handleSelectOption = useCallback(
  (optionId: string) => {
    if (!currentQuestion) return;
    setSelectedOption(optionId);
    selectAnswer(QUIZ_ID, currentQuestion.id, optionId);
    // No timer needed -- selectAnswer updates questionIndex in the store
  },
  [currentQuestion, selectAnswer],
);
```

### WR-06: AuthController has duplicate phone login endpoints with different paths

**File:** `apps/backend/src/modules/auth/auth.controller.ts:301-367`
**Issue:** There are two sets of phone login endpoints: `POST /auth/sms/send` + `POST /auth/sms/login` (lines 301, 327) and `POST /auth/send-code` + `POST /auth/phone-login` (lines 403, 355). Both ultimately call the same `AuthService` methods. This duplication creates confusion about which endpoint the mobile client should use and doubles the attack surface.
**Fix:** Standardize on one set of endpoints. The `@Public()` decorated ones (Plan 03 endpoints at lines 355-418) appear to be the preferred set. Deprecate or remove the older `sms/send` and `sms/login` routes.

### WR-07: ProfileService.behaviorCounters is an unbounded in-memory Map (memory leak)

**File:** `apps/backend/src/modules/profile/profile.service.ts:63`
**Issue:** `behaviorCounters` is a `Map<string, number>` that grows without bound as users interact with the system. In production, every user who triggers a behavior event will have an entry that is never cleaned up, causing a slow memory leak.
**Fix:** Use a bounded LRU cache, or periodically clean up entries that have not been incremented recently. Alternatively, use Redis for this counter instead of in-process memory, which would also work correctly across multiple server instances.

### WR-08: ColorDerivationEngine.deriveColorPreferences mutates Map entries in-place

**File:** `apps/backend/src/modules/style-quiz/services/color-derivation.service.ts:131-133`
**Issue:** The existing Map entries are mutated in-place when aggregating weights: `existing.totalWeight += tag.weight` and `existing.maxWeight = tag.weight`. While this works correctly for the current use case (no concurrent access to the Map), it violates the immutability principle from the project coding style guidelines.
**Fix:** Replace the entry rather than mutating:
```typescript
if (existing) {
  hexData.set(normalizedHex, {
    totalWeight: existing.totalWeight + tag.weight,
    category: tag.weight > existing.maxWeight ? tag.category : existing.category,
    maxWeight: Math.max(tag.weight, existing.maxWeight),
  });
}
```

## Info

### IN-01: Seed file uses @ts-nocheck

**File:** `apps/backend/prisma/seed-style-quiz.ts:1`
**Issue:** The file starts with `// @ts-nocheck`, disabling all TypeScript checking. While seed files are not production code, this hides potential type errors.
**Fix:** Remove `@ts-nocheck` and fix any type errors. The file is straightforward data seeding and should type-check cleanly.

### IN-02: Hardcoded static data in HomeScreen (dailyRecs, date text)

**File:** `apps/mobile/src/screens/HomeScreen.tsx:85-101`
**File:** `apps/mobile/src/screens/HomeScreen.tsx:144`
**Issue:** The `dailyRecs` array contains hardcoded Unsplash URLs and the date "Tuesday, October 24" is a static string. These are clearly placeholder data for development.
**Fix:** Replace with dynamic date formatting and API-driven recommendation data when integrating with the backend.

### IN-03: console.log statements in ErrorBoundary callbacks

**File:** `apps/mobile/src/screens/HomeScreen.tsx:487-490`
**File:** `apps/mobile/src/screens/ProfileScreen.tsx:486-491`
**Issue:** Both screens include `console.error` and `console.log` in their error boundary callbacks. These are appropriate for development but should use a proper logging service in production to avoid leaking error details.
**Fix:** Replace with the project's `logger` utility or a production-safe logging service that can be disabled in release builds.

### IN-04: BodyAnalysisScreen uses hardcoded radar chart data instead of real measurements

**File:** `apps/mobile/src/screens/BodyAnalysisScreen.tsx:260-261`
**Issue:** The radar chart values are hardcoded: `const actual = [0.7, 0.6, 0.5, 0.8]` and `const ideal = [0.75, 0.65, 0.6, 0.75]`. The comment says "in production, from bodyAnalysis" but the `bodyAnalysis` data from the store is not used for the chart.
**Fix:** Derive the radar values from `bodyAnalysis` when available, falling back to the defaults only when no data exists.

### IN-05: StyleQuiz test expects non-null progress for nonexistent quiz

**File:** `apps/backend/test/integration/phase1-quiz-flow.integration.spec.ts:86-93`
**Issue:** The test "should return default progress when no progress saved" asserts `expect(progress).toBeDefined()` at line 92. However, `QuizProgressService.getProgress` returns `null` when no progress exists. The mock Redis service may be returning a default value that masks this, but the assertion is misleading.
**Fix:** The assertion should be `expect(progress).toBeNull()` or the test should clarify what the mock returns for missing keys. If the mock returns a default, document this clearly.

### IN-06: Duplicate event subscriber implementations across modules

**File:** `apps/backend/src/modules/ai-stylist/services/profile-event-subscriber.service.ts`
**File:** `apps/backend/src/modules/recommendations/services/profile-event-subscriber.service.ts`
**Issue:** Both subscriber services have nearly identical boilerplate (subscribe to same channels, same error handling pattern, same fire-and-forget pattern). The only difference is the log message prefix. This is a code duplication concern.
**Fix:** Consider extracting a base `ProfileEventSubscriber` class that both modules extend, or a shared `ProfileEventBus` service that dispatches events to registered handlers.

---

_Reviewed: 2026-04-14T05:15:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
