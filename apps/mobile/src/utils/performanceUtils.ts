/**
 * 性能优化工具集
 * 
 * 包含：
 * - 导航预加载
 * - 图片预加载
 * - 组件懒加载
 * - 性能监控
 */

import { InteractionManager } from 'react-native';
import FastImage from 'react-native-fast-image';

/**
 * 预加载图片列表
 * 使用 FastImage 的预缓存功能
 * 
 * @param urls 图片 URL 列表
 */
export function preloadImages(urls: string[]): void {
  const sources = urls.map((uri) => ({ uri }));
  // @ts-expect-error - FastImage.preload 可能不存在于某些版本
  FastImage.preload(sources);
}

/**
 * 在交互完成后执行任务
 * 用于延迟非关键操作，避免阻塞用户交互
 * 
 * @param task 要执行的任务
 * @param delay 延迟时间（毫秒）
 */
export function runAfterInteractions<T>(
  task: () => T,
  delay: number = 0
): Promise<T | null> {
  return new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      if (delay > 0) {
        setTimeout(() => {
          resolve(task());
        }, delay);
      } else {
        resolve(task());
      }
    });
  });
}

/**
 * 延迟加载组件
 * 返回一个 Promise，在指定延迟后 resolve
 * 
 * @param delay 延迟时间（毫秒）
 */
export function delayLoad(delay: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}

/**
 * 批量执行任务
 * 将任务分批执行，避免一次性执行过多任务导致卡顿
 * 
 * @param tasks 任务列表
 * @param batchSize 每批执行的任务数量
 * @param batchDelay 批次之间的延迟（毫秒）
 */
export async function batchExecute<T>(
  tasks: (() => T)[],
  batchSize: number = 5,
  batchDelay: number = 100
): Promise<T[]> {
  const results: T[] = [];
  
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map((task) => task()));
    results.push(...batchResults);
    
    if (i + batchSize < tasks.length) {
      await delayLoad(batchDelay);
    }
  }
  
  return results;
}

/**
 * 性能计时器
 * 用于测量代码执行时间
 */
export class PerformanceTimer {
  private startTime: number;
  private name: string;

  constructor(name: string) {
    this.name = name;
    this.startTime = Date.now();
  }

  /**
   * 结束计时并输出结果
   */
  end(): number {
    const duration = Date.now() - this.startTime;
    if (__DEV__) {
      console.log(`[Performance] ${this.name}: ${duration}ms`);
    }
    return duration;
  }
}

/**
 * 节流函数
 * 限制函数调用频率
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * 防抖函数
 * 延迟执行函数，在频繁调用时只执行最后一次
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function (this: any, ...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
}

/**
 * 内存缓存
 * 用于缓存计算结果，避免重复计算
 */
export class MemoryCache<T> {
  private cache: Map<string, { value: T; timestamp: number }> = new Map();
  private ttl: number;

  constructor(ttl: number = 5 * 60 * 1000) {
    this.ttl = ttl; // 默认 5 分钟
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }
    
    return item.value;
  }

  set(key: string, value: T): void {
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * 创建单例缓存实例
 */
export const imageCache = new MemoryCache<string>(10 * 60 * 1000); // 10 分钟
export const apiCache = new MemoryCache<any>(5 * 60 * 1000); // 5 分钟
