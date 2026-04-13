// @ts-nocheck
import { PrismaClient, PriceRange } from '@prisma/client';

const brands = [
  {
    name: '寻裳Studio',
    slug: 'xuno-studio',
    description: '寻裳自营设计师品牌，融合AI科技与时尚美学',
    priceRange: PriceRange.mid_range,
    categories: ['tops', 'bottoms', 'dresses', 'outerwear', 'accessories'],
    logo: 'https://example.com/brands/xuno-studio.png',
    verified: true,
  },
  {
    name: 'ZARA',
    slug: 'zara',
    description: '西班牙快时尚品牌，提供最新潮流服饰',
    priceRange: PriceRange.mid_range,
    website: 'https://www.zara.cn',
    categories: ['tops', 'bottoms', 'dresses', 'outerwear', 'accessories', 'footwear'],
    logo: 'https://picsum.photos/seed/zara-logo/200/200',
    verified: true,
  },
  {
    name: 'UNIQLO',
    slug: 'uniqlo',
    description: '日本休闲服饰品牌，注重基础款与舒适度',
    priceRange: PriceRange.budget,
    website: 'https://www.uniqlo.cn',
    categories: ['tops', 'bottoms', 'outerwear', 'accessories', 'activewear'],
    logo: 'https://picsum.photos/seed/uniqlo-logo/200/200',
    verified: true,
  },
  {
    name: 'COS',
    slug: 'cos',
    description: 'H&M旗下高端品牌，极简主义设计',
    priceRange: PriceRange.premium,
    website: 'https://www.cos.cn',
    categories: ['tops', 'bottoms', 'dresses', 'outerwear', 'accessories'],
    logo: 'https://picsum.photos/seed/cos-logo/200/200',
    verified: true,
  },
  {
    name: 'Nike',
    slug: 'nike',
    description: '全球领先的运动品牌',
    priceRange: PriceRange.mid_range,
    website: 'https://www.nike.com',
    categories: ['activewear', 'footwear', 'tops', 'bottoms', 'accessories'],
    logo: 'https://picsum.photos/seed/nike-logo/200/200',
    verified: true,
  },
];

export async function seedBrands(prisma: PrismaClient): Promise<{ brands: any[], brandMap: Map<string, any> }> {
  const results = [];

  for (const brand of brands) {
    const result = await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: {
        name: brand.name,
        description: brand.description,
        priceRange: brand.priceRange,
        categories: brand.categories,
        website: brand.website ?? null,
        logo: brand.logo ?? null,
        verified: brand.verified ?? false,
      },
      create: {
        name: brand.name,
        slug: brand.slug,
        description: brand.description,
        priceRange: brand.priceRange,
        categories: brand.categories,
        website: brand.website ?? null,
        logo: brand.logo ?? null,
        verified: brand.verified ?? false,
      },
    });
    results.push(result);
  }

  const brandMap = new Map<string, any>();
  for (const brand of results) {
    brandMap.set(brand.slug, brand);
  }

  return { brands: results, brandMap };
}
