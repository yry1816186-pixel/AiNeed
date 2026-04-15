# AiNeed Monorepo Build Errors Audit

**Audit Date**: 2026-04-13
**Auditor**: Backend Architect (Automated)
**Scope**: Full monorepo compilation check

---

## Summary

| Module | Errors | Status |
|--------|--------|--------|
| pnpm install | 1 | postinstall script failed |
| apps/backend | 0 | PASS |
| apps/mobile | 93 | FAIL |
| apps/admin | 0 | PASS |
| packages/shared | 0 | PASS |
| packages/types | 0 | PASS |
| ml/ (Python) | 0 | PASS |
| **Total** | **94** | |

---

## 1. pnpm install - Dependency Issues

### Error 1: postinstall script MODULE_NOT_FOUND

- **File**: `scripts/build/patch-cod...` (truncated in output)
- **Line**: N/A
- **Type**: MODULE_NOT_FOUND
- **Message**: `Cannot find module 'C:\AiNeed\scripts\...'` - The root package.json postinstall script references a module that does not exist.
- **Impact**: Dependencies are installed (lockfile is up to date), but the postinstall hook fails. This is a non-blocking issue for development but will cause CI pipeline failures.

---

## 2. apps/backend - TypeScript Errors

**Result**: 0 errors - PASS

---

## 3. apps/mobile - TypeScript Errors (93 total)

### 3.1 App.tsx (1 error)

| # | File | Line | Error Type | Message |
|---|------|------|------------|---------|
| 1 | `App.tsx` | 45 | TS2322 | Type `Promise<typeof import(".../FavoritesScreen")>` is not assignable to type `Promise<{ default: ComponentType<any>; }>`. Property 'default' is missing. |

### 3.2 e2e/ (3 errors)

| # | File | Line | Error Type | Message |
|---|------|------|------------|---------|
| 2 | `e2e/auth.test.ts` | 1 | TS2307 | Cannot find module 'detox' or its corresponding type declarations. |
| 3 | `e2e/navigation.test.ts` | 1 | TS2307 | Cannot find module 'detox' or its corresponding type declarations. |
| 4 | `e2e/utils/test-helpers.ts` | 1 | TS2307 | Cannot find module 'detox' or its corresponding type declarations. |

### 3.3 src/components/ (4 errors)

| # | File | Line | Error Type | Message |
|---|------|------|------------|---------|
| 5 | `src/components/charts/TagCloud.tsx` | 84 | TS2769 | No overload matches this call. Type '"listitem"' is not assignable to type 'AccessibilityRole \| undefined'. |
| 6 | `src/components/ui/EmptyState.tsx` | 61 | TS2304 | Cannot find name 'TouchableOpacity'. |
| 7 | `src/components/ui/EmptyState.tsx` | 74 | TS2304 | Cannot find name 'TouchableOpacity'. |
| 8 | `src/components/ux/WaterfallFlashList.tsx` | 109 | TS2604 | JSX element type 'ListEmptyComponent' does not have any construct or call signatures. |

### 3.4 src/hooks/ (9 errors)

