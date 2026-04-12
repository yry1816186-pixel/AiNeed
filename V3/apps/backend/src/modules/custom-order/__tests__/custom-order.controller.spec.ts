import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CustomOrderController } from '../custom-order.controller';
import { CustomOrderService } from '../custom-order.service';
import { CreateCustomOrderDto, ProductType } from '../dto/create-custom-order.dto';

const MOCK_USER_ID = 'user-uuid-1';
const MOCK_ORDER_ID = 'order-uuid-1';

const MOCK_ORDER_RESPONSE = {
  id: MOCK_ORDER_ID,
  userId: MOCK_USER_ID,
  designId: 'design-uuid-1',
  productType: 'tshirt',
  material: 'cotton',
  size: 'M',
  quantity: 1,
  unitPrice: 7500,
  totalPrice: 7500,
  status: 'pending',
  podOrderId: null,
  trackingNumber: null,
  shippingAddress: {
    name: 'Zhang San',
    phone: '13800138000',
    province: 'Guangdong',
    city: 'Shenzhen',
    district: 'Nanshan',
    address: '1 Keji Yuan Road',
  },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const MOCK_ORDER_DETAIL = {
  ...MOCK_ORDER_RESPONSE,
  timeline: {
    submittedAt: '2026-01-01T00:00:00.000Z',
    paidAt: null,
    producingAt: null,
    shippedAt: null,
    completedAt: null,
    cancelledAt: null,
  },
  designName: 'Test Design',
  designThumbnail: 'https://cdn.example.com/preview.png',
};

const MOCK_TRACKING = {
  orderId: MOCK_ORDER_ID,
  status: 'shipped',
  tracking: {
    trackingNumber: 'SF1234567890',
    carrier: 'Shunfeng Express',
    nodes: [
      {
        time: '2026-01-01T08:00:00.000Z',
        description: 'Order submitted',
        location: 'Guangzhou',
      },
    ],
  },
};

describe('CustomOrderController', () => {
  let controller: CustomOrderController;
  let service: CustomOrderService;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    cancel: jest.fn(),
    pay: jest.fn(),
    track: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomOrderController],
      providers: [
        { provide: CustomOrderService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<CustomOrderController>(CustomOrderController);
    service = module.get<CustomOrderService>(CustomOrderService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const dto: CreateCustomOrderDto = {
      design_id: 'design-uuid-1',
      product_type: ProductType.TSHIRT,
      material: 'cotton',
      size: 'M',
      shipping_address: {
        name: 'Zhang San',
        phone: '13800138000',
        province: 'Guangdong',
        city: 'Shenzhen',
        district: 'Nanshan',
        address: '1 Keji Yuan Road',
      },
    } as CreateCustomOrderDto;

    it('should create an order and return response', async () => {
      mockService.create.mockResolvedValue(MOCK_ORDER_RESPONSE);

      const result = await controller.create(MOCK_USER_ID, dto);

      expect(result).toEqual(MOCK_ORDER_RESPONSE);
      expect(service.create).toHaveBeenCalledWith(MOCK_USER_ID, dto);
    });

    it('should throw NotFoundException when design does not exist', async () => {
      mockService.create.mockRejectedValue(new NotFoundException('Design not found'));

      await expect(controller.create(MOCK_USER_ID, dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return list of orders without status filter', async () => {
      const listResponse = { items: [MOCK_ORDER_RESPONSE], total: 1 };
      mockService.findAll.mockResolvedValue(listResponse);

      const result = await controller.findAll(MOCK_USER_ID);

      expect(result).toEqual(listResponse);
      expect(service.findAll).toHaveBeenCalledWith(MOCK_USER_ID, undefined);
    });

    it('should pass status filter to service', async () => {
      const listResponse = { items: [], total: 0 };
      mockService.findAll.mockResolvedValue(listResponse);

      const result = await controller.findAll(MOCK_USER_ID, 'pending');

      expect(result).toEqual(listResponse);
      expect(service.findAll).toHaveBeenCalledWith(MOCK_USER_ID, 'pending');
    });
  });

  describe('findOne', () => {
    it('should return order detail', async () => {
      mockService.findOne.mockResolvedValue(MOCK_ORDER_DETAIL);

      const result = await controller.findOne(MOCK_USER_ID, MOCK_ORDER_ID);

      expect(result).toEqual(MOCK_ORDER_DETAIL);
      expect(service.findOne).toHaveBeenCalledWith(MOCK_USER_ID, MOCK_ORDER_ID);
    });

    it('should throw NotFoundException for non-existent order', async () => {
      mockService.findOne.mockRejectedValue(new NotFoundException('Order not found'));

      await expect(controller.findOne(MOCK_USER_ID, 'non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancel', () => {
    it('should cancel a pending order', async () => {
      const cancelledResponse = { ...MOCK_ORDER_RESPONSE, status: 'cancelled' };
      mockService.cancel.mockResolvedValue(cancelledResponse);

      const result = await controller.cancel(MOCK_USER_ID, MOCK_ORDER_ID);

      expect(result.status).toBe('cancelled');
      expect(service.cancel).toHaveBeenCalledWith(MOCK_USER_ID, MOCK_ORDER_ID);
    });

    it('should throw BadRequestException for non-pending order', async () => {
      mockService.cancel.mockRejectedValue(new BadRequestException('Only pending orders can be cancelled'));

      await expect(controller.cancel(MOCK_USER_ID, MOCK_ORDER_ID)).rejects.toThrow(BadRequestException);
    });
  });

  describe('pay', () => {
    it('should pay a pending order', async () => {
      const paidResponse = { ...MOCK_ORDER_RESPONSE, status: 'paid', podOrderId: 'POD-123456' };
      mockService.pay.mockResolvedValue(paidResponse);

      const result = await controller.pay(MOCK_USER_ID, MOCK_ORDER_ID);

      expect(result.status).toBe('paid');
      expect(service.pay).toHaveBeenCalledWith(MOCK_USER_ID, MOCK_ORDER_ID);
    });

    it('should throw BadRequestException for non-pending order payment', async () => {
      mockService.pay.mockRejectedValue(new BadRequestException('Only pending orders can be paid'));

      await expect(controller.pay(MOCK_USER_ID, MOCK_ORDER_ID)).rejects.toThrow(BadRequestException);
    });
  });

  describe('track', () => {
    it('should return tracking information', async () => {
      mockService.track.mockResolvedValue(MOCK_TRACKING);

      const result = await controller.track(MOCK_USER_ID, MOCK_ORDER_ID);

      expect(result.orderId).toBe(MOCK_ORDER_ID);
      expect(result.tracking.trackingNumber).toBe('SF1234567890');
      expect(service.track).toHaveBeenCalledWith(MOCK_USER_ID, MOCK_ORDER_ID);
    });

    it('should throw BadRequestException when order not submitted to production', async () => {
      mockService.track.mockRejectedValue(new BadRequestException('Order not submitted to production'));

      await expect(controller.track(MOCK_USER_ID, MOCK_ORDER_ID)).rejects.toThrow(BadRequestException);
    });
  });
});
