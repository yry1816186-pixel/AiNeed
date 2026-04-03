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
  "Innerwear": ["daily"],
  "Saree": ["wedding", "festival", "traditional", "special"],
  "Kurtas": ["festival", "traditional", "casual", "work"],
  "Shirts": ["work", "daily", "formal", "business"],
  "Tshirts": ["casual", "weekend", "daily", "sports"],
  "Jeans": ["casual", "daily", "weekend"],
  "Tops": ["daily", "casual", "weekend", "party"],
  "Sweatshirts": ["casual", "weekend", "sports", "winter"],
  "Shorts": ["casual", "weekend", "sports", "summer"],
  "Track Pants": ["sports", "gym", "casual", "weekend"],
  "Jackets": ["winter", "casual", "outdoor", "travel"],
  "Waistcoat": ["formal", "party", "wedding", "special"],
  "Rain Jacket": ["outdoor", "travel", "rainy"],
  "Shoes": ["daily", "work", "casual"],
  "Sandals": ["casual", "summer", "daily", "beach"],
  "Flip Flops": ["casual", "summer", "beach", "home"],
  "Sports Shoes": ["sports", "gym", "running", "outdoor"],
  "Formal Shoes": ["work", "formal", "business"],
  "Casual Shoes": ["casual", "daily", "weekend"],
  "Heels": ["party", "evening", "date", "formal"],
  "Flats": ["daily", "casual", "work", "comfortable"],
  "Watches": ["daily", "work", "casual", "formal"],
  "Bags": ["daily", "work", "travel", "casual"],
  "Handbags": ["daily", "work", "casual", "party"],
  "Belts": ["daily", "work", "formal"],
  "Sunglasses": ["casual", "summer", "outdoor", "beach"],
  "Jewellery": ["party", "wedding", "special", "evening"],
  "Scarves": ["winter", "casual", "formal", "accessory"],
  "Bracelet": ["casual", "party", "daily", "accessory"],
  "Lipstick": ["daily", "party", "evening", "makeup"],
  "Perfume": ["daily", "evening", "special"],
  "Deodorant": ["daily", "sports", "gym"],
};

const COLOR_TO_SEASONS: Record<string, string[]> = {
  "Navy Blue": ["winter", "autumn"],
  "Blue": ["summer", "spring"],
  "Black": ["winter", "autumn", "all-season"],
  "White": ["summer", "spring", "all-season"],
  "Grey": ["winter", "autumn", "all-season"],
  "Red": ["autumn", "winter", "all-season"],
  "Green": ["spring", "summer", "autumn"],
  "Brown": ["autumn", "winter"],
  "Beige": ["spring", "summer", "autumn"],
  "Pink": ["spring", "summer"],
  "Purple": ["autumn", "winter"],
  "Orange": ["autumn", "summer"],
  "Yellow": ["spring", "summer"],
  "Maroon": ["autumn", "winter"],
  "Teal": ["autumn", "winter"],
  "Khaki": ["spring", "summer", "autumn"],
  "Cream": ["spring", "summer"],
  "Gold": ["autumn", "winter", "party"],
  "Silver": ["winter", "party", "evening"],
  "Copper": ["autumn", "winter"],
  "Bronze": ["autumn", "winter"],
  "Multi": ["all-season"],
  "Off White": ["spring", "summer", "all-season"],
  "Turquoise": ["spring", "summer"],
  "Magenta": ["spring", "summer"],
  "Lavender": ["spring", "summer"],
  "Peach": ["spring", "summer"],
  "Rust": ["autumn", "winter"],
  "Olive": ["autumn", "winter"],
  "Mustard": ["autumn"],
  "Burgundy": ["autumn", "winter"],
  "Charcoal": ["winter", "autumn"],
  "Tan": ["spring", "summer", "autumn"],
  "Nude": ["all-season"],
  "Coral": ["spring", "summer"],
};

