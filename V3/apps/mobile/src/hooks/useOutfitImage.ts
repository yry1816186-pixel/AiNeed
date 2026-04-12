import { useState, useCallback, useRef, useEffect } from 'react';
import {
  outfitImageService,
  type GenerateOutfitImagePayload,
  type OutfitImageResult,
} from '../services/outfit-image.service';

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 60;

type GenerationState =
  | { phase: 'idle' }
  | { phase: 'generating'; id: string }
  | { phase: 'polling'; id: string; attempt: number }
  | { phase: 'completed'; result: OutfitImageResult }
  | { phase: 'failed'; error: string };

export function useOutfitImage() {
  const [state, setState] = useState<GenerationState>({ phase: 'idle' });
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const pollResult = useCallback(
    (id: string, attempt: number) => {
      if (attempt >= MAX_POLL_ATTEMPTS) {
        setState({ phase: 'failed', error: '生成超时，请稍后重试' });
        return;
      }

      pollTimerRef.current = setTimeout(async () => {
        try {
          const result = await outfitImageService.getById(id);

          if (result.status === 'completed') {
            setState({ phase: 'completed', result });
            return;
          }

          if (result.status === 'failed') {
            setState({ phase: 'failed', error: '生成失败，请重试' });
            return;
          }

          setState({ phase: 'polling', id, attempt: attempt + 1 });
          pollResult(id, attempt + 1);
        } catch {
          setState({ phase: 'failed', error: '查询结果失败，请重试' });
        }
      }, POLL_INTERVAL_MS);
    },
    [],
  );

  const generate = useCallback(
    async (payload: GenerateOutfitImagePayload) => {
      stopPolling();
      setState({ phase: 'generating', id: '' });

      try {
        const result = await outfitImageService.generate(payload);

        if (result.status === 'completed') {
          setState({ phase: 'completed', result });
          return;
        }

        if (result.status === 'failed') {
          setState({ phase: 'failed', error: '生成失败，请重试' });
          return;
        }

        setState({ phase: 'polling', id: result.id, attempt: 0 });
        pollResult(result.id, 0);
      } catch (err) {
        setState({
          phase: 'failed',
          error: err instanceof Error ? err.message : '生成失败',
        });
      }
    },
    [stopPolling, pollResult],
  );

  const reset = useCallback(() => {
    stopPolling();
    setState({ phase: 'idle' });
  }, [stopPolling]);

  const isLoading =
    state.phase === 'generating' || state.phase === 'polling';

  const result =
    state.phase === 'completed' ? state.result : null;

  const error = state.phase === 'failed' ? state.error : null;

  return {
    state,
    isLoading,
    result,
    error,
    generate,
    reset,
  };
}
