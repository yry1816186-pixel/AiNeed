import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationListener } from '../events/listeners/notification.listener';
import { EventsService } from '../events/events.service';
import { NotificationService } from '../../modules/notification/notification.service';

const MOCK_NOTIFICATION = {
  id: 'notif-1',
  userId: 'user-1',
  type: 'like',
  title: '有人赞了你的帖子',
  content: null,
  referenceId: 'post-1',
  referenceType: 'post',
  isRead: false,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const notificationServiceMockFactory = () => ({
  createNotification: jest.fn().mockResolvedValue(MOCK_NOTIFICATION),
});

describe('NotificationListener', () => {
  let listener: NotificationListener;
  let notificationService: ReturnType<typeof notificationServiceMockFactory>;
  let eventsService: EventsService;

  beforeEach(async () => {
    notificationService = notificationServiceMockFactory();
    const emitter = new EventEmitter2({ wildcard: false, delimiter: '.' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationListener,
        EventsService,
        { provide: EventEmitter2, useValue: emitter },
        {
          provide: NotificationService,
          useValue: notificationService,
        },
      ],
    }).compile();

    listener = module.get<NotificationListener>(NotificationListener);
    eventsService = module.get<EventsService>(EventsService);
  });

  describe('handlePostLiked', () => {
    it('should create notification for post author and push', async () => {
      const pushSpy = jest.spyOn(eventsService, 'emit');

      await listener.handlePostLiked({
        postId: 'post-1',
        userId: 'user-1',
        authorId: 'author-1',
      });

      expect(notificationService.createNotification).toHaveBeenCalledWith(
        'author-1',
        'like',
        '有人赞了你的帖子',
        undefined,
        'post-1',
        'post',
      );

      expect(pushSpy).toHaveBeenCalledWith('notification.push', {
        userId: 'author-1',
        type: 'like',
        title: '有人赞了你的帖子',
        content: undefined,
        referenceId: 'post-1',
        referenceType: 'post',
      });
    });

    it('should not throw when notification creation fails', async () => {
      notificationService.createNotification.mockRejectedValue(
        new Error('DB error'),
      );

      await expect(
        listener.handlePostLiked({
          postId: 'post-1',
          userId: 'user-1',
          authorId: 'author-1',
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('handlePostCommented', () => {
    it('should create notification for post author and push', async () => {
      const pushSpy = jest.spyOn(eventsService, 'emit');

      await listener.handlePostCommented({
        postId: 'post-1',
        userId: 'user-1',
        authorId: 'author-1',
        commentId: 'comment-1',
      });

      expect(notificationService.createNotification).toHaveBeenCalledWith(
        'author-1',
        'comment',
        '有人评论了你的帖子',
        undefined,
        'comment-1',
        'comment',
      );

      expect(pushSpy).toHaveBeenCalledWith('notification.push', expect.objectContaining({
        userId: 'author-1',
        type: 'comment',
      }));
    });
  });

  describe('handleUserFollowed', () => {
    it('should create notification for followed user and push', async () => {
      const pushSpy = jest.spyOn(eventsService, 'emit');

      await listener.handleUserFollowed({
        followerId: 'user-1',
        followingId: 'user-2',
      });

      expect(notificationService.createNotification).toHaveBeenCalledWith(
        'user-2',
        'follow',
        '有人关注了你',
        undefined,
        'user-1',
        'user',
      );

      expect(pushSpy).toHaveBeenCalledWith('notification.push', expect.objectContaining({
        userId: 'user-2',
        type: 'follow',
      }));
    });
  });

  describe('handleMessageSent', () => {
    it('should create notification for receiver and push', async () => {
      const pushSpy = jest.spyOn(eventsService, 'emit');

      await listener.handleMessageSent({
        roomId: 'room-1',
        senderId: 'user-1',
        receiverId: 'user-2',
        messageId: 'msg-1',
      });

      expect(notificationService.createNotification).toHaveBeenCalledWith(
        'user-2',
        'system',
        '你收到了一条新消息',
        undefined,
        'msg-1',
        'user',
      );

      expect(pushSpy).toHaveBeenCalledWith('notification.push', expect.objectContaining({
        userId: 'user-2',
        type: 'system',
      }));
    });
  });

  describe('handleCustomOrderStatusChanged', () => {
    it('should create notification and push with status details', async () => {
      const pushSpy = jest.spyOn(eventsService, 'emit');

      await listener.handleCustomOrderStatusChanged({
        orderId: 'order-1',
        userId: 'user-1',
        oldStatus: 'pending',
        newStatus: 'processing',
      });

      expect(notificationService.createNotification).toHaveBeenCalledWith(
        'user-1',
        'order_status',
        '定制订单状态已更新为processing',
        '订单状态从pending变更为processing',
        'order-1',
        'custom_order',
      );

      expect(pushSpy).toHaveBeenCalledWith('notification.push', expect.objectContaining({
        userId: 'user-1',
        type: 'order_status',
      }));
    });
  });

  describe('handleBespokeQuoteSent', () => {
    it('should create notification and push for bespoke quote', async () => {
      const pushSpy = jest.spyOn(eventsService, 'emit');

      await listener.handleBespokeQuoteSent({
        orderId: 'order-1',
        userId: 'user-1',
        studioId: 'studio-1',
        quoteId: 'quote-1',
      });

      expect(notificationService.createNotification).toHaveBeenCalledWith(
        'user-1',
        'order_status',
        '高端定制报价已发送',
        undefined,
        'order-1',
        'bespoke_order',
      );

      expect(pushSpy).toHaveBeenCalledWith('notification.push', expect.objectContaining({
        userId: 'user-1',
        type: 'order_status',
      }));
    });
  });

  describe('error isolation', () => {
    it('should not propagate errors from notification creation', async () => {
      notificationService.createNotification.mockRejectedValue(
        new Error('DB connection lost'),
      );

      const loggerSpy = jest.spyOn(
        (listener as unknown as { logger: { error: jest.Mock } }).logger,
        'error',
      );

      await listener.handlePostLiked({
        postId: 'post-1',
        userId: 'user-1',
        authorId: 'author-1',
      });

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('post.liked'),
      );
    });

    it('should not propagate errors from bespoke quote handler', async () => {
      notificationService.createNotification.mockRejectedValue(
        new Error('Timeout'),
      );

      const loggerSpy = jest.spyOn(
        (listener as unknown as { logger: { error: jest.Mock } }).logger,
        'error',
      );

      await listener.handleBespokeQuoteSent({
        orderId: 'order-1',
        userId: 'user-1',
        studioId: 'studio-1',
        quoteId: 'quote-1',
      });

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('bespoke.quote.sent'),
      );
    });
  });
});
