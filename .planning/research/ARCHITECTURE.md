# Research: Architecture — AI Fashion Platform (Commercial Grade)

**Researched:** 2026-04-13

## Production Architecture Recommendations

### ML Serving Architecture

**Current:** Individual Python servers called via HTTP from backend.

**Production pattern:**

```
Mobile App
    ↓ HTTP
NestJS Backend
    ↓ BullMQ Job
Queue Worker
    ↓ HTTP (with circuit breaker)
ML Inference Service
    ↓ Model loading
Local GPU (RTX 4060) or Cloud API fallback
```

**Key improvements needed:**
1. All ML calls through BullMQ (not direct HTTP from request handler)
2. Circuit breaker with cloud API fallback when GPU fails
3. Model health check endpoint per ML service
4. Inference result caching (same photo + garment = cached result)
5. GPU memory management (model warmup, lazy loading)

### Mobile-Backend Sync

**Current:** Axios HTTP + Zustand + TanStack Query.

**Production improvements:**
1. Optimistic updates for likes, favorites (update UI first, sync later)
2. Image upload with progress tracking and retry
3. Offline queue for actions when network unavailable
4. WebSocket for real-time try-on status updates
5. Background sync for notifications

### Data Architecture

**Recommendations for commercial data handling:**

1. **User Photos** — Encrypted at rest, auto-delete after processing or user opt-out
2. **Body Data** — Separate encryption key, never exposed in API responses
3. **Try-On Results** — TTL-based cleanup, user controls retention
4. **Analytics** — Aggregate only, no raw body/face data in analytics

### Mobile Performance

**Critical optimizations:**
1. Image compression before upload (Sharp on backend, native on mobile)
2. Lazy loading for feed screens (TanStack Query infinite scroll)
3. Memoization for heavy components (try-on result display)
4. Native animation driver (Reanimated already installed)
5. Bundle size optimization (code splitting, tree shaking)

### API Design for Commercial Use

1. **Versioning** — Already URI versioned, maintain v1 compatibility
2. **Pagination** — Cursor-based for feeds, offset for admin lists
3. **Field selection** — Allow clients to request only needed fields
4. **Batch endpoints** — Bulk operations for merchant dashboard
5. **Webhook support** — For merchant order notifications

---
*Last updated: 2026-04-13*
