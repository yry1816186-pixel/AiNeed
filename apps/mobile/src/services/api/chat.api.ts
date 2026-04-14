import { apiClient } from "./client";

export const chatApi = {
  createRoom: (consultantId: string) =>
    apiClient.post("/chat/rooms", { consultantId }),

  getRooms: (params?: { page?: number; isActive?: boolean }) =>
    apiClient.get("/chat/rooms", { params }),

  getMessages: (roomId: string, params?: { page?: number; beforeId?: string }) =>
    apiClient.get(`/chat/rooms/${roomId}/messages`, { params }),

  sendMessage: (data: {
    roomId: string;
    senderType: string;
    content: string;
    messageType?: string;
    imageUrl?: string;
    fileUrl?: string;
  }) => apiClient.post("/chat/messages", data),

  markAsRead: (roomId: string, lastMessageId?: string) =>
    apiClient.put(`/chat/rooms/${roomId}/read`, { lastMessageId }),
};
