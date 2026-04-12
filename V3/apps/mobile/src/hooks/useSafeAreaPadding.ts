import { useMemo } from 'react';
import {
  useSafeAreaInsets,
  type EdgeInsets,
} from 'react-native-safe-area-context';

interface SafeAreaPadding {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * useSafeAreaPadding - 安全区域 padding Hook
 * 用于需要避开刘海/底部横条等安全区域的布局场景
 * 依赖 react-native-safe-area-context（项目已安装）
 *
 * @returns  四个方向的安全区域 padding 值
 */
export function useSafeAreaPadding(): SafeAreaPadding {
  const insets: EdgeInsets = useSafeAreaInsets();

  return useMemo(
    () => ({
      top: insets.top,
      bottom: insets.bottom,
      left: insets.left,
      right: insets.right,
    }),
    [insets.top, insets.bottom, insets.left, insets.right],
  );
}
