// @ts-nocheck
import { PrismaClient } from "@prisma/client";

const FASHION_RULES = [
  {
    key: "body_type_rules",
    value: {
      hourglass: {
        name: "沙漏型",
        description: "肩臀比例均衡，腰线明显",
        do: [
          "强调腰线，选择收腰款式",
          "V领和方领展露锁骨线条",
          "高腰裤/裙优化身材比例",
          "A字裙和包臀裙展现曲线",
          "腰带点缀强调腰身",
        ],
        dont: ["避免过于宽松遮盖腰线的款式", "避免低腰裤破坏比例", "避免大面积横条纹"],
        recommendedCategories: ["dresses", "tops", "bottoms"],
        avoidCategories: [],
      },
      rectangle: {
        name: "直筒型",
        description: "肩臀腰比例接近，曲线不明显",
        do: [
          "创造腰线 illusion，选择收腰或系带款式",
          "层叠穿搭增加层次感",
          "选择有体积感的袖子（泡泡袖、灯笼袖）",
          "A字裙和百褶裙增加下半身曲线",
          "选择有腰线设计的连衣裙",
        ],
        dont: ["避免直筒无腰线的连衣裙", "避免过于贴身的款式暴露身材直线", "避免同色系无层次穿搭"],
        recommendedCategories: ["dresses", "tops", "outerwear"],
        avoidCategories: [],
      },
      triangle: {
        name: "梨型",
        description: "臀宽大于肩宽，下半身较丰满",
        do: [
          "上半身选择亮色或有设计感的款式吸引视线上移",
          "A字裙和阔腿裤修饰臀腿线条",
          "V领和一字领展露肩颈线条",
          "选择肩部有细节的上衣平衡比例",
          "深色下半身+浅色上半身配色策略",
        ],
        dont: [
          "避免紧身裤和铅笔裙暴露臀腿",
          "避免下半身亮色或大图案",
          "避免低腰裤和臀部有装饰的款式",
        ],
        recommendedCategories: ["tops", "dresses", "outerwear"],
        avoidCategories: [],
      },
      inverted_triangle: {
        name: "倒三角型",
        description: "肩宽大于臀宽，上半身较壮",
        do: [
          "下半身选择亮色或有图案的款式吸引视线下移",
          "V领和深U领拉长颈部线条",
          "阔腿裤和A字裙增加下半身体量",
          "选择简约上半身+设计感下半身的搭配",
          "落肩款式弱化肩宽",
        ],
        dont: ["避免垫肩和肩部装饰", "避免紧身裤使上下比例更失衡", "避免上半身大面积亮色或横条纹"],
        recommendedCategories: ["bottoms", "dresses"],
        avoidCategories: [],
      },
      oval: {
        name: "椭圆型",
        description: "腰腹较丰满，四肢相对纤细",
        do: [
          "展露纤细的四肢，选择及膝或九分长度",
          "V领和开领款式拉长上半身线条",
          "选择垂坠感面料遮盖腰腹",
          "高腰线款式提升腰线位置",
          "长款开衫和风衣修饰身形",
        ],
        dont: [
          "避免腰部收紧的款式",
          "避免短上衣和低腰裤",
          "避免大面积亮色和横条纹",
          "避免过于贴身的针织衫",
        ],
        recommendedCategories: ["outerwear", "tops", "dresses"],
        avoidCategories: [],
      },
    },
    description: "体型穿搭规则 - 根据不同体型推荐穿搭策略",
  },
  {
    key: "color_season_rules",
    value: {
      spring_warm: {
        name: "春季暖型",
        description: "肤色偏暖，适合温暖明亮的色彩",
        bestColors: ["珊瑚色", "桃粉", "鹅黄", "草绿", "暖棕", "米白", "橘红", "杏色"],
        worstColors: ["冷灰", "深紫", "冰蓝", "纯黑"],
        palette: {
          primary: ["珊瑚色", "暖米色", "浅驼色"],
          secondary: ["鹅黄", "草绿", "桃粉"],
          neutral: ["米白", "暖灰", "浅棕"],
        },
        metalTone: "金色",
      },
      spring_light: {
        name: "春季浅型",
        description: "肤色偏浅偏暖，适合浅淡明亮的色彩",
        bestColors: ["浅粉", "淡蓝", "薄荷绿", "奶油白", "浅紫", "鹅黄", "浅驼"],
        worstColors: ["深棕", "墨绿", "深酒红", "纯黑"],
        palette: {
          primary: ["浅粉", "奶油白", "淡蓝"],
          secondary: ["薄荷绿", "浅紫", "鹅黄"],
          neutral: ["浅灰", "米白", "浅驼"],
        },
        metalTone: "金色/玫瑰金",
      },
      summer_cool: {
        name: "夏季冷型",
        description: "肤色偏冷偏浅，适合柔和淡雅的色彩",
        bestColors: ["雾霾蓝", "灰粉", "薰衣草紫", "浅灰", "玫瑰粉", "薄荷蓝", "藕粉"],
        worstColors: ["橘红", "明黄", "草绿", "深棕"],
        palette: {
          primary: ["雾霾蓝", "灰粉", "薰衣草紫"],
          secondary: ["浅灰", "薄荷蓝", "藕粉"],
          neutral: ["灰色", "银灰", "冷白"],
        },
        metalTone: "银色/玫瑰金",
      },
      summer_light: {
        name: "夏季浅型",
        description: "肤色偏冷偏浅，适合低饱和度的浅色",
        bestColors: ["浅蓝", "淡粉", "浅紫", "薄荷绿", "浅灰", "藕粉", "冰白"],
        worstColors: ["大红", "明黄", "深棕", "墨绿"],
        palette: {
          primary: ["浅蓝", "淡粉", "冰白"],
          secondary: ["浅紫", "薄荷绿", "浅灰"],
          neutral: ["冷白", "浅灰", "银灰"],
        },
        metalTone: "银色",
      },
      autumn_warm: {
        name: "秋季暖型",
        description: "肤色偏暖偏深，适合浓郁温暖的色彩",
        bestColors: ["驼色", "酒红", "墨绿", "焦糖", "棕色", "橘色", "芥末黄", "卡其"],
        worstColors: ["荧光粉", "冰蓝", "冷灰", "亮紫"],
        palette: {
          primary: ["驼色", "酒红", "墨绿"],
          secondary: ["焦糖", "棕色", "芥末黄"],
          neutral: ["卡其", "深棕", "米色"],
        },
        metalTone: "金色/铜色",
      },
      autumn_deep: {
        name: "秋季深型",
        description: "肤色偏暖偏深，适合深沉浓郁的色彩",
        bestColors: ["深酒红", "墨绿", "深棕", "藏蓝", "铁锈红", "深橘", "深紫"],
        worstColors: ["浅粉", "淡蓝", "荧光色", "冰白"],
        palette: {
          primary: ["深酒红", "墨绿", "藏蓝"],
          secondary: ["深棕", "铁锈红", "深橘"],
          neutral: ["深灰", "深棕", "黑色"],
        },
        metalTone: "金色/古铜色",
      },
      winter_cool: {
        name: "冬季冷型",
        description: "肤色偏冷偏深，适合鲜明对比的色彩",
        bestColors: ["纯白", "纯黑", "正红", "藏蓝", "宝蓝", "深紫", "翠绿", "银色"],
        worstColors: ["橘色", "暖棕", "鹅黄", "浅驼"],
        palette: {
          primary: ["纯黑", "纯白", "正红"],
          secondary: ["藏蓝", "宝蓝", "深紫"],
          neutral: ["灰色", "银灰", "黑色"],
        },
        metalTone: "银色/白金",
      },
      winter_deep: {
        name: "冬季深型",
        description: "肤色偏冷偏深，适合深沉鲜明的色彩",
        bestColors: ["深红", "深蓝", "黑色", "深紫", "翠绿", "炭灰", "冰白"],
        worstColors: ["浅驼", "暖米", "鹅黄", "浅粉"],
        palette: {
          primary: ["深蓝", "深红", "黑色"],
          secondary: ["深紫", "翠绿", "炭灰"],
          neutral: ["黑色", "深灰", "冰白"],
        },
        metalTone: "银色",
      },
    },
    description: "色彩季型规则 - 根据个人色彩季型推荐配色方案",
  },
  {
    key: "weather_outfit_rules",
    value: {
      hot_summer: {
        name: "炎热夏季 (>30°C)",
        description: "高温天气穿搭策略",
        temperatureRange: [30, 45],
        recommendedMaterials: ["棉", "亚麻", "真丝", "莫代尔", "天丝", "冰丝"],
        avoidMaterials: ["羊毛", "羊绒", "皮革", "丝绒", "厚针织"],
        recommendedCategories: ["tops", "bottoms", "dresses", "swimwear", "footwear"],
        layerStrategy: "单层轻薄",
        colorStrategy: "浅色系为主，反射阳光",
        tips: ["选择透气面料", "宽松版型利于散热", "配戴遮阳帽和墨镜", "选择凉鞋或透气运动鞋"],
      },
      warm_spring: {
        name: "温暖春季 (20-30°C)",
        description: "温暖天气穿搭策略",
        temperatureRange: [20, 30],
        recommendedMaterials: ["棉", "亚麻", "雪纺", "天丝", "轻薄针织"],
        avoidMaterials: ["厚羊毛", "羽绒", "厚呢", "加绒"],
        recommendedCategories: ["tops", "bottoms", "dresses", "accessories"],
        layerStrategy: "薄外套备选",
        colorStrategy: "明亮清新色系",
        tips: ["早晚备薄外套", "碎花和条纹是春季元素", "选择浅色系呼应季节", "丝巾点缀增添春意"],
      },
      cool_autumn: {
        name: "凉爽秋季 (10-20°C)",
        description: "凉爽天气穿搭策略",
        temperatureRange: [10, 20],
        recommendedMaterials: ["羊毛", "针织", "灯芯绒", "牛仔", "棉混纺"],
        avoidMaterials: ["薄纱", "冰丝", "超薄棉"],
        recommendedCategories: ["tops", "outerwear", "bottoms", "dresses", "accessories"],
        layerStrategy: "层叠穿搭",
        colorStrategy: "大地色系和深色系",
        tips: [
          "风衣是秋季必备",
          "层叠穿搭应对温差",
          "驼色和卡其色是秋季主色",
          "短靴搭配裙装裤装都好看",
        ],
      },
      cold_winter: {
        name: "寒冷冬季 (<10°C)",
        description: "寒冷天气穿搭策略",
        temperatureRange: [-20, 10],
        recommendedMaterials: ["羊毛", "羊绒", "羽绒", "摇粒绒", "皮革", "厚针织"],
        avoidMaterials: ["薄纱", "亚麻", "薄棉", "雪纺"],
        recommendedCategories: ["outerwear", "tops", "bottoms", "accessories", "footwear"],
        layerStrategy: "三层保暖（内层排汗+中层保暖+外层防风）",
        colorStrategy: "深色系为主，亮色配饰点缀",
        tips: [
          "羽绒服选短款显高长款保暖",
          "围巾帽子既保暖又时尚",
          "长靴搭配裙装优雅过冬",
          "内搭选择保暖内衣打底",
        ],
      },
    },
    description: "天气穿搭规则 - 根据气温和天气推荐穿搭策略",
  },
  {
    key: "occasion_outfit_rules",
    value: {
      work: {
        name: "职场通勤",
        description: "工作日通勤穿搭",
        styleKeywords: ["简约", "干练", "专业", "得体"],
        recommendedCategories: ["tops", "bottoms", "outerwear", "footwear", "accessories"],
        avoidStyles: ["过于休闲", "过于暴露", "过于花哨"],
        colorStrategy: "中性色为主，低饱和度",
        tips: [
          "西装外套是通勤万能单品",
          "衬衫+西裤/半裙是安全搭配",
          "乐福鞋和低跟鞋适合通勤",
          "简约配饰提升精致感",
        ],
      },
      date: {
        name: "约会社交",
        description: "约会和社交场合穿搭",
        styleKeywords: ["浪漫", "精致", "女人味", "温柔"],
        recommendedCategories: ["dresses", "tops", "bottoms", "footwear", "accessories"],
        avoidStyles: ["过于随意", "过于正式", "过于运动"],
        colorStrategy: "柔和色系，可适当加入浪漫色彩",
        tips: ["连衣裙是约会首选", "适当展露锁骨和手腕", "高跟鞋提升气质", "精致小包和首饰点缀"],
      },
      casual: {
        name: "周末休闲",
        description: "周末日常休闲穿搭",
        styleKeywords: ["舒适", "随性", "自然", "轻松"],
        recommendedCategories: ["tops", "bottoms", "footwear", "accessories"],
        avoidStyles: ["过于正式", "过于拘束"],
        colorStrategy: "自由搭配，可大胆尝试",
        tips: [
          "T恤+牛仔裤是万能公式",
          "运动鞋百搭舒适",
          "卫衣+束脚裤休闲有型",
          "棒球帽和帆布包增添活力",
        ],
      },
      party: {
        name: "派对晚宴",
        description: "派对和晚宴场合穿搭",
        styleKeywords: ["华丽", "精致", "吸睛", "高级"],
        recommendedCategories: ["dresses", "footwear", "accessories"],
        avoidStyles: ["过于朴素", "过于休闲", "过于日常"],
        colorStrategy: "深色系+亮色点缀，或金属色系",
        tips: ["小黑裙是晚宴安全牌", "高跟鞋是必备", "闪亮配饰提升华丽感", "手拿包比大包更得体"],
      },
      sports: {
        name: "运动户外",
        description: "运动和户外活动穿搭",
        styleKeywords: ["活力", "舒适", "功能", "透气"],
        recommendedCategories: ["activewear", "footwear", "accessories"],
        avoidStyles: ["过于紧身不透气", "过于宽松影响运动", "棉质吸汗不排汗"],
        colorStrategy: "亮色系提升活力，深色系显瘦",
        tips: ["选择专业运动面料", "运动内衣是必备", "跑鞋选择注重缓震", "运动后注意保暖"],
      },
    },
    description: "场合穿搭规则 - 根据不同场合推荐穿搭策略",
  },
];

export async function seedFashionRules(prisma: PrismaClient): Promise<{ count: number }> {
  let count = 0;

  for (const rule of FASHION_RULES) {
    const existing = await prisma.systemConfig.findUnique({
      where: { key: rule.key },
    });

    if (existing) {
      await prisma.systemConfig.update({
        where: { key: rule.key },
        data: { value: rule.value, description: rule.description },
      });
    } else {
      await prisma.systemConfig.create({
        data: {
          key: rule.key,
          value: rule.value,
          description: rule.description,
        },
      });
    }
    count++;
  }

  return { count };
}
