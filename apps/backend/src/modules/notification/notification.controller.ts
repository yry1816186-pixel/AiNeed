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

import { AuthGuard } from "../auth/guards/auth.guard";
import { RequestWithUser } from "../../common/types/common.types";

import { NotificationService, UpdateNotificationSettingsDto } from "./services/notification.service";

@Controller("notifications")
@UseGuards(AuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * 获取通知列表
   */
  @Get()
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
  async markAsRead(@Request() req: RequestWithUser, @Param("id") id: string) {
    return this.notificationService.markAsRead(req.user.id, id);
  }

  /**
   * 标记全部已读
   */
  @Post("read-all")
  async markAllAsRead(@Request() req: RequestWithUser) {
    return this.notificationService.markAllAsRead(req.user.id);
  }

  /**
   * 删除通知
   */
  @Delete(":id")
  async delete(@Request() req: RequestWithUser, @Param("id") id: string) {
    return this.notificationService.delete(req.user.id, id);
  }

  /**
   * 获取通知设置
   */
  @Get("settings")
  async getSettings(@Request() req: RequestWithUser) {
    return this.notificationService.getUserSettings(req.user.id);
  }

  /**
   * 更新通知设置
   */
  @Post("settings")
  async updateSettings(
    @Request() req: RequestWithUser,
    @Body() settings: UpdateNotificationSettingsDto,
  ) {
    return this.notificationService.updateUserSettings(req.user.id, settings);
  }
}
