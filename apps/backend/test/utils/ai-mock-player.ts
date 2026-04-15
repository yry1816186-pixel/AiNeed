/**
 * @fileoverview AI Mock Player - Playback recorded AI API responses from fixtures.
 *
 * Loads fixture files recorded by AiMockRecorder and provides deterministic
 * response playback for tests. Supports:
 *   - Fuzzy matching (ignores timestamps, request IDs)
 *   - Delayed playback (simulates real API latency)
 *   - Sequential responses (for conversation flows)
 *   - Multiple fixture loading and cross-fixture matching
 *
 * @module AiMockPlayer
 */

import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

import type { RecordedCall, FixtureFile } from "./ai-mock-recorder";

// ==================== Types ====================

/**
 * Options for the mock player.
 */
export interface PlayerOptions {
  /** Base directory for fixture files (default: test/fixtures/ai-responses) */
  fixtureDir?: string;
  /** Whether to simulate real API latency (default: false) */
  simulateLatency?: boolean;
  /** Latency multiplier for simulated delay (default: 1.0 = use recorded latency) */
  latencyMultiplier?: number;
  /** Minimum simulated latency in ms (default: 0) */
  minLatencyMs?: number;
  /** Maximum simulated latency in ms (default: 5000) */
  maxLatencyMs?: number;
  /** Whether to throw on unmatched requests (default: true) */
  throwOnMiss?: boolean;
  /** Whether to use fuzzy matching (default: true) */
  fuzzyMatch?: boolean;
}

/**
 * Playback statistics for monitoring test behavior.
 */
export interface PlaybackStats {
  /** Total number of playback attempts */
  totalAttempts: number;
  /** Number of successful matches */
  hits: number;
  /** Number of failed matches */
  misses: number;
  /** Number of errors during playback */
  errors: number;
  /** Hit rate as a fraction (0-1) */
  hitRate: number;
  /** Average match latency in ms */
  avgMatchLatencyMs: number;
  /** Provider-specific stats */
  byProvider: Record<string, ProviderStats>;
}

/**
 * Per-provider playback statistics.
 */
export interface ProviderStats {
  attempts: number;
  hits: number;
  misses: number;
  errors: number;
}

/**
 * A loaded fixture with its recordings indexed for fast lookup.
 */
interface IndexedFixture {
  fixture: FixtureFile;
  /** Recordings indexed by fingerprint */
  byFingerprint: Map<string, RecordedCall>;
  /** Recordings indexed by provider+endpoint, ordered by recording time */
  byProviderEndpoint: Map<string, RecordedCall[]>;
}

/**
 * Result of a playback attempt.
 */
export interface PlaybackResult {
  /** The matched response */
  response: unknown;
  /** Whether the match was exact or fuzzy */
  matchType: "exact" | "fuzzy" | "sequential";
  /** The fingerprint that was matched */
  matchedFingerprint: string;
  /** Simulated delay applied (0 if no delay) */
  simulatedDelayMs: number;
  /** The provider that was matched */
  provider: string;
}

// ==================== Constants ====================

const DEFAULT_FIXTURE_DIR = path.resolve(
  __dirname,
  "..",
  "fixtures",
  "ai-responses",
);

/**
 * Fields to ignore during fuzzy matching (they change between calls).
 */
const FUZZY_IGNORE_FIELDS = new Set([
  "request_id",
  "requestId",
  "timestamp",
  "created",
  "created_at",
  "completed_at",
  "nonce",
  "seed",
  "id",
  "task_id",
  "run_id",
]);

// ==================== AiMockPlayer Class ====================

/**
 * AiMockPlayer - Loads fixture files and plays back recorded AI responses.
 *
 * Usage:
 *   const player = new AiMockPlayer({ simulateLatency: true });
 *   player.loadFixture("glm-chat.json");
 *   player.loadFixture("doubao-seedream.json");
 *
 *   // In tests:
 *   const response = await player.playback("zhipu", "/chat/completions", requestPayload);
 *
 * Or load all fixtures at once:
 *   player.loadAllFixtures(); // loads all JSON files from fixture dir
 */
export class AiMockPlayer {
  private readonly fixtureDir: string;
  private readonly simulateLatency: boolean;
  private readonly latencyMultiplier: number;
  private readonly minLatencyMs: number;
  private readonly maxLatencyMs: number;
  private readonly throwOnMiss: boolean;
  private readonly fuzzyMatch: boolean;

  private readonly indexedFixtures: IndexedFixture[] = [];
  private readonly sequentialCursors: Map<string, number> = new Map();

  // Playback statistics
  private totalAttempts = 0;
  private hits = 0;
  private misses = 0;
  private errors = 0;
  private totalMatchLatencyMs = 0;
  private readonly providerStats: Record<string, ProviderStats> = {};

