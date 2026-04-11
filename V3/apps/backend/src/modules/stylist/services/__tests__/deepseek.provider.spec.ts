import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpException } from '@nestjs/common';
import { DeepSeekProvider } from '../providers/deepseek.provider';
import type { ChatMessage } from '../providers/llm-provider.interface';

describe('DeepSeekProvider', () => {
  let provider: DeepSeekProvider;
  let fetchSpy: jest.SpyInstance;

  const mockMessages: ChatMessage[] = [
    { role: 'system', content: 'You are a stylist' },
    { role: 'user', content: '推荐搭配' },
  ];

  const mockChatResponse = {
    id: 'chat-1',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: '推荐一套秋季搭配' },
        finish_reason: 'stop',
      },
    ],
    usage: { prompt_tokens: 12, completion_tokens: 22, total_tokens: 34 },
    model: 'deepseek-chat',
  };

  beforeEach(() => {
    fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(mockChatResponse),
      text: jest.fn().mockResolvedValue(''),
      body: null,
    } as unknown as Response);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeepSeekProvider,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              const config: Record<string, string> = {
                DEEPSEEK_API_KEY: 'test-deepseek-key',
              };
              return config[key] ?? defaultValue ?? '';
            }),
          },
        },
      ],
    }).compile();

    provider = module.get<DeepSeekProvider>(DeepSeekProvider);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  describe('chat', () => {
    it('should send chat request with correct headers and body', async () => {
      const result = await provider.chat(mockMessages);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('https://api.deepseek.com/chat/completions');
      expect(init.method).toBe('POST');
      expect(init.headers).toHaveProperty('Authorization', 'Bearer test-deepseek-key');
      expect(init.headers).toHaveProperty('Content-Type', 'application/json');

      const body = JSON.parse(init.body as string);
      expect(body.model).toBe('deepseek-chat');
      expect(body.messages).toHaveLength(2);
      expect(body.stream).toBe(false);

      expect(result.content).toBe('推荐一套秋季搭配');
      expect(result.usage.promptTokens).toBe(12);
      expect(result.usage.completionTokens).toBe(22);
      expect(result.model).toBe('deepseek-chat');
    });

    it('should pass options correctly', async () => {
      await provider.chat(mockMessages, {
        temperature: 0.3,
        maxTokens: 1024,
        responseFormat: 'json_object',
      });

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
      expect(body.temperature).toBe(0.3);
      expect(body.max_tokens).toBe(1024);
      expect(body.response_format).toEqual({ type: 'json_object' });
    });

    it('should throw HttpException on authentication failure', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: jest.fn().mockResolvedValue('Unauthorized'),
        json: jest.fn(),
      } as unknown as Response);

      await expect(provider.chat(mockMessages)).rejects.toThrow(HttpException);
    });

    it('should throw on rate limit', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: jest.fn().mockResolvedValue('Rate limited'),
        json: jest.fn(),
      } as unknown as Response);

      await expect(provider.chat(mockMessages)).rejects.toThrow(HttpException);
    });

    it('should throw when no choices returned', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ choices: [], usage: { prompt_tokens: 0, completion_tokens: 0 } }),
      } as unknown as Response);

      await expect(provider.chat(mockMessages)).rejects.toThrow(HttpException);
    });
  });

  describe('generateImage', () => {
    it('should throw NOT_IMPLEMENTED for image generation', async () => {
      await expect(provider.generateImage('test prompt')).rejects.toThrow(HttpException);
      await expect(provider.generateImage('test prompt')).rejects.toThrow(
        'DeepSeek does not support image generation',
      );
    });
  });

  describe('getModelInfo', () => {
    it('should return correct model info', () => {
      const info = provider.getModelInfo();
      expect(info.name).toBe('deepseek-chat');
      expect(info.provider).toBe('deepseek');
      expect(info.maxTokens).toBe(4096);
    });
  });

  describe('healthCheck', () => {
    it('should return true when API is reachable', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as unknown as Response);

      const result = await provider.healthCheck();
      expect(result).toBe(true);
    });

    it('should return false when API is unreachable', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await provider.healthCheck();
      expect(result).toBe(false);
    });
  });
});
