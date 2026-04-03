-- CreateTable
CREATE TABLE "AiStylistSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiStylistSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiStylistSession_userId_updatedAt_idx" ON "AiStylistSession"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "AiStylistSession_expiresAt_idx" ON "AiStylistSession"("expiresAt");

-- AddForeignKey
ALTER TABLE "AiStylistSession" ADD CONSTRAINT "AiStylistSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
