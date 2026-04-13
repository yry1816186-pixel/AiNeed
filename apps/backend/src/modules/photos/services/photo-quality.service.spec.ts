import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";

import { PhotoQualityService } from "./photo-quality.service";

describe("PhotoQualityService", () => {
  let service: PhotoQualityService;

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
      if (key === "AI_SERVICE_URL") return "http://localhost:8001";
      return defaultValue || "";
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhotoQualityService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PhotoQualityService>(PhotoQualityService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("analyzeQuality", () => {
    it("应该返回质量报告（本地回退模式）", async () => {
      const imageBuffer = Buffer.alloc(100000, 128);

      const result = await service.analyzeQuality(imageBuffer);

      expect(result).toHaveProperty("report");
      expect(result).toHaveProperty("processingTime");
      expect(result.report).toHaveProperty("sharpness");
      expect(result.report).toHaveProperty("brightness");
      expect(result.report).toHaveProperty("contrast");
      expect(result.report).toHaveProperty("composition");
      expect(result.report).toHaveProperty("overallScore");
      expect(result.report).toHaveProperty("passed");
      expect(result.report).toHaveProperty("suggestions");
      expect(result.report.sharpness).toBeGreaterThanOrEqual(0);
      expect(result.report.sharpness).toBeLessThanOrEqual(100);
      expect(result.report.brightness).toBeGreaterThanOrEqual(0);
      expect(result.report.brightness).toBeLessThanOrEqual(100);
      expect(result.report.contrast).toBeGreaterThanOrEqual(0);
      expect(result.report.contrast).toBeLessThanOrEqual(100);
    });

    it("应该在清晰度不足时生成改善建议", async () => {
      const uniformBuffer = Buffer.alloc(100000, 0);

      const result = await service.analyzeQuality(uniformBuffer);

      expect(result.report.suggestions.length).toBeGreaterThan(0);
    });

    it("应该在亮度不足时标记为未通过", async () => {
      const darkBuffer = Buffer.alloc(100000, 10);

      const result = await service.analyzeQuality(darkBuffer);

      expect(result.report.passed).toBe(false);
    });
  });

  describe("autoEnhance", () => {
    it("应该返回增强后的图片和报告", async () => {
      const imageBuffer = Buffer.alloc(100000, 128);

      const result = await service.autoEnhance(imageBuffer);

      expect(result).toHaveProperty("enhancedImage");
      expect(result).toHaveProperty("enhancedReport");
      expect(result).toHaveProperty("processingTime");
    });

    it("应该接受 issues 参数", async () => {
      const imageBuffer = Buffer.alloc(100000, 128);

      const result = await service.autoEnhance(imageBuffer, ["brightness", "contrast"]);

      expect(result).toHaveProperty("enhancedImage");
    });
  });

  describe("质量阈值", () => {
    it("清晰度阈值应为 40", () => {
      expect((service as unknown as { QUALITY_THRESHOLDS: { sharpness: number } }).QUALITY_THRESHOLDS.sharpness).toBe(40);
    });

    it("亮度范围应为 30-70", () => {
      expect((service as unknown as { QUALITY_THRESHOLDS: { brightnessMin: number; brightnessMax: number } }).QUALITY_THRESHOLDS.brightnessMin).toBe(30);
      expect((service as unknown as { QUALITY_THRESHOLDS: { brightnessMin: number; brightnessMax: number } }).QUALITY_THRESHOLDS.brightnessMax).toBe(70);
    });

    it("对比度阈值应为 30", () => {
      expect((service as unknown as { QUALITY_THRESHOLDS: { contrast: number } }).QUALITY_THRESHOLDS.contrast).toBe(30);
    });
  });
});
