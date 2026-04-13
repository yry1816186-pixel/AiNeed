import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ThrottlerGuard } from "@nestjs/throttler";
import { PhotoType } from "@prisma/client";

import { AuthGuard } from "../auth/guards/auth.guard";
import { AuthenticatedRequest } from "../../common/types/auth.types";
import { AiQuotaGuard, SetQuotaType } from "../security/rate-limit/ai-quota.guard";
import { AiQuotaService } from "../security/rate-limit/ai-quota.service";

import { AiStylistService } from "./ai-stylist.service";
import { SystemContextService } from "./system-context.service";
import {
  CreateStylistSessionDto,
  SendStylistMessageDto,
  UploadStylistPhotoDto,
  LegacyChatDto,
  SubmitFeedbackDto,
} from "./dto/ai-stylist.dto";

/**
 * 会话列表响应
 */
class SessionListResponseDto {
  sessions!: Array<{
    id: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    goal?: string;
  }>;
  total!: number;
}

/**
 * 会话状态响应
 */
class SessionStatusResponseDto {
  id!: string;
  status!: string;
  goal?: string;
  context?: Record<string, unknown>;
  createdAt!: Date;
  updatedAt!: Date;
  messages?: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: Date;
  }>;
  photos?: Array<{
    id: string;
    type: string;
    url: string;
  }>;
}

/**
 * 消息响应
 */
class MessageResponseDto {
  id!: string;
  role!: string;
  content!: string;
  createdAt!: Date;
}

/**
 * 穿搭方案响应
 */
class OutfitResponseDto {
  outfits!: Array<{
    index: number;
    items: Array<{
      id: string;
      name: string;
      category: string;
      imageUrl: string;
    }>;
    reasoning: string;
  }>;
}

/**
 * 快捷建议响应
 */
class SuggestionsResponseDto {
  suggestions!: Array<{
    text: string;
    icon: string;
  }>;
}

/**
 * 风格选项响应
 */
class StyleOptionsResponseDto {
  styles!: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
  }>;
}

/**
 * 场景选项响应
 */
class OccasionOptionsResponseDto {
  occasions!: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
  }>;
}

/**
 * 反馈响应
 */
class FeedbackResponseDto {
  success!: boolean;
  message!: string;
}

@ApiTags("ai-stylist")
@ApiBearerAuth()
@Controller("ai-stylist")
@UseGuards(AuthGuard, ThrottlerGuard)
export class AiStylistController {
  constructor(
    private readonly stylistService: AiStylistService,
    private readonly systemContextService: SystemContextService,
    private readonly aiQuotaService: AiQuotaService,
  ) {}

