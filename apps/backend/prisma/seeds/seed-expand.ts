// @ts-nocheck
import {
  PrismaClient,
  Gender,
  BodyType,
  SkinTone,
  FaceShape,
  ColorSeason,
  OnboardingStep,
  TryOnStatus,
  CollectionItemType,
} from "@prisma/client";
import { hash } from "../../src/common/security/bcrypt";
import { randomDate, randomInt, randomElement, generatePicsumUrl } from "./utils";

function calculateMeasurements(height: number, weight: number, bodyType: BodyType, gender: Gender) {
  const h = height / 100;
  const bmi = weight / (h * h);
  const factor = bmi > 24 ? 1.05 : bmi < 18.5 ? 0.92 : 1;
  const ratios: Record<string, { shoulder: number; bust: number; waist: number; hip: number }> = {
    hourglass: { shoulder: 0.25, bust: 0.25, waist: 0.19, hip: 0.26 },
    rectangle: { shoulder: 0.24, bust: 0.235, waist: 0.215, hip: 0.245 },
    triangle: { shoulder: 0.225, bust: 0.235, waist: 0.2, hip: 0.27 },
    inverted_triangle: { shoulder: 0.27, bust: 0.255, waist: 0.2, hip: 0.23 },
    oval: { shoulder: 0.255, bust: 0.26, waist: 0.245, hip: 0.255 },
  };
  if (gender === "male") {
    const maleOverrides: Record<
      string,
      { shoulder: number; bust: number; waist: number; hip: number }
    > = {
      rectangle: { shoulder: 0.275, bust: 0.265, waist: 0.235, hip: 0.235 },
      inverted_triangle: { shoulder: 0.295, bust: 0.275, waist: 0.225, hip: 0.225 },
      oval: { shoulder: 0.275, bust: 0.285, waist: 0.27, hip: 0.25 },
    };
    const r = maleOverrides[bodyType] || ratios[bodyType] || ratios.rectangle;
    return {
      shoulder: Math.round(height * r.shoulder * factor * 10) / 10,
      bust: Math.round(height * r.bust * factor * 10) / 10,
      waist: Math.round(height * r.waist * factor * 10) / 10,
      hip: Math.round(height * r.hip * factor * 10) / 10,
    };
  }
  const r = ratios[bodyType] || ratios.rectangle;
  return {
    shoulder: Math.round(height * r.shoulder * factor * 10) / 10,
    bust: Math.round(height * r.bust * factor * 10) / 10,
    waist: Math.round(height * r.waist * factor * 10) / 10,
    hip: Math.round(height * r.hip * factor * 10) / 10,
  };
}

