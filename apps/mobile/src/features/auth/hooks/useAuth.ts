import { useCallback } from "react";
import { useAuthStore } from "../stores/auth.store";
import type { LoginCredentials, RegisterData } from "../types/user";
import type { AppError } from '../../services/api/error';

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isRefreshing = useAuthStore((s) => s.isRefreshing);
  const error = useAuthStore((s) => s.error);

  const login = useAuthStore((s) => s.login);
  const loginWithPhone = useAuthStore((s) => s.loginWithPhone);
  const loginWithWechat = useAuthStore((s) => s.loginWithWechat);
  const register = useAuthStore((s) => s.register);
  const logout = useAuthStore((s) => s.logout);
  const refreshAuth = useAuthStore((s) => s.refreshAuth);
  const setUser = useAuthStore((s) => s.setUser);
  const clearError = useAuthStore((s) => s.clearError);

  const handleLogin = useCallback(
    async (credentials: LoginCredentials) => {
      try {
        await login(credentials);
      } catch (err) {
        throw err as AppError;
      }
    },
    [login]
  );

  const handleRegister = useCallback(
    async (data: RegisterData) => {
      try {
        await register(data);
      } catch (err) {
        throw err as AppError;
      }
    },
    [register]
  );

  const handleLogout = useCallback(async () => {
    await logout();
  }, [logout]);

  const handleRefresh = useCallback(async () => {
    try {
      await refreshAuth();
    } catch (err) {
      throw err as AppError;
    }
  }, [refreshAuth]);

  return {
    user,
    isAuthenticated,
    isLoading,
    isRefreshing,
    error,
    login: handleLogin,
    loginWithPhone,
    loginWithWechat,
    register: handleRegister,
    logout: handleLogout,
    refreshAuth: handleRefresh,
    setUser,
    clearError,
  };
}
