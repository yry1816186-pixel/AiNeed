import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';

type FactoryModel<T> = {
  build: (overrides?: Partial<T>) => T;
  buildList: (count: number, overrides?: Partial<T>) => T[];
};

function defineFactory<T>(defaults: () => T): FactoryModel<T> {
  return {
    build: (overrides?: Partial<T>): T => ({ ...defaults(), ...overrides } as T),
    buildList: (count: number, overrides?: Partial<T>): T[] =>
      Array.from({ length: count }, () => ({ ...defaults(), ...overrides } as T)),
  };
}

export const UserFactory = defineFactory<Prisma.UserUncheckedCreateInput>(() => ({
  id: uuidv4(),
  phone: '13800138000',
  email: null,
  passwordHash: null,
  nickname: '测试用户',
  avatarUrl: null,
  gender: null,
  birthYear: null,
  height: null,
  weight: null,
  bodyType: null,
  colorSeason: null,
  role: 'user',
  language: 'zh',
  createdAt: new Date(),
  updatedAt: new Date(),
}));

export const BodyProfileFactory = defineFactory<Prisma.BodyProfileUncheckedCreateInput>(() => ({
  id: uuidv4(),
  userId: uuidv4(),
  bodyType: 'hourglass',
  colorSeason: 'spring',
  measurements: { bust: 88, waist: 68, hips: 94 },
  analysisResult: { confidence: 0.85, recommendations: ['V领上衣', '高腰裤'] },
  sourceImageUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}));

export const UserStylePreferenceFactory = defineFactory<Prisma.UserStylePreferenceUncheckedCreateInput>(() => ({
  id: uuidv4(),
  userId: uuidv4(),
  styleTags: ['minimal', 'casual'],
  occasionTags: ['work', 'daily'],
  colorPreferences: ['black', 'white', 'navy'],
  budgetRange: '500-1000',
  createdAt: new Date(),
}));

export const CategoryFactory = defineFactory<Prisma.CategoryUncheckedCreateInput>(() => ({
  id: uuidv4(),
  name: 'T恤',
  nameEn: 'T-Shirt',
  slug: `tshirt-${uuidv4().slice(0, 8)}`,
  parentId: null,
  sortOrder: 0,
}));

export const BrandFactory = defineFactory<Prisma.BrandUncheckedCreateInput>(() => ({
  id: uuidv4(),
  name: '测试品牌',
  logoUrl: null,
  description: '测试品牌描述',
}));

export const ClothingItemFactory = defineFactory<Prisma.ClothingItemUncheckedCreateInput>(() => ({
  id: uuidv4(),
  brandId: null,
  categoryId: null,
  name: '白色基础T恤',
  description: '经典白色基础款T恤',
  price: new Prisma.Decimal(199.00),
  originalPrice: new Prisma.Decimal(299.00),
  currency: 'CNY',
  gender: 'unisex',
  seasons: ['spring', 'summer'],
  occasions: ['casual', 'daily'],
  styleTags: ['minimal', 'basic'],
  colors: ['white'],
  materials: ['cotton'],
  fitType: 'regular',
  imageUrls: ['https://cdn.aineed.com/test/tshirt.jpg'],
  sourceUrl: null,
  purchaseUrl: null,
  sourceName: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}));

export const OutfitFactory = defineFactory<Prisma.OutfitUncheckedCreateInput>(() => ({
  id: uuidv4(),
  userId: uuidv4(),
  name: '日常休闲搭配',
  description: '简约日常穿搭方案',
  occasion: 'casual',
  season: 'spring',
  styleTags: ['minimal', 'casual'],
  isPublic: false,
  likesCount: 0,
  commentsCount: 0,
  createdAt: new Date(),
}));

export const OutfitItemFactory = defineFactory<Prisma.OutfitItemUncheckedCreateInput>(() => ({
  id: uuidv4(),
  outfitId: uuidv4(),
  clothingId: uuidv4(),
  slot: 'top',
  sortOrder: 0,
}));

export const ChatSessionFactory = defineFactory<Prisma.ChatSessionUncheckedCreateInput>(() => ({
  id: uuidv4(),
  userId: uuidv4(),
  title: '面试穿搭咨询',
  context: { occasion: 'interview', budget: '1000-2000' },
  createdAt: new Date(),
  updatedAt: new Date(),
}));

