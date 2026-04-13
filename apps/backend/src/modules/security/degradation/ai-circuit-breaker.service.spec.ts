import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Test, TestingModule } from "@nestjs/testing";

import { REDIS_CLIENT } from "../../../common/redis/redis.service";

import {
  AiCircuitBreakerService,
  CircuitState,
  CircuitBreakerOpenException,
} from "./ai-circuit-breaker.service";

function createRedisMock() {
  const store = new Map<string, { value: string; pttlMs?: number; setAt: number }>();

  return {
    store,
    get: jest.fn((key: string) => {
      const entry = store.get(key);
      if (!entry) return Promise.resolve(null);
      if (entry.pttlMs && Date.now() - entry.setAt > entry.pttlMs) {
        store.delete(key);
        return Promise.resolve(null);
      }
      return Promise.resolve(entry.value);
    }),
    set: jest.fn((key: string, value: string) => {
      store.set(key, { value, setAt: Date.now() });
      return Promise.resolve("OK");
    }),
    incr: jest.fn((key: string) => {
      const entry = store.get(key);
      const current = entry ? parseInt(entry.value, 10) : 0;
      const next = current + 1;
      store.set(key, {
        value: String(next),
        setAt: entry?.setAt ?? Date.now(),
        pttlMs: entry?.pttlMs,
      });
      return Promise.resolve(next);
    }),
    del: jest.fn((...keys: string[]) => {
      let count = 0;
      for (const key of keys) {
        if (store.delete(key)) count++;
      }
      return Promise.resolve(count);
    }),
    pexpire: jest.fn((key: string, ms: number) => {
      const entry = store.get(key);
      if (entry) {
        entry.pttlMs = ms;
        entry.setAt = Date.now();
      }
      return Promise.resolve(1);
    }),
    keys: jest.fn((pattern: string) => {
      if (pattern === "xuno:cb:*:state") {
        const stateKeys: string[] = [];
        for (const key of store.keys()) {
          if (key.startsWith("xuno:cb:") && key.endsWith(":state") && !key.includes(":global:")) {
            stateKeys.push(key);
          }
        }
        return Promise.resolve(stateKeys);
      }
      return Promise.resolve([]);
    }),
  };
}

