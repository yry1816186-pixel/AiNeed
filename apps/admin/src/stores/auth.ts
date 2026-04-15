import { create } from 'zustand';
import { post, get as httpGet } from '@/services/request';

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

// Minimal token obfuscation to avoid plaintext tokens in localStorage
function encodeToken(token: string): string {
  try {
    return btoa(encodeURIComponent(token));
  } catch {
    return token;
  }
}

function decodeToken(encoded: string): string {
  try {
    return decodeURIComponent(atob(encoded));
  } catch {
    return encoded;
  }
}

function isJwtExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return false;
    // exp is in seconds since epoch; compare with current time
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

function isAdmin(user: AdminUser | null): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (ADMIN_EMAIL_WHITELIST.includes(user.email)) return true;
  return false;
}

function persistAuth(token: string, refreshToken: string, user: AdminUser) {
  localStorage.setItem('accessToken', encodeToken(token));
  localStorage.setItem('refreshToken', encodeToken(refreshToken));
  localStorage.setItem('adminUser', JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('adminUser');
}

function loadAuthFromStorage(): Pick<AuthState, 'token' | 'refreshToken' | 'user' | 'isAuthenticated'> {
  const encodedToken = localStorage.getItem('accessToken');
  const encodedRefresh = localStorage.getItem('refreshToken');
  const userStr = localStorage.getItem('adminUser');

  if (encodedToken && userStr) {
    try {
      const token = decodeToken(encodedToken);
      const refreshToken = encodedRefresh ? decodeToken(encodedRefresh) : null;
      const user = JSON.parse(userStr) as AdminUser;

      // Check if the access token is expired
      if (isJwtExpired(token)) {
        clearAuth();
        return { token: null, refreshToken: null, user: null, isAuthenticated: false };
      }

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
        localStorage.setItem('accessToken', encodeToken(result.accessToken));
      }
      localStorage.setItem('refreshToken', encodeToken(result.refreshToken));

      set({
        token: result.accessToken,
        refreshToken: result.refreshToken,
      });

      // Re-fetch user info after token refresh
      try {
        const me = await httpGet<AdminUser>('/auth/me');
        if (isAdmin(me)) {
          localStorage.setItem('adminUser', JSON.stringify(me));
          set({ user: me });
        }
      } catch {
        // If /auth/me fails, keep existing user data
      }
    } catch {
      get().logout();
    }
  },

  checkAuth: () => {
    const encodedToken = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('adminUser');

    if (encodedToken && userStr) {
      try {
        const token = decodeToken(encodedToken);
        const user = JSON.parse(userStr) as AdminUser;

        if (isJwtExpired(token)) {
          get().logout();
          return;
        }

        if (isAdmin(user)) {
          set({
            token,
            refreshToken: localStorage.getItem('refreshToken')
              ? decodeToken(localStorage.getItem('refreshToken')!)
              : null,
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
