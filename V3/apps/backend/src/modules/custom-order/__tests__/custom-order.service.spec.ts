import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CustomOrderService } from '../custom-order.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { IPOD_PROVIDER } from '../providers/pod-provider.interface';
import { CreateCustomOrderDto, ProductType } from '../dto/create-custom-order.dto';

const MOCK_DESIGN = {
  id: 'design-uuid-1',
  userId: 'user-uuid-1',
  name: '测试设计',
  designData: {},
  patternImageUrl: 'https://cdn.example.com/pattern.png',
  previewImageUrl: 'https://cdn.example.com/preview.png',
  productType: 'tshirt',
  productTemplateId: null,
  isPublic: false,
  price: null,
  likesCount: 0,
  purchasesCount: 0,
  tags: [],
  status: 'draft',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const MOCK_ORDER = {
  id: 'order-uuid-1',
  userId: 'user-uuid-1',
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
    name: '张三',
    phone: '13800138000',
    province: '广东省',
    city: '深圳市',
    district: '南山区',
    address: '科技园路1号',
  },
  paymentInfo: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const MOCK_POD_RESULT = {
  podOrderId: 'POD-123456-ABC',
  estimatedDays: 5,
};

const MOCK_TRACKING = {
  trackingNumber: 'SF1234567890',
  carrier: '顺丰速运',
  nodes: [
    {
      time: '2026-01-01T08:00:00Z',
      description: '订单已提交至生产中心',
      location: '广州市白云区',
    },
  ],
};

const mockPrisma = {
  customDesign: {
    findUnique: jest.fn(),
  },
  productTemplate: {
    findFirst: jest.fn(),
  },
  customOrder: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
};

const mockPodProvider = {
  submitOrder: jest.fn(),
  getOrderStatus: jest.fn(),
  getTracking: jest.fn(),
};

describe('CustomOrderService', () => {
  let service: CustomOrderService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomOrderService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: IPOD_PROVIDER, useValue: mockPodProvider },
      ],
    }).compile();

    service = module.get<CustomOrderService>(CustomOrderService);
  });

  describe('create', () => {
    const createDto: CreateCustomOrderDto = {
      design_id: 'design-uuid-1',
      product_type: ProductType.TSHIRT,
      material: 'cotton',
      size: 'M',
      quantity: 1,
      shipping_address: {
        name: '张三',
        phone: '13800138000',
        province: '广东省',
        city: '深圳市',
        district: '南山区',
        address: '科技园路1号',
      },
    } as CreateCustomOrderDto;

    it('应成功创建定制订单', async () => {
      mockPrisma.customDesign.findUnique.mockResolvedValue(MOCK_DESIGN);
      mockPrisma.productTemplate.findFirst.mockResolvedValue(null);
      mockPrisma.customOrder.create.mockResolvedValue(MOCK_ORDER);

      const result = await service.create('user-uuid-1', createDto);

      expect(result.id).toBe('order-uuid-1');
      expect(result.status).toBe('pending');
      expect(mockPrisma.customOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-uuid-1',
            designId: 'design-uuid-1',
            productType: 'tshirt',
          }),
        }),
      );
    });

    it('设计不存在时应抛出NotFoundException', async () => {
      mockPrisma.customDesign.findUnique.mockResolvedValue(null);

      await expect(
        service.create('user-uuid-1', createDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('使用他人设计下单时应抛出BadRequestException', async () => {
      mockPrisma.customDesign.findUnique.mockResolvedValue({
        ...MOCK_DESIGN,
        userId: 'other-user-uuid',
      });

      await expect(
        service.create('user-uuid-1', createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('有产品模板时应使用模板的baseCost计算价格', async () => {
      mockPrisma.customDesign.findUnique.mockResolvedValue(MOCK_DESIGN);
      mockPrisma.productTemplate.findFirst.mockResolvedValue({
        id: 'template-1',
        baseCost: 4000,
      });
      mockPrisma.customOrder.create.mockResolvedValue(MOCK_ORDER);

      await service.create('user-uuid-1', createDto);

      expect(mockPrisma.customOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            unitPrice: 10000,
            totalPrice: 10000,
          }),
        }),
      );
    });

    it('未传quantity时应默认为1', async () => {
      mockPrisma.customDesign.findUnique.mockResolvedValue(MOCK_DESIGN);
      mockPrisma.productTemplate.findFirst.mockResolvedValue(null);
      mockPrisma.customOrder.create.mockResolvedValue(MOCK_ORDER);

      const { quantity: _, ...dtoWithoutQuantity } = createDto;

      await service.create('user-uuid-1', dtoWithoutQuantity as CreateCustomOrderDto);

      expect(mockPrisma.customOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            quantity: 1,
          }),
        }),
      );
    });

    it('有多个quantity时应正确计算总价', async () => {
      mockPrisma.customDesign.findUnique.mockResolvedValue(MOCK_DESIGN);
      mockPrisma.productTemplate.findFirst.mockResolvedValue({
        id: 'template-1',
        baseCost: 4000,
      });
      mockPrisma.customOrder.create.mockResolvedValue(MOCK_ORDER);

      const dtoMulti: CreateCustomOrderDto = {
        ...createDto,
        quantity: 3,
      } as CreateCustomOrderDto;

      await service.create('user-uuid-1', dtoMulti);

      expect(mockPrisma.customOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            quantity: 3,
            unitPrice: 10000,
            totalPrice: 30000,
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('应返回用户订单列表', async () => {
      mockPrisma.customOrder.findMany.mockResolvedValue([MOCK_ORDER]);
      mockPrisma.customOrder.count.mockResolvedValue(1);

      const result = await service.findAll('user-uuid-1');

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockPrisma.customOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-uuid-1' },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('传入status时应按状态筛选', async () => {
      mockPrisma.customOrder.findMany.mockResolvedValue([]);
      mockPrisma.customOrder.count.mockResolvedValue(0);

      await service.findAll('user-uuid-1', 'pending');

      expect(mockPrisma.customOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-uuid-1', status: 'pending' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('应返回订单详情含时间轴和设计信息', async () => {
      mockPrisma.customOrder.findUnique.mockResolvedValue({
        ...MOCK_ORDER,
        design: { name: '测试设计', previewImageUrl: 'https://cdn.example.com/preview.png' },
      });

      const result = await service.findOne('user-uuid-1', 'order-uuid-1');

      expect(result.id).toBe('order-uuid-1');
      expect(result.designName).toBe('测试设计');
      expect(result.timeline).toBeDefined();
      expect(result.timeline.submittedAt).toBeDefined();
    });

    it('订单不存在时应抛出NotFoundException', async () => {
      mockPrisma.customOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('user-uuid-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('访问他人订单时应抛出NotFoundException', async () => {
      mockPrisma.customOrder.findUnique.mockResolvedValue({
        ...MOCK_ORDER,
        userId: 'other-user-uuid',
        design: { name: '测试', previewImageUrl: null },
      });

      await expect(
        service.findOne('user-uuid-1', 'order-uuid-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancel', () => {
    it('应成功取消待付款订单', async () => {
      mockPrisma.customOrder.findUnique.mockResolvedValue(MOCK_ORDER);
      mockPrisma.customOrder.update.mockResolvedValue({
        ...MOCK_ORDER,
        status: 'cancelled',
      });

      const result = await service.cancel('user-uuid-1', 'order-uuid-1');

      expect(result.status).toBe('cancelled');
      expect(mockPrisma.customOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-uuid-1' },
          data: { status: 'cancelled' },
        }),
      );
    });

    it('非待付款订单取消时应抛出BadRequestException', async () => {
      mockPrisma.customOrder.findUnique.mockResolvedValue({
        ...MOCK_ORDER,
        status: 'paid',
      });

      await expect(
        service.cancel('user-uuid-1', 'order-uuid-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('订单不存在时应抛出NotFoundException', async () => {
      mockPrisma.customOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.cancel('user-uuid-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('pay', () => {
    it('应成功支付并提交POD生产', async () => {
      mockPrisma.customOrder.findUnique.mockResolvedValue(MOCK_ORDER);
      mockPodProvider.submitOrder.mockResolvedValue(MOCK_POD_RESULT);
      mockPrisma.customOrder.update.mockResolvedValue({
        ...MOCK_ORDER,
        status: 'paid',
        podOrderId: 'POD-123456-ABC',
      });

      const result = await service.pay('user-uuid-1', 'order-uuid-1');

      expect(result.status).toBe('paid');
      expect(mockPodProvider.submitOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          designId: 'design-uuid-1',
          productType: 'tshirt',
        }),
      );
      expect(mockPrisma.customOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'paid',
            podOrderId: 'POD-123456-ABC',
          }),
        }),
      );
    });

    it('非待付款订单支付时应抛出BadRequestException', async () => {
      mockPrisma.customOrder.findUnique.mockResolvedValue({
        ...MOCK_ORDER,
        status: 'paid',
      });

      await expect(
        service.pay('user-uuid-1', 'order-uuid-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('订单不存在时应抛出NotFoundException', async () => {
      mockPrisma.customOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.pay('user-uuid-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('track', () => {
    it('应返回物流追踪信息', async () => {
      mockPrisma.customOrder.findUnique.mockResolvedValue({
        ...MOCK_ORDER,
        status: 'paid',
        podOrderId: 'POD-123456-ABC',
      });
      mockPodProvider.getOrderStatus.mockResolvedValue('shipped');
      mockPodProvider.getTracking.mockResolvedValue(MOCK_TRACKING);

      const result = await service.track('user-uuid-1', 'order-uuid-1');

      expect(result.orderId).toBe('order-uuid-1');
      expect(result.tracking.trackingNumber).toBe('SF1234567890');
      expect(result.tracking.nodes).toHaveLength(1);
    });

    it('未提交生产的订单应抛出BadRequestException', async () => {
      mockPrisma.customOrder.findUnique.mockResolvedValue(MOCK_ORDER);

      await expect(
        service.track('user-uuid-1', 'order-uuid-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('订单不存在时应抛出NotFoundException', async () => {
      mockPrisma.customOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.track('user-uuid-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('POD状态为shipped时应更新订单状态和物流单号', async () => {
      mockPrisma.customOrder.findUnique.mockResolvedValue({
        ...MOCK_ORDER,
        status: 'paid',
        podOrderId: 'POD-123456-ABC',
      });
      mockPodProvider.getOrderStatus.mockResolvedValue('shipped');
      mockPodProvider.getTracking.mockResolvedValue(MOCK_TRACKING);

      await service.track('user-uuid-1', 'order-uuid-1');

      expect(mockPrisma.customOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'shipped',
            trackingNumber: 'SF1234567890',
          }),
        }),
      );
    });

    it('访问他人订单时track应抛出NotFoundException', async () => {
      mockPrisma.customOrder.findUnique.mockResolvedValue({
        ...MOCK_ORDER,
        userId: 'other-user-uuid',
        podOrderId: 'POD-123456-ABC',
      });

      await expect(
        service.track('user-uuid-1', 'order-uuid-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('POD状态为delivered时应更新订单状态为completed', async () => {
      mockPrisma.customOrder.findUnique.mockResolvedValue({
        ...MOCK_ORDER,
        status: 'shipped',
        podOrderId: 'POD-123456-ABC',
      });
      mockPodProvider.getOrderStatus.mockResolvedValue('delivered');
      mockPodProvider.getTracking.mockResolvedValue(MOCK_TRACKING);

      const result = await service.track('user-uuid-1', 'order-uuid-1');

      expect(result.status).toBe('completed');
      expect(mockPrisma.customOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'completed',
          }),
        }),
      );
    });

    it('POD状态未变化时不应更新订单', async () => {
      mockPrisma.customOrder.findUnique.mockResolvedValue({
        ...MOCK_ORDER,
        status: 'paid',
        podOrderId: 'POD-123456-ABC',
      });
      mockPodProvider.getOrderStatus.mockResolvedValue('confirmed');
      mockPodProvider.getTracking.mockResolvedValue(MOCK_TRACKING);

      await service.track('user-uuid-1', 'order-uuid-1');

      expect(mockPrisma.customOrder.update).not.toHaveBeenCalled();
    });

    it('POD状态为unknown时应保持原状态不变', async () => {
      mockPrisma.customOrder.findUnique.mockResolvedValue({
        ...MOCK_ORDER,
        status: 'paid',
        podOrderId: 'POD-123456-ABC',
      });
      mockPodProvider.getOrderStatus.mockResolvedValue('producing');
      mockPodProvider.getTracking.mockResolvedValue(MOCK_TRACKING);

      const result = await service.track('user-uuid-1', 'order-uuid-1');

      expect(result.status).toBe('producing');
      expect(mockPrisma.customOrder.update).not.toHaveBeenCalled();
    });
  });

  describe('pay', () => {
    it('访问他人订单时pay应抛出NotFoundException', async () => {
      mockPrisma.customOrder.findUnique.mockResolvedValue({
        ...MOCK_ORDER,
        userId: 'other-user-uuid',
      });

      await expect(
        service.pay('user-uuid-1', 'order-uuid-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancel', () => {
    it('访问他人订单时cancel应抛出NotFoundException', async () => {
      mockPrisma.customOrder.findUnique.mockResolvedValue({
        ...MOCK_ORDER,
        userId: 'other-user-uuid',
      });

      await expect(
        service.cancel('user-uuid-1', 'order-uuid-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('应返回空列表当用户没有订单', async () => {
      mockPrisma.customOrder.findMany.mockResolvedValue([]);
      mockPrisma.customOrder.count.mockResolvedValue(0);

      const result = await service.findAll('user-uuid-1');

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('findOne', () => {
    it('订单处于shipped状态时buildTimeline应包含shippedAt', async () => {
      mockPrisma.customOrder.findUnique.mockResolvedValue({
        ...MOCK_ORDER,
        status: 'shipped',
        design: { name: 'Test Design', previewImageUrl: 'https://cdn.example.com/preview.png' },
      });

      const result = await service.findOne('user-uuid-1', 'order-uuid-1');

      expect(result.timeline.shippedAt).toBeDefined();
      expect(result.timeline.shippedAt).not.toBeNull();
    });

    it('订单处于completed状态时buildTimeline应包含completedAt和shippedAt', async () => {
      mockPrisma.customOrder.findUnique.mockResolvedValue({
        ...MOCK_ORDER,
        status: 'completed',
        design: { name: 'Test Design', previewImageUrl: 'https://cdn.example.com/preview.png' },
      });

      const result = await service.findOne('user-uuid-1', 'order-uuid-1');

      expect(result.timeline.completedAt).toBeDefined();
      expect(result.timeline.completedAt).not.toBeNull();
      expect(result.timeline.shippedAt).not.toBeNull();
    });

    it('订单处于cancelled状态时buildTimeline应包含cancelledAt', async () => {
      mockPrisma.customOrder.findUnique.mockResolvedValue({
        ...MOCK_ORDER,
        status: 'cancelled',
        design: { name: 'Test Design', previewImageUrl: 'https://cdn.example.com/preview.png' },
      });

      const result = await service.findOne('user-uuid-1', 'order-uuid-1');

      expect(result.timeline.cancelledAt).toBeDefined();
      expect(result.timeline.cancelledAt).not.toBeNull();
    });

    it('订单有paymentInfo时buildTimeline应包含paidAt和producingAt', async () => {
      mockPrisma.customOrder.findUnique.mockResolvedValue({
        ...MOCK_ORDER,
        status: 'paid',
        paymentInfo: {
          method: 'mock',
          paidAt: '2026-01-02T00:00:00.000Z',
          estimatedDays: 5,
        },
        design: { name: 'Test Design', previewImageUrl: 'https://cdn.example.com/preview.png' },
      });

      const result = await service.findOne('user-uuid-1', 'order-uuid-1');

      expect(result.timeline.paidAt).toBe('2026-01-02T00:00:00.000Z');
      expect(result.timeline.producingAt).toBeDefined();
      expect(result.timeline.producingAt).not.toBeNull();
    });
  });
});
