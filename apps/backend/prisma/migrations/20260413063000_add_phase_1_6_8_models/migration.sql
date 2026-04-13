-- Phase 1: 风格测试问卷系统
CREATE TYPE "QuizQuestionType" AS ENUM ('visual_choice', 'text_choice', 'slider');

CREATE TABLE "StyleQuiz" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StyleQuiz_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "questionType" "QuizQuestionType" NOT NULL,
    "dimension" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuizAnswer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedImageIndex" INTEGER,
    "selectedOption" TEXT,
    "sliderValue" DOUBLE PRECISION,
    "responseTimeMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizAnswer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StyleQuizResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "occasionPreferences" JSONB NOT NULL,
    "colorPreferences" JSONB NOT NULL,
    "styleKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "priceRange" "PriceRange" NOT NULL DEFAULT 'mid_range',
    "confidenceScore" DECIMAL(5,4) NOT NULL,
    "isLatest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StyleQuizResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ShareTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "backgroundImageUrl" TEXT NOT NULL,
    "layoutConfig" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShareTemplate_pkey" PRIMARY KEY ("id")
);

-- Phase 1 索引
CREATE INDEX "StyleQuiz_isActive_idx" ON "StyleQuiz"("isActive");
CREATE INDEX "StyleQuiz_createdAt_idx" ON "StyleQuiz"("createdAt" DESC);
CREATE INDEX "QuizQuestion_quizId_idx" ON "QuizQuestion"("quizId");
CREATE INDEX "QuizQuestion_dimension_idx" ON "QuizQuestion"("dimension");
CREATE INDEX "QuizQuestion_quizId_sortOrder_idx" ON "QuizQuestion"("quizId", "sortOrder");
CREATE INDEX "QuizAnswer_userId_idx" ON "QuizAnswer"("userId");
CREATE INDEX "QuizAnswer_questionId_idx" ON "QuizAnswer"("questionId");
CREATE INDEX "QuizAnswer_userId_questionId_idx" ON "QuizAnswer"("userId", "questionId");
CREATE INDEX "QuizAnswer_userId_createdAt_idx" ON "QuizAnswer"("userId", "createdAt" DESC);
CREATE INDEX "StyleQuizResult_userId_idx" ON "StyleQuizResult"("userId");
CREATE INDEX "StyleQuizResult_quizId_idx" ON "StyleQuizResult"("quizId");
CREATE INDEX "StyleQuizResult_userId_isLatest_idx" ON "StyleQuizResult"("userId", "isLatest");
CREATE INDEX "StyleQuizResult_userId_createdAt_idx" ON "StyleQuizResult"("userId", "createdAt" DESC);
CREATE INDEX "ShareTemplate_isActive_idx" ON "ShareTemplate"("isActive");

-- Phase 1 外键
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "StyleQuiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StyleQuizResult" ADD CONSTRAINT "StyleQuizResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StyleQuizResult" ADD CONSTRAINT "StyleQuizResult_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "StyleQuiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Phase 6: 灵感衣橱分类系统
CREATE TYPE "CollectionItemType" AS ENUM ('post', 'outfit', 'try_on');

CREATE TABLE "WardrobeCollection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "coverImage" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WardrobeCollection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WardrobeCollectionItem" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "itemType" "CollectionItemType" NOT NULL,
    "itemId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WardrobeCollectionItem_pkey" PRIMARY KEY ("id")
);

-- Phase 6 索引
CREATE INDEX "WardrobeCollection_userId_idx" ON "WardrobeCollection"("userId");
CREATE INDEX "WardrobeCollection_userId_sortOrder_idx" ON "WardrobeCollection"("userId", "sortOrder");
CREATE INDEX "WardrobeCollection_userId_isDefault_idx" ON "WardrobeCollection"("userId", "isDefault");
CREATE INDEX "WardrobeCollectionItem_collectionId_idx" ON "WardrobeCollectionItem"("collectionId");
CREATE INDEX "WardrobeCollectionItem_collectionId_sortOrder_idx" ON "WardrobeCollectionItem"("collectionId", "sortOrder");
CREATE INDEX "WardrobeCollectionItem_itemType_itemId_idx" ON "WardrobeCollectionItem"("itemType", "itemId");
CREATE UNIQUE INDEX "WardrobeCollectionItem_collectionId_itemType_itemId_key" ON "WardrobeCollectionItem"("collectionId", "itemType", "itemId");

