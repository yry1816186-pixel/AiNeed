import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';
import {
  UserFactory,
  CategoryFactory,
  BrandFactory,
  ClothingItemFactory,
  OutfitFactory,
  OutfitItemFactory,
  ChatSessionFactory,
  CommunityPostFactory,
  CustomDesignFactory,
  CustomOrderFactory,
  BespokeStudioFactory,
  BespokeOrderFactory,
  AvatarTemplateFactory,
  UserAvatarFactory,
  WardrobeItemFactory,
} from './mock-factory';

const FIXTURE_USER_A_ID = uuidv4();
const FIXTURE_USER_B_ID = uuidv4();
const FIXTURE_BRAND_ID = uuidv4();
const FIXTURE_CATEGORY_TOP_ID = uuidv4();
const FIXTURE_CATEGORY_BOTTOM_ID = uuidv4();
const FIXTURE_CATEGORY_OUTER_ID = uuidv4();
const FIXTURE_CATEGORY_SHOES_ID = uuidv4();
const FIXTURE_CATEGORY_ACCESSORY_ID = uuidv4();
const FIXTURE_CATEGORY_DRESS_ID = uuidv4();
const FIXTURE_CATEGORY_BAG_ID = uuidv4();
const FIXTURE_CATEGORY_HAT_ID = uuidv4();
const FIXTURE_OUTFIT_1_ID = uuidv4();
const FIXTURE_OUTFIT_2_ID = uuidv4();
const FIXTURE_OUTFIT_3_ID = uuidv4();
const FIXTURE_TEMPLATE_FEMALE_ID = uuidv4();
const FIXTURE_TEMPLATE_MALE_ID = uuidv4();

export const FIXTURE_IDS = {
  USER_A: FIXTURE_USER_A_ID,
  USER_B: FIXTURE_USER_B_ID,
  BRAND: FIXTURE_BRAND_ID,
  CATEGORY_TOP: FIXTURE_CATEGORY_TOP_ID,
  CATEGORY_BOTTOM: FIXTURE_CATEGORY_BOTTOM_ID,
  CATEGORY_OUTER: FIXTURE_CATEGORY_OUTER_ID,
  CATEGORY_SHOES: FIXTURE_CATEGORY_SHOES_ID,
  CATEGORY_ACCESSORY: FIXTURE_CATEGORY_ACCESSORY_ID,
  CATEGORY_DRESS: FIXTURE_CATEGORY_DRESS_ID,
  CATEGORY_BAG: FIXTURE_CATEGORY_BAG_ID,
  CATEGORY_HAT: FIXTURE_CATEGORY_HAT_ID,
  OUTFIT_1: FIXTURE_OUTFIT_1_ID,
  OUTFIT_2: FIXTURE_OUTFIT_2_ID,
  OUTFIT_3: FIXTURE_OUTFIT_3_ID,
  TEMPLATE_FEMALE: FIXTURE_TEMPLATE_FEMALE_ID,
  TEMPLATE_MALE: FIXTURE_TEMPLATE_MALE_ID,
} as const;

export const FIXTURE_USERS = {
  userA: UserFactory.build({
    id: FIXTURE_IDS.USER_A,
    phone: '13800138001',
    email: 'user-a@test.com',
    nickname: '用户A',
    gender: 'female',
    height: 165,
    weight: 55,
    bodyType: 'hourglass',
    colorSeason: 'spring',
    role: 'user',
  }),
  userB: UserFactory.build({
    id: FIXTURE_IDS.USER_B,
    phone: '13800138002',
    email: 'user-b@test.com',
    nickname: '用户B',
    gender: 'male',
    height: 178,
    weight: 72,
    bodyType: 'rectangle',
    colorSeason: 'winter',
    role: 'user',
  }),
} as const;

