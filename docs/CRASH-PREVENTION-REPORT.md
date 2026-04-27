# Crash Prevention Report + Investigation Guide

> **Purpose**: Document all crash prevention measures in the XUNO codebase and provide a
> structured guide for crash investigation during demo rehearsals
> **Scope**: Mobile app (React Native) crash prevention as of Phase 12
> **Related**: docs/SMOKE-TEST.md, docs/demo-script.md, docs/DEMO-CHECKLIST.md

---

## 1. Crash Prevention Measures Inventory

### 1.1 ErrorBoundary (React-level crash prevention)

**Files**:

- `apps/mobile/src/shared/components/ErrorBoundary/ErrorBoundary.tsx` (358 lines)
- `apps/mobile/src/shared/components/ErrorBoundary/ErrorFallback.tsx`
- `apps/mobile/src/shared/components/ErrorBoundary/withErrorBoundary.tsx`
- `apps/mobile/src/shared/components/screens/ScreenErrorBoundaries.ts`

**Protection level**: Screen-level. Each screen wrapped with `withErrorBoundary` catches React render errors and shows ErrorFallback UI instead of white screen crash.

**Key features**:

- Auto error classification (ErrorCategory + ErrorSeverity)
- Recovery strategies: RETRY, REFRESH, GO_BACK, GO_HOME, RE_LOGIN, IGNORE, MANUAL
- Max retries (default 3) with auto-recover timer
- Crash cascade prevention: if `componentDidCatch` hasn't fired yet, shows ActivityIndicator instead of recursive crash
- 20+ screens have ErrorBoundary configs defined in `ScreenErrorBoundaries.ts`

**Screens with ErrorBoundary applied**:

- CartScreen, VirtualTryOnScreen, ResetPasswordScreen, ForgotPasswordScreen
- AiStylistUnifiedScreen, HomeScreen, HeartScreen, ProfileReportScreen

### 1.2 Try-Catch Error Handling (86 files with try blocks)

**86 `.tsx` files** contain try-catch blocks covering API calls, storage operations, and user actions.

**Demo-critical files with error handling**:

| File                      | Protection       | Fallback Behavior                                                |
| ------------------------- | ---------------- | ---------------------------------------------------------------- |
| `AICompanionProvider.tsx` | 13 catch blocks  | Auto-greeting on session load failure, warns instead of throwing |
| `YiyiFirstOutfitStep.tsx` | 3 catch blocks   | Falls back to DEGRADED_TEMPLATES (3 hardcoded outfits)           |
| `TryOnBottomSheet.tsx`    | 1 catch block    | Shows error state with retry                                     |
| `OnboardingWizard.tsx`    | Multiple catches | Retry on failure, skip on second failure                         |
| `WardrobeScreen.tsx`      | 2 catch blocks   | Error display with retry option                                  |
| `ProfileScreen.tsx`       | 1 catch block    | Error state rendering                                            |
| `SearchScreen.tsx`        | 1 catch block    | Error state rendering                                            |
| `OutfitDetailScreen.tsx`  | 3 catch blocks   | Error state with retry                                           |
| `CameraScreen.tsx`        | 2 catch blocks   | Error feedback                                                   |
| `CheckoutScreen.tsx`      | Multiple catches | Payment error handling                                           |

### 1.3 AI Dialog Degradation

**AICompanionProvider.tsx** (lines 240-255):

- Session load failure: falls back to `GREETING_MESSAGES` (pre-defined greeting)
- AsyncStorage read failure: shows greeting anyway
- Session save/clear failure: logs warning, does not crash

**AIServiceRouter** (backend):

- GLM-4-Flash primary with 5s timeout
- GLM-5 auto-fallback on timeout or error
- Degraded pipeline: season + occasion template outfits when LLM completely unavailable

### 1.4 Onboarding Resilience

**YiyiFirstOutfitStep.tsx** (lines 205-258):

- API returns empty: shows `DEGRADED_TEMPLATES` (3 hardcoded outfit cards)
- API throws error: shows same degraded templates
- Save to wardrobe fails: retries once, then silently completes onboarding (does not block user)
- Loading state: shows skeleton while fetching

### 1.5 Network Resilience

- `OfflineBanner` component: shows banner when network lost
- `useNetwork` hook: 5s timeout for connectivity check
- WebSocket: 10s connection timeout
- API timeout: 60s default for AI polling, 10s for health checks
- Demo mode: pre-caches all recommendations so offline demo is possible

### 1.6 Voice Feature Fallback

**Voice button protection** (from Phase 12-03):

- Device check: if microphone not available, shows graceful message
- STT error: no crash, input stays empty
- TTS cache miss: silent mode, text response still displays
- Emulator without mic: fallback to text input

### 1.7 Known Crash Risk Points

These files contain `throw new Error` on the demo path. Each is wrapped in try-catch by the caller, but they represent the highest-risk crash vectors:

