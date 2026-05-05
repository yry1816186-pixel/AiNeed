import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Appearance } from "react-native";
import { mmkvStorage } from "./mmkv-storage";
import { semanticTokens } from "./tokens/generated/semantic-tokens";
import { componentTokens } from "./tokens/generated/component-tokens";

export type ThemeMode = "light" | "dark";
export type ResolvedMode = ThemeMode;

interface ThemeStore {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  isDark: boolean;
}

const getSystemMode = (): ThemeMode => {
  const scheme = Appearance.getColorScheme();
  return scheme === "dark" ? "dark" : "light";
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      mode: getSystemMode(),
      setMode: (mode: ThemeMode) => set({ mode, isDark: mode === "dark" }),
      toggleMode: () => {
        const next = get().mode === "light" ? "dark" : "light";
        set({ mode: next, isDark: next === "dark" });
      },
      get isDark() {
        return get().mode === "dark";
      },
    }),
    {
      name: "xuno-theme-v2",
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);

let appearanceSubscription: { remove: () => void } | null = null;

export function startAppearanceListener() {
  if (appearanceSubscription) {
    return appearanceSubscription;
  }

  appearanceSubscription = Appearance.addChangeListener(({ colorScheme }) => {
    const store = useThemeStore.getState();
    if (colorScheme && (colorScheme === "light" || colorScheme === "dark")) {
      store.setMode(colorScheme);
    }
  });
  return appearanceSubscription;
}

export function stopAppearanceListener() {
  appearanceSubscription?.remove();
  appearanceSubscription = null;
}

startAppearanceListener();

type DeepResolve<T> = T extends { light: infer L; dark: infer D }
  ? L
  : T extends object
  ? { [K in keyof T]: DeepResolve<T[K]> }
  : T;

function resolveTokens<T>(obj: T, mode: ThemeMode): DeepResolve<T> {
  if (obj && typeof obj === "object") {
    if ("light" in obj && "dark" in obj) {
      return (mode === "dark" ? (obj as any).dark : (obj as any).light) as any;
    }
    const result: any = Array.isArray(obj) ? [] : {};
    for (const key in obj) {
      result[key] = resolveTokens((obj as any)[key], mode);
    }
    return result;
  }
  return obj as any;
}

export function useTheme() {
  const mode = useThemeStore((s) => s.mode);
  return {
    mode,
    isDark: mode === "dark",
    colors: resolveTokens(semanticTokens.colors, mode),
    motion: semanticTokens.motion,
    radius: semanticTokens.radius,
    shadows: resolveTokens(semanticTokens.shadows, mode),
    spacing: semanticTokens.spacing,
    typography: semanticTokens.typography,
    components: resolveTokens(componentTokens, mode),
  };
}

export type ResolvedTheme = ReturnType<typeof useTheme>;
