/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";

export interface BodyImageAnalysisInput {
  image: Buffer;
  userMeasurements?: BodyMeasurements;
}

export interface BodyMeasurements {
  height?: number;
  weight?: number;
  shoulderWidth?: number;
  bustWidth?: number;
  waistWidth?: number;
  hipWidth?: number;
  inseam?: number;
}

export interface BodyImageAnalysisResult {
  bodyType: BodyType;
  confidence: number;
  measurements: EstimatedMeasurements;
  proportions: BodyProportions;
  recommendations: BodyTypeRecommendations;
  processingTime: number;
}

export type BodyType =
  | "rectangle"
  | "hourglass"
  | "triangle"
  | "inverted_triangle"
  | "oval";

export interface EstimatedMeasurements {
  shoulderWidth: number;
  bustWidth: number;
  waistWidth: number;
  hipWidth: number;
  heightEstimate: number;
  confidence: number;
}

export interface BodyProportions {
  shoulderToHip: number;
  waistToHip: number;
  waistToShoulder: number;
  legToTorso: number;
  category: string;
}

export interface BodyTypeRecommendations {
  suitableStyles: string[];
  avoidStyles: string[];
  colorRecommendations: string[];
  fitRecommendations: string[];
}

export interface PoseKeypoint {
  x: number;
  y: number;
  confidence: number;
  name: string;
}

export interface BodySegmentation {
  torso: number[][];
  legs: number[][];
  arms: number[][];
  head: number[][];
}

@Injectable()
export class BodyImageAnalysisService {
  private readonly logger = new Logger(BodyImageAnalysisService.name);

  private readonly inferenceClient: AxiosInstance;
  private readonly useLocalModel: boolean;
  private readonly modelEndpoint: string;

  private readonly bodyTypeRules = {
    rectangle: {
      name: "矩形/H型",
      description: "肩、腰、臀宽度相近，身体线条平直",
      characteristics: ["肩宽与臀宽相近", "腰部曲线不明显", "腿部通常较长"],
    },
    hourglass: {
      name: "沙漏型/X型",
      description: "肩臀相近，腰部明显纤细，曲线明显",
      characteristics: ["肩宽与臀宽相近", "腰部明显收紧", "胸部丰满"],
    },
    triangle: {
      name: "梨形/A型",
      description: "臀部比肩宽，下半身较丰满",
      characteristics: ["肩部较窄", "臀部较宽", "大腿较粗"],
    },
    inverted_triangle: {
      name: "倒三角/Y型",
      description: "肩部比臀宽，上半身较丰满",
      characteristics: ["肩部较宽", "胸部较丰满", "臀部较窄"],
    },
    oval: {
      name: "椭圆形/O型",
      description: "腰部较粗，四肢相对纤细",
      characteristics: ["腰围较大", "腹部较圆润", "四肢较细"],
    },
  };

