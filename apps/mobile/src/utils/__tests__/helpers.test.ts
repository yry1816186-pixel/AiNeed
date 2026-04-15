/**
 * Tests for pure utility functions from performanceUtils
 * These are synchronous functions with no React Native dependencies
 * except __DEV__ which is provided via jest globals
 */

import {
  MemoryCache,
  PerformanceTimer,
  throttle,
  debounce,
  batchExecute,
  delayLoad,
} from "../performanceUtils";

jest.mock("react-native", () => ({
  InteractionManager: {
    runAfterInteractions: (cb: () => void) => cb(),
  },
}));

jest.mock(
  "react-native-fast-image",
  () => ({
    preload: jest.fn(),
  }),
  { virtual: true }
);

describe("MemoryCache", () => {
  it("should store and retrieve values", () => {
    const cache = new MemoryCache<string>();
    cache.set("key1", "value1");

    expect(cache.get("key1")).toBe("value1");
  });

  it("should return undefined for missing keys", () => {
    const cache = new MemoryCache<string>();

    expect(cache.get("nonexistent")).toBeUndefined();
  });

  it("should report has() correctly", () => {
    const cache = new MemoryCache<number>();
    cache.set("count", 42);

    expect(cache.has("count")).toBe(true);
    expect(cache.has("missing")).toBe(false);
  });

  it("should delete entries", () => {
    const cache = new MemoryCache<string>();
    cache.set("key1", "value1");
    cache.delete("key1");

    expect(cache.get("key1")).toBeUndefined();
  });

  it("should clear all entries", () => {
    const cache = new MemoryCache<string>();
    cache.set("a", "1");
    cache.set("b", "2");
    cache.clear();

    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBeUndefined();
  });

  it("should expire entries based on TTL", () => {
    const cache = new MemoryCache<string>(100); // 100ms TTL
    cache.set("ephemeral", "data");

    // Should be available immediately
    expect(cache.get("ephemeral")).toBe("data");

    // Mock Date.now to simulate time passing
    const originalNow = Date.now;
    const baseTime = Date.now();
    Date.now = jest.fn(() => baseTime + 200); // 200ms later
    try {
      expect(cache.get("ephemeral")).toBeUndefined();
    } finally {
      Date.now = originalNow;
    }
  });
});

describe("PerformanceTimer", () => {
  it("should measure elapsed time", () => {
    const originalNow = Date.now;
    const baseTime = 1000;
    Date.now = jest.fn(() => baseTime);

    const timer = new PerformanceTimer("test");

    Date.now = jest.fn(() => baseTime + 150);

    const duration = timer.end();
    expect(duration).toBe(150);
    Date.now = originalNow;
  });

  it("should return 0 when no time has passed", () => {
    const fixedTime = 5000;
    const originalNow = Date.now;
    Date.now = jest.fn(() => fixedTime);

    const timer = new PerformanceTimer("instant");
    const duration = timer.end();

    expect(duration).toBe(0);
    Date.now = originalNow;
  });
});

describe("throttle", () => {
  it("should call function immediately on first invocation", () => {
    jest.useFakeTimers();
    const fn = jest.fn();
    const throttled = throttle(fn, 100);

    throttled("arg1");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("arg1");

    jest.useRealTimers();
  });

  it("should not call function again within throttle period", () => {
    jest.useFakeTimers();
    const fn = jest.fn();
    const throttled = throttle(fn, 100);

    throttled("first");
    throttled("second");
    throttled("third");

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("first");

    jest.useRealTimers();
  });
});

describe("debounce", () => {
  it("should delay function execution", () => {
    jest.useFakeTimers();
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced("arg1");
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("arg1");

    jest.useRealTimers();
  });

  it("should only execute the last call when debounced rapidly", () => {
    jest.useFakeTimers();
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced("first");
    debounced("second");
    debounced("third");

    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("third");

    jest.useRealTimers();
  });
});

describe("batchExecute", () => {
  it("should execute all tasks and return results", async () => {
    const tasks = [() => 1, () => 2, () => 3];

    const results = await batchExecute(tasks, 10, 0);
    expect(results).toEqual([1, 2, 3]);
  });

  it("should handle empty task list", async () => {
    const results = await batchExecute([], 5, 0);
    expect(results).toEqual([]);
  });

  it("should respect batch size", async () => {
    const callOrder: number[] = [];
    const tasks = [1, 2, 3, 4, 5].map((n) => () => {
      callOrder.push(n);
      return n;
    });

    const results = await batchExecute(tasks, 2, 0);
    expect(results).toEqual([1, 2, 3, 4, 5]);
    expect(callOrder).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("delayLoad", () => {
  it("should resolve after specified delay", async () => {
    jest.useFakeTimers();
    const promise = delayLoad(200);

    jest.advanceTimersByTime(200);
    await expect(promise).resolves.toBeUndefined();

    jest.useRealTimers();
  });
});