export const ChatMessageFactory = defineFactory<Prisma.ChatMessageUncheckedCreateInput>(() => ({
  id: uuidv4(),
  sessionId: uuidv4(),
  role: 'user',
  content: '我想找一套面试穿搭',
  metadata: Prisma.JsonNull,
  createdAt: new Date(),
}));

export const TryonResultFactory = defineFactory<Prisma.TryonResultUncheckedCreateInput>(() => ({
  id: uuidv4(),
  userId: uuidv4(),
  clothingId: uuidv4(),
  sourceImageUrl: 'https://cdn.aineed.com/test/source.jpg',
  resultImageUrl: null,
  provider: 'catvton',
  status: 'pending',
  metadata: Prisma.JsonNull,
  createdAt: new Date(),
}));

export const UserInteractionFactory = defineFactory<Prisma.UserInteractionUncheckedCreateInput>(() => ({
  id: uuidv4(),
  userId: uuidv4(),
  clothingId: uuidv4(),
  interactionType: 'view',
  durationMs: null,
  context: Prisma.JsonNull,
  createdAt: new Date(),
}));

export const WardrobeItemFactory = defineFactory<Prisma.WardrobeItemUncheckedCreateInput>(() => ({
  id: uuidv4(),
  userId: uuidv4(),
  clothingId: null,
  customName: '我的白T恤',
  imageUrl: 'https://cdn.aineed.com/test/wardrobe-item.jpg',
  category: 'top',
  color: 'white',
  brand: '测试品牌',
  notes: null,
  addedAt: new Date(),
}));

export const FavoriteFactory = defineFactory<Prisma.FavoriteUncheckedCreateInput>(() => ({
  id: uuidv4(),
  userId: uuidv4(),
  targetType: 'clothing',
  targetId: uuidv4(),
  createdAt: new Date(),
}));

export const StyleRuleFactory = defineFactory<Prisma.StyleRuleUncheckedCreateInput>(() => ({
  id: uuidv4(),
  category: 'color',
  ruleType: 'avoid',
  condition: { colors: ['red', 'green'], context: 'formal' },
  recommendation: '正式场合避免红绿搭配',
  priority: 5,
  isActive: true,
}));

export const CommunityPostFactory = defineFactory<Prisma.CommunityPostUncheckedCreateInput>(() => ({
  id: uuidv4(),
  userId: uuidv4(),
  title: '今日穿搭分享',
  content: '分享一套简约日常穿搭，白色T恤搭配牛仔裤',
  imageUrls: ['https://cdn.aineed.com/test/post-1.jpg'],
  tags: ['日常', '简约', '白T'],
  outfitId: null,
  likesCount: 0,
  commentsCount: 0,
  sharesCount: 0,
  isFeatured: false,
  status: 'published',
  createdAt: new Date(),
  updatedAt: new Date(),
}));

export const PostCommentFactory = defineFactory<Prisma.PostCommentUncheckedCreateInput>(() => ({
  id: uuidv4(),
  postId: uuidv4(),
  userId: uuidv4(),
  parentId: null,
  content: '很好看的搭配！',
  likesCount: 0,
  createdAt: new Date(),
}));

export const UserFollowFactory = defineFactory<Prisma.UserFollowUncheckedCreateInput>(() => ({
  id: uuidv4(),
  followerId: uuidv4(),
  followingId: uuidv4(),
  createdAt: new Date(),
}));

export const ChatRoomFactory = defineFactory<Prisma.ChatRoomUncheckedCreateInput>(() => ({
  id: uuidv4(),
  createdAt: new Date(),
}));

export const ChatRoomParticipantFactory = defineFactory<Prisma.ChatRoomParticipantUncheckedCreateInput>(() => ({
  roomId: uuidv4(),
  userId: uuidv4(),
  joinedAt: new Date(),
}));

export const DirectMessageFactory = defineFactory<Prisma.DirectMessageUncheckedCreateInput>(() => ({
  id: uuidv4(),
  roomId: uuidv4(),
  senderId: uuidv4(),
  content: '你好，请问这件衣服还有货吗？',
  messageType: 'text',
  isRead: false,
  createdAt: new Date(),
}));

