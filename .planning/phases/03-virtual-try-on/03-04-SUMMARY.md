---
phase: 03-virtual-try-on
plan: 04
subsystem: api
tags: [minio, watermark, cdn, virtual-tryon, doubao-seedream, glm-4v, wardrobe-archive]

requires:
  - phase: 03-virtual-try-on/01
    provides: DoubaoSeedreamProvider, GlmTryOnProvider, VirtualTryOnProcessor
  - phase: 03-virtual-try-on/02
    provides: TryOnService with daily limits, WebSocket progress, photo enhance

provides:
  - StorageService.generateWatermarkedImage with sharp SVG text composite
  - StorageService.getCDNUrl with CDN_BASE_URL environment variable support
  - VirtualTryOnModel.watermarkedImageUrl field in Prisma schema
  - VirtualTryonService (Python) with Doubao-Seedream primary + GLM fallback
  - POST /api/v1/virtual-tryon/generate ML endpoint
  - GET /api/v1/virtual-tryon/health ML endpoint
  - Automatic watermarked image generation after try-on completion
  - GET /try-on/:id/share-image endpoint serving watermarked result
  - archiveToInspirationWardrobe auto-archive to WardrobeCollection

affects: []

tech-stack:
  added: [sharp-svg-watermark, httpx-async-python]
  patterns: [async-watermark-generation, wardrobe-collection-archive, ml-provider-failover]

key-files:
  created:
    - ml/services/virtual_tryon_service.py
    - ml/api/routes/virtual_tryon.py
  modified:
    - apps/backend/src/common/storage/storage.service.ts
    - apps/backend/src/modules/queue/queue.processor.ts
    - apps/backend/src/modules/try-on/try-on.controller.ts
    - apps/backend/src/modules/try-on/try-on.service.ts
    - apps/backend/prisma/schema.prisma
    - ml/api/config.py
    - ml/api/main.py
    - ml/services/visual_outfit_service.py

key-decisions:
  - "Watermark generation is non-blocking async (fire-and-forget) to avoid delaying result delivery"
  - "Auto-archive uses WardrobeCollection with 'AI试衣效果' name and CollectionItemType.try_on"
  - "CDN URL fallback to presigned MinIO URL when CDN_BASE_URL not configured"
  - "ML service virtual_tryon_service.py uses httpx (async) instead of aiohttp"

patterns-established:
  - "Async watermark pattern: generateWatermarkedImage().then().catch() in queue processor"
  - "Wardrobe collection archive: find-or-create collection, check duplicate, create CollectionItem"
  - "ML provider failover: try primary -> catch -> try fallback -> catch -> return error"

requirements-completed: [VTO-08, VTO-10, VTO-12]

duration: 4min
completed: 2026-04-14
---

# Phase 03 Plan 04: Object Storage Integration & ML Service Try-On Routes Summary

**Watermarked image generation via sharp+MinIO, CDN URL support, Python VirtualTryonService with Doubao-Seedream+GLM failover, auto-archive to WardrobeCollection, and share-image endpoint**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-14T01:45:00Z
- **Completed:** 2026-04-14T01:49:00Z
- **Tasks:** 4 (3 pre-implemented, 1 enhanced)
- **Files modified:** 3

## Accomplishments
- Verified StorageService.generateWatermarkedImage with SVG text + sharp composite
- Verified StorageService.getCDNUrl with CDN_BASE_URL fallback
- Verified Prisma schema watermarkedImageUrl field on VirtualTryOn model
- Verified ML service VirtualTryonService with Doubao-Seedream + GLM failover chain
- Verified ML routes registered in main.py
- Added StorageService injection to VirtualTryOnProcessor for post-completion watermark
- Added GET /try-on/:id/share-image endpoint serving watermarked results
- Added archiveToInspirationWardrobe using actual WardrobeCollection schema

## Task Commits

1. **Tasks 1-3: Storage + Schema + ML routes** - pre-implemented, verified via code review
2. **Task 4: Watermark + share + archive** - `37c9511` (feat)

## Files Created/Modified
- `apps/backend/src/modules/queue/queue.processor.ts` - Added StorageService injection, non-blocking watermark generation after completion
- `apps/backend/src/modules/try-on/try-on.controller.ts` - Added GET /:id/share-image endpoint
- `apps/backend/src/modules/try-on/try-on.service.ts` - Added getShareImageAsset and archiveToInspirationWardrobe methods
- `apps/backend/src/common/storage/storage.service.ts` - Pre-existing with generateWatermarkedImage and getCDNUrl
- `ml/services/virtual_tryon_service.py` - Pre-existing with VirtualTryonService class
- `ml/api/routes/virtual_tryon.py` - Pre-existing with POST /generate and GET /health

## Decisions Made
- Watermark generation is fire-and-forget async to avoid blocking result delivery
- Auto-archive uses WardrobeCollection (not a separate model) with CollectionItemType.try_on
- Share-image endpoint falls back to original result if watermarked version not yet generated

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used correct Prisma model names for wardrobe archive**
- **Found during:** Task 4 (Wardrobe auto-archive)
- **Issue:** Plan referenced InspirationWardrobe/WardrobeItem models that don't exist; actual schema uses WardrobeCollection/WardrobeCollectionItem
- **Fix:** Updated archiveToInspirationWardrobe to use WardrobeCollection.findFirst/create + WardrobeCollectionItem.create with itemType="try_on"
- **Files modified:** try-on.service.ts
- **Verification:** TypeScript compilation passes

---

**Total deviations:** 1 auto-fixed (1 bug - wrong model names)
**Impact on plan:** Archive functionality works with actual Prisma schema

## Issues Encountered
- Plan referenced WardrobeCategory/WardrobeItem which don't exist in schema; corrected to WardrobeCollection/WardrobeCollectionItem

## Next Phase Readiness
- Phase 03 virtual try-on fully complete
- All 4 plans executed: providers, backend services, mobile experience, storage/ML integration
- Ready for Phase 04 (Recommendation Engine) or Phase 05 (E-Commerce Closure)

---
*Phase: 03-virtual-try-on*
*Completed: 2026-04-14*
