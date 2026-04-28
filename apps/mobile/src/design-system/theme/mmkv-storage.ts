import { MMKV } from "react-native-mmkv";
import type { StateStorage } from "zustand/middleware";

const themeStorage = new MMKV({ id: "theme-storage" });

export const mmkvStorage: StateStorage = {
  getItem: (name: string): string | null => {
    return themeStorage.getString(name) ?? null;
  },
  setItem: (name: string, value: string): void => {
    themeStorage.set(name, value);
  },
  removeItem: (name: string): void => {
    themeStorage.delete(name);
  },
};
