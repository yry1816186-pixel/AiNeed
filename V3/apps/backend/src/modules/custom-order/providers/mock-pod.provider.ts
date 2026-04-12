import { Injectable, Logger } from '@nestjs/common';
import {
  IPODProvider,
  PODOrderResult,
  PODOrderStatus,
  TrackingInfo,
} from './pod-provider.interface';

@Injectable()
export class MockPODProvider implements IPODProvider {
  private readonly logger = new Logger(MockPODProvider.name);
  private readonly orderStatuses = new Map<string, { status: PODOrderStatus; createdAt: Date }>();
  private readonly carrierNames = ['顺丰速运', '中通快递', '圆通速递', '韵达快递', '极兔速递'];

  async submitOrder(order: {
    designId: string;
    productType: string;
    material: string;
    size: string;
    quantity: number;
    shippingAddress: Record<string, unknown>;
  }): Promise<PODOrderResult> {
    const podOrderId = `POD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const estimatedDays = Math.floor(Math.random() * 5) + 3;

    this.orderStatuses.set(podOrderId, {
      status: 'confirmed',
      createdAt: new Date(),
    });

    this.logger.log(
      `Mock POD: 订单已提交 podOrderId=${podOrderId}, productType=${order.productType}, estimatedDays=${estimatedDays}`,
    );

    return { podOrderId, estimatedDays };
  }

  async getOrderStatus(podOrderId: string): Promise<PODOrderStatus> {
    const record = this.orderStatuses.get(podOrderId);
    if (!record) {
      return 'pending';
    }

    const elapsedMs = Date.now() - record.createdAt.getTime();
    const elapsedHours = elapsedMs / (1000 * 60 * 60);

    if (elapsedHours < 1) return 'confirmed';
    if (elapsedHours < 24) return 'producing';
    if (elapsedHours < 48) return 'quality_check';
    if (elapsedHours < 72) return 'shipped';
    return 'delivered';
  }

  async getTracking(podOrderId: string): Promise<TrackingInfo> {
    const record = this.orderStatuses.get(podOrderId);
    const carrier = this.carrierNames[Math.floor(Math.random() * this.carrierNames.length)];
    const trackingNumber = `SF${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const now = new Date();
    const nodes = [
      {
        time: new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString(),
        description: '订单已提交至生产中心',
        location: '广州市白云区',
      },
      {
        time: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(),
        description: '生产完成，品质检验中',
        location: '广州市白云区',
      },
    ];

    if (record) {
      const elapsedMs = Date.now() - record.createdAt.getTime();
      const elapsedHours = elapsedMs / (1000 * 60 * 60);

      if (elapsedHours >= 48) {
        nodes.push({
          time: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
          description: '检验通过，已打包出库',
          location: '广州市白云区',
        });
      }

      if (elapsedHours >= 72) {
        nodes.push({
          time: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
          description: '快件已发出',
          location: '广州市转运中心',
        });
        nodes.push({
          time: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
          description: '快件运输中',
          location: '目的地城市转运中心',
        });
      }
    }

    return { trackingNumber, carrier, nodes };
  }
}
