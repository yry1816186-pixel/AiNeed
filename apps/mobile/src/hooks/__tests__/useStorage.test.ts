import { renderHook, act } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useStorage } from "../useStorage";

describe("useStorage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return initial value when storage is empty", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useStorage("test-key", "default"));

    // Wait for the useEffect to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current[0]).toBe("default");
    expect(result.current[2]).toBe(false); // loading
  });

  it("should load value from AsyncStorage", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify("stored-value"));

    const { result } = renderHook(() => useStorage("test-key", "default"));

    // Initially loading
    expect(result.current[2]).toBe(true);

    // Wait for the useEffect to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current[0]).toBe("stored-value");
    expect(result.current[2]).toBe(false);
    expect(AsyncStorage.getItem).toHaveBeenCalledWith("test-key");
  });

  it("should save value to AsyncStorage with setValue", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useStorage("test-key", "default"));

    // Wait for initial load
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current[1]("new-value");
    });

    expect(result.current[0]).toBe("new-value");
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("test-key", JSON.stringify("new-value"));
  });

  it("should support function updater with setValue", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(10));
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useStorage("counter", 0));

    // Wait for initial load
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current[0]).toBe(10);

    await act(async () => {
      await result.current[1]((prev: number) => prev + 5);
    });

    expect(result.current[0]).toBe(15);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("counter", JSON.stringify(15));
  });

  it("should handle AsyncStorage read errors gracefully", async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error("read error"));

    const { result } = renderHook(() => useStorage("test-key", "fallback"));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Should fall back to initial value
    expect(result.current[0]).toBe("fallback");
    expect(result.current[2]).toBe(false);
  });

  it("should handle AsyncStorage write errors gracefully", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error("write error"));

    const { result } = renderHook(() => useStorage("test-key", "default"));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Should still update local state even if storage fails
    await act(async () => {
      await result.current[1]("updated");
    });

    expect(result.current[0]).toBe("updated");
  });

  it("should be in loading state initially", () => {
    (AsyncStorage.getItem as jest.Mock).mockReturnValue(
      new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => useStorage("test-key", "default"));

    expect(result.current[2]).toBe(true);
  });
});
