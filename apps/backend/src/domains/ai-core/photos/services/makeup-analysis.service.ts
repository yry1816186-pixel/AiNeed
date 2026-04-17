/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from "@nestjs/common";
import { SkinTone, ColorSeason } from "../../../../types/prisma-enums";

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
      spring_warm: {
        foundation: "暖调象牙白、杏色",
        blush: ["桃粉色", "珊瑚色", "杏色"],
        lipstick: ["珊瑚红", "桃红", "橘红", "暖粉色"],
        eyeshadow: ["金色", "棕色", "橙色系", "米色"],
      },
      spring_light: {
        foundation: "暖调象牙白、杏色",
        blush: ["桃粉色", "珊瑚色", "杏色"],
        lipstick: ["珊瑚红", "桃红", "橘红", "暖粉色"],
        eyeshadow: ["金色", "棕色", "橙色系", "米色"],
      },
      summer_cool: {
        foundation: "冷调粉白、淡粉色",
        blush: ["粉色", "玫瑰色", "薰衣草粉"],
        lipstick: ["玫瑰粉", "莓红", "淡紫色", "冷粉色"],
        eyeshadow: ["灰色", "蓝色", "紫色系", "银色"],
      },
      summer_light: {
        foundation: "冷调粉白、淡粉色",
        blush: ["粉色", "玫瑰色", "薰衣草粉"],
        lipstick: ["玫瑰粉", "莓红", "淡紫色", "冷粉色"],
        eyeshadow: ["灰色", "蓝色", "紫色系", "银色"],
      },
      autumn_warm: {
        foundation: "暖调米色、小麦色",
        blush: ["杏色", "砖红色", "古铜色"],
        lipstick: ["砖红", "棕红", "橘棕色", "赤陶色"],
        eyeshadow: ["棕色", "金色", "绿色系", "青铜色"],
      },
      autumn_deep: {
        foundation: "暖调米色、小麦色",
        blush: ["杏色", "砖红色", "古铜色"],
        lipstick: ["砖红", "棕红", "橘棕色", "赤陶色"],
        eyeshadow: ["棕色", "金色", "绿色系", "青铜色"],
      },
      winter_cool: {
        foundation: "冷调瓷白、象牙白",
        blush: ["正红色", "深玫瑰", "浆果色"],
        lipstick: ["正红", "酒红", "紫红", "樱桃红"],
        eyeshadow: ["黑色", "银色", "蓝色系", "冰粉色"],
      },
      winter_deep: {
        foundation: "冷调瓷白、象牙白",
        blush: ["正红色", "深玫瑰", "浆果色"],
        lipstick: ["正红", "酒红", "紫红", "樱桃红"],
        eyeshadow: ["黑色", "银色", "蓝色系", "冰粉色"],
      },
    };

    return colorPalettes[colorSeason] ?? colorPalettes.spring_warm!;
  }

  /**
   * 获取适合的妆容风格
   */
  async getMakeupStyles(colorSeason: ColorSeason): Promise<string[]> {
    const styles: Record<ColorSeason, string[]> = {
      spring_warm: ["清新自然", "元气少女", "温柔甜美", "阳光活力"],
      spring_light: ["清新自然", "元气少女", "温柔甜美", "阳光活力"],
      summer_cool: ["优雅知性", "冷淡风", "清新淡雅", "浪漫柔和"],
      summer_light: ["优雅知性", "冷淡风", "清新淡雅", "浪漫柔和"],
      autumn_warm: ["复古优雅", "大地色系", "成熟知性", "自然健康"],
      autumn_deep: ["复古优雅", "大地色系", "成熟知性", "自然健康"],
      winter_cool: ["高级冷艳", "红唇经典", "酷飒风格", "气场全开"],
      winter_deep: ["高级冷艳", "红唇经典", "酷飒风格", "气场全开"],
    };

    return styles[colorSeason] ?? styles.spring_warm!;
  }
}
