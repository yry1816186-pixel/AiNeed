/**
 * @fileoverview AI Mock Interceptor - HTTP interceptor for auto-record/playback of AI API calls.
 *
 * Provides an HTTP interceptor that can operate in three modes:
 *   - 'record': Intercepts requests, forwards them to real APIs, and records responses
 *   - 'playback': Intercepts requests and returns recorded fixture responses
 *   - 'passthrough': Passes requests through to real APIs without interception
 *
 * Supports both axios-based HTTP calls (used by cloud-tryon.provider.ts)
 * and fetch-based calls (used by llm-provider.service.ts).
 *
 * Auto-detects API provider from URL patterns:
 *   - open.bigmodel.cn -> zhipu (GLM)
 *   - volcengineapi.com -> doubao-seedream
 *   - api.fashn.ai -> fashn-ai
 *   - api.deepseek.com -> deepseek
 *   - dashscope.aliyuncs.com -> qwen
 *   - api.openai.com -> openai
 *
 * @module AiMockInterceptor
 */

import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { AiMockRecorder } from "./ai-mock-recorder";
import { AiMockPlayer } from "./ai-mock-player";
import type { RecordedCall } from "./ai-mock-recorder";
import type { PlaybackStats } from "./ai-mock-player";

// ==================== Types ====================

/**
 * Interceptor operating mode.
 */
export type InterceptorMode = "record" | "playback" | "passthrough";

/**
 * A recorded API call with full HTTP details.
 */
export interface InterceptedCall {
  /** Unique identifier */
  id: string;
  /** API provider name (auto-detected) */
  provider: string;
  /** Full request URL */
  url: string;
  /** HTTP method */
  method: string;
  /** Request headers (sanitized) */
  requestHeaders: Record<string, string>;
  /** Request body */
  requestBody: unknown;
  /** Response status code */
  statusCode: number;
  /** Response headers */
  responseHeaders: Record<string, string>;
  /** Response body */
  responseBody: unknown;
  /** Request-to-response latency in ms */
  latencyMs: number;
  /** Timestamp */
  timestamp: string;
  /** Whether this was intercepted (true) or passed through (false) */
  intercepted: boolean;
}

/**
 * Options for the interceptor.
 */
export interface InterceptorOptions {
  /** Operating mode (default: 'playback') */
  mode?: InterceptorMode;
  /** Directory for fixture files */
  fixtureDir?: string;
  /** Whether to simulate latency in playback mode (default: false) */
  simulateLatency?: boolean;
  /** Whether to throw on unmatched requests in playback mode (default: true) */
  throwOnMiss?: boolean;
  /** Whether to sanitize API keys in recorded data (default: true) */
  sanitizeKeys?: boolean;
  /** Custom URL patterns to intercept (in addition to known AI providers) */
  additionalUrlPatterns?: RegExp[];
  /** Fixture filename for record mode (default: auto-generated) */
  recordFixtureFile?: string;
}

/**
 * Playback statistics (re-exported from AiMockPlayer for convenience).
 */
export type InterceptorPlaybackStats = PlaybackStats;

// ==================== Constants ====================

/**
 * URL patterns for known AI API providers.
 */
const AI_PROVIDER_PATTERNS: ReadonlyArray<{
  pattern: RegExp;
  provider: string;
}> = [
  { pattern: /open\.bigmodel\.cn/i, provider: "zhipu" },
  { pattern: /volcengineapi\.com/i, provider: "doubao-seedream" },
  { pattern: /fashn\.ai/i, provider: "fashn-ai" },
  { pattern: /api\.deepseek\.com/i, provider: "deepseek" },
  { pattern: /dashscope\.aliyuncs\.com/i, provider: "qwen" },
  { pattern: /api\.openai\.com/i, provider: "openai" },
];

/**
 * Header names to sanitize from recordings.
 */
const SENSITIVE_HEADERS = new Set([
  "authorization",
  "api-key",
  "x-api-key",
  "cookie",
  "set-cookie",
]);

// ==================== AiMockInterceptor Class ====================

