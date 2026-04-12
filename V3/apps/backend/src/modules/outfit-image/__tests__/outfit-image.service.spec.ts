import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { LlmService } from '../../stylist/services/llm.service';
import { UploadService } from '../../upload/upload.service';
import { OutfitImageService } from '../outfit-image.service';
import { OutfitImageStatus } from '../dto/generate-outfit-image.dto';
import { OutfitImageQueryDto } from '../dto/outfit-image-query.dto';

const MOCK_USER_ID = 'user-001';
const MOCK_RECORD_ID = 'record-001';

function createMockPrisma() {
  return {
    outfitImage: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  };
}

function createMockLlmService() {
  return {
    generateImage: jest.fn(),
    chat: jest.fn(),
  };
}

function createMockUploadService() {
  return {
    uploadBuffer: jest.fn(),
  };
}

const MOCK_OUTFIT_DATA = {
  items: [
    { name: 'V领毛衣', color: '红色', category: 'top' },
    { name: '直筒裤', color: '深蓝', category: 'bottom' },
  ],
  occasion: 'work',
  styleTips: '简约优雅',
};

const MOCK_DB_RECORD = {
  id: MOCK_RECORD_ID,
  userId: MOCK_USER_ID,
  outfitData: MOCK_OUTFIT_DATA,
  prompt: '一位时尚的年轻亚洲女性，穿着[红色V领毛衣]作为上装，搭配[深蓝直筒裤]作为下装，现代办公室走廊场景，自然光，时尚杂志质感，全身照，4K',
  imageUrl: null,
  status: OutfitImageStatus.PENDING,
  cost: 0,
  metadata: null,
  createdAt: new Date('2026-01-15T10:00:00Z'),
};

const MOCK_COMPLETED_RECORD = {
  ...MOCK_DB_RECORD,
  status: OutfitImageStatus.COMPLETED,
  imageUrl: 'https://storage.example.com/outfit-image/2026/01/15/record-001.png',
  cost: 1,
  metadata: { model: 'glm-5', generatedAt: '2026-01-15T10:00:05Z' },
};

