// @ts-nocheck - Seed script: runtime data population, strict typing not required
import { PrismaClient, Gender, BodyType, SkinTone, FaceShape, ColorSeason, ClothingCategory, PriceRange, PhotoType, AnalysisStatus, CustomizationType, CustomizationStatus, RecommendationType } from '@prisma/client';
import { hash } from '../src/common/security/bcrypt';

const prisma = new PrismaClient();

// 品牌购买链接映射
const OFFICIAL_PURCHASE_URLS_BY_SKU: Record<string, string> = {
  'ZARA-BLAZER-001': 'https://www.zara.cn/cn/zh/%E5%AE%BD%E6%9D%BE%E7%89%88%E5%9E%8B%E4%BC%91%E9%97%B2%E8%A5%BF%E8%A3%85%E5%A4%96%E5%A5%97-p06861209.html',
  'ZARA-PANTS-001': 'https://www.zara.cn/cn/zh/%E9%AB%98%E8%85%B0%E9%98%94%E8%85%BF%E8%A3%A4-p02405590.html',
  'UNIQLO-HEATTECH-001': 'https://www.uniqlo.cn/c/3wheattech.html',
  'UNIQLO-UTEE-001': 'https://www.uniqlo.com/us/en/products/E455758-001/00',
  'NIKE-AIRMAX-001': 'https://www.nike.com/t/air-max-270-mens-shoes-KkLcGR',
  'COS-DRESS-001': 'https://www.cos.com/en-us/women/womenswear/dresses/sleeveless-dresses/product/circle-cut-knitted-mini-dress-white-1285099001',
  'COS-SKIRT-001': 'https://www.cos.com/en-us/women/womenswear/skirts/midlength/product/pleated-knitted-midi-skirt-black-1214947001',
  'MD-COAT-001': 'https://www.massimodutti.com/us/wool-blend-coat-l02891381',
  'ZARA-SKIRT-002': 'https://www.zara.cn/cn/zh/zw-%E7%B3%BB%E5%88%97%E4%B8%9D%E7%BC%8E%E8%B4%A8%E6%84%9F%E8%95%BE%E4%B8%9D%E5%8D%8A%E8%BA%AB%E8%A3%99-p05919211.html',
  'NIKE-P6000-001': 'https://www.nike.com/t/p-6000-shoes-XkgpKW/CD6404-002',
  'UNIQLO-CARDIGAN-001': 'https://www.uniqlo.com/us/en/products/E441478-000/',
  'COS-CARDIGAN-001': 'https://www.cos.com/en_usd/women/womenswear/knitwear/product.wool-crew-neck-cardigan-white.1211698002.html',
};

function buildPurchaseSourceUrl(sku?: string | null, brandName?: string | null, itemName?: string | null): string | null {
  if (sku && OFFICIAL_PURCHASE_URLS_BY_SKU[sku]) {
    return OFFICIAL_PURCHASE_URLS_BY_SKU[sku];
  }
  const query = [brandName?.trim(), itemName?.trim()].filter(Boolean).join(' ').trim();
  if (!query) return null;
  return `https://search.jd.com/Search?keyword=${encodeURIComponent(query)}`;
}

// ==================== Demo 测试账号配置 ====================
const DEMO_USERS = [
  {
    email: 'test@example.com',
    password: 'Test123456!',
    nickname: '测试用户',
    phone: '13800138000',
    gender: Gender.female,
    birthDate: new Date('1995-06-15'),
    bodyType: BodyType.hourglass,
    skinTone: SkinTone.medium,
    faceShape: FaceShape.oval,
    colorSeason: ColorSeason.autumn,
    height: 165,
    weight: 55,
    stylePreferences: ['casual', 'elegant', 'minimalist'],
    colorPreferences: ['black', 'white', 'beige', 'navy'],
  },
  {
    email: 'demo@aineed.ai',
    password: 'Demo123456!',
    nickname: 'Demo演示账号',
    phone: '13900139000',
    gender: Gender.female,
    birthDate: new Date('1998-03-20'),
    bodyType: BodyType.rectangle,
    skinTone: SkinTone.fair,
    faceShape: FaceShape.heart,
    colorSeason: ColorSeason.spring,
    height: 168,
    weight: 52,
    stylePreferences: ['fashion', 'trendy', 'elegant'],
    colorPreferences: ['pink', 'white', 'lightblue', 'lavender'],
  },
  {
    email: 'judge@competition.ai',
    password: 'Judge123456!',
    nickname: '评委体验账号',
    phone: '13700137000',
    gender: Gender.male,
    birthDate: new Date('1990-11-10'),
    bodyType: BodyType.inverted_triangle,
    skinTone: SkinTone.light,
    faceShape: FaceShape.square,
    colorSeason: ColorSeason.winter,
    height: 178,
    weight: 72,
    stylePreferences: ['business', 'formal', 'classic'],
    colorPreferences: ['navy', 'black', 'grey', 'white'],
  },
  {
    email: 'admin@aineed.ai',
    password: 'Admin123456!',
    nickname: '管理员',
    phone: '13600136000',
    gender: Gender.female,
    birthDate: new Date('1992-08-25'),
    bodyType: BodyType.hourglass,
    skinTone: SkinTone.olive,
    faceShape: FaceShape.diamond,
    colorSeason: ColorSeason.summer,
    height: 163,
    weight: 50,
    stylePreferences: ['casual', 'sport', 'minimalist'],
    colorPreferences: ['white', 'black', 'red', 'blue'],
  },
];