/**
 * AiMockInterceptor - HTTP interceptor for recording and playing back AI API calls.
 *
 * Usage in test setup:
 *   const interceptor = AiMockInterceptor.createInterceptor('playback');
 *   interceptor.loadFixtures('glm-chat.json', 'try-on-result.json');
 *   interceptor.setupAxiosInterceptor(axiosInstance);
 *   interceptor.setupFetchInterceptor();
 *
 *   // ... run tests ...
 *
 *   interceptor.teardown();
 *
 * Record mode:
 *   const interceptor = AiMockInterceptor.createInterceptor('record');
 *   // ... run tests that make real API calls ...
 *   interceptor.saveRecordings('my-fixture.json');
 *   interceptor.teardown();
 */
export class AiMockInterceptor {
  private readonly mode: InterceptorMode;
  private readonly recorder: AiMockRecorder;
  private readonly player: AiMockPlayer;
  private readonly additionalUrlPatterns: RegExp[];
  private readonly recordFixtureFile: string;

  private readonly interceptedCalls: InterceptedCall[] = [];

  // Interceptor cleanup functions
  private axiosInterceptorIds: Array<{
    instance: AxiosInstance;
    requestId: number;
    responseId: number;
  }> = [];
  private originalFetch: typeof globalThis.fetch | null = null;
  private isActive = false;

  private constructor(options?: InterceptorOptions) {
    this.mode = options?.mode ?? "playback";
    this.additionalUrlPatterns = options?.additionalUrlPatterns ?? [];
    this.recordFixtureFile = options?.recordFixtureFile ?? "";

    this.recorder = new AiMockRecorder({
      fixtureDir: options?.fixtureDir,
      sanitizeKeys: options?.sanitizeKeys,
    });

    this.player = new AiMockPlayer({
      fixtureDir: options?.fixtureDir,
      simulateLatency: options?.simulateLatency,
      throwOnMiss: options?.throwOnMiss,
    });
  }

  // ==================== Factory ====================

  /**
   * Create an interceptor with the specified mode.
   *
   * @param mode - Operating mode: 'record', 'playback', or 'passthrough'
   * @param options - Additional interceptor options
   */
  static createInterceptor(
    mode: InterceptorMode,
    options?: Omit<InterceptorOptions, "mode">,
  ): AiMockInterceptor {
    return new AiMockInterceptor({ ...options, mode });
  }

  // ==================== Lifecycle ====================

  /**
   * Activate the interceptor. Must be called before requests are made.
   */
  activate(): void {
    if (this.isActive) {
      return;
    }

    if (this.mode === "record") {
      this.recorder.startRecording();
    }

    this.isActive = true;
  }

  /**
   * Deactivate the interceptor and clean up all interceptors.
   */
  teardown(): void {
    if (this.mode === "record") {
      this.recorder.stopRecording();
    }

    // Remove axios interceptors
    for (const { instance, requestId, responseId } of this.axiosInterceptorIds) {
      try {
        instance.interceptors.request.eject(requestId);
        instance.interceptors.response.eject(responseId);
      } catch {
        // Ignore errors during cleanup
      }
    }
    this.axiosInterceptorIds = [];

    // Restore original fetch
    if (this.originalFetch !== null) {
      globalThis.fetch = this.originalFetch;
      this.originalFetch = null;
    }

    this.isActive = false;
  }

  // ==================== Fixture Management ====================

  /**
   * Load fixture files for playback mode.
   *
   * @param fixtureNames - One or more fixture filenames to load
   */
  loadFixtures(...fixtureNames: string[]): void {
    for (const name of fixtureNames) {
      this.player.loadFixture(name);
    }
  }

  /**
   * Load all available fixtures from the fixture directory.
   */
  loadAllFixtures(): void {
    this.player.loadAllFixtures();
  }

  /**
   * Save recorded calls to a fixture file (record mode only).
   *
   * @param filePath - Fixture filename
   * @param description - Optional description
   */
  saveRecordings(filePath?: string, description?: string): string {
    if (this.mode !== "record") {
      throw new Error("saveRecordings() is only available in record mode");
    }
    const target = filePath ?? this.recordFixtureFile;
    if (!target) {
      throw new Error(
        "No fixture file specified. Pass a filename or set recordFixtureFile in options.",
      );
    }
    return this.recorder.saveFixture(target, description);
  }

  // ==================== Axios Interceptor ====================

  /**
   * Set up axios interceptors on an AxiosInstance.
   *
   * In record mode: intercepts responses and records them.
   * In playback mode: intercepts requests and returns fixture responses.
   * In passthrough mode: no interception.
   *
   * @param instance - The axios instance to intercept
   */
  setupAxiosInterceptor(instance: AxiosInstance): void {
    if (this.mode === "passthrough") {
      return;
    }

    const requestId = instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => this.handleAxiosRequest(config) as Promise<InternalAxiosRequestConfig>,
      (error: unknown) => Promise.reject(error),
    );

