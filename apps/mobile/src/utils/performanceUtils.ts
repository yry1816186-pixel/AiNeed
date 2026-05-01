/**
 * Performance measurement utilities for mobile app.
 */

declare const __DEV__: boolean;

import { logger } from "../shared/utils/logger";

export function measureFPS(callback: (fps: number) => void, durationMs = 1000): () => void {
  let running = true;
  let frameCount = 0;
  let lastTime = performance.now();

  const tick = () => {
    if (!running) {
      return;
    }
    frameCount++;
    const now = performance.now();
    if (now - lastTime >= durationMs) {
      const fps = Math.round((frameCount / (now - lastTime)) * 1000);
      callback(fps);
      frameCount = 0;
      lastTime = now;
    }
    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
  return () => {
    running = false;
  };
}

export function now(): number {
  return performance.now();
}

export function measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  return fn().finally(() => {
    const duration = performance.now() - start;
    if (__DEV__) {
      logger.debug(`[Perf] ${label}: ${duration.toFixed(2)}ms`);
    }
  });
}

let _isLowEndDevice: boolean | null = null;

export function isLowEndDevice(): boolean {
  if (_isLowEndDevice !== null) {
    return _isLowEndDevice;
  }
  // Rough heuristic: memory < 3GB or core count <= 2
  if (typeof globalThis !== "undefined" && "navigator" in globalThis) {
    const nav = (globalThis as unknown as { navigator: Record<string, unknown> }).navigator;
    if ("deviceMemory" in nav) {
      _isLowEndDevice = (nav.deviceMemory as number) < 3;
      return _isLowEndDevice;
    }
    if ("hardwareConcurrency" in nav) {
      _isLowEndDevice = (nav.hardwareConcurrency as number) <= 2;
      return _isLowEndDevice;
    }
  }
  _isLowEndDevice = false;
  return _isLowEndDevice;
}
