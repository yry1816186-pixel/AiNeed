import { HeartRecommendScreen } from '../components/heartrecommend/HeartRecommendScreen';
import { withErrorBoundary } from '../components/ErrorBoundary';

const HeartScreenWithErrorBoundary = withErrorBoundary(HeartRecommendScreen, {
  screenName: 'HeartScreen',
  maxRetries: 3,
  onError: (error, errorInfo, structuredError) => {
    console.error('[HeartScreen] Error:', structuredError);
  },
  onReset: () => {
    console.log('[HeartScreen] Error boundary reset');
  },
});

export { HeartScreenWithErrorBoundary as HeartScreen };
export default HeartScreenWithErrorBoundary;
