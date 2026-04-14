/**
 * Notification template definitions for 4 categories:
 * - order: Order status notifications
 * - recommendation: Personalized recommendation notifications
 * - community: Social interaction notifications
 * - system: App-level system notifications
 *
 * Templates use {variableName} placeholders for variable interpolation.
 */

export type NotificationCategory = "order" | "recommendation" | "community" | "system";

export type NotificationPriority = "high" | "normal" | "low";

export interface NotificationTemplate {
  key: string;
  category: NotificationCategory;
  titleTemplate: string;
  bodyTemplate: string;
  defaultActionUrl?: string;
  priority: NotificationPriority;
}

/**
 * All notification templates indexed by key.
 */
export const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  // ==================== Order Notifications ====================

  order_payment_success: {
    key: "order_payment_success",
    category: "order",
    titleTemplate: "支付成功",
    bodyTemplate: "订单 {orderNo} 支付成功，金额 {amount}，商家将尽快发货",
    defaultActionUrl: "/orders/{orderId}",
    priority: "high",
  },

  order_shipped: {
    key: "order_shipped",
    titleTemplate: "商品已发货",
    category: "order",
    bodyTemplate: "订单 {orderNo} 已发货，快递单号 {trackingNo}，点击查看物流详情",
    defaultActionUrl: "/orders/{orderId}",
    priority: "high",
  },

  order_delivered: {
    key: "order_delivered",
    titleTemplate: "商品已签收",
    category: "order",
    bodyTemplate: "订单 {orderNo} 已签收，快来评价吧",
    defaultActionUrl: "/orders/{orderId}",
    priority: "high",
  },

  order_cancelled: {
    key: "order_cancelled",
    titleTemplate: "订单已取消",
    category: "order",
    bodyTemplate: "订单 {orderNo} 已取消",
    defaultActionUrl: "/orders/{orderId}",
    priority: "normal",
  },

  order_refund_approved: {
    key: "order_refund_approved",
    titleTemplate: "退款成功",
    category: "order",
    bodyTemplate: "订单 {orderNo} 的退款已通过，{amount} 将退回原支付方式",
    defaultActionUrl: "/orders/{orderId}",
    priority: "high",
  },

  order_refund_rejected: {
    key: "order_refund_rejected",
    titleTemplate: "退款被驳回",
    category: "order",
    bodyTemplate: "订单 {orderNo} 的退款申请已被驳回，原因：{reason}",
    defaultActionUrl: "/orders/{orderId}",
    priority: "normal",
  },

  // ==================== Recommendation Notifications ====================

  daily_recommendation: {
    key: "daily_recommendation",
    titleTemplate: "今日穿搭推荐",
    category: "recommendation",
    bodyTemplate: "根据天气和您的风格，为您精选了 {count} 套穿搭方案",
    defaultActionUrl: "/recommendations",
    priority: "normal",
  },

  new_style_discovery: {
    key: "new_style_discovery",
    titleTemplate: "发现新风格",
    category: "recommendation",
    bodyTemplate: "基于您的浏览偏好，我们找到了 {count} 件适合您的单品",
    defaultActionUrl: "/explore",
    priority: "normal",
  },

  price_drop: {
    key: "price_drop",
    titleTemplate: "降价提醒",
    category: "recommendation",
    bodyTemplate: "您收藏的 {productName} 降价了，现价 {price}",
    defaultActionUrl: "/clothing/{productId}",
    priority: "high",
  },

  stock_back_in: {
    key: "stock_back_in",
    titleTemplate: "到货提醒",
    category: "recommendation",
    bodyTemplate: "您关注的 {productName} 已重新上架，尺码 {size} 有货",
    defaultActionUrl: "/clothing/{productId}",
    priority: "high",
  },

  // ==================== Community Notifications ====================

  new_follower: {
    key: "new_follower",
    titleTemplate: "新粉丝",
    category: "community",
    bodyTemplate: "{userName} 关注了你",
    defaultActionUrl: "/profile/{userId}",
    priority: "normal",
  },

  post_liked: {
    key: "post_liked",
    titleTemplate: "收到点赞",
    category: "community",
    bodyTemplate: "{userName} 赞了你的穿搭分享",
    defaultActionUrl: "/community/post/{postId}",
    priority: "normal",
  },

  post_commented: {
    key: "post_commented",
    titleTemplate: "收到评论",
    category: "community",
    bodyTemplate: "{userName} 评论了你的穿搭：{commentPreview}",
    defaultActionUrl: "/community/post/{postId}",
    priority: "normal",
  },

  blogger_new_post: {
    key: "blogger_new_post",
    titleTemplate: "博主更新",
    category: "community",
    bodyTemplate: "你关注的博主 {bloggerName} 发布了新穿搭",
    defaultActionUrl: "/community/post/{postId}",
    priority: "low",
  },

  reply_mention: {
    key: "reply_mention",
    titleTemplate: "回复提到了你",
    category: "community",
    bodyTemplate: "{userName} 在评论中提到了你：{commentPreview}",
    defaultActionUrl: "/community/post/{postId}",
    priority: "normal",
  },

  // ==================== System Notifications ====================

  app_update: {
    key: "app_update",
    titleTemplate: "版本更新",
    category: "system",
    bodyTemplate: "寻裳新版本 {version} 已发布，{featureSummary}",
    defaultActionUrl: "/settings",
    priority: "normal",
  },

  activity_promo: {
    key: "activity_promo",
    titleTemplate: "限时活动",
    category: "system",
    bodyTemplate: "限时活动：{activityName}，{activityDesc}",
    defaultActionUrl: "/activity/{activityId}",
    priority: "normal",
  },

  privacy_policy_update: {
    key: "privacy_policy_update",
    titleTemplate: "隐私政策更新",
    category: "system",
    bodyTemplate: "我们的隐私政策已更新，请查看最新版本",
    defaultActionUrl: "/legal/privacy",
    priority: "high",
  },

  account_security: {
    key: "account_security",
    titleTemplate: "安全提醒",
    category: "system",
    bodyTemplate: "检测到新设备登录，如非本人操作请立即修改密码",
    defaultActionUrl: "/settings/security",
    priority: "high",
  },

  try_on_completed: {
    key: "try_on_completed",
    titleTemplate: "试衣完成",
    category: "system",
    bodyTemplate: "您的虚拟试衣效果已生成，点击查看",
    defaultActionUrl: "/try-on/{tryOnId}",
    priority: "high",
  },

  try_on_failed: {
    key: "try_on_failed",
    titleTemplate: "试衣失败",
    category: "system",
    bodyTemplate: "虚拟试衣生成失败，请稍后重试",
    defaultActionUrl: "/try-on",
    priority: "normal",
  },
};

/**
 * Get all templates grouped by category.
 */
export function getTemplatesByCategory(
  category: NotificationCategory,
): NotificationTemplate[] {
  return Object.values(NOTIFICATION_TEMPLATES).filter(
    (t) => t.category === category,
  );
}

/**
 * Get all template keys.
 */
export function getAllTemplateKeys(): string[] {
  return Object.keys(NOTIFICATION_TEMPLATES);
}

/**
 * Get template count by category.
 */
export function getTemplateCountByCategory(): Record<NotificationCategory, number> {
  const counts: Record<NotificationCategory, number> = {
    order: 0,
    recommendation: 0,
    community: 0,
    system: 0,
  };
  for (const template of Object.values(NOTIFICATION_TEMPLATES)) {
    counts[template.category]++;
  }
  return counts;
}
