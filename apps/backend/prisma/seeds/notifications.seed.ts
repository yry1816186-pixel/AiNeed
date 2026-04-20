// @ts-nocheck
import { PrismaClient, NotificationType } from "@prisma/client";

const NOTIFICATIONS_DATA = [
  {
    email: "test@example.com",
    notifications: [
      {
        type: NotificationType.daily_recommendation,
        title: "今日推荐已更新",
        content: "根据你的风格偏好，今天为你精选了10件新品，快来看看吧！",
        data: { count: 10 },
        isRead: false,
      },
      {
        type: NotificationType.try_on_completed,
        title: "虚拟试衣完成",
        content: '你试穿的"法式方领泡泡袖衬衫"效果图已生成，点击查看效果。',
        data: { itemId: "demo" },
        targetType: "clothing",
        targetId: "demo",
        isRead: true,
        readAt: new Date("2026-04-17T10:30:00Z"),
      },
      {
        type: NotificationType.new_follower,
        title: "你有新的粉丝",
        content: "时尚达人小美关注了你，快去看看她的穿搭分享吧！",
        data: { followerNickname: "时尚达人小美" },
        isRead: false,
      },
      {
        type: NotificationType.price_drop,
        title: "收藏商品降价了",
        content: '你收藏的"经典双排扣风衣"从599元降至479元，降幅20%，别错过！',
        data: { itemId: "demo", originalPrice: 599, currentPrice: 479 },
        targetType: "clothing",
        targetId: "demo",
        isRead: false,
      },
      {
        type: NotificationType.system_update,
        title: "寻裳新功能上线",
        content: "AI造型师全新升级，支持多轮对话和场景化推荐，快来体验更智能的穿搭建议！",
        data: { version: "2.0" },
        isRead: true,
        readAt: new Date("2026-04-16T09:00:00Z"),
      },
    ],
  },
  {
    email: "demo@xuno.app",
    notifications: [
      {
        type: NotificationType.subscription_expiring,
        title: "会员即将到期",
        content: "你的月度会员将在3天后到期，续费可享8折优惠，继续享受AI穿搭特权。",
        data: { daysLeft: 3 },
        isRead: false,
      },
      {
        type: NotificationType.comment,
        title: "收到新评论",
        content: '优雅女士Linda评论了你的帖子："太好看了！求链接！"',
        data: { commenterNickname: "优雅女士Linda" },
        isRead: false,
      },
      {
        type: NotificationType.like,
        title: "获得新点赞",
        content: '你的帖子"韩系甜美日常穿搭"获得了15个赞，继续分享你的时尚灵感！',
        data: { likeCount: 15 },
        isRead: true,
        readAt: new Date("2026-04-17T14:00:00Z"),
      },
      {
        type: NotificationType.daily_recommendation,
        title: "今日推荐已更新",
        content: "根据你的韩系甜美风格，今天为你推荐了8件新品，快来挑选心仪单品！",
        data: { count: 8 },
        isRead: false,
      },
      {
        type: NotificationType.bookmark,
        title: "帖子被收藏",
        content: '商务精英David收藏了你的帖子"校园日常穿搭"，你的内容越来越受欢迎了！',
        data: { collectorNickname: "商务精英David" },
        isRead: false,
      },
    ],
  },
  {
    email: "judge@competition.ai",
    notifications: [
      {
        type: NotificationType.try_on_completed,
        title: "虚拟试衣完成",
        content: '你试穿的"羊毛混纺宽腰头西裤"效果图已生成，点击查看。',
        data: { itemId: "demo" },
        targetType: "clothing",
        targetId: "demo",
        isRead: true,
        readAt: new Date("2026-04-16T16:00:00Z"),
      },
      {
        type: NotificationType.subscription_activated,
        title: "年度会员已激活",
        content: "你的年度会员已成功激活，享受无限次AI试衣和专属造型师服务。",
        data: { planName: "年度会员" },
        isRead: true,
        readAt: new Date("2026-04-15T08:00:00Z"),
      },
      {
        type: NotificationType.system_update,
        title: "商务穿搭专区上线",
        content: "新增商务正装智能推荐专区，根据你的职场风格精准匹配，提升专业形象。",
        data: { feature: "business_zone" },
        isRead: false,
      },
    ],
  },
  {
    email: "admin@xuno.app",
    notifications: [
      {
        type: NotificationType.daily_recommendation,
        title: "今日推荐已更新",
        content: "根据你的极简主义风格，今天为你推荐了6件质感单品。",
        data: { count: 6 },
        isRead: false,
      },
      {
        type: NotificationType.new_follower,
        title: "你有新的粉丝",
        content: "极简主义者关注了你，你们风格相似，去看看她的穿搭吧！",
        data: { followerNickname: "极简主义者" },
        isRead: true,
        readAt: new Date("2026-04-17T11:00:00Z"),
      },
    ],
  },
  {
    email: "user5@test.com",
    notifications: [
      {
        type: NotificationType.try_on_completed,
        title: "虚拟试衣完成",
        content: '你试穿的"碎花雪纺连衣裙"效果图已生成，快来看看效果！',
        data: { itemId: "demo" },
        targetType: "clothing",
        targetId: "demo",
        isRead: false,
      },
      {
        type: NotificationType.like,
        title: "获得新点赞",
        content: '你的帖子"韩系甜美日常"获得了22个赞，继续分享！',
        data: { likeCount: 22 },
        isRead: false,
      },
    ],
  },
  {
    email: "user6@test.com",
    notifications: [
      {
        type: NotificationType.daily_recommendation,
        title: "今日推荐已更新",
        content: "根据你的运动休闲风格，今天为你推荐了5件运动新品。",
        data: { count: 5 },
        isRead: true,
        readAt: new Date("2026-04-17T09:00:00Z"),
      },
      {
        type: NotificationType.price_drop,
        title: "收藏商品降价了",
        content: '你收藏的"Air Max 气垫跑鞋"从899元降至699元，降幅22%！',
        data: { itemId: "demo", originalPrice: 899, currentPrice: 699 },
        targetType: "clothing",
        targetId: "demo",
        isRead: false,
      },
    ],
  },
  {
    email: "user7@test.com",
    notifications: [
      {
        type: NotificationType.new_follower,
        title: "你有新的粉丝",
        content: "测试用户关注了你，你的法式优雅风格吸引了更多人！",
        data: { followerNickname: "测试用户" },
        isRead: false,
      },
      {
        type: NotificationType.comment,
        title: "收到新评论",
        content: 'Demo演示账号评论了你的帖子："法式优雅yyds！"',
        data: { commenterNickname: "Demo演示账号" },
        isRead: false,
      },
    ],
  },
  {
    email: "user8@test.com",
    notifications: [
      {
        type: NotificationType.try_on_completed,
        title: "虚拟试衣完成",
        content: '你试穿的"短款机车皮衣"效果图已生成，酷感十足！',
        data: { itemId: "demo" },
        targetType: "clothing",
        targetId: "demo",
        isRead: false,
      },
    ],
  },
  {
    email: "user9@test.com",
    notifications: [
      {
        type: NotificationType.daily_recommendation,
        title: "今日推荐已更新",
        content: "根据你的极简主义风格，今天为你推荐了4件极简质感单品。",
        data: { count: 4 },
        isRead: true,
        readAt: new Date("2026-04-17T10:00:00Z"),
      },
    ],
  },
  {
    email: "user10@test.com",
    notifications: [
      {
        type: NotificationType.subscription_activated,
        title: "季度会员已激活",
        content: "你的季度会员已成功激活，享受无限次AI试衣和专属推荐服务。",
        data: { planName: "季度会员" },
        isRead: true,
        readAt: new Date("2026-04-14T09:00:00Z"),
      },
      {
        type: NotificationType.system_update,
        title: "商务穿搭专区上线",
        content: "新增商务正装智能推荐专区，精准匹配你的职场风格。",
        data: { feature: "business_zone" },
        isRead: false,
      },
    ],
  },
];

export async function seedNotifications(
  prisma: PrismaClient,
  userMap: Map<string, any>
): Promise<{ count: number }> {
  let count = 0;

  for (const entry of NOTIFICATIONS_DATA) {
    const user = userMap.get(entry.email);
    if (!user) continue;

    for (const notif of entry.notifications) {
      const existing = await prisma.notification.findFirst({
        where: { userId: user.id, type: notif.type, title: notif.title },
      });
      if (existing) continue;

      await prisma.notification.create({
        data: {
          userId: user.id,
          type: notif.type,
          title: notif.title,
          content: notif.content,
          data: notif.data ?? null,
          targetType: notif.targetType ?? null,
          targetId: notif.targetId ?? null,
          isRead: notif.isRead ?? false,
          readAt: notif.readAt ?? null,
          isPushed: notif.isRead ?? false,
          pushedAt: notif.isRead ? (notif.readAt ?? new Date()) : null,
        },
      });
      count++;
    }
  }

  return { count };
}