export const NotificationFactory = defineFactory<Prisma.NotificationUncheckedCreateInput>(() => ({
  id: uuidv4(),
  userId: uuidv4(),
  type: 'like',
  title: '收到点赞',
  content: '有人点赞了你的搭配',
  referenceId: null,
  referenceType: null,
  isRead: false,
  createdAt: new Date(),
}));

export const AvatarTemplateFactory = defineFactory<Prisma.AvatarTemplateUncheckedCreateInput>(() => ({
  id: uuidv4(),
  name: '默认女性形象',
  gender: 'female',
  thumbnailUrl: 'https://cdn.aineed.com/test/avatar-thumb.jpg',
  drawingConfig: { faceShape: 'round', eyeShape: 'almond' },
  parameters: {
    faceShape: { min: 0, max: 100, default: 50, label: '脸型' },
    eyeShape: { options: ['almond', 'round'], default: 'almond', label: '眼型' },
    skinTone: { options: ['#FFDFC4', '#F0C8A0'], default: '#FFDFC4', label: '肤色' },
    hairStyle: { options: [{ id: 'long', name: '长发', thumbnailUrl: '' }], default: 'long' },
    hairColor: { options: ['#000000', '#8B4513'], default: '#000000' },
  },
  defaultClothingMap: { top: { color: '#FFFFFF', type: 'tshirt' } },
  isActive: true,
  sortOrder: 0,
  createdAt: new Date(),
}));

export const UserAvatarFactory = defineFactory<Prisma.UserAvatarUncheckedCreateInput>(() => ({
  id: uuidv4(),
  userId: uuidv4(),
  templateId: uuidv4(),
  avatarParams: { faceShape: 50, eyeShape: 'almond', skinTone: '#FFDFC4', hairStyle: 'long', hairColor: '#000000' },
  clothingMap: { top: { color: '#FFFFFF', type: 'tshirt' }, bottom: { color: '#000080', type: 'jeans' } },
  thumbnailUrl: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}));

export const CustomDesignFactory = defineFactory<Prisma.CustomDesignUncheckedCreateInput>(() => ({
  id: uuidv4(),
  userId: uuidv4(),
  name: '星空图案T恤',
  designData: {
    patternUrl: 'https://cdn.aineed.com/test/pattern.png',
    position: { x: 0.5, y: 0.4 },
    scale: 1.0,
    rotation: 0,
    tileMode: 'none',
    opacity: 1.0,
  },
  patternImageUrl: 'https://cdn.aineed.com/test/pattern.png',
  previewImageUrl: 'https://cdn.aineed.com/test/preview.png',
  productType: 'tshirt',
  productTemplateId: null,
  isPublic: false,
  price: null,
  likesCount: 0,
  purchasesCount: 0,
  downloadsCount: 0,
  tags: ['星空', '宇宙'],
  status: 'draft',
  createdAt: new Date(),
  updatedAt: new Date(),
}));

export const CustomOrderFactory = defineFactory<Prisma.CustomOrderUncheckedCreateInput>(() => ({
  id: uuidv4(),
  userId: uuidv4(),
  designId: uuidv4(),
  productType: 'tshirt',
  material: 'cotton',
  size: 'M',
  quantity: 1,
  unitPrice: 19900,
  totalPrice: 19900,
  status: 'pending',
  podOrderId: null,
  trackingNumber: null,
  shippingAddress: { name: '张三', phone: '13800138000', province: '北京', city: '北京', district: '朝阳区', detail: 'xxx路xxx号' },
  paymentInfo: Prisma.JsonNull,
  createdAt: new Date(),
  updatedAt: new Date(),
}));

export const ProductTemplateFactory = defineFactory<Prisma.ProductTemplateUncheckedCreateInput>(() => ({
  id: uuidv4(),
  productType: 'tshirt',
  material: 'cotton',
  baseCost: 9900,
  suggestedPrice: 19900,
  uvMapUrl: 'https://cdn.aineed.com/templates/tshirt-uv.png',
  previewModelUrl: null,
  availableSizes: ['S', 'M', 'L', 'XL', 'XXL'],
  printArea: { x: 100, y: 150, width: 400, height: 500 },
  podProvider: 'eprolo',
  podProductId: 'EPR-TSHIRT-001',
  isActive: true,
}));

