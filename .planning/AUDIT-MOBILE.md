# AUDIT-MOBILE.md — 移动端逐文件审计

**Date:** 2026-04-15

## Executive Summary

| Category | Severity | Count |
|----------|----------|-------|
| `any` types | HIGH | ~211 |
| Hardcoded colors | HIGH | ~200+ |
| Hardcoded spacing | HIGH | ~100+ |
| Missing accessibilityLabel | MEDIUM | ~50+ |
| Index as key prop | MEDIUM | ~92 |
| useEffect dependency issues | HIGH | ~5 |
| Memory leak risks | MEDIUM | 2 |
| Missing React.memo | LOW | ~20 |
| TODO/FIXME/HACK | LOW | 2 |
| Inline styles bypassing theme | HIGH | ~30+ |
| Missing TypeScript types | HIGH | ~40+ |
| console.log statements | MEDIUM | ~80+ |
| Hardcoded i18n strings | MEDIUM | ~80+ |

## P0 Critical Findings

### 1. Navigation Type System Broken (~20 `navigation as any`)
Multiple screens cast navigation to `any` because route types are incomplete:
- AiStylistChatScreen, HomeScreen, PaymentScreen, RecommendationsScreen, BloggerProfileScreen, CustomizationScreen, ProfileEditScreen, OnboardingScreen
- Routes missing from type: ChatHistory, ClothingDetail, OrderDetail, HomeFeed, etc.

### 2. Store Interfaces Entirely `any` (consultantStore, chatStore)
- consultantStore.ts: consultants:any[], currentConsultant:any, matchResults:any[], bookings:any[], availableSlots:any[], all method params:any
- chatStore.ts: rooms:any[], currentRoom:any, messages:any[], sendMessage(data:any), addMessage(message:any)

### 3. `fontWeight as any` Pattern (~28 occurrences)
Typography fontWeight tokens typed as string but RN expects FontWeight union. Affects:
- TryOnScreen (14), ProfileScreen (7), TryOnHistoryScreen (6), OutfitCard (1)

### 4. `icon as any` Pattern (~15 occurrences)
Ionicons name strings cast to `any`. Fix: type as `keyof typeof Ionicons.glyphMap`

## P1 High Findings

### 5. Hardcoded Colors in Consultant Screens (~80 hex values)
- AdvisorListScreen: ~30 hardcoded colors
- AdvisorProfileScreen: ~20 hardcoded colors
- BookingScreen: ~15 hardcoded colors
- ChatScreen: ~15 hardcoded colors

### 6. Missing accessibilityLabel (~50+ interactive elements)
Worst offenders: AiStylistChatScreen, ClothingDetailScreen, PaymentScreen, AdvisorListScreen, CommunityScreen

### 7. Index as Key in Data Lists (~20 high-risk)
- SwipeCard, BookingScreen, PostDetailScreen, ProductImageCarousel, AlgorithmVisualization, SmartRecommendations, ProductGrid, StyleQuizScreen

### 8. Memory Leak Risks (2)
- HomeScreen: Geolocation.getCurrentPosition callback may fire after unmount
- PaymentScreen: Async IIFE with setState after await, no unmount guard

### 9. useEffect Dependency Issues (5)
- AICompanionProvider: loadPosition/loadSession not in deps
- CommunityScreen: fetchFollowingFeed not stable (potential infinite loop)

## P2 Medium Findings

### 10. console.log Statements (~80+)
- ScreenErrorBoundaries: 20 occurrences
- offline-cache: 8 occurrences
- Various stores and services

### 11. Hardcoded Chinese Strings (~80+)
- CommunityScreen, AiStylistChatScreen, PaymentScreen, ClothingDetailScreen, AdvisorListScreen, BookingScreen, ChatScreen, ColorAnalysisScreen

### 12. Missing React.memo (~20 components)
- IconCard, Section, Divider, Tag, Badge, Avatar, Rating, Skeleton, EmptyState, LoadingSpinner, Card, Button, Input, OutfitCard, GradientButton, SeasonPalette, TrendingCard
