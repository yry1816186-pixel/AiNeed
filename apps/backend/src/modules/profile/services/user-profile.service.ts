import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../common/prisma/prisma.service";
import { PrismaUpdateData } from "../../../common/types/common.types";
import { BehaviorTrackerService } from "../../analytics/services/behavior-tracker.service";
import {
  BodyImageAnalysisService,
  BodyType,
} from "../../photos/services/body-image-analysis.service";
import { SASRecService } from "../../recommendations/services/sasrec.service";

export interface UserBodyProfile {
  userId: string;
  bodyType: BodyType;
  measurements: {
    shoulderWidth: number;
    bustWidth: number;
    waistWidth: number;
    hipWidth: number;
    heightEstimate: number;
  };
  proportions: {
    shoulderToHip: number;
    waistToHip: number;
    waistToShoulder: number;
  };
  stylePreferences: string[];
  colorPreferences: string[];
  priceRange: {
    min: number | null;
    max: number | null;
  };
  updatedAt: Date;
}

export interface PersonalizedRecommendation {
  itemId: string;
  score: number;
  reasons: string[];
  bodyTypeMatch: boolean;
  styleMatch: boolean;
  priceMatch: boolean;
}

export interface UserProfileSummary {
  bodyProfile: UserBodyProfile | null;
  behaviorStats: {
    totalViews: number;
    totalLikes: number;
    totalPurchases: number;
    preferredCategories: string[];
    preferredBrands: string[];
  };
  recommendations: PersonalizedRecommendation[];
  preferences: {
    styles: Array<{ key: string; weight: number; trend: string }>;
    colors: Array<{ key: string; weight: number; trend: string }>;
    brands: Array<{ key: string; weight: number; trend: string }>;
    priceRange: {
      min: number | null;
      max: number | null;
      primaryRange: string;
    };
  };
}

export interface UpdateProfileDto {
  stylePreferences?: string[];
  colorPreferences?: string[];
  priceRangeMin?: number;
  priceRangeMax?: number;
  bodyType?: BodyType;
  height?: number;
  weight?: number;
}

@Injectable()
export class UserProfileService {
  private readonly logger = new Logger(UserProfileService.name);

  constructor(
    private prisma: PrismaService,
    private bodyAnalysisService: BodyImageAnalysisService,
    private sasrecService: SASRecService,
    private behaviorTracker: BehaviorTrackerService,
  ) {}

  async analyzeAndSaveBodyProfile(
    userId: string,
    image: Buffer,
    measurements?: {
      height?: number;
      weight?: number;
      shoulderWidth?: number;
      bustWidth?: number;
      waistWidth?: number;
      hipWidth?: number;
    },
  ): Promise<UserBodyProfile> {
    this.logger.log(`Analyzing body profile for user ${userId}`);

    const analysisResult = await this.bodyAnalysisService.analyzeBodyImage({
      image,
      userMeasurements: measurements,
    });

    const profile: UserBodyProfile = {
      userId,
      bodyType: analysisResult.bodyType,
      measurements: analysisResult.measurements,
      proportions: analysisResult.proportions,
      stylePreferences: [],
      colorPreferences: [],
      priceRange: {
        min: null,
        max: null,
      },
      updatedAt: new Date(),
    };

    await this.saveBodyProfile(userId, profile);

    this.logger.log(
      `Body profile saved for user ${userId}: ${analysisResult.bodyType}`,
    );

    return profile;
  }

