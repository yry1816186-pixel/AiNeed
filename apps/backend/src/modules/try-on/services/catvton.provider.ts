import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";

import { StorageService } from "../../../common/storage/storage.service";

import {
  TryOnProvider,
  TryOnRequest,
  TryOnResponse,
} from "./ai-tryon-provider.interface";

/**
 * CatVTON virtual try-on provider (ICLR 2025).
 *
 * Communicates with the local CatVTON inference server (catvton_server.py)
 * running on port 8001. Uses concatenation-based approach with SD 1.5
 * Inpainting as base, fitting within 8 GB VRAM.
 */
@Injectable()
export class CatVTONProvider implements TryOnProvider {
  readonly name = "catvton";
  readonly priority = 0;

  private readonly logger = new Logger(CatVTONProvider.name);
  private readonly inferenceClient: AxiosInstance;
  private readonly modelEndpoint: string;
  private readonly enabled: boolean;
  private readonly maxFetchBytes: number;

  constructor(
    private configService: ConfigService,
    private storageService: StorageService,
  ) {
    this.modelEndpoint = this.configService.get<string>(
      "CATVTON_ENDPOINT",
      "http://localhost:8001",
    );
    this.enabled =
      this.configService.get<string>("USE_CATVTON", "true") !== "false";
    this.maxFetchBytes = Number(
      this.configService.get<string>(
        "TRYON_LOCAL_PREVIEW_MAX_BYTES",
        String(15 * 1024 * 1024),
      ),
    );

    this.inferenceClient = axios.create({
      baseURL: this.modelEndpoint,
      timeout: 300000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.logger.log(
      `CatVTON Provider initialized. Enabled: ${this.enabled}, Endpoint: ${this.modelEndpoint}`,
    );
  }

  async isAvailable(): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    try {
      const response = await this.inferenceClient.get("/health", {
        timeout: 5000,
      });
      const modelLoaded = response.data?.model_loaded ?? false;
      if (!modelLoaded) {
        this.logger.debug(
          `CatVTON server reachable but model not loaded: ${response.data?.status ?? "unknown"}`,
        );
      }
      return modelLoaded;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      this.logger.debug(`CatVTON health check failed: ${message}`);
      return false;
    }
  }

  async virtualTryOn(request: TryOnRequest): Promise<TryOnResponse> {
    const startTime = Date.now();

    const personImageBase64 = await this.fetchImageAsBase64(
      request.personImageUrl,
    );
    const garmentImageBase64 = await this.fetchImageAsBase64(
      request.garmentImageUrl,
    );

    const category = this.mapCategory(request.category);

    const payload = {
      person_image: personImageBase64,
      garment_image: garmentImageBase64,
      category,
      num_inference_steps: 50,
      guidance_scale: 2.5,
      seed: -1,
    };

    const response = await this.inferenceClient.post("/tryon", payload);

    if (!response.data?.result_image) {
      throw new Error("CatVTON returned no result image");
    }

    const resultBase64 = response.data.result_image.replace(
      /^data:image\/\w+;base64,/,
      "",
    );
    const resultBuffer = Buffer.from(resultBase64, "base64");

    const upload = await this.storageService.uploadImage(
      {
        fieldname: "file",
        originalname: `tryon-catvton-${Date.now()}.png`,
        encoding: "7bit",
        mimetype: "image/png",
        buffer: resultBuffer,
        size: resultBuffer.length,
      },
      "tryon-results",
    );

    const processingTime = Date.now() - startTime;
    this.logger.log(
      `CatVTON inference + upload completed in ${processingTime}ms`,
    );

    return {
      resultImageUrl: upload.url,
      processingTime,
      confidence: 0.9,
      provider: this.name,
      metadata: {
        modelVersion: response.data.model_version ?? "catvton-mix",
        gpuUsed: response.data.gpu_used ?? true,
        category,
        inferenceTime: response.data.processing_time,
      },
    };
  }

  /**
   * Map the internal category names to CatVTON's expected values.
   * Internal:  upper_body | lower_body | full_body | dress
   * CatVTON:   upper      | lower      | overall
   */
  private mapCategory(
    category?: TryOnRequest["category"],
  ): "upper" | "lower" | "overall" {
    switch (category) {
      case "lower_body":
        return "lower";
      case "full_body":
      case "dress":
        return "overall";
      case "upper_body":
      default:
        return "upper";
    }
  }

  private async fetchImageAsBase64(imageUrl: string): Promise<string> {
    if (imageUrl.startsWith("data:image")) {
      return imageUrl.replace(/^data:image\/\w+;base64,/, "");
    }

    if (!this.isValidUrl(imageUrl)) {
      throw new Error(`Invalid or blocked URL: ${imageUrl}`);
    }

    const response = await axios.get<ArrayBuffer>(imageUrl, {
      responseType: "arraybuffer",
      timeout: 30000,
      maxContentLength: this.maxFetchBytes,
      validateStatus: (status) => status >= 200 && status < 300,
    });

    const contentType = String(response.headers["content-type"] ?? "");
    if (contentType && !contentType.startsWith("image/")) {
      throw new Error(`Invalid content type: ${contentType}`);
    }

    return Buffer.from(response.data).toString("base64");
  }

  private readonly ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
    "storage.aineed.com",
    "cdn.aineed.com",
    "minio",
  ];

  private isValidUrl(urlString: string): boolean {
    try {
      const parsedUrl = new URL(urlString);
      if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
        return false;
      }
      const hostname = parsedUrl.hostname;
      const isPrivateIp =
        /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.|0\.0\.0\.0|::1|fc00:|fe80:)/i.test(
          hostname,
        );
      if (isPrivateIp) {
        const isAllowed =
          hostname === "localhost" ||
          hostname === "127.0.0.1" ||
          hostname === "minio";
        if (!isAllowed) {
          this.logger.warn(`Blocked private IP access attempt: ${hostname}`);
          return false;
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  async warmUp(): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    try {
      this.logger.log("Warming up CatVTON model...");
      const response = await this.inferenceClient.post(
        "/warmup",
        {},
        { timeout: 120000 },
      );
      this.logger.log("CatVTON model warmed up successfully");
      return response.data?.success ?? true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to warm up CatVTON: ${message}`);
      return false;
    }
  }

  getStatus(): {
    enabled: boolean;
    endpoint: string;
  } {
    return {
      enabled: this.enabled,
      endpoint: this.modelEndpoint,
    };
  }
}
