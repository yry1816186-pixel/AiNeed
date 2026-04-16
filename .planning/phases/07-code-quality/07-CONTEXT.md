# Phase 7: 代码质量提升 - Context (Navigation Type System Focus)

**Gathered:** 2026-04-17
**Status:** Ready for planning
**Source:** User-specified goal for navigation type safety

<domain>
## Phase Boundary

Fix the navigation type system in the mobile app to eliminate all `as never` and `as any` cross-Stack navigation patterns, establishing a type-safe navigation architecture. This is a focused sub-task of Phase 7 Plan 5 (移动端导航/API any 模式修复).

</domain>

<decisions>
## Implementation Decisions

### Architecture
- RootStackParamList in `navigation/types.ts` is the single source of truth — it correctly defines only Auth + MainTabs as root-level routes
- `types/navigation.ts` flat RootStackParamList (90+ routes) must be eliminated — it causes all cross-stack type confusion
- Each sub-stack screen must be typed with its own Stack's ScreenProps (e.g., `NativeStackScreenProps<ProfileStackParamList, "ProfileMain">`)
- Cross-stack navigation must use `CompositeScreenProps` or the existing `navigationService` functions

### Navigation Pattern
- Screens within a stack use their own Stack ParamList for navigation
- Cross-stack navigation uses `navigationService.navigateHome()`, `navigateProfile()`, `navigateStylist()`, etc.
- For screens that need both intra-stack and cross-stack navigation, use `CompositeScreenProps<NativeStackScreenProps<ProfileStackParamList, "X">, NativeStackScreenProps<RootStackParamList>>`
- The `navigationService` already provides type-safe cross-stack navigation — leverage it instead of raw `navigation.navigate()`

### Type File Consolidation
- `navigation/types.ts` — KEEP as source of truth (hierarchical: AuthStack, HomeStack, StylistStack, TryOnStack, CommunityStack, ProfileStack, MainTab, RootStack)
- `types/navigation.ts` — REFACTOR to re-export from `navigation/types.ts`, remove flat RootStackParamList, add `CompositeScreenProps` helper types
- `types/navigation.d.ts` — KEEP for global ReactNavigation RootParamList declaration, but point to the correct (hierarchical) RootStackParamList

### Bug Fix
- `navigationService.ts` imports `DEEPLINK_ROUTES` but the export is `DEEP_LINK_ROUTES` — fix this naming inconsistency

### Claude's Discretion
- Exact `CompositeScreenProps` patterns for each screen
- Whether to create a shared `useTypedNavigation()` hook
- How to handle the expo-router polyfill's `as never` usage
- Whether to add navigation type tests

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Navigation Type System
- `apps/mobile/src/navigation/types.ts` — Hierarchical ParamList definitions (source of truth)
- `apps/mobile/src/types/navigation.ts` — Flat RootStackParamList (to be refactored)
- `apps/mobile/src/types/navigation.d.ts` — Global ReactNavigation type declaration
- `apps/mobile/src/navigation/navigationService.ts` — Type-safe cross-stack navigation functions
- `apps/mobile/src/navigation/RootNavigator.tsx` — Root stack + tab navigator setup
- `apps/mobile/src/navigation/MainStackNavigator.tsx` — All sub-stack navigators
- `apps/mobile/src/navigation/AuthNavigator.tsx` — Auth stack navigator

### React Navigation Type Patterns
- `CompositeScreenProps` from `@react-navigation/native` — for cross-stack navigation typing
- `NativeStackScreenProps` from `@react-navigation/native-stack` — for stack screen props
- `BottomTabScreenProps` from `@react-navigation/bottom-tabs` — for tab screen props

</canonical_refs>

<specifics>
## Specific Issues to Fix

### `as never` Cross-Stack Navigation (51 occurrences)

**ProfileScreen (12+ occurrences):**
- `navigation.navigate("ProfileEdit" as never)` — should use ProfileStack navigation
- `navigation.navigate("BodyAnalysis" as never)` — should use ProfileStack navigation
- `navigation.navigate("ColorAnalysis" as never)` — should use ProfileStack navigation
- `navigation.navigate("StyleQuiz" as never)` — should use ProfileStack navigation
- `navigation.navigate("SharePoster" as never)` — should use ProfileStack navigation
- `navigation.navigate("Wardrobe" as never)` — should use ProfileStack navigation
- `navigation.navigate("AiStylist" as never)` — should use cross-stack navigationService
- `navigation.navigate("Favorites" as never)` — should use ProfileStack navigation
- `navigation.navigate("CustomDesign" as never)` — should use ProfileStack navigation
- `navigation.navigate("Subscription" as never)` — should use ProfileStack navigation

