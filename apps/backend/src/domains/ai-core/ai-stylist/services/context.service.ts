/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from "@nestjs/common";
import { PhotoType } from "../../../../types/prisma-enums";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import type {
  StylistContext,
  StylistSlots,
  StylistBodyProfile,
} from "../types";

import type { StylistSession, StylistContextInternal } from "./session.service";

const VALID_OCCASIONS = [
  "interview",
  "work",
  "date",
  "travel",
  "party",
  "daily",
  "campus",
] as const;
const VALID_STYLES = [
  "极简",
  "韩系",
  "法式",
  "日系",
  "轻正式",
  "街头",
  "运动",
  "复古",
] as const;
const VALID_FIT_GOALS = [
  "显高",
  "显瘦",
  "修饰胯部",
  "平衡肩线",
  "利落专业",
  "减龄",
  "提气色",
] as const;

type ValidOccasion = (typeof VALID_OCCASIONS)[number];
type ValidStyle = (typeof VALID_STYLES)[number];
type ValidFitGoal = (typeof VALID_FIT_GOALS)[number];

const COLOR_KEYWORDS = [
  "白色", "黑色", "灰色", "蓝色", "米色",
  "卡其", "粉色", "绿色", "酒红",
];

@Injectable()
export class AiStylistContextService {
  private readonly logger = new Logger(AiStylistContextService.name);

  constructor(private prisma: PrismaService) {}

