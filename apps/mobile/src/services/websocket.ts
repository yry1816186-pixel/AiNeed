import { io, Socket } from "socket.io-client";
import { mobileRuntimeConfig } from "../config/runtime";
import EncryptedStorage from "react-native-encrypted-storage";
import type { ChatMessage, ChatTypingPayload, ChatReadPayload } from "../types/chat";

const WS_URL = mobileRuntimeConfig.apiUrl.replace(/\/api\/v1$/, "");

type TryOnEventPayload = {
  tryOnId: string;
  status: "completed" | "failed";
  resultImageUrl?: string;
  errorMessage?: string;
};

type TryOnProgressPayload = {
  tryOnId: string;
  progress: number;
  stage: "uploading" | "processing" | "generating" | "completed" | "failed";
  timestamp: string;
};

type TryOnEventListener = (payload: TryOnEventPayload) => void;
type TryOnProgressListener = (payload: TryOnProgressPayload) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private chatSocket: Socket | null = null;
  private tryOnListeners: Map<string, Set<TryOnEventListener>> = new Map();
  private progressListeners: Map<string, Set<TryOnProgressListener>> = new Map();
  private chatMessageListeners: Map<string, Set<(payload: ChatMessage) => void>> = new Map();
  private chatTypingListeners: Map<string, Set<(payload: ChatTypingPayload) => void>> = new Map();
  private chatReadListeners: Map<string, Set<(payload: ChatReadPayload) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  async connect(): Promise<void> {
    if (this.socket?.connected) return;

    let token: string | null = null;
    try {
      token = await EncryptedStorage.getItem("accessToken");
    } catch {
      return;
    }

    if (!token) return;

    this.socket = io(`${WS_URL}/ws`, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    this.socket.on("connect", () => {
      this.reconnectAttempts = 0;
    });

    this.socket.on("disconnect", (reason: Socket.DisconnectReason) => {
      if (reason === "io server disconnect") {
        this.reconnect();
      }
    });

    // Backend NotificationGateway emits "notification" events with type field
    this.socket.on("notification", (payload: { type: string; tryOnId?: string; tryOnResult?: TryOnEventPayload; progress?: TryOnProgressPayload }) => {
      if (payload.type === "try_on_complete" && payload.tryOnResult) {
        const data = payload.tryOnResult;
        const listeners = this.tryOnListeners.get(data.tryOnId);
        if (listeners) {
          listeners.forEach((listener) => listener(data));
        }
        const wildcardListeners = this.tryOnListeners.get("*");
        if (wildcardListeners) {
          wildcardListeners.forEach((listener) => listener(data));
        }
      } else if (payload.type === "try_on_progress" && payload.progress) {
        const data = payload.progress;
        const listeners = this.progressListeners.get(data.tryOnId);
        if (listeners) {
          listeners.forEach((listener) => listener(data));
        }
        const wildcardListeners = this.progressListeners.get("*");
        if (wildcardListeners) {
          wildcardListeners.forEach((listener) => listener(data));
        }
      }
    });

    this.socket.on("connect_error", () => {
      this.reconnectAttempts++;
    });
  }

  async reconnect(): Promise<void> {
    this.disconnect();
    await this.connect();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.tryOnListeners.clear();
    this.progressListeners.clear();
  }

  // ==================== Chat namespace (/ws/chat) ====================

  async connectChat(): Promise<void> {
    if (this.chatSocket?.connected) return;

    let token: string | null = null;
    try {
      token = await EncryptedStorage.getItem("accessToken");
    } catch {
      return;
    }
    if (!token) return;

    this.chatSocket = io(`${WS_URL}/ws/chat`, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
    });

    this.chatSocket.on("chat:message", (payload: ChatMessage) => {
      const roomId = payload.roomId;
      const listeners = this.chatMessageListeners.get(roomId);
      if (listeners) listeners.forEach((l) => l(payload));
      const wildcard = this.chatMessageListeners.get("*");
      if (wildcard) wildcard.forEach((l) => l(payload));
    });

    this.chatSocket.on("chat:typing", (payload: ChatTypingPayload) => {
      const roomId = payload.roomId;
      const listeners = this.chatTypingListeners.get(roomId);
      if (listeners) listeners.forEach((l) => l(payload));
    });

    this.chatSocket.on("chat:read", (payload: ChatReadPayload) => {
      const roomId = payload.roomId;
      const listeners = this.chatReadListeners.get(roomId);
      if (listeners) listeners.forEach((l) => l(payload));
    });
  }

  disconnectChat(): void {
    if (this.chatSocket) {
      this.chatSocket.disconnect();
      this.chatSocket = null;
    }
    this.chatMessageListeners.clear();
    this.chatTypingListeners.clear();
    this.chatReadListeners.clear();
  }

  joinChatRoom(roomId: string): void {
    this.chatSocket?.emit("chat:join", { roomId });
  }

  leaveChatRoom(roomId: string): void {
    this.chatSocket?.emit("chat:leave", { roomId });
  }

  sendChatMessage(data: { roomId: string; content: string; messageType?: string }): void {
    this.chatSocket?.emit("chat:message", data);
  }

  sendTyping(roomId: string, isTyping: boolean): void {
    this.chatSocket?.emit("chat:typing", { roomId, isTyping });
  }

  sendReadReceipt(roomId: string, lastMessageId?: string): void {
    this.chatSocket?.emit("chat:read", { roomId, lastMessageId });
  }

  onChatMessage(roomId: string, listener: (payload: ChatMessage) => void): () => void {
    if (!this.chatMessageListeners.has(roomId)) {
      this.chatMessageListeners.set(roomId, new Set());
    }
    this.chatMessageListeners.get(roomId)!.add(listener);
    return () => {
      const listeners = this.chatMessageListeners.get(roomId);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) this.chatMessageListeners.delete(roomId);
      }
    };
  }

  onChatTyping(roomId: string, listener: (payload: ChatTypingPayload) => void): () => void {
    if (!this.chatTypingListeners.has(roomId)) {
      this.chatTypingListeners.set(roomId, new Set());
    }
    this.chatTypingListeners.get(roomId)!.add(listener);
    return () => {
      const listeners = this.chatTypingListeners.get(roomId);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) this.chatTypingListeners.delete(roomId);
      }
    };
  }

  onChatRead(roomId: string, listener: (payload: ChatReadPayload) => void): () => void {
    if (!this.chatReadListeners.has(roomId)) {
      this.chatReadListeners.set(roomId, new Set());
    }
    this.chatReadListeners.get(roomId)!.add(listener);
    return () => {
      const listeners = this.chatReadListeners.get(roomId);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) this.chatReadListeners.delete(roomId);
      }
    };
  }

  isChatConnected(): boolean {
    return this.chatSocket?.connected ?? false;
  }

  onTryOnComplete(tryOnId: string, listener: TryOnEventListener): () => void {
    if (!this.tryOnListeners.has(tryOnId)) {
      this.tryOnListeners.set(tryOnId, new Set());
    }
    this.tryOnListeners.get(tryOnId)!.add(listener);

    return () => {
      const listeners = this.tryOnListeners.get(tryOnId);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.tryOnListeners.delete(tryOnId);
        }
      }
    };
  }

  onTryOnProgress(
    tryOnId: string,
    listener: TryOnProgressListener,
  ): () => void {
    if (!this.progressListeners.has(tryOnId)) {
      this.progressListeners.set(tryOnId, new Set());
    }
    this.progressListeners.get(tryOnId)!.add(listener);

    return () => {
      const listeners = this.progressListeners.get(tryOnId);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.progressListeners.delete(tryOnId);
        }
      }
    };
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  on(event: string, listener: (...args: unknown[]) => void): void {
    if (this.socket) {
      this.socket.on(event, listener as (...args: unknown[]) => void);
    }
  }

  off(event: string, listener: (...args: unknown[]) => void): void {
    if (this.socket) {
      this.socket.off(event, listener as (...args: unknown[]) => void);
    }
  }
}

export const wsService = new WebSocketService();
export type { TryOnEventPayload, TryOnEventListener, TryOnProgressPayload, TryOnProgressListener };
export default wsService;
