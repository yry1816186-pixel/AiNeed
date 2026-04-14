import { lookup } from "dns/promises";
import { isIP } from "net";

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth, ApiResponse, ApiQuery, ApiParam } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import axios from "axios";

import { OptionalAuthGuard } from "../auth/guards/optional-auth.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

import { SearchService } from "./search.service";
import { VisualSearchService } from "./services/visual-search.service";

@ApiTags("search")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("search")
export class SearchController {
  constructor(
    private searchService: SearchService,
    private visualSearchService: VisualSearchService,
  ) {}

  @Get()
  @ApiOperation({ summary: "搜索商品", description: "根据关键词搜索服装商品，支持分类、价格区间、排序和分页。" })
  @ApiQuery({ name: "q", required: true, type: String, description: "搜索关键词", example: "连衣裙" })
  @ApiQuery({ name: "category", required: false, type: String, description: "服装分类筛选" })
  @ApiQuery({ name: "minPrice", required: false, type: Number, description: "最低价格筛选（元）" })
  @ApiQuery({ name: "maxPrice", required: false, type: Number, description: "最高价格筛选（元）" })
  @ApiQuery({ name: "sortBy", required: false, enum: ["relevance", "price_asc", "price_desc", "popular"], description: "排序方式" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码，默认1", example: 1 })
  @ApiQuery({ name: "limit", required: false, type: Number, description: "每页数量，默认20", example: 20 })
  @ApiResponse({ status: 200, description: "搜索结果列表" })
  @ApiResponse({ status: 401, description: "未授权，需要提供有效的 Access Token" })
  async search(
    @Query("q") query: string,
    @Query("category") category?: string,
    @Query("minPrice") minPrice?: string,
    @Query("maxPrice") maxPrice?: string,
    @Query("sortBy")
    sortBy?: "relevance" | "price_asc" | "price_desc" | "popular",
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.searchService.searchItems(query, {
      category,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      sortBy,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Post("image")
  @UseGuards(OptionalAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "以图搜图 - 上传图片搜索", description: "上传图片进行视觉相似搜索，支持 JPEG、PNG、WebP 格式，最大 10MB。" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary", description: "图片文件（支持 JPEG、PNG、WebP 格式，最大 10MB）" },
      },
      required: ["file"],
    },
  })
  @ApiQuery({ name: "category", required: false, type: String, description: "服装分类筛选" })
  @ApiQuery({ name: "minPrice", required: false, type: Number, description: "最低价格筛选（元）" })
  @ApiQuery({ name: "maxPrice", required: false, type: Number, description: "最高价格筛选（元）" })
  @ApiQuery({ name: "limit", required: false, type: Number, description: "返回数量，默认20", example: 20 })
  @ApiResponse({ status: 200, description: "视觉搜索结果列表" })
  @ApiResponse({ status: 400, description: "请上传图片文件或图片格式/大小不符合要求" })
  @UseInterceptors(FileInterceptor("file"))
  async searchByImageUpload(
    @UploadedFile() file: Express.Multer.File,
    @Query("category") category?: string,
    @Query("minPrice") minPrice?: string,
    @Query("maxPrice") maxPrice?: string,
    @Query("limit") limit?: string,
  ) {
    if (!file) {
      throw new BadRequestException("请上传图片文件");
    }

    // 验证文件类型
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException("仅支持 JPEG、PNG 和 WebP 格式的图片");
    }

    // 验证文件大小
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException("图片大小不能超过 10MB");
    }

    return this.visualSearchService.searchByImage(file.buffer, {
      category,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Post("image/url")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: "以图搜图 - 通过图片URL搜索", description: "通过图片URL进行视觉相似搜索，仅支持公网可访问的图片地址。" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        imageUrl: { type: "string", description: "图片URL地址", example: "https://example.com/dress.jpg" },
      },
      required: ["imageUrl"],
    },
  })
  @ApiQuery({ name: "category", required: false, type: String, description: "服装分类筛选" })
  @ApiQuery({ name: "minPrice", required: false, type: Number, description: "最低价格筛选（元）" })
  @ApiQuery({ name: "maxPrice", required: false, type: Number, description: "最高价格筛选（元）" })
  @ApiQuery({ name: "limit", required: false, type: Number, description: "返回数量，默认20", example: 20 })
  @ApiResponse({ status: 200, description: "视觉搜索结果列表" })
  @ApiResponse({ status: 400, description: "图片URL无效或无法访问" })
  @ApiResponse({ status: 401, description: "未授权，需要提供有效的 Access Token" })
  async searchByImageUrl(
    @Body() body: { imageUrl: string },
    @Query("category") category?: string,
    @Query("minPrice") minPrice?: string,
    @Query("maxPrice") maxPrice?: string,
    @Query("limit") limit?: string,
  ) {
    if (!body.imageUrl) {
      throw new BadRequestException("请提供图片URL");
    }

    const imageBuffer = await this.downloadRemoteImage(body.imageUrl);

    return this.visualSearchService.searchByImage(imageBuffer, {
      category,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get("suggestions")
  @ApiOperation({ summary: "获取搜索建议", description: "根据输入的关键词前缀返回搜索建议列表。" })
  @ApiQuery({ name: "q", required: true, type: String, description: "搜索关键词前缀", example: "连衣" })
  @ApiQuery({ name: "limit", required: false, type: Number, description: "返回数量，默认10", example: 10 })
  @ApiResponse({ status: 200, description: "搜索建议列表" })
  @ApiResponse({ status: 401, description: "未授权，需要提供有效的 Access Token" })
  async getSuggestions(
    @Query("q") query: string,
    @Query("limit") limit?: string,
  ) {
    return this.searchService.getSearchSuggestions(
      query,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get("similar/:id")
  @ApiOperation({ summary: "获取相似商品", description: "根据指定商品ID查找视觉相似的商品。" })
  @ApiParam({ name: "id", description: "商品ID", type: String, format: "uuid" })
  @ApiQuery({ name: "limit", required: false, type: Number, description: "返回数量，默认10", example: 10 })
  @ApiResponse({ status: 200, description: "相似商品列表" })
  @ApiResponse({ status: 401, description: "未授权，需要提供有效的 Access Token" })
  @ApiResponse({ status: 404, description: "商品不存在" })
  async getSimilarItems(
    @Param("id") itemId: string,
    @Query("limit") limit?: string,
  ) {
    return this.visualSearchService.findSimilarItems(
      itemId,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get("trending")
  @ApiOperation({ summary: "获取热门搜索", description: "获取当前热门搜索关键词列表，基于全平台搜索统计。" })
  @ApiQuery({ name: "limit", required: false, type: Number, description: "返回数量，默认10", example: 10 })
  @ApiResponse({ status: 200, description: "热门搜索关键词列表" })
  @ApiResponse({ status: 401, description: "未授权，需要提供有效的 Access Token" })
  async getTrendingSearches(@Query("limit") limit?: string) {
    // 返回热门搜索关键词
    const trendingKeywords = [
      "连衣裙",
      "西装外套",
      "牛仔裤",
      "白色衬衫",
      "运动鞋",
      "针织衫",
      "风衣",
      "半身裙",
      "T恤",
      "卫衣",
    ];

    return {
      keywords: trendingKeywords.slice(0, limit ? parseInt(limit, 10) : 10),
      updatedAt: new Date().toISOString(),
    };
  }

  @Get("categories")
  @ApiOperation({ summary: "获取搜索分类", description: "获取搜索可用的服装分类列表，包含分类ID、名称和图标。" })
  @ApiResponse({ status: 200, description: "搜索分类列表" })
  @ApiResponse({ status: 401, description: "未授权，需要提供有效的 Access Token" })
  async getSearchCategories() {
    return {
      categories: [
        { id: "tops", name: "上衣", icon: "shirt" },
        { id: "bottoms", name: "下装", icon: "pants" },
        { id: "dresses", name: "连衣裙", icon: "dress" },
        { id: "outerwear", name: "外套", icon: "jacket" },
        { id: "footwear", name: "鞋履", icon: "shoe" },
        { id: "accessories", name: "配饰", icon: "accessory" },
        { id: "activewear", name: "运动装", icon: "sport" },
        { id: "swimwear", name: "泳装", icon: "swim" },
      ],
    };
  }

  private async downloadRemoteImage(imageUrl: string): Promise<Buffer> {
    const parsedUrl = this.parseRemoteImageUrl(imageUrl);
    await this.ensurePublicHostname(parsedUrl.hostname);

    const response = await axios.get<ArrayBuffer>(parsedUrl.toString(), {
      responseType: "arraybuffer",
      timeout: 10000,
      maxContentLength: 10 * 1024 * 1024,
      maxBodyLength: 10 * 1024 * 1024,
      maxRedirects: 0,
      headers: {
        Accept: "image/*",
      },
      validateStatus: (status) => status >= 200 && status < 300,
    });

    const contentType = response.headers["content-type"] || "";
    if (!contentType.startsWith("image/")) {
      throw new BadRequestException("远程资源不是图片");
    }

    const buffer = Buffer.from(response.data);
    if (buffer.length === 0) {
      throw new BadRequestException("远程图片为空");
    }

    return buffer;
  }

  private parseRemoteImageUrl(imageUrl: string): URL {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(imageUrl);
    } catch {
      throw new BadRequestException("图片URL格式无效");
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new BadRequestException("仅支持 HTTP 或 HTTPS 图片URL");
    }

    return parsedUrl;
  }

  private async ensurePublicHostname(hostname: string): Promise<void> {
    const normalizedHostname = hostname.toLowerCase();
    if (
      normalizedHostname === "localhost" ||
      normalizedHostname.endsWith(".local") ||
      normalizedHostname.endsWith(".internal")
    ) {
      throw new BadRequestException("不允许访问内网或本地地址");
    }

    const addresses =
      isIP(normalizedHostname) > 0
        ? [{ address: normalizedHostname }]
        : await lookup(normalizedHostname, { all: true });

    if (addresses.length === 0) {
      throw new BadRequestException("无法解析图片URL地址");
    }

    for (const entry of addresses) {
      if (this.isPrivateAddress(entry.address)) {
        throw new BadRequestException("不允许访问内网或保留地址");
      }
    }
  }

  private isPrivateAddress(address: string): boolean {
    const normalizedAddress = address.toLowerCase();

    if (
      normalizedAddress === "::1" ||
      normalizedAddress.startsWith("fc") ||
      normalizedAddress.startsWith("fd")
    ) {
      return true;
    }

    if (
      normalizedAddress.startsWith("fe8") ||
      normalizedAddress.startsWith("fe9") ||
      normalizedAddress.startsWith("fea") ||
      normalizedAddress.startsWith("feb")
    ) {
      return true;
    }

    if (normalizedAddress.startsWith("::ffff:")) {
      return this.isPrivateAddress(normalizedAddress.replace("::ffff:", ""));
    }

    if (isIP(normalizedAddress) !== 4) {
      return false;
    }

    const octets = normalizedAddress
      .split(".")
      .map((part) => Number.parseInt(part, 10));

    if (octets.length !== 4 || octets.some((value) => Number.isNaN(value))) {
      return true;
    }

    const first = octets[0];
    const second = octets[1];
    if (first === undefined || second === undefined) {
      return true;
    }
    if (first === 10 || first === 127 || first === 0) {
      return true;
    }
    if (first === 169 && second === 254) {
      return true;
    }
    if (first === 172 && second >= 16 && second <= 31) {
      return true;
    }
    if (first === 192 && second === 168) {
      return true;
    }

    return false;
  }

  @Get("filter-options")
  @ApiOperation({ summary: "获取搜索筛选选项", description: "获取可用的品牌、颜色、尺码、价格范围筛选选项" })
  @ApiQuery({ name: "category", required: false, type: String, description: "按分类筛选" })
  async getFilterOptions(@Query("category") category?: string) {
    return this.searchService.getFilterOptions(category);
  }
}