| # | File | Line | Error Type | Message |
|---|------|------|------------|---------|
| 9 | `src/hooks/useCameraPermissions.ts` | 23 | TS2702 | 'PermissionsAndroid' only refers to a type, but is being used as a namespace here. |
| 10 | `src/hooks/useCameraPermissions.ts` | 54 | TS2702 | 'PermissionsAndroid' only refers to a type, but is being used as a namespace here. |
| 11 | `src/hooks/useInfiniteQuery.ts` | 1 | TS2440 | Import declaration conflicts with local declaration of 'useInfiniteQuery'. |
| 12 | `src/hooks/useInfiniteQuery.ts` | 20 | TS7023 | 'useInfiniteQuery' implicitly has return type 'any' because it does not have a return type annotation and is referenced directly or indirectly. |
| 13 | `src/hooks/useInfiniteQuery.ts` | 23 | TS7022 | 'query' implicitly has type 'any' because it does not have a type annotation and is referenced directly or indirectly. |
| 14 | `src/hooks/useInfiniteQuery.ts` | 23 | TS2558 | Expected 1 type arguments, but got 2. |
| 15 | `src/hooks/useInfiniteQuery.ts` | 25 | TS7031 | Binding element 'pageParam' implicitly has an 'any' type. |
| 16 | `src/hooks/useInfiniteQuery.ts` | 38 | TS2339 | Property 'id' does not exist on type 'NonNullable<T>'. |
| 17 | `src/hooks/useInfiniteQuery.ts` | 43 | TS7006 | Parameter 'lastPage' implicitly has an 'any' type. |
| 18 | `src/hooks/useInfiniteQuery.ts` | 48 | TS7022 | 'items' implicitly has type 'any' because it does not have a type annotation and is referenced directly or indirectly. |
| 19 | `src/hooks/useInfiniteQuery.ts` | 48 | TS7006 | Parameter 'page' implicitly has an 'any' type. |
| 20 | `src/hooks/useReferenceLines.ts` | 2 | TS2307 | Cannot find module '../../services/api/client' or its corresponding type declarations. |

### 3.5 src/navigation/ (1 error)

| # | File | Line | Error Type | Message |
|---|------|------|------------|---------|
| 21 | `src/navigation/navigation.ts` | 40 | TS2345 | Argument of type `[string, Record<string, unknown>]` is not assignable to parameter of typed navigation overloads. Type 'string' is not assignable to specific screen name literals. |

### 3.6 src/screens/AiStylistScreen.tsx (1 error)

| # | File | Line | Error Type | Message |
|---|------|------|------------|---------|
| 22 | `src/screens/AiStylistScreen.tsx` | 539 | TS2769 | No overload matches this call. FlatList `getItemLayout` callback parameter type mismatch: `ArrayLike<T> \| null \| undefined` vs `readonly T[] \| null`. |

### 3.7 src/screens/AiStylistScreenV2.tsx (3 errors)

| # | File | Line | Error Type | Message |
|---|------|------|------------|---------|
| 23 | `src/screens/AiStylistScreenV2.tsx` | 100 | TS2345 | Argument of type `{ duration: number; delay: number; }` is not assignable to parameter of type 'TimingConfig'. 'delay' does not exist in type 'TimingConfig'. |
| 24 | `src/screens/AiStylistScreenV2.tsx` | 105 | TS2345 | Same as above - 'delay' does not exist in type 'TimingConfig'. |
| 25 | `src/screens/AiStylistScreenV2.tsx` | 817 | TS2769 | Property 'estimatedItemSize' does not exist on type FlatList props. |

### 3.8 src/screens/HomeScreen.tsx (1 error)

| # | File | Line | Error Type | Message |
|---|------|------|------------|---------|
| 26 | `src/screens/HomeScreen.tsx` | 10 | TS2305 | Module '"react-native"' has no exported member 'FontWeight'. |

### 3.9 src/screens/onboarding/ (6 errors)

| # | File | Line | Error Type | Message |
|---|------|------|------------|---------|
| 27 | `src/screens/onboarding/steps/BasicInfoStep.tsx` | 82 | TS2322 | Type 'string' is not assignable to type '"male" \| "female" \| "other" \| null \| undefined'. |
| 28 | `src/screens/onboarding/steps/BasicInfoStep.tsx` | 130 | TS2322 | Type 'string' is not assignable to type '"18-24" \| "25-30" \| "31-40" \| "41-50" \| "50+" \| null \| undefined'. |
| 29 | `src/screens/onboarding/steps/CompleteStep.tsx` | 84 | TS2339 | Property 'top' does not exist on union type (some variants lack 'top'). |
| 30 | `src/screens/onboarding/steps/CompleteStep.tsx` | 85 | TS2339 | Property 'right' does not exist on union type (some variants lack 'right'). |
| 31 | `src/screens/onboarding/steps/CompleteStep.tsx` | 86 | TS2339 | Property 'bottom' does not exist on union type (some variants lack 'bottom'). |
| 32 | `src/screens/onboarding/steps/CompleteStep.tsx` | 87 | TS2339 | Property 'left' does not exist on union type (some variants lack 'left'). |
| 33 | `src/screens/onboarding/steps/PhotoStep.tsx` | 34 | TS2345 | Type 'number' is not assignable to type 'PhotoQuality \| undefined' for `quality` in CameraOptions. |
| 34 | `src/screens/onboarding/steps/PhotoStep.tsx` | 42 | TS2345 | Type 'number' is not assignable to type 'PhotoQuality \| undefined' for `quality` in ImageLibraryOptions. |

