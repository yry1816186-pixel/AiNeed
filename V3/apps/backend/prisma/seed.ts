import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcrypt";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const BRANDS = [
  { name: "ZARA", logoUrl: "https://cdn.aineed.com/brands/zara.png", description: "西班牙快时尚品牌" },
  { name: "H&M", logoUrl: "https://cdn.aineed.com/brands/hm.png", description: "瑞典快时尚品牌" },
  { name: "优衣库", logoUrl: "https://cdn.aineed.com/brands/uniqlo.png", description: "日本休闲服饰品牌" },
  { name: "Nike", logoUrl: "https://cdn.aineed.com/brands/nike.png", description: "美国运动品牌" },
  { name: "GUCCI", logoUrl: "https://cdn.aineed.com/brands/gucci.png", description: "意大利奢侈品牌" },
  { name: "COS", logoUrl: "https://cdn.aineed.com/brands/cos.png", description: "极简主义设计" },
  { name: "太平鸟", logoUrl: "https://cdn.aineed.com/brands/peacebird.png", description: "中国时尚品牌" },
  { name: "Adidas", logoUrl: "https://cdn.aineed.com/brands/adidas.png", description: "德国运动品牌" },
  { name: "Massimo Dutti", logoUrl: "https://cdn.aineed.com/brands/massimo-dutti.png", description: "优雅精致的都市风格" },
  { name: "MUJI", logoUrl: "https://cdn.aineed.com/brands/muji.png", description: "极简自然风格" },
  { name: "ONLY", logoUrl: "https://cdn.aineed.com/brands/only.png", description: "丹麦快时尚女装" },
  { name: "Levi's", logoUrl: "https://cdn.aineed.com/brands/levis.png", description: "美国牛仔品牌" },
  { name: "The North Face", logoUrl: "https://cdn.aineed.com/brands/tnf.png", description: "美国户外品牌" },
  { name: "Lululemon", logoUrl: "https://cdn.aineed.com/brands/lululemon.png", description: "加拿大运动品牌" },
  { name: "Celine", logoUrl: "https://cdn.aineed.com/brands/celine.png", description: "法国奢侈品牌" },
];

const CATEGORIES = [
  { name: "上装", nameEn: "Top", slug: "top", sortOrder: 1 },
  { name: "下装", nameEn: "Bottom", slug: "bottom", sortOrder: 2 },
  { name: "外套", nameEn: "Outerwear", slug: "outerwear", sortOrder: 3 },
  { name: "鞋子", nameEn: "Shoes", slug: "shoes", sortOrder: 4 },
  { name: "包包", nameEn: "Bag", slug: "bag", sortOrder: 5 },
  { name: "配饰", nameEn: "Accessory", slug: "accessory", sortOrder: 6 },
  { name: "帽子", nameEn: "Hat", slug: "hat", sortOrder: 7 },
  { name: "连衣裙", nameEn: "Dress", slug: "dress", sortOrder: 8 },
];

const STYLE_TAGS = ["极简", "法式", "街头", "国潮", "日系", "韩系", "商务", "运动休闲", "复古", "休闲", "新中式", "商务休闲"];
const COLORS_MAP: Record<string, string[]> = {
  top: ["白色", "黑色", "灰色", "米白", "深蓝", "粉色", "驼色", "浅蓝", "红色", "绿色"],
  bottom: ["黑色", "深蓝", "卡其", "米色", "灰色", "深灰", "驼色", "浅蓝"],
  outerwear: ["驼色", "黑色", "卡其", "深蓝", "军绿", "灰色", "米白", "深灰"],
  shoes: ["白色", "黑色", "驼色", "深蓝", "棕色", "裸色", "粉色"],
  bag: ["黑色", "驼色", "棕色", "白色", "深蓝", "灰色", "米色"],
  accessory: ["金色", "银色", "黑色", "白色", "驼色", "印花"],
  hat: ["黑色", "驼色", "米色", "灰色", "白色"],
  dress: ["黑色", "白色", "碎花", "印花", "粉色", "红色", "蓝色", "香槟色"],
};
const MATERIALS_MAP: Record<string, string[]> = {
  top: ["棉", "棉混纺", "羊毛", "羊绒", "丝", "聚酯纤维", "亚麻", "有机棉"],
  bottom: ["牛仔", "棉", "羊毛混纺", "聚酯纤维", "亚麻", "棉混纺", "灯芯绒", "皮革"],
  outerwear: ["羊毛混纺", "棉混纺", "尼龙", "聚酯纤维", "羊毛", "羊绒混纺", "皮革", "棉麻混纺"],
  shoes: ["皮革", "网布", "帆布", "棉"],
  bag: ["皮革", "尼龙", "帆布", "聚酯纤维", "草编"],
  accessory: ["金属", "丝", "珍珠", "皮革", "羊毛", "不锈钢", "硅胶"],
  hat: ["棉", "羊毛", "羊毛混纺", "草编", "聚酯纤维"],
  dress: ["聚酯纤维", "棉", "丝", "雪纺", "羊毛混纺", "丝绒"],
};
const FIT_MAP: Record<string, string[]> = {
  top: ["修身", "常规", "宽松", "短款"],
  bottom: ["修身", "常规", "宽松", "高腰", "高腰阔腿", "短裤", "紧身"],
  outerwear: ["常规", "修身", "宽松"],
  shoes: ["常规", "尖头", "圆头", "方头", "低帮"],
  bag: ["迷你", "小号", "中号", "常规"],
  accessory: ["常规"],
  hat: ["常规", "可调节", "宽檐"],
  dress: ["修身", "收腰", "A字", "宽松"],
};
const SEASONS = ["spring", "summer", "autumn", "winter"];
const OCCASIONS = ["casual", "work", "date", "sport", "party", "formal"];
const NAME_TEMPLATES: Record<string, string[]> = {
  top: ["修身针织衫", "宽松T恤", "V领衬衫", "圆领毛衣", "连帽卫衣", "Polo衫", "背心", "吊带上衣", "泡泡袖上衣", "高领打底衫", "开衫", "短款上衣", "蕾丝上衣", "雪纺衫", "牛仔衬衫", "格纹衬衫", "条纹T恤", "印花卫衣", "丝质衬衫", "棉质基础款"],
  bottom: ["直筒裤", "阔腿裤", "修身裤", "牛仔裤", "半裙", "百褶裙", "A字裙", "西装裤", "休闲裤", "工装裤", "短裤", "皮裤", "灯芯绒裤", "亚麻裤", "运动裤", "束脚裤", "铅笔裙", "鱼尾裙", "格纹裤", "哈伦裤"],
  outerwear: ["大衣", "风衣", "夹克", "西装外套", "羽绒服", "棉服", "皮夹克", "针织开衫", "棒球服", "飞行员夹克", "牛仔外套", "毛呢外套", "斗篷", "马甲", "卫衣外套", "防风外套"],
  shoes: ["运动鞋", "板鞋", "高跟鞋", "平底鞋", "乐福鞋", "靴子", "凉鞋", "拖鞋", "帆布鞋", "牛津鞋", "德比鞋", "切尔西靴", "穆勒鞋", "老爹鞋"],
  bag: ["手提包", "斜挎包", "双肩包", "托特包", "链条包", "腰包", "手拿包", "邮差包", "化妆包", "购物袋"],
  accessory: ["项链", "耳环", "手链", "围巾", "腰带", "手表", "墨镜", "胸针", "发饰", "手套"],
  hat: ["棒球帽", "渔夫帽", "贝雷帽", "冷帽", "礼帽", "草帽", "针织帽", "报童帽"],
  dress: ["连衣裙", "半身裙", "衬衫裙", "针织裙", "吊带裙", "A字裙", "裹身裙", "旗袍裙", "卫衣裙", "牛仔裙"],
};

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.floor(seededRandom(seed) * arr.length)];
}

