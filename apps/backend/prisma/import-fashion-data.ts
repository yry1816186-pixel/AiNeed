import { PrismaClient, ClothingCategory, PriceRange, Prisma } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

interface BrandData {
  name: string;
  slug: string;
  priceRange: string;
  categories: string[];
  productCount: number;
}

interface ProductData {
  externalId: string;
  name: string;
  brandName: string;
  category: string;
  subcategory: string;
  colors: string[];
  tags: string[];
  price: number;
  currency: string;
  hasImage: boolean;
  attributes: Record<string, unknown>;
}

const CATEGORY_MAP: Record<string, ClothingCategory> = {
  tops: ClothingCategory.tops,
  bottoms: ClothingCategory.bottoms,
  dresses: ClothingCategory.dresses,
  outerwear: ClothingCategory.outerwear,
  footwear: ClothingCategory.footwear,
  accessories: ClothingCategory.accessories,
  activewear: ClothingCategory.activewear,
  swimwear: ClothingCategory.swimwear,
};

const PRICE_RANGE_MAP: Record<string, PriceRange> = {
  budget: PriceRange.budget,
  mid_range: PriceRange.mid_range,
  premium: PriceRange.premium,
  luxury: PriceRange.luxury,
};

async function clearExistingData() {
  console.log("Clearing existing clothing data...");
  
  const deleteResult = await prisma.clothingItem.deleteMany({
    where: { externalId: { not: null } }
  });
  console.log(`Deleted ${deleteResult.count} existing clothing items`);
  
  await prisma.brand.deleteMany({
    where: { products: { none: {} } }
  });
}

async function importBrands(brands: BrandData[]): Promise<Map<string, string>> {
  console.log(`\nImporting ${brands.length} brands (batch)...`);
  
  const brandIdMap = new Map<string, string>();
  
  const existingBrands = await prisma.brand.findMany({
    select: { id: true, name: true, slug: true }
  });
  
  for (const brand of existingBrands) {
    brandIdMap.set(brand.name, brand.id);
  }
  
  const newBrands = brands.filter(b => !brandIdMap.has(b.name));
  
  if (newBrands.length > 0) {
    await prisma.brand.createMany({
      data: newBrands.map(brand => ({
        name: brand.name,
        slug: brand.slug,
        priceRange: PRICE_RANGE_MAP[brand.priceRange] || PriceRange.mid_range,
        categories: brand.categories,
        isActive: true,
      })),
      skipDuplicates: true,
    });
    
    const createdBrands = await prisma.brand.findMany({
      where: { name: { in: newBrands.map(b => b.name) } },
      select: { id: true, name: true }
    });
    
    for (const brand of createdBrands) {
      brandIdMap.set(brand.name, brand.id);
    }
  }
  
  console.log(`Brands: ${newBrands.length} created, ${existingBrands.length} existing`);
  return brandIdMap;
}

async function importProducts(products: ProductData[], brandIdMap: Map<string, string>) {
  console.log(`\nImporting ${products.length} products (batch)...`);
  
  const existingExternalIds = new Set<string>();
  const existingItems = await prisma.clothingItem.findMany({
    where: { externalId: { not: null } },
    select: { externalId: true }
  });
  for (const item of existingItems) {
    if (item.externalId) existingExternalIds.add(item.externalId);
  }
  
  const newProducts = products.filter(p => !existingExternalIds.has(p.externalId));
  
  console.log(`New products to import: ${newProducts.length}`);
  
  const BATCH_SIZE = 500;
  let created = 0;
  
  for (let i = 0; i < newProducts.length; i += BATCH_SIZE) {
    const batch = newProducts.slice(i, i + BATCH_SIZE);
    
    const data = batch.map(product => ({
      name: product.name.substring(0, 200),
      description: product.name,
      brandId: brandIdMap.get(product.brandName) || null,
      category: CATEGORY_MAP[product.category] || ClothingCategory.tops,
      subcategory: product.subcategory || null,
      colors: product.colors,
      sizes: ["S", "M", "L", "XL"],
      tags: product.tags.slice(0, 10),
      price: product.price,
      currency: product.currency,
      stock: Math.floor(Math.random() * 100) + 10,
      images: product.hasImage ? [`${product.externalId}.jpg`] : [],
      mainImage: product.hasImage ? `${product.externalId}.jpg` : null,
      externalId: product.externalId,
      attributes: JSON.parse(JSON.stringify(product.attributes)) as Prisma.InputJsonValue,
      isActive: true,
    }));
    
    try {
      await prisma.clothingItem.createMany({
        data,
        skipDuplicates: true,
      });
      created += batch.length;
      
      if ((i + BATCH_SIZE) % 5000 === 0 || i + BATCH_SIZE >= newProducts.length) {
        console.log(`  Imported ${Math.min(i + BATCH_SIZE, newProducts.length)} / ${newProducts.length} products...`);
      }
    } catch (error) {
      console.error(`  Batch error at ${i}:`, error);
    }
  }
  
  console.log(`Products: ${created} created`);
  return created;
}

async function main() {
  console.log("=".repeat(60));
  console.log("Fashion Dataset Import to Database (Optimized Batch)");
  console.log("=".repeat(60));
  
  const dataDir = __dirname;
  const brandsFile = path.join(dataDir, "import_brands.json");
  const productsFile = path.join(dataDir, "import_products.json");
  
  if (!fs.existsSync(brandsFile) || !fs.existsSync(productsFile)) {
    console.error("ERROR: Import files not found!");
    console.error("Please run: python prisma/import-fashion-dataset.py");
    process.exit(1);
  }
  
  console.log("\nLoading import data...");
  const brands: BrandData[] = JSON.parse(fs.readFileSync(brandsFile, "utf-8"));
  const products: ProductData[] = JSON.parse(fs.readFileSync(productsFile, "utf-8"));
  
  console.log(`Loaded ${brands.length} brands and ${products.length} products`);
  
  await clearExistingData();
  
  const brandIdMap = await importBrands(brands);
  
  await importProducts(products, brandIdMap);
  
  console.log("\n" + "=".repeat(60));
  console.log("Import Complete!");
  console.log("=".repeat(60));
  
  const totalItems = await prisma.clothingItem.count();
  const totalBrands = await prisma.brand.count();
  
  console.log(`\nDatabase now contains:`);
  console.log(`  - ${totalBrands} brands`);
  console.log(`  - ${totalItems} clothing items`);
  
  const categoryCounts = await prisma.clothingItem.groupBy({
    by: ['category'],
    _count: true
  });
  
  console.log("\nItems by category:");
  for (const { category, _count } of categoryCounts) {
    console.log(`  - ${category}: ${_count}`);
  }
  
  await prisma.$disconnect();
  console.log("\nDone!");
}

main().catch((e) => {
  console.error("Import failed:", e);
  process.exit(1);
});