### 3.10 src/screens/photo/ (15 errors)

| # | File | Line | Error Type | Message |
|---|------|------|------------|---------|
| 35 | `src/screens/photo/CameraScreen.tsx` | 50 | TS2339 | Property 'capturedImageUri' does not exist on type 'PhotoState'. |
| 36 | `src/screens/photo/CameraScreen.tsx` | 51 | TS2339 | Property 'isCapturing' does not exist on type 'PhotoState'. |
| 37 | `src/screens/photo/CameraScreen.tsx` | 52 | TS2339 | Property 'qualityResult' does not exist on type 'PhotoState'. |
| 38 | `src/screens/photo/CameraScreen.tsx` | 53 | TS2339 | Property 'showQualityFeedback' does not exist on type 'PhotoState'. |
| 39 | `src/screens/photo/CameraScreen.tsx` | 54 | TS2339 | Property 'setCapturedImage' does not exist on type 'PhotoState'. |
| 40 | `src/screens/photo/CameraScreen.tsx` | 55 | TS2339 | Property 'setCapturing' does not exist on type 'PhotoState'. |
| 41 | `src/screens/photo/CameraScreen.tsx` | 56 | TS2339 | Property 'setQualityResult' does not exist on type 'PhotoState'. |
| 42 | `src/screens/photo/CameraScreen.tsx` | 57 | TS2339 | Property 'setShowQualityFeedback' does not exist on type 'PhotoState'. |
| 43 | `src/screens/photo/CameraScreen.tsx` | 58 | TS2339 | Property 'toggleCameraType' does not exist on type 'PhotoState'. |
| 44 | `src/screens/photo/CameraScreen.tsx` | 59 | TS2339 | Property 'reset' does not exist on type 'PhotoState'. |
| 45 | `src/screens/photo/CameraScreen.tsx` | 80 | TS2345 | 'mediaType' does not exist in type 'ImagePickerOptions'. Did you mean 'mediaTypes'? |
| 46 | `src/screens/photo/components/PhotoQualityFeedback.tsx` | 12 | TS2305 | Module '".../photoStore"' has no exported member 'PhotoQualityResult'. |
| 47 | `src/screens/photo/components/PhotoQualityFeedback.tsx` | 12 | TS2305 | Module '".../photoStore"' has no exported member 'PhotoQualityIssue'. |
| 48 | `src/screens/photo/components/PhotoQualityFeedback.tsx` | 130 | TS7006 | Parameter 'issue' implicitly has an 'any' type. |
| 49 | `src/screens/photo/components/PhotoQualityFeedback.tsx` | 130 | TS7006 | Parameter 'index' implicitly has an 'any' type. |
| 50 | `src/screens/photo/components/ReferenceLineOverlay.tsx` | 9 | TS2307 | Cannot find module '../../hooks/useReferenceLines' or its corresponding type declarations. |

### 3.11 src/screens/profile/ (2 errors)

| # | File | Line | Error Type | Message |
|---|------|------|------------|---------|
| 51 | `src/screens/profile/components/StyleTagsCard.tsx` | 8 | TS2307 | Cannot find module '../../components/charts/TagCloud' or its corresponding type declarations. |
| 52 | `src/screens/profile/components/StyleTagsCard.tsx` | 9 | TS2307 | Cannot find module '../../components/charts/PercentageBar' or its corresponding type declarations. |

