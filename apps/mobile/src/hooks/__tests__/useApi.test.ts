import { renderHook, act } from "@testing-library/react-native";
import { useApi } from "../useApi";
import type { ApiResponse } from "../../types";

// Mock the API client
jest.mock("../../services/api/client", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe("useApi", () => {
  let mockApiFn: jest.Mock;

  beforeEach(() => {
    mockApiFn = jest.fn();
  });

  it("should have correct initial state when not immediate", () => {
    const { result } = renderHook(() => useApi(mockApiFn));

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should have loading=true when immediate is true", () => {
    mockApiFn.mockResolvedValue({ success: true, data: "test" });
    const { result } = renderHook(() => useApi(mockApiFn, { immediate: true }));

    expect(result.current.loading).toBe(true);
  });

  it("should set data on successful execute", async () => {
    const responseData: ApiResponse<string> = {
      success: true,
      data: "hello",
    };
    mockApiFn.mockResolvedValue(responseData);

    const { result } = renderHook(() => useApi(mockApiFn));

    await act(async () => {
      const res = await result.current.execute();
      expect(res).toBe("hello");
    });

    expect(result.current.data).toBe("hello");
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should set error when response has error", async () => {
    const responseData: ApiResponse<string> = {
      success: false,
      error: { code: "BUSINESS_ERROR", message: "Something went wrong" },
    };
    mockApiFn.mockResolvedValue(responseData);

    const { result } = renderHook(() => useApi(mockApiFn));

    await act(async () => {
      const res = await result.current.execute();
      expect(res).toBeNull();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.code).toBe("BUSINESS_ERROR");
  });

  it("should set error on exception", async () => {
    mockApiFn.mockRejectedValue(new Error("Network failure"));

    const { result } = renderHook(() => useApi(mockApiFn));

    await act(async () => {
      const res = await result.current.execute();
      expect(res).toBeNull();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).not.toBeNull();
    // toAppError converts Error to AppError with UNKNOWN_ERROR code
    expect(result.current.error?.code).toBe("UNKNOWN_ERROR");
  });

  it("should reset state with reset()", async () => {
    mockApiFn.mockResolvedValue({ success: true, data: "data" });

    const { result } = renderHook(() => useApi(mockApiFn));

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

  it("should refetch with last arguments using refetch()", async () => {
    mockApiFn.mockResolvedValue({ success: true, data: "first" });

    const { result } = renderHook(() => useApi(mockApiFn));

    // Initial execute with arguments
    await act(async () => {
      await result.current.execute("arg1", "arg2");
    });

    expect(mockApiFn).toHaveBeenCalledWith("arg1", "arg2");
    expect(result.current.data).toBe("first");

    // Change mock for refetch
    mockApiFn.mockResolvedValue({ success: true, data: "refetched" });

    // Refetch with same arguments
    await act(async () => {
      const res = await result.current.refetch();
      expect(res).toBe("refetched");
    });

    expect(mockApiFn).toHaveBeenLastCalledWith("arg1", "arg2");
    expect(result.current.data).toBe("refetched");
  });

  it("should return null from refetch when no previous execute", async () => {
    const { result } = renderHook(() => useApi(mockApiFn));

    await act(async () => {
      const res = await result.current.refetch();
      expect(res).toBeNull();
    });
  });

  it("should call onSuccess callback on success", async () => {
    const onSuccess = jest.fn();
    mockApiFn.mockResolvedValue({ success: true, data: "data" });

    const { result } = renderHook(() => useApi(mockApiFn, { onSuccess }));

    await act(async () => {
      await result.current.execute();
    });

    expect(onSuccess).toHaveBeenCalledWith("data");
  });

  it("should call onError callback on error", async () => {
    const onError = jest.fn();
    mockApiFn.mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useApi(mockApiFn, { onError }));

    await act(async () => {
      await result.current.execute();
    });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].code).toBe("UNKNOWN_ERROR");
  });
});
