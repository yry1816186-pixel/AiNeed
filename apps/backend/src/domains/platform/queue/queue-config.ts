import { QueueOptions } from 'bullmq';

export enum QueueName {
  BODY_ANALYSIS = 'body_analysis',
  PHOTO_PROCESSING = 'photo_processing',
  AI_GENERATION = 'ai_generation',
  NOTIFICATION = 'notification',
  DATA_EXPORT = 'data_export',
  AI_TASKS = 'ai_tasks',
  STYLE_ANALYSIS = 'style_analysis',
  VIRTUAL_TRYON = 'virtual_tryon',
  WARDROBE_MATCH = 'wardrobe_match',
  CONTENT_MODERATION = 'content_moderation',
}

export interface QueueConfigOptions {
  concurrency: number;
  attempts: number;
  backoff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
  removeOnComplete?: {
    count: number;
    age: number;
  };
  removeOnFail?: {
    count: number;
    age: number;
  };
  timeout?: number;
  priority?: boolean;
  limiter?: {
    max: number;
    duration: number;
  };
}

export const USER_TIER_PRIORITY = {
  free: 10,
  basic: 5,
  premium: 1,
} as const;

export function getJobPriority(userTier: string): number {
  return USER_TIER_PRIORITY[userTier as keyof typeof USER_TIER_PRIORITY] ?? USER_TIER_PRIORITY.free;
}

export const QUEUE_CONFIGS: Record<QueueName, QueueConfigOptions> = {
  [QueueName.BODY_ANALYSIS]: {
    concurrency: 3,
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 100, age: 86400 },
    removeOnFail: { count: 50, age: 604800 },
    timeout: 120000,
  },
  [QueueName.PHOTO_PROCESSING]: {
    concurrency: 5,
    attempts: 2,
    backoff: { type: 'fixed', delay: 1000 },
    removeOnComplete: { count: 200, age: 86400 },
    removeOnFail: { count: 100, age: 604800 },
    timeout: 60000,
  },
  [QueueName.AI_GENERATION]: {
    concurrency: 2,
    attempts: 2,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: { count: 100, age: 86400 },
    removeOnFail: { count: 50, age: 604800 },
    timeout: 300000,
    priority: true,
  },
  [QueueName.NOTIFICATION]: {
    concurrency: 10,
    attempts: 1,
    backoff: { type: 'fixed', delay: 500 },
    removeOnComplete: { count: 500, age: 3600 },
    removeOnFail: { count: 200, age: 86400 },
    timeout: 10000,
  },
  [QueueName.DATA_EXPORT]: {
    concurrency: 1,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 50, age: 86400 },
    removeOnFail: { count: 50, age: 604800 },
    timeout: 600000,
  },
  [QueueName.AI_TASKS]: {
    concurrency: 3,
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { count: 100, age: 86400 },
    removeOnFail: { count: 50, age: 604800 },
    timeout: 300000,
  },
  [QueueName.STYLE_ANALYSIS]: {
    concurrency: 2,
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { count: 100, age: 86400 },
    removeOnFail: { count: 50, age: 604800 },
    timeout: 60000,
  },
  [QueueName.VIRTUAL_TRYON]: {
    concurrency: 1,
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { count: 100, age: 86400 },
    removeOnFail: { count: 50, age: 604800 },
    timeout: 180000,
  },
  [QueueName.WARDROBE_MATCH]: {
    concurrency: 3,
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { count: 100, age: 86400 },
    removeOnFail: { count: 50, age: 604800 },
    timeout: 30000,
  },
  [QueueName.CONTENT_MODERATION]: {
    concurrency: 5,
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { count: 200, age: 86400 },
    removeOnFail: { count: 100, age: 604800 },
    timeout: 30000,
  },
};

export function getQueueConfig(name: QueueName): QueueConfigOptions {
  return QUEUE_CONFIGS[name];
}

export function getBullMQOptions(name: QueueName): Omit<QueueOptions, 'connection'> {
  const config = QUEUE_CONFIGS[name];
  return {
    defaultJobOptions: {
      attempts: config.attempts,
      backoff: config.backoff
        ? { type: config.backoff.type, delay: config.backoff.delay }
        : undefined,
      removeOnComplete: config.removeOnComplete,
      removeOnFail: config.removeOnFail,
      ...(config.timeout ? { timeout: config.timeout } : {}),
    },
    ...(config.limiter ? { limiter: config.limiter } : {}),
  };
}
