// @ts-nocheck
import { PrismaClient, BehaviorEventType, PriceRange } from "@prisma/client";
import { randomInt, randomElement } from "./utils";

const BEHAVIOR_EVENTS_DATA = [
  {
    email: "test@example.com",
    events: [
      {
        eventType: BehaviorEventType.page_view,
        category: "home",
        action: "view",
        targetType: "page",
        targetId: "home",
        daysAgo: 7,
        duration: 45,
      },
      {
        eventType: BehaviorEventType.item_view,
        category: "clothing",
        action: "view_detail",
        targetType: "clothing_item",
        targetId: "AN-TOP-002",
        daysAgo: 6,
        duration: 30,
      },
      {
        eventType: BehaviorEventType.search,
        category: "search",
        action: "query",
        targetType: null,
        targetId: null,
        daysAgo: 6,
        metadata: { query: "法式衬衫" },
      },
      {
        eventType: BehaviorEventType.filter,
        category: "clothing",
        action: "filter",
        targetType: null,
        targetId: null,
        daysAgo: 6,
        metadata: { filters: { category: "tops", priceMax: 300 } },
      },
      {
        eventType: BehaviorEventType.try_on_start,
        category: "try_on",
        action: "start",
        targetType: "clothing_item",
        targetId: "AN-DRE-001",
        daysAgo: 5,
      },
      {
        eventType: BehaviorEventType.try_on_complete,
        category: "try_on",
        action: "complete",
        targetType: "clothing_item",
        targetId: "AN-DRE-001",
        daysAgo: 5,
        duration: 120,
      },
      {
        eventType: BehaviorEventType.favorite,
        category: "clothing",
        action: "add_favorite",
        targetType: "clothing_item",
        targetId: "AN-TOP-002",
        daysAgo: 4,
      },
      {
        eventType: BehaviorEventType.recommendation_view,
        category: "recommendation",
        action: "view",
        targetType: "recommendation",
        targetId: "daily-001",
        daysAgo: 3,
      },
      {
        eventType: BehaviorEventType.recommendation_click,
        category: "recommendation",
        action: "click",
        targetType: "clothing_item",
        targetId: "AN-OUT-001",
        daysAgo: 3,
      },
      {
        eventType: BehaviorEventType.add_to_cart,
        category: "cart",
        action: "add",
        targetType: "clothing_item",
        targetId: "AN-OUT-001",
        daysAgo: 2,
      },
      {
        eventType: BehaviorEventType.purchase,
        category: "order",
        action: "complete",
        targetType: "clothing_item",
        targetId: "AN-OUT-001",
        daysAgo: 1,
      },
    ],
  },
  {
    email: "demo@xuno.app",
    events: [
      {
        eventType: BehaviorEventType.page_view,
        category: "home",
        action: "view",
        targetType: "page",
        targetId: "home",
        daysAgo: 5,
      },
      {
        eventType: BehaviorEventType.search,
        category: "search",
        action: "query",
        targetType: null,
        targetId: null,
        daysAgo: 4,
        metadata: { query: "碎花裙" },
      },
      {
        eventType: BehaviorEventType.item_view,
        category: "clothing",
        action: "view_detail",
        targetType: "clothing_item",
        targetId: "AN-DRE-002",
        daysAgo: 4,
        duration: 25,
      },
      {
        eventType: BehaviorEventType.favorite,
        category: "clothing",
        action: "add_favorite",
        targetType: "clothing_item",
        targetId: "AN-DRE-002",
        daysAgo: 3,
      },
      {
        eventType: BehaviorEventType.recommendation_view,
        category: "recommendation",
        action: "view",
        targetType: "recommendation",
        targetId: "daily-002",
        daysAgo: 2,
      },
      {
        eventType: BehaviorEventType.recommendation_click,
        category: "recommendation",
        action: "click",
        targetType: "clothing_item",
        targetId: "AN-TOP-002",
        daysAgo: 2,
      },
      {
        eventType: BehaviorEventType.item_view,
        category: "clothing",
        action: "view_detail",
        targetType: "clothing_item",
        targetId: "AN-TOP-002",
        daysAgo: 1,
        duration: 35,
      },
      {
        eventType: BehaviorEventType.try_on_start,
        category: "try_on",
        action: "start",
        targetType: "clothing_item",
        targetId: "AN-TOP-002",
        daysAgo: 1,
      },
    ],
  },
  {
    email: "judge@competition.ai",
    events: [
      {
        eventType: BehaviorEventType.page_view,
        category: "home",
        action: "view",
        targetType: "page",
        targetId: "home",
        daysAgo: 10,
      },
      {
        eventType: BehaviorEventType.search,
        category: "search",
        action: "query",
        targetType: null,
        targetId: null,
        daysAgo: 8,
        metadata: { query: "商务西裤" },
      },
      {
        eventType: BehaviorEventType.item_view,
        category: "clothing",
        action: "view_detail",
        targetType: "clothing_item",
        targetId: "AN-BOT-007",
        daysAgo: 7,
        duration: 40,
      },
      {
        eventType: BehaviorEventType.item_view,
        category: "clothing",
        action: "view_detail",
        targetType: "clothing_item",
        targetId: "AN-OUT-006",
        daysAgo: 6,
        duration: 30,
      },
      {
        eventType: BehaviorEventType.favorite,
        category: "clothing",
        action: "add_favorite",
        targetType: "clothing_item",
        targetId: "AN-BOT-007",
        daysAgo: 5,
      },
      {
        eventType: BehaviorEventType.add_to_cart,
        category: "cart",
        action: "add",
        targetType: "clothing_item",
        targetId: "AN-BOT-007",
        daysAgo: 4,
      },
      {
        eventType: BehaviorEventType.add_to_cart,
        category: "cart",
        action: "add",
        targetType: "clothing_item",
        targetId: "AN-OUT-006",
        daysAgo: 4,
      },
      {
        eventType: BehaviorEventType.purchase,
        category: "order",
        action: "complete",
        targetType: "clothing_item",
        targetId: "AN-BOT-007",
        daysAgo: 3,
      },
      {
        eventType: BehaviorEventType.purchase,
        category: "order",
        action: "complete",
        targetType: "clothing_item",
        targetId: "AN-OUT-006",
        daysAgo: 3,
      },
      {
        eventType: BehaviorEventType.post_create,
        category: "community",
        action: "create",
        targetType: "post",
        targetId: null,
        daysAgo: 2,
      },
    ],
  },
  {
    email: "user5@test.com",
    events: [
      {
        eventType: BehaviorEventType.page_view,
        category: "home",
        action: "view",
        targetType: "page",
        targetId: "home",
        daysAgo: 4,
      },
      {
        eventType: BehaviorEventType.item_view,
        category: "clothing",
        action: "view_detail",
        targetType: "clothing_item",
        targetId: "AN-DRE-002",
        daysAgo: 3,
        duration: 20,
      },
      {
        eventType: BehaviorEventType.favorite,
        category: "clothing",
        action: "add_favorite",
        targetType: "clothing_item",
        targetId: "AN-DRE-002",
        daysAgo: 3,
      },
      {
        eventType: BehaviorEventType.try_on_start,
        category: "try_on",
        action: "start",
        targetType: "clothing_item",
        targetId: "AN-DRE-002",
        daysAgo: 2,
      },
      {
        eventType: BehaviorEventType.try_on_complete,
        category: "try_on",
        action: "complete",
        targetType: "clothing_item",
        targetId: "AN-DRE-002",
        daysAgo: 2,
        duration: 90,
      },
      {
        eventType: BehaviorEventType.share,
        category: "social",
        action: "share",
        targetType: "clothing_item",
        targetId: "AN-DRE-002",
        daysAgo: 1,
      },
      {
        eventType: BehaviorEventType.purchase,
        category: "order",
        action: "complete",
        targetType: "clothing_item",
        targetId: "AN-DRE-002",
        daysAgo: 0,
      },
    ],
  },
  {
    email: "user8@test.com",
    events: [
      {
        eventType: BehaviorEventType.page_view,
        category: "home",
        action: "view",
        targetType: "page",
        targetId: "home",
        daysAgo: 4,
      },
      {
        eventType: BehaviorEventType.search,
        category: "search",
        action: "query",
        targetType: null,
        targetId: null,
        daysAgo: 3,
        metadata: { query: "机车皮衣" },
      },
      {
        eventType: BehaviorEventType.item_view,
        category: "clothing",
        action: "view_detail",
        targetType: "clothing_item",
        targetId: "AN-OUT-003",
        daysAgo: 3,
        duration: 45,
      },
      {
        eventType: BehaviorEventType.item_view,
        category: "clothing",
        action: "view_detail",
        targetType: "clothing_item",
        targetId: "AN-TOP-006",
        daysAgo: 2,
        duration: 20,
      },
      {
        eventType: BehaviorEventType.favorite,
        category: "clothing",
        action: "add_favorite",
        targetType: "clothing_item",
        targetId: "AN-OUT-003",
        daysAgo: 2,
      },
      {
        eventType: BehaviorEventType.try_on_start,
        category: "try_on",
        action: "start",
        targetType: "clothing_item",
        targetId: "AN-OUT-003",
        daysAgo: 1,
      },
      {
        eventType: BehaviorEventType.try_on_complete,
        category: "try_on",
        action: "complete",
        targetType: "clothing_item",
        targetId: "AN-OUT-003",
        daysAgo: 1,
        duration: 110,
      },
      {
        eventType: BehaviorEventType.post_create,
        category: "community",
        action: "create",
        targetType: "post",
        targetId: null,
        daysAgo: 0,
      },
      {
        eventType: BehaviorEventType.post_like,
        category: "community",
        action: "like",
        targetType: "post",
        targetId: null,
        daysAgo: 0,
      },
    ],
  },
];

