import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const USAGE_TO_STYLE: Record<string, string[]> = {
  "Casual": ["casual", "everyday", "relaxed"],
  "Formal": ["formal", "business", "professional"],
  "Sports": ["sporty", "athletic", "activewear"],
  "Ethnic": ["ethnic", "traditional", "cultural"],
  "Smart Casual": ["smart-casual", "semi-formal"],
  "Party": ["party", "evening", "glam"],
  "Travel": ["casual", "comfortable"],
  "NA": ["casual"],
};

const CATEGORY_TO_OCCASIONS: Record<string, string[]> = {
  "Topwear": ["daily", "work", "weekend", "casual"],
  "Bottomwear": ["daily", "work", "weekend", "casual"],
  "Dresses": ["party", "date", "evening", "special"],
  "Shirts": ["work", "daily", "formal", "business"],
  "Tshirts": ["casual", "weekend", "daily", "sports"],
  "Jeans": ["casual", "daily", "weekend"],
  "Tops": ["daily", "casual", "weekend", "party"],
  "Jackets": ["winter", "casual", "outdoor", "travel"],
  "Shoes": ["daily", "work", "casual"],
  "Sandals": ["casual", "summer", "daily", "beach"],
  "Flip Flops": ["casual", "summer", "beach", "home"],
  "Sports Shoes": ["sports", "gym", "running", "outdoor"],
  "Formal Shoes": ["work", "formal", "business"],
  "Watches": ["daily", "work", "casual", "formal"],
  "Bags": ["daily", "work", "travel", "casual"],
  "Sunglasses": ["casual", "summer", "outdoor", "beach"],
};

const COLOR_TO_SEASONS: Record<string, string[]> = {
  "Navy Blue": ["winter", "autumn"], "Blue": ["summer", "spring"],
  "Black": ["winter", "autumn", "all-season"], "White": ["summer", "spring", "all-season"],
  "Grey": ["winter", "autumn", "all-season"], "Red": ["autumn", "winter", "all-season"],
  "Green": ["spring", "summer", "autumn"], "Brown": ["autumn", "winter"],
  "Beige": ["spring", "summer", "autumn"], "Pink": ["spring", "summer"],
  "Purple": ["autumn", "winter"], "Orange": ["autumn", "summer"],
  "Yellow": ["spring", "summer"], "Maroon": ["autumn", "winter"],
  "Multi": ["all-season"], "Gold": ["autumn", "winter", "party"],
  "Silver": ["winter", "party", "evening"],
};

const BODY_TYPE_FIT: Record<string, string[]> = {
  "Topwear": ["rectangle", "inverted-triangle", "hourglass", "pear", "apple"],
  "Bottomwear": ["rectangle", "hourglass", "pear", "apple"],
  "Dresses": ["hourglass", "rectangle", "pear"],
  "Shirts": ["rectangle", "inverted-triangle", "hourglass"],
  "Tshirts": ["rectangle", "inverted-triangle", "hourglass", "pear", "apple"],
  "Jeans": ["rectangle", "hourglass", "pear"],
};

function inferStyles(usage: string | null, subcategory: string | null): string[] {
  const styles: string[] = [];
  if (usage && USAGE_TO_STYLE[usage]) styles.push(...USAGE_TO_STYLE[usage]);
  if (subcategory) {
    const sub = subcategory.toLowerCase();
    if (sub.includes("sports") || sub.includes("athletic")) styles.push("sporty", "athletic");
    if (sub.includes("formal")) styles.push("formal", "business");
  }
  if (styles.length === 0) styles.push("casual");
  return [...new Set(styles)];
}

function inferOccasions(subcategory: string | null, usage: string | null): string[] {
  const occasions: string[] = [];
  if (subcategory && CATEGORY_TO_OCCASIONS[subcategory]) occasions.push(...CATEGORY_TO_OCCASIONS[subcategory]);
  if (usage) {
    const u = usage.toLowerCase();
    if (u === "formal") occasions.push("work", "business", "meeting");
    else if (u === "sports") occasions.push("gym", "sports", "outdoor");
  }
  if (occasions.length === 0) occasions.push("daily", "casual");
  return [...new Set(occasions)];
}

function inferColorSeasons(baseColour: string | null): string[] {
  if (!baseColour) return ["all-season"];
  const normalized = baseColour.charAt(0).toUpperCase() + baseColour.slice(1).toLowerCase();
  if (COLOR_TO_SEASONS[normalized]) return COLOR_TO_SEASONS[normalized];
  for (const [color, seasons] of Object.entries(COLOR_TO_SEASONS)) {
    if (baseColour.toLowerCase().includes(color.toLowerCase())) return seasons;
  }
  return ["all-season"];
}

function inferBodyTypeFit(subcategory: string | null): string[] {
  if (!subcategory) return ["rectangle", "hourglass", "pear", "apple"];
  if (BODY_TYPE_FIT[subcategory]) return BODY_TYPE_FIT[subcategory];
  for (const [key, fits] of Object.entries(BODY_TYPE_FIT)) {
    if (subcategory.toLowerCase().includes(key.toLowerCase())) return fits;
  }
  return ["rectangle", "hourglass", "pear", "apple"];
}

async function main() {
  console.log("=".repeat(60));
  console.log("Clothing Data Enhancement (Sequential)");
  console.log("=".repeat(60));

  const items = await prisma.clothingItem.findMany({
    where: { externalId: { not: null } },
    select: { id: true, subcategory: true, colors: true, attributes: true },
  });

  console.log(`Found ${items.length} items to enhance`);

  let updated = 0;
  const batchSize = 100;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    for (const item of batch) {
      try {
        const attrs = item.attributes as Record<string, unknown> || {};
        const usage = attrs.usage as string | null || null;
        const baseColour = attrs.baseColour as string | null || (item.colors?.[0] ?? null);
        
        await prisma.clothingItem.update({
          where: { id: item.id },
          data: {
            attributes: {
              ...attrs,
              style: inferStyles(usage, item.subcategory),
              occasions: inferOccasions(item.subcategory, usage),
              colorSeasons: inferColorSeasons(baseColour),
              bodyTypeFit: inferBodyTypeFit(item.subcategory),
            }
          },
        });
        updated++;
      } catch (e) {
        // Skip errors
      }
    }

    if ((i + batchSize) % 2000 === 0 || i + batchSize >= items.length) {
      console.log(`Enhanced ${Math.min(i + batchSize, items.length)} / ${items.length} items...`);
    }
  }

  console.log(`\nEnhancement complete! Updated ${updated} items.`);

  const sample = await prisma.clothingItem.findFirst({
    where: { externalId: { not: null } },
    select: { name: true, attributes: true },
  });

  if (sample) {
    const attrs = sample.attributes as Record<string, unknown>;
    console.log(`\nSample: ${sample.name}`);
    console.log(`  style: ${JSON.stringify(attrs?.style)}`);
    console.log(`  occasions: ${JSON.stringify(attrs?.occasions)}`);
  }

  await prisma.$disconnect();
  console.log("\nDone!");
}

main().catch(e => { console.error("Failed:", e); process.exit(1); });
