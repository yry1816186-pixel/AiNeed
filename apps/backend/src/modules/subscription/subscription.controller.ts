import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { AuthGuard } from "../auth/guards/auth.guard";
import { RequestWithUser } from "../../common/types/common.types";

import { SubscriptionService } from "./subscription.service";
import { SubscribeDto } from "./dto/subscribe.dto";

@ApiTags("subscription")
@ApiBearerAuth()
@Controller("subscriptions")
@UseGuards(AuthGuard)
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  /**
   * 获取所有会员计划（公开）
   */
  @Get("plans")
  @ApiOperation({ summary: "获取所有会员计划", description: "获取所有可用的会员订阅计划列表（公开接口，无需认证）" })
  @ApiResponse({ status: 200, description: "会员计划列表" })
  async getPlans() {
    return this.subscriptionService.getAllPlans();
  }

  /**
   * 获取当前用户订阅
   */
  @Get("current")
  @ApiOperation({ summary: "获取当前用户订阅", description: "获取当前登录用户的订阅信息" })
  @ApiResponse({ status: 200, description: "当前订阅信息" })
  @ApiResponse({ status: 401, description: "未授权" })
  async getCurrentSubscription(@Request() req: RequestWithUser) {
    return this.subscriptionService.getCurrentSubscription(req.user.id);
  }

  /**
   * 订阅计划
   */
  @Post("subscribe")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: "订阅计划", description: "用户订阅指定的会员计划" })
  @ApiResponse({ status: 201, description: "订阅成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  async subscribe(
    @Request() req: RequestWithUser,
    @Body() dto: SubscribeDto,
  ) {
    return this.subscriptionService.subscribe(
      req.user.id,
      dto.planId,
      dto.paymentMethod,
    );
  }

  /**
   * 取消订阅
   */
  @Post("cancel")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: "取消订阅", description: "取消当前用户的订阅" })
  @ApiResponse({ status: 200, description: "取消成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  async cancelSubscription(@Request() req: RequestWithUser) {
    await this.subscriptionService.cancelSubscription(req.user.id);
    return { success: true };
  }

  /**
   * 检查功能权限
   */
  @Get("check/:feature")
  @ApiOperation({ summary: "检查功能权限", description: "检查当前用户是否有权限使用指定功能" })
  @ApiParam({ name: "feature", description: "功能标识" })
  @ApiResponse({ status: 200, description: "权限检查结果" })
  @ApiResponse({ status: 401, description: "未授权" })
  async checkPermission(
    @Request() req: RequestWithUser,
    @Param("feature") feature: string,
  ) {
    return this.subscriptionService.checkPermission(req.user.id, feature);
  }
}
