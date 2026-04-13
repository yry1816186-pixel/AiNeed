import { create } from 'zustand';
import { post } from '@/services/request';

interface AdminUser {
  id: string;
  email: string;
  nickname: string;
  role: string;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: AdminUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAuthToken: () => Promise<void>;
  checkAuth: () => void;
}

const ADMIN_EMAIL_WHITELIST: string[] = [];

function isAdmin(user: AdminUser | null): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (ADMIN_EMAIL_WHITELIST.includes(user.email)) return true;
  return false;
}

function persistAuth(token: string, refreshToken: string, user: AdminUser) {
  localStorage.setItem('accessToken', token);
  localStorage.setItem('refreshToken', refreshToken);
  localStorage.setItem('adminUser', JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('adminUser');
}

function loadAuthFromStorage(): Pick<AuthState, 'token' | 'refreshToken' | 'user' | 'isAuthenticated'> {
  const token = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  const userStr = localStorage.getItem('adminUser');

  if (token && userStr) {
    try {
      const user = JSON.parse(userStr) as AdminUser;
      return {
        token,
        refreshToken,
        user,
        isAuthenticated: isAdmin(user),
      };
    } catch {
      clearAuth();
    }
  }

  return { token: null, refreshToken: null, user: null, isAuthenticated: false };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  ...loadAuthFromStorage(),

  login: async (email: string, password: string) => {
    interface LoginResponse {
      accessToken: string;
      refreshToken: string;
      user: AdminUser;
    }

    const result = await post<LoginResponse>('/auth/login', { email, password });

    const { accessToken, refreshToken, user } = result;

    if (!isAdmin(user)) {
      throw new Error('无管理员权限');
    }

    persistAuth(accessToken, refreshToken, user);

    set({
      token: accessToken,
      refreshToken,
      user,
      isAuthenticated: true,
    });
  },

  logout: () => {
    clearAuth();
    set({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
    });
  },

  refreshAuthToken: async () => {
    const { refreshToken } = get();
    if (!refreshToken) {
      get().logout();
      return;
    }

    try {
      interface RefreshResponse {
        accessToken: string;
        refreshToken: string;
      }

      const result = await post<RefreshResponse>('/auth/refresh', { refreshToken });

      const currentToken = get().token;
      if (currentToken) {
        localStorage.setItem('accessToken', result.accessToken);
      }
      localStorage.setItem('refreshToken', result.refreshToken);

      set({
        token: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch {
      get().logout();
    }
  },

  checkAuth: () => {
    const token = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('adminUser');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as AdminUser;
        if (isAdmin(user)) {
          set({
            token,
            refreshToken: localStorage.getItem('refreshToken'),
            user,
            isAuthenticated: true,
          });
          return;
        }
      } catch {
        // fall through to logout
      }
    }

    get().logout();
  },
}));
