import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as Minio from "minio";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

/**
 * Multer 文件类型定义
 * 用于处理上传的文件
 */
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
  destination?: string;
  filename?: string;
  path?: string;
  stream?: NodeJS.ReadableStream;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly minioClient: Minio.Client;
  private readonly bucket: string;

  constructor(private configService: ConfigService) {
    const accessKey = this.configService.get<string>("MINIO_ACCESS_KEY");
    const secretKey = this.configService.get<string>("MINIO_SECRET_KEY");
    
    if (!accessKey || !secretKey) {
      throw new Error(
        "MINIO_ACCESS_KEY and MINIO_SECRET_KEY environment variables are required. " +
        "Please configure these in your .env file. " +
        "See .env.example for reference."
      );
    }
    
    const port = this.configService.get<string>("MINIO_PORT", "9000");
    const endpoint = this.configService.get<string>("MINIO_ENDPOINT");
    if (!endpoint) {
      throw new Error("MINIO_ENDPOINT environment variable is required");
    }
    
    this.minioClient = new Minio.Client({
      endPoint: endpoint,
      port: parseInt(port, 10) || 9000,
      useSSL:
        this.configService.get<string>("MINIO_USE_SSL", "false") === "true",
      accessKey,
      secretKey,
    });
    this.bucket = this.configService.get<string>("MINIO_BUCKET", "aineed");
    this.logger.log(`StorageService initialized with endpoint: ${endpoint}, bucket: ${this.bucket}`);
    this.ensureBucket();
  }

  private async ensureBucket() {
    try {
      const exists = await this.minioClient.bucketExists(this.bucket);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucket);
        this.logger.log(`Created bucket: ${this.bucket}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to ensure bucket: ${errorMessage}`);
    }
  }

  async uploadImage(
    file: MulterFile,
    folder: string = "uploads",
  ): Promise<{ url: string; thumbnailUrl?: string }> {
    const ext = file.originalname.split(".").pop() || "jpg";
    const filename = `${folder}/${uuidv4()}.${ext}`;

    await this.minioClient.putObject(
      this.bucket,
      filename,
      file.buffer,
      file.size,
      { "Content-Type": file.mimetype },
    );

    const url = await this.getFileUrl(filename);

    let thumbnailUrl: string | undefined;
    if (folder === "photos") {
      thumbnailUrl = await this.createThumbnail(file, filename);
    }

    return { url, thumbnailUrl };
  }

  private async createThumbnail(
    file: MulterFile,
    originalFilename: string,
  ): Promise<string | undefined> {
    try {
      const thumbnail = await sharp(file.buffer)
        .resize(300, 300, { fit: "cover" })
        .toBuffer();

      const thumbnailFilename = originalFilename.replace(
        /(\.\w+)$/,
        "-thumbnail$1",
      );

      await this.minioClient.putObject(
        this.bucket,
        thumbnailFilename,
        thumbnail,
        thumbnail.length,
        { "Content-Type": file.mimetype },
      );

      return await this.getFileUrl(thumbnailFilename);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create thumbnail: ${errorMessage}`);
      return undefined;
    }
  }

  /**
   * 上传临时文件（用于数据导出等场景）
   * @param filename 文件名（包含路径）
   * @param content 文件内容
   * @param expiresIn 过期时间（秒）
   * @returns 预签名下载 URL
   */
  async uploadTemporary(
    filename: string,
    content: Buffer,
    expiresIn: number = 7 * 24 * 60 * 60, // 默认 7 天
  ): Promise<string> {
    await this.minioClient.putObject(
      this.bucket,
      filename,
      content,
      content.length,
      { "Content-Type": "application/json" },
    );

    return this.getFileUrl(filename, expiresIn);
  }

  /**
   * 删除文件
   * @param filenameOrUrl 文件名或完整 URL
   */
  async delete(filenameOrUrl: string): Promise<void> {
    // 如果是完整 URL，提取文件名
    let filename = filenameOrUrl;
    try {
      const url = new URL(filenameOrUrl);
      // 从 URL 路径中提取文件名（移除开头的 /）
      filename = url.pathname.substring(1);
      // 如果有 bucket 名称在路径中，移除它
      if (filename.startsWith(`${this.bucket}/`)) {
        filename = filename.substring(this.bucket.length + 1);
      }
    } catch (error) {
      // 不是有效的 URL，记录并直接使用原始值作为文件名
      this.logger.debug(
        `Input '${filenameOrUrl.substring(0, 50)}...' is not a valid URL, treating as filename. Error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    await this.minioClient.removeObject(this.bucket, filename);
  }

  /**
   * 获取文件预签名 URL
   * @param filename 文件名
   * @param expiresIn 过期时间（秒）
   */
  async getFileUrl(
    filename: string,
    expiresIn: number = 86400,
  ): Promise<string> {
    return await this.minioClient.presignedUrl(
      "GET",
      this.bucket,
      filename,
      expiresIn,
    );
  }

  /**
   * 删除文件（旧方法，保持向后兼容）
   * @deprecated 使用 delete() 方法代替
   */
  async deleteFile(filename: string): Promise<void> {
    await this.delete(filename);
  }

  async fetchRemoteAsset(
    url: string,
  ): Promise<{
    body: Buffer;
    contentType: string;
    cacheControl: string;
  }> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch asset: ${response.status}`);
    }

    return {
      body: Buffer.from(await response.arrayBuffer()),
      contentType:
        response.headers.get("content-type") ?? "application/octet-stream",
      cacheControl:
        response.headers.get("cache-control") ?? "private, max-age=300",
    };
  }

  async fetchRemoteAssetDataUri(url: string): Promise<string> {
    const asset = await this.fetchRemoteAsset(url);
    return `data:${asset.contentType};base64,${asset.body.toString("base64")}`;
  }
}
