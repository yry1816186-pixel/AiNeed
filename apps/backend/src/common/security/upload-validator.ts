import { BadRequestException } from "@nestjs/common";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export interface ValidatedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export function validateImageFile(file: ValidatedFile): void {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype as typeof ALLOWED_MIME_TYPES[number])) {
    throw new BadRequestException("仅支持 JPEG、PNG 和 WebP 格式的图片");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new BadRequestException("图片大小不能超过 10MB");
  }

  if (!validateMagicBytes(file.buffer)) {
    throw new BadRequestException("文件内容与声明类型不匹配，可能存在安全风险");
  }
}

export function validateMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 4) {
    return false;
  }

  const jpegSignature = [0xff, 0xd8, 0xff];
  const pngSignature = [0x89, 0x50, 0x4e, 0x47];
  const webpSignature = [0x52, 0x49, 0x46, 0x46];

  const firstBytes = Array.from(buffer.slice(0, 4));

  const isJpeg = jpegSignature.every((byte, index) => firstBytes[index] === byte);
  const isPng = pngSignature.every((byte, index) => firstBytes[index] === byte);
  const isWebpRiff = webpSignature.every((byte, index) => firstBytes[index] === byte);

  if (isWebpRiff && buffer.length >= 12) {
    const webpMarker = buffer.slice(8, 12).toString("ascii");
    if (webpMarker === "WEBP") {
      return true;
    }
  }

  return isJpeg || isPng;
}

export function detectSvgPayload(buffer: Buffer): boolean {
  const content = buffer.toString("utf-8", 0, Math.min(buffer.length, 1024)).toLowerCase();
  return content.includes("<svg") && (content.includes("<script") || content.includes("onerror") || content.includes("onclick"));
}
