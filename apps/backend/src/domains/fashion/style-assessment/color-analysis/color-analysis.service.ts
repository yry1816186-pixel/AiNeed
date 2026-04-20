import { Injectable } from "@nestjs/common";

export type SkinTone = "warm" | "cool" | "neutral";
export type ColorSeason = "spring" | "summer" | "autumn" | "winter";

export interface ColorAnalysisInput {
  skinTone: SkinTone;
  hairColor: string;
  eyeColor: string;
}

export interface ColorAnalysisResult {
  season: ColorSeason;
  subType: string;
  colorPalette: string[];
  description: string;
}

const LIGHT_HAIR_COLORS = new Set([
  "blonde",
  "light-blonde",
  "platinum",
  "ash-blonde",
  "strawberry-blonde",
  "light-brown",
  "golden-blonde",
  "honey-blonde",
  "浅金",
  "金色",
  "浅棕",
  "亚麻",
]);

const DARK_HAIR_COLORS = new Set([
  "black",
  "dark-brown",
  "brunette",
  "auburn",
  "deep-brown",
  "chestnut",
  "深棕",
  "黑色",
  "深褐",
  "栗色",
  "红棕",
]);

const LIGHT_EYE_COLORS = new Set([
  "blue",
  "green",
  "light-brown",
  "hazel",
  "grey",
  "amber",
  "蓝色",
  "绿色",
  "浅棕",
  "灰绿",
  "琥珀",
  "灰色",
]);

const DARK_EYE_COLORS = new Set([
  "dark-brown",
  "brown",
  "black",
  "deep-brown",
  "深棕",
  "棕色",
  "黑色",
  "深褐",
]);

const COLOR_PALETTES: Record<ColorSeason, string[]> = {
  spring: ["珊瑚粉", "奶油白", "鹅黄", "薄荷绿", "天蓝", "蜜桃色", "浅金", "杏色"],
  summer: ["薰衣草紫", "粉蓝", "灰粉", "薄荷蓝", "雾霾蓝", "浅紫", "玫瑰粉", "银灰"],
  autumn: ["砖红", "驼色", "橄榄绿", "焦糖色", "酒红", "咖啡棕", "芥末黄", "米色"],
  winter: ["纯白", "正红", "皇家蓝", "翡翠绿", "黑色", "深紫", "银色", "宝蓝"],
};

const SEASON_DESCRIPTIONS: Record<ColorSeason, string> = {
  spring: "你是春季型人，肤色温暖明亮，适合清新鲜艳的暖色调，整体穿搭应保持轻盈通透感",
  summer: "你是夏季型人，肤色柔和偏冷，适合低饱和度的冷色调，整体穿搭应营造柔和朦胧感",
  autumn: "你是秋季型人，肤色温暖浓郁，适合深沉饱满的暖色调，整体穿搭应展现沉稳厚重感",
  winter: "你是冬季型人，肤色冷冽分明，适合高对比度的冷色调，整体穿搭应呈现利落鲜明感",
};

const SUB_TYPE_NAMES: Record<string, string> = {
  "spring-light": "明亮春",
  "spring-warm": "温暖春",
  "summer-light": "柔和夏",
  "summer-cool": "清凉夏",
  "autumn-warm": "浓郁秋",
  "autumn-deep": "深沉秋",
  "winter-cool": "冷冽冬",
  "winter-deep": "鲜明冬",
};

@Injectable()
export class ColorAnalysisService {
  analyze(input: ColorAnalysisInput): ColorAnalysisResult {
    const { skinTone, hairColor, eyeColor } = input;

    const isLightHair = this.isLightFeature(hairColor, LIGHT_HAIR_COLORS, DARK_HAIR_COLORS);
    const isLightEye = this.isLightFeature(eyeColor, LIGHT_EYE_COLORS, DARK_EYE_COLORS);

    const lightnessScore = (isLightHair ? 1 : 0) + (isLightEye ? 1 : 0);
    const isLightDominant = lightnessScore >= 1;

    let season: ColorSeason;
    let subType: string;

    if (skinTone === "warm") {
      if (isLightDominant) {
        season = "spring";
        subType = isLightHair && isLightEye ? "spring-light" : "spring-warm";
      } else {
        season = "autumn";
        subType = !isLightHair && !isLightEye ? "autumn-deep" : "autumn-warm";
      }
    } else if (skinTone === "cool") {
      if (isLightDominant) {
        season = "summer";
        subType = isLightHair && isLightEye ? "summer-light" : "summer-cool";
      } else {
        season = "winter";
        subType = !isLightHair && !isLightEye ? "winter-deep" : "winter-cool";
      }
    } else {
      if (isLightDominant) {
        season = "spring";
        subType = "spring-warm";
      } else {
        season = "autumn";
        subType = "autumn-warm";
      }
    }

    const colorPalette = COLOR_PALETTES[season];
    const description = SEASON_DESCRIPTIONS[season];
    const subTypeName = SUB_TYPE_NAMES[subType] ?? subType;

    return {
      season,
      subType: subTypeName,
      colorPalette,
      description,
    };
  }

  private isLightFeature(value: string, lightSet: Set<string>, darkSet: Set<string>): boolean {
    const normalized = value.toLowerCase().trim();

    if (lightSet.has(normalized)) {
      return true;
    }

    if (darkSet.has(normalized)) {
      return false;
    }

    const lightKeywords = ["light", "浅", "金", "灰", "blonde"];
    const darkKeywords = ["dark", "deep", "深", "黑", "dark-brown"];

    for (const keyword of lightKeywords) {
      if (normalized.includes(keyword)) {
        return true;
      }
    }

    for (const keyword of darkKeywords) {
      if (normalized.includes(keyword)) {
        return false;
      }
    }

    return false;
  }
}
