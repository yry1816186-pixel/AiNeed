declare const process: { env: Record<string, string | undefined> } | undefined;

import { Platform } from 'react-native';

export const manifest = {
  extra: {
    apiUrl: Platform.OS === 'android'
      ? 'http://10.0.2.2:3001/api/v1'
      : 'http://localhost:3001/api/v1',
  },
};

export const expoConfig = {
  extra: {
    apiUrl: Platform.OS === 'android'
      ? 'http://10.0.2.2:3001/api/v1'
      : 'http://localhost:3001/api/v1',
    FAL_KEY: process?.env?.EXPO_PUBLIC_FAL_KEY || '',
    OPENAI_KEY: process?.env?.EXPO_PUBLIC_OPENAI_KEY || '',
    SENTRY_DSN: process?.env?.EXPO_PUBLIC_SENTRY_DSN || '',
  },
};

export default { manifest, expoConfig };
