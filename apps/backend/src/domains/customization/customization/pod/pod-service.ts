import { Injectable } from "@nestjs/common";
import { CustomizationStatus } from "../../../../types/prisma-enums";

import { PrismaService } from "../../../../common/prisma/prisma.service";

import { MockPODProvider } from "./mock-pod-provider";
import type { PODProvider } from "./pod-provider.interface";

@Injectable()
export class PODService {
  private provider: PODProvider;

  constructor(private prisma: PrismaService) {
    // Default to mock provider; can be configured via env var POD_PROVIDER
    this.provider = new MockPODProvider();
  }

  async submitToProduction(customizationRequestId: string) {
    const request = await this.prisma.customizationRequest.findUnique({
      where: { id: customizationRequestId },
      include: {
        design: { include: { template: true, layers: true } },
      },
    });

    if (!request) {
      throw new Error("定制需求不存在");
    }

    if (!request.design) {
      throw new Error("定制需求没有关联的设计");
    }

    const result = await this.provider.submitOrder(
      request.design.canvasData as Record<string, unknown>,
      { type: request.design.template.type, name: request.design.template.name },
      {},
    );

    const estimatedDeliveryDate = new Date(result.estimatedDelivery);

    await this.prisma.customizationRequest.update({
      where: { id: customizationRequestId },
      data: {
        podOrderId: result.providerOrderId,
        status: CustomizationStatus.in_progress,
        estimatedDeliveryDate,
      },
    });

    return {
      providerOrderId: result.providerOrderId,
      estimatedDelivery: result.estimatedDelivery,
      status: result.status,
    };
  }

  async checkProductionStatus(customizationRequestId: string) {
    const request = await this.prisma.customizationRequest.findUnique({
      where: { id: customizationRequestId },
    });

    if (!request?.podOrderId) {
      throw new Error("定制需求不存在或未提交生产");
    }

    const podStatus = await this.provider.getOrderStatus(request.podOrderId);

    if (podStatus.status === "shipped" && podStatus.trackingNumber) {
      await this.prisma.customizationRequest.update({
        where: { id: customizationRequestId },
        data: {
          status: CustomizationStatus.shipped,
          trackingNumber: podStatus.trackingNumber,
          carrier: podStatus.carrier,
        },
      });
    }

    return podStatus;
  }

  async getAvailableProducts() {
    return this.provider.getAvailableProducts();
  }
}
