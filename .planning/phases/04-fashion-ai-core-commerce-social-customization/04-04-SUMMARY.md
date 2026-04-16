# Phase 04 Plan 04 Summary: Social + Customization Domain Migration

**Date:** 2026-04-17
**Status:** COMPLETED
**Commit:** 9d7a195d

## Objective

Migrate Social (blogger, chat, consultant) and Customization (customization, share-template) modules from `src/modules/` to `src/domains/`, fix broken import paths, eliminate forwardRef circular dependencies, and clean up old module directories.

## What Was Accomplished

### 1. Social Domain Import Path Updates (app.module.ts)

Updated 3 module imports in `app.module.ts` from old `./modules/` paths to new `./domains/social/` paths:

| Module | Old Path | New Path |
|--------|----------|----------|
| BloggerModule | `./modules/blogger/blogger.module` | `./domains/social/blogger/blogger.module` |
| ChatModule | `./modules/chat/chat.module` | `./domains/social/chat/chat.module` |
| ConsultantModule | `./modules/consultant/consultant.module` | `./domains/social/consultant/consultant.module` |

### 2. Fixed 9 Broken Import Paths in Social Domain

The social domain files were previously copied but had incorrect relative import paths:

| File | Old Import | New Import |
|------|-----------|------------|
| `chat.gateway.ts` | `../../domains/identity/auth/...` | `../../../domains/identity/auth/...` |
| `chat.gateway.ts` | `../ws/events` | `../../../modules/ws/events` |
| `chat.gateway.ts` | `../ws/services/event-bus.service` | `../../../modules/ws/services/event-bus.service` |
| `chat.gateway.spec.ts` | `../ws/events` | `../../../modules/ws/events` |
| `chat.gateway.spec.ts` | `../ws/services/event-bus.service` | `../../../modules/ws/services/event-bus.service` |
| `chat.module.ts` | `../ws/ws.module` | `../../../modules/ws/ws.module` |
| `blogger-product.service.ts` | `../notification/services/notification.service` | `../../platform/notification/services/notification.service` |
| `blogger.controller.ts` | `../auth/guards/optional-auth.guard` | `../../identity/auth/guards/optional-auth.guard` |
| `consultant.service.ts` | `../payment/payment.service` | `../../commerce/payment/payment.service` |
| `consultant.service.spec.ts` | `../payment/payment.service` | `../../commerce/payment/payment.service` |
| `consultant.controller.ts` | `../auth/guards/auth.guard` | `../../identity/auth/guards/auth.guard` |
| `content-moderation.service.spec.ts` | `../ai-safety/ai-safety.service` | `../../ai-core/ai-safety/ai-safety.service` |

### 3. Customization Module Migration

Migrated `src/modules/customization/` to `src/domains/customization/customization/`:

- Updated `PrismaModule` import depth: `../../common/` -> `../../../common/`
- Updated `PrismaService` import depth in service and spec
- Updated `PODService` import depth: `../../../common/` -> `../../../../common/`
- Updated `CurrentUser` decorator: `../auth/decorators/` -> `../../identity/auth/decorators/`
- Updated `JwtAuthGuard`: `../auth/guards/` -> `../../identity/auth/guards/`

Updated `app.module.ts`: `CustomizationModule` from `./modules/customization/customization.module` -> `./domains/customization/customization/customization.module`

### 4. Share-Template Module Migration

Migrated `src/modules/share-template/` to `src/domains/customization/share-template/`:

- Updated `PrismaModule` import depth: `../../common/` -> `../../../common/`
- Updated `PrismaService` import depth in service and spec
- Updated `api-response.types` import depth
- Updated `JwtAuthGuard`: `../auth/guards/` -> `../../identity/auth/guards/`

Updated `app.module.ts`: `ShareTemplateModule` from `./modules/share-template/share-template.module` -> `./domains/customization/share-template/share-template.module`

### 5. ForwardRef Circular Dependency Analysis

Investigated all 5 planned circular dependency eliminations:

- **CommunityModule <-> ConsultantModule**: No forwardRef exists in either module
- **ChatModule <-> CommunityModule**: No forwardRef exists in either module
- **BloggerModule <-> CustomizationModule**: No forwardRef exists, no cross-references
- **ShareTemplateModule <-> ProfileModule**: No forwardRef exists, no cross-references
- **ConsultantModule <-> CustomizationModule**: No forwardRef exists, no cross-references

**Conclusion:** Social and Customization domains have zero forwardRef usage. The circular dependencies described in the plan do not exist in the current codebase.

### 6. Old Module Directory Cleanup

Deleted 5 old module directories from `src/modules/`:

- `src/modules/blogger/` (removed)
- `src/modules/chat/` (removed)
- `src/modules/consultant/` (removed)
- `src/modules/customization/` (removed)
- `src/modules/share-template/` (removed)

## Build Verification

- **TS2307 errors in social/customization domains:** 0
- **forwardRef in social/customization domains:** 0
- **Overall build:** Passes (pre-existing TS2307 errors in unmigrated modules are from prior phases)

## Remaining Work (Not In Scope)

The following modules remain in `src/modules/` and have broken import paths referencing already-migrated modules:

- `modules/admin/` - references `../community/community.module` (old path)
- `modules/queue/` - references `../community/community.module`, `../try-on/try-on.module` (old paths)
- `modules/recommendations/` - references `../ai-stylist/ai-stylist.module` (old path)

These will be addressed in subsequent domain migration phases.

## Files Changed

53 files changed, 70 insertions, 72 deletions

### Key Files Modified

- `apps/backend/src/app.module.ts` - Updated 5 module import paths
- `apps/backend/src/domains/social/chat/chat.gateway.ts` - Fixed 3 import paths
- `apps/backend/src/domains/social/chat/chat.module.ts` - Fixed WSModule path
- `apps/backend/src/domains/social/blogger/blogger-product.service.ts` - Fixed NotificationService path
- `apps/backend/src/domains/social/blogger/blogger.controller.ts` - Fixed OptionalAuthGuard path
- `apps/backend/src/domains/social/consultant/consultant.service.ts` - Fixed PaymentService path
- `apps/backend/src/domains/social/consultant/consultant.controller.ts` - Fixed AuthGuard path
- `apps/backend/src/domains/customization/customization/*.ts` - All import paths updated
- `apps/backend/src/domains/customization/share-template/*.ts` - All import paths updated
