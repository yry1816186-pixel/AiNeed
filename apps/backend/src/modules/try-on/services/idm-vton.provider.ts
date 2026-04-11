import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";

import {
  TryOnProvider,
  TryOnRequest,
  TryOnResponse,
} from "./ai-tryon-provider.interface";

@Injectable()
export class IDMVTONProvider implements TryOnProvider {
  readonly name = "idm-vton";
  readonly priority = 0;

  private readonly logger = new Logger(IDMVTONProvider.name);
  private readonly inferenceClient: AxiosInstance;
  private readonly modelEndpoint: string;
  private readonly enabled: boolean;
  private available: boolean = false;

  constructor(private configService: ConfigService) {
    this.modelEndpoint = this.configService.get<string>(
      "IDM_VTON_ENDPOINT",
      "http://localhost:8002",
    );
    this.enabled =
      this.configService.get<string>("USE_LOCAL_IDM_VTON", "false") === "true";

    this.inferenceClient = axios.create({
      baseURL: this.modelEndpoint,
      timeout: 300000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (this.enabled) {
      this.checkAvailability();
    }

    this.logger.log(
      `IDM-VTON Provider initialized. Enabled: ${this.enabled}, Endpoint: ${this.modelEndpoint}`,
    );
  }

  async isAvailable(): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    try {
      const response = await this.inferenceClient.get("/status", {
        timeout: 5000,
      });
      this.available = response.data?.available ?? false;
      if (!this.available && response.data?.status_message) {
        this.logger.warn(
          `IDM-VTON unavailable: ${response.data.status_message}`,
        );
      }
      return this.available;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.debug(
        `IDM-VTON service status check failed: ${errorMessage}`,
      );
      this.available = false;
      return false;
    }
  }

  async virtualTryOn(request: TryOnRequest): Promise<TryOnResponse> {
    const startTime = Date.now();

    try {
      const personImageBase64 = await this.fetchImageAsBase64(
        request.personImageUrl,
      );
      const garmentImageBase64 = await this.fetchImageAsBase64(
        request.garmentImageUrl,
      );

      const payload = {
        person_image: personImageBase64,
        garment_image: garmentImageBase64,
        category: request.category || "upper_body",
        denoise_steps: 30,
        seed: Math.floor(Math.random() * 1000000),
        guidance_scale: 2.5,
      };

      const response = await this.inferenceClient.post("/inference", payload);

      if (!response.data.result_image) {
        throw new Error("No result image in response");
      }

      const processingTime = Date.now() - startTime;

      this.logger.log(`IDM-VTON inference completed in ${processingTime}ms`);

      return {
        resultImageUrl: response.data.result_image,
        provider: this.name,
        processingTime,
        metadata: {
          modelVersion: "idm-vton-v1.0",
          gpuUsed: response.data.gpu_used ?? true,
          steps: payload.denoise_steps,
        },
      };
    } catch (error) {
      this.logger.error(
        `IDM-VTON inference failed: ${this.getErrorMessage(error)}`,
      );
      throw error;
    }
  }

  private readonly ALLOWED_DOMAINS = [
    "localhost",
    "127.0.0.1",
    "storage.aineed.com",
    "cdn.aineed.com",
    "minio",
  ];

  private readonly MAX_IMAGE_SIZE = 10 * 1024 * 1024;

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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.debug(`URL validation failed for '${urlString.substring(0, 100)}': ${errorMessage}`);
      return false;
    }
  }

  private async fetchImageAsBase64(imageUrl: string): Promise<string> {
    if (imageUrl.startsWith("data:image")) {
      return imageUrl.replace(/^data:image\/\w+;base64,/, "");
    }

    if (!this.isValidUrl(imageUrl)) {
      throw new Error(`Invalid or blocked URL: ${imageUrl}`);
    }

    const response = await axios.get(imageUrl, {
      responseType: "arraybuffer",
      timeout: 30000,
      maxContentLength: this.MAX_IMAGE_SIZE,
      validateStatus: (status) => status >= 200 && status < 300,
    });

    const contentType = response.headers["content-type"];
    if (contentType && !contentType.startsWith("image/")) {
      throw new Error(`Invalid content type: ${contentType}`);
    }

    return Buffer.from(response.data).toString("base64");
  }

  private async checkAvailability(): Promise<void> {
    try {
      const available = await this.isAvailable();
      if (available) {
        this.logger.log("IDM-VTON model is available and ready");
      } else {
        this.logger.warn("IDM-VTON model is not available");
      }
    } catch (error) {
      this.logger.error(
        `Failed to check IDM-VTON availability: ${this.getErrorMessage(error)}`,
      );
    }
  }

  async warmUp(): Promise<boolean> {
    if (!this.enabled) {
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
      return response.data?.success ?? true;
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

  getStatus(): {
    enabled: boolean;
    available: boolean;
    endpoint: string;
  } {
    return {
      enabled: this.enabled,
      available: this.available,
      endpoint: this.modelEndpoint,
    };
  }
}
