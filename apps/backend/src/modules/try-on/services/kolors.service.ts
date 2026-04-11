import * as http from "http";
import * as https from "https";

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class KolorsService {
  private readonly logger = new Logger(KolorsService.name);
  private readonly apiKey: string;
  private readonly apiEndpoint: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>("KOLORS_API_KEY", "");
    this.apiEndpoint = this.configService.get<string>(
      "KOLORS_API_ENDPOINT",
      "https://api.kolors.com/v1/try-on",
    );
  }

  async virtualTryOn(
    userImageUrl: string,
    clothingImageUrl: string,
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error("Kolors API key not configured");
    }

    try {
      const response = await this.callKolorsApi({
        person_image: userImageUrl,
        garment_image: clothingImageUrl,
        category: "upper_body",
      });

      return response.result_image_url;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Kolors API call failed: ${message}`);
      throw new Error(message);
    }
  }

  private async callKolorsApi(payload: Record<string, unknown>): Promise<any> {
    const url = new URL(this.apiEndpoint);

    return new Promise((resolve, reject) => {
      const client = url.protocol === "https:" ? https : http;

      const req = client.request(
        {
          hostname: url.hostname,
          port: url.port || (url.protocol === "https:" ? 443 : 80),
          path: url.pathname,
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
            try {
              const parsed = JSON.parse(data);
              if (
                res.statusCode &&
                res.statusCode >= 200 &&
                res.statusCode < 300
              ) {
                resolve(parsed);
              } else {
                reject(new Error(parsed.message || "API request failed"));
              }
            } catch (parseError) {
              const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
              this.logger.error(
                `Failed to parse Kolors API response as JSON. Status: ${res.statusCode}. Raw response (truncated): ${data.substring(0, 200)}. Error: ${errorMessage}`,
              );
              reject(new Error(`Invalid JSON response from Kolors API: ${errorMessage}`));
            }
          });
        },
      );

      req.on("error", (error) => reject(error));
      req.write(JSON.stringify(payload));
      req.end();
    });
  }
}
