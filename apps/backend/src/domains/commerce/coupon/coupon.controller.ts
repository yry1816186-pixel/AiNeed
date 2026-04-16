/* eslint-disable @typescript-eslint/no-explicit-any */
﻿import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";

import { JwtAuthGuard } from "../../../domains/identity/auth/guards/jwt-auth.guard";

import { CouponService } from "./coupon.service";
import { CreateCouponDto, ValidateCouponDto, ApplyCouponDto } from "./dto";

@ApiTags("coupons")
@Controller("coupons")
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @Post("validate")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Validate a coupon code" })
  async validateCoupon(@Req() req: { user: { id: string } }, @Body() dto: ValidateCouponDto) {
    return this.couponService.validateCoupon(
      dto.code,
      req.user.id,
      dto.orderAmount,
      dto.categoryIds,
      dto.brandId,
    );
  }

  @Post("apply")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Apply a coupon code to user account" })
  async applyCoupon(@Req() req: { user: { id: string } }, @Body() dto: ApplyCouponDto) {
    return this.couponService.applyCoupon(req.user.id, dto.code);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get user's coupons" })
  async getUserCoupons(
    @Req() req: { user: { id: string } },
    @Query("status") status?: string,
  ) {
    return this.couponService.getUserCoupons(req.user.id, status);
  }

  @Get("applicable")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get applicable coupons for cart" })
  async getApplicableCoupons(@Req() req: { user: { id: string } }) {
    return this.couponService.getApplicableCoupons(req.user.id, []);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create coupon (admin)" })
  async createCoupon(@Body() dto: CreateCouponDto) {
    return this.couponService.createCoupon(dto);
  }

  @Patch(":id/deactivate")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Deactivate coupon (admin)" })
  async deactivateCoupon(@Param("id") id: string) {
    return this.couponService.deactivateCoupon(id);
  }
}
