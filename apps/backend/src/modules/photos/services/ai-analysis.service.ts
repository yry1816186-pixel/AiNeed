import * as crypto from "crypto";
import * as https from "https";

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";

import { sanitizeImage } from "../../../common/security/image-sanitizer";

interface AliyunBodyAnalysisResult {
  BodyType?: string;
  UpperBodyRatio?: number;
  LowerBodyRatio?: number;
  ShoulderWidth?: number;
  WaistWidth?: number;
  HipWidth?: number;
}

interface AliyunFaceAnalysisResult {
  FaceShape?: string;
  SkinTone?: string;
  Age?: number;
  Gender?: string;
  Beauty?: number;
}

interface BodyFaceAnalysisResult {
  bodyType?: string;
  skinTone?: string;
  faceShape?: string;
  colorSeason?: string;
  confidence: number;
  rawResult: Record<string, unknown>;
}

@Injectable()
export class AiAnalysisService {
  private readonly logger = new Logger(AiAnalysisService.name);
  private readonly accessKeyId: string;
  private readonly accessKeySecret: string;
  private readonly region: string;
  private readonly aiServiceUrl: string;
  private aiClient: AxiosInstance;
  private aiServiceAvailable = false;
  private readonly localSkinTonePalette: Array<{
    name: string;
    rgb: [number, number, number];
  }> = [
    { name: "fair", rgb: [244, 218, 201] },
    { name: "light", rgb: [228, 190, 165] },
    { name: "medium", rgb: [198, 151, 118] },
    { name: "olive", rgb: [168, 135, 96] },
    { name: "tan", rgb: [145, 105, 72] },
    { name: "dark", rgb: [104, 72, 46] },
  ];

  constructor(private configService: ConfigService) {
    this.accessKeyId = this.configService.get<string>(
      "ALIYUN_ACCESS_KEY_ID",
      "",
    );
    this.accessKeySecret = this.configService.get<string>(
      "ALIYUN_ACCESS_KEY_SECRET",
      "",
    );
    this.region = this.configService.get<string>(
      "ALIYUN_REGION",
      "cn-shanghai",
    );
    this.aiServiceUrl = this.configService.get<string>(
      "AI_SERVICE_URL",
      "http://localhost:8001",
    );

    this.aiClient = axios.create({
      baseURL: this.aiServiceUrl,
      timeout: 30000,
      headers: { "Content-Type": "application/json" },
    });

    this.checkAiServiceHealth();
  }

