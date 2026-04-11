import { Injectable, NotFoundException } from "@nestjs/common";
import {
  BodyType,
  SkinTone,
  FaceShape,
  ColorSeason,
  Gender,
  Prisma,
} from "@prisma/client";

import { PrismaService } from "../../common/prisma/prisma.service";
import { StylePreference } from "../../common/types/common.types";

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
  constructor(private prisma: PrismaService) {}

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

    if (dto.height !== undefined) profileData.height = dto.height;
    if (dto.weight !== undefined) profileData.weight = dto.weight;
    if (dto.shoulder !== undefined) profileData.shoulder = dto.shoulder;
    if (dto.bust !== undefined) profileData.bust = dto.bust;
    if (dto.waist !== undefined) profileData.waist = dto.waist;
    if (dto.hip !== undefined) profileData.hip = dto.hip;
    if (dto.inseam !== undefined) profileData.inseam = dto.inseam;
    if (dto.bodyType !== undefined) profileData.bodyType = dto.bodyType;
    if (dto.skinTone !== undefined) profileData.skinTone = dto.skinTone;
    if (dto.faceShape !== undefined) profileData.faceShape = dto.faceShape;
    if (dto.colorSeason !== undefined) profileData.colorSeason = dto.colorSeason;
    if (dto.stylePreferences !== undefined) profileData.stylePreferences = dto.stylePreferences;
    if (dto.colorPreferences !== undefined) profileData.colorPreferences = dto.colorPreferences;

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
      [ColorSeason.spring]: {
        colorSeason: ColorSeason.spring,
        colorSeasonName: "春季型",
        bestColors: [
          "珊瑚色",
          "桃色",
          "杏色",
          "暖黄色",
          "草绿色",
          "天蓝色",
          "象牙白",
        ],
        neutralColors: ["暖米色", "驼色", "棕褐色", "奶油白"],
        avoidColors: ["纯黑色", "冷灰色", "深紫红色", "冰蓝色"],
        metalPreference: "金色饰品比银色更适合您，暖色调的珠宝能衬托您的肤色",
      },
      [ColorSeason.summer]: {
        colorSeason: ColorSeason.summer,
        colorSeasonName: "夏季型",
        bestColors: [
          "粉色",
          "薰衣草色",
          "浅蓝色",
          "玫瑰色",
          "薄荷绿",
          "淡紫色",
          "雾蓝色",
        ],
        neutralColors: ["柔和灰色", "米白色", "淡粉色", "浅灰蓝色"],
        avoidColors: ["橙色", "深黄色", "鲜艳的红色", "暖棕色"],
        metalPreference: "银色饰品比金色更适合您，珍珠和玫瑰金也是很好的选择",
      },
      [ColorSeason.autumn]: {
        colorSeason: ColorSeason.autumn,
        colorSeasonName: "秋季型",
        bestColors: [
          "驼色",
          "棕色",
          "橄榄绿",
          "铁锈红",
          "芥末黄",
          "南瓜色",
          "酒红色",
        ],
        neutralColors: ["米色", "奶油色", "深棕色", "军绿色"],
        avoidColors: ["纯白色", "冷蓝色", "亮粉色", "荧光色"],
        metalPreference:
          "金色和铜色饰品非常适合您，琥珀和玳瑁材质也是很好的选择",
      },
      [ColorSeason.winter]: {
        colorSeason: ColorSeason.winter,
        colorSeasonName: "冬季型",
        bestColors: [
          "正红色",
          "纯白色",
          "黑色",
          "宝蓝色",
          "翠绿色",
          "深紫色",
          "玫红色",
        ],
        neutralColors: ["纯白色", "黑色", "深灰色", "藏青色"],
        avoidColors: ["橙色", "暖黄色", "棕色", "橄榄绿"],
        metalPreference: "银色饰品是您的最佳选择，钻石和白金也非常适合",
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
}