function pickN<T>(arr: T[], n: number, seed: number): T[] {
  const result: T[] = [];
  const used = new Set<number>();
  for (let i = 0; i < n && i < arr.length; i++) {
    let idx: number;
    do { idx = Math.floor(seededRandom(seed + i * 7 + 3) * arr.length); } while (used.has(idx));
    used.add(idx);
    result.push(arr[idx]);
  }
  return result;
}

function generateClothingItems(): CS[] {
  const items: CS[] = [];
  const catSlugs = CATEGORIES.map(c => c.slug);
  let seed = 42;

  for (const catSlug of catSlugs) {
    const names = NAME_TEMPLATES[catSlug] || ["基础款"];
    const targetCount = catSlug === "top" ? 100 : catSlug === "bottom" ? 80 : catSlug === "outerwear" ? 65 : catSlug === "shoes" ? 60 : catSlug === "bag" ? 50 : catSlug === "accessory" ? 60 : catSlug === "hat" ? 40 : 55;

    for (let i = 0; i < targetCount; i++) {
      seed++;
      const nameBase = names[i % names.length];
      const brandIdx = Math.floor(seededRandom(seed * 13) * BRANDS.length);
      const brandName = BRANDS[brandIdx].name;
      const gender = seededRandom(seed * 17) > 0.45 ? "female" : "male";
      const colors = pickN(COLORS_MAP[catSlug] || ["黑色"], 1, seed * 23);
      const materials = pickN(MATERIALS_MAP[catSlug] || ["棉"], 1, seed * 29);
      const styleTags = pickN(STYLE_TAGS, 2, seed * 31);
      const seasonCount = 1 + Math.floor(seededRandom(seed * 37) * 3);
      const seasons = pickN(SEASONS, Math.min(seasonCount, SEASONS.length), seed * 41);
      const occasionCount = 1 + Math.floor(seededRandom(seed * 43) * 2);
      const occasions = pickN(OCCASIONS, occasionCount, seed * 47);
      const fitType = pick(FIT_MAP[catSlug] || ["常规"], seed * 53);

      const isLuxury = brandIdx === 4 || brandIdx === 14;
      const isPremium = brandIdx === 5 || brandIdx === 8;
      const isBudget = brandIdx === 1 || brandIdx === 2 || brandIdx === 9;

      let price: number;
      if (isLuxury) price = 5000 + Math.floor(seededRandom(seed * 59) * 20000);
      else if (isPremium) price = 500 + Math.floor(seededRandom(seed * 59) * 2000);
      else if (isBudget) price = 50 + Math.floor(seededRandom(seed * 59) * 300);
      else price = 150 + Math.floor(seededRandom(seed * 59) * 800);

      const discount = 0.7 + seededRandom(seed * 61) * 0.3;
      const originalPrice = Math.round(price / discount);

      items.push({
        name: `${brandName} ${nameBase}`,
        brandIndex: brandIdx,
        categorySlug: catSlug,
        price, originalPrice, gender, seasons, occasions, styleTags, colors, materials, fitType,
      });
    }
  }
  return items;
}

type CS = { name: string; brandIndex: number; categorySlug: string; price: number; originalPrice: number; gender: string; seasons: string[]; occasions: string[]; styleTags: string[]; colors: string[]; materials: string[]; fitType: string };

