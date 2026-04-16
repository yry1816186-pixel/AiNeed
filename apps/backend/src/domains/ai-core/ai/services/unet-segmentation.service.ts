import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";

import { allowUnverifiedAiFallbacks } from "../../../../common/config/runtime-flags";

export interface SegmentationResult {
  mask: number[][];
  attributes: ClothingAttributes;
  boundingBox: BoundingBox;
  confidence: number;
}

export interface ClothingAttributes {
  category: string;
  subcategory: string;
  colors: string[];
  patterns: string[];
  styles: string[];
  materials: string[];
  sleeveLength: string;
  neckline: string;
  length: string;
  fit: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

@Injectable()
export class UNetSegmentationService {
  private readonly logger = new Logger(UNetSegmentationService.name);
  private aiClient: AxiosInstance;
  private readonly aiServiceUrl: string;
  private serviceAvailable = false;
  private readonly allowFallbacks: boolean;

  constructor(private configService: ConfigService) {
    this.allowFallbacks = allowUnverifiedAiFallbacks(this.configService);
    this.aiServiceUrl = this.configService.get<string>(
      "AI_SERVICE_URL",
      "http://localhost:8001",
    );

    this.aiClient = axios.create({
      baseURL: this.aiServiceUrl,
      timeout: 60000,
      headers: { "Content-Type": "application/json" },
    });

    this.checkServiceHealth();
  }

  private async checkServiceHealth(): Promise<void> {
    try {
      const response = await this.aiClient.get("/health", { timeout: 5000 });
      if (response.data?.status === "healthy") {
        this.serviceAvailable = true;
        this.logger.log("Python AI Service connected successfully");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Python AI Service not available for segmentation (${this.aiServiceUrl}): ${errorMessage}. Will use fallback if enabled.`,
      );
      this.serviceAvailable = false;
    }
  }

  async segmentClothing(imageBuffer: Buffer): Promise<SegmentationResult> {
    this.logger.log("Starting clothing segmentation");

    if (!this.serviceAvailable) {
      if (this.allowFallbacks) {
        return this.segmentWithFallback();
      }

      throw new ServiceUnavailableException(
        "Python AI Service is unavailable for segmentation",
      );
    }

    try {
      return await this.segmentWithPythonService(imageBuffer);
    } catch (error: unknown) {
      this.logger.error(
        `Python segmentation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (this.allowFallbacks) {
        return this.segmentWithFallback();
      }

      throw new ServiceUnavailableException("Clothing segmentation failed");
    }
  }

  private async segmentWithPythonService(
    imageBuffer: Buffer,
  ): Promise<SegmentationResult> {
    const base64 = imageBuffer.toString("base64");

    const response = await this.aiClient.post("/api/analyze/path", {
      image_base64: base64,
    });

    const data = response.data?.data;
    if (!data || !response.data?.success) {
      throw new Error("Invalid response from AI service");
    }

    const attributes = data.clothing || data;
    const mask = this.extractMask(data);

    if (mask.length === 0 || mask[0]?.length === 0) {
      throw new Error("AI service did not return a valid segmentation mask");
    }

    return {
      mask,
      attributes: {
        category: attributes.category || "tops",
        subcategory: this.inferSubcategory(
          attributes.category,
          attributes.style,
        ),
        colors: attributes.colors || [],
        patterns: this.extractPatterns(attributes),
        styles: attributes.style || [],
        materials: this.extractMaterials(attributes),
        sleeveLength: this.extractSleeveLength(attributes),
        neckline: this.extractNeckline(attributes),
        length: this.extractLength(attributes),
        fit: this.extractFit(attributes),
      },
      boundingBox: this.extractBoundingBox(mask),
      confidence: attributes.confidence || 0.85,
    };
  }

  private segmentWithFallback(): Promise<SegmentationResult> {
    this.logger.debug("Using fallback segmentation (rule-based)");

    const size = 512;
    const mask: number[][] = [];

    for (let y = 0; y < size; y++) {
      const row: number[] = [];
      for (let x = 0; x < size; x++) {
        const inCenter =
          x > size * 0.2 && x < size * 0.8 && y > size * 0.1 && y < size * 0.9;
        row.push(inCenter ? 1 : 0);
      }
      mask.push(row);
    }

    return Promise.resolve({
      mask,
      attributes: {
        category: "tops",
        subcategory: "t_shirt",
        colors: ["black"],
        patterns: ["solid"],
        styles: ["casual"],
        materials: ["cotton"],
        sleeveLength: "short",
        neckline: "round",
        length: "regular",
        fit: "regular",
      },
      boundingBox: {
        x: size * 0.2,
        y: size * 0.1,
        width: size * 0.6,
        height: size * 0.8,
      },
      confidence: 0.5,
    });
  }

  private extractMask(data: unknown): number[][] {
    if (
      typeof data === "object" &&
      data !== null &&
      "mask" in data &&
      Array.isArray((data as { mask?: unknown[] }).mask)
    ) {
      const rawMask = (data as { mask?: unknown[] }).mask || [];
      const normalizedMask = rawMask
        .filter((row): row is unknown[] => Array.isArray(row))
        .map((row) =>
          row.map((value) =>
            typeof value === "number" ? Number(value) : Number(Boolean(value)),
          ),
        );

      if (normalizedMask.length > 0) {
        return normalizedMask;
      }
    }

    return [];
  }

  private inferSubcategory(category: string, styles: string[] = []): string {
    const subcategories: Record<string, string[]> = {
      tops: ["t_shirt", "shirt", "blouse", "sweater", "hoodie"],
      bottoms: ["jeans", "trousers", "shorts", "skirt"],
      dresses: ["mini_dress", "midi_dress", "maxi_dress"],
      outerwear: ["jacket", "coat", "blazer", "cardigan"],
      footwear: ["sneakers", "boots", "heels", "flats"],
      accessories: ["bag", "hat", "scarf", "jewelry"],
    };

    const options = subcategories[category] ?? ["other"];
    return options[0] ?? "other";
  }

  private extractPatterns(attributes: Record<string, unknown>): string[] {
    const attrs = attributes.attributes as Record<string, unknown> | undefined;
    if (attrs?.pattern) {
      const pattern = attrs.pattern as Record<string, unknown>;
      if (pattern.type && typeof pattern.type === 'string') {
        return [pattern.type];
      }
    }
    return ["solid"];
  }

  private extractMaterials(attributes: Record<string, unknown>): string[] {
    const attrs = attributes.attributes as Record<string, unknown> | undefined;
    if (attrs?.material) {
      const material = attrs.material as Record<string, unknown>;
      if (material.type && typeof material.type === 'string') {
        return [material.type];
      }
    }
    return ["cotton"];
  }

  private extractSleeveLength(attributes: Record<string, unknown>): string {
    const attrs = attributes.attributes as Record<string, unknown> | undefined;
    if (attrs?.sleeve) {
      const sleeve = attrs.sleeve as Record<string, unknown>;
      if (sleeve.type && typeof sleeve.type === 'string') {
        return sleeve.type;
      }
    }
    return "short";
  }

  private extractNeckline(attributes: Record<string, unknown>): string {
    const attrs = attributes.attributes as Record<string, unknown> | undefined;
    if (attrs?.neckline) {
      const neckline = attrs.neckline as Record<string, unknown>;
      if (neckline.type && typeof neckline.type === 'string') {
        return neckline.type;
      }
    }
    return "round";
  }

  private extractLength(attributes: Record<string, unknown>): string {
    const attrs = attributes.attributes as Record<string, unknown> | undefined;
    if (attrs?.length) {
      const length = attrs.length as Record<string, unknown>;
      if (length.type && typeof length.type === 'string') {
        return length.type;
      }
    }
    return "regular";
  }

  private extractFit(attributes: Record<string, unknown>): string {
    const attrs = attributes.attributes as Record<string, unknown> | undefined;
    if (attrs?.fit) {
      const fit = attrs.fit as Record<string, unknown>;
      if (fit.type && typeof fit.type === 'string') {
        return fit.type;
      }
    }
    return "regular";
  }

  private extractBoundingBox(mask: number[][]): BoundingBox {
    const height = mask.length;
    const width = mask[0]?.length || 0;

    let minX = width,
      maxX = 0,
      minY = height,
      maxY = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const row = mask[y];
        if ((row?.[x] ?? 0) > 0) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }

    return {
      x: minX === width ? 0 : minX,
      y: minY === height ? 0 : minY,
      width: maxX - minX || width,
      height: maxY - minY || height,
    };
  }

