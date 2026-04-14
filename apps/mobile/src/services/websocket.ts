import { io, Socket } from "socket.io-client";
import { mobileRuntimeConfig } from "../config/runtime";
import EncryptedStorage from "react-native-encrypted-storage";

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
  private tryOnListeners: Map<string, Set<TryOnEventListener>> = new Map();
  private progressListeners: Map<string, Set<TryOnProgressListener>> = new Map();
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

    this.socket = io(WS_URL, {
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

    this.socket.on("try_on_complete", (payload: TryOnEventPayload) => {
      const listeners = this.tryOnListeners.get(payload.tryOnId);
      if (listeners) {
        listeners.forEach((listener) => listener(payload));
      }
      const wildcardListeners = this.tryOnListeners.get("*");
      if (wildcardListeners) {
        wildcardListeners.forEach((listener) => listener(payload));
      }
    });

    this.socket.on("try_on_progress", (payload: TryOnProgressPayload) => {
      const listeners = this.progressListeners.get(payload.tryOnId);
      if (listeners) {
        listeners.forEach((listener) => listener(payload));
      }
      const wildcardListeners = this.progressListeners.get("*");
      if (wildcardListeners) {
        wildcardListeners.forEach((listener) => listener(payload));
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
