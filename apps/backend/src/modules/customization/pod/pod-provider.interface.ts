export interface PODOrderResult {
  providerOrderId: string;
  estimatedDelivery: string;
  status: string;
}

export interface PODOrderStatus {
  status: string;
  trackingNumber: string | null;
  carrier: string | null;
}

export interface PODProduct {
  type: string;
  name: string;
  availableColors: string[];
  availableSizes: string[];
}

export interface PODProvider {
  submitOrder(
    designData: Record<string, unknown>,
    template: { type: string; name: string },
    shippingAddress: Record<string, string>,
  ): Promise<PODOrderResult>;

  getOrderStatus(providerOrderId: string): Promise<PODOrderStatus>;

  getAvailableProducts(): Promise<PODProduct[]>;
}
