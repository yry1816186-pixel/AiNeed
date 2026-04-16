import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";

import { WechatService } from "../services/wechat.service";

import { WechatAuthStrategy } from "./wechat.strategy";

describe("WechatAuthStrategy", () => {
  let strategy: WechatAuthStrategy;
  let wechatService: WechatService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        WECHAT_APP_ID: "test-app-id",
        WECHAT_APP_SECRET: "test-app-secret",
      };
      return config[key] ?? defaultValue;
    }),
  };

  const mockWechatService = {
    getAccessToken: jest.fn(),
    getUserInfo: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WechatAuthStrategy,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: WechatService, useValue: mockWechatService },
      ],
    }).compile();

    strategy = module.get<WechatAuthStrategy>(WechatAuthStrategy);
    wechatService = module.get<WechatService>(WechatService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(strategy).toBeDefined();
  });

  describe("exchangeCodeForToken", () => {
    it("should return token response on success", async () => {
      const mockResponse = {
        access_token: "test-access-token",
        openid: "test-openid",
        unionid: "test-unionid",
      };

      global.fetch = jest.fn().mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      const result = await strategy.exchangeCodeForToken("valid-code");

      expect(result.accessToken).toBe("test-access-token");
      expect(result.openid).toBe("test-openid");
      expect(result.unionid).toBe("test-unionid");
    });

    it("should throw UnauthorizedException on WeChat error", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: () => Promise.resolve({ errcode: 40029, errmsg: "invalid code" }),
      });

      await expect(strategy.exchangeCodeForToken("invalid-code")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw when config is incomplete", async () => {
      const emptyConfig = {
        get: jest.fn((key: string, defaultValue?: string) => defaultValue ?? ""),
      };
      const emptyStrategy = new WechatAuthStrategy(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        wechatService as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        emptyConfig as any,
      );

      await expect(emptyStrategy.exchangeCodeForToken("test-code")).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe("getUserInfo", () => {
    it("should delegate to WechatService.getUserInfo", async () => {
      const mockUserInfo = {
        openid: "test-openid",
        nickname: "Test User",
        headimgurl: "https://example.com/avatar.jpg",
        sex: 1,
        province: "Beijing",
        city: "Beijing",
        country: "China",
      };

      mockWechatService.getUserInfo.mockResolvedValue(mockUserInfo);

      const result = await strategy.getUserInfo("valid-token", "test-openid");

      expect(result).toEqual(mockUserInfo);
      expect(wechatService.getUserInfo).toHaveBeenCalledWith("valid-token", "test-openid");
    });
  });

  describe("validate", () => {
    it("should exchange code and return user info", async () => {
      mockWechatService.getAccessToken.mockResolvedValue({
        access_token: "test-token",
        openid: "test-openid",
      });
      mockWechatService.getUserInfo.mockResolvedValue({
        openid: "test-openid",
        nickname: "Test User",
      });

      const result = await strategy.validate("valid-code");

      expect(result.nickname).toBe("Test User");
      expect(wechatService.getAccessToken).toHaveBeenCalledWith("valid-code");
      expect(wechatService.getUserInfo).toHaveBeenCalledWith("test-token", "test-openid");
    });
  });
});
