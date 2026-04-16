/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from "@nestjs/common";

/**
 * 肤色色彩季节分析器
 * 基于肤色、发色、眼睛颜色确定最佳色彩季节
 */
@Injectable()
export class ColorSeasonAnalyzer {
  private readonly logger = new Logger(ColorSeasonAnalyzer.name);

  /**
   * 色彩季节定义
   */
  readonly colorSeasons = {
    spring: {
      name: "春季型",
      description: "暖调、明亮、清新的色彩",
      characteristics: [
        "暖调肤色",
        "明亮的眼睛",
        "金色或草莓金发色",
        "皮肤有红润感",
      ],
      bestColors: [
        "珊瑚色",
        "桃红",
        "杏色",
        "鹅黄",
        "草绿",
        "薄荷绿",
        "天蓝",
        "象牙白",
        "奶油色",
        "金棕色",
        "橘红",
      ],
      avoidColors: ["深紫", "深灰", "纯黑", "冷调蓝", "深酒红"],
      metals: ["黄金", "玫瑰金", "黄铜"],
      makeupStyle: ["清新自然", "元气少女", "温柔甜美"],
    },
    summer: {
      name: "夏季型",
      description: "冷调、柔和、优雅的色彩",
      characteristics: [
        "冷调肤色",
        "柔和的眼睛",
        "灰棕或深棕发色",
        "皮肤偏粉白",
      ],
      bestColors: [
        "玫瑰粉",
        "薰衣草",
        "雾霾蓝",
        "薄荷色",
        "浅灰",
        "银色",
        "淡紫",
        "蓝灰色",
        "冷粉色",
        "白色",
      ],
      avoidColors: ["橙色", "金黄色", "深棕色", "艳红色", "草绿"],
      metals: ["银色", "白金", "铂金"],
      makeupStyle: ["优雅知性", "冷淡风", "清新淡雅"],
    },
    autumn: {
      name: "秋季型",
      description: "暖调、深沉、大地色系",
      characteristics: [
        "暖调肤色",
        "深沉的眼睛",
        "红棕或深棕发色",
        "皮肤有金黄调",
      ],
      bestColors: [
        "砖红",
        "橘棕",
        "芥末黄",
        "橄榄绿",
        "驼色",
        "米色",
        "咖啡色",
        "铁锈红",
        "深绿",
        "古铜色",
      ],
      avoidColors: ["粉色", "亮蓝", "冷灰色", "荧光色", "纯白"],
      metals: ["黄金", "黄铜", "古铜"],
      makeupStyle: ["复古优雅", "大地色系", "成熟知性"],
    },
    winter: {
      name: "冬季型",
      description: "冷调、高对比、鲜明的色彩",
      characteristics: [
        "冷调肤色",
        "深邃的眼睛",
        "黑发或深棕发色",
        "皮肤白皙或深色",
      ],
      bestColors: [
        "正红",
        "纯黑",
        "纯白",
        "宝蓝",
        "深紫",
        "冰蓝",
        "翠绿",
        "洋红",
        "银色",
        "炭灰",
      ],
      avoidColors: ["橙色", "暖棕色", "浑浊色", "浅黄色", "米色"],
      metals: ["银色", "白金", "铂金"],
      makeupStyle: ["高级冷艳", "红唇经典", "酷飒风格"],
    },
  } as const;

  /**
   * 根据特征确定色彩季节
   */
  determineColorSeason(params: {
    skinTone: string;
    skinUndertone?: "warm" | "cool" | "neutral";
    hairColor?: string;
    eyeColor?: string;
    contrast?: "high" | "medium" | "low";
  }): string {
    const { skinTone, skinUndertone, hairColor, eyeColor, contrast } = params;

    // 基于肤色底色判断
    if (skinUndertone === "warm") {
      // 暖调：春季或秋季
      if (contrast === "high" || this.isBrightHairColor(hairColor)) {
        return "spring";
      }
      return "autumn";
    } else if (skinUndertone === "cool") {
      // 冷调：夏季或冬季
      if (contrast === "high" || this.isDarkHairColor(hairColor)) {
        return "winter";
      }
      return "summer";
    }

    // 基于肤色深浅判断
    const lightSkinTones = ["fair", "light", "porcelain"];
    const mediumSkinTones = ["medium", "olive"];
    const darkSkinTones = ["tan", "dark", "deep"];

    if (lightSkinTones.includes(skinTone)) {
      // 浅肤色
      if (this.isDarkHairColor(hairColor)) {
        return "winter"; // 高对比
      }
      return this.isWarmHairColor(hairColor) ? "spring" : "summer";
    } else if (darkSkinTones.includes(skinTone)) {
      // 深肤色
      if (this.isWarmHairColor(hairColor)) {
        return "autumn";
      }
      return "winter";
    } else {
      // 中等肤色
      if (this.isWarmHairColor(hairColor)) {
        return "autumn";
      }
      return this.isDarkHairColor(hairColor) ? "winter" : "summer";
    }
  }

