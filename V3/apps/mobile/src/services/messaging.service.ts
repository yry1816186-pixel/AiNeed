import { api } from './api';
import type { ApiResponse } from '../types';

export interface RoomParticipant {
  userId: string;
  nickname: string;
  avatarUrl?: string | null;
  joinedAt: string;
}

export interface DirectMessage {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  messageType: 'text' | 'image';
  isRead: boolean;
  createdAt: string;
}

export interface ChatRoom {
  id: string;
  createdAt: string;
  participants: RoomParticipant[];
  lastMessage?: DirectMessage | null;
  unreadCount?: number;
}

export interface UnreadCount {
  total: number;
}

export interface MarkReadResponse {
  markedCount: number;
}

export interface MessagesResponse {
  data: DirectMessage[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface GetMessagesParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface SendMessagePayload {
  content: string;
  messageType?: 'text' | 'image';
}

export const messagingService = {
  async getRooms(): Promise<ChatRoom[]> {
    const { data } = await api.get<ApiResponse<ChatRoom[]>>('/messages/rooms');
    if (!data.success || !data.data) {
      throw new Error(data.error?.message ?? '获取聊天列表失败');
    }
    return data.data;
  },

  async createRoom(userId: string): Promise<ChatRoom> {
    const { data } = await api.post<ApiResponse<ChatRoom>>('/messages/rooms', { userId });
    if (!data.success || !data.data) {
      throw new Error(data.error?.message ?? '创建聊天失败');
    }
    return data.data;
  },

  async getMessages(roomId: string, params?: GetMessagesParams): Promise<MessagesResponse> {
    const { data } = await api.get<ApiResponse<DirectMessage[]>>(`/messages/rooms/${roomId}/messages`, {
      params,
    });
    if (!data.success || !data.data) {
      throw new Error(data.error?.message ?? '获取消息失败');
    }
    const meta = data.meta;
    return {
      data: data.data,
      meta: {
        total: meta?.total ?? 0,
        page: meta?.page ?? 1,
        limit: meta?.limit ?? 20,
        totalPages: (meta?.total != null && meta?.limit != null)
          ? Math.ceil(meta.total / meta.limit)
          : 0,
      },
    };
  },

  async sendMessage(roomId: string, payload: SendMessagePayload): Promise<DirectMessage> {
    const { data } = await api.post<ApiResponse<DirectMessage>>(
      `/messages/rooms/${roomId}/messages`,
      payload,
    );
    if (!data.success || !data.data) {
      throw new Error(data.error?.message ?? '发送消息失败');
    }
    return data.data;
  },

  async markRead(messageId: string): Promise<MarkReadResponse> {
    const { data } = await api.patch<ApiResponse<MarkReadResponse>>(
      `/messages/${messageId}/read`,
    );
    if (!data.success || !data.data) {
      throw new Error(data.error?.message ?? '标记已读失败');
    }
    return data.data;
  },

  async getUnreadCount(): Promise<UnreadCount> {
    const { data } = await api.get<ApiResponse<UnreadCount>>('/messages/unread-count');
    if (!data.success || !data.data) {
      throw new Error(data.error?.message ?? '获取未读数失败');
    }
    return data.data;
  },
};
