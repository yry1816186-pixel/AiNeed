/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";
import Opossum from "opossum";

import { StorageService } from "../../../../common/storage/storage.service";

import {
  TryOnProvider,
  TryOnRequest,
  TryOnResponse,
} from "./ai-tryon-provider.interface";

@Injectable()
export class DoubaoSeedreamProvider implements TryOnProvider {
  readonly name = "doubao-seedream";
  readonly priority = 1;

  private readonly logger = new Logger(DoubaoSeedreamProvider.name);
  private readonly apiKey: string;
  private readonly apiEndpoint: string;
  private readonly resultEndpoint: string;
  private readonly model: string;
  private readonly enabled: boolean;
  private readonly client: AxiosInstance;
  private readonly resultClient: AxiosInstance;
  private readonly circuitBreaker: Opossum<[TryOnRequest], TryOnResponse>;

  constructor(
    private configService: ConfigService,
    private storageService: StorageService,
  ) {
    this.apiKey = this.configService.get<string>("DOUBAO_SEEDREAM_API_KEY", "");
    this.apiEndpoint = this.configService.get<string>(
      "DOUBAO_SEEDREAM_API_URL",
      "https://visual.volcengineapi.com/v1/aigc/generate",
    );
    this.resultEndpoint = this.configService.get<string>(
      "DOUBAO_SEEDREAM_RESULT_URL",
      "https://visual.volcengineapi.com/v1/aigc/result",
    );
    this.model = this.configService.get<string>(
      "DOUBAO_SEEDREAM_MODEL",
      "doubao-seedream-3-0-t2i-250415",
    );
    this.enabled =
      this.configService.get<string>("DOUBAO_SEEDREAM_ENABLED", "false") ===
        "true" && !!this.apiKey;

    this.client = axios.create({
      baseURL: this.apiEndpoint,
      timeout: 25000,
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
    });

    this.resultClient = axios.create({
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
    });

    this.circuitBreaker = new Opossum(
      (req: TryOnRequest) => this.executeSeedreamInference(req),
      {
        timeout: 25000,
        errorThresholdPercentage: 50,
        resetTimeout: 60000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10,
        volumeThreshold: 3,
      },
    );

    this.circuitBreaker.on("open", () => {
      this.logger.warn("Doubao-Seedream circuit breaker OPENED");
    });
    this.circuitBreaker.on("halfOpen", () => {
      this.logger.log("Doubao-Seedream circuit breaker HALF-OPEN");
    });
    this.circuitBreaker.on("close", () => {
      this.logger.log("Doubao-Seedream circuit breaker CLOSED");
    });

    this.logger.log(
      `DoubaoSeedream Provider initialized. Enabled: ${this.enabled}, Model: ${this.model}`,
    );
  }

