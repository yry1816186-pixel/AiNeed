import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createParser, type EventSourceParser, type EventSourceMessage } from 'eventsource-parser';
import {
  ILLMProvider,
  ChatMessage,
  ChatOptions,
  ChatResponse,
  ChatChunk,
  ImageOptions,
  ImageResponse,
  ModelInfo,
} from './llm-provider.interface';

const GLM5_CHAT_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const GLM5_IMAGE_URL = 'https://open.bigmodel.cn/api/paas/v4/images/generations';
const DEFAULT_MODEL = 'glm-5';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 4096;
const IMAGE_COST_CNY = 0.01;

interface Glm5ChatRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  response_format?: { type: string };
}

interface Glm5ChatResponse {
  id: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

interface Glm5StreamDelta {
  choices: Array<{
    index: number;
    delta: { role?: string; content?: string };
    finish_reason: string | null;
  }>;
}

interface Glm5ImageResponse {
  data: Array<{
    url: string;
    b64_image?: string;
  }>;
}

@Injectable()
export class Glm5Provider implements ILLMProvider {
  private readonly logger = new Logger(Glm5Provider.name);
  private readonly apiKey: string;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ZHIPU_API_KEY', '');
    this.model = this.configService.get<string>('ZHIPU_MODEL', DEFAULT_MODEL);
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const body: Glm5ChatRequest = {
      model: this.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options?.temperature ?? DEFAULT_TEMPERATURE,
      max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
      stream: false,
    };

    if (options?.responseFormat === 'json_object') {
      body.response_format = { type: 'json_object' };
    }

    const response = await this.requestWithRetry<Glm5ChatResponse>(GLM5_CHAT_URL, body);

    const choice = response.choices[0];
    if (!choice) {
      throw new HttpException('GLM-5 returned no choices', HttpStatus.BAD_GATEWAY);
    }

    return {
      content: choice.message.content,
      usage: {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
      },
      model: response.model,
    };
  }

  async *chatStream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<ChatChunk> {
    const body: Glm5ChatRequest = {
      model: this.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options?.temperature ?? DEFAULT_TEMPERATURE,
      max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
      stream: true,
    };

    const response = await this.fetchWithRetry(GLM5_CHAT_URL, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new HttpException(
        `GLM-5 stream request failed: ${response.status} ${errorText}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    if (!response.body) {
      throw new HttpException('GLM-5 stream returned no body', HttpStatus.BAD_GATEWAY);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const pendingChunks: ChatChunk[] = [];

    const parser: EventSourceParser = createParser({
      onEvent: (event: EventSourceMessage) => {
        const data = event.data;
        if (data === '[DONE]') {
          pendingChunks.push({ content: '', done: true });
          return;
        }

        try {
          const parsed: Glm5StreamDelta = JSON.parse(data);
          const delta = parsed.choices[0]?.delta;
          if (delta?.content) {
            pendingChunks.push({ content: delta.content, done: false });
          }
          if (parsed.choices[0]?.finish_reason === 'stop') {
            pendingChunks.push({ content: '', done: true });
          }
        } catch {
          this.logger.warn(`Failed to parse SSE data: ${data}`);
        }
      },
    });

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        parser.feed(chunk);

        while (pendingChunks.length > 0) {
          const c = pendingChunks.shift()!;
          yield c;
          if (c.done) return;
        }
      }
    } finally {
      reader.releaseLock();
    }

    yield { content: '', done: true };
  }

  async generateImage(prompt: string, options?: ImageOptions): Promise<ImageResponse> {
    const body = {
      model: this.model,
      prompt,
      n: 1,
      size: options?.size ?? '1024x768',
      quality: options?.quality ?? 'hd',
    };

    const response = await this.requestWithRetry<Glm5ImageResponse>(GLM5_IMAGE_URL, body);

    const imageData = response.data[0];
    if (!imageData?.url) {
      throw new HttpException('GLM-5 image generation returned no URL', HttpStatus.BAD_GATEWAY);
    }

    return {
      url: imageData.url,
      cost: IMAGE_COST_CNY,
    };
  }

  getModelInfo(): ModelInfo {
    return {
      name: this.model,
      provider: 'zhipu',
      maxTokens: DEFAULT_MAX_TOKENS,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(GLM5_CHAT_URL, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 5,
        }),
        signal: AbortSignal.timeout(10000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  private async requestWithRetry<T>(url: string, body: unknown): Promise<T> {
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const status = response.status;
      this.logger.error(`GLM-5 API error: ${status} ${errorText}`);

      if (status === 401) {
        throw new HttpException('GLM-5 authentication failed', HttpStatus.UNAUTHORIZED);
      }
      if (status === 429) {
        throw new HttpException('GLM-5 rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
      }
      throw new HttpException(
        `GLM-5 API error: ${status} ${errorText}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    return response.json() as Promise<T>;
  }

  private async fetchWithRetry(
    url: string,
    init: RequestInit,
    retries: number = MAX_RETRIES,
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(url, {
          ...init,
          signal: AbortSignal.timeout(30000),
        });
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(
          `GLM-5 request attempt ${attempt + 1}/${retries} failed: ${lastError.message}`,
        );

        if (attempt < retries - 1) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }

    throw new HttpException(
      `GLM-5 request failed after ${retries} retries: ${lastError?.message}`,
      HttpStatus.GATEWAY_TIMEOUT,
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
