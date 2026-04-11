import * as http from "http";
import * as https from "https";

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import {
  TryOnProvider,
  TryOnRequest,
  TryOnResponse,
} from "./ai-tryon-provider.interface";

/**
 * Kolors AI 虚拟试衣服务提供商
 * 基于快手 Kolors 模型的虚拟试衣 API 集成
 */
@Injectable()
export class KolorsProvider implements TryOnProvider {
  readonly name = "kolors";
  readonly priority = 1;

  private readonly logger = new Logger(KolorsProvider.name);
  private readonly apiKey: string;
  private readonly apiEndpoint: string;
  private readonly timeout: number;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>("KOLORS_API_KEY", "");
    this.apiEndpoint = this.configService.get<string>(
      "KOLORS_API_ENDPOINT",
      "https://api.kolors.com/v1/try-on",
    );
    this.timeout = this.configService.get<number>("KOLORS_TIMEOUT", 60000);
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async virtualTryOn(request: TryOnRequest): Promise<TryOnResponse> {
    const startTime = Date.now();

    if (!this.apiKey) {
      throw new Error("Kolors API key not configured");
    }

    const payload = {
      person_image: request.personImageUrl,
      garment_image: request.garmentImageUrl,
      category: request.category || "upper_body",
      hd: request.hd ?? false,
    };

    try {
      const response = await this.callApi(payload);

      return {
        resultImageUrl: response.result_image_url || response.data?.result_url,
        processingTime: Date.now() - startTime,
        confidence: response.confidence || 0.85,
        provider: this.name,
        rawResponse: response,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Kolors API call failed: ${errorMessage}`);
      throw error;
    }
  }

  private async callApi(payload: Record<string, unknown>): Promise<any> {
    const url = new URL(this.apiEndpoint);

    return new Promise((resolve, reject) => {
      const client = url.protocol === "https:" ? https : http;
      const timeoutId = setTimeout(() => {
        reject(new Error("Request timeout"));
      }, this.timeout);

      const req = client.request(
        {
          hostname: url.hostname,
          port: url.port || (url.protocol === "https:" ? 443 : 80),
          path: url.pathname + url.search,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            clearTimeout(timeoutId);
            try {
              const parsed = JSON.parse(data);
              if (
                res.statusCode &&
                res.statusCode >= 200 &&
                res.statusCode < 300
              ) {
                resolve(parsed);
              } else {
                reject(
                  new Error(parsed.message || `API error: ${res.statusCode}`),
                );
              }
            } catch (parseError) {
              const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
              this.logger.error(
                `Failed to parse Kolors provider response as JSON. Status: ${res.statusCode}. Raw response (truncated): ${data.substring(0, 200)}. Error: ${errorMessage}`,
              );
              reject(new Error(`Invalid JSON response from Kolors: ${errorMessage}`));
            }
          });
        },
      );

      req.on("error", (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
      req.write(JSON.stringify(payload));
      req.end();
    });
  }
}
