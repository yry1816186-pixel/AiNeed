import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Appearance } from "react-native";
import { mmkvStorage } from "./mmkv-storage";
import { resolveColors } from "./color-resolver";
import type { ThemeMode, ResolvedMode, ThemeColors } from "./types";

interface ThemeStore {
  mode: ThemeMode;
  resolvedMode: ResolvedMode;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
}

function getSystemMode(): ResolvedMode {
  return Appearance.getColorScheme() === "dark" ? "dark" : "light";
}

function resolveMode(mode: ThemeMode): ResolvedMode {
  return mode === "system" ? getSystemMode() : mode;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      mode: "system" as ThemeMode,
      resolvedMode: getSystemMode(),
      colors: resolveColors(getSystemMode()),
      setMode: (mode: ThemeMode) => {
        const resolved = resolveMode(mode);
        set({ mode, resolvedMode: resolved, colors: resolveColors(resolved) });
      },
    }),
    {
      name: "xuno-theme",
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({ mode: state.mode } as Partial<ThemeStore>),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const resolved = resolveMode(state.mode);
          state.resolvedMode = resolved;
          state.colors = resolveColors(resolved);
        }
      },
    }
  )
);

let appearanceSubscription: { remove: () => void } | null = null;

export function startAppearanceListener() {
  appearanceSubscription = Appearance.addChangeListener(({ colorScheme }) => {
    const state = useThemeStore.getState();
    if (state.mode === "system") {
      const resolved = colorScheme === "dark" ? "dark" : "light";
      useThemeStore.setState({ resolvedMode: resolved, colors: resolveColors(resolved) });
    }
  });
}

export function stopAppearanceListener() {
  appearanceSubscription?.remove();
  appearanceSubscription = null;
}