const EXPAND_USERS = [
  {
    email: "user11@test.com",
    password: "Test123456!",
    nickname: "林小雅",
    gender: "female" as Gender,
    birthDate: new Date("2002-03-15"),
    bodyType: "rectangle" as BodyType,
    skinTone: "fair" as SkinTone,
    faceShape: "oval" as FaceShape,
    colorSeason: "spring_warm" as ColorSeason,
    height: 162,
    weight: 50,
    phone: "13800138010",
    stylePreferences: { styles: ["韩系博主", "甜美风", "清新日常"], avoid: ["硬朗工装", "暗黑"] },
    colorPreferences: { loved: ["奶白", "浅粉", "薰衣草紫", "薄荷绿"], avoided: ["深棕", "暗红"] },
  },
  {
    email: "user12@test.com",
    password: "Test123456!",
    nickname: "陈志远",
    gender: "male" as Gender,
    birthDate: new Date("1994-06-20"),
    bodyType: "inverted_triangle" as BodyType,
    skinTone: "light" as SkinTone,
    faceShape: "square" as FaceShape,
    colorSeason: "winter_cool" as ColorSeason,
    height: 180,
    weight: 78,
    phone: "13800138011",
    stylePreferences: {
      styles: ["商务精英", "意式绅士", "都市型男"],
      avoid: ["街头嘻哈", "可爱风"],
    },
    colorPreferences: { loved: ["藏青", "炭灰", "纯白", "深酒红"], avoided: ["粉红", "亮黄"] },
  },
  {
    email: "user13@test.com",
    password: "Test123456!",
    nickname: "王美琪",
    gender: "female" as Gender,
    birthDate: new Date("1999-08-10"),
    bodyType: "hourglass" as BodyType,
    skinTone: "medium" as SkinTone,
    faceShape: "heart" as FaceShape,
    colorSeason: "autumn_warm" as ColorSeason,
    height: 168,
    weight: 58,
    phone: "13800138012",
    stylePreferences: { styles: ["法式浪漫", "轻奢名媛", "优雅通勤"], avoid: ["运动风", "街头"] },
    colorPreferences: { loved: ["酒红", "驼色", "米白", "墨绿"], avoided: ["荧光绿", "亮橙"] },
  },
  {
    email: "user14@test.com",
    password: "Test123456!",
    nickname: "张浩然",
    gender: "male" as Gender,
    birthDate: new Date("1998-02-14"),
    bodyType: "rectangle" as BodyType,
    skinTone: "olive" as SkinTone,
    faceShape: "oblong" as FaceShape,
    colorSeason: "summer_cool" as ColorSeason,
    height: 175,
    weight: 65,
    phone: "13800138013",
    stylePreferences: { styles: ["日系简约", "CityBoy", "无印良品风"], avoid: ["正装", "嘻哈"] },
    colorPreferences: { loved: ["卡其", "白色", "藏蓝", "军绿"], avoided: ["大红", "荧光色"] },
  },
  {
    email: "user15@test.com",
    password: "Test123456!",
    nickname: "李思涵",
    gender: "female" as Gender,
    birthDate: new Date("2004-11-22"),
    bodyType: "triangle" as BodyType,
    skinTone: "fair" as SkinTone,
    faceShape: "round" as FaceShape,
    colorSeason: "spring_light" as ColorSeason,
    height: 158,
    weight: 46,
    phone: "13800138014",
    stylePreferences: { styles: ["学院风", "JK制服", "甜美少女"], avoid: ["性感", "朋克"] },
    colorPreferences: { loved: ["天蓝", "白色", "粉色", "鹅黄"], avoided: ["黑色", "深紫"] },
  },
  {
    email: "user16@test.com",
    password: "Test123456!",
    nickname: "刘建国",
    gender: "male" as Gender,
    birthDate: new Date("1988-05-08"),
    bodyType: "oval" as BodyType,
    skinTone: "medium" as SkinTone,
    faceShape: "square" as FaceShape,
    colorSeason: "autumn_warm" as ColorSeason,
    height: 174,
    weight: 82,
    phone: "13800138015",
    stylePreferences: { styles: ["传统正装", "英伦经典", "商务精英"], avoid: ["街头", "运动"] },
    colorPreferences: { loved: ["深蓝", "灰色", "棕色", "白色"], avoided: ["荧光色", "粉红"] },
  },
  {
    email: "user17@test.com",
    password: "Test123456!",
    nickname: "赵雨萱",
    gender: "female" as Gender,
    birthDate: new Date("2001-07-30"),
    bodyType: "rectangle" as BodyType,
    skinTone: "tan" as SkinTone,
    faceShape: "diamond" as FaceShape,
    colorSeason: "summer_cool" as ColorSeason,
    height: 170,
    weight: 56,
    phone: "13800138016",
    stylePreferences: { styles: ["街头潮流", "Y2K", "酷感女孩"], avoid: ["甜美少女", "田园"] },
    colorPreferences: { loved: ["黑色", "银色", "电光紫", "克莱因蓝"], avoided: ["碎花", "粉色"] },
  },
  {
    email: "user18@test.com",
    password: "Test123456!",
    nickname: "孙明辉",
    gender: "male" as Gender,
    birthDate: new Date("1996-09-12"),
    bodyType: "inverted_triangle" as BodyType,
    skinTone: "olive" as SkinTone,
    faceShape: "oval" as FaceShape,
    colorSeason: "autumn_deep" as ColorSeason,
    height: 182,
    weight: 80,
    phone: "13800138017",
    stylePreferences: { styles: ["运动休闲", "Athleisure", "户外机能"], avoid: ["正装", "甜美"] },
    colorPreferences: { loved: ["黑色", "深灰", "军绿", "深蓝"], avoided: ["粉红", "浅紫"] },
  },
  {
    email: "user19@test.com",
    password: "Test123456!",
    nickname: "周诗琪",
    gender: "female" as Gender,
    birthDate: new Date("1997-04-05"),
    bodyType: "hourglass" as BodyType,
    skinTone: "light" as SkinTone,
    faceShape: "oval" as FaceShape,
    colorSeason: "summer_light" as ColorSeason,
    height: 166,
    weight: 54,
    phone: "13800138018",
    stylePreferences: { styles: ["极简主义", "北欧风", "性冷淡风"], avoid: ["繁复", "甜美"] },
    colorPreferences: { loved: ["白色", "灰色", "黑色", "驼色"], avoided: ["大红", "亮黄"] },
  },
  {
    email: "user20@test.com",
    password: "Test123456!",
    nickname: "吴大伟",
    gender: "male" as Gender,
    birthDate: new Date("1991-12-18"),
    bodyType: "rectangle" as BodyType,
    skinTone: "medium" as SkinTone,
    faceShape: "oblong" as FaceShape,
    colorSeason: "autumn_warm" as ColorSeason,
    height: 176,
    weight: 72,
    phone: "13800138019",
    stylePreferences: { styles: ["商务休闲", "Smart Casual", "都市精英"], avoid: ["街头", "运动"] },
    colorPreferences: { loved: ["藏蓝", "卡其", "白色", "灰色"], avoided: ["荧光色", "粉红"] },
  },
  {
    email: "user21@test.com",
    password: "Test123456!",
    nickname: "郑晓琳",
    gender: "female" as Gender,
    birthDate: new Date("2000-01-28"),
    bodyType: "triangle" as BodyType,
    skinTone: "fair" as SkinTone,
    faceShape: "heart" as FaceShape,
    colorSeason: "spring_warm" as ColorSeason,
    height: 160,
    weight: 48,
    phone: "13800138020",
    stylePreferences: { styles: ["甜美少女", "韩系穿搭", "减龄风"], avoid: ["硬朗", "暗黑"] },
    colorPreferences: { loved: ["蜜桃粉", "奶白", "浅蓝", "鹅黄"], avoided: ["深紫", "土黄"] },
  },
  {
    email: "user22@test.com",
    password: "Test123456!",
    nickname: "黄志强",
    gender: "male" as Gender,
    birthDate: new Date("1993-03-25"),
    bodyType: "inverted_triangle" as BodyType,
    skinTone: "tan" as SkinTone,
    faceShape: "square" as FaceShape,
    colorSeason: "autumn_deep" as ColorSeason,
    height: 178,
    weight: 76,
    phone: "13800138021",
    stylePreferences: { styles: ["户外机能", "Techwear", "军旅风"], avoid: ["正装", "甜美"] },
    colorPreferences: { loved: ["黑色", "军绿", "深灰", "卡其"], avoided: ["粉红", "浅紫"] },
  },
  {
    email: "user23@test.com",
    password: "Test123456!",
    nickname: "杨梦瑶",
    gender: "female" as Gender,
    birthDate: new Date("2003-06-10"),
    bodyType: "hourglass" as BodyType,
    skinTone: "olive" as SkinTone,
    faceShape: "oval" as FaceShape,
    colorSeason: "autumn_warm" as ColorSeason,
    height: 164,
    weight: 52,
    phone: "13800138022",
    stylePreferences: { styles: ["复古文艺", "港风", "新中式"], avoid: ["运动", "街头"] },
    colorPreferences: { loved: ["酒红", "墨绿", "焦糖", "米白"], avoided: ["荧光色", "亮粉"] },
  },
  {
    email: "user24@test.com",
    password: "Test123456!",
    nickname: "马天宇",
    gender: "male" as Gender,
    birthDate: new Date("1999-10-03"),
    bodyType: "rectangle" as BodyType,
    skinTone: "light" as SkinTone,
    faceShape: "diamond" as FaceShape,
    colorSeason: "winter_cool" as ColorSeason,
    height: 183,
    weight: 70,
    phone: "13800138023",
    stylePreferences: { styles: ["高街潮流", "暗黑先锋", "设计师品牌"], avoid: ["正装", "田园"] },
    colorPreferences: { loved: ["黑色", "白色", "银色", "深紫"], avoided: ["卡其", "棕色"] },
  },
  {
    email: "user25@test.com",
    password: "Test123456!",
    nickname: "许佳怡",
    gender: "female" as Gender,
    birthDate: new Date("1995-02-20"),
    bodyType: "rectangle" as BodyType,
    skinTone: "medium" as SkinTone,
    faceShape: "oval" as FaceShape,
    colorSeason: "summer_cool" as ColorSeason,
    height: 167,
    weight: 55,
    phone: "13800138024",
    stylePreferences: { styles: ["职场知性", "优雅通勤", "轻奢简约"], avoid: ["街头", "运动"] },
    colorPreferences: { loved: ["雾霾蓝", "灰粉", "燕麦色", "黑色"], avoided: ["荧光色", "大红"] },
  },
  {
    email: "user26@test.com",
    password: "Test123456!",
    nickname: "韩磊",
    gender: "male" as Gender,
    birthDate: new Date("1986-08-15"),
    bodyType: "oval" as BodyType,
    skinTone: "medium" as SkinTone,
    faceShape: "round" as FaceShape,
    colorSeason: "autumn_warm" as ColorSeason,
    height: 172,
    weight: 85,
    phone: "13800138025",
    stylePreferences: { styles: ["经典绅士", "英伦复古", "商务正装"], avoid: ["街头", "运动"] },
    colorPreferences: { loved: ["深蓝", "棕色", "灰色", "白色"], avoided: ["荧光色", "粉红"] },
  },
  {
    email: "user27@test.com",
    password: "Test123456!",
    nickname: "朱晓红",
    gender: "female" as Gender,
    birthDate: new Date("1998-04-18"),
    bodyType: "triangle" as BodyType,
    skinTone: "tan" as SkinTone,
    faceShape: "oval" as FaceShape,
    colorSeason: "autumn_warm" as ColorSeason,
    height: 163,
    weight: 54,
    phone: "13800138026",
    stylePreferences: { styles: ["波西米亚", "度假风", "民族风"], avoid: ["正装", "极简"] },
    colorPreferences: { loved: ["焦糖", "酒红", "藏蓝", "米白"], avoided: ["荧光绿", "亮粉"] },
  },
  {
    email: "user28@test.com",
    password: "Test123456!",
    nickname: "曹文杰",
    gender: "male" as Gender,
    birthDate: new Date("2000-12-05"),
    bodyType: "rectangle" as BodyType,
    skinTone: "fair" as SkinTone,
    faceShape: "oval" as FaceShape,
    colorSeason: "summer_cool" as ColorSeason,
    height: 177,
    weight: 66,
    phone: "13800138027",
    stylePreferences: { styles: ["极简男装", "Clean Fit", "无印良品风"], avoid: ["街头", "嘻哈"] },
    colorPreferences: { loved: ["白色", "灰色", "黑色", "米色"], avoided: ["大红", "亮黄"] },
  },
  {
    email: "user29@test.com",
    password: "Test123456!",
    nickname: "何雅琴",
    gender: "female" as Gender,
    birthDate: new Date("1992-07-22"),
    bodyType: "hourglass" as BodyType,
    skinTone: "light" as SkinTone,
    faceShape: "heart" as FaceShape,
    colorSeason: "winter_cool" as ColorSeason,
    height: 169,
    weight: 57,
    phone: "13800138028",
    stylePreferences: { styles: ["轻奢名媛", "法式优雅", "晚宴风"], avoid: ["运动", "街头"] },
    colorPreferences: { loved: ["正红", "珍珠白", "藏蓝", "金色"], avoided: ["荧光绿", "橙色"] },
  },
  {
    email: "user30@test.com",
    password: "Test123456!",
    nickname: "徐鹏飞",
    gender: "male" as Gender,
    birthDate: new Date("1997-11-08"),
    bodyType: "inverted_triangle" as BodyType,
    skinTone: "olive" as SkinTone,
    faceShape: "square" as FaceShape,
    colorSeason: "autumn_deep" as ColorSeason,
    height: 179,
    weight: 74,
    phone: "13800138029",
    stylePreferences: {
      styles: ["都市型男", "Smart Casual", "意式风格"],
      avoid: ["可爱风", "运动"],
    },
    colorPreferences: { loved: ["藏青", "驼色", "白色", "深灰"], avoided: ["粉红", "亮黄"] },
  },
];

