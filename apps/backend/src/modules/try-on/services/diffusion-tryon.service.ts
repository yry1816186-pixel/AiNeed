import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";

export interface TryOnInput {
  personImage: Buffer;
  garmentImage: Buffer;
  category?: string;
  options?: {
    quality?: "speed" | "balanced" | "quality";
    preserveBackground?: boolean;
  };
}

export interface TryOnResult {
  resultImage: Buffer;
  confidence: number;
  processingTime: number;
  provider: string;
  metadata: {
    steps?: number;
    guidanceScale?: number;
    modelVersion?: string;
  };
}

export interface TryOnProvider {
  name: string;
  available: boolean;
  priority: number;
}

@Injectable()
export class DiffusionTryOnService {
  private readonly logger = new Logger(DiffusionTryOnService.name);

  private readonly fashnClient: AxiosInstance;
  private readonly replicateClient: AxiosInstance;
  private readonly kolorsClient: AxiosInstance;

  private readonly fashnApiKey: string | undefined;
  private readonly replicateApiKey: string | undefined;
  private readonly kolorsApiKey: string | undefined;

  private readonly providers: TryOnProvider[] = [];

  constructor(private configService: ConfigService) {
    this.fashnApiKey = this.configService.get<string>("FASHN_API_KEY");
    this.replicateApiKey = this.configService.get<string>("REPLICATE_API_KEY");
    this.kolorsApiKey = this.configService.get<string>("KOLORS_API_KEY");

    this.fashnClient = axios.create({
      baseURL: "https://api.fashn.ai",
      timeout: 120000,
      headers: this.fashnApiKey
        ? { Authorization: `Bearer ${this.fashnApiKey}` }
        : {},
    });

    this.replicateClient = axios.create({
      baseURL: "https://api.replicate.com/v1",
      timeout: 120000,
      headers: this.replicateApiKey
        ? {
            Authorization: `Token ${this.replicateApiKey}`,
            "Content-Type": "application/json",
          }
        : {},
    });

    this.kolorsClient = axios.create({
      baseURL: "https://api.kolors.com",
      timeout: 120000,
      headers: this.kolorsApiKey
        ? { Authorization: `Bearer ${this.kolorsApiKey}` }
        : {},
    });

    this.initializeProviders();
    this.logger.log("Diffusion Try-On Service initialized");
  }

  private initializeProviders(): void {
    if (this.fashnApiKey) {
      this.providers.push({ name: "fashn", available: true, priority: 1 });
      this.logger.log("Fashn.ai provider configured");
    }
    if (this.replicateApiKey) {
      this.providers.push({ name: "replicate", available: true, priority: 2 });
      this.logger.log("Replicate provider configured");
    }
    if (this.kolorsApiKey) {
      this.providers.push({ name: "kolors", available: true, priority: 3 });
      this.logger.log("Kolors provider configured");
    }

    this.providers.sort((a, b) => a.priority - b.priority);
  }

  async tryOn(input: TryOnInput): Promise<TryOnResult> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    if (this.providers.length === 0) {
      throw new Error("No diffusion try-on providers are configured");
    }

    for (const provider of this.providers) {
      if (!provider.available) {continue;}

      try {
        this.logger.log(`Trying ${provider.name} provider...`);
        const result = await this.executeWithProvider(provider.name, input);
        result.processingTime = Date.now() - startTime;
        this.logger.log(
          `${provider.name} succeeded in ${result.processingTime}ms`,
        );
        return result;
      } catch (error) {
        const providerError =
          error instanceof Error ? error : new Error("Unknown provider error");
        this.logger.warn(`${provider.name} failed: ${providerError.message}`);
        lastError = providerError;
      }
    }

