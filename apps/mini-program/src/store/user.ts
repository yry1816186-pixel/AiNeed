import { create } from "zustand";

interface UserInfo {
  id: string;
  nickname: string;
  avatar: string | null;
}

interface UserState {
  token: string | null;
  user: UserInfo | null;
  setAuth: (token: string, user: UserInfo) => void;
  clearAuth: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  token: null,
  user: null,
  setAuth: (token, user) => set({ token, user }),
  clearAuth: () => set({ token: null, user: null }),
}));