    const responseId = instance.interceptors.response.use(
      (response: AxiosResponse) => this.handleAxiosResponse(response),
      (error: unknown) => this.handleAxiosError(error),
    );

    this.axiosInterceptorIds.push({ instance, requestId, responseId });
  }

  /**
   * Handle an axios request (playback mode intercepts here).
   */
  private async handleAxiosRequest(
    config: InternalAxiosRequestConfig,
  ): Promise<InternalAxiosRequestConfig> {
    if (this.mode !== "playback") {
      return config;
    }

    const url = this.buildAxiosUrl(config);
    if (!this.shouldIntercept(url)) {
      return config;
    }

    const provider = this.detectProvider(url);
    const endpoint = this.extractEndpoint(url);

    try {
      const response = await this.player.playback(
        provider,
        endpoint,
        config.data ? JSON.parse(config.data as string) : null,
      );

      // Create a fake axios response
      const fakeResponse: AxiosResponse = {
        data: response,
        status: 200,
        statusText: "OK",
        headers: {},
        config: config as unknown as InternalAxiosRequestConfig,
      };

      // Throw a special marker to short-circuit the real request
      const shortcut: Error & { __mockResponse: AxiosResponse } = Object.assign(
        new Error("__AI_MOCK_INTERCEPTOR_SHORTCUT__"),
        { __mockResponse: fakeResponse },
      );
      throw shortcut;
    } catch (error) {
      // If it's our shortcut, re-throw it
      if (
        error instanceof Error &&
        error.message === "__AI_MOCK_INTERCEPTOR_SHORTCUT__"
      ) {
        throw error;
      }
      // If player threw a "no match" error, let the request through
      return config;
    }
  }

  /**
   * Handle an axios response (record mode captures here).
   */
  private handleAxiosResponse(response: AxiosResponse): AxiosResponse {
    if (this.mode !== "record") {
      return response;
    }

    const url = this.buildAxiosUrl(response.config);
    if (!this.shouldIntercept(url)) {
      return response;
    }

    const provider = this.detectProvider(url);
    const endpoint = this.extractEndpoint(url);
    const requestBody = this.parseRequestBody(response.config.data);
    const requestHeaders = this.sanitizeHeaders(
      response.config.headers as Record<string, string> ?? {},
    );

    this.recorder.recordCall({
      apiProvider: provider,
      endpoint,
      method: (response.config.method ?? "GET").toUpperCase(),
      request: requestBody,
      response: response.data,
      statusCode: response.status,
      latencyMs: 0, // Latency not easily available from axios response
    });

    this.interceptedCalls.push({
      id: `call-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      provider,
      url,
      method: (response.config.method ?? "GET").toUpperCase(),
      requestHeaders,
      requestBody,
      statusCode: response.status,
      responseHeaders: response.headers as Record<string, string>,
      responseBody: response.data,
      latencyMs: 0,
      timestamp: new Date().toISOString(),
      intercepted: true,
    });

    return response;
  }

  /**
   * Handle an axios error (record mode captures errors too).
   */
  private handleAxiosError(error: unknown): Promise<never> {
    if (
      error instanceof Error &&
      error.message === "__AI_MOCK_INTERCEPTOR_SHORTCUT__"
    ) {
      const mockResponse = (error as unknown as { __mockResponse: AxiosResponse }).__mockResponse;
      return Promise.reject({
        response: mockResponse,
        __isMockInterceptorResponse: true,
      });
    }

    return Promise.reject(error);
  }

  // ==================== Fetch Interceptor ====================

  /**
   * Set up a global fetch interceptor.
   *
   * Replaces globalThis.fetch with an intercepted version.
   * Call teardown() to restore the original fetch.
   */
  setupFetchInterceptor(): void {
    if (this.mode === "passthrough") {
      return;
    }

    if (this.originalFetch !== null) {
      // Already intercepted
      return;
    }

    this.originalFetch = globalThis.fetch;
    const self = this;

    globalThis.fetch = async function interceptedFetch(
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> {
      const url = typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as Request).url;

      if (!self.shouldIntercept(url)) {
        return self.originalFetch!.call(globalThis, input, init);
      }

      const provider = self.detectProvider(url);
      const endpoint = self.extractEndpoint(url);
      const method = init?.method ?? "GET";
      const requestBody = init?.body ? self.parseRequestBody(init.body) : null;

      // Record mode: forward and capture
      if (self.mode === "record") {
        const startTime = Date.now();
        const response = await self.originalFetch!.call(globalThis, input, init);
        const latencyMs = Date.now() - startTime;

        const clonedResponse = response.clone();
        const responseBody = await clonedResponse.json().catch(() => null);

        self.recorder.recordCall({
          apiProvider: provider,
          endpoint,
          method,
          request: requestBody,
          response: responseBody,
          statusCode: response.status,
          latencyMs,
        });

        self.interceptedCalls.push({
          id: `call-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          provider,
          url,
          method,
          requestHeaders: {},
          requestBody,
          statusCode: response.status,
          responseHeaders: Object.fromEntries(response.headers.entries()),
          responseBody,
          latencyMs,
          timestamp: new Date().toISOString(),
          intercepted: true,
        });

        return response;
      }

      // Playback mode: return fixture response
      try {
        const mockResponse = await self.player.playback(
          provider,
          endpoint,
          requestBody,
        );

        return new Response(JSON.stringify(mockResponse), {
          status: 200,
          statusText: "OK",
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (self.player.getPlaybackStats().misses > 0) {
          // No match found - fall through to real API if allowed
          return self.originalFetch!.call(globalThis, input, init);
        }
        throw error;
      }
    };
  }

  // ==================== Query Methods ====================

  /**
   * Get all recorded/intercepted API calls.
   */
  getRecordedCalls(): ReadonlyArray<InterceptedCall> {
    return this.interceptedCalls;
  }

  /**
   * Get playback statistics (playback mode only).
   */
  getPlaybackStats(): InterceptorPlaybackStats {
    return this.player.getPlaybackStats();
  }

  /**
   * Get the current operating mode.
   */
  get currentMode(): InterceptorMode {
    return this.mode;
  }

  /**
   * Check if the interceptor is currently active.
   */
  get isInterceptorActive(): boolean {
    return this.isActive;
  }

  /**
   * Get the number of intercepted calls.
   */
  get interceptedCallCount(): number {
    return this.interceptedCalls.length;
  }

  // ==================== Provider Detection ====================

  /**
   * Detect the API provider from a URL.
   */
  private detectProvider(url: string): string {
    for (const { pattern, provider } of AI_PROVIDER_PATTERNS) {
      if (pattern.test(url)) {
        return provider;
      }
    }
    return "unknown";
  }

  /**
   * Check if a URL should be intercepted.
   */
  private shouldIntercept(url: string): boolean {
    // Check known AI provider patterns
    for (const { pattern } of AI_PROVIDER_PATTERNS) {
      if (pattern.test(url)) {
        return true;
      }
    }

    // Check additional URL patterns
    for (const pattern of this.additionalUrlPatterns) {
      if (pattern.test(url)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extract a normalized endpoint path from a URL.
   */
  private extractEndpoint(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.pathname;
    } catch {
      return url;
    }
  }

  // ==================== Utilities ====================

  /**
   * Build the full URL from an axios request config.
   */
  private buildAxiosUrl(config: AxiosRequestConfig): string {
    if (config.url?.startsWith("http")) {
      return config.url;
    }
    const baseURL = config.baseURL ?? "";
    return `${baseURL}${config.url ?? ""}`;
  }

  /**
   * Parse a request body (string, Buffer, or object).
   */
  private parseRequestBody(body: unknown): unknown {
    if (body === null || body === undefined) {
      return null;
    }

    if (typeof body === "string") {
      try {
        return JSON.parse(body);
      } catch {
        return body;
      }
    }

    if (body instanceof ArrayBuffer || body instanceof Uint8Array) {
      return "[Binary data]";
    }

    if (typeof body === "object") {
      return body;
    }

    return body;
  }

  /**
   * Sanitize sensitive headers from a headers object.
   */
  private sanitizeHeaders(
    headers: Record<string, string>,
  ): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (SENSITIVE_HEADERS.has(key.toLowerCase())) {
        result[key] = "[REDACTED]";
      } else {
        result[key] = value;
      }
    }
    return result;
  }
}
