import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LlmService } from './services/llm.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { CreateSessionDto } from './dto/create-session.dto';
import {
  createFullPrompt,
  type PromptBuilderConfig,
  type PromptBuilderContext,
  type UserProfile,
  type FashionKnowledgeSnippet,
  type WardrobeItemData,
  type TrendData,
  type BodyAnalysisReport,
  type OutfitRecommendation,
  buildImageGenerationPrompt,
  type ImageGenerationInput,
} from './prompts';
import type { ChatMessage } from './services/providers/llm-provider.interface';

const MAX_HISTORY_ROUNDS = 10;
const OUTFIT_JSON_REGEX = /```outfit\s*\n?([\s\S]*?)\n?```/;

interface ParsedOutfitResult {
  textContent: string;
  outfit: OutfitRecommendation | null;
}

@Injectable()
export class StylistService {
  private readonly logger = new Logger(StylistService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LlmService,
    private readonly knowledgeService: KnowledgeService,
  ) {}

  async createSession(userId: string, dto: CreateSessionDto) {
    const session = await this.prisma.chatSession.create({
      data: {
        userId,
        title: dto.title ?? null,
      },
    });

    this.logger.log(`Session created: ${session.id} for user: ${userId}`);
    return {
      id: session.id,
      title: session.title,
      createdAt: session.createdAt.toISOString(),
    };
  }

  async getSessions(userId: string) {
    const sessions = await this.prisma.chatSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const items = sessions.map((session) => ({
      id: session.id,
      title: session.title,
      lastMessage: session.messages[0]?.content ?? null,
      createdAt: session.createdAt.toISOString(),
    }));

    return { items };
  }

  async deleteSession(userId: string, sessionId: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException({ code: 'SESSION_NOT_FOUND', message: '会话不存在' });
    }

