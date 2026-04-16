import { Injectable, Logger } from "@nestjs/common";

import { PrismaService } from "../../../common/prisma/prisma.service";

import { ConsultantMatchRequestDto, MatchResultDto } from "./dto";

/** 四维匹配权重配置 */
const MATCH_WEIGHTS = {
  profile: 0.30,
  keywords: 0.25,
  specialty: 0.25,
  location: 0.20,
} as const;

/** 匹配理由文案映射 */
const MATCH_REASONS = {
  profile: "擅长你的体型与风格",
  keywords: "符合你的需求关键词",
  specialty: "专长领域匹配",
  location: "距离最近",
  topRated: "评分最高",
} as const;

/** 服务类型到关键词的映射 */
const SERVICE_TYPE_KEYWORDS: Record<string, string[]> = {
  styling_consultation: ["整体造型", "形象设计", "穿搭"],
  wardrobe_audit: ["衣橱管理", "整理", "搭配"],
  shopping_companion: ["购物", "陪购", "选品"],
  color_analysis: ["色彩", "色彩诊断", "配色"],
  special_event: ["场合", "活动", "婚礼", "面试"],
};

@Injectable()
export class ConsultantMatchingService {
  private readonly logger = new Logger(ConsultantMatchingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 根据用户需求智能匹配最合适的造型顾问
   * @param userId 当前用户ID
   * @param dto 匹配请求参数
   * @returns 按匹配度降序排列的顾问列表（最多5个）
   */
  async findMatches(userId: string, dto: ConsultantMatchRequestDto): Promise<MatchResultDto[]> {
    const consultants = await this.prisma.consultantProfile.findMany({
      where: { status: "active" },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
        _count: { select: { bookings: true } },
      },
    });

    if (consultants.length === 0) {
      return [];
    }

    const userProfile = await this.getUserProfile(userId);

    const scored = consultants.map((consultant) => {
      const scores = {
        profile: this.calcProfileScore(userProfile, consultant),
        keywords: this.calcKeywordScore(dto, consultant),
        specialty: this.calcSpecialtyScore(dto, consultant),
        location: this.calcLocationScore(userProfile, consultant),
      };

      const totalScore =
        scores.profile * MATCH_WEIGHTS.profile +
        scores.keywords * MATCH_WEIGHTS.keywords +
        scores.specialty * MATCH_WEIGHTS.specialty +
        scores.location * MATCH_WEIGHTS.location;

      const matchPercentage = Math.round(totalScore * 100);
      const matchReasons = this.buildMatchReasons(scores, consultant);

      return {
        consultantId: consultant.id,
        studioName: consultant.studioName,
        avatar: consultant.avatar,
        specialties: (consultant.specialties as string[]) || [],
        rating: Number(consultant.rating),
        reviewCount: consultant.reviewCount,
        matchPercentage: Math.min(matchPercentage, 99),
        matchReasons,
      } as MatchResultDto;
    });

    scored.sort((a, b) => b.matchPercentage - a.matchPercentage);
    return scored.slice(0, 5);
  }

  /**
   * 获取用户画像（含风格偏好）
   * UserProfile.stylePreferences (Json) 存储风格偏好
   * StyleProfile 通过 userId 关联到 User
   */
  private async getUserProfile(userId: string) {
    const [profile, styleProfiles] = await Promise.all([
      this.prisma.userProfile.findUnique({ where: { userId } }),
      this.prisma.styleProfile.findMany({
        where: { userId, isActive: true },
        select: { keywords: true, occasion: true },
      }),
    ]);
    return { profile, styleProfiles };
  }

  /**
   * 画像维度评分：用户风格偏好与顾问专长的重叠度
   * 权重 30%
   */
  private calcProfileScore(
    userProfile: { profile: Record<string, unknown> | null; styleProfiles: Array<Record<string, unknown>> } | null,
    consultant: Record<string, unknown>,
  ): number {
    if (!userProfile?.styleProfiles || userProfile.styleProfiles.length === 0) {return 0.5;}
    const specialties = (consultant.specialties as string[]) || [];
    // 收集用户所有活跃风格的关键词
    const userKeywords = userProfile.styleProfiles.flatMap(
      (sp) => (sp.keywords as string[]) || [],
    );
    if (userKeywords.length === 0) {return 0.5;}
    const overlap = userKeywords.filter((s: string) =>
      specialties.some((sp: string) => sp.includes(s) || s.includes(sp)),
    );
    return overlap.length / Math.max(userKeywords.length, 1);
  }

  /**
   * 关键词维度评分：需求描述与顾问专长的匹配度
   * 权重 25%
   */
  private calcKeywordScore(dto: ConsultantMatchRequestDto, consultant: Record<string, unknown>): number {
    if (!dto.notes) {return 0.5;}
    const specialties = (consultant.specialties as string[]) || [];
    const keywords = dto.notes.split(/[,，\s]+/).filter(Boolean);
    if (keywords.length === 0) {return 0.5;}
    const matches = keywords.filter((kw) =>
      specialties.some((sp: string) => sp.includes(kw) || kw.includes(sp)),
    );
    return matches.length / Math.max(keywords.length, 1);
  }

  /**
   * 专长维度评分：服务类型与顾问专长的匹配度
   * 权重 25%
   */
  private calcSpecialtyScore(dto: ConsultantMatchRequestDto, consultant: Record<string, unknown>): number {
    const specialties = (consultant.specialties as string[]) || [];
    const targetKeywords = SERVICE_TYPE_KEYWORDS[dto.serviceType] || [];
    if (targetKeywords.length === 0) {return 0.5;}
    const matches = targetKeywords.filter((kw) =>
      specialties.some((sp: string) => sp.includes(kw)),
    );
    return matches.length / targetKeywords.length;
  }

  /**
   * 位置维度评分：同城优先
   * 权重 20%
   */
  private calcLocationScore(
    userProfile: { profile: Record<string, unknown> | null; styleProfiles: Array<Record<string, unknown>> } | null,
    consultant: Record<string, unknown>,
  ): number {
    const userLocation = userProfile?.profile?.location;
    if (!userLocation || !consultant.location) {return 0.5;}
    return userLocation === consultant.location ? 1.0 : 0.3;
  }

  /**
   * 根据各维度分数生成匹配理由
   * 最多返回3条理由
   */
  private buildMatchReasons(scores: Record<string, number>, consultant: Record<string, unknown>): string[] {
    const reasons: string[] = [];
    if ((scores.profile ?? 0) >= 0.6) {reasons.push(MATCH_REASONS.profile);}
    if ((scores.keywords ?? 0) >= 0.6) {reasons.push(MATCH_REASONS.keywords);}
    if ((scores.specialty ?? 0) >= 0.6) {reasons.push(MATCH_REASONS.specialty);}
    if ((scores.location ?? 0) >= 0.8) {reasons.push(MATCH_REASONS.location);}
    if (Number(consultant.rating) >= 4.5) {reasons.push(MATCH_REASONS.topRated);}
    if (reasons.length === 0) {reasons.push(MATCH_REASONS.specialty);}
    return reasons.slice(0, 3);
  }
}
