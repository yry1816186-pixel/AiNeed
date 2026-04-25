import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Request,
  UseGuards,
  SetMetadata,
} from "@nestjs/common";

import { JwtAuthGuard } from "../../identity/auth/guards/jwt-auth.guard";
import { SubscriptionGuard, FEATURE_KEY } from "../subscription/guards/subscription.guard";

import { ContentProductService } from "./content-product.service";
import { PurchaseContentDto } from "./dto/content-product.dto";

interface RequestWithUser {
  user: { id: string };
}

@Controller("content-products")
@UseGuards(JwtAuthGuard)
export class ContentProductController {
  constructor(private readonly contentProductService: ContentProductService) {}

  /**
   * GET /content-products
   * List all available content products.
   */
  @Get()
  getProducts() {
    return this.contentProductService.getProducts();
  }

  /**
   * GET /content-products/purchased
   * Get all purchased content products for the authenticated user.
   */
  @Get("purchased")
  getPurchasedProducts(@Request() req: RequestWithUser) {
    return this.contentProductService.getPurchasedProducts(req.user.id);
  }

  /**
   * GET /content-products/:productType/check
   * Check if user has purchased a specific product.
   */
  @Get(":productType/check")
  checkPurchased(@Request() req: RequestWithUser, @Param("productType") productType: string) {
    return this.contentProductService.checkPurchased(req.user.id, productType);
  }

  /**
   * POST /content-products/:productType/purchase
   * Initiate a content product purchase.
   */
  @Post(":productType/purchase")
  purchase(
    @Request() req: RequestWithUser,
    @Param("productType") productType: string,
    @Body() body: { provider: "alipay" | "wechat"; method?: string }
  ) {
    return this.contentProductService.purchase(req.user.id, {
      productType,
      provider: body.provider,
      method: body.method,
    });
  }

  /**
   * POST /content-products/capsule-wardrobe/generate
   * Generate AI capsule wardrobe (premium-only feature).
   * Gated by SubscriptionGuard with feature "continuousOutfitPlan".
   */
  @Post("capsule-wardrobe/generate")
  @UseGuards(SubscriptionGuard)
  @SetMetadata(FEATURE_KEY, "continuousOutfitPlan")
  generateCapsuleWardrobe(@Request() req: RequestWithUser) {
    return this.contentProductService.generateCapsuleWardrobe(req.user.id);
  }

  /**
   * GET /content-products/capsule-wardrobe/result
   * Get the generated capsule wardrobe plan.
   * Returns { status: "ready" | "generating" | "not_purchased" }
   */
  @Get("capsule-wardrobe/result")
  getCapsuleWardrobeResult(@Request() req: RequestWithUser) {
    return this.contentProductService.getCapsuleWardrobeResult(req.user.id);
  }
}
