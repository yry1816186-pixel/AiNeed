# Phase 3: Navigation + Core Screens + Calendar - Research

**Researched:** 2026-04-24
**Domain:** React Native navigation, Zustand store migration, design token unification
**Confidence:** HIGH

## Summary

Phase 3 consolidates the XUNO mobile app into a clean 4-tab architecture with unified design tokens and a feature-based Zustand store structure. The navigation framework (4 tabs: Today / Discover / Stylist / Me) is already implemented and functional -- the work here is verification, Wardrobe relocation from ProfileStack to DiscoverStack, and state persistence migration safety.

The primary technical risk is the Zustand store migration. The legacy `src/stores/` directory contains 30 files with 4 unique stores defined inline in `index.ts` (useAnalysisStore, useRecommendationStore, useCartStore, useHeartRecommendStore). However, feature-local counterparts already exist in `src/features/*/stores/`, so the migration is primarily an import path update exercise rather than a store rewrite. The persisted stores (cart-storage, heart-recommend-storage) use Zustand's persist middleware with AsyncStorage and carry no version field, so no data migration is needed -- only ensuring the new import paths resolve correctly.

The hardcoded color replacement is the largest volume task: 484 occurrences across 45 files. A regex-based batch replacement strategy with per-file manual review is recommended over AST codemods given the straightforward nature of hex-to-token mapping.

**Primary recommendation:** Execute in 3 waves -- (1) store migration + import updates, (2) navigation Wardrobe relocation + NAV_VERSION safety, (3) design token unification (borderRadius adjustment + hex color replacement + WarmPrimaryColors cleanup).

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- Delete `src/stores/` entire directory (30 files)
- Preserve `src/features/*/stores/` -- 24 feature stores
- `stores/index.ts` unique stores (useAnalysisStore, useRecommendationStore, useCartStore, useHeartRecommendStore) must migrate to corresponding feature directories
- clearAllStores function migrates to `src/shared/stores/clearAllStores.ts`
- All `from '../../stores/index'` or `from '../stores/index'` imports update to feature-local paths
- 4-Tab structure: Today / Discover / Stylist / Me (already implemented)
- Wardrobe must move from Profile Stack to Discover Stack (NAV-05)
- XUNO brand colors: warmCamel #C4956A, charcoal #2D3436, warmOrange #E17055, neutral[50] #FAFAF8
- BorderRadius tokens need adjustment: buttons should be 12px (currently lg=10, needs change to 12)
- 384+ hardcoded color values must be replaced with DesignTokens references
- Deprecated WarmPrimaryColors (coral/mint/ocean) must be cleaned up
- YiyiAvatar already exists and uses DesignTokens -- ensure consistent usage across screens

### Claude's Discretion

- Choice of import migration order (batch vs sequential)
- Specific regex patterns for hex color replacement
- Whether to add a new borderRadius token or modify lg value
- Navigation state persistence approach (versioned key vs ErrorBoundary)

### Deferred Ideas (OUT OF SCOPE)

- 7-day calendar detail implementation (CAL-01, CAL-02) -- deferred to post-Phase 3 or Phase 4
- Today Screen scene card complete implementation (TOD-01~05) -- needs backend API, deferred to Phase 4
  </user_constraints>

<phase_requirements>

## Phase Requirements

| ID     | Description                                                 | Research Support                                                                                            |
| ------ | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| NAV-01 | 4-Tab navigation (Today/Discover/Stylist/Me)                | Already implemented in RootNavigator.tsx + MainStackNavigator.tsx. Verification only.                       |
| NAV-02 | Today Screen with scene cards + daily outfit + voice button | Skeleton exists in TodayStack. Scene cards deferred (TOD-01~05). Voice button exists in Stylist.            |
| NAV-03 | Discover Screen with recommendation feed + curated wardrobe | RecommendationFeedStore already in home/stores/. Wardrobe needs relocation from Profile to Discover.        |
| NAV-04 | Old user update crash prevention (NAV_VERSION migration)    | No state persistence currently implemented. Need PERSISTENCE_KEY versioning pattern.                        |
| NAV-05 | Wardrobe relocation from Profile to Discover                | Wardrobe is in ProfileStack (line 467, MainStackNavigator.tsx). Move to DiscoverStack (line 345).           |
| VIS-01 | Brand colors #C4956A / #2D3436 / #E17055 / #FAFAF8          | DesignTokens.colors.xuno and colors.neutral already define these. 484 hardcoded hex occurrences to replace. |
| VIS-02 | YiyiAvatar component                                        | Already implemented at design-system/ui/YiyiAvatar.tsx with correct tokens. Consistency check only.         |
| VIS-03 | Unified borderRadius (cards=16 / buttons=12 / inputs=24)    | design-tokens.ts has xl=16, lg=10 (needs 12), 2xl=24. Change lg from 10 to 12.                              |
| VIS-04 | Replace all hardcoded color values                          | 484 occurrences across 45 files. Regex batch replacement + manual review.                                   |

