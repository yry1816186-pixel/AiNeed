import { useAuthStore } from '../stores/auth.store';
import type { AuthState } from '../stores/auth.store';
import { authService } from '../services/auth.service';
import { useRouter } from 'expo-router';

export function useAuth() {
  const router = useRouter();
  const store = useAuthStore();

  const handleSendCode = async (phone: string) => {
    await authService.sendCode(phone);
  };

  const handleVerifyCode = async (phone: string, code: string) => {
    const result = await authService.verifyCode(phone, code);
    store.setTokens(result.accessToken, result.refreshToken);
    store.setUser(result.user);
  };

  const handleRefreshToken = async () => {
    const refreshToken = store.refreshToken;
    if (!refreshToken) return;
    const result = await authService.refreshToken(refreshToken);
    store.setTokens(result.accessToken, result.refreshToken);
  };

  const handleLogout = async () => {
    await authService.logout();
    store.logout();
    router.replace('/(auth)/login');
  };

  return {
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    sendCode: handleSendCode,
    verifyCode: handleVerifyCode,
    refreshToken: handleRefreshToken,
    logout: handleLogout,
    refreshUser: store.refreshUser,
  };
}