const QUIZ_RESULTS_DATA = [
  {
    email: "test@example.com",
    occasionPreferences: { work: 0.7, date: 0.6, casual: 0.5, party: 0.3, sports: 0.2 },
    colorPreferences: { warm: 0.8, neutral: 0.7, cool: 0.3, bright: 0.2 },
    styleKeywords: ["优雅通勤", "法式浪漫", "轻奢简约"],
    priceRange: PriceRange.mid_range,
    confidenceScore: 0.89,
    isLatest: true,
  },
  {
    email: "demo@xuno.app",
    occasionPreferences: { casual: 0.8, date: 0.7, party: 0.5, work: 0.3, sports: 0.2 },
    colorPreferences: { pastel: 0.9, warm: 0.6, neutral: 0.5, bright: 0.3 },
    styleKeywords: ["韩系甜美", "少女感", "清新自然"],
    priceRange: PriceRange.budget,
    confidenceScore: 0.85,
    isLatest: true,
  },
  {
    email: "judge@competition.ai",
    occasionPreferences: { work: 0.9, formal: 0.8, business_casual: 0.7, casual: 0.3, sports: 0.2 },
    colorPreferences: { neutral: 0.9, cool: 0.7, dark: 0.6, warm: 0.2 },
    styleKeywords: ["商务正装", "意式绅士", "都市精英"],
    priceRange: PriceRange.premium,
    confidenceScore: 0.92,
    isLatest: true,
  },
  {
    email: "admin@xuno.app",
    occasionPreferences: { work: 0.8, social: 0.6, casual: 0.4, date: 0.3 },
    colorPreferences: { neutral: 0.9, cool: 0.8, muted: 0.7, warm: 0.2 },
    styleKeywords: ["极简主义", "职场干练", "知性优雅"],
    priceRange: PriceRange.premium,
    confidenceScore: 0.91,
    isLatest: true,
  },
  {
    email: "user5@test.com",
    occasionPreferences: { casual: 0.8, date: 0.7, school: 0.6, party: 0.4 },
    colorPreferences: { pastel: 0.8, warm: 0.7, bright: 0.5, neutral: 0.4 },
    styleKeywords: ["韩系穿搭", "日系文艺", "甜美风"],
    priceRange: PriceRange.budget,
    confidenceScore: 0.83,
    isLatest: true,
  },
  {
    email: "user6@test.com",
    occasionPreferences: { sports: 0.9, casual: 0.7, work: 0.3 },
    colorPreferences: { neutral: 0.7, dark: 0.6, bright: 0.4, warm: 0.3 },
    styleKeywords: ["运动休闲", "美式街头", "户外机能"],
    priceRange: PriceRange.mid_range,
    confidenceScore: 0.86,
    isLatest: true,
  },
  {
    email: "user7@test.com",
    occasionPreferences: { social: 0.8, date: 0.7, party: 0.6, work: 0.4 },
    colorPreferences: { dark: 0.8, neutral: 0.7, cool: 0.5, warm: 0.3 },
    styleKeywords: ["法式优雅", "轻奢名媛", "经典复古"],
    priceRange: PriceRange.premium,
    confidenceScore: 0.9,
    isLatest: true,
  },
  {
    email: "user8@test.com",
    occasionPreferences: { casual: 0.9, party: 0.6, sports: 0.4 },
    colorPreferences: { dark: 0.8, neutral: 0.7, bright: 0.5, cool: 0.4 },
    styleKeywords: ["街头潮流", "日系CityBoy", "高街时尚"],
    priceRange: PriceRange.mid_range,
    confidenceScore: 0.87,
    isLatest: true,
  },
  {
    email: "user9@test.com",
    occasionPreferences: { casual: 0.7, work: 0.6, social: 0.3 },
    colorPreferences: { neutral: 0.95, muted: 0.8, cool: 0.5, warm: 0.2 },
    styleKeywords: ["极简主义", "北欧风", "性冷淡风"],
    priceRange: PriceRange.premium,
    confidenceScore: 0.93,
    isLatest: true,
  },
  {
    email: "user10@test.com",
    occasionPreferences: { work: 0.9, formal: 0.8, business_casual: 0.7, casual: 0.3 },
    colorPreferences: { neutral: 0.85, dark: 0.7, warm: 0.4, cool: 0.3 },
    styleKeywords: ["商务正装", "商务休闲", "英伦经典"],
    priceRange: PriceRange.premium,
    confidenceScore: 0.88,
    isLatest: true,
  },
];

