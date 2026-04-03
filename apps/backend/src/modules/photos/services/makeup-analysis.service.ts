import { Injectable } from "@nestjs/common";
import { SkinTone, ColorSeason } from "@prisma/client";

export interface MakeupRecommendation {
  foundation: string;
  blush: string[];
  lipstick: string[];
  eyeshadow: string[];
}

@Injectable()
export class MakeupAnalysisService {
  /**
   * 妆容推荐（基于肤色和色彩季节）
   */
  async recommendMakeup(
    skinTone: SkinTone,
    colorSeason: ColorSeason,
  ): Promise<MakeupRecommendation> {
    const colorPalettes: Record<ColorSeason, MakeupRecommendation> = {
      spring: {
        foundation: "暖调象牙白、杏色",
        blush: ["桃粉色", "珊瑚色", "杏色"],
        lipstick: ["珊瑚红", "桃红", "橘红", "暖粉色"],
        eyeshadow: ["金色", "棕色", "橙色系", "米色"],
      },
      summer: {
        foundation: "冷调粉白、淡粉色",
        blush: ["粉色", "玫瑰色", "薰衣草粉"],
        lipstick: ["玫瑰粉", "莓红", "淡紫色", "冷粉色"],
        eyeshadow: ["灰色", "蓝色", "紫色系", "银色"],
      },
      autumn: {
        foundation: "暖调米色、小麦色",
        blush: ["杏色", "砖红色", "古铜色"],
        lipstick: ["砖红", "棕红", "橘棕色", "赤陶色"],
        eyeshadow: ["棕色", "金色", "绿色系", "青铜色"],
      },
      winter: {
        foundation: "冷调瓷白、象牙白",
        blush: ["正红色", "深玫瑰", "浆果色"],
        lipstick: ["正红", "酒红", "紫红", "樱桃红"],
        eyeshadow: ["黑色", "银色", "蓝色系", "冰粉色"],
      },
    };

    return colorPalettes[colorSeason] || colorPalettes.spring;
  }

  /**
   * 获取适合的妆容风格
   */
  async getMakeupStyles(colorSeason: ColorSeason): Promise<string[]> {
    const styles: Record<ColorSeason, string[]> = {
      spring: ["清新自然", "元气少女", "温柔甜美", "阳光活力"],
      summer: ["优雅知性", "冷淡风", "清新淡雅", "浪漫柔和"],
      autumn: ["复古优雅", "大地色系", "成熟知性", "自然健康"],
      winter: ["高级冷艳", "红唇经典", "酷飒风格", "气场全开"],
    };

    return styles[colorSeason] || styles.spring;
  }
}
