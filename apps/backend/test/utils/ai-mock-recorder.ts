/**
 * @fileoverview AI Mock Recorder - Record real AI API responses as test fixtures.
 *
 * Provides a recording infrastructure that captures real AI API request/response
 * pairs and saves them as JSON fixture files for deterministic test playback.
 *
 * Supported providers:
 *   - ZhipuAI GLM (open.bigmodel.cn) - chat completions
 *   - Doubao-Seedream (volcengineapi.com) - image generation
 *   - fashn.ai - virtual try-on
 *   - DeepSeek, Qwen/DashScope, OpenAI-compatible endpoints
 *
 * @module AiMockRecorder
 */

import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

// ==================== Types ====================

/**
 * A single recorded API call entry.
 */
export interface RecordedCall {
  /** Unique identifier for this recording entry */
  id: string;
  /** API provider name (e.g. "zhipu", "doubao-seedream", "fashn-ai") */
  apiProvider: string;
  /** API endpoint URL */
  endpoint: string;
  /** HTTP method used */
  method: string;
  /** Request payload (sanitized - API keys removed) */
  request: unknown;
  /** Response payload */
  response: unknown;
  /** HTTP status code */
  statusCode: number;
  /** Request fingerprint for matching during playback */
  fingerprint: string;
  /** Timestamp of recording */
  recordedAt: string;
  /** Response latency in milliseconds */
  latencyMs: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Fixture file structure containing multiple recorded calls.
 */
export interface FixtureFile {
  /** Fixture schema version */
  version: 1;
  /** Description of the fixture contents */
  description: string;
  /** Provider this fixture is for */
  provider: string;
  /** Creation timestamp */
  createdAt: string;
  /** List of recorded API calls */
  recordings: RecordedCall[];
  /** Metadata about the fixture */
  metadata?: Record<string, unknown>;
}

/**
 * Options for the recorder.
 */
export interface RecorderOptions {
  /** Base directory for fixture files (default: test/fixtures/ai-responses) */
  fixtureDir?: string;
  /** Whether to sanitize API keys from recorded requests (default: true) */
  sanitizeKeys?: boolean;
  /** Whether to auto-save on each record call (default: false) */
  autoSave?: boolean;
}

// ==================== Constants ====================

const DEFAULT_FIXTURE_DIR = path.resolve(
  __dirname,
  "..",
  "fixtures",
  "ai-responses",
);

const FIXTURE_VERSION = 1 as const;

/**
 * Fields to strip from request payloads to avoid leaking secrets.
 */
const SENSITIVE_FIELDS = [
  "Authorization",
  "authorization",
  "api_key",
  "apiKey",
  "key",
  "token",
  "access_token",
  "refresh_token",
  "password",
  "secret",
] as const;

/**
 * Known API provider URL patterns for auto-detection.
 */
const PROVIDER_PATTERNS: ReadonlyArray<{
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

// ==================== AiMockRecorder Class ====================

/**
 * AiMockRecorder - Captures real AI API responses and saves them as fixtures.
 *
 * Usage:
 *   const recorder = new AiMockRecorder();
 *   recorder.startRecording();
 *   // ... make real API calls ...
 *   recorder.recordResponse("zhipu", "/chat/completions", requestPayload, responsePayload);
 *   recorder.stopRecording();
 *   recorder.saveFixture("glm-chat-stylist.json");
 *
 * Or with auto-save:
 *   const recorder = new AiMockRecorder({ autoSave: true });
 *   recorder.startRecording();
 *   // each recordResponse call appends to the fixture file
 */
export class AiMockRecorder {
  private readonly fixtureDir: string;
  private readonly sanitizeKeys: boolean;
  private readonly autoSave: boolean;
  private recordings: RecordedCall[] = [];
  private recording = false;
  private recordStartTime: number | null = null;

  constructor(options?: RecorderOptions) {
    this.fixtureDir = options?.fixtureDir ?? DEFAULT_FIXTURE_DIR;
    this.sanitizeKeys = options?.sanitizeKeys ?? true;
    this.autoSave = options?.autoSave ?? false;
  }

  // ==================== Recording Control ====================

  /**
   * Start recording mode. Clears any previous recordings.
   */
  startRecording(): void {
    this.recordings = [];
    this.recording = true;
    this.recordStartTime = Date.now();
  }

  /**
   * Stop recording mode. Returns the number of recorded calls.
   */
  stopRecording(): number {
    this.recording = false;
    this.recordStartTime = null;
    return this.recordings.length;
  }

  /**
   * Check if the recorder is currently in recording mode.
   */
  get isRecording(): boolean {
    return this.recording;
  }

  /**
   * Get the number of recorded calls.
   */
  get recordedCount(): number {
    return this.recordings.length;
  }

  // ==================== Record API Calls ====================

  /**
   * Record a single API response.
   *
   * @param apiProvider - Provider name (e.g. "zhipu", "doubao-seedream")
   * @param endpoint - API endpoint path or full URL
   * @param request - Request payload
   * @param response - Response payload
   * @param metadata - Optional additional metadata
   */
  recordResponse(
    apiProvider: string,
    endpoint: string,
    request: unknown,
    response: unknown,
    metadata?: Record<string, unknown>,
  ): void {
    if (!this.recording) {
      throw new Error("Recorder is not in recording mode. Call startRecording() first.");
    }

    const sanitizedRequest = this.sanitizeKeys
      ? this.sanitizePayload(request)
      : request;

    const fingerprint = this.computeFingerprint(apiProvider, endpoint, sanitizedRequest);

    const entry: RecordedCall = {
      id: this.generateId(),
      apiProvider,
      endpoint,
      method: "POST",
      request: sanitizedRequest,
      response,
      statusCode: (response as Record<string, unknown>)?.statusCode as number ?? 200,
      fingerprint,
      recordedAt: new Date().toISOString(),
      latencyMs: this.recordStartTime ? Date.now() - this.recordStartTime : 0,
      metadata,
    };

    this.recordings.push(entry);

    if (this.autoSave) {
      const filename = this.generateFilename(apiProvider, endpoint);
      this.saveFixture(filename);
    }
  }

  /**
   * Record an API call with full HTTP details.
   *
   * @param details - Full call details including method, status code, and latency
   */
  recordCall(details: {
    apiProvider: string;
    endpoint: string;
    method?: string;
    request: unknown;
    response: unknown;
    statusCode: number;
    latencyMs: number;
    metadata?: Record<string, unknown>;
  }): void {
    if (!this.recording) {
      throw new Error("Recorder is not in recording mode. Call startRecording() first.");
    }

    const sanitizedRequest = this.sanitizeKeys
      ? this.sanitizePayload(details.request)
      : details.request;

    const fingerprint = this.computeFingerprint(
      details.apiProvider,
      details.endpoint,
      sanitizedRequest,
    );

    const entry: RecordedCall = {
      id: this.generateId(),
      apiProvider: details.apiProvider,
      endpoint: details.endpoint,
      method: details.method ?? "POST",
      request: sanitizedRequest,
      response: details.response,
      statusCode: details.statusCode,
      fingerprint,
      recordedAt: new Date().toISOString(),
      latencyMs: details.latencyMs,
      metadata: details.metadata,
    };

    this.recordings.push(entry);

    if (this.autoSave) {
      const filename = this.generateFilename(details.apiProvider, details.endpoint);
      this.saveFixture(filename);
    }
  }

  // ==================== Save & Load ====================

  /**
   * Save recorded calls to a fixture file.
   *
   * If the file already exists, recordings are merged (existing entries
   * with the same fingerprint are replaced).
   *
   * @param filePath - Relative filename or absolute path for the fixture
   * @param description - Optional description for the fixture
   */
  saveFixture(filePath: string, description?: string): string {
    const absolutePath = this.resolveFixturePath(filePath);
    const dir = path.dirname(absolutePath);

    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Load existing fixture if present
    let existing: FixtureFile | null = null;
    if (fs.existsSync(absolutePath)) {
      try {
        const raw = fs.readFileSync(absolutePath, "utf-8");
        existing = JSON.parse(raw) as FixtureFile;
      } catch {
        // Corrupt file - overwrite
        existing = null;
      }
    }

    const provider = this.detectProviderFromRecordings();

    // Merge recordings: replace by fingerprint
    const existingRecordings = existing?.recordings ?? [];
    const fingerprintSet = new Set(this.recordings.map((r) => r.fingerprint));
    const mergedRecordings = [
      ...existingRecordings.filter((r) => !fingerprintSet.has(r.fingerprint)),
      ...this.recordings,
    ];

    const fixture: FixtureFile = {
      version: FIXTURE_VERSION,
      description: description ?? existing?.description ?? `Recorded ${provider} API responses`,
      provider,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      recordings: mergedRecordings,
      metadata: {
        ...existing?.metadata,
        lastUpdatedAt: new Date().toISOString(),
        totalRecordings: mergedRecordings.length,
      },
    };

    fs.writeFileSync(absolutePath, JSON.stringify(fixture, null, 2), "utf-8");

    return absolutePath;
  }

  /**
   * Load a fixture file and return its contents.
   *
   * @param filePath - Relative filename or absolute path
   * @returns Parsed fixture file contents
   * @throws Error if file does not exist or is invalid
   */
  loadFixture(filePath: string): FixtureFile {
    const absolutePath = this.resolveFixturePath(filePath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Fixture file not found: ${absolutePath}`);
    }

    const raw = fs.readFileSync(absolutePath, "utf-8");
    const parsed = JSON.parse(raw) as FixtureFile;

    if (parsed.version !== FIXTURE_VERSION) {
      throw new Error(
        `Unsupported fixture version: ${parsed.version}. Expected: ${FIXTURE_VERSION}`,
      );
    }

    return parsed;
  }

  /**
   * Get all recorded calls.
   */
  getRecordedCalls(): ReadonlyArray<RecordedCall> {
    return this.recordings;
  }

  /**
   * Clear all recorded calls without saving.
   */
  clearRecordings(): void {
    this.recordings = [];
  }

  // ==================== Fingerprinting ====================

  /**
   * Compute a deterministic fingerprint for a request.
   *
   * The fingerprint is based on the provider, endpoint, and a normalized
   * version of the request payload (excluding volatile fields like
   * timestamps and request IDs).
   *
   * @param apiProvider - Provider name
   * @param endpoint - API endpoint
   * @param request - Request payload (should be sanitized already)
   * @returns SHA-256 hex digest fingerprint
   */
  computeFingerprint(
    apiProvider: string,
    endpoint: string,
    request: unknown,
  ): string {
    const normalized = this.normalizeForFingerprint(request);
    const input = `${apiProvider}|${endpoint}|${JSON.stringify(normalized)}`;
    return crypto.createHash("sha256").update(input).digest("hex");
  }

  /**
   * Normalize a request payload for fingerprinting by removing
   * volatile fields that change between identical requests.
   */
  private normalizeForFingerprint(payload: unknown): unknown {
    if (payload === null || payload === undefined) {
      return null;
    }

    if (typeof payload !== "object") {
      return payload;
    }

    if (Array.isArray(payload)) {
      return payload.map((item) => this.normalizeForFingerprint(item));
    }

    const obj = payload as Record<string, unknown>;
    const volatileKeys = new Set([
      "request_id",
      "requestId",
      "timestamp",
      "nonce",
      "seed",
      "stream",
    ]);

    const result: Record<string, unknown> = {};
    const sortedKeys = Object.keys(obj).sort();

    for (const key of sortedKeys) {
      if (volatileKeys.has(key)) {
        continue;
      }
      result[key] = this.normalizeForFingerprint(obj[key]);
    }

    return result;
  }

  // ==================== Sanitization ====================

  /**
   * Remove sensitive fields (API keys, tokens) from a payload.
   */
  private sanitizePayload(payload: unknown): unknown {
    if (payload === null || payload === undefined) {
      return payload;
    }

    if (typeof payload !== "object") {
      return payload;
    }

    if (Array.isArray(payload)) {
      return payload.map((item) => this.sanitizePayload(item));
    }

    if (payload instanceof Buffer) {
      return "[Buffer]";
    }

    const obj = payload as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_FIELDS.includes(key as (typeof SENSITIVE_FIELDS)[number])) {
        result[key] = "[REDACTED]";
      } else if (typeof value === "string" && value.startsWith("Bearer ")) {
        result[key] = "Bearer [REDACTED]";
      } else {
        result[key] = this.sanitizePayload(value);
      }
    }

    return result;
  }

  // ==================== Utilities ====================

  /**
   * Auto-detect provider from URL pattern.
   */
  detectProvider(url: string): string {
    for (const { pattern, provider } of PROVIDER_PATTERNS) {
      if (pattern.test(url)) {
        return provider;
      }
    }
    return "unknown";
  }

  /**
   * Detect provider from the recorded calls.
   */
  private detectProviderFromRecordings(): string {
    if (this.recordings.length === 0) {
      return "unknown";
    }
    // Use the first recording's provider
    return this.recordings[0]!.apiProvider;
  }

  /**
   * Generate a fixture filename based on provider and endpoint.
   */
  private generateFilename(apiProvider: string, endpoint: string): string {
    // Extract meaningful path segment from endpoint
    const cleanEndpoint = endpoint
      .replace(/^https?:\/\//, "")
      .replace(/[^a-zA-Z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    return `${apiProvider}-${cleanEndpoint}-${timestamp}.json`;
  }

  /**
   * Generate a unique ID for a recording entry.
   */
  private generateId(): string {
    return `rec-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  }

  /**
   * Resolve a fixture path to an absolute path.
   *
   * If the input is already absolute, return as-is.
   * Otherwise, resolve relative to the fixture directory.
   */
  private resolveFixturePath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.resolve(this.fixtureDir, filePath);
  }
}
