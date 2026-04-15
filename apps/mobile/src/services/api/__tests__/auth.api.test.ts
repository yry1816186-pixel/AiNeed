import apiClient from "../client";
import { authApi, userApi } from "../auth.api";

// ---- Mocks ----
jest.mock("../client", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    upload: jest.fn(),
    setToken: jest.fn(),
    setRefreshToken: jest.fn(),
    clearAuth: jest.fn(),
  },
}));

const mockGet = apiClient.get as jest.Mock;
const mockPost = apiClient.post as jest.Mock;
const mockPut = apiClient.put as jest.Mock;
const mockUpload = apiClient.upload as jest.Mock;
const mockSetToken = apiClient.setToken as jest.Mock;
const mockSetRefreshToken = apiClient.setRefreshToken as jest.Mock;
const mockClearAuth = apiClient.clearAuth as jest.Mock;

// ---- Tests ----
describe("authApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetToken.mockResolvedValue(undefined);
    mockSetRefreshToken.mockResolvedValue(undefined);
    mockClearAuth.mockResolvedValue(undefined);
  });

  // ==================== login ====================

  describe("login", () => {
    it("should POST to /auth/login with credentials", async () => {
      const credentials = { email: "test@example.com", password: "Test123456!" };
      const authPayload = {
        user: { id: "u1", email: "test@example.com" },
        token: "access-token-123",
        refreshToken: "refresh-token-456",
      };
      mockPost.mockResolvedValue({ success: true, data: authPayload });

      const result = await authApi.login(credentials);

      expect(mockPost).toHaveBeenCalledWith("/auth/login", credentials);
      expect(result.success).toBe(true);
      expect(result.data?.token).toBe("access-token-123");
    });

    it("should set token and refresh token on successful login", async () => {
      const credentials = { email: "test@example.com", password: "Test123456!" };
      const authPayload = {
        user: { id: "u1" },
        token: "access-token-123",
        refreshToken: "refresh-token-456",
      };
      mockPost.mockResolvedValue({ success: true, data: authPayload });

      await authApi.login(credentials);

      expect(mockSetToken).toHaveBeenCalledWith("access-token-123");
      expect(mockSetRefreshToken).toHaveBeenCalledWith("refresh-token-456");
    });

    it("should not set tokens when login fails", async () => {
      const credentials = { email: "test@example.com", password: "wrong" };
      mockPost.mockResolvedValue({
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials" },
      });

      const result = await authApi.login(credentials);

      expect(mockSetToken).not.toHaveBeenCalled();
      expect(mockSetRefreshToken).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
    });

    it("should not set tokens when response has no token field", async () => {
      const credentials = { email: "test@example.com", password: "Test123456!" };
      mockPost.mockResolvedValue({
        success: true,
        data: { user: { id: "u1" }, token: undefined },
      });

      await authApi.login(credentials);

      expect(mockSetToken).not.toHaveBeenCalled();
    });
  });

  // ==================== register ====================

  describe("register", () => {
    it("should POST to /auth/register with registration data", async () => {
      const registerData = {
        email: "new@example.com",
        password: "NewPass123!",
        nickname: "NewUser",
      };
      const authPayload = {
        user: { id: "u2", email: "new@example.com" },
        token: "new-access-token",
        refreshToken: "new-refresh-token",
      };
      mockPost.mockResolvedValue({ success: true, data: authPayload });

      const result = await authApi.register(registerData);

      expect(mockPost).toHaveBeenCalledWith("/auth/register", registerData);
      expect(result.success).toBe(true);
    });

    it("should set tokens on successful registration", async () => {
      const registerData = {
        email: "new@example.com",
        password: "NewPass123!",
      };
      const authPayload = {
        user: { id: "u2" },
        token: "new-access-token",
        refreshToken: "new-refresh-token",
      };
      mockPost.mockResolvedValue({ success: true, data: authPayload });

      await authApi.register(registerData);

      expect(mockSetToken).toHaveBeenCalledWith("new-access-token");
      expect(mockSetRefreshToken).toHaveBeenCalledWith("new-refresh-token");
    });

    it("should not set tokens on failed registration", async () => {
      mockPost.mockResolvedValue({
        success: false,
        error: { code: "EMAIL_EXISTS", message: "Email already exists" },
      });

      const result = await authApi.register({
        email: "existing@example.com",
        password: "Pass123!",
      });

      expect(mockSetToken).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
    });
  });

  // ==================== logout ====================

  describe("logout", () => {
    it("should call clearAuth", async () => {
      await authApi.logout();
      expect(mockClearAuth).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== getMe ====================

  describe("getMe", () => {
    it("should GET /auth/me", async () => {
      const userData = { id: "u1", email: "test@example.com" };
      mockGet.mockResolvedValue({ success: true, data: userData });

      const result = await authApi.getMe();

      expect(mockGet).toHaveBeenCalledWith("/auth/me");
      expect(result.success).toBe(true);
      expect(result.data).toEqual(userData);
    });
  });

  // ==================== updateProfile ====================

  describe("updateProfile", () => {
    it("should PUT to /profile with data", async () => {
      const updateData = { nickname: "UpdatedName" };
      mockPut.mockResolvedValue({ success: true, data: { id: "u1", nickname: "UpdatedName" } });

      const result = await authApi.updateProfile(updateData);

      expect(mockPut).toHaveBeenCalledWith("/profile", updateData);
      expect(result.success).toBe(true);
    });
  });

  // ==================== updatePreferences ====================

  describe("updatePreferences", () => {
    it("should PUT to /profile/preferences with preferences", async () => {
      const preferences = { preferredStyles: ["casual"] };
      mockPut.mockResolvedValue({ success: true, data: preferences });

      const result = await authApi.updatePreferences(preferences);

      expect(mockPut).toHaveBeenCalledWith("/profile/preferences", preferences);
      expect(result.success).toBe(true);
    });
  });

  // ==================== changePassword ====================

  describe("changePassword", () => {
    it("should PUT to /users/me/password with old and new passwords", async () => {
      mockPut.mockResolvedValue({ success: true, data: undefined });

      const result = await authApi.changePassword("oldPass", "newPass");

      expect(mockPut).toHaveBeenCalledWith("/users/me/password", {
        oldPassword: "oldPass",
        newPassword: "newPass",
      });
      expect(result.success).toBe(true);
    });
  });

  // ==================== forgotPassword ====================

  describe("forgotPassword", () => {
    it("should POST to /auth/forgot-password with email", async () => {
      mockPost.mockResolvedValue({ success: true, data: undefined });

      const result = await authApi.forgotPassword("test@example.com");

      expect(mockPost).toHaveBeenCalledWith("/auth/forgot-password", {
        email: "test@example.com",
      });
      expect(result.success).toBe(true);
    });
  });

  // ==================== resetPassword ====================

  describe("resetPassword", () => {
    it("should POST to /auth/reset-password with token and new password", async () => {
      mockPost.mockResolvedValue({ success: true, data: undefined });

      const result = await authApi.resetPassword("reset-token-abc", "NewPass123!");

      expect(mockPost).toHaveBeenCalledWith("/auth/reset-password", {
        token: "reset-token-abc",
        newPassword: "NewPass123!",
      });
      expect(result.success).toBe(true);
    });
  });

  // ==================== refreshToken ====================

  describe("refreshToken", () => {
    it("should POST to /auth/refresh", async () => {
      const tokens = {
        accessToken: "new-access",
        refreshToken: "new-refresh",
      };
      mockPost.mockResolvedValue({ success: true, data: tokens });

      const result = await authApi.refreshToken();

      expect(mockPost).toHaveBeenCalledWith("/auth/refresh");
      expect(result.success).toBe(true);
    });
  });

  // ==================== deleteAccount ====================

  describe("deleteAccount", () => {
    it("should PUT to /users/me/deactivate and clear auth", async () => {
      mockPut.mockResolvedValue({ success: true, data: undefined });

      const result = await authApi.deleteAccount();

      expect(mockPut).toHaveBeenCalledWith("/users/me/deactivate");
      expect(mockClearAuth).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it("should still clear auth even if deactivation fails", async () => {
      mockPut.mockResolvedValue({
        success: false,
        error: { code: "SERVER_ERROR", message: "Server error" },
      });

      const result = await authApi.deleteAccount();

      expect(mockClearAuth).toHaveBeenCalled();
      expect(result.success).toBe(false);
    });
  });
});

describe("userApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== getStats ====================

  describe("getStats", () => {
    it("should GET /users/me/stats", async () => {
      const stats = { totalOutfits: 10, totalWearCount: 50 };
      mockGet.mockResolvedValue({ success: true, data: stats });

      const result = await userApi.getStats();

      expect(mockGet).toHaveBeenCalledWith("/users/me/stats");
      expect(result.success).toBe(true);
      expect(result.data).toEqual(stats);
    });
  });

  // ==================== analyzeBody ====================

  describe("analyzeBody", () => {
    it("should upload image to /profile/body-analysis/upload", async () => {
      const analysisResult = { bodyType: "hourglass", confidence: 0.9 };
      mockUpload.mockResolvedValue({ success: true, data: analysisResult });

      const result = await userApi.analyzeBody("file:///path/to/body.jpg");

      expect(mockUpload).toHaveBeenCalledWith(
        "/profile/body-analysis/upload",
        expect.any(FormData)
      );
      expect(result.success).toBe(true);
    });

    it("should extract file extension for content type", async () => {
      mockUpload.mockResolvedValue({ success: true, data: {} });

      await userApi.analyzeBody("file:///photos/body.png");

      const formData = mockUpload.mock.calls[0][1] as FormData;
      expect(formData).toBeDefined();
    });
  });

  // ==================== analyzeColor ====================

  describe("analyzeColor", () => {
    it("should upload image to /profile/color-analysis/upload", async () => {
      const colorResult = { colorSeason: "autumn", bestColors: ["brown"] };
      mockUpload.mockResolvedValue({ success: true, data: colorResult });

      const result = await userApi.analyzeColor("file:///path/to/face.jpg");

      expect(mockUpload).toHaveBeenCalledWith(
        "/profile/color-analysis/upload",
        expect.any(FormData)
      );
      expect(result.success).toBe(true);
    });
  });

  // ==================== uploadAvatar ====================

  describe("uploadAvatar", () => {
    it("should upload avatar to /users/me/avatar/upload", async () => {
      const avatarResult = { avatar: "http://cdn.example.com/avatar.jpg" };
      mockUpload.mockResolvedValue({ success: true, data: avatarResult });

      const result = await userApi.uploadAvatar("file:///path/to/avatar.jpg");

      expect(mockUpload).toHaveBeenCalledWith("/users/me/avatar/upload", expect.any(FormData));
      expect(result.success).toBe(true);
      expect(result.data?.avatar).toBe("http://cdn.example.com/avatar.jpg");
    });
  });
});
