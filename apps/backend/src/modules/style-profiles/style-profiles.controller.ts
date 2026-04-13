import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiBody,
  ApiParam,
} from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RequestWithUser } from "../../common/types/common.types";

import { StyleProfilesService } from "./style-profiles.service";
import {
  CreateStyleProfileDto,
  UpdateStyleProfileDto,
  StyleProfileResponseDto,
  SuccessResponseDto,
} from "./dto";

@ApiTags("style-profiles")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("style-profiles")
export class StyleProfilesController {
  constructor(private readonly service: StyleProfilesService) {}

  @Get()
  @ApiOperation({ summary: "获取用户所有风格档案", description: "获取当前用户的所有风格档案列表，按默认档案优先、更新时间倒序排列。" })
  @ApiResponse({ status: 200, description: "获取成功", type: [StyleProfileResponseDto] })
  @ApiResponse({ status: 401, description: "未授权，需要提供有效的 Access Token" })
  async findAll(@Request() req: RequestWithUser) {
    return this.service.findAll(req.user.id);
  }

  @Get(":id")
  @ApiOperation({ summary: "获取单个风格档案", description: "根据 ID 获取指定风格档案的详细信息。" })
  @ApiParam({ name: "id", description: "风格档案 ID", format: "uuid" })
  @ApiResponse({ status: 200, description: "获取成功", type: StyleProfileResponseDto })
  @ApiResponse({ status: 401, description: "未授权，需要提供有效的 Access Token" })
  @ApiResponse({ status: 404, description: "风格档案不存在" })
  async findOne(@Request() req: RequestWithUser, @Param("id") id: string) {
    return this.service.findOne(req.user.id, id);
  }

  @Post()
  @ApiOperation({ summary: "创建风格档案", description: "创建新的风格档案。如果设为默认档案，会自动取消其他默认档案。" })
  @ApiBody({ type: CreateStyleProfileDto })
  @ApiResponse({ status: 201, description: "创建成功", type: StyleProfileResponseDto })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权，需要提供有效的 Access Token" })
  async create(@Request() req: RequestWithUser, @Body() dto: CreateStyleProfileDto) {
    return this.service.create(req.user.id, dto);
  }

  @Put(":id")
  @ApiOperation({ summary: "更新风格档案", description: "更新指定风格档案的信息。更新关键词或色彩方案时会自动结合用户行为数据进行增强。" })
  @ApiParam({ name: "id", description: "风格档案 ID", format: "uuid" })
  @ApiBody({ type: UpdateStyleProfileDto })
  @ApiResponse({ status: 200, description: "更新成功", type: StyleProfileResponseDto })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权，需要提供有效的 Access Token" })
  @ApiResponse({ status: 404, description: "风格档案不存在" })
  async update(
    @Request() req: RequestWithUser,
    @Param("id") id: string,
    @Body() dto: UpdateStyleProfileDto,
  ) {
    return this.service.update(req.user.id, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "删除风格档案", description: "删除指定的风格档案。" })
  @ApiParam({ name: "id", description: "风格档案 ID", format: "uuid" })
  @ApiResponse({ status: 200, description: "删除成功", type: SuccessResponseDto })
  @ApiResponse({ status: 401, description: "未授权，需要提供有效的 Access Token" })
  @ApiResponse({ status: 404, description: "风格档案不存在" })
  async remove(@Request() req: RequestWithUser, @Param("id") id: string) {
    return this.service.remove(req.user.id, id);
  }

  @Put(":id/default")
  @ApiOperation({ summary: "设为默认风格档案", description: "将指定风格档案设为默认，同时取消其他档案的默认状态。" })
  @ApiParam({ name: "id", description: "风格档案 ID", format: "uuid" })
  @ApiResponse({ status: 200, description: "设置成功", type: StyleProfileResponseDto })
  @ApiResponse({ status: 401, description: "未授权，需要提供有效的 Access Token" })
  @ApiResponse({ status: 404, description: "风格档案不存在" })
  async setDefault(@Request() req: RequestWithUser, @Param("id") id: string) {
    return this.service.setDefault(req.user.id, id);
  }

  @Put(":id/toggle-active")
  @ApiOperation({ summary: "切换激活状态", description: "切换风格档案的激活/停用状态。" })
  @ApiParam({ name: "id", description: "风格档案 ID", format: "uuid" })
  @ApiResponse({ status: 200, description: "切换成功", type: StyleProfileResponseDto })
  @ApiResponse({ status: 401, description: "未授权，需要提供有效的 Access Token" })
  @ApiResponse({ status: 404, description: "风格档案不存在" })
  async toggleActive(@Request() req: RequestWithUser, @Param("id") id: string) {
    return this.service.toggleActive(req.user.id, id);
  }
}
