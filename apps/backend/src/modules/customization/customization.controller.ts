import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam, ApiQuery, ApiBody } from "@nestjs/swagger";
import { CustomizationType, CustomizationStatus } from "@prisma/client";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

import { CustomizationService } from "./customization.service";


@ApiTags("customization")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("customization")
export class CustomizationController {
  constructor(private customizationService: CustomizationService) {}

  @Post()
  @ApiOperation({ summary: "创建定制需求", description: "创建新的服装定制需求，支持指定定制类型、描述和参考图片。" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["ALTERATION", "CUSTOM_MADE", "BESPOKE"], description: "定制类型：ALTERATION(修改)、CUSTOM_MADE(定制)、BESPOKE(高级定制)" },
        title: { type: "string", description: "定制需求标题" },
        description: { type: "string", description: "定制需求详细描述" },
        referenceImages: { type: "array", items: { type: "string" }, description: "参考图片URL列表" },
        preferences: { type: "object", description: "定制偏好设置" },
      },
      required: ["type", "description"],
    },
  })
  @ApiResponse({ status: 201, description: "定制需求创建成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权，需要提供有效的 Access Token" })
  async createRequest(
    @CurrentUser("id") userId: string,
    @Body()
    body: {
      type: CustomizationType;
      title?: string;
      description: string;
      referenceImages?: string[];
      preferences?: Record<string, any>;
    },
  ) {
    return this.customizationService.createRequest(userId, body);
  }

  @Post(":id/submit")
  @ApiOperation({ summary: "提交定制需求", description: "将草稿状态的定制需求提交审核。" })
  @ApiParam({ name: "id", description: "定制需求ID", type: String, format: "uuid" })
  @ApiResponse({ status: 200, description: "提交成功" })
  @ApiResponse({ status: 400, description: "需求状态不允许提交" })
  @ApiResponse({ status: 401, description: "未授权，需要提供有效的 Access Token" })
  @ApiResponse({ status: 404, description: "定制需求不存在" })
  async submitRequest(
    @CurrentUser("id") userId: string,
    @Param("id") requestId: string,
  ) {
    return this.customizationService.submitRequest(requestId, userId);
  }

  @Get()
  @ApiOperation({ summary: "获取定制需求列表", description: "获取当前用户的定制需求列表，支持按状态筛选和分页。" })
  @ApiQuery({ name: "status", required: false, enum: ["DRAFT", "SUBMITTED", "QUOTED", "IN_PRODUCTION", "COMPLETED", "CANCELLED"], description: "按状态筛选" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码，默认1", example: 1 })
  @ApiQuery({ name: "limit", required: false, type: Number, description: "每页数量，默认10", example: 10 })
  @ApiResponse({ status: 200, description: "定制需求列表" })
  @ApiResponse({ status: 401, description: "未授权，需要提供有效的 Access Token" })
  async getRequests(
    @CurrentUser("id") userId: string,
    @Query("status") status?: CustomizationStatus,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.customizationService.getUserRequests(
      userId,
      status,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "获取定制需求详情", description: "根据ID获取定制需求的详细信息。" })
  @ApiParam({ name: "id", description: "定制需求ID", type: String, format: "uuid" })
  @ApiResponse({ status: 200, description: "定制需求详情" })
  @ApiResponse({ status: 401, description: "未授权，需要提供有效的 Access Token" })
  @ApiResponse({ status: 404, description: "定制需求不存在" })
  async getRequestById(
    @CurrentUser("id") userId: string,
    @Param("id") requestId: string,
  ) {
    return this.customizationService.getRequestById(requestId, userId);
  }

  @Put(":id")
  @ApiOperation({ summary: "更新定制需求", description: "更新草稿状态的定制需求信息。" })
  @ApiParam({ name: "id", description: "定制需求ID", type: String, format: "uuid" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "定制需求标题" },
        description: { type: "string", description: "定制需求详细描述" },
        referenceImages: { type: "array", items: { type: "string" }, description: "参考图片URL列表" },
        preferences: { type: "object", description: "定制偏好设置" },
      },
    },
  })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "请求参数错误或需求状态不允许更新" })
  @ApiResponse({ status: 401, description: "未授权，需要提供有效的 Access Token" })
  @ApiResponse({ status: 404, description: "定制需求不存在" })
  async updateRequest(
    @CurrentUser("id") userId: string,
    @Param("id") requestId: string,
    @Body()
    body: {
      title?: string;
      description?: string;
      referenceImages?: string[];
      preferences?: Record<string, any>;
    },
  ) {
    return this.customizationService.updateRequest(requestId, userId, body);
  }

  @Post(":id/select-quote")
  @ApiOperation({ summary: "选择报价", description: "从定制需求的报价列表中选择一个报价。" })
  @ApiParam({ name: "id", description: "定制需求ID", type: String, format: "uuid" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        quoteId: { type: "string", description: "选择的报价ID", format: "uuid" },
      },
      required: ["quoteId"],
    },
  })
  @ApiResponse({ status: 200, description: "报价选择成功" })
  @ApiResponse({ status: 400, description: "报价ID无效或需求状态不允许选择" })
  @ApiResponse({ status: 401, description: "未授权，需要提供有效的 Access Token" })
  @ApiResponse({ status: 404, description: "定制需求或报价不存在" })
  async selectQuote(
    @CurrentUser("id") userId: string,
    @Param("id") requestId: string,
    @Body() body: { quoteId: string },
  ) {
    return this.customizationService.selectQuote(
      requestId,
      userId,
      body.quoteId,
    );
  }

  @Post(":id/cancel")
  @ApiOperation({ summary: "取消定制需求", description: "取消指定的定制需求，仅草稿和已提交状态可取消。" })
  @ApiParam({ name: "id", description: "定制需求ID", type: String, format: "uuid" })
  @ApiResponse({ status: 200, description: "取消成功" })
  @ApiResponse({ status: 400, description: "需求状态不允许取消" })
  @ApiResponse({ status: 401, description: "未授权，需要提供有效的 Access Token" })
  @ApiResponse({ status: 404, description: "定制需求不存在" })
  async cancelRequest(
    @CurrentUser("id") userId: string,
    @Param("id") requestId: string,
  ) {
    return this.customizationService.cancelRequest(requestId, userId);
  }
}
