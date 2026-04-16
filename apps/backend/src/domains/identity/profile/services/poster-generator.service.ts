import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ColorSeason } from "@prisma/client";
import { createCanvas, Image, CanvasRenderingContext2D } from "canvas";
import * as QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";

import { PrismaService } from "../../../../../../../common/prisma/prisma.service";
import { RedisService, RedisKeyBuilder } from "../../../../../../../common/redis/redis.service";
import { StorageService } from "../../../../../../../common/storage/storage.service";
import { ProfileService, BodyAnalysisResult, ColorAnalysisResult } from "../profile.service";
import { getTemplateByColorSeason, PosterTemplate, ColorSeasonConfig } from "../templates";

const COLOR_SEASON_DISPLAY_NAMES: Record<ColorSeason, string> = {
  [ColorSeason.spring_warm]: "春季暖型",
  [ColorSeason.spring_light]: "春季清型",
  [ColorSeason.summer_cool]: "夏季冷型",
  [ColorSeason.summer_light]: "夏季清型",
  [ColorSeason.autumn_warm]: "秋季暖型",
  [ColorSeason.autumn_deep]: "秋季深型",
  [ColorSeason.winter_cool]: "冬季冷型",
  [ColorSeason.winter_deep]: "冬季深型",
};

const QR_CODE_CONTENT = "https://xuno.app/download";
const FONT_FAMILY = "sans-serif";