const WARDROBE_TEMPLATES: Record<
  string,
  Array<{
    category: string;
    subcategory: string;
    name: string;
    brand: string;
    colors: string[];
    style: string[];
    seasons: string[];
    occasions: string[];
    tags: string[];
  }>
> = {
  female: [
    {
      category: "tops",
      subcategory: "tshirt",
      name: "白色基础T恤",
      brand: "UNIQLO",
      colors: ["白色"],
      style: ["简约", "基础款"],
      seasons: ["春", "夏", "秋"],
      occasions: ["日常", "休闲"],
      tags: ["百搭", "基础款"],
    },
    {
      category: "tops",
      subcategory: "blouse",
      name: "法式方领衬衫",
      brand: "ZARA",
      colors: ["奶白色"],
      style: ["法式", "浪漫"],
      seasons: ["春", "秋"],
      occasions: ["约会", "通勤"],
      tags: ["方领", "泡泡袖"],
    },
    {
      category: "tops",
      subcategory: "sweater",
      name: "高领羊绒毛衣",
      brand: "COS",
      colors: ["驼色"],
      style: ["极简", "质感"],
      seasons: ["秋", "冬"],
      occasions: ["通勤", "约会"],
      tags: ["羊绒", "保暖"],
    },
    {
      category: "tops",
      subcategory: "hoodie",
      name: "Oversize卫衣",
      brand: "UNIQLO",
      colors: ["燕麦色"],
      style: ["休闲", "街头"],
      seasons: ["春", "秋"],
      occasions: ["日常", "周末"],
      tags: ["卫衣", "oversize"],
    },
    {
      category: "tops",
      subcategory: "knitwear",
      name: "V领针织开衫",
      brand: "ZARA",
      colors: ["雾霾蓝"],
      style: ["温柔", "知性"],
      seasons: ["春", "秋"],
      occasions: ["通勤", "约会"],
      tags: ["针织", "开衫"],
    },
    {
      category: "bottoms",
      subcategory: "jeans",
      name: "高腰直筒牛仔裤",
      brand: "Levi's",
      colors: ["深蓝色"],
      style: ["经典", "百搭"],
      seasons: ["春", "夏", "秋", "冬"],
      occasions: ["日常", "休闲"],
      tags: ["高腰", "直筒"],
    },
    {
      category: "bottoms",
      subcategory: "trousers",
      name: "垂坠感阔腿西装裤",
      brand: "COS",
      colors: ["黑色"],
      style: ["通勤", "干练"],
      seasons: ["春", "秋", "冬"],
      occasions: ["通勤", "正式"],
      tags: ["阔腿", "高腰"],
    },
    {
      category: "bottoms",
      subcategory: "skirt",
      name: "百褶中长半裙",
      brand: "寻裳Studio",
      colors: ["香槟色"],
      style: ["优雅", "知性"],
      seasons: ["春", "秋"],
      occasions: ["约会", "通勤"],
      tags: ["百褶", "中长"],
    },
    {
      category: "dresses",
      subcategory: "cocktail",
      name: "小黑裙经典款",
      brand: "寻裳Studio",
      colors: ["黑色"],
      style: ["优雅", "经典"],
      seasons: ["春", "秋", "冬"],
      occasions: ["约会", "晚宴"],
      tags: ["小黑裙", "收腰"],
    },
    {
      category: "dresses",
      subcategory: "floral",
      name: "碎花雪纺连衣裙",
      brand: "ZARA",
      colors: ["蓝底白花"],
      style: ["浪漫", "清新"],
      seasons: ["春", "夏"],
      occasions: ["约会", "度假"],
      tags: ["碎花", "雪纺"],
    },
    {
      category: "outerwear",
      subcategory: "blazer",
      name: "修身西装外套",
      brand: "ZARA",
      colors: ["黑色"],
      style: ["职场", "干练"],
      seasons: ["春", "秋"],
      occasions: ["通勤", "正式"],
      tags: ["西装", "修身"],
    },
    {
      category: "outerwear",
      subcategory: "trench_coat",
      name: "经典双排扣风衣",
      brand: "ZARA",
      colors: ["卡其色"],
      style: ["英伦", "经典"],
      seasons: ["春", "秋"],
      occasions: ["通勤", "休闲"],
      tags: ["风衣", "双排扣"],
    },
    {
      category: "outerwear",
      subcategory: "wool_coat",
      name: "极简廓形羊毛大衣",
      brand: "COS",
      colors: ["驼色"],
      style: ["极简", "高级"],
      seasons: ["秋", "冬"],
      occasions: ["通勤", "约会"],
      tags: ["羊毛", "廓形"],
    },
    {
      category: "footwear",
      subcategory: "sneakers",
      name: "经典白色运动鞋",
      brand: "Nike",
      colors: ["白色"],
      style: ["休闲", "百搭"],
      seasons: ["春", "夏", "秋"],
      occasions: ["日常", "休闲"],
      tags: ["小白鞋", "厚底"],
    },
    {
      category: "footwear",
      subcategory: "heels",
      name: "尖头细高跟鞋",
      brand: "寻裳Studio",
      colors: ["黑色"],
      style: ["优雅", "气质"],
      seasons: ["春", "秋", "冬"],
      occasions: ["通勤", "约会"],
      tags: ["高跟鞋", "尖头"],
    },
    {
      category: "footwear",
      subcategory: "boots",
      name: "切尔西短靴",
      brand: "寻裳Studio",
      colors: ["黑色"],
      style: ["帅气", "百搭"],
      seasons: ["秋", "冬"],
      occasions: ["日常", "通勤"],
      tags: ["短靴", "切尔西"],
    },
    {
      category: "accessories",
      subcategory: "bag",
      name: "链条斜挎包",
      brand: "ZARA",
      colors: ["黑色"],
      style: ["精致", "百搭"],
      seasons: ["春", "夏", "秋", "冬"],
      occasions: ["约会", "通勤"],
      tags: ["链条包", "斜挎"],
    },
    {
      category: "accessories",
      subcategory: "scarf",
      name: "真丝方巾",
      brand: "寻裳Studio",
      colors: ["印花蓝"],
      style: ["优雅", "法式"],
      seasons: ["春", "秋"],
      occasions: ["通勤", "约会"],
      tags: ["丝巾", "真丝"],
    },
    {
      category: "accessories",
      subcategory: "earrings",
      name: "珍珠耳环",
      brand: "寻裳Studio",
      colors: ["白色珍珠"],
      style: ["优雅", "气质"],
      seasons: ["春", "夏", "秋", "冬"],
      occasions: ["约会", "通勤"],
      tags: ["珍珠", "925银"],
    },
  ],
  male: [
    {
      category: "tops",
      subcategory: "tshirt",
      name: "纯棉圆领T恤",
      brand: "UNIQLO",
      colors: ["白色"],
      style: ["简约", "基础款"],
      seasons: ["春", "夏", "秋"],
      occasions: ["日常", "休闲"],
      tags: ["纯棉", "百搭"],
    },
    {
      category: "tops",
      subcategory: "tshirt",
      name: "深色V领T恤",
      brand: "UNIQLO",
      colors: ["黑色"],
      style: ["简约", "修身"],
      seasons: ["春", "夏", "秋"],
      occasions: ["日常", "休闲"],
      tags: ["V领", "修身"],
    },
    {
      category: "tops",
      subcategory: "blouse",
      name: "商务修身衬衫",
      brand: "COS",
      colors: ["白色"],
      style: ["商务", "修身"],
      seasons: ["春", "夏", "秋", "冬"],
      occasions: ["通勤", "正式"],
      tags: ["衬衫", "修身"],
    },
    {
      category: "tops",
      subcategory: "blouse",
      name: "浅蓝条纹衬衫",
      brand: "ZARA",
      colors: ["浅蓝色"],
      style: ["商务休闲", "经典"],
      seasons: ["春", "夏", "秋"],
      occasions: ["通勤", "约会"],
      tags: ["条纹", "衬衫"],
    },
    {
      category: "tops",
      subcategory: "sweater",
      name: "高领羊绒毛衣",
      brand: "COS",
      colors: ["深灰色"],
      style: ["质感", "极简"],
      seasons: ["秋", "冬"],
      occasions: ["通勤", "约会"],
      tags: ["羊绒", "高领"],
    },
    {
      category: "tops",
      subcategory: "hoodie",
      name: "连帽卫衣",
      brand: "Nike",
      colors: ["深灰色"],
      style: ["休闲", "运动"],
      seasons: ["春", "秋"],
      occasions: ["日常", "周末"],
      tags: ["卫衣", "连帽"],
    },
    {
      category: "bottoms",
      subcategory: "jeans",
      name: "直筒牛仔裤",
      brand: "Levi's",
      colors: ["深蓝色"],
      style: ["经典", "百搭"],
      seasons: ["春", "夏", "秋", "冬"],
      occasions: ["日常", "休闲"],
      tags: ["直筒", "经典"],
    },
    {
      category: "bottoms",
      subcategory: "trousers",
      name: "羊毛混纺西裤",
      brand: "COS",
      colors: ["藏青色"],
      style: ["商务", "质感"],
      seasons: ["春", "秋", "冬"],
      occasions: ["通勤", "正式"],
      tags: ["西裤", "羊毛"],
    },
    {
      category: "bottoms",
      subcategory: "trousers",
      name: "卡其休闲裤",
      brand: "UNIQLO",
      colors: ["卡其色"],
      style: ["休闲", "商务休闲"],
      seasons: ["春", "夏", "秋"],
      occasions: ["日常", "通勤"],
      tags: ["卡其裤", "休闲"],
    },
    {
      category: "bottoms",
      subcategory: "cargo",
      name: "工装风束脚裤",
      brand: "ZARA",
      colors: ["军绿色"],
      style: ["街头", "机能"],
      seasons: ["春", "夏", "秋"],
      occasions: ["日常", "周末"],
      tags: ["工装", "束脚"],
    },
    {
      category: "outerwear",
      subcategory: "blazer",
      name: "修身西装外套",
      brand: "ZARA",
      colors: ["深蓝色"],
      style: ["商务", "修身"],
      seasons: ["春", "秋"],
      occasions: ["通勤", "正式"],
      tags: ["西装", "修身"],
    },
    {
      category: "outerwear",
      subcategory: "trench_coat",
      name: "中长款风衣",
      brand: "COS",
      colors: ["卡其色"],
      style: ["英伦", "经典"],
      seasons: ["春", "秋"],
      occasions: ["通勤", "休闲"],
      tags: ["风衣", "中长"],
    },
    {
      category: "outerwear",
      subcategory: "puffer",
      name: "轻量羽绒服",
      brand: "UNIQLO",
      colors: ["黑色"],
      style: ["简约", "保暖"],
      seasons: ["秋", "冬"],
      occasions: ["日常", "通勤"],
      tags: ["羽绒服", "轻量"],
    },
    {
      category: "footwear",
      subcategory: "sneakers",
      name: "白色板鞋",
      brand: "Nike",
      colors: ["白色"],
      style: ["休闲", "百搭"],
      seasons: ["春", "夏", "秋"],
      occasions: ["日常", "休闲"],
      tags: ["板鞋", "白色"],
    },
    {
      category: "footwear",
      subcategory: "loafers",
      name: "乐福鞋",
      brand: "ZARA",
      colors: ["棕色"],
      style: ["商务休闲", "经典"],
      seasons: ["春", "秋"],
      occasions: ["通勤", "约会"],
      tags: ["乐福", "皮鞋"],
    },
    {
      category: "footwear",
      subcategory: "boots",
      name: "切尔西短靴",
      brand: "Dr. Martens",
      colors: ["黑色"],
      style: ["帅气", "经典"],
      seasons: ["秋", "冬"],
      occasions: ["日常", "休闲"],
      tags: ["短靴", "切尔西"],
    },
    {
      category: "accessories",
      subcategory: "watch",
      name: "极简金属手表",
      brand: "寻裳Studio",
      colors: ["银色"],
      style: ["精致", "极简"],
      seasons: ["春", "夏", "秋", "冬"],
      occasions: ["通勤", "正式"],
      tags: ["手表", "金属"],
    },
    {
      category: "accessories",
      subcategory: "belt",
      name: "极简皮质腰带",
      brand: "COS",
      colors: ["黑色"],
      style: ["质感", "百搭"],
      seasons: ["春", "夏", "秋", "冬"],
      occasions: ["通勤", "日常"],
      tags: ["腰带", "皮带"],
    },
  ],
};