  private async checkAiServiceHealth(): Promise<void> {
    try {
      const response = await this.aiClient.get("/health", { timeout: 5000 });
      if (response.data?.status === "healthy") {
        this.aiServiceAvailable = true;
        this.logger.log("Python AI Service connected for body analysis");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Python AI Service not available (${this.aiServiceUrl}): ${errorMessage}. Body/face analysis will fall back to Aliyun.`,
      );
      this.aiServiceAvailable = false;
    }
  }

  async analyzeBodyAndFace(
    imageBuffer: Buffer,
  ): Promise<BodyFaceAnalysisResult> {
    if (this.aiServiceAvailable) {
      try {
        return await this.callPythonAIService(imageBuffer);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        this.logger.warn(
          `Python AI Service failed, falling back to Aliyun: ${message}`,
        );
      }
    }

    if (!this.accessKeyId || !this.accessKeySecret) {
      this.logger.warn(
        "Aliyun credentials are not configured, using local heuristic body analysis",
      );
      return this.runLocalAnalysis(imageBuffer);
    }

    return this.callAliyunAnalysis(imageBuffer);
  }

  private async callPythonAIService(
    imageBuffer: Buffer,
  ): Promise<BodyFaceAnalysisResult> {
    const base64Image = imageBuffer.toString("base64");

    const response = await this.aiClient.post(
      "/api/body-analysis",
      { image_base64: base64Image },
      { headers: { "Content-Type": "application/json" } },
    );

    const data = response.data?.data;
    if (!data) {
      throw new Error("Invalid response from AI service");
    }

    return {
      bodyType: data.body_type,
      skinTone: data.skin_tone,
      faceShape:
        typeof data.face_shape === "string" ? data.face_shape : undefined,
      colorSeason: data.color_season,
      confidence: typeof data.confidence === "number" ? data.confidence : 0.9,
      rawResult: data,
    };
  }

  private async callAliyunAnalysis(
    imageBuffer: Buffer,
  ): Promise<BodyFaceAnalysisResult> {
    try {
      const base64Image = imageBuffer.toString("base64");

      const [bodyResult, faceResult] = await Promise.allSettled([
        this.callAliyunBodyAnalysis(base64Image),
        this.callAliyunFaceAnalysis(base64Image),
      ]);

      if (
        bodyResult.status === "rejected" &&
        faceResult.status === "rejected"
      ) {
        throw new Error(
          `Aliyun analysis failed: ${bodyResult.reason?.message || "body failed"}; ${faceResult.reason?.message || "face failed"}`,
        );
      }

      const bodyData =
        bodyResult.status === "fulfilled" ? bodyResult.value : {};
      const faceData =
        faceResult.status === "fulfilled" ? faceResult.value : {};

      const bodyType = this.mapBodyType(bodyData);
      const skinTone = this.mapSkinTone(faceData);
      const faceShape = this.mapFaceShape(faceData);
      const colorSeason = this.determineColorSeason(skinTone, faceData);

      return {
        bodyType,
        skinTone,
        faceShape,
        colorSeason,
        confidence: this.calculateConfidence(bodyResult, faceResult),
        rawResult: { body: bodyData, face: faceData },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`AI analysis failed: ${message}`);
      return this.runLocalAnalysis(imageBuffer);
    }
  }

  private async runLocalAnalysis(
    imageBuffer: Buffer,
  ): Promise<BodyFaceAnalysisResult> {
    const sharp = (await import("sharp")).default;
    const image = sanitizeImage(sharp(imageBuffer, { failOn: "none" })).rotate();
    const [metadata, stats] = await Promise.all([image.metadata(), image.stats()]);

    const width = metadata.width ?? 1;
    const height = metadata.height ?? 1;
    const aspectRatio = width / Math.max(height, 1);
    const dominant = [
      Math.round(stats.dominant.r),
      Math.round(stats.dominant.g),
      Math.round(stats.dominant.b),
    ] as [number, number, number];
    const brightness = this.calculateLuminance(dominant);
    const saturation = this.calculateSaturation(dominant);
    const warmth = dominant[0] - dominant[2];
    const confidence = 0.72;

    const skinTone = this.mapRgbToSkinTone(dominant);
    const faceShape = this.estimateFaceShape(aspectRatio, saturation);
    const bodyType = this.estimateBodyType(aspectRatio, saturation);
    const colorSeason = this.estimateColorSeason(skinTone, warmth, brightness);

    return {
      bodyType,
      skinTone,
      faceShape,
      colorSeason,
      confidence,
      rawResult: {
        source: "local_heuristic",
        width,
        height,
        aspectRatio,
        dominantColor: dominant,
        brightness,
        saturation,
        warmth,
      },
    };
  }

  private async callAliyunBodyAnalysis(
    imageBase64: string,
  ): Promise<AliyunBodyAnalysisResult> {
    const params = {
      Action: "DetectBodyCount",
      Version: "2020-03-20",
      ImageURL: `data:image/jpeg;base64,${imageBase64}`,
    };

    try {
      const response = await this.makeAliyunRequest(
        "/viapi/body/analysis",
        params,
      );
      return response.Data || {};
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Body analysis API failed: ${message}`);
    }
  }