@Injectable()
export class PosterGeneratorService {
  private readonly logger = new Logger(PosterGeneratorService.name);

  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private redisService: RedisService,
    private profileService: ProfileService,
  ) {}

  async generateProfilePoster(userId: string): Promise<{
    id: string;
    url: string;
    createdAt: Date;
  }> {
    const today = new Date().toISOString().slice(0, 10);
    const cacheKey = RedisKeyBuilder.cache("poster", `${userId}:${today}`);

    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        this.logger.warn(`Failed to parse cached poster for user ${userId}`);
      }
    }

    const [profile, bodyAnalysis, _colorAnalysis] = await Promise.all([
      this.profileService.getProfile(userId),
      this.profileService.getBodyAnalysis(userId),
      this.profileService.getColorAnalysis(userId),
    ]);

    if (!profile) {
      throw new NotFoundException("用户不存在");
    }

    const colorSeason = profile.profile?.colorSeason ?? null;
    const seasonConfig = getTemplateByColorSeason(colorSeason);
    const template = seasonConfig.template;

    const canvas = createCanvas(template.width, template.height);
    const ctx = canvas.getContext("2d");

    this.drawBackground(ctx, template);
    this.drawHeader(ctx, template, colorSeason);
    this.drawStyleTags(ctx, template, bodyAnalysis, seasonConfig);
    this.drawColorPalette(ctx, template, seasonConfig);
    this.drawBodyAdvice(ctx, template, bodyAnalysis);
    await this.drawQrCode(ctx, template);
    this.drawFooter(ctx, template);

    const buffer = canvas.toBuffer("image/png");

    const posterId = uuidv4();
    const filename = `posters/${userId}/${posterId}.png`;

    await this.storageService.uploadBuffer(filename, buffer, "image/png");

    const url = await this.storageService.getFileUrl(filename);

    const result = {
      id: posterId,
      url,
      createdAt: new Date(),
    };

    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const ttlMs = endOfDay.getTime() - now.getTime();

    await this.redisService.setWithTtl(cacheKey, JSON.stringify(result), ttlMs);

    return result;
  }

  async getPoster(userId: string, posterId: string): Promise<{
    id: string;
    url: string;
    createdAt: Date;
  }> {
    const today = new Date().toISOString().slice(0, 10);
    const cacheKey = RedisKeyBuilder.cache("poster", `${userId}:${today}`);

    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.id === posterId) {
          return parsed;
        }
      } catch {
        this.logger.warn(`Failed to parse cached poster for user ${userId}`);
      }
    }

    const filename = `posters/${userId}/${posterId}.png`;
    const exists = await this.storageService.fileExists(filename);
    if (!exists) {
      throw new NotFoundException(`海报不存在: ${posterId}`);
    }

    const url = await this.storageService.getFileUrl(filename);

    return {
      id: posterId,
      url,
      createdAt: new Date(),
    };
  }

  private drawBackground(ctx: CanvasRenderingContext2D, template: PosterTemplate): void {
    ctx.fillStyle = template.background;
    ctx.fillRect(0, 0, template.width, template.height);
  }

  private drawHeader(
    ctx: CanvasRenderingContext2D,
    template: PosterTemplate,
    colorSeason: ColorSeason | null,
  ): void {
    const { header } = template;

    this.drawRoundedRect(ctx, 0, header.y, template.width, header.height, 0, header.backgroundColor);
    ctx.fill();

    ctx.fillStyle = header.titleColor;
    ctx.font = `bold ${header.titleFontSize}px ${FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("我的风格画像", template.width / 2, header.y + header.height * 0.4);

    const seasonName = colorSeason
      ? COLOR_SEASON_DISPLAY_NAMES[colorSeason]
      : "春季型";
    ctx.fillStyle = header.subtitleColor;
    ctx.font = `${header.subtitleFontSize}px ${FONT_FAMILY}`;
    ctx.fillText(seasonName, template.width / 2, header.y + header.height * 0.65);
  }

  private drawStyleTags(
    ctx: CanvasRenderingContext2D,
    template: PosterTemplate,
    bodyAnalysis: BodyAnalysisResult,
    seasonConfig: ColorSeasonConfig,
  ): void {
    const { bodySection, styleTags } = template;
    const tags = bodyAnalysis.idealStyles.length > 0
      ? bodyAnalysis.idealStyles
      : ["待完善"];

    const sectionY = bodySection.y;
    const cardX = bodySection.paddingX;
    const cardWidth = template.width - bodySection.paddingX * 2;

    ctx.fillStyle = bodySection.cardBackgroundColor;
    this.drawRoundedRect(
      ctx,
      cardX,
      sectionY,
      cardWidth,
      this.calculateStyleTagsHeight(tags, template),
      bodySection.cardBorderRadius,
      bodySection.cardBackgroundColor,
    );
    ctx.fill();

    ctx.fillStyle = bodySection.labelColor;
    ctx.font = `bold ${bodySection.labelFontSize}px ${FONT_FAMILY}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("风格标签", cardX + bodySection.cardPadding, sectionY + bodySection.cardPadding);

    const tagsStartY = sectionY + bodySection.cardPadding + bodySection.labelFontSize + 12;
    const maxTagsPerRow = 3;
    const tagBackgroundColor = seasonConfig.template.header.backgroundColor;

    let currentX = cardX + bodySection.cardPadding;
    let currentY = tagsStartY;

    for (let i = 0; i < tags.length; i++) {
      const tagText = tags[i]!;
      ctx.font = `${styleTags.tagFontSize}px ${FONT_FAMILY}`;
      const textWidth = ctx.measureText(tagText).width;
      const tagWidth = textWidth + styleTags.tagPaddingH * 2;

      if (i > 0 && i % maxTagsPerRow === 0) {
        currentX = cardX + bodySection.cardPadding;
        currentY += styleTags.tagHeight + styleTags.tagGap;
      }

      ctx.fillStyle = tagBackgroundColor;
      this.drawRoundedRect(
        ctx,
        currentX,
        currentY,
        tagWidth,
        styleTags.tagHeight,
        styleTags.tagBorderRadius,
        tagBackgroundColor,
      );
      ctx.fill();

      ctx.fillStyle = "#FFFFFF";
      ctx.font = `${styleTags.tagFontSize}px ${FONT_FAMILY}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(tagText, currentX + tagWidth / 2, currentY + styleTags.tagHeight / 2);

      currentX += tagWidth + styleTags.tagGap;
    }
  }

  private calculateStyleTagsHeight(tags: string[], template: PosterTemplate): number {
    const { bodySection, styleTags } = template;
    const maxTagsPerRow = 3;
    const rows = Math.ceil(tags.length / maxTagsPerRow);
    const tagsStartY = bodySection.cardPadding + bodySection.labelFontSize + 12;
    const tagsHeight = rows * styleTags.tagHeight + (rows - 1) * styleTags.tagGap;
    return tagsStartY + tagsHeight + bodySection.cardPadding;
  }

  private drawColorPalette(
    ctx: CanvasRenderingContext2D,
    template: PosterTemplate,
    seasonConfig: ColorSeasonConfig,
  ): void {
    const { bodySection, colorPalette } = template;
    const { colorHexes, colorNames } = seasonConfig;

    const styleTagsHeight = this.calculateStyleTagsHeight(
      seasonConfig.colorNames,
      template,
    );
    const sectionY = bodySection.y + styleTagsHeight + bodySection.sectionGap;

    const cardX = bodySection.paddingX;
    const cardWidth = template.width - bodySection.paddingX * 2;
    const cardHeight = bodySection.cardPadding + bodySection.labelFontSize + 12 + colorPalette.swatchSize + 20 + bodySection.cardPadding;

    ctx.fillStyle = bodySection.cardBackgroundColor;
    this.drawRoundedRect(
      ctx,
      cardX,
      sectionY,
      cardWidth,
      cardHeight,
      bodySection.cardBorderRadius,
      bodySection.cardBackgroundColor,
    );
    ctx.fill();

    ctx.fillStyle = bodySection.labelColor;
    ctx.font = `bold ${bodySection.labelFontSize}px ${FONT_FAMILY}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("色彩调色板", cardX + bodySection.cardPadding, sectionY + bodySection.cardPadding);

    const swatchesStartY = sectionY + bodySection.cardPadding + bodySection.labelFontSize + 12;
    const totalSwatchesWidth = colorHexes.length * colorPalette.swatchSize + (colorHexes.length - 1) * colorPalette.swatchGap;
    let swatchX = cardX + (cardWidth - totalSwatchesWidth) / 2;

    for (let i = 0; i < colorHexes.length; i++) {
      const centerX = swatchX + colorPalette.swatchSize / 2;
      const centerY = swatchesStartY + colorPalette.swatchSize / 2;
      const radius = colorPalette.swatchSize / 2;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = colorHexes[i]!;
      ctx.fill();

      ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = colorPalette.labelColor;
      ctx.font = `18px ${FONT_FAMILY}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(colorNames[i]!, centerX, swatchesStartY + colorPalette.swatchSize + 4);

      swatchX += colorPalette.swatchSize + colorPalette.swatchGap;
    }
  }

  private drawBodyAdvice(
    ctx: CanvasRenderingContext2D,
    template: PosterTemplate,
    bodyAnalysis: BodyAnalysisResult,
  ): void {
    const { bodySection, bodyAdvice, colorPalette } = template;

    const styleTagsHeight = this.calculateStyleTagsHeight(
      bodyAnalysis.idealStyles.length > 0 ? bodyAnalysis.idealStyles : ["待完善"],
      template,
    );
    const colorCardHeight = bodySection.cardPadding + bodySection.labelFontSize + 12 + colorPalette.swatchSize + 20 + bodySection.cardPadding;
    const sectionY = bodySection.y + styleTagsHeight + bodySection.sectionGap + colorCardHeight + bodySection.sectionGap;

    const recommendations = bodyAnalysis.recommendations.length > 0
      ? bodyAnalysis.recommendations
      : [];

    const cardX = bodySection.paddingX;
    const cardWidth = template.width - bodySection.paddingX * 2;
    const cardHeight = bodySection.cardPadding + bodySection.labelFontSize + 12 +
      (recommendations.length > 0
        ? recommendations.length * bodyAdvice.lineHeight
        : bodyAdvice.lineHeight) +
      bodySection.cardPadding;

    ctx.fillStyle = bodySection.cardBackgroundColor;
    this.drawRoundedRect(
      ctx,
      cardX,
      sectionY,
      cardWidth,
      cardHeight,
      bodySection.cardBorderRadius,
      bodySection.cardBackgroundColor,
    );
    ctx.fill();

    ctx.fillStyle = bodySection.labelColor;
    ctx.font = `bold ${bodySection.labelFontSize}px ${FONT_FAMILY}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("体型适配建议", cardX + bodySection.cardPadding, sectionY + bodySection.cardPadding);

    const adviceStartY = sectionY + bodySection.cardPadding + bodySection.labelFontSize + 12;

    if (recommendations.length > 0) {
      for (let i = 0; i < recommendations.length; i++) {
        const rec = recommendations[i]!;
        const textY = adviceStartY + i * bodyAdvice.lineHeight;

        ctx.fillStyle = bodyAdvice.color;
        ctx.font = `${bodyAdvice.fontSize}px ${FONT_FAMILY}`;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";

        const label = `${rec.category}：`;
        const labelWidth = ctx.measureText(label).width;
        ctx.fillText(label, cardX + bodySection.cardPadding, textY);

        ctx.fillStyle = bodyAdvice.color;
        ctx.fillText(rec.advice, cardX + bodySection.cardPadding + labelWidth, textY);
      }
    } else {
      ctx.fillStyle = bodyAdvice.color;
      ctx.font = `${bodyAdvice.fontSize}px ${FONT_FAMILY}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("请先完善体型信息以获取适配建议", cardX + bodySection.cardPadding, adviceStartY);
    }
  }

  private async drawQrCode(
    ctx: CanvasRenderingContext2D,
    template: PosterTemplate,
  ): Promise<void> {
    const { qrCode } = template;

    try {
      const qrDataUrl = await QRCode.toDataURL(QR_CODE_CONTENT, {
        width: qrCode.size,
        margin: 1,
        color: {
          dark: "#333333",
          light: "#FFFFFF",
        },
      });

      const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, "");
      const qrBuffer = Buffer.from(base64Data, "base64");

      const img = new Image();
      img.src = qrBuffer;

      const qrX = (template.width - qrCode.size) / 2;
      ctx.drawImage(img, qrX, qrCode.y, qrCode.size, qrCode.size);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to generate QR code: ${errorMessage}`);

      const qrX = (template.width - qrCode.size) / 2;
      ctx.fillStyle = "#F0F0F0";
      ctx.fillRect(qrX, qrCode.y, qrCode.size, qrCode.size);
      ctx.fillStyle = "#999999";
      ctx.font = `${qrCode.labelFontSize}px ${FONT_FAMILY}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("扫码下载", qrX + qrCode.size / 2, qrCode.y + qrCode.size / 2);
    }

    ctx.fillStyle = qrCode.labelColor;
    ctx.font = `${qrCode.labelFontSize}px ${FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("扫码下载寻裳App", template.width / 2, qrCode.y + qrCode.size + 8);
  }

  private drawFooter(ctx: CanvasRenderingContext2D, template: PosterTemplate): void {
    const { footer } = template;

    ctx.fillStyle = footer.color;
    ctx.font = `${footer.fontSize}px ${FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText("寻裳 · AI 造型师", template.width / 2, footer.y);
  }

  private drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    _fillColor: string,
  ): void {
    ctx.beginPath();
    if (radius === 0) {
      ctx.rect(x, y, width, height);
    } else {
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.arcTo(x + width, y, x + width, y + radius, radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
      ctx.lineTo(x + radius, y + height);
      ctx.arcTo(x, y + height, x, y + height - radius, radius);
      ctx.lineTo(x, y + radius);
      ctx.arcTo(x, y, x + radius, y, radius);
    }
    ctx.closePath();
  }
}
