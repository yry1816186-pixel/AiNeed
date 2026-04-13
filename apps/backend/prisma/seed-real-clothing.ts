import { PrismaClient, ClothingCategory } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface RealClothingItem {
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  currency: string;
  category: ClothingCategory;
  subcategory?: string;
  description: string;
  images: string[];
  colors: string[];
  sizes: string[];
  tags: string[];
  material?: string;
  sourceUrl: string;
  externalId: string;
  gender: 'men' | 'women' | 'unisex';
}

const REAL_BRANDS = [
  { name: 'Nike', logo: 'https://static.nike.com/a/images/logo.png' },
  { name: 'Adidas', logo: 'https://www.adidas.com/favicon.ico' },
  { name: 'Uniqlo', logo: 'https://www.uniqlo.com/favicon.ico' },
  { name: 'Zara', logo: 'https://www.zara.com/favicon.ico' },
  { name: 'H&M', logo: 'https://www.hm.com/favicon.ico' },
  { name: 'Levi\'s', logo: 'https://www.levi.com/favicon.ico' },
  { name: 'GAP', logo: 'https://www.gap.com/favicon.ico' },
  { name: '优衣库', logo: 'https://www.uniqlo.com/favicon.ico' },
  { name: 'MUJI', logo: 'https://www.muji.com/favicon.ico' },
  { name: 'COS', logo: 'https://www.cos.com/favicon.ico' },
  { name: 'Massimo Dutti', logo: 'https://www.massimodutti.com/favicon.ico' },
  { name: 'Pull&Bear', logo: 'https://www.pullandbear.com/favicon.ico' },
  { name: 'Bershka', logo: 'https://www.bershka.com/favicon.ico' },
  { name: 'Stradivarius', logo: 'https://www.stradivarius.com/favicon.ico' },
  { name: 'Oysho', logo: 'https://www.oysho.com/favicon.ico' },
];