const STYLE_RULES_DATA = [
  { category: "color", ruleType: "do", condition: { colorA: "黑色", colorB: "白色" }, recommendation: "黑白搭配是永恒经典，适合所有场合，永不出错", priority: 10 },
  { category: "color", ruleType: "do", condition: { colorA: "驼色", colorB: "深蓝" }, recommendation: "驼色与深蓝是高级感搭配，适合通勤和正式场合", priority: 9 },
  { category: "color", ruleType: "do", condition: { colorA: "黑色", colorB: "驼色" }, recommendation: "黑色与驼色搭配沉稳有品味，秋冬首选配色", priority: 9 },
  { category: "color", ruleType: "do", condition: { colorA: "白色", colorB: "蓝色" }, recommendation: "白蓝搭配清爽干净，春夏通勤休闲皆宜", priority: 8 },
  { category: "color", ruleType: "do", condition: { colorA: "灰色", colorB: "粉色" }, recommendation: "灰色与粉色柔和中性，适合日常约会", priority: 7 },
  { category: "color", ruleType: "do", condition: { colorA: "黑色", colorB: "红色" }, recommendation: "黑红搭配经典大气，适合晚宴和约会", priority: 8 },
  { category: "color", ruleType: "do", condition: { colorA: "米白", colorB: "卡其" }, recommendation: "米白与卡其温柔同色系搭配，层次感强", priority: 7 },
  { category: "color", ruleType: "dont", condition: { colorA: "大红", colorB: "亮绿" }, recommendation: "大面积红绿撞色难以驾驭，建议用深色调替代", priority: 8 },
  { category: "color", ruleType: "dont", condition: { colorA: "荧光粉", colorB: "荧光橙" }, recommendation: "两个荧光色过于刺眼，搭配缺乏层次", priority: 7 },
  { category: "color", ruleType: "dont", condition: { colorA: "紫色", colorB: "橙色" }, recommendation: "紫橙撞色过于跳跃，日常穿搭难以驾驭", priority: 6 },
  { category: "color", ruleType: "tip", condition: { rule: "全身色彩控制" }, recommendation: "全身色彩不超过3种主色，保持视觉统一", priority: 9 },
  { category: "color", ruleType: "tip", condition: { rule: "中性色打底" }, recommendation: "用黑白灰驼等中性色作为基础，亮色作为点缀", priority: 8 },
  { category: "color", ruleType: "do", condition: { colorA: "白色", colorB: "驼色" }, recommendation: "白色与驼色搭配温柔知性，适合职场和约会", priority: 8 },
  { category: "color", ruleType: "do", condition: { colorA: "深蓝", colorB: "白色" }, recommendation: "深蓝与白色搭配清爽干练，商务休闲首选", priority: 8 },
  { category: "color", ruleType: "do", condition: { colorA: "黑色", colorB: "金色" }, recommendation: "黑色与金色搭配奢华大气，适合晚宴和派对", priority: 8 },
  { category: "color", ruleType: "do", condition: { colorA: "灰色", colorB: "白色" }, recommendation: "灰白搭配简约高级，适合极简风格", priority: 7 },
  { category: "color", ruleType: "do", condition: { colorA: "卡其", colorB: "白色" }, recommendation: "卡其与白色搭配清新自然，春夏首选", priority: 7 },
  { category: "color", ruleType: "do", condition: { colorA: "酒红", colorB: "黑色" }, recommendation: "酒红与黑色搭配优雅神秘，秋冬约会首选", priority: 8 },
  { category: "color", ruleType: "do", condition: { colorA: "墨绿", colorB: "驼色" }, recommendation: "墨绿与驼色搭配复古高级，适合秋冬", priority: 7 },
  { category: "color", ruleType: "do", condition: { colorA: "藏蓝", colorB: "灰色" }, recommendation: "藏蓝与灰色搭配沉稳内敛，适合商务场合", priority: 7 },
  { category: "color", ruleType: "dont", condition: { colorA: "大红", colorB: "紫色" }, recommendation: "红紫搭配过于浓烈，日常难以驾驭", priority: 7 },
  { category: "color", ruleType: "dont", condition: { colorA: "橙色", colorB: "粉色" }, recommendation: "橙粉搭配过于甜腻，缺乏高级感", priority: 6 },
  { category: "color", ruleType: "tip", condition: { rule: "同色系搭配" }, recommendation: "同色系不同深浅搭配增加层次感，如浅灰+深灰", priority: 8 },
  { category: "color", ruleType: "tip", condition: { rule: "金属色点缀" }, recommendation: "金属色配饰提升整体造型质感，适合晚宴和派对", priority: 7 },
  { category: "body_type", ruleType: "do", condition: { bodyType: "hourglass", itemType: "dress" }, recommendation: "沙漏型身材适合收腰连衣裙，完美展现曲线", priority: 9 },
  { category: "body_type", ruleType: "do", condition: { bodyType: "hourglass", itemType: "belt" }, recommendation: "沙漏型身材用腰带强调腰线，突出身材优势", priority: 8 },
  { category: "body_type", ruleType: "dont", condition: { bodyType: "hourglass", itemType: "oversized_top" }, recommendation: "沙漏型身材避免oversized上装，会遮盖身材优势", priority: 8 },
  { category: "body_type", ruleType: "do", condition: { bodyType: "pear", itemType: "a_line_skirt" }, recommendation: "梨形身材适合A字裙，遮盖臀部和大腿", priority: 9 },
  { category: "body_type", ruleType: "do", condition: { bodyType: "pear", itemType: "wide_leg_pants" }, recommendation: "梨形身材适合阔腿裤，平衡上下身比例", priority: 9 },
  { category: "body_type", ruleType: "dont", condition: { bodyType: "pear", itemType: "skinny_jeans" }, recommendation: "梨形身材避免紧身牛仔裤，会暴露下半身缺点", priority: 8 },
  { category: "body_type", ruleType: "do", condition: { bodyType: "apple", itemType: "v_neck_top" }, recommendation: "苹果型身材适合V领上装，拉长颈部线条", priority: 9 },
  { category: "body_type", ruleType: "do", condition: { bodyType: "apple", itemType: "high_waist_pants" }, recommendation: "苹果型身材适合高腰裤，提升腰线优化比例", priority: 9 },
  { category: "body_type", ruleType: "dont", condition: { bodyType: "apple", itemType: "crop_top" }, recommendation: "苹果型身材避免露脐装，会暴露腰腹", priority: 8 },
  { category: "body_type", ruleType: "do", condition: { bodyType: "rectangle", itemType: "peplum_top" }, recommendation: "矩形身材适合荷叶边上衣，制造腰线曲线", priority: 8 },
  { category: "body_type", ruleType: "do", condition: { bodyType: "rectangle", itemType: "layered_outfit" }, recommendation: "矩形身材适合层次穿搭，增加视觉丰富度", priority: 8 },
  { category: "body_type", ruleType: "dont", condition: { bodyType: "rectangle", itemType: "straight_dress" }, recommendation: "矩形身材避免直筒连衣裙，会显得没有曲线", priority: 7 },
  { category: "body_type", ruleType: "do", condition: { bodyType: "inverted_triangle", itemType: "wide_leg_pants" }, recommendation: "倒三角身材适合阔腿裤，平衡上下身比例", priority: 9 },
  { category: "body_type", ruleType: "do", condition: { bodyType: "inverted_triangle", itemType: "v_neck_top" }, recommendation: "倒三角身材适合V领上装，弱化肩部宽度", priority: 8 },
  { category: "body_type", ruleType: "dont", condition: { bodyType: "inverted_triangle", itemType: "shoulder_pad" }, recommendation: "倒三角身材避免垫肩上装，会加重肩部宽度", priority: 8 },
  { category: "body_type", ruleType: "do", condition: { bodyType: "hourglass", itemType: "wrap_dress" }, recommendation: "沙漏型身材适合裹身裙，完美勾勒腰线", priority: 9 },
  { category: "body_type", ruleType: "do", condition: { bodyType: "pear", itemType: "v_neck_top" }, recommendation: "梨形身材适合V领上装，将视线吸引到上半身", priority: 8 },
  { category: "body_type", ruleType: "do", condition: { bodyType: "apple", itemType: "a_line_dress" }, recommendation: "苹果型身材适合A字连衣裙，遮盖腰腹", priority: 9 },
  { category: "body_type", ruleType: "do", condition: { bodyType: "inverted_triangle", itemType: "flare_skirt" }, recommendation: "倒三角身材适合伞裙，增加下半身体量", priority: 8 },
  { category: "body_type", ruleType: "dont", condition: { bodyType: "inverted_triangle", itemType: "boat_neck" }, recommendation: "倒三角身材避免一字领，会加宽肩部", priority: 7 },
  { category: "occasion", ruleType: "do", condition: { occasion: "work", style: "极简" }, recommendation: "通勤场合推荐极简风格，干净利落显专业", priority: 9 },
  { category: "occasion", ruleType: "do", condition: { occasion: "work", item: "blazer" }, recommendation: "通勤场合西装外套是必备单品，搭配衬衫或针织衫", priority: 9 },
  { category: "occasion", ruleType: "dont", condition: { occasion: "work", item: "crop_top" }, recommendation: "通勤场合避免露脐装和过于暴露的服装", priority: 8 },
  { category: "occasion", ruleType: "do", condition: { occasion: "date", style: "法式" }, recommendation: "约会场合法式风格优雅浪漫，推荐裹身裙或丝质衬衫", priority: 9 },
  { category: "occasion", ruleType: "do", condition: { occasion: "date", color: "红色系" }, recommendation: "约会场合红色系单品增加魅力和自信感", priority: 7 },
  { category: "occasion", ruleType: "dont", condition: { occasion: "date", item: "sportswear" }, recommendation: "约会场合避免运动装，除非是运动约会", priority: 7 },
  { category: "occasion", ruleType: "do", condition: { occasion: "sport", style: "运动休闲" }, recommendation: "运动场合选择功能性面料，透气排汗", priority: 9 },
  { category: "occasion", ruleType: "do", condition: { occasion: "formal", style: "商务" }, recommendation: "正式场合推荐深色西装或礼服，简洁大方", priority: 9 },
  { category: "occasion", ruleType: "dont", condition: { occasion: "formal", item: "sneakers" }, recommendation: "正式场合避免运动鞋，选择皮鞋或高跟鞋", priority: 8 },
  { category: "occasion", ruleType: "do", condition: { occasion: "party", item: "statement_piece" }, recommendation: "派对场合选择一件亮眼单品，如亮片裙或金属配饰", priority: 8 },
  { category: "occasion", ruleType: "do", condition: { occasion: "interview", style: "商务" }, recommendation: "面试场合穿着正式得体，深色西装搭配浅色衬衫", priority: 9 },
  { category: "occasion", ruleType: "dont", condition: { occasion: "interview", color: "亮色" }, recommendation: "面试场合避免过于鲜艳的颜色，保持专业感", priority: 8 },
  { category: "occasion", ruleType: "do", condition: { occasion: "casual", style: "休闲" }, recommendation: "休闲场合以舒适为主，T恤+牛仔裤+球鞋永不出错", priority: 8 },
  { category: "occasion", ruleType: "do", condition: { occasion: "casual", item: "denim" }, recommendation: "休闲场合牛仔单品百搭实用，适合各种风格", priority: 8 },
  { category: "occasion", ruleType: "do", condition: { occasion: "work", color: "中性色" }, recommendation: "通勤场合推荐中性色系，黑灰驼藏蓝最安全", priority: 8 },
  { category: "occasion", ruleType: "dont", condition: { occasion: "work", item: "flip_flops" }, recommendation: "通勤场合避免拖鞋和过于休闲的鞋款", priority: 7 },
  { category: "occasion", ruleType: "do", condition: { occasion: "date", item: "dress" }, recommendation: "约会场合连衣裙是最佳选择，优雅又省心", priority: 8 },
  { category: "occasion", ruleType: "do", condition: { occasion: "party", color: "金属色" }, recommendation: "派对场合金属色单品吸睛亮眼，提升气场", priority: 7 },
  { category: "occasion", ruleType: "do", condition: { occasion: "interview", color: "深色" }, recommendation: "面试场合深色系最稳妥，深蓝或深灰西装", priority: 9 },
  { category: "occasion", ruleType: "dont", condition: { occasion: "interview", item: "jeans" }, recommendation: "面试场合避免牛仔裤，选择西裤或半裙", priority: 8 },
  { category: "occasion", ruleType: "do", condition: { occasion: "sport", item: "functional_fabric" }, recommendation: "运动场合选择速干透气面料，避免纯棉", priority: 9 },
  { category: "occasion", ruleType: "dont", condition: { occasion: "sport", item: "jeans" }, recommendation: "运动场合避免牛仔裤，限制活动范围", priority: 8 },
  { category: "style_mix", ruleType: "do", condition: { styleA: "极简", styleB: "法式" }, recommendation: "极简与法式混搭优雅高级，基础款+精致配饰", priority: 8 },
  { category: "style_mix", ruleType: "do", condition: { styleA: "街头", styleB: "运动休闲" }, recommendation: "街头与运动混搭活力十足，卫衣+运动裤+球鞋", priority: 8 },
  { category: "style_mix", ruleType: "do", condition: { styleA: "日系", styleB: "极简" }, recommendation: "日系与极简混搭干净舒适，棉麻材质+素色搭配", priority: 7 },
  { category: "style_mix", ruleType: "do", condition: { styleA: "国潮", styleB: "街头" }, recommendation: "国潮与街头混搭个性鲜明，刺绣元素+运动鞋", priority: 8 },
  { category: "style_mix", ruleType: "dont", condition: { styleA: "商务", styleB: "街头" }, recommendation: "商务与街头风格冲突较大，不建议直接混搭", priority: 7 },
  { category: "style_mix", ruleType: "tip", condition: { rule: "混搭原则" }, recommendation: "混搭时保持一个主风格，另一个作为点缀，避免五五开", priority: 9 },
  { category: "style_mix", ruleType: "tip", condition: { rule: "材质混搭" }, recommendation: "不同材质的混搭增加层次感，如丝质+牛仔、皮革+针织", priority: 8 },
  { category: "style_mix", ruleType: "do", condition: { styleA: "法式", styleB: "复古" }, recommendation: "法式与复古混搭优雅怀旧，波点+丝质+珍珠", priority: 8 },
  { category: "style_mix", ruleType: "do", condition: { styleA: "新中式", styleB: "极简" }, recommendation: "新中式与极简混搭现代东方美，盘扣+素色+利落剪裁", priority: 8 },
  { category: "style_mix", ruleType: "do", condition: { styleA: "韩系", styleB: "休闲" }, recommendation: "韩系与休闲混搭清新自然，宽松卫衣+百褶裙", priority: 7 },
  { category: "style_mix", ruleType: "dont", condition: { styleA: "法式", styleB: "街头" }, recommendation: "法式与街头风格冲突，需谨慎混搭", priority: 6 },
  { category: "style_mix", ruleType: "tip", condition: { rule: "配饰统一" }, recommendation: "混搭时配饰风格统一，可降低违和感", priority: 8 },
  { category: "style_mix", ruleType: "tip", condition: { rule: "色彩桥梁" }, recommendation: "用中性色作为不同风格的桥梁色，增加协调感", priority: 7 },
  { category: "season", ruleType: "do", condition: { season: "spring", material: "棉" }, recommendation: "春季推荐棉质面料，透气舒适", priority: 8 },
  { category: "season", ruleType: "do", condition: { season: "summer", material: "亚麻" }, recommendation: "夏季推荐亚麻面料，凉爽透气", priority: 9 },
  { category: "season", ruleType: "do", condition: { season: "summer", material: "丝" }, recommendation: "夏季推荐真丝面料，轻盈飘逸", priority: 8 },
  { category: "season", ruleType: "do", condition: { season: "autumn", material: "羊毛" }, recommendation: "秋季推荐羊毛面料，保暖有型", priority: 8 },
  { category: "season", ruleType: "do", condition: { season: "winter", material: "羊绒" }, recommendation: "冬季推荐羊绒面料，极致保暖轻盈", priority: 9 },
  { category: "season", ruleType: "dont", condition: { season: "summer", material: "羊毛" }, recommendation: "夏季避免厚重的羊毛面料，选择轻薄材质", priority: 8 },
  { category: "season", ruleType: "dont", condition: { season: "winter", material: "亚麻" }, recommendation: "冬季避免亚麻面料，保暖性不足", priority: 7 },
  { category: "season", ruleType: "tip", condition: { rule: "春季叠穿" }, recommendation: "春季适合叠穿，内搭T恤+衬衫+薄外套", priority: 7 },
  { category: "season", ruleType: "tip", condition: { rule: "秋季配色" }, recommendation: "秋季推荐暖色调，驼色、焦糖色、酒红色", priority: 8 },
  { category: "material", ruleType: "do", condition: { materialA: "丝", materialB: "牛仔" }, recommendation: "丝质与牛仔混搭高级又随性，适合约会", priority: 8 },
  { category: "material", ruleType: "do", condition: { materialA: "皮革", materialB: "针织" }, recommendation: "皮革与针织混搭硬朗与柔软对比，层次丰富", priority: 8 },
  { category: "material", ruleType: "do", condition: { materialA: "亚麻", materialB: "棉" }, recommendation: "亚麻与棉混搭自然舒适，适合春夏休闲", priority: 7 },
  { category: "material", ruleType: "dont", condition: { materialA: "丝绒", materialB: "牛仔" }, recommendation: "丝绒与牛仔质感冲突，搭配需谨慎", priority: 6 },
  { category: "material", ruleType: "tip", condition: { rule: "材质对比" }, recommendation: "软硬材质对比增加造型层次，如针织+皮革", priority: 8 },
  { category: "proportion", ruleType: "do", condition: { rule: "高腰线" }, recommendation: "高腰线优化身材比例，显高显瘦", priority: 9 },
  { category: "proportion", ruleType: "do", condition: { rule: "上短下长" }, recommendation: "上短下长比例显腿长，短上衣+高腰裤", priority: 9 },
  { category: "proportion", ruleType: "do", condition: { rule: "上紧下松" }, recommendation: "上紧下松平衡视觉，修身针织+阔腿裤", priority: 8 },
  { category: "proportion", ruleType: "do", condition: { rule: "上松下紧" }, recommendation: "上松下紧休闲时尚，宽松卫衣+紧身裤", priority: 8 },
  { category: "proportion", ruleType: "dont", condition: { rule: "五五分" }, recommendation: "避免上下装等长，会显矮显胖", priority: 8 },
  { category: "proportion", ruleType: "tip", condition: { rule: "腰线位置" }, recommendation: "腰线在肚脐上方2-3cm最显高", priority: 8 },
  { category: "proportion", ruleType: "tip", condition: { rule: "裤长选择" }, recommendation: "九分裤露出脚踝最显瘦，长裤配高跟鞋显腿长", priority: 7 },
  { category: "accessory", ruleType: "do", condition: { rule: "焦点配饰" }, recommendation: "每套搭配选择一个焦点配饰，避免过多", priority: 8 },
  { category: "accessory", ruleType: "do", condition: { rule: "金属统一" }, recommendation: "金饰与银饰不要混搭，保持金属色调统一", priority: 7 },
  { category: "accessory", ruleType: "do", condition: { rule: "耳饰与脸型" }, recommendation: "圆脸选长耳环拉长脸型，长脸选圆形耳环", priority: 7 },
  { category: "accessory", ruleType: "dont", condition: { rule: "过多配饰" }, recommendation: "避免同时佩戴超过3件大配饰，显得杂乱", priority: 7 },
  { category: "accessory", ruleType: "tip", condition: { rule: "手表搭配" }, recommendation: "金属手表适合正式场合，皮质表带适合休闲场合", priority: 6 },
  { category: "accessory", ruleType: "tip", condition: { rule: "包包与身高" }, recommendation: "小个子选小包，高个子选中大包，比例协调", priority: 6 },
];

