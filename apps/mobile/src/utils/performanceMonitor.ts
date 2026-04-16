import { useEffect, useRef, useCallback, useState } from "react";
import { InteractionManager } from "react-native";

interface FrameTiming {
  frameCount: number;
  totalDuration: number;
  averageFPS: number;
  minFPS: number;
  maxFPS: number;
  droppedFrames: number;
  droppedFramePercentage: number;
}

interface PerformanceConfig {
  targetFPS: number;
  warningThreshold: number;
  criticalThreshold: number;
  sampleSize: number;
  enableLogging: boolean;
}

const DEFAULT_CONFIG: PerformanceConfig = {
  targetFPS: 60,
  warningThreshold: 45,
  criticalThreshold: 30,
  sampleSize: 60,
  enableLogging: __DEV__,
};

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private frameTimings: number[] = [];
  private lastFrameTime: number = 0;
  private isMonitoring: boolean = false;
  private animationFrameId: number | null = null;
  private config: PerformanceConfig;
  private listeners: Set<(metrics: FrameTiming) => void> = new Set();
  private droppedFrameCount: number = 0;

  private constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  static getInstance(config?: Partial<PerformanceConfig>): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor(config);
    }
    return PerformanceMonitor.instance;
  }

  start() {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.frameTimings = [];
    this.lastFrameTime = performance.now();
    this.droppedFrameCount = 0;

    this.scheduleNextFrame();

    if (this.config.enableLogging) {
      console.log("[PerformanceMonitor] Started monitoring");
    }
  }

  stop() {
    this.isMonitoring = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.config.enableLogging) {
      console.log("[PerformanceMonitor] Stopped monitoring");
    }
  }

  private scheduleNextFrame() {
    if (!this.isMonitoring) {
      return;
    }

    this.animationFrameId = requestAnimationFrame((timestamp) => {
      this.recordFrame(timestamp);
      this.scheduleNextFrame();
    });
  }

  private recordFrame(timestamp: number) {
    const frameDuration = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;

    if (frameDuration <= 0) {
      return;
    }

    const fps = 1000 / frameDuration;

    this.frameTimings.push(fps);

    if (this.frameTimings.length > this.config.sampleSize) {
      this.frameTimings.shift();
    }

    if (fps < this.config.criticalThreshold) {
      this.droppedFrameCount++;

      if (this.config.enableLogging) {
        console.warn(`[PerformanceMonitor] Dropped frame detected: ${fps.toFixed(1)} FPS`);
      }
    }

    if (this.frameTimings.length >= this.config.sampleSize) {
      this.notifyListeners();
    }
  }

  private notifyListeners() {
    const metrics = this.getMetrics();
    this.listeners.forEach((listener) => listener(metrics));
  }

  getMetrics(): FrameTiming {
    const frameCount = this.frameTimings.length;

    if (frameCount === 0) {
      return {
        frameCount: 0,
        totalDuration: 0,
        averageFPS: 0,
        minFPS: 0,
        maxFPS: 0,
        droppedFrames: 0,
        droppedFramePercentage: 0,
      };
    }

    const sum = this.frameTimings.reduce((a, b) => a + b, 0);
    const averageFPS = sum / frameCount;
    const minFPS = Math.min(...this.frameTimings);
    const maxFPS = Math.max(...this.frameTimings);
    const totalDuration = frameCount * (1000 / averageFPS);

    return {
      frameCount,
      totalDuration,
      averageFPS,
      minFPS,
      maxFPS,
      droppedFrames: this.droppedFrameCount,
      droppedFramePercentage: (this.droppedFrameCount / frameCount) * 100,
    };
  }

  subscribe(listener: (metrics: FrameTiming) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  updateConfig(config: Partial<PerformanceConfig>) {
    this.config = { ...this.config, ...config };
  }

  isRunning(): boolean {
    return this.isMonitoring;
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();

export interface UsePerformanceMonitorOptions {
  autoStart?: boolean;
  onWarning?: (metrics: FrameTiming) => void;
  onCritical?: (metrics: FrameTiming) => void;
  config?: Partial<PerformanceConfig>;
}

export function usePerformanceMonitor(options: UsePerformanceMonitorOptions = {}) {
  const { autoStart = true, onWarning, onCritical, config } = options;
  const [metrics, setMetrics] = useState<FrameTiming | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (config) {
      performanceMonitor.updateConfig(config);
    }
  }, [config]);

  useEffect(() => {
    const unsubscribe = performanceMonitor.subscribe((newMetrics) => {
      setMetrics(newMetrics);

      if (newMetrics.averageFPS < (config?.criticalThreshold || 30)) {
        onCritical?.(newMetrics);
      } else if (newMetrics.averageFPS < (config?.warningThreshold || 45)) {
        onWarning?.(newMetrics);
      }
    });

    return unsubscribe;
  }, [onWarning, onCritical, config]);

  useEffect(() => {
    if (autoStart) {
      performanceMonitor.start();
      setIsRunning(true);
    }

    return () => {
      performanceMonitor.stop();
      setIsRunning(false);
    };
  }, [autoStart]);

  const start = useCallback(() => {
    performanceMonitor.start();
    setIsRunning(true);
  }, []);

  const stop = useCallback(() => {
    performanceMonitor.stop();
    setIsRunning(false);
  }, []);

  return {
    metrics,
    isRunning,
    start,
    stop,
  };
}

