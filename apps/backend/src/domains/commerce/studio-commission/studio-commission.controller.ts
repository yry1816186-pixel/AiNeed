import { Controller, Get, Post, Body, Query, Request, UseGuards } from "@nestjs/common";

import { JwtAuthGuard } from "../../identity/auth/guards/jwt-auth.guard";

import { StudioCommissionService } from "./studio-commission.service";
import { RecordReferralDto, GetCommissionBillsDto } from "./dto/studio-commission.dto";

interface RequestWithUser {
  user: { id: string; role?: string };
}

@Controller("studio/commission")
@UseGuards(JwtAuthGuard)
export class StudioCommissionController {
  constructor(private readonly studioCommissionService: StudioCommissionService) {}

  /**
   * POST /studio/commission/referral/record
   * Silent referral tracking (D-14).
   * Called when user clicks StudioRecommendCard.
   */
  @Post("referral/record")
  recordReferral(@Request() req: RequestWithUser, @Body() body: RecordReferralDto) {
    return this.studioCommissionService.recordReferral(req.user.id, body);
  }

  /**
   * GET /studio/commission/bills
   * Get commission bills, filtered by studioId or period.
   */
  @Get("bills")
  getCommissionBills(@Query() query: GetCommissionBillsDto) {
    return this.studioCommissionService.getCommissionBills(query);
  }

  /**
   * POST /studio/commission/bills/generate
   * Manual bill generation trigger (admin only).
   */
  @Post("bills/generate")
  generateBill(
    @Request() req: RequestWithUser,
    @Body() body: { studioId: string; period: string }
  ) {
    // Admin-only check
    if (req.user.role !== "admin") {
      return { error: "Forbidden: admin only" };
    }

    return this.studioCommissionService.generateMonthlyBill(body.studioId, body.period);
  }
}
