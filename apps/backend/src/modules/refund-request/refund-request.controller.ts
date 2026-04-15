import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

import {
  CreateRefundRequestDto,
  AddTrackingNumberDto,
  ApproveRefundDto,
  RejectRefundDto,
} from "./dto";
import { RefundRequestService } from "./refund-request.service";

@ApiTags("refund-requests")
@Controller("refund-requests")
export class RefundRequestController {
  constructor(private readonly refundRequestService: RefundRequestService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create refund request" })
  async create(
    @Req() req: { user: { id: string } },
    @Body() dto: CreateRefundRequestDto,
  ) {
    return this.refundRequestService.create(req.user.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get user's refund requests" })
  async getUserRefundRequests(
    @Req() req: { user: { id: string } },
    @Query("orderId") orderId?: string,
  ) {
    return this.refundRequestService.getUserRefundRequests(req.user.id, orderId);
  }

  @Get("order/:orderId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get order's refund requests" })
  async getOrderRefundRequests(@Param("orderId") orderId: string) {
    return this.refundRequestService.getOrderRefundRequests(orderId);
  }

  @Patch(":id/tracking")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Add tracking number for return-refund" })
  async addTrackingNumber(
    @Req() req: { user: { id: string } },
    @Param("id") id: string,
    @Body() dto: AddTrackingNumberDto,
  ) {
    return this.refundRequestService.addTrackingNumber(
      req.user.id,
      id,
      dto.trackingNumber,
    );
  }

  @Patch(":id/approve")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Approve refund request (admin/merchant)" })
  async approve(
    @Param("id") id: string,
    @Body() dto: ApproveRefundDto,
  ) {
    return this.refundRequestService.approve(id, dto.adminNote);
  }

  @Patch(":id/reject")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Reject refund request (admin/merchant)" })
  async reject(
    @Param("id") id: string,
    @Body() dto: RejectRefundDto,
  ) {
    return this.refundRequestService.reject(id, dto.adminNote);
  }

  @Patch(":id/complete")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Complete refund (admin/merchant)" })
  async complete(@Param("id") id: string) {
    return this.refundRequestService.completeRefund(id);
  }
}