  private async callAliyunFaceAnalysis(
    imageBase64: string,
  ): Promise<AliyunFaceAnalysisResult> {
    const params = {
      Action: "DetectFace",
      Version: "2020-03-20",
      ImageURL: `data:image/jpeg;base64,${imageBase64}`,
    };

    try {
      const response = await this.makeAliyunRequest(
        "/viapi/face/analysis",
        params,
      );
      return response.Data?.FaceAttributes || {};
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Face analysis API failed: ${message}`);
    }
  }

  private async makeAliyunRequest(
    path: string,
    params: Record<string, string>,
  ): Promise<any> {
    const method = "POST";
    const host = `viapi.${this.region}.aliyuncs.com`;

    const timestamp = new Date().toISOString().replace(/\.\d{3}/, "");
    const nonce = crypto.randomUUID();

    const sortedParams = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");

    const stringToSign = `${method}&${encodeURIComponent("/")}&${encodeURIComponent(sortedParams)}`;

    const hmac = crypto.createHmac("sha1", `${this.accessKeySecret}&`);
    const signature = hmac.update(stringToSign).digest("base64");

    const requestBody = `${sortedParams}&Signature=${encodeURIComponent(signature)}`;

    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          method,
          host,
          path,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "x-acs-action": params.Action,
            "x-acs-version": params.Version,
            "x-acs-date": timestamp,
            "x-acs-signature-nonce": nonce,
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              resolve(JSON.parse(data));
            } catch (parseError) {
              const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
              this.logger.error(
                `Failed to parse Aliyun API response as JSON. Status: ${res.statusCode}. Raw response (truncated): ${data.substring(0, 200)}. Error: ${errorMessage}`,
              );
              reject(new Error(`Invalid JSON response from Aliyun API: ${errorMessage}`));
            }
          });
        },
      );

      req.on("error", reject);
      req.write(requestBody);
      req.end();
    });
  }

  private mapBodyType(data: AliyunBodyAnalysisResult): string | undefined {
    if (!data.BodyType) {return undefined;}

    const typeMap: Record<string, string> = {
      Rectangle: "rectangle",
      Triangle: "triangle",
      InvertedTriangle: "inverted_triangle",
      Hourglass: "hourglass",
      Oval: "oval",
    };

    return typeMap[data.BodyType] || "rectangle";
  }

  private mapSkinTone(data: AliyunFaceAnalysisResult): string | undefined {
    if (!data.SkinTone) {return undefined;}

    const toneMap: Record<string, string> = {
      Fair: "fair",
      Light: "light",
      Medium: "medium",
      Olive: "olive",
      Tan: "tan",
      Dark: "dark",
    };

    return toneMap[data.SkinTone] || "medium";
  }

  private mapFaceShape(data: AliyunFaceAnalysisResult): string | undefined {
    if (!data.FaceShape) {return undefined;}

    const shapeMap: Record<string, string> = {
      Oval: "oval",
      Round: "round",
      Square: "square",
      Heart: "heart",
      Oblong: "oblong",
      Diamond: "diamond",
    };

    return shapeMap[data.FaceShape] || "oval";
  }

  private calculateLuminance([r, g, b]: [number, number, number]): number {
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  private calculateSaturation([r, g, b]: [number, number, number]): number {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);

    if (max === 0) {
      return 0;
    }

    return (max - min) / max;
  }

  private mapRgbToSkinTone(rgb: [number, number, number]): string {
    let best = this.localSkinTonePalette[0];
    if (!best) {
      return "medium";
    }

    let bestDistance = Number.POSITIVE_INFINITY;
    for (const candidate of this.localSkinTonePalette) {
      const [cr, cg, cb] = candidate.rgb;
      const distance = Math.sqrt(
        Math.pow(rgb[0] - cr, 2) +
          Math.pow(rgb[1] - cg, 2) +
          Math.pow(rgb[2] - cb, 2),
      );
      if (distance < bestDistance) {
        bestDistance = distance;
        best = candidate;
      }
    }

    return best.name;
  }

  private estimateFaceShape(
    aspectRatio: number,
    saturation: number,
  ): string {
    if (aspectRatio > 0.92) {
      return "round";
    }

    if (aspectRatio < 0.68) {
      return "oblong";
    }

    if (saturation < 0.18) {
      return "oval";
    }

    return "heart";
  }

  private estimateBodyType(
    aspectRatio: number,
    saturation: number,
  ): string {
    if (aspectRatio < 0.56) {
      return "hourglass";
    }

    if (aspectRatio < 0.68) {
      return saturation > 0.35 ? "triangle" : "rectangle";
    }

    return "rectangle";
  }

  private estimateColorSeason(
    skinTone: string,
    warmth: number,
    brightness: number,
  ): string {
    if (brightness > 180) {
      return warmth >= 0 ? "spring" : "summer";
    }

    if (skinTone === "tan" || skinTone === "olive" || warmth > 18) {
      return "autumn";
    }

    return "winter";
  }

  private determineColorSeason(
    skinTone: string | undefined,
    _faceData: AliyunFaceAnalysisResult,
  ): string | undefined {
    if (!skinTone) {return undefined;}

    const seasonBySkinTone: Record<string, string> = {
      fair: "summer",
      light: "spring",
      medium: "autumn",
      olive: "autumn",
      tan: "winter",
      dark: "winter",
    };

    return seasonBySkinTone[skinTone] || "autumn";
  }

  private calculateConfidence(
    bodyResult: PromiseSettledResult<unknown>,
    faceResult: PromiseSettledResult<unknown>,
  ): number {
    let confidence = 0.5;

    if (bodyResult.status === "fulfilled") {confidence += 0.25;}
    if (faceResult.status === "fulfilled") {confidence += 0.25;}

    return Math.min(confidence, 1.0);
  }
}
