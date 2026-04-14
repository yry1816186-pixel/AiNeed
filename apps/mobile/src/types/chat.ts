export type SenderType = "user" | "consultant";

export type MessageType = "text" | "image" | "file" | "system" | "proposal";

export interface ChatRoom {
  id: string;
  userId: string;
  consultantId: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderType: SenderType;
  content: string;
  messageType: MessageType;
  imageUrl?: string;
  fileUrl?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface ProposalData {
  title: string;
  summary: string;
  details?: Record<string, unknown>;
  wardrobeCollectionId?: string;
}

export interface SendMessageRequest {
  roomId: string;
  senderType: SenderType;
  content: string;
  messageType?: MessageType;
  imageUrl?: string;
  fileUrl?: string;
}

export interface ChatRoomListParams {
  page?: number;
  isActive?: boolean;
}

export interface MessageListParams {
  page?: number;
  beforeId?: string;
}

export interface ChatTypingPayload {
  roomId: string;
  isTyping: boolean;
}

export interface ChatReadPayload {
  roomId: string;
  lastMessageId?: string;
}
