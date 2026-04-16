import { ProductTemplateType } from "@prisma/client";

import { getBasePrice } from "../templates/customization-templates";

export interface PricingParams {
  templateType: ProductTemplateType;
  layerCount: number;
  hasTextLayers: boolean;
  imageCount: number;
  printSide: "front" | "back" | "both";
}

export interface PricingResult {
  basePrice: number;
  complexitySurcharge: number;
  textSurcharge: number;
  sideSurcharge: number;
  totalPrice: number;
  currency: string;
  estimatedDays: number;
}

const COMPLEXITY_THRESHOLD = 5;
const COMPLEXITY_PER_LAYER_SURCHARGE = 5;
const TEXT_SURCHARGE = 10;
const BOTH_SIDES_MULTIPLIER = 0.3;
const BASE_PRODUCTION_DAYS = 3;
const COMPLEX_EXTRA_DAYS = 2;
const COMPLEX_DAY_THRESHOLD = 10;

export class PricingEngine {
  calculatePrice(params: PricingParams): PricingResult {
    const {
      templateType,
      layerCount,
      hasTextLayers,
      printSide,
    } = params;

    const basePrice = this.getBasePrice(templateType);
    const complexitySurcharge = this.calculateComplexitySurcharge(layerCount);
    const textSurcharge = this.calculateTextSurcharge(hasTextLayers);
    const sideSurcharge = this.calculateSideSurcharge(basePrice, printSide);
    const estimatedDays = this.calculateEstimatedDays(layerCount);

    const totalPrice = this.sumPrices(
      basePrice,
      complexitySurcharge,
      textSurcharge,
      sideSurcharge,
    );

    return {
      basePrice,
      complexitySurcharge,
      textSurcharge,
      sideSurcharge,
      totalPrice,
      currency: "CNY",
      estimatedDays,
    };
  }

  private getBasePrice(templateType: ProductTemplateType): number {
    return getBasePrice(templateType);
  }

  private calculateComplexitySurcharge(layerCount: number): number {
    if (layerCount <= COMPLEXITY_THRESHOLD) {
      return 0;
    }
    const surcharge = (layerCount - COMPLEXITY_THRESHOLD) * COMPLEXITY_PER_LAYER_SURCHARGE;
    return Math.max(0, surcharge);
  }

  private calculateTextSurcharge(hasTextLayers: boolean): number {
    return hasTextLayers ? TEXT_SURCHARGE : 0;
  }

  private calculateSideSurcharge(
    basePrice: number,
    printSide: "front" | "back" | "both",
  ): number {
    if (printSide === "both") {
      return Math.round(basePrice * BOTH_SIDES_MULTIPLIER);
    }
    return 0;
  }

  private calculateEstimatedDays(layerCount: number): number {
    let days = BASE_PRODUCTION_DAYS;
    if (layerCount > COMPLEX_DAY_THRESHOLD) {
      days += COMPLEX_EXTRA_DAYS;
    }
    return days;
  }

  private sumPrices(
    base: number,
    complexity: number,
    text: number,
    side: number,
  ): number {
    const total = base + complexity + text + side;
    return Math.max(0, total);
  }
}

export const pricingEngine = new PricingEngine();
