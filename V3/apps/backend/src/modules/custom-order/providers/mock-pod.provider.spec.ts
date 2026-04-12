import { MockPODProvider } from './mock-pod.provider';

describe('MockPODProvider', () => {
  let provider: MockPODProvider;

  beforeEach(() => {
    provider = new MockPODProvider();
  });

  const sampleOrder = {
    designId: 'design-001',
    productType: 'tshirt',
    material: 'cotton',
    size: 'L',
    quantity: 1,
    shippingAddress: { city: 'Shanghai' },
  };

  // ---------------------------------------------------------------
  // submitOrder
  // ---------------------------------------------------------------
  it('submits an order and returns a valid result', async () => {
    const result = await provider.submitOrder(sampleOrder);
    expect(result.podOrderId).toMatch(/^POD-/);
    expect(result.estimatedDays).toBeGreaterThanOrEqual(3);
    expect(result.estimatedDays).toBeLessThanOrEqual(7);
  });

  // ---------------------------------------------------------------
  // getOrderStatus: unknown order returns 'pending'
  // ---------------------------------------------------------------
  it('returns pending for unknown order id', async () => {
    const status = await provider.getOrderStatus('NONEXISTENT');
    expect(status).toBe('pending');
  });

  // ---------------------------------------------------------------
  // getOrderStatus: known order - 'confirmed' when < 1 hour
  // ---------------------------------------------------------------
  it('returns confirmed for a recently submitted order', async () => {
    const { podOrderId } = await provider.submitOrder(sampleOrder);
    const status = await provider.getOrderStatus(podOrderId);
    expect(status).toBe('confirmed');
  });

  // ---------------------------------------------------------------
  // getOrderStatus: branches for elapsed time
  // Use internal Map to simulate different elapsed times
  // ---------------------------------------------------------------
  it('returns producing when between 1 and 24 hours', async () => {
    const { podOrderId } = await provider.submitOrder(sampleOrder);
    // Tamper the internal map to simulate 2 hours elapsed
    const internalMap = (provider as unknown as { orderStatuses: Map<string, { status: string; createdAt: Date }> }).orderStatuses;
    const record = internalMap.get(podOrderId);
    if (record) {
      record.createdAt = new Date(Date.now() - 2 * 60 * 60 * 1000);
    }
    const status = await provider.getOrderStatus(podOrderId);
    expect(status).toBe('producing');
  });

  it('returns quality_check when between 24 and 48 hours', async () => {
    const { podOrderId } = await provider.submitOrder(sampleOrder);
    const internalMap = (provider as unknown as { orderStatuses: Map<string, { status: string; createdAt: Date }> }).orderStatuses;
    const record = internalMap.get(podOrderId);
    if (record) {
      record.createdAt = new Date(Date.now() - 30 * 60 * 60 * 1000);
    }
    const status = await provider.getOrderStatus(podOrderId);
    expect(status).toBe('quality_check');
  });

  it('returns shipped when between 48 and 72 hours', async () => {
    const { podOrderId } = await provider.submitOrder(sampleOrder);
    const internalMap = (provider as unknown as { orderStatuses: Map<string, { status: string; createdAt: Date }> }).orderStatuses;
    const record = internalMap.get(podOrderId);
    if (record) {
      record.createdAt = new Date(Date.now() - 55 * 60 * 60 * 1000);
    }
    const status = await provider.getOrderStatus(podOrderId);
    expect(status).toBe('shipped');
  });

  it('returns delivered when over 72 hours', async () => {
    const { podOrderId } = await provider.submitOrder(sampleOrder);
    const internalMap = (provider as unknown as { orderStatuses: Map<string, { status: string; createdAt: Date }> }).orderStatuses;
    const record = internalMap.get(podOrderId);
    if (record) {
      record.createdAt = new Date(Date.now() - 80 * 60 * 60 * 1000);
    }
    const status = await provider.getOrderStatus(podOrderId);
    expect(status).toBe('delivered');
  });

  // ---------------------------------------------------------------
  // getTracking: no record (unknown order) - only base 2 nodes
  // ---------------------------------------------------------------
  it('returns tracking with base nodes for unknown order', async () => {
    const tracking = await provider.getTracking('UNKNOWN');
    expect(tracking.trackingNumber).toBeDefined();
    expect(tracking.carrier).toBeDefined();
    expect(tracking.nodes.length).toBe(2);
  });

  // ---------------------------------------------------------------
  // getTracking: known order, < 48 hours - only base 2 nodes
  // ---------------------------------------------------------------
  it('returns tracking with base nodes for recent order', async () => {
    const { podOrderId } = await provider.submitOrder(sampleOrder);
    const tracking = await provider.getTracking(podOrderId);
    expect(tracking.nodes.length).toBe(2);
  });

  // ---------------------------------------------------------------
  // getTracking: known order, 48-72 hours - 3 nodes (shipped node added)
  // ---------------------------------------------------------------
  it('adds shipped tracking node at >= 48 hours', async () => {
    const { podOrderId } = await provider.submitOrder(sampleOrder);
    const internalMap = (provider as unknown as { orderStatuses: Map<string, { status: string; createdAt: Date }> }).orderStatuses;
    const record = internalMap.get(podOrderId);
    if (record) {
      record.createdAt = new Date(Date.now() - 50 * 60 * 60 * 1000);
    }
    const tracking = await provider.getTracking(podOrderId);
    expect(tracking.nodes.length).toBe(3);
    expect(tracking.nodes[2].description).toBe('检验通过，已打包出库');
  });

  // ---------------------------------------------------------------
  // getTracking: known order, >= 72 hours - 5 nodes (all tracking)
  // ---------------------------------------------------------------
  it('adds full tracking nodes at >= 72 hours', async () => {
    const { podOrderId } = await provider.submitOrder(sampleOrder);
    const internalMap = (provider as unknown as { orderStatuses: Map<string, { status: string; createdAt: Date }> }).orderStatuses;
    const record = internalMap.get(podOrderId);
    if (record) {
      record.createdAt = new Date(Date.now() - 80 * 60 * 60 * 1000);
    }
    const tracking = await provider.getTracking(podOrderId);
    expect(tracking.nodes.length).toBe(5);
  });

  // ---------------------------------------------------------------
  // getTracking: carrier name is from known list
  // ---------------------------------------------------------------
  it('returns a known carrier name', async () => {
    const knownCarriers = ['顺丰速运', '中通快递', '圆通速递', '韵达快递', '极兔速递'];
    const tracking = await provider.getTracking('ANY');
    expect(knownCarriers).toContain(tracking.carrier);
  });
});