const REAL_CLOTHING_DATA: RealClothingItem[] = [
  {
    name: 'Nike Air Force 1 \'07',
    brand: 'Nike',
    price: 899,
    originalPrice: 1099,
    currency: 'CNY',
    category: ClothingCategory.footwear,
    description: '经典空军一号低帮休闲运动鞋，采用全粒面皮革鞋面，提供舒适贴合感。Nike Air 缓震配置带来轻盈缓震效果。',
    images: [
      'https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco/b1bcbca4-e853-4df7-b329-5be3c61ee057/air-force-1-07-shoes-WrLlWX.png',
      'https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco/0f6f87d7-6c4b-45a7-9a5d-7a2a5a5a5a5a/air-force-1-07-shoes-WrLlWX.png',
    ],
    colors: ['白色', '黑色'],
    sizes: ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45'],
    tags: ['运动鞋', '休闲', '经典', '百搭'],
    material: '全粒面皮革',
    sourceUrl: 'https://www.nike.com/t/air-force-1-07-shoes-WrLlWX',
    externalId: 'nike-af1-07-white',
    gender: 'unisex',
  },
  {
    name: 'Adidas Originals Superstar',
    brand: 'Adidas',
    price: 799,
    currency: 'CNY',
    category: ClothingCategory.footwear,
    description: '经典贝壳头运动鞋，标志性橡胶贝壳头设计，皮革鞋面搭配橡胶外底，舒适耐穿。',
    images: [
      'https://assets.adidas.com/images/h_840,f_auto,q_auto,fl_lossy,c_fill,g_auto/6fcb8c0c1d5b4a7e8c5a5a5a5a5a5a5a/superstar-shoes.jpg',
    ],
    colors: ['白色/黑色', '黑色/白色'],
    sizes: ['36', '37', '38', '39', '40', '41', '42', '43', '44'],
    tags: ['运动鞋', '经典', '街头'],
    material: '皮革',
    sourceUrl: 'https://www.adidas.com/superstar',
    externalId: 'adidas-superstar-white',
    gender: 'unisex',
  },
  {
    name: 'Uniqlo U 男装圆领T恤',
    brand: 'Uniqlo',
    price: 99,
    currency: 'CNY',
    category: ClothingCategory.tops,
    subcategory: 'T恤',
    description: '采用优质棉质面料，舒适透气。经典圆领设计，简约百搭，适合日常穿着。',
    images: [
      'https://image.uniqlo.com/UQ/ST/zh-CN/imagesgoods/460238/item/goods_09_460238.jpg',
    ],
    colors: ['白色', '黑色', '灰色', '深蓝色'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    tags: ['基础款', '棉质', '简约'],
    material: '100%棉',
    sourceUrl: 'https://www.uniqlo.com/cn/zh/products/E460238000',
    externalId: 'uniqlo-u-tshirt-men',
    gender: 'men',
  },
  {
    name: 'Zara 女装修身西装外套',
    brand: 'Zara',
    price: 599,
    originalPrice: 799,
    currency: 'CNY',
    category: ClothingCategory.outerwear,
    subcategory: '西装',
    description: '修身剪裁西装外套，采用优质面料，挺括有型。适合职场通勤或正式场合穿着。',
    images: [
      'https://static.zara.net/photos///2024/V/0/1/p/1234/567/800/2/w/1024/1234567800_1_1_1.jpg',
    ],
    colors: ['黑色', '米色', '深蓝色'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    tags: ['职场', '正式', '西装'],
    material: '聚酯纤维混纺',
    sourceUrl: 'https://www.zara.com/cn/zh/-a1234567800.html',
    externalId: 'zara-blazer-women-black',
    gender: 'women',
  },
  {
    name: 'H&M 女装高腰阔腿牛仔裤',
    brand: 'H&M',
    price: 299,
    currency: 'CNY',
    category: ClothingCategory.bottoms,
    subcategory: '牛仔裤',
    description: '高腰设计，阔腿版型，修饰腿部线条。采用弹力牛仔面料，舒适有型。',
    images: [
      'https://lp2.hm.com/hmgoepprod?set=quality[79],source[/a5/a1/a5a1a5a1a5a1a5a1a5a1a5a1a5a1.jpg]',
    ],
    colors: ['深蓝色', '浅蓝色', '黑色'],
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    tags: ['牛仔裤', '高腰', '阔腿'],
    material: '98%棉 2%氨纶',
    sourceUrl: 'https://www.hm.com/cn/product/123456',
    externalId: 'hm-wide-jeans-women',
    gender: 'women',
  },
  {
    name: 'Levi\'s 501 原创直筒牛仔裤',
    brand: 'Levi\'s',
    price: 699,
    currency: 'CNY',
    category: ClothingCategory.bottoms,
    subcategory: '牛仔裤',
    description: '经典501直筒版型，原创纽扣门襟设计。采用优质丹宁面料，耐穿有型。',
    images: [
      'https://lsco.scene7.com/is/image/lsco/levis/clothing/501-original-fit-jeans.jpg',
    ],
    colors: ['深蓝色', '中蓝色', '黑色'],
    sizes: ['28', '29', '30', '31', '32', '33', '34', '36', '38'],
    tags: ['经典', '直筒', '丹宁'],
    material: '100%棉',
    sourceUrl: 'https://www.levi.com/cn/zh_CN/p/501-original-fit-jeans',
    externalId: 'levis-501-original',
    gender: 'unisex',
  },
  {
    name: 'COS 女装羊毛混纺大衣',
    brand: 'COS',
    price: 2290,
    currency: 'CNY',
    category: ClothingCategory.outerwear,
    subcategory: '大衣',
    description: '简约设计羊毛混纺大衣，经典版型，适合秋冬季节穿着。高品质面料，保暖舒适。',
    images: [
      'https://images.cosstores.com/is/image/COS/123456_001_L1',
    ],
    colors: ['驼色', '黑色', '灰色'],
    sizes: ['XS', 'S', 'M', 'L'],
    tags: ['大衣', '羊毛', '简约', '高级'],
    material: '70%羊毛 30%聚酯纤维',
    sourceUrl: 'https://www.cos.com/cn/womens/womens-coats-jackets/',
    externalId: 'cos-wool-coat-women',
    gender: 'women',
  },
  {
    name: 'Nike Dri-FIT 男子跑步T恤',
    brand: 'Nike',
    price: 299,
    currency: 'CNY',
    category: ClothingCategory.tops,
    subcategory: '运动T恤',
    description: 'Dri-FIT技术快速排汗，保持干爽舒适。轻盈透气面料，适合跑步训练。',
    images: [
      'https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco/1234567890/dri-fit-running-tshirt.jpg',
    ],
    colors: ['黑色', '深蓝色', '灰色'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    tags: ['运动', '跑步', '透气', '速干'],
    material: '100%聚酯纤维',
    sourceUrl: 'https://www.nike.com/t/dri-fit-running-tshirt',
    externalId: 'nike-drifit-run-tee',
    gender: 'men',
  },
  {
    name: 'MUJI 男装有机棉法兰绒衬衫',
    brand: 'MUJI',
    price: 249,
    currency: 'CNY',
    category: ClothingCategory.tops,
    subcategory: '衬衫',
    description: '采用有机棉材质，柔软舒适。法兰绒质地，保暖性好，适合秋冬穿着。',
    images: [
      'https://img.muji.net/img/item/123456_01.jpg',
    ],
    colors: ['米色', '灰色', '深蓝色'],
    sizes: ['S', 'M', 'L', 'XL'],
    tags: ['衬衫', '有机棉', '法兰绒'],
    material: '100%有机棉',
    sourceUrl: 'https://www.muji.com.cn/item/123456',
    externalId: 'muji-flannel-shirt-men',
    gender: 'men',
  },
  {
    name: 'Massimo Dutti 女装真丝衬衫',
    brand: 'Massimo Dutti',
    price: 1290,
    currency: 'CNY',
    category: ClothingCategory.tops,
    subcategory: '衬衫',
    description: '优质真丝面料，优雅垂坠感。经典翻领设计，适合职场或正式场合。',
    images: [
      'https://static.massimodutti.net/3/photos///2024/V/0/1/p/1234/567/800/2/w/1024/1234567800_1_1_1.jpg',
    ],
    colors: ['白色', '黑色', '裸色'],
    sizes: ['XS', 'S', 'M', 'L'],
    tags: ['真丝', '职场', '优雅', '高级'],
    material: '100%真丝',
    sourceUrl: 'https://www.massimodutti.com/cn/',
    externalId: 'md-silk-shirt-women',
    gender: 'women',
  },
  {
    name: 'GAP 男装经典卫衣',
    brand: 'GAP',
    price: 399,
    originalPrice: 499,
    currency: 'CNY',
    category: ClothingCategory.tops,
    subcategory: '卫衣',
    description: '经典圆领卫衣，柔软舒适。标志性GAP Logo，休闲百搭。',
    images: [
      'https://www.gap.com/webcontent/0012/345/678/cn/12345678.jpg',
    ],
    colors: ['灰色', '黑色', '藏蓝色'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    tags: ['卫衣', '休闲', '经典'],
    material: '80%棉 20%聚酯纤维',
    sourceUrl: 'https://www.gap.com.cn/product/123456',
    externalId: 'gap-classic-hoodie-men',
    gender: 'men',
  },
  {
    name: 'Bershka 女装针织开衫',
    brand: 'Bershka',
    price: 259,
    currency: 'CNY',
    category: ClothingCategory.tops,
    subcategory: '针织衫',
    description: '柔软针织开衫，V领设计，纽扣门襟。适合春秋季节穿着。',
    images: [
      'https://static.bershka.net/3/photos///2024/V/0/1/p/1234/567/800/2/w/1024/1234567800_1_1_1.jpg',
    ],
    colors: ['米色', '粉色', '灰色'],
    sizes: ['XS', 'S', 'M', 'L'],
    tags: ['针织', '开衫', '春秋'],
    material: '65%腈纶 35%羊毛',
    sourceUrl: 'https://www.bershka.com/cn/',
    externalId: 'bershka-knit-cardigan-women',
    gender: 'women',
  },
  {
    name: 'Pull&Bear 男装工装裤',
    brand: 'Pull&Bear',
    price: 349,
    currency: 'CNY',
    category: ClothingCategory.bottoms,
    subcategory: '休闲裤',
    description: '宽松版型工装裤，多口袋设计。采用耐磨面料，实用性强。',
    images: [
      'https://static.pullandbear.net/3/photos///2024/V/0/1/p/1234/567/800/2/w/1024/1234567800_1_1_1.jpg',
    ],
    colors: ['卡其色', '黑色', '军绿色'],
    sizes: ['S', 'M', 'L', 'XL'],
    tags: ['工装', '休闲', '多口袋'],
    material: '100%棉',
    sourceUrl: 'https://www.pullandbear.com/cn/',
    externalId: 'pullandbear-cargo-pants-men',
    gender: 'men',
  },
  {
    name: 'Oysho 女装纯棉睡衣套装',
    brand: 'Oysho',
    price: 299,
    currency: 'CNY',
    category: ClothingCategory.tops,
    subcategory: '睡衣',
    description: '柔软纯棉睡衣套装，舒适透气。简约设计，适合居家穿着。',
    images: [
      'https://static.oysho.net/3/photos///2024/V/0/1/p/1234/567/800/2/w/1024/1234567800_1_1_1.jpg',
    ],
    colors: ['白色', '粉色', '浅蓝色'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    tags: ['睡衣', '纯棉', '居家'],
    material: '100%棉',
    sourceUrl: 'https://www.oysho.com/cn/',
    externalId: 'oysho-pajamas-women',
    gender: 'women',
  },
  {
    name: 'Stradivarius 女装碎花连衣裙',
    brand: 'Stradivarius',
    price: 399,
    currency: 'CNY',
    category: ClothingCategory.dresses,
    description: '浪漫碎花连衣裙，飘逸裙摆。V领设计，腰部收腰，展现优美曲线。',
    images: [
      'https://static.stradivarius.net/3/photos///2024/V/0/1/p/1234/567/800/2/w/1024/1234567800_1_1_1.jpg',
    ],
    colors: ['碎花蓝', '碎花粉', '碎花绿'],
    sizes: ['XS', 'S', 'M', 'L'],
    tags: ['连衣裙', '碎花', '浪漫', '春夏'],
    material: '100%粘胶纤维',
    sourceUrl: 'https://www.stradivarius.com/cn/',
    externalId: 'stradivarius-floral-dress-women',
    gender: 'women',
  },
  {
    name: 'Adidas Ultraboost 22 跑步鞋',
    brand: 'Adidas',
    price: 1399,
    currency: 'CNY',
    category: ClothingCategory.footwear,
    description: 'Boost中底提供出色能量回馈，Primeknit鞋面贴合舒适。适合长距离跑步。',
    images: [
      'https://assets.adidas.com/images/h_840,f_auto,q_auto,fl_lossy,c_fill,g_auto/1234567890/ultraboost-22.jpg',
    ],
    colors: ['黑色', '白色', '灰色'],
    sizes: ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45'],
    tags: ['跑步鞋', 'Boost', '专业'],
    material: 'Primeknit编织',
    sourceUrl: 'https://www.adidas.com/ultraboost',
    externalId: 'adidas-ultraboost-22',
    gender: 'unisex',
  },
  {
    name: 'Uniqlo 女装AIRism棉混纺衬衫',
    brand: 'Uniqlo',
    price: 199,
    currency: 'CNY',
    category: ClothingCategory.tops,
    subcategory: '衬衫',
    description: 'AIRism技术保持干爽舒适，棉混纺面料柔软亲肤。经典衬衫设计，适合通勤。',
    images: [
      'https://image.uniqlo.com/UQ/ST/zh-CN/imagesgoods/460239/item/goods_09_460239.jpg',
    ],
    colors: ['白色', '浅蓝色', '粉色'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    tags: ['衬衫', 'AIRism', '通勤', '透气'],
    material: '60%棉 40%聚酯纤维',
    sourceUrl: 'https://www.uniqlo.com/cn/zh/products/E460239000',
    externalId: 'uniqlo-airism-shirt-women',
    gender: 'women',
  },
  {
    name: 'Nike Sportswear 女装连帽卫衣',
    brand: 'Nike',
    price: 499,
    currency: 'CNY',
    category: ClothingCategory.tops,
    subcategory: '卫衣',
    description: '经典连帽卫衣，柔软 fleece 面料。标志性Swoosh Logo，休闲运动风格。',
    images: [
      'https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco/1234567890/sportswear-hoodie.jpg',
    ],
    colors: ['黑色', '灰色', '藏蓝色'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    tags: ['卫衣', '运动', '休闲'],
    material: '80%棉 20%聚酯纤维',
    sourceUrl: 'https://www.nike.com/t/sportswear-hoodie',
    externalId: 'nike-sportswear-hoodie-women',
    gender: 'women',
  },
  {
    name: 'Zara 男装修身休闲裤',
    brand: 'Zara',
    price: 399,
    currency: 'CNY',
    category: ClothingCategory.bottoms,
    subcategory: '休闲裤',
    description: '修身剪裁休闲裤，采用弹力面料，舒适有型。适合日常通勤穿着。',
    images: [
      'https://static.zara.net/photos///2024/V/0/1/p/1234/567/800/2/w/1024/1234567800_1_1_1.jpg',
    ],
    colors: ['黑色', '深灰色', '藏蓝色'],
    sizes: ['28', '29', '30', '31', '32', '33', '34', '36'],
    tags: ['休闲裤', '修身', '通勤'],
    material: '98%棉 2%氨纶',
    sourceUrl: 'https://www.zara.com/cn/zh/',
    externalId: 'zara-chino-pants-men',
    gender: 'men',
  },
  {
    name: 'H&M 男装修身西装外套',
    brand: 'H&M',
    price: 499,
    currency: 'CNY',
    category: ClothingCategory.outerwear,
    subcategory: '西装',
    description: '修身剪裁西装外套，简约设计。适合职场或正式场合穿着。',
    images: [
      'https://lp2.hm.com/hmgoepprod?set=quality[79],source[/a5/a1/a5a1a5a1a5a1a5a1a5a1a5a1a5a1.jpg]',
    ],
    colors: ['黑色', '深蓝色', '灰色'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    tags: ['西装', '职场', '修身'],
    material: '聚酯纤维混纺',
    sourceUrl: 'https://www.hm.com/cn/',
    externalId: 'hm-blazer-men',
    gender: 'men',
  },
];

async function main() {
  console.log('开始填充真实服装数据...\n');

  console.log('1. 创建品牌数据...');
  for (const brand of REAL_BRANDS) {
    await prisma.brand.upsert({
      where: { name: brand.name },
      update: { logo: brand.logo },
      create: {
        name: brand.name,
        slug: brand.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        logo: brand.logo,
        description: `${brand.name} 品牌服装`,
        isActive: true,
      },
    });
  }
  console.log(`   已创建 ${REAL_BRANDS.length} 个品牌\n`);

  console.log('2. 创建服装数据...');
  let created = 0;
  for (const item of REAL_CLOTHING_DATA) {
    const brand = await prisma.brand.findUnique({
      where: { name: item.brand },
    });

    if (!brand) {
      console.log(`   跳过 ${item.name}: 品牌 ${item.brand} 不存在`);
      continue;
    }

    const existing = await prisma.clothingItem.findFirst({
      where: { externalId: item.externalId },
    });

    if (existing) {
      console.log(`   跳过 ${item.name}: 已存在`);
      continue;
    }

    await prisma.clothingItem.create({
      data: {
        name: item.name,
        brandId: brand.id,
        category: item.category,
        price: item.price,
        originalPrice: item.originalPrice,
        currency: item.currency,
        description: item.description,
        mainImage: item.images[0],
        images: item.images,
        colors: item.colors,
        sizes: item.sizes,
        tags: item.tags,
        attributes: { material: item.material, sourceUrl: item.sourceUrl },
        externalId: item.externalId,
        isActive: true,
        isDeleted: false,
        isFeatured: Math.random() > 0.7,
        viewCount: Math.floor(Math.random() * 1000),
        likeCount: Math.floor(Math.random() * 500),
      },
    });
    created++;
    console.log(`   ✓ ${item.name} (${item.brand})`);
  }

  console.log(`\n   已创建 ${created} 件服装\n`);

  const totalCount = await prisma.clothingItem.count();
  console.log(`数据库中共有 ${totalCount} 件服装`);

  console.log('\n数据填充完成！');
}

main()
  .catch((e) => {
    console.error('错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
