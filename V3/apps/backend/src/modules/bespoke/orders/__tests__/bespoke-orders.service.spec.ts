/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { BespokeOrdersService } from '../bespoke-orders.service';

const MOCK_USER_ID = 'user-001';
const MOCK_STUDIO_ID = 'studio-001';
const MOCK_ORDER_ID = 'order-001';
const MOCK_QUOTE_ID = 'quote-001';

function createMockPrisma(overrides: Record<string, unknown> = {}) {
  return {
    bespokeStudio: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    bespokeOrder: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    bespokeMessage: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    bespokeQuote: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    bespokeReview: {
      create: jest.fn(),
      findUnique: jest.fn(),
      aggregate: jest.fn(),
    },
    $transaction: jest.fn((fn) => fn({
      bespokeQuote: {
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      bespokeOrder: {
        update: jest.fn(),
      },
    })),
    ...overrides,
  };
}

const MOCK_ACTIVE_STUDIO = {
  id: MOCK_STUDIO_ID,
  userId: 'studio-owner-001',
  name: 'Test Studio',
  isActive: true,
  orderCount: 0,
};

const MOCK_ORDER = {
  id: MOCK_ORDER_ID,
  userId: MOCK_USER_ID,
  studioId: MOCK_STUDIO_ID,
  status: 'submitted',
  title: 'Custom Dress',
  description: 'A beautiful dress',
  referenceImages: ['img1.png'],
  budgetRange: '5000-10000',
  deadline: new Date('2025-12-31'),
  measurements: { height: 170, weight: 60 },
  assignedStylistId: null,
  statusHistory: [
    { status: 'submitted', at: new Date().toISOString(), by: MOCK_USER_ID, note: '提交定制需求' },
  ],
  completedAt: null,
  cancelledAt: null,
  cancelReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const MOCK_ORDER_WITH_STUDIO = {
  ...MOCK_ORDER,
  studio: {
    id: MOCK_STUDIO_ID,
    name: 'Test Studio',
    logoUrl: 'logo.png',
    city: 'Beijing',
    specialties: ['dress', 'suit'],
    rating: 4.8,
  },
};

const MOCK_QUOTE = {
  id: MOCK_QUOTE_ID,
  orderId: MOCK_ORDER_ID,
  studioId: MOCK_STUDIO_ID,
  totalPrice: 80000,
  items: [
    { name: 'Fabric', quantity: 1, unitPrice: 50000, subtotal: 50000 },
    { name: 'Tailoring', quantity: 1, unitPrice: 30000, subtotal: 30000 },
  ],
  estimatedDays: 14,
  validUntil: new Date('2099-12-31'),
  notes: 'Includes fitting',
  status: 'pending',
  createdAt: new Date(),
};

const MOCK_MESSAGE = {
  id: 'msg-001',
  orderId: MOCK_ORDER_ID,
  senderId: MOCK_USER_ID,
  content: 'Hello',
  messageType: 'text',
  attachments: [],
  isRead: false,
  createdAt: new Date(),
  sender: {
    id: MOCK_USER_ID,
    nickname: 'TestUser',
    avatarUrl: 'avatar.png',
  },
};

const MOCK_REVIEW = {
  id: 'review-001',
  orderId: MOCK_ORDER_ID,
  userId: MOCK_USER_ID,
  studioId: MOCK_STUDIO_ID,
  rating: 5,
  content: 'Excellent work',
  images: ['img1.png'],
  isAnonymous: false,
  createdAt: new Date(),
};

describe('BespokeOrdersService', () => {
  let service: BespokeOrdersService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BespokeOrdersService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<BespokeOrdersService>(BespokeOrdersService);
  });

  // ---------------------------------------------------------------
  // createOrder
  // ---------------------------------------------------------------
  describe('createOrder', () => {
    const createDto = {
      studioId: MOCK_STUDIO_ID,
      title: 'Custom Dress',
      description: 'A beautiful dress',
      referenceImages: ['img1.png'],
      budgetRange: '5000-10000',
      deadline: '2025-12-31',
      measurements: { height: 170, weight: 60 },
    };

    it('should create an order and increment studio orderCount', async () => {
      mockPrisma.bespokeStudio.findUnique.mockResolvedValue(MOCK_ACTIVE_STUDIO);
      mockPrisma.bespokeOrder.create.mockResolvedValue(MOCK_ORDER);
      mockPrisma.bespokeStudio.update.mockResolvedValue({ ...MOCK_ACTIVE_STUDIO, orderCount: 1 });

      const result = await service.createOrder(MOCK_USER_ID, createDto);

      expect(result.id).toBe(MOCK_ORDER_ID);
      expect(result.status).toBe('submitted');
      expect(mockPrisma.bespokeOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: MOCK_USER_ID,
            studioId: MOCK_STUDIO_ID,
            status: 'submitted',
          }),
        }),
      );
      expect(mockPrisma.bespokeStudio.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: MOCK_STUDIO_ID },
          data: { orderCount: { increment: 1 } },
        }),
      );
    });

    it('should create order without optional fields', async () => {
      const minimalDto = {
        studioId: MOCK_STUDIO_ID,
        description: 'Minimal order',
      };
      const minimalOrder = {
        ...MOCK_ORDER,
        referenceImages: [],
        deadline: undefined,
        measurements: undefined,
      };

      mockPrisma.bespokeStudio.findUnique.mockResolvedValue(MOCK_ACTIVE_STUDIO);
      mockPrisma.bespokeOrder.create.mockResolvedValue(minimalOrder);
      mockPrisma.bespokeStudio.update.mockResolvedValue(MOCK_ACTIVE_STUDIO);

      const result = await service.createOrder(MOCK_USER_ID, minimalDto);

      expect(result.id).toBe(MOCK_ORDER_ID);
      expect(mockPrisma.bespokeOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            referenceImages: [],
          }),
        }),
      );
    });

    it('should throw NotFoundException when studio does not exist', async () => {
      mockPrisma.bespokeStudio.findUnique.mockResolvedValue(null);

      await expect(service.createOrder(MOCK_USER_ID, createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when studio is inactive', async () => {
      mockPrisma.bespokeStudio.findUnique.mockResolvedValue({
        ...MOCK_ACTIVE_STUDIO,
        isActive: false,
      });

      await expect(service.createOrder(MOCK_USER_ID, createDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ---------------------------------------------------------------
  // getOrders
  // ---------------------------------------------------------------
  describe('getOrders', () => {
    it('should return paginated orders with studio info', async () => {
      mockPrisma.bespokeOrder.findMany.mockResolvedValue([MOCK_ORDER_WITH_STUDIO]);
      mockPrisma.bespokeOrder.count.mockResolvedValue(1);

      const result = await service.getOrders(MOCK_USER_ID, 1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.items[0].studio).toBeDefined();
      expect(result.items[0].studio!.name).toBe('Test Studio');
    });

    it('should filter by status when provided', async () => {
      mockPrisma.bespokeOrder.findMany.mockResolvedValue([]);
      mockPrisma.bespokeOrder.count.mockResolvedValue(0);

      await service.getOrders(MOCK_USER_ID, 1, 20, 'submitted');

      expect(mockPrisma.bespokeOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'submitted' }),
        }),
      );
    });

    it('should not include status filter when not provided', async () => {
      mockPrisma.bespokeOrder.findMany.mockResolvedValue([]);
      mockPrisma.bespokeOrder.count.mockResolvedValue(0);

      await service.getOrders(MOCK_USER_ID, 1, 20);

      const whereArg = mockPrisma.bespokeOrder.findMany.mock.calls[0][0].where;
      expect(whereArg.status).toBeUndefined();
    });

    it('should clamp page to minimum 1', async () => {
      mockPrisma.bespokeOrder.findMany.mockResolvedValue([]);
      mockPrisma.bespokeOrder.count.mockResolvedValue(0);

      const result = await service.getOrders(MOCK_USER_ID, -1, 20);

      expect(result.page).toBe(1);
    });

    it('should clamp limit to 1-50 range', async () => {
      mockPrisma.bespokeOrder.findMany.mockResolvedValue([]);
      mockPrisma.bespokeOrder.count.mockResolvedValue(0);

      const result = await service.getOrders(MOCK_USER_ID, 1, 100);

      expect(result.limit).toBe(50);
    });

    it('should clamp limit to minimum 1', async () => {
      mockPrisma.bespokeOrder.findMany.mockResolvedValue([]);
      mockPrisma.bespokeOrder.count.mockResolvedValue(0);

      const result = await service.getOrders(MOCK_USER_ID, 1, 0);

      expect(result.limit).toBe(1);
    });

    it('should calculate correct skip value', async () => {
      mockPrisma.bespokeOrder.findMany.mockResolvedValue([]);
      mockPrisma.bespokeOrder.count.mockResolvedValue(0);

      await service.getOrders(MOCK_USER_ID, 3, 10);

      expect(mockPrisma.bespokeOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });
  });

  // ---------------------------------------------------------------
  // getOrderById
  // ---------------------------------------------------------------
  describe('getOrderById', () => {
    it('should return order with studio info when user is the owner', async () => {
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(MOCK_ORDER_WITH_STUDIO);

      const result = await service.getOrderById(MOCK_USER_ID, MOCK_ORDER_ID);

      expect(result.id).toBe(MOCK_ORDER_ID);
      expect(result.studio!.name).toBe('Test Studio');
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.getOrderById(MOCK_USER_ID, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow studio owner to view the order', async () => {
      const orderForStudio = { ...MOCK_ORDER_WITH_STUDIO, userId: 'other-user' };
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(orderForStudio);
      mockPrisma.bespokeStudio.findFirst.mockResolvedValue(MOCK_ACTIVE_STUDIO);

      const result = await service.getOrderById('studio-owner-001', MOCK_ORDER_ID);

      expect(result.id).toBe(MOCK_ORDER_ID);
    });

    it('should throw ForbiddenException when user is neither owner nor studio owner', async () => {
      const orderForOther = { ...MOCK_ORDER_WITH_STUDIO, userId: 'other-user' };
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(orderForOther);
      mockPrisma.bespokeStudio.findFirst.mockResolvedValue(null);

      await expect(
        service.getOrderById('random-user', MOCK_ORDER_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ---------------------------------------------------------------
  // cancelOrder
  // ---------------------------------------------------------------
  describe('cancelOrder', () => {
    it('should cancel a submitted order', async () => {
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(MOCK_ORDER);
      mockPrisma.bespokeOrder.update.mockResolvedValue({
        ...MOCK_ORDER,
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: 'Changed mind',
      });

      const result = await service.cancelOrder(MOCK_USER_ID, MOCK_ORDER_ID, {
        cancelReason: 'Changed mind',
      });

      expect(result.status).toBe('cancelled');
      expect(mockPrisma.bespokeOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'cancelled',
            cancelReason: 'Changed mind',
          }),
        }),
      );
    });

    it('should use default cancel reason when none provided', async () => {
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(MOCK_ORDER);
      mockPrisma.bespokeOrder.update.mockResolvedValue({
        ...MOCK_ORDER,
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: null,
      });

      await service.cancelOrder(MOCK_USER_ID, MOCK_ORDER_ID, {});

      expect(mockPrisma.bespokeOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cancelReason: undefined,
          }),
        }),
      );
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.cancelOrder(MOCK_USER_ID, 'non-existent', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not the order owner', async () => {
      const otherUserOrder = { ...MOCK_ORDER, userId: 'other-user' };
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(otherUserOrder);

      await expect(
        service.cancelOrder(MOCK_USER_ID, MOCK_ORDER_ID, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when cancelling a completed order', async () => {
      const completedOrder = { ...MOCK_ORDER, status: 'completed' };
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(completedOrder);

      await expect(
        service.cancelOrder(MOCK_USER_ID, MOCK_ORDER_ID, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when cancelling an already cancelled order', async () => {
      const cancelledOrder = { ...MOCK_ORDER, status: 'cancelled' };
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(cancelledOrder);

      await expect(
        service.cancelOrder(MOCK_USER_ID, MOCK_ORDER_ID, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should preserve existing statusHistory when cancelling', async () => {
      const orderWithHistory = {
        ...MOCK_ORDER,
        statusHistory: [
          { status: 'submitted', at: '2025-01-01T00:00:00.000Z', by: MOCK_USER_ID, note: 'Initial' },
        ],
      };
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(orderWithHistory);
      mockPrisma.bespokeOrder.update.mockResolvedValue({
        ...MOCK_ORDER,
        status: 'cancelled',
      });

      await service.cancelOrder(MOCK_USER_ID, MOCK_ORDER_ID, { cancelReason: 'No longer needed' });

      const updateCall = mockPrisma.bespokeOrder.update.mock.calls[0][0];
      expect(updateCall.data.statusHistory).toHaveLength(2);
    });
  });

  // ---------------------------------------------------------------
  // getMessages
  // ---------------------------------------------------------------
  describe('getMessages', () => {
    it('should return paginated messages for order owner', async () => {
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(MOCK_ORDER);
      mockPrisma.bespokeMessage.findMany.mockResolvedValue([MOCK_MESSAGE]);
      mockPrisma.bespokeMessage.count.mockResolvedValue(1);

      const result = await service.getMessages(MOCK_USER_ID, MOCK_ORDER_ID, 1, 50);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.items[0].sender!.nickname).toBe('TestUser');
    });

    it('should return messages for studio owner', async () => {
      const otherUserOrder = { ...MOCK_ORDER, userId: 'other-user' };
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(otherUserOrder);
      mockPrisma.bespokeStudio.findFirst.mockResolvedValue(MOCK_ACTIVE_STUDIO);
      mockPrisma.bespokeMessage.findMany.mockResolvedValue([MOCK_MESSAGE]);
      mockPrisma.bespokeMessage.count.mockResolvedValue(1);

      const result = await service.getMessages('studio-owner-001', MOCK_ORDER_ID);

      expect(result.items).toHaveLength(1);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.getMessages(MOCK_USER_ID, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user has no access', async () => {
      const otherUserOrder = { ...MOCK_ORDER, userId: 'other-user' };
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(otherUserOrder);
      mockPrisma.bespokeStudio.findFirst.mockResolvedValue(null);

      await expect(
        service.getMessages('random-user', MOCK_ORDER_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should clamp page to minimum 1', async () => {
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(MOCK_ORDER);
      mockPrisma.bespokeMessage.findMany.mockResolvedValue([]);
      mockPrisma.bespokeMessage.count.mockResolvedValue(0);

      const result = await service.getMessages(MOCK_USER_ID, MOCK_ORDER_ID, 0, 10);

      expect(result.page).toBe(1);
    });

    it('should clamp limit to 1-100 range', async () => {
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(MOCK_ORDER);
      mockPrisma.bespokeMessage.findMany.mockResolvedValue([]);
      mockPrisma.bespokeMessage.count.mockResolvedValue(0);

      const result = await service.getMessages(MOCK_USER_ID, MOCK_ORDER_ID, 1, 200);

      expect(result.limit).toBe(100);
    });

    it('should handle messages with null sender', async () => {
      const messageWithNullSender = { ...MOCK_MESSAGE, sender: null };
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(MOCK_ORDER);
      mockPrisma.bespokeMessage.findMany.mockResolvedValue([messageWithNullSender]);
      mockPrisma.bespokeMessage.count.mockResolvedValue(1);

      const result = await service.getMessages(MOCK_USER_ID, MOCK_ORDER_ID);

      expect(result.items[0].sender).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------
  // sendMessage
  // ---------------------------------------------------------------
  describe('sendMessage', () => {
    it('should create a text message as order owner', async () => {
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(MOCK_ORDER);
      mockPrisma.bespokeMessage.create.mockResolvedValue(MOCK_MESSAGE);

      const result = await service.sendMessage(MOCK_USER_ID, MOCK_ORDER_ID, {
        content: 'Hello',
      });

      expect(result.content).toBe('Hello');
      expect(result.messageType).toBe('text');
      expect(mockPrisma.bespokeMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            messageType: 'text',
            attachments: [],
          }),
        }),
      );
    });

    it('should create message with explicit messageType and attachments', async () => {
      const imageMessage = {
        ...MOCK_MESSAGE,
        messageType: 'image',
        attachments: ['img1.png'],
      };
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(MOCK_ORDER);
      mockPrisma.bespokeMessage.create.mockResolvedValue(imageMessage);

      const result = await service.sendMessage(MOCK_USER_ID, MOCK_ORDER_ID, {
        content: 'Check this',
        messageType: 'image',
        attachments: ['img1.png'],
      });

      expect(result.messageType).toBe('image');
    });

    it('should allow studio owner to send message', async () => {
      const otherUserOrder = { ...MOCK_ORDER, userId: 'other-user' };
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(otherUserOrder);
      mockPrisma.bespokeStudio.findFirst.mockResolvedValue(MOCK_ACTIVE_STUDIO);
      mockPrisma.bespokeMessage.create.mockResolvedValue(MOCK_MESSAGE);

      const result = await service.sendMessage('studio-owner-001', MOCK_ORDER_ID, {
        content: 'Studio message',
      });

      expect(result.content).toBe('Hello');
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.sendMessage(MOCK_USER_ID, 'non-existent', { content: 'Hi' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when order is cancelled', async () => {
      const cancelledOrder = { ...MOCK_ORDER, status: 'cancelled' };
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(cancelledOrder);

      await expect(
        service.sendMessage(MOCK_USER_ID, MOCK_ORDER_ID, { content: 'Hi' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when user has no access', async () => {
      const otherUserOrder = { ...MOCK_ORDER, userId: 'other-user' };
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(otherUserOrder);
      mockPrisma.bespokeStudio.findFirst.mockResolvedValue(null);

      await expect(
        service.sendMessage('random-user', MOCK_ORDER_ID, { content: 'Hi' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should handle message with null sender', async () => {
      const messageNullSender = { ...MOCK_MESSAGE, sender: null };
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(MOCK_ORDER);
      mockPrisma.bespokeMessage.create.mockResolvedValue(messageNullSender);

      const result = await service.sendMessage(MOCK_USER_ID, MOCK_ORDER_ID, {
        content: 'Hello',
      });

      expect(result.sender).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------
  // createQuote
  // ---------------------------------------------------------------
  describe('createQuote', () => {
    const quoteDto = {
      totalPrice: 80000,
      items: [
        { name: 'Fabric', quantity: 1, unitPrice: 50000, subtotal: 50000 },
      ],
      estimatedDays: 14,
      validUntil: '2099-12-31',
      notes: 'Includes fitting',
    };

    it('should create a quote and update order status to quoted when submitted', async () => {
      const studioOwnerOrder = { ...MOCK_ORDER, studioId: MOCK_STUDIO_ID };
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(studioOwnerOrder);
      mockPrisma.bespokeStudio.findFirst.mockResolvedValue(MOCK_ACTIVE_STUDIO);
      mockPrisma.bespokeQuote.create.mockResolvedValue(MOCK_QUOTE);
      mockPrisma.bespokeOrder.update.mockResolvedValue({
        ...studioOwnerOrder,
        status: 'quoted',
      });

      const result = await service.createQuote('studio-owner-001', MOCK_ORDER_ID, quoteDto);

      expect(result.id).toBe(MOCK_QUOTE_ID);
      expect(result.totalPrice).toBe(80000);
      expect(mockPrisma.bespokeOrder.update).toHaveBeenCalled();
    });

    it('should create quote without updating status when order is already quoted', async () => {
      const quotedOrder = { ...MOCK_ORDER, status: 'quoted' };
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(quotedOrder);
      mockPrisma.bespokeStudio.findFirst.mockResolvedValue(MOCK_ACTIVE_STUDIO);
      mockPrisma.bespokeQuote.create.mockResolvedValue(MOCK_QUOTE);

      await service.createQuote('studio-owner-001', MOCK_ORDER_ID, quoteDto);

      expect(mockPrisma.bespokeOrder.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.createQuote('studio-owner-001', 'non-existent', quoteDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not studio owner', async () => {
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(MOCK_ORDER);
      mockPrisma.bespokeStudio.findFirst.mockResolvedValue(null);

      await expect(
        service.createQuote('random-user', MOCK_ORDER_ID, quoteDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when order status does not allow quoting', async () => {
      const paidOrder = { ...MOCK_ORDER, status: 'paid' };
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(paidOrder);
      mockPrisma.bespokeStudio.findFirst.mockResolvedValue(MOCK_ACTIVE_STUDIO);

      await expect(
        service.createQuote('studio-owner-001', MOCK_ORDER_ID, quoteDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle quote without optional fields', async () => {
      const minimalQuoteDto = {
        totalPrice: 50000,
        items: [{ name: 'Base', quantity: 1, unitPrice: 50000, subtotal: 50000 }],
      };
      const minimalQuote = {
        ...MOCK_QUOTE,
        estimatedDays: null,
        validUntil: null,
        notes: null,
      };
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(MOCK_ORDER);
      mockPrisma.bespokeStudio.findFirst.mockResolvedValue(MOCK_ACTIVE_STUDIO);
      mockPrisma.bespokeQuote.create.mockResolvedValue(minimalQuote);

      const result = await service.createQuote('studio-owner-001', MOCK_ORDER_ID, minimalQuoteDto);

      expect(result.estimatedDays).toBeNull();
      expect(result.validUntil).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------
  // getQuotes
  // ---------------------------------------------------------------
  describe('getQuotes', () => {
    it('should return quotes for order owner', async () => {
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(MOCK_ORDER);
      mockPrisma.bespokeQuote.findMany.mockResolvedValue([MOCK_QUOTE]);

      const result = await service.getQuotes(MOCK_USER_ID, MOCK_ORDER_ID);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(MOCK_QUOTE_ID);
    });

    it('should return quotes for studio owner', async () => {
      const otherUserOrder = { ...MOCK_ORDER, userId: 'other-user' };
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(otherUserOrder);
      mockPrisma.bespokeStudio.findFirst.mockResolvedValue(MOCK_ACTIVE_STUDIO);
      mockPrisma.bespokeQuote.findMany.mockResolvedValue([MOCK_QUOTE]);

      const result = await service.getQuotes('studio-owner-001', MOCK_ORDER_ID);

      expect(result).toHaveLength(1);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.getQuotes(MOCK_USER_ID, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user has no access', async () => {
      const otherUserOrder = { ...MOCK_ORDER, userId: 'other-user' };
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(otherUserOrder);
      mockPrisma.bespokeStudio.findFirst.mockResolvedValue(null);

      await expect(
        service.getQuotes('random-user', MOCK_ORDER_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ---------------------------------------------------------------
  // acceptQuote
  // ---------------------------------------------------------------
  describe('acceptQuote', () => {
    const mockQuoteWithOrder = {
      ...MOCK_QUOTE,
      order: { ...MOCK_ORDER, status: 'quoted', statusHistory: [] },
      orderId: MOCK_ORDER_ID,
    };

    it('should accept quote and update order status to paid', async () => {
      mockPrisma.bespokeQuote.findUnique.mockResolvedValue(mockQuoteWithOrder);
      const txQuoteUpdate = jest.fn().mockResolvedValue({ ...MOCK_QUOTE, status: 'accepted' });
      const txQuoteUpdateMany = jest.fn().mockResolvedValue({});
      const txOrderUpdate = jest.fn().mockResolvedValue({ ...MOCK_ORDER, status: 'paid' });

      mockPrisma.$transaction.mockImplementation(async (fn) => {
        return fn({
          bespokeQuote: { update: txQuoteUpdate, updateMany: txQuoteUpdateMany },
          bespokeOrder: { update: txOrderUpdate },
        });
      });

      const result = await service.acceptQuote(MOCK_USER_ID, MOCK_QUOTE_ID);

      expect(result.id).toBe(MOCK_QUOTE_ID);
      expect(txQuoteUpdate).toHaveBeenCalled();
      expect(txQuoteUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            orderId: MOCK_ORDER_ID,
            id: { not: MOCK_QUOTE_ID },
            status: 'pending',
          }),
          data: { status: 'rejected' },
        }),
      );
      expect(txOrderUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'paid' }),
        }),
      );
    });

    it('should throw NotFoundException when quote does not exist', async () => {
      mockPrisma.bespokeQuote.findUnique.mockResolvedValue(null);

      await expect(
        service.acceptQuote(MOCK_USER_ID, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not the order owner', async () => {
      const otherOwnerQuote = {
        ...mockQuoteWithOrder,
        order: { ...mockQuoteWithOrder.order, userId: 'other-user' },
      };
      mockPrisma.bespokeQuote.findUnique.mockResolvedValue(otherOwnerQuote);

      await expect(
        service.acceptQuote(MOCK_USER_ID, MOCK_QUOTE_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when quote is not pending', async () => {
      const acceptedQuote = { ...mockQuoteWithOrder, status: 'accepted' };
      mockPrisma.bespokeQuote.findUnique.mockResolvedValue(acceptedQuote);

      await expect(
        service.acceptQuote(MOCK_USER_ID, MOCK_QUOTE_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when order is not in quoted status', async () => {
      const nonQuotedOrder = {
        ...mockQuoteWithOrder,
        order: { ...mockQuoteWithOrder.order, status: 'submitted' },
      };
      mockPrisma.bespokeQuote.findUnique.mockResolvedValue(nonQuotedOrder);

      await expect(
        service.acceptQuote(MOCK_USER_ID, MOCK_QUOTE_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when quote is expired', async () => {
      const expiredQuote = {
        ...mockQuoteWithOrder,
        validUntil: new Date('2020-01-01'),
      };
      mockPrisma.bespokeQuote.findUnique.mockResolvedValue(expiredQuote);

      await expect(
        service.acceptQuote(MOCK_USER_ID, MOCK_QUOTE_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept quote when validUntil is null (no expiry)', async () => {
      const noExpiryQuote = {
        ...mockQuoteWithOrder,
        validUntil: null,
      };
      mockPrisma.bespokeQuote.findUnique.mockResolvedValue(noExpiryQuote);
      const txQuoteUpdate = jest.fn().mockResolvedValue({ ...MOCK_QUOTE, status: 'accepted' });
      const txQuoteUpdateMany = jest.fn().mockResolvedValue({});
      const txOrderUpdate = jest.fn().mockResolvedValue({ ...MOCK_ORDER, status: 'paid' });

      mockPrisma.$transaction.mockImplementation(async (fn) => {
        return fn({
          bespokeQuote: { update: txQuoteUpdate, updateMany: txQuoteUpdateMany },
          bespokeOrder: { update: txOrderUpdate },
        });
      });

      const result = await service.acceptQuote(MOCK_USER_ID, MOCK_QUOTE_ID);

      expect(result.id).toBe(MOCK_QUOTE_ID);
    });
  });

  // ---------------------------------------------------------------
  // rejectQuote
  // ---------------------------------------------------------------
  describe('rejectQuote', () => {
    const mockQuoteWithOrder = {
      ...MOCK_QUOTE,
      order: { ...MOCK_ORDER, status: 'quoted' },
      orderId: MOCK_ORDER_ID,
    };

    it('should reject a pending quote', async () => {
      mockPrisma.bespokeQuote.findUnique.mockResolvedValue(mockQuoteWithOrder);
      mockPrisma.bespokeQuote.update.mockResolvedValue({
        ...MOCK_QUOTE,
        status: 'rejected',
      });

      const result = await service.rejectQuote(MOCK_USER_ID, MOCK_QUOTE_ID);

      expect(result.status).toBe('rejected');
      expect(mockPrisma.bespokeQuote.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'rejected' },
        }),
      );
    });

    it('should throw NotFoundException when quote does not exist', async () => {
      mockPrisma.bespokeQuote.findUnique.mockResolvedValue(null);

      await expect(
        service.rejectQuote(MOCK_USER_ID, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not the order owner', async () => {
      const otherOwnerQuote = {
        ...mockQuoteWithOrder,
        order: { ...mockQuoteWithOrder.order, userId: 'other-user' },
      };
      mockPrisma.bespokeQuote.findUnique.mockResolvedValue(otherOwnerQuote);

      await expect(
        service.rejectQuote(MOCK_USER_ID, MOCK_QUOTE_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when quote is not pending', async () => {
      const acceptedQuote = { ...mockQuoteWithOrder, status: 'accepted' };
      mockPrisma.bespokeQuote.findUnique.mockResolvedValue(acceptedQuote);

      await expect(
        service.rejectQuote(MOCK_USER_ID, MOCK_QUOTE_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ---------------------------------------------------------------
  // createReview
  // ---------------------------------------------------------------
  describe('createReview', () => {
    const reviewDto = {
      rating: 5,
      content: 'Excellent work',
      images: ['img1.png'],
      isAnonymous: false as unknown as undefined,
    };

    it('should create a review for a completed order and update studio rating', async () => {
      const completedOrder = { ...MOCK_ORDER, status: 'completed' };
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(completedOrder);
      mockPrisma.bespokeReview.findUnique.mockResolvedValue(null);
      mockPrisma.bespokeReview.create.mockResolvedValue(MOCK_REVIEW);
      mockPrisma.bespokeReview.aggregate.mockResolvedValue({
        _avg: { rating: 4.8 },
        _count: { rating: 1 },
      });
      mockPrisma.bespokeStudio.update.mockResolvedValue(MOCK_ACTIVE_STUDIO);

      const result = await service.createReview(MOCK_USER_ID, MOCK_ORDER_ID, reviewDto);

      expect(result.id).toBe('review-001');
      expect(result.rating).toBe(5);
      expect(mockPrisma.bespokeReview.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderId: MOCK_ORDER_ID,
            userId: MOCK_USER_ID,
            studioId: MOCK_STUDIO_ID,
            rating: 5,
          }),
        }),
      );
      expect(mockPrisma.bespokeStudio.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: MOCK_STUDIO_ID },
          data: { rating: 4.8, reviewCount: 1 },
        }),
      );
    });

    it('should create review with images array', async () => {
      const completedOrder = { ...MOCK_ORDER, status: 'completed' };
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(completedOrder);
      mockPrisma.bespokeReview.findUnique.mockResolvedValue(null);
      mockPrisma.bespokeReview.create.mockResolvedValue({
        ...MOCK_REVIEW,
        images: ['img1.png', 'img2.png'],
      });
      mockPrisma.bespokeReview.aggregate.mockResolvedValue({
        _avg: { rating: 5 },
        _count: { rating: 2 },
      });
      mockPrisma.bespokeStudio.update.mockResolvedValue(MOCK_ACTIVE_STUDIO);

      const result = await service.createReview(MOCK_USER_ID, MOCK_ORDER_ID, {
        ...reviewDto,
        images: ['img1.png', 'img2.png'],
      });

      expect(result.images).toEqual(['img1.png', 'img2.png']);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.createReview(MOCK_USER_ID, 'non-existent', reviewDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not the order owner', async () => {
      const completedOrder = { ...MOCK_ORDER, status: 'completed', userId: 'other-user' };
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(completedOrder);

      await expect(
        service.createReview(MOCK_USER_ID, MOCK_ORDER_ID, reviewDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when order is not completed', async () => {
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(MOCK_ORDER);

      await expect(
        service.createReview(MOCK_USER_ID, MOCK_ORDER_ID, reviewDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when review already exists', async () => {
      const completedOrder = { ...MOCK_ORDER, status: 'completed' };
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(completedOrder);
      mockPrisma.bespokeReview.findUnique.mockResolvedValue(MOCK_REVIEW);

      await expect(
        service.createReview(MOCK_USER_ID, MOCK_ORDER_ID, reviewDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set isAnonymous correctly when true', async () => {
      const completedOrder = { ...MOCK_ORDER, status: 'completed' };
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(completedOrder);
      mockPrisma.bespokeReview.findUnique.mockResolvedValue(null);
      mockPrisma.bespokeReview.create.mockResolvedValue({
        ...MOCK_REVIEW,
        isAnonymous: true,
      });
      mockPrisma.bespokeReview.aggregate.mockResolvedValue({
        _avg: { rating: 5 },
        _count: { rating: 1 },
      });
      mockPrisma.bespokeStudio.update.mockResolvedValue(MOCK_ACTIVE_STUDIO);

      const result = await service.createReview(MOCK_USER_ID, MOCK_ORDER_ID, {
        rating: 5,
        isAnonymous: 'true' as unknown as boolean,
      });

      expect(result.isAnonymous).toBe(true);
      expect(mockPrisma.bespokeReview.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isAnonymous: true,
          }),
        }),
      );
    });
  });

  // ---------------------------------------------------------------
  // getStudioOrders
  // ---------------------------------------------------------------
  describe('getStudioOrders', () => {
    const MOCK_ORDER_WITH_USER = {
      ...MOCK_ORDER,
      user: {
        id: MOCK_USER_ID,
        nickname: 'TestUser',
        avatarUrl: 'avatar.png',
      },
    };

    it('should return paginated orders for studio owner', async () => {
      mockPrisma.bespokeStudio.findFirst.mockResolvedValue(MOCK_ACTIVE_STUDIO);
      mockPrisma.bespokeOrder.findMany.mockResolvedValue([MOCK_ORDER_WITH_USER]);
      mockPrisma.bespokeOrder.count.mockResolvedValue(1);

      const result = await service.getStudioOrders('studio-owner-001', 1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.items[0].customer).toBeDefined();
      expect(result.items[0].customer!.nickname).toBe('TestUser');
    });

    it('should filter by status when provided', async () => {
      mockPrisma.bespokeStudio.findFirst.mockResolvedValue(MOCK_ACTIVE_STUDIO);
      mockPrisma.bespokeOrder.findMany.mockResolvedValue([]);
      mockPrisma.bespokeOrder.count.mockResolvedValue(0);

      await service.getStudioOrders('studio-owner-001', 1, 20, 'submitted');

      expect(mockPrisma.bespokeOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'submitted' }),
        }),
      );
    });

    it('should throw ForbiddenException when user is not a studio owner', async () => {
      mockPrisma.bespokeStudio.findFirst.mockResolvedValue(null);

      await expect(
        service.getStudioOrders('random-user', 1, 20),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should clamp page and limit values', async () => {
      mockPrisma.bespokeStudio.findFirst.mockResolvedValue(MOCK_ACTIVE_STUDIO);
      mockPrisma.bespokeOrder.findMany.mockResolvedValue([]);
      mockPrisma.bespokeOrder.count.mockResolvedValue(0);

      const result = await service.getStudioOrders('studio-owner-001', -1, 100);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });

    it('should handle order with null user', async () => {
      const orderWithNullUser = { ...MOCK_ORDER, user: null };
      mockPrisma.bespokeStudio.findFirst.mockResolvedValue(MOCK_ACTIVE_STUDIO);
      mockPrisma.bespokeOrder.findMany.mockResolvedValue([orderWithNullUser]);
      mockPrisma.bespokeOrder.count.mockResolvedValue(1);

      const result = await service.getStudioOrders('studio-owner-001');

      expect(result.items[0].customer).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------
  // updateOrderStatus
  // ---------------------------------------------------------------
  describe('updateOrderStatus', () => {
    it('should update order status from submitted to quoted', async () => {
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(MOCK_ORDER);
      mockPrisma.bespokeStudio.findFirst.mockResolvedValue(MOCK_ACTIVE_STUDIO);
      mockPrisma.bespokeOrder.update.mockResolvedValue({
        ...MOCK_ORDER,
        status: 'quoted',
      });

      const result = await service.updateOrderStatus(
        'studio-owner-001',
        MOCK_ORDER_ID,
        'quoted',
      );

      expect(result.status).toBe('quoted');
      expect(mockPrisma.bespokeOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'quoted' }),
        }),
      );
    });

    it('should set completedAt when status is completed', async () => {
      const inProgressOrder = { ...MOCK_ORDER, status: 'in_progress' };
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(inProgressOrder);
      mockPrisma.bespokeStudio.findFirst.mockResolvedValue(MOCK_ACTIVE_STUDIO);
      mockPrisma.bespokeOrder.update.mockResolvedValue({
        ...MOCK_ORDER,
        status: 'completed',
        completedAt: new Date(),
      });

      await service.updateOrderStatus(
        'studio-owner-001',
        MOCK_ORDER_ID,
        'completed',
        'Work done',
      );

      expect(mockPrisma.bespokeOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'completed',
            completedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should use default note when none provided', async () => {
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(MOCK_ORDER);
      mockPrisma.bespokeStudio.findFirst.mockResolvedValue(MOCK_ACTIVE_STUDIO);
      mockPrisma.bespokeOrder.update.mockResolvedValue({
        ...MOCK_ORDER,
        status: 'quoted',
      });

      await service.updateOrderStatus(
        'studio-owner-001',
        MOCK_ORDER_ID,
        'quoted',
      );

      const updateCall = mockPrisma.bespokeOrder.update.mock.calls[0][0];
      const lastHistory = updateCall.data.statusHistory[
        updateCall.data.statusHistory.length - 1
      ];
      expect(lastHistory.note).toBe('工作室更新状态为quoted');
    });

    it('should use provided note', async () => {
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(MOCK_ORDER);
      mockPrisma.bespokeStudio.findFirst.mockResolvedValue(MOCK_ACTIVE_STUDIO);
      mockPrisma.bespokeOrder.update.mockResolvedValue({
        ...MOCK_ORDER,
        status: 'quoted',
      });

      await service.updateOrderStatus(
        'studio-owner-001',
        MOCK_ORDER_ID,
        'quoted',
        'Custom note',
      );

      const updateCall = mockPrisma.bespokeOrder.update.mock.calls[0][0];
      const lastHistory = updateCall.data.statusHistory[
        updateCall.data.statusHistory.length - 1
      ];
      expect(lastHistory.note).toBe('Custom note');
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.updateOrderStatus('studio-owner-001', 'non-existent', 'quoted'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not studio owner', async () => {
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(MOCK_ORDER);
      mockPrisma.bespokeStudio.findFirst.mockResolvedValue(null);

      await expect(
        service.updateOrderStatus('random-user', MOCK_ORDER_ID, 'quoted'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid transition', async () => {
      const completedOrder = { ...MOCK_ORDER, status: 'completed' };
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(completedOrder);
      mockPrisma.bespokeStudio.findFirst.mockResolvedValue(MOCK_ACTIVE_STUDIO);

      await expect(
        service.updateOrderStatus('studio-owner-001', MOCK_ORDER_ID, 'submitted'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when transitioning from cancelled', async () => {
      const cancelledOrder = { ...MOCK_ORDER, status: 'cancelled' };
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(cancelledOrder);
      mockPrisma.bespokeStudio.findFirst.mockResolvedValue(MOCK_ACTIVE_STUDIO);

      await expect(
        service.updateOrderStatus('studio-owner-001', MOCK_ORDER_ID, 'paid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow transition from paid to in_progress', async () => {
      const paidOrder = { ...MOCK_ORDER, status: 'paid' };
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(paidOrder);
      mockPrisma.bespokeStudio.findFirst.mockResolvedValue(MOCK_ACTIVE_STUDIO);
      mockPrisma.bespokeOrder.update.mockResolvedValue({
        ...MOCK_ORDER,
        status: 'in_progress',
      });

      const result = await service.updateOrderStatus(
        'studio-owner-001',
        MOCK_ORDER_ID,
        'in_progress',
      );

      expect(result.status).toBe('in_progress');
    });

    it('should preserve existing statusHistory on update', async () => {
      const orderWithHistory = {
        ...MOCK_ORDER,
        statusHistory: [
          { status: 'submitted', at: '2025-01-01', by: MOCK_USER_ID, note: 'Initial' },
        ],
      };
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(orderWithHistory);
      mockPrisma.bespokeStudio.findFirst.mockResolvedValue(MOCK_ACTIVE_STUDIO);
      mockPrisma.bespokeOrder.update.mockResolvedValue({
        ...MOCK_ORDER,
        status: 'quoted',
      });

      await service.updateOrderStatus(
        'studio-owner-001',
        MOCK_ORDER_ID,
        'quoted',
      );

      const updateCall = mockPrisma.bespokeOrder.update.mock.calls[0][0];
      expect(updateCall.data.statusHistory).toHaveLength(2);
    });
  });

  // ---------------------------------------------------------------
  // formatOrder edge cases (tested via public methods)
  // ---------------------------------------------------------------
  describe('formatOrder edge cases', () => {
    it('should handle order without deadline', async () => {
      const orderNoDeadline = { ...MOCK_ORDER, deadline: null };
      mockPrisma.bespokeStudio.findUnique.mockResolvedValue(MOCK_ACTIVE_STUDIO);
      mockPrisma.bespokeOrder.create.mockResolvedValue(orderNoDeadline);
      mockPrisma.bespokeStudio.update.mockResolvedValue(MOCK_ACTIVE_STUDIO);

      const result = await service.createOrder(MOCK_USER_ID, {
        studioId: MOCK_STUDIO_ID,
        description: 'Test',
      });

      expect(result.deadline).toBeUndefined();
    });

    it('should handle order without completedAt and cancelledAt', async () => {
      mockPrisma.bespokeOrder.findUnique.mockResolvedValue(MOCK_ORDER);
      mockPrisma.bespokeOrder.findMany.mockResolvedValue([MOCK_ORDER_WITH_STUDIO]);
      mockPrisma.bespokeOrder.count.mockResolvedValue(1);

      const result = await service.getOrders(MOCK_USER_ID, 1, 20);

      expect(result.items[0].completedAt).toBeUndefined();
      expect(result.items[0].cancelledAt).toBeUndefined();
    });
  });
});
