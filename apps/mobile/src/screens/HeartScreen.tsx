import { HeartRecommendScreen } from "../components/heartrecommend/HeartRecommendScreen";
import { withErrorBoundary } from "../shared/components/ErrorBoundary";
import { logger } from "../utils/logger";

const HeartScreenWithErrorBoundary = withErrorBoundary(HeartRecommendScreen, {
  screenName: "HeartScreen",
  maxRetries: 3,
  onError: (error, errorInfo, structuredError) => {
    logger.error("[HeartScreen] Error:", structuredError);
  },
  onReset: () => {
    logger.log("[HeartScreen] Error boundary reset");
  },
});

export { HeartScreenWithErrorBoundary as HeartScreen };
export default HeartScreenWithErrorBoundary;
