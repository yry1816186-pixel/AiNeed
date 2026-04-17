import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ViewStyle,
} from "react-native";
import { Ionicons } from '../../../polyfills/expo-vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../../../design-system/theme';

interface RetryConfig {
  maxRetries?: number;
  retryDelay?: number;
  backoffMultiplier?: number;
}

interface RetryWrapperProps {
  children: (retry: () => void) => React.ReactNode;
  asyncFn: () => Promise<void>;
  config?: RetryConfig;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  onRetry?: (attempt: number) => void;
  onMaxRetriesReached?: () => void;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

interface RetryState {
  isLoading: boolean;
  error: Error | null;
  retryCount: number;
}

export function RetryWrapper({
  children,
  asyncFn,
  config = {},
  loadingComponent,
  errorComponent,
  onRetry,
  onMaxRetriesReached,
  accessibilityLabel,
  style,
}: RetryWrapperProps) {
  const { maxRetries = 3, retryDelay = 1000, backoffMultiplier = 2 } = config;
  const [state, setState] = useState<RetryState>({ isLoading: false, error: null, retryCount: 0 });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const retryCountRef = useRef(0);
  const handleRetryRef = useRef<() => void>(() => {});

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const execute = useCallback(async () => {
    if (!mountedRef.current) {
      return;
    }
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      await asyncFn();
      if (mountedRef.current) {
        setState((prev) => ({ ...prev, isLoading: false, error: null }));
      }
    } catch (err) {
      if (!mountedRef.current) {
        return;
      }
      setState((prev) => ({ ...prev, isLoading: false, error: err as Error }));
      if (retryCountRef.current < maxRetries) {
        const delay = retryDelay * Math.pow(backoffMultiplier, retryCountRef.current);
        timeoutRef.current = setTimeout(() => handleRetryRef.current(), delay);
      } else {
        onMaxRetriesReached?.();
      }
    }
  }, [asyncFn, maxRetries, retryDelay, backoffMultiplier, onMaxRetriesReached]);

  const handleRetry = useCallback(() => {
    if (retryCountRef.current >= maxRetries) {
      onMaxRetriesReached?.();
      return;
    }
    const nextCount = retryCountRef.current + 1;
    retryCountRef.current = nextCount;
    setState((prev) => ({ ...prev, retryCount: nextCount, error: null }));
    onRetry?.(nextCount);
    void execute();
  }, [maxRetries, onRetry, onMaxRetriesReached, execute]);

  handleRetryRef.current = handleRetry;

  if (state.isLoading) {
    return (
      <View
        style={[styles.center, style]}
        accessibilityLabel={accessibilityLabel || "加载中"}
        accessibilityRole="progressbar"
      >
        {loadingComponent || <ActivityIndicator size="large" color={Colors.primary[500]} />}
      </View>
    );
  }

  if (state.error) {
    if (errorComponent) {
      return <>{errorComponent}</>;
    }
    return (
      <View
        style={[styles.center, style]}
        accessibilityLabel={accessibilityLabel || `加载失败，已重试${state.retryCount}次`}
        accessibilityRole="alert"
      >
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error[500]} />
        <Text style={styles.errorText}>{state.error.message || "加载失败"}</Text>
        {state.retryCount < maxRetries && (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            activeOpacity={0.8}
            accessibilityLabel="重试"
            accessibilityRole="button"
          >
            <Ionicons name="refresh-outline" size={18} color={Colors.neutral[0]} />
            <Text style={styles.retryButtonText}>重试 ({maxRetries - state.retryCount})</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.retryInfo}>
          已重试 {state.retryCount}/{maxRetries} 次
        </Text>
      </View>
    );
  }

  return <View style={style}>{children(handleRetry)}</View>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing[6] },
  errorText: {
    ...Typography.body.md,
    color: Colors.neutral[600],
    textAlign: "center",
    marginTop: Spacing[4],
    marginBottom: Spacing[4],
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[2],
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[3],
    borderRadius: BorderRadius.xl,
    elevation: 3,
  },
  retryButtonText: { ...Typography.styles.button, color: Colors.neutral[0] },
  retryInfo: { ...Typography.caption.sm, color: Colors.neutral[400], marginTop: Spacing[2] },
});

export default RetryWrapper;
