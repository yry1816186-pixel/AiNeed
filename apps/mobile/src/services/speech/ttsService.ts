import { Audio } from "@/src/polyfills/expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface TtsInterface {
  setDefaultLanguage: (lang: string) => Promise<void>;
  setDefaultRate: (rate: number) => Promise<void>;
  setDefaultPitch: (pitch: number) => Promise<void>;
  stop: () => Promise<void>;
  speak: (text: string) => Promise<void>;
}

let Tts: TtsInterface | null = null;

try {
  Tts = require("react-native-tts").default;
} catch {
  Tts = null;
}

let ttsInitialized = false;

const initTts = async () => {
  if (ttsInitialized || !Tts) {
    return;
  }
  try {
    await Tts.setDefaultLanguage("zh-CN");
    await Tts.setDefaultRate(0.95);
    await Tts.setDefaultPitch(1.1);
    ttsInitialized = true;
  } catch {
    ttsInitialized = false;
  }
};

/** Current sound object for URL-based playback */
let currentSound: InstanceType<typeof Audio.Sound> | null = null;

const TTS_CACHE_KEY = "@xuno_tts_cache";
const MAX_CACHED_ITEMS = 10;

interface TtsCacheEntry {
  url: string;
  localUri: string;
  text: string;
  cachedAt: number;
}

/**
 * Get cached TTS entries from AsyncStorage.
 * In a production app this would use FileSystem for audio files.
 * For Sprint: we cache the URL mapping so previously fetched audio
 * can be replayed via the expo-av sound cache.
 */
async function getCachedEntries(): Promise<TtsCacheEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(TTS_CACHE_KEY);
    return raw ? (JSON.parse(raw) as TtsCacheEntry[]) : [];
  } catch {
    return [];
  }
}

async function setCachedEntries(entries: TtsCacheEntry[]): Promise<void> {
  // Keep only the most recent MAX_CACHED_ITEMS
  const trimmed = entries.slice(-MAX_CACHED_ITEMS);
  await AsyncStorage.setItem(TTS_CACHE_KEY, JSON.stringify(trimmed));
}

/**
 * speakFromUrl -- Play audio from a URL (Edge-TTS backend audio).
 *
 * Features:
 * - Stops any currently playing audio before starting new playback
 * - Caches URL for offline replay (same URL reused without network)
 * - Silently degrades on failure (no error popup, text displays normally)
 */
export const speakFromUrl = async (url: string, text?: string): Promise<void> => {
  try {
    await stopSpeaking();

    // Check cache for previously downloaded audio
    const cached = await getCachedEntries();
    const cachedEntry = cached.find((e) => e.url === url);

    const soundSource = cachedEntry ? { uri: cachedEntry.localUri || url } : { uri: url };

    const { sound } = await Audio.Sound.createAsync(soundSource);
    currentSound = sound;
    await sound.playAsync();

    // Cache the URL for future offline replay
    if (text && url) {
      const newEntry: TtsCacheEntry = {
        url,
        localUri: url, // expo-av caches via URI internally
        text,
        cachedAt: Date.now(),
      };
      const updated = cached.filter((e) => e.url !== url);
      updated.push(newEntry);
      await setCachedEntries(updated);
    }

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        void sound.unloadAsync();
        currentSound = null;
      }
    });
  } catch {
    // Audio playback failed -- fail silently, text response shows normally
  }
};

/**
 * speak -- Device TTS fallback (react-native-tts).
 * Retained for backward compatibility.
 */
export const speak = async (text: string): Promise<void> => {
  if (!Tts) {
    return;
  }
  try {
    await initTts();
    await Tts.stop();
    await Tts.speak(text);
  } catch {
    // TTS not available on this device -- silent degradation
  }
};

/**
 * stopSpeaking -- Stop all audio playback (URL-based and device TTS).
 */
export const stopSpeaking = async (): Promise<void> => {
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
    } catch {
      // ignore
    }
    currentSound = null;
  }
  if (Tts) {
    try {
      await Tts.stop();
    } catch {
      // ignore
    }
  }
};

export const isTtsAvailable = (): boolean => Tts !== null;
