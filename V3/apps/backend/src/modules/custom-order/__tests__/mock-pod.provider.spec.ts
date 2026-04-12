import { MockPODProvider } from '../providers/mock-pod.provider';

describe('MockPODProvider', () => {
  let provider: MockPODProvider;

  beforeEach(() => {
    provider = new MockPODProvider();
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  describe('submitOrder', () => {
    it('should return a podOrderId and estimatedDays', async () => {
      const result = await provider.submitOrder({
        designId: 'design-1',
        productType: 'tshirt',
        material: 'cotton',
        size: 'M',
        quantity: 1,
        shippingAddress: { name: 'Test', city: 'Shenzhen' },
      });

      expect(result.podOrderId).toMatch(/^POD-\d+-[A-Z0-9]+$/);
      expect(result.estimatedDays).toBeGreaterThanOrEqual(3);
      expect(result.estimatedDays).toBeLessThanOrEqual(7);
    });

    it('should track the submitted order internally', async () => {
      const result = await provider.submitOrder({
        designId: 'design-1',
        productType: 'hoodie',
        material: 'fleece',
        size: 'L',
        quantity: 2,
        shippingAddress: {},
      });

      // The order should be tracked so getOrderStatus returns non-pending
      const status = await provider.getOrderStatus(result.podOrderId);
      expect(status).toBe('confirmed');
    });
  });

  describe('getOrderStatus', () => {
    it('should return pending for unknown podOrderId', async () => {
      const status = await provider.getOrderStatus('unknown-pod-id');
      expect(status).toBe('pending');
    });

    it('should return confirmed for recently created order', async () => {
      const result = await provider.submitOrder({
        designId: 'design-1',
        productType: 'tshirt',
        material: 'cotton',
        size: 'M',
        quantity: 1,
        shippingAddress: {},
      });

      const status = await provider.getOrderStatus(result.podOrderId);
      expect(status).toBe('confirmed');
    });
  });

  describe('getTracking', () => {
    it('should return tracking info with at least 2 base nodes', async () => {
      const result = await provider.submitOrder({
        designId: 'design-1',
        productType: 'tshirt',
        material: 'cotton',
        size: 'M',
        quantity: 1,
        shippingAddress: {},
      });

      const tracking = await provider.getTracking(result.podOrderId);
      expect(tracking.trackingNumber).toBeTruthy();
      expect(tracking.carrier).toBeTruthy();
      expect(tracking.nodes.length).toBeGreaterThanOrEqual(2);
    });

    it('should return tracking with carrier from known list', async () => {
      const tracking = await provider.getTracking('any-id');
      // Carrier is randomly chosen from a known list
      expect(typeof tracking.carrier).toBe('string');
      expect(tracking.carrier.length).toBeGreaterThan(0);
    });

    it('should return base tracking info for unknown podOrderId', async () => {
      const tracking = await provider.getTracking('unknown-id');
      expect(tracking.trackingNumber).toBeTruthy();
      expect(tracking.nodes.length).toBeGreaterThanOrEqual(2);
    });
  });
});
