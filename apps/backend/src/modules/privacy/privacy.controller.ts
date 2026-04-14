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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";

import { AuthGuard } from "../auth/guards/auth.guard";
import { RequestWithUser } from "../../common/types/common.types";

import { PrivacyService } from "./privacy.service";
import { RecordConsentDto, ExportDataDto, DeleteAccountDto } from "./dto";
import { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION, POLICY_UPDATED_AT } from "./privacy-version";

@ApiTags("privacy")
@ApiBearerAuth()
@Controller("privacy")
@UseGuards(AuthGuard)
export class PrivacyController {
  constructor(private readonly privacyService: PrivacyService) {}

  /**
   * Get current policy versions
   */
  @Get("policy-version")
  @ApiOperation({ summary: "Get policy versions", description: "Get the current versions of privacy policy and terms of service" })
  @ApiResponse({ status: 200, description: "Current policy versions" })
  getPolicyVersion() {
    return {
      termsOfService: CURRENT_TERMS_VERSION,
      privacyPolicy: CURRENT_PRIVACY_VERSION,
      updatedAt: POLICY_UPDATED_AT,
    };
  }

  /**
   * 获取用户同意记录
   */
  @Get("consents")
  @ApiOperation({ summary: "获取用户同意记录", description: "获取当前用户的所有隐私同意记录" })
  @ApiResponse({ status: 200, description: "成功返回同意记录列表" })
  @ApiResponse({ status: 401, description: "未授权" })
  async getConsents(@Request() req: RequestWithUser) {
    return this.privacyService.getUserConsents(req.user.id);
  }

  /**
   * 记录同意
   */
  @Post("consent")
  @ApiOperation({ summary: "记录同意", description: "记录用户对某项隐私政策的同意或拒绝" })
  @ApiResponse({ status: 200, description: "记录成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  async recordConsent(
    @Request() req: RequestWithUser,
    @Body() body: RecordConsentDto,
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
  @ApiOperation({ summary: "导出用户数据", description: "请求导出当前用户的个人数据，支持 JSON 和 CSV 格式" })
  @ApiResponse({ status: 200, description: "导出请求已创建" })
  @ApiResponse({ status: 401, description: "未授权" })
  async exportData(
    @Request() req: RequestWithUser,
    @Body() body: ExportDataDto,
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
  @ApiOperation({ summary: "获取导出状态", description: "查询数据导出请求的处理状态" })
  @ApiResponse({ status: 200, description: "成功返回导出状态" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "导出请求不存在" })
  @ApiParam({ name: "requestId", description: "导出请求ID" })
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
  @ApiOperation({ summary: "删除账户", description: "请求删除当前用户账户及关联数据" })
  @ApiResponse({ status: 200, description: "删除请求已创建" })
  @ApiResponse({ status: 401, description: "未授权" })
  async deleteAccount(@Request() req: RequestWithUser, @Body() body: DeleteAccountDto) {
    return this.privacyService.deleteUserData(req.user.id, body.reason);
  }

  /**
   * 获取删除状态
   */
  @Get("delete/:requestId")
  @ApiOperation({ summary: "获取删除状态", description: "查询账户删除请求的处理状态" })
  @ApiResponse({ status: 200, description: "成功返回删除状态" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "删除请求不存在" })
  @ApiParam({ name: "requestId", description: "删除请求ID" })
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
  @ApiOperation({ summary: "取消删除", description: "取消待处理的账户删除请求" })
  @ApiResponse({ status: 200, description: "取消成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "删除请求不存在" })
  @ApiParam({ name: "requestId", description: "删除请求ID" })
  async cancelDeletion(
    @Request() req: RequestWithUser,
    @Param("requestId") requestId: string,
  ) {
    return this.privacyService.cancelDeletionRequest(requestId, req.user.id);
  }
}
