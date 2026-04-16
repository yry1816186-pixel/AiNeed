/* eslint-disable @typescript-eslint/no-explicit-any */
﻿import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { CreatePaymentDto, PaymentProvider, PaymentMethod } from "../dto";
import { PaymentService } from "../payment.service";

@Injectable()
export class SubscriptionRenewalListener {
  private readonly logger = new Logger(SubscriptionRenewalListener.name);

  constructor(private readonly paymentService: PaymentService) {}

  @OnEvent("subscription.renewal.required")
  async handleRenewalPayment(
    payload: import("../../subscription/subscription.service").SubscriptionRenewalPayload,
  ): Promise<void> {
    this.logger.log(
      `Processing renewal payment for user ${payload.userId}, plan ${payload.planName}`,
    );

    try {
      const provider = payload.paymentMethod === "wechat"
        ? PaymentProvider.WECHAT
        : PaymentProvider.ALIPAY;

      const dto: CreatePaymentDto = {
        orderId: `renewal_${payload.subscriptionId}_${Date.now()}`,
        amount: payload.amount,
        provider,
        method: PaymentMethod.QRCODE,
        subject: `xuno ${payload.planName}会员续费`,
        body: `自动续费 - ${payload.planName}会员月度订阅`,
        expireMinutes: 30,
      };

      const result = await this.paymentService.createPayment(
        payload.userId,
        dto,
      );

      if (result.success) {
        this.logger.log(
          `Renewal payment created for user ${payload.userId}, orderId: ${result.orderId}`,
        );
      } else {
        this.logger.error(
          `Renewal payment creation failed for user ${payload.userId}: ${result.error?.message}`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to process renewal payment for user ${payload.userId}: ${message}`,
      );
    }
  }
}
