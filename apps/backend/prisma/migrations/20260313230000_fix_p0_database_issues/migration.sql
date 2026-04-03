-- Migration: Fix P0 Database Issues
-- Description: Fix price field types, UserSubscription unique constraint,
--              add encryption field comments (via schema only), and add missing indexes
-- Date: 2026-03-13

-- ============================================
-- 1. Fix Price Field Types (Float -> Decimal)
-- ============================================

-- MembershipPlan.price: Float -> Decimal(10,2)
ALTER TABLE "MembershipPlan" ALTER COLUMN "price" TYPE DECIMAL(10,2);

-- CustomizationQuote.price: Float -> Decimal(10,2)
ALTER TABLE "CustomizationQuote" ALTER COLUMN "price" TYPE DECIMAL(10,2);

-- BrandSettlement amounts: Float -> Decimal
ALTER TABLE "BrandSettlement" ALTER COLUMN "totalSales" TYPE DECIMAL(12,2);
ALTER TABLE "BrandSettlement" ALTER COLUMN "commission" TYPE DECIMAL(10,2);
ALTER TABLE "BrandSettlement" ALTER COLUMN "netAmount" TYPE DECIMAL(12,2);

-- ProductSalesStats.revenue: Float -> Decimal(12,2)
ALTER TABLE "ProductSalesStats" ALTER COLUMN "revenue" TYPE DECIMAL(12,2);

-- StyleRecommendation.score: Float -> Decimal(5,4)
ALTER TABLE "StyleRecommendation" ALTER COLUMN "score" TYPE DECIMAL(5,4);

-- RankingFeedback.weight: Float -> Decimal(5,4)
ALTER TABLE "RankingFeedback" ALTER COLUMN "weight" TYPE DECIMAL(5,4);

-- ============================================
-- 2. Fix UserSubscription Unique Constraint
-- ============================================
-- Remove @@unique([userId, status]) to allow subscription history
-- This enables a user to have multiple subscriptions with different statuses
-- (e.g., expired history + active subscription)

DROP INDEX IF EXISTS "UserSubscription_userId_status_key";

-- ============================================
-- 3. Add Missing Composite Indexes
-- ============================================

-- CustomizationQuote: Query by request with ordering
CREATE INDEX IF NOT EXISTS "CustomizationQuote_requestId_createdAt_idx" ON "CustomizationQuote"("requestId", "createdAt" DESC);

-- MembershipPlan: Query active plans by price range
CREATE INDEX IF NOT EXISTS "MembershipPlan_isActive_price_idx" ON "MembershipPlan"("isActive", "price");

-- UserSubscription: Common query patterns for subscription management
CREATE INDEX IF NOT EXISTS "UserSubscription_userId_status_idx" ON "UserSubscription"("userId", "status");
CREATE INDEX IF NOT EXISTS "UserSubscription_status_expiresAt_idx" ON "UserSubscription"("status", "expiresAt");
CREATE INDEX IF NOT EXISTS "UserSubscription_userId_expiresAt_idx" ON "UserSubscription"("userId", "expiresAt");

-- BrandSettlement: Query settlements by status with ordering
CREATE INDEX IF NOT EXISTS "BrandSettlement_status_createdAt_idx" ON "BrandSettlement"("status", "createdAt" DESC);

-- ProductSalesStats: Analytics queries by date with ordering
CREATE INDEX IF NOT EXISTS "ProductSalesStats_date_purchases_idx" ON "ProductSalesStats"("date", "purchases" DESC);
CREATE INDEX IF NOT EXISTS "ProductSalesStats_date_revenue_idx" ON "ProductSalesStats"("date", "revenue" DESC);

-- BrandMerchant: Query merchants by brand and status
CREATE INDEX IF NOT EXISTS "BrandMerchant_brandId_isActive_idx" ON "BrandMerchant"("brandId", "isActive");

-- UserAddress: Query default address
CREATE INDEX IF NOT EXISTS "UserAddress_userId_isDefault_idx" ON "UserAddress"("userId", "isDefault");

-- StyleRecommendation: Query by user with ordering, and by type with ordering
CREATE INDEX IF NOT EXISTS "StyleRecommendation_userId_createdAt_idx" ON "StyleRecommendation"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "StyleRecommendation_type_createdAt_idx" ON "StyleRecommendation"("type", "createdAt" DESC);

-- PaymentOrder: Common query patterns
CREATE INDEX IF NOT EXISTS "PaymentOrder_userId_status_idx" ON "PaymentOrder"("userId", "status");
CREATE INDEX IF NOT EXISTS "PaymentOrder_status_createdAt_idx" ON "PaymentOrder"("status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "PaymentOrder_userId_createdAt_idx" ON "PaymentOrder"("userId", "createdAt" DESC);

-- RankingFeedback: Query by user action and item action
CREATE INDEX IF NOT EXISTS "RankingFeedback_userId_action_idx" ON "RankingFeedback"("userId", "action");
CREATE INDEX IF NOT EXISTS "RankingFeedback_itemId_action_idx" ON "RankingFeedback"("itemId", "action");
