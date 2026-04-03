import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

async function check() {
  const sample = await prisma.clothingItem.findFirst({
    where: { externalId: { not: null } },
    select: { name: true, category: true, attributes: true }
  });
  
  console.log("Sample item:", sample?.name);
  console.log("Category:", sample?.category);
  const attrs = sample?.attributes as Record<string, unknown> | null;
  console.log("Attributes style:", attrs?.style);
  console.log("Attributes occasions:", attrs?.occasions);
  console.log("Attributes colorSeasons:", attrs?.colorSeasons);
  console.log("Attributes bodyTypeFit:", attrs?.bodyTypeFit);
  
  const totalItems = await prisma.clothingItem.count({
    where: { externalId: { not: null } }
  });
  
  console.log("\nTotal imported items:", totalItems);
  
  await prisma.$disconnect();
}

check();
