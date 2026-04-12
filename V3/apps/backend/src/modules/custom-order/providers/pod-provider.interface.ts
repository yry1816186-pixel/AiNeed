export type PODOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'producing'
  | 'quality_check'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface TrackingNode {
  time: string;
  description: string;
  location: string;
}

export interface TrackingInfo {
  trackingNumber: string;
  carrier: string;
  nodes: TrackingNode[];
}

export interface PODOrderResult {
  podOrderId: string;
  estimatedDays: number;
}

export interface IPODProvider {
  submitOrder(order: {
    designId: string;
    productType: string;
    material: string;
    size: string;
    quantity: number;
    shippingAddress: Record<string, unknown>;
  }): Promise<PODOrderResult>;

  getOrderStatus(podOrderId: string): Promise<PODOrderStatus>;

  getTracking(podOrderId: string): Promise<TrackingInfo>;
}

export const IPOD_PROVIDER = Symbol('IPOD_PROVIDER');
