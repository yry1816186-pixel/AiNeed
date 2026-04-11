/**
 * Circuit Breaker Service
 *
 * Implements the Circuit Breaker pattern using Opossum to prevent cascading failures
 * when external AI services are unavailable.
 *
 * Configuration via environment variables:
 * - AI_CIRCUIT_BREAKER_FAILURE_THRESHOLD: Number of failures before opening (default: 5)
 * - AI_CIRCUIT_BREAKER_SUCCESS_THRESHOLD: Successes needed to close (default: 3)
 * - AI_CIRCUIT_BREAKER_TIMEOUT: Time in ms before attempting to close (default: 30000)
 * - AI_CIRCUIT_BREAKER_VOLUME_THRESHOLD: Minimum requests before calculating threshold (default: 10)
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import CircuitBreaker, { Options as CircuitBreakerOptions } from 'opossum';

export type CircuitBreakerState = 'closed' | 'open' | 'halfOpen';

export interface CircuitBreakerStats {
  name: string;
  state: CircuitBreakerState;
  failures: number;
  successes: number;
  fallbacks: number;
  rejects: number;
  fires: number;
  timeouts: number;
  latencyMean: number;
  latencyPercentiles: {
    '0.5': number;
    '0.9': number;
    '0.95': number;
    '0.99': number;
  };
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  volumeThreshold: number;
  errorThresholdPercentage: number;
  resetTimeout: number;
}

const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 30000,
  volumeThreshold: 10,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
};

@Injectable()
export class CircuitBreakerService implements OnModuleInit {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly breakers = new Map<string, CircuitBreaker<unknown[], unknown>>();
  private readonly config: CircuitBreakerConfig;

  constructor(private configService: ConfigService) {
    this.config = {
      failureThreshold:
        this.configService.get<number>('AI_CIRCUIT_BREAKER_FAILURE_THRESHOLD') ??
        DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold,
      successThreshold:
        this.configService.get<number>('AI_CIRCUIT_BREAKER_SUCCESS_THRESHOLD') ??
        DEFAULT_CIRCUIT_BREAKER_CONFIG.successThreshold,
      timeout:
        this.configService.get<number>('AI_CIRCUIT_BREAKER_TIMEOUT') ??
        DEFAULT_CIRCUIT_BREAKER_CONFIG.timeout,
      volumeThreshold:
        this.configService.get<number>('AI_CIRCUIT_BREAKER_VOLUME_THRESHOLD') ??
        DEFAULT_CIRCUIT_BREAKER_CONFIG.volumeThreshold,
      errorThresholdPercentage:
        this.configService.get<number>('AI_CIRCUIT_BREAKER_ERROR_THRESHOLD_PERCENTAGE') ??
        DEFAULT_CIRCUIT_BREAKER_CONFIG.errorThresholdPercentage,
      resetTimeout:
        this.configService.get<number>('AI_CIRCUIT_BREAKER_RESET_TIMEOUT') ??
        DEFAULT_CIRCUIT_BREAKER_CONFIG.resetTimeout,
    };

    this.logger.log('Circuit Breaker Service initialized with config:', this.config);
  }

  onModuleInit() {
    this.logger.log('Circuit Breaker Service ready');
  }

  /**
   * Create or get a circuit breaker for a named service
   * @param name Unique identifier for the circuit breaker
   * @param fn The function to protect with circuit breaker
   * @param options Optional custom options
   */
  getOrCreate<T, Args extends unknown[]>(
    name: string,
    fn: (...args: Args) => Promise<T>,
    options?: Partial<CircuitBreakerOptions>,
  ): CircuitBreaker<Args, T> {
    if (this.breakers.has(name)) {
      return this.breakers.get(name) as CircuitBreaker<Args, T>;
    }

    const breakerOptions: CircuitBreakerOptions = {
      timeout: options?.timeout ?? this.config.timeout,
      errorThresholdPercentage: options?.errorThresholdPercentage ?? this.config.errorThresholdPercentage,
      resetTimeout: options?.resetTimeout ?? this.config.resetTimeout,
      volumeThreshold: options?.volumeThreshold ?? this.config.volumeThreshold,
      rollingCountTimeout: 10000,
      capacity: 100,
    };

    const breaker = new CircuitBreaker(fn, breakerOptions);

    // Event listeners for monitoring
    breaker.on('open', () => {
      this.logger.warn(`Circuit breaker [${name}] opened - service unavailable`);
    });

    breaker.on('halfOpen', () => {
      this.logger.log(`Circuit breaker [${name}] half-open - testing service`);
    });

    breaker.on('close', () => {
      this.logger.log(`Circuit breaker [${name}] closed - service restored`);
    });

    breaker.on('fallback', () => {
      this.logger.debug(`Circuit breaker [${name}] fallback executed`);
    });

    breaker.on('timeout', () => {
      this.logger.warn(`Circuit breaker [${name}] request timed out`);
    });

    breaker.on('reject', () => {
      this.logger.warn(`Circuit breaker [${name}] request rejected (circuit open)`);
    });

    breaker.on('failure', (error: Error) => {
      this.logger.warn(`Circuit breaker [${name}] failure: ${error.message}`);
    });

    breaker.on('success', () => {
      this.logger.debug(`Circuit breaker [${name}] success`);
    });

    this.breakers.set(name, breaker as CircuitBreaker<unknown[], unknown>);

    return breaker;
  }

  /**
   * Execute a function with circuit breaker protection
   * @param name Circuit breaker name
   * @param fn The function to protect
   * @param fallback Optional fallback function when circuit is open
   * @param args Arguments to pass to the function
   */
  async execute<T, Args extends unknown[]>(
    name: string,
    fn: (...args: Args) => Promise<T>,
    fallback: (...args: Args) => Promise<T>,
    ...args: Args
  ): Promise<T> {
    const breaker = this.getOrCreate(name, fn);

    if (!breaker.fallback) {
      breaker.fallback(fallback);
    }

    return breaker.fire(...args);
  }

  /**
   * Get statistics for a specific circuit breaker
   */
  getStats(name: string): CircuitBreakerStats | null {
    const breaker = this.breakers.get(name);
    if (!breaker) {
      return null;
    }

    const stats = breaker.stats;
    return {
      name,
      state: this.mapState(breaker.opened ? 'open' : breaker.halfOpen ? 'halfOpen' : 'closed'),
      failures: stats.failures,
      successes: stats.successes,
      fallbacks: stats.fallbacks,
      rejects: stats.rejects,
      fires: stats.fires,
      timeouts: stats.timeouts,
      latencyMean: stats.latencyMean ?? 0,
      latencyPercentiles: {
        '0.5': stats.latencyTimes?.['0.5'] ?? 0,
        '0.9': stats.latencyTimes?.['0.9'] ?? 0,
        '0.95': stats.latencyTimes?.['0.95'] ?? 0,
        '0.99': stats.latencyTimes?.['0.99'] ?? 0,
      },
    };
  }

  /**
   * Get statistics for all circuit breakers
   */
  getAllStats(): CircuitBreakerStats[] {
    const names = Array.from(this.breakers.keys());
    return names
      .map((name) => this.getStats(name))
      .filter((stats): stats is CircuitBreakerStats => stats !== null);
  }

  /**
   * Check if a circuit breaker is healthy (closed state)
   */
  isHealthy(name: string): boolean {
    const breaker = this.breakers.get(name);
    if (!breaker) {
      return true; // No breaker means no known failures
    }
    return !breaker.opened;
  }

  /**
   * Manually open a circuit breaker (for testing or manual intervention)
   */
  open(name: string): void {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.open();
      this.logger.warn(`Circuit breaker [${name}] manually opened`);
    }
  }

  /**
   * Manually close a circuit breaker (for testing or manual intervention)
   */
  close(name: string): void {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.close();
      this.logger.log(`Circuit breaker [${name}] manually closed`);
    }
  }

  /**
   * Clear a circuit breaker's stats
   */
  clear(name: string): void {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.shutdown();
      this.breakers.delete(name);
      this.logger.log(`Circuit breaker [${name}] stats reset`);
    }
  }

  /**
   * Remove a circuit breaker
   */
  remove(name: string): void {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.shutdown();
      this.breakers.delete(name);
      this.logger.log(`Circuit breaker [${name}] removed`);
    }
  }

  /**
   * Shutdown all circuit breakers
   */
  shutdown(): void {
    for (const [name, breaker] of this.breakers.entries()) {
      breaker.shutdown();
      this.logger.log(`Circuit breaker [${name}] shutdown`);
    }
    this.breakers.clear();
  }

  private mapState(state: 'closed' | 'open' | 'halfOpen'): CircuitBreakerState {
    return state;
  }
}