const COMMUNITY_POSTS_DATA = [
  { title: "秋冬通勤穿搭分享", content: "最近入手的驼色大衣真的太好搭了！搭配高领毛衣和阔腿裤，上班也能很有型。关键是面料很舒服，羊毛混纺不起球，推荐给姐妹们～", tags: ["通勤", "秋冬", "大衣", "极简"], isFeatured: true },
  { title: "周末约会look", content: "法式碎花裙+丝质衬衫，约会氛围感拉满！配上一双尖头高跟鞋和链条包，优雅又浪漫", tags: ["约会", "法式", "连衣裙"], isFeatured: true },
  { title: "运动风也可以很时髦", content: "谁说运动装不能凹造型？Adidas三条杠运动裤搭配Oversize卫衣，再加上一双Ultraboost，舒适又有型", tags: ["运动", "街头", "休闲"], isFeatured: false },
  { title: "面试穿搭攻略", content: "面试穿什么？深蓝西装+白色衬衫+黑色平底鞋，简洁大方不出错。包包选结构感手提包，专业感UP", tags: ["面试", "商务", "通勤"], isFeatured: true },
  { title: "夏日清凉穿搭", content: "亚麻衬衫+宽腿裤+草编帽，夏日出街最舒服的搭配！透气又好看，推荐MUJI的亚麻系列", tags: ["夏日", "亚麻", "休闲"], isFeatured: false },
  { title: "小个子穿搭秘籍", content: "155cm的我也想穿出170cm的感觉！高腰阔腿裤+短款上衣，腰线提上去，腿长自然来", tags: ["小个子", "高腰", "穿搭技巧"], isFeatured: false },
  { title: "国潮穿搭打卡", content: "太平鸟的刺绣卫衣真的绝了！搭配国潮印花运动裤和一双板鞋，走在街上回头率超高", tags: ["国潮", "街头", "太平鸟"], isFeatured: false },
  { title: "极简衣橱构建指南", content: "断舍离之后，我的衣橱只留了30件单品。黑白灰驼四个色系，互相搭配，每天5分钟出门", tags: ["极简", "衣橱整理", "胶囊衣橱"], isFeatured: true },
  { title: "梨形身材怎么穿", content: "作为梨形身材，A字裙和阔腿裤是我的最爱！上身选亮色吸引视线，下身深色遮肉，完美", tags: ["梨形身材", "穿搭技巧", "A字裙"], isFeatured: false },
  { title: "秋冬配色灵感", content: "秋冬不要只穿黑白灰！试试驼色+深蓝、酒红+黑色、墨绿+卡其，高级感瞬间拉满", tags: ["配色", "秋冬", "高级感"], isFeatured: false },
  { title: "一衣多穿挑战", content: "一件白衬衫的7种穿法：单穿、内搭、当外套、系腰间、搭配半裙、搭配牛仔裤、搭配西装裤，你学会了吗？", tags: ["一衣多穿", "白衬衫", "穿搭技巧"], isFeatured: false },
  { title: "新中式穿搭初体验", content: "盘扣上衣+阔腿裤，新中式风格真的很有韵味！不夸张又很有辨识度，适合日常", tags: ["新中式", "国潮", "日常"], isFeatured: false },
  { title: "职场新人穿搭", content: "刚入职怎么穿？COS的极简风格超适合职场新人，不张扬又有品味，关键是性价比高", tags: ["职场", "极简", "COS"], isFeatured: false },
  { title: "韩系穿搭笔记", content: "韩系穿搭的精髓就是：宽松+高腰+浅色！奶油白卫衣+灰色百褶裙+小白鞋，温柔又减龄", tags: ["韩系", "减龄", "休闲"], isFeatured: false },
  { title: "男生穿搭不踩雷", content: "男生穿搭三大法则：1.合身 2.颜色不超过3种 3.鞋子要干净。做到这三点就赢了80%的人", tags: ["男生穿搭", "基础", "技巧"], isFeatured: false },
  { title: "派对女王养成记", content: "年底派对季来了！小黑裙+金色配饰+红色唇膏，经典组合永不过时。包包选迷你款更精致", tags: ["派对", "小黑裙", "年末"], isFeatured: false },
  { title: "旅行穿搭清单", content: "7天旅行只带一个行李箱！3件上衣+2条裤子+1件外套+1双鞋，全部搭配不重复", tags: ["旅行", "轻装", "穿搭技巧"], isFeatured: false },
  { title: "日系穿搭分享", content: "MUJI的有机棉T恤+工装裤+帆布鞋，日系穿搭就是这么简单舒服。关键是要选对颜色，灰白卡其为主", tags: ["日系", "MUJI", "休闲"], isFeatured: false },
  { title: "丝质单品怎么搭", content: "丝质衬衫搭配牛仔裤，高级又随性。丝质连衣裙搭配针织开衫，温柔又有层次感", tags: ["丝质", "高级感", "搭配"], isFeatured: false },
  { title: "运动内衣外穿", content: "Lululemon的运动内衣外穿真的很时髦！搭配高腰运动裤和一双老爹鞋，健身出街两不误", tags: ["运动", "Lululemon", "街头"], isFeatured: false },
  { title: "配饰提升穿搭", content: "基础款白T恤+牛仔裤，加上一条丝巾和珍珠耳环，瞬间从路人变博主！配饰的力量不可小觑", tags: ["配饰", "丝巾", "基础款"], isFeatured: false },
  { title: "秋冬叠穿公式", content: "叠穿公式：内搭T恤+中间衬衫+外套大衣，颜色从浅到深，层次感满分", tags: ["叠穿", "秋冬", "穿搭技巧"], isFeatured: false },
  { title: "牛仔单品百搭指南", content: "牛仔外套+连衣裙、牛仔衬衫+半裙、牛仔裤+针织衫，牛仔单品真的是万能的！", tags: ["牛仔", "百搭", "日常"], isFeatured: false },
  { title: "通勤包包推荐", content: "通勤包包的选购标准：1.容量够大 2.有隔层 3.颜色百搭 4.自重轻。推荐黑色托特包，实用又好看", tags: ["通勤", "包包", "推荐"], isFeatured: false },
  { title: "春季穿搭灵感", content: "春天来了！风衣+针织衫+阔腿裤，温柔又干练。颜色选卡其+米白+浅蓝，清新自然", tags: ["春季", "风衣", "清新"], isFeatured: false },
  { title: "如何选对牛仔裤", content: "梨形选直筒、苹果形选高腰、沙漏形选修身、矩形选阔腿。选对版型比选对颜色更重要！", tags: ["牛仔裤", "身材", "选购"], isFeatured: false },
  { title: "GUCCI入门款推荐", content: "第一个GUCCI怎么选？GG Marmont链条包最百搭，黑色款日常通勤约会都能背", tags: ["GUCCI", "奢侈品", "包包"], isFeatured: false },
  { title: "穿搭色彩理论", content: "暖色调人适合驼色、焦糖、酒红；冷色调人适合深蓝、灰色、黑色。先确定自己的色调再买衣服", tags: ["色彩", "理论", "穿搭技巧"], isFeatured: false },
  { title: "雨天穿搭不狼狈", content: "下雨天也能穿好看！防风外套+防水鞋+大容量托特包，实用又时髦", tags: ["雨天", "实用", "穿搭"], isFeatured: false },
  { title: "30+女性穿搭", content: "30+不是穿得老气，而是穿得更有质感。羊绒毛衣+阔腿裤+乐福鞋，优雅从容", tags: ["30+", "优雅", "质感"], isFeatured: false },
  { title: "学生党平价穿搭", content: "学生党看过来！H&M和优衣库就能搭出好看look，关键是选对基础款和颜色搭配", tags: ["学生", "平价", "基础款"], isFeatured: false },
  { title: "职场穿搭进阶", content: "从职场小白到穿搭达人：第一阶段黑白灰，第二阶段加驼色，第三阶段尝试丝质和配饰", tags: ["职场", "进阶", "穿搭"], isFeatured: false },
];

