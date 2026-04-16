/**
 * @fileoverview LLM Provider Service - Multi-provider abstraction layer.
 *
 * Provides a unified interface for calling LLM APIs with automatic
 * provider failover (DeepSeek -> Qwen -> ZhipuAI GLM), retry logic,
 * structured response parsing, and streaming support.
 *
 * Provider priority:
 *   1. DeepSeek V3 (cheapest, excellent Chinese quality)
 *   2. Qwen / DashScope (generous free tier via Alibaba Cloud)
 *   3. ZhipuAI GLM-4-Flash (completely free, 128K context)
 *   4. OpenAI-compatible (custom endpoint)
 *
 * @module LlmProviderService
 */

import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

// Import shared types
import {
  type LlmProvider,
  type LlmChatMessage,
  type LlmChatResponse,
  type LlmStructuredResponse,
  type LlmHealthCheck,
  type LlmStreamChunk,
  type RetryConfig,
  type LlmProviderConfig,
  type LlmUsageMetrics,
} from "./types";

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,
  baseDelayMs: 500,
  maxDelayMs: 5000,
  retryableStatusCodes: [429, 500, 502, 503, 504],
};

/**
 * Known provider endpoint defaults.
 */
const PROVIDER_DEFAULTS = {
  deepseek: {
    endpoint: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
  },
  qwen: {
    endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen-plus",
  },
  zhipu: {
    endpoint: "https://open.bigmodel.cn/api/paas/v4",
    model: "glm-5",
  },
  openai: {
    endpoint: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  },
} as const;

// ==================== Service ====================

/**
 * LLM Provider Service
 *
 * Abstracts LLM API interactions with:
 * - Multi-provider failover chain (DeepSeek -> Qwen -> ZhipuAI -> OpenAI)
 * - Automatic retry with exponential backoff per provider
 * - Structured JSON response parsing
 * - SSE streaming support
 * - Per-provider circuit breaker
 * - Usage metrics logging
 *
 * @example
 * ```typescript
 * const response = await llmProvider.chat({
 *   messages: [
 *     { role: "system", content: "You are a stylist." },
 *     { role: "user", content: "I need an interview outfit" }
 *   ],
 *   maxTokens: 800,
 * });
 *
 * const structured = await llmProvider.chatStructured<MySlots>({
 *   messages: [...],
 *   responseHint: "Return JSON with fields: occasion, styles, budget"
 * });
 * ```
 */
@Injectable()
export class LlmProviderService implements OnModuleInit {
  private readonly logger = new Logger(LlmProviderService.name);
  private config!: LlmProviderConfig;
  private readonly fallbackChain: LlmProviderConfig[] = [];
  private readonly retryConfig: RetryConfig;
  private readonly circuitBreakers = new Map<LlmProvider, {
    consecutiveFailures: number;
    lastFailureTime: number;
  }>();
  private readonly circuitBreakerThreshold = 5;
  private readonly circuitBreakerResetMs = 60_000;

  constructor(private readonly configService: ConfigService) {
    this.retryConfig = DEFAULT_RETRY_CONFIG;
  }

  onModuleInit(): void {
    const providers = this.resolveAllProviders();
    this.config = providers.primary;
    this.fallbackChain.length = 0;
    this.fallbackChain.push(...providers.fallbacks);

    const chainDescription = [
      `${this.config.provider}/${this.config.model}`,
      ...this.fallbackChain.map(
        (fallback) => `${fallback.provider}/${fallback.model}`,
      ),
    ].join(" -> ");

    this.logger.log(`LLM Provider chain: ${chainDescription}`);
    this.logger.log(
      `API key status: ${this.config.apiKey ? "configured" : "NOT configured - using fallback mode"}`,
    );
  }

  // ==================== Public API ====================

  /**
   * Check if the LLM provider is configured and ready.
   */
  get isConfigured(): boolean {
    return Boolean(this.config?.apiKey && this.config?.endpoint && this.config?.model);
  }

  /**
   * Get the current primary provider name.
   */
  get providerName(): string {
    return this.config?.provider ?? "none";
  }

  /**
   * Get the current primary model name.
   */
  get modelName(): string {
    return this.config?.model ?? "none";
  }