  private async saveBodyProfile(
    userId: string,
    profile: UserBodyProfile,
  ): Promise<void> {
    await this.prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        bodyType: profile.bodyType,
        shoulder: profile.measurements.shoulderWidth,
        bust: profile.measurements.bustWidth,
        waist: profile.measurements.waistWidth,
        hip: profile.measurements.hipWidth,
        height: profile.measurements.heightEstimate,
        stylePreferences: profile.stylePreferences,
        colorPreferences: profile.colorPreferences,
        priceRangeMin: profile.priceRange.min,
        priceRangeMax: profile.priceRange.max,
      },
      update: {
        bodyType: profile.bodyType,
        shoulder: profile.measurements.shoulderWidth,
        bust: profile.measurements.bustWidth,
        waist: profile.measurements.waistWidth,
        hip: profile.measurements.hipWidth,
        height: profile.measurements.heightEstimate,
        stylePreferences: profile.stylePreferences,
        colorPreferences: profile.colorPreferences,
        priceRangeMin: profile.priceRange.min,
        priceRangeMax: profile.priceRange.max,
        updatedAt: new Date(),
      },
    });
  }

  async getBodyProfile(userId: string): Promise<UserBodyProfile | null> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) {return null;}

    return {
      userId: profile.userId,
      bodyType: (profile.bodyType as BodyType) || "rectangle",
      measurements: {
        shoulderWidth: profile.shoulder || 0,
        bustWidth: profile.bust || 0,
        waistWidth: profile.waist || 0,
        hipWidth: profile.hip || 0,
        heightEstimate: profile.height || 0,
      },
      proportions: {
        shoulderToHip:
          profile.shoulder && profile.hip ? profile.shoulder / profile.hip : 1,
        waistToHip:
          profile.waist && profile.hip ? profile.waist / profile.hip : 0.7,
        waistToShoulder:
          profile.waist && profile.shoulder
            ? profile.waist / profile.shoulder
            : 0.7,
      },
      stylePreferences: (profile.stylePreferences as string[]) || [],
      colorPreferences: (profile.colorPreferences as string[]) || [],
      priceRange: {
        min: profile.priceRangeMin,
        max: profile.priceRangeMax,
      },
      updatedAt: profile.updatedAt,
    };
  }

  async getPersonalizedRecommendations(
    userId: string,
    topK: number = 20,
  ): Promise<PersonalizedRecommendation[]> {
    const bodyProfile = await this.getBodyProfile(userId);
    const sequenceRecs = await this.sasrecService.getSequenceRecommendations(
      userId,
      topK * 2,
    );

    const itemIds = sequenceRecs.recommendations.map((rec) => rec.itemId);

    const items = await this.prisma.clothingItem.findMany({
      where: {
        id: { in: itemIds },
      },
      select: {
        id: true,
        category: true,
        tags: true,
        attributes: true,
        price: true,
        originalPrice: true,
      },
    });

    const itemMap = new Map(items.map((item) => [item.id, item]));

    const recommendations: PersonalizedRecommendation[] = [];

    for (const rec of sequenceRecs.recommendations) {
      const item = itemMap.get(rec.itemId);

      if (!item) {continue;}

      const { bodyTypeMatch, styleMatch, priceMatch, reasons } = this.evaluateItemMatch(
        item,
        bodyProfile,
      );

      recommendations.push({
        itemId: rec.itemId,
        score:
          rec.score * (bodyTypeMatch ? 1.2 : 1.0) * (styleMatch ? 1.1 : 1.0) * (priceMatch ? 1.05 : 1.0),
        reasons: [rec.reason, ...reasons].filter(Boolean),
        bodyTypeMatch,
        styleMatch,
        priceMatch,
      });
    }

    return recommendations.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  private evaluateItemMatch(
    item: {
      id: string;
      category: string;
      tags: string[];
      attributes: Prisma.JsonValue | null;
      price: Prisma.Decimal;
      originalPrice: Prisma.Decimal | null;
    },
    bodyProfile: UserBodyProfile | null,
  ): { bodyTypeMatch: boolean; styleMatch: boolean; priceMatch: boolean; reasons: string[] } {
    const reasons: string[] = [];
    let bodyTypeMatch = false;
    let styleMatch = false;
    let priceMatch = false;

    if (bodyProfile) {
      const bodyTypeRecommendations = this.getBodyTypeRecommendations(
        bodyProfile.bodyType,
      );

      const itemTags = item.tags || [];
      const suitableStyles = bodyTypeRecommendations.suitableStyles || [];

      const hasMatchingTag = itemTags.some((tag: string) =>
        suitableStyles.some(
          (style) => tag.includes(style) || style.includes(tag),
        ),
      );

      if (hasMatchingTag) {
        bodyTypeMatch = true;
        reasons.push(
          `适合您的${this.getBodyTypeName(bodyProfile.bodyType)}身材`,
        );
      }

      const avoidStyles = bodyTypeRecommendations.avoidStyles || [];
      const hasAvoidTag = itemTags.some((tag: string) =>
        avoidStyles.some((style) => tag.includes(style) || style.includes(tag)),
      );

      if (hasAvoidTag) {
        bodyTypeMatch = false;
      }
    }

    if (
      bodyProfile?.stylePreferences &&
      bodyProfile.stylePreferences.length > 0
    ) {
      const itemTags = item.tags || [];
      styleMatch = itemTags.some((tag: string) =>
        bodyProfile.stylePreferences.includes(tag),
      );

      if (styleMatch) {
        reasons.push("符合您的风格偏好");
      }
    }

    // 价格匹配检查
    if (bodyProfile?.priceRange) {
      const itemPrice = Number(item.price) || Number(item.originalPrice) || 0;
      const { min, max } = bodyProfile.priceRange;
      
      if (min !== null && max !== null) {
        if (itemPrice >= min && itemPrice <= max) {
          priceMatch = true;
          reasons.push("符合您的价格偏好");
        }
      } else if (min !== null && itemPrice >= min) {
        priceMatch = true;
        reasons.push("符合您的价格偏好");
      } else if (max !== null && itemPrice <= max) {
        priceMatch = true;
        reasons.push("符合您的价格偏好");
      }
    }

    return { bodyTypeMatch, styleMatch, priceMatch, reasons };
  }

  private getBodyTypeRecommendations(bodyType: BodyType): {
    suitableStyles: string[];
    avoidStyles: string[];
  } {
    const recommendations: Record<
      BodyType,
      { suitableStyles: string[]; avoidStyles: string[] }
    > = {
      rectangle: {
        suitableStyles: ["收腰", "V领", "A字", "高腰", "层次"],
        avoidStyles: ["直筒", "无腰身", "宽松"],
      },
      hourglass: {
        suitableStyles: ["收腰", "铅笔裙", "高腰", "裹身", "紧身"],
        avoidStyles: ["直筒", "宽松", "超大号"],
      },
      triangle: {
        suitableStyles: ["垫肩", "荷叶边", "亮色上衣", "A字", "阔腿"],
        avoidStyles: ["紧身裤", "短裙", "浅色下装", "包臀"],
      },
      inverted_triangle: {
        suitableStyles: ["V领", "深色上衣", "阔腿", "A字", "百褶"],
        avoidStyles: ["垫肩", "泡泡袖", "紧身", "亮色上衣"],
      },
      oval: {
        suitableStyles: ["V领", "深色", "直筒", "A字", "垂感"],
        avoidStyles: ["紧身", "亮色大面积", "横条纹", "腰部装饰"],
      },
    };

    return recommendations[bodyType] || recommendations.rectangle;
  }

  private getBodyTypeName(bodyType: BodyType): string {
    const names: Record<BodyType, string> = {
      rectangle: "矩形",
      hourglass: "沙漏型",
      triangle: "梨形",
      inverted_triangle: "倒三角",
      oval: "椭圆形",
    };
    return names[bodyType] || "标准";
  }

  async getUserProfileSummary(userId: string): Promise<UserProfileSummary> {
    const bodyProfile = await this.getBodyProfile(userId);

    const behaviors = await this.prisma.userBehavior.groupBy({
      by: ["type"],
      where: { userId },
      _count: true,
    });

    const behaviorStats = {
      totalViews: behaviors.find((b) => b.type === "view")?._count || 0,
      totalLikes: behaviors.find((b) => b.type === "like")?._count || 0,
      totalPurchases: behaviors.find((b) => b.type === "purchase")?._count || 0,
      preferredCategories: [],
      preferredBrands: [],
    };

    const recommendations = await this.getPersonalizedRecommendations(
      userId,
      10,
    );

    // 从行为追踪服务获取偏好数据
    let preferences: UserProfileSummary["preferences"] = {
      styles: [],
      colors: [],
      brands: [],
      priceRange: {
        min: bodyProfile?.priceRange.min ?? null,
        max: bodyProfile?.priceRange.max ?? null,
        primaryRange: "mid_range",
      },
    };

    try {
      const behaviorProfile = await this.behaviorTracker.getUserBehaviorProfile(userId);
      preferences = {
        styles: behaviorProfile.preferences.styles.slice(0, 10),
        colors: behaviorProfile.preferences.colors.slice(0, 10),
        brands: behaviorProfile.preferences.brands.slice(0, 10),
        priceRange: {
          min: bodyProfile?.priceRange.min ?? null,
          max: bodyProfile?.priceRange.max ?? null,
          primaryRange: this.getPriceRangeLabel(bodyProfile?.priceRange.min, bodyProfile?.priceRange.max),
        },
      };
    } catch (error) {
      this.logger.warn(`Failed to get behavior profile for user ${userId}: ${error}`);
    }

    return {
      bodyProfile,
      behaviorStats,
      recommendations,
      preferences,
    };
  }

  private getPriceRangeLabel(min: number | null | undefined, max: number | null | undefined): string {
    if (min === null && max === null) {
      return "未设置";
    }
    const maxVal = max ?? null;
    if (maxVal !== null && maxVal < 100) {
      return "预算型";
    }
    if (maxVal !== null && maxVal < 300) {
      return "平价";
    }
    if (maxVal !== null && maxVal < 800) {
      return "中档";
    }
    if (maxVal !== null && maxVal < 2000) {
      return "高档";
    }
    if (maxVal !== null && maxVal < 5000) {
      return "奢侈";
    }
    return "超奢侈";
  }

  async updateStylePreferences(
    userId: string,
    preferences: string[],
  ): Promise<void> {
    await this.prisma.userProfile.update({
      where: { userId },
      data: {
        stylePreferences: preferences,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Updated style preferences for user ${userId}`);
  }

  async updateColorPreferences(
    userId: string,
    preferences: string[],
  ): Promise<void> {
    await this.prisma.userProfile.update({
      where: { userId },
      data: {
        colorPreferences: preferences,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Updated color preferences for user ${userId}`);
  }

  async updatePriceRange(
    userId: string,
    min: number | null,
    max: number | null,
  ): Promise<void> {
    await this.prisma.userProfile.update({
      where: { userId },
      data: {
        priceRangeMin: min,
        priceRangeMax: max,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Updated price range for user ${userId}: ${min}-${max}`);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<UserBodyProfile | null> {
    const updateData: Prisma.UserProfileUpdateInput = { updatedAt: new Date() };

    if (dto.stylePreferences !== undefined) {
      updateData.stylePreferences = dto.stylePreferences;
    }
    if (dto.colorPreferences !== undefined) {
      updateData.colorPreferences = dto.colorPreferences;
    }
    if (dto.priceRangeMin !== undefined) {
      updateData.priceRangeMin = dto.priceRangeMin;
    }
    if (dto.priceRangeMax !== undefined) {
      updateData.priceRangeMax = dto.priceRangeMax;
    }
    if (dto.bodyType !== undefined) {
      updateData.bodyType = dto.bodyType;
    }
    if (dto.height !== undefined) {
      updateData.height = dto.height;
    }
    if (dto.weight !== undefined) {
      updateData.weight = dto.weight;
    }

    await this.prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        stylePreferences: dto.stylePreferences ?? [],
        colorPreferences: dto.colorPreferences ?? [],
        priceRangeMin: dto.priceRangeMin ?? null,
        priceRangeMax: dto.priceRangeMax ?? null,
        bodyType: dto.bodyType ?? "rectangle",
        height: dto.height ?? null,
        weight: dto.weight ?? null,
      },
      update: updateData,
    });

    this.logger.log(`Updated profile for user ${userId}`);
    return this.getBodyProfile(userId);
  }

  /**
   * 从用户行为自动更新画像
   * 基于用户的历史行为数据推断偏好
   */
  async updateProfileFromBehavior(userId: string): Promise<void> {
    try {
      const behaviorProfile = await this.behaviorTracker.getUserBehaviorProfile(userId);
      
      // 从行为偏好中提取风格偏好
      const stylePrefs = behaviorProfile.preferences.styles
        .filter(s => s.weight > 0.3)
        .map(s => s.key);
      
      // 从行为偏好中提取颜色偏好
      const colorPrefs = behaviorProfile.preferences.colors
        .filter(c => c.weight > 0.3)
        .map(c => c.key);

      // 更新画像
      if (stylePrefs.length > 0 || colorPrefs.length > 0) {
        await this.prisma.userProfile.upsert({
          where: { userId },
          create: {
            userId,
            stylePreferences: stylePrefs,
            colorPreferences: colorPrefs,
          },
          update: {
            stylePreferences: stylePrefs.length > 0 ? stylePrefs : undefined,
            colorPreferences: colorPrefs.length > 0 ? colorPrefs : undefined,
            updatedAt: new Date(),
          },
        });

        this.logger.log(`Auto-updated profile from behavior for user ${userId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to update profile from behavior: ${error}`);
    }
  }
}