  @Post("sessions")
  @ApiOperation({
    summary: "创建 AI 造型师会话",
    description: "创建一个新的 AI 造型师咨询会话，可指定目标（如面试穿搭、约会穿搭等）。",
  })
  @ApiBody({ type: CreateStylistSessionDto })
  @ApiResponse({
    status: 201,
    description: "会话创建成功",
    type: SessionStatusResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  async createSession(
    @Request() req: AuthenticatedRequest,
    @Body() body: CreateStylistSessionDto,
  ) {
    return this.stylistService.createSession(req.user.id, body);
  }

  @Get("sessions")
  @ApiOperation({
    summary: "获取 AI 造型师会话列表",
    description: "获取当前用户的所有 AI 造型师会话列表，支持分页。",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "每页数量，默认10",
    example: 10,
  })
  @ApiQuery({
    name: "offset",
    required: false,
    type: Number,
    description: "偏移量，默认0",
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: SessionListResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  async listSessions(
    @Request() req: AuthenticatedRequest,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.stylistService.listSessions(req.user.id, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get("sessions/:sessionId")
  @ApiOperation({
    summary: "获取 AI 造型师会话状态",
    description: "获取指定会话的详细状态，包括消息历史和已上传的照片。",
  })
  @ApiParam({
    name: "sessionId",
    description: "会话ID",
    type: String,
    format: "uuid",
  })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: SessionStatusResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  @ApiResponse({
    status: 404,
    description: "会话不存在",
  })
  async getSessionStatus(
    @Request() req: AuthenticatedRequest,
    @Param("sessionId") sessionId: string,
  ) {
    return this.stylistService.getSessionStatus(req.user.id, sessionId);
  }

  @Post("sessions/:sessionId/messages")
  @UseGuards(AiQuotaGuard)
  @SetQuotaType('ai-stylist')
  @ApiOperation({
    summary: "发送 AI 造型师消息",
    description: "向指定会话发送消息，AI 将根据上下文返回穿搭建议。",
  })
  @ApiParam({
    name: "sessionId",
    description: "会话ID",
    type: String,
    format: "uuid",
  })
  @ApiBody({ type: SendStylistMessageDto })
  @ApiResponse({
    status: 201,
    description: "消息发送成功",
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "消息内容不能为空或超过2000字符",
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  @ApiResponse({
    status: 404,
    description: "会话不存在",
  })
  async sendMessage(
    @Request() req: AuthenticatedRequest,
    @Param("sessionId") sessionId: string,
    @Body() body: SendStylistMessageDto,
  ) {
    return this.stylistService.sendMessage(
      req.user.id,
      sessionId,
      body.message,
    );
  }

  @Post("sessions/:sessionId/photo")
  @ApiOperation({
    summary: "上传 AI 造型师照片",
    description: "向指定会话上传用户照片，用于个性化穿搭推荐。支持正面、侧面、全身、半身、面部等类型。",
  })
  @ApiParam({
    name: "sessionId",
    description: "会话ID",
    type: String,
    format: "uuid",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "图片文件（支持 JPG、PNG 格式）",
        },
        type: {
          type: "string",
          enum: ["front", "side", "full_body", "half_body", "face"],
          description: "照片类型：front(正面)、side(侧面)、full_body(全身)、half_body(半身)、face(面部)",
        },
      },
      required: ["file"],
    },
  })
  @ApiResponse({
    status: 201,
    description: "照片上传成功",
    schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "照片ID" },
        type: { type: "string", description: "照片类型" },
        url: { type: "string", description: "照片URL" },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "请上传图片文件",
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  @ApiResponse({
    status: 404,
    description: "会话不存在",
  })
  @UseInterceptors(FileInterceptor("file"))
  async uploadPhoto(
    @Request() req: AuthenticatedRequest,
    @Param("sessionId") sessionId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadStylistPhotoDto,
  ) {
    if (!file) {
      throw new BadRequestException("请上传图片文件");
    }

    return this.stylistService.uploadSessionPhoto(
      req.user.id,
      sessionId,
      file,
      body.type || PhotoType.full_body,
    );
  }

  @Post("sessions/:sessionId/resolve")
  @UseGuards(AiQuotaGuard)
  @SetQuotaType('ai-stylist')
  @ApiOperation({
    summary: "生成 AI 造型师穿搭方案",
    description: "根据会话中的消息和照片，生成完整的穿搭方案推荐。",
  })
  @ApiParam({
    name: "sessionId",
    description: "会话ID",
    type: String,
    format: "uuid",
  })
  @ApiResponse({
    status: 201,
    description: "穿搭方案生成成功",
    type: OutfitResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "会话信息不足，无法生成方案",
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  @ApiResponse({
    status: 404,
    description: "会话不存在",
  })
  async resolveSession(
    @Request() req: AuthenticatedRequest,
    @Param("sessionId") sessionId: string,
  ) {
    return this.stylistService.resolveSession(req.user.id, sessionId);
  }

  @Delete("sessions/:sessionId")
  @ApiOperation({
    summary: "删除 AI 造型师会话",
    description: "删除指定的会话及其所有相关数据（消息、照片等）。",
  })
  @ApiParam({
    name: "sessionId",
    description: "会话ID",
    type: String,
    format: "uuid",
  })
  @ApiResponse({
    status: 200,
    description: "删除成功",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  @ApiResponse({
    status: 404,
    description: "会话不存在",
  })
  async deleteSession(
    @Request() req: AuthenticatedRequest,
    @Param("sessionId") sessionId: string,
  ) {
    return this.stylistService.deleteSession(req.user.id, sessionId);
  }

  @Post("chat")
  @UseGuards(AiQuotaGuard)
  @SetQuotaType('ai-stylist')
  @ApiOperation({
    summary: "兼容旧版的无状态 AI 聊天接口",
    description: "无状态的 AI 聊天接口，每次请求需要传入完整的对话历史。建议使用 sessions 接口替代。",
    deprecated: true,
  })
  @ApiBody({ type: LegacyChatDto })
  @ApiResponse({
    status: 201,
    description: "回复成功",
    schema: {
      type: "object",
      properties: {
        response: { type: "string", description: "AI 回复内容" },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  async chat(
    @Request() req: AuthenticatedRequest,
    @Body() body: LegacyChatDto,
  ) {
    return this.stylistService.chat(
      req.user.id,
      body.message,
      (body.conversationHistory || []).filter(
        (item) =>
          item &&
          (item.role === "user" ||
            item.role === "assistant" ||
            item.role === "system") &&
          typeof item.content === "string",
      ) as Array<{ role: "user" | "assistant" | "system"; content: string }>,
    );
  }

  @Get("quota")
  @ApiOperation({
    summary: "查询 AI 造型师配额",
    description: "获取当前用户的 AI 造型师每日配额使用情况，包括已用次数、限额和重置时间。",
  })
  @ApiResponse({
    status: 200,
    description: "获取成功",
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  async getQuota(@Request() req: AuthenticatedRequest) {
    return this.aiQuotaService.getQuotaStatus(req.user.id);
  }

  @Get("suggestions")
  @ApiOperation({
    summary: "获取 AI 造型师快捷建议",
    description: "获取预设的快捷建议列表，用于引导用户开始对话。",
  })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: SuggestionsResponseDto,
  })
  async getSuggestions() {
    return {
      suggestions: [
        { text: "我要一套面试穿搭", icon: "💼" },
        { text: "帮我做约会穿搭", icon: "💕" },
        { text: "我想走极简通勤风", icon: "✨" },
        { text: "预算 1000 以内显高一点", icon: "📏" },
      ],
    };
  }

  @Get("options/styles")
  @ApiOperation({
    summary: "获取动态生成的风格选项",
    description: "获取系统支持的风格选项列表，用于用户选择穿搭风格。",
  })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: StyleOptionsResponseDto,
  })
  async getStyleOptions() {
    return this.stylistService.generateDynamicStyleOptions();
  }

  @Get("options/occasions")
  @ApiOperation({
    summary: "获取动态生成的场景选项",
    description: "获取系统支持的场景选项列表，用于用户选择穿搭场景。",
  })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: OccasionOptionsResponseDto,
  })
  async getOccasionOptions() {
    return this.stylistService.generateDynamicOccasionOptions();
  }

  @Post("sessions/:sessionId/feedback")
  @ApiOperation({
    summary: "提交穿搭方案反馈",
    description: "用户对 AI 推荐的穿搭方案进行点赞或点踩，用于优化后续推荐。",
  })
  @ApiParam({
    name: "sessionId",
    description: "会话ID",
    type: String,
    format: "uuid",
  })
  @ApiBody({ type: SubmitFeedbackDto })
  @ApiResponse({
    status: 201,
    description: "反馈提交成功",
    type: FeedbackResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "无效的反馈参数",
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  @ApiResponse({
    status: 404,
    description: "会话不存在",
  })
  async submitFeedback(
    @Request() req: AuthenticatedRequest,
    @Param("sessionId") sessionId: string,
    @Body() body: SubmitFeedbackDto,
  ) {
    return this.stylistService.submitFeedback(
      req.user.id,
      sessionId,
      body.outfitIndex,
      body.action,
      body.itemId,
    );
  }

  @Get("sessions/:sessionId/feedback")
  @ApiOperation({
    summary: "获取会话反馈记录",
    description: "获取指定会话中用户提交的所有反馈记录。",
  })
  @ApiParam({
    name: "sessionId",
    description: "会话ID",
    type: String,
    format: "uuid",
  })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    schema: {
      type: "object",
      properties: {
        feedbacks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              outfitIndex: { type: "number" },
              action: { type: "string" },
              itemId: { type: "string" },
              createdAt: { type: "string", format: "date-time" },
            },
          },
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
    description: "会话不存在",
  })
  async getFeedback(
    @Request() req: AuthenticatedRequest,
    @Param("sessionId") sessionId: string,
  ) {
    return this.stylistService.getSessionFeedback(req.user.id, sessionId);
  }

  @Get("system-context")
  @ApiOperation({
    summary: "获取系统上下文信息",
    description:
      "获取本地系统完整上下文，包括 Git 状态、数据库统计、服务健康状态、系统资源使用和项目文件信息。AI 造型师可通过 Agent Tool 主动调用此接口感知本地环境。",
  })
  @ApiQuery({
    name: "refresh",
    required: false,
    type: Boolean,
    description: "是否强制刷新缓存数据（默认 false）",
  })
  @ApiQuery({
    name: "section",
    required: false,
    type: String,
    enum: ["git", "database", "services", "resources", "files", "all"],
    description: "指定返回的数据分区，默认返回全部",
  })
  @ApiResponse({
    status: 200,
    description: "系统上下文信息",
    schema: {
      type: "object",
      properties: {
        timestamp: { type: "string" },
        environment: { type: "string" },
        git: { type: "object" },
        database: { type: "object" },
        services: { type: "object" },
        resources: { type: "object" },
        projectFiles: { type: "object" },
      },
    },
  })
  async getSystemContext(
    @Query("refresh") refresh?: string,
    @Query("section") section?: string,
  ) {
    const context = await this.systemContextService.getFullContext(
      refresh === "true",
    );
    if (section && section !== "all") {
      const keyMap: Record<string, keyof typeof context> = {
        git: "git",
        database: "database",
        services: "services",
        resources: "resources",
        files: "projectFiles",
      };
      const field = keyMap[section];
      if (field) {
        return { timestamp: context.timestamp, [section]: context[field] };
      }
    }
    return context;
  }
}
