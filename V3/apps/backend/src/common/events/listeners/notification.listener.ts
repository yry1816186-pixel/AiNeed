import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../../../modules/notification/notification.service';
import { EventsService } from '../events.service';
import { AppEvents } from '../event-types';

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly eventsService: EventsService,
  ) {}

  @OnEvent('post.liked')
  async handlePostLiked(data: AppEvents['post.liked']): Promise<void> {
    try {
      const notification = await this.notificationService.createNotification(
        data.authorId,
        'like',
        '有人赞了你的帖子',
        undefined,
        data.postId,
        'post',
      );

      this.eventsService.emit('notification.push', {
        userId: data.authorId,
        type: 'like',
        title: notification.title ?? '新通知',
        content: notification.content ?? undefined,
        referenceId: notification.referenceId ?? undefined,
        referenceType: notification.referenceType ?? undefined,
      });
    } catch (error: unknown) {
      this.logger.error(
        `Failed to handle post.liked: ${String(error)}`,
      );
    }
  }

  @OnEvent('post.commented')
  async handlePostCommented(
    data: AppEvents['post.commented'],
  ): Promise<void> {
    try {
      const notification = await this.notificationService.createNotification(
        data.authorId,
        'comment',
        '有人评论了你的帖子',
        undefined,
        data.commentId,
        'comment',
      );

      this.eventsService.emit('notification.push', {
        userId: data.authorId,
        type: 'comment',
        title: notification.title ?? '新通知',
        content: notification.content ?? undefined,
        referenceId: notification.referenceId ?? undefined,
        referenceType: notification.referenceType ?? undefined,
      });
    } catch (error: unknown) {
      this.logger.error(
        `Failed to handle post.commented: ${String(error)}`,
      );
    }
  }

  @OnEvent('user.followed')
  async handleUserFollowed(
    data: AppEvents['user.followed'],
  ): Promise<void> {
    try {
      const notification = await this.notificationService.createNotification(
        data.followingId,
        'follow',
        '有人关注了你',
        undefined,
        data.followerId,
        'user',
      );

      this.eventsService.emit('notification.push', {
        userId: data.followingId,
        type: 'follow',
        title: notification.title ?? '新通知',
        content: notification.content ?? undefined,
        referenceId: notification.referenceId ?? undefined,
        referenceType: notification.referenceType ?? undefined,
      });
    } catch (error: unknown) {
      this.logger.error(
        `Failed to handle user.followed: ${String(error)}`,
      );
    }
  }

  @OnEvent('message.sent')
  async handleMessageSent(
    data: AppEvents['message.sent'],
  ): Promise<void> {
    try {
      const notification = await this.notificationService.createNotification(
        data.receiverId,
        'system',
        '你收到了一条新消息',
        undefined,
        data.messageId,
        'user',
      );

      this.eventsService.emit('notification.push', {
        userId: data.receiverId,
        type: 'system',
        title: notification.title ?? '新通知',
        content: notification.content ?? undefined,
        referenceId: notification.referenceId ?? undefined,
        referenceType: notification.referenceType ?? undefined,
      });
    } catch (error: unknown) {
      this.logger.error(
        `Failed to handle message.sent: ${String(error)}`,
      );
    }
  }

  @OnEvent('custom-order.status_changed')
  async handleCustomOrderStatusChanged(
    data: AppEvents['custom-order.status_changed'],
  ): Promise<void> {
    try {
      const notification = await this.notificationService.createNotification(
        data.userId,
        'order_status',
        `定制订单状态已更新为${data.newStatus}`,
        `订单状态从${data.oldStatus}变更为${data.newStatus}`,
        data.orderId,
        'custom_order',
      );

      this.eventsService.emit('notification.push', {
        userId: data.userId,
        type: 'order_status',
        title: notification.title ?? '新通知',
        content: notification.content ?? undefined,
        referenceId: notification.referenceId ?? undefined,
        referenceType: notification.referenceType ?? undefined,
      });
    } catch (error: unknown) {
      this.logger.error(
        `Failed to handle custom-order.status_changed: ${String(error)}`,
      );
    }
  }

  @OnEvent('bespoke.quote.sent')
  async handleBespokeQuoteSent(
    data: AppEvents['bespoke.quote.sent'],
  ): Promise<void> {
    try {
      const notification = await this.notificationService.createNotification(
        data.userId,
        'order_status',
        '高端定制报价已发送',
        undefined,
        data.orderId,
        'bespoke_order',
      );

      this.eventsService.emit('notification.push', {
        userId: data.userId,
        type: 'order_status',
        title: notification.title ?? '新通知',
        content: notification.content ?? undefined,
        referenceId: notification.referenceId ?? undefined,
        referenceType: notification.referenceType ?? undefined,
      });
    } catch (error: unknown) {
      this.logger.error(
        `Failed to handle bespoke.quote.sent: ${String(error)}`,
      );
    }
  }
}