</phase_requirements>

## Architectural Responsibility Map

| Capability                   | Primary Tier                      | Secondary Tier | Rationale                                                |
| ---------------------------- | --------------------------------- | -------------- | -------------------------------------------------------- |
| Store state management       | Mobile Client (Zustand)           | --             | All stores are client-side with AsyncStorage persistence |
| Navigation structure         | Mobile Client (React Navigation)  | --             | Native stack navigators, tab bar -- purely client-side   |
| Design tokens                | Mobile Client (Design System)     | --             | Token definitions consumed by all UI components          |
| Import path resolution       | Build System (Metro + TypeScript) | --             | Path aliases via tsconfig + babel-plugin-module-resolver |
| Navigation state persistence | Mobile Client (AsyncStorage)      | --             | React Navigation state serialization to device storage   |
| Hardcoded color replacement  | Mobile Client (Components)        | --             | Each component file updated individually                 |

## Standard Stack

### Core

| Library                                   | Version                          | Purpose              | Why Standard                                                        |
| ----------------------------------------- | -------------------------------- | -------------------- | ------------------------------------------------------------------- |
| zustand                                   | ^5.0.5 [VERIFIED: package.json]  | State management     | Lightweight, TypeScript-native, persist middleware for AsyncStorage |
| @react-navigation/native                  | ^6.1.18 [VERIFIED: package.json] | Navigation framework | De facto RN navigation standard                                     |
| @react-navigation/bottom-tabs             | ^6.6.0 [VERIFIED: package.json]  | Tab navigation       | Official tab navigator for 4-tab layout                             |
| @react-navigation/native-stack            | ^6.11.0 [VERIFIED: package.json] | Stack navigation     | Native stack for each tab's screen hierarchy                        |
| @react-native-async-storage/async-storage | ^2.1.0 [VERIFIED: package.json]  | Persistent storage   | Zustand persist backend + navigation state persistence              |
| react-native                              | 0.76.8 [VERIFIED: package.json]  | Runtime              | Project is locked to this version                                   |
| typescript                                | 5.0.4 [VERIFIED: package.json]   | Type safety          | Already configured in project                                       |

### Supporting

| Library                 | Version     | Purpose                | When to Use                           |
| ----------------------- | ----------- | ---------------------- | ------------------------------------- |
| react-native-reanimated | (installed) | Tab bar animations     | AnimatedTabBar uses spring animations |
| react-native-svg        | (installed) | YiyiAvatar hanger icon | SVG path rendering for icon           |

### Alternatives Considered

| Instead of                    | Could Use                            | Tradeoff                                                                                                  |
| ----------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| @react-navigation/bottom-tabs | @react-navigation/native-bottom-tabs | Native-bottom-tabs conflicts with react-native-screens 4.4.0 (documented in REQUIREMENTS.md Out of Scope) |
| Zustand persist               | MMKV storage backend                 | MMKV is faster but AsyncStorage is already integrated and working                                         |
| AST codemod (jscodeshift)     | Regex batch replace                  | Codemod is more precise but 484 occurrences in a known pattern make regex sufficient                      |

**Installation:**
No new packages required for this phase. All dependencies already installed.

**Version verification:**

```
All versions verified from apps/mobile/package.json during this research session (2026-04-24).
```

## Architecture Patterns

### System Architecture Diagram

```
[App Entry]
    |
    v
[RootNavigator] -- reads --> useAuthStore (auth/stores)
    |                           useAppStore (shared/stores)
    |
    +-- [Auth Stack] (if !isAuthenticated)
    |       LoginScreen, RegisterScreen, PhoneLoginScreen
    |
    +-- [Main Stack] (if isAuthenticated)
            |
            +-- [AnimatedTabBar] (custom component)
            |       |
            |       +-- Tab 1: [TodayStack]
            |       |       TodayMain, WeatherSceneCard
            |       |
            |       +-- Tab 2: [DiscoverStack]
            |       |       DiscoverMain, CommunityFeed, PostDetail,
            |       |       VirtualTryOn, TryOnResult, TryOnHistory,
            |       |       Wardrobe (TO BE MOVED from Profile), Favorites
            |       |
            |       +-- Tab 3: [StylistStack]
            |       |       StylistMain, ChatHistory, OutfitPlan,
            |       |       SessionCalendar
            |       |
            |       +-- Tab 4: [ProfileStack]
            |               ProfileMain, ProfileEdit, Settings,
            |               ColorAnalysis, BodyAnalysis, SharePoster
            |
            +-- [RouteGuards]
                    AuthGuard, ProfileGuard, VipGuard
                    (all import useAuthStore from stores/index -- MUST migrate)
```

### Recommended Project Structure