    if (session.userId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: '无权删除此会话' });
    }

    await this.prisma.chatSession.delete({ where: { id: sessionId } });
    this.logger.log(`Session deleted: ${sessionId}`);
    return { id: sessionId };
  }

  async getMessages(userId: string, sessionId: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException({ code: 'SESSION_NOT_FOUND', message: '会话不存在' });
    }

    if (session.userId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: '无权访问此会话' });
    }

    const messages = await this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });

    const items = messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      metadata: msg.metadata as Record<string, unknown> | null,
      createdAt: msg.createdAt.toISOString(),
    }));

    return { items };
  }

  async saveUserMessage(sessionId: string, content: string) {
    return this.prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'user',
        content,
      },
    });
  }

  async saveAssistantMessage(
    sessionId: string,
    content: string,
    metadata?: Record<string, unknown>,
  ) {
    return this.prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'assistant',
        content,
        metadata: metadata ?? undefined,
      },
    });
  }

  private async getUserProfile(userId: string): Promise<UserProfile | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        bodyProfile: true,
        stylePreferences: true,
      },
    });

    if (!user) {
      return null;
    }

    return {
      gender: user.gender as UserProfile['gender'],
      bodyType: user.bodyType as UserProfile['bodyType'],
      height: user.height ?? undefined,
      weight: user.weight ?? undefined,
      colorSeason: user.colorSeason ?? user.bodyProfile?.colorSeason ?? undefined,
      stylePreferences: user.stylePreferences?.[0]?.styleTags ?? undefined,
      colorPreferences: user.stylePreferences?.[0]?.colorPreferences ?? undefined,
      budgetRange: user.stylePreferences?.[0]?.budgetRange ?? undefined,
    };
  }

  private async getBodyAnalysis(userId: string): Promise<BodyAnalysisReport | null> {
    const bodyProfile = await this.prisma.bodyProfile.findUnique({
      where: { userId },
    });

    if (!bodyProfile) {
      return null;
    }

    return {
      bodyType: bodyProfile.bodyType ?? 'unknown',
      colorSeason: bodyProfile.colorSeason ?? 'unknown',
      measurements: (bodyProfile.measurements as Record<string, number>) ?? {},
      confidence: (bodyProfile.analysisResult as Record<string, unknown>)?.confidence as number ?? 0,
      recommendations: (bodyProfile.analysisResult as Record<string, unknown>)?.recommendations as string[] ?? [],
    };
  }

  private async getWardrobeItems(userId: string): Promise<WardrobeItemData[]> {
    const items = await this.prisma.wardrobeItem.findMany({
      where: { userId },
      take: 30,
    });

    return items.map((item) => ({
      id: item.id,
      name: item.customName ?? item.category ?? '未命名',
      category: item.category ?? '未分类',
      color: item.color ?? '未知',
      brand: item.brand ?? undefined,
      styleTags: [],
      imageUrl: item.imageUrl ?? undefined,
      notes: item.notes ?? undefined,
    }));
  }

  private async getKnowledgeSnippets(
    userProfile: UserProfile | null,
  ): Promise<FashionKnowledgeSnippet[]> {
    const snippets: FashionKnowledgeSnippet[] = [];

    try {
      if (userProfile?.bodyType) {
        const bodyRules = await this.knowledgeService.queryKnowledge({
          bodyType: userProfile.bodyType,
        });
        for (const rule of bodyRules) {
          snippets.push({
            category: rule.category as FashionKnowledgeSnippet['category'],
            title: rule.recommendation,
            content: rule.reason ?? rule.recommendation,
            source: '知识图谱',
            confidence: rule.strength ?? 0.7,
          });
        }
      }

      if (userProfile?.stylePreferences && userProfile.stylePreferences.length > 0) {
        const styleRules = await this.knowledgeService.queryKnowledge({
          style: userProfile.stylePreferences[0],
        });
        for (const rule of styleRules) {
          snippets.push({
            category: rule.category as FashionKnowledgeSnippet['category'],
            title: rule.recommendation,
            content: rule.reason ?? rule.recommendation,
            source: '知识图谱',
            confidence: rule.strength ?? 0.7,
          });
        }
      }

      if (userProfile?.colorPreferences && userProfile.colorPreferences.length > 0) {
        const colorRules = await this.knowledgeService.queryKnowledge({
          colors: userProfile.colorPreferences.slice(0, 3),
        });
        for (const rule of colorRules) {
          snippets.push({
            category: rule.category as FashionKnowledgeSnippet['category'],
            title: rule.recommendation,
            content: rule.reason ?? rule.recommendation,
            source: '知识图谱',
            confidence: rule.strength ?? 0.7,
          });
        }
      }
    } catch (error) {
      this.logger.warn(`Knowledge query failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return snippets;
  }

  private async getTrends(): Promise<TrendData[]> {
    return [];
  }

  async buildSystemPromptForUser(userId: string): Promise<string> {
    const [userProfile, bodyAnalysis, wardrobeItems, knowledgeSnippets, trends] =
      await Promise.all([
        this.getUserProfile(userId),
        this.getBodyAnalysis(userId),
        this.getWardrobeItems(userId),
        this.getKnowledgeSnippets(await this.getUserProfile(userId)),
        this.getTrends(),
      ]);

    const config: PromptBuilderConfig = {
      language: 'zh',
      userName: undefined,
      enableEmoji: true,
    };

    const context: PromptBuilderContext = {
      userProfile: userProfile ?? undefined,
      bodyAnalysis: bodyAnalysis ?? undefined,
      wardrobeItems: wardrobeItems.length > 0 ? wardrobeItems : undefined,
      fashionKnowledge: knowledgeSnippets.length > 0 ? knowledgeSnippets : undefined,
      trends: trends.length > 0 ? trends : undefined,
    };

    return createFullPrompt(config, context);
  }

  async getRecentMessages(sessionId: string): Promise<Array<{ role: string; content: string }>> {
    const messages = await this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: MAX_HISTORY_ROUNDS * 2,
    });

    return messages.reverse().map((m) => ({
      role: m.role,
      content: m.content,
    }));
  }

  async *streamChat(
    userId: string,
    sessionId: string,
    userMessage: string,
  ): AsyncGenerator<{ type: 'text' | 'outfit' | 'done' | 'error'; content: string }> {
    try {
      const session = await this.prisma.chatSession.findUnique({
        where: { id: sessionId },
      });

      if (!session || session.userId !== userId) {
        yield { type: 'error', content: '会话不存在或无权访问' };
        return;
      }

      await this.saveUserMessage(sessionId, userMessage);

      const systemPrompt = await this.buildSystemPromptForUser(userId);
      const history = await this.getRecentMessages(sessionId);

      const chatMessages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...history.slice(0, -1).map((m) => ({
          role: m.role as ChatMessage['role'],
          content: m.content,
        })),
        { role: 'user', content: userMessage },
      ];

      let fullContent = '';

      for await (const chunk of this.llmService.chatStream(chatMessages)) {
        fullContent += chunk.content;
        yield { type: 'text', content: chunk.content };

        if (chunk.done) {
          break;
        }
      }

      const parsed = this.parseOutfitFromResponse(fullContent);

      if (parsed.outfit) {
        yield {
          type: 'outfit',
          content: JSON.stringify(parsed.outfit),
        };

        this.triggerImageGeneration(userId, parsed.outfit).catch((err) => {
          this.logger.warn(`Image generation failed: ${String(err)}`);
        });
      }

      await this.saveAssistantMessage(
        sessionId,
        parsed.textContent,
        parsed.outfit ? (parsed.outfit as unknown as Record<string, unknown>) : undefined,
      );

      yield { type: 'done', content: '' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Stream chat error: ${message}`);
      yield { type: 'error', content: message };
    }
  }

  parseOutfitFromResponse(response: string): ParsedOutfitResult {
    const match = response.match(OUTFIT_JSON_REGEX);

    if (!match || !match[1]) {
      return { textContent: response, outfit: null };
    }

    try {
      const jsonStr = match[1].trim();
      const outfit = JSON.parse(jsonStr) as OutfitRecommendation;

      if (!outfit.items || !Array.isArray(outfit.items) || outfit.items.length === 0) {
        return { textContent: response, outfit: null };
      }

      const textContent = response.replace(OUTFIT_JSON_REGEX, '').trim();
      return { textContent: textContent || outfit.overallReason ?? '', outfit };
    } catch {
      return { textContent: response, outfit: null };
    }
  }

  private async triggerImageGeneration(
    userId: string,
    outfit: OutfitRecommendation,
  ): Promise<void> {
    const userProfile = await this.getUserProfile(userId);

    const input: ImageGenerationInput = {
      outfitItems: outfit.items.map((item) => ({
        slot: item.slot,
        name: item.name,
        color: item.color,
        secondaryColor: item.secondaryColor,
        fitType: item.fitType,
        material: item.material,
        styleTags: item.styleTags,
      })),
      userProfile: {
        gender: userProfile?.gender,
        bodyType: userProfile?.bodyType,
        height: userProfile?.height,
        colorSeason: userProfile?.colorSeason,
      },
      occasion: outfit.occasion,
      season: outfit.season,
      styleTags: outfit.styleTags,
    };

    const promptResult = buildImageGenerationPrompt(input);

    const imageResponse = await this.llmService.generateImage(promptResult.promptZh, {
      size: '1024x768',
      quality: 'hd',
    });

    this.logger.log(`Image generated for outfit: ${imageResponse.url}, cost: ${imageResponse.cost}`);
  }
}
