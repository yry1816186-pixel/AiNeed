import sharp from "sharp";

export function sanitizeImage(instance: sharp.Sharp): sharp.Sharp {
  return instance;
}

export async function stripExifFromBuffer(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer).toBuffer();
}
