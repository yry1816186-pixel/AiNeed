import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";

import { AdminGuard } from "../../common/guards/admin.guard";
import { AuthGuard } from "../auth/guards/auth.guard";

import { AdminDashboardService } from "./services/admin-dashboard.service";

@ApiTags("admin/dashboard")
@Controller("admin/dashboard")
@UseGuards(AuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get("overview")
  @ApiOperation({ summary: "Get overview statistics" })
  async getOverview() {
    return this.dashboardService.getOverviewStats();
  }

  @Get("top-products")
  @ApiOperation({ summary: "Get top selling products" })
  async getTopProducts(@Query("limit") limit?: string) {
    const parsedLimit = Math.min(parseInt(limit ?? "20", 10), 100);
    return this.dashboardService.getTopProducts(parsedLimit);
  }

  @Get("conversion")
  @ApiOperation({ summary: "Get conversion rates" })
  async getConversion() {
    return this.dashboardService.getConversionRates();
  }

  @Get("retention")
  @ApiOperation({ summary: "Get user retention stats" })
  async getRetention() {
    return this.dashboardService.getRetentionStats();
  }
}
