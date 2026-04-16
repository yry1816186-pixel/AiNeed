import { useState, useEffect, useCallback, useRef } from "react";
import { offlineStorage, OfflineRequest } from "../utils/secureStorage";
import apiClient from "../services/api/client";

export type NetInfoStateType =
  | "unknown"
  | "none"
  | "cellular"
  | "wifi"
  | "bluetooth"
  | "ethernet"
  | "wimax"
  | "vpn"
  | "other";

export interface NetworkState {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  type: NetInfoStateType;
  isConnectionExpensive: boolean;
}

export interface UseNetworkResult {
  networkState: NetworkState;
  isOffline: boolean;
  pendingRequests: number;
  syncOfflineRequests: () => Promise<void>;
  queueOfflineRequest: (
    request: Omit<OfflineRequest, "id" | "timestamp" | "retries">
  ) => Promise<string>;
}

const MAX_RETRIES = 3;

async function checkNetworkConnection(): Promise<NetworkState> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    await fetch("https://www.baidu.com", {
      method: "HEAD",
      mode: "no-cors",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    return {
      isConnected: true,
      isInternetReachable: true,
      type: "wifi",
      isConnectionExpensive: false,
    };
  } catch (error) {
    console.error('Network status check failed:', error);
    return {
      isConnected: false,
      isInternetReachable: false,
      type: "none",
      isConnectionExpensive: false,
    };
  }
}

export function useNetwork(): UseNetworkResult {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isConnected: null,
    isInternetReachable: null,
    type: "unknown",
    isConnectionExpensive: false,
  });
  const [pendingRequests, setPendingRequests] = useState(0);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    const checkConnection = async () => {
      const state = await checkNetworkConnection();
      setNetworkState(state);

      if (state.isConnected && state.isInternetReachable) {
        void syncOfflineRequests();
      }
    };

    void checkConnection();
    void loadPendingCount();

    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadPendingCount = async () => {
    const queue = await offlineStorage.getQueue();
    setPendingRequests(queue.length);
  };

  const syncOfflineRequests = useCallback(async () => {
    if (isSyncingRef.current) {
      return;
    }
    isSyncingRef.current = true;

    try {
      const queue = await offlineStorage.getQueue();

      for (const request of queue) {
        if (request.retries >= MAX_RETRIES) {
          await offlineStorage.removeRequest(request.id);
          continue;
        }

        try {
          let result;
          switch (request.method) {
            case "POST":
              result = await apiClient.post(request.url, request.data);
              break;
            case "PUT":
              result = await apiClient.put(request.url, request.data);
              break;
            case "PATCH":
              result = await apiClient.patch(request.url, request.data);
              break;
            case "DELETE":
              result = await apiClient.delete(request.url);
              break;
          }

          if (result?.success) {
            await offlineStorage.removeRequest(request.id);
          } else {
            await offlineStorage.incrementRetries(request.id);
          }
        } catch (error) {
          console.error(`Failed to sync request ${request.id}:`, error);
          await offlineStorage.incrementRetries(request.id);
        }
      }

      await loadPendingCount();
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  const queueOfflineRequest = useCallback(
    async (request: Omit<OfflineRequest, "id" | "timestamp" | "retries">): Promise<string> => {
      const id = await offlineStorage.queueRequest(request);
      await loadPendingCount();
      return id;
    },
    []
  );

  return {
    networkState,
    isOffline: networkState.isConnected === false || networkState.isInternetReachable === false,
    pendingRequests,
    syncOfflineRequests,
    queueOfflineRequest,
  };
}

export function useOfflineQueue() {
  const { isOffline, pendingRequests, syncOfflineRequests, queueOfflineRequest } = useNetwork();

  const executeWithOfflineSupport = useCallback(
    async <T>(
      operation: () => Promise<T>,
      offlineAction: Omit<OfflineRequest, "id" | "timestamp" | "retries">
    ): Promise<T | null> => {
      if (!isOffline) {
        try {
          return await operation();
        } catch (error) {
          console.error("Operation failed, queuing for offline:", error);
          await queueOfflineRequest(offlineAction);
          return null;
        }
      } else {
        await queueOfflineRequest(offlineAction);
        return null;
      }
    },
    [isOffline, queueOfflineRequest]
  );

  return {
    isOffline,
    pendingRequests,
    syncOfflineRequests,
    executeWithOfflineSupport,
  };
}

/**
 * useNetworkStatus - Lightweight network status hook
 *
 * Uses NetInfo for real-time network status updates.
 * For offline queue support, use useNetwork() instead.
 */
export function useNetworkStatus(): {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  type: string | null;
} {
  const [state, setState] = useState<{
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
    type: string | null;
  }>({
    isConnected: null,
    isInternetReachable: null,
    type: null,
  });

  useEffect(() => {
    let mounted = true;

    const checkStatus = async () => {
      const netState = await checkNetworkConnection();
      if (mounted) {
        setState({
          isConnected: netState.isConnected,
          isInternetReachable: netState.isInternetReachable,
          type: netState.type,
        });
      }
    };

    void checkStatus();
    const interval = setInterval(checkStatus, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return state;
}
