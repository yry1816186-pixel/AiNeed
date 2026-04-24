/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires */
let Tts: any = null;

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

export const speak = async (text: string) => {
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

export const stopSpeaking = async () => {
  if (!Tts) {
    return;
  }
  try {
    await Tts.stop();
  } catch {
    // ignore
  }
};

export const isTtsAvailable = (): boolean => Tts !== null;
