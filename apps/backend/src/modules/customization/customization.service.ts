import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import {
  CustomizationType,
  CustomizationStatus,
  ProductTemplateType,
  Prisma,
} from "@prisma/client";

import { PrismaService } from "../../common/prisma/prisma.service";
import { pricingEngine } from "./pricing/pricing-engine";
import type { PricingResult } from "./pricing/pricing-engine";
import { PODService } from "./pod/pod-service";
import {
  getTemplateSeedData,
  getTemplatesByType,
} from "./templates/customization-templates";

@Injectable()
export class CustomizationService {
  constructor(
    private prisma: PrismaService,
    private podService: PODService,
  ) {}

  // ==================== Template Methods ====================

  async getTemplates(type?: ProductTemplateType) {
    if (type) {
      return getTemplatesByType(type);
    }
    return getTemplateSeedData();
  }

  async getTemplateById(templateId: string) {
    const template = await this.prisma.customizationTemplate.findUnique({
      where: { id: templateId },
    });
    if (!template) {
      throw new NotFoundException("模板不存在");
    }
    return template;
  }

  // ==================== Design Methods ====================

  async createDesign(
    userId: string,
    templateId: string,
    canvasData: Record<string, unknown>,
  ) {
    const template = await this.prisma.customizationTemplate.findUnique({
      where: { id: templateId },
    });
    if (!template) {
      throw new NotFoundException("模板不存在");
    }

    return this.prisma.customizationDesign.create({
      data: {
        userId,
        templateId,
        canvasData: canvasData as Prisma.InputJsonValue,
      },
    });
  }

  async updateDesign(
    designId: string,
    userId: string,
    canvasData: Record<string, unknown>,
    layers?: Array<{
      type: string;
      content: string;
      x: number;
      y: number;
      width: number;
      height: number;
      scale: number;
      rotation: number;
      opacity: number;
      zIndex: number;
      fontSize?: number;
      color?: string;
      fontFamily?: string;
      imageUrl?: string;
      shapeType?: string;
      fillColor?: string;
      strokeColor?: string;
      strokeWidth?: number;
    }>,
  ) {
    const design = await this.prisma.customizationDesign.findFirst({
      where: { id: designId, userId },
    });
    if (!design) {
      throw new NotFoundException("设计不存在");
    }

    if (layers && layers.length > 0) {
      await this.prisma.customizationDesignLayer.deleteMany({
        where: { designId },
      });

      await this.prisma.customizationDesignLayer.createMany({
        data: layers.map((layer, index) => ({
          designId,
          type: layer.type as any,
          content: layer.content,
          x: layer.x ?? 0,
          y: layer.y ?? 0,
          width: layer.width ?? 100,
          height: layer.height ?? 100,
          scale: layer.scale ?? 1,
          rotation: layer.rotation ?? 0,
          opacity: layer.opacity ?? 1,
          zIndex: layer.zIndex ?? index,
          fontSize: layer.fontSize,
          color: layer.color,
          fontFamily: layer.fontFamily,
          imageUrl: layer.imageUrl,
          shapeType: layer.shapeType,
          fillColor: layer.fillColor,
          strokeColor: layer.strokeColor,
          strokeWidth: layer.strokeWidth,
        })),
      });
    }

    return this.prisma.customizationDesign.update({
      where: { id: designId },
      data: {
        canvasData: canvasData as Prisma.InputJsonValue,
      },
      include: { layers: { orderBy: { zIndex: "asc" } } },
    });
  }

  async getDesign(designId: string, userId: string) {
    const design = await this.prisma.customizationDesign.findFirst({
      where: { id: designId, userId },
      include: {
        template: true,
        layers: { orderBy: { zIndex: "asc" } },
      },
    });
    if (!design) {
      throw new NotFoundException("设计不存在");
    }
    return design;
  }

  // ==================== Pricing + Quote Methods ====================

