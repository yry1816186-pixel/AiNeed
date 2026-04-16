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
import { CustomizationType, CustomizationStatus, ProductTemplateType } from "../../../types/prisma-enums";

import { CurrentUser } from "../../identity/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../identity/auth/guards/jwt-auth.guard";

import { CustomizationService } from "./customization.service";
import {
  CreateDesignDto,
  UpdateDesignDto,
  CalculateQuoteDto,
  CreateFromDesignDto,
} from "./dto";

@ApiTags("customization")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("customization")
export class CustomizationController {
  constructor(private customizationService: CustomizationService) {}

  // ==================== Template Endpoints ====================

  @Get("templates")
  @ApiOperation({ summary: "获取定制模板列表", description: "获取可用的商品定制模板，支持按类型筛选" })
  @ApiQuery({ name: "type", required: false, enum: ProductTemplateType, description: "按模板类型筛选" })
  @ApiResponse({ status: 200, description: "模板列表" })
  async getTemplates(
    @Query("type") type?: ProductTemplateType,
  ) {
    return this.customizationService.getTemplates(type);
  }

  @Get("templates/:id")
  @ApiOperation({ summary: "获取模板详情", description: "根据ID获取定制模板详细信息" })
  @ApiParam({ name: "id", description: "模板ID", type: String, format: "uuid" })
  @ApiResponse({ status: 200, description: "模板详情" })
  @ApiResponse({ status: 404, description: "模板不存在" })
  async getTemplateById(
    @Param("id") templateId: string,
  ) {
    return this.customizationService.getTemplateById(templateId);
  }

  // ==================== Design Endpoints ====================

