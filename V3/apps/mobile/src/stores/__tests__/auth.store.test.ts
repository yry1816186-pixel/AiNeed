import { useAuthStore } from '../auth.store';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(),
}));

jest.mock('../../services/api', () => ({
  api: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

import { api } from '../../services/api';

const mockApiPost = api.post as jest.MockedFunction<typeof api.post>;
const mockApiGet = api.get as jest.MockedFunction<typeof api.get>;

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
    jest.clearAllMocks();
  });

  describe('setTokens', () => {
    it('should set access and refresh tokens', () => {
      const store = useAuthStore.getState();
      store.setTokens('access-123', 'refresh-456');

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('access-123');
      expect(state.refreshToken).toBe('refresh-456');
    });

    it('should set isAuthenticated to true when tokens are set', () => {
      const store = useAuthStore.getState();
      store.setTokens('access-123', 'refresh-456');

      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });
  });

  describe('setUser', () => {
    it('should set user data', () => {
      const mockUser = {
        id: 'user-1',
        nickname: 'TestUser',
        phone: '13800138000',
      };

      useAuthStore.getState().setUser(mockUser);

      expect(useAuthStore.getState().user).toEqual(mockUser);
    });

    it('should update user data when called again', () => {
      const firstUser = { id: 'user-1', nickname: 'First' };
      const secondUser = { id: 'user-2', nickname: 'Second' };

      useAuthStore.getState().setUser(firstUser);
      expect(useAuthStore.getState().user?.nickname).toBe('First');

      useAuthStore.getState().setUser(secondUser);
      expect(useAuthStore.getState().user?.nickname).toBe('Second');
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            accessToken: 'at-123',
            refreshToken: 'rt-456',
            user: { id: 'user-1', nickname: 'TestUser' },
          },
        },
      };
      mockApiPost.mockResolvedValue(mockResponse);

      await useAuthStore.getState().login('13800138000', '123456');

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('at-123');
      expect(state.refreshToken).toBe('rt-456');
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.user?.nickname).toBe('TestUser');
    });

    it('should throw error when API returns failure', async () => {
      mockApiPost.mockResolvedValue({
        data: { success: false, error: { code: 'INVALID_CODE', message: '验证码错误' } },
      });

      await expect(
        useAuthStore.getState().login('13800138000', 'wrong'),
      ).rejects.toThrow('登录失败，请重试');

      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should throw error when API request fails', async () => {
      mockApiPost.mockRejectedValue(new Error('Network error'));

      await expect(
        useAuthStore.getState().login('13800138000', '123456'),
      ).rejects.toThrow('登录失败，请重试');

      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should set isLoading to true during login', async () => {
      let resolveLogin: (value: unknown) => void;
      const loginPromise = new Promise((resolve) => { resolveLogin = resolve; });
      mockApiPost.mockReturnValue(loginPromise);

      const loginCall = useAuthStore.getState().login('13800138000', '123456');

      expect(useAuthStore.getState().isLoading).toBe(true);

      resolveLogin!({
        data: {
          success: true,
          data: {
            accessToken: 'at',
            refreshToken: 'rt',
            user: { id: '1' },
          },
        },
      });

      await loginCall;
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('sendCode', () => {
    it('should call API to send verification code', async () => {
      mockApiPost.mockResolvedValue({ data: { success: true } });

      await useAuthStore.getState().sendCode('13800138000');

      expect(mockApiPost).toHaveBeenCalledWith('/auth/send-code', {
        phone: '13800138000',
      });
    });
  });

  describe('logout', () => {
    it('should clear all auth state', () => {
      useAuthStore.setState({
        accessToken: 'at-123',
        refreshToken: 'rt-456',
        user: { id: 'user-1', nickname: 'TestUser' },
        isAuthenticated: true,
        isLoading: true,
      });

      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('refreshUser', () => {
    it('should update user data on successful refresh', async () => {
      useAuthStore.setState({ accessToken: 'at-123' });

      const updatedUser = { id: 'user-1', nickname: 'UpdatedName' };
      mockApiGet.mockResolvedValue({
        data: { success: true, data: updatedUser },
      });

      await useAuthStore.getState().refreshUser();

      expect(useAuthStore.getState().user).toEqual(updatedUser);
    });

    it('should not call API when no access token', async () => {
      useAuthStore.setState({ accessToken: null });

      await useAuthStore.getState().refreshUser();

      expect(mockApiGet).not.toHaveBeenCalled();
    });

    it('should silently fail on API error', async () => {
      useAuthStore.setState({ accessToken: 'at-123' });
      mockApiGet.mockRejectedValue(new Error('Network error'));

      await expect(
        useAuthStore.getState().refreshUser(),
      ).resolves.toBeUndefined();
    });
  });
});
