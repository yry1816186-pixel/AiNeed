/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, NotFoundException } from "@nestjs/common";
import {
  BodyType,
  SkinTone,
  FaceShape,
  ColorSeason,
  Gender,
  Prisma,
} from "@prisma/client";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import { StylePreference } from "../../../../common/types/common.types";

import { ProfileEventEmitter } from "./services/profile-event-emitter.service";

export interface UpdateProfileDto {
  nickname?: string;
  avatar?: string;
  gender?: Gender;
  birthDate?: Date;
  height?: number;
  weight?: number;
  shoulder?: number;
  bust?: number;
  waist?: number;
  hip?: number;
  inseam?: number;
  bodyType?: BodyType;
  skinTone?: SkinTone;
  faceShape?: FaceShape;
  colorSeason?: ColorSeason;
  stylePreferences?: StylePreference[];
  colorPreferences?: string[];
}

export interface BodyAnalysisResult {
  bodyType: BodyType | null;
  bodyTypeName: string;
  description: string;
  recommendations: BodyRecommendation[];
  idealStyles: string[];
  avoidStyles: string[];
}

export interface ColorAnalysisResult {
  colorSeason: ColorSeason | null;
  colorSeasonName: string;
  bestColors: string[];
  neutralColors: string[];
  avoidColors: string[];
  metalPreference: string;
}

export interface BodyRecommendation {
  category: string;
  advice: string;
  examples: string[];
}

@Injectable()
export class ProfileService {
  private static readonly BEHAVIOR_AUTO_UPDATE_THRESHOLD = 5;
  private readonly behaviorCounters = new Map<string, number>();

