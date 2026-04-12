import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';

interface HapticActions {
  lightImpact: () => void;
  mediumImpact: () => void;
  heavyImpact: () => void;
  notificationSuccess: () => void;
  notificationError: () => void;
}

/**
 * useHaptic - 触觉反馈 Hook
 * 用于按钮点击、操作反馈等场景，提供不同强度的触觉反馈
 * 依赖 expo-haptics（需安装：npx expo install expo-haptics）
 *
 * @returns  不同强度和类型的触觉反馈方法
 */
export function useHaptic(): HapticActions {
  const lightImpact = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const mediumImpact = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const heavyImpact = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, []);

  const notificationSuccess = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const notificationError = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, []);

  return {
    lightImpact,
    mediumImpact,
    heavyImpact,
    notificationSuccess,
    notificationError,
  };
}