// Helper: wait until a mock has been called with specific status, or timeout
interface UpdateCallData {
  data: {
    status?: string;
    cost?: number;
    imageUrl?: string;
    metadata?: {
      model?: string;
      error?: string;
      failedAt?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

async function waitForUpdateWithStatus(
  mockFn: jest.Mock,
  status: string,
  timeoutMs = 3000,
): Promise<[UpdateCallData] | undefined> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const match = mockFn.mock.calls.find(
      (call: [UpdateCallData]) => call[0]?.data?.status === status,
    );
    if (match) return match;
    await new Promise((r) => setTimeout(r, 50));
  }
  return undefined;
}

describe('OutfitImageService', () => {
  let service: OutfitImageService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockLlm: ReturnType<typeof createMockLlmService>;
  let mockUpload: ReturnType<typeof createMockUploadService>;
  let originalFetch: typeof globalThis.fetch;

  beforeAll(() => {
    originalFetch = globalThis.fetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    mockLlm = createMockLlmService();
    mockUpload = createMockUploadService();

    // Mock global fetch for persistImage tests
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      headers: {
        get: jest.fn().mockReturnValue('image/png'),
      },
    }) as unknown as typeof globalThis.fetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutfitImageService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LlmService, useValue: mockLlm },
        { provide: UploadService, useValue: mockUpload },
      ],
    }).compile();

    service = module.get<OutfitImageService>(OutfitImageService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generate', () => {
    const generateDto = {
      items: MOCK_OUTFIT_DATA.items,
      occasion: MOCK_OUTFIT_DATA.occasion,
      styleTips: MOCK_OUTFIT_DATA.styleTips,
    };

    it('should create a record with PENDING status and return it', async () => {
      mockPrisma.outfitImage.create.mockResolvedValue(MOCK_DB_RECORD);

      const result = await service.generate(MOCK_USER_ID, generateDto);

      expect(result.id).toBe(MOCK_RECORD_ID);
      expect(result.status).toBe(OutfitImageStatus.PENDING);
      expect(result.items).toEqual(MOCK_OUTFIT_DATA.items);
      expect(result.occasion).toBe('work');
      expect(result.styleTips).toBe('简约优雅');
      expect(result.cost).toBe(0);

      expect(mockPrisma.outfitImage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: MOCK_USER_ID,
            status: OutfitImageStatus.PENDING,
            cost: 0,
          }),
        }),
      );
    });

    it('should pass the built prompt to the create call', async () => {
      mockPrisma.outfitImage.create.mockResolvedValue(MOCK_DB_RECORD);

      await service.generate(MOCK_USER_ID, generateDto);

      const createCall = mockPrisma.outfitImage.create.mock.calls[0][0];
      expect(createCall.data.prompt).toContain('年轻亚洲女性');
      expect(createCall.data.prompt).toContain('红色V领毛衣');
    });

    it('should store outfitData in the record', async () => {
      mockPrisma.outfitImage.create.mockResolvedValue(MOCK_DB_RECORD);

      await service.generate(MOCK_USER_ID, generateDto);

      const createCall = mockPrisma.outfitImage.create.mock.calls[0][0];
      expect(createCall.data.outfitData).toEqual({
        items: generateDto.items,
        occasion: generateDto.occasion,
        styleTips: generateDto.styleTips,
      });
    });

    it('should not await background image processing', async () => {
      mockPrisma.outfitImage.create.mockResolvedValue(MOCK_DB_RECORD);

      const result = await service.generate(MOCK_USER_ID, generateDto);

      // generate returns immediately with PENDING status
      expect(result.status).toBe(OutfitImageStatus.PENDING);
    });

    it('should trigger background processImageGeneration after create', async () => {
      mockPrisma.outfitImage.create.mockResolvedValue(MOCK_DB_RECORD);
      mockPrisma.outfitImage.update.mockResolvedValue({});
      mockLlm.generateImage.mockResolvedValue({
        url: 'https://llm.example.com/generated.png',
      });
      mockUpload.uploadBuffer.mockResolvedValue({
        url: 'https://storage.example.com/outfit-image/test.png',
        key: 'outfit-image/test.png',
        size: 1024,
        mimeType: 'image/png',
        width: 768,
        height: 1024,
      });

      await service.generate(MOCK_USER_ID, generateDto);

      // Background update to PROCESSING should happen
      await waitForUpdateWithStatus(mockPrisma.outfitImage.update, OutfitImageStatus.PROCESSING);

      expect(mockPrisma.outfitImage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: MOCK_RECORD_ID },
          data: { status: OutfitImageStatus.PROCESSING },
        }),
      );
    });
  });

  describe('getById', () => {
    it('should return the serialized record when found and owned by the user', async () => {
      mockPrisma.outfitImage.findUnique.mockResolvedValue(MOCK_COMPLETED_RECORD);

      const result = await service.getById(MOCK_RECORD_ID, MOCK_USER_ID);

      expect(result.id).toBe(MOCK_RECORD_ID);
      expect(result.userId).toBe(MOCK_USER_ID);
      expect(result.status).toBe(OutfitImageStatus.COMPLETED);
      expect(result.imageUrl).toBe(MOCK_COMPLETED_RECORD.imageUrl);
    });

    it('should throw NotFoundException when record does not exist', async () => {
      mockPrisma.outfitImage.findUnique.mockResolvedValue(null);

      await expect(
        service.getById('non-existent', MOCK_USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when record belongs to a different user', async () => {
      mockPrisma.outfitImage.findUnique.mockResolvedValue(MOCK_DB_RECORD);

      await expect(
        service.getById(MOCK_RECORD_ID, 'other-user'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should serialize null imageUrl to undefined', async () => {
      mockPrisma.outfitImage.findUnique.mockResolvedValue(MOCK_DB_RECORD);

      const result = await service.getById(MOCK_RECORD_ID, MOCK_USER_ID);

      expect(result.imageUrl).toBeUndefined();
    });

    it('should serialize null prompt to undefined', async () => {
      const recordWithNullPrompt = { ...MOCK_DB_RECORD, prompt: null };
      mockPrisma.outfitImage.findUnique.mockResolvedValue(recordWithNullPrompt);

      const result = await service.getById(MOCK_RECORD_ID, MOCK_USER_ID);

      expect(result.prompt).toBeUndefined();
    });

    it('should serialize createdAt to ISO string', async () => {
      mockPrisma.outfitImage.findUnique.mockResolvedValue(MOCK_DB_RECORD);

      const result = await service.getById(MOCK_RECORD_ID, MOCK_USER_ID);

      expect(typeof result.createdAt).toBe('string');
      expect(result.createdAt).toBe(MOCK_DB_RECORD.createdAt.toISOString());
    });
  });

  describe('history', () => {
    const defaultQuery: OutfitImageQueryDto = { page: 1, limit: 20 };

    it('should return paginated history for the user', async () => {
      mockPrisma.outfitImage.findMany.mockResolvedValue([MOCK_COMPLETED_RECORD]);
      mockPrisma.outfitImage.count.mockResolvedValue(1);

      const result = await service.history(MOCK_USER_ID, defaultQuery);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe(MOCK_RECORD_ID);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should use default page=1 and limit=20 when query is empty', async () => {
      mockPrisma.outfitImage.findMany.mockResolvedValue([]);
      mockPrisma.outfitImage.count.mockResolvedValue(0);

      const result = await service.history(MOCK_USER_ID, {} as OutfitImageQueryDto);

      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(mockPrisma.outfitImage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });

    it('should calculate correct skip for page 2 with limit 10', async () => {
      mockPrisma.outfitImage.findMany.mockResolvedValue([]);
      mockPrisma.outfitImage.count.mockResolvedValue(25);

      const result = await service.history(MOCK_USER_ID, { page: 2, limit: 10 });

      expect(result.meta.page).toBe(2);
      expect(result.meta.totalPages).toBe(3);
      expect(mockPrisma.outfitImage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should calculate totalPages correctly with ceiling division', async () => {
      mockPrisma.outfitImage.findMany.mockResolvedValue([]);
      mockPrisma.outfitImage.count.mockResolvedValue(45);

      const result = await service.history(MOCK_USER_ID, { page: 1, limit: 20 });

      expect(result.meta.totalPages).toBe(3); // ceil(45/20) = 3
    });

    it('should return empty items when no records exist', async () => {
      mockPrisma.outfitImage.findMany.mockResolvedValue([]);
      mockPrisma.outfitImage.count.mockResolvedValue(0);

      const result = await service.history(MOCK_USER_ID, defaultQuery);

      expect(result.items).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it('should filter by userId', async () => {
      mockPrisma.outfitImage.findMany.mockResolvedValue([]);
      mockPrisma.outfitImage.count.mockResolvedValue(0);

      await service.history(MOCK_USER_ID, defaultQuery);

      const expectedWhere = { userId: MOCK_USER_ID };
      expect(mockPrisma.outfitImage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expectedWhere }),
      );
      expect(mockPrisma.outfitImage.count).toHaveBeenCalledWith({
        where: expectedWhere,
      });
    });

    it('should order results by createdAt descending', async () => {
      mockPrisma.outfitImage.findMany.mockResolvedValue([]);
      mockPrisma.outfitImage.count.mockResolvedValue(0);

      await service.history(MOCK_USER_ID, defaultQuery);

      expect(mockPrisma.outfitImage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });

    it('should serialize each item in the history list', async () => {
      mockPrisma.outfitImage.findMany.mockResolvedValue([MOCK_COMPLETED_RECORD]);
      mockPrisma.outfitImage.count.mockResolvedValue(1);

      const result = await service.history(MOCK_USER_ID, defaultQuery);

      const item = result.items[0];
      expect(item.id).toBe(MOCK_COMPLETED_RECORD.id);
      expect(item.status).toBe(OutfitImageStatus.COMPLETED);
      expect(item.cost).toBe(1);
      expect(typeof item.createdAt).toBe('string');
    });
  });

  describe('processImageGeneration (background via generate)', () => {
    it('should update record to PROCESSING then COMPLETED on successful generation', async () => {
      mockPrisma.outfitImage.create.mockResolvedValue(MOCK_DB_RECORD);
      mockPrisma.outfitImage.update.mockResolvedValue({});
      mockLlm.generateImage.mockResolvedValue({
        url: 'https://llm.example.com/generated.png',
      });
      mockUpload.uploadBuffer.mockResolvedValue({
        url: 'https://storage.example.com/outfit-image/test.png',
        key: 'outfit-image/test.png',
        size: 1024,
        mimeType: 'image/png',
        width: 768,
        height: 1024,
      });

      await service.generate(MOCK_USER_ID, {
        items: MOCK_OUTFIT_DATA.items,
        occasion: MOCK_OUTFIT_DATA.occasion,
        styleTips: MOCK_OUTFIT_DATA.styleTips,
      });

      // Wait for COMPLETED update
      const completedUpdate = await waitForUpdateWithStatus(
        mockPrisma.outfitImage.update,
        OutfitImageStatus.COMPLETED,
      );

      expect(completedUpdate).toBeDefined();
      expect(completedUpdate![0].data.cost).toBe(1);
      expect(completedUpdate![0].data.imageUrl).toBe('https://storage.example.com/outfit-image/test.png');
      expect(completedUpdate![0].data.metadata).toBeDefined();
      expect(completedUpdate![0].data.metadata.model).toBe('glm-5');
    });

    it('should update record to FAILED when LLM image generation throws', async () => {
      mockPrisma.outfitImage.create.mockResolvedValue(MOCK_DB_RECORD);
      mockPrisma.outfitImage.update.mockResolvedValue({});
      mockLlm.generateImage.mockRejectedValue(new Error('API quota exceeded'));

      await service.generate(MOCK_USER_ID, {
        items: MOCK_OUTFIT_DATA.items,
        occasion: MOCK_OUTFIT_DATA.occasion,
      });

      const failedUpdate = await waitForUpdateWithStatus(
        mockPrisma.outfitImage.update,
        OutfitImageStatus.FAILED,
      );

      expect(failedUpdate).toBeDefined();
      expect(failedUpdate![0].data.metadata).toBeDefined();
      expect(failedUpdate![0].data.metadata.error).toBe('API quota exceeded');
    });

    it('should update record to FAILED when prisma update in processing step fails', async () => {
      mockPrisma.outfitImage.create.mockResolvedValue(MOCK_DB_RECORD);
      // First update (PROCESSING) succeeds, second (COMPLETED) fails
      mockPrisma.outfitImage.update
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('DB connection lost'));
      mockLlm.generateImage.mockResolvedValue({
        url: 'https://llm.example.com/generated.png',
      });
      mockUpload.uploadBuffer.mockResolvedValue({
        url: 'https://storage.example.com/test.png',
        key: 'test-key',
        size: 1024,
        mimeType: 'image/png',
        width: 768,
        height: 1024,
      });

      await service.generate(MOCK_USER_ID, {
        items: MOCK_OUTFIT_DATA.items,
        occasion: MOCK_OUTFIT_DATA.occasion,
      });

      const failedUpdate = await waitForUpdateWithStatus(
        mockPrisma.outfitImage.update,
        OutfitImageStatus.FAILED,
      );

      expect(failedUpdate).toBeDefined();
      expect(failedUpdate![0].data.metadata).toBeDefined();
      expect(failedUpdate![0].data.metadata.error).toBe('DB connection lost');
      expect(failedUpdate![0].data.metadata.failedAt).toBeDefined();
    });

    it('should call llmService.generateImage with correct options', async () => {
      mockPrisma.outfitImage.create.mockResolvedValue(MOCK_DB_RECORD);
      mockPrisma.outfitImage.update.mockResolvedValue({});
      mockLlm.generateImage.mockResolvedValue({
        url: 'https://llm.example.com/generated.png',
      });
      mockUpload.uploadBuffer.mockResolvedValue({
        url: 'https://storage.example.com/test.png',
        key: 'test-key',
        size: 1024,
        mimeType: 'image/png',
        width: 768,
        height: 1024,
      });

      await service.generate(MOCK_USER_ID, {
        items: MOCK_OUTFIT_DATA.items,
        occasion: MOCK_OUTFIT_DATA.occasion,
      });

      await waitForUpdateWithStatus(
        mockPrisma.outfitImage.update,
        OutfitImageStatus.COMPLETED,
      );

      expect(mockLlm.generateImage).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          size: '768x1024',
          quality: 'hd',
        }),
      );
    });

    it('should persist the image via upload service after fetching', async () => {
      mockPrisma.outfitImage.create.mockResolvedValue(MOCK_DB_RECORD);
      mockPrisma.outfitImage.update.mockResolvedValue({});
      mockLlm.generateImage.mockResolvedValue({
        url: 'https://llm.example.com/generated.png',
      });
      mockUpload.uploadBuffer.mockResolvedValue({
        url: 'https://storage.example.com/persisted.png',
        key: 'outfit-image/2026/01/15/record-001.png',
        size: 2048,
        mimeType: 'image/png',
        width: 768,
        height: 1024,
      });

      await service.generate(MOCK_USER_ID, {
        items: MOCK_OUTFIT_DATA.items,
        occasion: MOCK_OUTFIT_DATA.occasion,
      });

      await waitForUpdateWithStatus(
        mockPrisma.outfitImage.update,
        OutfitImageStatus.COMPLETED,
      );

      // fetch was called to download the remote image
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://llm.example.com/generated.png',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      );

      // uploadBuffer was called to persist the image
      expect(mockUpload.uploadBuffer).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.stringContaining('outfit-image/'),
        'image/png',
        'outfit-image',
      );
    });

    it('should use remote URL directly when fetch returns non-ok response', async () => {
      mockPrisma.outfitImage.create.mockResolvedValue(MOCK_DB_RECORD);
      mockPrisma.outfitImage.update.mockResolvedValue({});
      mockLlm.generateImage.mockResolvedValue({
        url: 'https://llm.example.com/generated.png',
      });
      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        headers: { get: jest.fn() },
      });

      await service.generate(MOCK_USER_ID, {
        items: MOCK_OUTFIT_DATA.items,
        occasion: MOCK_OUTFIT_DATA.occasion,
      });

      const completedUpdate = await waitForUpdateWithStatus(
        mockPrisma.outfitImage.update,
        OutfitImageStatus.COMPLETED,
      );

      expect(completedUpdate).toBeDefined();
      // Falls back to remote URL since fetch failed
      expect(completedUpdate![0].data.imageUrl).toBe('https://llm.example.com/generated.png');
    });

    it('should use remote URL directly when fetch throws an error', async () => {
      mockPrisma.outfitImage.create.mockResolvedValue(MOCK_DB_RECORD);
      mockPrisma.outfitImage.update.mockResolvedValue({});
      mockLlm.generateImage.mockResolvedValue({
        url: 'https://llm.example.com/generated.png',
      });
      (globalThis.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await service.generate(MOCK_USER_ID, {
        items: MOCK_OUTFIT_DATA.items,
        occasion: MOCK_OUTFIT_DATA.occasion,
      });

      const completedUpdate = await waitForUpdateWithStatus(
        mockPrisma.outfitImage.update,
        OutfitImageStatus.COMPLETED,
      );

      expect(completedUpdate).toBeDefined();
      expect(completedUpdate![0].data.imageUrl).toBe('https://llm.example.com/generated.png');
    });

    it('should handle non-Error exceptions in processImageGeneration catch block', async () => {
      mockPrisma.outfitImage.create.mockResolvedValue(MOCK_DB_RECORD);
      mockPrisma.outfitImage.update.mockResolvedValue({});
      // Reject with a non-Error value
      mockLlm.generateImage.mockRejectedValue('string error message');

      await service.generate(MOCK_USER_ID, {
        items: MOCK_OUTFIT_DATA.items,
        occasion: MOCK_OUTFIT_DATA.occasion,
      });

      const failedUpdate = await waitForUpdateWithStatus(
        mockPrisma.outfitImage.update,
        OutfitImageStatus.FAILED,
      );

      expect(failedUpdate).toBeDefined();
      expect(failedUpdate![0].data.metadata.error).toBe('string error message');
    });

    it('should detect jpeg content type for jpg extension', async () => {
      mockPrisma.outfitImage.create.mockResolvedValue(MOCK_DB_RECORD);
      mockPrisma.outfitImage.update.mockResolvedValue({});
      mockLlm.generateImage.mockResolvedValue({
        url: 'https://llm.example.com/generated.jpg',
      });
      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
        headers: {
          get: jest.fn().mockReturnValue('image/jpeg'),
        },
      });
      mockUpload.uploadBuffer.mockResolvedValue({
        url: 'https://storage.example.com/persisted.jpg',
        key: 'outfit-image/2026/01/15/record-001.jpg',
        size: 2048,
        mimeType: 'image/jpeg',
        width: 768,
        height: 1024,
      });

      await service.generate(MOCK_USER_ID, {
        items: MOCK_OUTFIT_DATA.items,
        occasion: MOCK_OUTFIT_DATA.occasion,
      });

      await waitForUpdateWithStatus(
        mockPrisma.outfitImage.update,
        OutfitImageStatus.COMPLETED,
      );

      // Should pass jpeg mime type to uploadBuffer
      expect(mockUpload.uploadBuffer).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.stringMatching(/\.jpg$/),
        'image/jpeg',
        'outfit-image',
      );
    });
  });

  describe('serialize (private, tested through getById)', () => {
    it('should handle null outfitData gracefully', async () => {
      const recordWithNullData = { ...MOCK_DB_RECORD, outfitData: null };
      mockPrisma.outfitImage.findUnique.mockResolvedValue(recordWithNullData);

      const result = await service.getById(MOCK_RECORD_ID, MOCK_USER_ID);

      expect(result.items).toEqual([]);
      expect(result.occasion).toBeUndefined();
      expect(result.styleTips).toBeUndefined();
    });

    it('should handle outfitData with missing optional fields', async () => {
      const recordMinimal = {
        ...MOCK_DB_RECORD,
        outfitData: { items: [{ name: '毛衣', color: '红', category: 'top' }] },
      };
      mockPrisma.outfitImage.findUnique.mockResolvedValue(recordMinimal);

      const result = await service.getById(MOCK_RECORD_ID, MOCK_USER_ID);

      expect(result.items).toHaveLength(1);
      expect(result.occasion).toBeUndefined();
      expect(result.styleTips).toBeUndefined();
    });

    it('should handle null metadata by returning undefined', async () => {
      mockPrisma.outfitImage.findUnique.mockResolvedValue(MOCK_DB_RECORD);

      const result = await service.getById(MOCK_RECORD_ID, MOCK_USER_ID);

      expect(result.metadata).toBeUndefined();
    });

    it('should return metadata when present', async () => {
      mockPrisma.outfitImage.findUnique.mockResolvedValue(MOCK_COMPLETED_RECORD);

      const result = await service.getById(MOCK_RECORD_ID, MOCK_USER_ID);

      expect(result.metadata).toEqual({ model: 'glm-5', generatedAt: '2026-01-15T10:00:05Z' });
    });
  });
});
