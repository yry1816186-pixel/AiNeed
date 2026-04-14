---
phase: 06-community-blogger-ecosystem
plan: 04
subsystem: mobile-frontend
tags: [react-native, community, feed, post, notification, blogger]

requires:
  - phase: 06
    provides: Backend community API endpoints (bookmark, share, report, trending, following feed)
  - phase: 06
    provides: Blogger level data on posts
provides:
  - Enhanced CommunityScreen with discover/following tabs + trending + blogger badges
  - CreatePostScreen with 9-image upload, tags, item annotation, draft auto-save
  - PostDetailScreen with image carousel, comment collapse, bookmark sheet, purchase button
  - BookmarkSheet for save-to-collection workflow
  - FollowButton with silent unfollow
  - TrendingCard component
  - Enhanced NotificationsScreen with social notification rendering + WebSocket
affects: [06-05]

tech-stack:
  added: [expo-image-picker, @react-native-async-storage/async-storage]
  patterns: [draft-auto-save, comment-collapse, bottom-sheet-modal, blogger-badge]

key-files:
  created:
    - apps/mobile/src/screens/CreatePostScreen.tsx
    - apps/mobile/src/screens/PostDetailScreen.tsx
    - apps/mobile/src/components/community/TrendingCard.tsx
    - apps/mobile/src/components/community/BookmarkSheet.tsx
    - apps/mobile/src/components/social/FollowButton.tsx
  modified:
    - apps/mobile/src/screens/CommunityScreen.tsx
    - apps/mobile/src/screens/NotificationsScreen.tsx
    - apps/mobile/src/services/api/community.api.ts
    - apps/mobile/src/services/websocket.ts

decisions:
  - Used existing Modal-based bottom sheet instead of @gorhom/bottom-sheet for BookmarkSheet to avoid dependency conflicts
  - Blogger badges rendered inline on PostMasonryCard via BloggerBadge helper component
  - Following feed renders mixed activity types (post/like/tryon) in a single scrollable list
  - Draft auto-save uses AsyncStorage with 2-second debounce
  - Comment collapse shows "查看更多回复(N)" for top-level comments with replies
  - WebSocket social_notification event triggers notification list refresh

metrics:
  duration: 15m
  completed: 2026-04-14
  tasks: 4
  files: 9
---

# Phase 6 Plan 4: Mobile Community Frontend Summary

Enhanced mobile community with discover/following dual-tab feed, 9-image post creation with draft persistence, post detail with comment threading, bookmark-to-collection workflow, and social notification integration.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 06-04-01 | CommunityScreen enhancement + TrendingCard + API methods | `9d1579d` |
| 06-04-02 | CreatePostScreen with image upload, tags, draft save | `9d1579d` |
| 06-04-03 | PostDetailScreen + BookmarkSheet + FollowButton | `9d1579d` |
| 06-04-04 | NotificationsScreen social rendering + WebSocket | `9d1579d` |

## Key Deliverables

**CommunityScreen:**
- Main tab bar: discover (with category filter + trending) / following (mixed feed)
- Blogger badges on post cards: purple circle for blogger, gold shield for big_v
- TrendingCard: horizontal scroll of tag chips with direction arrows (up/down/stable)

**CreatePostScreen:**
- 3-column image grid with add/remove, max 9 images
- Expo ImagePicker for photo selection
- Preset tag chips (OOTD,通勤,约会,etc.)
- Item search overlay for clothing annotation
- Draft auto-save to AsyncStorage with 2s debounce + restore prompt on mount

**PostDetailScreen:**
- Horizontal image carousel with pagination dots
- Comments with collapsed replies ("查看更多回复(N)")
- Bottom action bar: like, comment, bookmark, share
- BookmarkSheet: collection picker with "新建分类" option
- "购买此方案" button for blogger posts

**NotificationsScreen:**
- 5 social notification types: like, comment, bookmark, follow, reply_mention
- Type-specific icons and labels for social notifications
- WebSocket listener for `social_notification` event triggers refresh

**API Methods Added:**
- `getFollowingFeed` - GET /community/following/feed
- `getTrending` - GET /community/trending
- `bookmarkPost` - POST /community/posts/:id/bookmark
- `sharePost` - POST /community/posts/:id/share
- `reportContent` - POST /community/reports
- `getCollections` - GET /wardrobe/collections
- `createCollection` - POST /wardrobe/collections
- `getUserProfile` - GET /community/users/:id/profile

## Deviations from Plan

None - plan executed as written.

## Self-Check

- CommunityScreen contains getFollowingFeed: YES
- CommunityScreen contains TrendingCard: YES
- TrendingCard.tsx exists: YES
- community.api.ts contains bookmarkPost: YES
- community.api.ts contains sharePost: YES
- community.api.ts contains reportContent: YES
- community.api.ts contains getTrending: YES
- community.api.ts contains getFollowingFeed: YES
- CreatePostScreen.tsx exists with AsyncStorage draft: YES
- PostDetailScreen contains comment collapse: YES
- PostDetailScreen contains purchase button: YES
- BookmarkSheet.tsx exists with BottomSheet: YES
- FollowButton.tsx exists with followUser: YES
- NotificationsScreen renders social notification types: YES
- websocket.ts contains on/off methods: YES
