-- AlterEnum
-- This migration adds the `WardrobeSection` enum and adds a `section` column to the `Favorite` model.

-- CreateEnum
CREATE TYPE "WardrobeSection" AS ENUM ('saved_outfit', 'wishlisted', 'purchased');

-- AlterTable
ALTER TABLE "Favorite" ADD COLUMN "section" "WardrobeSection" NOT NULL DEFAULT 'wishlisted';

-- CreateIndex
CREATE INDEX "Favorite_userId_section_idx" ON "Favorite"("userId", "section");
