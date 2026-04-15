/**
 * usePullToRefresh - Deprecated alias for useRefresh
 *
 * @deprecated Use `useRefresh` instead. This hook is kept for backward compatibility
 * and re-exports useRefresh with the same interface.
 */
export { useRefresh as usePullToRefresh } from "./useRefresh";
export default useRefresh;

import { useRefresh } from "./useRefresh";
