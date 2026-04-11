import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Ip,
  Headers,
} from "@nestjs/common";

import { AuthGuard } from "../auth/guards/auth.guard";
import { RequestWithUser } from "../../common/types/common.types";

import { PrivacyService } from "./privacy.service";

@Controller("privacy")
@UseGuards(AuthGuard)
export class PrivacyController {
  constructor(private readonly privacyService: PrivacyService) {}

  /**
   * 获取用户同意记录
   */
  @Get("consents")
  async getConsents(@Request() req: RequestWithUser) {
    return this.privacyService.getUserConsents(req.user.id);
  }

  /**
   * 记录同意
   */
  @Post("consent")
  async recordConsent(
    @Request() req: RequestWithUser,
    @Body() body: { consentType: string; granted: boolean },
    @Ip() ip: string,
    @Headers("user-agent") userAgent: string,
  ) {
    return this.privacyService.recordConsent(
      req.user.id,
      body.consentType,
      body.granted,
      {
        ipAddress: ip,
        userAgent,
      },
    );
  }

  /**
   * 导出数据
   */
  @Post("export")
  async exportData(
    @Request() req: RequestWithUser,
    @Body() body: { format?: "json" | "csv" },
  ) {
    return this.privacyService.exportUserData(
      req.user.id,
      body.format || "json",
    );
  }

  /**
   * 获取导出状态
   */
  @Get("export/:requestId")
  async getExportStatus(
    @Request() req: RequestWithUser,
    @Param("requestId") requestId: string,
  ) {
    return this.privacyService.getExportRequest(requestId, req.user.id);
  }

  /**
   * 删除账户
   */
  @Post("delete")
  async deleteAccount(@Request() req: RequestWithUser, @Body() body: { reason?: string }) {
    return this.privacyService.deleteUserData(req.user.id, body.reason);
  }

  /**
   * 获取删除状态
   */
  @Get("delete/:requestId")
  async getDeletionStatus(
    @Request() req: RequestWithUser,
    @Param("requestId") requestId: string,
  ) {
    return this.privacyService.getDeletionRequest(requestId, req.user.id);
  }

  /**
   * 取消删除
   */
  @Post("delete/:requestId/cancel")
  async cancelDeletion(
    @Request() req: RequestWithUser,
    @Param("requestId") requestId: string,
  ) {
    return this.privacyService.cancelDeletionRequest(requestId, req.user.id);
  }
}
