import Constants from '@/src/polyfills/expo-constants';
import { Platform } from 'react-native';

type ExpoExtra = {
  API_URL?: string;
  AI_SERVICE_URL?: string;
  ENABLE_UNVERIFIED_MOBILE_DEMOS?: boolean;
  DISABLE_UNVERIFIED_MOBILE_DEMOS?: boolean;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;

function normalizeUrl(value?: string): string {
  return typeof value === "string" ? value.trim().replace(/\/+$/, "") : "";
}

function getDefaultApiUrl(): string {
  if (__DEV__) {
    // Development: use localhost with platform-specific host
    const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
    return `http://${host}:3001/api/v1`;
  }
  // Production: must be configured via environment
  return "";
}

function getDefaultAiServiceUrl(): string {
  if (__DEV__) {
    const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
    return `http://${host}:8001`;
  }
  return "";
}

export const mobileRuntimeConfig = {
  apiUrl: normalizeUrl(extra.API_URL) || getDefaultApiUrl(),
  aiServiceUrl: normalizeUrl(extra.AI_SERVICE_URL) || getDefaultAiServiceUrl(),
  enableUnverifiedMobileDemos: __DEV__ || extra.DISABLE_UNVERIFIED_MOBILE_DEMOS !== true,
};

export function requireMobileUrl(value: string, label: string): string {
  if (!value) {
    throw new Error(
      `${label} is not configured. Set the environment variable or app.json extra config before building for production.`,
    );
  }

  return value;
}
