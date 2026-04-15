import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Param,
  Body,
  UseGuards,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from "@nestjs/swagger";

import { RequestWithUser } from "../../common/types/common.types";
import { AuthGuard } from "../auth/guards/auth.guard";

import { RegisterDeviceTokenDto, DeregisterDeviceTokenDto } from "./dto/push-notification.dto";
import { NotificationService, UpdateNotificationSettingsDto } from "./services/notification.service";
import { PushNotificationService } from "./services/push-notification.service";

@ApiTags("notification")
@ApiBearerAuth()
@Controller("notifications")
@UseGuards(AuthGuard)
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  /**
   * 获取通知列表
   */
  @Get()
  @ApiOperation({ summary: "获取通知列表", description: "分页获取当前用户的通知列表，支持筛选未读通知" })
  @ApiResponse({ status: 200, description: "成功返回通知列表" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiQuery({ name: "limit", required: false, description: "每页数量，默认20", type: Number })
  @ApiQuery({ name: "offset", required: false, description: "偏移量，默认0", type: Number })
  @ApiQuery({ name: "unreadOnly", required: false, description: "仅未读通知", type: Boolean })
  async getNotifications(
    @Request() req: RequestWithUser,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
    @Query("unreadOnly") unreadOnly?: string,
  ) {
    return this.notificationService.getUserNotifications(req.user.id, {
      limit: limit ? parseInt(limit) : 20,
      offset: offset ? parseInt(offset) : 0,
      unreadOnly: unreadOnly === "true",
    });
  }

  /**
   * 标记为已读
   */
  @Post(":id/read")
  @ApiOperation({ summary: "标记通知为已读", description: "将指定通知标记为已读状态" })
  @ApiResponse({ status: 200, description: "标记成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "通知不存在" })
  @ApiParam({ name: "id", description: "通知ID" })
  async markAsRead(@Request() req: RequestWithUser, @Param("id") id: string) {
    return this.notificationService.markAsRead(req.user.id, id);
  }

  /**
   * 标记全部已读
   */
  @Post("read-all")
  @ApiOperation({ summary: "标记全部已读", description: "将当前用户所有未读通知标记为已读" })
  @ApiResponse({ status: 200, description: "标记成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  async markAllAsRead(@Request() req: RequestWithUser) {
    return this.notificationService.markAllAsRead(req.user.id);
  }

  /**
   * 删除通知
   */
  @Delete(":id")
  @ApiOperation({ summary: "删除通知", description: "删除指定的通知" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "通知不存在" })
  @ApiParam({ name: "id", description: "通知ID" })
  async delete(@Request() req: RequestWithUser, @Param("id") id: string) {
    return this.notificationService.delete(req.user.id, id);
  }

  /**
   * 获取通知设置
   */
  @Get("settings")
  @ApiOperation({ summary: "获取通知设置", description: "获取当前用户的通知偏好设置" })
  @ApiResponse({ status: 200, description: "成功返回通知设置" })
  @ApiResponse({ status: 401, description: "未授权" })
  async getSettings(@Request() req: RequestWithUser) {
    return this.notificationService.getUserSettings(req.user.id);
  }

  /**
   * 更新通知设置
   */
  @Post("settings")
  @ApiOperation({ summary: "更新通知设置", description: "更新当前用户的通知偏好设置" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  async updateSettings(
    @Request() req: RequestWithUser,
    @Body() settings: UpdateNotificationSettingsDto,
  ) {
    return this.notificationService.updateUserSettings(req.user.id, settings);
  }

  // ==================== Device Token Management ====================

  /**
   * Register a device push token
   */
  @Post("device-token")
  @ApiOperation({ summary: "注册设备推送令牌", description: "注册或更新设备的FCM/APNs推送令牌" })
  @ApiResponse({ status: 201, description: "注册成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  async registerDeviceToken(
    @Request() req: RequestWithUser,
    @Body() dto: RegisterDeviceTokenDto,
  ) {
    return this.pushNotificationService.registerDeviceToken(
      req.user.id,
      dto.token,
      dto.platform,
      dto.appId,
    );
  }

  /**
   * Deregister a device push token
   */
  @Delete("device-token/:token")
  @ApiOperation({ summary: "注销设备推送令牌", description: "注销指定的设备推送令牌" })
  @ApiResponse({ status: 200, description: "注销成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiParam({ name: "token", description: "设备推送令牌" })
  async deregisterDeviceToken(
    @Request() req: RequestWithUser,
    @Param("token") token: string,
  ) {
    return this.pushNotificationService.deregisterDeviceToken(req.user.id, token);
  }

  /**
   * List user's registered devices
   */
  @Get("device-tokens")
  @ApiOperation({ summary: "获取已注册设备列表", description: "获取当前用户所有已注册推送的设备列表" })
  @ApiResponse({ status: 200, description: "成功返回设备列表" })
  @ApiResponse({ status: 401, description: "未授权" })
  async getDeviceTokens(@Request() req: RequestWithUser) {
    return this.pushNotificationService.getUserDevices(req.user.id);
  }
}