const BESPOKE_STUDIOS_DATA = [
  { name: "锦衣定制", slug: "jinyi-bespoke", description: "专注高端定制20年，传承中式裁剪工艺，融合现代设计理念", city: "上海", specialties: ["西装定制", "旗袍定制", "礼服定制"], serviceTypes: ["上门量体", "到店定制"], priceRange: "5000-50000", isVerified: true },
  { name: "织梦工坊", slug: "zhimeng-studio", description: "独立设计师工作室，主打新中式风格定制，每件都是独一无二的艺术品", city: "北京", specialties: ["新中式", "创意设计", "面料定制"], serviceTypes: ["到店定制", "线上咨询"], priceRange: "3000-30000", isVerified: true },
  { name: "衣见倾心", slug: "yijian-qingxin", description: "韩系风格定制专家，擅长简约优雅的日常穿搭定制", city: "杭州", specialties: ["韩系定制", "日常穿搭", "情侣装"], serviceTypes: ["到店定制", "线上咨询"], priceRange: "1000-10000", isVerified: true },
  { name: "裁缝张", slug: "tailor-zhang", description: "三代裁缝世家，手工缝制每一件作品，追求极致的工艺与品质", city: "苏州", specialties: ["手工缝制", "传统工艺", "唐装定制"], serviceTypes: ["上门量体", "到店定制"], priceRange: "2000-20000", isVerified: false },
  { name: "MODA定制", slug: "moda-bespoke", description: "西式定制先锋，引进意大利面料和英式裁剪，打造国际化定制体验", city: "深圳", specialties: ["西装定制", "意式风格", "商务定制"], serviceTypes: ["到店定制", "上门量体"], priceRange: "5000-80000", isVerified: true },
  { name: "素衣坊", slug: "suyi-workshop", description: "极简风格定制，少即是多的设计哲学，用最简单的线条勾勒最美的轮廓", city: "成都", specialties: ["极简定制", "棉麻面料", "日常基本款"], serviceTypes: ["线上咨询", "到店定制"], priceRange: "800-8000", isVerified: false },
];

