import { MockProvider } from '../providers/mock.provider';
import type { ChatMessage } from '../providers/llm-provider.interface';

describe('MockProvider', () => {
  let provider: MockProvider;

  beforeEach(() => {
    provider = new MockProvider();
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  describe('chat', () => {
    it('should return outfit response for outfit-related messages', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: '推荐一套秋季搭配' },
      ];

      const result = await provider.chat(messages);

      expect(result.content).toContain('搭配方案');
      expect(result.model).toBe('mock-llm');
      expect(result.usage.promptTokens).toBeGreaterThan(0);
      expect(result.usage.completionTokens).toBeGreaterThan(0);
    });

    it('should return color advice for color-related messages', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: '帮我看看什么颜色适合我' },
      ];

      const result = await provider.chat(messages);

      expect(result.content).toContain('色彩');
      expect(result.content).toContain('中性色系');
    });

    it('should return body type advice for body-related messages', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: '梨型身材怎么穿' },
      ];

      const result = await provider.chat(messages);

      expect(result.content).toContain('体型');
      expect(result.content).toContain('梨型');
    });

    it('should return default greeting for unrelated messages', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: '你好' },
      ];

      const result = await provider.chat(messages);

      expect(result.content).toContain('小衣');
      expect(result.content).toContain('AI');
    });

    it('should handle empty messages array', async () => {
      const messages: ChatMessage[] = [];

      const result = await provider.chat(messages);

      expect(result.content).toBeDefined();
      expect(result.model).toBe('mock-llm');
    });

    it('should calculate usage based on message content length', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: '短' },
      ];

      const result = await provider.chat(messages);

      expect(result.usage.promptTokens).toBe(1);
    });

    it('should accept chat options without error', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: '推荐搭配' },
      ];

      const result = await provider.chat(messages, {
        temperature: 0.5,
        maxTokens: 100,
        responseFormat: 'json_object',
      });

      expect(result).toBeDefined();
    });
  });

  describe('chatStream', () => {
    it('should yield character-by-character chunks and a final done chunk', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: '推荐穿搭' },
      ];

      const chunks: Array<{ content: string; done: boolean }> = [];
      for await (const chunk of provider.chatStream(messages)) {
        chunks.push(chunk);
      }

      // Last chunk should be done
      expect(chunks[chunks.length - 1].done).toBe(true);
      expect(chunks[chunks.length - 1].content).toBe('');

      // All other chunks should have content
      const contentChunks = chunks.slice(0, -1);
      for (const chunk of contentChunks) {
        expect(chunk.content.length).toBe(1);
        expect(chunk.done).toBe(false);
      }

      // Reconstructed content should be a string
      const fullContent = contentChunks.map((c) => c.content).join('');
      expect(fullContent.length).toBeGreaterThan(0);
    });

    it('should handle empty messages array in stream', async () => {
      const messages: ChatMessage[] = [];

      const chunks: Array<{ content: string; done: boolean }> = [];
      for await (const chunk of provider.chatStream(messages)) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[chunks.length - 1].done).toBe(true);
    });

    it('should accept stream options without error', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: '你好' },
      ];

      const chunks: Array<{ content: string; done: boolean }> = [];
      for await (const chunk of provider.chatStream(messages, {
        temperature: 0.8,
        maxTokens: 2048,
      })) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
    });
  });

  describe('generateImage', () => {
    it('should return a mock image URL with zero cost', async () => {
      const result = await provider.generateImage('outfit image prompt');

      expect(result.url).toMatch(/^https:\/\/mock-cdn\.aineed\.com\/mock-outfit-\d+\.png$/);
      expect(result.cost).toBe(0);
    });

    it('should accept image options without error', async () => {
      const result = await provider.generateImage('test', {
        size: '1024x1024',
        quality: 'hd',
      });

      expect(result).toBeDefined();
      expect(result.url).toBeTruthy();
    });
  });

  describe('getModelInfo', () => {
    it('should return correct model info', () => {
      const info = provider.getModelInfo();

      expect(info.name).toBe('mock-llm');
      expect(info.provider).toBe('mock');
      expect(info.maxTokens).toBe(4096);
    });
  });

  describe('healthCheck', () => {
    it('should always return true', async () => {
      const result = await provider.healthCheck();
      expect(result).toBe(true);
    });
  });
});