### 3.12 src/screens/style-quiz/ (23 errors)

| # | File | Line | Error Type | Message |
|---|------|------|------------|---------|
| 53 | `src/screens/style-quiz/components/QuizImageCard.tsx` | 3 | TS2307 | Cannot find module '../../theme' or its corresponding type declarations. |
| 54 | `src/screens/style-quiz/components/QuizImageCard.tsx` | 4 | TS2307 | Cannot find module '../../components/ux/ProgressiveImage' or its corresponding type declarations. |
| 55 | `src/screens/style-quiz/components/QuizImageCard.tsx` | 5 | TS2307 | Cannot find module '../../stores/quizStore' or its corresponding type declarations. |
| 56 | `src/screens/style-quiz/components/QuizProgress.tsx` | 3 | TS2307 | Cannot find module '../../theme' or its corresponding type declarations. |
| 57 | `src/screens/style-quiz/QuizResultScreen.tsx` | 50 | TS2339 | Property 'styleTags' does not exist on type 'QuizResult'. |
| 58 | `src/screens/style-quiz/QuizResultScreen.tsx` | 51 | TS2339 | Property 'colorPalette' does not exist on type 'QuizResult'. |
| 59 | `src/screens/style-quiz/QuizResultScreen.tsx` | 52 | TS2339 | Property 'occasionPreferences' does not exist on type 'QuizResult'. |
| 60 | `src/screens/style-quiz/QuizResultScreen.tsx` | 128 | TS7006 | Parameter 'tag' implicitly has an 'any' type. |
| 61 | `src/screens/style-quiz/QuizResultScreen.tsx` | 128 | TS7006 | Parameter 'index' implicitly has an 'any' type. |
| 62 | `src/screens/style-quiz/QuizResultScreen.tsx` | 145 | TS7006 | Parameter 'hex' implicitly has an 'any' type. |
| 63 | `src/screens/style-quiz/QuizResultScreen.tsx` | 145 | TS7006 | Parameter 'index' implicitly has an 'any' type. |
| 64 | `src/screens/style-quiz/QuizResultScreen.tsx` | 160 | TS7006 | Parameter 'occasion' implicitly has an 'any' type. |
| 65 | `src/screens/style-quiz/StyleQuizScreen.tsx` | 25 | TS2339 | Property 'currentQuestionIndex' does not exist on type 'QuizState'. |
| 66 | `src/screens/style-quiz/StyleQuizScreen.tsx` | 29 | TS2551 | Property 'setQuestions' does not exist on type 'QuizState'. Did you mean 'questions'? |
| 67 | `src/screens/style-quiz/StyleQuizScreen.tsx` | 31 | TS2339 | Property 'nextQuestion' does not exist on type 'QuizState'. |
| 68 | `src/screens/style-quiz/StyleQuizScreen.tsx` | 32 | TS2339 | Property 'previousQuestion' does not exist on type 'QuizState'. |
| 69 | `src/screens/style-quiz/StyleQuizScreen.tsx` | 34 | TS2551 | Property 'setLoading' does not exist on type 'QuizState'. Did you mean 'isLoading'? |
| 70 | `src/screens/style-quiz/StyleQuizScreen.tsx` | 35 | TS2339 | Property 'setError' does not exist on type 'QuizState'. |
| 71 | `src/screens/style-quiz/StyleQuizScreen.tsx` | 39 | TS2349 | This expression is not callable. Type 'String' has no call signatures. |
| 72 | `src/screens/style-quiz/StyleQuizScreen.tsx` | 39 | TS7006 | Parameter 'a' implicitly has an 'any' type. |
| 73 | `src/screens/style-quiz/StyleQuizScreen.tsx` | 75 | TS2554 | Expected 2 arguments, but got 3. |
| 74 | `src/screens/style-quiz/StyleQuizScreen.tsx` | 133 | TS2339 | Property 'title' does not exist on type 'QuizQuestion'. |
| 75 | `src/screens/style-quiz/StyleQuizScreen.tsx` | 134 | TS2339 | Property 'subtitle' does not exist on type 'QuizQuestion'. |
| 76 | `src/screens/style-quiz/StyleQuizScreen.tsx` | 136 | TS2339 | Property 'subtitle' does not exist on type 'QuizQuestion'. |
| 77 | `src/screens/style-quiz/StyleQuizScreen.tsx` | 142 | TS2339 | Property 'images' does not exist on type 'QuizQuestion'. |
| 78 | `src/screens/style-quiz/StyleQuizScreen.tsx` | 142 | TS7006 | Parameter 'image' implicitly has an 'any' type. |
| 79 | `src/screens/style-quiz/StyleQuizScreen.tsx` | 142 | TS7006 | Parameter 'index' implicitly has an 'any' type. |

