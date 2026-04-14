-- Soft Delete Partial Indexes Migration
-- 创建软删除的部分索引以提高查询性能
-- 只索引未删除的记录，减少索引大小并提高查询速度

-- =====================================================
-- ClothingItem 软删除索引优化
-- =====================================================

-- 价格索引（只索引未删除且激活的商品）
CREATE INDEX IF NOT EXISTS "ClothingItem_price_soft_delete_idx"
ON "ClothingItem"("price" DESC)
WHERE "isDeleted" = false AND "isActive" = true;

-- 分类索引（只索引未删除且激活的商品）
CREATE INDEX IF NOT EXISTS "ClothingItem_category_soft_delete_idx"
ON "ClothingItem"("category")
WHERE "isDeleted" = false AND "isActive" = true;

-- 创建时间索引（只索引未删除的商品）
CREATE INDEX IF NOT EXISTS "ClothingItem_createdAt_soft_delete_idx"
ON "ClothingItem"("createdAt" DESC)
WHERE "isDeleted" = false;

-- 品牌ID索引（只索引未删除的商品）
CREATE INDEX IF NOT EXISTS "ClothingItem_brandId_soft_delete_idx"
ON "ClothingItem"("brandId")
WHERE "isDeleted" = false AND "brandId" IS NOT NULL;

-- 浏览量索引（只索引未删除的商品）
CREATE INDEX IF NOT EXISTS "ClothingItem_viewCount_soft_delete_idx"
ON "ClothingItem"("viewCount" DESC)
WHERE "isDeleted" = false;

-- 点赞数索引（只索引未删除的商品）
CREATE INDEX IF NOT EXISTS "ClothingItem_likeCount_soft_delete_idx"
ON "ClothingItem"("likeCount" DESC)
WHERE "isDeleted" = false;

-- 综合索引：分类 + 价格（只索引未删除且激活的商品）
CREATE INDEX IF NOT EXISTS "ClothingItem_category_price_soft_delete_idx"
ON "ClothingItem"("category", "price" DESC)
WHERE "isDeleted" = false AND "isActive" = true;

-- 综合索引：激活状态 + 创建时间（只索引未删除的商品）
CREATE INDEX IF NOT EXISTS "ClothingItem_isActive_createdAt_soft_delete_idx"
ON "ClothingItem"("isActive", "createdAt" DESC)
WHERE "isDeleted" = false;

-- 库存索引已移除：ClothingItem 没有 stock 列（库存管理通过 CartItem 数量实现）

-- =====================================================
-- Order 软删除索引优化
-- =====================================================

-- 用户ID + 状态索引（只索引未删除的订单）
CREATE INDEX IF NOT EXISTS "Order_userId_status_soft_delete_idx"
ON "Order"("userId", "status")
WHERE "isDeleted" = false;

-- 用户ID + 创建时间索引（只索引未删除的订单）
CREATE INDEX IF NOT EXISTS "Order_userId_createdAt_soft_delete_idx"
ON "Order"("userId", "createdAt" DESC)
WHERE "isDeleted" = false;

-- 状态索引（只索引未删除的订单）
CREATE INDEX IF NOT EXISTS "Order_status_soft_delete_idx"
ON "Order"("status")
WHERE "isDeleted" = false;

-- =====================================================
-- CommunityPost 软删除索引优化
-- =====================================================

-- 作者ID索引（只索引未删除的帖子）
CREATE INDEX IF NOT EXISTS "CommunityPost_authorId_soft_delete_idx"
ON "CommunityPost"("authorId", "createdAt" DESC)
WHERE "isDeleted" = false;

-- 分类索引（只索引未删除的帖子）
CREATE INDEX IF NOT EXISTS "CommunityPost_category_soft_delete_idx"
ON "CommunityPost"("category", "createdAt" DESC)
WHERE "isDeleted" = false;

-- 精选索引（只索引未删除的帖子）
CREATE INDEX IF NOT EXISTS "CommunityPost_isFeatured_soft_delete_idx"
ON "CommunityPost"("isFeatured", "likeCount" DESC, "createdAt" DESC)
WHERE "isDeleted" = false;

-- 点赞数索引（只索引未删除的帖子）
CREATE INDEX IF NOT EXISTS "CommunityPost_likeCount_soft_delete_idx"
ON "CommunityPost"("likeCount" DESC)
WHERE "isDeleted" = false;

-- 浏览量索引（只索引未删除的帖子）
CREATE INDEX IF NOT EXISTS "CommunityPost_viewCount_soft_delete_idx"
ON "CommunityPost"("viewCount" DESC)
WHERE "isDeleted" = false;

-- =====================================================
-- PostComment 软删除索引优化
-- =====================================================

-- 帖子ID索引（只索引未删除的评论）
CREATE INDEX IF NOT EXISTS "PostComment_postId_soft_delete_idx"
ON "PostComment"("postId", "createdAt" DESC)
WHERE "isDeleted" = false;

-- 作者ID索引（只索引未删除的评论）
CREATE INDEX IF NOT EXISTS "PostComment_authorId_soft_delete_idx"
ON "PostComment"("authorId")
WHERE "isDeleted" = false;
