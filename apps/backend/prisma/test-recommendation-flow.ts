import { PrismaClient, ClothingCategory } from "@prisma/client";

const prisma = new PrismaClient();

async function testRecommendationFlow() {
  console.log("=".repeat(60));
  console.log("Testing Recommendation System with Real Data");
  console.log("=".repeat(60));

  // 1. Test basic query - get items by category
  console.log("\n1. Testing category query (tops):");
  const tops = await prisma.clothingItem.findMany({
    where: { 
      category: ClothingCategory.tops,
      isActive: true 
    },
    select: { name: true, colors: true, attributes: true },
    take: 3,
  });
  
  for (const item of tops) {
    const attrs = item.attributes as Record<string, unknown>;
    console.log(`  - ${item.name}`);
    console.log(`    Colors: ${item.colors?.join(", ")}`);
    console.log(`    Style: ${JSON.stringify(attrs?.style)}`);
    console.log(`    Occasions: ${JSON.stringify(attrs?.occasions)}`);
  }

  // 2. Test style-based filtering
  console.log("\n2. Testing style-based query (formal):");
  const formalItems = await prisma.clothingItem.findMany({
    where: {
      isActive: true,
      OR: [
        { category: ClothingCategory.tops },
        { category: ClothingCategory.bottoms },
      ],
    },
    select: { name: true, category: true, attributes: true },
    take: 10,
  });

  const formalFiltered = formalItems.filter(item => {
    const attrs = item.attributes as Record<string, unknown>;
    const styles = attrs?.style as string[] | undefined;
    return styles?.some(s => s.includes("formal") || s.includes("business"));
  });

  console.log(`  Found ${formalFiltered.length} formal items from 10 samples`);
  for (const item of formalFiltered.slice(0, 3)) {
    console.log(`  - ${item.name} (${item.category})`);
  }

  // 3. Test occasion-based filtering
  console.log("\n3. Testing occasion-based query (work):");
  const workItems = await prisma.clothingItem.findMany({
    where: { isActive: true },
    select: { name: true, category: true, attributes: true },
    take: 20,
  });

  const workFiltered = workItems.filter(item => {
    const attrs = item.attributes as Record<string, unknown>;
    const occasions = attrs?.occasions as string[] | undefined;
    return occasions?.some(o => o.includes("work") || o.includes("business"));
  });

  console.log(`  Found ${workFiltered.length} work-appropriate items from 20 samples`);

  // 4. Test color season matching
  console.log("\n4. Testing color season matching (winter):");
  const winterItems = await prisma.clothingItem.findMany({
    where: { isActive: true },
    select: { name: true, colors: true, attributes: true },
    take: 20,
  });

  const winterFiltered = winterItems.filter(item => {
    const attrs = item.attributes as Record<string, unknown>;
    const seasons = attrs?.colorSeasons as string[] | undefined;
    return seasons?.some(s => s.includes("winter") || s.includes("autumn"));
  });

  console.log(`  Found ${winterFiltered.length} winter-appropriate items from 20 samples`);
  for (const item of winterFiltered.slice(0, 3)) {
    console.log(`  - ${item.name} (${item.colors?.join(", ")})`);
  }

  // 5. Test outfit combination
  console.log("\n5. Testing outfit combination (casual daily):");
  
  const casualTops = await prisma.clothingItem.findMany({
    where: { 
      category: ClothingCategory.tops,
      isActive: true 
    },
    select: { id: true, name: true, colors: true, attributes: true },
    take: 5,
  });

  const casualBottoms = await prisma.clothingItem.findMany({
    where: { 
      category: ClothingCategory.bottoms,
      isActive: true 
    },
    select: { id: true, name: true, colors: true, attributes: true },
    take: 5,
  });

  const casualFootwear = await prisma.clothingItem.findMany({
    where: { 
      category: ClothingCategory.footwear,
      isActive: true 
    },
    select: { id: true, name: true, colors: true, attributes: true },
    take: 5,
  });

  const filterByOccasion = (items: typeof casualTops, occasion: string) => {
    return items.filter(item => {
      const attrs = item.attributes as Record<string, unknown>;
      const occasions = attrs?.occasions as string[] | undefined;
      return occasions?.some(o => o.includes(occasion));
    });
  };

  const topsForDaily = filterByOccasion(casualTops, "daily");
  const bottomsForDaily = filterByOccasion(casualBottoms, "daily");
  const footwearForDaily = filterByOccasion(casualFootwear, "daily");

  console.log(`  Tops for daily: ${topsForDaily.length}`);
  console.log(`  Bottoms for daily: ${bottomsForDaily.length}`);
  console.log(`  Footwear for daily: ${footwearForDaily.length}`);

  if (topsForDaily.length > 0 && bottomsForDaily.length > 0) {
    console.log("\n  Sample outfit combination:");
    console.log(`    Top: ${topsForDaily[0]!.name}`);
    console.log(`    Bottom: ${bottomsForDaily[0]!.name}`);
    if (footwearForDaily.length > 0) {
      console.log(`    Footwear: ${footwearForDaily[0]!.name}`);
    }
  }

  // 6. Summary
  console.log("\n" + "=".repeat(60));
  console.log("Summary");
  console.log("=".repeat(60));
  
  const totalItems = await prisma.clothingItem.count({ where: { isActive: true } });
  const itemsWithStyle = await prisma.clothingItem.count({
    where: { 
      isActive: true,
      externalId: { not: null }
    }
  });

  console.log(`Total active items: ${totalItems}`);
  console.log(`Imported items with enhanced attributes: ${itemsWithStyle}`);
  console.log(`\nRecommendation system is ready to use real data!`);

  await prisma.$disconnect();
}

testRecommendationFlow();
