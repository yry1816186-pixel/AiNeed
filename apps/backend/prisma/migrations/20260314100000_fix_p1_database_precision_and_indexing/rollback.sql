-- ============================================
-- Rollback Migration: Fix P1 Database Issues
-- Date: 2026-03-14
-- Description: Rollback precision fixes, indexes, soft delete, and audit log
-- WARNING: This will DROP the AuditLog table and lose all audit data
-- ============================================

-- ====================
-- Rollback: Audit Log Table
-- ====================

-- Drop AuditLog table (will lose all audit data)
DROP TABLE IF EXISTS "AuditLog";

-- ====================
-- Rollback: Soft Delete for Order
-- ====================

-- Remove soft delete indexes from Order
DROP INDEX IF EXISTS "Order_userId_isDeleted_idx";
DROP INDEX IF EXISTS "Order_isDeleted_idx";

-- Remove soft delete columns from Order
ALTER TABLE "Order" DROP COLUMN IF EXISTS "deletedAt";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "isDeleted";

-- ====================
-- Rollback: Soft Delete for ClothingItem
-- ====================

-- Remove soft delete indexes from ClothingItem
DROP INDEX IF EXISTS "ClothingItem_isActive_isDeleted_idx";
DROP INDEX IF EXISTS "ClothingItem_isDeleted_idx";

-- Remove soft delete columns from ClothingItem
ALTER TABLE "ClothingItem" DROP COLUMN IF EXISTS "deletedAt";
ALTER TABLE "ClothingItem" DROP COLUMN IF EXISTS "isDeleted";

-- ====================
-- Rollback: Index Optimizations
-- ====================

-- 8. Remove PostComment indexes
DROP INDEX IF EXISTS "PostComment_postId_isDeleted_idx";
DROP INDEX IF EXISTS "PostComment_postId_createdAt_desc_idx";

-- 7. Remove VirtualTryOn indexes
DROP INDEX IF EXISTS "VirtualTryOn_userId_photoId_idx";
DROP INDEX IF EXISTS "VirtualTryOn_photoId_status_idx";

-- 6. Remove SearchHistory indexes
DROP INDEX IF EXISTS "SearchHistory_userId_query_idx";
DROP INDEX IF EXISTS "SearchHistory_query_idx";

-- 5. Remove Favorite indexes
DROP INDEX IF EXISTS "Favorite_createdAt_desc_idx";
DROP INDEX IF EXISTS "Favorite_itemId_idx";

-- ====================
-- Rollback: Precision Fixes (Decimal to Float)
-- ====================

-- 4. AIAnalysisCache.confidence: Decimal(5, 4) -> Float
ALTER TABLE "AIAnalysisCache" ALTER COLUMN "confidence" TYPE DOUBLE PRECISION;

-- 3. UserPreferenceWeight.weight: Decimal(5, 4) -> Float
ALTER TABLE "UserPreferenceWeight" ALTER COLUMN "weight" TYPE DOUBLE PRECISION;

-- 2. Outfit.rating: Decimal(2, 1) -> Float
ALTER TABLE "Outfit" ALTER COLUMN "rating" TYPE DOUBLE PRECISION;

-- 1. Brand.commissionRate: Decimal(5, 4) -> Float
ALTER TABLE "Brand" ALTER COLUMN "commissionRate" TYPE DOUBLE PRECISION;
