import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";

import { RequestWithUser } from "../../common/types/common.types";
import { AuthGuard } from "../auth/guards/auth.guard";

import { ChatService } from "./chat.service";
import {
  CreateChatRoomDto,
  UpdateChatRoomDto,
  ChatRoomQueryDto,
  CreateChatMessageDto,
  MessageQueryDto,
  MarkReadDto,
} from "./dto";

@ApiTags("chat")
@ApiBearerAuth()
@Controller("chat")
@UseGuards(AuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // ==================== 聊天室 ====================

  @Post("rooms")
  @ApiOperation({ summary: "创建聊天室", description: "用户与顾问之间创建新的聊天室" })
  @ApiResponse({ status: 201, description: "聊天室创建成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  async createRoom(
    @Request() req: RequestWithUser,
    @Body() dto: CreateChatRoomDto,
  ) {
    return this.chatService.createRoom(req.user.id, dto);
  }

  @Get("rooms")
  @ApiOperation({ summary: "获取我的聊天室列表", description: "分页获取当前用户参与的所有聊天室" })
  @ApiResponse({ status: 200, description: "聊天室列表" })
  @ApiResponse({ status: 401, description: "未授权" })
  async getMyRooms(
    @Request() req: RequestWithUser,
    @Query() query: ChatRoomQueryDto,
  ) {
    return this.chatService.getRoomsByUser(req.user.id, query);
  }

  @Get("rooms/:id")
  @ApiOperation({ summary: "获取聊天室详情", description: "根据 ID 获取指定聊天室的详细信息" })
  @ApiParam({ name: "id", description: "聊天室 ID" })
  @ApiResponse({ status: 200, description: "聊天室详情" })
  @ApiResponse({ status: 404, description: "聊天室不存在" })
  @ApiResponse({ status: 401, description: "未授权" })
  async getRoomById(
    @Request() req: RequestWithUser,
    @Param("id") id: string,
  ) {
    return this.chatService.getRoomById(req.user.id, id);
  }

  @Put("rooms/:id")
  @ApiOperation({ summary: "更新聊天室", description: "更新聊天室状态（如启用/禁用）" })
  @ApiParam({ name: "id", description: "聊天室 ID" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 404, description: "聊天室不存在" })
  @ApiResponse({ status: 401, description: "未授权" })
  async updateRoom(
    @Request() req: RequestWithUser,
    @Param("id") id: string,
    @Body() dto: UpdateChatRoomDto,
  ) {
    return this.chatService.updateRoom(req.user.id, id, dto);
  }

  // ==================== 聊天消息 ====================

  @Post("messages")
  @ApiOperation({ summary: "发送消息", description: "在聊天室中发送文本、图片或文件消息" })
  @ApiResponse({ status: 201, description: "消息发送成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  async sendMessage(
    @Request() req: RequestWithUser,
    @Body() dto: CreateChatMessageDto,
  ) {
    return this.chatService.sendMessage(req.user.id, dto);
  }

  @Get("rooms/:roomId/messages")
  @ApiOperation({ summary: "获取聊天消息列表", description: "分页获取指定聊天室的消息记录" })
  @ApiParam({ name: "roomId", description: "聊天室 ID" })
  @ApiResponse({ status: 200, description: "消息列表" })
  @ApiResponse({ status: 401, description: "未授权" })
  async getMessages(
    @Request() req: RequestWithUser,
    @Param("roomId") roomId: string,
    @Query() query: MessageQueryDto,
  ) {
    return this.chatService.getMessages(req.user.id, roomId, query);
  }

  @Put("rooms/:roomId/read")
  @ApiOperation({ summary: "标记消息已读", description: "将指定聊天室的消息标记为已读" })
  @ApiParam({ name: "roomId", description: "聊天室 ID" })
  @ApiResponse({ status: 200, description: "标记成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  async markAsRead(
    @Request() req: RequestWithUser,
    @Param("roomId") roomId: string,
    @Body() dto: MarkReadDto,
  ) {
    return this.chatService.markAsRead(req.user.id, roomId, dto);
  }

  @Get("rooms/:roomId/unread-count")
  @ApiOperation({ summary: "获取未读消息数", description: "获取指定聊天室的未读消息数量" })
  @ApiParam({ name: "roomId", description: "聊天室 ID" })
  @ApiResponse({ status: 200, description: "未读消息数" })
  @ApiResponse({ status: 401, description: "未授权" })
  async getUnreadCount(
    @Request() req: RequestWithUser,
    @Param("roomId") roomId: string,
  ) {
    return this.chatService.getUnreadCount(req.user.id, roomId);
  }
}
