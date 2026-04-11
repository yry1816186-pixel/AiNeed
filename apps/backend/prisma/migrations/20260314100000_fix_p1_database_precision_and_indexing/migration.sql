-- ============================================
-- Migration: Fix P1 Database Issues
-- Date: 2026-03-14
-- Description: Fix precision issues, add indexes, soft delete, and audit log
-- ============================================

-- ====================
-- P1: Precision Fixes (Float to Decimal)
-- ====================

-- 1. Brand.commissionRate: Float -> Decimal(5, 4)
ALTER TABLE "Brand" ALTER COLUMN "commissionRate" TYPE DECIMAL(5, 4);

-- 2. Outfit.rating: Float -> Decimal(2, 1)
ALTER TABLE "Outfit" ALTER COLUMN "rating" TYPE DECIMAL(2, 1);

-- 3. UserPreferenceWeight.weight: Float -> Decimal(5, 4)
ALTER TABLE "UserPreferenceWeight" ALTER COLUMN "weight" TYPE DECIMAL(5, 4);

-- 4. AIAnalysisCache.confidence: Float -> Decimal(5, 4)
ALTER TABLE "AIAnalysisCache" ALTER COLUMN "confidence" TYPE DECIMAL(5, 4);

-- ====================
-- P1: Index Optimizations
-- ====================

-- 5. Favorite: Add itemId index for item-based favorite queries
CREATE INDEX IF NOT EXISTS "Favorite_itemId_idx" ON "Favorite"("itemId");
CREATE INDEX IF NOT EXISTS "Favorite_createdAt_desc_idx" ON "Favorite"("createdAt" DESC);

-- 6. SearchHistory: Add composite indexes for query optimization
CREATE INDEX IF NOT EXISTS "SearchHistory_query_idx" ON "SearchHistory"("query");
CREATE INDEX IF NOT EXISTS "SearchHistory_userId_query_idx" ON "SearchHistory"("userId", "query");

-- 7. VirtualTryOn: Add composite indexes for photo-based queries
CREATE INDEX IF NOT EXISTS "VirtualTryOn_photoId_status_idx" ON "VirtualTryOn"("photoId", "status");
CREATE INDEX IF NOT EXISTS "VirtualTryOn_userId_photoId_idx" ON "VirtualTryOn"("userId", "photoId");

-- 8. PostComment: Add sorting and filtering indexes
CREATE INDEX IF NOT EXISTS "PostComment_postId_createdAt_desc_idx" ON "PostComment"("postId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "PostComment_postId_isDeleted_idx" ON "PostComment"("postId", "isDeleted");

-- ====================
-- P1: Soft Delete for ClothingItem
-- ====================

-- 9. Add soft delete fields to ClothingItem
ALTER TABLE "ClothingItem" ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ClothingItem" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Add indexes for soft delete queries
CREATE INDEX IF NOT EXISTS "ClothingItem_isDeleted_idx" ON "ClothingItem"("isDeleted");
CREATE INDEX IF NOT EXISTS "ClothingItem_isActive_isDeleted_idx" ON "ClothingItem"("isActive", "isDeleted");

-- ====================
-- P1: Soft Delete for Order
-- ====================

-- 10. Add soft delete fields to Order
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Add indexes for soft delete queries
CREATE INDEX IF NOT EXISTS "Order_isDeleted_idx" ON "Order"("isDeleted");
CREATE INDEX IF NOT EXISTS "Order_userId_isDeleted_idx" ON "Order"("userId", "isDeleted");

-- ====================
-- P1: Audit Log Table
-- ====================

-- 11. Create AuditLog table for audit trail
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- Create indexes for AuditLog
CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_desc_idx" ON "AuditLog"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "AuditLog_userId_createdAt_desc_idx" ON "AuditLog"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "AuditLog_entityType_createdAt_desc_idx" ON "AuditLog"("entityType", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "AuditLog_action_createdAt_desc_idx" ON "AuditLog"("action", "createdAt" DESC);

-- ====================
-- Comments for documentation
-- ====================

COMMENT ON TABLE "AuditLog" IS 'Audit log table for tracking entity changes and user actions';
COMMENT ON COLUMN "AuditLog"."action" IS 'Action type: CREATE, UPDATE, DELETE, etc.';
COMMENT ON COLUMN "AuditLog"."entityType" IS 'Type of entity being audited: User, Order, ClothingItem, etc.';
COMMENT ON COLUMN "AuditLog"."entityId" IS 'ID of the entity being audited';
COMMENT ON COLUMN "AuditLog"."oldValues" IS 'Previous values before change (JSON)';
COMMENT ON COLUMN "AuditLog"."newValues" IS 'New values after change (JSON)';
COMMENT ON COLUMN "AuditLog"."metadata" IS 'Additional metadata about the audit event';

COMMENT ON COLUMN "ClothingItem"."isDeleted" IS 'Soft delete flag - true when item is deleted';
COMMENT ON COLUMN "ClothingItem"."deletedAt" IS 'Timestamp when item was soft deleted';

COMMENT ON COLUMN "Order"."isDeleted" IS 'Soft delete flag - true when order is deleted';
COMMENT ON COLUMN "Order"."deletedAt" IS 'Timestamp when order was soft deleted';

COMMENT ON COLUMN "Brand"."commissionRate" IS 'Commission rate as decimal (e.g., 0.1000 = 10%) - precision: 5,4';
COMMENT ON COLUMN "Outfit"."rating" IS 'Outfit rating (0.0 to 5.0) - precision: 2,1';
COMMENT ON COLUMN "UserPreferenceWeight"."weight" IS 'Preference weight (0.0000 to 1.0000) - precision: 5,4';
COMMENT ON COLUMN "AIAnalysisCache"."confidence" IS 'AI analysis confidence score (0.0000 to 1.0000) - precision: 5,4';
