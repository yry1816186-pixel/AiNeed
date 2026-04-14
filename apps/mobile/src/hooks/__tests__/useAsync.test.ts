import { renderHook, act } from "@testing-library/react-native";
import { useAsync } from "../useAsync";

describe("useAsync", () => {
  it("should have correct initial state when not immediate", () => {
    const asyncFn = jest.fn().mockResolvedValue("data");
    const { result } = renderHook(() => useAsync(asyncFn));

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should have loading=true when immediate is true", () => {
    const asyncFn = jest.fn().mockResolvedValue("data");
    const { result } = renderHook(() => useAsync(asyncFn, true));

    expect(result.current.loading).toBe(true);
  });

  it("should set data on successful execute", async () => {
    const asyncFn = jest.fn().mockResolvedValue("result");
    const { result } = renderHook(() => useAsync(asyncFn));

    await act(async () => {
      const res = await result.current.execute();
      expect(res).toBe("result");
    });

    expect(result.current.data).toBe("result");
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should set error on failed execute", async () => {
    const error = new Error("something went wrong");
    const asyncFn = jest.fn().mockRejectedValue(error);
    const { result } = renderHook(() => useAsync(asyncFn));

    await act(async () => {
      const res = await result.current.execute();
      expect(res).toBeNull();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(error);
  });

  it("should reset state with reset()", async () => {
    const asyncFn = jest.fn().mockResolvedValue("data");
    const { result } = renderHook(() => useAsync(asyncFn));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.data).toBe("data");

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should pass arguments to async function", async () => {
    const asyncFn = jest.fn().mockResolvedValue("result");
    const { result } = renderHook(() => useAsync(asyncFn));

    await act(async () => {
      await result.current.execute("arg1", "arg2");
    });

    expect(asyncFn).toHaveBeenCalledWith("arg1", "arg2");
  });

  it("should clear previous error on new execute", async () => {
    const error = new Error("fail");
    const asyncFn = jest.fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce("success");
    const { result } = renderHook(() => useAsync(asyncFn));

    // First call fails
    await act(async () => {
      await result.current.execute();
    });
    expect(result.current.error).toBe(error);

    // Second call succeeds
    await act(async () => {
      await result.current.execute();
    });
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBe("success");
  });
});