  async isAvailable(): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }
    if (this.circuitBreaker.opened) {
      return false;
    }
    return true;
  }

  async virtualTryOn(request: TryOnRequest): Promise<TryOnResponse> {
    return this.circuitBreaker.fire(request);
  }

  private async executeSeedreamInference(
    request: TryOnRequest,
  ): Promise<TryOnResponse> {
    const startTime = Date.now();

    const personImageBase64 = await this.fetchImageAsBase64(
      request.personImageUrl,
    );
    const garmentImageBase64 = await this.fetchImageAsBase64(
      request.garmentImageUrl,
    );

    const prompt = this.buildPrompt(request.category);

    const payload = {
      req_key: "high_aes_general_v21_L",
      model: this.model,
      parameters: {
        image: personImageBase64,
        ref_image: garmentImageBase64,
        prompt,
        strength: 0.75,
        seed: -1,
      },
    };

    const submitResponse = await this.client.post("", payload);

    const taskId =
      submitResponse.data?.data?.task_id ??
      submitResponse.data?.task_id;
    const status =
      submitResponse.data?.data?.status ??
      submitResponse.data?.status;

    let resultImageUrl: string | undefined;

    if (status === "succeeded" && submitResponse.data?.data?.results?.length > 0) {
      resultImageUrl = submitResponse.data.data.results[0].url;
    } else if (taskId) {
      resultImageUrl = await this.pollForResult(taskId);
    }

    if (!resultImageUrl) {
      throw new Error(
        "Doubao-Seedream API returned no result image",
      );
    }

    const finalUrl = await this.uploadResultToStorage(resultImageUrl);

    const processingTime = Date.now() - startTime;
    this.logger.log(
      `Doubao-Seedream try-on completed in ${processingTime}ms`,
    );

    return {
      resultImageUrl: finalUrl,
      processingTime,
      confidence: 0.85,
      provider: this.name,
      metadata: {
        model: this.model,
        category: request.category ?? "upper_body",
        taskId: taskId ?? "sync",
      },
    };
  }

  private buildPrompt(
    category?: TryOnRequest["category"],
  ): string {
    const categoryDesc: Record<string, string> = {
      upper_body: "上装",
      lower_body: "下装",
      dress: "连衣裙",
      full_body: "全身装",
    };
    const desc = categoryDesc[category ?? "upper_body"] ?? "服装";
    return `穿着这件${desc}的人物照片，保持人物面部和姿势不变，高质量真实感`;
  }

  private async pollForResult(taskId: string): Promise<string | undefined> {
    const maxAttempts = 10;
    const intervalMs = 2000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await this.sleep(intervalMs);

      try {
        const response = await this.resultClient.get(
          `${this.resultEndpoint}/${taskId}`,
        );

        const status =
          response.data?.data?.status ?? response.data?.status;
        const results =
          response.data?.data?.results ?? response.data?.results;

        if (status === "succeeded" && results?.length > 0) {
          return results[0].url;
        }

        if (status === "failed") {
          throw new Error(
            `Doubao-Seedream task ${taskId} failed: ${JSON.stringify(response.data)}`,
          );
        }

        this.logger.debug(
          `Polling Seedream task ${taskId}, attempt ${attempt + 1}, status: ${status}`,
        );
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("failed")
        ) {
          throw error;
        }
        this.logger.warn(
          `Poll attempt ${attempt + 1} failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    throw new Error(
      `Doubao-Seedream task ${taskId} timed out after ${maxAttempts} poll attempts`,
    );
  }

  private async uploadResultToStorage(imageUrl: string): Promise<string> {
    if (imageUrl.startsWith("data:image")) {
      const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
      const imageBuffer = Buffer.from(base64Data, "base64");
      const upload = await this.storageService.uploadImage(
        {
          fieldname: "file",
          originalname: `tryon-seedream-${Date.now()}.png`,
          encoding: "7bit",
          mimetype: "image/png",
          buffer: imageBuffer,
          size: imageBuffer.length,
        },
        "tryon-results",
      );
      return upload.url;
    }

    const imageBuffer = await this.downloadImage(imageUrl);
    const upload = await this.storageService.uploadImage(
      {
        fieldname: "file",
        originalname: `tryon-seedream-${Date.now()}.png`,
        encoding: "7bit",
        mimetype: "image/png",
        buffer: imageBuffer,
        size: imageBuffer.length,
      },
      "tryon-results",
    );
    return upload.url;
  }

  private async fetchImageAsBase64(imageUrl: string): Promise<string> {
    if (imageUrl.startsWith("data:image")) {
      return imageUrl.replace(/^data:image\/\w+;base64,/, "");
    }

    const response = await axios.get<ArrayBuffer>(imageUrl, {
      responseType: "arraybuffer",
      timeout: 30000,
      maxContentLength: 15 * 1024 * 1024,
      validateStatus: (status) => status >= 200 && status < 300,
    });

    return Buffer.from(response.data).toString("base64");
  }

  private async downloadImage(url: string): Promise<Buffer> {
    if (url.startsWith("data:image")) {
      const base64 = url.replace(/^data:image\/\w+;base64,/, "");
      return Buffer.from(base64, "base64");
    }

    const response = await axios.get<ArrayBuffer>(url, {
      responseType: "arraybuffer",
      timeout: 60000,
      maxContentLength: 15 * 1024 * 1024,
      validateStatus: (status) => status >= 200 && status < 300,
    });

    return Buffer.from(response.data);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
