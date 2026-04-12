import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiResponse } from '@nestjs/swagger';
import { MessagingService } from './messaging.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateRoomDto, SendMessageDto, GetMessagesQueryDto } from './dto/messaging.dto';

@ApiTags('Messaging')
@Controller('messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get('rooms')
  @ApiOperation({ summary: '获取聊天室列表', description: '获取当前用户的所有聊天室，按最新消息时间排序' })
  @ApiResponse({ status: 200, description: '返回聊天室列表' })
  @ApiResponse({ status: 401, description: '未认证' })
  async getRooms(@CurrentUser('id') userId: string) {
    return this.messagingService.getRooms(userId);
  }

  @Post('rooms')
  @ApiOperation({ summary: '创建聊天室', description: '发起私聊，创建与指定用户的聊天室' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  async createRoom(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateRoomDto,
  ) {
    return this.messagingService.createRoom(userId, dto);
  }

  @Get('rooms/:roomId/messages')
  @ApiOperation({ summary: '获取聊天消息列表', description: '获取指定聊天室的消息历史，支持分页和游标加载' })
  @ApiParam({ name: 'roomId', description: '聊天室ID (UUID)' })
  @ApiResponse({ status: 200, description: '返回消息列表' })
  @ApiResponse({ status: 404, description: '聊天室不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  async getMessages(
    @CurrentUser('id') userId: string,
    @Param('roomId') roomId: string,
    @Query() query: GetMessagesQueryDto,
  ) {
    return this.messagingService.getMessages(userId, roomId, query);
  }

  @Post('rooms/:roomId/messages')
  @ApiOperation({ summary: '发送消息', description: '向指定聊天室发送消息，支持文字/图片/文件类型' })
  @ApiParam({ name: 'roomId', description: '聊天室ID (UUID)' })
  @ApiResponse({ status: 201, description: '发送成功' })
  @ApiResponse({ status: 404, description: '聊天室不存在' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  async sendMessage(
    @CurrentUser('id') userId: string,
    @Param('roomId') roomId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagingService.sendMessage(userId, roomId, dto);
  }

  @Patch(':messageId/read')
  @ApiOperation({ summary: '标记消息已读', description: '将指定消息标记为已读' })
  @ApiParam({ name: 'messageId', description: '消息ID (UUID)' })
  @ApiResponse({ status: 200, description: '标记成功' })
  @ApiResponse({ status: 404, description: '消息不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  async markRead(
    @CurrentUser('id') userId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.messagingService.markRead(userId, messageId);
  }

  @Get('unread-count')
  @ApiOperation({ summary: '获取未读消息数', description: '获取当前用户所有聊天室的未读消息总数' })
  @ApiResponse({ status: 200, description: '返回未读消息数' })
  @ApiResponse({ status: 401, description: '未认证' })
  async getUnreadCount(@CurrentUser('id') userId: string) {
    return this.messagingService.getUnreadCount(userId);
  }
}