const CUSTOM_DESIGNS_DATA = [
  { name: "水墨山水T恤", productType: "tshirt", tags: ["国潮", "水墨", "山水"], isPublic: true, status: "published" },
  { name: "赛博朋克卫衣", productType: "hoodie", tags: ["赛博朋克", "未来感", "街头"], isPublic: true, status: "published" },
  { name: "猫咪星球手机壳", productType: "phone_case", tags: ["可爱", "猫咪", "卡通"], isPublic: true, status: "published" },
  { name: "极简线条帆布包", productType: "bag", tags: ["极简", "线条", "文艺"], isPublic: true, status: "published" },
  { name: "复古花卉帽子", productType: "hat", tags: ["复古", "花卉", "春夏"], isPublic: true, status: "published" },
  { name: "星空渐变T恤", productType: "tshirt", tags: ["星空", "渐变", "梦幻"], isPublic: true, status: "published" },
  { name: "书法文字卫衣", productType: "hoodie", tags: ["书法", "文字", "国潮"], isPublic: true, status: "published" },
  { name: "几何抽象手机壳", productType: "phone_case", tags: ["几何", "抽象", "现代"], isPublic: true, status: "published" },
  { name: "植物印花帆布包", productType: "bag", tags: ["植物", "印花", "自然"], isPublic: true, status: "published" },
  { name: "涂鸦艺术帽子", productType: "hat", tags: ["涂鸦", "艺术", "街头"], isPublic: true, status: "published" },
  { name: "像素风T恤", productType: "tshirt", tags: ["像素", "复古游戏", "趣味"], isPublic: true, status: "published" },
  { name: "中国风刺绣卫衣", productType: "hoodie", tags: ["中国风", "刺绣", "传统"], isPublic: true, status: "published" },
];

const AVATAR_TEMPLATES = [
  { name: "甜美女生", gender: "female", drawingConfig: { faceShape: "round", eyeStyle: "big_round" }, parameters: { skinTone: "#F5CBA7", hairStyle: "long_straight" }, defaultClothingMap: { top: { color: "#FFFFFF", type: "tshirt" } }, sortOrder: 1 },
  { name: "酷帅男生", gender: "male", drawingConfig: { faceShape: "angular", eyeStyle: "narrow" }, parameters: { skinTone: "#E0AC69", hairStyle: "short_clean" }, defaultClothingMap: { top: { color: "#1A1A2E", type: "hoodie" } }, sortOrder: 2 },
  { name: "中性潮流", gender: "neutral", drawingConfig: { faceShape: "oval", eyeStyle: "almond" }, parameters: { skinTone: "#F5CBA7", hairStyle: "short_androgynous" }, defaultClothingMap: { top: { color: "#2C3E50", type: "tshirt" } }, sortOrder: 3 },
  { name: "元气少女", gender: "female", drawingConfig: { faceShape: "heart", eyeStyle: "sparkly" }, parameters: { skinTone: "#FDEBD0", hairStyle: "twin_tails" }, defaultClothingMap: { top: { color: "#FFB6C1", type: "tshirt" } }, sortOrder: 4 },
  { name: "绅士型男", gender: "male", drawingConfig: { faceShape: "square", eyeStyle: "deep_set" }, parameters: { skinTone: "#E0AC69", hairStyle: "slick_back" }, defaultClothingMap: { top: { color: "#FFFFFF", type: "shirt" } }, sortOrder: 5 },
];

