/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
/**
 * useOfflineNetworkStatus hook tests
 */

import { renderHook, act } from "@testing-library/react-native";

// We'll set up the mock implementation per-test
let mockListenerCallback: ((state: { isConnected: boolean }) => void) | null = null;
const mockUnsubscribe = jest.fn();

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn((cb: (state: { isConnected: boolean }) => void) => {
      mockListenerCallback = cb;
      return mockUnsubscribe;
    }),
    fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
  },
}));

// Import AFTER mock setup
import { useOfflineNetworkStatus } from "../useOfflineNetworkStatus";

describe("useOfflineNetworkStatus", () => {
  beforeEach(() => {
    mockListenerCallback = null;
    mockUnsubscribe.mockClear();
  });

  it("should return isOffline: false when connected", () => {
    const { result } = renderHook(() => useOfflineNetworkStatus());

    // Simulate connected state
    if (mockListenerCallback) {
      mockListenerCallback({ isConnected: true });
    }

    expect(result.current.isOffline).toBe(false);
  });

  it("should return isOffline: true when disconnected", () => {
    const { result } = renderHook(() => useOfflineNetworkStatus());

    // Simulate disconnected state
    act(() => {
      if (mockListenerCallback) {
        mockListenerCallback({ isConnected: false });
      }
    });

    expect(result.current.isOffline).toBe(true);
  });

  it("should unsubscribe on unmount", () => {
    const { unmount } = renderHook(() => useOfflineNetworkStatus());
    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
