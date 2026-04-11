import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BRANDS = [
  { name: "ZARA", logoUrl: "https://cdn.aineed.com/brands/zara.png", description: "西班牙快时尚品牌，以快速反应潮流趋势著称，设计简约现代" },
  { name: "H&M", logoUrl: "https://cdn.aineed.com/brands/hm.png", description: "瑞典快时尚品牌，提供时尚且价格亲民的服装配饰" },
  { name: "优衣库", logoUrl: "https://cdn.aineed.com/brands/uniqlo.png", description: "日本休闲服饰品牌，以基础款和功能性面料闻名" },
  { name: "Nike", logoUrl: "https://cdn.aineed.com/brands/nike.png", description: "美国运动品牌，全球领先的运动鞋服和运动装备制造商" },
  { name: "GUCCI", logoUrl: "https://cdn.aineed.com/brands/gucci.png", description: "意大利奢侈品牌，以精湛工艺和前卫设计著称" },
  { name: "COS", logoUrl: "https://cdn.aineed.com/brands/cos.png", description: "H&M集团高端线，极简主义设计，注重剪裁与面料质感" },
  { name: "太平鸟", logoUrl: "https://cdn.aineed.com/brands/peacebird.png", description: "中国时尚品牌，年轻化设计，融合潮流与日常穿搭" },
  { name: "Adidas", logoUrl: "https://cdn.aineed.com/brands/adidas.png", description: "德国运动品牌，经典三道杠设计，运动与街头文化结合" },
  { name: "Massimo Dutti", logoUrl: "https://cdn.aineed.com/brands/massimo-dutti.png", description: "Inditex集团高端品牌，优雅精致的都市风格" },
  { name: "MUJI", logoUrl: "https://cdn.aineed.com/brands/muji.png", description: "日本无印良品，极简自然风格，注重材质与舒适度" },
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

type ClothingSeed = {
  name: string;
  brandIndex: number;
  categorySlug: string;
  price: number;
  originalPrice: number;
  gender: string;
  seasons: string[];
  occasions: string[];
  styleTags: string[];
  colors: string[];
  materials: string[];
  fitType: string;
};

const CLOTHING_DATA: ClothingSeed[] = [
  { name: "经典修身白衬衫", brandIndex: 0, categorySlug: "top", price: 299, originalPrice: 399, gender: "female", seasons: ["spring", "autumn"], occasions: ["work", "date"], styleTags: ["极简", "商务"], colors: ["白色"], materials: ["棉"], fitType: "修身" },
  { name: "宽松条纹针织衫", brandIndex: 0, categorySlug: "top", price: 259, originalPrice: 359, gender: "female", seasons: ["spring", "autumn"], occasions: ["casual", "date"], styleTags: ["法式", "休闲"], colors: ["蓝白条纹"], materials: ["棉混纺"], fitType: "宽松" },
  { name: "高领羊绒毛衣", brandIndex: 0, categorySlug: "top", price: 599, originalPrice: 799, gender: "female", seasons: ["autumn", "winter"], occasions: ["work", "date"], styleTags: ["极简", "法式"], colors: ["驼色"], materials: ["羊绒"], fitType: "修身" },
  { name: "丝质印花衬衫", brandIndex: 0, categorySlug: "top", price: 459, originalPrice: 599, gender: "female", seasons: ["spring", "summer"], occasions: ["date", "party"], styleTags: ["法式", "复古"], colors: ["碎花"], materials: ["丝"], fitType: "常规" },
  { name: "短款牛仔外套上衣", brandIndex: 0, categorySlug: "top", price: 349, originalPrice: 449, gender: "female", seasons: ["spring", "summer"], occasions: ["casual", "date"], styleTags: ["街头", "休闲"], colors: ["浅蓝"], materials: ["牛仔"], fitType: "短款" },
  { name: "基础款纯棉T恤", brandIndex: 2, categorySlug: "top", price: 79, originalPrice: 99, gender: "male", seasons: ["spring", "summer", "autumn"], occasions: ["casual", "sport"], styleTags: ["极简", "休闲"], colors: ["黑色"], materials: ["棉"], fitType: "常规" },
  { name: "HEATTECH保暖内衣", brandIndex: 2, categorySlug: "top", price: 149, originalPrice: 199, gender: "female", seasons: ["autumn", "winter"], occasions: ["casual"], styleTags: ["极简"], colors: ["灰色"], materials: ["聚酯纤维"], fitType: "修身" },
  { name: "AIRism凉感背心", brandIndex: 2, categorySlug: "top", price: 59, originalPrice: 79, gender: "female", seasons: ["summer"], occasions: ["casual", "sport"], styleTags: ["极简"], colors: ["白色"], materials: ["聚酯纤维"], fitType: "修身" },
  { name: "法兰绒格子衬衫", brandIndex: 2, categorySlug: "top", price: 149, originalPrice: 199, gender: "male", seasons: ["autumn", "winter"], occasions: ["casual"], styleTags: ["日系", "复古"], colors: ["红黑格"], materials: ["棉"], fitType: "常规" },
  { name: "弹力修身Polo衫", brandIndex: 2, categorySlug: "top", price: 129, originalPrice: 169, gender: "male", seasons: ["spring", "summer"], occasions: ["casual", "work"], styleTags: ["商务休闲"], colors: ["深蓝"], materials: ["棉混纺"], fitType: "修身" },
  { name: "圆领针织毛衣", brandIndex: 5, categorySlug: "top", price: 650, originalPrice: 850, gender: "female", seasons: ["autumn", "winter"], occasions: ["work", "date"], styleTags: ["极简", "法式"], colors: ["米白"], materials: ["羊毛"], fitType: "常规" },
  { name: "不对称下摆衬衫", brandIndex: 5, categorySlug: "top", price: 790, originalPrice: 990, gender: "female", seasons: ["spring", "autumn"], occasions: ["work", "date"], styleTags: ["极简", "法式"], colors: ["象牙白"], materials: ["棉"], fitType: "宽松" },
  { name: "廓形羊毛混纺上衣", brandIndex: 5, categorySlug: "top", price: 890, originalPrice: 1190, gender: "female", seasons: ["autumn", "winter"], occasions: ["work"], styleTags: ["极简"], colors: ["炭灰"], materials: ["羊毛混纺"], fitType: "宽松" },
  { name: "印花真丝衬衫", brandIndex: 8, categorySlug: "top", price: 690, originalPrice: 890, gender: "female", seasons: ["spring", "summer"], occasions: ["work", "date"], styleTags: ["法式", "商务"], colors: ["米色印花"], materials: ["丝"], fitType: "修身" },
  { name: "亚麻休闲衬衫", brandIndex: 8, categorySlug: "top", price: 590, originalPrice: 790, gender: "male", seasons: ["spring", "summer"], occasions: ["casual", "work"], styleTags: ["法式", "商务休闲"], colors: ["浅蓝"], materials: ["亚麻"], fitType: "常规" },
  { name: "字母印花卫衣", brandIndex: 6, categorySlug: "top", price: 299, originalPrice: 399, gender: "female", seasons: ["spring", "autumn"], occasions: ["casual", "date"], styleTags: ["街头", "国潮"], colors: ["粉色"], materials: ["棉"], fitType: "宽松" },
  { name: "国潮刺绣卫衣", brandIndex: 6, categorySlug: "top", price: 399, originalPrice: 499, gender: "male", seasons: ["spring", "autumn"], occasions: ["casual", "date"], styleTags: ["国潮", "街头"], colors: ["黑色"], materials: ["棉"], fitType: "宽松" },
  { name: "撞色拼接T恤", brandIndex: 6, categorySlug: "top", price: 199, originalPrice: 259, gender: "male", seasons: ["spring", "summer"], occasions: ["casual"], styleTags: ["街头", "国潮"], colors: ["黑白"], materials: ["棉"], fitType: "常规" },
  { name: "有机棉基础T恤", brandIndex: 9, categorySlug: "top", price: 99, originalPrice: 129, gender: "female", seasons: ["spring", "summer", "autumn"], occasions: ["casual"], styleTags: ["极简", "日系"], colors: ["灰白"], materials: ["有机棉"], fitType: "常规" },
  { name: "无领亚麻衬衫", brandIndex: 9, categorySlug: "top", price: 199, originalPrice: 249, gender: "male", seasons: ["spring", "summer"], occasions: ["casual", "work"], styleTags: ["日系", "极简"], colors: ["卡其"], materials: ["亚麻"], fitType: "常规" },
  { name: "修身直筒牛仔裤", brandIndex: 0, categorySlug: "bottom", price: 399, originalPrice: 499, gender: "female", seasons: ["spring", "summer", "autumn", "winter"], occasions: ["casual", "date"], styleTags: ["极简", "休闲"], colors: ["深蓝"], materials: ["牛仔"], fitType: "修身" },
  { name: "高腰阔腿裤", brandIndex: 0, categorySlug: "bottom", price: 359, originalPrice: 459, gender: "female", seasons: ["spring", "summer", "autumn"], occasions: ["work", "casual"], styleTags: ["法式", "极简"], colors: ["黑色"], materials: ["聚酯纤维"], fitType: "高腰阔腿" },
  { name: "百褶 midi 裙", brandIndex: 0, categorySlug: "bottom", price: 329, originalPrice: 429, gender: "female", seasons: ["spring", "autumn"], occasions: ["date", "party"], styleTags: ["法式", "复古"], colors: ["焦糖色"], materials: ["聚酯纤维"], fitType: "中腰" },
  { name: "运动休闲束脚裤", brandIndex: 7, categorySlug: "bottom", price: 349, originalPrice: 449, gender: "male", seasons: ["spring", "autumn"], occasions: ["sport", "casual"], styleTags: ["运动休闲", "街头"], colors: ["黑色"], materials: ["聚酯纤维"], fitType: "宽松" },
  { name: "经典三条杠运动裤", brandIndex: 7, categorySlug: "bottom", price: 399, originalPrice: 499, gender: "male", seasons: ["spring", "autumn"], occasions: ["sport", "casual"], styleTags: ["运动休闲"], colors: ["深蓝"], materials: ["聚酯纤维"], fitType: "常规" },
  { name: "弹力修身西装裤", brandIndex: 2, categorySlug: "bottom", price: 249, originalPrice: 329, gender: "male", seasons: ["spring", "summer", "autumn", "winter"], occasions: ["work", "formal"], styleTags: ["商务"], colors: ["深灰"], materials: ["羊毛混纺"], fitType: "修身" },
  { name: "弹力牛仔裤", brandIndex: 2, categorySlug: "bottom", price: 199, originalPrice: 249, gender: "female", seasons: ["spring", "summer", "autumn", "winter"], occasions: ["casual", "date"], styleTags: ["休闲", "极简"], colors: ["中蓝"], materials: ["牛仔"], fitType: "修身" },
  { name: "宽腿亚麻裤", brandIndex: 2, categorySlug: "bottom", price: 179, originalPrice: 229, gender: "female", seasons: ["spring", "summer"], occasions: ["casual", "date"], styleTags: ["日系", "极简"], colors: ["米色"], materials: ["亚麻"], fitType: "宽松" },
  { name: "工装短裤", brandIndex: 2, categorySlug: "bottom", price: 149, originalPrice: 199, gender: "male", seasons: ["summer"], occasions: ["casual"], styleTags: ["街头", "休闲"], colors: ["卡其"], materials: ["棉"], fitType: "常规" },
  { name: "高腰A字半裙", brandIndex: 5, categorySlug: "bottom", price: 690, originalPrice: 890, gender: "female", seasons: ["spring", "summer", "autumn"], occasions: ["work", "date"], styleTags: ["极简", "法式"], colors: ["黑色"], materials: ["羊毛混纺"], fitType: "高腰" },
  { name: "垂感阔腿西裤", brandIndex: 5, categorySlug: "bottom", price: 790, originalPrice: 990, gender: "female", seasons: ["spring", "autumn", "winter"], occasions: ["work"], styleTags: ["极简", "商务"], colors: ["深灰"], materials: ["羊毛混纺"], fitType: "高腰阔腿" },
  { name: "褶皱细节长裤", brandIndex: 8, categorySlug: "bottom", price: 690, originalPrice: 890, gender: "female", seasons: ["spring", "autumn"], occasions: ["work", "date"], styleTags: ["法式", "商务"], colors: ["驼色"], materials: ["羊毛混纺"], fitType: "高腰" },
  { name: "修身棉质休闲裤", brandIndex: 8, categorySlug: "bottom", price: 590, originalPrice: 790, gender: "male", seasons: ["spring", "summer", "autumn"], occasions: ["casual", "work"], styleTags: ["商务休闲"], colors: ["米色"], materials: ["棉"], fitType: "修身" },
  { name: "国潮印花运动裤", brandIndex: 6, categorySlug: "bottom", price: 329, originalPrice: 399, gender: "male", seasons: ["spring", "autumn"], occasions: ["casual", "sport"], styleTags: ["国潮", "街头"], colors: ["黑色"], materials: ["棉混纺"], fitType: "宽松" },
  { name: "宽松灯芯绒裤", brandIndex: 9, categorySlug: "bottom", price: 199, originalPrice: 249, gender: "male", seasons: ["autumn", "winter"], occasions: ["casual"], styleTags: ["日系", "复古"], colors: ["深棕"], materials: ["灯芯绒"], fitType: "宽松" },
  { name: "羊毛混纺大衣", brandIndex: 0, categorySlug: "outerwear", price: 1299, originalPrice: 1699, gender: "female", seasons: ["autumn", "winter"], occasions: ["work", "date"], styleTags: ["极简", "法式"], colors: ["驼色"], materials: ["羊毛混纺"], fitType: "常规" },
  { name: "双面穿羊绒大衣", brandIndex: 0, categorySlug: "outerwear", price: 1999, originalPrice: 2599, gender: "female", seasons: ["winter"], occasions: ["work", "formal"], styleTags: ["极简", "商务"], colors: ["黑色"], materials: ["羊绒混纺"], fitType: "修身" },
  { name: "飞行员夹克", brandIndex: 0, categorySlug: "outerwear", price: 799, originalPrice: 999, gender: "male", seasons: ["spring", "autumn"], occasions: ["casual", "date"], styleTags: ["街头", "休闲"], colors: ["军绿"], materials: ["尼龙"], fitType: "常规" },
  { name: "风衣", brandIndex: 0, categorySlug: "outerwear", price: 899, originalPrice: 1199, gender: "female", seasons: ["spring", "autumn"], occasions: ["work", "casual"], styleTags: ["法式", "极简"], colors: ["卡其"], materials: ["棉混纺"], fitType: "常规" },
  { name: "轻薄羽绒服", brandIndex: 2, categorySlug: "outerwear", price: 499, originalPrice: 599, gender: "female", seasons: ["autumn", "winter"], occasions: ["casual", "work"], styleTags: ["极简"], colors: ["黑色"], materials: ["尼龙", "鹅绒"], fitType: "修身" },
  { name: "Blocktech防风外套", brandIndex: 2, categorySlug: "outerwear", price: 599, originalPrice: 799, gender: "male", seasons: ["spring", "autumn"], occasions: ["casual", "sport"], styleTags: ["极简", "运动休闲"], colors: ["深蓝"], materials: ["聚酯纤维"], fitType: "常规" },
  { name: "摇粒绒拉链外套", brandIndex: 2, categorySlug: "outerwear", price: 199, originalPrice: 249, gender: "female", seasons: ["autumn", "winter"], occasions: ["casual"], styleTags: ["休闲", "日系"], colors: ["灰色"], materials: ["聚酯纤维"], fitType: "常规" },
  { name: "廓形羊毛大衣", brandIndex: 5, categorySlug: "outerwear", price: 1890, originalPrice: 2490, gender: "female", seasons: ["autumn", "winter"], occasions: ["work", "date"], styleTags: ["极简", "法式"], colors: ["驼色"], materials: ["羊毛"], fitType: "宽松" },
  { name: "茧型短款外套", brandIndex: 5, categorySlug: "outerwear", price: 1290, originalPrice: 1690, gender: "female", seasons: ["autumn", "winter"], occasions: ["casual", "date"], styleTags: ["极简"], colors: ["米白"], materials: ["羊毛混纺"], fitType: "宽松" },
  { name: "双排扣风衣", brandIndex: 8, categorySlug: "outerwear", price: 1590, originalPrice: 1990, gender: "female", seasons: ["spring", "autumn"], occasions: ["work", "date"], styleTags: ["法式", "商务"], colors: ["卡其"], materials: ["棉混纺"], fitType: "修身" },
  { name: "休闲西装外套", brandIndex: 8, categorySlug: "outerwear", price: 1290, originalPrice: 1590, gender: "male", seasons: ["spring", "autumn"], occasions: ["work", "casual"], styleTags: ["商务休闲"], colors: ["深蓝"], materials: ["羊毛混纺"], fitType: "修身" },
  { name: "运动风衣", brandIndex: 3, categorySlug: "outerwear", price: 899, originalPrice: 1099, gender: "male", seasons: ["spring", "autumn"], occasions: ["sport", "casual"], styleTags: ["运动休闲"], colors: ["黑色"], materials: ["聚酯纤维"], fitType: "常规" },
  { name: "Dri-FIT跑步夹克", brandIndex: 3, categorySlug: "outerwear", price: 599, originalPrice: 749, gender: "male", seasons: ["spring", "autumn"], occasions: ["sport"], styleTags: ["运动休闲"], colors: ["荧光绿"], materials: ["聚酯纤维"], fitType: "修身" },
  { name: "国潮刺绣夹克", brandIndex: 6, categorySlug: "outerwear", price: 599, originalPrice: 799, gender: "male", seasons: ["spring", "autumn"], occasions: ["casual", "date"], styleTags: ["国潮", "街头"], colors: ["黑色"], materials: ["棉混纺"], fitType: "常规" },
  { name: "棉麻混纺外套", brandIndex: 9, categorySlug: "outerwear", price: 299, originalPrice: 399, gender: "female", seasons: ["spring", "summer"], occasions: ["casual"], styleTags: ["日系", "极简"], colors: ["灰蓝"], materials: ["棉麻混纺"], fitType: "宽松" },
  { name: "Air Force 1 低帮板鞋", brandIndex: 3, categorySlug: "shoes", price: 799, originalPrice: 799, gender: "male", seasons: ["spring", "summer", "autumn", "winter"], occasions: ["casual", "date"], styleTags: ["街头", "休闲"], colors: ["白色"], materials: ["皮革"], fitType: "常规" },
  { name: "Air Max 270 气垫跑鞋", brandIndex: 3, categorySlug: "shoes", price: 1099, originalPrice: 1299, gender: "male", seasons: ["spring", "summer", "autumn"], occasions: ["sport", "casual"], styleTags: ["运动休闲"], colors: ["黑色"], materials: ["网布", "橡胶"], fitType: "常规" },
  { name: "Blazer Mid 经典板鞋", brandIndex: 3, categorySlug: "shoes", price: 699, originalPrice: 799, gender: "female", seasons: ["spring", "summer", "autumn"], occasions: ["casual", "date"], styleTags: ["街头", "休闲"], colors: ["白色"], materials: ["皮革"], fitType: "常规" },
  { name: "Free Run 跑步鞋", brandIndex: 3, categorySlug: "shoes", price: 699, originalPrice: 899, gender: "female", seasons: ["spring", "summer", "autumn"], occasions: ["sport"], styleTags: ["运动休闲"], colors: ["粉色"], materials: ["网布"], fitType: "常规" },
  { name: "Ultraboost 跑鞋", brandIndex: 7, categorySlug: "shoes", price: 1299, originalPrice: 1499, gender: "male", seasons: ["spring", "summer", "autumn"], occasions: ["sport", "casual"], styleTags: ["运动休闲"], colors: ["黑色"], materials: ["Primeknit"], fitType: "常规" },
  { name: "Stan Smith 经典小白鞋", brandIndex: 7, categorySlug: "shoes", price: 799, originalPrice: 899, gender: "female", seasons: ["spring", "summer", "autumn"], occasions: ["casual", "date"], styleTags: ["极简", "休闲"], colors: ["白色"], materials: ["皮革"], fitType: "常规" },
  { name: "Superstar 经典板鞋", brandIndex: 7, categorySlug: "shoes", price: 799, originalPrice: 899, gender: "male", seasons: ["spring", "summer", "autumn", "winter"], occasions: ["casual"], styleTags: ["街头", "休闲"], colors: ["黑白"], materials: ["皮革"], fitType: "常规" },
  { name: "尖头细跟高跟鞋", brandIndex: 0, categorySlug: "shoes", price: 599, originalPrice: 799, gender: "female", seasons: ["spring", "summer", "autumn"], occasions: ["work", "date", "formal"], styleTags: ["法式", "商务"], colors: ["黑色"], materials: ["皮革"], fitType: "尖头" },
  { name: "乐福鞋", brandIndex: 0, categorySlug: "shoes", price: 459, originalPrice: 599, gender: "female", seasons: ["spring", "autumn"], occasions: ["work", "casual"], styleTags: ["法式", "极简"], colors: ["驼色"], materials: ["皮革"], fitType: "圆头" },
  { name: "切尔西靴", brandIndex: 0, categorySlug: "shoes", price: 899, originalPrice: 1199, gender: "female", seasons: ["autumn", "winter"], occasions: ["casual", "date"], styleTags: ["法式", "街头"], colors: ["黑色"], materials: ["皮革"], fitType: "尖头" },
  { name: "厚底乐福鞋", brandIndex: 5, categorySlug: "shoes", price: 990, originalPrice: 1290, gender: "female", seasons: ["spring", "autumn"], occasions: ["work", "date"], styleTags: ["极简", "法式"], colors: ["黑色"], materials: ["皮革"], fitType: "圆头" },
  { name: "尖头平底鞋", brandIndex: 5, categorySlug: "shoes", price: 890, originalPrice: 1090, gender: "female", seasons: ["spring", "summer", "autumn"], occasions: ["work", "date"], styleTags: ["极简"], colors: ["裸色"], materials: ["皮革"], fitType: "尖头" },
  { name: "一脚蹬休闲鞋", brandIndex: 2, categorySlug: "shoes", price: 199, originalPrice: 249, gender: "male", seasons: ["spring", "summer", "autumn"], occasions: ["casual"], styleTags: ["休闲", "日系"], colors: ["深蓝"], materials: ["帆布"], fitType: "圆头" },
  { name: "皮质德比鞋", brandIndex: 8, categorySlug: "shoes", price: 1290, originalPrice: 1590, gender: "male", seasons: ["spring", "autumn", "winter"], occasions: ["work", "formal"], styleTags: ["商务"], colors: ["棕色"], materials: ["皮革"], fitType: "圆头" },
  { name: "GG Marmont 链条包", brandIndex: 4, categorySlug: "bag", price: 15900, originalPrice: 15900, gender: "female", seasons: ["spring", "summer", "autumn", "winter"], occasions: ["date", "party", "formal"], styleTags: ["法式", "商务"], colors: ["黑色"], materials: ["皮革"], fitType: "迷你" },
  { name: "Hobo 月牙包", brandIndex: 4, categorySlug: "bag", price: 12500, originalPrice: 12500, gender: "female", seasons: ["spring", "summer", "autumn", "winter"], occasions: ["casual", "date"], styleTags: ["法式", "休闲"], colors: ["驼色"], materials: ["皮革"], fitType: "小号" },
  { name: "Dionysus 酒神包", brandIndex: 4, categorySlug: "bag", price: 18500, originalPrice: 18500, gender: "female", seasons: ["spring", "summer", "autumn", "winter"], occasions: ["party", "formal"], styleTags: ["法式"], colors: ["黑色"], materials: ["皮革"], fitType: "小号" },
  { name: "托特包", brandIndex: 0, categorySlug: "bag", price: 599, originalPrice: 799, gender: "female", seasons: ["spring", "summer", "autumn", "winter"], occasions: ["work", "casual"], styleTags: ["极简", "商务"], colors: ["黑色"], materials: ["皮革"], fitType: "中号" },
  { name: "斜挎链条包", brandIndex: 0, categorySlug: "bag", price: 459, originalPrice: 599, gender: "female", seasons: ["spring", "summer", "autumn", "winter"], occasions: ["date", "casual"], styleTags: ["法式", "休闲"], colors: ["驼色"], materials: ["皮革"], fitType: "小号" },
  { name: "双肩背包", brandIndex: 2, categorySlug: "bag", price: 249, originalPrice: 299, gender: "male", seasons: ["spring", "summer", "autumn", "winter"], occasions: ["casual", "sport"], styleTags: ["休闲", "极简"], colors: ["深蓝"], materials: ["尼龙"], fitType: "常规" },
  { name: "圆形迷你包", brandIndex: 5, categorySlug: "bag", price: 890, originalPrice: 1090, gender: "female", seasons: ["spring", "summer"], occasions: ["date", "party"], styleTags: ["极简"], colors: ["白色"], materials: ["皮革"], fitType: "迷你" },
  { name: "结构感手提包", brandIndex: 5, categorySlug: "bag", price: 1290, originalPrice: 1590, gender: "female", seasons: ["spring", "autumn", "winter"], occasions: ["work"], styleTags: ["极简", "商务"], colors: ["黑色"], materials: ["皮革"], fitType: "中号" },
  { name: "邮差包", brandIndex: 8, categorySlug: "bag", price: 990, originalPrice: 1290, gender: "male", seasons: ["spring", "summer", "autumn", "winter"], occasions: ["work", "casual"], styleTags: ["商务休闲"], colors: ["棕色"], materials: ["皮革"], fitType: "常规" },
  { name: "极简双肩包", brandIndex: 9, categorySlug: "bag", price: 299, originalPrice: 399, gender: "male", seasons: ["spring", "summer", "autumn", "winter"], occasions: ["casual"], styleTags: ["日系", "极简"], colors: ["灰色"], materials: ["聚酯纤维"], fitType: "常规" },
  { name: "丝巾", brandIndex: 0, categorySlug: "accessory", price: 199, originalPrice: 259, gender: "female", seasons: ["spring", "autumn"], occasions: ["date", "work"], styleTags: ["法式", "复古"], colors: ["印花"], materials: ["丝"], fitType: "常规" },
  { name: "极简金属手表", brandIndex: 5, categorySlug: "accessory", price: 1590, originalPrice: 1990, gender: "female", seasons: ["spring", "summer", "autumn", "winter"], occasions: ["work", "date"], styleTags: ["极简"], colors: ["银色"], materials: ["不锈钢"], fitType: "常规" },
  { name: "珍珠耳环", brandIndex: 0, categorySlug: "accessory", price: 159, originalPrice: 199, gender: "female", seasons: ["spring", "summer", "autumn", "winter"], occasions: ["date", "party", "work"], styleTags: ["法式", "复古"], colors: ["白色"], materials: ["珍珠"], fitType: "常规" },
  { name: "金属链条项链", brandIndex: 0, categorySlug: "accessory", price: 199, originalPrice: 259, gender: "female", seasons: ["spring", "summer", "autumn", "winter"], occasions: ["date", "casual"], styleTags: ["极简", "法式"], colors: ["金色"], materials: ["金属"], fitType: "常规" },
  { name: "皮质腰带", brandIndex: 0, categorySlug: "accessory", price: 259, originalPrice: 349, gender: "female", seasons: ["spring", "summer", "autumn", "winter"], occasions: ["work", "casual"], styleTags: ["极简", "法式"], colors: ["黑色"], materials: ["皮革"], fitType: "常规" },
  { name: "运动腕带", brandIndex: 3, categorySlug: "accessory", price: 299, originalPrice: 349, gender: "male", seasons: ["spring", "summer", "autumn"], occasions: ["sport"], styleTags: ["运动休闲"], colors: ["黑色"], materials: ["硅胶"], fitType: "常规" },
  { name: "棒球帽", brandIndex: 3, categorySlug: "hat", price: 299, originalPrice: 349, gender: "male", seasons: ["spring", "summer"], occasions: ["casual", "sport"], styleTags: ["街头", "运动休闲"], colors: ["黑色"], materials: ["棉"], fitType: "可调节" },
  { name: "渔夫帽", brandIndex: 7, categorySlug: "hat", price: 299, originalPrice: 349, gender: "male", seasons: ["spring", "summer"], occasions: ["casual", "sport"], styleTags: ["街头", "休闲"], colors: ["黑色"], materials: ["棉"], fitType: "常规" },
  { name: "贝雷帽", brandIndex: 0, categorySlug: "hat", price: 199, originalPrice: 259, gender: "female", seasons: ["autumn", "winter"], occasions: ["date", "casual"], styleTags: ["法式", "复古"], colors: ["驼色"], materials: ["羊毛"], fitType: "常规" },
  { name: "针织冷帽", brandIndex: 2, categorySlug: "hat", price: 79, originalPrice: 99, gender: "male", seasons: ["autumn", "winter"], occasions: ["casual"], styleTags: ["休闲", "日系"], colors: ["深灰"], materials: ["羊毛混纺"], fitType: "常规" },
  { name: "宽檐礼帽", brandIndex: 5, categorySlug: "hat", price: 590, originalPrice: 790, gender: "female", seasons: ["spring", "autumn"], occasions: ["date", "party"], styleTags: ["法式", "复古"], colors: ["黑色"], materials: ["羊毛"], fitType: "常规" },
  { name: "草编帽", brandIndex: 9, categorySlug: "hat", price: 149, originalPrice: 199, gender: "female", seasons: ["summer"], occasions: ["casual", "date"], styleTags: ["日系", "休闲"], colors: ["米色"], materials: ["草编"], fitType: "常规" },
  { name: "裹身连衣裙", brandIndex: 0, categorySlug: "dress", price: 599, originalPrice: 799, gender: "female", seasons: ["spring", "summer", "autumn"], occasions: ["date", "party"], styleTags: ["法式", "复古"], colors: ["碎花"], materials: ["聚酯纤维"], fitType: "收腰" },
  { name: "小黑裙", brandIndex: 0, categorySlug: "dress", price: 799, originalPrice: 999, gender: "female", seasons: ["spring", "summer", "autumn", "winter"], occasions: ["date", "party", "formal"], styleTags: ["极简", "法式"], colors: ["黑色"], materials: ["聚酯纤维"], fitType: "修身" },
  { name: "针织连衣裙", brandIndex: 0, categorySlug: "dress", price: 459, originalPrice: 599, gender: "female", seasons: ["autumn", "winter"], occasions: ["work", "casual"], styleTags: ["极简", "休闲"], colors: ["灰色"], materials: ["羊毛混纺"], fitType: "修身" },
  { name: "衬衫连衣裙", brandIndex: 5, categorySlug: "dress", price: 990, originalPrice: 1290, gender: "female", seasons: ["spring", "summer"], occasions: ["work", "date"], styleTags: ["极简", "法式"], colors: ["白色"], materials: ["棉"], fitType: "收腰" },
  { name: "吊带真丝连衣裙", brandIndex: 5, categorySlug: "dress", price: 1490, originalPrice: 1890, gender: "female", seasons: ["summer"], occasions: ["date", "party"], styleTags: ["法式"], colors: ["香槟色"], materials: ["丝"], fitType: "修身" },
  { name: "印花雪纺连衣裙", brandIndex: 8, categorySlug: "dress", price: 890, originalPrice: 1090, gender: "female", seasons: ["spring", "summer"], occasions: ["date", "casual"], styleTags: ["法式", "复古"], colors: ["印花"], materials: ["雪纺"], fitType: "A字" },
  { name: "A字棉质连衣裙", brandIndex: 9, categorySlug: "dress", price: 249, originalPrice: 299, gender: "female", seasons: ["spring", "summer"], occasions: ["casual"], styleTags: ["日系", "极简"], colors: ["浅蓝"], materials: ["棉"], fitType: "A字" },
  { name: "宽松T恤连衣裙", brandIndex: 2, categorySlug: "dress", price: 149, originalPrice: 199, gender: "female", seasons: ["summer"], occasions: ["casual"], styleTags: ["休闲", "极简"], colors: ["白色"], materials: ["棉"], fitType: "宽松" },
  { name: "牛仔连衣裙", brandIndex: 1, categorySlug: "dress", price: 349, originalPrice: 449, gender: "female", seasons: ["spring", "summer"], occasions: ["casual", "date"], styleTags: ["休闲", "街头"], colors: ["浅蓝"], materials: ["牛仔"], fitType: "收腰" },
  { name: "格纹西装连衣裙", brandIndex: 6, categorySlug: "dress", price: 499, originalPrice: 599, gender: "female", seasons: ["spring", "autumn"], occasions: ["work", "date"], styleTags: ["商务", "国潮"], colors: ["格纹"], materials: ["聚酯纤维"], fitType: "修身" },
  { name: "Oversize卫衣连衣裙", brandIndex: 6, categorySlug: "dress", price: 399, originalPrice: 499, gender: "female", seasons: ["spring", "autumn"], occasions: ["casual", "date"], styleTags: ["街头", "国潮"], colors: ["灰色"], materials: ["棉"], fitType: "宽松" },
  { name: "Polo连衣裙", brandIndex: 7, categorySlug: "dress", price: 499, originalPrice: 599, gender: "female", seasons: ["spring", "summer"], occasions: ["casual", "sport"], styleTags: ["运动休闲"], colors: ["黑色"], materials: ["棉混纺"], fitType: "修身" },
  { name: "运动连衣裙", brandIndex: 3, categorySlug: "dress", price: 599, originalPrice: 699, gender: "female", seasons: ["spring", "summer"], occasions: ["sport", "casual"], styleTags: ["运动休闲"], colors: ["黑色"], materials: ["聚酯纤维"], fitType: "修身" },
  { name: "羊毛混纺西装", brandIndex: 0, categorySlug: "outerwear", price: 1599, originalPrice: 1999, gender: "male", seasons: ["spring", "autumn", "winter"], occasions: ["work", "formal"], styleTags: ["商务"], colors: ["深蓝"], materials: ["羊毛混纺"], fitType: "修身" },
  { name: "羊绒V领毛衣", brandIndex: 8, categorySlug: "top", price: 890, originalPrice: 1090, gender: "male", seasons: ["autumn", "winter"], occasions: ["work", "casual"], styleTags: ["商务休闲", "法式"], colors: ["驼色"], materials: ["羊绒"], fitType: "修身" },
  { name: "修身棉质衬衫", brandIndex: 8, categorySlug: "top", price: 590, originalPrice: 790, gender: "male", seasons: ["spring", "summer", "autumn"], occasions: ["work", "date"], styleTags: ["商务", "法式"], colors: ["白色"], materials: ["棉"], fitType: "修身" },
  { name: "针织背心", brandIndex: 1, categorySlug: "top", price: 199, originalPrice: 249, gender: "female", seasons: ["spring", "autumn"], occasions: ["casual", "work"], styleTags: ["休闲", "日系"], colors: ["米色"], materials: ["羊毛混纺"], fitType: "常规" },
  { name: "泡泡袖上衣", brandIndex: 1, categorySlug: "top", price: 249, originalPrice: 329, gender: "female", seasons: ["spring", "summer"], occasions: ["date", "party"], styleTags: ["法式", "复古"], colors: ["粉色"], materials: ["聚酯纤维"], fitType: "收腰" },
  { name: "吊带背心", brandIndex: 1, categorySlug: "top", price: 129, originalPrice: 169, gender: "female", seasons: ["summer"], occasions: ["casual", "date"], styleTags: ["休闲", "法式"], colors: ["白色"], materials: ["棉"], fitType: "修身" },
  { name: "格纹休闲裤", brandIndex: 1, categorySlug: "bottom", price: 299, originalPrice: 399, gender: "male", seasons: ["spring", "autumn"], occasions: ["casual", "work"], styleTags: ["商务休闲", "复古"], colors: ["灰色格纹"], materials: ["棉混纺"], fitType: "修身" },
  { name: "牛仔短裤", brandIndex: 1, categorySlug: "bottom", price: 199, originalPrice: 249, gender: "female", seasons: ["summer"], occasions: ["casual", "date"], styleTags: ["休闲", "街头"], colors: ["浅蓝"], materials: ["牛仔"], fitType: "短裤" },
  { name: "皮裤", brandIndex: 1, categorySlug: "bottom", price: 499, originalPrice: 599, gender: "female", seasons: ["autumn", "winter"], occasions: ["date", "party"], styleTags: ["街头", "法式"], colors: ["黑色"], materials: ["皮革"], fitType: "修身" },
  { name: "短款皮夹克", brandIndex: 1, categorySlug: "outerwear", price: 799, originalPrice: 999, gender: "female", seasons: ["spring", "autumn"], occasions: ["casual", "date"], styleTags: ["街头", "法式"], colors: ["黑色"], materials: ["皮革"], fitType: "短款" },
  { name: "长款羽绒服", brandIndex: 1, categorySlug: "outerwear", price: 999, originalPrice: 1299, gender: "male", seasons: ["winter"], occasions: ["casual"], styleTags: ["休闲"], colors: ["黑色"], materials: ["尼龙", "鹅绒"], fitType: "常规" },
  { name: "运动背心", brandIndex: 3, categorySlug: "top", price: 299, originalPrice: 349, gender: "male", seasons: ["spring", "summer"], occasions: ["sport"], styleTags: ["运动休闲"], colors: ["黑色"], materials: ["聚酯纤维"], fitType: "修身" },
  { name: "Dri-FIT速干T恤", brandIndex: 3, categorySlug: "top", price: 349, originalPrice: 449, gender: "male", seasons: ["spring", "summer"], occasions: ["sport"], styleTags: ["运动休闲"], colors: ["深蓝"], materials: ["聚酯纤维"], fitType: "修身" },
  { name: "运动短裤", brandIndex: 3, categorySlug: "bottom", price: 349, originalPrice: 449, gender: "male", seasons: ["summer"], occasions: ["sport"], styleTags: ["运动休闲"], colors: ["黑色"], materials: ["聚酯纤维"], fitType: "短裤" },
  { name: "运动紧身裤", brandIndex: 3, categorySlug: "bottom", price: 499, originalPrice: 599, gender: "female", seasons: ["spring", "summer", "autumn", "winter"], occasions: ["sport"], styleTags: ["运动休闲"], colors: ["黑色"], materials: ["聚酯纤维"], fitType: "紧身" },
  { name: "React跑鞋", brandIndex: 3, categorySlug: "shoes", price: 899, originalPrice: 1099, gender: "female", seasons: ["spring", "summer", "autumn"], occasions: ["sport", "casual"], styleTags: ["运动休闲"], colors: ["白色"], materials: ["网布"], fitType: "常规" },
  { name: "运动腰包", brandIndex: 3, categorySlug: "bag", price: 299, originalPrice: 349, gender: "male", seasons: ["spring", "summer", "autumn"], occasions: ["sport", "casual"], styleTags: ["运动休闲"], colors: ["黑色"], materials: ["尼龙"], fitType: "迷你" },
  { name: "GG腰带", brandIndex: 4, categorySlug: "accessory", price: 3200, originalPrice: 3200, gender: "female", seasons: ["spring", "summer", "autumn", "winter"], occasions: ["date", "formal"], styleTags: ["法式", "商务"], colors: ["黑色"], materials: ["皮革"], fitType: "常规" },
  { name: "竹节手柄包", brandIndex: 4, categorySlug: "bag", price: 22000, originalPrice: 22000, gender: "female", seasons: ["spring", "summer", "autumn", "winter"], occasions: ["formal", "party"], styleTags: ["法式"], colors: ["棕色"], materials: ["皮革"], fitType: "中号" },
  { name: "Ophidia链条包", brandIndex: 4, categorySlug: "bag", price: 9800, originalPrice: 9800, gender: "female", seasons: ["spring", "summer", "autumn", "winter"], occasions: ["date", "casual"], styleTags: ["复古", "法式"], colors: ["米色"], materials: ["帆布", "皮革"], fitType: "小号" },
  { name: "GG跑步鞋", brandIndex: 4, categorySlug: "shoes", price: 6500, originalPrice: 6500, gender: "female", seasons: ["spring", "summer", "autumn"], occasions: ["casual", "date"], styleTags: ["街头"], colors: ["米白"], materials: ["皮革", "网布"], fitType: "常规" },
  { name: "真丝领带", brandIndex: 4, categorySlug: "accessory", price: 2800, originalPrice: 2800, gender: "male", seasons: ["spring", "summer", "autumn", "winter"], occasions: ["formal", "work"], styleTags: ["商务"], colors: ["深蓝"], materials: ["丝"], fitType: "常规" },
  { name: "格纹围巾", brandIndex: 5, categorySlug: "accessory", price: 490, originalPrice: 590, gender: "female", seasons: ["autumn", "winter"], occasions: ["casual", "work"], styleTags: ["极简", "法式"], colors: ["格纹"], materials: ["羊毛"], fitType: "常规" },
  { name: "几何耳环", brandIndex: 5, categorySlug: "accessory", price: 390, originalPrice: 490, gender: "female", seasons: ["spring", "summer", "autumn", "winter"], occasions: ["work", "date"], styleTags: ["极简"], colors: ["金色"], materials: ["金属"], fitType: "常规" },
  { name: "皮质手套", brandIndex: 5, categorySlug: "accessory", price: 590, originalPrice: 790, gender: "female", seasons: ["winter"], occasions: ["casual", "work"], styleTags: ["极简", "法式"], colors: ["黑色"], materials: ["皮革"], fitType: "常规" },
  { name: "羊毛围巾", brandIndex: 9, categorySlug: "accessory", price: 199, originalPrice: 249, gender: "male", seasons: ["autumn", "winter"], occasions: ["casual"], styleTags: ["日系", "极简"], colors: ["灰色"], materials: ["羊毛"], fitType: "常规" },
  { name: "帆布腰带", brandIndex: 9, categorySlug: "accessory", price: 99, originalPrice: 129, gender: "male", seasons: ["spring", "summer", "autumn"], occasions: ["casual"], styleTags: ["日系", "休闲"], colors: ["卡其"], materials: ["帆布"], fitType: "常规" },
  { name: "编织手绳", brandIndex: 9, categorySlug: "accessory", price: 79, originalPrice: 99, gender: "female", seasons: ["spring", "summer"], occasions: ["casual"], styleTags: ["日系", "休闲"], colors: ["米色"], materials: ["棉绳"], fitType: "常规" },
  { name: "复古墨镜", brandIndex: 0, categorySlug: "accessory", price: 399, originalPrice: 499, gender: "female", seasons: ["spring", "summer"], occasions: ["casual", "date"], styleTags: ["法式", "复古"], colors: ["黑色"], materials: ["金属", "树脂"], fitType: "常规" },
  { name: "运动墨镜", brandIndex: 3, categorySlug: "accessory", price: 1299, originalPrice: 1499, gender: "male", seasons: ["spring", "summer"], occasions: ["sport", "casual"], styleTags: ["运动休闲"], colors: ["黑色"], materials: ["聚碳酸酯"], fitType: "常规" },
  { name: "手提公文包", brandIndex: 8, categorySlug: "bag", price: 1590, originalPrice: 1990, gender: "male", seasons: ["spring", "summer", "autumn", "winter"], occasions: ["work", "formal"], styleTags: ["商务"], colors: ["深棕"], materials: ["皮革"], fitType: "常规" },
  { name: "休闲斜挎包", brandIndex: 8, categorySlug: "bag", price: 790, originalPrice: 990, gender: "male", seasons: ["spring", "summer", "autumn"], occasions: ["casual"], styleTags: ["商务休闲"], colors: ["深蓝"], materials: ["帆布", "皮革"], fitType: "常规" },
  { name: "丝质口袋巾", brandIndex: 8, categorySlug: "accessory", price: 290, originalPrice: 390, gender: "male", seasons: ["spring", "autumn", "winter"], occasions: ["formal", "work"], styleTags: ["商务"], colors: ["酒红"], materials: ["丝"], fitType: "常规" },
  { name: "皮质手环", brandIndex: 8, categorySlug: "accessory", price: 390, originalPrice: 490, gender: "male", seasons: ["spring", "summer", "autumn"], occasions: ["casual"], styleTags: ["商务休闲"], colors: ["棕色"], materials: ["皮革"], fitType: "常规" },
  { name: "国潮帆布包", brandIndex: 6, categorySlug: "bag", price: 199, originalPrice: 259, gender: "female", seasons: ["spring", "summer", "autumn"], occasions: ["casual"], styleTags: ["国潮", "街头"], colors: ["米白印花"], materials: ["帆布"], fitType: "常规" },
  { name: "国潮腰包", brandIndex: 6, categorySlug: "bag", price: 259, originalPrice: 329, gender: "male", seasons: ["spring", "summer", "autumn"], occasions: ["casual", "sport"], styleTags: ["国潮", "街头"], colors: ["黑色"], materials: ["尼龙"], fitType: "迷你" },
  { name: "国潮项链", brandIndex: 6, categorySlug: "accessory", price: 159, originalPrice: 199, gender: "male", seasons: ["spring", "summer", "autumn", "winter"], occasions: ["casual", "date"], styleTags: ["国潮", "街头"], colors: ["银色"], materials: ["金属"], fitType: "常规" },
  { name: "国潮手链", brandIndex: 6, categorySlug: "accessory", price: 129, originalPrice: 159, gender: "female", seasons: ["spring", "summer", "autumn", "winter"], occasions: ["casual"], styleTags: ["国潮", "街头"], colors: ["金色"], materials: ["金属"], fitType: "常规" },
  { name: "新中式立领衬衫", brandIndex: 6, categorySlug: "top", price: 399, originalPrice: 499, gender: "male", seasons: ["spring", "autumn"], occasions: ["date", "casual"], styleTags: ["新中式", "国潮"], colors: ["白色"], materials: ["棉"], fitType: "修身" },
  { name: "新中式盘扣上衣", brandIndex: 6, categorySlug: "top", price: 459, originalPrice: 599, gender: "female", seasons: ["spring", "autumn"], occasions: ["date", "casual"], styleTags: ["新中式", "国潮"], colors: ["墨绿"], materials: ["棉混纺"], fitType: "修身" },
  { name: "新中式阔腿裤", brandIndex: 6, categorySlug: "bottom", price: 349, originalPrice: 449, gender: "female", seasons: ["spring", "summer", "autumn"], occasions: ["date", "casual"], styleTags: ["新中式", "国潮"], colors: ["黑色"], materials: ["棉混纺"], fitType: "高腰阔腿" },
  { name: "新中式改良旗袍", brandIndex: 6, categorySlug: "dress", price: 599, originalPrice: 799, gender: "female", seasons: ["spring", "autumn"], occasions: ["date", "party"], styleTags: ["新中式", "国潮"], colors: ["酒红"], materials: ["丝混纺"], fitType: "修身" },
  { name: "新中式外套", brandIndex: 6, categorySlug: "outerwear", price: 699, originalPrice: 899, gender: "female", seasons: ["spring", "autumn"], occasions: ["date", "casual"], styleTags: ["新中式", "国潮"], colors: ["藏蓝"], materials: ["棉混纺"], fitType: "常规" },
  { name: "复古灯芯绒外套", brandIndex: 1, categorySlug: "outerwear", price: 599, originalPrice: 799, gender: "male", seasons: ["autumn", "winter"], occasions: ["casual"], styleTags: ["复古", "休闲"], colors: ["棕色"], materials: ["灯芯绒"], fitType: "常规" },
  { name: "复古格纹大衣", brandIndex: 1, categorySlug: "outerwear", price: 899, originalPrice: 1199, gender: "female", seasons: ["autumn", "winter"], occasions: ["casual", "date"], styleTags: ["复古", "法式"], colors: ["格纹"], materials: ["羊毛混纺"], fitType: "常规" },
  { name: "复古波点连衣裙", brandIndex: 1, categorySlug: "dress", price: 349, originalPrice: 449, gender: "female", seasons: ["spring", "summer"], occasions: ["date", "party"], styleTags: ["复古", "法式"], colors: ["黑白波点"], materials: ["聚酯纤维"], fitType: "收腰" },
  { name: "韩系宽松卫衣", brandIndex: 1, categorySlug: "top", price: 249, originalPrice: 329, gender: "female", seasons: ["spring", "autumn"], occasions: ["casual", "date"], styleTags: ["韩系", "休闲"], colors: ["奶油白"], materials: ["棉"], fitType: "宽松" },
  { name: "韩系百褶裙", brandIndex: 1, categorySlug: "bottom", price: 249, originalPrice: 329, gender: "female", seasons: ["spring", "summer", "autumn"], occasions: ["date", "casual"], styleTags: ["韩系", "休闲"], colors: ["灰色"], materials: ["聚酯纤维"], fitType: "高腰" },
  { name: "韩系短款开衫", brandIndex: 1, categorySlug: "top", price: 279, originalPrice: 349, gender: "female", seasons: ["spring", "summer"], occasions: ["date", "casual"], styleTags: ["韩系", "法式"], colors: ["淡粉"], materials: ["羊毛混纺"], fitType: "短款" },
  { name: "韩系高腰牛仔裤", brandIndex: 1, categorySlug: "bottom", price: 299, originalPrice: 399, gender: "female", seasons: ["spring", "summer", "autumn", "winter"], occasions: ["casual", "date"], styleTags: ["韩系", "休闲"], colors: ["深蓝"], materials: ["牛仔"], fitType: "高腰修身" },
  { name: "韩系长款风衣", brandIndex: 1, categorySlug: "outerwear", price: 699, originalPrice: 899, gender: "female", seasons: ["spring", "autumn"], occasions: ["work", "date"], styleTags: ["韩系", "法式"], colors: ["卡其"], materials: ["棉混纺"], fitType: "常规" },
  { name: "日系工装裤", brandIndex: 9, categorySlug: "bottom", price: 199, originalPrice: 249, gender: "male", seasons: ["spring", "summer", "autumn"], occasions: ["casual"], styleTags: ["日系", "街头"], colors: ["军绿"], materials: ["棉"], fitType: "宽松" },
  { name: "日系牛仔外套", brandIndex: 9, categorySlug: "outerwear", price: 249, originalPrice: 299, gender: "male", seasons: ["spring", "autumn"], occasions: ["casual"], styleTags: ["日系", "休闲"], colors: ["浅蓝"], materials: ["牛仔"], fitType: "常规" },
  { name: "日系格纹裙", brandIndex: 9, categorySlug: "bottom", price: 179, originalPrice: 229, gender: "female", seasons: ["spring", "autumn"], occasions: ["casual", "date"], styleTags: ["日系", "复古"], colors: ["格纹"], materials: ["棉混纺"], fitType: "高腰" },
  { name: "日系帆布鞋", brandIndex: 9, categorySlug: "shoes", price: 149, originalPrice: 199, gender: "female", seasons: ["spring", "summer", "autumn"], occasions: ["casual"], styleTags: ["日系", "休闲"], colors: ["白色"], materials: ["帆布"], fitType: "低帮" },
  { name: "日系托特包", brandIndex: 9, categorySlug: "bag", price: 199, originalPrice: 249, gender: "female", seasons: ["spring", "summer", "autumn"], occasions: ["casual", "work"], styleTags: ["日系", "极简"], colors: ["灰白"], materials: ["帆布"], fitType: "常规" },
  { name: "商务西装三件套", brandIndex: 8, categorySlug: "outerwear", price: 2990, originalPrice: 3590, gender: "male", seasons: ["spring", "autumn", "winter"], occasions: ["formal", "work"], styleTags: ["商务"], colors: ["深灰"], materials: ["羊毛混纺"], fitType: "修身" },
  { name: "商务领带夹套装", brandIndex: 8, categorySlug: "accessory", price: 490, originalPrice: 590, gender: "male", seasons: ["spring", "summer", "autumn", "winter"], occasions: ["formal", "work"], styleTags: ["商务"], colors: ["银色"], materials: ["金属"], fitType: "常规" },
  { name: "商务牛津鞋", brandIndex: 8, categorySlug: "shoes", price: 1590, originalPrice: 1890, gender: "male", seasons: ["spring", "autumn", "winter"], occasions: ["formal", "work"], styleTags: ["商务"], colors: ["黑色"], materials: ["皮革"], fitType: "圆头" },
  { name: "商务棉质衬衫", brandIndex: 8, categorySlug: "top", price: 690, originalPrice: 890, gender: "male", seasons: ["spring", "summer", "autumn", "winter"], occasions: ["work", "formal"], styleTags: ["商务"], colors: ["浅蓝"], materials: ["棉"], fitType: "修身" },
  { name: "商务羊毛西裤", brandIndex: 8, categorySlug: "bottom", price: 990, originalPrice: 1290, gender: "male", seasons: ["spring", "autumn", "winter"], occasions: ["work", "formal"], styleTags: ["商务"], colors: ["深灰"], materials: ["羊毛混纺"], fitType: "修身" },
  { name: "商务马甲", brandIndex: 8, categorySlug: "top", price: 790, originalPrice: 990, gender: "male", seasons: ["spring", "autumn", "winter"], occasions: ["work", "formal"], styleTags: ["商务"], colors: ["深蓝"], materials: ["羊毛混纺"], fitType: "修身" },
  { name: "商务大衣", brandIndex: 8, categorySlug: "outerwear", price: 2490, originalPrice: 2990, gender: "male", seasons: ["autumn", "winter"], occasions: ["work", "formal"], styleTags: ["商务"], colors: ["驼色"], materials: ["羊毛"], fitType: "修身" },
  { name: "街头oversize卫衣", brandIndex: 7, categorySlug: "top", price: 599, originalPrice: 699, gender: "male", seasons: ["spring", "autumn"], occasions: ["casual", "date"], styleTags: ["街头", "运动休闲"], colors: ["黑色"], materials: ["棉"], fitType: "宽松" },
  { name: "街头束脚运动裤", brandIndex: 7, categorySlug: "bottom", price: 499, originalPrice: 599, gender: "male", seasons: ["spring", "autumn"], occasions: ["casual", "sport"], styleTags: ["街头", "运动休闲"], colors: ["灰色"], materials: ["棉混纺"], fitType: "宽松" },
  { name: "街头棒球服", brandIndex: 7, categorySlug: "outerwear", price: 799, originalPrice: 999, gender: "male", seasons: ["spring", "autumn"], occasions: ["casual", "date"], styleTags: ["街头", "复古"], colors: ["红黑"], materials: ["羊毛混纺", "皮革"], fitType: "常规" },
  { name: "街头帆布鞋", brandIndex: 7, categorySlug: "shoes", price: 599, originalPrice: 699, gender: "male", seasons: ["spring", "summer", "autumn"], occasions: ["casual"], styleTags: ["街头", "休闲"], colors: ["黑白"], materials: ["帆布"], fitType: "低帮" },
  { name: "街头腰包", brandIndex: 7, categorySlug: "bag", price: 399, originalPrice: 499, gender: "male", seasons: ["spring", "summer", "autumn"], occasions: ["casual", "sport"], styleTags: ["街头", "运动休闲"], colors: ["黑色"], materials: ["尼龙"], fitType: "迷你" },
  { name: "街头渔夫帽", brandIndex: 7, categorySlug: "hat", price: 249, originalPrice: 299, gender: "female", seasons: ["spring", "summer"], occasions: ["casual"], styleTags: ["街头", "休闲"], colors: ["黑色"], materials: ["棉"], fitType: "常规" },
  { name: "街头链条项链", brandIndex: 7, categorySlug: "accessory", price: 299, originalPrice: 349, gender: "male", seasons: ["spring", "summer", "autumn", "winter"], occasions: ["casual"], styleTags: ["街头"], colors: ["银色"], materials: ["金属"], fitType: "常规" },
  { name: "极简羊绒围巾", brandIndex: 5, categorySlug: "accessory", price: 690, originalPrice: 890, gender: "female", seasons: ["autumn", "winter"], occasions: ["work", "casual"], styleTags: ["极简", "法式"], colors: ["驼色"], materials: ["羊绒"], fitType: "常规" },
  { name: "极简手提包", brandIndex: 5, categorySlug: "bag", price: 1090, originalPrice: 1390, gender: "female", seasons: ["spring", "summer", "autumn", "winter"], occasions: ["work", "date"], styleTags: ["极简", "商务"], colors: ["黑色"], materials: ["皮革"], fitType: "中号" },
  { name: "极简穆勒鞋", brandIndex: 5, categorySlug: "shoes", price: 990, originalPrice: 1290, gender: "female", seasons: ["spring", "summer", "autumn"], occasions: ["work", "date"], styleTags: ["极简", "法式"], colors: ["裸色"], materials: ["皮革"], fitType: "方头" },
  { name: "极简羊毛西裤", brandIndex: 5, categorySlug: "bottom", price: 890, originalPrice: 1090, gender: "female", seasons: ["spring", "autumn", "winter"], occasions: ["work"], styleTags: ["极简", "商务"], colors: ["黑色"], materials: ["羊毛混纺"], fitType: "高腰直筒" },
  { name: "极简丝质吊带", brandIndex: 5, categorySlug: "top", price: 590, originalPrice: 790, gender: "female", seasons: ["summer"], occasions: ["date", "party"], styleTags: ["极简", "法式"], colors: ["香槟色"], materials: ["丝"], fitType: "修身" },
  { name: "极简针织开衫", brandIndex: 5, categorySlug: "top", price: 790, originalPrice: 990, gender: "female", seasons: ["spring", "autumn"], occasions: ["work", "casual"], styleTags: ["极简", "法式"], colors: ["米白"], materials: ["羊毛"], fitType: "常规" },
  { name: "运动内衣", brandIndex: 3, categorySlug: "top", price: 349, originalPrice: 399, gender: "female", seasons: ["spring", "summer", "autumn"], occasions: ["sport"], styleTags: ["运动休闲"], colors: ["黑色"], materials: ["聚酯纤维"], fitType: "紧身" },
  { name: "运动防风裤", brandIndex: 3, categorySlug: "bottom", price: 499, originalPrice: 599, gender: "female", seasons: ["spring", "autumn"], occasions: ["sport"], styleTags: ["运动休闲"], colors: ["黑色"], materials: ["聚酯纤维"], fitType: "修身" },
  { name: "运动连帽外套", brandIndex: 7, categorySlug: "outerwear", price: 699, originalPrice: 899, gender: "female", seasons: ["spring", "autumn"], occasions: ["sport", "casual"], styleTags: ["运动休闲"], colors: ["深灰"], materials: ["聚酯纤维"], fitType: "常规" },
  { name: "运动双肩包", brandIndex: 7, categorySlug: "bag", price: 499, originalPrice: 599, gender: "male", seasons: ["spring", "summer", "autumn"], occasions: ["sport", "casual"], styleTags: ["运动休闲"], colors: ["黑色"], materials: ["尼龙"], fitType: "常规" },
  { name: "运动头带", brandIndex: 3, categorySlug: "accessory", price: 99, originalPrice: 129, gender: "male", seasons: ["spring", "summer"], occasions: ["sport"], styleTags: ["运动休闲"], colors: ["黑色"], materials: ["棉"], fitType: "常规" },
  { name: "运动水壶", brandIndex: 3, categorySlug: "accessory", price: 199, originalPrice: 249, gender: "male", seasons: ["spring", "summer", "autumn"], occasions: ["sport"], styleTags: ["运动休闲"], colors: ["黑色"], materials: ["不锈钢"], fitType: "常规" },
  { name: "运动帽", brandIndex: 7, categorySlug: "hat", price: 199, originalPrice: 249, gender: "female", seasons: ["spring", "summer"], occasions: ["sport", "casual"], styleTags: ["运动休闲"], colors: ["白色"], materials: ["棉"], fitType: "可调节" },
  { name: "休闲帆布鞋", brandIndex: 2, categorySlug: "shoes", price: 149, originalPrice: 199, gender: "male", seasons: ["spring", "summer", "autumn"], occasions: ["casual"], styleTags: ["休闲", "日系"], colors: ["白色"], materials: ["帆布"], fitType: "低帮" },
  { name: "休闲格子衬衫", brandIndex: 2, categorySlug: "top", price: 149, originalPrice: 199, gender: "male", seasons: ["spring", "autumn"], occasions: ["casual"], styleTags: ["休闲", "日系"], colors: ["蓝白格"], materials: ["棉"], fitType: "常规" },
  { name: "休闲短裤", brandIndex: 2, categorySlug: "bottom", price: 129, originalPrice: 169, gender: "male", seasons: ["summer"], occasions: ["casual"], styleTags: ["休闲", "极简"], colors: ["卡其"], materials: ["棉"], fitType: "常规" },
  { name: "休闲连帽卫衣", brandIndex: 2, categorySlug: "top", price: 199, originalPrice: 249, gender: "male", seasons: ["spring", "autumn"], occasions: ["casual"], styleTags: ["休闲", "极简"], colors: ["灰色"], materials: ["棉"], fitType: "常规" },
  { name: "休闲运动鞋", brandIndex: 2, categorySlug: "shoes", price: 299, originalPrice: 399, gender: "female", seasons: ["spring", "summer", "autumn"], occasions: ["casual", "sport"], styleTags: ["休闲", "运动休闲"], colors: ["白色"], materials: ["网布"], fitType: "常规" },
  { name: "休闲斜挎包", brandIndex: 2, categorySlug: "bag", price: 199, originalPrice: 249, gender: "female", seasons: ["spring", "summer", "autumn"], occasions: ["casual"], styleTags: ["休闲", "极简"], colors: ["深蓝"], materials: ["尼龙"], fitType: "迷你" },
  { name: "休闲针织开衫", brandIndex: 2, categorySlug: "top", price: 199, originalPrice: 249, gender: "female", seasons: ["spring", "autumn"], occasions: ["casual", "work"], styleTags: ["休闲", "日系"], colors: ["米色"], materials: ["棉混纺"], fitType: "常规" },
  { name: "休闲牛仔衬衫", brandIndex: 2, categorySlug: "top", price: 199, originalPrice: 249, gender: "male", seasons: ["spring", "autumn"], occasions: ["casual"], styleTags: ["休闲", "街头"], colors: ["浅蓝"], materials: ["牛仔"], fitType: "常规" },
  { name: "休闲马甲", brandIndex: 2, categorySlug: "top", price: 149, originalPrice: 199, gender: "male", seasons: ["spring", "autumn"], occasions: ["casual"], styleTags: ["休闲", "日系"], colors: ["深灰"], materials: ["棉混纺"], fitType: "常规" },
  { name: "休闲棉质长裤", brandIndex: 2, categorySlug: "bottom", price: 179, originalPrice: 229, gender: "male", seasons: ["spring", "summer", "autumn"], occasions: ["casual"], styleTags: ["休闲", "极简"], colors: ["深灰"], materials: ["棉"], fitType: "常规" },
  { name: "休闲草编包", brandIndex: 9, categorySlug: "bag", price: 249, originalPrice: 299, gender: "female", seasons: ["summer"], occasions: ["casual", "date"], styleTags: ["日系", "休闲"], colors: ["米色"], materials: ["草编"], fitType: "常规" },
  { name: "休闲凉鞋", brandIndex: 2, categorySlug: "shoes", price: 149, originalPrice: 199, gender: "female", seasons: ["summer"], occasions: ["casual"], styleTags: ["休闲", "日系"], colors: ["白色"], materials: ["皮革"], fitType: "常规" },
  { name: "休闲拖鞋", brandIndex: 2, categorySlug: "shoes", price: 99, originalPrice: 129, gender: "male", seasons: ["summer"], occasions: ["casual"], styleTags: ["休闲"], colors: ["灰色"], materials: ["EVA"], fitType: "常规" },
  { name: "派对亮片连衣裙", brandIndex: 0, categorySlug: "dress", price: 899, originalPrice: 1199, gender: "female", seasons: ["autumn", "winter"], occasions: ["party", "date"], styleTags: ["法式", "复古"], colors: ["金色"], materials: ["聚酯纤维"], fitType: "修身" },
  { name: "派对丝绒连衣裙", brandIndex: 0, categorySlug: "dress", price: 799, originalPrice: 999, gender: "female", seasons: ["autumn", "winter"], occasions: ["party", "date"], styleTags: ["复古", "法式"], colors: ["酒红"], materials: ["丝绒"], fitType: "修身" },
  { name: "派对高跟鞋", brandIndex: 0, categorySlug: "shoes", price: 699, originalPrice: 899, gender: "female", seasons: ["spring", "summer", "autumn", "winter"], occasions: ["party", "formal"], styleTags: ["法式"], colors: ["金色"], materials: ["皮革"], fitType: "尖头" },
  { name: "派对手拿包", brandIndex: 5, categorySlug: "bag", price: 690, originalPrice: 890, gender: "female", seasons: ["spring", "summer", "autumn", "winter"], occasions: ["party", "formal"], styleTags: ["极简", "法式"], colors: ["黑色"], materials: ["皮革"], fitType: "迷你" },
  { name: "派对耳环", brandIndex: 0, categorySlug: "accessory", price: 199, originalPrice: 259, gender: "female", seasons: ["spring", "summer", "autumn", "winter"], occasions: ["party", "date"], styleTags: ["法式", "复古"], colors: ["金色"], materials: ["金属"], fitType: "常规" },
  { name: "面试修身西装", brandIndex: 0, categorySlug: "outerwear", price: 999, originalPrice: 1299, gender: "female", seasons: ["spring", "autumn", "winter"], occasions: ["work", "formal"], styleTags: ["商务", "极简"], colors: ["深蓝"], materials: ["羊毛混纺"], fitType: "修身" },
  { name: "面试铅笔裙", brandIndex: 0, categorySlug: "bottom", price: 399, originalPrice: 499, gender: "female", seasons: ["spring", "autumn", "winter"], occasions: ["work", "formal"], styleTags: ["商务"], colors: ["黑色"], materials: ["羊毛混纺"], fitType: "修身" },
  { name: "面试平底鞋", brandIndex: 5, categorySlug: "shoes", price: 890, originalPrice: 1090, gender: "female", seasons: ["spring", "summer", "autumn"], occasions: ["work", "formal"], styleTags: ["极简", "商务"], colors: ["黑色"], materials: ["皮革"], fitType: "尖头" },
  { name: "面试公文包", brandIndex: 8, categorySlug: "bag", price: 1290, originalPrice: 1590, gender: "female", seasons: ["spring", "summer", "autumn", "winter"], occasions: ["work", "formal"], styleTags: ["商务"], colors: ["黑色"], materials: ["皮革"], fitType: "常规" },
  { name: "旅行风衣", brandIndex: 0, categorySlug: "outerwear", price: 799, originalPrice: 999, gender: "female", seasons: ["spring", "autumn"], occasions: ["casual"], styleTags: ["法式", "休闲"], colors: ["卡其"], materials: ["棉混纺"], fitType: "常规" },
  { name: "旅行双肩包", brandIndex: 2, categorySlug: "bag", price: 299, originalPrice: 399, gender: "female", seasons: ["spring", "summer", "autumn"], occasions: ["casual"], styleTags: ["休闲", "极简"], colors: ["灰色"], materials: ["尼龙"], fitType: "常规" },
  { name: "旅行运动鞋", brandIndex: 3, categorySlug: "shoes", price: 899, originalPrice: 1099, gender: "female", seasons: ["spring", "summer", "autumn"], occasions: ["casual", "sport"], styleTags: ["运动休闲"], colors: ["白色"], materials: ["网布"], fitType: "常规" },
  { name: "旅行防晒帽", brandIndex: 9, categorySlug: "hat", price: 129, originalPrice: 169, gender: "female", seasons: ["summer"], occasions: ["casual"], styleTags: ["日系", "休闲"], colors: ["米色"], materials: ["草编"], fitType: "宽檐" },
  { name: "居家睡衣套装", brandIndex: 2, categorySlug: "top", price: 199, originalPrice: 249, gender: "female", seasons: ["spring", "summer", "autumn", "winter"], occasions: ["casual"], styleTags: ["休闲", "日系"], colors: ["浅灰"], materials: ["棉"], fitType: "宽松" },
  { name: "居家棉拖鞋", brandIndex: 2, categorySlug: "shoes", price: 79, originalPrice: 99, gender: "female", seasons: ["autumn", "winter"], occasions: ["casual"], styleTags: ["休闲"], colors: ["粉色"], materials: ["棉"], fitType: "常规" },
  { name: "居家家居裤", brandIndex: 9, categorySlug: "bottom", price: 149, originalPrice: 199, gender: "male", seasons: ["spring", "summer", "autumn", "winter"], occasions: ["casual"], styleTags: ["日系", "休闲"], colors: ["深灰"], materials: ["棉"], fitType: "宽松" },
  { name: "居家宽松T恤", brandIndex: 9, categorySlug: "top", price: 99, originalPrice: 129, gender: "male", seasons: ["spring", "summer", "autumn", "winter"], occasions: ["casual"], styleTags: ["日系", "休闲"], colors: ["白色"], materials: ["棉"], fitType: "宽松" },
  { name: "见家长针织衫", brandIndex: 0, categorySlug: "top", price: 399, originalPrice: 499, gender: "female", seasons: ["spring", "autumn"], occasions: ["date"], styleTags: ["法式", "极简"], colors: ["米白"], materials: ["羊毛混纺"], fitType: "常规" },
  { name: "见家长半裙", brandIndex: 0, categorySlug: "bottom", price: 359, originalPrice: 459, gender: "female", seasons: ["spring", "autumn"], occasions: ["date"], styleTags: ["法式", "极简"], colors: ["驼色"], materials: ["羊毛混纺"], fitType: "中腰" },
  { name: "见家长衬衫", brandIndex: 8, categorySlug: "top", price: 590, originalPrice: 790, gender: "male", seasons: ["spring", "autumn"], occasions: ["date"], styleTags: ["商务休闲"], colors: ["白色"], materials: ["棉"], fitType: "修身" },
  { name: "见家长休闲裤", brandIndex: 8, categorySlug: "bottom", price: 690, originalPrice: 890, gender: "male", seasons: ["spring", "autumn"], occasions: ["date"], styleTags: ["商务休闲"], colors: ["卡其"], materials: ["棉"], fitType: "修身" },
];

const STYLE_RULES = [
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
  { category: "style_mix", ruleType: "do", condition: { styleA: "极简", styleB: "法式" }, recommendation: "极简与法式混搭优雅高级，基础款+精致配饰", priority: 8 },
  { category: "style_mix", ruleType: "do", condition: { styleA: "街头", styleB: "运动休闲" }, recommendation: "街头与运动混搭活力十足，卫衣+运动裤+球鞋", priority: 8 },
  { category: "style_mix", ruleType: "do", condition: { styleA: "日系", styleB: "极简" }, recommendation: "日系与极简混搭干净舒适，棉麻材质+素色搭配", priority: 7 },
  { category: "style_mix", ruleType: "do", condition: { styleA: "国潮", styleB: "街头" }, recommendation: "国潮与街头混搭个性鲜明，刺绣元素+运动鞋", priority: 8 },
  { category: "style_mix", ruleType: "dont", condition: { styleA: "商务", styleB: "街头" }, recommendation: "商务与街头风格冲突较大，不建议直接混搭", priority: 7 },
  { category: "style_mix", ruleType: "tip", condition: { rule: "混搭原则" }, recommendation: "混搭时保持一个主风格，另一个作为点缀，避免五五开", priority: 9 },
  { category: "style_mix", ruleType: "tip", condition: { rule: "材质混搭" }, recommendation: "不同材质的混搭增加层次感，如丝质+牛仔、皮革+针织", priority: 8 },
];

const OUTFITS = [
  { name: "都市通勤精英", occasion: "work", season: "autumn", styleTags: ["极简", "商务"], items: [
    { slot: "top", nameKeyword: "高领羊绒毛衣" },
    { slot: "bottom", nameKeyword: "高腰阔腿裤" },
    { slot: "outer", nameKeyword: "羊毛混纺大衣" },
    { slot: "shoes", nameKeyword: "乐福鞋" },
    { slot: "bag", nameKeyword: "托特包" },
    { slot: "accessory", nameKeyword: "极简金属手表" },
  ]},
  { name: "浪漫约会之夜", occasion: "date", season: "spring", styleTags: ["法式", "复古"], items: [
    { slot: "dress", nameKeyword: "裹身连衣裙" },
    { slot: "shoes", nameKeyword: "尖头细跟高跟鞋" },
    { slot: "bag", nameKeyword: "斜挎链条包" },
    { slot: "accessory", nameKeyword: "珍珠耳环" },
    { slot: "accessory", nameKeyword: "丝巾" },
    { slot: "outer", nameKeyword: "风衣" },
  ]},
  { name: "周末休闲出街", occasion: "casual", season: "spring", styleTags: ["休闲", "街头"], items: [
    { slot: "top", nameKeyword: "基础款纯棉T恤" },
    { slot: "bottom", nameKeyword: "修身直筒牛仔裤" },
    { slot: "shoes", nameKeyword: "Air Force 1" },
    { slot: "bag", nameKeyword: "休闲斜挎包" },
    { slot: "hat", nameKeyword: "棒球帽" },
    { slot: "outer", nameKeyword: "飞行员夹克" },
  ]},
  { name: "活力运动风", occasion: "sport", season: "spring", styleTags: ["运动休闲"], items: [
    { slot: "top", nameKeyword: "Dri-FIT速干T恤" },
    { slot: "bottom", nameKeyword: "运动短裤" },
    { slot: "shoes", nameKeyword: "Air Max 270" },
    { slot: "bag", nameKeyword: "运动腰包" },
    { slot: "accessory", nameKeyword: "运动腕带" },
    { slot: "hat", nameKeyword: "运动帽" },
  ]},
  { name: "正式晚宴", occasion: "formal", season: "autumn", styleTags: ["法式", "商务"], items: [
    { slot: "dress", nameKeyword: "小黑裙" },
    { slot: "shoes", nameKeyword: "派对高跟鞋" },
    { slot: "bag", nameKeyword: "派对手拿包" },
    { slot: "accessory", nameKeyword: "珍珠耳环" },
    { slot: "accessory", nameKeyword: "金属链条项链" },
    { slot: "outer", nameKeyword: "双面穿羊绒大衣" },
  ]},
  { name: "韩系甜美约会", occasion: "date", season: "spring", styleTags: ["韩系", "休闲"], items: [
    { slot: "top", nameKeyword: "韩系宽松卫衣" },
    { slot: "bottom", nameKeyword: "韩系百褶裙" },
    { slot: "shoes", nameKeyword: "Stan Smith" },
    { slot: "bag", nameKeyword: "休闲斜挎包" },
    { slot: "accessory", nameKeyword: "金属链条项链" },
    { slot: "outer", nameKeyword: "韩系长款风衣" },
  ]},
  { name: "国潮街头范", occasion: "casual", season: "autumn", styleTags: ["国潮", "街头"], items: [
    { slot: "top", nameKeyword: "国潮刺绣卫衣" },
    { slot: "bottom", nameKeyword: "国潮印花运动裤" },
    { slot: "shoes", nameKeyword: "街头帆布鞋" },
    { slot: "bag", nameKeyword: "国潮腰包" },
    { slot: "accessory", nameKeyword: "国潮项链" },
    { slot: "hat", nameKeyword: "渔夫帽" },
  ]},
  { name: "日系文艺青年", occasion: "casual", season: "spring", styleTags: ["日系", "极简"], items: [
    { slot: "top", nameKeyword: "无领亚麻衬衫" },
    { slot: "bottom", nameKeyword: "日系工装裤" },
    { slot: "shoes", nameKeyword: "日系帆布鞋" },
    { slot: "bag", nameKeyword: "日系托特包" },
    { slot: "accessory", nameKeyword: "帆布腰带" },
    { slot: "hat", nameKeyword: "针织冷帽" },
  ]},
  { name: "商务男士正装", occasion: "formal", season: "autumn", styleTags: ["商务"], items: [
    { slot: "top", nameKeyword: "商务棉质衬衫" },
    { slot: "bottom", nameKeyword: "商务羊毛西裤" },
    { slot: "outer", nameKeyword: "商务西装三件套" },
    { slot: "shoes", nameKeyword: "商务牛津鞋" },
    { slot: "bag", nameKeyword: "手提公文包" },
    { slot: "accessory", nameKeyword: "丝质口袋巾" },
  ]},
  { name: "新中式雅致", occasion: "date", season: "autumn", styleTags: ["新中式", "国潮"], items: [
    { slot: "top", nameKeyword: "新中式盘扣上衣" },
    { slot: "bottom", nameKeyword: "新中式阔腿裤" },
    { slot: "shoes", nameKeyword: "厚底乐福鞋" },
    { slot: "bag", nameKeyword: "极简手提包" },
    { slot: "accessory", nameKeyword: "极简羊绒围巾" },
    { slot: "outer", nameKeyword: "新中式外套" },
  ]},
];

const AVATAR_TEMPLATES = [
  {
    name: "甜美女生", gender: "female",
    drawingConfig: { faceShape: "round", eyeStyle: "big_round", noseStyle: "small", mouthStyle: "smile", earStyle: "small" },
    parameters: { faceShape: { min: 0, max: 100, default: 60, label: "脸型圆度" }, eyeShape: { options: ["big_round", "almond", "cat_eye", "droopy"], default: "big_round", label: "眼型" }, skinTone: { options: ["#FDEBD0", "#F5CBA7", "#E0AC69", "#C68642", "#8D5524"], default: "#F5CBA7", label: "肤色" }, hairStyle: { options: [{ id: "long_straight", name: "长直发", thumbnailUrl: "https://cdn.aineed.com/avatar/hair/long_straight.png" }, { id: "long_wavy", name: "长卷发", thumbnailUrl: "https://cdn.aineed.com/avatar/hair/long_wavy.png" }, { id: "bob", name: "波波头", thumbnailUrl: "https://cdn.aineed.com/avatar/hair/bob.png" }, { id: "ponytail", name: "马尾", thumbnailUrl: "https://cdn.aineed.com/avatar/hair/ponytail.png" }], default: "long_straight" }, hairColor: { options: ["#1A1A2E", "#4A2C2A", "#8B4513", "#D4A574", "#C0392B"], default: "#1A1A2E", label: "发色" } },
    defaultClothingMap: { top: { color: "#FFFFFF", type: "tshirt" }, bottom: { color: "#1A1A2E", type: "jeans" }, shoes: { color: "#FFFFFF", type: "sneakers" } },
  },
  {
    name: "酷帅男生", gender: "male",
    drawingConfig: { faceShape: "angular", eyeStyle: "narrow", noseStyle: "strong", mouthStyle: "neutral", earStyle: "medium" },
    parameters: { faceShape: { min: 0, max: 100, default: 40, label: "脸型棱角" }, eyeShape: { options: ["narrow", "round", "sharp", "gentle"], default: "narrow", label: "眼型" }, skinTone: { options: ["#FDEBD0", "#F5CBA7", "#E0AC69", "#C68642", "#8D5524"], default: "#E0AC69", label: "肤色" }, hairStyle: { options: [{ id: "short_clean", name: "清爽短发", thumbnailUrl: "https://cdn.aineed.com/avatar/hair/short_clean.png" }, { id: "short_textured", name: "纹理短发", thumbnailUrl: "https://cdn.aineed.com/avatar/hair/short_textured.png" }, { id: "medium_swept", name: "侧分中发", thumbnailUrl: "https://cdn.aineed.com/avatar/hair/medium_swept.png" }, { id: "buzz", name: "寸头", thumbnailUrl: "https://cdn.aineed.com/avatar/hair/buzz.png" }], default: "short_clean" }, hairColor: { options: ["#1A1A2E", "#2C2C2C", "#4A2C2A", "#8B4513"], default: "#1A1A2E", label: "发色" } },
    defaultClothingMap: { top: { color: "#1A1A2E", type: "hoodie" }, bottom: { color: "#2C3E50", type: "pants" }, shoes: { color: "#FFFFFF", type: "sneakers" } },
  },
  {
    name: "中性潮流", gender: "neutral",
    drawingConfig: { faceShape: "oval", eyeStyle: "almond", noseStyle: "medium", mouthStyle: "slight_smile", earStyle: "medium" },
    parameters: { faceShape: { min: 0, max: 100, default: 50, label: "脸型" }, eyeShape: { options: ["almond", "round", "narrow", "cat_eye"], default: "almond", label: "眼型" }, skinTone: { options: ["#FDEBD0", "#F5CBA7", "#E0AC69", "#C68642", "#8D5524"], default: "#F5CBA7", label: "肤色" }, hairStyle: { options: [{ id: "short_androgynous", name: "中性短发", thumbnailUrl: "https://cdn.aineed.com/avatar/hair/short_androgynous.png" }, { id: "medium_shag", name: "层次中发", thumbnailUrl: "https://cdn.aineed.com/avatar/hair/medium_shag.png" }, { id: "long_straight", name: "长直发", thumbnailUrl: "https://cdn.aineed.com/avatar/hair/long_straight.png" }, { id: "buzz", name: "寸头", thumbnailUrl: "https://cdn.aineed.com/avatar/hair/buzz.png" }], default: "short_androgynous" }, hairColor: { options: ["#1A1A2E", "#4A2C2A", "#8B4513", "#C0392B", "#7D3C98"], default: "#1A1A2E", label: "发色" } },
    defaultClothingMap: { top: { color: "#2C3E50", type: "tshirt" }, bottom: { color: "#1A1A2E", type: "jeans" }, shoes: { color: "#FFFFFF", type: "sneakers" } },
  },
  {
    name: "元气少女", gender: "female",
    drawingConfig: { faceShape: "heart", eyeStyle: "sparkly", noseStyle: "button", mouthStyle: "open_smile", earStyle: "small" },
    parameters: { faceShape: { min: 0, max: 100, default: 70, label: "脸型圆度" }, eyeShape: { options: ["sparkly", "big_round", "cat_eye", "droopy"], default: "sparkly", label: "眼型" }, skinTone: { options: ["#FDEBD0", "#F5CBA7", "#E0AC69", "#C68642", "#8D5524"], default: "#FDEBD0", label: "肤色" }, hairStyle: { options: [{ id: "twin_tails", name: "双马尾", thumbnailUrl: "https://cdn.aineed.com/avatar/hair/twin_tails.png" }, { id: "long_wavy", name: "长卷发", thumbnailUrl: "https://cdn.aineed.com/avatar/hair/long_wavy.png" }, { id: "bob", name: "波波头", thumbnailUrl: "https://cdn.aineed.com/avatar/hair/bob.png" }, { id: "bun", name: "丸子头", thumbnailUrl: "https://cdn.aineed.com/avatar/hair/bun.png" }], default: "twin_tails" }, hairColor: { options: ["#1A1A2E", "#4A2C2A", "#8B4513", "#D4A574", "#C0392B"], default: "#4A2C2A", label: "发色" } },
    defaultClothingMap: { top: { color: "#FFB6C1", type: "tshirt" }, bottom: { color: "#FFFFFF", type: "skirt" }, shoes: { color: "#FFB6C1", type: "sneakers" } },
  },
  {
    name: "绅士型男", gender: "male",
    drawingConfig: { faceShape: "square", eyeStyle: "deep_set", noseStyle: "strong", mouthStyle: "firm", earStyle: "medium" },
    parameters: { faceShape: { min: 0, max: 100, default: 30, label: "脸型棱角" }, eyeShape: { options: ["deep_set", "round", "sharp", "gentle"], default: "deep_set", label: "眼型" }, skinTone: { options: ["#FDEBD0", "#F5CBA7", "#E0AC69", "#C68642", "#8D5524"], default: "#E0AC69", label: "肤色" }, hairStyle: { options: [{ id: "slick_back", name: "大背头", thumbnailUrl: "https://cdn.aineed.com/avatar/hair/slick_back.png" }, { id: "side_part", name: "侧分", thumbnailUrl: "https://cdn.aineed.com/avatar/hair/side_part.png" }, { id: "short_clean", name: "清爽短发", thumbnailUrl: "https://cdn.aineed.com/avatar/hair/short_clean.png" }, { id: "medium_swept", name: "侧分中发", thumbnailUrl: "https://cdn.aineed.com/avatar/hair/medium_swept.png" }], default: "slick_back" }, hairColor: { options: ["#1A1A2E", "#2C2C2C", "#4A2C2A", "#8B4513"], default: "#1A1A2E", label: "发色" } },
    defaultClothingMap: { top: { color: "#FFFFFF", type: "shirt" }, bottom: { color: "#2C3E50", type: "suit_pants" }, shoes: { color: "#2C2C2C", type: "oxford" } },
  },
];

const PRODUCT_TEMPLATES = [
  { productType: "tshirt", material: "cotton", baseCost: 2500, suggestedPrice: 9900, uvMapUrl: "https://cdn.aineed.com/templates/tshirt_uv.png", previewModelUrl: "https://cdn.aineed.com/templates/tshirt_preview.png", availableSizes: ["S", "M", "L", "XL", "XXL"], printArea: { x: 150, y: 100, width: 300, height: 350 }, podProvider: "eprolo", podProductId: "EP-TSH-001" },
  { productType: "hoodie", material: "cotton", baseCost: 4500, suggestedPrice: 15900, uvMapUrl: "https://cdn.aineed.com/templates/hoodie_uv.png", previewModelUrl: "https://cdn.aineed.com/templates/hoodie_preview.png", availableSizes: ["S", "M", "L", "XL", "XXL"], printArea: { x: 150, y: 120, width: 300, height: 300 }, podProvider: "eprolo", podProductId: "EP-HOO-001" },
  { productType: "hat", material: "cotton", baseCost: 1500, suggestedPrice: 6900, uvMapUrl: "https://cdn.aineed.com/templates/hat_uv.png", previewModelUrl: "https://cdn.aineed.com/templates/hat_preview.png", availableSizes: ["M", "L"], printArea: { x: 50, y: 20, width: 200, height: 80 }, podProvider: "eprolo", podProductId: "EP-HAT-001" },
  { productType: "bag", material: "canvas", baseCost: 2000, suggestedPrice: 8900, uvMapUrl: "https://cdn.aineed.com/templates/bag_uv.png", previewModelUrl: "https://cdn.aineed.com/templates/bag_preview.png", availableSizes: ["M"], printArea: { x: 100, y: 80, width: 250, height: 200 }, podProvider: "eprolo", podProductId: "EP-BAG-001" },
  { productType: "phone_case", material: "polycarbonate", baseCost: 800, suggestedPrice: 4900, uvMapUrl: "https://cdn.aineed.com/templates/phone_case_uv.png", previewModelUrl: "https://cdn.aineed.com/templates/phone_case_preview.png", availableSizes: ["iPhone 15", "iPhone 15 Pro", "iPhone 15 Pro Max"], printArea: { x: 10, y: 30, width: 100, height: 180 }, podProvider: "eprolo", podProductId: "EP-PHC-001" },
  { productType: "tshirt", material: "polyester", baseCost: 2000, suggestedPrice: 8900, uvMapUrl: "https://cdn.aineed.com/templates/tshirt_poly_uv.png", previewModelUrl: "https://cdn.aineed.com/templates/tshirt_poly_preview.png", availableSizes: ["S", "M", "L", "XL", "XXL"], printArea: { x: 150, y: 100, width: 300, height: 350 }, podProvider: "eprolo", podProductId: "EP-TSH-002" },
  { productType: "hoodie", material: "polyester", baseCost: 4000, suggestedPrice: 14900, uvMapUrl: "https://cdn.aineed.com/templates/hoodie_poly_uv.png", previewModelUrl: "https://cdn.aineed.com/templates/hoodie_poly_preview.png", availableSizes: ["S", "M", "L", "XL", "XXL"], printArea: { x: 150, y: 120, width: 300, height: 300 }, podProvider: "eprolo", podProductId: "EP-HOO-002" },
  { productType: "hat", material: "polyester", baseCost: 1200, suggestedPrice: 5900, uvMapUrl: "https://cdn.aineed.com/templates/hat_poly_uv.png", previewModelUrl: "https://cdn.aineed.com/templates/hat_poly_preview.png", availableSizes: ["M", "L"], printArea: { x: 50, y: 20, width: 200, height: 80 }, podProvider: "eprolo", podProductId: "EP-HAT-002" },
  { productType: "bag", material: "leather", baseCost: 5000, suggestedPrice: 19900, uvMapUrl: "https://cdn.aineed.com/templates/bag_leather_uv.png", previewModelUrl: "https://cdn.aineed.com/templates/bag_leather_preview.png", availableSizes: ["M"], printArea: { x: 100, y: 80, width: 250, height: 200 }, podProvider: "eprolo", podProductId: "EP-BAG-002" },
  { productType: "shoes", material: "canvas", baseCost: 3500, suggestedPrice: 12900, uvMapUrl: "https://cdn.aineed.com/templates/shoes_uv.png", previewModelUrl: "https://cdn.aineed.com/templates/shoes_preview.png", availableSizes: ["36", "37", "38", "39", "40", "41", "42", "43", "44"], printArea: { x: 50, y: 30, width: 150, height: 100 }, podProvider: "eprolo", podProductId: "EP-SHO-001" },
];

async function main(): Promise<void> {
  console.log("🌱 开始播种数据...");

  const brands: Record<string, string> = {};
  for (const b of BRANDS) {
    const brand = await prisma.brand.create({ data: b });
    brands[b.name] = brand.id;
    console.log(`  ✓ 品牌: ${b.name}`);
  }

  const categories: Record<string, string> = {};
  for (const c of CATEGORIES) {
    const cat = await prisma.category.create({ data: c });
    categories[c.slug] = cat.id;
    console.log(`  ✓ 分类: ${c.name}`);
  }

  const clothingMap: Record<string, string> = {};
  for (let i = 0; i < CLOTHING_DATA.length; i++) {
    const item = CLOTHING_DATA[i];
    const brand = BRANDS[item.brandIndex];
    const clothing = await prisma.clothingItem.create({
      data: {
        name: item.name,
        brandId: brands[brand.name],
        categoryId: categories[item.categorySlug],
        price: item.price,
        originalPrice: item.originalPrice,
        gender: item.gender,
        seasons: item.seasons,
        occasions: item.occasions,
        styleTags: item.styleTags,
        colors: item.colors,
        materials: item.materials,
        fitType: item.fitType,
        imageUrls: [`https://cdn.aineed.com/clothing/item_${i + 1}.jpg`],
      },
    });
    clothingMap[item.name] = clothing.id;
  }
  console.log(`  ✓ 服装: ${CLOTHING_DATA.length}件`);

  for (const rule of STYLE_RULES) {
    await prisma.styleRule.create({ data: rule });
  }
  console.log(`  ✓ 时尚规则: ${STYLE_RULES.length}条`);

  for (const outfitDef of OUTFITS) {
    const outfit = await prisma.outfit.create({
      data: {
        name: outfitDef.name,
        occasion: outfitDef.occasion,
        season: outfitDef.season,
        styleTags: outfitDef.styleTags,
        isPublic: true,
      },
    });
    for (let j = 0; j < outfitDef.items.length; j++) {
      const itemDef = outfitDef.items[j];
      const matchingClothingId = Object.entries(clothingMap).find(
        ([name]) => name.includes(itemDef.nameKeyword)
      )?.[1];
      if (matchingClothingId) {
        await prisma.outfitItem.create({
          data: {
            outfitId: outfit.id,
            clothingId: matchingClothingId,
            slot: itemDef.slot,
            sortOrder: j,
          },
        });
      }
    }
  }
  console.log(`  ✓ 搭配方案: ${OUTFITS.length}个`);

  for (const tmpl of AVATAR_TEMPLATES) {
    await prisma.avatarTemplate.create({ data: tmpl });
  }
  console.log(`  ✓ Q版形象模板: ${AVATAR_TEMPLATES.length}个`);

  for (const pt of PRODUCT_TEMPLATES) {
    await prisma.productTemplate.create({ data: pt });
  }
  console.log(`  ✓ 定制产品模板: ${PRODUCT_TEMPLATES.length}个`);

  console.log("✅ 播种完成!");
}

main()
  .catch((e) => {
    console.error("❌ 播种失败:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
