import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';

import { REDIS_CLIENT } from '../../../common/redis/redis.service';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitHealth {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure: Date | null;
}

export class CircuitBreakerOpenException extends Error {
  constructor(serviceName: string) {
    super(`Circuit breaker is OPEN for service: ${serviceName}`);
    this.name = 'CircuitBreakerOpenException';
  }
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  globalBudget: number;
  windowMs: number;
}

@Injectable()
export class AiCircuitBreakerService {
  private readonly config: CircuitBreakerConfig;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.config = {
      failureThreshold: this.configService.get<number>('CB_FAILURE_THRESHOLD', 5),
      successThreshold: this.configService.get<number>('CB_SUCCESS_THRESHOLD', 3),
      timeout: this.configService.get<number>('CB_TIMEOUT', 30000),
      globalBudget: this.configService.get<number>('CB_GLOBAL_BUDGET', 20),
      windowMs: this.configService.get<number>('CB_WINDOW_MS', 60000),
    };
  }

  private key(serviceName: string, suffix: string): string {
    return `xuno:cb:${serviceName}:${suffix}`;
  }

  private getGlobalFailureKey(): string {
    return 'xuno:cb:global:failures';
  }

  async execute<T>(serviceName: string, fn: () => Promise<T>): Promise<T> {
    const state = await this.getState(serviceName);

    if (state === CircuitState.OPEN) {
      const lastFailure = await this.redis.get(this.key(serviceName, 'lastFailure'));
      const elapsed = lastFailure ? Date.now() - parseInt(lastFailure, 10) : Infinity;

      if (elapsed >= this.config.timeout) {
        await this.transitionTo(serviceName, CircuitState.HALF_OPEN);
      } else {
        throw new CircuitBreakerOpenException(serviceName);
      }
    }

    try {
      const result = await fn();
      await this.recordSuccess(serviceName);
      return result;
    } catch (error) {
      await this.recordFailure(serviceName);
      throw error;
    }
  }

  async getState(serviceName: string): Promise<CircuitState> {
    const raw = await this.redis.get(this.key(serviceName, 'state'));
    if (!raw) {return CircuitState.CLOSED;}
    return raw as CircuitState;
  }

  async tripCircuit(serviceName: string): Promise<void> {
    await this.transitionTo(serviceName, CircuitState.OPEN);
  }

  async resetCircuit(serviceName: string): Promise<void> {
    const keys = [
      this.key(serviceName, 'state'),
      this.key(serviceName, 'failures'),
      this.key(serviceName, 'successes'),
      this.key(serviceName, 'lastFailure'),
    ];
    await this.redis.del(...keys);
    await this.redis.set(this.key(serviceName, 'state'), CircuitState.CLOSED);
  }

  async getHealthStatus(): Promise<Record<string, CircuitHealth>> {
    const globalFailures = await this.getGlobalFailureCount();
    const services = await this.discoverServices();
    const result: Record<string, CircuitHealth> = {};

    for (const svc of services) {
      const [state, failures, successes, lastFailure] = await Promise.all([
        this.redis.get(this.key(svc, 'state')),
        this.redis.get(this.key(svc, 'failures')),
        this.redis.get(this.key(svc, 'successes')),
        this.redis.get(this.key(svc, 'lastFailure')),
      ]);

      result[svc] = {
        state: (state as CircuitState) || CircuitState.CLOSED,
        failures: parseInt(failures || '0', 10),
        successes: parseInt(successes || '0', 10),
        lastFailure: lastFailure ? new Date(parseInt(lastFailure, 10)) : null,
      };
    }

    result['__global__'] = {
      state: globalFailures >= this.config.globalBudget ? CircuitState.OPEN : CircuitState.CLOSED,
      failures: globalFailures,
      successes: 0,
      lastFailure: null,
    };

    return result;
  }

  private async recordSuccess(serviceName: string): Promise<void> {
    const state = await this.getState(serviceName);

    if (state === CircuitState.HALF_OPEN) {
      const newCount = await this.redis.incr(this.key(serviceName, 'successes'));
      if (newCount >= this.config.successThreshold) {
        await this.transitionTo(serviceName, CircuitState.CLOSED);
      }
    }
  }

  private async recordFailure(serviceName: string): Promise<void> {
    const state = await this.getState(serviceName);

    if (state === CircuitState.HALF_OPEN) {
      await this.transitionTo(serviceName, CircuitState.OPEN);
      return;
    }

    const failureKey = this.key(serviceName, 'failures');
    const newCount = await this.redis.incr(failureKey);

    if (newCount === 1) {
      await this.redis.pexpire(failureKey, this.config.windowMs);
    }

    await this.redis.set(this.key(serviceName, 'lastFailure'), String(Date.now()));

    const globalCount = await this.redis.incr(this.getGlobalFailureKey());
    if (globalCount === 1) {
      await this.redis.pexpire(this.getGlobalFailureKey(), this.config.windowMs);
    }

    if (newCount >= this.config.failureThreshold) {
      await this.transitionTo(serviceName, CircuitState.OPEN);
    }

    if (globalCount >= this.config.globalBudget) {
      await this.globalTrip();
    }
  }

  private async transitionTo(serviceName: string, newState: CircuitState): Promise<void> {
    const currentState = await this.getState(serviceName);
    if (currentState === newState) {return;}

    await this.redis.set(this.key(serviceName, 'state'), newState);

    if (newState === CircuitState.CLOSED) {
      await this.redis.del(
        this.key(serviceName, 'failures'),
        this.key(serviceName, 'successes'),
      );
      this.eventEmitter.emit('circuit.closed', { serviceName, previousState: currentState });
    } else if (newState === CircuitState.OPEN) {
      await this.redis.del(this.key(serviceName, 'successes'));
      this.eventEmitter.emit('circuit.opened', { serviceName, previousState: currentState });
    } else if (newState === CircuitState.HALF_OPEN) {
      await this.redis.del(this.key(serviceName, 'successes'));
      this.eventEmitter.emit('circuit.half_opened', { serviceName, previousState: currentState });
    }
  }

  private async globalTrip(): Promise<void> {
    const services = await this.discoverServices();
    for (const svc of services) {
      await this.transitionTo(svc, CircuitState.OPEN);
    }
    this.eventEmitter.emit('circuit.global_trip', {
      services,
      timestamp: new Date().toISOString(),
    });
  }

  private async getGlobalFailureCount(): Promise<number> {
    const raw = await this.redis.get(this.getGlobalFailureKey());
    return raw ? parseInt(raw, 10) : 0;
  }

  private async discoverServices(): Promise<string[]> {
    const pattern = 'xuno:cb:*:state';
    const keys = await this.redis.keys(pattern);
    const serviceSet = new Set<string>();

    for (const key of keys) {
      const parts = key.split(':');
      if (parts.length >= 3 && parts[2] !== 'global') {
        serviceSet.add(parts[2] ?? "");
      }
    }

    return Array.from(serviceSet);
  }
}
