import {
  BadRequestException,
  Controller,
  Get,
  HttpException,
  Logger,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import type { Response } from "express";

import { OptionalAuthGuard } from "../../modules/auth/guards/optional-auth.guard";

const LOCAL_STORAGE_HOSTS = new Set(["localhost", "127.0.0.1", "10.0.2.2"]);

@ApiTags("storage")
@Controller("storage")
@UseGuards(OptionalAuthGuard)
export class StorageController {
  private readonly logger = new Logger(StorageController.name);

  constructor(private readonly configService: ConfigService) {}

  @Get("proxy")
  @ApiOperation({ summary: "代理获取存储资源", description: "通过服务端代理访问 MinIO 存储中的签名资源，避免暴露存储凭证给客户端" })
  @ApiQuery({ name: "url", required: true, description: "存储资源的完整 URL", type: String })
  @ApiResponse({ status: 200, description: "成功返回资源内容" })
  @ApiResponse({ status: 400, description: "无效的 URL 或不允许的存储路径" })
  @ApiResponse({ status: 502, description: "上游存储服务不可用" })
  async proxySignedAsset(
    @Query("url") encodedUrl: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    if (!encodedUrl) {
      throw new BadRequestException("Missing asset url");
    }

    let targetUrl: URL;

    try {
      targetUrl = new URL(encodedUrl);
    } catch {
      throw new BadRequestException("Invalid asset url");
    }

    this.assertAllowedStorageUrl(targetUrl);

    const upstream = await fetch(targetUrl.toString());

    if (!upstream.ok) {
      throw new HttpException(
        `Failed to fetch storage asset: ${upstream.status}`,
        upstream.status,
      );
    }

    const body = Buffer.from(await upstream.arrayBuffer());
    const contentType =
      upstream.headers.get("content-type") ?? "application/octet-stream";
    const cacheControl =
      upstream.headers.get("cache-control") ?? "public, max-age=300";

    this.logger.log(
      `Proxying storage asset ${targetUrl.pathname} as ${contentType}`,
    );

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", cacheControl);
    res.send(body);
  }

  private assertAllowedStorageUrl(url: URL): void {
    const configuredEndpoint =
      this.configService.get<string>("MINIO_ENDPOINT") ?? "localhost";
    const allowedHosts = new Set([
      configuredEndpoint.toLowerCase(),
      ...LOCAL_STORAGE_HOSTS,
    ]);
    const expectedPort = this.configService.get<string>("MINIO_PORT", "9000");
    const expectedBucket = this.configService.get<string>("MINIO_BUCKET", "xuno");

    if (!allowedHosts.has(url.hostname.toLowerCase())) {
      throw new BadRequestException("Storage proxy host is not allowed");
    }

    if (url.port && url.port !== expectedPort) {
      throw new BadRequestException("Storage proxy port is not allowed");
    }

    if (!url.pathname.startsWith(`/${expectedBucket}/`)) {
      throw new BadRequestException("Storage proxy path is not allowed");
    }
  }
}
