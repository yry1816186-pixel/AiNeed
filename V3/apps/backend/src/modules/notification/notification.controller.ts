import {
  Controller,
  Get,
  Patch,
  Delete,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { NotificationService } from './notification.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Notification')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: '通知列表', description: '获取当前用户的通知列表，按时间倒序排列，支持分页' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码(默认1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '每页数量(默认20)' })
  @ApiResponse({ status: 200, description: '返回通知列表' })
  @ApiResponse({ status: 401, description: '未认证' })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.notificationService.findAll(
      userId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @Get('unread-count')
  @ApiOperation({ summary: '未读通知计数', description: '获取当前用户的未读通知数量' })
  @ApiResponse({ status: 200, description: '返回未读数量' })
  @ApiResponse({ status: 401, description: '未认证' })
  async getUnreadCount(@CurrentUser('id') userId: string) {
    return this.notificationService.getUnreadCount(userId);
  }

  @Patch('read-all')
  @ApiOperation({ summary: '全部标记已读', description: '将当前用户所有通知标记为已读' })
  @ApiResponse({ status: 200, description: '操作成功' })
  @ApiResponse({ status: 401, description: '未认证' })
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationService.markAllAsRead(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: '标记单条已读', description: '将指定通知标记为已读' })
  @ApiParam({ name: 'id', description: '通知ID (UUID)' })
  @ApiResponse({ status: 200, description: '标记成功' })
  @ApiResponse({ status: 404, description: '通知不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @CurrentUser('id') userId: string,
    @Param('id') notificationId: string,
  ) {
    return this.notificationService.markAsRead(userId, notificationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除通知', description: '删除指定通知' })
  @ApiParam({ name: 'id', description: '通知ID (UUID)' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '通知不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser('id') userId: string,
    @Param('id') notificationId: string,
  ) {
    return this.notificationService.remove(userId, notificationId);
  }
}