-- Phase 6 外键
ALTER TABLE "WardrobeCollection" ADD CONSTRAINT "WardrobeCollection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WardrobeCollectionItem" ADD CONSTRAINT "WardrobeCollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "WardrobeCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Phase 8: 顾问系统
CREATE TYPE "ConsultantStatus" AS ENUM ('pending', 'active', 'suspended', 'inactive');
CREATE TYPE "ServiceType" AS ENUM ('styling_consultation', 'wardrobe_audit', 'shopping_companion', 'color_analysis', 'special_event');
CREATE TYPE "BookingStatus" AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');
CREATE TYPE "SenderType" AS ENUM ('user', 'consultant');
CREATE TYPE "MessageType" AS ENUM ('text', 'image', 'file', 'system');

CREATE TABLE "ConsultantProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studioName" TEXT NOT NULL,
    "specialties" JSONB NOT NULL,
    "yearsOfExperience" INTEGER NOT NULL,
    "certifications" JSONB NOT NULL,
    "portfolioCases" JSONB NOT NULL,
    "rating" DECIMAL(2,1) NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "bio" TEXT,
    "avatar" TEXT,
    "status" "ConsultantStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultantProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceBooking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "status" "BookingStatus" NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "cancelReason" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceBooking_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatRoom" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3),
    "lastMessagePreview" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatRoom_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderType" "SenderType" NOT NULL,
    "content" TEXT NOT NULL,
    "messageType" "MessageType" NOT NULL DEFAULT 'text',
    "imageUrl" TEXT,
    "fileUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- Phase 8 索引
CREATE UNIQUE INDEX "ConsultantProfile_userId_key" ON "ConsultantProfile"("userId");
CREATE INDEX "ConsultantProfile_userId_idx" ON "ConsultantProfile"("userId");
CREATE INDEX "ConsultantProfile_status_idx" ON "ConsultantProfile"("status");
CREATE INDEX "ConsultantProfile_status_rating_idx" ON "ConsultantProfile"("status", "rating");
CREATE INDEX "ConsultantProfile_rating_idx" ON "ConsultantProfile"("rating" DESC);
CREATE INDEX "ServiceBooking_userId_idx" ON "ServiceBooking"("userId");
CREATE INDEX "ServiceBooking_consultantId_idx" ON "ServiceBooking"("consultantId");
CREATE INDEX "ServiceBooking_status_idx" ON "ServiceBooking"("status");
CREATE INDEX "ServiceBooking_scheduledAt_idx" ON "ServiceBooking"("scheduledAt");
CREATE INDEX "ServiceBooking_userId_status_idx" ON "ServiceBooking"("userId", "status");
CREATE INDEX "ServiceBooking_consultantId_status_idx" ON "ServiceBooking"("consultantId", "status");
CREATE INDEX "ServiceBooking_consultantId_scheduledAt_idx" ON "ServiceBooking"("consultantId", "scheduledAt");
CREATE INDEX "ServiceBooking_userId_createdAt_idx" ON "ServiceBooking"("userId", "createdAt");
CREATE INDEX "ChatRoom_consultantId_idx" ON "ChatRoom"("consultantId");
CREATE INDEX "ChatRoom_userId_consultantId_idx" ON "ChatRoom"("userId", "consultantId");
CREATE INDEX "ChatRoom_lastMessageAt_idx" ON "ChatRoom"("lastMessageAt");
CREATE INDEX "ChatRoom_userId_isActive_idx" ON "ChatRoom"("userId", "isActive");
CREATE INDEX "ChatRoom_consultantId_isActive_idx" ON "ChatRoom"("consultantId", "isActive");
CREATE INDEX "ChatMessage_roomId_idx" ON "ChatMessage"("roomId");
CREATE INDEX "ChatMessage_roomId_createdAt_idx" ON "ChatMessage"("roomId", "createdAt");
CREATE INDEX "ChatMessage_senderId_idx" ON "ChatMessage"("senderId");
CREATE INDEX "ChatMessage_roomId_isRead_idx" ON "ChatMessage"("roomId", "isRead");
CREATE INDEX "ChatMessage_senderId_isRead_idx" ON "ChatMessage"("senderId", "isRead");

-- Phase 8 外键
ALTER TABLE "ConsultantProfile" ADD CONSTRAINT "ConsultantProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceBooking" ADD CONSTRAINT "ServiceBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceBooking" ADD CONSTRAINT "ServiceBooking_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "ConsultantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatRoom" ADD CONSTRAINT "ChatRoom_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatRoom" ADD CONSTRAINT "ChatRoom_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "ConsultantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
