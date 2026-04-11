-- ============================================
-- Migration: Fix P2 Database Issues
-- Date: 2026-03-15
-- Description: Fix PII encryption annotations, cascade delete behavior, and add P2 indexes
-- ============================================

-- ====================
-- P1-007: PII Encryption Annotations
-- ====================
-- Note: These are schema-level annotations for documentation purposes.
-- The actual encryption is handled in the Service layer.
-- PostgreSQL comments serve as documentation for compliance auditing.

COMMENT ON COLUMN "Brand"."contactEmail" IS 'Merchant contact email - PII: consider encrypting for compliance';
COMMENT ON COLUMN "Brand"."contactPhone" IS 'Merchant contact phone - PII: consider encrypting for compliance';

-- ====================
-- Cascade Delete Behavior: ClothingItem.brand
-- ====================
-- When a Brand is deleted, set ClothingItem.brandId to NULL
-- This preserves product data even when the brand is removed

ALTER TABLE "ClothingItem" DROP CONSTRAINT IF EXISTS "ClothingItem_brandId_fkey";
ALTER TABLE "ClothingItem" ADD CONSTRAINT "ClothingItem_brandId_fkey"
    FOREIGN KEY ("brandId") REFERENCES "Brand"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;

COMMENT ON COLUMN "ClothingItem"."brandId" IS 'Foreign key to Brand - ON DELETE SET NULL preserves product when brand is deleted';

-- ====================
-- P2: Index Optimizations
-- ====================

-- 1. StyleRecommendation: Composite index for user recommendation queries by type
-- Supports queries: "Get user recommendations by type, sorted by recent"
CREATE INDEX IF NOT EXISTS "StyleRecommendation_userId_type_createdAt_desc_idx"
    ON "StyleRecommendation"("userId", "type", "createdAt" DESC);

-- 2. CommunityPost: Composite index for featured posts listing
-- Supports queries: "Get non-deleted featured posts sorted by popularity and recency"
CREATE INDEX IF NOT EXISTS "CommunityPost_isDeleted_isFeatured_likeCount_createdAt_idx"
    ON "CommunityPost"("isDeleted", "isFeatured", "likeCount" DESC, "createdAt" DESC);

-- 3. AuditLog: Composite index for action-type queries
-- Supports queries: "Get audit logs by action and entity type, sorted by time"
CREATE INDEX IF NOT EXISTS "AuditLog_action_entityType_createdAt_desc_idx"
    ON "AuditLog"("action", "entityType", "createdAt" DESC);

-- ====================
-- Verification Queries (can be removed in production)
-- ====================
-- These queries verify the changes were applied correctly

-- Verify index creation:
-- SELECT indexname, indexdef FROM pg_indexes
-- WHERE tablename IN ('StyleRecommendation', 'CommunityPost', 'AuditLog')
-- AND indexname LIKE '%_userId_type_%' OR indexname LIKE '%_isDeleted_isFeatured_%' OR indexname LIKE '%_action_entityType_%';

-- Verify foreign key constraint:
-- SELECT conname, conrelid::regclass, confrelid::regclass, pg_get_constraintdef(oid)
-- FROM pg_constraint WHERE conname = 'ClothingItem_brandId_fkey';
