import { useState, useEffect, useCallback } from "react";
import { usageEventEmitter } from "../../../shared/utils/usageEventEmitter";
import type {
  UsageExceededPayload,
  UsageProgressivePayload,
} from "../../../shared/utils/usageEventEmitter";

interface UsageLimitState {
  showLimitSheet: boolean;
  limitInfo: UsageExceededPayload;
}

/**
 * useUsageLimit -- listens for usage events from the API interceptor
 * and manages toast/BottomSheet visibility.
 *
 * - At 80% usage: shows a toast "今日还剩 X 次"
 * - At 100% usage: shows UsageLimitBottomSheet with upgrade CTA
 */
export function useUsageLimit() {
  const [showLimitSheet, setShowLimitSheet] = useState(false);
  const [limitInfo, setLimitInfo] = useState<UsageExceededPayload>({
    limit: 0,
    remaining: 0,
  });

  useEffect(() => {
    const unsubProgressive = usageEventEmitter.on(
      "usage:progressive",
      (payload: UsageProgressivePayload) => {
        // D-05: Progressive hint at 80%
        // Toast is shown via the hook consumer (e.g., Toast component)
        setLimitInfo({ ...payload, remaining: payload.remaining });
      }
    );

    const unsubExceeded = usageEventEmitter.on(
      "usage:exceeded",
      (payload: UsageExceededPayload) => {
        setLimitInfo(payload);
        setShowLimitSheet(true);
      }
    );

    return () => {
      unsubProgressive();
      unsubExceeded();
    };
  }, []);

  const closeLimitSheet = useCallback(() => {
    setShowLimitSheet(false);
  }, []);

  return {
    showLimitSheet,
    setShowLimitSheet,
    closeLimitSheet,
    limitInfo,
  } as const;
}