// ==================== 完整服装数据库（50+条） ====================
const CLOTHING_DATABASE = [
  // ===== 上衣类 (15条) =====
  {
    brandSlug: 'zara',
    name: '宽松版型西装外套',
    description: '经典西装外套，宽松版型，适合日常通勤与正式场合。采用优质混纺面料，挺括有型。',
    sku: 'ZARA-BLAZER-001',
    category: ClothingCategory.outerwear,
    subcategory: 'blazers',
    colors: ['黑色', '米色', '灰色'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    tags: ['通勤', '西装', '外套', '职场', 'formal'],
    price: 799,
    originalPrice: 999,
    stock: 20,
    isFeatured: true,
    imageKey: 'blazer',
  },
  {
    brandSlug: 'uniqlo',
    name: 'HEATTECH保暖内衣套装',
    description: '轻薄保暖，吸湿发热技术，冬季必备基础款。贴身舒适，可作内搭或单穿。',
    sku: 'UNIQLO-HEATTECH-001',
    category: ClothingCategory.tops,
    subcategory: 'basics',
    colors: ['白色', '黑色', '灰色', '肤色'],
    sizes: ['S', 'M', 'L', 'XL'],
    tags: ['保暖', '内衣', '冬季', '基础款', 'casual'],
    price: 199,
    stock: 40,
    imageKey: 'heattech',
  },
  {
    brandSlug: 'uniqlo',
    name: 'U系列棉质T恤',
    description: '优质新疆长绒棉，经典圆领设计，透气亲肤。百搭基础款，四季皆宜。',
    sku: 'UNIQLO-UTEE-001',
    category: ClothingCategory.tops,
    subcategory: 'tshirts',
    colors: ['白色', '黑色', '灰色', '藏青色', '条纹'],
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    tags: ['T恤', '基础款', '棉质', '日常', 'casual'],
    price: 79,
    originalPrice: 99,
    stock: 60,
    imageKey: 'shirt',
  },
  {
    brandSlug: 'uniqlo',
    name: '轻型V领开衫',
    description: '轻薄针织开衫，空调房和换季叠穿的完美选择。柔软亲肤，多色可选。',
    sku: 'UNIQLO-CARDIGAN-001',
    category: ClothingCategory.tops,
    subcategory: 'cardigans',
    colors: ['米色', '浅蓝色', '橙色', '粉色'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    tags: ['开衫', '轻薄', '针织', '日常', 'casual'],
    price: 199,
    stock: 35,
    imageKey: 'sweater',
  },
  {
    brandSlug: 'cos',
    name: '羊毛圆领开衫',
    description: '经典圆领开衫，优质美利奴羊毛面料。极简设计，适合作为换季基础层。',
    sku: 'COS-CARDIGAN-001',
    category: ClothingCategory.tops,
    subcategory: 'cardigans',
    colors: ['白色', '黑色', '驼色', '灰色'],
    sizes: ['XS', 'S', 'M', 'L'],
    tags: ['开衫', '羊毛', '极简', '通勤', 'elegant'],
    price: 890,
    originalPrice: 1190,
    stock: 16,
    isFeatured: true,
    imageKey: 'sweater',
  },
  {
    brandSlug: 'zara',
    name: '法式泡泡袖衬衫',
    description: '浪漫法式风格，精致泡泡袖设计，100%纯棉面料。优雅通勤首选。',
    sku: 'ZARA-SHIRT-001',
    category: ClothingCategory.tops,
    subcategory: 'shirts',
    colors: ['白色', '浅蓝色', '淡粉色'],
    sizes: ['XS', 'S', 'M', 'L'],
    tags: ['衬衫', '法式', '泡泡袖', '优雅', 'business'],
    price: 399,
    originalPrice: 499,
    stock: 25,
    imageKey: 'shirt',
  },
  {
    brandSlug: 'massimo-dutti',
    name: '真丝缎面吊带背心',
    description: '100%桑蚕丝材质，光泽感缎面，奢华质感。内搭外穿两相宜。',
    sku: 'MD-TOP-001',
    category: ClothingCategory.tops,
    subcategory: 'camisoles',
    colors: ['香槟金', '黑色', '珍珠白'],
    sizes: ['XS', 'S', 'M', 'L'],
    tags: ['吊带', '真丝', '奢华', '性感', 'elegant'],
    price: 1290,
    stock: 12,
    isFeatured: true,
    imageKey: 'shirt',
  },
  {
    brandSlug: 'nike',
    name: 'Dri-FIT运动训练上衣',
    description: '专业速干面料，透气排汗，适合健身跑步等运动场景。',
    sku: 'NIKE-TOP-001',
    category: ClothingCategory.tops,
    subcategory: 'activewear',
    colors: ['黑色', '荧光绿', '深蓝色', '白色'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    tags: ['运动', '速干', '健身', '跑步', 'sport'],
    price: 349,
    originalPrice: 399,
    stock: 30,
    imageKey: 'shirt',
  },
  {
    brandSlug: 'zara',
    name: '高领羊毛毛衣',
    description: '柔软羊毛混纺，高领设计保暖性好。简约配色，秋冬必备单品。',
    sku: 'ZARA-SWEATER-001',
    category: ClothingCategory.tops,
    subcategory: 'sweaters',
    colors: ['奶油白', '驼色', '玫瑰粉', '森林绿'],
    sizes: ['XS', 'S', 'M', 'L'],
    tags: ['毛衣', '高领', '羊毛', '冬季', 'casual'],
    price: 459,
    originalPrice: 599,
    stock: 20,
    imageKey: 'sweater',
  },
  {
    brandSlug: 'cos',
    name: 'oversize落肩卫衣',
    description: '宽松落肩版型，重磅纯棉毛圈布。街头潮流风格，舒适百搭。',
    sku: 'COS-HOODIE-001',
    category: ClothingCategory.tops,
    subcategory: 'hoodies',
    colors: ['黑色', '白色', '灰蓝色', '橄榄绿'],
    sizes: ['S', 'M', 'L', 'XL'],
    tags: ['卫衣', 'oversize', '街头', '休闲', 'casual'],
    price: 590,
    stock: 22,
    imageKey: 'shirt',
  },
  {
    brandSlug: 'uniqlo',
    name: '法兰绒格子衬衫',
    description: '日系复古风格，柔软法兰绒面料。可做外套或单穿，秋季实用单品。',
    sku: 'UNIQLO-FLANNEL-001',
    category: ClothingCategory.tops,
    subcategory: 'shirts',
    colors: ['红黑格', '蓝白格', '棕黄格'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    tags: ['衬衫', '格子', '法兰绒', '日系', 'casual'],
    price: 149,
    stock: 45,
    imageKey: 'shirt',
  },
  {
    brandSlug: 'massimo-dutti',
    name: '羊绒V领套头衫',
    description: '顶级山羊绒材质，轻盈保暖。经典V领设计，商务休闲两相宜。',
    sku: 'MD-CASHMERE-001',
    category: ClothingCategory.tops,
    subcategory: 'sweaters',
    colors: ['炭灰色', '藏青色', '酒红色'],
    sizes: ['S', 'M', 'L', 'XL'],
    tags: ['羊绒', 'V领', '高端', '商务', 'business'],
    price: 2390,
    originalPrice: 2990,
    stock: 8,
    isFeatured: true,
    imageKey: 'sweater',
  },
  {
    brandSlug: 'zara',
    name: '露肩一字领上衣',
    description: '性感露肩设计，修身剪裁展现优美肩颈线条。约会聚会焦点单品。',
    sku: 'ZARA-OFFSHOULDER-001',
    category: ClothingCategory.tops,
    subcategory: 'blouses',
    colors: ['黑色', '白色', '酒红色'],
    sizes: ['XS', 'S', 'M', 'L'],
    tags: ['露肩', '性感', '约会', '时尚', 'party'],
    price: 299,
    originalPrice: 399,
    stock: 18,
    imageKey: 'shirt',
  },
  {
    brandSlug: 'nike',
    name: 'Air Jordan篮球背心',
    description: '经典飞人logo，网眼透气面料。球场街头的潮流宣言。',
    sku: 'NIKE-JERSEY-001',
    category: ClothingCategory.tops,
    subcategory: 'activewear',
    colors: ['黑白', '红黑', '蓝白'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    tags: ['篮球', 'Jordan', '运动', '街头', 'sport'],
    price: 449,
    stock: 26,
    imageKey: 'shirt',
  },
  {
    brandSlug: 'cos',
    name: '亚麻短袖衬衫',
    description: '天然亚麻面料，透气吸湿，夏日清爽之选。慵懒度假风。',
    sku: 'COS-LINEN-001',
    category: ClothingCategory.tops,
    subcategory: 'shirts',
    colors: ['米白色', '浅卡其', '天蓝色'],
    sizes: ['XS', 'S', 'M', 'L'],
    tags: ['亚麻', '短袖', '夏季', '度假', 'casual'],
    price: 690,
    stock: 14,
    imageKey: 'shirt',
  },

  // ===== 下装类 (10条) =====
  {
    brandSlug: 'zara',
    name: '高腰阔腿裤',
    description: '高腰设计拉长腿部线条，舒适阔腿版型。垂坠感面料，走路带风。',
    sku: 'ZARA-PANTS-001',
    category: ClothingCategory.bottoms,
    subcategory: 'trousers',
    colors: ['黑色', '白色', '卡其色', '藏青色'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    tags: ['裤子', '高腰', '阔腿', '通勤', 'elegant'],
    price: 499,
    stock: 24,
    imageKey: 'pants',
  },
  {
    brandSlug: 'zara',
    name: 'ZW系列丝缎质感蕾丝半身裙',
    description: '丝缎质感中腰短裙，不对称下摆，饰有同色系蕾丝。精致优雅。',
    sku: 'ZARA-SKIRT-002',
    category: ClothingCategory.bottoms,
    subcategory: 'skirts',
    colors: ['深灰色', '香槟色', '黑色'],
    sizes: ['XS', 'S', 'M', 'L'],
    tags: ['半身裙', '丝缎', '蕾丝', '时装', 'party'],
    price: 399,
    stock: 18,
    imageKey: 'skirt',
  },
  {
    brandSlug: 'cos',
    name: '褶皱半身裙',
    description: '精致压褶工艺，高腰A字版型修饰身形。百褶灵动，行走间飘逸动人。',
    sku: 'COS-SKIRT-001',
    category: ClothingCategory.bottoms,
    subcategory: 'skirts',
    colors: ['黑色', '米色', '酒红色'],
    sizes: ['XS', 'S', 'M', 'L'],
    tags: ['半身裙', '褶皱', '优雅', '通勤', 'elegant'],
    price: 890,
    originalPrice: 1090,
    stock: 14,
    isFeatured: true,
    imageKey: 'skirt',
  },
  {
    brandSlug: 'uniqlo',
    name: '高弹力紧身牛仔裤',
    description: '超高弹力牛仔面料，修身显瘦不紧绷。九分长度，显腿长神器。',
    sku: 'UNIQLO-JEANS-001',
    category: ClothingCategory.bottoms,
    subcategory: 'jeans',
    colors: ['深蓝色', '浅蓝色', '黑色', '白色'],
    sizes: ['150/56A', '155/62A', '160/64A', '165/68A', '170/72A'],
    tags: ['牛仔裤', '紧身', '修身', '日常', 'casual'],
    price: 299,
    originalPrice: 399,
    stock: 50,
    imageKey: 'pants',
  },
  {
    brandSlug: 'zara',
    name: '工装风束脚裤',
    description: '街头工装风，多口袋实用设计。束脚版型搭配运动鞋超帅气。',
    sku: 'ZARA-CARGO-001',
    category: ClothingCategory.bottoms,
    subcategory: 'trousers',
    colors: ['军绿色', '卡其色', '黑色'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    tags: ['工装裤', '束脚', '街头', '休闲', 'casual'],
    price: 359,
    stock: 22,
    imageKey: 'pants',
  },
  {
    brandSlug: 'massimo-dutti',
    name: '羊毛西裤',
    description: '精纺羊毛面料，直筒修身版型。抗皱易打理，职场精英标配。',
    sku: 'MD-TROUSERS-001',
    category: ClothingCategory.bottoms,
    subcategory: 'trousers',
    colors: ['黑色', '深灰', '海军蓝'],
    sizes: ['34', '36', '38', '40', '42'],
    tags: ['西裤', '羊毛', '正装', '商务', 'business'],
    price: 1590,
    originalPrice: 1990,
    stock: 10,
    isFeatured: true,
    imageKey: 'pants',
  },
  {
    brandSlug: 'zara',
    name: '高腰A字短裙',
    description: '经典A字版型，高腰设计优化身材比例。青春活力，减龄必备。',
    sku: 'ZARA-MINISKIRT-001',
    category: ClothingCategory.bottoms,
    subcategory: 'skirts',
    colors: ['黑色', '白色', '格纹', '牛仔蓝'],
    sizes: ['XS', 'S', 'M', 'L'],
    tags: ['短裙', 'A字', '高腰', '减龄', 'casual'],
    price: 259,
    originalPrice: 299,
    stock: 30,
    imageKey: 'skirt',
  },
  {
    brandSlug: 'uniqlo',
    name: '运动短裤',
    description: '轻薄速干面料，内置安全口袋。跑步健身居家都适用。',
    sku: 'UNIQLO-SHORTS-001',
    category: ClothingCategory.bottoms,
    subcategory: 'shorts',
    colors: ['黑色', '深灰', '海军蓝'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    tags: ['短裤', '运动', '速干', '健身', 'sport'],
    price: 149,
    stock: 40,
    imageKey: 'pants',
  },
  {
    brandSlug: 'cos',
    name: '阔腿西装裤',
    description: '垂坠感西装面料，宽松阔腿版型。走路带风，气场全开。',
    sku: 'COS-WIDEPANTS-001',
    category: ClothingCategory.bottoms,
    subcategory: 'trousers',
    colors: ['燕麦色', '黑色', '焦糖色'],
    sizes: ['XS', 'S', 'M', 'L'],
    tags: ['阔腿裤', '西装料', '通勤', '高级', 'elegant'],
    price: 790,
    originalPrice: 990,
    stock: 16,
    imageKey: 'pants',
  },
  {
    brandSlug: 'zara',
    name: '皮革拼接皮裤',
    description: '仿皮革拼接设计，摇滚朋克风格。秋冬凹造型必备单品。',
    sku: 'ZARA-LEATHER-001',
    category: ClothingCategory.bottoms,
    subcategory: 'trousers',
    colors: ['黑色', '棕色'],
    sizes: ['XS', 'S', 'M', 'L'],
    tags: ['皮裤', '皮革', '朋克', '个性', 'party'],
    price: 499,
    originalPrice: 699,
    stock: 12,
    imageKey: 'pants',
  },

  // ===== 连衣裙 (8条) =====
  {
    brandSlug: 'cos',
    name: '针织连衣裙',
    description: '极简设计，优质针织面料，优雅百搭。可配腰带打造不同造型。',
    sku: 'COS-DRESS-001',
    category: ClothingCategory.dresses,
    subcategory: 'knitted',
    colors: ['黑色', '米色', '墨绿色'],
    sizes: ['XS', 'S', 'M', 'L'],
    tags: ['连衣裙', '针织', '极简', '优雅', 'elegant'],
    price: 1290,
    stock: 16,
    isFeatured: true,
    imageKey: 'dress',
  },
  {
    brandSlug: 'zara',
    name: '碎花茶歇裙',
    description: '法式碎花印花，V领收腰设计，飘逸大裙摆。浪漫田园风情。',
    sku: 'ZARA-MIDI-001',
    category: ClothingCategory.dresses,
    subcategory: 'midi',
    colors: ['碎花蓝', '碎花粉', '碎花黄'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    tags: ['连衣裙', '碎花', '法式', '浪漫', 'casual'],
    price: 459,
    originalPrice: 599,
    stock: 20,
    imageKey: 'dress',
  },
  {
    brandSlug: 'massimo-dutti',
    name: '真丝缎面晚礼服',
    description: '100%桑蚕丝缎面，吊带设计，拖尾优雅。宴会婚礼首选。',
    sku: 'MD-GOWN-001',
    category: ClothingCategory.dresses,
    subcategory: 'evening',
    colors: ['香槟金', '宝石蓝', '酒红色'],
    sizes: ['XS', 'S', 'M', 'L'],
    tags: ['礼服', '真丝', '宴会', '奢华', 'formal'],
    price: 3990,
    originalPrice: 4990,
    stock: 6,
    isFeatured: true,
    imageKey: 'dress',
  },
  {
    brandSlug: 'uniqlo',
    name: '棉质衬衫式连衣裙',
    description: '衬衫领设计，腰带收腰，纯棉面料舒适透气。日常通勤实用款。',
    sku: 'UNIQLO-SHIRTDRESS-001',
    category: ClothingCategory.dresses,
    subcategory: 'shirt',
    colors: ['白色', '浅蓝色', '条纹'],
    sizes: ['S', 'M', 'L', 'XL'],
    tags: ['连衣裙', '衬衫', '通勤', '舒适', 'casual'],
    price: 299,
    stock: 28,
    imageKey: 'dress',
  },
  {
    brandSlug: 'zara',
    name: '黑色小黑裙',
    description: '每个女人都需要的小黑裙！修身剪裁，赫本风格永不过时。',
    sku: 'ZARA-LBD-001',
    category: ClothingCategory.dresses,
    subcategory: 'cocktail',
    colors: ['黑色'],
    sizes: ['XS', 'S', 'M', 'L'],
    tags: ['小黑裙', '经典', '赫本', '派对', 'party'],
    price: 599,
    originalPrice: 799,
    stock: 15,
    isFeatured: true,
    imageKey: 'dress',
  },
  {
    brandSlug: 'cos',
    name: '吊带度假长裙',
    description: '波西米亚风格，飘逸雪纺面料，印花图案充满异域风情。',
    sku: 'COS-BOHO-001',
    category: ClothingCategory.dresses,
    subcategory: 'maxi',
    colors: ['印花A', '印花B', '纯色白'],
    sizes: ['XS', 'S', 'M', 'L'],
    tags: ['长裙', '度假', '波西米亚', '海滩', 'casual'],
    price: 990,
    stock: 12,
    imageKey: 'dress',
  },
  {
    brandSlug: 'zara',
    name: '针织裹身裙',
    description: '裹身式设计，凸显腰臀曲线。温柔知性，适合各种场合。',
    sku: 'ZARA-WRAP-001',
    category: ClothingCategory.dresses,
    subcategory: 'knitted',
    colors: ['驼色', '酒红', '墨绿'],
    sizes: ['XS', 'S', 'M', 'L'],
    tags: ['裹身裙', '针织', '知性', '优雅', 'business'],
    price: 399,
    originalPrice: 499,
    stock: 18,
    imageKey: 'dress',
  },
  {
    brandSlug: 'massimo-dutti',
    name: '格纹羊毛连衣裙',
    description: '英伦格纹元素，羊毛混纺面料保暖有型。秋冬季气质单品。',
    sku: 'MD-PATTERN-001',
    category: ClothingCategory.dresses,
    subcategory: 'knitted',
    colors: ['千鸟格', '威尔士格', '细条纹'],
    sizes: ['S', 'M', 'L'],
    tags: ['连衣裙', '格纹', '英伦', '秋冬', 'elegant'],
    price: 1890,
    originalPrice: 2390,
    stock: 10,
    imageKey: 'dress',
  },

  // ===== 外套类 (7条) =====
  {
    brandSlug: 'massimo-dutti',
    name: '羊绒混纺大衣',
    description: '优质羊绒混纺面料，经典双排扣设计。冬季投资级单品，十年不过时。',
    sku: 'MD-COAT-001',
    category: ClothingCategory.outerwear,
    subcategory: 'coats',
    colors: ['驼色', '黑色', '藏青色', '灰色'],
    sizes: ['XS', 'S', 'M', 'L'],
    tags: ['大衣', '羊绒', '冬季', '高端', 'elegant'],
    price: 2999,
    originalPrice: 3999,
    stock: 12,
    isFeatured: true,
    imageKey: 'coat',
  },
  {
    brandSlug: 'zara',
    name: '牛仔夹克外套',
    description: '经典牛仔夹克，做旧水洗工艺。春秋季节层搭神器，百搭耐看。',
    sku: 'ZARA-DENIM-JACKET-001',
    category: ClothingCategory.outerwear,
    subcategory: 'jackets',
    colors: ['浅蓝', '深蓝', '黑色', '白色'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    tags: ['夹克', '牛仔', '经典', '百搭', 'casual'],
    price: 499,
    originalPrice: 599,
    stock: 25,
    imageKey: 'jacket',
  },
  {
    brandSlug: 'cos',
    name: '风衣外套',
    description: '英伦风经典风衣，双排扣战壕款式。防风雨面料，春秋必备。',
    sku: 'COS-TRENCH-001',
    category: ClothingCategory.outerwear,
    subcategory: 'trench_coats',
    colors: ['卡其色', '黑色', '海军蓝'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    tags: ['风衣', '英伦', '经典', '通勤', 'business'],
    price: 1890,
    originalPrice: 2390,
    stock: 14,
    isFeatured: true,
    imageKey: 'coat',
  },
  {
    brandSlug: 'nike',
    name: 'Tech Fleece运动外套',
    description: '创新科技抓绒面料，轻便保暖。立领拉链设计，运动休闲皆宜。',
    sku: 'NIKE-FLEECE-001',
    category: ClothingCategory.outerwear,
    subcategory: 'jackets',
    colors: ['黑色', '深灰', '军绿色'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    tags: ['运动外套', '抓绒', '保暖', '休闲', 'sport'],
    price: 699,
    originalPrice: 899,
    stock: 20,
    imageKey: 'jacket',
  },
  {
    brandSlug: 'zara',
    name: '皮衣机车外套',
    description: '仿PU皮革材质，翻领拉链设计。酷帅机车风，凹造型利器。',
    sku: 'ZARA-LEATHER-JACKET-001',
    category: ClothingCategory.outerwear,
    subcategory: 'jackets',
    colors: ['黑色', '棕色'],
    sizes: ['XS', 'S', 'M', 'L'],
    tags: ['皮衣', '机车', '酷帅', '个性', 'party'],
    price: 599,
    originalPrice: 799,
    stock: 16,
    imageKey: 'jacket',
  },
  {
    brandSlug: 'uniqlo',
    name: '轻型羽绒服',
    description: '高品质白鹅绒填充，超轻便携可收纳。寒冬保暖不臃肿。',
    sku: 'UNIQLO-DOWN-001',
    category: ClothingCategory.outerwear,
    subcategory: 'down_jackets',
    colors: ['黑色', '米色', '浅紫', '薄荷绿'],
    sizes: ['S', 'M', 'L', 'XL'],
    tags: ['羽绒服', '轻薄', '保暖', '冬季', 'casual'],
    price: 799,
    originalPrice: 999,
    stock: 22,
    imageKey: 'coat',
  },
  {
    brandSlug: 'massimo-dutti',
    name: '双面呢羊毛大衣',
    description: '澳洲进口美利奴羊毛，双面呢工艺无内衬。高端质感，投资收藏级。',
    sku: 'MD-WOOLCOAT-001',
    category: ClothingCategory.outerwear,
    subcategory: 'coats',
    colors: ['驼色', '黑色', '灰色系'],
    sizes: ['S', 'M', 'L', 'XL'],
    tags: ['大衣', '双面呢', '羊毛', '奢华', 'elegant'],
    price: 4990,
    originalPrice: 5990,
    stock: 5,
    isFeatured: true,
    imageKey: 'coat',
  },

  // ===== 配饰类 (10条) =====
  {
    brandSlug: 'nike',
    name: 'Air Max 270运动鞋',
    description: '经典Air Max气垫单元，舒适缓震。潮流配色，日常穿搭点睛之笔。',
    sku: 'NIKE-AIRMAX-001',
    category: ClothingCategory.footwear,
    subcategory: 'sneakers',
    colors: ['黑白', '纯白', '黑红', '奥利奥'],
    sizes: ['36', '37', '38', '39', '40', '41', '42'],
    tags: ['运动鞋', '气垫', '休闲', '经典', 'casual'],
    price: 1099,
    stock: 18,
    isFeatured: true,
    imageKey: 'sneakers',
  },
  {
    brandSlug: 'nike',
    name: 'Nike P-6000运动鞋',
    description: '复古跑鞋灵感与现代缓震结合，兼顾透气和日常舒适。银色未来感外观。',
    sku: 'NIKE-P6000-001',
    category: ClothingCategory.footwear,
    subcategory: 'sneakers',
    colors: ['黑白', '银白色', '金属灰'],
    sizes: ['36', '37', '38', '39', '40', '41', '42', '43'],
    tags: ['运动鞋', '复古跑鞋', '缓震', '日常', 'sport'],
    price: 829,
    stock: 22,
    imageKey: 'sneakers',
  },
  {
    brandSlug: 'zara',
    name: '链条单肩包',
    description: '金属链条肩带，皮质包身。小巧精致，可斜挎可手提，百搭神器。',
    sku: 'ZARA-BAG-001',
    category: ClothingCategory.accessories,
    subcategory: 'bags',
    colors: ['黑色', '白色', '裸粉色', '红色'],
    sizes: ['均码'],
    tags: ['包包', '链条', '单肩', '百搭', 'elegant'],
    price: 399,
    originalPrice: 499,
    stock: 20,
    imageKey: 'sneakers',
  },
  {
    brandSlug: 'massimo-dutti',
    name: '真皮托特包',
    description: '头层牛皮材质，超大容量托特包。通勤办公购物一包搞定。',
    sku: 'MD-TOTE-001',
    category: ClothingCategory.accessories,
    subcategory: 'bags',
    colors: ['黑色', '棕色', '焦糖色', '白色'],
    sizes: ['均码'],
    tags: ['托特包', '真皮', '大容量', '通勤', 'business'],
    price: 1890,
    originalPrice: 2390,
    stock: 10,
    isFeatured: true,
    imageKey: 'sneakers',
  },
  {
    brandSlug: 'cos',
    name: '羊绒围巾',
    description: '100%山羊绒材质，柔软亲肤。超大尺寸，多种围法，秋冬必备配饰。',
    sku: 'COS-SCARF-001',
    category: ClothingCategory.accessories,
    subcategory: 'scarves',
    colors: ['驼色', '灰色', '酒红', '格纹'],
    sizes: ['均码'],
    tags: ['围巾', '羊绒', '保暖', '优雅', 'elegant'],
    price: 990,
    stock: 15,
    imageKey: 'sneakers',
  },
  {
    brandSlug: 'zara',
    name: '贝雷帽',
    description: '法式复古贝雷帽，羊毛混纺材质。瞬间提升整体造型格调。',
    sku: 'ZARA-BERET-001',
    category: ClothingCategory.accessories,
    subcategory: 'hats',
    colors: ['黑色', '米色', '酒红', '格纹'],
    sizes: ['均码'],
    tags: ['帽子', '贝雷帽', '法式', '复古', 'casual'],
    price: 129,
    stock: 35,
    imageKey: 'sneakers',
  },
  {
    brandSlug: 'uniqlo',
    name: '皮带腰带',
    description: '经典针扣设计，头层牛皮材质。细节彰显品质，搭配牛仔裤西裤皆宜。',
    sku: 'UNIQLO-BELT-001',
    category: ClothingCategory.accessories,
    subcategory: 'belts',
    colors: ['黑色', '棕色', '白色'],
    sizes: ['S', 'M', 'L'],
    tags: ['腰带', '皮带', '牛皮', '基础', 'casual'],
    price: 99,
    stock: 50,
    imageKey: 'sneakers',
  },
  {
    brandSlug: 'massimo-dutti',
    name: '尖头高跟鞋',
    description: '经典尖头细跟设计，小羊皮内里舒适不磨脚。职场女性力量象征。',
    sku: 'MD-HEELS-001',
    category: ClothingCategory.footwear,
    subcategory: 'heels',
    colors: ['黑色', '裸色', '酒红色'],
    sizes: ['35', '36', '37', '38', '39'],
    tags: ['高跟鞋', '尖头', '细跟', '职场', 'business'],
    price: 1590,
    originalPrice: 1990,
    stock: 12,
    isFeatured: true,
    imageKey: 'sneakers',
  },
  {
    brandSlug: 'nike',
    name: 'Air Force 1板鞋',
    description: '永恒经典的AF1，纯白设计干净利落。街头文化icon，搭配万金油。',
    sku: 'NIKE-AF1-001',
    category: ClothingCategory.footwear,
    subcategory: 'sneakers',
    colors: ['纯白', '黑白', '黑红'],
    sizes: ['35', '36', '37', '38', '39', '40', '41', '42', '43'],
    tags: ['板鞋', 'AF1', '经典', '百搭', 'casual'],
    price: 749,
    stock: 30,
    imageKey: 'sneakers',
  },
  {
    brandSlug: 'zara',
    name: '太阳镜墨镜',
    description: '大框飞行员款式，UV400防紫外线。凹造型防晒两不误。',
    sku: 'ZARA-SUNGLASSES-001',
    category: ClothingCategory.accessories,
    subcategory: 'sunglasses',
    colors: ['黑框', '金框', '玳瑁色'],
    sizes: ['均码'],
    tags: ['太阳镜', '墨镜', '飞行员', '时尚', 'casual'],
    price: 199,
    originalPrice: 259,
    stock: 28,
    imageKey: 'sneakers',
  },
];

// 图片URL映射
const PRODUCT_IMAGES: Record<string, string[]> = {
  blazer: ['https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800'],
  heattech: ['https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800'],
  coat: ['https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800', 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=800'],
  dress: ['https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800'],
  pants: ['https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800'],
  sneakers: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800'],
  shirt: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800'],
  sweater: ['https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800'],
  skirt: ['https://images.unsplash.com/photo-1577900232427-18219b9166a0?w=800'],
  jacket: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800'],
};

// ==================== AI 对话场景预置 ====================
const AI_CONVERSATION_SCENARIOS = [
  {
    title: '面试穿搭场景',
    userIdx: 0, // test user
    messages: [
      { role: 'user' as const, content: '我下周有一个互联网公司产品经理的面试，不知道该怎么穿？' },
      { role: 'assistant' as const, content: '面试穿搭确实很重要！第一印象往往决定了后续的沟通氛围。针对互联网公司产品经理岗位，我建议选择**商务休闲风格**——既显得专业又不失亲和力。\n\n让我先了解一下你的情况：\n1. 你的体型和身高体重？\n2. 面试公司是偏传统还是创新型？\n3. 你平时穿衣风格偏好？' },
      { role: 'user' as const, content: '我165cm，55kg，是偏瘦的体型。公司是字节跳动这种创新型互联网公司。我喜欢简约但有质感的风格。' },
      { role: 'assistant' as const, content: '明白了！165cm/55kg的身材非常适合穿**修身剪裁**的衣服。针对字节跳动这样的创新型企业，我为你推荐以下方案：\n\n## 推荐方案 A：专业干练风\n- **上装**：ZARA 宽松版型西装外套（¥799）- 黑色或米色\n- **内搭**：COS 法式泡泡袖衬衫（¥399）- 白色\n- **下装**：ZARA 高腰阔腿裤（¥499）- 黑色或藏青色\n- **鞋子**：Nike Air Max 270（¥1099）- 白黑配色\n- **配饰**：MD 尖头高跟鞋（¥1590）或 COS 羊绒围巾（¥990）\n\n这套搭配的优势：\n✅ 西装外套体现专业性\n✅ 阔腿裤拉长腿部线条（显高！）\n✅ 泡泡袖增添女性柔美感\n✅ 整体色调统一高级\n\n**匹配度评分：92分** - 完美契合你的身材特点和面试场景需求。\n\n需要我帮你生成虚拟试穿效果吗？或者你想看看其他风格的备选方案？' },
      { role: 'user' as const, content: '这个方案很好！帮我试穿一下效果吧' },
      { role: 'assistant' as const, content: '好的！正在调用 CatVTON 虚拟试衣引擎为您生成试穿效果...\n\n📸 试穿任务已创建，预计需要 60-90 秒处理时间。系统将：\n1. 分析您的身体照片关键点\n2. 将推荐服装进行智能贴合\n3. 生成真实感的试穿效果图\n\n稍后您可以在「虚拟试衣」页面查看结果。同时我已经将这套搭配保存到您的收藏夹了！' },
    ],
  },
  {
    title: '约会穿搭场景',
    userIdx: 1, // demo user
    messages: [
      { role: 'user' as const, content: '周六晚上有个约会，想去一家不错的餐厅吃饭，求推荐穿搭！' },
      { role: 'assistant' as const, content: '约会穿搭太重要啦！餐厅约会的关键是**既有仪式感又不会过于隆重**。让我先了解一下：\n\n1. 这是什么类型的约会？（初次见面/情侣约会/纪念日？）\n2. 餐厅是什么风格？（日料/西餐/创意菜？）\n3. 你希望给对方留下什么印象？' },
      { role: 'user' as const, content: '是第一次和男生约会，餐厅是一家意大利餐厅，我想看起来甜美又有气质的那种感觉' },
      { role: 'assistant' as const, content: '太棒了！第一次约会 + 意大利餐厅 = **浪漫法式风格**最适合你！\n\n根据你的身材特点（168cm/52kg，春季型人），我精心挑选了以下搭配：\n\n## 💕 约会专属Look\n\n### 方案一：温柔浪漫风（推荐指数 ⭐⭐⭐⭐⭐）\n- **主装**：ZARA 碎花茶歇裙（¥459）- 碎花蓝\n- **外套**：UNIQLO 轻型V领开衫（¥199）- 米色\n- **包包**：ZARA 链条单肩包（¥399）- 裸粉色\n- **鞋子**：Nike AF1 纯白板鞋（¥749）\n- **配饰**：ZARA 贝雷帽（¥129）- 米色\n\n**为什么这样搭？**\n🌸 茶歇裙的法式剪裁非常显身材，V领设计露出锁骨超性感但不暴露\n🌸 碎花元素增添甜美感，符合"温柔有气质"的需求\n🌸 米色开衫可以应对餐厅空调冷气，脱下后裙子本身也很出彩\n🌸 裸粉色包包呼应春季型人的色彩优势\n\n**匹配度评分：95分** - 几乎完美的约会装扮！\n\n### 备选方案：优雅知性风\n如果想要更成熟一点的感觉：\n- MD 真丝缎面吊带（¥1290）+ ZARA 针织裹身裙（¥399）+ MD 托特包（¥1890）\n\n你想试试虚拟试穿吗？我可以立即生成效果预览！' },
    ],
  },
  {
    title: '日常通勤场景',
    userIdx: 2, // judge user (male)
    messages: [
      { role: 'user' as const, content: '我是程序员，每天要坐班，想要舒服一点但又不能太随意，有什么推荐？' },
      { role: 'assistant' as const, content: '程序员的通勤痛点我太懂了！长时间坐着写代码，**舒适性第一**，但也要保持职业形象。让我给你量身定制：\n\n根据你的信息（178cm/72cm，倒三角体型），我发现几个优势：\n✅ 身高优势明显，可以驾驭多种风格\n✅ 肩宽腰窄，很适合穿修身款\n✅ 冬季型人，深色系会让你更有气场\n\n## 💻 程序员舒适通勤方案\n\n### 标准配置（周一到周四）\n**上装组合**：\n- 🥇 首选：UNIQLO 法兰绒格子衬衫（¥149）- 内搭\n- 🥈 外搭：ZARA 牛仔夹克（¥499）或 Nike Tech Fleece（¥699）\n\n**下装选择**：\n- 👖 MD 羊毛西裤（¥1590）- 深灰或海军蓝（会议时穿）\n- 👖 UNIQLO 高弹牛仔裤（¥299）- 日常 coding 时穿\n\n**鞋履**：\n- 👟 Nike P-6000（¥829）- 黑白配色（程序员标配！）\n- 👟 Nike AF1（¥749）- 纯白（周五 casual Friday）\n\n**为什么这样选？**\n🔧 格子衬衫是程序员的"制服"，但我们要选有质感的（UNIQLO这款面料很舒服）\n🔧 牛仔夹克比西装更休闲，但依然有型\n🔧 P-6000的缓震科技让你从工位走到会议室都舒服\n🔧 深色系配合你的冬季型人特征，沉稳可靠\n\n**舒适度评分：96分 | 专业度评分：88分**\n\n需要我调整某些单品吗？比如夏天或冬天的版本？' },
    ],
  },
  {
    title: '海滩度假场景',
    userIdx: 0, // test user
    messages: [
      { role: 'user' as const, content: '下周要去三亚度假，需要准备几套海滩度假风的衣服，帮忙规划一下！' },
      { role: 'assistant' as const, content: '三亚度假！太让人羡慕了 ☀️ 海滩度假穿搭的核心关键词：**轻盈、透气、防晒、拍照好看**！\n\n让我为你规划一套完整的**5天4夜度假衣橱**：\n\n## 🏖️ 三亚度假穿搭方案\n\n### Day 1: 抵达 + 海边漫步\n- **主装**：COS 吊带度假长裙（¥990）- 印花A\n- **防晒**：ZARA 牛仔外套（¥499）- 浅蓝（飞机上冷气大）\n- **鞋子**：Nike AF1 纯白（¥749）\n- **配饰**：ZARA 太阳镜（¥199）- 金框 + COS 羊绒围巾（¥990）- 作披肩\n\n### Day 2: 潜水/水上活动\n- **泳衣外搭**：UNIQLO U系列T恤（¥79）- 白色（ oversized 穿法）\n- **下装**：UNIQLO 运动短裤（¥149）- 黑色\n- **拖鞋**：建议自带洞洞鞋（未收录）\n\n### Day 3: 景点打卡 + 晚餐\n- **日间**：ZARA 碎花茶歇裙（¥459）- 碎花黄\n- **晚间**：换上 MD 真丝晚礼服（¥3990）- 香槟金（如果有正式晚餐）\n\n### Day 4: 休闲躺平\n- **主装**：COS 亚麻衬衫裙（¥690）- 米白色\n- **帽子**：ZARA 贝雷帽（¥129）- 米色（防晒又凹造型）\n\n### Day 5: 返程\n- **舒适套装**：UNIQLO HEATTECH套装（¥199）+ COS 运动卫衣（¥590）\n\n## ✨ 度假穿搭Tips\n1. **颜色策略**：选择明亮色系（黄、蓝、白），在蓝天白云背景下拍照超好看\n2. **材质优先**：亚麻、棉、雪纺 > 合成纤维\n3. **层次搭配**：海边早晚温差大，一定要带一件薄外套\n4. **配饰点睛**：草编包、贝壳项链、宽檐帽（这些可以在当地买）\n\n**总预算估算**：约 ¥8,000-12,000（可根据实际预算删减单品）\n\n需要我为某一天生成详细的虚拟试穿效果吗？' },
    ],
  },
];

// ==================== 推荐结果预置 ====================
const PRESET_RECOMMENDATIONS = [
  // test user 的每日推荐
  {
    userIdx: 0,
    type: RecommendationType.daily,
    itemSkus: ['ZARA-BLAZER-001', 'UNIQLO-UTEE-001', 'ZARA-PANTS-001', 'NIKE-AIRMAX-001'],
    reason: '根据您的历史浏览记录和偏好，今日为您精选通勤必备单品。西装外套搭配阔腿裤是本季最流行的职场穿搭公式，既专业又不失时尚感。U系列T恤可作为内搭或周末休闲穿着，性价比极高。',
    score: 0.92,
  },
  // demo user 的场合推荐
  {
    userIdx: 1,
    type: RecommendationType.occasion,
    itemSkus: ['ZARA-MIDI-001', 'UNIQLO-CARDIGAN-001', 'ZARA-BAG-001', 'NIKE-AF1-001'],
    reason: '检测到您近期有约会/社交需求，为您推荐浪漫法式风格搭配。碎花茶歇裙是今年最火的单品之一，搭配温柔的开衫和链条包，轻松打造女神范儿。',
    score: 0.95,
  },
  // judge user 的商务推荐
  {
    userIdx: 2,
    type: RecommendationType.business,
    itemSkus: ['MD-TROUSERS-001', 'UNIQLO-FLANNEL-001', 'MD-COAT-001', 'NIKE-P6000-001'],
    reason: '基于您的职业属性（商务人士），推荐高品质商务休闲系列。Massimo Dutti的羊毛西裤和羊绒大衣是投资级单品，搭配Uniqlo的基础款内搭，兼顾品质与性价比。',
    score: 0.89,
  },
  // admin user 的季节性推荐
  {
    userIdx: 3,
    type: RecommendationType.seasonal,
    itemSkus: ['UNIQLO-DOWN-001', 'ZARA-SWEATER-001', 'COS-SCARF-001', 'UNIQLO-HEATTECH-001'],
    reason: '换季时节特别推荐！随着气温下降，为您准备了完整的保暖解决方案。从内层的HEATTECH发热内衣，到中层的羊毛毛衣，再到外层的轻薄羽绒服，层层保暖不臃肿。',
    score: 0.87,
  },
  // trending 推荐
  {
    userIdx: 0,
    type: RecommendationType.trending,
    itemSkus: ['COS-DRESS-001', 'ZARA-LBD-001', 'MD-GOWN-001', 'COS-TRENCH-001'],
    reason: '本周热销趋势：极简主义回潮！COS的针织连衣裙和小黑裙成为社交媒体爆款，搜索量增长300%。早入手避免断货哦~',
    score: 0.94,
  },
];

async function main() {
  console.log('🚀 开始填充 AiNeed Demo 数据...');
  console.log('=' .repeat(50));

  // ==================== Step 1: 创建品牌 ====================
  console.log('\n📦 Step 1/7: 创建品牌数据...');
  const brands = await Promise.all([
    prisma.brand.upsert({
      where: { slug: 'zara' },
      update: {},
      create: {
        name: 'ZARA',
        slug: 'zara',
        description: '西班牙快时尚品牌，提供最新潮流服饰。全球知名快时尚领导者，每周上新，紧跟国际流行趋势。',
        website: 'https://www.zara.cn',
        categories: ['tops', 'bottoms', 'dresses', 'outerwear', 'accessories'],
        priceRange: PriceRange.mid_range,
      },
    }),
    prisma.brand.upsert({
      where: { slug: 'uniqlo' },
      update: {},
      create: {
        name: 'UNIQLO',
        slug: 'uniqlo',
        description: '日本休闲服饰品牌，注重基础款与舒适度。LifeWear服适人生理念，倡导简单、高品质的日常服装。',
        website: 'https://www.uniqlo.cn',
        categories: ['tops', 'bottoms', 'outerwear', 'activewear', 'accessories'],
        priceRange: PriceRange.budget,
      },
    }),
    prisma.brand.upsert({
      where: { slug: 'massimo-dutti' },
      update: {},
      create: {
        name: 'Massimo Dutti',
        slug: 'massimo-dutti',
        description: '西班牙高端休闲品牌，优雅精致。Inditex集团旗下精品线，面向追求品质生活的都市精英。',
        website: 'https://www.massimodutti.cn',
        categories: ['tops', 'bottoms', 'dresses', 'outerwear', 'accessories'],
        priceRange: PriceRange.premium,
      },
    }),
    prisma.brand.upsert({
      where: { slug: 'cos' },
      update: {},
      create: {
        name: 'COS',
        slug: 'cos',
        description: 'H&M旗下高端品牌，极简主义设计。Collection of Style，为现代都市人提供永恒经典的美学设计。',
        website: 'https://www.cos.cn',
        categories: ['tops', 'bottoms', 'dresses', 'outerwear', 'accessories'],
        priceRange: PriceRange.premium,
      },
    }),
    prisma.brand.upsert({
      where: { slug: 'nike' },
      update: {},
      create: {
        name: 'Nike',
        slug: 'nike',
        description: '全球领先的运动品牌，Just Do It! 创新科技与运动精神的完美结合。',
        website: 'https://www.nike.com',
        categories: ['activewear', 'footwear', 'accessories'],
        priceRange: PriceRange.mid_range,
      },
    }),
  ]);
  console.log(`   ✅ 创建 ${brands.length} 个品牌`);

  // ==================== Step 2: 创建测试用户 ====================
  console.log('\n👤 Step 2/7: 创建测试用户...');
  const createdUsers = [];
  for (const userData of DEMO_USERS) {
    const hashedPassword = await hash(userData.password);
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        email: userData.email,
        password: hashedPassword,
        nickname: userData.nickname,
        phone: userData.phone,
        gender: userData.gender,
        birthDate: userData.birthDate,
        profile: {
          create: {
            bodyType: userData.bodyType,
            skinTone: userData.skinTone,
            faceShape: userData.faceShape,
            colorSeason: userData.colorSeason,
            height: userData.height,
            weight: userData.weight,
            shoulder: Math.round(userData.height * 0.22),
            bust: userData.gender === Gender.female ? Math.round(userData.weight * 1.6) : Math.round(userData.weight * 1.2),
            waist: Math.round(userData.weight * 1.2),
            hip: userData.gender === Gender.female ? Math.round(userData.weight * 1.7) : Math.round(userData.weight * 1.3),
            stylePreferences: userData.stylePreferences,
            colorPreferences: userData.colorPreferences,
          },
        },
      },
    });
    createdUsers.push(user);
    console.log(`   ✅ ${userData.nickname} (${userData.email})`);
  }

  // ==================== Step 3: 创建服装商品（50+条）====================
  console.log('\n👗 Step 3/7: 创建服装商品数据...');
  const brandMap = new Map(brands.map(b => [b.slug, b.id]));
  const clothingItems = [];

  for (let i = 0; i < CLOTHING_DATABASE.length; i++) {
    const itemData = CLOTHING_DATABASE[i];
    const brandId = brandMap.get(itemData.brandSlug);

    if (!brandId) {
      console.warn(`   ⚠️ 品牌 ${itemData.brandSlug} 未找到，跳过 ${itemData.name}`);
      continue;
    }

    const item = await prisma.clothingItem.create({
      data: {
        brandId,
        name: itemData.name,
        description: itemData.description,
        sku: itemData.sku,
        category: itemData.category,
        subcategory: itemData.subcategory,
        colors: itemData.colors,
        sizes: itemData.sizes,
        tags: itemData.tags,
        price: itemData.price,
        originalPrice: itemData.originalPrice,
        stock: itemData.stock,
        images: PRODUCT_IMAGES[itemData.imageKey] || PRODUCT_IMAGES.shirt,
        isFeatured: itemData.isFeatured || false,
      },
    });
    clothingItems.push(item);
  }
  console.log(`   ✅ 创建 ${clothingItems.length} 件服装商品`);

  // 更新外部链接
  const allClothingItems = await prisma.clothingItem.findMany({
    where: { id: { in: clothingItems.map(item => item.id) } },
    include: { brand: true },
  });

  await Promise.all(
    allClothingItems.map((item) =>
      prisma.clothingItem.update({
        where: { id: item.id },
        data: {
          externalUrl: item.externalUrl ?? buildPurchaseSourceUrl(item.sku, item.brand?.name, item.name),
          mainImage: item.images?.[0] || null,
        },
      }),
    ),
  );

  // ==================== Step 4: 创建用户照片和试穿记录 ====================
  console.log('\n📸 Step 4/7: 创建用户照片和试穿记录...');

  for (let i = 0; i < Math.min(2, createdUsers.length); i++) {
    const user = createdUsers[i];
    const userPhoto = await prisma.userPhoto.create({
      data: {
        userId: user.id,
        type: PhotoType.full_body,
        url: `https://images.unsplash.com/photo-${1515886657613 + i * 1000}-9f3515b0c78f?w=800`,
        thumbnailUrl: `https://images.unsplash.com/photo-${1515886657613 + i * 1000}-9f3515b0c78f?w=200`,
        originalName: `full_body_user${i + 1}.jpg`,
        mimeType: 'image/jpeg',
        size: 1024000 + i * 500000,
        analysisResult: {
          bodyType: DEMO_USERS[i].bodyType,
          skinTone: DEMO_USERS[i].skinTone,
          faceShape: DEMO_USERS[i].faceShape,
          colorSeason: DEMO_USERS[i].colorSeason,
          measurements: {
            shoulder: Math.round(DEMO_USERS[i].height * 0.22),
            bust: DEMO_USERS[i].gender === Gender.female ? Math.round(DEMO_USERS[i].weight * 1.6) : Math.round(DEMO_USERS[i].weight * 1.2),
            waist: Math.round(DEMO_USERS[i].weight * 1.2),
            hip: DEMO_USERS[i].gender === Gender.female ? Math.round(DEMO_USERS[i].weight * 1.7) : Math.round(DEMO_USERS[i].weight * 1.3),
          },
          recommendations: DEMO_USERS[i].gender === Gender.female
            ? ['高腰裤', 'A字裙', 'V领上衣']
            : ['修身衬衫', '直筒裤', 'V领毛衣'],
        },
        analysisStatus: AnalysisStatus.completed,
        analyzedAt: new Date(),
      },
    });

    // 为每个用户创建 1-2 条试穿记录
    const tryOnItems = clothingItems.slice(i * 2, i * 2 + 2);
    for (const item of tryOnItems) {
      await prisma.virtualTryOn.create({
        data: {
          userId: user.id,
          photoId: userPhoto.id,
          itemId: item.id,
          status: 'completed',
          resultImageUrl: `https://example.com/tryon/result-${user.id}-${item.id}.jpg`,
          completedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // 过去7天内随机
        },
      });
    }
  }
  console.log(`   ✅ 创建用户照片和试穿记录`);

  // ==================== Step 5: 创建收藏记录 ====================
  console.log('\n❤️ Step 5/7: 创建收藏记录...');
  let favoriteCount = 0;
  for (let i = 0; i < createdUsers.length; i++) {
    const user = createdUsers[i];
    if (!user) continue;
    // 每个用户随机收藏 3-6 件商品
    const numFavorites = 3 + Math.floor(Math.random() * 4);
    const favoriteItems = clothingItems.slice(i * 5, i * 5 + numFavorites);

    await prisma.favorite.createMany({
      data: favoriteItems.map((item) => ({
        userId: user.id,
        itemId: item.id,
      })),
      skipDuplicates: true,
    });
    favoriteCount += favoriteItems.length;
  }
  console.log(`   ✅ 创建 ${favoriteCount} 条收藏记录`);

  // ==================== Step 6: 创建 AI 对话历史 ====================
  console.log('\n🤖 Step 6/7: 创建 AI 对话历史...');

  for (const scenario of AI_CONVERSATION_SCENARIOS) {
    const user = createdUsers[scenario.userIdx];
    if (!user) continue;
    const sessionId = `demo-session-${scenario.title.replace(/\s+/g, '-')}`;

    // 创建 AI Stylist Session
    const session = await prisma.aiStylistSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        payload: {
          title: scenario.title,
          messages: scenario.messages,
          createdAt: new Date(),
        },
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天后过期
      },
    });

    console.log(`   ✅ 创建对话场景: "${scenario.title}" (${scenario.messages.length} 条消息)`);

    // 为对话中的决策节点创建 UserDecision 记录
    if (scenario.messages.length >= 4) {
      await prisma.userDecision.create({
        data: {
          userId: user.id,
          sessionId: session.id,
          nodeId: 'style-recommendation',
          nodeType: 'recommendation',
          chosenOptionId: 'option-a',
          rejectedOptionIds: ['option-b', 'option-c'],
          decisionTime: 3500,
        },
      });
    }
  }

  // ==================== Step 7: 创建推荐结果 ====================
  console.log('\n⭐ Step 7/7: 创建个性化推荐...');

  const skuToItemId = new Map<string, string>();
  for (const item of allClothingItems) {
    if (item.sku) {
      skuToItemId.set(item.sku, item.id);
    }
  }

  for (const rec of PRESET_RECOMMENDATIONS) {
    const user = createdUsers[rec.userIdx];
    if (!user) continue;
    const itemIds = rec.itemSkus.map(sku => skuToItemId.get(sku)).filter(Boolean) as string[];

    if (itemIds.length === 0) continue;

    await prisma.styleRecommendation.create({
      data: {
        userId: user.id,
        type: rec.type,
        items: itemIds,
        reason: rec.reason,
        score: rec.score,
        isViewed: false,
        isLiked: false,
      },
    });
  }
  console.log(`   ✅ 创建 ${PRESET_RECOMMENDATIONS.length} 条推荐记录`);

  // ==================== 补充数据: 搜索历史、定制请求等 ====================
  console.log('\n📊 创建补充数据...');

  // 搜索历史
  await prisma.searchHistory.createMany({
    data: [
      { userId: createdUsers[0].id, query: '西装外套', results: 24 },
      { userId: createdUsers[0].id, query: '高腰裤', results: 18 },
      { userId: createdUsers[0].id, query: '羊绒大衣', results: 12 },
      { userId: createdUsers[1].id, query: '连衣裙', results: 32 },
      { userId: createdUsers[1].id, query: '约会穿搭', results: 15 },
      { userId: createdUsers[2].id, query: '商务正装', results: 20 },
      { userId: createdUsers[2].id, query: '牛仔裤', results: 28 },
    ],
  });

  // 定制请求示例
  const customizationRequest = await prisma.customizationRequest.create({
    data: {
      userId: createdUsers[0].id,
      type: CustomizationType.tailored,
      title: '定制西装套装',
      description: '希望定制一套深蓝色西装，用于正式场合。需要修身版型，肩宽合适。参考意大利剪裁风格。',
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

  // 定制报价
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
        description: '采用意大利进口面料，资深裁缝手工制作，包含两次试穿调整。提供终身免费修改服务。',
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
        description: '国产优质面料，专业团队制作，包含一次试穿调整。支持线上量体服务。',
        terms: '定金30%，完工后支付余款',
      },
    ],
  });

  // ==================== 输出统计 ====================
  console.log('\n' + '='.repeat(50));
  console.log('✅ AiNeed Demo 数据填充完成！');
  console.log('='.repeat(50));

  console.log('\n📊 数据统计:');
  console.log(`   👤 测试用户: ${createdUsers.length} 个`);
  console.log(`   🏪 品牌: ${brands.length} 个`);
  console.log(`   👗 服装商品: ${clothingItems.length} 件`);
  console.log(`   🤖 AI对话场景: ${AI_CONVERSATION_SCENARIOS.length} 个`);
  console.log(`   ⭐ 推荐记录: ${PRESET_RECOMMENDATIONS.length} 条`);
  console.log(`   ❤️ 收藏记录: ${favoriteCount} 条`);
  console.log(`   📸 试穿记录: ${Math.min(2, createdUsers.length) * 2} 条`);
  console.log(`   🛠️ 定制请求: 1 个（含 2 个报价）`);
  console.log(`   🔍 搜索历史: 7 条`);

  console.log('\n🔑 测试账号列表:');
  console.log('-'.repeat(50));
  for (const user of DEMO_USERS) {
    console.log(`   📧 ${user.email}`);
    console.log(`   🔑 ${user.password}`);
    console.log(`   👤 ${user.nickname} (${user.gender})`);
    console.log('-'.repeat(40));
  }

  console.log('\n💡 使用提示:');
  console.log('   1. test@example.com - 功能测试用');
  console.log('   2. demo@aineed.ai - Demo演示用（推荐评委使用）');
  console.log('   3. judge@competition.ai - 评委专用体验账号');
  console.log('   4. admin@aineed.ai - 管理员账号');
  console.log('\n🎯 下一步:');
  console.log('   运行 pnpm dev 启动后端服务');
  console.log('   访问 http://localhost:3001/api/v1/health/live 检查服务状态');
}

main()
  .catch((e) => {
    console.error('❌ 填充数据失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
