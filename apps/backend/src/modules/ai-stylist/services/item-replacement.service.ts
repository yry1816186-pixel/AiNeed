import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { AiStylistSessionService } from "./session.service";
import { AiStylistContextService } from "./context.service";
import type { StylistOutfitItem, StylistOutfitPlan } from "../types";

/**
 * 单品替换服务 — AIS-05
 * 基于同类商品检索 + 用户画像过滤，支持替换单品并更新方案
 */

export interface AlternativeItem {
  id: string;
  name: string;
  category: string;
  imageUrl: string | null;
  price: number | null;
  brand: string | null;
  tags: string[];
  matchScore: number;
}

export interface ReplaceItemResult {
  success: boolean;
  updatedOutfit: StylistOutfitPlan;
  message: string;
}

@Injectable()
export class ItemReplacementService {
  private readonly logger = new Logger(ItemReplacementService.name);

  constructor(
    private sessionService: AiStylistSessionService,
    private contextService: AiStylistContextService,
    private prisma: PrismaService,
  ) {}

  /**
   * 获取同类商品替代列表
   * @param userId 用户 ID
   * @param sessionId 会话 ID
   * @param outfitIndex 方案索引
   * @param itemIndex 单品索引
   * @param limit 返回数量上限
   */
  async getAlternatives(
    userId: string,
    sessionId: string,
    outfitIndex: number,
    itemIndex: number,
    limit: number = 10,
  ): Promise<AlternativeItem[]> {
    const session = await this.sessionService.getSessionOrThrow(userId, sessionId);
    if (!session.result) {
      throw new NotFoundException("该会话尚未生成穿搭方案");
    }

    const outfit = session.result.outfits[outfitIndex];
    if (!outfit) {
      throw new NotFoundException(`方案索引 ${outfitIndex} 不存在`);
    }

    const originalItem = outfit.items[itemIndex];
    if (!originalItem) {
      throw new NotFoundException(`单品索引 ${itemIndex} 不存在`);
    }

    // 获取用户画像用于过滤排序
    const userContext = await this.contextService.buildUserContext(userId);

    // 获取用户色彩偏好（colorPreferences 不在 StylistContextInternal 中，需单独查询）
    const userProfile = await this.prisma.userProfile
      .findUnique({
        where: { userId },
        select: { colorPreferences: true },
      })
      .catch(() => null);
    const colorPrefs = (userProfile?.colorPreferences as string[]) || [];

    // 从数据库检索同类商品
    const categoryMap: Record<string, string> = {
      top: "top",
      bottom: "bottom",
      dress: "dress",
      outerwear: "outerwear",
      shoes: "shoes",
      accessories: "accessories",
      bag: "bag",
      sportswear: "sportswear",
      swimwear: "swimwear",
    };

    const dbCategory = categoryMap[originalItem.category.toLowerCase()] || originalItem.category;

    const candidates = await this.prisma.clothingItem.findMany({
      where: {
        category: dbCategory as never,
        isActive: true,
        id: { not: originalItem.itemId || undefined },
      },
      select: {
        id: true,
        name: true,
        category: true,
        images: true,
        price: true,
        brand: { select: { name: true } },
        tags: true,
      },
      take: limit * 3, // 多取一些用于画像过滤
    });

    // 排除当前方案中已有的同 category 商品 ID
    const existingIds = new Set(
      outfit.items.map((i) => i.itemId).filter(Boolean) as string[],
    );

    // 基于用户画像计算匹配分并排序
    const scored: AlternativeItem[] = candidates
      .filter((c) => !existingIds.has(c.id))
      .map((candidate) => {
        let matchScore = 50; // 基础分

        // 画像偏好加分
        const profile = userContext.userProfile;
        if (profile?.stylePreferences) {
          const prefs = profile.stylePreferences.map((p) =>
            typeof p === "string" ? p : p.name ?? "",
          );
          const tags = (candidate.tags as string[]) || [];
          const overlap = tags.filter((t) => prefs.some((p) => t.includes(p) || p.includes(t)));
          matchScore += overlap.length * 10;
        }

        // 色彩偏好加分
        if (colorPrefs.length > 0) {
          const tags = (candidate.tags as string[]) || [];
          const colorMatch = tags.filter((t) =>
            colorPrefs.some((c) => t.includes(c) || c.includes(t)),
          );
          matchScore += colorMatch.length * 8;
        }

        return {
          id: candidate.id,
          name: candidate.name,
          category: candidate.category,
          imageUrl: (candidate.images as string[])?.[0] ?? null,
          price: candidate.price ? Number(candidate.price) : null,
          brand: candidate.brand?.name ?? null,
          tags: (candidate.tags as string[]) || [],
          matchScore: Math.min(matchScore, 100),
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);

    return scored;
  }

  /**
   * 替换方案中的单品
   */
  async replaceItem(
    userId: string,
    sessionId: string,
    outfitIndex: number,
    itemIndex: number,
    newItemId: string,
  ): Promise<ReplaceItemResult> {
    const session = await this.sessionService.getSessionOrThrow(userId, sessionId);
    if (!session.result) {
      throw new NotFoundException("该会话尚未生成穿搭方案");
    }

    const outfit = session.result.outfits[outfitIndex];
    if (!outfit) {
      throw new NotFoundException(`方案索引 ${outfitIndex} 不存在`);
    }

    const originalItem = outfit.items[itemIndex];
    if (!originalItem) {
      throw new NotFoundException(`单品索引 ${itemIndex} 不存在`);
    }

    // 从数据库获取新商品信息
    const newItem = await this.prisma.clothingItem.findUnique({
      where: { id: newItemId },
      select: {
        id: true,
        name: true,
        category: true,
        images: true,
        price: true,
        brand: { select: { name: true } },
        tags: true,
      },
    });

    if (!newItem) {
      throw new NotFoundException(`商品 ${newItemId} 不存在`);
    }

    // 构建替换后的 StylistOutfitItem
    const replacement: StylistOutfitItem = {
      itemId: newItem.id,
      category: newItem.category,
      name: newItem.name,
      reason: `替换自 ${originalItem.name}，与你的风格更匹配`,
      imageUrl: (newItem.images as string[])?.[0] ?? undefined,
      price: newItem.price ? Number(newItem.price) : undefined,
      brand: newItem.brand?.name ?? null,
      score: 80,
    };

    // 更新方案中的单品
    outfit.items[itemIndex] = replacement;

    // 重新计算总价
    outfit.estimatedTotalPrice = outfit.items.reduce(
      (sum, item) => sum + (item.price ?? 0),
      0,
    );

    // 持久化更新
    await this.sessionService.persistSession(session);

    return {
      success: true,
      updatedOutfit: outfit,
      message: `已将 ${originalItem.name} 替换为 ${newItem.name}`,
    };
  }
}
