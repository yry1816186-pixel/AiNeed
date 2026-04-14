/**
 * E2E 测试数据 Fixtures
 * @description 提供测试常用的数据模板
 */

import {
  BodyType,
  SkinTone,
  ColorSeason,
  ClothingCategory,
  PhotoType,
  TryOnStatus,
} from "@prisma/client";

/**
 * 用户测试数据
 */
export const userFixtures = {
  validUser: {
    email: "test@example.com",
    password: "Test123456!",
    nickname: "测试用户",
  },

  weakPasswordUser: {
    email: "weak@example.com",
    password: "123",
    nickname: "弱密码用户",
  },

  invalidEmailUser: {
    email: "invalid-email",
    password: "Test123456!",
    nickname: "无效邮箱用户",
  },

  duplicateEmailUser: {
    email: "duplicate@example.com",
    password: "Test123456!",
    nickname: "重复邮箱用户",
  },
};

/**
 * 用户画像测试数据
 */
export const profileFixtures = {
  validProfile: {
    bodyType: BodyType.hourglass,
    skinTone: SkinTone.medium,
    colorSeason: ColorSeason.autumn_warm,
    height: 165,
    weight: 55,
    stylePreferences: [
      { name: "casual", category: "style" },
      { name: "elegant", category: "style" },
    ],
    colorPreferences: ["blue", "black", "white"],
  },

  minimalProfile: {
    bodyType: BodyType.rectangle,
    skinTone: SkinTone.light,
    colorSeason: ColorSeason.summer_cool,
  },
};

/**
 * 服装商品测试数据
 */
export const clothingFixtures = {
  tshirt: {
    name: "经典白色T恤",
    category: ClothingCategory.tops,
    subcategory: "t-shirts",
    images: ["https://example.com/white-tshirt.jpg"],
    price: 199.0,
    colors: ["white", "black", "gray"],
    sizes: ["S", "M", "L", "XL"],
    tags: ["basic", "casual", "cotton"],
  },

  jeans: {
    name: "修身牛仔裤",
    category: ClothingCategory.bottoms,
    subcategory: "jeans",
    images: ["https://example.com/blue-jeans.jpg"],
    price: 399.0,
    colors: ["blue", "black"],
    sizes: ["28", "30", "32", "34"],
    tags: ["denim", "casual", "slim-fit"],
  },

  dress: {
    name: "优雅连衣裙",
    category: ClothingCategory.dresses,
    subcategory: "casual-dresses",
    images: ["https://example.com/floral-dress.jpg"],
    price: 599.0,
    colors: ["floral", "black"],
    sizes: ["S", "M", "L"],
    tags: ["elegant", "party", "floral"],
  },

  jacket: {
    name: "商务西装外套",
    category: ClothingCategory.outerwear,
    subcategory: "blazers",
    images: ["https://example.com/blazer.jpg"],
    price: 899.0,
    colors: ["black", "navy", "gray"],
    sizes: ["S", "M", "L", "XL"],
    tags: ["formal", "business", "professional"],
  },
};

/**
 * 用户照片测试数据
 */
export const photoFixtures = {
  fullBody: {
    type: PhotoType.full_body,
    url: "https://example.com/full-body.jpg",
    thumbnailUrl: "https://example.com/full-body-thumb.jpg",
  },

  halfBody: {
    type: PhotoType.half_body,
    url: "https://example.com/half-body.jpg",
    thumbnailUrl: "https://example.com/half-body-thumb.jpg",
  },

  front: {
    type: PhotoType.front,
    url: "https://example.com/front.jpg",
    thumbnailUrl: "https://example.com/front-thumb.jpg",
  },
};

/**
 * AI 造型师会话测试数据
 */
export const stylistSessionFixtures = {
  interviewSession: {
    entry: "我要一套面试穿搭",
    goal: "商务面试",
    context: {
      industry: "tech",
      position: "engineer",
    },
  },

  dateSession: {
    entry: "帮我做约会穿搭",
    goal: "浪漫约会",
    context: {
      venue: "restaurant",
      time: "evening",
    },
  },

  casualSession: {
    entry: "我想走极简通勤风",
    goal: "日常通勤",
  },
};

/**
 * AI 造型师消息测试数据
 */
export const stylistMessageFixtures = {
  validMessage: {
    message: "我想要一套正式的商务面试穿搭",
  },

  shortMessage: {
    message: "推荐",
  },

  longMessage: {
    message: "a".repeat(2000), // 最大长度
  },

  tooLongMessage: {
    message: "a".repeat(2001), // 超过最大长度
  },
};

/**
 * 虚拟试衣测试数据
 */
export const tryOnFixtures = {
  validRequest: {
    photoId: "valid-photo-id",
    itemId: "valid-item-id",
  },

  invalidPhotoRequest: {
    photoId: "non-existent-photo-id",
    itemId: "valid-item-id",
  },

  invalidItemRequest: {
    photoId: "valid-photo-id",
    itemId: "non-existent-item-id",
  },
};

/**
 * 推荐系统测试数据
 */
export const recommendationFixtures = {
  filterByCategory: {
    category: ClothingCategory.tops,
  },

  filterByOccasion: {
    occasion: "daily",
  },

  filterByLimit: {
    limit: 5,
  },

  combinedFilters: {
    category: ClothingCategory.tops,
    occasion: "work",
    limit: 10,
  },
};

/**
 * 性能测试阈值 (毫秒)
 */
export const performanceThresholds = {
  auth: {
    register: 500,
    login: 300,
    refresh: 200,
    me: 100,
  },

  recommendations: {
    list: 500,
    styleGuide: 200,
    similar: 500,
    outfit: 500,
  },

  aiStylist: {
    createSession: 500,
    sendMessage: 5000, // 含 LLM 调用
    listSessions: 200,
  },

  tryOn: {
    create: 500,
    history: 300,
    status: 200,
  },
};

/**
 * 错误响应测试数据
 */
export const errorFixtures = {
  unauthorized: {
    statusCode: 401,
    message: "Unauthorized",
  },

  forbidden: {
    statusCode: 403,
    message: "Forbidden",
  },

  notFound: {
    statusCode: 404,
    message: "Not Found",
  },

  badRequest: {
    statusCode: 400,
    message: "Bad Request",
  },

  conflict: {
    statusCode: 409,
    message: "Conflict",
  },
};
