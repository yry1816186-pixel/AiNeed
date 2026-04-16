/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { createCanvas, Image, CanvasRenderingContext2D } from "canvas";
import { v4 as uuidv4 } from "uuid";

import { PrismaService } from "../../../../../../../common/prisma/prisma.service";
import { StorageService } from "../../../../../../../common/storage/storage.service";

export interface UserProfileSummary {
  nickname: string;
  avatar?: string;
  styleTypeName?: string;
  matchPercentage?: number;
  colorPalette?: string[];
}

/**
 * SharePosterService generates share poster images from templates and profile data.
 * Uses node-canvas for rendering (not Puppeteer per RESEARCH.md guidance).
 * Uploads generated PNG to MinIO via existing StorageService infrastructure.
 */
@Injectable()
export class SharePosterService {
  private readonly logger = new Logger(SharePosterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async generatePoster(userId: string, profileData: UserProfileSummary): Promise<string> {
    // Read active ShareTemplate from database
    const template = await this.prisma.shareTemplate.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    if (!template) {
      throw new NotFoundException("No active share template found");
    }

    const canvasWidth = 750;
    const canvasHeight = 1334;
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext("2d");

    // Draw background
    const layoutConfig = (template.layoutConfig as Record<string, unknown>) ?? {};
    const bgColor = (layoutConfig.backgroundColor as string) ?? "#FFFFFF";
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw style type and match percentage
    this.drawStyleInfo(ctx, profileData, layoutConfig);

    // Draw color palette circles
    this.drawColorPalette(ctx, profileData, layoutConfig);

    // Draw user avatar and nickname
    this.drawUserInfo(ctx, profileData, layoutConfig);

    // Draw QR code placeholder
    this.drawQrCodePlaceholder(ctx, layoutConfig);

    // Generate PNG buffer
    const buffer = canvas.toBuffer("image/png");

    // Upload to MinIO
    const posterId = uuidv4();
    const filename = `share-posters/${userId}/${posterId}.png`;

    await this.storageService.uploadBuffer(filename, buffer, "image/png");

    const url = await this.storageService.getFileUrl(filename);

    this.logger.log(`Generated share poster for user ${userId}: ${posterId}`);

    return url;
  }

  private drawStyleInfo(
    ctx: CanvasRenderingContext2D,
    profileData: UserProfileSummary,
    layoutConfig: Record<string, unknown>,
  ): void {
    const styleSection = (layoutConfig.styleSection as Record<string, unknown>) ?? {};

    ctx.fillStyle = (styleSection.titleColor as string) ?? "#333333";
    ctx.font = `bold ${(styleSection.titleFontSize as number) ?? 48}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const styleName = profileData.styleTypeName ?? "你的风格";
    ctx.fillText(styleName, 375, 300);

    if (profileData.matchPercentage !== undefined) {
      const matchText = `匹配度 ${profileData.matchPercentage}%`;
      ctx.fillStyle = (styleSection.matchColor as string) ?? "#666666";
      ctx.font = `${(styleSection.matchFontSize as number) ?? 32}px sans-serif`;
      ctx.fillText(matchText, 375, 360);
    }
  }

  private drawColorPalette(
    ctx: CanvasRenderingContext2D,
    profileData: UserProfileSummary,
    layoutConfig: Record<string, unknown>,
  ): void {
    const colors = profileData.colorPalette ?? [];
    if (colors.length === 0) {return;}

    const paletteSection = (layoutConfig.paletteSection as Record<string, unknown>) ?? {};
    const circleRadius = (paletteSection.circleRadius as number) ?? 30;
    const y = (paletteSection.y as number) ?? 500;
    const gap = (paletteSection.gap as number) ?? 80;
    const startX = 375 - ((colors.length - 1) * gap) / 2;

    for (let i = 0; i < colors.length; i++) {
      const cx = startX + i * gap;
      const color = colors[i] ?? "#CCCCCC";

      ctx.beginPath();
      ctx.arc(cx, y, circleRadius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.1)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  private drawUserInfo(
    ctx: CanvasRenderingContext2D,
    profileData: UserProfileSummary,
    layoutConfig: Record<string, unknown>,
  ): void {
    const userSection = (layoutConfig.userSection as Record<string, unknown>) ?? {};
    const avatarY = (userSection.avatarY as number) ?? 800;
    const nicknameY = (userSection.nicknameY as number) ?? 900;

    // Avatar placeholder (circle)
    const avatarRadius = (userSection.avatarRadius as number) ?? 50;
    ctx.beginPath();
    ctx.arc(375, avatarY, avatarRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#E0E0E0";
    ctx.fill();
    ctx.strokeStyle = "#CCCCCC";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Try to load avatar image
    if (profileData.avatar) {
      try {
        const img = new Image();
        img.src = profileData.avatar;
        ctx.save();
        ctx.beginPath();
        ctx.arc(375, avatarY, avatarRadius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, 375 - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
        ctx.restore();
      } catch {
        // Avatar load failed, keep placeholder
      }
    }

    // Nickname
    ctx.fillStyle = (userSection.nicknameColor as string) ?? "#333333";
    ctx.font = `${(userSection.nicknameFontSize as number) ?? 36}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(profileData.nickname ?? "用户", 375, nicknameY);
  }

  private drawQrCodePlaceholder(
    ctx: CanvasRenderingContext2D,
    layoutConfig: Record<string, unknown>,
  ): void {
    const qrSection = (layoutConfig.qrSection as Record<string, unknown>) ?? {};
    const qrSize = (qrSection.size as number) ?? 120;
    const qrY = (qrSection.y as number) ?? 1050;

    const qrX = (750 - qrSize) / 2;
    ctx.fillStyle = "#F5F5F5";
    ctx.fillRect(qrX, qrY, qrSize, qrSize);
    ctx.strokeStyle = "#DDDDDD";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(qrX, qrY, qrSize, qrSize);
    ctx.stroke();

    ctx.fillStyle = "#999999";
    ctx.font = "24px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("扫码下载", qrX + qrSize / 2, qrY + qrSize / 2);

    ctx.fillStyle = (qrSection.labelColor as string) ?? "#666666";
    ctx.font = "28px sans-serif";
    ctx.fillText("扫码下载寻裳App", 375, qrY + qrSize + 30);
  }
}