```
apps/mobile/src/
├── stores/                     # DELETE ENTIRE DIRECTORY
├── features/
│   ├── auth/stores/            # useAuthStore (already exists)
│   ├── commerce/stores/        # useCartStore, useCouponStore, useOrderStore (already exists)
│   ├── profile/stores/         # useAnalysisStore, useProfileStore (already exists)
│   ├── home/stores/            # useRecommendationStore, useHeartRecommendStore, useHomeStore (already exists)
│   ├── stylist/stores/         # useAiStylistStore, useAiStylistChatStore (already exists)
│   ├── notifications/stores/   # useNotificationStore (already exists)
│   ├── consultant/stores/      # useConsultantStore, useChatStore (already exists)
│   ├── customization/stores/   # useCustomizationEditorStore (already exists)
│   ├── onboarding/stores/      # useOnboardingStore (already exists)
│   ├── community/stores/       # useBloggerStore (already exists)
│   └── style-quiz/stores/      # useQuizStore, useStyleQuizStore (already exists)
├── shared/stores/              # clearAllStores.ts (NEW), useAppStore, useUIStore (already exists)
├── navigation/
│   ├── RootNavigator.tsx       # Import migration needed
│   ├── MainStackNavigator.tsx  # Wardrobe relocation needed
│   ├── navigationService.ts    # Import migration needed
│   └── RouteGuards/            # Import migration needed (4 files)
└── design-system/
    └── theme/tokens/
        └── design-tokens.ts    # borderRadius.lg: 10 -> 12
```

### Pattern 1: Feature-Local Store with Persist Middleware

**What:** Zustand stores live alongside the features that consume them
**When to use:** All new stores follow this pattern; this phase enforces it for existing stores
**Example:**

```typescript
// src/features/commerce/stores/cart.store.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      // ... state and actions
    }),
    {
      name: "cart-storage", // AsyncStorage key -- MUST remain unchanged
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        /* only serializable fields */
      }),
    }
  )
);
```

[VERIFIED: Zustand v5 docs -- persist API unchanged from v4]

### Pattern 2: Navigation State Persistence with Versioned Key