  async calculateQuote(
    designId: string,
    userId: string,
    printSide: "front" | "back" | "both" = "front",
  ): Promise<{ pricing: PricingResult; quoteId: string }> {
    const design = await this.prisma.customizationDesign.findFirst({
      where: { id: designId, userId },
      include: { layers: true, template: true },
    });
    if (!design) {
      throw new NotFoundException("设计不存在");
    }

    const layerCount = design.layers.length;
    const hasTextLayers = design.layers.some((l) => l.type === "text");
    const imageCount = design.layers.filter((l) => l.type === "image").length;

    const pricing = pricingEngine.calculatePrice({
      templateType: design.template.type,
      layerCount,
      hasTextLayers,
      imageCount,
      printSide,
    });

    const quote = await this.prisma.customizationQuote.create({
      data: {
        requestId: "placeholder",
        providerId: "auto-pricing",
        providerName: "AiNeed 自动报价",
        price: pricing.totalPrice,
        currency: pricing.currency,
        estimatedDays: pricing.estimatedDays,
        description: `基础价: ${pricing.basePrice} | 复杂度附加: ${pricing.complexitySurcharge} | 文字附加: ${pricing.textSurcharge} | 双面附加: ${pricing.sideSurcharge}`,
        terms: "定制商品不支持退款（生产特殊性）",
      },
    });

    return { pricing, quoteId: quote.id };
  }

  // ==================== Customization Request from Design ====================

  async createCustomizationFromDesign(
    userId: string,
    designId: string,
    quoteId: string,
  ) {
    const design = await this.prisma.customizationDesign.findFirst({
      where: { id: designId, userId },
      include: { template: true },
    });
    if (!design) {
      throw new NotFoundException("设计不存在");
    }

    const quote = await this.prisma.customizationQuote.findUnique({
      where: { id: quoteId },
    });
    if (!quote) {
      throw new NotFoundException("报价不存在");
    }

    const request = await this.prisma.customizationRequest.create({
      data: {
        userId,
        type: CustomizationType.pod,
        title: `定制${design.template.name}`,
        description: `基于模板「${design.template.name}」的定制设计`,
        referenceImages: [],
        preferences: { printSide: "front" },
        status: CustomizationStatus.quoting,
        designId,
        templateId: design.templateId,
      },
    });

    await this.prisma.customizationQuote.update({
      where: { id: quoteId },
      data: { requestId: request.id },
    });

    return this.prisma.customizationRequest.findUnique({
      where: { id: request.id },
      include: {
        quotes: { orderBy: { createdAt: "desc" } },
        design: { include: { layers: true, template: true } },
      },
    });
  }

  // ==================== Preview Methods ====================

  async generatePreview(designId: string, userId: string) {
    const design = await this.prisma.customizationDesign.findFirst({
      where: { id: designId, userId },
      include: { template: true },
    });
    if (!design) {
      throw new NotFoundException("设计不存在");
    }

    // Placeholder: In production, call GLM image-to-image API to generate
    // a realistic preview of the design on the product.
    // For MVP, we store the canvas data as-is and return a placeholder URL.
    const previewUrl = `/previews/${designId}.png`;

    await this.prisma.customizationDesign.update({
      where: { id: designId },
      data: { previewUrl },
    });

    return { previewUrl, designId };
  }

  // ==================== Original CRUD Methods ====================

  async createRequest(
    userId: string,
    data: {
      type: CustomizationType;
      title?: string;
      description: string;
      referenceImages?: string[];
      preferences?: Record<string, unknown>;
    },
  ) {
    return this.prisma.customizationRequest.create({
      data: {
        userId,
        type: data.type,
        title: data.title,
        description: data.description,
        referenceImages: data.referenceImages || [],
        preferences: data.preferences ? (data.preferences as Prisma.InputJsonValue) : {},
        status: CustomizationStatus.draft,
      },
    });
  }

  async submitRequest(requestId: string, userId: string) {
    const request = await this.prisma.customizationRequest.findFirst({
      where: { id: requestId, userId },
    });

    if (!request) {
      throw new NotFoundException("定制需求不存在");
    }

    return this.prisma.customizationRequest.update({
      where: { id: requestId },
      data: { status: CustomizationStatus.submitted },
    });
  }

