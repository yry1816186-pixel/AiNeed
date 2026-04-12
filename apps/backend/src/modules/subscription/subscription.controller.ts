import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from "@nestjs/common";

import { AuthGuard } from "../auth/guards/auth.guard";
import { RequestWithUser } from "../../common/types/common.types";

import { SubscriptionService } from "./subscription.service";

@Controller("subscriptions")
@UseGuards(AuthGuard)
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  /**
   * 获取所有会员计划（公开）
   */
  @Get("plans")
  async getPlans() {
    return this.subscriptionService.getAllPlans();
  }

  /**
   * 获取当前用户订阅
   */
  @Get("current")
  async getCurrentSubscription(@Request() req: RequestWithUser) {
    return this.subscriptionService.getCurrentSubscription(req.user.id);
  }

  /**
   * 订阅计划
   */
  @Post("subscribe")
  async subscribe(
    @Request() req: RequestWithUser,
    @Body() body: { planId: string; paymentMethod: string },
  ) {
    return this.subscriptionService.subscribe(
      req.user.id,
      body.planId,
      body.paymentMethod,
    );
  }

  /**
   * 取消订阅
   */
  @Post("cancel")
  async cancelSubscription(@Request() req: RequestWithUser) {
    await this.subscriptionService.cancelSubscription(req.user.id);
    return { success: true };
  }

  /**
   * 检查功能权限
   */
  @Get("check/:feature")
  async checkPermission(
    @Request() req: RequestWithUser,
    @Param("feature") feature: string,
  ) {
    return this.subscriptionService.checkPermission(req.user.id, feature);
  }
}
