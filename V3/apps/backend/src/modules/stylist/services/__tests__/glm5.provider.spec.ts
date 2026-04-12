import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpException } from '@nestjs/common';
import { Glm5Provider } from '../providers/glm5.provider';
import type { ChatMessage } from '../providers/llm-provider.interface';

describe('Glm5Provider', () => {
  let provider: Glm5Provider;
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
    usage: { prompt_tokens: 15, completion_tokens: 25, total_tokens: 40 },
    model: 'glm-5',
  };

  const mockImageResponse = {
    data: [{ url: 'https://cdn.example.com/outfit.png' }],
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
        Glm5Provider,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              const config: Record<string, string> = {
                ZHIPU_API_KEY: 'test-api-key',
                ZHIPU_MODEL: 'glm-5',
              };
              return config[key] ?? defaultValue ?? '';
            }),
          },
        },
      ],
    }).compile();

    provider = module.get<Glm5Provider>(Glm5Provider);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  describe('chat', () => {
    it('should send chat request with correct headers and body', async () => {
      const result = await provider.chat(mockMessages);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('https://open.bigmodel.cn/api/paas/v4/chat/completions');
      expect(init.method).toBe('POST');
      expect(init.headers).toHaveProperty('Authorization', 'Bearer test-api-key');
      expect(init.headers).toHaveProperty('Content-Type', 'application/json');

      const body = JSON.parse(init.body as string);
      expect(body.model).toBe('glm-5');
      expect(body.messages).toHaveLength(2);
      expect(body.stream).toBe(false);

      expect(result.content).toBe('推荐一套秋季搭配');
      expect(result.usage.promptTokens).toBe(15);
      expect(result.usage.completionTokens).toBe(25);
      expect(result.model).toBe('glm-5');
    });

    it('should pass options correctly', async () => {
      await provider.chat(mockMessages, {
        temperature: 0.5,
        maxTokens: 2048,
        responseFormat: 'json_object',
      });

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
      expect(body.temperature).toBe(0.5);
      expect(body.max_tokens).toBe(2048);
      expect(body.response_format).toEqual({ type: 'json_object' });
    });

    it('should use default options when not provided', async () => {
      await provider.chat(mockMessages);

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
      expect(body.temperature).toBe(0.7);
      expect(body.max_tokens).toBe(4096);
    });

    it('should throw HttpException on API error', async () => {
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
    beforeEach(() => {
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockImageResponse),
        text: jest.fn().mockResolvedValue(''),
      } as unknown as Response);
    });

    it('should call image generation API', async () => {
      const result = await provider.generateImage('秋季穿搭效果图');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url] = fetchSpy.mock.calls[0];
      expect(url).toBe('https://open.bigmodel.cn/api/paas/v4/images/generations');

      expect(result.url).toBe('https://cdn.example.com/outfit.png');
      expect(result.cost).toBe(0.01);
    });

    it('should pass image options', async () => {
      await provider.generateImage('test', { size: '1024x1024', quality: 'standard' });

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
      expect(body.size).toBe('1024x1024');
      expect(body.quality).toBe('standard');
    });

    it('should throw when no image URL returned', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: [{ url: '' }] }),
      } as unknown as Response);

      await expect(provider.generateImage('test')).rejects.toThrow(HttpException);
    });
  });

  describe('getModelInfo', () => {
    it('should return correct model info', () => {
      const info = provider.getModelInfo();
      expect(info.name).toBe('glm-5');
      expect(info.provider).toBe('zhipu');
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

  describe('chatStream', () => {
    it('should yield chunks from SSE stream', async () => {
      const encoder = new TextEncoder();
      const streamData = [
        'data: {"choices":[{"delta":{"content":"Hello"},"finish_reason":null}]}\n\n',
        'data: {"choices":[{"delta":{"content":" World"},"finish_reason":null}]}\n\n',
        'data: [DONE]\n\n',
      ].join('');

      const mockReadableStream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(streamData));
          controller.close();
        },
      });

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: mockReadableStream,
        text: jest.fn().mockResolvedValue(''),
      } as unknown as Response);

      const chunks: Array<{ content: string; done: boolean }> = [];
      for await (const chunk of provider.chatStream(mockMessages)) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      const textChunks = chunks.filter((c) => c.content);
      expect(textChunks.map((c) => c.content).join('')).toContain('Hello');
    });

    it('should throw HttpException when stream response is not ok', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Internal Server Error'),
        body: null,
      } as unknown as Response);

      await expect(
        (async () => {
          for await (const _ of provider.chatStream(mockMessages)) {
            // consume
          }
        })(),
      ).rejects.toThrow(HttpException);
    });

    it('should throw HttpException when stream has no body', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: null,
        text: jest.fn().mockResolvedValue(''),
      } as unknown as Response);

      await expect(
        (async () => {
          for await (const _ of provider.chatStream(mockMessages)) {
            // consume
          }
        })(),
      ).rejects.toThrow(HttpException);
    });

    it('should handle finish_reason stop in stream', async () => {
      const encoder = new TextEncoder();
      const streamData = [
        'data: {"choices":[{"delta":{"content":"Done"},"finish_reason":"stop"}]}\n\n',
      ].join('');

      const mockReadableStream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(streamData));
          controller.close();
        },
      });

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: mockReadableStream,
        text: jest.fn().mockResolvedValue(''),
      } as unknown as Response);

      const chunks: Array<{ content: string; done: boolean }> = [];
      for await (const chunk of provider.chatStream(mockMessages)) {
        chunks.push(chunk);
      }

      const doneChunks = chunks.filter((c) => c.done);
      expect(doneChunks.length).toBeGreaterThan(0);
    });

    it('should handle malformed SSE data gracefully', async () => {
      const encoder = new TextEncoder();
      const streamData = [
        'data: not-valid-json\n\n',
        'data: {"choices":[{"delta":{"content":"Valid"},"finish_reason":null}]}\n\n',
        'data: [DONE]\n\n',
      ].join('');

      const mockReadableStream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(streamData));
          controller.close();
        },
      });

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: mockReadableStream,
        text: jest.fn().mockResolvedValue(''),
      } as unknown as Response);

      const chunks: Array<{ content: string; done: boolean }> = [];
      for await (const chunk of provider.chatStream(mockMessages)) {
        chunks.push(chunk);
      }

      const textChunks = chunks.filter((c) => c.content);
      expect(textChunks.some((c) => c.content === 'Valid')).toBe(true);
    });

    it('should yield final done chunk when stream ends without explicit done', async () => {
      const encoder = new TextEncoder();
      const streamData = [
        'data: {"choices":[{"delta":{"content":"Hi"},"finish_reason":null}]}\n\n',
      ].join('');

      const mockReadableStream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(streamData));
          controller.close();
        },
      });

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: mockReadableStream,
        text: jest.fn().mockResolvedValue(''),
      } as unknown as Response);

      const chunks: Array<{ content: string; done: boolean }> = [];
      for await (const chunk of provider.chatStream(mockMessages)) {
        chunks.push(chunk);
      }

      // Should have at least one done chunk at the end
      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk.done).toBe(true);
    });

    it('should pass stream options correctly', async () => {
      const encoder = new TextEncoder();
      const streamData = 'data: [DONE]\n\n';

      const mockReadableStream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(streamData));
          controller.close();
        },
      });

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: mockReadableStream,
        text: jest.fn().mockResolvedValue(''),
      } as unknown as Response);

      await (async () => {
        for await (const _ of provider.chatStream(mockMessages, {
          temperature: 0.3,
          maxTokens: 512,
        })) {
          // consume
        }
      })();

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
      expect(body.stream).toBe(true);
      expect(body.temperature).toBe(0.3);
      expect(body.max_tokens).toBe(512);
    });
  });

  describe('fetchWithRetry', () => {
    it('should retry on network failure and eventually succeed', async () => {
      fetchSpy
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(mockChatResponse),
          text: jest.fn().mockResolvedValue(''),
        } as unknown as Response);

      const result = await provider.chat(mockMessages);

      expect(result.content).toBe('推荐一套秋季搭配');
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    }, 15000);

    it('should throw HttpException after max retries', async () => {
      fetchSpy.mockRejectedValue(new Error('Persistent failure'));

      await expect(provider.chat(mockMessages)).rejects.toThrow(HttpException);
    }, 15000);
  });

  describe('requestWithRetry error handling', () => {
    it('should throw HttpException on 500 server error', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Internal Server Error'),
        json: jest.fn(),
      } as unknown as Response);

      await expect(provider.chat(mockMessages)).rejects.toThrow(HttpException);
    });

    it('should throw HttpException on unknown non-ok status', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 418,
        text: jest.fn().mockResolvedValue('I am a teapot'),
        json: jest.fn(),
      } as unknown as Response);

      await expect(provider.chat(mockMessages)).rejects.toThrow(HttpException);
    });
  });

  describe('generateImage edge cases', () => {
    it('should throw when image response has no data array element', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: [] }),
        text: jest.fn().mockResolvedValue(''),
      } as unknown as Response);

      await expect(provider.generateImage('test')).rejects.toThrow(HttpException);
    });

    it('should use default size and quality when not specified', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockImageResponse),
        text: jest.fn().mockResolvedValue(''),
      } as unknown as Response);

      await provider.generateImage('test prompt');

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
      expect(body.size).toBe('1024x768');
      expect(body.quality).toBe('hd');
    });
  });
});
