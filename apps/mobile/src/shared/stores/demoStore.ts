import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface DemoProfile {
  bodyType: string;
  styleExpression: string;
  primaryScenarios: string[];
}

export interface SeedProfile extends DemoProfile {
  id: string;
  nickname: string;
  gender: string;
  ageBand: string;
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

export const SEED_PROFILES: Record<string, SeedProfile> = {
  seed_v2_1: {
    id: "seed_v2_1",
    nickname: "面试达人",
    gender: "male",
    ageBand: "22-25",
    bodyType: "rectangle",
    styleExpression: "minimalist",
    primaryScenarios: ["interview"],
  },
  seed_v2_2: {
    id: "seed_v2_2",
    nickname: "文艺女孩",
    gender: "female",
    ageBand: "22-25",
    bodyType: "hourglass",
    styleExpression: "vintage",
    primaryScenarios: ["date", "party"],
  },
  seed_v2_3: {
    id: "seed_v2_3",
    nickname: "街头潮人",
    gender: "male",
    ageBand: "18-21",
    bodyType: "slim",
    styleExpression: "streetwear",
    primaryScenarios: ["daily", "party"],
  },
  seed_v2_4: {
    id: "seed_v2_4",
    nickname: "职场精英",
    gender: "female",
    ageBand: "26-30",
    bodyType: "athletic",
    styleExpression: "professional",
    primaryScenarios: ["commute", "interview"],
  },
  seed_v2_5: {
    id: "seed_v2_5",
    nickname: "运动达人",
    gender: "male",
    ageBand: "26-30",
    bodyType: "muscular",
    styleExpression: "sporty",
    primaryScenarios: ["daily", "travel"],
  },
  seed_v2_6: {
    id: "seed_v2_6",
    nickname: "温柔淑女",
    gender: "female",
    ageBand: "22-25",
    bodyType: "pear",
    styleExpression: "romantic",
    primaryScenarios: ["date", "party"],
  },
  seed_v2_7: {
    id: "seed_v2_7",
    nickname: "极简主义",
    gender: "male",
    ageBand: "31-35",
    bodyType: "invertedTriangle",
    styleExpression: "minimalist",
    primaryScenarios: ["daily", "commute"],
  },
  seed_v2_8: {
    id: "seed_v2_8",
    nickname: "国潮少年",
    gender: "male",
    ageBand: "18-21",
    bodyType: "slim",
    styleExpression: "avant-garde",
    primaryScenarios: ["party", "date"],
  },
  seed_v2_9: {
    id: "seed_v2_9",
    nickname: "知性女性",
    gender: "female",
    ageBand: "26-30",
    bodyType: "hourglass",
    styleExpression: "classic",
    primaryScenarios: ["interview", "commute"],
  },
  seed_v2_10: {
    id: "seed_v2_10",
    nickname: "阳光学生",
    gender: "female",
    ageBand: "18-21",
    bodyType: "rectangle",
    styleExpression: "casual",
    primaryScenarios: ["daily", "date"],
  },
};

export const ALL_SEED_PROFILE_IDS = Object.keys(SEED_PROFILES);

interface DemoState {
  demoMode: boolean;
  activeProfile: string;
  customProfile: DemoProfile | null;
  preloadedSeedIds: string[];
  toggleDemoMode: () => void;
  enableDemoMode: () => void;
  disableDemoMode: () => void;
  setActiveProfile: (name: string) => void;
  setCustomProfile: (profile: DemoProfile) => void;
  resetProfile: () => void;
  getCurrentProfile: () => DemoProfile;
  preloadSeedProfiles: () => void;
  clearPreloadedData: () => void;
}

export const useDemoStore = create<DemoState>()(
  persist(
    (set, get) => ({
      demoMode: false,
      activeProfile: "default",
      customProfile: null,
      preloadedSeedIds: [],
      toggleDemoMode: () =>
        set((s) => {
          if (s.demoMode) {
            return { demoMode: false, preloadedSeedIds: [] };
          }
          return { demoMode: true, preloadedSeedIds: ALL_SEED_PROFILE_IDS };
        }),
      enableDemoMode: () => set({ demoMode: true, preloadedSeedIds: ALL_SEED_PROFILE_IDS }),
      disableDemoMode: () => set({ demoMode: false, preloadedSeedIds: [] }),
      setActiveProfile: (name) => set({ activeProfile: name }),
      setCustomProfile: (profile) => set({ customProfile: profile, activeProfile: "custom" }),
      resetProfile: () => set({ activeProfile: "default", customProfile: null }),
      getCurrentProfile: () => {
        const { activeProfile, customProfile } = get();
        if (activeProfile === "custom" && customProfile) return customProfile;
        if (activeProfile.startsWith("seed_v2_")) {
          const seedProfile = SEED_PROFILES[activeProfile];
          if (seedProfile)
            return {
              bodyType: seedProfile.bodyType,
              styleExpression: seedProfile.styleExpression,
              primaryScenarios: seedProfile.primaryScenarios,
            };
        }
        return PRESET_PROFILES[activeProfile] || PRESET_PROFILES.default;
      },
      preloadSeedProfiles: () => set({ preloadedSeedIds: ALL_SEED_PROFILE_IDS }),
      clearPreloadedData: () => set({ preloadedSeedIds: [] }),
    }),
    {
      name: "demo-store",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