export interface AnimationProfilerResult {
  startProfiling: () => void;
  stopProfiling: () => FrameTiming | null;
  isProfiling: boolean;
  metrics: FrameTiming | null;
}

export function useAnimationProfiler(): AnimationProfilerResult {
  const [isProfiling, setIsProfiling] = useState(false);
  const [metrics, setMetrics] = useState<FrameTiming | null>(null);

  const startProfiling = useCallback(() => {
    setIsProfiling(true);
    performanceMonitor.start();
  }, []);

  const stopProfiling = useCallback(() => {
    const finalMetrics = performanceMonitor.getMetrics();
    performanceMonitor.stop();
    setIsProfiling(false);
    setMetrics(finalMetrics);
    return finalMetrics;
  }, []);

  return {
    startProfiling,
    stopProfiling,
    isProfiling,
    metrics,
  };
}

export function useInteractionManager() {
  const [isInteracting, setIsInteracting] = useState(false);
  const handleRef = useRef<number | null>(null);

  const startInteraction = useCallback(() => {
    setIsInteracting(true);
    handleRef.current = InteractionManager.createInteractionHandle();
  }, []);

  const endInteraction = useCallback(() => {
    if (handleRef.current !== null) {
      InteractionManager.clearInteractionHandle(handleRef.current);
      handleRef.current = null;
    }
    setIsInteracting(false);
  }, []);

  useEffect(() => {
    return () => {
      if (handleRef.current !== null) {
        InteractionManager.clearInteractionHandle(handleRef.current);
      }
    };
  }, []);

  return {
    isInteracting,
    startInteraction,
    endInteraction,
  };
}

export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

export function useThrottledCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const lastRunRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastRun = now - lastRunRef.current;

      if (timeSinceLastRun >= delay) {
        lastRunRef.current = now;
        callback(...args);
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          lastRunRef.current = Date.now();
          callback(...args);
        }, delay - timeSinceLastRun);
      }
    },
    [callback, delay]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledCallback;
}

export function logPerformanceMetrics(metrics: FrameTiming, label?: string) {
  const prefix = label ? `[${label}]` : "[Performance]";

  if (__DEV__) {
    console.log(
      `${prefix} FPS: ${metrics.averageFPS.toFixed(1)} ` +
        `(min: ${metrics.minFPS.toFixed(1)}, max: ${metrics.maxFPS.toFixed(1)})`
    );
  }

  if (metrics.droppedFrames > 0) {
    console.warn(
      `${prefix} Dropped frames: ${metrics.droppedFrames} ` +
        `(${metrics.droppedFramePercentage.toFixed(1)}%)`
    );
  }
}

export function measureRenderTime<T>(name: string, renderFunction: () => T): T {
  const startTime = performance.now();
  const result = renderFunction();
  const endTime = performance.now();

  if (__DEV__) {
    console.log(`[RenderTime] ${name}: ${(endTime - startTime).toFixed(2)}ms`);
  }

  return result;
}
