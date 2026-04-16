import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";
import Opossum from "opossum";

import { StorageService } from '../../../../common/storage/storage.service";

import {
  TryOnProvider,
  TryOnRequest,
  TryOnResponse,
} from "./ai-tryon-provider.interface";

@Injectable()
export class GlmTryOnProvider implements TryOnProvider {
  readonly name = "glm-tryon";
  readonly priority = 2;

  private readonly logger = new Logger(GlmTryOnProvider.name);
  private readonly apiKey: string;
  private readonly apiEndpoint: string;
  private readonly model: string;
  private readonly enabled: boolean;
  private readonly client: AxiosInstance;
  private readonly circuitBreaker: Opossum<[TryOnRequest], TryOnResponse>;

  constructor(
    private configService: ConfigService,
    private storageService: StorageService,
  ) {
    this.apiKey = this.configService.get<string>("GLM_API_KEY", "") ||
      this.configService.get<string>("ZHIPU_API_KEY", "");
    this.apiEndpoint = this.configService.get<string>(
      "GLM_API_ENDPOINT",
      "https://open.bigmodel.cn/api/paas/v4",
    );
    this.model = this.configService.get<string>(
      "GLM_TRYON_MODEL",
      "glm-4v-plus",
    );
    this.enabled =
      this.configService.get<string>("GLM_TRYON_ENABLED", "false") ===
        "true" && !!this.apiKey;

    this.client = axios.create({
      baseURL: this.apiEndpoint,
      timeout: 20000,
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
    });

    this.circuitBreaker = new Opossum(
      (req: TryOnRequest) => this.executeGlmInference(req),
      {
        timeout: 20000,
        errorThresholdPercentage: 60,
        resetTimeout: 45000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10,
        volumeThreshold: 3,
      },
    );

    this.circuitBreaker.on("open", () => {
      this.logger.warn("GLM try-on circuit breaker OPENED");
    });
    this.circuitBreaker.on("halfOpen", () => {
      this.logger.log("GLM try-on circuit breaker HALF-OPEN");
    });
    this.circuitBreaker.on("close", () => {
      this.logger.log("GLM try-on circuit breaker CLOSED");
    });

    this.logger.log(
      `GLM TryOn Provider initialized. Enabled: ${this.enabled}, Model: ${this.model}`,
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

  private async executeGlmInference(
    request: TryOnRequest,
  ): Promise<TryOnResponse> {
    const startTime = Date.now();

    const personImageBase64 = await this.fetchImageAsBase64(
      request.personImageUrl,
    );
    const garmentImageBase64 = await this.fetchImageAsBase64(
      request.garmentImageUrl,
    );

    const categoryDesc = this.getCategoryDescription(request.category);
    const prompt = `请生成一张图片：将第二张图片中的${categoryDesc}穿在第一张图片的人物身上，保持人物面部和姿势不变，生成高质量真实感的换装效果图。`;

    const payload = {
      model: this.model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${personImageBase64}`,
              },
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${garmentImageBase64}`,
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
      max_tokens: 1024,
      temperature: 0.3,
    };

    const response = await this.client.post("/chat/completions", payload);

    const content =
      response.data?.choices?.[0]?.message?.content ?? "";

    let resultImageUrl: string | undefined;

    if (typeof content === "string" && content.includes("http")) {
      const urlMatch = content.match(
        /https?:\/\/[^\s"'<>]+\.(png|jpg|jpeg|webp)/i,
      );
      if (urlMatch) {
        resultImageUrl = urlMatch[0];
      }
    }

    if (Array.isArray(content)) {
      for (const item of content) {
        if (item.type === "image_url" && item.image_url?.url) {
          resultImageUrl = item.image_url.url;
          break;
        }
      }
    }

    if (!resultImageUrl) {
      this.logger.warn(
        "GLM returned text-only response, cannot generate try-on image",
      );
      throw new Error(
        "GLM try-on fallback returned text-only response, no image generated",
      );
    }

    const finalUrl = await this.uploadResultToStorage(resultImageUrl);

    const processingTime = Date.now() - startTime;
    this.logger.log(`GLM try-on completed in ${processingTime}ms`);

    return {
      resultImageUrl: finalUrl,
      processingTime,
      confidence: 0.6,
      provider: this.name,
      metadata: {
        model: this.model,
        category: request.category ?? "upper_body",
        fallback: true,
      },
    };
  }

  private getCategoryDescription(
    category?: TryOnRequest["category"],
  ): string {
    switch (category) {
      case "upper_body":
        return "上装";
      case "lower_body":
        return "下装";
      case "dress":
        return "连衣裙";
      case "full_body":
        return "全身装";
      default:
        return "服装";
    }
  }

  private async uploadResultToStorage(imageUrl: string): Promise<string> {
    if (imageUrl.startsWith("data:image")) {
      const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
      const imageBuffer = Buffer.from(base64Data, "base64");
      const upload = await this.storageService.uploadImage(
        {
          fieldname: "file",
          originalname: `tryon-glm-${Date.now()}.png`,
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
        originalname: `tryon-glm-${Date.now()}.png`,
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
}
