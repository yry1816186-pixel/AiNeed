/**
 * useOfflineNetworkStatus - 基于 NetInfo 的轻量离线检测 Hook
 *
 * 使用 @react-native-community/netinfo 实时监听网络状态变化。
 * 与 useNetwork.ts (fetch ping) 不同，这个 hook 用于离线 UX 场景，
 * 依赖 NetInfo 的事件订阅机制，延迟更低。
 *
 * 返回: { isOffline: boolean, isConnected: boolean | null }
 */
import { useState, useEffect } from "react";
import NetInfo from "@react-native-community/netinfo";

export interface OfflineNetworkState {
  isOffline: boolean;
  isConnected: boolean | null;
}

export function useOfflineNetworkStatus(): OfflineNetworkState {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? null);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    isOffline: isConnected === false,
    isConnected,
  };
}
