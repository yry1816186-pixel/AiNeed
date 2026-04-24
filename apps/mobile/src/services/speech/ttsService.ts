import { Audio } from "@/src/polyfills/expo-av";

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

/**
 * speakFromUrl -- Play audio from a URL (Edge-TTS backend audio).
 *
 * Stops any currently playing audio before starting new playback.
 * Automatically unloads the sound on completion.
 */
export const speakFromUrl = async (url: string): Promise<void> => {
  try {
    await stopSpeaking();

    const { sound } = await Audio.Sound.createAsync({ uri: url });
    currentSound = sound;
    await sound.playAsync();

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        void sound.unloadAsync();
        currentSound = null;
      }
    });
  } catch {
    // Audio playback failed -- fail silently
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
    // TTS not available on this device
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