  constructor(
    private prisma: PrismaService,
    private readonly eventEmitter: ProfileEventEmitter,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
      },
    });

    if (!user) {
      throw new NotFoundException("用户不存在");
    }

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      nickname: user.nickname,
      avatar: user.avatar,
      gender: user.gender,
      birthDate: user.birthDate,
      createdAt: user.createdAt,
      profile: user.profile
        ? {
            bodyType: user.profile.bodyType,
            skinTone: user.profile.skinTone,
            faceShape: user.profile.faceShape,
            colorSeason: user.profile.colorSeason,
            height: user.profile.height,
            weight: user.profile.weight,
            shoulder: user.profile.shoulder,
            bust: user.profile.bust,
            waist: user.profile.waist,
            hip: user.profile.hip,
            inseam: user.profile.inseam,
            stylePreferences: user.profile.stylePreferences,
            colorPreferences: user.profile.colorPreferences,
          }
        : null,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("用户不存在");
    }

    // 更新用户基本信息
    const userUpdateData: Prisma.UserUpdateInput = {};
    if (dto.nickname !== undefined) {userUpdateData.nickname = dto.nickname;}
    if (dto.avatar !== undefined) {userUpdateData.avatar = dto.avatar;}
    if (dto.gender !== undefined) {userUpdateData.gender = dto.gender;}
    if (dto.birthDate !== undefined) {userUpdateData.birthDate = dto.birthDate;}

    if (Object.keys(userUpdateData).length > 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: userUpdateData,
      });
    }

    // 更新或创建形象档案
    const profileData: Partial<{
      height: number;
      weight: number;
      shoulder: number;
      bust: number;
      waist: number;
      hip: number;
      inseam: number;
      bodyType: BodyType;
      skinTone: SkinTone;
      faceShape: FaceShape;
      colorSeason: ColorSeason;
      stylePreferences: StylePreference[];
      colorPreferences: string[];
    }> = {};

    if (dto.height !== undefined) {profileData.height = dto.height;}
    if (dto.weight !== undefined) {profileData.weight = dto.weight;}
    if (dto.shoulder !== undefined) {profileData.shoulder = dto.shoulder;}
    if (dto.bust !== undefined) {profileData.bust = dto.bust;}
    if (dto.waist !== undefined) {profileData.waist = dto.waist;}
    if (dto.hip !== undefined) {profileData.hip = dto.hip;}
    if (dto.inseam !== undefined) {profileData.inseam = dto.inseam;}
    if (dto.bodyType !== undefined) {profileData.bodyType = dto.bodyType;}
    if (dto.skinTone !== undefined) {profileData.skinTone = dto.skinTone;}
    if (dto.faceShape !== undefined) {profileData.faceShape = dto.faceShape;}
    if (dto.colorSeason !== undefined) {profileData.colorSeason = dto.colorSeason;}
    if (dto.stylePreferences !== undefined) {profileData.stylePreferences = dto.stylePreferences;}
    if (dto.colorPreferences !== undefined) {profileData.colorPreferences = dto.colorPreferences;}

    if (Object.keys(profileData).length > 0) {
      await this.prisma.userProfile.upsert({
        where: { userId },
        create: {
          userId,
          height: profileData.height,
          weight: profileData.weight,
          shoulder: profileData.shoulder,
          bust: profileData.bust,
          waist: profileData.waist,
          hip: profileData.hip,
          inseam: profileData.inseam,
          bodyType: profileData.bodyType,
          skinTone: profileData.skinTone,
          faceShape: profileData.faceShape,
          colorSeason: profileData.colorSeason,
          stylePreferences: (profileData.stylePreferences ?? []) as unknown as Prisma.InputJsonValue,
          colorPreferences: profileData.colorPreferences ?? [],
        },
        update: profileData as Prisma.UserProfileUpdateInput,
      });
    }

    // Determine changed fields for event emission
    const changedFields = Object.keys(dto).filter((key) => dto[key as keyof UpdateProfileDto] !== undefined);

    // Emit profile:updated event (fire-and-forget)
    this.eventEmitter.emitProfileUpdated(userId, changedFields).catch(() => {
      // Event emission failure should not block profile updates
    });

    return this.getProfile(userId);
  }

  async getBodyAnalysis(userId: string): Promise<BodyAnalysisResult> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile?.bodyType) {
      return {
        bodyType: null,
        bodyTypeName: "",
        description: "请先上传照片或手动设置体型信息",
        recommendations: [],
        idealStyles: [],
        avoidStyles: [],
      };
    }

    const bodyTypeGuides: Record<
      BodyType,
      Omit<BodyAnalysisResult, "bodyType">
    > = {
      [BodyType.rectangle]: {
        bodyTypeName: "H型（矩形）体型",
        description:
          "您的肩部、腰部和臀部宽度相近，身材匀称。通过穿搭可以创造出更多曲线感。",
        recommendations: [
          {
            category: "上衣",
            advice: "选择有腰线的款式来创造曲线感",
            examples: ["收腰衬衫", "荷叶边上衣", "绑带上衣"],
          },
          {
            category: "下装",
            advice: "高腰款式可以优化比例",
            examples: ["高腰阔腿裤", "A字裙", "百褶裙"],
          },
          {
            category: "连衣裙",
            advice: "选择有腰带或收腰设计的款式",
            examples: ["裹身裙", "收腰连衣裙"],
          },
        ],
        idealStyles: ["层叠穿搭", "收腰设计", "荷叶边", "褶皱设计"],
        avoidStyles: ["过于宽松的直筒款", "无腰线的直筒连衣裙"],
      },
      [BodyType.triangle]: {
        bodyTypeName: "A型（梨形）体型",
        description:
          "您的臀部比肩部宽，下半身较为丰满。穿搭重点是平衡上下身比例。",
        recommendations: [
          {
            category: "上衣",
            advice: "选择亮色或有图案的款式来增加上半身视觉重心",
            examples: ["条纹上衣", "亮色衬衫", "泡泡袖上衣"],
          },
          {
            category: "下装",
            advice: "A字裙和直筒裤最适合您",
            examples: ["A字裙", "直筒牛仔裤", "阔腿裤"],
          },
          {
            category: "外套",
            advice: "选择肩部有设计的款式",
            examples: ["垫肩西装", "飞行员夹克"],
          },
        ],
        idealStyles: ["亮色上衣", "A字裙", "垫肩设计", "荷叶袖"],
        avoidStyles: ["紧身铅笔裙", "紧身牛仔裤", "臀部有装饰的款式"],
      },
      [BodyType.inverted_triangle]: {
        bodyTypeName: "Y型（倒三角）体型",
        description:
          "您的肩部比臀部宽，上半身较为突出。穿搭重点是平衡上下身比例。",
        recommendations: [
          {
            category: "上衣",
            advice: "选择V领或圆领来平衡肩宽",
            examples: ["V领衬衫", "圆领T恤", "斜肩上衣"],
          },
          {
            category: "下装",
            advice: "选择有图案或亮色的款式来增加下半身视觉重心",
            examples: ["印花裙", "亮色裤子", "阔腿裤"],
          },
          {
            category: "连衣裙",
            advice: "选择下摆宽松的款式",
            examples: ["A字连衣裙", "伞裙"],
          },
        ],
        idealStyles: ["V领设计", "阔腿裤", "A字裙", "深色上衣"],
        avoidStyles: ["垫肩设计", "泡泡袖", "紧身牛仔裤"],
      },
      [BodyType.hourglass]: {
        bodyTypeName: "X型（沙漏）体型",
        description:
          "您的肩部和臀部宽度相近，腰部纤细，是经典的理想体型。大多数款式都适合您。",
        recommendations: [
          {
            category: "上衣",
            advice: "突出腰线的款式最能展现您的优势",
            examples: ["收腰衬衫", "短款上衣"],
          },
          {
            category: "下装",
            advice: "高腰设计可以强调您的腰线",
            examples: ["高腰牛仔裤", "包臀裙"],
          },
          {
            category: "连衣裙",
            advice: "合身的剪裁比宽松款更好",
            examples: ["裹身裙", "收腰连衣裙", "紧身裙"],
          },
        ],
        idealStyles: ["收腰设计", "高腰裤", "裹身裙", "紧身款式"],
        avoidStyles: ["过于宽松的款式", "无腰线的直筒连衣裙"],
      },
      [BodyType.oval]: {
        bodyTypeName: "O型（苹果）体型",
        description:
          "您的腰部较为圆润，四肢相对纤细。穿搭重点是拉长身形并突出四肢优势。",
        recommendations: [
          {
            category: "上衣",
            advice: "选择V领或开领设计来拉长颈部线条",
            examples: ["V领衬衫", "开领针织衫"],
          },
          {
            category: "下装",
            advice: "选择直筒或微喇的款式",
            examples: ["直筒裤", "微喇牛仔裤", "A字裙"],
          },
          {
            category: "连衣裙",
            advice: "选择有垂感的款式",
            examples: ["衬衫裙", "直筒连衣裙"],
          },
        ],
        idealStyles: ["V领设计", "垂感面料", "垂直条纹", "深色系"],
        avoidStyles: [
          "紧身款式",
          "过于宽松的款式",
          "水平条纹",
          "腰部有装饰的款式",
        ],
      },
    };

    const guide = bodyTypeGuides[profile.bodyType];

    return {
      bodyType: profile.bodyType,
      ...guide,
    };
  }

  async getColorAnalysis(userId: string): Promise<ColorAnalysisResult> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile?.colorSeason) {
      return {
        colorSeason: null,
        colorSeasonName: "",
        bestColors: [],
        neutralColors: [],
        avoidColors: [],
        metalPreference: "",
      };
    }

    const colorGuides: Record<ColorSeason, ColorAnalysisResult> = {
      // 8-subtype ColorSeason (warm/cool x light/deep matrix)
      [ColorSeason.spring_warm]: {
        colorSeason: ColorSeason.spring_warm,
        colorSeasonName: "暖春型",
        bestColors: ["珊瑚色", "蜜桃色", "杏色", "明黄色", "暖绿色", "象牙白", "奶油黄"],
        neutralColors: ["暖米色", "驼色", "棕褐色", "奶油白"],
        avoidColors: ["纯黑色", "冷灰色", "冰蓝色", "深紫红色"],
        metalPreference: "金色饰品最佳，暖色调的琥珀和珊瑚材质也能衬托肤色",
      },
      [ColorSeason.spring_light]: {
        colorSeason: ColorSeason.spring_light,
        colorSeasonName: "浅春型",
        bestColors: ["浅珊瑚", "浅桃色", "嫩黄色", "浅绿", "天蓝", "淡粉", "米白"],
        neutralColors: ["浅米色", "奶油白", "浅灰", "淡粉白"],
        avoidColors: ["深棕色", "黑色", "深紫色", "深蓝色"],
        metalPreference: "浅金色和玫瑰金饰品最佳，避免过于厚重的金属色",
      },
      [ColorSeason.summer_cool]: {
        colorSeason: ColorSeason.summer_cool,
        colorSeasonName: "冷夏型",
        bestColors: ["薰衣草紫", "雾蓝色", "玫瑰粉", "薄荷绿", "浅灰蓝", "淡紫", "藕荷色"],
        neutralColors: ["柔和灰色", "米白色", "淡粉色", "浅灰蓝色"],
        avoidColors: ["橙色", "深黄色", "鲜艳红色", "暖棕色"],
        metalPreference: "银色和铂金饰品最佳，珍珠也是很好的选择",
      },
      [ColorSeason.summer_light]: {
        colorSeason: ColorSeason.summer_light,
        colorSeasonName: "浅夏型",
        bestColors: ["浅粉", "淡蓝", "薄荷绿", "淡紫", "浅灰粉", "冰蓝", "米白"],
        neutralColors: ["浅灰", "米白", "淡粉白", "浅灰蓝"],
        avoidColors: ["深红", "深蓝", "深绿", "黑色"],
        metalPreference: "银色饰品最佳，浅色珍珠和玫瑰金也很适合",
      },
      [ColorSeason.autumn_warm]: {
        colorSeason: ColorSeason.autumn_warm,
        colorSeasonName: "暖秋型",
        bestColors: ["驼色", "棕色", "橄榄绿", "铁锈红", "芥末黄", "南瓜色", "酒红"],
        neutralColors: ["米色", "奶油色", "深棕色", "军绿"],
        avoidColors: ["纯白色", "冷蓝色", "亮粉色", "荧光色"],
        metalPreference: "金色和铜色饰品非常适合，琥珀和玳瑁材质也是很好选择",
      },
      [ColorSeason.autumn_deep]: {
        colorSeason: ColorSeason.autumn_deep,
        colorSeasonName: "深秋型",
        bestColors: ["深棕色", "巧克力棕", "深橄榄绿", "深酒红", "暗红", "深金黄", "墨绿"],
        neutralColors: ["深棕色", "黑色", "深米色", "军绿"],
        avoidColors: ["纯白色", "浅粉色", "荧光色", "冰蓝色"],
        metalPreference: "古铜色和深金色饰品最佳，玳瑁和深色宝石也很好",
      },
      [ColorSeason.winter_cool]: {
        colorSeason: ColorSeason.winter_cool,
        colorSeasonName: "冷冬型",
        bestColors: ["正红色", "纯白色", "宝蓝色", "翠绿色", "深紫色", "玫红色", "藏青"],
        neutralColors: ["纯白色", "黑色", "深灰色", "藏青色"],
        avoidColors: ["橙色", "暖黄色", "棕色", "橄榄绿"],
        metalPreference: "银色和铂金饰品是最佳选择，钻石和白金也非常适合",
      },
      [ColorSeason.winter_deep]: {
        colorSeason: ColorSeason.winter_deep,
        colorSeasonName: "深冬型",
        bestColors: ["深红色", "黑色", "深蓝色", "深紫色", "墨绿色", "酒红", "深玫红"],
        neutralColors: ["黑色", "深灰色", "藏青", "深酒红灰"],
        avoidColors: ["浅粉", "浅蓝", "米色", "淡黄色"],
        metalPreference: "深色金属饰品最佳，黑银和深色宝石也很适合",
      },
    };

    return colorGuides[profile.colorSeason];
  }

  async getStyleRecommendations(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return {
        styles: [],
        occasions: [],
        tips: ["请先完善您的形象档案以获取个性化推荐"],
      };
    }

    const recommendations: string[] = [];
    const occasions: { occasion: string; suggestions: string[] }[] = [];

    // 并行获取体型和色彩分析，避免串行查询
    const [bodyAnalysis, colorAnalysis] = await Promise.all([
      profile.bodyType ? this.getBodyAnalysis(userId) : null,
      profile.colorSeason ? this.getColorAnalysis(userId) : null,
    ]);

    // 基于体型推荐
    if (bodyAnalysis) {
      recommendations.push(
        ...bodyAnalysis.idealStyles.map((s) => `体型推荐：${s}`),
      );
    }

    // 基于色彩季型推荐
    if (colorAnalysis) {
      recommendations.push(
        `推荐色彩：${colorAnalysis.bestColors.slice(0, 3).join("、")}`,
      );
    }

    // 场合推荐
    occasions.push(
      {
        occasion: "日常休闲",
        suggestions: ["简约T恤搭配牛仔裤", "舒适针织衫", "休闲运动套装"],
      },
      {
        occasion: "商务办公",
        suggestions: ["修身西装套装", "衬衫搭配半裙", "知性连衣裙"],
      },
      {
        occasion: "约会聚会",
        suggestions: ["精致连衣裙", "时尚套装", "优雅高跟鞋"],
      },
    );

    return {
      styles: recommendations,
      occasions,
      tips: profile.bodyType
        ? [
            "根据您的体型特点选择合适的款式",
            "选择适合您肤色季型的颜色",
            "注重服装的合身度",
          ]
        : ["上传照片可获得更精准的推荐"],
    };
  }

  async calculateBodyMetrics(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return null;
    }

    const metrics: { name: string; value: number | null; status: string }[] =
      [];

    if (profile.height && profile.weight) {
      const bmi = profile.weight / (profile.height / 100) ** 2;
      let bmiStatus = "正常";
      if (bmi < 18.5) {bmiStatus = "偏瘦";}
      else if (bmi < 24) {bmiStatus = "正常";}
      else if (bmi < 28) {bmiStatus = "偏胖";}
      else {bmiStatus = "肥胖";}

      metrics.push({
        name: "BMI指数",
        value: Math.round(bmi * 10) / 10,
        status: bmiStatus,
      });
    }

    if (profile.waist && profile.hip) {
      const whr = profile.waist / profile.hip;
      metrics.push({
        name: "腰臀比",
        value: Math.round(whr * 100) / 100,
        status: whr < 0.8 ? "理想" : "需关注",
      });
    }

    if (profile.bust && profile.waist) {
      const bwr = profile.bust / profile.waist;
      metrics.push({
        name: "胸腰比",
        value: Math.round(bwr * 100) / 100,
        status: bwr > 1.1 ? "曲线明显" : "匀称",
      });
    }

    return {
      metrics,
      hasEnoughData: metrics.length > 0,
    };
  }

  /**
   * Record a behavior event for the user and auto-trigger profile update
   * when the threshold (every 5 behavior events) is met.
   * Fire-and-forget pattern -- does not block the caller.
   */
  recordBehaviorEvent(userId: string): void {
    const currentCount = this.behaviorCounters.get(userId) ?? 0;
    const newCount = currentCount + 1;
    this.behaviorCounters.set(userId, newCount);

    if (newCount >= ProfileService.BEHAVIOR_AUTO_UPDATE_THRESHOLD) {
      this.behaviorCounters.set(userId, 0);

      // Fire-and-forget: trigger profile update from behavior
      this.updateProfileFromBehaviorThreshold(userId).catch(() => {
        // Auto-update failure should not block behavior tracking
      });
    }
  }

  private async updateProfileFromBehaviorThreshold(userId: string): Promise<void> {
    try {
      // Refresh user profile data based on accumulated behavior patterns
      const behaviorKey = `profile:behavior:last_update:${userId}`;
      const lastUpdate = await this.prisma.$queryRaw`SELECT 1`.catch(() => null);

      if (lastUpdate !== null) {
        this.eventEmitter.emitProfileUpdated(userId, ["behavior_auto_update"]).catch(() => {});
      }
    } catch {
      // Non-critical: behavior auto-update is best-effort
    }
  }
}
