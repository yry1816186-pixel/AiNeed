# AUDIT-NAVIGATION.md — 导航审计

**Date:** 2026-04-15

## Executive Summary

| Issue | Severity | Count |
|-------|----------|-------|
| Stale 6-tab type definition | HIGH | 1 |
| Broken navigation calls to non-existent routes | HIGH | 13+ |
| Orphaned screen files | HIGH | 12 |
| Parameter name mismatches | HIGH | 5+ |
| Dual type system conflict | MEDIUM | 1 |
| Cart badge on Profile tab | MEDIUM | 1 |
| No React Navigation linking prop | MEDIUM | 1 |
| GuardedScreen routeName mismatch | MEDIUM | 2 |
| Unused standalone guard components | LOW | 3 |

## Critical Findings

### 1. Stale 6-Tab Type Definition (navigation.d.ts)
Declares `MainTabParamList` with Home/Explore/Heart/Cart/Wardrobe/Profile but actual implementation is 5-tab (Home/Stylist/TryOn/Community/Profile). The `declare global { namespace ReactNavigation }` uses the WRONG param list.

### 2. Broken Navigation Calls (13+)
| Route Called | Exists? | Files Affected |
|-------------|---------|---------------|
| Explore | NO | HomeScreen (old+new) |
| Heart | NO | HomeScreen (old) |
| TermsOfService | NO | SettingsScreen, RegisterScreen |
| PrivacyPolicy | NO | SettingsScreen, RegisterScreen |
| ClothingDetail | NO | WardrobeScreen, SearchScreen, NotificationsScreen, FavoritesScreen, OutfitRecommendationCards |
| RecommendationFeed | NO | HomeScreen |
| Customization | NO | ProfileScreen |
| BrandQRScan | NO | CustomizationScreen |
| CustomizationPreview | NO | CustomizationEditorScreen |
| PhotoPreview | NO | CameraScreen |

### 3. Orphaned Screen Files (12)
- ClothingDetailScreen.tsx (loaded as Product, but navigated to as ClothingDetail)
- HomeScreen.tsx (old, replaced by home/HomeScreen.tsx)
- HeartScreen.tsx (old 6-tab remnant)
- RecommendationsScreen.tsx
- CustomizationPreviewScreen.tsx
- CustomizationOrderDetailScreen.tsx
- BrandQRScanScreen.tsx
- MerchantApplyScreen.tsx
- StockNotificationScreen.tsx
- ProfileReportScreen.tsx
- photo/CameraScreen.tsx
- OnboardingScreen.tsx (old, replaced by onboarding/OnboardingWizard.tsx)

### 4. Parameter Name Mismatches
| File | Call | Expected | Actual |
|------|------|----------|--------|
| AdvisorProfileScreen.tsx:144 | navigate("Booking", {...}) | { advisorId } | { consultantId, consultant } |
| PaymentScreen.tsx:72 | navigate('OrderDetail', { orderId }) | Cross-stack | Uses `as any` |
| Multiple screens | navigate('ClothingDetail', { clothingId }) | Route is 'Product' | Wrong route name |

### 5. GuardedScreen RouteName Mismatch
- AiStylistChat: GuardedScreen uses routeName="AIStylist" instead of "AiStylistChat"
- Notifications: Wrapped in GuardedScreen but not in GUARDED_ROUTES (no-op guard)

### 6. Cart Badge on Profile Tab
Profile tab shows `tabBarBadge` with `cartCount` — misleading UX.

### 7. No React Navigation `linking` Prop
NavigationContainer doesn't have `linking` prop. Deep links use custom manual implementation instead of framework's built-in support.

## Recommendations

1. Update navigation.d.ts to match 5-tab implementation
2. Fix all 13+ broken navigation calls
3. Register or remove 12 orphaned screens
4. Fix parameter name mismatches
5. Fix GuardedScreen routeName for AiStylistChat
6. Move cart badge to appropriate tab or remove
7. Add React Navigation `linking` prop for deep links
