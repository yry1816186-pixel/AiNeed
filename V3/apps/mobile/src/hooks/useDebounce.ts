import { useState, useEffect } from 'react';

/**
 * useDebounce - 防抖值 Hook
 * 用于搜索输入等场景，延迟更新值直到用户停止输入
 *
 * @param value  需要防抖的原始值
 * @param delay  延迟毫秒数
 * @returns      防抖后的值
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
