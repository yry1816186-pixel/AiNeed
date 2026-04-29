// @ts-nocheck
import { PrismaClient, RecommendationType } from "@prisma/client";

const OCCASIONS = [
  "日常通勤",
  "商务会议",
  "约会社交",
  "休闲周末",
  "运动健身",
  "校园生活",
  "派对聚会",
];

const OUTFIT_ITEMS = [
  ["AN-TOP-001", "AN-BOT-001", "AN-FOT-001"],
  ["AN-TOP-002", "AN-BOT-003", "AN-FOT-002"],
  ["AN-TOP-003", "AN-BOT-007", "AN-FOT-003"],
  ["AN-OUT-001", "AN-TOP-005", "AN-BOT-002"],
  ["AN-TOP-006", "AN-BOT-004", "AN-FOT-005"],
  ["AN-DRE-001", "AN-ACC-001", "AN-FOT-002"],
  ["AN-OUT-006", "AN-TOP-008", "AN-BOT-005"],
];

export async function seedDemoRecommendations(
  prisma: PrismaClient,
  userMap: Map<string, any>,
  itemMap: Map<string, any>
) {
  const demoRecommendations = [];

  const demoUser = userMap.get("demo_test@example.com") || userMap.values().next().value;

  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    date.setHours(0, 0, 0, 0);

    const itemSkus = OUTFIT_ITEMS[i % OUTFIT_ITEMS.length];
    const itemIds = itemSkus.map((sku) => itemMap.get(sku)?.id).filter(Boolean);

    const rec = await prisma.recommendationBatch.create({
      data: {
        userId: demoUser.id,
        algorithm: "demo-sandbox",
        is_demo: true,
        provider: "sandbox",
        context: {
          occasion: OCCASIONS[i],
          date: date.toISOString().split("T")[0],
          is_demo: true,
          provider: "sandbox",
        },
        itemCount: itemIds.length,
        createdAt: date,
        impressions: {
          create: itemIds.map((itemId) => ({
            userId: demoUser.id,
            recommendationId: `demo-day-${i + 1}-${itemId}`,
            impressionType: "view",
          })),
        },
      },
    });

    demoRecommendations.push(rec);

    const styleRec = await prisma.styleRecommendation.create({
      data: {
        userId: demoUser.id,
        type: RecommendationType.daily,
        items: itemIds,
        reason: `${OCCASIONS[i]}场景推荐 — Demo sandbox 数据，仅供参考`,
        score: 0.85 + i * 0.02,
        isViewed: i < 3,
        isLiked: i === 0,
        is_demo: true,
        provider: "sandbox",
      },
    });

    demoRecommendations.push(styleRec);
  }

  return { demoRecommendations };
}
