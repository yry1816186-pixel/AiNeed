import { renderHook, act } from "@testing-library/react-native";
import { AccessibilityInfo, PixelRatio } from "react-native";
import { useAccessibility } from "../useAccessibility";

jest.mock("react-native", () => {
  const RN = jest.requireActual("react-native");
  return {
    ...RN,
    AccessibilityInfo: {
      isScreenReaderEnabled: jest.fn().mockResolvedValue(false),
      addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
    },
    PixelRatio: {
      getFontScale: jest.fn().mockReturnValue(1),
    },
  };
});

describe("useAccessibility", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return screenReaderActive = false by default", () => {
    const { result } = renderHook(() => useAccessibility());
    expect(result.current.screenReaderActive).toBe(false);
  });

  it("should return fontScale from PixelRatio", () => {
    (PixelRatio.getFontScale as jest.Mock).mockReturnValue(1.5);
    const { result } = renderHook(() => useAccessibility());
    expect(result.current.fontScale).toBe(1.5);
  });

  it("should call isScreenReaderEnabled on mount", () => {
    renderHook(() => useAccessibility());
    expect(AccessibilityInfo.isScreenReaderEnabled).toHaveBeenCalledTimes(1);
  });

  it("should subscribe to screenReaderChanged", () => {
    renderHook(() => useAccessibility());
    expect(AccessibilityInfo.addEventListener).toHaveBeenCalledWith(
      "screenReaderChanged",
      expect.any(Function)
    );
  });

  it("should update screenReaderActive when screen reader toggled", async () => {
    (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);
    const { result } = renderHook(() => useAccessibility());
    await act(async () => {
      // wait for promise to resolve
    });
    expect(result.current.screenReaderActive).toBe(true);
  });

  it("should unsubscribe on unmount", () => {
    const remove = jest.fn();
    (AccessibilityInfo.addEventListener as jest.Mock).mockReturnValue({ remove });

    const { unmount } = renderHook(() => useAccessibility());
    unmount();

    expect(remove).toHaveBeenCalledTimes(1);
  });

  describe("ensureMinTouchTarget", () => {
    it("should return 44 for values below 44", () => {
      const { result } = renderHook(() => useAccessibility());
      expect(result.current.ensureMinTouchTarget(32)).toBe(44);
      expect(result.current.ensureMinTouchTarget(0)).toBe(44);
      expect(result.current.ensureMinTouchTarget(-5)).toBe(44);
    });

    it("should return the value when it is >= 44", () => {
      const { result } = renderHook(() => useAccessibility());
      expect(result.current.ensureMinTouchTarget(44)).toBe(44);
      expect(result.current.ensureMinTouchTarget(48)).toBe(48);
      expect(result.current.ensureMinTouchTarget(100)).toBe(100);
    });
  });
});
