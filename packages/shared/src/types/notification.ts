import type { NotificationType } from './enums';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  data?: Record<string, unknown>;
  targetType?: string;
  targetId?: string;
  isRead: boolean;
  readAt?: string;
  isPushed: boolean;
  pushedAt?: string;
  createdAt: string;
}

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  content: string;
  data?: Record<string, unknown>;
  targetType?: string;
  targetId?: string;
}

export interface NotificationSettings {
  email: Record<string, boolean>;
  push: Record<string, boolean>;
  inApp: Record<string, boolean>;
}
