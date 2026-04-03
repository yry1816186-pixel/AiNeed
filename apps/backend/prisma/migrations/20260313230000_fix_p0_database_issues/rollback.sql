-- Rollback Migration: Revert P0 Database Fixes
-- Description: Rollback price field types, restore UserSubscription unique constraint,
--              and remove added indexes
-- Date: 2026-03-13
-- WARNING: Execute this script ONLY if you need to rollback the migration

-- ============================================
-- 1. Rollback Price Field Types (Decimal -> Float)
-- ============================================

-- MembershipPlan.price: Decimal(10,2) -> Float
ALTER TABLE "MembershipPlan" ALTER COLUMN "price" TYPE DOUBLE PRECISION;

-- CustomizationQuote.price: Decimal(10,2) -> Float
ALTER TABLE "CustomizationQuote" ALTER COLUMN "price" TYPE DOUBLE PRECISION;

-- BrandSettlement amounts: Decimal -> Float
ALTER TABLE "BrandSettlement" ALTER COLUMN "totalSales" TYPE DOUBLE PRECISION;
ALTER TABLE "BrandSettlement" ALTER COLUMN "commission" TYPE DOUBLE PRECISION;
ALTER TABLE "BrandSettlement" ALTER COLUMN "netAmount" TYPE DOUBLE PRECISION;

-- ProductSalesStats.revenue: Decimal(12,2) -> Float
ALTER TABLE "ProductSalesStats" ALTER COLUMN "revenue" TYPE DOUBLE PRECISION;

-- StyleRecommendation.score: Decimal(5,4) -> Float
ALTER TABLE "StyleRecommendation" ALTER COLUMN "score" TYPE DOUBLE PRECISION;

-- RankingFeedback.weight: Decimal(5,4) -> Float
ALTER TABLE "RankingFeedback" ALTER COLUMN "weight" TYPE DOUBLE PRECISION;

-- ============================================
-- 2. Restore UserSubscription Unique Constraint
-- ============================================
-- WARNING: This will fail if there are existing records that violate the constraint
-- (i.e., a user with multiple subscriptions of the same status)
-- You may need to delete duplicate records before running this

-- First, identify potential conflicts:
-- SELECT "userId", status, COUNT(*) FROM "UserSubscription" GROUP BY "userId", status HAVING COUNT(*) > 1;

-- Then restore the unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "UserSubscription_userId_status_key" ON "UserSubscription"("userId", "status");

-- ============================================
-- 3. Remove Added Composite Indexes
-- ============================================

DROP INDEX IF EXISTS "CustomizationQuote_requestId_createdAt_idx";
DROP INDEX IF EXISTS "MembershipPlan_isActive_price_idx";
DROP INDEX IF EXISTS "UserSubscription_userId_status_idx";
DROP INDEX IF EXISTS "UserSubscription_status_expiresAt_idx";
DROP INDEX IF EXISTS "UserSubscription_userId_expiresAt_idx";
DROP INDEX IF EXISTS "BrandSettlement_status_createdAt_idx";
DROP INDEX IF EXISTS "ProductSalesStats_date_purchases_idx";
DROP INDEX IF EXISTS "ProductSalesStats_date_revenue_idx";
DROP INDEX IF EXISTS "BrandMerchant_brandId_isActive_idx";
DROP INDEX IF EXISTS "UserAddress_userId_isDefault_idx";
DROP INDEX IF EXISTS "StyleRecommendation_userId_createdAt_idx";
DROP INDEX IF EXISTS "StyleRecommendation_type_createdAt_idx";
DROP INDEX IF EXISTS "PaymentOrder_userId_status_idx";
DROP INDEX IF EXISTS "PaymentOrder_status_createdAt_idx";
DROP INDEX IF EXISTS "PaymentOrder_userId_createdAt_idx";
DROP INDEX IF EXISTS "RankingFeedback_userId_action_idx";
DROP INDEX IF EXISTS "RankingFeedback_itemId_action_idx";