  /**
   * Send a chat completion request with automatic provider failover.
   *
   * Tries the primary provider first. If it fails, falls back through
   * the configured chain (DeepSeek -> Qwen -> ZhipuAI).
   *
   * @param params - Chat parameters including messages and optional overrides
   * @returns The LLM response
   * @throws Error if all providers fail
   */
  async chat(params: {
    messages: LlmChatMessage[];
    maxTokens?: number;
    temperature?: number;
    requestId?: string;
  }): Promise<LlmChatResponse> {
    if (!this.isConfigured) {
      throw new Error(
        "LLM provider is not configured. Set DEEPSEEK_API_KEY, DASHSCOPE_API_KEY, or GLM_API_KEY in .env",
      );
    }

    const maxTokens = params.maxTokens ?? this.config.maxTokens;
    const temperature = params.temperature ?? this.config.temperature;
    const requestId = params.requestId ?? `chat-${Date.now()}`;

    this.logger.debug(
      `[${requestId}] Sending chat request (${params.messages.length} messages)`,
    );

    // Try primary provider
    if (this.isProviderAvailable(this.config.provider)) {
      try {
        const response = await this.executeWithRetry(
          this.config,
          params.messages,
          maxTokens,
          temperature,
          requestId,
        );
        this.logUsageMetrics({
          provider: response.provider,
          model: response.model,
          latencyMs: 0,
          promptTokens: response.usage.promptTokens,
          completionTokens: response.usage.completionTokens,
          totalTokens: response.usage.totalTokens,
          requestId,
          success: true,
          fallbackUsed: false,
        });
        return response;
      } catch (primaryError) {
        const errorMessage =
          primaryError instanceof Error ? primaryError.message : String(primaryError);
        this.logger.warn(
          `[${requestId}] Primary provider (${this.config.provider}) failed: ${errorMessage}`,
        );
      }
    }

    // Try fallback providers
    for (const fallbackConfig of this.fallbackChain) {
      if (!this.isProviderAvailable(fallbackConfig.provider)) {
        continue;
      }

      this.logger.log(
        `[${requestId}] Falling back to ${fallbackConfig.provider}/${fallbackConfig.model}`,
      );

      try {
        const response = await this.executeWithRetry(
          fallbackConfig,
          params.messages,
          maxTokens,
          temperature,
          requestId,
        );
        this.logUsageMetrics({
          provider: response.provider,
          model: response.model,
          latencyMs: 0,
          promptTokens: response.usage.promptTokens,
          completionTokens: response.usage.completionTokens,
          totalTokens: response.usage.totalTokens,
          requestId,
          success: true,
          fallbackUsed: true,
        });
        return response;
      } catch (fallbackError) {
        const errorMessage =
          fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        this.logger.warn(
          `[${requestId}] Fallback provider (${fallbackConfig.provider}) failed: ${errorMessage}`,
        );
      }
    }

    // All providers failed
    throw new Error(
      "All LLM providers failed. Check your API keys and network connectivity.",
    );
  }