const PRODUCT_TEMPLATES = [
  { productType: "tshirt", material: "cotton", baseCost: 2500, suggestedPrice: 9900, uvMapUrl: "https://cdn.aineed.com/templates/tshirt_uv.png", availableSizes: ["S", "M", "L", "XL", "XXL"], printArea: { x: 150, y: 100, width: 300, height: 350 }, podProvider: "eprolo" },
  { productType: "hoodie", material: "cotton", baseCost: 4500, suggestedPrice: 15900, uvMapUrl: "https://cdn.aineed.com/templates/hoodie_uv.png", availableSizes: ["S", "M", "L", "XL", "XXL"], printArea: { x: 150, y: 120, width: 300, height: 300 }, podProvider: "eprolo" },
  { productType: "hat", material: "cotton", baseCost: 1500, suggestedPrice: 6900, uvMapUrl: "https://cdn.aineed.com/templates/hat_uv.png", availableSizes: ["M", "L"], printArea: { x: 50, y: 20, width: 200, height: 80 }, podProvider: "eprolo" },
  { productType: "bag", material: "canvas", baseCost: 2000, suggestedPrice: 8900, uvMapUrl: "https://cdn.aineed.com/templates/bag_uv.png", availableSizes: ["M"], printArea: { x: 100, y: 80, width: 250, height: 200 }, podProvider: "eprolo" },
  { productType: "phone_case", material: "polycarbonate", baseCost: 800, suggestedPrice: 4900, uvMapUrl: "https://cdn.aineed.com/templates/phone_case_uv.png", availableSizes: ["iPhone 15", "iPhone 15 Pro"], printArea: { x: 10, y: 30, width: 100, height: 180 }, podProvider: "eprolo" },
  { productType: "shoes", material: "canvas", baseCost: 3500, suggestedPrice: 12900, uvMapUrl: "https://cdn.aineed.com/templates/shoes_uv.png", availableSizes: ["36", "37", "38", "39", "40", "41", "42", "43", "44"], printArea: { x: 50, y: 30, width: 150, height: 100 }, podProvider: "eprolo" },
];

const OUTFIT_TEMPLATES = [
  { name: "都市通勤精英", occasion: "work", season: "autumn", styleTags: ["极简", "商务"], slots: ["top", "bottom", "outerwear", "shoes", "bag", "accessory"] },
  { name: "浪漫约会之夜", occasion: "date", season: "spring", styleTags: ["法式", "复古"], slots: ["dress", "shoes", "bag", "accessory", "accessory", "outerwear"] },
  { name: "周末休闲出街", occasion: "casual", season: "spring", styleTags: ["休闲", "街头"], slots: ["top", "bottom", "shoes", "bag", "hat", "outerwear"] },
  { name: "活力运动风", occasion: "sport", season: "spring", styleTags: ["运动休闲"], slots: ["top", "bottom", "shoes", "bag", "accessory", "hat"] },
  { name: "正式晚宴", occasion: "formal", season: "autumn", styleTags: ["法式", "商务"], slots: ["dress", "shoes", "bag", "accessory", "accessory", "outerwear"] },
  { name: "韩系甜美约会", occasion: "date", season: "spring", styleTags: ["韩系", "休闲"], slots: ["top", "bottom", "shoes", "bag", "accessory", "outerwear"] },
  { name: "国潮街头范", occasion: "casual", season: "autumn", styleTags: ["国潮", "街头"], slots: ["top", "bottom", "shoes", "bag", "accessory", "hat"] },
  { name: "日系文艺青年", occasion: "casual", season: "spring", styleTags: ["日系", "极简"], slots: ["top", "bottom", "shoes", "bag", "accessory", "hat"] },
  { name: "商务男士正装", occasion: "formal", season: "autumn", styleTags: ["商务"], slots: ["top", "bottom", "outerwear", "shoes", "bag", "accessory"] },
  { name: "新中式雅致", occasion: "date", season: "autumn", styleTags: ["新中式", "国潮"], slots: ["top", "bottom", "shoes", "bag", "accessory", "outerwear"] },
  { name: "极简职场女性", occasion: "work", season: "spring", styleTags: ["极简", "商务"], slots: ["top", "bottom", "shoes", "bag", "accessory"] },
  { name: "法式慵懒周末", occasion: "casual", season: "summer", styleTags: ["法式", "休闲"], slots: ["dress", "shoes", "bag", "accessory", "hat"] },
  { name: "秋冬复古文艺", occasion: "date", season: "autumn", styleTags: ["复古", "法式"], slots: ["top", "bottom", "outerwear", "shoes", "accessory"] },
  { name: "运动休闲日常", occasion: "casual", season: "spring", styleTags: ["运动休闲", "休闲"], slots: ["top", "bottom", "shoes", "bag", "hat"] },
  { name: "夏日清凉约会", occasion: "date", season: "summer", styleTags: ["法式", "极简"], slots: ["dress", "shoes", "bag", "accessory"] },
  { name: "商务休闲男士", occasion: "work", season: "spring", styleTags: ["商务休闲"], slots: ["top", "bottom", "outerwear", "shoes", "bag"] },
  { name: "街头酷女孩", occasion: "casual", season: "autumn", styleTags: ["街头", "休闲"], slots: ["top", "bottom", "outerwear", "shoes", "bag"] },
  { name: "冬日温暖出行", occasion: "casual", season: "winter", styleTags: ["极简", "休闲"], slots: ["top", "bottom", "outerwear", "shoes", "accessory"] },
  { name: "面试成功穿搭", occasion: "work", season: "spring", styleTags: ["商务", "极简"], slots: ["outerwear", "bottom", "shoes", "bag"] },
  { name: "瑜伽健身运动", occasion: "sport", season: "summer", styleTags: ["运动休闲"], slots: ["top", "bottom", "shoes", "bag"] },
  { name: "派对女王", occasion: "party", season: "autumn", styleTags: ["法式", "复古"], slots: ["dress", "shoes", "bag", "accessory"] },
  { name: "旅行轻装上阵", occasion: "casual", season: "summer", styleTags: ["休闲", "极简"], slots: ["top", "bottom", "outerwear", "shoes", "bag", "hat"] },
  { name: "COS极简美学", occasion: "work", season: "autumn", styleTags: ["极简"], slots: ["top", "bottom", "shoes", "bag", "accessory"] },
  { name: "居家舒适风", occasion: "casual", season: "winter", styleTags: ["休闲", "日系"], slots: ["top", "bottom", "shoes"] },
  { name: "春日踏青穿搭", occasion: "casual", season: "spring", styleTags: ["休闲", "法式"], slots: ["top", "bottom", "shoes", "bag", "hat"] },
];

