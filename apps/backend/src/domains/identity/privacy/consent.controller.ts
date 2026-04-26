import { Controller, Get, Post, Body, UseGuards, Request, Ip, Headers } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";

import { RequestWithUser } from "../../../common/types/common.types";
import { AuthGuard } from "../auth/guards/auth.guard";

import {
  CONSENT_LABELS,
  CONSENT_DESCRIPTIONS,
  REQUIRED_CONSENTS,
  OPTIONAL_CONSENTS,
} from "./consent-types";
import { RecordPIPLConsentDto, WithdrawConsentDto } from "./dto";
import { PrivacyService } from "./privacy.service";

@ApiTags("consent")
@ApiBearerAuth()
@Controller("consent")
@UseGuards(AuthGuard)
export class ConsentController {
  constructor(private readonly privacyService: PrivacyService) {}

  @Post("record")
  @ApiOperation({
    summary: "记录用户同意",
    description:
      "记录用户对特定数据类型的同意。支持类型：body_measurement, photo_processing, body_type_classification, ai_recommendation, tracking",
  })
  @ApiResponse({ status: 200, description: "记录成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  async recordConsent(
    @Request() req: RequestWithUser,
    @Body() dto: RecordPIPLConsentDto,
    @Ip() ip: string,
    @Headers("user-agent") userAgent: string
  ) {
    return this.privacyService.recordConsent(req.user.id, dto.consentType, dto.granted, {
      ipAddress: ip,
      userAgent,
    });
  }

  @Get("status")
  @ApiOperation({
    summary: "查询用户同意状态",
    description: "获取当前用户对所有同意类型的状态，包括已同意、未同意和已撤回",
  })
  @ApiResponse({ status: 200, description: "成功返回同意状态" })
  @ApiResponse({ status: 401, description: "未授权" })
  async getConsentStatus(@Request() req: RequestWithUser) {
    const consents = await this.privacyService.getUserConsents(req.user.id);

    const allTypes = [...REQUIRED_CONSENTS, ...OPTIONAL_CONSENTS];
    const consentMap = new Map(consents.map((c) => [c.consentType, c]));

    const status = allTypes.map((type: string) => {
      const record = consentMap.get(type as any);
      return {
        consentType: type,
        label: (CONSENT_LABELS as Record<string, string>)[type] ?? type,
        description: (CONSENT_DESCRIPTIONS as Record<string, string>)[type] ?? "",
        granted: record?.granted ?? false,
        grantedAt: record?.grantedAt ?? null,
        revokedAt: record?.revokedAt ?? null,
        isRequired: (REQUIRED_CONSENTS as string[]).includes(type),
      };
    });

    return { consents: status };
  }

  @Post("withdraw")
  @ApiOperation({
    summary: "撤回同意",
    description: "撤回用户对特定数据类型的同意。撤回后相关功能将不可用。",
  })
  @ApiResponse({ status: 200, description: "撤回成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  async withdrawConsent(
    @Request() req: RequestWithUser,
    @Body() dto: WithdrawConsentDto,
    @Ip() ip: string,
    @Headers("user-agent") userAgent: string
  ) {
    return this.privacyService.recordConsent(req.user.id, dto.consentType, false, {
      ipAddress: ip,
      userAgent,
    });
  }
}