const FEMALE_OUTFIT_NAMES = [
  "周一通勤Look",
  "周末约会穿搭",
  "秋日法式风情",
  "早春清新造型",
  "闺蜜下午茶穿搭",
  "年终晚宴Look",
  "度假海边穿搭",
  "日常休闲风",
  "温柔约会妆",
  "职场精英范",
  "圣诞派对Look",
  "春日出街穿搭",
  "文艺咖啡厅穿搭",
  "运动休闲风",
  "小个子显高穿搭",
  "微胖显瘦Look",
];
const MALE_OUTFIT_NAMES = [
  "商务会议穿搭",
  "周末休闲Look",
  "约会精致造型",
  "日常通勤穿搭",
  "户外运动风",
  "都市型男Look",
  "日系简约穿搭",
  "高街潮流造型",
  "英伦绅士风",
  "夏日清爽穿搭",
  "秋冬保暖Look",
  "商务休闲风",
];
const FEMALE_OUTFIT_DESCS = [
  "简约不简单的通勤搭配，干练又温柔，让每个工作日都充满自信",
  "浪漫约会穿搭，展现最温柔的一面，让他眼前一亮",
  "法式慵懒风情，随性中透着精致，仿佛漫步在巴黎街头",
  "清新自然的早春造型，轻盈飘逸，如沐春风",
  "和闺蜜的下午茶时光，穿搭也要精致出彩",
  "年终晚宴的华丽登场，气场全开，成为全场焦点",
  "海边度假的完美穿搭，浪漫又自在",
  "舒适自在的日常穿搭，轻松又有型",
];
const MALE_OUTFIT_DESCS = [
  "专业得体的商务穿搭，展现职场精英的自信与品味",
  "轻松自在的周末穿搭，舒适又有型",
  "精致约会造型，细节处彰显品味与用心",
  "干练的日常通勤穿搭，专业又不失个性",
  "活力运动风，舒适自在又帅气有型",
  "都市型男的精致穿搭，简约中展现高级品味",
];

