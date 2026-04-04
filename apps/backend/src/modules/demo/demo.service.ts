import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DemoService {
  private readonly logger = new Logger(DemoService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取完整的 Demo 数据包（用于离线演示）
   * 包含：用户、服装、推荐、对话等所有关键数据
   */
  async getFullDemoData() {
    this.logger.log('获取完整 Demo 数据...');

    const [users, clothingItems, recommendations, sessions, brands] = await Promise.all([
      // 用户数据（脱敏处理）
      this.prisma.user.findMany({
        select: {
          id: true,
          email: true,
          nickname: true,
          gender: true,
          avatar: true,
          createdAt: true,
          profile: {
            select: {
              bodyType: true,
              skinTone: true,
              faceShape: true,
              colorSeason: true,
              height: true,
              weight: true,
              stylePreferences: true,
              colorPreferences: true,
            },
          },
        },
        take: 10,
      }),

      // 服装数据
      this.prisma.clothingItem.findMany({
        include: {
          brand: {
            select: { id: true, name: true, slug: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 60,
      }),

      // 推荐结果
      this.prisma.styleRecommendation.findMany({
        include: {
          user: { select: { id: true, nickname: true } },
        },
        orderBy: { score: 'desc' },
        take: 20,
      }),

      // AI 对话历史
      this.prisma.aiStylistSession.findMany({
        include: {
          user: { select: { id: true, nickname: true } },
        },
        where: {
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // 品牌信息
      this.prisma.brand.findMany({
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      success: true,
      timestamp: new Date().toISOString(),
      mode: 'offline-demo',
      message: 'Demo 演示数据（离线模式）',
      data: {
        users: users.map((u) => ({
          ...u,
          password: undefined, // 不返回密码
        })),
        clothing: clothingItems,
        recommendations,
        conversations: sessions.map((s) => ({
          id: s.id,
          userId: s.userId,
          title: (s.payload as Record<string, unknown> | null)?.title as string || '未命名对话',
          messages: (s.payload as Record<string, unknown> | null)?.messages || [],
          createdAt: s.createdAt,
        })),
        brands,
        stats: await this.getInternalStats(),
      },
    };
  }

  /**
   * 获取 Demo 用户列表（密码已脱敏）
   */
  async getDemoUsers() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        nickname: true,
        gender: true,
        isActive: true,
        createdAt: true,
        profile: {
          select: {
            bodyType: true,
            skinTone: true,
            colorSeason: true,
            height: true,
            weight: true,
          },
        },
        _count: {
          select: {
            favorites: true,
            tryOns: true,
            aiStylistSessions: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });

    return {
      success: true,
      count: users.length,
      data: users,
    };
  }

  /**
   * 获取 Demo 服装数据
   */
  async getClothingData() {
    const [items, categories, total] = await Promise.all([
      this.prisma.clothingItem.findMany({
        include: {
          brand: { select: { id: true, name: true, slug: true } },
        },
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        take: 60,
      }),
      this.prisma.clothingItem.groupBy({
        by: ['category'],
        _count: { id: true },
      }),
      this.prisma.clothingItem.count(),
    ]);

    return {
      success: true,
      total,
      returned: items.length,
      distribution: categories.reduce((acc, c) => {
        acc[c.category] = c._count.id;
        return acc;
      }, {} as Record<string, number>),
      data: items,
    };
  }

  /**
   * 获取推荐结果
   */
  async getRecommendations() {
    const recommendations = await this.prisma.styleRecommendation.findMany({
      include: {
        user: { select: { id: true, nickname: true } },
      },
      orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
      take: 20,
    });

    // 获取推荐的服装详情
    const allItemIds = recommendations.flatMap((r) => r.items as string[]);
    const uniqueItemIds = [...new Set(allItemIds)];

    const itemsMap = new Map();
    if (uniqueItemIds.length > 0) {
      const items = await this.prisma.clothingItem.findMany({
        where: { id: { in: uniqueItemIds } },
        include: { brand: { select: { name: true } } },
      });
      items.forEach((item) => itemsMap.set(item.id, item));
    }

    return {
      success: true,
      count: recommendations.length,
      data: recommendations.map((rec) => ({
        ...rec,
        itemDetails: (rec.items as string[]).map((id) => itemsMap.get(id)).filter(Boolean),
      })),
    };
  }

  /**
   * 获取 AI 对话场景
   */
  async getConversations() {
    const sessions = await this.prisma.aiStylistSession.findMany({
      where: {
        payload: { not: null as any },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      success: true,
      count: sessions.length,
      data: sessions.map((session) => ({
        id: session.id,
        userId: session.userId,
        title: (session.payload as Record<string, unknown> | null)?.title as string || 'AI 对话',
        messageCount: ((session.payload as Record<string, unknown> | null)?.messages as unknown[] || []).length,
        messages: (session.payload as Record<string, unknown> | null)?.messages || [],
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
      })),
    };
  }

  /**
   * 获取统计数据
   */
  async getStats() {
    return {
      success: true,
      timestamp: new Date().toISOString(),
      ...(await this.getInternalStats()),
    };
  }

  /**
   * 内部统计方法
   */
  private async getInternalStats() {
    const [
      userCount,
      clothingCount,
      brandCount,
      favoriteCount,
      tryOnCount,
      sessionCount,
      recommendationCount,
      categoryDistribution,
      priceStats,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.clothingItem.count(),
      this.prisma.brand.count(),
      this.prisma.favorite.count(),
      this.prisma.virtualTryOn.count({ where: { status: 'completed' } }),
      this.prisma.aiStylistSession.count(),
      this.prisma.styleRecommendation.count(),
      this.prisma.clothingItem.groupBy({ by: ['category'], _count: { id: true } }),
      this.prisma.clothingItem.aggregate({
        _min: { price: true },
        _max: { price: true },
        _avg: { price: true },
      }),
    ]);

    return {
      overview: {
        totalUsers: userCount,
        totalClothing: clothingCount,
        totalBrands: brandCount,
        totalFavorites: favoriteCount,
        completedTryOns: tryOnCount,
        aiConversations: sessionCount,
        totalRecommendations: recommendationCount,
      },
      categoryBreakdown: categoryDistribution.reduce((acc, c) => {
        acc[c.category] = c._count.id;
        return acc;
      }, {} as Record<string, number>),
      pricing: {
        minPrice: priceStats._min.price,
        maxPrice: priceStats._max.price,
        avgPrice: Math.round(Number(priceStats._avg.price || 0)),
      },
      demoAccounts: [
        { email: 'demo@aineed.ai', role: 'Demo演示账号', recommended: true },
        { email: 'judge@competition.ai', role: '评委体验账号', recommended: true },
        { email: 'test@example.com', role: '功能测试账号', recommended: false },
        { email: 'admin@aineed.ai', role: '管理员账号', recommended: false },
      ],
    };
  }
}
