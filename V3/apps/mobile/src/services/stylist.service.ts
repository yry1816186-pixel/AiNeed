import { api } from './api';
import type {
  StylistSession,
  StylistMessage,
  CreateSessionPayload,
  SendMessagePayload,
  ApiResponse,
  SseEvent,
} from '../types';

const STYLIST_BASE = '/stylist';

export async function createSession(
  payload: CreateSessionPayload,
): Promise<StylistSession> {
  const { data } = await api.post<ApiResponse<StylistSession>>(
    `${STYLIST_BASE}/sessions`,
    payload,
  );
  if (!data.success || !data.data) {
    throw new Error(data.error?.message ?? '创建会话失败');
  }
  return data.data;
}

export async function sendMessage(
  sessionId: string,
  payload: SendMessagePayload,
): Promise<StylistMessage> {
  const { data } = await api.post<ApiResponse<StylistMessage>>(
    `${STYLIST_BASE}/sessions/${sessionId}/messages`,
    payload,
  );
  if (!data.success || !data.data) {
    throw new Error(data.error?.message ?? '发送消息失败');
  }
  return data.data;
}

export async function getSessions(): Promise<StylistSession[]> {
  const { data } = await api.get<ApiResponse<StylistSession[]>>(
    `${STYLIST_BASE}/sessions`,
  );
  if (!data.success || !data.data) {
    throw new Error(data.error?.message ?? '获取会话列表失败');
  }
  return data.data;
}

export async function getSession(
  sessionId: string,
): Promise<StylistSession> {
  const { data } = await api.get<ApiResponse<StylistSession>>(
    `${STYLIST_BASE}/sessions/${sessionId}`,
  );
  if (!data.success || !data.data) {
    throw new Error(data.error?.message ?? '获取会话详情失败');
  }
  return data.data;
}

export async function deleteSession(
  sessionId: string,
): Promise<void> {
  await api.delete(`${STYLIST_BASE}/sessions/${sessionId}`);
}

export interface SseCallbacks {
  onText: (text: string) => void;
  onOutfit: (outfitJson: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

export function connectSseStream(
  sessionId: string,
  callbacks: SseCallbacks,
  signal?: AbortSignal,
): AbortController {
  const controller = new AbortController();
  const effectiveSignal = signal ?? controller.signal;

  const API_BASE_URL = __DEV__
    ? 'http://10.0.2.2:3001/api/v1'
    : 'https://api.aineed.com/api/v1';

  const token =
    typeof window !== 'undefined'
      ? undefined
      : undefined;

  const streamUrl = `${API_BASE_URL}${STYLIST_BASE}/sessions/${sessionId}/stream`;

  (async () => {
    try {
      const response = await fetch(streamUrl, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
          Authorization: `Bearer ${getTokenFromStore()}`,
        },
        signal: effectiveSignal,
      });

      if (!response.ok) {
        callbacks.onError(`SSE连接失败: ${response.status}`);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        callbacks.onError('无法读取响应流');
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        let currentEventType = '';
        let currentData = '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEventType = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            currentData = line.slice(5).trim();
          } else if (line === '') {
            if (currentEventType && currentData) {
              const event: SseEvent = {
                type: currentEventType as SseEvent['type'],
                data: currentData,
              };
              handleSseEvent(event, callbacks);
            }
            currentEventType = '';
            currentData = '';
          }
        }
      }

      if (buffer.trim()) {
        const remainingLines = buffer.split('\n');
        let eventType = '';
        let eventData = '';
        for (const line of remainingLines) {
          if (line.startsWith('event:')) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            eventData = line.slice(5).trim();
          }
        }
        if (eventType && eventData) {
          handleSseEvent({ type: eventType as SseEvent['type'], data: eventData }, callbacks);
        }
      }
    } catch (err: unknown) {
      if (effectiveSignal.aborted) return;
      const message = err instanceof Error ? err.message : 'SSE连接异常';
      callbacks.onError(message);
    }
  })();

  return controller;
}

function handleSseEvent(event: SseEvent, callbacks: SseCallbacks): void {
  switch (event.type) {
    case 'text':
      callbacks.onText(event.data);
      break;
    case 'outfit':
      callbacks.onOutfit(event.data);
      break;
    case 'done':
      callbacks.onDone();
      break;
    case 'error':
      callbacks.onError(event.data);
      break;
  }
}

function getTokenFromStore(): string {
  try {
    const { useAuthStore } = require('../stores/auth.store');
    return useAuthStore.getState().accessToken ?? '';
  } catch {
    return '';
  }
}
