import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface DemoProfile {
  bodyType: string;
  styleExpression: string;
  primaryScenarios: string[];
}

export const PRESET_PROFILES: Record<string, DemoProfile> = {
  default: {
    bodyType: "hourglass",
    styleExpression: "minimalist",
    primaryScenarios: ["commute", "date"],
  },
  professional: {
    bodyType: "rectangle",
    styleExpression: "classic",
    primaryScenarios: ["interview", "business"],
  },
  creative: {
    bodyType: "pear",
    styleExpression: "bohemian",
    primaryScenarios: ["street", "party"],
  },
};

interface DemoState {
  demoMode: boolean;
  activeProfile: string;
  customProfile: DemoProfile | null;
  toggleDemoMode: () => void;
  setActiveProfile: (name: string) => void;
  setCustomProfile: (profile: DemoProfile) => void;
  resetProfile: () => void;
  getCurrentProfile: () => DemoProfile;
}

export const useDemoStore = create<DemoState>()(
  persist(
    (set, get) => ({
      demoMode: false,
      activeProfile: "default",
      customProfile: null,
      toggleDemoMode: () => set((s) => ({ demoMode: !s.demoMode })),
      setActiveProfile: (name) => set({ activeProfile: name }),
      setCustomProfile: (profile) => set({ customProfile: profile, activeProfile: "custom" }),
      resetProfile: () => set({ activeProfile: "default", customProfile: null }),
      getCurrentProfile: () => {
        const { activeProfile, customProfile } = get();
        if (activeProfile === "custom" && customProfile) return customProfile;
        return PRESET_PROFILES[activeProfile] || PRESET_PROFILES.default;
      },
    }),
    {
      name: "demo-store",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