describe("AiCircuitBreakerService", () => {
  let service: AiCircuitBreakerService;
  let redis: ReturnType<typeof createRedisMock>;
  let eventEmitter: EventEmitter2;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: number) => {
      const config: Record<string, number> = {
        CB_FAILURE_THRESHOLD: 5,
        CB_SUCCESS_THRESHOLD: 3,
        CB_TIMEOUT: 30000,
        CB_GLOBAL_BUDGET: 20,
        CB_WINDOW_MS: 60000,
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    redis = createRedisMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiCircuitBreakerService,
        { provide: REDIS_CLIENT, useValue: redis },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<AiCircuitBreakerService>(AiCircuitBreakerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("execute in CLOSED state", () => {
    it("应该允许请求通过", async () => {
      const result = await service.execute("test-service", async () => "success");
      expect(result).toBe("success");
    });

    it("应该在成功时记录成功", async () => {
      await service.execute("test-service", async () => "ok");

      const state = await service.getState("test-service");
      expect(state).toBe(CircuitState.CLOSED);
    });

    it("应该在失败时记录失败", async () => {
      try {
        await service.execute("test-service", async () => {
          throw new Error("Service error");
        });
      } catch {
        // expected
      }

      const failures = await redis.get("xuno:cb:test-service:failures");
      expect(failures).toBe("1");
    });
  });

  describe("execute in OPEN state", () => {
    it("应该拒绝请求并抛�?CircuitBreakerOpenException", async () => {
      await redis.set("xuno:cb:test-service:state", CircuitState.OPEN);
      await redis.set("xuno:cb:test-service:lastFailure", String(Date.now()));

      await expect(
        service.execute("test-service", async () => "success"),
      ).rejects.toThrow(CircuitBreakerOpenException);
    });

    it("异常消息应该包含服务名称", async () => {
      await redis.set("xuno:cb:test-service:state", CircuitState.OPEN);
      await redis.set("xuno:cb:test-service:lastFailure", String(Date.now()));

      await expect(
        service.execute("test-service", async () => "success"),
      ).rejects.toThrow("test-service");
    });
  });

  describe("execute in HALF_OPEN state", () => {
    it("应该允许探测请求通过", async () => {
      await redis.set("xuno:cb:test-service:state", CircuitState.HALF_OPEN);

      const result = await service.execute("test-service", async () => "probe-success");
      expect(result).toBe("probe-success");
    });

    it("探测成功应该增加成功计数", async () => {
      await redis.set("xuno:cb:test-service:state", CircuitState.HALF_OPEN);

      await service.execute("test-service", async () => "ok");

      const successes = await redis.get("xuno:cb:test-service:successes");
      expect(successes).toBe("1");
    });
  });

  describe("state transitions: CLOSED -> OPEN", () => {
    it("应该在达到失败阈值后转换�?OPEN 状�?, async () => {
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute("test-service", async () => {
            throw new Error("fail");
          });
        } catch {
          // expected
        }
      }

      const state = await service.getState("test-service");
      expect(state).toBe(CircuitState.OPEN);
    });

    it("应该在转换为 OPEN 时发�?circuit.opened 事件", async () => {
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute("test-service", async () => {
            throw new Error("fail");
          });
        } catch {
          // expected
        }
      }

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        "circuit.opened",
        expect.objectContaining({
          serviceName: "test-service",
        }),
      );
    });
  });

  describe("state transitions: OPEN -> HALF_OPEN", () => {
    it("应该在超时后允许请求（转换为 HALF_OPEN�?, async () => {
      await redis.set("xuno:cb:test-service:state", CircuitState.OPEN);
      await redis.set("xuno:cb:test-service:lastFailure", String(Date.now() - 31000));

      const result = await service.execute("test-service", async () => "recovered");
      expect(result).toBe("recovered");
    });

    it("应该在超时后发出 circuit.half_opened 事件", async () => {
      await redis.set("xuno:cb:test-service:state", CircuitState.OPEN);
      await redis.set("xuno:cb:test-service:lastFailure", String(Date.now() - 31000));

      await service.execute("test-service", async () => "recovered");

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        "circuit.half_opened",
        expect.objectContaining({
          serviceName: "test-service",
        }),
      );
    });
  });

  describe("state transitions: HALF_OPEN -> CLOSED", () => {
    it("应该在达到成功阈值后转换�?CLOSED 状�?, async () => {
      await redis.set("xuno:cb:test-service:state", CircuitState.HALF_OPEN);

      for (let i = 0; i < 3; i++) {
        await service.execute("test-service", async () => "ok");
      }

      const state = await service.getState("test-service");
      expect(state).toBe(CircuitState.CLOSED);
    });

    it("应该在转换为 CLOSED 时发�?circuit.closed 事件", async () => {
      await redis.set("xuno:cb:test-service:state", CircuitState.HALF_OPEN);

      for (let i = 0; i < 3; i++) {
        await service.execute("test-service", async () => "ok");
      }

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        "circuit.closed",
        expect.objectContaining({
          serviceName: "test-service",
        }),
      );
    });
  });

  describe("state transitions: HALF_OPEN -> OPEN", () => {
    it("应该�?HALF_OPEN 状态下失败时立即转换为 OPEN", async () => {
      await redis.set("xuno:cb:test-service:state", CircuitState.HALF_OPEN);

      try {
        await service.execute("test-service", async () => {
          throw new Error("fail again");
        });
      } catch {
        // expected
      }

      const state = await service.getState("test-service");
      expect(state).toBe(CircuitState.OPEN);
    });
  });

  describe("global trip", () => {
    it("应该在全局失败预算超限时触发全局跳闸", async () => {
      await redis.set("xuno:cb:global:failures", "20");

      for (let i = 0; i < 5; i++) {
        try {
          await service.execute("svc-1", async () => {
            throw new Error("fail");
          });
        } catch {
          // expected
        }
      }

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        "circuit.global_trip",
        expect.objectContaining({
          services: expect.any(Array),
        }),
      );
    });
  });

  describe("tripCircuit", () => {
    it("应该手动将服务跳闸到 OPEN 状�?, async () => {
      await service.tripCircuit("manual-trip-service");

      const state = await service.getState("manual-trip-service");
      expect(state).toBe(CircuitState.OPEN);
    });

    it("应该发出 circuit.opened 事件", async () => {
      await service.tripCircuit("manual-trip-service");

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        "circuit.opened",
        expect.objectContaining({
          serviceName: "manual-trip-service",
        }),
      );
    });
  });

  describe("resetCircuit", () => {
    it("应该手动将服务重置为 CLOSED 状�?, async () => {
      await redis.set("xuno:cb:reset-service:state", CircuitState.OPEN);
      await redis.set("xuno:cb:reset-service:failures", "10");
      await redis.set("xuno:cb:reset-service:successes", "2");

      await service.resetCircuit("reset-service");

      const state = await service.getState("reset-service");
      expect(state).toBe(CircuitState.CLOSED);
    });

    it("应该清除失败和成功计�?, async () => {
      await redis.set("xuno:cb:reset-service:state", CircuitState.OPEN);
      await redis.set("xuno:cb:reset-service:failures", "10");
      await redis.set("xuno:cb:reset-service:successes", "2");

      await service.resetCircuit("reset-service");

      const failures = await redis.get("xuno:cb:reset-service:failures");
      const successes = await redis.get("xuno:cb:reset-service:successes");
      expect(failures).toBeNull();
      expect(successes).toBeNull();
    });
  });

  describe("getHealthStatus", () => {
    it("应该返回所有服务的健康状�?, async () => {
      await redis.set("xuno:cb:service-a:state", CircuitState.CLOSED);
      await redis.set("xuno:cb:service-a:failures", "2");
      await redis.set("xuno:cb:service-a:successes", "0");
      await redis.set("xuno:cb:service-a:lastFailure", String(Date.now()));

      const health = await service.getHealthStatus();

      expect(health["service-a"]).toBeDefined();
      expect(health["service-a"]!.state).toBe(CircuitState.CLOSED);
      expect(health["service-a"]!.failures).toBe(2);
    });

    it("应该包含全局健康状�?, async () => {
      await redis.set("xuno:cb:global:failures", "5");

      const health = await service.getHealthStatus();

      expect(health["__global__"]).toBeDefined();
      expect(health["__global__"]!.failures).toBe(5);
      expect(health["__global__"]!.state).toBe(CircuitState.CLOSED);
    });

    it("全局失败超预算时全局状态应�?OPEN", async () => {
      await redis.set("xuno:cb:global:failures", "25");

      const health = await service.getHealthStatus();

      expect(health["__global__"]!.state).toBe(CircuitState.OPEN);
    });

    it("应该返回 null 作为无失败服务的 lastFailure", async () => {
      await redis.set("xuno:cb:new-service:state", CircuitState.CLOSED);

      const health = await service.getHealthStatus();

      expect(health["new-service"]!.lastFailure).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("未注册服务的默认状态应�?CLOSED", async () => {
      const state = await service.getState("unknown-service");
      expect(state).toBe(CircuitState.CLOSED);
    });

    it("同一状态转换不应该重复触发事件", async () => {
      await service.tripCircuit("test-service");
      mockEventEmitter.emit.mockClear();

      await service.tripCircuit("test-service");

      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it("execute 应该传播原始错误", async () => {
      const originalError = new Error("Service unavailable");

      await expect(
        service.execute("test-service", async () => {
          throw originalError;
        }),
      ).rejects.toThrow("Service unavailable");
    });
  });
});

