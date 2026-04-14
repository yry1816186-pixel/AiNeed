import { renderHook, act } from "@testing-library/react-native";
import { useRetry } from "../useRetry";

describe("useRetry", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should have correct initial state", () => {
    const { result } = renderHook(() => useRetry());

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isRetrying).toBe(false);
    expect(result.current.retryCount).toBe(0);
  });

  it("should set data on successful execute", async () => {
    const successFn = jest.fn().mockResolvedValue("success");
    const { result } = renderHook(() => useRetry());

    await act(async () => {
      const res = await result.current.execute(successFn);
      expect(res).toBe("success");
    });

    expect(result.current.data).toBe("success");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.retryCount).toBe(0);
  });

  it("should retry on failure and eventually succeed", async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error("fail 1"))
      .mockResolvedValueOnce("recovered");

    const { result } = renderHook(() =>
      useRetry({ maxRetries: 2, baseDelay: 100 }),
    );

    const executePromise = act(async () => {
      const res = await result.current.execute(fn);
      return res;
    });

    // Advance timer for the retry delay (100 * 2^0 = 100ms)
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    const res = await executePromise;
    expect(res).toBe("recovered");
    expect(result.current.data).toBe("recovered");
    expect(result.current.error).toBeNull();
  });

  it("should set error after all retries exhausted", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("persistent failure"));

    const { result } = renderHook(() =>
      useRetry({ maxRetries: 1, baseDelay: 100 }),
    );

    const executePromise = act(async () => {
      const res = await result.current.execute(fn);
      return res;
    });

    // Advance timer for the retry delay (100 * 2^0 = 100ms)
    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    const res = await executePromise;
    expect(res).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("persistent failure");
    expect(result.current.isLoading).toBe(false);
  });

  it("should call onRetry callback on each retry attempt", async () => {
    const onRetry = jest.fn();
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce("ok");

    const { result } = renderHook(() =>
      useRetry({ maxRetries: 2, baseDelay: 100, onRetry }),
    );

    const executePromise = act(async () => {
      const res = await result.current.execute(fn);
      return res;
    });

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    await executePromise;
    expect(onRetry).toHaveBeenCalledWith(1);
  });

  it("should retry with the last function using retry()", async () => {
    const fn = jest.fn().mockResolvedValue("result");
    const { result } = renderHook(() =>
      useRetry({ maxRetries: 2, baseDelay: 100 }),
    );

    // First execute
    await act(async () => {
      await result.current.execute(fn);
    });
    expect(result.current.data).toBe("result");

    // Reset and retry
    act(() => {
      result.current.reset();
    });
    expect(result.current.data).toBeNull();

    // Retry with last function
    fn.mockResolvedValue("retried result");
    await act(async () => {
      await result.current.retry();
    });
    expect(result.current.data).toBe("retried result");
  });

  it("should reset all state with reset()", async () => {
    const fn = jest.fn().mockResolvedValue("data");
    const { result } = renderHook(() => useRetry());

    await act(async () => {
      await result.current.execute(fn);
    });

    expect(result.current.data).toBe("data");

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isRetrying).toBe(false);
    expect(result.current.retryCount).toBe(0);
  });

  it("should track retryCount during retries", async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error("fail 1"))
      .mockRejectedValueOnce(new Error("fail 2"))
      .mockResolvedValueOnce("ok");

    const { result } = renderHook(() =>
      useRetry({ maxRetries: 3, baseDelay: 100 }),
    );

    const executePromise = act(async () => {
      const res = await result.current.execute(fn);
      return res;
    });

    // Advance through retry delays
    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    await executePromise;
    expect(result.current.data).toBe("ok");
  });
});
