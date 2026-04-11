import { useAuthStore } from '../stores/auth.store';
import { useRouter } from 'expo-router';

export function useAuth() {
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    isLoading,
    login,
    sendCode,
    logout,
    refreshUser,
  } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    sendCode,
    logout: handleLogout,
    refreshUser,
  };
}
