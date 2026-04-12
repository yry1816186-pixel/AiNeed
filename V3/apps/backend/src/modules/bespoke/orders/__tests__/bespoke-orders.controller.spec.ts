/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { BespokeOrdersController } from '../bespoke-orders.controller';
import { BespokeOrdersService } from '../bespoke-orders.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

const MOCK_USER_ID = 'user-001';
const MOCK_ORDER_ID = 'order-001';
const MOCK_QUOTE_ID = 'quote-001';

function createMockService() {
  return {
    createOrder: jest.fn(),
    getOrders: jest.fn(),
    getOrderById: jest.fn(),
    cancelOrder: jest.fn(),
    getMessages: jest.fn(),
    sendMessage: jest.fn(),
    createQuote: jest.fn(),
    getQuotes: jest.fn(),
    acceptQuote: jest.fn(),
    rejectQuote: jest.fn(),
    createReview: jest.fn(),
    getStudioOrders: jest.fn(),
    updateOrderStatus: jest.fn(),
  };
}

describe('BespokeOrdersController', () => {
  let controller: BespokeOrdersController;
  let mockService: ReturnType<typeof createMockService>;

  beforeEach(async () => {
    mockService = createMockService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BespokeOrdersController],
      providers: [
        {
          provide: BespokeOrdersService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<BespokeOrdersController>(BespokeOrdersController);
  });

  // ---------------------------------------------------------------
  // createOrder
  // ---------------------------------------------------------------
  describe('createOrder', () => {
    const dto = {
      studioId: 'studio-001',
      description: 'Custom dress',
    };

    it('should delegate to service.createOrder', async () => {
      mockService.createOrder.mockResolvedValue({ id: MOCK_ORDER_ID, status: 'submitted' });

      const result = await controller.createOrder(MOCK_USER_ID, dto);

      expect(result.id).toBe(MOCK_ORDER_ID);
      expect(mockService.createOrder).toHaveBeenCalledWith(MOCK_USER_ID, dto);
    });

    it('should propagate NotFoundException', async () => {
      mockService.createOrder.mockRejectedValue(new NotFoundException('工作室不存在或已下线'));

      await expect(controller.createOrder(MOCK_USER_ID, dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ---------------------------------------------------------------
  // getOrders
  // ---------------------------------------------------------------
  describe('getOrders', () => {
    it('should call service with numeric page and limit', async () => {
      mockService.getOrders.mockResolvedValue({
        items: [],
        total: 0,
        page: 2,
        limit: 10,
      });

      const result = await controller.getOrders(MOCK_USER_ID, 2, 10, 'submitted');

      expect(mockService.getOrders).toHaveBeenCalledWith(
        MOCK_USER_ID,
        2,
        10,
        'submitted',
      );
      expect(result.page).toBe(2);
    });

    it('should pass undefined when query params are missing', async () => {
      mockService.getOrders.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      await controller.getOrders(MOCK_USER_ID);

      expect(mockService.getOrders).toHaveBeenCalledWith(
        MOCK_USER_ID,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should convert string page/limit to numbers', async () => {
      mockService.getOrders.mockResolvedValue({
        items: [],
        total: 0,
        page: 3,
        limit: 5,
      });

      await controller.getOrders(MOCK_USER_ID, 3, 5);

      expect(mockService.getOrders).toHaveBeenCalledWith(
        MOCK_USER_ID,
        3,
        5,
        undefined,
      );
    });
  });

  // ---------------------------------------------------------------
  // getOrderById
  // ---------------------------------------------------------------
  describe('getOrderById', () => {
    it('should delegate to service.getOrderById', async () => {
      mockService.getOrderById.mockResolvedValue({ id: MOCK_ORDER_ID });

      const result = await controller.getOrderById(MOCK_USER_ID, MOCK_ORDER_ID);

      expect(result.id).toBe(MOCK_ORDER_ID);
      expect(mockService.getOrderById).toHaveBeenCalledWith(MOCK_USER_ID, MOCK_ORDER_ID);
    });

    it('should propagate NotFoundException', async () => {
      mockService.getOrderById.mockRejectedValue(new NotFoundException('订单不存在'));

      await expect(
        controller.getOrderById(MOCK_USER_ID, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ForbiddenException', async () => {
      mockService.getOrderById.mockRejectedValue(new ForbiddenException('无权查看此订单'));

      await expect(
        controller.getOrderById(MOCK_USER_ID, MOCK_ORDER_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ---------------------------------------------------------------
  // cancelOrder
  // ---------------------------------------------------------------
  describe('cancelOrder', () => {
    it('should delegate to service.cancelOrder', async () => {
      mockService.cancelOrder.mockResolvedValue({
        id: MOCK_ORDER_ID,
        status: 'cancelled',
      });

      const result = await controller.cancelOrder(MOCK_USER_ID, MOCK_ORDER_ID, {
        cancelReason: 'Changed mind',
      });

      expect(result.status).toBe('cancelled');
      expect(mockService.cancelOrder).toHaveBeenCalledWith(
        MOCK_USER_ID,
        MOCK_ORDER_ID,
        { cancelReason: 'Changed mind' },
      );
    });

    it('should propagate BadRequestException for invalid status', async () => {
      mockService.cancelOrder.mockRejectedValue(
        new BadRequestException('订单状态不能从 "completed" 变更为 "cancelled"'),
      );

      await expect(
        controller.cancelOrder(MOCK_USER_ID, MOCK_ORDER_ID, {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ---------------------------------------------------------------
  // getMessages
  // ---------------------------------------------------------------
  describe('getMessages', () => {
    it('should delegate to service.getMessages with converted params', async () => {
      mockService.getMessages.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 50,
      });

      const result = await controller.getMessages(MOCK_USER_ID, MOCK_ORDER_ID, 2, 25);

      expect(mockService.getMessages).toHaveBeenCalledWith(
        MOCK_USER_ID,
        MOCK_ORDER_ID,
        2,
        25,
      );
      expect(result.limit).toBe(50);
    });

    it('should pass undefined when params are missing', async () => {
      mockService.getMessages.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 50,
      });

      await controller.getMessages(MOCK_USER_ID, MOCK_ORDER_ID);

      expect(mockService.getMessages).toHaveBeenCalledWith(
        MOCK_USER_ID,
        MOCK_ORDER_ID,
        undefined,
        undefined,
      );
    });
  });

  // ---------------------------------------------------------------
  // sendMessage
  // ---------------------------------------------------------------
  describe('sendMessage', () => {
    it('should delegate to service.sendMessage', async () => {
      const dto = { content: 'Hello' };
      mockService.sendMessage.mockResolvedValue({
        id: 'msg-001',
        content: 'Hello',
      });

      const result = await controller.sendMessage(MOCK_USER_ID, MOCK_ORDER_ID, dto);

      expect(result.content).toBe('Hello');
      expect(mockService.sendMessage).toHaveBeenCalledWith(MOCK_USER_ID, MOCK_ORDER_ID, dto);
    });

    it('should propagate BadRequestException for cancelled order', async () => {
      mockService.sendMessage.mockRejectedValue(
        new BadRequestException('订单已取消，无法发送消息'),
      );

      await expect(
        controller.sendMessage(MOCK_USER_ID, MOCK_ORDER_ID, { content: 'Hi' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ---------------------------------------------------------------
  // createQuote
  // ---------------------------------------------------------------
  describe('createQuote', () => {
    const dto = {
      totalPrice: 80000,
      items: [{ name: 'Fabric', quantity: 1, unitPrice: 50000, subtotal: 50000 }],
    };

    it('should delegate to service.createQuote', async () => {
      mockService.createQuote.mockResolvedValue({ id: MOCK_QUOTE_ID, totalPrice: 80000 });

      const result = await controller.createQuote(MOCK_USER_ID, MOCK_ORDER_ID, dto);

      expect(result.id).toBe(MOCK_QUOTE_ID);
      expect(mockService.createQuote).toHaveBeenCalledWith(MOCK_USER_ID, MOCK_ORDER_ID, dto);
    });

    it('should propagate ForbiddenException', async () => {
      mockService.createQuote.mockRejectedValue(
        new ForbiddenException('只有工作室所有者才能发送报价'),
      );

      await expect(
        controller.createQuote(MOCK_USER_ID, MOCK_ORDER_ID, dto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ---------------------------------------------------------------
  // getQuotes
  // ---------------------------------------------------------------
  describe('getQuotes', () => {
    it('should delegate to service.getQuotes', async () => {
      mockService.getQuotes.mockResolvedValue([{ id: MOCK_QUOTE_ID }]);

      const result = await controller.getQuotes(MOCK_USER_ID, MOCK_ORDER_ID);

      expect(result).toHaveLength(1);
      expect(mockService.getQuotes).toHaveBeenCalledWith(MOCK_USER_ID, MOCK_ORDER_ID);
    });
  });

  // ---------------------------------------------------------------
  // acceptQuote
  // ---------------------------------------------------------------
  describe('acceptQuote', () => {
    it('should delegate to service.acceptQuote', async () => {
      mockService.acceptQuote.mockResolvedValue({
        id: MOCK_QUOTE_ID,
        status: 'accepted',
      });

      const result = await controller.acceptQuote(MOCK_USER_ID, MOCK_QUOTE_ID);

      expect(result.status).toBe('accepted');
      expect(mockService.acceptQuote).toHaveBeenCalledWith(MOCK_USER_ID, MOCK_QUOTE_ID);
    });

    it('should propagate BadRequestException for expired quote', async () => {
      mockService.acceptQuote.mockRejectedValue(
        new BadRequestException('报价已过期'),
      );

      await expect(
        controller.acceptQuote(MOCK_USER_ID, MOCK_QUOTE_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ---------------------------------------------------------------
  // rejectQuote
  // ---------------------------------------------------------------
  describe('rejectQuote', () => {
    it('should delegate to service.rejectQuote', async () => {
      mockService.rejectQuote.mockResolvedValue({
        id: MOCK_QUOTE_ID,
        status: 'rejected',
      });

      const result = await controller.rejectQuote(MOCK_USER_ID, MOCK_QUOTE_ID);

      expect(result.status).toBe('rejected');
      expect(mockService.rejectQuote).toHaveBeenCalledWith(MOCK_USER_ID, MOCK_QUOTE_ID);
    });
  });

  // ---------------------------------------------------------------
  // createReview
  // ---------------------------------------------------------------
  describe('createReview', () => {
    const dto = {
      rating: 5,
      content: 'Great work',
    };

    it('should delegate to service.createReview', async () => {
      mockService.createReview.mockResolvedValue({
        id: 'review-001',
        rating: 5,
      });

      const result = await controller.createReview(MOCK_USER_ID, MOCK_ORDER_ID, dto);

      expect(result.rating).toBe(5);
      expect(mockService.createReview).toHaveBeenCalledWith(
        MOCK_USER_ID,
        MOCK_ORDER_ID,
        dto,
      );
    });

    it('should propagate BadRequestException for non-completed order', async () => {
      mockService.createReview.mockRejectedValue(
        new BadRequestException('只有已完成的订单才能评价'),
      );

      await expect(
        controller.createReview(MOCK_USER_ID, MOCK_ORDER_ID, dto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ---------------------------------------------------------------
  // getStudioOrders
  // ---------------------------------------------------------------
  describe('getStudioOrders', () => {
    it('should delegate to service.getStudioOrders with converted params', async () => {
      mockService.getStudioOrders.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      const result = await controller.getStudioOrders(MOCK_USER_ID, 2, 10, 'paid');

      expect(mockService.getStudioOrders).toHaveBeenCalledWith(
        MOCK_USER_ID,
        2,
        10,
        'paid',
      );
      expect(result.items).toHaveLength(0);
    });

    it('should pass undefined when params are missing', async () => {
      mockService.getStudioOrders.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      await controller.getStudioOrders(MOCK_USER_ID);

      expect(mockService.getStudioOrders).toHaveBeenCalledWith(
        MOCK_USER_ID,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should propagate ForbiddenException for non-studio owner', async () => {
      mockService.getStudioOrders.mockRejectedValue(
        new ForbiddenException('您不是工作室主理人'),
      );

      await expect(
        controller.getStudioOrders('random-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ---------------------------------------------------------------
  // updateOrderStatus
  // ---------------------------------------------------------------
  describe('updateOrderStatus', () => {
    it('should delegate to service.updateOrderStatus', async () => {
      mockService.updateOrderStatus.mockResolvedValue({
        id: MOCK_ORDER_ID,
        status: 'in_progress',
      });

      const result = await controller.updateOrderStatus(MOCK_USER_ID, MOCK_ORDER_ID, {
        status: 'in_progress',
        note: 'Starting work',
      });

      expect(result.status).toBe('in_progress');
      expect(mockService.updateOrderStatus).toHaveBeenCalledWith(
        MOCK_USER_ID,
        MOCK_ORDER_ID,
        'in_progress',
        'Starting work',
      );
    });

    it('should pass note as undefined when not provided', async () => {
      mockService.updateOrderStatus.mockResolvedValue({
        id: MOCK_ORDER_ID,
        status: 'in_progress',
      });

      await controller.updateOrderStatus(MOCK_USER_ID, MOCK_ORDER_ID, {
        status: 'in_progress',
      });

      expect(mockService.updateOrderStatus).toHaveBeenCalledWith(
        MOCK_USER_ID,
        MOCK_ORDER_ID,
        'in_progress',
        undefined,
      );
    });

    it('should propagate BadRequestException for invalid transition', async () => {
      mockService.updateOrderStatus.mockRejectedValue(
        new BadRequestException('订单状态不能从 "completed" 变更为 "in_progress"'),
      );

      await expect(
        controller.updateOrderStatus(MOCK_USER_ID, MOCK_ORDER_ID, {
          status: 'in_progress',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
