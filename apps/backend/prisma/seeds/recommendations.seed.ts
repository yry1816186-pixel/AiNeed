// @ts-nocheck
import { PrismaClient, RecommendationType } from "@prisma/client";

const RECOMMENDATIONS_DATA = [
  {
    email: "demo_test@example.com",
    recommendations: [
      {
        type: RecommendationType.daily,
        items: ["AN-TOP-002", "AN-BOT-001", "AN-ACC-004"],
        reason: "根据你的优雅通勤风格，推荐这套法式衬衫搭配高腰牛仔裤和链条包，干练又不失女人味。",
        score: 0.923,
        isViewed: true,
        isLiked: true,
      },
      {
        type: RecommendationType.occasion,
        items: ["AN-DRE-001", "AN-FOT-002", "AN-ACC-001"],
        reason: "重要晚宴场合推荐：经典小黑裙搭配尖头高跟鞋和金属手表，优雅得体气场全开。",
        score: 0.887,
        isViewed: true,
        isLiked: false,
      },
      {
        type: RecommendationType.seasonal,
        items: ["AN-OUT-001", "AN-TOP-003", "AN-BOT-002"],
        reason: "春秋换季推荐：经典风衣内搭羊绒毛衣和阔腿西装裤，层次感穿搭应对温差。",
        score: 0.865,
        isViewed: false,
        isLiked: false,
      },
      {
        type: RecommendationType.trending,
        items: ["AN-TOP-006", "AN-BOT-004", "AN-FOT-001"],
        reason: "本周热门趋势：Oversize卫衣搭配工装束脚裤和小白鞋，街头休闲风正流行。",
        score: 0.812,
        isViewed: true,
        isLiked: false,
      },
      {
        type: RecommendationType.daily,
        items: ["AN-TOP-005", "AN-BOT-007", "AN-ACC-006"],
        reason: "职场穿搭推荐：丝质印花衬衫搭配羊毛西裤和皮质腰带，知性优雅有品味。",
        score: 0.895,
        isViewed: false,
        isLiked: true,
      },
    ],
  },
  {
    email: "demo_user@xuno.local",
    recommendations: [
      {
        type: RecommendationType.daily,
        items: ["AN-TOP-002", "AN-BOT-003", "AN-ACC-002"],
        reason: "韩系甜美推荐：法式方领衬衫搭配百褶半裙和丝巾，温柔浪漫约会首选。",
        score: 0.915,
        isViewed: true,
        isLiked: true,
      },
      {
        type: RecommendationType.occasion,
        items: ["AN-DRE-002", "AN-FOT-006", "AN-ACC-005"],
        reason: "春夏约会推荐：碎花雪纺裙搭配穆勒鞋和宽檐帽，清新浪漫度假风。",
        score: 0.878,
        isViewed: true,
        isLiked: false,
      },
      {
        type: RecommendationType.trending,
        items: ["AN-DRE-006", "AN-FOT-004", "AN-ACC-003"],
        reason: "复古风潮推荐：方领泡泡袖连衣裙搭配切尔西靴和珍珠耳环，复古优雅。",
        score: 0.834,
        isViewed: false,
        isLiked: false,
      },
    ],
  },
  {
    email: "demo_judge@competition.ai",
    recommendations: [
      {
        type: RecommendationType.business,
        items: ["AN-OUT-006", "AN-TOP-003", "AN-BOT-007"],
        reason: "商务正装推荐：修身西装搭配羊绒毛衣和羊毛西裤，专业稳重有气场。",
        score: 0.942,
        isViewed: true,
        isLiked: true,
      },
      {
        type: RecommendationType.occasion,
        items: ["AN-OUT-002", "AN-TOP-005", "AN-BOT-002"],
        reason: "商务社交推荐：极简廓形大衣内搭丝质衬衫和阔腿西装裤，高级感十足。",
        score: 0.891,
        isViewed: true,
        isLiked: false,
      },
      {
        type: RecommendationType.seasonal,
        items: ["AN-OUT-004", "AN-ACT-005", "AN-BOT-005"],
        reason: "秋冬保暖推荐：轻量羽绒服搭配运动外套和弹力修身裤，保暖又得体。",
        score: 0.823,
        isViewed: false,
        isLiked: false,
      },
    ],
  },
  {
    email: "demo_admin@xuno.local",
    recommendations: [
      {
        type: RecommendationType.daily,
        items: ["AN-TOP-003", "AN-BOT-002", "AN-ACC-001"],
        reason: "极简职场推荐：羊绒高领毛衣搭配阔腿西装裤和金属手表，干练知性。",
        score: 0.931,
        isViewed: true,
        isLiked: true,
      },
      {
        type: RecommendationType.occasion,
        items: ["AN-DRE-003", "AN-OUT-005", "AN-ACC-006"],
        reason: "知性社交推荐：极简针织裙搭配针织开衫和皮质腰带，优雅从容。",
        score: 0.867,
        isViewed: false,
        isLiked: false,
      },
    ],
  },
  {
    email: "demo_user5@test.com",
    recommendations: [
      {
        type: RecommendationType.daily,
        items: ["AN-TOP-002", "AN-BOT-006", "AN-ACC-003"],
        reason: "甜美日常推荐：法式方领衬衫搭配A字牛仔裙和珍珠耳环，清新可爱。",
        score: 0.908,
        isViewed: true,
        isLiked: true,
      },
      {
        type: RecommendationType.occasion,
        items: ["AN-DRE-002", "AN-FOT-003", "AN-ACC-002"],
        reason: "约会推荐：碎花雪纺裙搭配乐福鞋和丝巾，甜美浪漫满分。",
        score: 0.872,
        isViewed: false,
        isLiked: false,
      },
    ],
  },
  {
    email: "demo_user6@test.com",
    recommendations: [
      {
        type: RecommendationType.daily,
        items: ["AN-ACT-001", "AN-ACT-003", "AN-FOT-005"],
        reason: "运动休闲推荐：高弹力瑜伽裤搭配速干T恤和Air Max跑鞋，活力满满。",
        score: 0.919,
        isViewed: true,
        isLiked: false,
      },
      {
        type: RecommendationType.trending,
        items: ["AN-TOP-006", "AN-BOT-004", "AN-FOT-001"],
        reason: "街头潮流推荐：Oversize卫衣搭配工装束脚裤和小白鞋，酷感十足。",
        score: 0.856,
        isViewed: false,
        isLiked: true,
      },
    ],
  },
  {
    email: "demo_user7@test.com",
    recommendations: [
      {
        type: RecommendationType.daily,
        items: ["AN-DRE-001", "AN-FOT-002", "AN-ACC-004"],
        reason: "法式优雅推荐：经典小黑裙搭配尖头高跟鞋和链条包，永不过时的优雅。",
        score: 0.937,
        isViewed: true,
        isLiked: true,
      },
      {
        type: RecommendationType.occasion,
        items: ["AN-DRE-004", "AN-FOT-002", "AN-ACC-001"],
        reason: "晚宴推荐：丝绒吊带长裙搭配高跟鞋和金属手表，奢华气场。",
        score: 0.889,
        isViewed: true,
        isLiked: false,
      },
      {
        type: RecommendationType.seasonal,
        items: ["AN-OUT-001", "AN-DRE-005", "AN-ACC-006"],
        reason: "秋冬推荐：经典风衣搭配衬衫裙和皮质腰带，法式优雅过秋冬。",
        score: 0.841,
        isViewed: false,
        isLiked: false,
      },
    ],
  },
  {
    email: "demo_user8@test.com",
    recommendations: [
      {
        type: RecommendationType.daily,
        items: ["AN-TOP-006", "AN-BOT-004", "AN-FOT-004"],
        reason: "街头潮流推荐：Oversize卫衣搭配工装束脚裤和切尔西靴，酷感街头。",
        score: 0.924,
        isViewed: true,
        isLiked: true,
      },
      {
        type: RecommendationType.trending,
        items: ["AN-OUT-003", "AN-TOP-004", "AN-BOT-001"],
        reason: "高街推荐：机车皮衣内搭条纹T恤和直筒牛仔裤，帅气有型。",
        score: 0.867,
        isViewed: false,
        isLiked: false,
      },
    ],
  },
  {
    email: "demo_user9@test.com",
    recommendations: [
      {
        type: RecommendationType.daily,
        items: ["AN-TOP-003", "AN-BOT-002", "AN-ACC-001"],
        reason: "极简推荐：羊绒高领毛衣搭配阔腿西装裤和金属手表，少即是多。",
        score: 0.948,
        isViewed: true,
        isLiked: true,
      },
      {
        type: RecommendationType.occasion,
        items: ["AN-DRE-003", "AN-OUT-005", "AN-ACC-006"],
        reason: "知性推荐：极简针织裙搭配针织开衫和皮质腰带，质感穿搭。",
        score: 0.876,
        isViewed: false,
        isLiked: false,
      },
    ],
  },
  {
    email: "demo_user10@test.com",
    recommendations: [
      {
        type: RecommendationType.business,
        items: ["AN-OUT-006", "AN-TOP-003", "AN-BOT-007"],
        reason: "商务推荐：修身西装搭配羊绒毛衣和羊毛西裤，稳重专业。",
        score: 0.935,
        isViewed: true,
        isLiked: true,
      },
      {
        type: RecommendationType.occasion,
        items: ["AN-OUT-002", "AN-TOP-005", "AN-BOT-002"],
        reason: "商务社交推荐：极简廓形大衣内搭丝质衬衫和阔腿西装裤，高级品味。",
        score: 0.882,
        isViewed: true,
        isLiked: false,
      },
      {
        type: RecommendationType.seasonal,
        items: ["AN-OUT-004", "AN-TOP-003", "AN-BOT-005"],
        reason: "秋冬推荐：轻量羽绒服搭配羊绒毛衣和弹力修身裤，保暖有型。",
        score: 0.815,
        isViewed: false,
        isLiked: false,
      },
    ],
  },
];

export async function seedRecommendations(
  prisma: PrismaClient,
  userMap: Map<string, any>,
  itemMap: Map<string, any>
): Promise<{ count: number }> {
  let count = 0;

  for (const entry of RECOMMENDATIONS_DATA) {
    const user = userMap.get(entry.email);
    if (!user) continue;

    for (const rec of entry.recommendations) {
      const itemIds: string[] = [];
      for (const sku of rec.items) {
        const item = itemMap.get(sku);
        if (item) itemIds.push(item.id);
      }

      if (itemIds.length === 0) continue;

      const existing = await prisma.styleRecommendation.findFirst({
        where: { userId: user.id, type: rec.type, reason: rec.reason },
      });
      if (existing) continue;

      await prisma.styleRecommendation.create({
        data: {
          userId: user.id,
          type: rec.type,
          items: itemIds,
          reason: rec.reason,
          score: rec.score,
          isViewed: rec.isViewed ?? false,
          isLiked: rec.isLiked ?? false,
        },
      });
      count++;
    }
  }

  return { count };
}
