import { useState, useEffect, useCallback } from "react";
import { featureFlagApi } from "../../services/api/feature-flag.api";

interface UseFeatureFlagOptions {
  key: string;
  defaultValue?: boolean;
  userId?: string;
  attributes?: Record<string, unknown>;
}

interface UseFeatureFlagReturn {
  enabled: boolean;
  variant: string | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useFeatureFlag({
  key,
  defaultValue = false,
  userId,
  attributes,
}: UseFeatureFlagOptions): UseFeatureFlagReturn {
  const [enabled, setEnabled] = useState(defaultValue);
  const [variant, setVariant] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const evaluate = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await featureFlagApi.evaluateFlag({
        key,
        attributes: { userId, ...attributes },
      });
      if (response.success && response.data) {
        setEnabled(response.data.enabled);
        setVariant(response.data.variant ?? null);
      } else {
        setEnabled(defaultValue);
      }
    } catch (err) {
      setError(err as Error);
      setEnabled(defaultValue);
    } finally {
      setLoading(false);
    }
  }, [key, userId, attributes, defaultValue]);

  useEffect(() => {
    void evaluate();
  }, [evaluate]);

  return { enabled, variant, loading, error, refresh: evaluate };
}
