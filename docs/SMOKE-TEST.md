# 寻裳 XUNO -- Smoke Test Checklist

> **Purpose**: Full-feature walkthrough before demo to ensure zero crashes
> **When**: Run before every demo rehearsal and final presentation
> **Pass criteria**: ALL items PASS with zero crashes
> **Crash protocol**: Record crash log + stack trace + reproduction steps in Section 6

---

## 1. Cold Start (App Launch)

| #   | Check                  | Steps                         | Expected Result                                               | Actual | Pass/Fail |
| --- | ---------------------- | ----------------------------- | ------------------------------------------------------------- | ------ | --------- |
| 1.1 | App cold launch        | Kill app from recents, reopen | App opens within 5s, no white screen                          |        |           |
| 1.2 | Splash screen          | Observe splash                | Shows XUNO branding briefly, transitions to content           |        |           |
| 1.3 | Auth redirect          | Fresh install state           | Redirects to Login if no token, goes to Today if token exists |        |           |
| 1.4 | Network error handling | Disable network, launch app   | Shows offline banner, no crash                                |        |           |

## 2. Four Tab Navigation

### 2.1 Today Tab

| #     | Check                   | Steps                      | Expected Result                                                          | Actual | Pass/Fail |
| ----- | ----------------------- | -------------------------- | ------------------------------------------------------------------------ | ------ | --------- |
| 2.1.1 | Tab renders             | Tap "Today" tab            | Weather scene card + recommendation carousel + AI insight bubble visible |        |           |
| 2.1.2 | Weather card            | Observe weather card       | Shows city + temperature + weather icon + outfit suggestion              |        |           |
| 2.1.3 | Recommendation carousel | Swipe recommendation cards | 3+ outfit recommendation cards render with images                        |        |           |
| 2.1.4 | Quick chat bar          | Observe bottom bar         | "Ask Yiyi" quick chat bar visible with voice button                      |        |           |
| 2.1.5 | Pull to refresh         | Pull down on Today screen  | Skeleton shimmer shows, content refreshes                                |        |           |
| 2.1.6 | Recommendation tap      | Tap a recommendation card  | Navigates to RecommendationDetailScreen, shows outfit details            |        |           |

### 2.2 Discover Tab

| #     | Check         | Steps                     | Expected Result                                    | Actual | Pass/Fail |
| ----- | ------------- | ------------------------- | -------------------------------------------------- | ------ | --------- |
| 2.2.1 | Tab renders   | Tap "Discover" tab        | Three sub-tabs visible (recommend/feed/hot scenes) |        |           |
| 2.2.2 | Tab switching | Switch between 3 sub-tabs | Content changes without crash, no flicker          |        |           |
| 2.2.3 | Product feed  | Scroll product feed       | Products render with images, no blank cards        |        |           |
| 2.2.4 | Hot scenes    | Tap hot scenes section    | Shows curated scene cards (interview/date/travel)  |        |           |
| 2.2.5 | Product tap   | Tap a product             | Navigates to product detail, images load           |        |           |

### 2.3 Stylist Tab (Yiyi AI Chat)

| #     | Check                         | Steps                                 | Expected Result                                              | Actual | Pass/Fail |
| ----- | ----------------------------- | ------------------------------------- | ------------------------------------------------------------ | ------ | --------- |
| 2.3.1 | Tab renders                   | Tap "Stylist" tab                     | Yiyi avatar + greeting message + quick reply buttons visible |        |           |
| 2.3.2 | Send text message             | Type "hello" and send                 | Yiyi responds within 10s, typing indicator shows             |        |           |
| 2.3.3 | Quick reply                   | Tap a quick reply button              | Message sent, Yiyi responds contextually                     |        |           |
| 2.3.4 | Chat history scroll           | Send 5+ messages, scroll up           | History scrolls smoothly, no blank messages                  |        |           |
| 2.3.5 | Outfit recommendation in chat | Ask "interview outfit"                | Yiyi shows outfit cards within chat bubble                   |        |           |
| 2.3.6 | Try-on action                 | Tap "try on" on outfit card           | TryOnBottomSheet opens, shows loading then result            |        |           |
| 2.3.7 | Voice button                  | Tap voice button (if device supports) | Recording animation shows, speech recognized, sent as text   |        |           |
| 2.3.8 | Studio recommendation         | Trigger studio signal in conversation | StudioRecommendCard renders in chat                          |        |           |
| 2.3.9 | Debug FAB (demo mode)         | Tap floating debug button             | ProfileDebugPanel opens with profile toggles                 |        |           |

### 2.4 Me Tab (Profile)

