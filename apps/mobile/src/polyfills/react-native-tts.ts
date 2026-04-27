const Tts = {
  speak: (_text: string, _options?: object) => Promise.resolve("success"),
  stop: () => Promise.resolve(true),
  setDefaultLanguage: (_lang: string) => Promise.resolve(true),
  setDefaultRate: (_rate: number, _skipTransform?: boolean) => Promise.resolve(true),
  setDefaultPitch: (_pitch: number) => Promise.resolve(true),
  setDefaultVoice: (_voiceId: string) => Promise.resolve(true),
  voices: () => Promise.resolve([]),
  addEventListener: () => ({ remove: () => {} }),
  removeEventListener: () => {},
};

export default Tts;
