import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventsService } from '../events/events.service';

describe('EventsService', () => {
  let service: EventsService;
  let emitter: EventEmitter2;

  beforeEach(async () => {
    emitter = new EventEmitter2({ wildcard: false, delimiter: '.' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: EventEmitter2, useValue: emitter },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  describe('emit', () => {
    it('should emit an event with typed data', () => {
      const handler = jest.fn();
      emitter.on('post.liked', handler);

      service.emit('post.liked', {
        postId: 'post-1',
        userId: 'user-1',
        authorId: 'author-1',
      });

      expect(handler).toHaveBeenCalledWith({
        postId: 'post-1',
        userId: 'user-1',
        authorId: 'author-1',
      });
    });

    it('should emit different event types independently', () => {
      const likeHandler = jest.fn();
      const followHandler = jest.fn();

      emitter.on('post.liked', likeHandler);
      emitter.on('user.followed', followHandler);

      service.emit('post.liked', {
        postId: 'post-1',
        userId: 'user-1',
        authorId: 'author-1',
      });

      expect(likeHandler).toHaveBeenCalledTimes(1);
      expect(followHandler).not.toHaveBeenCalled();
    });
  });

  describe('on', () => {
    it('should register a listener that receives typed data', async () => {
      const handler = jest.fn();

      service.on('post.liked', handler);

      service.emit('post.liked', {
        postId: 'post-1',
        userId: 'user-1',
        authorId: 'author-1',
      });

      await Promise.resolve();

      expect(handler).toHaveBeenCalledWith({
        postId: 'post-1',
        userId: 'user-1',
        authorId: 'author-1',
      });
    });

    it('should isolate listener errors from the emitter', async () => {
      const errorHandler = jest.fn().mockRejectedValue(new Error('Listener failed'));
      const successHandler = jest.fn();

      service.on('user.followed', errorHandler);
      service.on('user.followed', successHandler);

      service.emit('user.followed', {
        followerId: 'user-1',
        followingId: 'user-2',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(errorHandler).toHaveBeenCalled();
      expect(successHandler).toHaveBeenCalled();
    });

    it('should log error when listener throws', async () => {
      const loggerErrorSpy = jest.spyOn(
        (service as unknown as { logger: { error: jest.Mock } }).logger,
        'error',
      );

      service.on('post.created', async () => {
        throw new Error('Test error');
      });

      service.emit('post.created', {
        postId: 'post-1',
        userId: 'user-1',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('post.created'),
      );
    });

    it('should support async handlers', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);

      service.on('message.sent', handler);

      service.emit('message.sent', {
        roomId: 'room-1',
        senderId: 'user-1',
        receiverId: 'user-2',
        messageId: 'msg-1',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(handler).toHaveBeenCalledWith({
        roomId: 'room-1',
        senderId: 'user-1',
        receiverId: 'user-2',
        messageId: 'msg-1',
      });
    });
  });

  describe('removeAllListeners', () => {
    it('should remove all listeners for a specific event', () => {
      const handler = jest.fn();

      service.on('post.liked', handler);
      service.removeAllListeners('post.liked');

      service.emit('post.liked', {
        postId: 'post-1',
        userId: 'user-1',
        authorId: 'author-1',
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should remove all listeners for all events when no event specified', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      service.on('post.liked', handler1);
      service.on('user.followed', handler2);
      service.removeAllListeners();

      service.emit('post.liked', {
        postId: 'post-1',
        userId: 'user-1',
        authorId: 'author-1',
      });
      service.emit('user.followed', {
        followerId: 'user-1',
        followingId: 'user-2',
      });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should clean up all listeners on module destroy', () => {
      const handler = jest.fn();

      service.on('post.liked', handler);
      service.onModuleDestroy();

      service.emit('post.liked', {
        postId: 'post-1',
        userId: 'user-1',
        authorId: 'author-1',
      });

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
