/* eslint-disable @typescript-eslint/no-explicit-any */
﻿import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";

import { JwtAuthGuard } from "../../../../domains/identity/auth/guards/jwt-auth.guard";

import { SubscribeDto } from "./dto";
import { StockNotificationService } from "./stock-notification.service";

@ApiTags("stock-notifications")
@Controller("stock-notifications")
export class StockNotificationController {
  constructor(
    private readonly stockNotificationService: StockNotificationService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Subscribe to stock notification" })
  async subscribe(
    @Req() req: { user: { id: string } },
    @Body() dto: SubscribeDto,
  ) {
    return this.stockNotificationService.subscribe(
      req.user.id,
      dto.itemId,
      dto.color,
      dto.size,
    );
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Unsubscribe from stock notification" })
  async unsubscribe(
    @Req() req: { user: { id: string } },
    @Param("id") id: string,
  ) {
    return this.stockNotificationService.unsubscribe(req.user.id, id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get user's stock notification subscriptions" })
  async getUserSubscriptions(@Req() req: { user: { id: string } }) {
    return this.stockNotificationService.getUserSubscriptions(req.user.id);
  }
}