const CLOTHING_SEEDS = [
  { name: '白色基础T恤', categoryKey: 'CATEGORY_TOP', colors: ['white'], materials: ['cotton'], styleTags: ['minimal', 'basic'], seasons: ['spring', 'summer'], occasions: ['casual', 'daily'], gender: 'unisex', price: 199.00, originalPrice: 299.00, fitType: 'regular' },
  { name: '深蓝直筒牛仔裤', categoryKey: 'CATEGORY_BOTTOM', colors: ['navy', 'blue'], materials: ['denim'], styleTags: ['casual', 'classic'], seasons: ['spring', 'autumn'], occasions: ['casual', 'daily'], gender: 'unisex', price: 399.00, originalPrice: 599.00, fitType: 'straight' },
  { name: '黑色西装外套', categoryKey: 'CATEGORY_OUTER', colors: ['black'], materials: ['wool', 'polyester'], styleTags: ['formal', 'business'], seasons: ['autumn', 'winter'], occasions: ['work', 'formal'], gender: 'unisex', price: 1299.00, originalPrice: 1999.00, fitType: 'slim' },
  { name: '白色运动鞋', categoryKey: 'CATEGORY_SHOES', colors: ['white'], materials: ['leather', 'rubber'], styleTags: ['casual', 'sport'], seasons: ['spring', 'summer', 'autumn'], occasions: ['casual', 'sport'], gender: 'unisex', price: 699.00, originalPrice: 899.00, fitType: 'regular' },
  { name: '银色简约项链', categoryKey: 'CATEGORY_ACCESSORY', colors: ['silver'], materials: ['steel'], styleTags: ['minimal', 'elegant'], seasons: ['spring', 'summer', 'autumn', 'winter'], occasions: ['casual', 'date', 'formal'], gender: 'female', price: 159.00, originalPrice: 259.00, fitType: null },
  { name: '碎花连衣裙', categoryKey: 'CATEGORY_DRESS', colors: ['pink', 'white'], materials: ['cotton', 'chiffon'], styleTags: ['romantic', 'feminine'], seasons: ['spring', 'summer'], occasions: ['date', 'casual'], gender: 'female', price: 499.00, originalPrice: 799.00, fitType: 'a-line' },
  { name: '驼色风衣', categoryKey: 'CATEGORY_OUTER', colors: ['camel', 'beige'], materials: ['cotton', 'polyester'], styleTags: ['classic', 'elegant'], seasons: ['autumn', 'spring'], occasions: ['work', 'casual'], gender: 'female', price: 899.00, originalPrice: 1299.00, fitType: 'regular' },
  { name: '黑色皮质手提包', categoryKey: 'CATEGORY_BAG', colors: ['black'], materials: ['leather'], styleTags: ['formal', 'classic'], seasons: ['spring', 'summer', 'autumn', 'winter'], occasions: ['work', 'formal'], gender: 'female', price: 599.00, originalPrice: 899.00, fitType: null },
  { name: '灰色针织毛衣', categoryKey: 'CATEGORY_TOP', colors: ['grey'], materials: ['wool', 'cashmere'], styleTags: ['cozy', 'casual'], seasons: ['autumn', 'winter'], occasions: ['casual', 'daily'], gender: 'unisex', price: 459.00, originalPrice: 699.00, fitType: 'regular' },
  { name: '米色渔夫帽', categoryKey: 'CATEGORY_HAT', colors: ['beige'], materials: ['cotton'], styleTags: ['casual', 'street'], seasons: ['spring', 'summer'], occasions: ['casual', 'daily'], gender: 'unisex', price: 129.00, originalPrice: 199.00, fitType: null },
] as const;

type CategoryKey = keyof typeof FIXTURE_IDS;

const clothingIds = CLOTHING_SEEDS.map(() => uuidv4());

export const FIXTURE_CLOTHING_IDS = clothingIds;

export const FIXTURE_BRAND = BrandFactory.build({
  id: FIXTURE_IDS.BRAND,
  name: 'MUJI',
  description: '无印良品 - 简约生活品牌',
});