  async getUserRequests(
    userId: string,
    status?: CustomizationStatus,
    page: number = 1,
    limit: number = 10,
  ) {
    const where: Prisma.CustomizationRequestWhereInput = { userId };
    if (status) {
      where.status = status;
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.customizationRequest.findMany({
        where,
        include: {
          quotes: {
            orderBy: { createdAt: "desc" },
          },
          design: {
            include: {
              template: true,
              layers: { orderBy: { zIndex: "asc" } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.customizationRequest.count({ where }),
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getRequestById(requestId: string, userId: string) {
    return this.prisma.customizationRequest.findFirst({
      where: { id: requestId, userId },
      include: {
        quotes: {
          orderBy: { createdAt: "desc" },
        },
        design: {
          include: {
            template: true,
            layers: { orderBy: { zIndex: "asc" } },
          },
        },
      },
    });
  }

  async updateRequest(
    requestId: string,
    userId: string,
    data: {
      title?: string;
      description?: string;
      referenceImages?: string[];
      preferences?: Record<string, unknown>;
    },
  ) {
    const request = await this.prisma.customizationRequest.findFirst({
      where: { id: requestId, userId, status: CustomizationStatus.draft },
    });

    if (!request) {
      throw new NotFoundException("定制需求不存在或无法修改");
    }

    return this.prisma.customizationRequest.update({
      where: { id: requestId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.referenceImages !== undefined && { referenceImages: data.referenceImages }),
        ...(data.preferences !== undefined && { preferences: data.preferences as Prisma.InputJsonValue }),
      },
    });
  }

  async selectQuote(requestId: string, userId: string, quoteId: string) {
    const request = await this.prisma.customizationRequest.findFirst({
      where: { id: requestId, userId },
    });

    if (!request) {
      throw new NotFoundException("定制需求不存在");
    }

    const quote = await this.prisma.customizationQuote.findUnique({
      where: { id: quoteId, requestId },
    });

    if (!quote) {
      throw new NotFoundException("报价不存在");
    }

    return this.prisma.customizationRequest.update({
      where: { id: requestId },
      data: {
        selectedQuoteId: quoteId,
        status: CustomizationStatus.confirmed,
      },
    });
  }

  async cancelRequest(requestId: string, userId: string) {
    const request = await this.prisma.customizationRequest.findFirst({
      where: {
        id: requestId,
        userId,
        status: {
          in: [CustomizationStatus.draft, CustomizationStatus.submitted],
        },
      },
    });

    if (!request) {
      throw new NotFoundException("定制需求不存在或无法取消");
    }

    return this.prisma.customizationRequest.update({
      where: { id: requestId },
      data: { status: CustomizationStatus.cancelled },
    });
  }

  // ==================== Payment + Production Methods ====================

  async confirmAndPay(
    requestId: string,
    userId: string,
    paymentMethod: string,
  ) {
    const request = await this.prisma.customizationRequest.findFirst({
      where: { id: requestId, userId },
      include: { quotes: true },
    });

    if (!request) {
      throw new NotFoundException("定制需求不存在");
    }

    if (request.status !== CustomizationStatus.confirmed) {
      throw new BadRequestException("需求状态不允许付款");
    }

    if (!request.selectedQuoteId) {
      throw new BadRequestException("请先选择报价");
    }

    // Create a payment record (placeholder -- integrates with PaymentService)
    const paymentId = `pay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    await this.prisma.customizationRequest.update({
      where: { id: requestId },
      data: {
        paymentId,
        status: CustomizationStatus.confirmed,
      },
    });

    return { paymentId, amount: request.quotes[0]?.price, paymentMethod };
  }

  async handlePaymentCallback(
    requestId: string,
    paymentResult: { success: boolean; paymentId: string },
  ) {
    if (!paymentResult.success) {
      return { status: "payment_failed" };
    }

    // On payment success, submit to POD
    try {
      const podResult = await this.podService.submitToProduction(requestId);
      return { status: "production_started", podResult };
    } catch {
      return { status: "payment_confirmed_production_pending" };
    }
  }

  async getProductionStatus(requestId: string, userId: string) {
    const request = await this.prisma.customizationRequest.findFirst({
      where: { id: requestId, userId },
    });

    if (!request) {
      throw new NotFoundException("定制需求不存在");
    }

    if (request.podOrderId) {
      try {
        const podStatus = await this.podService.checkProductionStatus(requestId);
        return {
          status: request.status,
          podStatus,
          trackingNumber: request.trackingNumber,
          carrier: request.carrier,
          estimatedDeliveryDate: request.estimatedDeliveryDate,
        };
      } catch {
        // POD check failed, return current status
      }
    }

    return {
      status: request.status,
      trackingNumber: request.trackingNumber,
      carrier: request.carrier,
      estimatedDeliveryDate: request.estimatedDeliveryDate,
    };
  }

  async confirmDelivery(requestId: string, userId: string) {
    const request = await this.prisma.customizationRequest.findFirst({
      where: { id: requestId, userId, status: CustomizationStatus.shipped },
    });

    if (!request) {
      throw new NotFoundException("定制需求不存在或状态不允许确认收货");
    }

    return this.prisma.customizationRequest.update({
      where: { id: requestId },
      data: { status: CustomizationStatus.completed },
    });
  }
}