const IMPRESSION_EVENTS = [
  {
    email: "test@example.com",
    recommendationId: "daily-001",
    impressionType: "view",
    dwellTimeMs: 5000,
    daysAgo: 3,
  },
  {
    email: "test@example.com",
    recommendationId: "daily-001",
    impressionType: "click",
    dwellTimeMs: 15000,
    daysAgo: 3,
  },
  {
    email: "test@example.com",
    recommendationId: "occasion-001",
    impressionType: "view",
    dwellTimeMs: 3000,
    daysAgo: 2,
  },
  {
    email: "test@example.com",
    recommendationId: "seasonal-001",
    impressionType: "dismiss",
    dwellTimeMs: 1000,
    daysAgo: 1,
  },
  {
    email: "demo@xuno.app",
    recommendationId: "daily-002",
    impressionType: "view",
    dwellTimeMs: 8000,
    daysAgo: 2,
  },
  {
    email: "demo@xuno.app",
    recommendationId: "daily-002",
    impressionType: "click",
    dwellTimeMs: 20000,
    daysAgo: 2,
  },
  {
    email: "demo@xuno.app",
    recommendationId: "occasion-002",
    impressionType: "view",
    dwellTimeMs: 4000,
    daysAgo: 1,
  },
  {
    email: "judge@competition.ai",
    recommendationId: "business-001",
    impressionType: "view",
    dwellTimeMs: 12000,
    daysAgo: 5,
  },
  {
    email: "judge@competition.ai",
    recommendationId: "business-001",
    impressionType: "click",
    dwellTimeMs: 30000,
    daysAgo: 5,
  },
  {
    email: "judge@competition.ai",
    recommendationId: "business-001",
    impressionType: "try_on",
    dwellTimeMs: 60000,
    daysAgo: 4,
  },
  {
    email: "user5@test.com",
    recommendationId: "daily-003",
    impressionType: "view",
    dwellTimeMs: 6000,
    daysAgo: 3,
  },
  {
    email: "user5@test.com",
    recommendationId: "daily-003",
    impressionType: "click",
    dwellTimeMs: 18000,
    daysAgo: 3,
  },
  {
    email: "user5@test.com",
    recommendationId: "occasion-003",
    impressionType: "view",
    dwellTimeMs: 2000,
    daysAgo: 2,
  },
  {
    email: "user7@test.com",
    recommendationId: "daily-004",
    impressionType: "view",
    dwellTimeMs: 10000,
    daysAgo: 4,
  },
  {
    email: "user7@test.com",
    recommendationId: "daily-004",
    impressionType: "click",
    dwellTimeMs: 25000,
    daysAgo: 4,
  },
  {
    email: "user7@test.com",
    recommendationId: "occasion-004",
    impressionType: "view",
    dwellTimeMs: 7000,
    daysAgo: 3,
  },
  {
    email: "user7@test.com",
    recommendationId: "occasion-004",
    impressionType: "click",
    dwellTimeMs: 15000,
    daysAgo: 3,
  },
  {
    email: "user8@test.com",
    recommendationId: "daily-005",
    impressionType: "view",
    dwellTimeMs: 9000,
    daysAgo: 2,
  },
  {
    email: "user8@test.com",
    recommendationId: "daily-005",
    impressionType: "click",
    dwellTimeMs: 22000,
    daysAgo: 2,
  },
  {
    email: "user10@test.com",
    recommendationId: "business-002",
    impressionType: "view",
    dwellTimeMs: 11000,
    daysAgo: 3,
  },
  {
    email: "user10@test.com",
    recommendationId: "business-002",
    impressionType: "click",
    dwellTimeMs: 28000,
    daysAgo: 3,
  },
  {
    email: "user10@test.com",
    recommendationId: "seasonal-002",
    impressionType: "dismiss",
    dwellTimeMs: 800,
    daysAgo: 1,
  },
];

