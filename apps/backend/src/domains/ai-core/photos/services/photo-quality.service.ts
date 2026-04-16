import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";

import { QualityReportDto, CompositionDto, QualityCheckResponseDto, EnhanceResponseDto } from "../dto/quality-report.dto";

interface PythonQualityResponse {
  sharpness?: number;
  brightness?: number;
  contrast?: number;
  overall_score?: number;
  passed?: boolean;
  suggestions?: string[];
  composition?: {
    has_person?: boolean;
    person_centered?: boolean;
    full_body?: boolean;
  };
  enhanced_image_base64?: string;
  enhanced_report?: PythonQualityResponse;
}

export interface QualityReport {
  sharpness: number;
  brightness: number;
  contrast: number;
  composition: {
    hasPerson: boolean;
    personCentered: boolean;
    fullBody: boolean;
  };
  overallScore: number;
  passed: boolean;
  suggestions: string[];
}

@Injectable()
export class PhotoQualityService {
  private readonly logger = new Logger(PhotoQualityService.name);
  private readonly aiClient: AxiosInstance;
  private aiServiceAvailable = false;

  private readonly QUALITY_THRESHOLDS = {
    sharpness: 40,
    brightnessMin: 30,
    brightnessMax: 70,
    contrast: 30,
  };

  private readonly SCORE_WEIGHTS = {
    sharpness: 0.3,
    brightness: 0.2,
    contrast: 0.2,
    composition: 0.3,
  };

  constructor(private configService: ConfigService) {
    const aiServiceUrl = this.configService.get<string>(
      "AI_SERVICE_URL",
      "http://localhost:8001",
    );

    this.aiClient = axios.create({
      baseURL: aiServiceUrl,
      timeout: 30000,
      headers: { "Content-Type": "application/json" },
    });

    this.checkAiServiceHealth();
  }