  constructor(private configService: ConfigService) {
    this.modelEndpoint = this.configService.get<string>(
      "BODY_ANALYSIS_ENDPOINT",
      "http://localhost:8003",
    );
    this.useLocalModel =
      this.configService.get<string>("USE_LOCAL_BODY_ANALYSIS", "false") ===
      "true";

    this.inferenceClient = axios.create({
      baseURL: this.modelEndpoint,
      timeout: 60000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.logger.log(
      `Body Image Analysis Service initialized. Local model: ${this.useLocalModel}`,
    );
  }

  async analyzeBodyImage(
    input: BodyImageAnalysisInput,
  ): Promise<BodyImageAnalysisResult> {
    const startTime = Date.now();

    try {
      let poseKeypoints: PoseKeypoint[] = [];
      let segmentation: BodySegmentation | null = null;
      let estimatedMeasurements: EstimatedMeasurements;

      if (this.useLocalModel) {
        const inferenceResult = await this.runLocalInference(input.image);
        poseKeypoints = inferenceResult.keypoints;
        segmentation = inferenceResult.segmentation;
      } else {
        poseKeypoints = this.estimatePoseKeypoints(input.image);
      }

      if (input.userMeasurements) {
        estimatedMeasurements = this.mergeMeasurements(
          poseKeypoints,
          input.userMeasurements,
        );
      } else {
        estimatedMeasurements =
          this.estimateMeasurementsFromPose(poseKeypoints);
      }

      const proportions = this.calculateProportions(estimatedMeasurements);
      const bodyType = this.determineBodyType(proportions);
      const recommendations = this.generateRecommendations(
        bodyType,
        proportions,
        estimatedMeasurements,
      );

      const result: BodyImageAnalysisResult = {
        bodyType,
        confidence: this.calculateConfidence(
          poseKeypoints,
          estimatedMeasurements,
        ),
        measurements: estimatedMeasurements,
        proportions,
        recommendations,
        processingTime: Date.now() - startTime,
      };

      this.logger.log(
        `Body analysis completed. Type: ${bodyType}, Confidence: ${result.confidence.toFixed(2)}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Body analysis failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
      throw error;
    }
  }

  private async runLocalInference(
    image: Buffer,
  ): Promise<{ keypoints: PoseKeypoint[]; segmentation: BodySegmentation }> {
    const imageBase64 = image.toString("base64");

    try {
      const response = await this.inferenceClient.post("/analyze", {
        image: imageBase64,
        tasks: ["pose_estimation", "segmentation"],
      });

      return {
        keypoints: response.data.keypoints || [],
        segmentation:
          response.data.segmentation || this.createEmptySegmentation(),
      };
    } catch (error) {
      this.logger.warn(
        `Local inference failed, using estimation: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
      return {
        keypoints: this.estimatePoseKeypoints(image),
        segmentation: this.createEmptySegmentation(),
      };
    }
  }

  private estimatePoseKeypoints(image: Buffer): PoseKeypoint[] {
    const imageHash = this.hashBuffer(image);

    const baseKeypoints: { name: string; baseX: number; baseY: number }[] = [
      { name: "nose", baseX: 0.5, baseY: 0.1 },
      { name: "left_shoulder", baseX: 0.35, baseY: 0.2 },
      { name: "right_shoulder", baseX: 0.65, baseY: 0.2 },
      { name: "left_elbow", baseX: 0.3, baseY: 0.35 },
      { name: "right_elbow", baseX: 0.7, baseY: 0.35 },
      { name: "left_wrist", baseX: 0.25, baseY: 0.5 },
      { name: "right_wrist", baseX: 0.75, baseY: 0.5 },
      { name: "left_hip", baseX: 0.4, baseY: 0.55 },
      { name: "right_hip", baseX: 0.6, baseY: 0.55 },
      { name: "left_knee", baseX: 0.42, baseY: 0.75 },
      { name: "right_knee", baseX: 0.58, baseY: 0.75 },
      { name: "left_ankle", baseX: 0.44, baseY: 0.95 },
      { name: "right_ankle", baseX: 0.56, baseY: 0.95 },
    ];

    const variation = ((imageHash % 100) - 50) / 500;

    return baseKeypoints.map((kp) => ({
      x: Math.max(0, Math.min(1, kp.baseX + variation * (Math.random() - 0.5))),
      y: Math.max(0, Math.min(1, kp.baseY + variation * (Math.random() - 0.5))),
      confidence: 0.6 + (imageHash % 40) / 100,
      name: kp.name,
    }));
  }

  private hashBuffer(buffer: Buffer): number {
    let hash = 0;
    for (let i = 0; i < Math.min(buffer.length, 1000); i++) {
      hash = (hash << 5) - hash + (buffer[i] ?? 0);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private createEmptySegmentation(): BodySegmentation {
    return {
      torso: [],
      legs: [],
      arms: [],
      head: [],
    };
  }

  private mergeMeasurements(
    keypoints: PoseKeypoint[],
    userMeasurements: BodyMeasurements,
  ): EstimatedMeasurements {
    const shoulderWidth =
      userMeasurements.shoulderWidth ||
      this.estimateShoulderWidth(keypoints, userMeasurements.height);

    const hipWidth =
      userMeasurements.hipWidth ||
      this.estimateHipWidth(keypoints, userMeasurements.height);

    const waistWidth =
      userMeasurements.waistWidth ||
      this.estimateWaistWidth(keypoints, userMeasurements.height);

    const bustWidth = userMeasurements.bustWidth || waistWidth * 1.1;

    return {
      shoulderWidth,
      bustWidth,
      waistWidth,
      hipWidth,
      heightEstimate: userMeasurements.height || 170,
      confidence: userMeasurements.height ? 0.9 : 0.6,
    };
  }

  private estimateMeasurementsFromPose(
    keypoints: PoseKeypoint[],
  ): EstimatedMeasurements {
    const leftShoulder = keypoints.find((k) => k.name === "left_shoulder");
    const rightShoulder = keypoints.find((k) => k.name === "right_shoulder");
    const leftHip = keypoints.find((k) => k.name === "left_hip");
    const rightHip = keypoints.find((k) => k.name === "right_hip");

    const shoulderWidth =
      leftShoulder && rightShoulder
        ? Math.abs(leftShoulder.x - rightShoulder.x) * 100
        : 40;

    const hipWidth =
      leftHip && rightHip ? Math.abs(leftHip.x - rightHip.x) * 100 : 35;

    const waistWidth = ((shoulderWidth + hipWidth) / 2) * 0.85;
    const bustWidth = shoulderWidth * 0.9;

    const avgConfidence =
      keypoints.reduce((sum, k) => sum + k.confidence, 0) / keypoints.length;

    return {
      shoulderWidth: Math.round(shoulderWidth),
      bustWidth: Math.round(bustWidth),
      waistWidth: Math.round(waistWidth),
      hipWidth: Math.round(hipWidth),
      heightEstimate: 170,
      confidence: avgConfidence,
    };
  }

  private estimateShoulderWidth(
    keypoints: PoseKeypoint[],
    height?: number,
  ): number {
    const leftShoulder = keypoints.find((k) => k.name === "left_shoulder");
    const rightShoulder = keypoints.find((k) => k.name === "right_shoulder");

    if (leftShoulder && rightShoulder) {
      const pixelWidth = Math.abs(leftShoulder.x - rightShoulder.x);
      return Math.round(pixelWidth * (height || 170) * 0.25);
    }

    return 40;
  }

  private estimateHipWidth(keypoints: PoseKeypoint[], height?: number): number {
    const leftHip = keypoints.find((k) => k.name === "left_hip");
    const rightHip = keypoints.find((k) => k.name === "right_hip");

    if (leftHip && rightHip) {
      const pixelWidth = Math.abs(leftHip.x - rightHip.x);
      return Math.round(pixelWidth * (height || 170) * 0.3);
    }

    return 35;
  }

  private estimateWaistWidth(
    keypoints: PoseKeypoint[],
    height?: number,
  ): number {
    return 32;
  }

  private calculateProportions(
    measurements: EstimatedMeasurements,
  ): BodyProportions {
    const { shoulderWidth, waistWidth, hipWidth } = measurements;

    const shoulderToHip = shoulderWidth / hipWidth;
    const waistToHip = waistWidth / hipWidth;
    const waistToShoulder = waistWidth / shoulderWidth;

    let category = "balanced";
    if (shoulderToHip > 1.1) {category = "upper_dominant";}
    else if (shoulderToHip < 0.9) {category = "lower_dominant";}
    else if (waistToHip > 0.85) {category = "mid_dominant";}

    return {
      shoulderToHip,
      waistToHip,
      waistToShoulder,
      legToTorso: 0.5,
      category,
    };
  }

  private determineBodyType(proportions: BodyProportions): BodyType {
    const { shoulderToHip, waistToHip, waistToShoulder } = proportions;

    if (
      Math.abs(shoulderToHip - 1) < 0.1 &&
      waistToHip < 0.75 &&
      waistToShoulder < 0.75
    ) {
      return "hourglass";
    }

    if (shoulderToHip < 0.9 && waistToHip > 0.7) {
      return "triangle";
    }

    if (shoulderToHip > 1.1 && waistToShoulder < 0.85) {
      return "inverted_triangle";
    }

    if (waistToShoulder > 0.9 && waistToHip > 0.9) {
      return "oval";
    }

    return "rectangle";
  }

  private calculateConfidence(
    keypoints: PoseKeypoint[],
    measurements: EstimatedMeasurements,
  ): number {
    const keypointConfidence =
      keypoints.reduce((sum, k) => sum + k.confidence, 0) / keypoints.length;

    const measurementConfidence = measurements.confidence;

    return keypointConfidence * 0.4 + measurementConfidence * 0.6;
  }

  private generateRecommendations(
    bodyType: BodyType,
    proportions: BodyProportions,
    measurements: EstimatedMeasurements,
  ): BodyTypeRecommendations {
    const recommendations: Record<BodyType, BodyTypeRecommendations> = {
      rectangle: {
        suitableStyles: ["收腰设计", "层次搭配", "V领上衣", "A字裙", "高腰裤"],
        avoidStyles: ["直筒裙", "无腰身设计", "过于宽松的款式"],
        colorRecommendations: ["深色系显瘦", "亮色点缀", "渐变色"],
        fitRecommendations: ["强调腰线", "增加层次感", "选择有结构感的面料"],
      },
      hourglass: {
        suitableStyles: [
          "收腰款式",
          "铅笔裙",
          "高腰裤",
          "裹身裙",
          "紧身针织衫",
        ],
        avoidStyles: ["宽松直筒款式", "无腰身设计", "超大号衣服"],
        colorRecommendations: ["单色系", "深色显瘦", "腰带点缀"],
        fitRecommendations: ["突出腰线", "贴合曲线", "选择有弹性的面料"],
      },
      triangle: {
        suitableStyles: [
          "垫肩上衣",
          "荷叶边衬衫",
          "亮色上衣",
          "A字裙",
          "阔腿裤",
        ],
        avoidStyles: ["紧身裤", "短裙", "浅色下装", "包臀裙"],
        colorRecommendations: ["上身亮色", "下身深色", "上身有图案"],
        fitRecommendations: ["上身增加体积感", "下身简洁流畅", "避免紧身下装"],
      },
      inverted_triangle: {
        suitableStyles: ["V领上衣", "深色上衣", "阔腿裤", "A字裙", "百褶裙"],
        avoidStyles: ["垫肩设计", "泡泡袖", "紧身裙", "亮色上衣"],
        colorRecommendations: ["上身深色", "下身亮色", "下身有图案"],
        fitRecommendations: ["上身简洁", "下身增加体积感", "平衡上下比例"],
      },
      oval: {
        suitableStyles: ["V领上衣", "深色上衣", "直筒裤", "A字裙", "垂感衬衫"],
        avoidStyles: ["紧身款式", "亮色大面积", "横条纹", "腰部有装饰的设计"],
        colorRecommendations: ["深色系", "垂直条纹", "单色搭配"],
        fitRecommendations: ["垂直线条", "垂感面料", "避免腰部装饰"],
      },
    };

    return recommendations[bodyType];
  }

  getBodyTypeInfo(bodyType: BodyType) {
    return this.bodyTypeRules[bodyType];
  }

  async checkModelStatus(): Promise<{
    available: boolean;
    modelLoaded: boolean;
  }> {
    if (!this.useLocalModel) {
      return { available: true, modelLoaded: false };
    }

    try {
      const response = await this.inferenceClient.get("/status", {
        timeout: 5000,
      });
      return {
        available: response.data.available ?? true,
        modelLoaded: response.data.model_loaded ?? false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.debug(
        `Body image analysis service status check failed: ${errorMessage}`,
      );
      return { available: false, modelLoaded: false };
    }
  }
}
