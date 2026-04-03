-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BehaviorEventType" ADD VALUE 'post_create';
ALTER TYPE "BehaviorEventType" ADD VALUE 'post_like';
ALTER TYPE "BehaviorEventType" ADD VALUE 'post_comment';
ALTER TYPE "BehaviorEventType" ADD VALUE 'user_follow';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "data" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "followerCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "followingCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "StyleProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "occasion" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "keywords" TEXT[],
    "palette" TEXT[],
    "confidence" INTEGER NOT NULL DEFAULT 70,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StyleProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityPost" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "images" TEXT[],
    "tags" TEXT[],
    "category" TEXT NOT NULL DEFAULT 'outfit_share',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityPostItem" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityPostItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostLike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostComment" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "parentId" TEXT,
    "content" TEXT NOT NULL,
    "images" TEXT[],
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFollow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFollow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StyleProfile_userId_idx" ON "StyleProfile"("userId");

-- CreateIndex
CREATE INDEX "StyleProfile_occasion_idx" ON "StyleProfile"("occasion");

-- CreateIndex
CREATE INDEX "CommunityPost_authorId_idx" ON "CommunityPost"("authorId");

-- CreateIndex
CREATE INDEX "CommunityPost_category_idx" ON "CommunityPost"("category");

-- CreateIndex
CREATE INDEX "CommunityPost_createdAt_idx" ON "CommunityPost"("createdAt");

-- CreateIndex
CREATE INDEX "CommunityPost_isDeleted_idx" ON "CommunityPost"("isDeleted");

-- CreateIndex
CREATE INDEX "CommunityPostItem_postId_idx" ON "CommunityPostItem"("postId");

-- CreateIndex
CREATE INDEX "CommunityPostItem_itemId_idx" ON "CommunityPostItem"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityPostItem_postId_itemId_key" ON "CommunityPostItem"("postId", "itemId");

-- CreateIndex
CREATE INDEX "PostLike_userId_idx" ON "PostLike"("userId");

-- CreateIndex
CREATE INDEX "PostLike_postId_idx" ON "PostLike"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "PostLike_userId_postId_key" ON "PostLike"("userId", "postId");

-- CreateIndex
CREATE INDEX "PostComment_authorId_idx" ON "PostComment"("authorId");

-- CreateIndex
CREATE INDEX "PostComment_postId_idx" ON "PostComment"("postId");

-- CreateIndex
CREATE INDEX "PostComment_parentId_idx" ON "PostComment"("parentId");

-- CreateIndex
CREATE INDEX "UserFollow_followerId_idx" ON "UserFollow"("followerId");

-- CreateIndex
CREATE INDEX "UserFollow_followingId_idx" ON "UserFollow"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "UserFollow_followerId_followingId_key" ON "UserFollow"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "ClothingItem_price_idx" ON "ClothingItem"("price");

-- CreateIndex
CREATE INDEX "ClothingItem_viewCount_idx" ON "ClothingItem"("viewCount" DESC);

-- CreateIndex
CREATE INDEX "ClothingItem_likeCount_idx" ON "ClothingItem"("likeCount" DESC);

-- CreateIndex
CREATE INDEX "ClothingItem_createdAt_idx" ON "ClothingItem"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "ClothingItem_category_isActive_idx" ON "ClothingItem"("category", "isActive");

-- CreateIndex
CREATE INDEX "ClothingItem_isActive_createdAt_idx" ON "ClothingItem"("isActive", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ClothingItem_isActive_price_idx" ON "ClothingItem"("isActive", "price");

-- CreateIndex
CREATE INDEX "Outfit_userId_isFavorite_idx" ON "Outfit"("userId", "isFavorite");

-- CreateIndex
CREATE INDEX "Outfit_userId_createdAt_idx" ON "Outfit"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Outfit_rating_idx" ON "Outfit"("rating" DESC);

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "UserBehavior_userId_type_createdAt_idx" ON "UserBehavior"("userId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "UserBehavior_itemId_idx" ON "UserBehavior"("itemId");

-- CreateIndex
CREATE INDEX "UserBehaviorEvent_userId_eventType_createdAt_idx" ON "UserBehaviorEvent"("userId", "eventType", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "UserBehaviorEvent_category_action_createdAt_idx" ON "UserBehaviorEvent"("category", "action", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "UserClothing_userId_category_idx" ON "UserClothing"("userId", "category");

-- CreateIndex
CREATE INDEX "UserClothing_userId_isFavorite_idx" ON "UserClothing"("userId", "isFavorite");

-- CreateIndex
CREATE INDEX "UserClothing_userId_createdAt_idx" ON "UserClothing"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "UserClothing_lastWorn_idx" ON "UserClothing"("lastWorn" DESC);

-- CreateIndex
CREATE INDEX "UserPhoto_analysisStatus_idx" ON "UserPhoto"("analysisStatus");

-- CreateIndex
CREATE INDEX "UserPhoto_userId_analysisStatus_idx" ON "UserPhoto"("userId", "analysisStatus");

-- CreateIndex
CREATE INDEX "UserProfile_bodyType_idx" ON "UserProfile"("bodyType");

-- CreateIndex
CREATE INDEX "UserProfile_skinTone_idx" ON "UserProfile"("skinTone");

-- CreateIndex
CREATE INDEX "UserProfile_colorSeason_idx" ON "UserProfile"("colorSeason");

-- AddForeignKey
ALTER TABLE "StyleProfile" ADD CONSTRAINT "StyleProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostItem" ADD CONSTRAINT "CommunityPostItem_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostItem" ADD CONSTRAINT "CommunityPostItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ClothingItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "PostComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFollow" ADD CONSTRAINT "UserFollow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFollow" ADD CONSTRAINT "UserFollow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