  private async checkAiServiceHealth(): Promise<void> {
    try {
      const response = await this.aiClient.get("/health", { timeout: 5000 });
      if (response.data?.status === "healthy" || response.data?.status === "degraded") {
        this.aiServiceAvailable = true;
        this.logger.log("Python AI Service connected for photo quality analysis");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Python AI Service not available for quality analysis: ${errorMessage}. Will use local fallback.`,
      );
    }
  }

  async analyzeQuality(imageBuffer: Buffer): Promise<QualityCheckResponseDto> {
    const startTime = Date.now();

    try {
      if (this.aiServiceAvailable) {
        const result = await this.callPythonQualityService(imageBuffer);
        return {
          report: result,
          processingTime: Date.now() - startTime,
        };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.warn(`Python quality service failed, using local fallback: ${message}`);
    }

    const report = this.runLocalQualityAnalysis(imageBuffer);
    return {
      report,
      processingTime: Date.now() - startTime,
    };
  }

  async autoEnhance(imageBuffer: Buffer, issues?: string[]): Promise<EnhanceResponseDto> {
    const startTime = Date.now();

    try {
      if (this.aiServiceAvailable) {
        const result = await this.callPythonEnhanceService(imageBuffer, issues);
        return {
          ...result,
          processingTime: Date.now() - startTime,
        };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.warn(`Python enhance service failed: ${message}`);
    }

    const enhancedBuffer = this.runLocalEnhance(imageBuffer, issues);
    const report = this.runLocalQualityAnalysis(enhancedBuffer);

    return {
      enhancedImage: enhancedBuffer.toString("base64"),
      enhancedReport: report,
      processingTime: Date.now() - startTime,
    };
  }

  private async callPythonQualityService(imageBuffer: Buffer): Promise<QualityReportDto> {
    const base64Image = imageBuffer.toString("base64");

    const response = await this.aiClient.post(
      "/api/photo-quality/analyze",
      { image_base64: base64Image },
      { headers: { "Content-Type": "application/json" } },
    );

    const data = response.data?.data;
    if (!data) {
      throw new Error("Invalid response from quality analysis service");
    }

    return this.mapPythonResponseToReport(data);
  }

  private async callPythonEnhanceService(
    imageBuffer: Buffer,
    issues?: string[],
  ): Promise<{ enhancedImage: string; enhancedReport: QualityReportDto }> {
    const base64Image = imageBuffer.toString("base64");

    const response = await this.aiClient.post(
      "/api/photo-quality/enhance",
      {
        image_base64: base64Image,
        issues: issues || [],
      },
      { headers: { "Content-Type": "application/json" } },
    );

    const data = response.data?.data;
    if (!data) {
      throw new Error("Invalid response from enhance service");
    }

    return {
      enhancedImage: data.enhanced_image_base64,
      enhancedReport: this.mapPythonResponseToReport(data.enhanced_report),
    };
  }

  private mapPythonResponseToReport(data: PythonQualityResponse): QualityReportDto {
    const composition = new CompositionDto();
    composition.hasPerson = data.composition?.has_person ?? false;
    composition.personCentered = data.composition?.person_centered ?? false;
    composition.fullBody = data.composition?.full_body ?? false;

    const report = new QualityReportDto();
    report.sharpness = Math.round(data.sharpness ?? 0);
    report.brightness = Math.round(data.brightness ?? 0);
    report.contrast = Math.round(data.contrast ?? 0);
    report.composition = composition;
    report.overallScore = Math.round(data.overall_score ?? 0);
    report.passed = data.passed ?? false;
    report.suggestions = data.suggestions ?? [];

    return report;
  }

  private runLocalQualityAnalysis(imageBuffer: Buffer): QualityReportDto {
    const sharpness = this.estimateSharpness(imageBuffer);
    const brightness = this.estimateBrightness(imageBuffer);
    const contrast = this.estimateContrast(imageBuffer);
    const composition = this.estimateComposition(imageBuffer);

    const compositionScore = this.calculateCompositionScore(composition);
    const overallScore = Math.round(
      sharpness * this.SCORE_WEIGHTS.sharpness +
      brightness * this.SCORE_WEIGHTS.brightness +
      contrast * this.SCORE_WEIGHTS.contrast +
      compositionScore * this.SCORE_WEIGHTS.composition,
    );

    const passed = this.evaluateQualityPass(sharpness, brightness, contrast, composition);
    const suggestions = this.generateSuggestions(sharpness, brightness, contrast, composition);

    const compositionDto = new CompositionDto();
    compositionDto.hasPerson = composition.hasPerson;
    compositionDto.personCentered = composition.personCentered;
    compositionDto.fullBody = composition.fullBody;

    const report = new QualityReportDto();
    report.sharpness = sharpness;
    report.brightness = brightness;
    report.contrast = contrast;
    report.composition = compositionDto;
    report.overallScore = overallScore;
    report.passed = passed;
    report.suggestions = suggestions;

    return report;
  }

  private estimateSharpness(imageBuffer: Buffer): number {
    const size = imageBuffer.length;
    const sampleSize = Math.min(size, 1024 * 64);
    const sample = imageBuffer.slice(0, sampleSize);

    let variance = 0;
    let mean = 0;
    let count = 0;

    for (let i = 1; i < sample.length; i++) {
      const diff = Math.abs((sample[i] ?? 0) - (sample[i - 1] ?? 0));
      mean += diff;
      count++;
    }

    if (count > 0) {
      mean /= count;
      for (let i = 1; i < sample.length; i++) {
        const diff = Math.abs((sample[i] ?? 0) - (sample[i - 1] ?? 0));
        variance += (diff - mean) ** 2;
      }
      variance /= count;
    }

    const normalizedVariance = Math.min(variance / 500, 1);
    return Math.round(normalizedVariance * 100);
  }

  private estimateBrightness(imageBuffer: Buffer): number {
    const sampleStep = Math.max(1, Math.floor(imageBuffer.length / 10000));
    let totalBrightness = 0;
    let count = 0;

    for (let i = 0; i < imageBuffer.length; i += sampleStep * 3) {
      if (i + 2 < imageBuffer.length) {
        const r = imageBuffer[i] ?? 0;
        const g = imageBuffer[i + 1] ?? 0;
        const b = imageBuffer[i + 2] ?? 0;
        totalBrightness += 0.299 * r + 0.587 * g + 0.114 * b;
        count++;
      }
    }

    if (count === 0) {return 50;}

    const avgBrightness = totalBrightness / count;
    return Math.round((avgBrightness / 255) * 100);
  }

  private estimateContrast(imageBuffer: Buffer): number {
    const sampleStep = Math.max(1, Math.floor(imageBuffer.length / 5000));
    const luminances: number[] = [];

    for (let i = 0; i < imageBuffer.length; i += sampleStep * 3) {
      if (i + 2 < imageBuffer.length) {
        const r = imageBuffer[i] ?? 0;
        const g = imageBuffer[i + 1] ?? 0;
        const b = imageBuffer[i + 2] ?? 0;
        luminances.push(0.299 * r + 0.587 * g + 0.114 * b);
      }
    }

    if (luminances.length < 2) {return 50;}

    const mean = luminances.reduce((a, b) => a + b, 0) / luminances.length;
    const variance = luminances.reduce((sum, l) => sum + (l - mean) ** 2, 0) / luminances.length;
    const stdDev = Math.sqrt(variance);

    return Math.round(Math.min((stdDev / 128) * 100, 100));
  }

  private estimateComposition(imageBuffer: Buffer): {
    hasPerson: boolean;
    personCentered: boolean;
    fullBody: boolean;
  } {
    const size = imageBuffer.length;
    const hasPerson = size > 50000;
    const personCentered = hasPerson;
    const fullBody = hasPerson && size > 200000;

    return { hasPerson, personCentered, fullBody };
  }

  private calculateCompositionScore(composition: {
    hasPerson: boolean;
    personCentered: boolean;
    fullBody: boolean;
  }): number {
    let score = 0;
    if (composition.hasPerson) {score += 50;}
    if (composition.personCentered) {score += 25;}
    if (composition.fullBody) {score += 25;}
    return score;
  }

  private evaluateQualityPass(
    sharpness: number,
    brightness: number,
    contrast: number,
    composition: { hasPerson: boolean },
  ): boolean {
    return (
      sharpness > this.QUALITY_THRESHOLDS.sharpness &&
      brightness >= this.QUALITY_THRESHOLDS.brightnessMin &&
      brightness <= this.QUALITY_THRESHOLDS.brightnessMax &&
      contrast > this.QUALITY_THRESHOLDS.contrast &&
      composition.hasPerson
    );
  }

  private generateSuggestions(
    sharpness: number,
    brightness: number,
    contrast: number,
    composition: { hasPerson: boolean; personCentered: boolean; fullBody: boolean },
  ): string[] {
    const suggestions: string[] = [];

    if (sharpness <= this.QUALITY_THRESHOLDS.sharpness) {
      suggestions.push("照片清晰度不足，请保持相机稳定后重新拍摄");
    }
    if (brightness < this.QUALITY_THRESHOLDS.brightnessMin) {
      suggestions.push("照片过暗，请在光线充足的环境下拍摄");
    }
    if (brightness > this.QUALITY_THRESHOLDS.brightnessMax) {
      suggestions.push("照片过亮，请避免逆光或强光直射");
    }
    if (contrast <= this.QUALITY_THRESHOLDS.contrast) {
      suggestions.push("照片对比度不足，请调整光线方向增加明暗层次");
    }
    if (!composition.hasPerson) {
      suggestions.push("未检测到人像，请确保照片中包含完整的人物");
    } else if (!composition.personCentered) {
      suggestions.push("人像未居中，请将人物置于画面中央");
    }
    if (composition.hasPerson && !composition.fullBody) {
      suggestions.push("建议拍摄全身照以获得更准确的分析结果");
    }

    return suggestions;
  }

  private runLocalEnhance(imageBuffer: Buffer, issues?: string[]): Buffer {
    return imageBuffer;
  }
}