**LoginScreen:**
- `navigation.navigate("PhoneLogin" as never)` — should use AuthStack navigation

**CartScreen:**
- `navigation.navigate("MainTabs", { screen: "Home" } as never)` — should use navigationService

**TryOnHistoryScreen:**
- `navigation.navigate("VirtualTryOn" as never)` — should use TryOnStack navigation

**QuizResultScreen:**
- `navigation.navigate("Profile" as never)` — should use cross-stack navigationService

**BodyAnalysisScreen:**
- `navigation.navigate("ProfileSetup" as never)` — route doesn't exist in any ParamList

**ColorAnalysisScreen:**
- `navigation.navigate("ProfileSetup" as never)` — route doesn't exist in any ParamList

**RecommendationDetailScreen:**
- `navigation.navigate("Cart" as never)` — should use cross-stack navigationService
- `{ screen: "Cart" as never } as never` — should use navigationService

**OrdersScreen:**
- `navigation.navigate("MainTabs", { screen: "Home" } as never)` — should use navigationService

**OrderDetailScreen:**
- `navigation.navigate("OrderDetail", { orderId: order.id } as never)` — should use ProfileStack navigation
- `navigation.navigate("MainTabs", { screen: "Home" } as never)` — should use navigationService

**expo-router polyfill:**
- `navigation.navigate(path as never)` — needs special handling

### `as any` Navigation (12 occurrences)

**InfluencerProfileScreen:**
- `(navigation as any).navigate("PostDetail", { postId: item.id })` — should use CommunityStack navigation

**PostDetailScreen:**
- `(route.params as any)?.postId` — should use typed route params

**AiStylistChatScreen:**
- `(navigation as any).navigate("ChatHistory")` — should use StylistStack navigation

**RecommendationsScreen:**
- `(navigation as any).navigate("RecommendationDetail", {...})` — should use HomeStack navigation

**CustomizationPreviewScreen:**
- `(navigation as any).replace("CustomizationOrderDetail", { requestId })` — should use ProfileStack navigation

**CustomizationScreen:**
- `navigation.navigate("CustomizationEditor" as any)` — should use ProfileStack navigation

**BloggerProfileScreen:**
- `(navigation.navigate as any)("BloggerProduct", { productId: item.id })` — should use CommunityStack navigation

**BloggerDashboardScreen:**
- `(navigation.navigate as any)("BloggerProfile", {})` — should use CommunityStack navigation

**RecommendationFeedScreen:**
- `(navigation.navigate as any)("ClothingDetail", { id: item.id })` — should use HomeStack navigation

### Dual RootStackParamList Definitions

**`navigation/types.ts` (correct, hierarchical):**
```typescript
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
};
```

**`types/navigation.ts` (incorrect, flat — 90+ routes):**
```typescript
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  MainTabs: NavigatorScreenParams<NewMainTabParamList>;
  Login: undefined;
  PhoneLogin: undefined;
  // ... 85+ more routes flattened from all sub-stacks
};
```

The flat version causes type confusion because screens typed with `NativeStackNavigationProp<RootStackParamList>` (flat) can "see" all routes but the actual navigation prop from within a sub-stack only supports that sub-stack's routes.

### Naming Bug
- `navigationService.ts:14` imports `DEEPLINK_ROUTES` but `types.ts:236` exports `DEEP_LINK_ROUTES`

</specifics>

<deferred>
## Deferred Ideas

- Navigation type tests (can be added later as part of test coverage improvement)
- Creating a `useTypedNavigation()` custom hook (evaluate during implementation)
- Refactoring expo-router polyfill (low priority, separate concern)
- Adding missing routes like "ProfileSetup" to ParamLists (needs business logic verification)

</deferred>

---

*Phase: 07-code-quality*
*Context gathered: 2026-04-17 via user-specified goal*
