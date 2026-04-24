import { Controller, Get, Post, Body, Param, Request, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiProperty,
} from "@nestjs/swagger";
import { IsString } from "class-validator";

import { AuthenticatedRequest } from "../../../common/types/auth.types";
import { AiStylistService } from "../../ai-core/ai-stylist/ai-stylist.service";
import { JwtAuthGuard } from "../../identity/auth/guards/jwt-auth.guard";

class MobileStylistChatDto {
  @ApiProperty({ description: "会话ID" })
  @IsString()
  sessionId!: string;

  @ApiProperty({ description: "消息内容" })
  @IsString()
  message!: string;
}

@ApiTags("Stylist (Mobile)")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("stylist")
export class MobileStylistController {
  constructor(private readonly aiStylistService: AiStylistService) {}

  @Post("chat")
  @ApiOperation({ summary: "发送 AI 造型师消息" })
  @ApiBody({ type: MobileStylistChatDto })
  @ApiResponse({ status: 201, description: "消息发送成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  async chat(@Request() req: AuthenticatedRequest, @Body() body: MobileStylistChatDto) {
    const data = await this.aiStylistService.sendMessage(req.user.id, body.sessionId, body.message);
    return { success: true, data };
  }

  @Get("sessions")
  @ApiOperation({ summary: "获取 AI 造型师会话列表" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  async listSessions(@Request() req: AuthenticatedRequest) {
    const data = await this.aiStylistService.listSessions(req.user.id);
    return { success: true, data };
  }

  @Get("sessions/:id")
  @ApiOperation({ summary: "获取 AI 造型师会话状态" })
  @ApiParam({ name: "id", description: "会话ID", type: String, format: "uuid" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "会话不存在" })
  async getSessionStatus(@Request() req: AuthenticatedRequest, @Param("id") sessionId: string) {
    const data = await this.aiStylistService.getSessionStatus(req.user.id, sessionId);
    return { success: true, data };
  }
}
