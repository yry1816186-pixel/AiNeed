import { PrismaClient, Gender, BodyType, SkinTone, FaceShape, ColorSeason, ClothingCategory, PriceRange, PhotoType, AnalysisStatus, CustomizationType, CustomizationStatus } from '@prisma/client';
import { hash } from '../src/common/security/bcrypt';

const prisma = new PrismaClient();

const OFFICIAL_PURCHASE_URLS_BY_SKU: Record<string, string> = {
  'ZARA-BLAZER-001':
    'https://www.zara.cn/cn/zh/%E5%AE%BD%E6%9D%BE%E7%89%88%E5%9E%8B%E4%BC%91%E9%97%B2%E8%A5%BF%E8%A3%85%E5%A4%96%E5%A5%97-p06861209.html',
  'ZARA-PANTS-001':
    'https://www.zara.cn/cn/zh/%E9%AB%98%E8%85%B0%E9%98%94%E8%85%BF%E8%A3%A4-p02405590.html',
  'UNIQLO-HEATTECH-001': 'https://www.uniqlo.cn/c/3wheattech.html',
  'UNIQLO-UTEE-001': 'https://www.uniqlo.com/us/en/products/E455758-001/00',
  'NIKE-AIRMAX-001': 'https://www.nike.com/t/air-max-270-mens-shoes-KkLcGR',
  'COS-DRESS-001':
    'https://www.cos.com/en-us/women/womenswear/dresses/sleeveless-dresses/product/circle-cut-knitted-mini-dress-white-1285099001',
  'COS-SKIRT-001':
    'https://www.cos.com/en-us/women/womenswear/skirts/midlength/product/pleated-knitted-midi-skirt-black-1214947001',
  'MD-COAT-001': 'https://www.massimodutti.com/us/wool-blend-coat-l02891381',
  'ZARA-SKIRT-002':
    'https://www.zara.cn/cn/zh/zw-%E7%B3%BB%E5%88%97%E4%B8%9D%E7%BC%8E%E8%B4%A8%E6%84%9F%E8%95%BE%E4%B8%9D%E5%8D%8A%E8%BA%AB%E8%A3%99-p05919211.html',
  'NIKE-P6000-001': 'https://www.nike.com/t/p-6000-shoes-XkgpKW/CD6404-002',
  'UNIQLO-CARDIGAN-001': 'https://www.uniqlo.com/us/en/products/E441478-000/',
  'COS-CARDIGAN-001':
    'https://www.cos.com/en_usd/women/womenswear/knitwear/product.wool-crew-neck-cardigan-white.1211698002.html',
};

function buildPurchaseSourceUrl(
  sku?: string | null,
  brandName?: string | null,
  itemName?: string | null,
): string | null {
  if (sku && OFFICIAL_PURCHASE_URLS_BY_SKU[sku]) {
    return OFFICIAL_PURCHASE_URLS_BY_SKU[sku];
  }

  const query = [brandName?.trim(), itemName?.trim()].filter(Boolean).join(' ').trim();

  if (!query) {
    return null;
  }

  return `https://search.jd.com/Search?keyword=${encodeURIComponent(query)}`;
}