export const DesignLikeFactory = defineFactory<Prisma.DesignLikeUncheckedCreateInput>(() => ({
  userId: uuidv4(),
  designId: uuidv4(),
  createdAt: new Date(),
}));

export const DesignReportFactory = defineFactory<Prisma.DesignReportUncheckedCreateInput>(() => ({
  id: uuidv4(),
  reporterId: uuidv4(),
  designId: uuidv4(),
  reason: 'copyright',
  description: '疑似抄袭知名IP',
  reviewResult: Prisma.JsonNull,
  status: 'pending',
  reviewedBy: null,
  reviewedAt: null,
  createdAt: new Date(),
}));

export const BespokeStudioFactory = defineFactory<Prisma.BespokeStudioUncheckedCreateInput>(() => ({
  id: uuidv4(),
  userId: uuidv4(),
  name: '锦绣定制工作室',
  slug: `jinxiu-${uuidv4().slice(0, 8)}`,
  logoUrl: 'https://cdn.aineed.com/test/studio-logo.jpg',
  coverImageUrl: null,
  description: '专注高端西装定制',
  city: '上海',
  address: null,
  specialties: ['西装', '旗袍'],
  serviceTypes: ['量身定制', '面料选购'],
  priceRange: '3000-8000',
  portfolioImages: ['https://cdn.aineed.com/test/portfolio-1.jpg'],
  rating: new Prisma.Decimal(4.80),
  reviewCount: 12,
  orderCount: 45,
  isVerified: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}));

export const BespokeOrderFactory = defineFactory<Prisma.BespokeOrderUncheckedCreateInput>(() => ({
  id: uuidv4(),
  userId: uuidv4(),
  studioId: uuidv4(),
  status: 'submitted',
  title: '定制一套商务西装',
  description: '需要一套深蓝色商务西装，用于重要会议',
  referenceImages: ['https://cdn.aineed.com/test/ref-suit.jpg'],
  budgetRange: '5000-8000',
  deadline: null,
  measurements: { chest: 96, waist: 82, shoulder: 44 },
  assignedStylistId: null,
  statusHistory: [],
  completedAt: null,
  cancelledAt: null,
  cancelReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}));

export const BespokeMessageFactory = defineFactory<Prisma.BespokeMessageUncheckedCreateInput>(() => ({
  id: uuidv4(),
  orderId: uuidv4(),
  senderId: uuidv4(),
  content: '您好，请问面料有哪些选择？',
  messageType: 'text',
  attachments: [],
  isRead: false,
  createdAt: new Date(),
}));

export const BespokeQuoteFactory = defineFactory<Prisma.BespokeQuoteUncheckedCreateInput>(() => ({
  id: uuidv4(),
  orderId: uuidv4(),
  studioId: uuidv4(),
  totalPrice: 680000,
  items: [{ name: '西装外套', description: '意大利进口面料', quantity: 1, unitPrice: 450000, subtotal: 450000 }, { name: '西裤', description: '同面料配套', quantity: 1, unitPrice: 230000, subtotal: 230000 }],
  estimatedDays: 21,
  validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  notes: '含一次免费修改',
  status: 'pending',
  createdAt: new Date(),
}));

export const BespokeReviewFactory = defineFactory<Prisma.BespokeReviewUncheckedCreateInput>(() => ({
  id: uuidv4(),
  orderId: uuidv4(),
  userId: uuidv4(),
  studioId: uuidv4(),
  rating: 5,
  content: '非常满意，做工精细',
  images: [],
  isAnonymous: false,
  createdAt: new Date(),
}));

export const OutfitImageFactory = defineFactory<Prisma.OutfitImageUncheckedCreateInput>(() => ({
  id: uuidv4(),
  userId: uuidv4(),
  outfitData: { occasion: 'casual', items: ['白色T恤', '牛仔裤', '白色运动鞋'], styleTips: '简约日常风' },
  prompt: 'A casual outfit featuring a white t-shirt, blue jeans, and white sneakers, fashion photography style',
  imageUrl: null,
  status: 'pending',
  cost: 1,
  metadata: Prisma.JsonNull,
  createdAt: new Date(),
}));