  async buildUserContext(userId: string): Promise<StylistContextInternal> {
    const [profile, preferences, recentBehaviors] = await Promise.all([
      this.prisma.userProfile
        .findUnique({
          where: { userId },
          select: {
            bodyType: true,
            skinTone: true,
            faceShape: true,
            colorSeason: true,
            height: true,
            weight: true,
            stylePreferences: true,
          },
        })
        .catch(() => null),
      this.prisma.userPreferenceWeight
        .findMany({
          where: { userId },
          orderBy: { updatedAt: "desc" },
          take: 20,
          select: {
            category: true,
            key: true,
            weight: true,
          },
        })
        .catch(() => []),
      this.prisma.userBehaviorEvent
        .findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            eventType: true,
            metadata: true,
          },
        })
        .catch(() => []),
    ]);

    return {
      userProfile: profile
        ? {
            bodyType: profile.bodyType ?? undefined,
            skinTone: profile.skinTone ?? undefined,
            faceShape: profile.faceShape ?? undefined,
            colorSeason: profile.colorSeason ?? undefined,
            height: profile.height ?? undefined,
            weight: profile.weight ?? undefined,
            stylePreferences: Array.isArray(profile.stylePreferences)
              ? (profile.stylePreferences as Array<{ name?: string } | string>)
              : undefined,
          }
        : null,
      preferences: (preferences as Array<{
        category: string | null;
        key: string | null;
        weight: number;
      }>).reduce(
        (acc: Record<string, Record<string, number>>, preference) => {
          const category = preference.category;
          const key = preference.key;
          if (!category || !key) {
            return acc;
          }
          if (!acc[category]) {
            acc[category] = {};
          }
          const bucket = acc[category];
          if (!bucket) {
            return acc;
          }
          bucket[key] = preference.weight;
          return acc;
        },
        {} as Record<string, Record<string, number>>,
      ),
      recentBehaviors: recentBehaviors.map(
        (behavior: { eventType: string; metadata: unknown }) => ({
          type: behavior.eventType,
          data: behavior.metadata,
        }),
      ),
    };
  }

  async syncPhotoAnalysis(session: StylistSession): Promise<void> {
    if (!session.state.lastPhotoId) {
      return;
    }

    const photo = await this.prisma.userPhoto.findFirst({
      where: {
        id: session.state.lastPhotoId,
        userId: session.userId,
      },
      select: {
        analysisStatus: true,
        analysisResult: true,
      },
    });

    if (!photo) {
      return;
    }

    session.state.lastPhotoStatus = photo.analysisStatus;
    if (
      photo.analysisStatus === "completed" &&
      photo.analysisResult &&
      typeof photo.analysisResult === "object"
    ) {
      const analysisResult = photo.analysisResult as Record<string, unknown>;
      session.state.bodyProfile = {
        ...session.state.bodyProfile,
        bodyType:
          typeof analysisResult.bodyType === "string"
            ? analysisResult.bodyType
            : session.state.bodyProfile.bodyType,
        skinTone:
          typeof analysisResult.skinTone === "string"
            ? analysisResult.skinTone
            : session.state.bodyProfile.skinTone,
        faceShape:
          typeof analysisResult.faceShape === "string"
            ? analysisResult.faceShape
            : session.state.bodyProfile.faceShape,
        colorSeason:
          typeof analysisResult.colorSeason === "string"
            ? analysisResult.colorSeason
            : session.state.bodyProfile.colorSeason,
        shapeFeatures: this.deduplicateStrings([
          ...session.state.bodyProfile.shapeFeatures,
          ...(typeof analysisResult.bodyType === "string"
            ? [analysisResult.bodyType]
            : []),
        ]),
      };
      session.state.bodyReady = this.hasBodyProfile(session.state.bodyProfile);
      if (session.state.bodyReady) {
        session.state.currentStage = "ready_to_resolve";
      }
    }
  }

  getInitialPreferredStyles(context: StylistContextInternal): string[] {
    const profileStyles = Array.isArray(context.userProfile?.stylePreferences)
      ? context.userProfile?.stylePreferences || []
      : [];
    const normalizedProfileStyles = profileStyles
      .map((item) => (typeof item === "string" ? item : item?.name || ""))
      .map((value) => this.normalizeStyle(value))
      .filter((value): value is string => Boolean(value));

    const weightedStyles = Object.entries(context.preferences?.style || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => this.normalizeStyle(name))
      .filter((value): value is string => Boolean(value));

    return this.deduplicateStrings([
      ...normalizedProfileStyles,
      ...weightedStyles,
    ]);
  }

  extractSlotUpdates(message: string): Partial<StylistSlots> {
    const slotUpdates: Partial<StylistSlots> = {};
    const occasion = this.extractOccasion(message);
    const preferredStyles = this.extractStyles(message);
    const fitGoals = this.extractFitGoals(message);
    const preferredColors = this.extractColors(message);
    const budget = this.extractBudget(message);
    const styleAvoidances = this.extractStyleAvoidances(message);

    if (occasion && this.isValidOccasion(occasion)) {
      slotUpdates.occasion = occasion;
    }
    if (preferredStyles.length > 0) {
      slotUpdates.preferredStyles = this.filterValidStyles(preferredStyles);
    }
    if (fitGoals.length > 0) {
      slotUpdates.fitGoals = this.filterValidFitGoals(fitGoals);
    }
    if (preferredColors.length > 0) {
      slotUpdates.preferredColors = preferredColors;
    }
    if (styleAvoidances.length > 0) {
      slotUpdates.styleAvoidances = this.filterValidStyles(styleAvoidances);
    }
    if (budget.min !== undefined && budget.min >= 0) {
      slotUpdates.budgetMin = budget.min;
    }
    if (budget.max !== undefined && budget.max >= 0) {
      slotUpdates.budgetMax = budget.max;
    }

    return slotUpdates;
  }

  mergeSlots(current: StylistSlots, updates: Partial<StylistSlots>): void {
    if (updates.occasion) {
      current.occasion = updates.occasion;
    }
    if (updates.weather) {
      current.weather = updates.weather;
    }
    if (updates.budgetMin !== undefined) {
      current.budgetMin = updates.budgetMin;
    }
    if (updates.budgetMax !== undefined) {
      current.budgetMax = updates.budgetMax;
    }
    if (updates.preferredStyles?.length) {
      current.preferredStyles = this.deduplicateStrings([
        ...current.preferredStyles,
        ...updates.preferredStyles,
      ]);
    }
    if (updates.styleAvoidances?.length) {
      current.styleAvoidances = this.deduplicateStrings([
        ...current.styleAvoidances,
        ...updates.styleAvoidances,
      ]);
    }
    if (updates.fitGoals?.length) {
      current.fitGoals = this.deduplicateStrings([
        ...current.fitGoals,
        ...updates.fitGoals,
      ]);
    }
    if (updates.preferredColors?.length) {
      current.preferredColors = this.deduplicateStrings([
        ...current.preferredColors,
        ...updates.preferredColors,
      ]);
    }
  }

  deriveOrchestration(session: StylistSession): {
    nextAction: import("../types").StylistAction;
    missingFields: string[];
  } {
    const { slots, bodyProfile, photoSkipped, lastPhotoStatus } = session.state;
    const missingFields: string[] = [];

    session.state.sceneReady = Boolean(slots.occasion);
    session.state.styleReady = slots.preferredStyles.length > 0;
    session.state.bodyReady = this.hasBodyProfile(bodyProfile);

    if (session.result) {
      session.state.currentStage = "resolved";
      return {
        nextAction: { type: "show_outfit_cards" },
        missingFields,
      };
    }

    if (lastPhotoStatus === "processing" || lastPhotoStatus === "pending") {
      session.state.currentStage = "analysis_pending";
      return {
        nextAction: { type: "poll_analysis" },
        missingFields,
      };
    }

    if (!slots.occasion) {
      missingFields.push("occasion");
      session.state.currentStage = "collecting_scene";
      return {
        nextAction: {
          type: "ask_question",
          field: "occasion",
          options: ["通勤", "约会", "面试", "出游"],
        },
        missingFields,
      };
    }

    if (slots.preferredStyles.length === 0) {
      missingFields.push("style_preferences");
      session.state.currentStage = "collecting_style";
      return {
        nextAction: {
          type: "show_preference_buttons",
          options: ["极简", "韩系", "法式", "轻正式"],
        },
        missingFields,
      };
    }

    const shouldRequestPhoto =
      !photoSkipped &&
      !session.state.bodyReady &&
      this.needsPhotoForPrecision(session);
    if (shouldRequestPhoto) {
      missingFields.push("body_profile");
      session.state.currentStage = "awaiting_photo";
      session.state.photoRequested = true;
      return {
        nextAction: {
          type: "request_photo_upload",
          canSkip: true,
          photoType: PhotoType.full_body,
        },
        missingFields,
      };
    }

    session.state.currentStage = "ready_to_resolve";
    return {
      nextAction: { type: "generate_outfit" },
      missingFields,
    };
  }

  hasBodyProfile(profile?: StylistBodyProfile | null): boolean {
    return Boolean(
      profile?.bodyType || profile?.colorSeason || profile?.skinTone,
    );
  }

  normalizeOccasion(value: string): string {
    return this.extractOccasion(value) || value;
  }

  normalizeStyle(value: string): string | undefined {
    const normalized = value.trim().toLowerCase();
    const styleMap: Record<string, string> = {
      极简: "极简",
      minimalist: "极简",
      casual: "休闲",
      smart_casual: "轻正式",
      韩系: "韩系",
      korean: "韩系",
      法式: "法式",
      french: "法式",
      streetwear: "街头",
      运动: "运动",
      sporty: "运动",
    };

    return styleMap[value] || styleMap[normalized] || value.trim() || undefined;
  }

  getOccasionName(occasion?: string): string {
    const names: Record<string, string> = {
      interview: "面试",
      work: "通勤",
      date: "约会",
      travel: "出游",
      party: "聚会",
      daily: "日常",
      campus: "校园",
    };
    return occasion ? names[occasion] || occasion : "";
  }

  getBodyTypeName(type: string): string {
    const names: Record<string, string> = {
      rectangle: "H 型体型",
      triangle: "A 型体型",
      inverted_triangle: "Y 型体型",
      hourglass: "X 型体型",
      oval: "O 型体型",
    };
    return names[type] || type;
  }

  getColorSeasonName(season: string): string {
    const names: Record<string, string> = {
      spring: "春季型",
      summer: "夏季型",
      autumn: "秋季型",
      winter: "冬季型",
    };
    return names[season] || season;
  }

  private isValidOccasion(occasion: string): occasion is ValidOccasion {
    return VALID_OCCASIONS.includes(occasion as ValidOccasion);
  }

  private filterValidStyles(styles: string[]): string[] {
    return styles.filter((style) => VALID_STYLES.includes(style as ValidStyle));
  }

  private filterValidFitGoals(goals: string[]): string[] {
    return goals.filter((goal) =>
      VALID_FIT_GOALS.includes(goal as ValidFitGoal),
    );
  }

  private extractOccasion(message: string): string | undefined {
    const source = message.toLowerCase();
    const occasionMap: Array<[string, string]> = [
      ["面试", "interview"],
      ["求职", "interview"],
      ["职场", "work"],
      ["上班", "work"],
      ["通勤", "work"],
      ["约会", "date"],
      ["相亲", "date"],
      ["旅行", "travel"],
      ["出游", "travel"],
      ["旅游", "travel"],
      ["聚会", "party"],
      ["派对", "party"],
      ["逛街", "daily"],
      ["日常", "daily"],
      ["校园", "campus"],
      ["上学", "campus"],
    ];

    for (const [keyword, occasion] of occasionMap) {
      if (source.includes(keyword)) {
        return occasion;
      }
    }
    return undefined;
  }

  private extractStyles(message: string): string[] {
    const styleMap: Array<[string, string]> = [
      ["极简", "极简"],
      ["minimal", "极简"],
      ["韩系", "韩系"],
      ["法式", "法式"],
      ["日系", "日系"],
      ["轻正式", "轻正式"],
      ["通勤", "轻正式"],
      ["街头", "街头"],
      ["运动", "运动"],
      ["复古", "复古"],
    ];

    const normalized = message.toLowerCase();
    return this.deduplicateStrings(
      styleMap
        .filter(([keyword]) => normalized.includes(keyword.toLowerCase()))
        .map(([, value]) => value),
    );
  }

  private extractFitGoals(message: string): string[] {
    const goalMap: Array<[string, string]> = [
      ["显高", "显高"],
      ["拉长比例", "显高"],
      ["显瘦", "显瘦"],
      ["遮肉", "显瘦"],
      ["遮胯", "修饰胯部"],
      ["修肩", "平衡肩线"],
      ["利落", "利落专业"],
      ["正式", "利落专业"],
      ["减龄", "减龄"],
      ["提气色", "提气色"],
    ];

    const normalized = message.toLowerCase();
    return this.deduplicateStrings(
      goalMap
        .filter(([keyword]) => normalized.includes(keyword.toLowerCase()))
        .map(([, value]) => value),
    );
  }

  private extractColors(message: string): string[] {
    return COLOR_KEYWORDS.filter((color) => message.includes(color));
  }

  private extractStyleAvoidances(message: string): string[] {
    const avoidances: string[] = [];

    if (message.includes("不要太甜") || message.includes("别太甜")) {
      avoidances.push("甜美");
    }
    if (message.includes("不要太正式") || message.includes("别太正式")) {
      avoidances.push("正式");
    }
    if (message.includes("不要太成熟") || message.includes("别太成熟")) {
      avoidances.push("成熟");
    }

    return avoidances;
  }

  private extractBudget(message: string): {
    min?: number;
    max?: number;
  } {
    const rangeMatch = message.match(/(\d{2,5})\s*(?:-|~|到|至)\s*(\d{2,5})/);
    if (rangeMatch) {
      const min = Number(rangeMatch[1]);
      const max = Number(rangeMatch[2]);
      return {
        min: Math.min(min, max),
        max: Math.max(min, max),
      };
    }

    const underMatch = message.match(
      /(\d{2,5})\s*(?:元|块|rmb)?\s*(?:以内|以下)/i,
    );
    if (underMatch) {
      return { max: Number(underMatch[1]) };
    }

    const aroundMatch = message.match(
      /(\d{2,5})\s*(?:元|块|rmb)?\s*(?:左右|上下)/i,
    );
    if (aroundMatch) {
      const center = Number(aroundMatch[1]);
      return {
        min: Math.max(center - 200, 0),
        max: center + 200,
      };
    }

    return {};
  }

  private needsPhotoForPrecision(session: StylistSession): boolean {
    const { fitGoals, occasion } = session.state.slots;
    return fitGoals.length > 0 || occasion === "interview";
  }

  deduplicateStrings(values: string[]): string[] {
    return [...new Set(values.filter(Boolean))];
  }
}