  constructor(options?: PlayerOptions) {
    this.fixtureDir = options?.fixtureDir ?? DEFAULT_FIXTURE_DIR;
    this.simulateLatency = options?.simulateLatency ?? false;
    this.latencyMultiplier = options?.latencyMultiplier ?? 1.0;
    this.minLatencyMs = options?.minLatencyMs ?? 0;
    this.maxLatencyMs = options?.maxLatencyMs ?? 5000;
    this.throwOnMiss = options?.throwOnMiss ?? true;
    this.fuzzyMatch = options?.fuzzyMatch ?? true;
  }

  // ==================== Fixture Loading ====================

  /**
   * Load a single fixture file.
   *
   * @param filePath - Relative filename or absolute path
   * @throws Error if file does not exist or is invalid
   */
  loadFixture(filePath: string): FixtureFile {
    const absolutePath = this.resolveFixturePath(filePath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Fixture file not found: ${absolutePath}`);
    }

    const raw = fs.readFileSync(absolutePath, "utf-8");
    const fixture = JSON.parse(raw) as FixtureFile;

    if (fixture.version !== 1) {
      throw new Error(
        `Unsupported fixture version: ${fixture.version}. Expected: 1`,
      );
    }

    const indexed = this.indexFixture(fixture);
    this.indexedFixtures.push(indexed);

    return fixture;
  }

  /**
   * Load all fixture files from a directory.
   *
   * @param directory - Directory to scan (defaults to fixture dir)
   * @returns Array of loaded fixture files
   */
  loadAllFixtures(directory?: string): FixtureFile[] {
    const dir = directory ?? this.fixtureDir;

    if (!fs.existsSync(dir)) {
      throw new Error(`Fixture directory not found: ${dir}`);
    }

    const entries = fs.readdirSync(dir);
    const jsonFiles = entries.filter(
      (entry) => entry.endsWith(".json") && !entry.startsWith("_"),
    );

    const loaded: FixtureFile[] = [];
    for (const file of jsonFiles) {
      try {
        const fixture = this.loadFixture(path.resolve(dir, file));
        loaded.push(fixture);
      } catch (error) {
        // Skip invalid fixture files with a warning
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`Skipping invalid fixture ${file}: ${message}`);
      }
    }

    return loaded;
  }

  /**
   * Clear all loaded fixtures and reset state.
   */
  clearFixtures(): void {
    this.indexedFixtures.length = 0;
    this.sequentialCursors.clear();
  }

  /**
   * Get the number of loaded fixtures.
   */
  get loadedFixtureCount(): number {
    return this.indexedFixtures.length;
  }

  /**
   * Get the total number of available recordings across all fixtures.
   */
  get totalRecordings(): number {
    return this.indexedFixtures.reduce(
      (sum, idx) => sum + idx.fixture.recordings.length,
      0,
    );
  }

  // ==================== Playback ====================

  /**
   * Find a matching recorded response for the given request.
   *
   * Matching strategy (in order):
   *   1. Exact fingerprint match
   *   2. Fuzzy match (ignoring volatile fields)
   *   3. Sequential match (next recording for the same provider+endpoint)
   *
   * @param apiProvider - Provider name
   * @param endpoint - API endpoint
   * @param request - Request payload
   * @returns The matched response, or throws if no match found
   */
  async playback(
    provider: string,
    endpoint: string,
    request: unknown,
  ): Promise<unknown> {
    const startTime = Date.now();
    this.totalAttempts++;
    this.ensureProviderStats(provider);

    try {
      // Strategy 1: Exact fingerprint match
      const fingerprint = this.computeFingerprint(provider, endpoint, request);
      const exactMatch = this.findByFingerprint(fingerprint);
      if (exactMatch) {
        this.recordHit(provider, Date.now() - startTime);
        const delay = await this.applyLatency(exactMatch.latencyMs);
        return exactMatch.response;
      }

      // Strategy 2: Fuzzy match
      if (this.fuzzyMatch) {
        const fuzzyMatch = this.findFuzzyMatch(provider, endpoint, request);
        if (fuzzyMatch) {
          this.recordHit(provider, Date.now() - startTime);
          const delay = await this.applyLatency(fuzzyMatch.latencyMs);
          return fuzzyMatch.response;
        }
      }

      // Strategy 3: Sequential match
      const sequentialMatch = this.findSequentialMatch(provider, endpoint);
      if (sequentialMatch) {
        this.recordHit(provider, Date.now() - startTime);
        const delay = await this.applyLatency(sequentialMatch.latencyMs);
        return sequentialMatch.response;
      }

      // No match found
      this.recordMiss(provider);
      if (this.throwOnMiss) {
        throw new Error(
          `No matching fixture found for ${provider} ${endpoint}. ` +
          `Available recordings: ${this.totalRecordings}. ` +
          `Request fingerprint: ${fingerprint}`,
        );
      }
      return null;
    } catch (error) {
      if (error instanceof Error && error.message.includes("No matching fixture")) {
        throw error;
      }
      this.recordError(provider);
      throw error;
    }
  }

  /**
   * Synchronous version of playback for simpler test scenarios.
   *
   * Note: Does not support latency simulation.
   */
  playbackSync(
    provider: string,
    endpoint: string,
    request: unknown,
  ): unknown {
    this.totalAttempts++;
    this.ensureProviderStats(provider);

    // Exact fingerprint match
    const fingerprint = this.computeFingerprint(provider, endpoint, request);
    const exactMatch = this.findByFingerprint(fingerprint);
    if (exactMatch) {
      this.recordHit(provider, 0);
      return exactMatch.response;
    }

    // Fuzzy match
    if (this.fuzzyMatch) {
      const fuzzyMatch = this.findFuzzyMatch(provider, endpoint, request);
      if (fuzzyMatch) {
        this.recordHit(provider, 0);
        return fuzzyMatch.response;
      }
    }

    // Sequential match
    const sequentialMatch = this.findSequentialMatch(provider, endpoint);
    if (sequentialMatch) {
      this.recordHit(provider, 0);
      return sequentialMatch.response;
    }

    this.recordMiss(provider);
    if (this.throwOnMiss) {
      throw new Error(
        `No matching fixture found for ${provider} ${endpoint}. ` +
        `Request fingerprint: ${fingerprint}`,
      );
    }
    return null;
  }

  /**
   * Match a response without playing it back (for assertion purposes).
   */
  matchResponse(
    apiProvider: string,
    endpoint: string,
    request: unknown,
  ): RecordedCall | null {
    // Exact match
    const fingerprint = this.computeFingerprint(apiProvider, endpoint, request);
    const exactMatch = this.findByFingerprint(fingerprint);
    if (exactMatch) {
      return exactMatch;
    }

    // Fuzzy match
    if (this.fuzzyMatch) {
      return this.findFuzzyMatch(apiProvider, endpoint, request);
    }

    return null;
  }

  // ==================== Statistics ====================

  /**
   * Get playback statistics.
   */
  getPlaybackStats(): PlaybackStats {
    const hitRate = this.totalAttempts > 0
      ? this.hits / this.totalAttempts
      : 0;

    const avgMatchLatencyMs = this.hits > 0
      ? this.totalMatchLatencyMs / this.hits
      : 0;

    return {
      totalAttempts: this.totalAttempts,
      hits: this.hits,
      misses: this.misses,
      errors: this.errors,
      hitRate,
      avgMatchLatencyMs,
      byProvider: { ...this.providerStats },
    };
  }

  /**
   * Reset playback statistics.
   */
  resetStats(): void {
    this.totalAttempts = 0;
    this.hits = 0;
    this.misses = 0;
    this.errors = 0;
    this.totalMatchLatencyMs = 0;
    this.sequentialCursors.clear();
    for (const key of Object.keys(this.providerStats)) {
      this.providerStats[key] = { attempts: 0, hits: 0, misses: 0, errors: 0 };
    }
  }

  // ==================== Matching Strategies ====================

  /**
   * Find a recording by exact fingerprint.
   */
  private findByFingerprint(fingerprint: string): RecordedCall | null {
    for (const indexed of this.indexedFixtures) {
      const match = indexed.byFingerprint.get(fingerprint);
      if (match) {
        return match;
      }
    }
    return null;
  }

  /**
   * Find a recording using fuzzy matching.
   *
   * Compares normalized versions of request payloads, ignoring
   * volatile fields like timestamps and request IDs.
   */
  private findFuzzyMatch(
    provider: string,
    endpoint: string,
    request: unknown,
  ): RecordedCall | null {
    const normalizedRequest = this.normalizeForComparison(request);

    for (const indexed of this.indexedFixtures) {
      const key = `${provider}:${endpoint}`;
      const candidates = indexed.byProviderEndpoint.get(key);

      if (!candidates) {
        continue;
      }

      for (const candidate of candidates) {
        const normalizedCandidate = this.normalizeForComparison(candidate.request);
        if (this.deepEquals(normalizedRequest, normalizedCandidate)) {
          return candidate;
        }
      }
    }

    return null;
  }

  /**
   * Find the next sequential recording for a provider+endpoint.
   *
   * Useful for conversation flows where each call returns a different
   * response in sequence.
   */
  private findSequentialMatch(
    provider: string,
    endpoint: string,
  ): RecordedCall | null {
    const key = `${provider}:${endpoint}`;
    const cursor = this.sequentialCursors.get(key) ?? 0;

    for (const indexed of this.indexedFixtures) {
      const candidates = indexed.byProviderEndpoint.get(key);
      if (!candidates || candidates.length === 0) {
        continue;
      }

      if (cursor < candidates.length) {
        const match = candidates[cursor]!;
        this.sequentialCursors.set(key, cursor + 1);
        return match;
      }
    }

    return null;
  }

  // ==================== Indexing ====================

  /**
   * Index a fixture for fast lookup.
   */
  private indexFixture(fixture: FixtureFile): IndexedFixture {
    const byFingerprint = new Map<string, RecordedCall>();
    const byProviderEndpoint = new Map<string, RecordedCall[]>();

    for (const recording of fixture.recordings) {
      // Index by fingerprint
      byFingerprint.set(recording.fingerprint, recording);

      // Index by provider+endpoint
      const key = `${recording.apiProvider}:${recording.endpoint}`;
      const existing = byProviderEndpoint.get(key) ?? [];
      existing.push(recording);
      byProviderEndpoint.set(key, existing);
    }

    return { fixture, byFingerprint, byProviderEndpoint };
  }

  // ==================== Normalization & Comparison ====================

  /**
   * Compute a fingerprint for a request (same algorithm as AiMockRecorder).
   */
  private computeFingerprint(
    provider: string,
    endpoint: string,
    request: unknown,
  ): string {
    const normalized = this.normalizeForFingerprint(request);
    const input = `${provider}|${endpoint}|${JSON.stringify(normalized)}`;
    return crypto.createHash("sha256").update(input).digest("hex");
  }

  /**
   * Normalize a request payload for fingerprinting.
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

  /**
   * Normalize a payload for fuzzy comparison, stripping volatile fields.
   */
  private normalizeForComparison(payload: unknown): unknown {
    if (payload === null || payload === undefined) {
      return null;
    }

    if (typeof payload !== "object") {
      return payload;
    }

    if (Array.isArray(payload)) {
      return payload.map((item) => this.normalizeForComparison(item));
    }

    const obj = payload as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    const sortedKeys = Object.keys(obj).sort();

    for (const key of sortedKeys) {
      if (FUZZY_IGNORE_FIELDS.has(key)) {
        continue;
      }
      result[key] = this.normalizeForComparison(obj[key]);
    }

    return result;
  }

  /**
   * Deep equality comparison for normalized payloads.
   */
  private deepEquals(a: unknown, b: unknown): boolean {
    if (a === b) {
      return true;
    }

    if (a === null || b === null) {
      return a === b;
    }

    if (typeof a !== typeof b) {
      return false;
    }

    if (typeof a !== "object") {
      return a === b;
    }

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) {
        return false;
      }
      return a.every((item, index) => this.deepEquals(item, b[index]));
    }

    if (Array.isArray(a) || Array.isArray(b)) {
      return false;
    }

    const objA = a as Record<string, unknown>;
    const objB = b as Record<string, unknown>;
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);

    if (keysA.length !== keysB.length) {
      return false;
    }

    return keysA.every(
      (key) => Object.prototype.hasOwnProperty.call(objB, key) &&
        this.deepEquals(objA[key], objB[key]),
    );
  }

  // ==================== Latency Simulation ====================

  /**
   * Apply simulated latency based on recorded response time.
   *
   * @returns The actual delay applied in ms
   */
  private async applyLatency(recordedLatencyMs: number): Promise<number> {
    if (!this.simulateLatency) {
      return 0;
    }

    let delay = recordedLatencyMs * this.latencyMultiplier;
    delay = Math.max(delay, this.minLatencyMs);
    delay = Math.min(delay, this.maxLatencyMs);

    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    return delay;
  }

  // ==================== Statistics Helpers ====================

  private ensureProviderStats(provider: string): void {
    if (!this.providerStats[provider]) {
      this.providerStats[provider] = { attempts: 0, hits: 0, misses: 0, errors: 0 };
    }
    this.providerStats[provider].attempts++;
  }

  private recordHit(provider: string, matchLatencyMs: number): void {
    this.hits++;
    this.totalMatchLatencyMs += matchLatencyMs;
    if (this.providerStats[provider]) {
      this.providerStats[provider].hits++;
    }
  }

  private recordMiss(provider: string): void {
    this.misses++;
    if (this.providerStats[provider]) {
      this.providerStats[provider].misses++;
    }
  }

  private recordError(provider: string): void {
    this.errors++;
    if (this.providerStats[provider]) {
      this.providerStats[provider].errors++;
    }
  }

  // ==================== Path Resolution ====================

  /**
   * Resolve a fixture path to an absolute path.
   */
  private resolveFixturePath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.resolve(this.fixtureDir, filePath);
  }
}
