import { recommendationsApi } from "../../services/api/tryon.api";
import { PRESET_PROFILES } from "../stores/demoStore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_KEY = "demo-precache";
const CACHE_TTL = 30 * 60 * 1000;

interface CachedRecommendation {
  profileName: string;
  data: unknown;
  timestamp: number;
}

export async function preCacheDemoRecommendations(): Promise<void> {
  const profileNames = Object.keys(PRESET_PROFILES);
  const cached: CachedRecommendation[] = [];

  for (const name of profileNames) {
    try {
      const profile = PRESET_PROFILES[name];
      const result = await recommendationsApi.getPersonalizedOutput({
        bodyType: profile.bodyType,
        styleExpression: profile.styleExpression,
        primaryScenarios: profile.primaryScenarios,
        limit: 3,
      });
      cached.push({ profileName: name, data: result, timestamp: Date.now() });
    } catch {
      // Skip failed pre-cache, will fall back to live API
    }
  }

  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cached));
}

export async function getPreCachedRecommendation(profileName: string): Promise<unknown | null> {
  const raw = await AsyncStorage.getItem(CACHE_KEY);
  if (!raw) return null;

  const cached: CachedRecommendation[] = JSON.parse(raw);
  const entry = cached.find((c) => c.profileName === profileName);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) return null;

  return entry.data;
}

export async function isPreCacheValid(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(CACHE_KEY);
  if (!raw) return false;
  const cached: CachedRecommendation[] = JSON.parse(raw);
  if (cached.length === 0) return false;
  const oldest = Math.min(...cached.map((c) => c.timestamp));
  return Date.now() - oldest < CACHE_TTL;
}
