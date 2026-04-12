import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventsService } from '../events.service';

describe('EventsService', () => {
  let service: EventsService;
  let emitter: EventEmitter2;

  beforeEach(() => {
    emitter = new EventEmitter2({ wildcard: false });
    service = new EventsService(emitter);
  });

  afterEach(() => {
    service.removeAllListeners();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('emit', () => {
    it('should emit an event that listeners receive', () => {
      const handler = jest.fn();
      service.on('post.created', handler);

      service.emit('post.created', { postId: 'post-1', userId: 'user-1' });

      expect(handler).toHaveBeenCalledWith({ postId: 'post-1', userId: 'user-1' });
    });

    it('should emit post.liked event', () => {
      const handler = jest.fn();
      service.on('post.liked', handler);

      service.emit('post.liked', { postId: 'post-1', userId: 'user-1', authorId: 'author-1' });

      expect(handler).toHaveBeenCalledWith({
        postId: 'post-1',
        userId: 'user-1',
        authorId: 'author-1',
      });
    });

    it('should emit user.followed event', () => {
      const handler = jest.fn();
      service.on('user.followed', handler);

      service.emit('user.followed', { followerId: 'user-1', followingId: 'user-2' });

      expect(handler).toHaveBeenCalledWith({ followerId: 'user-1', followingId: 'user-2' });
    });

    it('should emit notification.push event', () => {
      const handler = jest.fn();
      service.on('notification.push', handler);

      service.emit('notification.push', {
        userId: 'user-1',
        type: 'info',
        title: 'Test notification',
      });

      expect(handler).toHaveBeenCalledWith({
        userId: 'user-1',
        type: 'info',
        title: 'Test notification',
      });
    });
  });

  describe('on', () => {
    it('should register a listener that receives events', () => {
      const handler = jest.fn();
      service.on('message.sent', handler);

      service.emit('message.sent', {
        roomId: 'room-1',
        senderId: 'user-1',
        receiverId: 'user-2',
        messageId: 'msg-1',
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple listeners on the same event', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      service.on('design.published', handler1);
      service.on('design.published', handler2);

      service.emit('design.published', { designId: 'design-1', userId: 'user-1' });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should catch errors from async handlers', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const handler = jest.fn().mockRejectedValue(new Error('Handler error'));

      service.on('post.created', handler);
      service.emit('post.created', { postId: 'post-1', userId: 'user-1' });

      // Wait for the async handler to resolve
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(handler).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe('removeAllListeners', () => {
    it('should remove all listeners for a specific event', () => {
      const handler = jest.fn();
      service.on('post.created', handler);

      service.removeAllListeners('post.created');
      service.emit('post.created', { postId: 'post-1', userId: 'user-1' });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should remove all listeners for all events when no event specified', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      service.on('post.created', handler1);
      service.on('user.followed', handler2);

      service.removeAllListeners();
      service.emit('post.created', { postId: 'post-1', userId: 'user-1' });
      service.emit('user.followed', { followerId: 'user-1', followingId: 'user-2' });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should remove all listeners on module destroy', () => {
      const handler = jest.fn();
      service.on('post.created', handler);

      service.onModuleDestroy();
      service.emit('post.created', { postId: 'post-1', userId: 'user-1' });

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
