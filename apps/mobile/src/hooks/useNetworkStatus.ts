/**
 * useNetworkStatus - 网络状态检测 Hook
 *
 * Re-exports:
 * - useNetworkStatus from useNetwork.ts (fetch-ping based, with offline queue)
 * - useOfflineNetworkStatus from useOfflineNetworkStatus.ts (NetInfo based, for offline UX)
 *
 * For offline UX scenarios (OfflineBanner, sync triggers), use useOfflineNetworkStatus.
 * For offline queue support, use useNetwork() from useNetwork.ts.
 */
export { useNetworkStatus } from "./useNetwork";
export { useOfflineNetworkStatus } from "./useOfflineNetworkStatus";
export type { OfflineNetworkState } from "./useOfflineNetworkStatus";