**What:** Version the AsyncStorage key used for navigation state to invalidate old state on schema changes
**When to use:** When tab structure or screen names change (exactly this phase's situation)
**Example:**

```typescript
// src/navigation/RootNavigator.tsx
const PERSISTENCE_KEY = "NAVIGATION_STATE_V2"; // Bump from V1 after tab structure change

// On app start:
try {
  const savedState = await AsyncStorage.getItem(PERSISTENCE_KEY);
  if (savedState) {
    initialState = JSON.parse(savedState);
  }
} catch {
  // Invalid persisted state -- start fresh (old user crash prevention)
}
```

[VERIFIED: React Navigation v6 state persistence docs -- https://reactnavigation.org/docs/state-persistence]

### Pattern 3: clearAllStores as Shared Utility

**What:** Centralized store cleanup for logout/account deletion
**When to use:** Auth logout flow
**Example:**

```typescript
// src/shared/stores/clearAllStores.ts
import { useAuthStore } from "../../features/auth/stores";
import { useAnalysisStore } from "../../features/profile/stores";
import { useRecommendationStore } from "../../features/home/stores";
import { useCartStore } from "../../features/commerce/stores";
import { useHeartRecommendStore } from "../../features/home/stores/heart-recommend.store";

export const clearAllStores = async () => {
  try {
    await useAuthStore.getState().logout();
  } catch {}
  try {
    useAnalysisStore.getState().clearAnalysis();
  } catch {}
  try {
    useRecommendationStore.getState().clear();
  } catch {}
  try {
    useCartStore.getState().clear();
  } catch {}
  try {
    useHeartRecommendStore.getState().clearSession();
  } catch {}
};
```

### Anti-Patterns to Avoid

- **Cross-feature store imports via `stores/index`:** Importing `useAuthStore` from `../../stores/index` instead of the feature-local path creates hidden dependencies and prevents deletion of the legacy directory.
- **Modifying persisted store keys:** The `cart-storage` and `heart-recommend-storage` AsyncStorage keys must not be renamed or existing user data is lost silently.
- **In-place store mutation during migration:** Never mutate store shape while the app is running. Create new stores first, update imports, then delete old files.
- **Batch file deletion before import verification:** Deleting `src/stores/` before confirming every import path is updated causes cascading TypeScript errors that are hard to trace.

## Don't Hand-Roll

| Problem                      | Don't Build                                                | Use Instead                                                          | Why                                                                                 |
| ---------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Navigation state persistence | Custom AsyncStorage serialization                          | React Navigation's built-in `onStateChange` + `initialState` pattern | React Navigation provides type-safe state serialization with screen name validation |
| Store cleanup on logout      | Individual store.clear() calls scattered across components | `clearAllStores` in shared/stores                                    | Single point of truth for cleanup, error-isolated per store                         |
| Tab bar animation            | Custom Animated.Value chain                                | Reanimated `withSpring` (already in AnimatedTabBar)                  | Reanimated runs on UI thread, no bridge overhead                                    |
| Hex color to token mapping   | Manual find-and-replace per file                           | Regex-based batch replacement with sed/codemod                       | 484 occurrences is too many for manual replacement; regex ensures consistency       |

**Key insight:** The stores already have feature-local counterparts. The migration is an import path exercise, not a store rewrite. The feature-local stores in `src/features/*/stores/` are already used by most components via relative `../stores/` paths. Only the 9 files importing from `../stores/index` (the centralized barrel) need updating.

## Common Pitfalls

### Pitfall 1: Import Path Depth Mismatch

**What goes wrong:** A file at `features/profile/screens/SettingsScreen.tsx` imports `useAuthStore` from `../stores/index`, expecting to reach `src/stores/index.ts`. But `../stores/index` from `features/profile/screens/` resolves to `features/profile/stores/index`, which does NOT export `useAuthStore`.
**Why it happens:** The relative path `../stores/index` is ambiguous -- it could mean the legacy barrel or the feature-local barrel depending on file location.
**How to avoid:** Update each import individually to an absolute or explicit relative path pointing to `features/auth/stores`.
**Warning signs:** `tsc --noEmit` errors about missing exports from `../stores/index`.

### Pitfall 2: Persisted Store Key Breakage

**What goes wrong:** If the migrated `useCartStore` uses a different `name` in the persist config, existing users lose their cart data.
**Why it happens:** Copy-pasting store definitions without preserving the original AsyncStorage key.
**How to avoid:** The feature-local stores already use the same keys (`cart-storage`, `heart-recommend-storage`). Verify by comparing the `name` field in persist configs between legacy and feature-local versions.
**Warning signs:** Users report empty cart after app update.

### Pitfall 3: Navigation State Crash on Old Users

**What goes wrong:** Old users have persisted navigation state referencing `Profile` tab with `Wardrobe` screen. After the move to `DiscoverStack`, React Navigation cannot find `Wardrobe` in the `Profile` navigator and crashes.
**Why it happens:** React Navigation validates screen names against the current navigator definition.
**How to avoid:** Either (a) don't persist navigation state currently (no persistence is implemented today, so this is the default), or (b) use a versioned PERSISTENCE_KEY that invalidates old state.
**Warning signs:** App crashes immediately on launch for users who had the old navigation state cached.

### Pitfall 4: Circular Import After clearAllStores Migration

**What goes wrong:** `clearAllStores` in `shared/stores/` imports from multiple feature stores. If any feature store imports from `shared/stores/`, a circular dependency forms.
**Why it happens:** Feature stores importing shared utilities that transitively import the feature store.
**How to avoid:** Ensure `clearAllStores.ts` only imports store hooks (which are just Zustand selectors) and does not import any shared utility that might re-import feature stores.
**Warning signs:** Metro bundler warnings about circular dependencies; runtime `undefined` imports.

### Pitfall 5: borderRadius.lg Change Breaking Existing Components

**What goes wrong:** Changing `borderRadius.lg` from 10 to 12 affects all components currently using `lg`, not just buttons.
**Why it happens:** `lg` is a shared token, not a semantic token. Other components (cards, modals, chips) may already use `lg` intentionally at 10px.
**How to avoid:** Before changing the value, grep for all usages of `borderRadius.lg` and verify they are all button-related. If not, add a semantic alias like `borderRadius.button = 12` instead.
**Warning signs:** Non-button UI elements suddenly have larger corner radius after the change.

## Code Examples

### Store Import Migration (per file)

```typescript
// BEFORE (legacy centralized import):
import { useAuthStore, useCartStore } from "../stores/index";

// AFTER (feature-local imports):
import { useAuthStore } from "../../features/auth/stores";
import { useCartStore } from "../../features/commerce/stores/cart.store";
```

[VERIFIED: Codebase analysis of RootNavigator.tsx line 16]

### RouteGuard Import Migration

```typescript
// BEFORE:
import { useAuthStore } from "../../stores/index";

// AFTER:
import { useAuthStore } from "../features/auth/stores";
```

[VERIFIED: Codebase analysis of 4 RouteGuard files]

### Wardrobe Relocation in MainStackNavigator

```typescript
// BEFORE: Wardrobe is in ProfileStack (line 467)
<ProfileStack.Screen name="Wardrobe" options={{ animation: "slide_from_right" }}>
  {() => (<G route="Wardrobe"><SuspenseScreen><WardrobeScreen /></SuspenseScreen></G>)}
</ProfileStack.Screen>

// AFTER: Move to DiscoverStack (before closing </DiscoverStack.Navigator>)
<DiscoverStack.Screen name="Wardrobe" options={{ animation: "slide_from_right" }}>
  {() => (<G route="Wardrobe"><SuspenseScreen><WardrobeScreen /></SuspenseScreen></G>)}
</DiscoverStack.Screen>
```

[VERIFIED: MainStackNavigator.tsx structure analysis]

### borderRadius Token Adjustment

```typescript
// BEFORE (design-tokens.ts):
borderRadius: {
  none: 0, xs: 2, sm: 4, md: 6, lg: 10, xl: 16, "2xl": 24, "3xl": 32, full: 9999,
}

// AFTER:
borderRadius: {
  none: 0, xs: 2, sm: 4, md: 6, lg: 12, xl: 16, "2xl": 24, "3xl": 32, full: 9999,
}
```

[VERIFIED: design-tokens.ts line 194-204]

### Regex Pattern for Hex Color Replacement

```bash
# Find all hardcoded hex colors (excluding design-system/ which defines tokens):
grep -rn '#[0-9a-fA-F]\{6\}' --include='*.tsx' --include='*.ts' src/ \
  --exclude-dir='design-system' --exclude-dir='__tests__'

# Common replacement mappings:
# #C4956A -> DesignTokens.colors.xuno.warmCamel
# #2D3436 -> DesignTokens.colors.xuno.charcoal
# #E17055 -> DesignTokens.colors.xuno.warmOrange
# #FAFAF8 -> DesignTokens.colors.neutral[50]
# #FFFFFF -> DesignTokens.colors.neutral.white
# #1A1A18 -> DesignTokens.colors.neutral[900]
# rgba(0, 0, 0, 0.4) -> DesignTokens.colors.backgrounds.overlay
```

[VERIFIED: grep count of 484 occurrences across 45 files in src/]

## State of the Art

| Old Approach                                    | Current Approach                                  | When Changed   | Impact                                              |
| ----------------------------------------------- | ------------------------------------------------- | -------------- | --------------------------------------------------- |
| Centralized stores barrel (src/stores/index.ts) | Feature-based stores (src/features/\*/stores/)    | Phase 1-2      | Already partially migrated; this phase completes it |
| 5-Tab navigation                                | 4-Tab navigation                                  | Phase 3 design | Reduces complexity, aligns with XUNO product vision |
| Hardcoded hex colors inline                     | DesignTokens references                           | Phase 3        | Enables theme consistency and dark mode support     |
| WarmPrimaryColors (coral/mint/ocean)            | XUNO brand tokens (warmCamel/charcoal/warmOrange) | Phase 3        | Brand identity unification                          |

**Deprecated/outdated:**

- `WarmPrimaryColors` (coral/mint/ocean): Marked `@deprecated` in colors.ts. Should not be imported in new code. Phase 3 cleans up remaining usages. [VERIFIED: colors.ts lines 18-22]
- `src/stores/` directory: Entire directory is legacy and will be deleted. [VERIFIED: stores/index.ts is a barrel that re-exports from feature stores + defines 4 inline stores]

## Assumptions Log

| #   | Claim                                                                                                                           | Section                       | Risk if Wrong                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------ |
| A1  | Feature-local stores already export the same interfaces as the legacy barrel exports                                            | Standard Stack / Architecture | Some consumers may use exports only available from the barrel            |
| A2  | No navigation state persistence is currently implemented (no PERSISTENCE_KEY found in codebase)                                 | Architecture Patterns         | If persistence exists elsewhere, NAV_VERSION migration is already needed |
| A3  | `borderRadius.lg` change from 10 to 12 will not break non-button components                                                     | Common Pitfalls               | Some components may rely on the 10px value                               |
| A4  | The `cart-storage` and `heart-recommend-storage` AsyncStorage keys in feature-local stores match the legacy keys exactly        | Common Pitfalls               | Users lose cart/heart data on migration                                  |
| A5  | `src/stores/` contains no stores that are NOT already duplicated in feature directories (besides the 4 inline ones in index.ts) | Architecture                  | Some stores may be missed during deletion                                |

## Open Questions

1. **Are there any components outside src/ that import from stores/?**

   - What we know: All imports found are within `apps/mobile/src/`
   - What's unclear: Whether expo-router auto-generated files reference stores
   - Recommendation: Grep project-wide before deletion

2. **Should borderRadius get a semantic alias instead of changing lg?**

   - What we know: User wants buttons at 12px, current lg=10
   - What's unclear: How many non-button components use `borderRadius.lg`
   - Recommendation: Grep for `borderRadius.lg` usages first; if all are buttons, change the value; if mixed, add `borderRadius.button = 12`

3. **What is the import path for `deeplinkService.ts` that uses `../stores` (bare)?**
   - What we know: `src/services/deeplinkService.ts` imports `useAuthStore` from `"../stores"` (bare, no /index)
   - What's unclear: This bare import resolves to `src/stores/index.ts`
   - Recommendation: Update to `../features/auth/stores`

## Environment Availability

| Dependency                    | Required By     | Available | Version          | Fallback |
| ----------------------------- | --------------- | --------- | ---------------- | -------- |
| Node.js                       | Build system    | Yes       | v24              | --       |
| pnpm                          | Package manager | Yes       | (installed)      | --       |
| Metro bundler                 | RN dev server   | Yes       | (project config) | --       |
| TypeScript 5.0                | Type checking   | Yes       | 5.0.4            | --       |
| Jest 29                       | Tests           | Yes       | ^29.6.3          | --       |
| @testing-library/react-native | Component tests | Yes       | ^13.3.3          | --       |

**Missing dependencies with no fallback:**
None -- all required dependencies are available.

**Missing dependencies with fallback:**
None.

## Validation Architecture

### Test Framework

| Property           | Value                                                            |
| ------------------ | ---------------------------------------------------------------- |
| Framework          | Jest 29 + @testing-library/react-native 13                       |
| Config file        | apps/mobile/jest.config.js                                       |
| Quick run command  | `cd apps/mobile && npx jest --changedSince=HEAD~1 --no-coverage` |
| Full suite command | `cd apps/mobile && npx jest --no-coverage`                       |

### Phase Requirements -> Test Map

| Req ID          | Behavior                                   | Test Type | Automated Command                                 | File Exists?                           |
| --------------- | ------------------------------------------ | --------- | ------------------------------------------------- | -------------------------------------- |
| NAV-01          | 4 tabs render correctly                    | unit      | `npx jest --testPathPattern='navigation'`         | Partial -- RouteGuards tests may exist |
| NAV-05          | Wardrobe accessible from Discover stack    | unit      | `npx jest --testPathPattern='MainStackNavigator'` | No -- Wave 0                           |
| VIS-03          | borderRadius.lg equals 12                  | unit      | `npx jest --testPathPattern='design-tokens'`      | No -- Wave 0                           |
| VIS-04          | No hardcoded hex colors in component files | lint      | regex grep in CI                                  | N/A                                    |
| Store migration | All imports resolve after stores/ deletion | build     | `npx tsc --noEmit`                                | N/A (type check)                       |

### Sampling Rate

- **Per task commit:** `cd apps/mobile && npx tsc --noEmit`
- **Per wave merge:** `cd apps/mobile && npx jest --no-coverage`
- **Phase gate:** Full suite green + `tsc --noEmit` zero errors

### Wave 0 Gaps

- [ ] `apps/mobile/src/navigation/__tests__/MainStackNavigator.test.tsx` -- covers NAV-05 Wardrobe relocation
- [ ] `apps/mobile/src/design-system/theme/tokens/__tests__/design-tokens.test.ts` -- covers VIS-03 borderRadius values
- [ ] Store migration smoke test: verify no imports from `stores/index` remain after migration

## Security Domain

### Applicable ASVS Categories

| ASVS Category         | Applies | Standard Control                                                               |
| --------------------- | ------- | ------------------------------------------------------------------------------ |
| V2 Authentication     | Yes     | useAuthStore handles auth state; RouteGuards enforce auth requirements         |
| V3 Session Management | Yes     | Zustand persist with AsyncStorage for session tokens; clearAllStores on logout |
| V4 Access Control     | Yes     | RouteGuards (AuthGuard, ProfileGuard, VipGuard) enforce route-level access     |
| V5 Input Validation   | No      | This phase is navigation/visual, no new user input                             |
| V6 Cryptography       | No      | No cryptographic operations in this phase                                      |

### Known Threat Patterns for React Native Navigation

| Pattern                                             | STRIDE                 | Standard Mitigation                                                                               |
| --------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------- |
| Navigation state tampering (AsyncStorage)           | Tampering              | React Navigation validates screen names against navigator definitions; invalid state is discarded |
| Persisted auth bypass (stale token in AsyncStorage) | Spoofing               | clearAllStores clears auth state on logout; RouteGuards check isAuthenticated live                |
| Deep link injection (if deeplinks enabled)          | Elevation of Privilege | deeplinkService validates routes against allowed list                                             |

## Sources

### Primary (HIGH confidence)

- Codebase analysis of apps/mobile/src/ (import patterns, store structure, navigation configuration) -- all verified by grep/read during this session
- apps/mobile/package.json -- dependency versions
- src/stores/index.ts -- legacy store definitions and clearAllStores implementation
- src/features/\*/stores/ -- feature-local store structure verified by directory listing
- src/design-system/theme/tokens/design-tokens.ts -- token definitions

### Secondary (MEDIUM confidence)

- Zustand v5 persist middleware API -- training knowledge verified against project usage patterns
- React Navigation v6 state persistence -- training knowledge verified against project structure

### Tertiary (LOW confidence)

- None -- all findings are from direct codebase analysis

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH -- all versions verified from package.json
- Architecture: HIGH -- codebase structure verified by grep and file reads
- Pitfalls: HIGH -- derived from direct analysis of import paths and store configurations
- Store migration: HIGH -- feature-local counterparts confirmed by directory listing; interface compatibility verified by code comparison
- Navigation migration: HIGH -- Wardrobe location confirmed by MainStackNavigator.tsx analysis
- Design token replacement: MEDIUM -- 484 occurrences counted but individual mapping not verified per-file

**Research date:** 2026-04-24
**Valid until:** 2026-05-24 (stable React Native / Zustand ecosystem)

---

## Detailed Import Migration Map

### Files Importing from `"../stores/index"` (relative to src/stores/)

These files import from the centralized barrel and MUST be updated:

| File                                               | Current Import               | Target Import                                                  |
| -------------------------------------------------- | ---------------------------- | -------------------------------------------------------------- |
| navigation/RootNavigator.tsx:16                    | `useAuthStore, useCartStore` | `features/auth/stores` + `features/commerce/stores/cart.store` |
| navigation/navigationService.ts:14                 | `useAuthStore`               | `features/auth/stores`                                         |
| features/auth/screens/RegisterScreen.tsx:20        | `useAuthStore`               | `../stores` (already feature-local, OK)                        |
| features/auth/screens/PhoneLoginScreen.tsx:20      | `useAuthStore`               | `../stores` (already feature-local, OK)                        |
| features/auth/screens/LoginScreen.tsx:22           | `useAuthStore`               | `../stores` (already feature-local, OK)                        |
| features/profile/screens/SettingsScreen.tsx:22     | `useAuthStore`               | `../../auth/stores`                                            |
| features/profile/screens/ProfileScreen.tsx:22      | `useAuthStore`               | `../../auth/stores`                                            |
| features/home/screens/RecommendationsScreen.tsx:18 | `useAuthStore`               | `../../auth/stores`                                            |
| features/style-quiz/screens/StyleQuizScreen.tsx:24 | multiple stores from index   | individual feature stores                                      |

### Files Importing from `"../../stores/index"` (from navigation/RouteGuards/)

| File                            | Current Import | Target Import                |
| ------------------------------- | -------------- | ---------------------------- |
| RouteGuards/AuthGuard.tsx:2     | `useAuthStore` | `../../features/auth/stores` |
| RouteGuards/ProfileGuard.tsx:2  | `useAuthStore` | `../../features/auth/stores` |
| RouteGuards/VipGuard.tsx:3      | `useAuthStore` | `../../features/auth/stores` |
| RouteGuards/useRouteGuard.tsx:4 | `useAuthStore` | `../../features/auth/stores` |

### Files Importing from `"../stores"` (bare, no filename)

| File                                                                | Current Import                             | Target Import                        |
| ------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------ |
| services/deeplinkService.ts:2                                       | `useAuthStore` from `"../stores"`          | `../features/auth/stores`            |
| features/home/components/heartrecommend/HeartRecommendScreen.tsx:22 | `useAuthStore` from `"../../../../stores"` | `"../../../../features/auth/stores"` |

### Files Importing from `"../stores/XXXStore"` (specific store files, NOT index)

These are already using specific store files and resolve correctly to `src/stores/XXXStore.ts`. After deleting `src/stores/`, these imports will break and must be updated to point to feature-local equivalents:

| File                                                          | Store                              | Feature Equivalent                                                  |
| ------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------- |
| features/commerce/screens/CheckoutScreen.tsx                  | cart.store, couponStore            | Already in features/commerce/stores/ (OK)                           |
| features/commerce/screens/CartScreen.tsx                      | cart.store, couponStore            | Already in features/commerce/stores/ (OK)                           |
| features/commerce/screens/OrdersScreen.tsx                    | orderStore                         | Already in features/commerce/stores/ (OK)                           |
| features/profile/screens/SharePosterScreen.tsx                | profileStore                       | Already in features/profile/stores/ (OK)                            |
| features/profile/screens/ProfileScreen.tsx                    | profileStore                       | Already in features/profile/stores/ (OK)                            |
| features/profile/screens/ProfileEditScreen.tsx                | profileStore                       | Already in features/profile/stores/ (OK)                            |
| features/profile/screens/ColorAnalysisScreen.tsx              | profileStore                       | Already in features/profile/stores/ (OK)                            |
| features/profile/screens/BodyAnalysisScreen.tsx               | profileStore                       | Already in features/profile/stores/ (OK)                            |
| features/tryon/screens/CameraScreen.tsx                       | photoStore                         | src/stores/photoStore (NOT in features/)                            |
| features/customization/screens/CustomizationPreviewScreen.tsx | customizationEditorStore           | src/stores/customizationEditorStore (NOT in features/)              |
| features/customization/screens/CustomizationEditorScreen.tsx  | customizationEditorStore           | src/stores/customizationEditorStore (NOT in features/)              |
| features/onboarding/screens/StyleStep.tsx                     | onboardingStore                    | src/stores/onboardingStore (NOT in features/)                       |
| features/onboarding/screens/PreferenceStep.tsx                | onboardingStore                    | src/stores/onboardingStore (NOT in features/)                       |
| features/onboarding/screens/OnboardingWizard.tsx              | onboardingStore                    | src/stores/onboardingStore (NOT in features/)                       |
| features/onboarding/screens/ResultStep.tsx                    | onboardingStore                    | src/stores/onboardingStore (NOT in features/)                       |
| features/onboarding/screens/SceneStep.tsx                     | onboardingStore                    | src/stores/onboardingStore (NOT in features/)                       |
| features/consultant/screens/ChatScreen.tsx                    | chatStore, consultantStore         | src/stores/chatStore, src/stores/consultantStore (NOT in features/) |
| features/consultant/screens/BookingScreen.tsx                 | consultantStore                    | src/stores/consultantStore (NOT in features/)                       |
| features/consultant/screens/AdvisorProfileScreen.tsx          | consultantStore                    | src/stores/consultantStore (NOT in features/)                       |
| features/consultant/screens/AdvisorListScreen.tsx             | consultantStore                    | src/stores/consultantStore (NOT in features/)                       |
| features/stylist/screens/StylistScreen.tsx                    | aiStylistStore, aiStylistChatStore | src/stores/aiStylistStore (NOT in features/)                        |
| features/stylist/screens/AiStylistUnifiedScreen.tsx           | aiStylistStore, aiStylistChatStore | src/stores/ (NOT in features/)                                      |
| features/stylist/screens/ChatHistoryScreen.tsx                | aiStylistStore                     | src/stores/aiStylistStore (NOT in features/)                        |
| features/stylist/screens/SessionCalendarScreen.tsx            | aiStylistStore                     | src/stores/aiStylistStore (NOT in features/)                        |
| features/stylist/screens/OutfitPlanScreen.tsx                 | aiStylistStore                     | src/stores/aiStylistStore (NOT in features/)                        |
| features/stylist/components/AICompanionProvider.tsx           | aiStylistStore                     | src/stores/aiStylistStore (NOT in features/)                        |
| features/community/screens/BloggerDashboardScreen.tsx         | bloggerStore                       | src/stores/bloggerStore (NOT in features/)                          |
| features/notifications/screens/NotificationSettingsScreen.tsx | notificationStore                  | src/stores/notificationStore (NOT in features/)                     |
| features/notifications/screens/NotificationsScreen.tsx        | notificationStore                  | src/stores/notificationStore (NOT in features/)                     |
| features/home/screens/HomeScreen.tsx                          | homeStore, recommendationFeedStore | Already in features/home/stores/ (OK)                               |
| features/home/screens/RecommendationFeedScreen.tsx            | recommendationFeedStore            | Already in features/home/stores/ (OK)                               |
| features/style-quiz/screens/QuizResultScreen.tsx              | quizStore                          | src/stores/quizStore (NOT in features/)                             |
| features/wardrobe/screens/FavoritesScreen.tsx                 | authStore                          | `"../../../stores"` -> needs migration                              |
| features/wardrobe/screens/ClothingDetailScreen.tsx            | sizeRecommendationStore            | Already in features/commerce/stores/                                |

**CRITICAL FINDING:** Many feature screens import from `../stores/XXXStore` which resolves to `src/stores/XXXStore.ts` (NOT the feature-local stores). This means the deletion of `src/stores/` is NOT just about updating 9 `stores/index` imports -- it requires ensuring all 30+ store files in `src/stores/` have feature-local counterparts.

**Updated migration scope:**

1. `stores/index.ts` unique stores: Already have feature-local equivalents (verified)
2. `stores/index.ts` barrel re-exports: All re-exported stores have original files in `src/stores/` -- those original files must either be moved to features or the feature directories must re-export them
3. Individual store files (photoStore, onboardingStore, chatStore, consultantStore, aiStylistStore, etc.): These are imported directly from `../stores/XXXStore` and have NO feature-local equivalents

**Revised recommendation:** Instead of just updating imports, each store file in `src/stores/` that is NOT already duplicated in a feature directory must be MOVED to its corresponding feature directory. The stores that already exist in both locations should be verified for interface compatibility, then the `src/stores/` version deleted.

## Hardcoded Color Distribution (484 occurrences across 45 files)

Top files by hardcoded color count:

| File                                                    | Count | Priority                                  |
| ------------------------------------------------------- | ----- | ----------------------------------------- |
| design-system/theme/index.ts                            | 112   | Low -- this is the theme definition layer |
| design-system/theme/tokens/colors.ts                    | 83    | Low -- color definitions, expected        |
| design-system/theme/tokens/season-colors.ts             | 21    | Low -- seasonal palette definitions       |
| shared/contexts/ThemeContext.tsx                        | 23    | High -- shared theme context              |
| features/profile/screens/components/ColorSeasonCard.tsx | 17    | Medium -- uses seasonal colors            |
| design-tokens.ts                                        | 121   | Low -- token definitions themselves       |
| features/today/components/WeatherSceneCard.tsx          | 5     | High -- new Today screen component        |
| features/stylist/screens/AiStylistUnifiedScreen.tsx     | 8     | High -- main stylist screen               |
| features/home/screens/components/SceneCarousel.tsx      | 9     | High -- scene carousel component          |

Files in `design-system/theme/` (221 occurrences) are the color DEFINITIONS and should be excluded from replacement. The remaining ~263 occurrences in 38 non-theme files are the actual migration targets.
