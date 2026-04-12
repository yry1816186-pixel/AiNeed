import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaClient, OrderStatus } from "@prisma/client";

import { StructuredLoggerService, ContextualLogger } from "../../common/logging";
import { PrismaService } from "../../common/prisma/prisma.service";
import { RedisService } from "../../common/redis/redis.service";

import {
  CreatePaymentDto,
  PaymentMethod,
  RefundPaymentDto,
  PaymentStatusResponseDto,
  RefundResponseDto,
  PaymentRecordDto,
  PaymentListResponseDto,
  PaymentStatus,
} from "./dto";
import {
  PAYMENT_EVENTS,
  PaymentSucceededPayload,
  PaymentFailedPayload,
  PaymentRefundedPayload,
  SubscriptionActivationPayload,
} from "./events";
import { AlipayProvider } from "./providers/alipay.provider";
import {
  PaymentProviderInterface,
  PaymentProvider,
  CreatePaymentOptions,
  PaymentResult,
  PaymentCallbackData,
  RefundOptions,
} from "./providers/payment-provider.interface";
import { WechatProvider } from "./providers/wechat.provider";
import {
  PaymentOrderMetadata,
  PaymentRecordMetadata,
  PaymentRawCallbackData,
} from "./types/common.types";


const PAYMENT_IDEMPOTENCY_PREFIX = "payment:idempotency:";
const IDEMPOTENCY_TTL_SECONDS = 300;

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly providers: Map<PaymentProvider, PaymentProviderInterface>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly alipayProvider: AlipayProvider,
    private readonly wechatProvider: WechatProvider,
    private readonly redisService: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.providers = new Map<PaymentProvider, PaymentProviderInterface>([
      ["alipay", alipayProvider as PaymentProviderInterface],
      ["wechat", wechatProvider as PaymentProviderInterface],
    ]);
  }

  /**
   * 创建支付订单
   */
  async createPayment(
    userId: string,
    dto: CreatePaymentDto,
  ): Promise<PaymentResult> {
    this.logger.log("创建支付订单", {
      userId,
      provider: dto.provider,
      amount: dto.amount,
      orderId: dto.orderId,
    });

    const provider = this.getProvider(dto.provider as PaymentProvider);

    // 检查是否已存在未支付的订单
    const existingOrder = await this.prisma.paymentRecord.findFirst({
      where: {
        userId,
        status: "pending",
        expiredAt: { gt: new Date() },
      },
    });

    if (existingOrder) {
      // 返回已存在的订单信息
      const queryResult = await provider.queryPayment(existingOrder.orderId);
      if (queryResult.status === "pending") {
        return {
          success: true,
          orderId: existingOrder.orderId,
          qrCode: existingOrder.qrCode || undefined,
          expireAt: existingOrder.expiredAt ?? undefined,
        };
      }
    }

    // 获取订单信息（从订阅模块或自定义订单）
    const orderInfo = await this.getOrderInfo(dto.orderId, userId);

    // 创建支付记录
    const expireMinutes = dto.expireMinutes || 30;
    const expiredAt = new Date();
    expiredAt.setMinutes(expiredAt.getMinutes() + expireMinutes);

    const paymentRecord = await this.prisma.paymentRecord.create({
      data: {
        orderId: dto.orderId,
        userId,
        provider: dto.provider,
        amount: dto.amount || orderInfo.amount,
        currency: "CNY",
        status: "pending",
        expiredAt,
        metadata: {
          subject: dto.subject || orderInfo.subject,
          body: dto.body,
          originalOrderId: dto.orderId,
        },
      },
    });

    // 调用支付提供商创建支付
    const options: CreatePaymentOptions = {
      orderId: paymentRecord.orderId,
      amount: paymentRecord.amount.toNumber(),
      subject: dto.subject || orderInfo.subject || "AiNeed 会员订阅",
      body: dto.body,
      method: dto.method,
      clientIp: dto.clientIp,
      expireMinutes,
      notifyUrl: this.getNotifyUrl(dto.provider),
    };

    const result = await provider.createPayment(options);

    if (result.success) {
      // 更新支付记录
      await this.prisma.paymentRecord.update({
        where: { id: paymentRecord.id },
        data: {
          qrCode: result.qrCode,
          tradeNo: result.tradeNo,
        },
      });

      this.logger.log("支付订单创建成功", {
        orderId: dto.orderId,
        provider: dto.provider,
        amount: paymentRecord.amount.toNumber(),
        userId,
      });
    } else {
      // 更新状态为失败
      await this.prisma.paymentRecord.update({
        where: { id: paymentRecord.id },
        data: {
          status: "failed",
          failedReason: result.error?.message,
        },
      });

      this.logger.error("支付订单创建失败", undefined, {
        orderId: dto.orderId,
        provider: dto.provider,
        error: result.error?.message,
        userId,
      });
    }

    return result;
  }

  /**
   * 查询支付状态
   */
  async queryPayment(
    userId: string,
    orderId: string,
  ): Promise<PaymentStatusResponseDto> {
    const record = await this.prisma.paymentRecord.findFirst({
      where: { orderId, userId },
    });

    if (!record) {
      throw new NotFoundException("Payment record not found");
    }

    // 如果状态是 pending，查询最新状态
    if (record.status === "pending") {
      const provider = this.getProvider(record.provider as PaymentProvider);
      const queryResult = await provider.queryPayment(orderId);

      if (
        queryResult.status !== "pending" &&
        (queryResult.status as string) !== record.status
      ) {
        // 状态发生变化，更新记录
        await this.prisma.paymentRecord.update({
          where: { id: record.id },
          data: {
            status: queryResult.status,
            tradeNo: queryResult.tradeNo,
            paidAt: queryResult.paidAt,
          },
        });

        return {
          orderId,
          tradeNo: queryResult.tradeNo,
          amount: queryResult.amount ?? 0,
          status: queryResult.status as PaymentStatus,
          paidAt: queryResult.paidAt,
        };
      }
    }

    return {
      orderId,
      tradeNo: record.tradeNo || undefined,
      amount: record.amount.toNumber(),
      status: record.status as PaymentStatus,
      paidAt: record.paidAt || undefined,
    };
  }

  /**
   * 处理支付回调
   */
  async handleCallback(
    providerName: PaymentProvider,
    callbackData: PaymentRawCallbackData,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log("收到支付回调", { provider: providerName });

    const provider = this.getProvider(providerName);

    // 验证签名
    if (!provider.verifyCallbackSign(callbackData)) {
      this.logger.warn("支付回调签名验证失败", { provider: providerName });
      return { success: false, message: "Invalid signature" };
    }

    // 解析回调数据
    const parsedData = await provider.handleCallback(callbackData);
    const { orderId, tradeNo, amount, status, paidAt } = parsedData;

    // 幂等性保护：使用 Redis 分布式锁
    const lockKey = `${PAYMENT_IDEMPOTENCY_PREFIX}${orderId}`;
    const lockValue = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const lockAcquired = await this.redisService.getClient().set(
      lockKey,
      lockValue,
      "PX",
      IDEMPOTENCY_TTL_SECONDS * 1000,
      "NX"
    );

    if (!lockAcquired) {
      this.logger.log("订单正在处理中", { orderId });
      return { success: true, message: "Order is being processed" };
    }

    try {
      // 查找支付记录
      const record = await this.prisma.paymentRecord.findUnique({
        where: { orderId },
      });

      if (!record) {
        this.logger.warn("支付记录不存在", { orderId });
        return { success: false, message: "Order not found" };
      }

      // 检查订单状态
      if (record.status !== "pending") {
        this.logger.log("订单已处理", { orderId, status: record.status });
        return { success: true, message: "Order already processed" };
      }

      // 金额校验
      if (Math.abs(record.amount.toNumber() - amount) > 0.01) {
        this.logger.warn("支付金额不匹配", {
          orderId,
          expected: record.amount.toNumber(),
          actual: amount,
        });
        return { success: false, message: "Amount mismatch" };
      }

      // 使用事务更新状态
      await this.prisma.$transaction(async (tx) => {
        // 更新支付记录
        await tx.paymentRecord.update({
          where: { id: record.id },
          data: {
            status: status === "paid" ? "paid" : "failed",
            tradeNo,
            paidAt,
            notifyData: callbackData as unknown as never, // Prisma Json 类型转换
          },
        });

        // 如果支付成功，激活订阅
        if (status === "paid") {
          await this.activateSubscription(record.userId, record.orderId);
        }
      });

      this.logger.log("支付回调处理成功", {
        orderId,
        status,
        userId: record.userId,
        amount: record.amount.toNumber(),
      });

      // Emit events for decoupled notification and subscription handling
      if (status === "paid") {
        const paymentOrder = await this.prisma.paymentOrder.findUnique({
          where: { id: orderId },
        });

        // Emit payment succeeded event
        const successPayload: PaymentSucceededPayload = {
          userId: record.userId,
          orderId,
          paymentRecordId: record.id,
          amount: record.amount.toNumber(),
          currency: record.currency,
          provider: record.provider,
          tradeNo,
          paidAt,
          metadata: paymentOrder?.metadata as PaymentOrderMetadata | undefined,
        };
        this.eventEmitter.emit(PAYMENT_EVENTS.PAYMENT_SUCCEEDED, successPayload);
      }

      return { success: true, message: "Success" };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error("支付回调处理失败", errorStack, {
        orderId,
        error: errorMessage,
      });
      return { success: false, message: "Processing failed" };
    } finally {
      // 释放锁（使用 Lua 脚本确保原子性）
      const releaseScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      await this.redisService.getClient().eval(releaseScript, 1, lockKey, lockValue);
    }
  }

  /**
   * 申请退款
   */
  async refund(
    userId: string,
    dto: RefundPaymentDto,
  ): Promise<RefundResponseDto> {
    const record = await this.prisma.paymentRecord.findFirst({
      where: { orderId: dto.orderId, userId },
    });

    if (!record) {
      throw new NotFoundException("Payment record not found");
    }

    if (record.status !== "paid") {
      throw new BadRequestException("Only paid orders can be refunded");
    }

    if (dto.amount > record.amount.toNumber()) {
      throw new BadRequestException(
        "Refund amount cannot exceed payment amount",
      );
    }

    const refundId = `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const provider = this.getProvider(record.provider as PaymentProvider);

    // 创建退款记录
    const refundRecord = await this.prisma.refundRecord.create({
      data: {
        id: refundId,
        paymentRecordId: record.id,
        amount: dto.amount,
        reason: dto.reason,
        status: "processing",
      },
    });

    // 调用支付提供商退款
    const options: RefundOptions = {
      orderId: dto.orderId,
      refundId,
      amount: dto.amount,
      reason: dto.reason,
    };

    const result = await provider.refund(options);

    // 更新退款记录
    await this.prisma.refundRecord.update({
      where: { id: refundId },
      data: {
        status: result.success ? "success" : "failed",
        refundNo: result.refundNo,
        failedReason: result.error?.message,
      },
    });

    if (result.success) {
      // 如果是全额退款，更新支付记录状态
      if (dto.amount >= record.amount.toNumber()) {
        await this.prisma.paymentRecord.update({
          where: { id: record.id },
          data: { status: "refunded", refundedAt: new Date() },
        });
      }

      // Emit refund event for notification
      const refundPayload: PaymentRefundedPayload = {
        userId: record.userId,
        orderId: dto.orderId,
        paymentRecordId: record.id,
        refundId,
        amount: dto.amount,
        reason: dto.reason,
      };
      this.eventEmitter.emit(PAYMENT_EVENTS.PAYMENT_REFUNDED, refundPayload);
    }

    return result;
  }

  /**
   * 关闭订单
   */
  async closeOrder(userId: string, orderId: string): Promise<boolean> {
    const record = await this.prisma.paymentRecord.findFirst({
      where: { orderId, userId },
    });

    if (!record) {
      throw new NotFoundException("Payment record not found");
    }

    if (record.status !== "pending") {
      throw new BadRequestException("Only pending orders can be closed");
    }

    const provider = this.getProvider(record.provider as PaymentProvider);
    const success = await provider.closeOrder(orderId);

    if (success) {
      await this.prisma.paymentRecord.update({
        where: { id: record.id },
        data: { status: "closed" },
      });
    }

    return success;
  }

  /**
   * 获取支付记录列表
   */
  async getPaymentRecords(
    userId: string,
    page: number = 1,
    pageSize: number = 10,
  ): Promise<PaymentListResponseDto> {
    const where = { userId };

    const [records, total] = await Promise.all([
      this.prisma.paymentRecord.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.paymentRecord.count({ where }),
    ]);

    return {
      items: records.map((record) => ({
        id: record.id,
        orderId: record.orderId,
        userId: record.userId,
        provider: record.provider,
        amount: record.amount.toNumber(),
        currency: record.currency,
        status: record.status,
        tradeNo: record.tradeNo || undefined,
        paidAt: record.paidAt || undefined,
        createdAt: record.createdAt,
        expiredAt: record.expiredAt || undefined,
      })),
      total,
      page,
      pageSize,
    };
  }

  /**
   * 轮询支付状态（用于前端）
   */
  async pollPaymentStatus(
    userId: string,
    orderId: string,
  ): Promise<{ paid: boolean; status: string }> {
    const result = await this.queryPayment(userId, orderId);
    return {
      paid: result.status === "paid",
      status: result.status,
    };
  }

  // ==================== 私有方法 ====================

  /**
   * 获取支付提供商
   */
  private getProvider(name: PaymentProvider): PaymentProviderInterface {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new BadRequestException(`Unsupported payment provider: ${name}`);
    }
    return provider;
  }

  /**
   * 获取回调 URL
   */
  private getNotifyUrl(provider: PaymentProvider): string {
    const baseUrl =
      this.configService.get<string>("BACKEND_URL") || "http://localhost:3001";
    return `${baseUrl}/api/v1/payment/callback/${provider}`;
  }

  /**
   * 获取订单信息
   */
  private async getOrderInfo(
    orderId: string,
    userId: string,
  ): Promise<{ amount: number; subject: string }> {
    // 检查是否是订阅订单
    const paymentOrder = await this.prisma.paymentOrder.findUnique({
      where: { id: orderId },
    });

    if (paymentOrder) {
      const metadata = paymentOrder.metadata as PaymentOrderMetadata;
      const amount =
        typeof paymentOrder.amount === "number"
          ? paymentOrder.amount
          : (paymentOrder.amount as { toNumber?: () => number }).toNumber?.() ||
            Number(paymentOrder.amount);
      return {
        amount,
        subject: `AiNeed ${metadata?.planName || "会员"}订阅`,
      };
    }

    // 默认返回
    return {
      amount: 0,
      subject: "AiNeed 服务",
    };
  }

  /**
   * 激活订阅 - 通过事件驱动
   */
  private async activateSubscription(
    userId: string,
    orderId: string,
  ): Promise<void> {
    const paymentOrder = await this.prisma.paymentOrder.findUnique({
      where: { id: orderId },
    });

    if (paymentOrder) {
      const metadata = paymentOrder.metadata as PaymentOrderMetadata;
      if (metadata?.planId) {
        // Emit event instead of direct service call
        const payload: SubscriptionActivationPayload = {
          userId,
          orderId,
          planId: metadata.planId,
          paymentRecordId: orderId,
          metadata,
        };
        this.eventEmitter.emit(
          PAYMENT_EVENTS.SUBSCRIPTION_ACTIVATION_REQUIRED,
          payload,
        );
      }
    }
  }

  // FIX-CODE-007: 支付宝签名验证方法 (修复时间: 2026-03-19)
  async verifyAlipaySignature(body: PaymentRawCallbackData): Promise<boolean> {
    try {
      const provider = this.getProvider("alipay");
      if ('verifyCallbackSign' in provider && typeof provider.verifyCallbackSign === 'function') {
        return provider.verifyCallbackSign(body);
      }
      this.logger.warn("支付宝Provider未实现签名验证方法");
      return false;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      this.logger.error("支付宝签名验证失败", undefined, { error: errorMessage });
      return false;
    }
  }

  /**
   * 自动关闭超时未支付订单（每5分钟执行）
   */
  @Cron("*/5 * * * *")
  async handleCloseExpiredPayments(): Promise<void> {
    const expiredThreshold = new Date();
    expiredThreshold.setMinutes(expiredThreshold.getMinutes() - 30);

    const expiredRecords = await this.prisma.paymentRecord.findMany({
      where: {
        status: "pending",
        expiredAt: { lt: new Date() },
        createdAt: { lt: expiredThreshold },
      },
      take: 50,
    });

    if (expiredRecords.length === 0) {
      return;
    }

    this.logger.log(`Found ${expiredRecords.length} expired payment records to close`);

    for (const record of expiredRecords) {
      try {
        const provider = this.getProvider(record.provider as PaymentProvider);
        await provider.closeOrder(record.orderId);

        await this.prisma.paymentRecord.update({
          where: { id: record.id },
          data: {
            status: "closed",
            cancelledAt: new Date(),
          },
        });

        await this.prisma.order.updateMany({
          where: {
            id: record.orderId,
            status: OrderStatus.pending,
          },
          data: {
            status: OrderStatus.cancelled,
          },
        });

        const orderWithItems = await this.prisma.order.findUnique({
          where: { id: record.orderId },
          include: { items: true },
        });

        if (orderWithItems) {
          for (const item of orderWithItems.items) {
            await this.prisma.clothingItem.update({
              where: { id: item.itemId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }

        this.eventEmitter.emit(PAYMENT_EVENTS.PAYMENT_CLOSED, {
          userId: record.userId,
          orderId: record.orderId,
          paymentRecordId: record.id,
        });

        this.logger.log(`Closed expired payment: ${record.orderId}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to close expired payment ${record.orderId}: ${message}`,
        );
      }
    }
  }
}
