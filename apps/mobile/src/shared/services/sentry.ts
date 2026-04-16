import * as Sentry from "@sentry/react-native";
import Constants from "../../polyfills/expo-constants";

type _ExpoExtra = {
  SENTRY_DSN?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;
const SENTRY_DSN = extra.SENTRY_DSN || "";

export function initSentry(): void {
  if (!SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: __DEV__ ? "development" : "production",
    tracesSampleRate: __DEV__ ? 0 : 0.2,
    enableAutoSessionTracking: true,
    attachScreenshot: false,
  });
}

export { Sentry };
