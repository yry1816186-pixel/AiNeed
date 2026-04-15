/* eslint-disable @typescript-eslint/no-require-imports */
import { Test, TestingModule } from "@nestjs/testing";

import { PhotoQualityValidator, PhotoQualityReport } from "./photo-quality-validator.service";

jest.mock("sharp", () => {
  const mockSharp = {
    grayscale: jest.fn().mockReturnThis(),
    raw: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue({
      data: Buffer.alloc(100 * 100, 128),
      info: { width: 100, height: 100, channels: 1 },
    }),
  };
  return jest.fn(() => mockSharp);
});

describe("PhotoQualityValidator", () => {
  let service: PhotoQualityValidator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PhotoQualityValidator],
    }).compile();

    service = module.get<PhotoQualityValidator>(PhotoQualityValidator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("validateQuality", () => {
    it("should return a PhotoQualityReport with all required fields", async () => {
      const imageBuffer = Buffer.alloc(1000, 128);

      const result = await service.validateQuality(imageBuffer);

      expect(result).toHaveProperty("clarity");
      expect(result).toHaveProperty("brightness");
      expect(result).toHaveProperty("composition");
      expect(result).toHaveProperty("overall");
      expect(result).toHaveProperty("passed");
    });

    it("should bound all scores between 0 and 100", async () => {
      const imageBuffer = Buffer.alloc(1000, 128);

      const result = await service.validateQuality(imageBuffer);

      expect(result.clarity).toBeGreaterThanOrEqual(0);
      expect(result.clarity).toBeLessThanOrEqual(100);
      expect(result.brightness).toBeGreaterThanOrEqual(0);
      expect(result.brightness).toBeLessThanOrEqual(100);
      expect(result.composition).toBeGreaterThanOrEqual(0);
      expect(result.composition).toBeLessThanOrEqual(100);
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(100);
    });

    it("should return composition score of 50 (placeholder)", async () => {
      const imageBuffer = Buffer.alloc(1000, 128);

      const result = await service.validateQuality(imageBuffer);

      expect(result.composition).toBe(50);
    });

    it("should calculate overall as weighted sum: clarity*0.4 + brightness*0.3 + composition*0.3", async () => {
      const imageBuffer = Buffer.alloc(1000, 128);

      const result = await service.validateQuality(imageBuffer);

      const expectedOverall = Math.round(
        result.clarity * 0.4 + result.brightness * 0.3 + result.composition * 0.3,
      );
      expect(result.overall).toBe(Math.max(0, Math.min(100, expectedOverall)));
    });

    it("should pass when overall score >= 40", async () => {
      const imageBuffer = Buffer.alloc(10000, 128);

      const result = await service.validateQuality(imageBuffer);

      // With uniform 128 pixel data (mid-brightness), brightness should score 100
      // Overall should be well above 40
      if (result.overall >= 40) {
        expect(result.passed).toBe(true);
      } else {
        expect(result.passed).toBe(false);
      }
    });

    it("should handle sharp errors gracefully with fallback scores", async () => {
      const sharp = require("sharp");
      sharp.mockImplementationOnce(() => ({
        grayscale: jest.fn().mockReturnThis(),
        raw: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockRejectedValue(new Error("Invalid image")),
      }));

      const result = await service.validateQuality(Buffer.alloc(100));

      expect(result).toHaveProperty("clarity");
      expect(result).toHaveProperty("brightness");
      expect(result.composition).toBe(50);
    });
  });
});