  /**
   * Send a chat request and parse the response as structured JSON.
   *
   * Attempts to extract a JSON object from the LLM response, handling
   * common formatting issues like markdown code blocks.
   *
   * @param params - Chat parameters plus optional response schema hint
   * @returns The structured response with parsed data
   */
  async chatStructured<T = Record<string, unknown>>(params: {
    messages: LlmChatMessage[];
    maxTokens?: number;
    temperature?: number;
    requestId?: string;
    responseHint?: string;
  }): Promise<LlmStructuredResponse<T>> {
    const messages = [...params.messages];

    if (params.responseHint) {
      messages.push({
        role: "user",
        content: `重要：请只返回JSON，不要加任何markdown标记或其他文字。${params.responseHint}`,
      });
    }

    try {
      const response = await this.chat({
        ...params,
        messages,
        temperature: params.temperature ?? 0.2,
      });

      const parsed = this.parseJsonResponse<T>(response.content);

      return {
        raw: response,
        parsed,
        parseError: parsed === null ? "Failed to parse JSON from response" : null,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Structured chat request failed: ${errorMessage}`);

      return {
        raw: {
          content: "",
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          model: this.config.model,
          provider: this.config.provider,
          finishReason: "error",
        },
        parsed: null,
        parseError: errorMessage,
      };
    }
  }

  /**
   * Perform a health check on all configured providers.
   *
   * Sends a minimal request to verify connectivity and authentication.
   */
  async healthCheck(): Promise<LlmHealthCheck[]> {
    const results: LlmHealthCheck[] = [];
    const allConfigs = [this.config, ...this.fallbackChain].filter(
      (config) => config.apiKey,
    );

    for (const providerConfig of allConfigs) {
      const startTime = Date.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10_000);

        const url = `${providerConfig.endpoint}/chat/completions`;
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${providerConfig.apiKey}`,
          },
          body: JSON.stringify({
            model: providerConfig.model,
            messages: [{ role: "user", content: "Hi" }],
            max_tokens: 5,
            temperature: 0.1,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        results.push({
          provider: providerConfig.provider,
          model: providerConfig.model,
          available: response.ok,
          latencyMs: Date.now() - startTime,
          error: response.ok ? null : `HTTP ${response.status}`,
        });
      } catch (error) {
        results.push({
          provider: providerConfig.provider,
          model: providerConfig.model,
          available: false,
          latencyMs: Date.now() - startTime,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  // ==================== Provider Resolution ====================

  /**
   * Resolve all available provider configurations from environment variables.
   *
   * Returns the primary provider and an ordered list of fallback providers.
   * Priority order:
   *   1. Explicit AI_STYLIST_* config (if set, takes over completely)
   *   2. DEEPSEEK_API_KEY (cheapest, excellent quality)
   *   3. DASHSCOPE_API_KEY (Qwen - generous free tier)
   *   4. GLM_API_KEY (ZhipuAI - completely free)
   *   5. OPENAI_API_KEY (OpenAI-compatible)
   */
  private resolveAllProviders(): {
    primary: LlmProviderConfig;
    fallbacks: LlmProviderConfig[];
  } {
    const defaultConfig: LlmProviderConfig = {
      provider: "zhipu",
      apiKey: "",
      endpoint: PROVIDER_DEFAULTS.zhipu.endpoint,
      model: PROVIDER_DEFAULTS.zhipu.model,
      maxTokens: 800,
      temperature: 0.3,
      timeoutMs: 30_000,
    };

    // Check for explicit AI_STYLIST_* override
    const stylistKey = this.configService.get<string>("AI_STYLIST_API_KEY", "");
    const stylistEndpoint = this.configService.get<string>(
      "AI_STYLIST_API_ENDPOINT",
      "",
    );
    const stylistModel = this.configService.get<string>("AI_STYLIST_MODEL", "");

    if (stylistKey && stylistEndpoint) {
      return {
        primary: {
          provider: "custom",
          apiKey: stylistKey,
          endpoint: stylistEndpoint,
          model: stylistModel || "glm-5",
          maxTokens: 800,
          temperature: 0.3,
          timeoutMs: 30_000,
        },
        fallbacks: [],
      };
    }

    // Build provider chain from available keys
    const availableProviders: LlmProviderConfig[] = [];

    // DeepSeek (priority 1 - cheapest, excellent Chinese quality)
    const deepseekKey = this.configService.get<string>("DEEPSEEK_API_KEY", "");
    if (deepseekKey) {
      availableProviders.push({
        provider: "deepseek",
        apiKey: deepseekKey,
        endpoint:
          this.configService.get<string>(
            "DEEPSEEK_API_ENDPOINT",
            PROVIDER_DEFAULTS.deepseek.endpoint,
          ),
        model: this.configService.get<string>(
          "DEEPSEEK_MODEL",
          PROVIDER_DEFAULTS.deepseek.model,
        ),
        maxTokens: 800,
        temperature: 0.3,
        timeoutMs: 30_000,
      });
    }

    // Qwen / DashScope (priority 2 - generous free tier)
    const qwenKey =
      this.configService.get<string>("DASHSCOPE_API_KEY", "") ||
      this.configService.get<string>("QWEN_API_KEY", "");
    if (qwenKey) {
      availableProviders.push({
        provider: "qwen",
        apiKey: qwenKey,
        endpoint:
          this.configService.get<string>(
            "QWEN_API_ENDPOINT",
            PROVIDER_DEFAULTS.qwen.endpoint,
          ),
        model: this.configService.get<string>(
          "QWEN_MODEL",
          PROVIDER_DEFAULTS.qwen.model,
        ),
        maxTokens: 800,
        temperature: 0.3,
        timeoutMs: 30_000,
      });
    }

    // ZhipuAI GLM (priority 3 - completely free)
    const glmKey =
      this.configService.get<string>("GLM_API_KEY", "") ||
      this.configService.get<string>("ZHIPU_API_KEY", "");
    if (glmKey) {
      availableProviders.push({
        provider: "zhipu",
        apiKey: glmKey,
        endpoint:
          this.configService.get<string>(
            "GLM_API_ENDPOINT",
            PROVIDER_DEFAULTS.zhipu.endpoint,
          ),
        model: this.configService.get<string>(
          "GLM_MODEL",
          PROVIDER_DEFAULTS.zhipu.model,
        ),
        maxTokens: 800,
        temperature: 0.3,
        timeoutMs: 30_000,
      });
    }

    // OpenAI-compatible (priority 4)
    const openaiKey = this.configService.get<string>("OPENAI_API_KEY", "");
    if (openaiKey) {
      availableProviders.push({
        provider: "openai",
        apiKey: openaiKey,
        endpoint: this.configService.get<string>(
          "OPENAI_API_ENDPOINT",
          PROVIDER_DEFAULTS.openai.endpoint,
        ),
        model: this.configService.get<string>(
          "OPENAI_MODEL",
          PROVIDER_DEFAULTS.openai.model,
        ),
        maxTokens: 800,
        temperature: 0.3,
        timeoutMs: 30_000,
      });
    }

    if (availableProviders.length === 0) {
      this.logger.warn(
        "No LLM API key configured. Set DEEPSEEK_API_KEY, DASHSCOPE_API_KEY, or GLM_API_KEY in .env. " +
        "The AI stylist will use fallback template responses.",
      );
      return { primary: defaultConfig, fallbacks: [] };
    }

    const primary = availableProviders[0] as LlmProviderConfig;
    const fallbacks = availableProviders.slice(1);

    return { primary, fallbacks };
  }

  // ==================== Request Execution ====================

  /**
   * Execute a chat request with retry logic for a specific provider.
   */
  private async executeWithRetry(
    providerConfig: LlmProviderConfig,
    messages: LlmChatMessage[],
    maxTokens: number,
    temperature: number,
    requestId: string,
  ): Promise<LlmChatResponse> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const response = await this.executeChatRequest(
          providerConfig,
          messages,
          maxTokens,
          temperature,
          requestId,
        );

        this.onProviderSuccess(providerConfig.provider, requestId, Date.now() - startTime);

        return {
          ...response,
          provider: providerConfig.provider,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (!this.isRetryableError(lastError, attempt)) {
          break;
        }

        const delay = this.calculateBackoffDelay(attempt);
        this.logger.warn(
          `[${requestId}] ${providerConfig.provider} attempt ${attempt + 1} failed, retrying in ${delay}ms: ${lastError.message}`,
        );
        await this.sleep(delay);
      }
    }

    this.onProviderFailure(
      providerConfig.provider,
      requestId,
      Date.now() - startTime,
      lastError,
    );
    throw lastError ?? new Error("Unknown error during chat request");
  }

  /**
   * Execute the actual HTTP request to an LLM API.
   */
  private async executeChatRequest(
    providerConfig: LlmProviderConfig,
    messages: LlmChatMessage[],
    maxTokens: number,
    temperature: number,
    requestId: string,
  ): Promise<Omit<LlmChatResponse, "provider">> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      providerConfig.timeoutMs,
    );

    try {
      const url = `${providerConfig.endpoint}/chat/completions`;

      const body = {
        model: providerConfig.model,
        messages,
        max_tokens: maxTokens,
        temperature,
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${providerConfig.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        this.handleHttpError(response.status, errorText, requestId);
      }

      const data = (await response.json()) as {
        choices: Array<{
          message: { content: string };
          finish_reason: string;
        }>;
        usage?: {
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
        };
        model: string;
      };

      const content = data.choices[0]?.message?.content?.trim() ?? "";
      const usage = data.usage ?? {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      };

      this.logger.debug(
        `[${requestId}] ${providerConfig.provider} response: ${content.length} chars, ` +
        `${usage.total_tokens} tokens, finish_reason=${data.choices[0]?.finish_reason}`,
      );

      return {
        content,
        usage: {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
        },
        model: data.model ?? providerConfig.model,
        finishReason: data.choices[0]?.finish_reason ?? "stop",
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Request timeout after ${providerConfig.timeoutMs}ms`);
      }

      throw error;
    }
  }

  /**
   * Handle HTTP error responses with specific error messages.
   * Uses `never` return type to signal this always throws.
   */
  private handleHttpError(
    status: number,
    errorText: string,
    requestId: string,
  ): never {
    this.logger.warn(
      `[${requestId}] LLM API error: ${status} - ${errorText.slice(0, 200)}`,
    );

    switch (status) {
      case 401:
        throw new Error(
          "LLM API authentication failed. Check your API keys in .env.",
        );
      case 403:
        throw new Error("LLM API access forbidden. Check your account permissions.");
      case 429:
        throw new Error("LLM API rate limit exceeded. Will retry or fall back.");
      case 500:
      case 502:
      case 503:
        throw new Error(
          `LLM API server error (${status}). Service may be temporarily unavailable.`,
        );
      default:
        throw new Error(`LLM API error: ${status} - ${errorText.slice(0, 100)}`);
    }
  }

  // ==================== Response Parsing ====================

  /**
   * Parse JSON from an LLM response, handling common formatting issues.
   */
  private parseJsonResponse<T>(content: string): T | null {
    if (!content || content.trim().length === 0) {
      return null;
    }

    // Try direct parse first
    try {
      return JSON.parse(content.trim()) as T;
    } catch {
      // Continue to fallback parsing
    }

    // Try extracting JSON from markdown code blocks
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch?.[1]) {
      try {
        return JSON.parse(codeBlockMatch[1].trim()) as T;
      } catch {
        // Continue to next fallback
      }
    }

    // Try finding JSON object or array in the response
    const jsonMatch = content.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch?.[1]) {
      try {
        return JSON.parse(jsonMatch[1]) as T;
      } catch {
        // Give up
      }
    }

    this.logger.warn(
      `Failed to parse JSON from LLM response: ${content.slice(0, 100)}...`,
    );
    return null;
  }

  // ==================== Circuit Breaker ====================

  /**
   * Check if a specific provider is available (circuit breaker not open).
   */
  private isProviderAvailable(provider: LlmProvider): boolean {
    if (!provider) {
      return false;
    }

    const state = this.circuitBreakers.get(provider);
    if (!state || state.consecutiveFailures < this.circuitBreakerThreshold) {
      return true;
    }

    const timeSinceLastFailure = Date.now() - state.lastFailureTime;
    if (timeSinceLastFailure > this.circuitBreakerResetMs) {
      state.consecutiveFailures = 0;
      return true;
    }

    this.logger.debug(
      `Circuit breaker open for ${provider} (${state.consecutiveFailures} consecutive failures)`,
    );
    return false;
  }

  private onProviderSuccess(
    provider: LlmProvider,
    requestId: string,
    latencyMs: number,
  ): void {
    const state = this.circuitBreakers.get(provider);
    if (state) {
      state.consecutiveFailures = 0;
    }
    this.logger.debug(
      `[${requestId}] ${provider} request succeeded in ${latencyMs}ms`,
    );
  }

  private onProviderFailure(
    provider: LlmProvider,
    requestId: string,
    latencyMs: number,
    error: Error | null,
  ): void {
    let state = this.circuitBreakers.get(provider);
    if (!state) {
      state = { consecutiveFailures: 0, lastFailureTime: 0 };
      this.circuitBreakers.set(provider, state);
    }
    state.consecutiveFailures++;
    state.lastFailureTime = Date.now();

    this.logger.warn(
      `[${requestId}] ${provider} request failed after ${latencyMs}ms ` +
      `(${state.consecutiveFailures}/${this.circuitBreakerThreshold} failures): ${error?.message}`,
    );
  }

  // ==================== Utilities ====================

  /**
   * Check if an error is retryable.
   */
  private isRetryableError(error: Error, attempt: number): boolean {
    if (attempt >= this.retryConfig.maxRetries) {
      return false;
    }

    // Rate limit and server errors are retryable
    if (error.message.includes("rate limit") || error.message.includes("429")) {
      return true;
    }
    if (
      error.message.includes("server error") ||
      error.message.includes("502") ||
      error.message.includes("503")
    ) {
      return true;
    }
    if (error.message.includes("timeout")) {
      return true;
    }

    // Auth errors are never retryable
    if (
      error.message.includes("authentication") ||
      error.message.includes("401")
    ) {
      return false;
    }

    return false;
  }

  /**
   * Calculate exponential backoff delay with jitter.
   */
  private calculateBackoffDelay(attempt: number): number {
    const delay = this.retryConfig.baseDelayMs * Math.pow(2, attempt);
    const jitter = Math.random() * this.retryConfig.baseDelayMs;
    return Math.min(delay + jitter, this.retryConfig.maxDelayMs);
  }

  /**
   * Log usage metrics for monitoring and cost tracking.
   */
  private logUsageMetrics(metrics: LlmUsageMetrics): void {
    this.logger.log(
      `[${metrics.requestId}] ${metrics.provider}/${metrics.model} ` +
      `${metrics.totalTokens} tokens ` +
      `(${metrics.promptTokens}+${metrics.completionTokens}) ` +
      `${metrics.fallbackUsed ? "(fallback) " : ""}` +
      `success=${metrics.success}`,
    );
  }

  /**
   * Mask sensitive parts of the endpoint URL for logging.
   */
  private maskEndpoint(endpoint: string): string {
    try {
      const url = new URL(endpoint);
      return `${url.protocol}//${url.host}${url.pathname}`;
    } catch {
      return endpoint.slice(0, 30) + "...";
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
