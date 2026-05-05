import { renderHook, act } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import { useReducedMotion } from "../useReducedMotion";

jest.mock("react-native", () => {
  const RN = jest.requireActual("react-native");
  return {
    ...RN,
    AccessibilityInfo: {
      isReduceMotionEnabled: jest.fn(),
      addEventListener: jest.fn(),
    },
  };
});

describe("useReducedMotion", () => {
  const mockIsReduceMotionEnabled = AccessibilityInfo.isReduceMotionEnabled as jest.Mock;
  const mockAddEventListener = AccessibilityInfo.addEventListener as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsReduceMotionEnabled.mockResolvedValue(false);
    mockAddEventListener.mockReturnValue({ remove: jest.fn() });
  });

  it("should return false by default", () => {
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it("should call isReduceMotionEnabled on mount", () => {
    renderHook(() => useReducedMotion());
    expect(mockIsReduceMotionEnabled).toHaveBeenCalledTimes(1);
  });

  it("should subscribe to reduceMotionChanged events", () => {
    renderHook(() => useReducedMotion());
    expect(mockAddEventListener).toHaveBeenCalledWith(
      "reduceMotionChanged",
      expect.any(Function)
    );
  });

  it("should unsubscribe on unmount", () => {
    const remove = jest.fn();
    mockAddEventListener.mockReturnValue({ remove });

    const { unmount } = renderHook(() => useReducedMotion());
    unmount();

    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("should return true when reduce motion is enabled", async () => {
    mockIsReduceMotionEnabled.mockResolvedValue(true);
    const { result } = renderHook(() => useReducedMotion());
    await act(async () => {
      // wait for promise to resolve
    });
    expect(result.current).toBe(true);
  });
});
