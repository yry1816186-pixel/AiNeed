import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import sharp from "sharp";

import { sanitizeImage } from "../../../common/security/image-sanitizer";
import { StorageService } from "../../../common/storage/storage.service";

import {
  TryOnProvider,
  TryOnRequest,
  TryOnResponse,
} from "./ai-tryon-provider.interface";

@Injectable()
export class LocalPreviewTryOnProvider implements TryOnProvider {
  readonly name = "local-preview";
  readonly priority = 99;

  private readonly logger = new Logger(LocalPreviewTryOnProvider.name);
  private readonly enabled: boolean;
  private readonly maxFetchBytes: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
  ) {
    this.enabled =
      this.configService.get<string>("TRYON_LOCAL_PREVIEW_ENABLED", "true") !==
      "false";
    this.maxFetchBytes = Number(
      this.configService.get<string>(
        "TRYON_LOCAL_PREVIEW_MAX_BYTES",
        String(15 * 1024 * 1024),
      ),
    );
  }

  async isAvailable(): Promise<boolean> {
    return this.enabled;
  }

  async virtualTryOn(request: TryOnRequest): Promise<TryOnResponse> {
    if (!this.enabled) {
      throw new Error("Local preview provider is disabled");
    }

    const startedAt = Date.now();
    const [personImage, garmentImage] = await Promise.all([
      this.fetchImageBuffer(request.personImageUrl),
      this.fetchImageBuffer(request.garmentImageUrl),
    ]);

    const previewBuffer = await this.composePreview(
      personImage,
      garmentImage,
      request.category,
    );

    const upload = await this.storageService.uploadImage(
      {
        fieldname: "file",
        originalname: `tryon-preview-${Date.now()}.png`,
        encoding: "7bit",
        mimetype: "image/png",
        buffer: previewBuffer,
        size: previewBuffer.length,
      },
      "tryon-results",
    );

    const processingTime = Date.now() - startedAt;
    this.logger.log(`Generated local try-on preview in ${processingTime}ms`);

    return {
      resultImageUrl: upload.url,
      processingTime,
      confidence: 0.42,
      provider: this.name,
      metadata: {
        mode: "preview",
        category: request.category ?? "upper_body",
      },
    };
  }

  private async fetchImageBuffer(imageUrl: string): Promise<Buffer> {
    if (imageUrl.startsWith("data:image")) {
      const base64 = imageUrl.replace(/^data:image\/\w+;base64,/, "");
      return Buffer.from(base64, "base64");
    }

    const response = await axios.get<ArrayBuffer>(imageUrl, {
      responseType: "arraybuffer",
      timeout: 30000,
      maxContentLength: this.maxFetchBytes,
      validateStatus: (status) => status >= 200 && status < 300,
    });

    const contentType = String(response.headers["content-type"] ?? "");
    if (contentType && !contentType.startsWith("image/")) {
      throw new Error(`Unsupported image content type: ${contentType}`);
    }

    return Buffer.from(response.data);
  }

  private async composePreview(
    personImage: Buffer,
    garmentImage: Buffer,
    category?: TryOnRequest["category"],
  ): Promise<Buffer> {
    const canvasWidth = 768;
    const canvasHeight = 1024;
    const placement = this.getPlacement(category, canvasWidth, canvasHeight);

    const personCanvas = await sanitizeImage(sharp(personImage, { failOn: "none" }))
      .rotate()
      .resize(canvasWidth, canvasHeight, {
        fit: "cover",
        position: "centre",
      })
      .png()
      .toBuffer();

    const garmentOverlay = await sanitizeImage(sharp(garmentImage, { failOn: "none" }))
      .rotate()
      .resize(placement.width, placement.height, {
        fit: "contain",
        withoutEnlargement: true,
      })
      .ensureAlpha()
      .png()
      .toBuffer();

    const transparentGarment =
      await this.makeNearWhitePixelsTransparent(garmentOverlay);

    const previewBadge = Buffer.from(
      `<svg width="160" height="48" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="160" height="48" rx="24" fill="rgba(17,24,39,0.78)" />
        <text x="80" y="30" text-anchor="middle" font-size="18" fill="#FFFFFF"
          font-family="Arial, Helvetica, sans-serif" font-weight="700">PREVIEW</text>
      </svg>`,
    );

    return sanitizeImage(sharp(personCanvas))
      .composite([
        {
          input: transparentGarment,
          left: placement.left,
          top: placement.top,
          blend: "over",
        },
        {
          input: previewBadge,
          top: 24,
          left: canvasWidth - 184,
          blend: "over",
        },
      ])
      .png()
      .toBuffer();
  }

  private getPlacement(
    category: TryOnRequest["category"],
    canvasWidth: number,
    canvasHeight: number,
  ): { left: number; top: number; width: number; height: number } {
    switch (category) {
      case "lower_body":
        return {
          left: Math.round(canvasWidth * 0.24),
          top: Math.round(canvasHeight * 0.46),
          width: Math.round(canvasWidth * 0.52),
          height: Math.round(canvasHeight * 0.42),
        };
      case "dress":
      case "full_body":
        return {
          left: Math.round(canvasWidth * 0.2),
          top: Math.round(canvasHeight * 0.18),
          width: Math.round(canvasWidth * 0.6),
          height: Math.round(canvasHeight * 0.68),
        };
      case "upper_body":
      default:
        return {
          left: Math.round(canvasWidth * 0.22),
          top: Math.round(canvasHeight * 0.16),
          width: Math.round(canvasWidth * 0.56),
          height: Math.round(canvasHeight * 0.36),
        };
    }
  }

  private async makeNearWhitePixelsTransparent(
    imageBuffer: Buffer,
  ): Promise<Buffer> {
    const { data, info } = await sanitizeImage(sharp(imageBuffer))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    for (let index = 0; index < data.length; index += 4) {
      const red = data[index] ?? 0;
      const green = data[index + 1] ?? 0;
      const blue = data[index + 2] ?? 0;
      const alpha = data[index + 3] ?? 0;
      const brightness = (red + green + blue) / 3;
      const spread = Math.max(red, green, blue) - Math.min(red, green, blue);

      if (brightness > 245 && spread < 18) {
        data[index + 3] = 0;
        continue;
      }

      if (brightness > 230 && spread < 24) {
        data[index + 3] = Math.round(alpha * 0.18);
        continue;
      }

      data[index + 3] = Math.round(alpha * 0.9);
    }

    return sanitizeImage(sharp(data, { raw: info })).png().toBuffer();
  }
}
