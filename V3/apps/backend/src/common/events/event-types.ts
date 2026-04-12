export interface AppEvents {
  'post.created': { postId: string; userId: string };
  'post.liked': { postId: string; userId: string; authorId: string };
  'post.commented': {
    postId: string;
    userId: string;
    authorId: string;
    commentId: string;
  };

  'user.followed': { followerId: string; followingId: string };

  'message.sent': {
    roomId: string;
    senderId: string;
    receiverId: string;
    messageId: string;
  };

  'stylist.session.created': { sessionId: string; userId: string };
  'stylist.outfit.generated': {
    sessionId: string;
    userId: string;
    outfitData: unknown;
  };

  'custom-order.created': { orderId: string; userId: string };
  'custom-order.status_changed': {
    orderId: string;
    userId: string;
    oldStatus: string;
    newStatus: string;
  };

  'design.published': { designId: string; userId: string };
  'design.liked': { designId: string; userId: string; designerId: string };

  'bespoke.order.submitted': {
    orderId: string;
    userId: string;
    studioId: string;
  };
  'bespoke.quote.sent': {
    orderId: string;
    userId: string;
    studioId: string;
    quoteId: string;
  };
  'bespoke.order.completed': {
    orderId: string;
    userId: string;
    studioId: string;
  };

  'user.interaction': { userId: string; clothingId: string; type: string };

  'notification.push': {
    userId: string;
    type: string;
    title: string;
    content?: string;
    referenceId?: string;
    referenceType?: string;
  };
}

export type AppEventName = keyof AppEvents;
export type AppEventData<K extends AppEventName> = AppEvents[K];
