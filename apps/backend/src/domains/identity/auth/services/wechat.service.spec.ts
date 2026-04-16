import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";

import { WechatService } from "./wechat.service";

describe("WechatService", () => {
  let service: WechatService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        WECHAT_APP_ID: "test-app-id",
        WECHAT_APP_SECRET: "test-app-secret",
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WechatService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<WechatService>(WechatService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("应该正确定义", () => {
    expect(service).toBeDefined();
  });

  it("配置不完整时应抛出未配置异常", async () => {
    const emptyConfig = {
      get: jest.fn((key: string, defaultValue?: string) => defaultValue ?? ""),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const emptyService = new WechatService(emptyConfig as any);
    await expect(emptyService.getAccessToken("test-code")).rejects.toThrow(UnauthorizedException);
  });

  describe("getAccessToken", () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          WECHAT_APP_ID: "test-app-id",
          WECHAT_APP_SECRET: "test-app-secret",
        };
        return config[key] ?? defaultValue;
      });
    });

    it("微信返回错误时应抛出授权失败异常", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: () => Promise.resolve({ errcode: 40029, errmsg: "invalid code" }),
      });

      await expect(service.getAccessToken("invalid-code")).rejects.toThrow(UnauthorizedException);
    });

    it("微信返回成功时应返回token信息", async () => {
      const mockResponse = {
        access_token: "test-access-token",
        expires_in: 7200,
        refresh_token: "test-refresh-token",
        openid: "test-openid",
        scope: "snsapi_userinfo",
      };

      global.fetch = jest.fn().mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.getAccessToken("valid-code");
      expect(result.openid).toBe("test-openid");
      expect(result.access_token).toBe("test-access-token");
    });
  });

  describe("getUserInfo", () => {
    it("微信返回错误时应抛出异常", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: () => Promise.resolve({ errcode: 40001, errmsg: "invalid token" }),
      });

      await expect(service.getUserInfo("invalid-token", "test-openid")).rejects.toThrow(UnauthorizedException);
    });

    it("微信返回成功时应返回用户信息", async () => {
      const mockUserInfo = {
        openid: "test-openid",
        nickname: "测试用户",
        headimgurl: "https://example.com/avatar.jpg",
        sex: 1,
        province: "北京",
        city: "北京",
        country: "中国",
      };

      global.fetch = jest.fn().mockResolvedValue({
        json: () => Promise.resolve(mockUserInfo),
      });

      const result = await service.getUserInfo("valid-token", "test-openid");
      expect(result.openid).toBe("test-openid");
      expect(result.nickname).toBe("测试用户");
    });
  });
});
