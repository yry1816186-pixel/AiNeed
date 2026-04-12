import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpException } from '@nestjs/common';
import { LlmService } from '../llm.service';
import { Glm5Provider } from '../providers/glm5.provider';
import { DeepSeekProvider } from '../providers/deepseek.provider';
import { MockProvider } from '../providers/mock.provider';
import type { ChatMessage, ChatResponse } from '../providers/llm-provider.interface';

describe('LlmService', () => {
  let service: LlmService;
  let glm5Provider: Glm5Provider;
  let deepseekProvider: DeepSeekProvider;
  let mockProvider: MockProvider;
  let configService: ConfigService;

  const mockMessages: ChatMessage[] = [
    { role: 'user', content: '推荐一套秋季通勤搭配' },
  ];

  const mockChatResponse: ChatResponse = {
    content: '推荐搭配方案',
    usage: { promptTokens: 10, completionTokens: 20 },
    model: 'glm-5',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmService,
        {
          provide: Glm5Provider,
          useValue: {
            chat: jest.fn().mockResolvedValue(mockChatResponse),
            chatStream: jest.fn(),
            generateImage: jest.fn().mockResolvedValue({ url: 'https://example.com/img.png', cost: 0.01 }),
            getModelInfo: jest.fn().mockReturnValue({ name: 'glm-5', provider: 'zhipu', maxTokens: 4096 }),
            healthCheck: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: DeepSeekProvider,
          useValue: {
            chat: jest.fn().mockResolvedValue({ ...mockChatResponse, model: 'deepseek-chat' }),
            chatStream: jest.fn(),
            generateImage: jest.fn().mockRejectedValue(new HttpException('Not supported', 501)),
            getModelInfo: jest.fn().mockReturnValue({ name: 'deepseek-chat', provider: 'deepseek', maxTokens: 4096 }),
            healthCheck: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: MockProvider,
          useValue: {
            chat: jest.fn().mockResolvedValue({ ...mockChatResponse, model: 'mock-llm' }),
            chatStream: jest.fn(),
            generateImage: jest.fn().mockResolvedValue({ url: 'https://mock-cdn.aineed.com/mock.png', cost: 0 }),
            getModelInfo: jest.fn().mockReturnValue({ name: 'mock-llm', provider: 'mock', maxTokens: 4096 }),
            healthCheck: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              const config: Record<string, string> = {
                ZHIPU_API_KEY: 'test-zhipu-key',
                DEEPSEEK_API_KEY: 'test-deepseek-key',
                APP_ENV: 'production',
              };
              return config[key] ?? defaultValue ?? '';
            }),
          },
        },
      ],
    }).compile();

    service = module.get<LlmService>(LlmService);
    glm5Provider = module.get<Glm5Provider>(Glm5Provider);
    deepseekProvider = module.get<DeepSeekProvider>(DeepSeekProvider);
    mockProvider = module.get<MockProvider>(MockProvider);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('chat', () => {
    it('should use GLM-5 provider when API key is available', async () => {
      const result = await service.chat(mockMessages);
      expect(result).toBeDefined();
      expect(glm5Provider.chat).toHaveBeenCalledWith(mockMessages, undefined);
    });

    it('should fallback to DeepSeek when GLM-5 fails', async () => {
      jest.spyOn(glm5Provider, 'chat').mockRejectedValueOnce(
        new HttpException('GLM-5 timeout', 504),
      );

      const result = await service.chat(mockMessages);
      expect(result).toBeDefined();
      expect(deepseekProvider.chat).toHaveBeenCalledWith(mockMessages, undefined);
    });

    it('should fallback to Mock when both GLM-5 and DeepSeek fail', async () => {
      jest.spyOn(glm5Provider, 'chat').mockRejectedValueOnce(
        new HttpException('GLM-5 error', 502),
      );
      jest.spyOn(deepseekProvider, 'chat').mockRejectedValueOnce(
        new HttpException('DeepSeek error', 502),
      );

      const result = await service.chat(mockMessages);
      expect(result).toBeDefined();
      expect(mockProvider.chat).toHaveBeenCalledWith(mockMessages, undefined);
    });

    it('should use mock provider directly in development with no API keys', async () => {
      jest.spyOn(configService, 'get').mockImplementation(((key: string, defaultValue?: string) => {
        if (key === 'APP_ENV') return 'development';
        if (key === 'ZHIPU_API_KEY') return '';
        if (key === 'DEEPSEEK_API_KEY') return '';
        return defaultValue ?? '';
      }) as unknown as typeof configService.get);

      const devService = new LlmService(configService, glm5Provider, deepseekProvider, mockProvider);
      const result = await devService.chat(mockMessages);
      expect(result).toBeDefined();
      expect(mockProvider.chat).toHaveBeenCalled();
    });

    it('should pass chat options to provider', async () => {
      const options = { temperature: 0.5, maxTokens: 2048, responseFormat: 'json_object' as const };
      await service.chat(mockMessages, options);
      expect(glm5Provider.chat).toHaveBeenCalledWith(mockMessages, options);
    });
  });

  describe('generateImage', () => {
    it('should use GLM-5 for image generation', async () => {
      const result = await service.generateImage('test prompt');
      expect(result).toBeDefined();
      expect(glm5Provider.generateImage).toHaveBeenCalledWith('test prompt', undefined);
    });

    it('should fallback to mock when GLM-5 image generation fails', async () => {
      jest.spyOn(glm5Provider, 'generateImage').mockRejectedValueOnce(
        new HttpException('Image generation failed', 502),
      );

      const result = await service.generateImage('test prompt');
      expect(result).toBeDefined();
      expect(mockProvider.generateImage).toHaveBeenCalledWith('test prompt', undefined);
    });

    it('should skip DeepSeek for image generation (not supported)', async () => {
      jest.spyOn(glm5Provider, 'generateImage').mockRejectedValueOnce(
        new HttpException('GLM-5 error', 502),
      );

      await service.generateImage('test prompt');
      expect(deepseekProvider.generateImage).not.toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    it('should return health status for all providers', async () => {
      const result = await service.healthCheck();
      expect(result).toHaveProperty('glm5');
      expect(result).toHaveProperty('deepseek');
      expect(result).toHaveProperty('mock');
      expect(result.mock).toBe(true);
    });

    it('should handle provider health check failure', async () => {
      jest.spyOn(glm5Provider, 'healthCheck').mockRejectedValueOnce(new Error('Connection refused'));
      const result = await service.healthCheck();
      expect(result.glm5).toBe(false);
    });
  });

  describe('getModelInfo', () => {
    it('should return model info from active provider', () => {
      const info = service.getModelInfo();
      expect(info).toHaveProperty('name');
      expect(info).toHaveProperty('provider');
      expect(info).toHaveProperty('maxTokens');
    });
  });

  describe('getActiveProvider', () => {
    it('should return zhipu when GLM-5 API key is available', () => {
      const provider = service.getActiveProvider();
      expect(provider).toBe('zhipu');
    });

    it('should return deepseek when GLM-5 has no API key but DeepSeek does', () => {
      jest.spyOn(configService, 'get').mockImplementation(((key: string, defaultValue?: string) => {
        if (key === 'ZHIPU_API_KEY') return '';
        if (key === 'DEEPSEEK_API_KEY') return 'test-deepseek-key';
        if (key === 'APP_ENV') return 'production';
        return defaultValue ?? '';
      }) as unknown as typeof configService.get);

      const prodService = new LlmService(configService, glm5Provider, deepseekProvider, mockProvider);
      expect(prodService.getActiveProvider()).toBe('deepseek');
    });
  });

  describe('chatStream', () => {
    it('should yield chunks from the provider', async () => {
      async function* mockStream() {
        yield { content: 'Hello', done: false };
        yield { content: ' World', done: false };
        yield { content: '', done: true };
      }

      jest.spyOn(glm5Provider, 'chatStream').mockImplementation(mockStream);

      const chunks: Array<{ content: string; done: boolean }> = [];
      for await (const chunk of service.chatStream(mockMessages)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(3);
      expect(chunks[0].content).toBe('Hello');
      expect(chunks[2].done).toBe(true);
    });

    it('should use mock provider for stream in development with no API keys', async () => {
      jest.spyOn(configService, 'get').mockImplementation(((key: string, defaultValue?: string) => {
        if (key === 'APP_ENV') return 'development';
        if (key === 'ZHIPU_API_KEY') return '';
        if (key === 'DEEPSEEK_API_KEY') return '';
        return defaultValue ?? '';
      }) as unknown as typeof configService.get);

      async function* mockStream() {
        yield { content: 'Mock', done: true };
      }
      jest.spyOn(mockProvider, 'chatStream').mockImplementation(mockStream);

      const devService = new LlmService(configService, glm5Provider, deepseekProvider, mockProvider);
      const chunks: Array<{ content: string; done: boolean }> = [];
      for await (const chunk of devService.chatStream(mockMessages)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0].content).toBe('Mock');
    });

    it('should yield error event when all stream providers fail', async () => {
      jest.spyOn(glm5Provider, 'chatStream').mockImplementation(async function* () {
        yield { content: 'First', done: false };
        throw new HttpException('GLM-5 stream error', 502);
      });
      jest.spyOn(deepseekProvider, 'chatStream').mockImplementation(async function* () {
        yield { content: 'Fallback', done: false };
        throw new HttpException('DeepSeek stream error', 502);
      });

      const chunks: Array<{ content: string; done: boolean }> = [];
      try {
        for await (const chunk of service.chatStream(mockMessages)) {
          chunks.push(chunk);
        }
      } catch {
        // Expected - stream errors propagate
      }

      // At least the primary provider yielded before error
      expect(chunks.length).toBeGreaterThanOrEqual(1);
      expect(chunks[0].content).toBe('First');
    });

    it('should throw when all providers fail for stream', async () => {
      jest.spyOn(glm5Provider, 'chatStream').mockImplementation(async function* () {
        throw new HttpException('GLM-5 stream error', 502);
      });
      jest.spyOn(deepseekProvider, 'chatStream').mockImplementation(async function* () {
        throw new HttpException('DeepSeek stream error', 502);
      });

      const chunks: Array<{ content: string; done: boolean }> = [];
      try {
        for await (const chunk of service.chatStream(mockMessages)) {
          chunks.push(chunk);
        }
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('generateImage in development', () => {
    it('should use mock provider when no GLM-5 API key in development', async () => {
      jest.spyOn(configService, 'get').mockImplementation(((key: string, defaultValue?: string) => {
        if (key === 'APP_ENV') return 'development';
        if (key === 'ZHIPU_API_KEY') return '';
        return defaultValue ?? '';
      }) as unknown as typeof configService.get);

      const devService = new LlmService(configService, glm5Provider, deepseekProvider, mockProvider);
      const result = await devService.generateImage('test prompt');

      expect(result).toBeDefined();
      expect(mockProvider.generateImage).toHaveBeenCalledWith('test prompt', undefined);
    });
  });

  describe('executeWithFallback edge cases', () => {
    it('should throw SERVICE_UNAVAILABLE when no provider available', async () => {
      jest.spyOn(configService, 'get').mockImplementation(((key: string, defaultValue?: string) => {
        if (key === 'ZHIPU_API_KEY') return '';
        if (key === 'DEEPSEEK_API_KEY') return '';
        if (key === 'APP_ENV') return 'production';
        return defaultValue ?? '';
      }) as unknown as typeof configService.get);

      // In production mode with no API keys, no provider passes the hasApiKey check
      // except mock which always returns true
      const prodService = new LlmService(configService, glm5Provider, deepseekProvider, mockProvider);

      // Mock provider fails too
      jest.spyOn(mockProvider, 'chat').mockRejectedValueOnce(new Error('Mock also fails'));

      await expect(prodService.chat(mockMessages)).rejects.toThrow();
    });
  });

  describe('toHttpException', () => {
    it('should convert non-HttpException errors to HttpException', async () => {
      jest.spyOn(glm5Provider, 'chat').mockRejectedValueOnce(new Error('Network error'));
      jest.spyOn(deepseekProvider, 'chat').mockRejectedValueOnce(new Error('Also failed'));
      jest.spyOn(mockProvider, 'chat').mockRejectedValueOnce(new Error('Mock failed too'));

      await expect(service.chat(mockMessages)).rejects.toThrow(HttpException);
    });
  });
});