export async function seedRecommendationTestData(
  prisma: PrismaClient,
  userMap: Map<string, any>,
  itemMap: Map<string, any>
): Promise<{ eventCount: number; quizResultCount: number; impressionCount: number }> {
  let eventCount = 0;
  let quizResultCount = 0;
  let impressionCount = 0;

  for (const entry of BEHAVIOR_EVENTS_DATA) {
    const user = userMap.get(entry.email);
    if (!user) continue;

    for (const evt of entry.events) {
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - evt.daysAgo);
      createdAt.setHours(randomInt(8, 22), randomInt(0, 59), 0, 0);

      const targetId =
        evt.targetId && itemMap.has(evt.targetId) ? itemMap.get(evt.targetId).id : evt.targetId;

      const existing = await prisma.userBehaviorEvent.findFirst({
        where: {
          userId: user.id,
          eventType: evt.eventType,
          category: evt.category,
          action: evt.action,
          createdAt: {
            gte: new Date(createdAt.getTime() - 60000),
            lte: new Date(createdAt.getTime() + 60000),
          },
        },
      });

      if (!existing) {
        await prisma.userBehaviorEvent.create({
          data: {
            userId: user.id,
            sessionId: `session-${user.id.slice(0, 8)}-${evt.daysAgo}`,
            eventType: evt.eventType,
            category: evt.category,
            action: evt.action,
            targetType: evt.targetType,
            targetId: targetId,
            metadata: evt.metadata ?? null,
            duration: evt.duration ?? null,
            createdAt,
          },
        });
        eventCount++;
      }
    }
  }

  const quiz = await prisma.styleQuiz.findFirst({ where: { id: "style-quiz-default" } });
  if (quiz) {
    for (const result of QUIZ_RESULTS_DATA) {
      const user = userMap.get(result.email);
      if (!user) continue;

      const existing = await prisma.styleQuizResult.findFirst({
        where: { userId: user.id, quizId: quiz.id, isLatest: true },
      });

      if (!existing) {
        await prisma.styleQuizResult.create({
          data: {
            userId: user.id,
            quizId: quiz.id,
            occasionPreferences: result.occasionPreferences,
            colorPreferences: result.colorPreferences,
            styleKeywords: result.styleKeywords,
            priceRange: result.priceRange,
            confidenceScore: result.confidenceScore,
            isLatest: result.isLatest,
          },
        });
        quizResultCount++;
      }
    }
  }

  for (const imp of IMPRESSION_EVENTS) {
    const user = userMap.get(imp.email);
    if (!user) continue;

    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - imp.daysAgo);
    createdAt.setHours(randomInt(8, 22), randomInt(0, 59), 0, 0);

    const existing = await prisma.recommendationImpression.findFirst({
      where: {
        userId: user.id,
        recommendationId: imp.recommendationId,
        impressionType: imp.impressionType,
        createdAt: {
          gte: new Date(createdAt.getTime() - 60000),
          lte: new Date(createdAt.getTime() + 60000),
        },
      },
    });

    if (!existing) {
      await prisma.recommendationImpression.create({
        data: {
          userId: user.id,
          recommendationId: imp.recommendationId,
          impressionType: imp.impressionType,
          dwellTimeMs: imp.dwellTimeMs,
          createdAt,
        },
      });
      impressionCount++;
    }
  }

  return { eventCount, quizResultCount, impressionCount };
}
