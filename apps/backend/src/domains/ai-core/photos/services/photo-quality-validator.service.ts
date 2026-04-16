/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from "@nestjs/common";
import sharp from "sharp";

export interface PhotoQualityReport {
  clarity: number;
  brightness: number;
  composition: number;
  overall: number;
  passed: boolean;
}

/**
 * PhotoQualityValidator scores photo quality across three dimensions:
 * - Clarity: Laplacian variance via sharp grayscale + raw pixel data (0-100)
 * - Brightness: Mean pixel value with optimal range 40-70 (0-100)
 * - Composition: Placeholder score (full implementation needs face detection)
 *
 * Overall score: clarity * 0.4 + brightness * 0.3 + composition * 0.3
 * Passed: overall >= 40
 */
@Injectable()
export class PhotoQualityValidator {
  private readonly logger = new Logger(PhotoQualityValidator.name);

  private static readonly OVERALL_THRESHOLD = 40;
  private static readonly SCORE_WEIGHTS = {
    clarity: 0.4,
    brightness: 0.3,
    composition: 0.3,
  } as const;

  async validateQuality(imageBuffer: Buffer): Promise<PhotoQualityReport> {
    let clarity = 50;
    let brightness = 50;
    const composition = 50; // Placeholder - requires face detection integration

    try {
      // Convert to grayscale raw pixels for analysis
      const { data, info } = await sharp(imageBuffer)
        .grayscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

      clarity = this.calculateClarity(data, info.width, info.height);
      brightness = this.calculateBrightness(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Image analysis fallback due to sharp error: ${message}`);
      // Return default scores on error
    }

    // Bound all scores to [0, 100]
    clarity = this.bound(clarity);
    brightness = this.bound(brightness);

    const overall = Math.round(
      clarity * PhotoQualityValidator.SCORE_WEIGHTS.clarity +
      brightness * PhotoQualityValidator.SCORE_WEIGHTS.brightness +
      composition * PhotoQualityValidator.SCORE_WEIGHTS.composition,
    );

    const passed = overall >= PhotoQualityValidator.OVERALL_THRESHOLD;

    return {
      clarity,
      brightness,
      composition,
      overall: this.bound(overall),
      passed,
    };
  }

  /**
   * Clarity score via Laplacian variance.
   * Computes the second derivative (Laplacian) of the grayscale image
   * and measures the variance. Higher variance = sharper image.
   */
  private calculateClarity(data: Buffer, width: number, height: number): number {
    if (width < 3 || height < 3) {
      return 0;
    }

    let sum = 0;
    let sumSq = 0;
    let count = 0;

    // Compute Laplacian: L(x,y) = I(x-1,y) + I(x+1,y) + I(x,y-1) + I(x,y+1) - 4*I(x,y)
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const center = data[idx] ?? 0;
        const left = data[idx - 1] ?? 0;
        const right = data[idx + 1] ?? 0;
        const top = data[idx - width] ?? 0;
        const bottom = data[idx + width] ?? 0;

        const laplacian = left + right + top + bottom - 4 * center;
        sum += laplacian;
        sumSq += laplacian * laplacian;
        count++;
      }
    }

    if (count === 0) {
      return 0;
    }

    const mean = sum / count;
    const variance = (sumSq / count) - (mean * mean);

    // Normalize variance to 0-100 scale
    // Typical Laplacian variance for clear images: 500-5000
    const normalizedVariance = Math.min(variance / 2000, 1);
    return Math.round(normalizedVariance * 100);
  }

  /**
   * Brightness score based on mean pixel value.
   * Optimal brightness is in the range 40-70 (mapped from 0-255).
   * Scores degrade outside this optimal range.
   */
  private calculateBrightness(data: Buffer): number {
    if (data.length === 0) {
      return 50;
    }

    const sampleStep = Math.max(1, Math.floor(data.length / 10000));
    let totalBrightness = 0;
    let count = 0;

    for (let i = 0; i < data.length; i += sampleStep) {
      totalBrightness += data[i] ?? 0;
      count++;
    }

    if (count === 0) {
      return 50;
    }

    const avgBrightness = totalBrightness / count;
    // Convert 0-255 range to 0-100 scale
    const scaledBrightness = (avgBrightness / 255) * 100;

    // Score is optimal (100) in 40-70 range, degrades outside
    if (scaledBrightness >= 40 && scaledBrightness <= 70) {
      return 100;
    } else if (scaledBrightness < 40) {
      return Math.round((scaledBrightness / 40) * 100);
    } else {
      return Math.round(Math.max(0, 1 - (scaledBrightness - 70) / 30) * 100);
    }
  }

  private bound(score: number): number {
    return Math.max(0, Math.min(100, score));
  }
}
