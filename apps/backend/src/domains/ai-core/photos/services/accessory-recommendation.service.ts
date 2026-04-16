/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from "@nestjs/common";
import { BodyType, FaceShape, SkinTone, UserProfile } from "@prisma/client";

export interface AccessoryRecommendation {
  category: string;
  suggestions: string[];
  reason: string;
}

@Injectable()
export class AccessoryRecommendationService {
  /**
   * 配饰推荐
   */
  async recommendAccessories(
    profile: Partial<UserProfile>,
  ): Promise<AccessoryRecommendation[]> {
    const recommendations: AccessoryRecommendation[] = [];

    // 基于脸型推荐眼镜
    if (profile.faceShape) {
      recommendations.push({
        category: "眼镜",
        suggestions: this.getGlassesByFaceShape(profile.faceShape),
        reason: `适合${this.getFaceShapeName(profile.faceShape)}脸型`,
      });
    }

    // 基于体型推荐包
    if (profile.bodyType && profile.height) {
      recommendations.push({
        category: "包包",
        suggestions: this.getBagByBodyType(profile.bodyType, profile.height),
        reason: `适合${this.getBodyTypeName(profile.bodyType)}体型`,
      });
    }

    // 基于肤色推荐首饰颜色
    if (profile.skinTone) {
      recommendations.push({
        category: "首饰",
        suggestions: this.getJewelryBySkinTone(profile.skinTone),
        reason: `适合${this.getSkinToneName(profile.skinTone)}肤色`,
      });
    }

    // 基于身高推荐围巾
    if (profile.height) {
      recommendations.push({
        category: "围巾",
        suggestions: this.getScarfByHeight(profile.height),
        reason: `适合身高${profile.height}cm`,
      });
    }

    return recommendations;
  }

  private getGlassesByFaceShape(shape: FaceShape): string[] {
    const glassesMap: Record<FaceShape, string[]> = {
      oval: ["飞行员款", "方形框", "圆形框", "猫眼款"],
      round: ["方形框", "猫眼款", "角形框", "宽框"],
      square: ["圆形框", "椭圆形", "飞行员款", "柔和线条"],
      heart: ["底部加重款", "圆形框", "猫眼款", "窄框"],
      oblong: ["大框", "飞行员款", "圆形框", "宽框"],
      diamond: ["椭圆形", "猫眼款", "无框", "柔和线条"],
    };
    return glassesMap[shape] || glassesMap.oval;
  }

  private getBagByBodyType(bodyType: BodyType, height: number): string[] {
    const isShort = height < 160;
    const isTall = height > 170;

    const bags: string[] = [];

    // 根据身高
    if (isShort) {
      bags.push("斜挎小包", "链条包", "中等尺寸手提包");
    } else if (isTall) {
      bags.push("大号托特包", "肩背包", " oversized包");
    } else {
      bags.push("中等尺寸包", "斜挎包", "手提包");
    }

    // 根据体型
    if (bodyType === "hourglass") {
      bags.push("有结构感的包", "硬挺包款");
    } else if (bodyType === "rectangle") {
      bags.push("圆形包", "软塌塌的包");
    }

    return [...new Set(bags)];
  }

  private getJewelryBySkinTone(tone: SkinTone): string[] {
    const jewelryMap: Record<SkinTone, string[]> = {
      fair: ["银色", "白金", "玫瑰金", "珍珠"],
      light: ["银色", "玫瑰金", "淡金色", "珍珠"],
      medium: ["金色", "玫瑰金", "黄铜色", "暖色宝石"],
      olive: ["金色", "古铜色", "暖色宝石", "绿松石"],
      tan: ["金色", "古铜色", "深色宝石", "珊瑚色"],
      dark: ["金色", "古铜色", "大胆设计", "彩色宝石"],
    };
    return jewelryMap[tone] || jewelryMap.medium;
  }

  private getScarfByHeight(height: number): string[] {
    if (height < 160) {
      return ["小方巾", "窄围巾", "轻薄丝巾"];
    } else if (height > 170) {
      return ["大披肩", "长围巾", "厚重围巾"];
    }
    return ["中等尺寸围巾", "方巾", "长条围巾"];
  }

  private getFaceShapeName(shape: FaceShape): string {
    const names: Record<FaceShape, string> = {
      oval: "椭圆",
      round: "圆",
      square: "方",
      heart: "心形",
      oblong: "长",
      diamond: "菱形",
    };
    return names[shape];
  }

  private getBodyTypeName(type: BodyType): string {
    const names: Record<BodyType, string> = {
      rectangle: "H型",
      triangle: "A型",
      inverted_triangle: "Y型",
      hourglass: "X型",
      oval: "O型",
    };
    return names[type];
  }

  private getSkinToneName(tone: SkinTone): string {
    const names: Record<SkinTone, string> = {
      fair: "白皙",
      light: "浅色",
      medium: "中等",
      olive: "橄榄",
      tan: "小麦",
      dark: "深色",
    };
    return names[tone];
  }
}