  @Post("designs")
  @ApiOperation({ summary: "创建定制设计", description: "基于模板创建新的定制设计" })
  @ApiBody({ type: CreateDesignDto })
  @ApiResponse({ status: 201, description: "设计创建成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  async createDesign(
    @CurrentUser("id") userId: string,
    @Body() body: CreateDesignDto,
  ) {
    return this.customizationService.createDesign(
      userId,
      body.templateId,
      body.canvasData,
    );
  }

  @Put("designs/:id")
  @ApiOperation({ summary: "更新定制设计", description: "更新设计的画布数据和图层" })
  @ApiParam({ name: "id", description: "设计ID", type: String, format: "uuid" })
  @ApiBody({ type: UpdateDesignDto })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 404, description: "设计不存在" })
  async updateDesign(
    @CurrentUser("id") userId: string,
    @Param("id") designId: string,
    @Body() body: UpdateDesignDto,
  ) {
    return this.customizationService.updateDesign(
      designId,
      userId,
      body.canvasData,
      body.layers as unknown as Array<{
        type: string;
        content: string;
        x: number;
        y: number;
        width: number;
        height: number;
        scale: number;
        rotation: number;
        opacity: number;
        zIndex: number;
        fontSize?: number;
        color?: string;
        fontFamily?: string;
        imageUrl?: string;
        shapeType?: string;
        fillColor?: string;
        strokeColor?: string;
        strokeWidth?: number;
      }>,
    );
  }

  @Get("designs/:id")
  @ApiOperation({ summary: "获取设计详情", description: "获取定制设计的详细信息，包含模板和图层" })
  @ApiParam({ name: "id", description: "设计ID", type: String, format: "uuid" })
  @ApiResponse({ status: 200, description: "设计详情" })
  @ApiResponse({ status: 404, description: "设计不存在" })
  async getDesign(
    @CurrentUser("id") userId: string,
    @Param("id") designId: string,
  ) {
    return this.customizationService.getDesign(designId, userId);
  }

  @Post("designs/:id/calculate-quote")
  @ApiOperation({ summary: "计算定制报价", description: "根据设计的复杂度自动计算报价" })
  @ApiParam({ name: "id", description: "设计ID", type: String, format: "uuid" })
  @ApiBody({ type: CalculateQuoteDto })
  @ApiResponse({ status: 200, description: "报价计算成功" })
  @ApiResponse({ status: 404, description: "设计不存在" })
  async calculateQuote(
    @CurrentUser("id") userId: string,
    @Param("id") designId: string,
    @Body() body: CalculateQuoteDto,
  ) {
    return this.customizationService.calculateQuote(
      designId,
      userId,
      body.printSide ?? "front",
    );
  }

  @Post("designs/:id/generate-preview")
  @ApiOperation({ summary: "生成定制预览", description: "生成定制商品的预览效果图" })
  @ApiParam({ name: "id", description: "设计ID", type: String, format: "uuid" })
  @ApiResponse({ status: 200, description: "预览生成成功" })
  @ApiResponse({ status: 404, description: "设计不存在" })
  async generatePreview(
    @CurrentUser("id") userId: string,
    @Param("id") designId: string,
  ) {
    return this.customizationService.generatePreview(designId, userId);
  }

  // ==================== Create Request from Design ====================

  @Post("from-design")
  @ApiOperation({ summary: "从设计创建定制需求", description: "基于已确认报价的设计创建定制需求" })
  @ApiBody({ type: CreateFromDesignDto })
  @ApiResponse({ status: 201, description: "定制需求创建成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 404, description: "设计或报价不存在" })
  async createFromDesign(
    @CurrentUser("id") userId: string,
    @Body() body: CreateFromDesignDto,
  ) {
    return this.customizationService.createCustomizationFromDesign(
      userId,
      body.designId,
      body.quoteId,
    );
  }

  // ==================== Original CRUD Endpoints ====================

  @Post()
  @ApiOperation({ summary: "创建定制需求", description: "创建新的服装定制需求，支持指定定制类型、描述和参考图片。" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["ALTERATION", "CUSTOM_MADE", "BESPOKE"], description: "定制类型" },
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
  async submitRequest(
    @CurrentUser("id") userId: string,
    @Param("id") requestId: string,
  ) {
    return this.customizationService.submitRequest(requestId, userId);
  }

  @Get()
  @ApiOperation({ summary: "获取定制需求列表", description: "获取当前用户的定制需求列表，支持按状态筛选和分页。" })
  @ApiQuery({ name: "status", required: false, enum: CustomizationStatus, description: "按状态筛选" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "limit", required: false, type: Number, description: "每页数量" })
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
  async getRequestById(
    @CurrentUser("id") userId: string,
    @Param("id") requestId: string,
  ) {
    return this.customizationService.getRequestById(requestId, userId);
  }

  @Put(":id")
  @ApiOperation({ summary: "更新定制需求", description: "更新草稿状态的定制需求信息。" })
  @ApiParam({ name: "id", description: "定制需求ID", type: String, format: "uuid" })
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
  @ApiOperation({ summary: "取消定制需求", description: "取消指定的定制需求。" })
  @ApiParam({ name: "id", description: "定制需求ID", type: String, format: "uuid" })
  async cancelRequest(
    @CurrentUser("id") userId: string,
    @Param("id") requestId: string,
  ) {
    return this.customizationService.cancelRequest(requestId, userId);
  }

  // ==================== Payment + Production ====================

  @Post(":id/pay")
  @ApiOperation({ summary: "定制需求付款", description: "为已确认的定制需求发起支付" })
  @ApiParam({ name: "id", description: "定制需求ID", type: String, format: "uuid" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        paymentMethod: { type: "string", description: "支付方式 (alipay/wechat)" },
      },
      required: ["paymentMethod"],
    },
  })
  async payForCustomization(
    @CurrentUser("id") userId: string,
    @Param("id") requestId: string,
    @Body() body: { paymentMethod: string },
  ) {
    const payResult = await this.customizationService.confirmAndPay(
      requestId,
      userId,
      body.paymentMethod,
    );

    // Simulate payment callback success
    await this.customizationService.handlePaymentCallback(requestId, {
      success: true,
      paymentId: payResult.paymentId,
    });

    return payResult;
  }

  @Get(":id/production-status")
  @ApiOperation({ summary: "获取生产状态", description: "查询定制商品的生产和物流状态" })
  @ApiParam({ name: "id", description: "定制需求ID", type: String, format: "uuid" })
  async getProductionStatus(
    @CurrentUser("id") userId: string,
    @Param("id") requestId: string,
  ) {
    return this.customizationService.getProductionStatus(requestId, userId);
  }

  @Post(":id/confirm-delivery")
  @ApiOperation({ summary: "确认收货", description: "用户确认收到定制商品" })
  @ApiParam({ name: "id", description: "定制需求ID", type: String, format: "uuid" })
  async confirmDelivery(
    @CurrentUser("id") userId: string,
    @Param("id") requestId: string,
  ) {
    return this.customizationService.confirmDelivery(requestId, userId);
  }
}