export async function seedExpand(
  prisma: PrismaClient,
  userMap: Map<string, any>,
  itemMap: Map<string, any>,
  brandMap: Map<string, any>
): Promise<void> {
  console.log("\n" + "=".repeat(60));
  console.log("  扩展数据填充 (Part 1)");
  console.log("=".repeat(60));

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // ===== Section 1: Create additional users =====
  console.log("\n  [1/7] 创建扩展用户 (user11-user30)...");
  let newUsersCreated = 0;
  for (const u of EXPAND_USERS) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      userMap.set(u.email, existing);
      continue;
    }
    const passwordHash = await hash(u.password);
    const m = calculateMeasurements(u.height, u.weight, u.bodyType, u.gender);
    const user = await prisma.user.create({
      data: {
        email: u.email,
        phone: u.phone,
        password: passwordHash,
        nickname: u.nickname,
        gender: u.gender,
        birthDate: u.birthDate,
        isActive: true,
        profile: {
          create: {
            bodyType: u.bodyType,
            skinTone: u.skinTone,
            faceShape: u.faceShape,
            colorSeason: u.colorSeason,
            height: u.height,
            weight: u.weight,
            shoulder: m.shoulder,
            bust: m.bust,
            waist: m.waist,
            hip: m.hip,
            inseam: Math.round(u.height * 0.45 * 10) / 10,
            stylePreferences: u.stylePreferences,
            colorPreferences: u.colorPreferences,
            priceRangeMin: u.gender === "male" ? 200 : 150,
            priceRangeMax: u.gender === "male" ? 3000 : 2000,
            onboardingStep: "COMPLETED" as OnboardingStep,
            onboardingCompletedAt: randomDate(thirtyDaysAgo, now),
          },
        },
      },
    });
    userMap.set(u.email, user);
    newUsersCreated++;
  }
  console.log(`    + ${newUsersCreated} 个新用户`);

  const allUserIds = Array.from(userMap.values()).map((u: any) => u.id);
  const allUserEntries = Array.from(userMap.entries());

  // ===== Section 2: UserClothing =====
  console.log("\n  [2/7] 创建用户衣橱数据...");
  let wardrobeItemsCreated = 0;
  const userClothingMap = new Map<string, any[]>();
  const wardrobeUserEntries = allUserEntries.slice(0, 15);

  for (const [email, user] of wardrobeUserEntries) {
    const isMale = user.gender === "male";
    const templatePool = isMale ? WARDROBE_TEMPLATES.male : WARDROBE_TEMPLATES.female;
    const itemCount = randomInt(5, 12);
    const userClothings: any[] = [];
    const shuffled = [...templatePool].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(itemCount, shuffled.length));

    for (let i = 0; i < selected.length; i++) {
      const tpl = selected[i];
      const seed = `wardrobe-${user.id.slice(0, 8)}-${i}`;
      const existing = await prisma.userClothing.findFirst({
        where: { userId: user.id, name: tpl.name, category: tpl.category },
      });
      if (existing) {
        userClothings.push(existing);
        continue;
      }

      const wearCount = randomInt(0, 30);
      const isFavorite = wearCount > 15 || Math.random() < 0.15;
      const lastWorn =
        wearCount > 0
          ? randomDate(new Date(now.getTime() - wearCount * 7 * 24 * 60 * 60 * 1000), now)
          : null;

      const clothing = await prisma.userClothing.create({
        data: {
          userId: user.id,
          imageUri: generatePicsumUrl(seed, 600, 800),
          thumbnailUri: generatePicsumUrl(seed, 200, 267),
          category: tpl.category,
          subcategory: tpl.subcategory,
          name: tpl.name,
          brand: tpl.brand,
          colors: tpl.colors,
          style: tpl.style,
          seasons: tpl.seasons,
          occasions: tpl.occasions,
          tags: tpl.tags,
          wearCount,
          lastWorn,
          isFavorite,
          notes: wearCount > 20 ? "高频穿着单品" : wearCount === 0 ? "新入手还没穿过" : null,
        },
      });
      userClothings.push(clothing);
      wardrobeItemsCreated++;
    }
    userClothingMap.set(user.id, userClothings);
  }
  console.log(`    + ${wardrobeItemsCreated} 件衣橱单品`);

  // ===== Section 3: Outfit + OutfitItem =====
  console.log("\n  [3/7] 创建穿搭组合...");
  let outfitsCreated = 0;
  let outfitItemsCreated = 0;
  const outfitMap = new Map<string, any[]>();
  const outfitUserEntries = allUserEntries.slice(0, 10);

  for (let idx = 0; idx < outfitUserEntries.length; idx++) {
    const [email, user] = outfitUserEntries[idx];
    const isMale = user.gender === "male";
    const clothingItems = userClothingMap.get(user.id) || [];
    if (clothingItems.length < 2) continue;

    const outfitCount = randomInt(2, 4);
    const namePool = isMale ? MALE_OUTFIT_NAMES : FEMALE_OUTFIT_NAMES;
    const descPool = isMale ? MALE_OUTFIT_DESCS : FEMALE_OUTFIT_DESCS;
    const userOutfits: any[] = [];

    for (let i = 0; i < outfitCount; i++) {
      const outfitName = namePool[(idx * 3 + i) % namePool.length];
      const outfitDesc = descPool[(idx * 2 + i) % descPool.length];
      const existing = await prisma.outfit.findFirst({
        where: { userId: user.id, name: outfitName },
      });
      if (existing) {
        userOutfits.push(existing);
        continue;
      }

      const itemCount = randomInt(2, Math.min(5, clothingItems.length));
      const shuffledItems = [...clothingItems].sort(() => Math.random() - 0.5);
      const selectedItems = shuffledItems.slice(0, itemCount);
      const categories = selectedItems.map((item: any) => item.category);
      const hasTop = categories.includes("tops") || categories.includes("dresses");
      const hasBottom = categories.includes("bottoms") || categories.includes("dresses");
      if (!hasTop || !hasBottom) continue;

      const wearCount = randomInt(0, 15);
      const isFavorite = Math.random() < 0.3;
      const rating = wearCount > 5 ? 3.5 + Math.random() * 1.5 : 2.5 + Math.random() * 2.0;

      const outfit = await prisma.outfit.create({
        data: {
          userId: user.id,
          name: outfitName,
          description: outfitDesc,
          coverImage: generatePicsumUrl(`outfit-${user.id.slice(0, 8)}-${i}`, 800, 800),
          occasions: selectedItems
            .flatMap((item: any) => item.occasions)
            .filter((v: string, j: number, a: string[]) => a.indexOf(v) === j)
            .slice(0, 3),
          seasons: selectedItems
            .flatMap((item: any) => item.seasons)
            .filter((v: string, j: number, a: string[]) => a.indexOf(v) === j)
            .slice(0, 3),
          style: isMale ? "商务休闲" : "优雅通勤",
          wearCount,
          lastWorn: wearCount > 0 ? randomDate(thirtyDaysAgo, now) : null,
          isFavorite,
          rating: Math.round(rating * 10) / 10,
          notes: isFavorite ? "最喜欢的穿搭之一" : null,
        },
      });

      for (let j = 0; j < selectedItems.length; j++) {
        await prisma.outfitItem.create({
          data: {
            outfitId: outfit.id,
            clothingId: selectedItems[j].id,
            positionX: 0.2 + (j % 3) * 0.3,
            positionY: 0.3 + Math.floor(j / 3) * 0.3,
            width: 0.25,
            height: 0.25,
            rotation: 0,
            zIndex: j,
          },
        });
        outfitItemsCreated++;
      }
      userOutfits.push(outfit);
      outfitsCreated++;
    }
    outfitMap.set(user.id, userOutfits);
  }
  console.log(`    + ${outfitsCreated} 套穿搭组合, ${outfitItemsCreated} 个穿搭单品`);

  // ===== Section 4: WardrobeCollection + WardrobeCollectionItem =====
  console.log("\n  [4/7] 创建灵感收藏集...");
  let collectionsCreated = 0;
  let collectionItemsCreated = 0;
  const collectionUserEntries = allUserEntries.slice(0, 10);
  const existingPosts = await prisma.communityPost.findMany({ take: 30 });
  const postIds = existingPosts.map((p: any) => p.id);

  for (const [email, user] of collectionUserEntries) {
    const userOutfits = outfitMap.get(user.id) || [];
    const collectionDefs = [
      { name: "全部收藏", icon: "heart", isDefault: true },
      { name: "秋冬灵感", icon: "leaf", isDefault: false },
      { name: "通勤必备", icon: "briefcase", isDefault: false },
    ];

    for (let i = 0; i < collectionDefs.length; i++) {
      const def = collectionDefs[i];
      const existing = await prisma.wardrobeCollection.findFirst({
        where: { userId: user.id, name: def.name },
      });
      if (existing) continue;

      const collection = await prisma.wardrobeCollection.create({
        data: {
          userId: user.id,
          name: def.name,
          icon: def.icon,
          coverImage: generatePicsumUrl(`collection-${user.id.slice(0, 8)}-${i}`, 400, 400),
          sortOrder: i,
          isDefault: def.isDefault,
        },
      });
      collectionsCreated++;

      const itemCount = randomInt(3, 8);
      const itemTypes: CollectionItemType[] = ["post", "outfit", "try_on"];
      for (let j = 0; j < itemCount; j++) {
        const itemType = itemTypes[j % itemTypes.length];
        let itemId: string | null = null;
        if (itemType === "post" && postIds.length > 0) itemId = postIds[j % postIds.length];
        else if (itemType === "outfit" && userOutfits.length > 0)
          itemId = userOutfits[j % userOutfits.length].id;
        if (!itemId) continue;

        const existingItem = await prisma.wardrobeCollectionItem.findFirst({
          where: { collectionId: collection.id, itemType, itemId },
        });
        if (existingItem) continue;

        await prisma.wardrobeCollectionItem.create({
          data: { collectionId: collection.id, userId: user.id, itemType, itemId, sortOrder: j },
        });
        collectionItemsCreated++;
      }
    }
  }
  console.log(`    + ${collectionsCreated} 个收藏集, ${collectionItemsCreated} 个收藏项`);

  // ===== Section 5: VirtualTryOn records =====
  console.log("\n  [5/7] 创建虚拟试衣记录...");
  let tryOnsCreated = 0;
  const existingPhotos = await prisma.userPhoto.findMany({ take: 50 });
  const existingClothingItems = await prisma.clothingItem.findMany({ take: 50 });
  const clothingItemIds = existingClothingItems.map((item: any) => item.id);
  const tryOnUserEntries = allUserEntries.slice(0, 8);
  const tryOnCategories = ["tops", "bottoms", "dresses", "outerwear"];
  const tryOnScenes = ["日常", "通勤", "约会", "度假", "派对", "运动"];

  for (const [email, user] of tryOnUserEntries) {
    const userPhotos = existingPhotos.filter((p: any) => p.userId === user.id);
    if (userPhotos.length === 0 || clothingItemIds.length === 0) continue;
    const tryOnCount = randomInt(3, 8);

    for (let i = 0; i < tryOnCount; i++) {
      const photo = userPhotos[i % userPhotos.length];
      const itemId = clothingItemIds[i % clothingItemIds.length];
      const category = tryOnCategories[i % tryOnCategories.length];
      const scene = tryOnScenes[i % tryOnScenes.length];

      const existing = await prisma.virtualTryOn.findFirst({
        where: { userId: user.id, photoId: photo.id, itemId },
      });
      if (existing) continue;

      const statusRoll = Math.random();
      let status: TryOnStatus;
      let resultImageUrl: string | null = null;
      let processingTime: number | null = null;
      let confidence: number | null = null;
      let completedAt: Date | null = null;

      if (statusRoll < 0.75) {
        status = "completed" as TryOnStatus;
        resultImageUrl = generatePicsumUrl(`tryon-${user.id.slice(0, 8)}-${i}`, 600, 900);
        processingTime = parseFloat((2 + Math.random() * 6).toFixed(1));
        confidence = parseFloat((0.7 + Math.random() * 0.25).toFixed(2));
        completedAt = randomDate(thirtyDaysAgo, now);
      } else if (statusRoll < 0.9) {
        status = "pending" as TryOnStatus;
      } else {
        status = "failed" as TryOnStatus;
        processingTime = parseFloat((1 + Math.random() * 3).toFixed(1));
      }

      await prisma.virtualTryOn.create({
        data: {
          userId: user.id,
          photoId: photo.id,
          itemId,
          resultImageUrl,
          status,
          provider: "glm",
          processingTime,
          confidence,
          category,
          scene,
          createdAt: randomDate(ninetyDaysAgo, now),
          completedAt,
        },
      });
      tryOnsCreated++;
    }
  }
  console.log(`    + ${tryOnsCreated} 条试衣记录`);

  // ===== Section 6: UserFollow relationships =====
  console.log("\n  [6/7] 创建用户关注关系...");
  let followsCreated = 0;
  const followCounts = new Map<string, { followers: number; following: number }>();
  for (const userId of allUserIds) followCounts.set(userId, { followers: 0, following: 0 });

  for (let i = 0; i < allUserIds.length; i++) {
    const followerId = allUserIds[i];
    const followCount = randomInt(2, 8);
    const candidates = allUserIds.filter((id: string) => id !== followerId);
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    const toFollow = shuffled.slice(0, followCount);

    for (const followingId of toFollow) {
      const existing = await prisma.userFollow.findUnique({
        where: { followerId_followingId: { followerId, followingId } },
      });
      if (existing) continue;

      await prisma.userFollow.create({
        data: { followerId, followingId, createdAt: randomDate(ninetyDaysAgo, now) },
      });
      followCounts.get(followerId)!.following++;
      followCounts.get(followingId)!.followers++;
      followsCreated++;
    }
  }

  for (const [userId, counts] of followCounts) {
    if (counts.followers > 0 || counts.following > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { followerCount: counts.followers, followingCount: counts.following },
      });
    }
  }
  console.log(`    + ${followsCreated} 条关注关系`);

  // ===== Section 7: PostBookmark records =====
  console.log("\n  [7/7] 创建帖子收藏记录...");
  let bookmarksCreated = 0;
  if (postIds.length > 0) {
    const bookmarkUserEntries = allUserEntries.slice(0, 15);
    for (const [email, user] of bookmarkUserEntries) {
      const bookmarkCount = randomInt(1, 5);
      const shuffledPosts = [...postIds].sort(() => Math.random() - 0.5);
      const toBookmark = shuffledPosts.slice(0, bookmarkCount);
      for (const postId of toBookmark) {
        const existing = await prisma.postBookmark.findUnique({
          where: { userId_postId: { userId: user.id, postId } },
        });
        if (existing) continue;
        await prisma.postBookmark.create({
          data: { userId: user.id, postId, createdAt: randomDate(thirtyDaysAgo, now) },
        });
        bookmarksCreated++;
      }
    }
  }
  console.log(`    + ${bookmarksCreated} 条帖子收藏`);

  console.log("\n" + "-".repeat(60));
  console.log("  扩展数据填充完成 (Part 1)");
  console.log("-".repeat(60));
  console.log(`  新用户: ${newUsersCreated}`);
  console.log(`  衣橱单品: ${wardrobeItemsCreated}`);
  console.log(`  穿搭组合: ${outfitsCreated} (${outfitItemsCreated} 个单品)`);
  console.log(`  收藏集: ${collectionsCreated} (${collectionItemsCreated} 个收藏项)`);
  console.log(`  虚拟试衣: ${tryOnsCreated}`);
  console.log(`  关注关系: ${followsCreated}`);
  console.log(`  帖子收藏: ${bookmarksCreated}`);
}
