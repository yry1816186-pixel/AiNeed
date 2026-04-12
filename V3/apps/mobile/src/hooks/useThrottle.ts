import { useState, useEffect, useRef } from 'react';

/**
 * useThrottle - 节流值 Hook
 * 用于滚动事件等高频更新场景，在指定间隔内只更新一次值
 *
 * @param value     需要节流的原始值
 * @param interval  节流间隔毫秒数
 * @returns         节流后的值
 */
export function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastExecuted = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    const elapsed = now - lastExecuted.current;

    if (elapsed >= interval) {
      lastExecuted.current = now;
      setThrottledValue(value);
    } else {
      const timer = setTimeout(() => {
        lastExecuted.current = Date.now();
        setThrottledValue(value);
      }, interval - elapsed);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [value, interval]);

  return throttledValue;
}
