import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const colorData = [
  { name: "黑色", nameEn: "Black", hexCode: "#000000", colorFamily: "neutral", isNeutral: true },
  { name: "白色", nameEn: "White", hexCode: "#FFFFFF", colorFamily: "neutral", isNeutral: true },
  { name: "灰色", nameEn: "Gray", hexCode: "#808080", colorFamily: "neutral", isNeutral: true },
  { name: "米色", nameEn: "Beige", hexCode: "#F5F5DC", colorFamily: "neutral", isNeutral: true },
  { name: "驼色", nameEn: "Camel", hexCode: "#C19A6B", colorFamily: "neutral", isNeutral: true },
  { name: "深蓝", nameEn: "Navy", hexCode: "#000080", colorFamily: "neutral", isNeutral: true },
  {
    name: "藏青",
    nameEn: "Dark Navy",
    hexCode: "#1B1B3A",
    colorFamily: "neutral",
    isNeutral: true,
  },
  { name: "红色", nameEn: "Red", hexCode: "#FF0000", colorFamily: "warm", isNeutral: false },
  { name: "橙色", nameEn: "Orange", hexCode: "#FF8C00", colorFamily: "warm", isNeutral: false },
  { name: "黄色", nameEn: "Yellow", hexCode: "#FFD700", colorFamily: "warm", isNeutral: false },
  { name: "珊瑚色", nameEn: "Coral", hexCode: "#FF7F50", colorFamily: "warm", isNeutral: false },
  { name: "酒红", nameEn: "Burgundy", hexCode: "#800020", colorFamily: "warm", isNeutral: false },
  { name: "砖红", nameEn: "Brick Red", hexCode: "#CB4154", colorFamily: "warm", isNeutral: false },
  { name: "棕色", nameEn: "Brown", hexCode: "#8B4513", colorFamily: "warm", isNeutral: false },
  { name: "卡其色", nameEn: "Khaki", hexCode: "#C3B091", colorFamily: "warm", isNeutral: false },
  { name: "焦糖色", nameEn: "Caramel", hexCode: "#FFD59A", colorFamily: "warm", isNeutral: false },
  { name: "蓝色", nameEn: "Blue", hexCode: "#0000FF", colorFamily: "cool", isNeutral: false },
  { name: "天蓝", nameEn: "Sky Blue", hexCode: "#87CEEB", colorFamily: "cool", isNeutral: false },
  { name: "紫色", nameEn: "Purple", hexCode: "#800080", colorFamily: "cool", isNeutral: false },
  { name: "薰衣草", nameEn: "Lavender", hexCode: "#E6E6FA", colorFamily: "cool", isNeutral: false },
  { name: "粉红", nameEn: "Pink", hexCode: "#FFC0CB", colorFamily: "cool", isNeutral: false },
  {
    name: "薄荷绿",
    nameEn: "Mint Green",
    hexCode: "#98FF98",
    colorFamily: "cool",
    isNeutral: false,
  },
  { name: "湖蓝", nameEn: "Lake Blue", hexCode: "#1E90FF", colorFamily: "cool", isNeutral: false },
  { name: "翠绿", nameEn: "Emerald", hexCode: "#50C878", colorFamily: "cool", isNeutral: false },
  { name: "奶白色", nameEn: "Cream", hexCode: "#FFFDD0", colorFamily: "neutral", isNeutral: true },
  { name: "深灰", nameEn: "Charcoal", hexCode: "#36454F", colorFamily: "neutral", isNeutral: true },
  { name: "杏色", nameEn: "Apricot", hexCode: "#FBCEB1", colorFamily: "warm", isNeutral: false },
  { name: "铜色", nameEn: "Copper", hexCode: "#B87333", colorFamily: "warm", isNeutral: false },
  { name: "冰蓝", nameEn: "Ice Blue", hexCode: "#99FFFF", colorFamily: "cool", isNeutral: false },
  { name: "丁香紫", nameEn: "Lilac", hexCode: "#C8A2C8", colorFamily: "cool", isNeutral: false },
];

export async function seedColors(prisma: PrismaClient) {
  console.log("🎨 Seeding color standards...");

  const results = [];
  for (const color of colorData) {
    const record = await prisma.colorStandard.upsert({
      where: { name: color.name },
      update: {},
      create: color,
    });
    results.push(record);
  }

  console.log(`   ✅ ${results.length} color standards`);
  return results;
}

async function main() {
  await seedColors(prisma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
