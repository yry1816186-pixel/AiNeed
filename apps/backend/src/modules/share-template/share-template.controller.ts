import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

import {
  CreateShareTemplateDto,
  UpdateShareTemplateDto,
  ShareTemplateQueryDto,
} from "./dto/share-template.dto";
import { ShareTemplateService } from "./share-template.service";

@ApiTags("share-template")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("share-template")
export class ShareTemplateController {
  constructor(
    private readonly shareTemplateService: ShareTemplateService,
  ) {}

  @Post()
  @ApiOperation({ summary: "创建分享海报模板" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  async createTemplate(@Body() dto: CreateShareTemplateDto) {
    return this.shareTemplateService.createTemplate(dto);
  }

  @Get()
  @ApiOperation({ summary: "获取分享模板列表" })
  @ApiResponse({ status: 200, description: "成功返回模板列表" })
  @ApiResponse({ status: 401, description: "未授权" })
  async getTemplates(@Query() query: ShareTemplateQueryDto) {
    return this.shareTemplateService.getTemplates(query);
  }

  @Get(":templateId")
  @ApiOperation({ summary: "获取分享模板详情" })
  @ApiResponse({ status: 200, description: "成功返回模板详情" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "模板不存在" })
  @ApiParam({ name: "templateId", description: "模板ID" })
  async getTemplateById(@Param("templateId") templateId: string) {
    return this.shareTemplateService.getTemplateById(templateId);
  }

  @Put(":templateId")
  @ApiOperation({ summary: "更新分享模板" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "模板不存在" })
  @ApiParam({ name: "templateId", description: "模板ID" })
  async updateTemplate(
    @Param("templateId") templateId: string,
    @Body() dto: UpdateShareTemplateDto,
  ) {
    return this.shareTemplateService.updateTemplate(templateId, dto);
  }

  @Delete(":templateId")
  @ApiOperation({ summary: "删除分享模板" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "模板不存在" })
  @ApiParam({ name: "templateId", description: "模板ID" })
  async deleteTemplate(@Param("templateId") templateId: string) {
    return this.shareTemplateService.deleteTemplate(templateId);
  }
}