### 3.13 src/services/ (7 errors)

| # | File | Line | Error Type | Message |
|---|------|------|------------|---------|
| 80 | `src/services/api/clothing.api.ts` | 364 | TS2339 | Property 'sortBy' does not exist on type 'ClothingSortOptions'. |
| 81 | `src/services/api/clothing.api.ts` | 365 | TS2339 | Property 'sortOrder' does not exist on type 'ClothingSortOptions'. |
| 82 | `src/services/offline-cache.ts` | 122 | TS2322 | Type 'CacheEntry<any> \| null' is not assignable to type 'CacheEntry<any> \| undefined'. Type 'null' is not assignable to type 'undefined'. |
| 83 | `src/services/offline-cache.ts` | 172 | TS2551 | Property 'DEMMO_MODE_ENABLED' does not exist. Did you mean 'DEMO_MODE_ENABLED'? (Typo: DEMMO -> DEMO) |
| 84 | `src/services/offline-cache.ts` | 186 | TS2551 | Property 'DEMMO_MODE_ENABLED' does not exist. Did you mean 'DEMO_MODE_ENABLED'? (Typo: DEMMO -> DEMO) |
| 85 | `src/services/quizService.ts` | 3 | TS2724 | '"../stores/quizStore"' has no exported member named 'QuizQuestion'. Did you mean 'useQuizQuestions'? |
| 86 | `src/services/quizService.ts` | 3 | TS2305 | Module '"../stores/quizStore"' has no exported member 'QuizAnswer'. |
| 87 | `src/services/quizService.ts` | 3 | TS2724 | '"../stores/quizStore"' has no exported member named 'QuizResult'. Did you mean 'useQuizResult'? |

### 3.14 src/utils/security/ (6 errors)

| # | File | Line | Error Type | Message |
|---|------|------|------------|---------|
| 88 | `src/utils/security/secure-storage.ts` | 24 | TS2307 | Cannot find module 'expo-secure-store' or its corresponding type declarations. |
| 89 | `src/utils/security/secure-storage.ts` | 92 | TS2339 | Property 'setItem' does not exist on type 'typeof import(".../async-storage/...")'. |
| 90 | `src/utils/security/secure-storage.ts` | 144 | TS2339 | Property 'setItem' does not exist on type 'typeof import(".../async-storage/...")'. |
| 91 | `src/utils/security/secure-storage.ts` | 164 | TS2339 | Property 'getItem' does not exist on type 'typeof import(".../async-storage/...")'. |
| 92 | `src/utils/security/secure-storage.ts` | 185 | TS2339 | Property 'removeItem' does not exist on type 'typeof import(".../async-storage/...")'. |
| 93 | `src/utils/security/secure-storage.ts` | 215 | TS2339 | Property 'removeItem' does not exist on type 'typeof import(".../async-storage/...")'. |

---

## 4. apps/admin - TypeScript Errors

**Result**: 0 errors - PASS

---

