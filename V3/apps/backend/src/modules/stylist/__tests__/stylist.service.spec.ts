import { Test } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { StylistService } from '../stylist.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { LlmService } from '../services/llm.service';
import { KnowledgeService } from '../../knowledge/knowledge.service';

const mockSession = {
  id: 'session-1',
  userId: 'user-1',
  title: 'Test Session',
  context: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockMessage = {
  id: 'msg-1',
  sessionId: 'session-1',
  role: 'user',
  content: 'Hello',
  metadata: null,
  createdAt: new Date('2026-01-01'),
};

const mockUser = {
  id: 'user-1',
  phone: '13800138000',
  email: null,
  passwordHash: 'hash',
  nickname: 'Test',
  avatarUrl: null,
  gender: 'female',
  birthYear: null,
  height: 160,
  weight: 55,
  bodyType: 'pear',
  colorSeason: '秋季暖调',
  role: 'user',
  language: 'zh',
  createdAt: new Date(),
  updatedAt: new Date(),
  bodyProfile: {
    id: 'bp-1',
    userId: 'user-1',
    bodyType: 'pear',
    colorSeason: '秋季暖调',
    measurements: { waist: 68, hips: 96 },
    analysisResult: { confidence: 0.85, recommendations: ['高腰A字裙'] },
    sourceImageUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  stylePreferences: [
    {
      id: 'sp-1',
      userId: 'user-1',
      styleTags: ['简约', '韩系'],
      occasionTags: ['通勤'],
      colorPreferences: ['驼色', '米白'],
      budgetRange: '500-1500',
      createdAt: new Date(),
    },
  ],
};

const mockWardrobeItems = [
  {
    id: 'w-1',
    userId: 'user-1',
    clothingId: 'c-1',
    customName: '白衬衫',
    imageUrl: null,
    category: '上装',
    color: '白色',
    brand: 'UNIQLO',
    notes: '经典款',
    addedAt: new Date(),
  },
];

const sampleOutfitJson = {
  occasion: '通勤',
  season: 'autumn',
  styleTags: ['简约', '韩系'],
  items: [
    {
      slot: 'top',
      name: '驼色针织衫',
      category: '上装',
      color: '驼色',
      styleTags: ['简约'],
      fitType: 'slim',
      material: '羊毛',
      priceRange: '200-400',
      reason: '修饰梨型身材',
    },
  ],
  overallReason: '整体搭配思路',
  colorScheme: '驼色+深蓝',
  bodyTypeTip: '高腰修饰',
};

function createMockPrismaService() {
  return {
    chatSession: {
      create: jest.fn().mockResolvedValue(mockSession),
      findMany: jest.fn().mockResolvedValue([
        { ...mockSession, messages: [mockMessage] },
      ]),
      findUnique: jest.fn().mockResolvedValue(mockSession),
      delete: jest.fn().mockResolvedValue(mockSession),
      count: jest.fn().mockResolvedValue(1),
    },
    chatMessage: {
      create: jest.fn().mockResolvedValue(mockMessage),
      findMany: jest.fn().mockResolvedValue([mockMessage]),
      count: jest.fn().mockResolvedValue(1),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue(mockUser),
    },
    bodyProfile: {
      findUnique: jest.fn().mockResolvedValue(mockUser.bodyProfile),
    },
    wardrobeItem: {
      findMany: jest.fn().mockResolvedValue(mockWardrobeItems),
    },
  };
}

function createMockLlmService() {
  return {
    chatStream: jest.fn().mockImplementation(async function* () {
      yield { content: '你好！', done: false };
      yield { content: '我是小衣。', done: true };
    }),
    chat: jest.fn().mockResolvedValue({
      content: '你好！我是小衣。',
      usage: { promptTokens: 100, completionTokens: 20 },
      model: 'glm-5',
    }),
    generateImage: jest.fn().mockResolvedValue({
      url: 'https://cdn.aineed.com/test-image.png',
      cost: 1,
    }),
    getModelInfo: jest.fn().mockReturnValue({
      name: 'glm-5',
      provider: 'glm5',
      maxTokens: 8192,
    }),
    healthCheck: jest.fn().mockResolvedValue(true),
    getActiveProvider: jest.fn().mockReturnValue('glm5'),
  };
}

function createMockKnowledgeService() {
  return {
    queryKnowledge: jest.fn().mockResolvedValue([]),
    findColorHarmony: jest.fn().mockResolvedValue([]),
    findColorConflicts: jest.fn().mockResolvedValue([]),
    findBodyTypeRules: jest.fn().mockResolvedValue([]),
    findOccasionRules: jest.fn().mockResolvedValue({
      occasion: '通勤',
      requiredStyles: [],
      forbiddenItems: [],
    }),
    findStyleCompatibility: jest.fn().mockResolvedValue({
      styleA: '简约',
      styleB: '韩系',
      strength: 0.8,
      compatible: true,
    }),
  };
}

describe('StylistService', () => {
  let service: StylistService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let llmService: LlmService;
  let knowledgeService: KnowledgeService;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    llmService = createMockLlmService() as unknown as LlmService;
    knowledgeService = createMockKnowledgeService() as unknown as KnowledgeService;

    const module = await Test.createTestingModule({
      providers: [
        StylistService,
        { provide: PrismaService, useValue: prisma },
        { provide: LlmService, useValue: llmService },
        { provide: KnowledgeService, useValue: knowledgeService },
      ],
    }).compile();

    service = module.get<StylistService>(StylistService);
  });

  describe('createSession', () => {
    it('should create a session with title', async () => {
      const result = await service.createSession('user-1', { title: 'Test' });
      expect(result.id).toBe('session-1');
      expect(prisma.chatSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'user-1', title: 'Test' }),
        }),
      );
    });

    it('should create a session without title', async () => {
      const result = await service.createSession('user-1', {});
      expect(result.id).toBe('session-1');
      expect(prisma.chatSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'user-1', title: null }),
        }),
      );
    });
  });

  describe('getSessions', () => {
    it('should return sessions with lastMessage', async () => {
      const result = await service.getSessions('user-1');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('session-1');
      expect(result.items[0].lastMessage).toBe('Hello');
    });

    it('should return sessions without lastMessage when no messages', async () => {
      prisma.chatSession.findMany.mockResolvedValueOnce([
        { ...mockSession, messages: [] },
      ]);
      const result = await service.getSessions('user-1');
      expect(result.items[0].lastMessage).toBeNull();
    });
  });

  describe('deleteSession', () => {
    it('should delete own session', async () => {
      const result = await service.deleteSession('user-1', 'session-1');
      expect(result.id).toBe('session-1');
      expect(prisma.chatSession.delete).toHaveBeenCalledWith({
        where: { id: 'session-1' },
      });
    });

    it('should throw NotFoundException for non-existent session', async () => {
      prisma.chatSession.findUnique.mockResolvedValueOnce(null);
      await expect(service.deleteSession('user-1', 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException for other user session', async () => {
      prisma.chatSession.findUnique.mockResolvedValueOnce({
        ...mockSession,
        userId: 'user-2',
      });
      await expect(service.deleteSession('user-1', 'session-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getMessages', () => {
    it('should return messages for own session', async () => {
      const result = await service.getMessages('user-1', 'session-1');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].role).toBe('user');
    });

    it('should throw NotFoundException for non-existent session', async () => {
      prisma.chatSession.findUnique.mockResolvedValueOnce(null);
      await expect(service.getMessages('user-1', 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException for other user session', async () => {
      prisma.chatSession.findUnique.mockResolvedValueOnce({
        ...mockSession,
        userId: 'user-2',
      });
      await expect(service.getMessages('user-1', 'session-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('saveUserMessage', () => {
    it('should save user message', async () => {
      const result = await service.saveUserMessage('session-1', 'Hello');
      expect(result).toEqual(mockMessage);
      expect(prisma.chatMessage.create).toHaveBeenCalledWith({
        data: { sessionId: 'session-1', role: 'user', content: 'Hello' },
      });
    });
  });

  describe('saveAssistantMessage', () => {
    it('should save assistant message with metadata', async () => {
      const metadata = { occasion: '通勤' };
      const result = await service.saveAssistantMessage('session-1', 'Hi', metadata);
      expect(result).toEqual(mockMessage);
      expect(prisma.chatMessage.create).toHaveBeenCalledWith({
        data: {
          sessionId: 'session-1',
          role: 'assistant',
          content: 'Hi',
          metadata,
        },
      });
    });

    it('should save assistant message without metadata', async () => {
      await service.saveAssistantMessage('session-1', 'Hi');
      expect(prisma.chatMessage.create).toHaveBeenCalledWith({
        data: {
          sessionId: 'session-1',
          role: 'assistant',
          content: 'Hi',
          metadata: undefined,
        },
      });
    });
  });

  describe('parseOutfitFromResponse', () => {
    it('should parse outfit JSON from response with outfit code block', () => {
      const response = `这是一套搭配方案：\n\n\`\`\`outfit\n${JSON.stringify(sampleOutfitJson)}\n\`\`\`\n\n希望你喜欢！`;
      const result = service.parseOutfitFromResponse(response);
      expect(result.outfit).not.toBeNull();
      expect(result.outfit?.occasion).toBe('通勤');
      expect(result.outfit?.items).toHaveLength(1);
      expect(result.textContent).toContain('这是一套搭配方案');
    });

    it('should return null outfit for response without outfit block', () => {
      const response = '你好，我是小衣，有什么可以帮你的？';
      const result = service.parseOutfitFromResponse(response);
      expect(result.outfit).toBeNull();
      expect(result.textContent).toBe(response);
    });

    it('should return null outfit for invalid JSON in outfit block', () => {
      const response = '\`\`\`outfit\n{invalid json}\n\`\`\`';
      const result = service.parseOutfitFromResponse(response);
      expect(result.outfit).toBeNull();
      expect(result.textContent).toBe(response);
    });

    it('should return null outfit for outfit without items array', () => {
      const invalidOutfit = { occasion: '通勤' };
      const response = `\`\`\`outfit\n${JSON.stringify(invalidOutfit)}\n\`\`\``;
      const result = service.parseOutfitFromResponse(response);
      expect(result.outfit).toBeNull();
    });

    it('should return null outfit for outfit with empty items', () => {
      const emptyOutfit = { ...sampleOutfitJson, items: [] };
      const response = `\`\`\`outfit\n${JSON.stringify(emptyOutfit)}\n\`\`\``;
      const result = service.parseOutfitFromResponse(response);
      expect(result.outfit).toBeNull();
    });
  });

  describe('buildSystemPromptForUser', () => {
    it('should build prompt with all context', async () => {
      const prompt = await service.buildSystemPromptForUser('user-1');
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        include: { bodyProfile: true, stylePreferences: true },
      });
    });

    it('should build prompt when no user profile', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);
      const prompt = await service.buildSystemPromptForUser('user-1');
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('should build prompt when no body analysis', async () => {
      prisma.bodyProfile.findUnique.mockResolvedValueOnce(null);
      const prompt = await service.buildSystemPromptForUser('user-1');
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('should build prompt when no wardrobe items', async () => {
      prisma.wardrobeItem.findMany.mockResolvedValueOnce([]);
      const prompt = await service.buildSystemPromptForUser('user-1');
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });
  });

  describe('streamChat', () => {
    it('should stream text events and done', async () => {
      const events = [];
      for await (const event of service.streamChat('user-1', 'session-1', '你好')) {
        events.push(event);
      }

      const textEvents = events.filter((e) => e.type === 'text');
      const doneEvents = events.filter((e) => e.type === 'done');
      expect(textEvents.length).toBeGreaterThan(0);
      expect(doneEvents).toHaveLength(1);
    });

    it('should yield error for non-existent session', async () => {
      prisma.chatSession.findUnique.mockResolvedValueOnce(null);
      const events = [];
      for await (const event of service.streamChat('user-1', 'non-existent', '你好')) {
        events.push(event);
      }

      const errorEvents = events.filter((e) => e.type === 'error');
      expect(errorEvents.length).toBeGreaterThan(0);
    });

    it('should yield error for other user session', async () => {
      prisma.chatSession.findUnique.mockResolvedValueOnce({
        ...mockSession,
        userId: 'user-2',
      });
      const events = [];
      for await (const event of service.streamChat('user-1', 'session-1', '你好')) {
        events.push(event);
      }

      const errorEvents = events.filter((e) => e.type === 'error');
      expect(errorEvents.length).toBeGreaterThan(0);
    });

    it('should emit outfit event when LLM returns outfit JSON', async () => {
      const outfitResponse = `推荐搭配：\n\n\`\`\`outfit\n${JSON.stringify(sampleOutfitJson)}\n\`\`\``;

      const mockLlm = createMockLlmService();
      mockLlm.chatStream = jest.fn().mockImplementation(async function* () {
        yield { content: outfitResponse, done: true };
      });

      const module = await Test.createTestingModule({
        providers: [
          StylistService,
          { provide: PrismaService, useValue: prisma },
          { provide: LlmService, useValue: mockLlm },
          { provide: KnowledgeService, useValue: knowledgeService },
        ],
      }).compile();

      const serviceWithMock = module.get<StylistService>(StylistService);

      const events = [];
      for await (const event of serviceWithMock.streamChat('user-1', 'session-1', '帮我搭一套')) {
        events.push(event);
      }

      const outfitEvents = events.filter((e) => e.type === 'outfit');
      expect(outfitEvents.length).toBeGreaterThan(0);

      const parsedOutfit = JSON.parse(outfitEvents[0].content);
      expect(parsedOutfit.occasion).toBe('通勤');
      expect(parsedOutfit.items).toHaveLength(1);
    });

    it('should save user and assistant messages', async () => {
      for await (const _ of service.streamChat('user-1', 'session-1', '你好')) {
        // consume generator
      }

      expect(prisma.chatMessage.create).toHaveBeenCalledTimes(2);
    });
  });
});
