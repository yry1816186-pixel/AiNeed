export interface AuthEndpoints {
  login: string;
  register: string;
  profile: string;
}

export interface ClothingEndpoints {
  list: string;
  detail: string;
  upload: string;
}

export interface OutfitEndpoints {
  recommend: string;
  analyze: string;
}

export interface TryOnEndpoints {
  create: string;
  status: string;
}

export interface StylistEndpoints {
  chat: string;
  session: string;
}

export interface ApiEndpoints {
  auth: AuthEndpoints;
  clothing: ClothingEndpoints;
  outfit: OutfitEndpoints;
  tryOn: TryOnEndpoints;
  stylist: StylistEndpoints;
}

export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  endpoints: ApiEndpoints;
}

export interface StorageKeys {
  AUTH_TOKEN: string;
  USER_PROFILE: string;
  WARDROBE_CACHE: string;
}

export interface ColorsConfig {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  textHint: string;
  divider: string;
}

const authEndpoints: AuthEndpoints = {
  login: '/auth/login',
  register: '/auth/register',
  profile: '/auth/profile'
};

const clothingEndpoints: ClothingEndpoints = {
  list: '/clothing',
  detail: '/clothing/:id',
  upload: '/clothing/upload'
};

const outfitEndpoints: OutfitEndpoints = {
  recommend: '/ai/outfit',
  analyze: '/ai/analyze'
};

const tryOnEndpoints: TryOnEndpoints = {
  create: '/try-on/create',
  status: '/try-on/status/:taskId'
};

const stylistEndpoints: StylistEndpoints = {
  chat: '/ai-stylist/chat',
  session: '/ai-stylist/session'
};

const apiEndpoints: ApiEndpoints = {
  auth: authEndpoints,
  clothing: clothingEndpoints,
  outfit: outfitEndpoints,
  tryOn: tryOnEndpoints,
  stylist: stylistEndpoints
};

export const API_CONFIG: ApiConfig = {
  baseUrl: 'http://10.0.2.2:3001/api',
  timeout: 30000,
  endpoints: apiEndpoints
};

export const STORAGE_KEYS: StorageKeys = {
  AUTH_TOKEN: 'auth_token',
  USER_PROFILE: 'user_profile',
  WARDROBE_CACHE: 'wardrobe_cache'
};

export const COLORS: ColorsConfig = {
  primary: '#6366F1',
  secondary: '#8B5CF6',
  accent: '#F59E0B',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  textPrimary: '#333333',
  textSecondary: '#666666',
  textHint: '#999999',
  divider: '#E5E5E5'
};