| #     | Check                | Steps               | Expected Result                                                | Actual | Pass/Fail |
| ----- | -------------------- | ------------------- | -------------------------------------------------------------- | ------ | --------- |
| 2.4.1 | Tab renders          | Tap "Me" tab        | Avatar + username + stats (wardrobe/favorites/outfits) visible |        |           |
| 2.4.2 | Profile edit         | Tap edit profile    | ProfileEditScreen opens, fields editable, save works           |        |           |
| 2.4.3 | Wardrobe navigation  | Tap wardrobe count  | Navigates to WardrobeScreen                                    |        |           |
| 2.4.4 | Favorites navigation | Tap favorites count | Navigates to FavoritesScreen                                   |        |           |
| 2.4.5 | Settings             | Tap settings icon   | SettingsScreen opens with options                              |        |           |
| 2.4.6 | Body analysis        | Tap body analysis   | BodyAnalysisScreen shows (if implemented)                      |        |           |

## 3. Onboarding (4-Step Flow)

| #   | Check             | Steps                                | Expected Result                                 | Actual | Pass/Fail |
| --- | ----------------- | ------------------------------------ | ----------------------------------------------- | ------ | --------- |
| 3.1 | Onboarding start  | Fresh install, first launch          | Step 1: Scene selection shows 8 scene cards     |        |           |
| 3.2 | Scene selection   | Select 1-3 scenes, tap next          | Proceeds to step 2                              |        |           |
| 3.3 | Quick profile     | Fill age/height/weight, tap next     | Proceeds to step 3                              |        |           |
| 3.4 | Style expression  | Select style + 6 outfit placeholders | Proceeds to step 4                              |        |           |
| 3.5 | Yiyi first outfit | Wait for Yiyi to generate 3 outfits  | 3 outfit cards render with loading then content |        |           |
| 3.6 | Save outfit       | Tap "save to wardrobe" on an outfit  | Success toast, outfit saved                     |        |           |
| 3.7 | Complete          | Complete all 4 steps                 | Redirects to Today tab with recommendations     |        |           |
| 3.8 | Retry on failure  | Disconnect network during step 4     | Shows error with retry button, no crash         |        |           |

## 4. Yiyi Dialog (Interview Scenario)

| #    | Check            | Steps                      | Expected Result                                   | Actual | Pass/Fail |
| ---- | ---------------- | -------------------------- | ------------------------------------------------- | ------ | --------- |
| 4.1  | Greeting         | Enter Stylist tab          | Yiyi auto-greets with contextual message          |        |           |
| 4.2  | Scene trigger    | Say "interview tomorrow"   | Yiyi enters SCENE state, asks follow-up questions |        |           |
| 4.3  | Company type     | Answer "tech company"      | Yiyi asks about position                          |        |           |
| 4.4  | Position         | Answer "product manager"   | Yiyi asks about budget                            |        |           |
| 4.5  | Budget           | Answer "under 1000"        | Yiyi generates 3 outfit plans                     |        |           |
| 4.6  | Feedback loop    | Say "too formal"           | Yiyi adjusts recommendations                      |        |           |
| 4.7  | Try on           | Tap try-on on an outfit    | TryOnBottomSheet opens, loading then result       |        |           |
| 4.8  | Save             | Save the outfit            | Outfit saved to wardrobe with success feedback    |        |           |
| 4.9  | Timeout handling | Wait 30s with no response  | Auto-greeting or prompt appears                   |        |           |
| 4.10 | LLM fallback     | Disconnect during response | Degraded template response appears, no crash      |        |           |

## 5. Voice (STT/TTS)

| #   | Check                | Steps                                  | Expected Result                             | Actual | Pass/Fail |
| --- | -------------------- | -------------------------------------- | ------------------------------------------- | ------ | --------- |
| 5.1 | STT trigger          | Long-press voice button                | Recording animation starts                  |        |           |
| 5.2 | STT recognition      | Say "what to wear tomorrow" in Chinese | Text appears in input, message sent         |        |           |
| 5.3 | TTS response         | Receive Yiyi response                  | Audio plays (if TTS precache hit) or silent |        |           |
| 5.4 | Device not supported | Test on emulator without mic           | Graceful fallback message, no crash         |        |           |
| 5.5 | STT error            | Cancel recording mid-stream            | No crash, input remains empty               |        |           |

## 6. Search

| #   | Check         | Steps                         | Expected Result                     | Actual | Pass/Fail |
| --- | ------------- | ----------------------------- | ----------------------------------- | ------ | --------- |
| 6.1 | Search opens  | Tap search icon               | SearchScreen opens with search bar  |        |           |
| 6.2 | Text search   | Type "white shirt" and submit | Results show matching products      |        |           |
| 6.3 | Empty results | Search for "xyznotfound"      | Empty state with Chinese text shown |        |           |
| 6.4 | Clear search  | Tap clear button              | Results cleared, search bar empty   |        |           |