export const FIXTURE_CATEGORIES = [
  CategoryFactory.build({ id: FIXTURE_IDS.CATEGORY_TOP, name: '上装', nameEn: 'Top', slug: 'top-test' }),
  CategoryFactory.build({ id: FIXTURE_IDS.CATEGORY_BOTTOM, name: '下装', nameEn: 'Bottom', slug: 'bottom-test' }),
  CategoryFactory.build({ id: FIXTURE_IDS.CATEGORY_OUTER, name: '外套', nameEn: 'Outer', slug: 'outer-test' }),
  CategoryFactory.build({ id: FIXTURE_IDS.CATEGORY_SHOES, name: '鞋履', nameEn: 'Shoes', slug: 'shoes-test' }),
  CategoryFactory.build({ id: FIXTURE_IDS.CATEGORY_ACCESSORY, name: '配饰', nameEn: 'Accessory', slug: 'accessory-test' }),
  CategoryFactory.build({ id: FIXTURE_IDS.CATEGORY_DRESS, name: '连衣裙', nameEn: 'Dress', slug: 'dress-test' }),
  CategoryFactory.build({ id: FIXTURE_IDS.CATEGORY_BAG, name: '包袋', nameEn: 'Bag', slug: 'bag-test' }),
  CategoryFactory.build({ id: FIXTURE_IDS.CATEGORY_HAT, name: '帽子', nameEn: 'Hat', slug: 'hat-test' }),
];

export const FIXTURE_CLOTHING = CLOTHING_SEEDS.map((seed, index) => {
  const categoryKey = seed.categoryKey as CategoryKey;
  return ClothingItemFactory.build({
    id: clothingIds[index],
    brandId: FIXTURE_IDS.BRAND,
    categoryId: FIXTURE_IDS[categoryKey],
    name: seed.name,
    colors: [...seed.colors],
    materials: [...seed.materials],
    styleTags: [...seed.styleTags],
    seasons: [...seed.seasons],
    occasions: [...seed.occasions],
    gender: seed.gender,
    price: new Prisma.Decimal(seed.price),
    originalPrice: new Prisma.Decimal(seed.originalPrice),
    fitType: seed.fitType,
  });
});

export const FIXTURE_OUTFITS = [
  OutfitFactory.build({
    id: FIXTURE_IDS.OUTFIT_1,
    userId: FIXTURE_IDS.USER_A,
    name: '日常休闲',
    description: '简约舒适的日常穿搭',
    occasion: 'casual',
    season: 'spring',
    styleTags: ['minimal', 'casual'],
    isPublic: true,
  }),
  OutfitFactory.build({
    id: FIXTURE_IDS.OUTFIT_2,
    userId: FIXTURE_IDS.USER_A,
    name: '商务正装',
    description: '正式商务场合穿搭',
    occasion: 'work',
    season: 'autumn',
    styleTags: ['formal', 'business'],
    isPublic: true,
  }),
  OutfitFactory.build({
    id: FIXTURE_IDS.OUTFIT_3,
    userId: FIXTURE_IDS.USER_B,
    name: '约会穿搭',
    description: '浪漫约会风格',
    occasion: 'date',
    season: 'spring',
    styleTags: ['romantic', 'elegant'],
    isPublic: false,
  }),
];

export const FIXTURE_OUTFIT_ITEMS = [
  ...OutfitItemFactory.buildList(1, { outfitId: FIXTURE_IDS.OUTFIT_1, clothingId: clothingIds[0], slot: 'top', sortOrder: 0 }),
  ...OutfitItemFactory.buildList(1, { outfitId: FIXTURE_IDS.OUTFIT_1, clothingId: clothingIds[1], slot: 'bottom', sortOrder: 1 }),
  ...OutfitItemFactory.buildList(1, { outfitId: FIXTURE_IDS.OUTFIT_1, clothingId: clothingIds[3], slot: 'shoes', sortOrder: 2 }),
  ...OutfitItemFactory.buildList(1, { outfitId: FIXTURE_IDS.OUTFIT_2, clothingId: clothingIds[2], slot: 'outer', sortOrder: 0 }),
  ...OutfitItemFactory.buildList(1, { outfitId: FIXTURE_IDS.OUTFIT_2, clothingId: clothingIds[1], slot: 'bottom', sortOrder: 1 }),
  ...OutfitItemFactory.buildList(1, { outfitId: FIXTURE_IDS.OUTFIT_2, clothingId: clothingIds[7], slot: 'accessory', sortOrder: 2 }),
  ...OutfitItemFactory.buildList(1, { outfitId: FIXTURE_IDS.OUTFIT_3, clothingId: clothingIds[5], slot: 'dress', sortOrder: 0 }),
  ...OutfitItemFactory.buildList(1, { outfitId: FIXTURE_IDS.OUTFIT_3, clothingId: clothingIds[4], slot: 'accessory', sortOrder: 1 }),
];

