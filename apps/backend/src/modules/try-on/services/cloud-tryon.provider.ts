import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";
import Opossum from "opossum";

import { StorageService } from "../../../common/storage/storage.service";

import {
  TryOnProvider,
  TryOnRequest,
  TryOnResponse,
} from "./ai-tryon-provider.interface";

@Injectable()
export class CloudTryOnProvider implements TryOnProvider {
  readonly name = "cloud-tryon";
  readonly priority = 1;

  private readonly logger = new Logger(CloudTryOnProvider.name);
  private readonly apiKey: string;
  private readonly apiEndpoint: string;
  private readonly enabled: boolean;
  private readonly client: AxiosInstance;
  private readonly circuitBreaker: Opossum<[TryOnRequest], TryOnResponse>;

  constructor(
    private configService: ConfigService,
    private storageService: StorageService,
  ) {
    this.apiKey = this.configService.get<string>("CLOUD_TRYON_API_KEY", "");
    this.apiEndpoint = this.configService.get<string>(
      "CLOUD_TRYON_API_URL",
      "https://api.fashn.ai/v1/run",
    );
    this.enabled =
      this.configService.get<string>("CLOUD_TRYON_ENABLED", "false") === "true" &&
      !!this.apiKey;

    this.client = axios.create({
      baseURL: this.apiEndpoint,
      timeout: 120000,
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
    });

    this.circuitBreaker = new Opossum(
      (req: TryOnRequest) => this.executeCloudInference(req),
      {
        timeout: 60000,
        errorThresholdPercentage: 50,
        resetTimeout: 120000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10,
        volumeThreshold: 3,
      },
    );

    this.circuitBreaker.on("open", () => {
      this.logger.warn("Cloud try-on circuit breaker OPENED");
    });
    this.circuitBreaker.on("halfOpen", () => {
      this.logger.log("Cloud try-on circuit breaker HALF-OPEN");
    });
    this.circuitBreaker.on("close", () => {
      this.logger.log("Cloud try-on circuit breaker CLOSED");
    });

    this.logger.log(
      `CloudTryOn Provider initialized. Enabled: ${this.enabled}, Endpoint: ${this.apiEndpoint}`,
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

  private async executeCloudInference(request: TryOnRequest): Promise<TryOnResponse> {
    const startTime = Date.now();

    const personImageBase64 = await this.fetchImageAsBase64(request.personImageUrl);
    const garmentImageBase64 = await this.fetchImageAsBase64(request.garmentImageUrl);

    const category = this.mapCategory(request.category);

    const payload = {
      model_image: `data:image/jpeg;base64,${personImageBase64}`,
      garment_image: `data:image/png;base64,${garmentImageBase64}`,
      category,
      num_inference_steps: 30,
      guidance_scale: 2.5,
    };

    const response = await this.client.post("", payload);

    const resultImageUrl = response.data?.output?.[0] ?? response.data?.result_image_url ?? response.data?.result_image;

    if (!resultImageUrl) {
      throw new Error("Cloud try-on API returned no result image");
    }

    let finalUrl: string;
    if (resultImageUrl.startsWith("data:image") || resultImageUrl.startsWith("http")) {
      const imageBuffer = await this.downloadImage(resultImageUrl);
      const upload = await this.storageService.uploadImage(
        {
          fieldname: "file",
          originalname: `tryon-cloud-${Date.now()}.png`,
          encoding: "7bit",
          mimetype: "image/png",
          buffer: imageBuffer,
          size: imageBuffer.length,
        },
        "tryon-results",
      );
      finalUrl = upload.url;
    } else {
      const base64Data = resultImageUrl.replace(/^data:image\/\w+;base64,/, "");
      const imageBuffer = Buffer.from(base64Data, "base64");
      const upload = await this.storageService.uploadImage(
        {
          fieldname: "file",
          originalname: `tryon-cloud-${Date.now()}.png`,
          encoding: "7bit",
          mimetype: "image/png",
          buffer: imageBuffer,
          size: imageBuffer.length,
        },
        "tryon-results",
      );
      finalUrl = upload.url;
    }

    const processingTime = Date.now() - startTime;
    this.logger.log(`Cloud try-on completed in ${processingTime}ms`);

    return {
      resultImageUrl: finalUrl,
      processingTime,
      confidence: 0.8,
      provider: this.name,
      metadata: {
        category,
        apiEndpoint: this.apiEndpoint,
      },
    };
  }

  private mapCategory(
    category?: TryOnRequest["category"],
  ): string {
    switch (category) {
      case "lower_body":
        return "lower";
      case "full_body":
      case "dress":
        return "overall";
      default:
        return "upper";
    }
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
}
