/* eslint-disable @typescript-eslint/no-explicit-any */
﻿import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { StockNotificationStatus } from "@prisma/client";

import { PrismaService } from "../../../../common/prisma/prisma.service";

@Injectable()
export class StockNotificationService {
  private readonly logger = new Logger(StockNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Subscribe a user to stock notifications for an item.
   * Enforces unique constraint (userId+itemId+color+size).
   * If already exists and CANCELLED, reactivate to PENDING.
   */
  async subscribe(
    userId: string,
    itemId: string,
    color?: string,
    size?: string,
  ) {
    const item = await this.prisma.clothingItem.findUnique({
      where: { id: itemId },
    });
    if (!item) {
      throw new NotFoundException("商品不存在");
    }

    const existing = await this.prisma.stockNotification.findFirst({
      where: {
        userId,
        itemId,
        color: color ?? null,
        size: size ?? null,
      },
    });

    if (existing) {
      if (existing.status === StockNotificationStatus.PENDING) {
        throw new BadRequestException("您已订阅该商品的到货通知");
      }
      if (existing.status === StockNotificationStatus.CANCELLED) {
        return this.prisma.stockNotification.update({
          where: { id: existing.id },
          data: { status: StockNotificationStatus.PENDING, notifiedAt: null },
        });
      }
      if (existing.status === StockNotificationStatus.NOTIFIED) {
        throw new BadRequestException("该商品已到货，无需重复订阅");
      }
    }

    const notification = await this.prisma.stockNotification.create({
      data: {
        userId,
        itemId,
        color: color || null,
        size: size || null,
        status: StockNotificationStatus.PENDING,
      },
    });

    this.logger.log(`User ${userId} subscribed to stock notification for item ${itemId}`);
    return notification;
  }

  /**
   * Unsubscribe (cancel) a stock notification. Verifies ownership.
   */
  async unsubscribe(userId: string, notificationId: string) {
    const notification = await this.prisma.stockNotification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) {
      throw new NotFoundException("通知记录不存在");
    }
    if (notification.userId !== userId) {
      throw new BadRequestException("无权操作此通知");
    }

    return this.prisma.stockNotification.update({
      where: { id: notificationId },
      data: { status: StockNotificationStatus.CANCELLED },
    });
  }

  /**
   * Get user's active (PENDING) subscriptions with item details.
   */
  async getUserSubscriptions(userId: string) {
    return this.prisma.stockNotification.findMany({
      where: {
        userId,
        status: StockNotificationStatus.PENDING,
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            mainImage: true,
            images: true,
            stock: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Called when stock is restocked. Finds all PENDING subscriptions for the item
   * and marks them as NOTIFIED. Emits STOCK_RESTOCKED event.
   */
  async checkAndNotify(itemId: string) {
    const subscriptions = await this.prisma.stockNotification.findMany({
      where: {
        itemId,
        status: StockNotificationStatus.PENDING,
      },
    });

    if (subscriptions.length === 0) {return;}

    const now = new Date();
    await this.prisma.stockNotification.updateMany({
      where: {
        itemId,
        status: StockNotificationStatus.PENDING,
      },
      data: {
        status: StockNotificationStatus.NOTIFIED,
        notifiedAt: now,
      },
    });

    this.eventEmitter.emit("STOCK_RESTOCKED", {
      itemId,
      notifiedUserIds: subscriptions.map((s) => s.userId),
      count: subscriptions.length,
    });

    this.logger.log(`Notified ${subscriptions.length} users about restock for item ${itemId}`);
  }

  /**
   * Check if item stock is at or below low stock threshold.
   * Emits LOW_STOCK event if so.
   */
  async checkLowStock(itemId: string) {
    const item = await this.prisma.clothingItem.findUnique({
      where: { id: itemId },
      select: { id: true, name: true, stock: true, lowStockThreshold: true },
    });

    if (!item) {return;}

    if (item.stock <= item.lowStockThreshold) {
      this.eventEmitter.emit("LOW_STOCK", {
        itemId: item.id,
        itemName: item.name,
        currentStock: item.stock,
        threshold: item.lowStockThreshold,
      });

      this.logger.warn(
        `Low stock alert: ${item.name} (stock: ${item.stock}, threshold: ${item.lowStockThreshold})`,
      );
    }
  }

  /**
   * Optional cleanup: cancel subscriptions older than 90 days.
   */
  async cleanupExpired() {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const result = await this.prisma.stockNotification.updateMany({
      where: {
        status: StockNotificationStatus.PENDING,
        createdAt: { lt: ninetyDaysAgo },
      },
      data: {
        status: StockNotificationStatus.CANCELLED,
      },
    });

    this.logger.log(`Cleaned up ${result.count} expired stock notifications`);
    return result;
  }
}
