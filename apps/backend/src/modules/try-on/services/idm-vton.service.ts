import * as fs from "fs";
import * as path from "path";

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";

export interface IDMVTONInput {
  personImage: Buffer;
  garmentImage: Buffer;
  category?: "upper_body" | "lower_body" | "dresses";
  options?: {
    denoiseSteps?: number;
    seed?: number;
    guidanceScale?: number;
    clothType?: "upper" | "lower" | "dress";
  };
}

export interface IDMVTONResult {
  resultImage: Buffer;
  processingTime: number;
  modelVersion: string;
  metadata: {
    steps: number;
    seed: number;
    guidanceScale: number;
    gpuUsed: boolean;
  };
}

export interface IDMVTONStatus {
  available: boolean;
  modelLoaded: boolean;
  gpuAvailable: boolean;
  statusMessage?: string;
  resourceBlockers?: string[];
  estimatedMinimumMemoryGb?: number;
  availableSystemMemoryGb?: number;
  vramUsed?: number;
  vramTotal?: number;
}

@Injectable()
export class IDMVTONService {
  private readonly logger = new Logger(IDMVTONService.name);

  private readonly inferenceClient: AxiosInstance;
  private readonly modelEndpoint: string;
  private readonly useLocalInference: boolean;
  private readonly modelVersion: string = "idm-vton-v1.0";

  constructor(private configService: ConfigService) {
    this.modelEndpoint = this.configService.get<string>(
      "IDM_VTON_ENDPOINT",
      "http://localhost:8002",
    );
    this.useLocalInference =
      this.configService.get<string>("USE_LOCAL_IDM_VTON", "false") === "true";

    this.inferenceClient = axios.create({
      baseURL: this.modelEndpoint,
      timeout: 300000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.logger.log(
      `IDM-VTON Service initialized. Local inference: ${this.useLocalInference}, Endpoint: ${this.modelEndpoint}`,
    );
  }

  async virtualTryOn(input: IDMVTONInput): Promise<IDMVTONResult> {
    const startTime = Date.now();

    if (!this.useLocalInference) {
      this.logger.warn(
        "Local IDM-VTON not enabled, falling back to external API",
      );
      throw new Error("Local IDM-VTON inference not enabled");
    }

    try {
      const result = await this.executeInference(input);
      result.processingTime = Date.now() - startTime;

      this.logger.log(
        `IDM-VTON inference completed in ${result.processingTime}ms`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `IDM-VTON inference failed: ${this.getErrorMessage(error)}`,
      );
      throw error;
    }
  }

  private async executeInference(input: IDMVTONInput): Promise<IDMVTONResult> {
    const personBase64 = input.personImage.toString("base64");
    const garmentBase64 = input.garmentImage.toString("base64");

    const payload = {
      person_image: personBase64,
      garment_image: garmentBase64,
      category: input.category || "upper_body",
      denoise_steps: input.options?.denoiseSteps || 30,
      seed: input.options?.seed || Math.floor(Math.random() * 1000000),
      guidance_scale: input.options?.guidanceScale || 2.5,
      cloth_type: input.options?.clothType || "upper",
    };

    const response = await this.inferenceClient.post("/inference", payload);

    if (!response.data.result_image) {
      throw new Error("No result image in response");
    }

    const resultBase64 = response.data.result_image.replace(
      /^data:image\/\w+;base64,/,
      "",
    );
    const resultImage = Buffer.from(resultBase64, "base64");

    return {
      resultImage,
      processingTime: 0,
      modelVersion: this.modelVersion,
      metadata: {
        steps: payload.denoise_steps,
        seed: payload.seed,
        guidanceScale: payload.guidance_scale,
        gpuUsed: response.data.gpu_used ?? true,
      },
    };
  }

  async checkStatus(): Promise<IDMVTONStatus> {
    if (!this.useLocalInference) {
      return {
        available: false,
        modelLoaded: false,
        gpuAvailable: false,
      };
    }

    try {
      const response = await this.inferenceClient.get("/status", {
        timeout: 5000,
      });

      return {
        available: response.data.available ?? true,
        modelLoaded: response.data.model_loaded ?? false,
        gpuAvailable: response.data.gpu_available ?? false,
        statusMessage: response.data.status_message,
        resourceBlockers: response.data.resource_blockers,
        estimatedMinimumMemoryGb: response.data.estimated_minimum_memory_gb,
        availableSystemMemoryGb: response.data.available_system_memory_gb,
        vramUsed: response.data.vram_used,
        vramTotal: response.data.vram_total,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to check IDM-VTON status: ${this.getErrorMessage(error)}`,
      );
      return {
        available: false,
        modelLoaded: false,
        gpuAvailable: false,
      };
    }
  }

  async warmUp(): Promise<boolean> {
    if (!this.useLocalInference) {
      return false;
    }

    try {
      this.logger.log("Warming up IDM-VTON model...");

      const response = await this.inferenceClient.post(
        "/warmup",
        {},
        { timeout: 120000 },
      );

      this.logger.log("IDM-VTON model warmed up successfully");
      return response.data.success ?? true;
    } catch (error) {
      this.logger.error(
        `Failed to warm up IDM-VTON: ${this.getErrorMessage(error)}`,
      );
      return false;
    }
  }

  private getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const detail = error.response?.data;
      if (detail !== undefined) {
        const payload =
          typeof detail === "string" ? detail : JSON.stringify(detail);
        return `HTTP ${status ?? "unknown"}: ${payload}`;
      }
      return error.message;
    }
    return error instanceof Error ? error.message : String(error);
  }

  isLocalInferenceEnabled(): boolean {
    return this.useLocalInference;
  }

  getModelVersion(): string {
    return this.modelVersion;
  }

  getEndpoint(): string {
    return this.modelEndpoint;
  }
}
