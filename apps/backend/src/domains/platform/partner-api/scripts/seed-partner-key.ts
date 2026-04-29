import * as crypto from "crypto";

import { PrismaClient } from "@prisma/client";

async function generatePartnerApiKey(
  prisma: PrismaClient,
  name: string,
  rateLimit: number = 60
): Promise<string> {
  const fullKey = crypto.randomBytes(32).toString("hex");
  const keyPrefix = fullKey.substring(0, 8);
  const keyHash = crypto.createHash("sha256").update(fullKey).digest("hex");

  await (prisma as any).partnerApiKey.create({
    data: {
      name,
      keyHash,
      keyPrefix,
      rateLimit,
    },
  });

  return fullKey;
}

async function main() {
  const prisma = new PrismaClient();

  try {
    const fullKey = await generatePartnerApiKey(prisma, "test-partner-key", 60);

    console.log("=========================================");
    console.log("Partner API Key Created (SAVE THIS - shown once)");
    console.log("=========================================");
    console.log(`Name: test-partner-key`);
    console.log(`Full Key: ${fullKey}`);
    console.log(`Key Prefix: ${fullKey.substring(0, 8)}`);
    console.log(`Rate Limit: 60 req/min`);
    console.log("=========================================");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
