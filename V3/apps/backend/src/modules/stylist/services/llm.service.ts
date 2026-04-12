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
} from './providers/llm-provider.interface';
import { Glm5Provider } from './providers/glm5.provider';
import { DeepSeekProvider } from './providers/deepseek.provider';
import { MockProvider } from './providers/mock.provider';

type ProviderTier = 'glm5' | 'deepseek' | 'mock';

const PROVIDER_PRIORITY: ProviderTier[] = ['glm5', 'deepseek', 'mock'];

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly providers: Map<ProviderTier, ILLMProvider>;
  private readonly isDevelopment: boolean;

  constructor(
    private readonly configService: ConfigService,
    glm5Provider: Glm5Provider,
    deepseekProvider: DeepSeekProvider,
    mockProvider: MockProvider,
  ) {
    this.providers = new Map<ProviderTier, ILLMProvider>([
      ['glm5', glm5Provider],
      ['deepseek', deepseekProvider],
      ['mock', mockProvider],
    ]);

    this.isDevelopment = this.configService.get<string>('APP_ENV', 'development') === 'development';
  }

  private getMockProvider(): ILLMProvider {
    const mock = this.providers.get('mock');
    if (!mock) {
      throw new HttpException('Mock provider not available', HttpStatus.SERVICE_UNAVAILABLE);
    }
    return mock;
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    if (this.isDevelopment && !this.hasApiKey('glm5') && !this.hasApiKey('deepseek')) {
      this.logger.log('No API keys configured, using mock provider');
      return this.getMockProvider().chat(messages, options);
    }

    return this.executeWithFallback((provider) => provider.chat(messages, options));
  }

  async *chatStream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<ChatChunk> {
    if (this.isDevelopment && !this.hasApiKey('glm5') && !this.hasApiKey('deepseek')) {
      this.logger.log('No API keys configured, using mock provider for stream');
      yield* this.getMockProvider().chatStream(messages, options);
      return;
    }

    const provider = this.selectProvider();
    try {
      yield* provider.chatStream(messages, options);
    } catch (error) {
      this.logger.warn(`Stream failed on ${this.getProviderName(provider)}, falling back`);
      const fallback = this.getNextProvider(provider);
      if (fallback) {
        yield* fallback.chatStream(messages, options);
      } else {
        throw this.toHttpException(error);
      }
    }
  }

  async generateImage(prompt: string, options?: ImageOptions): Promise<ImageResponse> {
    if (this.isDevelopment && !this.hasApiKey('glm5')) {
      this.logger.log('No GLM-5 API key configured, using mock provider for image');
      return this.getMockProvider().generateImage(prompt, options);
    }

    return this.executeWithFallback(
      (provider) => provider.generateImage(prompt, options),
      ['glm5', 'mock'],
    );
  }

  getModelInfo(): ModelInfo {
    const provider = this.selectProvider();
    return provider.getModelInfo();
  }

  async healthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [name, provider] of this.providers) {
      try {
        results[name] = await provider.healthCheck();
      } catch {
        results[name] = false;
      }
    }

    return results;
  }

  getActiveProvider(): string {
    return this.getProviderName(this.selectProvider());
  }

  private selectProvider(): ILLMProvider {
    for (const tier of PROVIDER_PRIORITY) {
      if (tier === 'mock' && this.isDevelopment) {
        continue;
      }
      const provider = this.providers.get(tier);
      if (provider && this.hasApiKey(tier)) {
        return provider;
      }
    }

    if (this.isDevelopment) {
      return this.getMockProvider();
    }

    return this.getMockProvider();
  }

  private getNextProvider(current: ILLMProvider): ILLMProvider | null {
    const currentName = this.getProviderName(current);
    const currentIndex = PROVIDER_PRIORITY.indexOf(currentName as ProviderTier);

    for (let i = currentIndex + 1; i < PROVIDER_PRIORITY.length; i++) {
      const nextTier = PROVIDER_PRIORITY[i];
      const nextProvider = this.providers.get(nextTier);
      if (nextProvider) {
        if (nextTier === 'mock' && !this.isDevelopment) {
          continue;
        }
        return nextProvider;
      }
    }

    return null;
  }

  private async executeWithFallback<T>(
    operation: (provider: ILLMProvider) => Promise<T>,
    tiers?: ProviderTier[],
  ): Promise<T> {
    const providerOrder = tiers ?? PROVIDER_PRIORITY;

    for (const tier of providerOrder) {
      const provider = this.providers.get(tier);
      if (!provider) continue;

      if (tier !== 'mock' && !this.hasApiKey(tier)) continue;

      try {
        return await operation(provider);
      } catch (error) {
        this.logger.warn(
          `Operation failed on ${tier}: ${error instanceof Error ? error.message : String(error)}`,
        );

        const isLastProvider = providerOrder.indexOf(tier) === providerOrder.length - 1;
        if (isLastProvider) {
          throw this.toHttpException(error);
        }

        continue;
      }
    }

    throw new HttpException('No LLM provider available', HttpStatus.SERVICE_UNAVAILABLE);
  }

  private hasApiKey(tier: ProviderTier): boolean {
    switch (tier) {
      case 'glm5':
        return !!this.configService.get<string>('ZHIPU_API_KEY', '');
      case 'deepseek':
        return !!this.configService.get<string>('DEEPSEEK_API_KEY', '');
      case 'mock':
        return true;
      default:
        return false;
    }
  }

  private getProviderName(provider: ILLMProvider): string {
    const info = provider.getModelInfo();
    return info.provider;
  }

  private toHttpException(error: unknown): HttpException {
    if (error instanceof HttpException) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    return new HttpException(
      `LLM service error: ${message}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
