import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

const DEEPSEEK_CHAT_URL = 'https://api.deepseek.com/chat/completions';
const DEFAULT_MODEL = 'deepseek-chat';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 4096;

interface DeepSeekChatRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  response_format?: { type: string };
}

interface DeepSeekChatResponse {
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

interface DeepSeekStreamDelta {
  choices: Array<{
    index: number;
    delta: { role?: string; content?: string };
    finish_reason: string | null;
  }>;
}

@Injectable()
export class DeepSeekProvider implements ILLMProvider {
  private readonly logger = new Logger(DeepSeekProvider.name);
  private readonly apiKey: string;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('DEEPSEEK_API_KEY', '');
    this.model = DEFAULT_MODEL;
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const body: DeepSeekChatRequest = {
      model: this.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options?.temperature ?? DEFAULT_TEMPERATURE,
      max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
      stream: false,
    };

    if (options?.responseFormat === 'json_object') {
      body.response_format = { type: 'json_object' };
    }

    const response = await this.requestWithRetry<DeepSeekChatResponse>(DEEPSEEK_CHAT_URL, body);

    const choice = response.choices[0];
    if (!choice) {
      throw new HttpException('DeepSeek returned no choices', HttpStatus.BAD_GATEWAY);
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
    const body: DeepSeekChatRequest = {
      model: this.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options?.temperature ?? DEFAULT_TEMPERATURE,
      max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
      stream: true,
    };

    const response = await this.fetchWithRetry(DEEPSEEK_CHAT_URL, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new HttpException(
        `DeepSeek stream request failed: ${response.status} ${errorText}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    if (!response.body) {
      throw new HttpException('DeepSeek stream returned no body', HttpStatus.BAD_GATEWAY);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          if (trimmed.startsWith('data:')) {
            const data = trimmed.slice(5).trim();
            if (data === '[DONE]') {
              yield { content: '', done: true };
              return;
            }

            try {
              const parsed: DeepSeekStreamDelta = JSON.parse(data);
              const delta = parsed.choices[0]?.delta;
              if (delta?.content) {
                yield { content: delta.content, done: false };
              }
              if (parsed.choices[0]?.finish_reason === 'stop') {
                yield { content: '', done: true };
                return;
              }
            } catch {
              this.logger.warn(`Failed to parse SSE data: ${data}`);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    yield { content: '', done: true };
  }

  async generateImage(_prompt: string, _options?: ImageOptions): Promise<ImageResponse> {
    throw new HttpException(
      'DeepSeek does not support image generation',
      HttpStatus.NOT_IMPLEMENTED,
    );
  }

  getModelInfo(): ModelInfo {
    return {
      name: this.model,
      provider: 'deepseek',
      maxTokens: DEFAULT_MAX_TOKENS,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(DEEPSEEK_CHAT_URL, {
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
      this.logger.error(`DeepSeek API error: ${status} ${errorText}`);

      if (status === 401) {
        throw new HttpException('DeepSeek authentication failed', HttpStatus.UNAUTHORIZED);
      }
      if (status === 429) {
        throw new HttpException('DeepSeek rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
      }
      throw new HttpException(
        `DeepSeek API error: ${status} ${errorText}`,
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
          `DeepSeek request attempt ${attempt + 1}/${retries} failed: ${lastError.message}`,
        );

        if (attempt < retries - 1) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }

    throw new HttpException(
      `DeepSeek request failed after ${retries} retries: ${lastError?.message}`,
      HttpStatus.GATEWAY_TIMEOUT,
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
