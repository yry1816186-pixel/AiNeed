-- ============================================
-- Rollback Migration: Fix P2 Database Issues
-- Date: 2026-03-15
-- Description: Rollback PII annotations, cascade delete behavior, and P2 indexes
-- WARNING: This will restore original cascade behavior (RESTRICT) for ClothingItem.brand
-- ============================================

-- ====================
-- Rollback: P2 Index Optimizations
-- ====================

-- 3. Remove AuditLog composite index
DROP INDEX IF EXISTS "AuditLog_action_entityType_createdAt_desc_idx";

-- 2. Remove CommunityPost composite index
DROP INDEX IF EXISTS "CommunityPost_isDeleted_isFeatured_likeCount_createdAt_idx";

-- 1. Remove StyleRecommendation composite index
DROP INDEX IF EXISTS "StyleRecommendation_userId_type_createdAt_desc_idx";

-- ====================
-- Rollback: Cascade Delete Behavior
-- ====================
-- Restore original behavior: RESTRICT delete if products exist

ALTER TABLE "ClothingItem" DROP CONSTRAINT IF EXISTS "ClothingItem_brandId_fkey";
ALTER TABLE "ClothingItem" ADD CONSTRAINT "ClothingItem_brandId_fkey"
    FOREIGN KEY ("brandId") REFERENCES "Brand"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

COMMENT ON COLUMN "ClothingItem"."brandId" IS 'Foreign key to Brand - ON DELETE RESTRICT prevents brand deletion if products exist';

-- ====================
-- Rollback: PII Encryption Annotations
-- ====================
-- Remove encryption comments (actual encryption is in Service layer)

COMMENT ON COLUMN "Brand"."contactEmail" IS 'Merchant contact email';
COMMENT ON COLUMN "Brand"."contactPhone" IS 'Merchant contact phone';