| File                             | Line | Throws On                       | Caller Protection           |
| -------------------------------- | ---- | ------------------------------- | --------------------------- |
| `AICompanionProvider.tsx`        | 464  | Session creation failure        | try-catch in handleSend     |
| `AICompanionProvider.tsx`        | 474  | Session creation fallback       | try-catch in handleSend     |
| `AICompanionProvider.tsx`        | 485  | Message send failure            | try-catch in handleSend     |
| `VirtualTryOnContext.tsx`        | 151  | Photo upload failure            | try-catch in upload flow    |
| `TryOnScreen.tsx`                | 255  | Person photo upload failure     | try-catch in handleTryOn    |
| `TryOnScreen.tsx`                | 263  | Missing clothing info           | try-catch in handleTryOn    |
| `TryOnScreen.tsx`                | 275  | Clothing image upload failure   | try-catch in handleTryOn    |
| `TryOnScreen.tsx`                | 284  | Try-on request creation failure | try-catch in handleTryOn    |
| `WardrobeScreen.tsx`             | 144  | Wardrobe loading failure        | try-catch in loadWardrobe   |
| `RecommendationDetailScreen.tsx` | 210  | Recommendation load failure     | try-catch in loadData       |
| `RecommendationDetailScreen.tsx` | 251  | Purchase source open failure    | try-catch in handlePurchase |

---

## 2. Crash Investigation Guide

### 2.1 Monitoring Setup

Before demo rehearsal, start crash monitoring:

```bash
# Start adb logcat with crash filter
adb logcat -c  # Clear existing logs
adb logcat | grep -E "FATAL|ReactNative|crash|AndroidRuntime|Exception" > crash-log.txt

# Alternative: full logcat for comprehensive debugging
adb logcat > full-log.txt
```

### 2.2 Crash Classification

When a crash occurs, classify it:

#### Type A: JS Error (React Native)

**Signature**: `FATAL EXCEPTION`, `com.facebook.react.common.JavascriptException`
**Cause**: Unhandled JavaScript error in React component or event handler
**Stack trace**: Shows JavaScript file paths and line numbers
**Fix approach**: Check the JS file in stack trace, add try-catch or ErrorBoundary

#### Type B: Native Crash

**Signature**: `FATAL EXCEPTION`, native library (e.g., `java.lang.NullPointerException`)
**Cause**: Native module bug (camera, voice, navigation)
**Stack trace**: Shows Java/Kotlin file paths
**Fix approach**: Check native module version, may need native code fix

#### Type C: Network Error (non-crash but breaks flow)

**Signature**: No crash, but ErrorBoundary shows error state
**Cause**: API timeout, server down, DNS failure
**Fix approach**: Check Docker services, network connectivity, API health

#### Type D: OOM (Out of Memory)

**Signature**: `OutOfMemoryError`, app killed by system
**Cause**: Large images, memory leak, too many cached items
**Fix approach**: Check image sizes, reduce cache size, profile with Android Studio

### 2.3 Crash Investigation Steps

When a crash is detected during demo:

1. **Save logcat immediately**:

   ```bash
   adb logcat -d > crash-$(date +%Y%m%d-%H%M%S).log
   ```

2. **Extract crash stack trace**:

   ```bash
   grep -A 30 "FATAL EXCEPTION" crash-*.log
   ```

3. **Identify crash type** (A/B/C/D from above)

4. **Locate source file**: Match the stack trace to a file in `apps/mobile/src/`

5. **Check protection**: Is the file listed in Section 1.7 above? Does it have try-catch?

6. **Reproduce**: Follow the same steps to confirm reproducibility

7. **Fix**: Add try-catch or ErrorBoundary if missing. Priority order:
   - Add try-catch around the throwing function call
   - Add ErrorBoundary wrapper on the screen
   - Add fallback UI for the error state

### 2.4 Demo-Day Emergency Response

If crash happens during live demo:

1. **Immediate**: Switch to backup video (`docs/PRESENTATION/XUNO-DEMO-BACKUP.mp4`)
2. **Narration**: "We have a pre-recorded demo showing the full experience"
3. **Recovery**: Restart app during narration, attempt live demo again if time permits
4. **Post-demo**: File crash report using template in SMOKE-TEST.md Section 6

---

## 3. Crash Prevention Checklist (Pre-Demo)

Run this checklist before every demo:

- [ ] ErrorBoundary wraps all demo-path screens (AiStylistUnifiedScreen, TodayScreen, DiscoverScreen, ProfileScreen)
- [ ] AICompanionProvider greeting fallback works (no session = greeting shown)
- [ ] YiyiFirstOutfitStep degraded templates render when API fails
- [ ] TryOnBottomSheet shows error state (not crash) when API fails
- [ ] WardrobeScreen shows error state when loading fails
- [ ] Voice button graceful fallback on emulator
- [ ] OfflineBanner shows when network disconnected
- [ ] Demo mode pre-cache populated (`bash scripts/demo-warmup.sh`)
- [ ] Docker 15 services all healthy (`docker compose ps`)
- [ ] No TypeScript errors (`npx tsc --noEmit` in apps/mobile)

---

## 4. Crash Statistics Baseline

Based on code analysis (Phase 12 snapshot):

| Metric                            | Count                           |
| --------------------------------- | ------------------------------- |
| Files with try-catch              | 86                              |
| Total catch blocks                | 112                             |
| Files with ErrorBoundary          | 15                              |
| Screens with ErrorBoundary config | 20+                             |
| throw new Error on demo path      | 11                              |
| Degraded fallback templates       | 3 (onboarding)                  |
| Auto-retry locations              | 5+ (onboarding save, API calls) |

---

_Document version: 2026-04-27_
_Related: docs/SMOKE-TEST.md, docs/demo-script.md, docs/DEMO-CHECKLIST.md_