const BODY_TYPE_FIT: Record<string, string[]> = {
  "Topwear": ["rectangle", "inverted-triangle", "hourglass", "pear", "apple"],
  "Bottomwear": ["rectangle", "hourglass", "pear", "apple"],
  "Dresses": ["hourglass", "rectangle", "pear"],
  "Shirts": ["rectangle", "inverted-triangle", "hourglass"],
  "Tshirts": ["rectangle", "inverted-triangle", "hourglass", "pear", "apple"],
  "Jeans": ["rectangle", "hourglass", "pear"],
  "Tops": ["rectangle", "hourglass", "pear", "apple"],
  "Jackets": ["rectangle", "inverted-triangle", "hourglass", "pear", "apple"],
};

function inferStyles(usage: string | null, subcategory: string | null): string[] {
  const styles: string[] = [];
  if (usage && USAGE_TO_STYLE[usage]) styles.push(...USAGE_TO_STYLE[usage]);
  if (subcategory) {
    const sub = subcategory.toLowerCase();
    if (sub.includes("sports") || sub.includes("athletic")) styles.push("sporty", "athletic");
    if (sub.includes("formal")) styles.push("formal", "business");
    if (sub.includes("ethnic") || sub.includes("kurta")) styles.push("ethnic", "traditional");
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
    else if (u === "party") occasions.push("party", "evening", "date");
  }
  if (occasions.length === 0) occasions.push("daily", "casual");
  return [...new Set(occasions)];
}

function inferColorSeasons(baseColour: string | null): string[] {
  if (!baseColour) return ["all-season"];
  const normalized = baseColour.charAt(0).toUpperCase() + baseColour.slice(1).toLowerCase();
  if (COLOR_TO_SEASONS[normalized]) return COLOR_TO_SEASONS[normalized];
  for (const [color, seasons] of Object.entries(COLOR_TO_SEASONS)) {
    if (baseColour.toLowerCase().includes(color.toLowerCase()) || color.toLowerCase().includes(baseColour.toLowerCase())) {
      return seasons;
    }
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
  console.log("Clothing Data Enhancement Script (Fast Parallel)");
  console.log("=".repeat(60));

  const items = await prisma.clothingItem.findMany({
    where: { externalId: { not: null } },
    select: { id: true, subcategory: true, colors: true, attributes: true },
  });

  console.log(`Found ${items.length} items to enhance`);

  const PARALLEL_BATCH = 50;
  let updated = 0;

  for (let i = 0; i < items.length; i += PARALLEL_BATCH) {
    const batch = items.slice(i, i + PARALLEL_BATCH);
    
    const updates = batch.map(item => {
      const attrs = item.attributes as Record<string, unknown> || {};
      const usage = attrs.usage as string | null || null;
      const baseColour = attrs.baseColour as string | null || (item.colors?.[0] ?? null);
      
      const enhancedAttrs = {
        ...attrs,
        style: inferStyles(usage, item.subcategory),
        occasions: inferOccasions(item.subcategory, usage),
        colorSeasons: inferColorSeasons(baseColour),
        bodyTypeFit: inferBodyTypeFit(item.subcategory),
      };

      return prisma.clothingItem.update({
        where: { id: item.id },
        data: { attributes: enhancedAttrs },
      });
    });

    await Promise.all(updates);
    updated += batch.length;

    if (updated % 1000 === 0 || updated >= items.length) {
      console.log(`Enhanced ${updated} / ${items.length} items...`);
    }
  }

  console.log(`\nEnhancement complete! Updated ${updated} items.`);

  const samples = await prisma.clothingItem.findMany({
    where: { externalId: { not: null } },
    select: { name: true, category: true, colors: true, attributes: true },
    take: 3,
  });

  console.log("\nSample enhanced items:");
  for (const item of samples) {
    const attrs = item.attributes as Record<string, unknown>;
    console.log(`\n${item.name}`);
    console.log(`  Category: ${item.category}`);
    console.log(`  Colors: ${item.colors?.join(", ")}`);
    console.log(`  style: ${JSON.stringify(attrs?.style)}`);
    console.log(`  occasions: ${JSON.stringify(attrs?.occasions)}`);
    console.log(`  colorSeasons: ${JSON.stringify(attrs?.colorSeasons)}`);
    console.log(`  bodyTypeFit: ${JSON.stringify(attrs?.bodyTypeFit)}`);
  }

  await prisma.$disconnect();
  console.log("\nDone!");
}

main().catch(e => { console.error("Failed:", e); process.exit(1); });