  /**
   * 获取色彩季节详情
   */
  getColorSeasonDetails(season: string) {
    return (
      this.colorSeasons[season as keyof typeof this.colorSeasons] ||
      this.colorSeasons.autumn
    );
  }

  /**
   * 获取最佳服装颜色
   */
  getBestClothingColors(season: string): string[] {
    const details = this.getColorSeasonDetails(season);
    return [...details.bestColors];
  }

  /**
   * 获取应避免的颜色
   */
  getAvoidColors(season: string): string[] {
    const details = this.getColorSeasonDetails(season);
    return [...details.avoidColors];
  }

  /**
   * 获取适合的金属色
   */
  getMetalPreferences(season: string): string[] {
    const details = this.getColorSeasonDetails(season);
    return [...details.metals];
  }

  /**
   * 获取妆容风格建议
   */
  getMakeupStyleSuggestions(season: string): string[] {
    const details = this.getColorSeasonDetails(season);
    return [...details.makeupStyle];
  }

  /**
   * 判断是否为浅色/亮色发色
   */
  private isBrightHairColor(hairColor?: string): boolean {
    if (!hairColor) {return false;}
    const brightColors = [
      "blonde",
      "golden",
      "strawberry",
      "light brown",
      "auburn",
    ];
    return brightColors.some((c) => hairColor.toLowerCase().includes(c));
  }

  /**
   * 判断是否为深色发色
   */
  private isDarkHairColor(hairColor?: string): boolean {
    if (!hairColor) {return false;}
    const darkColors = ["black", "dark brown", "dark", "brunette"];
    return darkColors.some((c) => hairColor.toLowerCase().includes(c));
  }

  /**
   * 判断是否为暖调发色
   */
  private isWarmHairColor(hairColor?: string): boolean {
    if (!hairColor) {return false;}
    const warmColors = [
      "red",
      "auburn",
      "golden",
      "copper",
      "strawberry",
      "chestnut",
    ];
    return warmColors.some((c) => hairColor.toLowerCase().includes(c));
  }

  /**
   * 生成色彩搭配方案
   */
  generateColorPalette(season: string): {
    primary: string[];
    secondary: string[];
    accent: string[];
    neutral: string[];
  } {
    const palettes = {
      spring: {
        primary: ["珊瑚色", "桃红", "鹅黄"],
        secondary: ["草绿", "天蓝", "杏色"],
        accent: ["橘红", "薄荷绿", "金棕色"],
        neutral: ["象牙白", "奶油色", "浅驼色"],
      },
      summer: {
        primary: ["玫瑰粉", "薰衣草", "雾霾蓝"],
        secondary: ["薄荷色", "浅灰", "淡紫"],
        accent: ["蓝灰色", "冷粉色", "银色"],
        neutral: ["白色", "浅灰", "米白"],
      },
      autumn: {
        primary: ["砖红", "橘棕", "芥末黄"],
        secondary: ["橄榄绿", "驼色", "咖啡色"],
        accent: ["铁锈红", "深绿", "古铜色"],
        neutral: ["米色", "卡其色", "深棕"],
      },
      winter: {
        primary: ["正红", "宝蓝", "深紫"],
        secondary: ["纯黑", "纯白", "冰蓝"],
        accent: ["翠绿", "洋红", "银色"],
        neutral: ["炭灰", "深灰", "纯白"],
      },
    };

    return palettes[season as keyof typeof palettes] || palettes.autumn;
  }
}
