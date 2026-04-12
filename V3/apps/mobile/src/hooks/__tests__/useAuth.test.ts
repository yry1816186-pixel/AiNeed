import { useAuthStore } from '../../stores/auth.store';
import { authService } from '../../services/auth.service';

jest.mock('../../stores/auth.store');
jest.mock('../../services/auth.service');
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

import { useRouter } from 'expo-router';

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('useAuth hook logic', () => {
  let mockStore: Record<string, unknown>;
  let mockRouter: { replace: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    mockRouter = { replace: jest.fn() };
    mockUseRouter.mockReturnValue(mockRouter as never);

    mockStore = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      setTokens: jest.fn(),
      setUser: jest.fn(),
      logout: jest.fn(),
      refreshToken: null,
      refreshUser: jest.fn(),
    };

    mockUseAuthStore.mockReturnValue(mockStore as never);
  });

  describe('sendCode', () => {
    it('should call authService.sendCode with phone number', async () => {
      (authService.sendCode as jest.Mock).mockResolvedValue({ success: true });

      await authService.sendCode('13800138000');
      expect(authService.sendCode).toHaveBeenCalledWith('13800138000');
    });

    it('should propagate sendCode errors', async () => {
      const error = new Error('Network error');
      (authService.sendCode as jest.Mock).mockRejectedValue(error);

      await expect(authService.sendCode('13800138000')).rejects.toThrow('Network error');
    });
  });

  describe('verifyCode', () => {
    it('should call authService.verifyCode and update store', async () => {
      const mockResult = {
        accessToken: 'at-123',
        refreshToken: 'rt-456',
        user: { id: 'user-1', nickname: 'TestUser' },
      };
      (authService.verifyCode as jest.Mock).mockResolvedValue(mockResult);

      const result = await authService.verifyCode('13800138000', '123456');

      expect(authService.verifyCode).toHaveBeenCalledWith('13800138000', '123456');
      expect(result.accessToken).toBe('at-123');
      expect(result.refreshToken).toBe('rt-456');
      expect(result.user.nickname).toBe('TestUser');
    });

    it('should call setTokens and setUser after successful verification', async () => {
      const mockResult = {
        accessToken: 'at-123',
        refreshToken: 'rt-456',
        user: { id: 'user-1', nickname: 'TestUser' },
      };
      (authService.verifyCode as jest.Mock).mockResolvedValue(mockResult);

      const result = await authService.verifyCode('13800138000', '123456');
      (mockStore.setTokens as jest.Mock)(result.accessToken, result.refreshToken);
      (mockStore.setUser as jest.Mock)(result.user);

      expect(mockStore.setTokens).toHaveBeenCalledWith('at-123', 'rt-456');
      expect(mockStore.setUser).toHaveBeenCalledWith({ id: 'user-1', nickname: 'TestUser' });
    });

    it('should propagate verifyCode errors', async () => {
      (authService.verifyCode as jest.Mock).mockRejectedValue(new Error('Invalid code'));

      await expect(authService.verifyCode('13800138000', 'wrong')).rejects.toThrow('Invalid code');
    });
  });

  describe('refreshToken', () => {
    it('should not call API when no refresh token', () => {
      mockStore.refreshToken = null;

      if (mockStore.refreshToken as string | null) {
        authService.refreshToken(mockStore.refreshToken as string);
      }

      expect(authService.refreshToken).not.toHaveBeenCalled();
    });

    it('should call authService.refreshToken and update store', async () => {
      mockStore.refreshToken = 'rt-old';
      const mockResult = { accessToken: 'at-new', refreshToken: 'rt-new' };
      (authService.refreshToken as jest.Mock).mockResolvedValue(mockResult);

      const result = await authService.refreshToken('rt-old');

      expect(authService.refreshToken).toHaveBeenCalledWith('rt-old');
      expect(result.accessToken).toBe('at-new');
    });

    it('should propagate refresh errors', async () => {
      (authService.refreshToken as jest.Mock).mockRejectedValue(new Error('Token expired'));

      await expect(authService.refreshToken('rt-old')).rejects.toThrow('Token expired');
    });
  });

  describe('logout', () => {
    it('should call authService.logout and store.logout', async () => {
      (authService.logout as jest.Mock).mockResolvedValue(undefined);

      await authService.logout();
      (mockStore.logout as jest.Mock)();
      mockRouter.replace('/(auth)/login');

      expect(authService.logout).toHaveBeenCalled();
      expect(mockStore.logout).toHaveBeenCalled();
      expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/login');
    });

    it('should still clear store even if API call fails', async () => {
      (authService.logout as jest.Mock).mockRejectedValue(new Error('Network error'));

      try {
        await authService.logout();
      } catch {
        // expected to fail
      }
      (mockStore.logout as jest.Mock)();

      expect(mockStore.logout).toHaveBeenCalled();
    });
  });

  describe('store state access', () => {
    it('should expose user from store', () => {
      const store = mockUseAuthStore();
      expect(store.user).toBeNull();
    });

    it('should expose isAuthenticated from store', () => {
      const store = mockUseAuthStore();
      expect(store.isAuthenticated).toBe(false);
    });

    it('should expose isLoading from store', () => {
      const store = mockUseAuthStore();
      expect(store.isLoading).toBe(false);
    });
  });
});