## 7. Wardrobe & Favorites

| #   | Check           | Steps                 | Expected Result                         | Actual | Pass/Fail |
| --- | --------------- | --------------------- | --------------------------------------- | ------ | --------- |
| 7.1 | Wardrobe opens  | Navigate to wardrobe  | WardrobeScreen shows saved items        |        |           |
| 7.2 | Item tap        | Tap a wardrobe item   | ClothingDetailScreen opens with details |        |           |
| 7.3 | Delete item     | Long-press and delete | Item removed with confirmation          |        |           |
| 7.4 | Favorites opens | Navigate to favorites | FavoritesScreen shows favorited items   |        |           |
| 7.5 | Empty state     | Clear all favorites   | Chinese empty state message shown       |        |           |

## 8. Recommendation Funnel (Demo Mode)

| #   | Check            | Steps                                  | Expected Result                                 | Actual | Pass/Fail |
| --- | ---------------- | -------------------------------------- | ----------------------------------------------- | ------ | --------- |
| 8.1 | Funnel opens     | Open ProfileDebugPanel, trigger funnel | RecommendationFunnel 6-layer animation renders  |        |           |
| 8.2 | Layer animation  | Watch funnel animate                   | Each layer shows count, animates smoothly       |        |           |
| 8.3 | Profile switch   | Switch to "professional" profile       | Recommendations update, different results shown |        |           |
| 8.4 | Profile switch 2 | Switch to "creative" profile           | Recommendations update again                    |        |           |

## 9. Error Recovery

| #   | Check           | Steps                                  | Expected Result                                  | Actual | Pass/Fail |
| --- | --------------- | -------------------------------------- | ------------------------------------------------ | ------ | --------- |
| 9.1 | ErrorBoundary   | Force a render error                   | ErrorFallback shows with retry button            |        |           |
| 9.2 | Network loss    | Disable network during API call        | Error state with retry, no crash                 |        |           |
| 9.3 | Network restore | Re-enable network, tap retry           | Content loads successfully                       |        |           |
| 9.4 | Slow network    | Throttle network, load recommendations | Skeleton shimmer shows, content loads eventually |        |           |

## 10. Visual Consistency

| #    | Check               | Steps                             | Expected Result                                 | Actual | Pass/Fail |
| ---- | ------------------- | --------------------------------- | ----------------------------------------------- | ------ | --------- |
| 10.1 | No hardcoded colors | Visual scan all screens           | All colors use design tokens (warm camel theme) |        |           |
| 10.2 | Card border radius  | Check recommendation/outfit cards | All cards use borderRadius.lg (12px)            |        |           |
| 10.3 | Chat bubbles        | Check Yiyi chat                   | Bubbles consistent, no style mismatch           |        |           |
| 10.4 | Skeleton loading    | Load any screen with data         | Skeleton shimmer shows before content, no flash |        |           |
| 10.5 | Empty states        | Trigger empty state on any screen | Chinese text shown, no English placeholders     |        |           |
| 10.6 | Typography          | Scan all text elements            | Consistent font sizes, no overlapping text      |        |           |

---

## Crash Log Template

**When a crash occurs, fill this out immediately:**

```
### Crash #[N]
**Time**: [HH:MM:SS]
**Screen**: [Which screen/feature]
**Steps to reproduce**:
  1. ...
  2. ...
  3. ...

**Crash type**: [JS Error / Native Crash / Network Error / OOM]
**Stack trace**:
```

[paste adb logcat output here]

````

**adb logcat command**:
```bash
adb logcat | grep -E "FATAL|ReactNative|crash|AndroidRuntime"
````

**Additional context**: [device/emulator info, Android version, network state]

```

---

## Summary Template

| Category | Total Checks | Passed | Failed | Blocked |
|----------|-------------|--------|--------|---------|
| 1. Cold Start | 4 | | | |
| 2.1 Today Tab | 6 | | | |
| 2.2 Discover Tab | 5 | | | |
| 2.3 Stylist Tab | 9 | | | |
| 2.4 Me Tab | 6 | | | |
| 3. Onboarding | 8 | | | |
| 4. Yiyi Dialog | 10 | | | |
| 5. Voice | 5 | | | |
| 6. Search | 4 | | | |
| 7. Wardrobe | 5 | | | |
| 8. Funnel | 4 | | | |
| 9. Error Recovery | 4 | | | |
| 10. Visual | 6 | | | |
| **TOTAL** | **76** | | | |

**Tester**: _______________
**Date**: _______________
**Device**: _______________
**Build**: _______________
**Overall**: PASS / FAIL

---

_Document version: 2026-04-27_
_Related: docs/DEMO-CHECKLIST.md, docs/demo-script.md, scripts/demo-preflight.sh_
```
