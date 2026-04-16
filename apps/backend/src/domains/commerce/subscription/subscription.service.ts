/* eslint-disable @typescript-eslint/no-explicit-any */
﻿import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Cron } from "@nestjs/schedule";

import { MembershipPlan, UserSubscription, BehaviorEventType } from "../../../types/prisma-enums";

import { PrismaService } from "../../../common/prisma/prisma.service";
import {
  MEMBERSHIP_PLANS,
  MembershipPlanConfig,
} from "../../../config/membership-plans";

export interface SubscriptionRenewalPayload {
  userId: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  subscriptionId: string;
}

export interface PermissionCheckResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  unlimited: boolean;
}

/**
 * 月度使用量数据结构
 */
interface MonthlyUsage {
  [feature: string]: number;
}

/**
 * 订阅包含计划信息的完整类型
 */
type SubscriptionWithPlan = UserSubscription & {
  plan: MembershipPlan;
};

/**
 * 支付结果
 */
interface PaymentResult {
  success: boolean;
  error?: string;
}

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * 获取所有会员计划
   */
  async getAllPlans() {
    const plans = await this.prisma.membershipPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    // 如果数据库中没有计划，返回默认配置
    if (plans.length === 0) {
      return Object.values(MEMBERSHIP_PLANS).map((plan) => ({
        name: plan.name,
        displayName: plan.displayName,
        price: plan.price,
        currency: plan.currency,
        features: plan.features,
      }));
    }

    return plans;
  }

  /**
   * 订阅会员计划
   */
  async subscribe(
    userId: string,
    planId: string,
    paymentMethod: string,
  ): Promise<{ orderId: string }> {
    const plan = await this.prisma.membershipPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException("Plan not found");
    }

    // 检查是否已有活跃订阅
    const existingSubscription = await this.getActiveSubscription(userId);
    if (existingSubscription) {
      throw new ForbiddenException("User already has an active subscription");
    }

    // 创建支付订单
    const order = await this.prisma.paymentOrder.create({
      data: {
        userId,
        amount: plan.price,
        currency: plan.currency,
        paymentMethod,
        status: "pending",
        metadata: { planId, planName: plan.name },
      },
    });

    // 这里应该调用支付服务，现在模拟支付成功
    if (Number(plan.price) === 0) {
      // 免费计划直接激活
      await this.activateSubscription(userId, planId, order.id);
      return { orderId: order.id };
    }

    // 返回订单ID，前端跳转到支付页面
    return { orderId: order.id };
  }

  /**
   * 激活订阅
   */
  async activateSubscription(
    userId: string,
    planId: string,
    orderId: string,
  ): Promise<void> {
    const plan = await this.prisma.membershipPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException("Plan not found");
    }

    const startedAt = new Date();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1); // 1个月

    await this.prisma.$transaction([
      this.prisma.userSubscription.create({
        data: {
          userId,
          planId,
          status: "active",
          startedAt,
          expiresAt,
          usageThisMonth: {},
        },
      }),
      this.prisma.paymentOrder.update({
        where: { id: orderId },
        data: { status: "paid", paidAt: new Date() },
      }),
    ]);

    this.logger.log(
      `Activated subscription for user ${userId}, plan ${plan.name}`,
    );
  }

  /**
   * 获取用户当前订阅
   */
  async getCurrentSubscription(userId: string) {
    const subscription = await this.prisma.userSubscription.findFirst({
      where: {
        userId,
        status: "active",
        expiresAt: { gt: new Date() },
      },
      include: { plan: true },
    });

    if (!subscription) {
      // 返回免费计划
      const freePlan = await this.prisma.membershipPlan.findFirst({
        where: { name: "free" },
      });

      return {
        plan: freePlan || MEMBERSHIP_PLANS.free,
        status: "free",
        usageThisMonth: {},
      };
    }

    return subscription;
  }

  /**
   * 获取活跃订阅
   */
  async getActiveSubscription(userId: string) {
    return this.prisma.userSubscription.findFirst({
      where: {
        userId,
        status: "active",
        expiresAt: { gt: new Date() },
      },
      include: { plan: true },
    });
  }

  /**
   * 检查用户权限
   */
  async checkPermission(
    userId: string,
    feature: string,
  ): Promise<PermissionCheckResult> {
    const subscription = await this.getActiveSubscription(userId);
    const features = subscription?.plan?.features as Record<string, unknown> | undefined;

    // 免费用户，使用免费计划配置
    if (!subscription) {
      const limit = this.getNumericFeatureLimit(
        MEMBERSHIP_PLANS.free?.features,
        feature,
      );

      // 获取本月使用量（从用户行为统计）
      const usage = await this.getMonthlyUsage(userId, feature);

      return {
        allowed: limit === -1 || usage < limit,
        remaining: limit === -1 ? -1 : Math.max(0, limit - usage),
        limit,
        unlimited: limit === -1,
      };
    }

    // 获取功能限制
    const limit = this.getNumericFeatureLimit(features, feature);

    // 无限次数
    if (limit === -1) {
      return {
        allowed: true,
        remaining: -1,
        limit: -1,
        unlimited: true,
      };
    }

    // 检查月度用量
    const usage = this.getUsageFromSubscription(subscription, feature);

    return {
      allowed: usage < limit,
      remaining: Math.max(0, limit - usage),
      limit,
      unlimited: false,
    };
  }

  /**
   * 记录功能使用
   */
  async recordUsage(userId: string, feature: string): Promise<void> {
    const subscription = await this.getActiveSubscription(userId);

    if (!subscription) {
      // 免费用户记录到行为统计
      return;
    }

    const usage = subscription.usageThisMonth as MonthlyUsage;
    usage[feature] = (usage[feature] || 0) + 1;

    await this.prisma.userSubscription.update({
      where: { id: subscription.id },
      data: { usageThisMonth: usage },
    });
  }

  /**
   * 取消订阅
   */
  async cancelSubscription(userId: string): Promise<void> {
    const subscription = await this.getActiveSubscription(userId);

    if (!subscription) {
      throw new NotFoundException("No active subscription found");
    }

    await this.prisma.userSubscription.update({
      where: { id: subscription.id },
      data: {
        autoRenew: false,
        cancelledAt: new Date(),
      },
    });
  }

  /**
   * 自动续费检查（每天执行）
   */
  @Cron("0 0 * * *")
  async checkAutoRenewal(): Promise<void> {
    const threeDaysLater = new Date();
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);

    const expiringSoon = await this.prisma.userSubscription.findMany({
      where: {
        status: "active",
        autoRenew: true,
        expiresAt: { lte: threeDaysLater },
      },
      include: { plan: true },
    });

    this.logger.log(`Found ${expiringSoon.length} subscriptions expiring soon`);

    for (const sub of expiringSoon) {
      try {
        if (sub.autoRenew) {
          this.logger.log(`Attempting auto-renewal for subscription ${sub.id}`);
          await this.processAutoRenewal(sub);
        } else {
          await this.sendExpirationReminder(sub);
        }
      } catch (error) {
        const message = this.getErrorMessage(error);
        this.logger.error(
          `Failed to process subscription ${sub.id}: ${message}`,
        );
      }
    }
  }

  private async processAutoRenewal(subscription: SubscriptionWithPlan): Promise<void> {
    const { userId, plan } = subscription;

    try {
      const paymentResult = await this.createRenewalPayment(userId, plan);

      if (paymentResult.success) {
        // 不直接激活订阅，等待支付回调确认后再激活
        // 支付成功后 PaymentService 会发出 SUBSCRIPTION_ACTIVATION_REQUIRED 事件
        // 由 PaymentEventListener 处理激活
        this.logger.log(
          `Renewal payment order created for subscription ${subscription.id}, waiting for payment confirmation`,
        );
      } else {
        const failureReason = paymentResult.error ?? "Renewal payment failed";
        await this.sendRenewalFailedNotification(
          userId,
          plan,
          failureReason,
        );
        this.logger.warn(
          `Auto-renewal failed for subscription ${subscription.id}: ${failureReason}`,
        );
      }
    } catch (error) {
      const message = this.getErrorMessage(error);
      this.logger.error(
        `Auto-renewal error for subscription ${subscription.id}: ${message}`,
      );
      await this.sendRenewalFailedNotification(userId, plan, message);
    }
  }

  private async createRenewalPayment(
    userId: string,
    plan: MembershipPlan,
  ): Promise<PaymentResult> {
    const subscription = await this.prisma.userSubscription.findFirst({
      where: { userId, status: "active" },
      include: { plan: true },
    });

    if (!subscription) {
      return { success: false, error: "No active subscription found" };
    }

    const amount =
      typeof plan.price === "number"
        ? plan.price
        : (plan.price as { toNumber?: () => number }).toNumber?.() ||
          Number(plan.price);

    if (amount === 0) {
      return { success: true };
    }

    try {
      const paymentOrder = await this.prisma.paymentOrder.create({
        data: {
          userId,
          amount,
          currency: plan.currency || "CNY",
          paymentMethod: subscription.paymentMethod || "alipay",
          status: "pending",
          metadata: {
            planId: plan.id,
            planName: plan.name,
            subscriptionId: subscription.id,
            isRenewal: true,
          },
        },
      });

      const payload: SubscriptionRenewalPayload = {
        userId,
        planId: plan.id,
        planName: plan.name,
        amount,
        currency: plan.currency || "CNY",
        paymentMethod: subscription.paymentMethod || "alipay",
        subscriptionId: subscription.id,
      };

      this.eventEmitter.emit("subscription.renewal.required", payload);

      this.logger.log(
        `Created renewal payment order ${paymentOrder.id} for subscription ${subscription.id}`,
      );

      return { success: true };
    } catch (error) {
      const message = this.getErrorMessage(error);
      this.logger.error(`Failed to create renewal payment: ${message}`);
      return { success: false, error: message };
    }
  }

  private async sendExpirationReminder(subscription: SubscriptionWithPlan): Promise<void> {
    const { userId, plan, expiresAt } = subscription;

    await this.prisma.notification.create({
      data: {
        userId,
        type: "subscription_expiring",
        title: "会员即将到期",
        content: `您的${plan.displayName}会员将于 ${expiresAt.toLocaleDateString()} 到期，请及时续费以继续享受会员权益。`,
        targetType: "subscription",
        targetId: subscription.id,
      },
    });

    this.logger.log(`Sent expiration reminder to user ${userId}`);
  }

  private async sendRenewalSuccessNotification(
    userId: string,
    plan: MembershipPlan,
  ): Promise<void> {
    await this.prisma.notification.create({
      data: {
        userId,
        type: "subscription_activated",
        title: "会员续费成功",
        content: `您的${plan.displayName}会员已自动续费成功，感谢您的支持！`,
        targetType: "plan",
        targetId: plan.id,
      },
    });
  }

  private async sendRenewalFailedNotification(
    userId: string,
    plan: MembershipPlan,
    _error: string,
  ): Promise<void> {
    await this.prisma.notification.create({
      data: {
        userId,
        type: "renewal_failed",
        title: "会员续费失败",
        content: `您的${plan.displayName}会员自动续费失败，请检查支付方式后重试。`,
        targetType: "plan",
        targetId: plan.id,
      },
    });
  }

  /**
   * 重置月度用量（每月1日执行）
   */
  @Cron("0 0 1 * *")
  async resetMonthlyUsage(): Promise<void> {
    await this.prisma.userSubscription.updateMany({
      data: { usageThisMonth: {} },
    });

    this.logger.log("Reset monthly usage for all subscriptions");
  }

  /**
   * 获取本月使用量
   */
  private async getMonthlyUsage(
    userId: string,
    feature: string,
  ): Promise<number> {
    // 简化实现：从行为事件统计
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const count = await this.prisma.userBehaviorEvent.count({
      where: {
        userId,
        eventType: this.featureToEventType(feature) as BehaviorEventType,
        createdAt: { gte: startOfMonth },
      },
    });

    return count;
  }

  /**
   * 从订阅中获取用量
   */
  private getUsageFromSubscription(subscription: UserSubscription, feature: string): number {
    const usage = subscription.usageThisMonth as MonthlyUsage;
    return usage?.[feature] || 0;
  }

  /**
   * 功能映射到事件类型
   */
  private featureToEventType(feature: string): string {
    const mapping: Record<string, string> = {
      tryOn: "try_on_complete",
      aiAnalysis: "item_view",
      visualSearch: "search",
    };
    return mapping[feature] || "item_view";
  }

  /**
   * 初始化默认计划
   */
  async initializePlans(): Promise<void> {
    const existingPlans = await this.prisma.membershipPlan.count();

    if (existingPlans > 0) {return;}

    for (const [_key, plan] of Object.entries(MEMBERSHIP_PLANS)) {
      await this.prisma.membershipPlan.create({
        data: {
          name: plan.name,
          displayName: plan.displayName,
          price: plan.price,
          currency: plan.currency,
          features: plan.features as Record<string, unknown>,
          isActive: plan.isActive,
          sortOrder: plan.sortOrder,
        },
      });
    }

    this.logger.log("Initialized default membership plans");
  }

  private getNumericFeatureLimit(
    features:
      | MembershipPlanConfig["features"]
      | Record<string, unknown>
      | undefined,
    feature: string,
  ): number {
    if (!features) {
      return 0;
    }

    const value = (features as Record<string, unknown>)[feature];
    return typeof value === "number" ? value : 0;
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
