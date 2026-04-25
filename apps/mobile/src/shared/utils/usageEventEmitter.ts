/**
 * Usage Event Emitter -- typed event bus for decoupled interceptor-to-hook communication.
 *
 * Uses EventTarget + CustomEvent for type-safe event dispatching between
 * the API response interceptor and the useUsageLimit hook.
 */

export interface UsageProgressivePayload {
  limit: number;
  remaining: number;
}

export interface UsageExceededPayload {
  limit: number;
  remaining: number;
  actionType?: string;
}

type UsageEventMap = {
  "usage:progressive": UsageProgressivePayload;
  "usage:exceeded": UsageExceededPayload;
};

const eventTarget = new EventTarget();

function emit<K extends keyof UsageEventMap>(type: K, detail: UsageEventMap[K]): void {
  eventTarget.dispatchEvent(new CustomEvent(type, { detail }));
}

function on<K extends keyof UsageEventMap>(
  type: K,
  handler: (detail: UsageEventMap[K]) => void
): () => void {
  const listener = (event: Event) => {
    handler((event as CustomEvent<UsageEventMap[K]>).detail);
  };
  eventTarget.addEventListener(type, listener);
  return () => {
    eventTarget.removeEventListener(type, listener);
  };
}

export const usageEventEmitter = {
  emit,
  on,
} as const;
