import { useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as StylistService from '../services/stylist.service';
import { useStylistStore } from '../stores/stylist.store';
import type {
  StylistSession,
  StylistOutfit,
  CreateSessionPayload,
  SendMessagePayload,
} from '../types';

const SSE_TIMEOUT_MS = 10000;

export function useStylistSessions() {
  return useQuery({
    queryKey: ['stylist', 'sessions'],
    queryFn: () => StylistService.getSessions(),
    staleTime: 30000,
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  const store = useStylistStore();

  return useMutation({
    mutationFn: (payload: CreateSessionPayload) =>
      StylistService.createSession(payload),
    onSuccess: (session: StylistSession) => {
      store.setSession(session);
      queryClient.invalidateQueries({ queryKey: ['stylist', 'sessions'] });
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const store = useStylistStore();

  return useMutation({
    mutationFn: ({ sessionId, payload }: { sessionId: string; payload: SendMessagePayload }) =>
      StylistService.sendMessage(sessionId, payload),
    onSuccess: (message) => {
      store.addMessage(message);
      queryClient.invalidateQueries({ queryKey: ['stylist', 'sessions'] });
    },
  });
}

export function useSseStream() {
  const store = useStylistStore();
  const controllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(
    (sessionId: string) => {
      store.setLoading(true);
      store.setStep('loading');
      store.setStreamingText('');
      store.setError(null);
      store.setOutfits([]);

      timeoutRef.current = setTimeout(() => {
        store.setError('AI响应超时，请重试');
        store.setLoading(false);
      }, SSE_TIMEOUT_MS);

      controllerRef.current = StylistService.connectSseStream(sessionId, {
        onText: (text: string) => {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          store.appendStreamingText(text);
          if (store.step === 'loading') {
            store.setStep('result');
          }
        },
        onOutfit: (outfitJson: string) => {
          try {
            const outfit: StylistOutfit = JSON.parse(outfitJson);
            store.setOutfits([...store.currentOutfits, outfit]);
          } catch {
            // skip malformed outfit data
          }
        },
        onDone: () => {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          store.setLoading(false);
          store.setStep('result');
        },
        onError: (error: string) => {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          store.setError(error);
          store.setLoading(false);
        },
      });
    },
    [store],
  );

  const disconnect = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return { connect, disconnect };
}

export function useGenerateOutfit() {
  const createSessionMutation = useCreateSession();
  const { connect, disconnect } = useSseStream();
  const store = useStylistStore();

  const generate = useCallback(async () => {
    disconnect();
    store.resetResults();
    store.setStep('loading');
    store.setLoading(true);

    try {
      const session = await createSessionMutation.mutateAsync({
        occasion: store.selectedOccasion ?? undefined,
        budget: store.selectedBudget ?? undefined,
        styleTags:
          store.selectedStyles.length > 0 ? store.selectedStyles : undefined,
      });

      connect(session.id);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : '生成搭配方案失败';
      store.setError(message);
      store.setLoading(false);
      store.setStep('select');
    }
  }, [createSessionMutation, connect, disconnect, store]);

  const retry = useCallback(() => {
    store.incrementRetry();
    generate();
  }, [generate, store]);

  const reset = useCallback(() => {
    disconnect();
    store.resetResults();
    store.setStep('select');
    store.setLoading(false);
  }, [disconnect, store]);

  return { generate, retry, reset };
}
