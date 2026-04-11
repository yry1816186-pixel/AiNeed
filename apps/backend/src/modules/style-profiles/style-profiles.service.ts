import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";

import { PrismaService } from "../../common/prisma/prisma.service";
import { BehaviorTrackerService } from "../analytics/services/behavior-tracker.service";

export interface CreateStyleProfileDto {
  name: string;
  occasion: string;
  description: string;
  keywords: string[];
  palette: string[];
  confidence?: number;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface UpdateStyleProfileDto {
  name?: string;
  occasion?: string;
  description?: string;
  keywords?: string[];
  palette?: string[];
  confidence?: number;
  isDefault?: boolean;
  isActive?: boolean;
}

@Injectable()
export class StyleProfilesService {
  private readonly logger = new Logger(StyleProfilesService.name);

  constructor(
    private prisma: PrismaService,
    private behaviorTracker: BehaviorTrackerService,
  ) {}

  async findAll(userId: string) {
    return this.prisma.styleProfile.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });
  }

  async findOne(userId: string, id: string) {
    const profile = await this.prisma.styleProfile.findFirst({
      where: { id, userId },
    });

    if (!profile) {
      throw new NotFoundException("风格档案不存在");
    }

    return profile;
  }

  async create(userId: string, dto: CreateStyleProfileDto) {
    if (dto.isDefault) {
      await this.prisma.styleProfile.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Enrich with behavior-derived style insights
    const enriched = await this.enrichFromBehavior(userId, dto.keywords, dto.palette);

    return this.prisma.styleProfile.create({
      data: {
        userId,
        name: dto.name,
        occasion: dto.occasion,
        description: dto.description,
        keywords: enriched.keywords,
        palette: enriched.palette,
        confidence: enriched.confidence ?? dto.confidence ?? 70,
        isDefault: dto.isDefault ?? false,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateStyleProfileDto) {
    await this.findOne(userId, id);

    if (dto.isDefault) {
      await this.prisma.styleProfile.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Enrich with behavior-derived insights when keywords or palette are being updated
    let updateData = { ...dto };
    if (dto.keywords || dto.palette) {
      const enriched = await this.enrichFromBehavior(
        userId,
        dto.keywords,
        dto.palette,
      );
      updateData = {
        ...dto,
        keywords: enriched.keywords,
        palette: enriched.palette,
      };
    }

    return this.prisma.styleProfile.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);

    await this.prisma.styleProfile.delete({
      where: { id },
    });

    return { success: true };
  }

  async setDefault(userId: string, id: string) {
    await this.findOne(userId, id);

    await this.prisma.styleProfile.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    return this.prisma.styleProfile.update({
      where: { id },
      data: { isDefault: true },
    });
  }

  async toggleActive(userId: string, id: string) {
    const profile = await this.findOne(userId, id);

    return this.prisma.styleProfile.update({
      where: { id },
      data: { isActive: !profile.isActive },
    });
  }

  /**
   * Enrich style profile keywords and palette from user behavior data.
   * Merges user-provided values with behavior-derived preferences, deduplicating results.
   */
  private async enrichFromBehavior(
    userId: string,
    userKeywords?: string[],
    userPalette?: string[],
  ): Promise<{ keywords: string[]; palette: string[]; confidence?: number }> {
    try {
      const behaviorProfile = await this.behaviorTracker.getUserBehaviorProfile(userId);

      // Extract top style keywords from behavior preferences
      const behaviorStyleKeywords = behaviorProfile.preferences.styles
        .filter((s) => s.weight > 0.3)
        .slice(0, 5)
        .map((s) => s.key);

      // Extract top color keywords from behavior preferences
      const behaviorColorKeywords = behaviorProfile.preferences.colors
        .filter((c) => c.weight > 0.3)
        .slice(0, 5)
        .map((c) => c.key);

      // Merge user-provided with behavior-derived, deduplicate
      const mergedKeywords = [
        ...(userKeywords || []),
        ...behaviorStyleKeywords,
      ].filter((value, index, array) => array.indexOf(value) === index).slice(0, 10);

      const mergedPalette = [
        ...(userPalette || []),
        ...behaviorColorKeywords,
      ].filter((value, index, array) => array.indexOf(value) === index).slice(0, 8);

      // Boost confidence when behavior data provides strong signals
      const hasBehaviorSignals =
        behaviorStyleKeywords.length > 0 || behaviorColorKeywords.length > 0;
      const behaviorConfidence = hasBehaviorSignals
        ? Math.min(85, 70 + behaviorStyleKeywords.length * 3)
        : undefined;

      return {
        keywords: mergedKeywords.length > 0 ? mergedKeywords : (userKeywords || []),
        palette: mergedPalette.length > 0 ? mergedPalette : (userPalette || []),
        confidence: behaviorConfidence,
      };
    } catch (error) {
      this.logger.warn(
        `Behavior enrichment failed, using original values: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return {
        keywords: userKeywords || [],
        palette: userPalette || [],
      };
    }
  }
}
