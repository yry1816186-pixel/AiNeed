/* eslint-disable @typescript-eslint/no-explicit-any */
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";

import { WeatherService } from "./weather.service";

describe("WeatherService", () => {
  let service: WeatherService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        OPENWEATHER_API_KEY: "",
        QWEATHER_API_KEY: "",
        QWEATHER_BASE_URL: "https://devapi.qweather.com/v7",
        NODE_ENV: "test",
      };
      return config[key] ?? defaultValue;
    }),
  };

  let originalFetch: typeof globalThis.fetch;

  beforeEach(async () => {
    originalFetch = globalThis.fetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeatherService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<WeatherService>(WeatherService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("应该从 ConfigService 读取 API 密钥和基础 URL 配置", () => {
      expect(configService.get).toHaveBeenCalledWith("OPENWEATHER_API_KEY", "");
      expect(configService.get).toHaveBeenCalledWith("QWEATHER_API_KEY", "");
      expect(configService.get).toHaveBeenCalledWith("QWEATHER_BASE_URL", expect.any(String));
      expect(configService.get).toHaveBeenCalledWith("NODE_ENV");
    });
  });

  describe("getWeatherBasedStyles", () => {
    it("应该在寒冷天气返回保暖和层次搭配风格", () => {
      const result = service.getWeatherBasedStyles(2, "晴");

      expect(result).toContain("保暖");
      expect(result).toContain("层次搭配");
    });

    it("应该在凉爽天气返回轻正式和通勤风格", () => {
      const result = service.getWeatherBasedStyles(12, "多云");

      expect(result).toContain("轻正式");
      expect(result).toContain("通勤");
    });

    it("应该在温暖天气返回日常和休闲风格", () => {
      const result = service.getWeatherBasedStyles(22, "晴");

      expect(result).toContain("日常");
      expect(result).toContain("休闲");
    });

    it("应该在炎热天气返回清爽和透气风格", () => {
      const result = service.getWeatherBasedStyles(32, "晴");

      expect(result).toContain("清爽");
      expect(result).toContain("透气");
    });

    it("应该在雨天额外添加防水风格", () => {
      const result = service.getWeatherBasedStyles(18, "小雨");

      expect(result).toContain("防水");
    });
  });

  describe("getWeatherByLocation", () => {
    it("应该在无 API 密钥时返回 mock 天气数据", async () => {
      const result = await service.getWeatherByLocation(39.9, 116.4);

      expect(result).not.toBeNull();
      expect(result!.temperature).toBe(22);
      expect(result!.condition).toBe("晴");
      expect(result!.location).toBe("北京");
    });

    it("应该在 QWeather 和 OpenWeather 均不可用时回退到 mock", async () => {
      const result = await service.getWeatherByLocation(31.2, 121.5);

      expect(result).not.toBeNull();
      expect(result!.temperature).toBeDefined();
      expect(result!.humidity).toBeDefined();
    });
  });

  describe("getWeatherByCity", () => {
    it("应该在无 OpenWeather API 密钥时返回 mock 天气数据", async () => {
      const result = await service.getWeatherByCity("上海");

      expect(result).not.toBeNull();
      expect(result!.temperature).toBe(22);
      expect(result!.condition).toBe("晴");
      expect(result!.location).toBe("北京");
    });

    it("应该在无 API 密钥时对任意城市名都返回 mock", async () => {
      const result = await service.getWeatherByCity("广州");

      expect(result).not.toBeNull();
      expect(result!.suggestion).toBeDefined();
    });
  });

  describe("getWeatherByLocationQWeather", () => {
    it("应该在无 QWeather API 密钥时返回 null", async () => {
      const result = await service.getWeatherByLocationQWeather(39.9, 116.4);

      expect(result).toBeNull();
    });
  });

  describe("with OpenWeather API key", () => {
    let serviceWithKey: WeatherService;

    beforeEach(async () => {
      const configWithKey = {
        get: jest.fn((key: string, defaultValue?: string) => {
          const config: Record<string, string> = {
            OPENWEATHER_API_KEY: "test-api-key",
            QWEATHER_API_KEY: "",
            QWEATHER_BASE_URL: "https://devapi.qweather.com/v7",
            NODE_ENV: "test",
          };
          return config[key] ?? defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WeatherService,
          { provide: ConfigService, useValue: configWithKey },
        ],
      }).compile();

      serviceWithKey = module.get<WeatherService>(WeatherService);
    });

    it("应该在 OpenWeather API 返回成功时解析天气数据", async () => {
      const mockWeatherResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          main: { temp: 25, humidity: 60 },
          weather: [{ description: "晴朗" }],
          wind: { speed: 3.5 },
          name: "Beijing",
        }),
      };
      globalThis.fetch = jest.fn().mockResolvedValue(mockWeatherResponse);

      const result = await serviceWithKey.getWeatherByLocation(39.9, 116.4);

      expect(result).not.toBeNull();
      expect(result!.temperature).toBe(25);
      expect(result!.condition).toBe("晴朗");
      expect(result!.humidity).toBe(60);
      expect(result!.windSpeed).toBe(3.5);
      expect(result!.location).toBe("Beijing");
    });

    it("应该在 OpenWeather API 请求失败时回退到 mock", async () => {
      const mockFailedResponse = {
        ok: false,
        status: 401,
      };
      globalThis.fetch = jest.fn().mockResolvedValue(mockFailedResponse);

      const result = await serviceWithKey.getWeatherByLocation(39.9, 116.4);

      expect(result).not.toBeNull();
      expect(result!.temperature).toBe(22);
    });

    it("应该通过城市名查询天气并解析数据", async () => {
      const mockWeatherResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          main: { temp: 18, humidity: 45 },
          weather: [{ description: "多云" }],
          wind: { speed: 2.1 },
          name: "Shanghai",
        }),
      };
      globalThis.fetch = jest.fn().mockResolvedValue(mockWeatherResponse);

      const result = await serviceWithKey.getWeatherByCity("Shanghai");

      expect(result).not.toBeNull();
      expect(result!.temperature).toBe(18);
      expect(result!.condition).toBe("多云");
      expect(result!.location).toBe("Shanghai");
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("q=Shanghai"),
      );
    });
  });
});
