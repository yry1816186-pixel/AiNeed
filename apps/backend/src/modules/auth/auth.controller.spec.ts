import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

describe("AuthController", () => {
  let controller: AuthController;
  let authService: Record<string, jest.Mock>;

  const mockAuthResponse = {
    user: { id: "user-1", email: "test@example.com", nickname: "Test", createdAt: new Date() },
    accessToken: "access-token",
    refreshToken: "refresh-token",
  };

  beforeEach(async () => {
    authService = {
      register: jest.fn().mockResolvedValue(mockAuthResponse),
      login: jest.fn().mockResolvedValue(mockAuthResponse),
      refreshToken: jest.fn().mockResolvedValue({ accessToken: "new-access", refreshToken: "new-refresh" }),
      logout: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
      resetPassword: jest.fn().mockResolvedValue(undefined),
      loginWithWechat: jest.fn().mockResolvedValue(mockAuthResponse),
      loginWithPhone: jest.fn().mockResolvedValue(mockAuthResponse),
      registerWithPhone: jest.fn().mockResolvedValue(mockAuthResponse),
      sendSmsCode: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("register", () => {
    it("should call authService.register and return result", async () => {
      const dto = { email: "test@example.com", password: "Test1234", nickname: "Test" };
      const result = await controller.register(dto);
      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe("login", () => {
    it("should call authService.login and return result", async () => {
      const dto = { email: "test@example.com", password: "Test1234" };
      const result = await controller.login(dto);
      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe("refreshToken", () => {
    it("should call authService.refreshToken", async () => {
      const result = await controller.refreshToken({ refreshToken: "rt-token" });
      expect(authService.refreshToken).toHaveBeenCalledWith("rt-token");
      expect(result).toHaveProperty("accessToken");
    });
  });

  describe("logout", () => {
    it("should call authService.logout with user id and tokens", async () => {
      const req = { user: { id: "user-1", email: "test@example.com" }, headers: { authorization: "Bearer access-token" } };
      const result = await controller.logout(req as never, { refreshToken: "rt-token" });
      expect(authService.logout).toHaveBeenCalledWith("user-1", "rt-token", "access-token");
      expect(result).toEqual({ success: true });
    });
  });

  describe("getCurrentUser", () => {
    it("should return current user from request", async () => {
      const req = { user: { id: "user-1", email: "test@example.com" } };
      const result = await controller.getCurrentUser(req as never);
      expect(result).toEqual(req.user);
    });
  });

  describe("forgotPassword", () => {
    it("should call sendPasswordResetEmail", async () => {
      const result = await controller.forgotPassword({ email: "test@example.com" });
      expect(authService.sendPasswordResetEmail).toHaveBeenCalledWith("test@example.com");
      expect(result.success).toBe(true);
    });
  });

  describe("resetPassword", () => {
    it("should call authService.resetPassword", async () => {
      const result = await controller.resetPassword({ token: "reset-token", newPassword: "NewPass123" });
      expect(authService.resetPassword).toHaveBeenCalledWith("reset-token", "NewPass123");
      expect(result.success).toBe(true);
    });
  });

  describe("sendSmsCode", () => {
    it("should call authService.sendSmsCode", async () => {
      const result = await controller.sendSmsCode({ phone: "13800138000" });
      expect(authService.sendSmsCode).toHaveBeenCalledWith("13800138000");
      expect(result.success).toBe(true);
    });
  });

  describe("loginWithPhone", () => {
    it("should call authService.loginWithPhone", async () => {
      const result = await controller.loginWithPhone({ phone: "13800138000", code: "123456" });
      expect(authService.loginWithPhone).toHaveBeenCalledWith("13800138000", "123456");
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe("phoneRegister", () => {
    it("should call authService.registerWithPhone", async () => {
      const dto = { phone: "13800138000", code: "123456", gender: "male" as const };
      const result = await controller.phoneRegister(dto);
      expect(authService.registerWithPhone).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe("wechatLogin", () => {
    it("should call authService.loginWithWechat", async () => {
      const result = await controller.wechatLogin({ code: "wx-code" });
      expect(authService.loginWithWechat).toHaveBeenCalledWith("wx-code");
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe("sendCode", () => {
    it("should call authService.sendSmsCode", async () => {
      const result = await controller.sendCode({ phone: "13800138000" });
      expect(authService.sendSmsCode).toHaveBeenCalledWith("13800138000");
      expect(result.success).toBe(true);
    });
  });
});
