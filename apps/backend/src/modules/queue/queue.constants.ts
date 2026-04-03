/**
 * Queue Module Constants
 * Defines queue names, job types, and configuration
 */

export const QUEUE_NAMES = {
  AI_TASKS: 'ai_tasks',
  STYLE_ANALYSIS: 'style_analysis',
  VIRTUAL_TRYON: 'virtual_tryon',
  WARDROBE_MATCH: 'wardrobe_match',
} as const;

export const JOB_TYPES = {
  STYLE_ANALYSIS: 'style_analysis',
  VIRTUAL_TRYON: 'virtual_tryon',
  WARDROBE_MATCH: 'wardrobe_match',
  IMAGE_ANALYSIS: 'image_analysis',
  BODY_ANALYSIS: 'body_analysis',
  RECOMMENDATION: 'recommendation',
} as const;

export const JOB_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  TIMEOUT: 'timeout',
} as const;

export const QUEUE_CONFIG = {
  DEFAULT_JOB_OPTIONS: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
    timeout: 300000, // 5 minutes default timeout
  },
  STYLE_ANALYSIS_TIMEOUT: 60000, // 1 minute
  VIRTUAL_TRYON_TIMEOUT: 180000, // 3 minutes
  WARDROBE_MATCH_TIMEOUT: 30000, // 30 seconds
} as const;

export type JobType = (typeof JOB_TYPES)[keyof typeof JOB_TYPES];
export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];
