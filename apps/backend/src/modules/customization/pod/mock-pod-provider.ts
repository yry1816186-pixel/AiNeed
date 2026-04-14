import type { PODProvider, PODOrderResult, PODOrderStatus, PODProduct } from "./pod-provider.interface";

export class MockPODProvider implements PODProvider {
  async submitOrder(
    designData: Record<string, unknown>,
    template: { type: string; name: string },
    shippingAddress: Record<string, string>,
  ): Promise<PODOrderResult> {
    const providerOrderId = `pod-mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const estimatedDelivery = new Date(
      Date.now() + 5 * 24 * 60 * 60 * 1000,
    ).toISOString();

    return {
      providerOrderId,
      estimatedDelivery,
      status: "accepted",
    };
  }

  async getOrderStatus(providerOrderId: string): Promise<PODOrderStatus> {
    // Simulate production timeline
    const orderAge = Date.now() - parseInt(providerOrderId.split("-")[2] || "0", 10);

    if (orderAge > 4 * 24 * 60 * 60 * 1000) {
      return {
        status: "shipped",
        trackingNumber: `SF${Math.random().toString().slice(2, 14)}`,
        carrier: "顺丰速运",
      };
    }
    if (orderAge > 2 * 24 * 60 * 60 * 1000) {
      return {
        status: "in_production",
        trackingNumber: null,
        carrier: null,
      };
    }
    return {
      status: "accepted",
      trackingNumber: null,
      carrier: null,
    };
  }

  async getAvailableProducts(): Promise<PODProduct[]> {
    return [
      { type: "tshirt", name: "T恤", availableColors: ["白色", "黑色", "灰色"], availableSizes: ["S", "M", "L", "XL", "XXL"] },
      { type: "hat", name: "棒球帽", availableColors: ["黑色", "白色", "藏青色"], availableSizes: ["均码"] },
      { type: "bag", name: "帆布包", availableColors: ["米色", "黑色"], availableSizes: ["均码"] },
      { type: "phone_case", name: "手机壳", availableColors: ["透明", "黑色", "白色"], availableSizes: ["iPhone 15", "iPhone 15 Pro", "iPhone 15 Pro Max"] },
      { type: "mug", name: "马克杯", availableColors: ["白色"], availableSizes: ["11oz"] },
    ];
  }
}