async function main() {
  console.log('开始填充测试数据...');

  const hashedPassword = await hash('Test123456!');

  console.log('创建测试用户...');
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      password: hashedPassword,
      nickname: '测试用户',
      phone: '13800138000',
      gender: Gender.female,
      birthDate: new Date('1995-06-15'),
      profile: {
        create: {
          bodyType: BodyType.hourglass,
          skinTone: SkinTone.medium,
          faceShape: FaceShape.oval,
          colorSeason: ColorSeason.autumn,
          height: 165,
          weight: 55,
          shoulder: 38,
          bust: 86,
          waist: 68,
          hip: 90,
          stylePreferences: ['casual', 'elegant', 'minimalist'],
          colorPreferences: ['black', 'white', 'beige', 'navy'],
        },
      },
    },
  });

  console.log('创建品牌数据...');
  const brands = await Promise.all([
    prisma.brand.upsert({
      where: { slug: 'zara' },
      update: {},
      create: {
        name: 'ZARA',
        slug: 'zara',
        description: '西班牙快时尚品牌，提供最新潮流服饰',
        website: 'https://www.zara.com',
        categories: ['tops', 'bottoms', 'dresses', 'outerwear'],
        priceRange: PriceRange.mid_range,
      },
    }),
    prisma.brand.upsert({
      where: { slug: 'uniqlo' },
      update: {},
      create: {
        name: 'UNIQLO',
        slug: 'uniqlo',
        description: '日本休闲服饰品牌，注重基础款与舒适度',
        website: 'https://www.uniqlo.com',
        categories: ['tops', 'bottoms', 'outerwear', 'activewear'],
        priceRange: PriceRange.budget,
      },
    }),
    prisma.brand.upsert({
      where: { slug: 'massimo-dutti' },
      update: {},
      create: {
        name: 'Massimo Dutti',
        slug: 'massimo-dutti',
        description: '西班牙高端休闲品牌，优雅精致',
        website: 'https://www.massimodutti.com',
        categories: ['tops', 'bottoms', 'dresses', 'outerwear'],
        priceRange: PriceRange.premium,
      },
    }),
    prisma.brand.upsert({
      where: { slug: 'cos' },
      update: {},
      create: {
        name: 'COS',
        slug: 'cos',
        description: 'H&M旗下高端品牌，极简主义设计',
        website: 'https://www.cos.com',
        categories: ['tops', 'bottoms', 'dresses', 'outerwear'],
        priceRange: PriceRange.premium,
      },
    }),
    prisma.brand.upsert({
      where: { slug: 'nike' },
      update: {},
      create: {
        name: 'Nike',
        slug: 'nike',
        description: '全球领先的运动品牌',
        website: 'https://www.nike.com',
        categories: ['activewear', 'footwear', 'accessories'],
        priceRange: PriceRange.mid_range,
      },
    }),
  ]);

  console.log('创建服装商品数据...');
  
  const productImages = {
    blazer: [
      'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
    ],
    heattech: [
      'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800',
    ],
    coat: [
      'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800',
      'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=800',
    ],
    dress: [
      'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800',
    ],
    pants: [
      'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800',
    ],
    sneakers: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
    ],
    shirt: [
      'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800',
    ],
    sweater: [
      'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800',
    ],
    skirt: [
      'https://images.unsplash.com/photo-1577900232427-18219b9166a0?w=800',
    ],
    jacket: [
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800',
    ],
  };

  const clothingItems = await Promise.all([
    prisma.clothingItem.create({
      data: {
        brandId: brands[0].id,
        name: '宽松版型西装外套',
        description: '经典西装外套，宽松版型，适合日常通勤',
        sku: 'ZARA-BLAZER-001',
        category: ClothingCategory.outerwear,
        subcategory: 'blazers',
        colors: ['黑色', '米色', '灰色'],
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        tags: ['通勤', '西装', '外套', '职场'],
        price: 799,
        originalPrice: 999,
        stock: 20,
        images: productImages.blazer,
        isFeatured: true,
      },
    }),
    prisma.clothingItem.create({
      data: {
        brandId: brands[1].id,
        name: 'HEATTECH保暖内衣套装',
        description: '轻薄保暖，吸湿发热，冬季必备',
        sku: 'UNIQLO-HEATTECH-001',
        category: ClothingCategory.tops,
        subcategory: 'basics',
        colors: ['白色', '黑色', '灰色'],
        sizes: ['S', 'M', 'L', 'XL'],
        tags: ['保暖', '内衣', '冬季', '基础款'],
        price: 199,
        stock: 40,
        images: productImages.heattech,
      },
    }),
    prisma.clothingItem.create({
      data: {
        brandId: brands[2].id,
        name: '羊绒混纺大衣',
        description: '优质羊绒混纺面料，经典双排扣设计',
        sku: 'MD-COAT-001',
        category: ClothingCategory.outerwear,
        subcategory: 'coats',
        colors: ['驼色', '黑色', '藏青色'],
        sizes: ['XS', 'S', 'M', 'L'],
        tags: ['大衣', '羊绒', '冬季', '高端'],
        price: 2999,
        originalPrice: 3999,
        stock: 12,
        images: productImages.coat,
        isFeatured: true,
      },
    }),
    prisma.clothingItem.create({
      data: {
        brandId: brands[3].id,
        name: '针织连衣裙',
        description: '极简设计，优质针织面料，优雅百搭',
        sku: 'COS-DRESS-001',
        category: ClothingCategory.dresses,
        subcategory: 'knitted',
        colors: ['黑色', '米色'],
        sizes: ['XS', 'S', 'M', 'L'],
        tags: ['连衣裙', '针织', '极简', '优雅'],
        price: 1290,
        stock: 16,
        images: productImages.dress,
        isFeatured: true,
      },
    }),
    prisma.clothingItem.create({
      data: {
        brandId: brands[0].id,
        name: '高腰阔腿裤',
        description: '高腰设计拉长腿部线条，舒适阔腿版型',
        sku: 'ZARA-PANTS-001',
        category: ClothingCategory.bottoms,
        subcategory: 'trousers',
        colors: ['黑色', '白色', '卡其色'],
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        tags: ['裤子', '高腰', '阔腿', '通勤'],
        price: 499,
        stock: 24,
        images: productImages.pants,
      },
    }),
    prisma.clothingItem.create({
      data: {
        brandId: brands[4].id,
        name: 'Air Max 270运动鞋',
        description: '经典Air Max气垫，舒适缓震',
        sku: 'NIKE-AIRMAX-001',
        category: ClothingCategory.footwear,
        subcategory: 'sneakers',
        colors: ['黑白', '纯白', '黑红'],
        sizes: ['36', '37', '38', '39', '40', '41'],
        tags: ['运动鞋', '气垫', '休闲', '经典'],
        price: 1099,
        stock: 18,
        images: productImages.sneakers,
        isFeatured: true,
      },
    }),
    prisma.clothingItem.create({
      data: {
        brandId: brands[1].id,
        name: 'U系列棉质T恤',
        description: '优质棉质，经典圆领设计',
        sku: 'UNIQLO-UTEE-001',
        category: ClothingCategory.tops,
        subcategory: 'tshirts',
        colors: ['白色', '黑色', '灰色', '藏青色'],
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        tags: ['T恤', '基础款', '棉质', '日常'],
        price: 79,
        originalPrice: 99,
        stock: 60,
        images: productImages.shirt,
      },
    }),
    prisma.clothingItem.create({
      data: {
        brandId: brands[3].id,
        name: '褶皱半身裙',
        description: '精致褶皱设计，高腰版型',
        sku: 'COS-SKIRT-001',
        category: ClothingCategory.bottoms,
        subcategory: 'skirts',
        colors: ['黑色', '米色'],
        sizes: ['XS', 'S', 'M', 'L'],
        tags: ['半身裙', '褶皱', '优雅', '通勤'],
        price: 890,
        stock: 14,
        images: productImages.skirt,
      },
    }),
  ]);

  console.log('创建用户照片...');
  const additionalClothingItems = await Promise.all([
    prisma.clothingItem.create({
      data: {
        brandId: brands[0].id,
        name: 'ZW系列丝缎质感蕾丝半身裙',
        description: '丝缎质感中腰短裙，不对称下摆，饰有同色系蕾丝。',
        sku: 'ZARA-SKIRT-002',
        category: ClothingCategory.bottoms,
        subcategory: 'skirts',
        colors: ['深灰色'],
        sizes: ['XS', 'S', 'M', 'L'],
        tags: ['半身裙', '丝缎', '蕾丝', '时装'],
        price: 399,
        stock: 18,
        images: productImages.skirt,
      },
    }),
    prisma.clothingItem.create({
      data: {
        brandId: brands[4].id,
        name: 'Nike P-6000运动鞋',
        description: '复古跑鞋灵感与现代缓震结合，兼顾透气和日常舒适。',
        sku: 'NIKE-P6000-001',
        category: ClothingCategory.footwear,
        subcategory: 'sneakers',
        colors: ['黑色', '银白色'],
        sizes: ['36', '37', '38', '39', '40', '41', '42'],
        tags: ['运动鞋', '复古跑鞋', '缓震', '日常'],
        price: 829,
        stock: 22,
        images: productImages.sneakers,
      },
    }),
    prisma.clothingItem.create({
      data: {
        brandId: brands[1].id,
        name: '轻型V领开衫',
        description: '轻薄针织开衫，适合空调房和换季叠穿。',
        sku: 'UNIQLO-CARDIGAN-001',
        category: ClothingCategory.tops,
        subcategory: 'cardigans',
        colors: ['米色', '浅蓝色', '橙色'],
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        tags: ['开衫', '轻薄', '针织', '日常'],
        price: 199,
        stock: 35,
        images: productImages.sweater,
      },
    }),
    prisma.clothingItem.create({
      data: {
        brandId: brands[3].id,
        name: '羊毛圆领开衫',
        description: '经典圆领开衫，适合作为换季基础层。',
        sku: 'COS-CARDIGAN-001',
        category: ClothingCategory.tops,
        subcategory: 'cardigans',
        colors: ['白色', '黑色', '条纹'],
        sizes: ['XS', 'S', 'M', 'L'],
        tags: ['开衫', '羊毛', '极简', '通勤'],
        price: 890,
        stock: 16,
        images: productImages.sweater,
      },
    }),
  ]);

  const allClothingItems = [...clothingItems, ...additionalClothingItems];

  const createdClothingItems = await prisma.clothingItem.findMany({
    where: {
      id: {
        in: allClothingItems.map((item) => item.id),
      },
    },
    include: {
      brand: true,
    },
  });

  await Promise.all(
    createdClothingItems.map((item) =>
      prisma.clothingItem.update({
        where: { id: item.id },
        data: {
          externalUrl:
            item.externalUrl ??
            buildPurchaseSourceUrl(item.sku, item.brand?.name, item.name),
        },
      }),
    ),
  );

  const userPhoto = await prisma.userPhoto.create({
    data: {
      userId: testUser.id,
      type: PhotoType.full_body,
      url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800',
      thumbnailUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200',
      originalName: 'full_body.jpg',
      mimeType: 'image/jpeg',
      size: 1024000,
      analysisResult: {
        bodyType: 'hourglass',
        skinTone: 'medium',
        faceShape: 'oval',
        colorSeason: 'autumn',
        measurements: {
          shoulder: 38,
          bust: 86,
          waist: 68,
          hip: 90,
        },
        recommendations: ['高腰裤', 'A字裙', 'V领上衣'],
      },
      analysisStatus: AnalysisStatus.completed,
      analyzedAt: new Date(),
    },
  });

  console.log('创建收藏记录...');
  await prisma.favorite.createMany({
    data: [
      { userId: testUser.id, itemId: clothingItems[0].id },
      { userId: testUser.id, itemId: clothingItems[2].id },
      { userId: testUser.id, itemId: clothingItems[3].id },
    ],
    skipDuplicates: true,
  });

  console.log('创建虚拟试穿记录...');
  await prisma.virtualTryOn.create({
    data: {
      userId: testUser.id,
      photoId: userPhoto.id,
      itemId: clothingItems[0].id,
      status: 'completed',
      resultImageUrl: 'https://example.com/tryon/result-1.jpg',
      completedAt: new Date(),
    },
  });

  console.log('创建定制服务请求...');
  const customizationRequest = await prisma.customizationRequest.create({
    data: {
      userId: testUser.id,
      type: CustomizationType.tailored,
      title: '定制西装套装',
      description: '希望定制一套深蓝色西装，用于正式场合。需要修身版型，肩宽合适。',
      referenceImages: ['https://example.com/custom/ref-1.jpg'],
      preferences: {
        color: '深蓝色',
        fabric: '羊毛混纺',
        style: '修身',
        occasions: ['商务', '正式场合'],
      },
      status: CustomizationStatus.quoting,
    },
  });

  console.log('创建定制报价...');
  await prisma.customizationQuote.createMany({
    data: [
      {
        requestId: customizationRequest.id,
        providerId: 'provider-001',
        providerName: '高级定制工坊',
        providerLogo: 'https://example.com/providers/logo-1.jpg',
        price: 5800,
        currency: 'CNY',
        estimatedDays: 21,
        description: '采用意大利进口面料，资深裁缝手工制作，包含两次试穿调整。',
        terms: '定金50%，完工后支付余款',
      },
      {
        requestId: customizationRequest.id,
        providerId: 'provider-002',
        providerName: '城市裁缝',
        providerLogo: 'https://example.com/providers/logo-2.jpg',
        price: 3200,
        currency: 'CNY',
        estimatedDays: 14,
        description: '国产优质面料，专业团队制作，包含一次试穿调整。',
        terms: '定金30%，完工后支付余款',
      },
    ],
  });

  console.log('创建搜索历史...');
  await prisma.searchHistory.createMany({
    data: [
      { userId: testUser.id, query: '西装外套', results: 24 },
      { userId: testUser.id, query: '高腰裤', results: 18 },
      { userId: testUser.id, query: '羊绒大衣', results: 12 },
    ],
  });

  console.log('\n✅ 测试数据填充完成！');
  console.log('\n测试账户信息:');
  console.log('  邮箱: test@example.com');
  console.log('  密码: Test123456!');
  console.log('\n创建的数据:');
  console.log(`  - ${brands.length} 个品牌`);
  console.log(`  - ${clothingItems.length} 件服装`);
  console.log(`  - 1 张用户照片`);
  console.log(`  - 3 条收藏记录`);
  console.log(`  - 1 条试穿记录`);
  console.log(`  - 1 个定制请求（含2个报价）`);
}

main()
  .catch((e) => {
    console.error('填充数据失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