  async extractFeatureVector(imageBuffer: Buffer): Promise<number[]> {
    if (this.serviceAvailable) {
      try {
        const base64 = imageBuffer.toString("base64");
        const response = await this.aiClient.post("/api/analyze/path", {
          image_base64: base64,
        });

        const embedding = response.data?.data?.embedding;
        if (embedding && Array.isArray(embedding)) {
          return embedding;
        }
      } catch (error: unknown) {
        this.logger.error(
          `Failed to extract embedding: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    if (this.allowFallbacks) {
      return this.generateDeterministicVector(imageBuffer.toString("base64"));
    }

    throw new ServiceUnavailableException(
      "AI embedding service is unavailable for segmentation features",
    );
  }

  async batchSegment(imageBuffers: Buffer[]): Promise<SegmentationResult[]> {
    return Promise.all(
      imageBuffers.map((buffer) => this.segmentClothing(buffer)),
    );
  }

  isServiceAvailable(): boolean {
    return this.serviceAvailable;
  }

  private generateDeterministicVector(seed: string): number[] {
    const vectorSize = 512;
    const vector: number[] = [];
    let current = this.simpleHash(seed);

    for (let i = 0; i < vectorSize; i++) {
      current = (current * 1103515245 + 12345) % 2147483648;
      vector.push(((current % 2000) - 1000) / 1000);
    }

    const norm = Math.sqrt(
      vector.reduce((sum, value) => sum + value * value, 0),
    );
    return norm === 0 ? vector : vector.map((value) => value / norm);
  }

  private simpleHash(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash = hash & hash;
    }

    return Math.abs(hash);
  }
}