async function main() {
  console.log("🌱 开始种子数据...");

  const passwordHash = await hash("Test123456!", 12);

  const user = await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: {
      email: "test@example.com",
      nickname: "测试用户",
      passwordHash,
      gender: "female",
      role: "user",
      language: "zh",
    },
  });
  console.log(`✅ 用户: ${user.nickname}`);

  await prisma.bodyProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      bodyType: "hourglass",
      colorSeason: "autumn",
      measurements: { height: 165, weight: 55, bust: 86, waist: 68, hips: 92 },
      analysisResult: { type: "沙漏型", season: "秋季型", advice: "适合收腰款式，驼色和深蓝是最佳色系" },
    },
  });

  await prisma.userStylePreference.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      userId: user.id,
      styleTags: ["极简", "法式"],
      occasionTags: ["work", "date"],
      colorPreferences: ["黑色", "驼色", "白色", "深蓝"],
      budgetRange: "500-2000",
    },
  });
  console.log("✅ 用户画像");

  const brandRecords = [];
  for (const b of BRANDS) {
    const brand = await prisma.brand.upsert({ where: { name: b.name }, update: {}, create: b });
    brandRecords.push(brand);
  }
  console.log(`✅ 品牌: ${brandRecords.length}`);

  const catRecords: Record<string, any> = {};
  for (const c of CATEGORIES) {
    const cat = await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
    catRecords[c.slug] = cat;
  }
  console.log(`✅ 分类: ${CATEGORIES.length}`);

  const allClothingData = generateClothingItems();
  console.log(`📦 生成服装数据: ${allClothingData.length} 件`);

  let clothingCount = 0;
  for (const item of allClothingData) {
    const brand = brandRecords[item.brandIndex];
    const cat = catRecords[item.categorySlug];
    if (!brand || !cat) continue;

    await prisma.clothingItem.create({
      data: {
        brandId: brand.id,
        categoryId: cat.id,
        name: item.name,
        price: item.price,
        originalPrice: item.originalPrice,
        gender: item.gender,
        seasons: item.seasons,
        occasions: item.occasions,
        styleTags: item.styleTags,
        colors: item.colors,
        materials: item.materials,
        fitType: item.fitType,
        imageUrls: [`https://cdn.aineed.com/clothing/${item.categorySlug}/${item.brandIndex}-${clothingCount}.png`],
      },
    });
    clothingCount++;
  }
  console.log(`✅ 服装: ${clothingCount}`);

  const allClothing = await prisma.clothingItem.findMany({ select: { id: true, category: { select: { slug: true } } } });
  const clothingByCategory: Record<string, string[]> = {};
  for (const c of allClothing) {
    const slug = c.category?.slug || "top";
    if (!clothingByCategory[slug]) clothingByCategory[slug] = [];
    clothingByCategory[slug].push(c.id);
  }

  let outfitCount = 0;
  for (const tpl of OUTFIT_TEMPLATES) {
    const itemIds: string[] = [];
    for (const slot of tpl.slots) {
      const pool = clothingByCategory[slot] || clothingByCategory["top"];
      if (pool && pool.length > 0) {
        const idx = outfitCount % pool.length;
        itemIds.push(pool[idx]);
      }
    }

    const outfit = await prisma.outfit.create({
      data: {
        userId: user.id,
        name: tpl.name,
        occasion: tpl.occasion,
        season: tpl.season,
        styleTags: tpl.styleTags,
        isPublic: true,
      },
    });

    for (let i = 0; i < itemIds.length; i++) {
      await prisma.outfitItem.create({
        data: {
          outfitId: outfit.id,
          clothingId: itemIds[i],
          slot: tpl.slots[i],
          sortOrder: i,
        },
      });
    }
    outfitCount++;
  }
  console.log(`✅ 搭配方案: ${outfitCount}`);

  let postCount = 0;
  for (const postData of COMMUNITY_POSTS_DATA) {
    await prisma.communityPost.create({
      data: {
        userId: user.id,
        title: postData.title,
        content: postData.content,
        imageUrls: [`https://cdn.aineed.com/community/post-${postCount + 1}.png`],
        tags: postData.tags,
        isFeatured: postData.isFeatured,
        likesCount: Math.floor(Math.random() * 200) + 10,
        commentsCount: Math.floor(Math.random() * 30),
        sharesCount: Math.floor(Math.random() * 50),
      },
    });
    postCount++;
  }
  console.log(`✅ 社区帖子: ${postCount}`);

  let studioCount = 0;
  for (const studioData of BESPOKE_STUDIOS_DATA) {
    await prisma.bespokeStudio.create({
      data: {
        userId: user.id,
        name: studioData.name,
        slug: studioData.slug,
        description: studioData.description,
        city: studioData.city,
        specialties: studioData.specialties,
        serviceTypes: studioData.serviceTypes,
        priceRange: studioData.priceRange,
        isVerified: studioData.isVerified,
        rating: 4.5 + Math.random() * 0.5,
        reviewCount: Math.floor(Math.random() * 100) + 20,
        orderCount: Math.floor(Math.random() * 200) + 50,
        portfolioImages: [`https://cdn.aineed.com/studio/${studioData.slug}/portfolio.png`],
        logoUrl: `https://cdn.aineed.com/studio/${studioData.slug}/logo.png`,
      },
    });
    studioCount++;
  }
  console.log(`✅ 工作室: ${studioCount}`);

  let designCount = 0;
  for (const designData of CUSTOM_DESIGNS_DATA) {
    await prisma.customDesign.create({
      data: {
        userId: user.id,
        name: designData.name,
        productType: designData.productType,
        tags: designData.tags,
        isPublic: designData.isPublic,
        status: designData.status,
        designData: { type: designData.productType, pattern: designData.name, colors: ["#000000", "#FFFFFF"] },
        previewImageUrl: `https://cdn.aineed.com/designs/design-${designCount + 1}.png`,
        likesCount: Math.floor(Math.random() * 100) + 5,
        purchasesCount: Math.floor(Math.random() * 30),
        downloadsCount: Math.floor(Math.random() * 50),
      },
    });
    designCount++;
  }
  console.log(`✅ 定制设计: ${designCount}`);

  let ruleCount = 0;
  for (const rule of STYLE_RULES_DATA) {
    await prisma.styleRule.create({ data: rule });
    ruleCount++;
  }
  console.log(`✅ 风格规则: ${ruleCount}`);

  for (const tpl of AVATAR_TEMPLATES) {
    await prisma.avatarTemplate.create({ data: tpl });
  }
  console.log(`✅ 头像模板: ${AVATAR_TEMPLATES.length}`);

  for (const pt of PRODUCT_TEMPLATES) {
    await prisma.productTemplate.create({ data: pt });
  }
  console.log(`✅ 产品模板: ${PRODUCT_TEMPLATES.length}`);

  const studios = await prisma.bespokeStudio.findMany({ take: 1 });
  if (studios.length > 0) {
    await prisma.bespokeOrder.create({
      data: {
        userId: user.id,
        studioId: studios[0].id,
        title: "定制西装",
        description: "需要一套深蓝色商务西装，修身版型",
        referenceImages: ["https://cdn.aineed.com/orders/ref-suit.png"],
        budgetRange: "5000-10000",
        measurements: { chest: 96, waist: 80, shoulder: 44, sleeve: 60 },
        statusHistory: [{ status: "submitted", at: new Date().toISOString() }],
      },
    });
    console.log("✅ 定制订单: 1");
  }

  console.log("\n🎉 种子数据完成！");
  console.log(`📊 统计: ${clothingCount} 服装, ${outfitCount} 搭配, ${postCount} 帖子, ${studioCount} 工作室, ${designCount} 设计, ${ruleCount} 规则`);
}

main()
  .catch((e) => {
    console.error("❌ 种子数据失败:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
