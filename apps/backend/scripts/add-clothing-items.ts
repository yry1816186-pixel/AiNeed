import { PrismaClient, ClothingCategory, PriceRange } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Upserting 3 new brands...');

  const hm = await prisma.brand.upsert({
    where: { slug: 'hm' },
    update: {},
    create: {
      name: 'H&M',
      slug: 'hm',
      description: '瑞典快时尚品牌，提供时尚平价服饰',
      website: 'https://www.hm.com',
      categories: ['tops', 'bottoms', 'dresses', 'outerwear'],
      priceRange: PriceRange.budget,
    },
  });

  const adidas = await prisma.brand.upsert({
    where: { slug: 'adidas' },
    update: {},
    create: {
      name: 'Adidas',
      slug: 'adidas',
      description: '德国运动品牌，经典三叶草标志',
      website: 'https://www.adidas.com',
      categories: ['activewear', 'footwear', 'accessories'],
      priceRange: PriceRange.mid_range,
    },
  });

  const gap = await prisma.brand.upsert({
    where: { slug: 'gap' },
    update: {},
    create: {
      name: 'GAP',
      slug: 'gap',
      description: '美国休闲服饰品牌，经典美式风格',
      website: 'https://www.gap.com',
      categories: ['tops', 'bottoms', 'outerwear'],
      priceRange: PriceRange.mid_range,
    },
  });

  console.log(`Brands ready: H&M=${hm.id}, Adidas=${adidas.id}, GAP=${gap.id}`);

  console.log('Creating 6 new clothing items...');

  const items = await Promise.all([
    prisma.clothingItem.create({
      data: {
        brandId: hm.id,
        name: '花卉印花连衣裙',
        description: '花卉印花设计，中长款连衣裙，适合春夏穿着',
        sku: 'HM-DRESS-001',
        category: ClothingCategory.dresses,
        subcategory: 'midi',
        colors: ['蓝色', '白色'],
        sizes: ['XS', 'S', 'M', 'L'],
        tags: ['连衣裙', '印花', '夏季'],
        price: 349,
        stock: 25,
        images: ['https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800'],
        externalUrl: 'https://www.hm.com/cn/zh_cn/productpage.1132049001.html',
      },
    }),
    prisma.clothingItem.create({
      data: {
        brandId: adidas.id,
        name: 'Ultraboost Light跑鞋',
        description: 'Boost中底科技，轻盈缓震，适合日常跑步',
        sku: 'ADIDAS-ULTRABOOST-001',
        category: ClothingCategory.footwear,
        subcategory: 'sneakers',
        colors: ['黑色', '白色'],
        sizes: ['38', '39', '40', '41', '42', '43'],
        tags: ['跑鞋', '运动', 'Boost'],
        price: 1299,
        stock: 18,
        images: ['https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800'],
        externalUrl: 'https://www.adidas.com.cn/product/ultraboost-light-running-shoes/HP6753.html',
      },
    }),
    prisma.clothingItem.create({
      data: {
        brandId: gap.id,
        name: '经典圆领卫衣',
        description: '柔软棉质面料，经典圆领设计，百搭休闲',
        sku: 'GAP-HOODIE-001',
        category: ClothingCategory.tops,
        subcategory: 'hoodies',
        colors: ['灰色', '藏青色', '黑色'],
        sizes: ['S', 'M', 'L', 'XL'],
        tags: ['卫衣', '休闲', '基础款'],
        price: 299,
        stock: 30,
        images: ['https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800'],
        externalUrl: 'https://www.gap.com/browse/product.do?pid=612016002',
      },
    }),
    prisma.clothingItem.create({
      data: {
        brandId: hm.id,
        name: '双排扣西装外套',
        description: '经典双排扣设计，修身版型，通勤必备',
        sku: 'HM-BLAZER-001',
        category: ClothingCategory.outerwear,
        subcategory: 'blazers',
        colors: ['黑色', '米色'],
        sizes: ['XS', 'S', 'M', 'L'],
        tags: ['西装', '通勤', '外套'],
        price: 599,
        stock: 15,
        images: ['https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800'],
        externalUrl: 'https://www.hm.com/cn/zh_cn/productpage.1098356001.html',
      },
    }),
    prisma.clothingItem.create({
      data: {
        brandId: adidas.id,
        name: '三叶草经典T恤',
        description: '经典三叶草Logo，纯棉面料，舒适透气',
        sku: 'ADIDAS-TEE-001',
        category: ClothingCategory.tops,
        subcategory: 'tshirts',
        colors: ['白色', '黑色'],
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        tags: ['T恤', '运动', '经典'],
        price: 299,
        stock: 35,
        images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800'],
        externalUrl: 'https://www.adidas.com.cn/product/Originals_Trefoil_Tee/DT8960.html',
      },
    }),
    prisma.clothingItem.create({
      data: {
        brandId: gap.id,
        name: '1969直筒牛仔裤',
        description: 'GAP经典1969系列，直筒版型，舒适耐穿',
        sku: 'GAP-JEANS-001',
        category: ClothingCategory.bottoms,
        subcategory: 'jeans',
        colors: ['深蓝色', '浅蓝色'],
        sizes: ['26', '28', '30', '32', '34'],
        tags: ['牛仔裤', '直筒', '经典'],
        price: 449,
        stock: 22,
        images: ['https://images.unsplash.com/photo-1542272604-787c3835535d?w=800'],
        externalUrl: 'https://www.gap.com/browse/product.do?pid=544813002',
      },
    }),
  ]);

  console.log(`Created ${items.length} clothing items:`);
  items.forEach((item) => {
    console.log(`  - ${item.sku}: ${item.name} (price: ${item.price})`);
  });

  const totalCount = await prisma.clothingItem.count({ where: { isDeleted: false } });
  console.log(`\nTotal catalog size: ${totalCount} items`);
}

main()
  .catch((e) => {
    console.error('Failed to add clothing items:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