    throw (
      lastError ||
      new Error("All configured diffusion try-on providers are unavailable")
    );
  }

  private async executeWithProvider(
    provider: string,
    input: TryOnInput,
  ): Promise<TryOnResult> {
    switch (provider) {
      case "fashn":
        return this.executeFashn(input);
      case "replicate":
        return this.executeReplicate(input);
      case "kolors":
        return this.executeKolors(input);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  private async executeFashn(input: TryOnInput): Promise<TryOnResult> {
    const personBase64 = input.personImage.toString("base64");
    const garmentBase64 = input.garmentImage.toString("base64");

    const response = await this.fashnClient.post("/tryon", {
      model_image: `data:image/jpeg;base64,${personBase64}`,
      garment_image: `data:image/jpeg;base64,${garmentBase64}`,
      category: input.category || "auto",
      mode: input.options?.quality || "balanced",
    });

    const resultData = response.data;

    let resultImage: Buffer;
    if (resultData.output_url) {
      const imageResponse = await axios.get(resultData.output_url, {
        responseType: "arraybuffer",
        timeout: 30000,
      });
      resultImage = Buffer.from(imageResponse.data);
    } else if (resultData.output) {
      const base64Data = resultData.output.replace(
        /^data:image\/\w+;base64,/,
        "",
      );
      resultImage = Buffer.from(base64Data, "base64");
    } else {
      throw new Error("No output from Fashn API");
    }

    return {
      resultImage,
      confidence: resultData.confidence || 0.85,
      processingTime: 0,
      provider: "fashn",
      metadata: {
        modelVersion: resultData.model_version || "fashn-v1",
      },
    };
  }

  private async executeReplicate(input: TryOnInput): Promise<TryOnResult> {
    const personBase64 = input.personImage.toString("base64");
    const garmentBase64 = input.garmentImage.toString("base64");

    const createResponse = await this.replicateClient.post("/predictions", {
      version:
        "c871bb9b046607b680449ecbae55fd8c6d945e0a1948644bf2361b3d021d3ff4",
      input: {
        human_img: `data:image/jpeg;base64,${personBase64}`,
        garm_img: `data:image/jpeg;base64,${garmentBase64}`,
        garment_des: input.category || "clothing",
        is_checked: true,
        is_checked_crop: false,
        denoise_steps: input.options?.quality === "quality" ? 30 : 15,
        seed: Math.floor(Math.random() * 1000000),
      },
    });

    const predictionId = createResponse.data.id;
    let result = createResponse.data;

    const maxWait = 120000;
    const startTime = Date.now();

    while (result.status !== "succeeded" && result.status !== "failed") {
      if (Date.now() - startTime > maxWait) {
        throw new Error("Replicate timeout");
      }

      await this.sleep(2000);

      const statusResponse = await this.replicateClient.get(
        `/predictions/${predictionId}`,
      );
      result = statusResponse.data;
    }

    if (result.status === "failed") {
      throw new Error(result.error || "Replicate prediction failed");
    }

    const outputUrl = Array.isArray(result.output)
      ? result.output[0]
      : result.output;

    const imageResponse = await axios.get(outputUrl, {
      responseType: "arraybuffer",
      timeout: 30000,
    });
    const resultImage = Buffer.from(imageResponse.data);

    return {
      resultImage,
      confidence: 0.85,
      processingTime: 0,
      provider: "replicate",
      metadata: {
        modelVersion: "idm-vton",
        steps: result.input?.denoise_steps || 15,
      },
    };
  }

  private async executeKolors(input: TryOnInput): Promise<TryOnResult> {
    const personBase64 = input.personImage.toString("base64");
    const garmentBase64 = input.garmentImage.toString("base64");

    const response = await this.kolorsClient.post("/api/v1/tryon", {
      person_image: personBase64,
      garment_image: garmentBase64,
      category: input.category || "upper_body",
    });

    const resultData = response.data;

    let resultImage: Buffer;
    if (resultData.result_url) {
      const imageResponse = await axios.get(resultData.result_url, {
        responseType: "arraybuffer",
        timeout: 30000,
      });
      resultImage = Buffer.from(imageResponse.data);
    } else if (resultData.result) {
      resultImage = Buffer.from(resultData.result, "base64");
    } else {
      throw new Error("No output from Kolors API");
    }

    return {
      resultImage,
      confidence: resultData.confidence || 0.8,
      processingTime: 0,
      provider: "kolors",
      metadata: {
        modelVersion: "kolors-v1",
      },
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getAvailableProviders(): string[] {
    return this.providers.filter((p) => p.available).map((p) => p.name);
  }

  hasProviders(): boolean {
    return this.providers.length > 0;
  }
}
