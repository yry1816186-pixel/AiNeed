import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { Response } from "express";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

import {
  CreateTryOnDto,
  GetTryOnHistoryQueryDto,
} from "./dto/try-on.dto";
import { TryOnService } from "./try-on.service";

@ApiTags("try-on")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("try-on")
export class TryOnController {
  private readonly logger = new Logger(TryOnController.name);

  constructor(private readonly tryOnService: TryOnService) {}

  @Post()
  @ApiOperation({
    summary: "创建虚拟试衣请求",
    description:
      "提交虚拟试衣任务，将指定服装合成到用户照片上。任务异步处理，需要轮询查询状态。",
  })
  @ApiBody({ type: CreateTryOnDto })
  @ApiResponse({
    status: 201,
    description: "试衣请求创建成功",
  })
  @ApiResponse({
    status: 400,
    description: "请求参数错误（无效的 photoId 或 itemId）",
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  @ApiResponse({
    status: 404,
    description: "照片或服装项不存在",
  })
  async createTryOn(
    @CurrentUser("id") userId: string,
    @Body() body: CreateTryOnDto,
  ) {
    return this.tryOnService.createTryOnRequest(
      userId,
      body.photoId,
      body.itemId,
    );
  }

  @Get("history")
  @ApiOperation({
    summary: "获取试衣历史",
    description: "获取当前用户的虚拟试衣历史记录，支持分页和状态筛选。",
  })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "页码，默认1",
    example: 1,
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "每页数量，默认20",
    example: 20,
  })
  @ApiQuery({
    name: "status",
    required: false,
    description: "按状态筛选：pending(处理中)、completed(已完成)、failed(失败)",
  })
  @ApiResponse({
    status: 200,
    description: "获取成功",
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  async getHistory(
    @CurrentUser("id") userId: string,
    @Query() query: GetTryOnHistoryQueryDto,
  ) {
    return this.tryOnService.getUserTryOnHistory(
      userId,
      query.page ?? 1,
      query.limit ?? 20,
      query.status,
    );
  }

  @Get(":id")
  @ApiOperation({
    summary: "获取试衣详情",
    description: "获取指定试衣记录的详细状态信息。",
  })
  @ApiParam({
    name: "id",
    description: "试衣记录ID",
    type: String,
    format: "uuid",
  })
  @ApiResponse({
    status: 200,
    description: "获取成功",
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  @ApiResponse({
    status: 404,
    description: "试衣记录不存在",
  })
  async getTryOnStatus(
    @CurrentUser("id") userId: string,
    @Param("id") tryOnId: string,
  ) {
    return this.tryOnService.getTryOnStatus(tryOnId, userId);
  }

  @Get(":id/result-image")
  @ApiOperation({
    summary: "获取试衣结果图片",
    description: "直接获取试衣结果图片的二进制数据。仅在试衣完成后可用。",
  })
  @ApiParam({
    name: "id",
    description: "试衣记录ID",
    type: String,
    format: "uuid",
  })
  @ApiResponse({
    status: 200,
    description: "返回图片二进制数据",
    content: {
      "image/png": {
        schema: {
          type: "string",
          format: "binary",
        },
      },
      "image/jpeg": {
        schema: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  @ApiResponse({
    status: 404,
    description: "试衣记录不存在或结果图片未生成",
  })
  async getTryOnResultImage(
    @CurrentUser("id") userId: string,
    @Param("id") tryOnId: string,
    @Res() res: Response,
  ) {
    this.logger.log(`Serving try-on result image for ${tryOnId}`);
    const asset = await this.tryOnService.getTryOnResultAsset(tryOnId, userId);

    res.setHeader("Content-Type", asset.contentType);
    res.setHeader("Cache-Control", asset.cacheControl);
    res.send(asset.body);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "删除试衣记录",
    description: "删除指定的试衣记录及其关联的结果图片。",
  })
  @ApiParam({
    name: "id",
    description: "试衣记录ID",
    type: String,
    format: "uuid",
  })
  @ApiResponse({
    status: 204,
    description: "删除成功（无返回内容）",
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  @ApiResponse({
    status: 404,
    description: "试衣记录不存在",
  })
  async deleteTryOn(
    @CurrentUser("id") userId: string,
    @Param("id") tryOnId: string,
  ) {
    await this.tryOnService.deleteTryOn(tryOnId, userId);
  }
}
