/* eslint-disable @typescript-eslint/no-unused-vars */
import { manipulateAsync, SaveFormat } from "@/src/polyfills/expo-image-manipulator";
import type { PhotoQualityIssue } from "../stores/photoStore";

export interface QualityResult {
  score: number;
  sharpness: number;
  brightness: number;
  contrast: number;
  issues: PhotoQualityIssue[];
}

export interface ImageMetadata {
  width?: number;
  height?: number;
  fileSize?: number;
}

function addIssue(
  issues: PhotoQualityIssue[],
  type: PhotoQualityIssue["type"],
  severity: PhotoQualityIssue["severity"],
  message: string
) {
  if (!issues.some((i) => i.type === type)) {
    issues.push({ type, severity, message });
  }
}

export async function analyzeImageQuality(
  imageUri: string,
  metadata?: ImageMetadata
): Promise<QualityResult> {
  const issues: PhotoQualityIssue[] = [];
  let score = 100;
  let sharpness = 50;
  let brightness = 50;
  let contrast = 50;

  let width = metadata?.width ?? 0;
  let height = metadata?.height ?? 0;

  if (!width || !height) {
    try {
      const info = await manipulateAsync(imageUri, [], {});
      width = info.width;
      height = info.height;
    } catch {
      return {
        score: 50,
        sharpness: 50,
        brightness: 50,
        contrast: 50,
        issues: [{ type: "blur", severity: "medium", message: "无法读取图像信息" }],
      };
    }
  }

  const megapixels = (width * height) / 1_000_000;
  const minDimension = Math.min(width, height);

  if (megapixels < 0.3) {
    score -= 30;
    sharpness = 15;
    addIssue(issues, "blur", "high", "分辨率过低，图像严重模糊");
  } else if (megapixels < 1) {
    score -= 15;
    sharpness = 35;
    addIssue(issues, "blur", "medium", "分辨率偏低，图像可能模糊");
  } else if (megapixels < 2) {
    sharpness = 55;
  } else if (megapixels < 5) {
    sharpness = 75;
  } else {
    sharpness = 85;
  }

  if (minDimension < 480) {
    score -= 10;
    addIssue(issues, "blur", "low", "图像尺寸过小");
  }

  const aspectRatio = Math.max(width, height) / Math.min(width, height);
  if (aspectRatio > 3) {
    score -= 10;
    addIssue(issues, "pose", "low", "建议使用竖屏拍摄全身照");
  }

  try {
    const result = await manipulateAsync(imageUri, [{ resize: { width: 128 } }], {
      base64: true,
      compress: 0.92,
      format: SaveFormat.JPEG,
    });

    if (result.base64) {
      const rawBytes = atob(result.base64);
      const byteLength = rawBytes.length;

      let dataStart = 0;
      for (let i = 0; i < Math.min(byteLength - 1, 2000); i++) {
        if (rawBytes.charCodeAt(i) === 0xff && rawBytes.charCodeAt(i + 1) === 0xda) {
          let skip = i + 2;
          while (skip < byteLength - 1 && rawBytes.charCodeAt(skip) !== 0xff) {
            skip++;
          }
          dataStart = skip;
          break;
        }
      }

      if (dataStart > 0 && dataStart < byteLength) {
        const sampleSize = Math.min(byteLength - dataStart, 8000);
        const sampleStep = Math.max(1, Math.floor(sampleSize / 600));

        let zeroCount = 0;
        let highCount = 0;
        let lowCount = 0;
        let totalSampled = 0;
        const byteValues: number[] = [];

        for (let i = dataStart; i < dataStart + sampleSize && i < byteLength; i += sampleStep) {
          const byte = rawBytes.charCodeAt(i);
          byteValues.push(byte);
          if (byte === 0x00) {
            zeroCount++;
          }
          if (byte >= 0xe0) {
            highCount++;
          }
          if (byte <= 0x0f && byte !== 0x00) {
            lowCount++;
          }
          totalSampled++;
        }

        if (totalSampled > 0) {
          const zeroRatio = zeroCount / totalSampled;
          const highRatio = highCount / totalSampled;

          if (zeroRatio > 0.55) {
            sharpness = Math.max(15, sharpness - 25);
            score -= 15;
            addIssue(issues, "blur", "medium", "图像细节不足，可能模糊");
          } else if (zeroRatio < 0.25) {
            sharpness = Math.min(100, sharpness + 10);
          }

          brightness = Math.round(50 + (highRatio - zeroRatio) * 150);
          brightness = Math.max(5, Math.min(95, brightness));

          if (brightness < 25) {
            score -= 20;
            addIssue(issues, "brightness", "high", "光线不足，建议在明亮环境拍摄");
          } else if (brightness < 40) {
            score -= 10;
            addIssue(issues, "brightness", "medium", "光线偏暗，建议增加照明");
          } else if (brightness > 85) {
            score -= 10;
            addIssue(issues, "brightness", "medium", "光线过亮，可能过曝");
          }

          if (byteValues.length > 10) {
            const sorted = [...byteValues].sort((a, b) => a - b);
            const p10 = sorted[Math.floor(sorted.length * 0.1)];
            const p90 = sorted[Math.floor(sorted.length * 0.9)];
            contrast = Math.round(((p90 - p10) / 255) * 100);
            contrast = Math.max(5, Math.min(95, contrast));
          }

          if (contrast < 25) {
            score -= 10;
            addIssue(issues, "background", "low", "对比度低，图像缺乏层次");
          }

          const smallPixelCount = 128 * Math.round(128 * (height / width));
          const estimatedOriginalSize = byteLength * ((width * height) / smallPixelCount);
          const bytesPerPixel = estimatedOriginalSize / (width * height);

          if (bytesPerPixel < 0.3) {
            score -= 10;
            addIssue(issues, "blur", "low", "图像压缩过度，细节丢失");
          }
        }
      }
    }
  } catch {
    // base64 analysis unavailable, metadata-only assessment stands
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    sharpness: Math.max(0, Math.min(100, sharpness)),
    brightness: Math.max(0, Math.min(100, brightness)),
    contrast: Math.max(0, Math.min(100, contrast)),
    issues,
  };
}
