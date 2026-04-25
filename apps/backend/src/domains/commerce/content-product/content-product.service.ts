import { Injectable, Logger, BadRequestException } from "@nestjs/common";

import { PrismaService } from "../../../common/prisma/prisma.service";
import { PaymentService } from "../payment/payment.service";

import {
  ContentProductInfo,
  CheckPurchasedResult,
  PurchaseResult,
} from "./dto/content-product.dto";

/**
 * Content products available for one-time purchase (D-06/D-07/D-09)
 * Prices are server-side constants -- never trust client input for amounts.
 */
const PRODUCTS: ContentProductInfo[] = [
  {
    productType: "color_report",
    name: "专属色彩报告",
    description: "基于肤色分析的个性化色彩方案",
    price: 9.9,
    currency: "CNY",
  },
  {
    productType: "body_report",
    name: "体型分析报告",
    description: "精准体型诊断与穿搭建议",
    price: 9.9,
    currency: "CNY",
  },
  {
    productType: "capsule_wardrobe",
    name: "胶囊衣橱方案",
    description: "30件胶囊衣橱AI定制方案",
    price: 19.0,
    currency: "CNY",
  },
];

@Injectable()
export class ContentProductService {
  private readonly logger = new Logger(ContentProductService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService
  ) {}

  /**
   * Get all available content products.
   */
  getProducts(): ContentProductInfo[] {
    return PRODUCTS;
  }

  /**
   * Check if a user has purchased a specific content product.
   */
  async checkPurchased(userId: string, productType: string): Promise<CheckPurchasedResult> {
    const record = await this.prisma.contentPurchase.findUnique({
      where: { userId_productType: { userId, productType } },
    });

    return {
      purchased: !!record,
      unlockedAt: record?.unlockedAt ?? undefined,
    };
  }

  /**
   * Initiate a content product purchase.
   * Creates a PaymentOrder via PaymentService with metadata identifying the product type.
   */
  async purchase(
    userId: string,
    dto: { productType: string; provider: "alipay" | "wechat"; method?: string }
  ): Promise<PurchaseResult> {
    // Check if already purchased
    const existing = await this.prisma.contentPurchase.findUnique({
      where: { userId_productType: { userId, productType: dto.productType } },
    });

    if (existing) {
      throw new BadRequestException("Already purchased");
    }

    // Get product info from server constant
    const product = PRODUCTS.find((p) => p.productType === dto.productType);
    if (!product) {
      throw new BadRequestException(`Unknown product type: ${dto.productType}`);
    }

    // Create payment order
    const result = await this.paymentService.createPayment(userId, {
      orderId: `cp_${userId.slice(0, 8)}_${dto.productType}_${Date.now()}`,
      provider: dto.provider,
      amount: product.price,
      subject: product.name,
      body: product.description,
      method: (dto.method as "qrcode" | "h5" | "app" | "native") || "qrcode",
    });

    return {
      success: result.success,
      orderId: result.orderId ?? "",
      qrCode: result.qrCode,
      expireAt: result.expireAt,
    };
  }

  /**
   * Handle payment completion for content products.
   * Uses upsert for idempotency -- duplicate callbacks are safe.
   * Listens to PAYMENT_EVENTS.CONTENT_PURCHASE_COMPLETED
   */
  async handlePaymentCompleted(payload: {
    userId: string;
    orderId: string;
    productType: string;
    amount: number;
  }): Promise<void> {
    this.logger.log(
      `Processing content purchase completion for user ${payload.userId}, product ${payload.productType}`
    );

    // Upsert handles idempotency: if already exists, update is a no-op
    await this.prisma.contentPurchase.upsert({
      where: {
        userId_productType: {
          userId: payload.userId,
          productType: payload.productType,
        },
      },
      create: {
        userId: payload.userId,
        productType: payload.productType,
        orderId: payload.orderId,
        amount: payload.amount,
        currency: "CNY",
        status: "active",
      },
      update: {},
    });
  }

  /**
   * Get all active content purchases for a user.
   */
  async getPurchasedProducts(userId: string) {
    return this.prisma.contentPurchase.findMany({
      where: { userId, status: "active" },
      orderBy: { unlockedAt: "desc" },
    });
  }

  /**
   * Dispatch capsule wardrobe AI generation job.
   * Actual AI generation consumer is implemented in Plan 09-05.
   */
  async generateCapsuleWardrobe(userId: string): Promise<{ status: string; message: string }> {
    // Verify user has purchased capsule wardrobe
    const purchase = await this.prisma.contentPurchase.findUnique({
      where: { userId_productType: { userId, productType: "capsule_wardrobe" } },
    });

    if (!purchase) {
      throw new BadRequestException("Please purchase capsule wardrobe first");
    }

    // TODO: Dispatch BullMQ job for async AI generation in Plan 09-05
    this.logger.log(`Capsule wardrobe generation dispatched for user ${userId}`);

    return {
      status: "generating",
      message: "胶囊衣橱方案正在生成中，预计 5 分钟后完成",
    };
  }
}
