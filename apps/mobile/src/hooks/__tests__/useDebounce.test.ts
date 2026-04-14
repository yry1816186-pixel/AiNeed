import { renderHook, act } from "@testing-library/react-native";
import { useDebounce } from "../useDebounce";

describe("useDebounce", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should return initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("hello", 500));
    expect(result.current).toBe("hello");
  });

  it("should return new value after delay", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: any) => useDebounce(value, delay),
      { initialProps: { value: "initial", delay: 500 } },
    );

    rerender({ value: "updated", delay: 500 });

    // Before delay: still old value
    expect(result.current).toBe("initial");

    // After delay: new value
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current).toBe("updated");
  });

  it("should only take the last value on rapid changes", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: any) => useDebounce(value, delay),
      { initialProps: { value: "a", delay: 300 } },
    );

    // Rapidly change values
    rerender({ value: "b", delay: 300 });
    act(() => {
      jest.advanceTimersByTime(100);
    });

    rerender({ value: "c", delay: 300 });
    act(() => {
      jest.advanceTimersByTime(100);
    });

    rerender({ value: "d", delay: 300 });

    // Still should be initial value before full delay
    expect(result.current).toBe("a");

    // After full delay: only last value
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current).toBe("d");
  });

  it("should cancel timer on cleanup", () => {
    const { result, rerender, unmount } = renderHook(
      ({ value, delay }: any) => useDebounce(value, delay),
      { initialProps: { value: "start", delay: 500 } },
    );

    rerender({ value: "changed", delay: 500 });

    // Unmount before delay completes
    unmount();

    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Value should not have been updated after unmount
    // (the hook is gone, so we just verify no errors were thrown)
    expect(result.current).toBe("start");
  });
});
