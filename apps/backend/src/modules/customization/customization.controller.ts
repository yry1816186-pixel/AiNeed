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
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
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
  @ApiOperation({ summary: "创建定制需求" })
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
  @ApiOperation({ summary: "提交定制需求" })
  async submitRequest(
    @CurrentUser("id") userId: string,
    @Param("id") requestId: string,
  ) {
    return this.customizationService.submitRequest(requestId, userId);
  }

  @Get()
  @ApiOperation({ summary: "获取定制需求列表" })
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
  @ApiOperation({ summary: "获取定制需求详情" })
  async getRequestById(
    @CurrentUser("id") userId: string,
    @Param("id") requestId: string,
  ) {
    return this.customizationService.getRequestById(requestId, userId);
  }

  @Put(":id")
  @ApiOperation({ summary: "更新定制需求" })
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
  @ApiOperation({ summary: "选择报价" })
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
  @ApiOperation({ summary: "取消定制需求" })
  async cancelRequest(
    @CurrentUser("id") userId: string,
    @Param("id") requestId: string,
  ) {
    return this.customizationService.cancelRequest(requestId, userId);
  }
}