export const FIXTURE_CHAT_SESSION = ChatSessionFactory.build({
  userId: FIXTURE_IDS.USER_A,
  title: '面试穿搭咨询',
  context: { occasion: 'interview', budget: '1000-2000' },
});

export const FIXTURE_COMMUNITY_POST = CommunityPostFactory.build({
  userId: FIXTURE_IDS.USER_A,
  title: '春日穿搭分享',
  content: '分享一套春日日常穿搭，白色T恤搭配牛仔裤，简约又好看',
  tags: ['春日', '日常', '简约'],
  outfitId: FIXTURE_IDS.OUTFIT_1,
});

export const FIXTURE_CUSTOM_DESIGN = CustomDesignFactory.build({
  userId: FIXTURE_IDS.USER_A,
  name: '星空图案T恤',
  productType: 'tshirt',
  status: 'draft',
});

export const FIXTURE_CUSTOM_ORDER = CustomOrderFactory.build({
  userId: FIXTURE_IDS.USER_A,
  designId: FIXTURE_CUSTOM_DESIGN.id,
  productType: 'tshirt',
  material: 'cotton',
  size: 'M',
  unitPrice: 19900,
  totalPrice: 19900,
  status: 'pending',
});

export const FIXTURE_BESPOKE_STUDIO = BespokeStudioFactory.build({
  userId: FIXTURE_IDS.USER_B,
  name: '锦绣定制工作室',
  slug: `jinxiu-${FIXTURE_IDS.USER_B.slice(0, 8)}`,
  city: '上海',
  specialties: ['西装', '旗袍'],
  isVerified: true,
});

export const FIXTURE_BESPOKE_ORDER = BespokeOrderFactory.build({
  userId: FIXTURE_IDS.USER_A,
  studioId: FIXTURE_BESPOKE_STUDIO.id,
  title: '定制一套商务西装',
  status: 'submitted',
});

export const FIXTURE_AVATAR_TEMPLATE_FEMALE = AvatarTemplateFactory.build({
  id: FIXTURE_IDS.TEMPLATE_FEMALE,
  name: '默认女性形象',
  gender: 'female',
});

export const FIXTURE_AVATAR_TEMPLATE_MALE = AvatarTemplateFactory.build({
  id: FIXTURE_IDS.TEMPLATE_MALE,
  name: '默认男性形象',
  gender: 'male',
});

export const FIXTURE_USER_AVATAR = UserAvatarFactory.build({
  userId: FIXTURE_IDS.USER_A,
  templateId: FIXTURE_IDS.TEMPLATE_FEMALE,
});

export const FIXTURE_WARDROBE_ITEMS = [
  WardrobeItemFactory.build({ userId: FIXTURE_IDS.USER_A, clothingId: clothingIds[0], category: 'top', color: 'white', brand: 'MUJI' }),
  WardrobeItemFactory.build({ userId: FIXTURE_IDS.USER_A, clothingId: clothingIds[1], category: 'bottom', color: 'navy', brand: 'MUJI' }),
  WardrobeItemFactory.build({ userId: FIXTURE_IDS.USER_A, clothingId: clothingIds[2], category: 'outer', color: 'black', brand: 'MUJI' }),
  WardrobeItemFactory.build({ userId: FIXTURE_IDS.USER_B, clothingId: clothingIds[3], category: 'shoes', color: 'white', brand: 'MUJI' }),
];