## 5. packages/shared - TypeScript Errors

**Result**: 0 errors - PASS

---

## 6. packages/types - TypeScript Errors

**Result**: 0 errors - PASS

---

## 7. ml/ (Python) - Syntax Errors

**Result**: 0 errors - PASS (all 58 Python files passed `py_compile`)

---

## Error Category Analysis

### By Error Type (mobile only)

| Error Code | Description | Count |
|------------|-------------|-------|
| TS2339 | Property does not exist on type | 27 |
| TS2307 | Cannot find module | 14 |
| TS7006 | Parameter implicitly has 'any' type | 11 |
| TS2345 | Argument type not assignable | 8 |
| TS2322 | Type not assignable | 5 |
| TS2305 | Module has no exported member | 5 |
| TS2769 | No overload matches this call | 3 |
| TS2551 | Property does not exist (typo suggested) | 3 |
| TS7022 | Implicitly has type 'any' (circular) | 2 |
| TS2702 | Only refers to a type, used as namespace | 2 |
| TS2349 | Expression not callable | 1 |
| TS2440 | Import declaration conflicts | 1 |
| TS7023 | Implicit return type 'any' (circular) | 1 |
| TS2558 | Expected N type arguments, got M | 1 |
| TS7031 | Binding element implicitly 'any' | 1 |
| TS2604 | JSX element no construct/call signatures | 1 |
| TS2304 | Cannot find name | 2 |
| TS2554 | Expected N arguments, got M | 1 |
| TS2724 | No exported member (suggested alternative) | 2 |

### By Root Cause

| Root Cause | Count | Affected Areas |
|------------|-------|----------------|
| Store/Type interface mismatch (PhotoState, QuizState, QuizResult, QuizQuestion, ClothingSortOptions) | 27 | photoStore, quizStore, clothing types |
| Missing module declarations or wrong import paths | 14 | theme, hooks, components, detox, expo-secure-store |
| Implicit 'any' (noStrictImplicitAny violations) | 11 | Various callbacks and parameters |
| React Native / Reanimated API version mismatch | 8 | FlatList, TimingConfig, ImagePicker, FontWeight |
| AsyncStorage import/type mismatch | 5 | secure-storage.ts |
| Typo in property names | 3 | offline-cache.ts (DEMMO -> DEMO) |
| Missing component import | 2 | EmptyState.tsx (TouchableOpacity) |
| Other type incompatibilities | 13 | Various |

### Severity Assessment

| Severity | Count | Description |
|----------|-------|-------------|
| **Critical** (build-blocking) | 14 | Missing modules, store/type mismatches that prevent compilation |
| **High** (runtime risk) | 27 | Property does not exist on type - likely runtime errors |
| **Medium** (type safety) | 11 | Implicit any - no runtime impact but poor type safety |
| **Low** (cosmetic/typos) | 3 | Typos like DEMMO_MODE_ENABLED |
| **Info** (test-only) | 3 | detox module not found (test dependency) |

---

## Key Findings

1. **Backend is clean**: 0 TypeScript errors. Production-ready compilation status.
2. **Mobile has 93 errors concentrated in 3 areas**:
   - **quizStore/PhotoState interface drift** (27 errors): The store interfaces have diverged from their consumers. `PhotoState` is missing 10 properties, `QuizState` is missing 5 methods, `QuizResult` is missing 3 properties.
   - **Missing module declarations** (14 errors): Several files import from paths that don't exist or lack type declarations (detox, expo-secure-store, theme, hooks).
   - **React Native API version mismatch** (8 errors): FlatList `estimatedItemSize`, Reanimated `TimingConfig.delay`, ImagePicker `mediaType` vs `mediaTypes`, and `FontWeight` not exported from react-native.
3. **Python AI service is clean**: All 58 files pass syntax check.
4. **Admin and shared packages are clean**: 0 errors each.
5. **pnpm install has a non-blocking postinstall failure**: Root package.json references a missing script module.
