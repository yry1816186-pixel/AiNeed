/* eslint-disable @typescript-eslint/no-explicit-any */
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Queue, Job } from 'bullmq';

import { RedisService , REDIS_KEY_PREFIX, REDIS_KEY_SEPARATOR } from "../../../common/redis/redis.service";


import { QueueName } from './queue-config';

export interface QueueMetrics {
  queueName: string;
  active: number;
  waiting: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

export interface DeadLetterJob {
  jobId: string;
  queueName: string;
  data: Record<string, unknown>;
  failedReason: string;
  attemptsMade: number;
  movedAt: string;
}

const MONITOR_INTERVAL_MS = 30_000;
const METRICS_KEY = `${REDIS_KEY_PREFIX}${REDIS_KEY_SEPARATOR}queue_metrics`;

@Injectable()
export class QueueMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueMonitorService.name);
  private monitorInterval: NodeJS.Timeout | null = null;

  constructor(
    @InjectQueue(QueueName.BODY_ANALYSIS) private bodyAnalysisQueue: Queue,
    @InjectQueue(QueueName.PHOTO_PROCESSING) private photoProcessingQueue: Queue,
    @InjectQueue(QueueName.AI_GENERATION) private aiGenerationQueue: Queue,
    @InjectQueue(QueueName.NOTIFICATION) private notificationQueue: Queue,
    @InjectQueue(QueueName.DATA_EXPORT) private dataExportQueue: Queue,
    @InjectQueue(QueueName.VIRTUAL_TRYON) private virtualTryonQueue: Queue,
    @InjectQueue(QueueName.STYLE_ANALYSIS) private styleAnalysisQueue: Queue,
    @InjectQueue(QueueName.WARDROBE_MATCH) private wardrobeMatchQueue: Queue,
    private redisService: RedisService,
  ) {}

  onModuleInit() {
    this.monitorInterval = setInterval(() => {
      this.collectMetrics().catch((err) => {
        this.logger.error(`Failed to collect metrics: ${err.message}`);
      });
    }, MONITOR_INTERVAL_MS);
    this.logger.log('Queue monitor started with 30s interval');
  }

  onModuleDestroy() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.logger.log('Queue monitor stopped');
  }

  async getQueueMetrics(queueName: string): Promise<QueueMetrics> {
    const queue = this.getAllQueues().find((q) => q.name === queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const counts = await queue.getJobCounts('active', 'waiting', 'completed', 'failed', 'delayed', 'paused');
    return {
      queueName,
      active: counts.active ?? 0,
      waiting: counts.waiting ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
      delayed: counts.delayed ?? 0,
      paused: counts.paused ?? 0,
    };
  }

  async getAllMetrics(): Promise<Record<string, QueueMetrics>> {
    const result: Record<string, QueueMetrics> = {};
    const queues = this.getAllQueues();

    await Promise.all(
      queues.map(async (queue) => {
        const metrics = await this.getQueueMetrics(queue.name);
        result[queue.name] = metrics;
      }),
    );

    return result;
  }

  async getFailedJobs(queueName: string, limit: number = 20): Promise<Job[]> {
    const queue = this.getAllQueues().find((q) => q.name === queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }
    return queue.getFailed(0, limit);
  }

  async retryFailedJobs(queueName: string): Promise<number> {
    const queue = this.getAllQueues().find((q) => q.name === queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const failedJobs = await queue.getFailed();
    let retriedCount = 0;

    for (const job of failedJobs) {
      try {
        await job.retry();
        retriedCount++;
      } catch (err) {
        this.logger.warn(`Failed to retry job ${job.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    this.logger.log(`Retried ${retriedCount}/${failedJobs.length} failed jobs in queue ${queueName}`);
    return retriedCount;
  }

  async moveToDeadLetterQueue(queueName: string, jobId: string): Promise<void> {
    const queue = this.getAllQueues().find((q) => q.name === queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId} in queue ${queueName}`);
    }

    const dlqKey = `${REDIS_KEY_PREFIX}${REDIS_KEY_SEPARATOR}dlq${REDIS_KEY_SEPARATOR}${queueName}`;
    const deadLetterEntry = JSON.stringify({
      data: job.data,
      failedReason: job.failedReason ?? 'Unknown',
      attemptsMade: job.attemptsMade,
      timestamp: new Date().toISOString(),
    });

    await this.redisService.hset(dlqKey, jobId, deadLetterEntry);
    await job.remove();

    this.logger.warn(`Job ${jobId} moved to dead letter queue for ${queueName}`);
  }

  async getDeadLetterJobs(queueName: string): Promise<DeadLetterJob[]> {
    const dlqKey = `${REDIS_KEY_PREFIX}${REDIS_KEY_SEPARATOR}dlq${REDIS_KEY_SEPARATOR}${queueName}`;
    const entries = await this.redisService.hgetall(dlqKey);

    return Object.entries(entries).map(([jobId, value]) => {
      const parsed = JSON.parse(value);
      return {
        jobId,
        queueName,
        data: parsed.data,
        failedReason: parsed.failedReason,
        attemptsMade: parsed.attemptsMade,
        movedAt: parsed.timestamp,
      };
    });
  }

  async collectMetrics(): Promise<void> {
    const queues = this.getAllQueues();
    const client = this.redisService.getClient();

    for (const queue of queues) {
      try {
        const counts = await queue.getJobCounts('active', 'waiting', 'completed', 'failed', 'delayed', 'paused');
        const statusFields = ['active', 'waiting', 'completed', 'failed', 'delayed', 'paused'] as const;

        for (const status of statusFields) {
          const field = `${queue.name}:${status}`;
          await client.hset(METRICS_KEY, field, String(counts[status]));
        }

        this.logger.debug(
          `Queue ${queue.name}: active=${counts.active} waiting=${counts.waiting} failed=${counts.failed} delayed=${counts.delayed}`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to collect metrics for queue ${queue.name}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  async getPrometheusMetrics(): Promise<string> {
    const queues = this.getAllQueues();
    const lines: string[] = [];

    lines.push('# HELP queue_jobs_total Total number of jobs by status');
    lines.push('# TYPE queue_jobs_total gauge');

    for (const queue of queues) {
      try {
        const counts = await queue.getJobCounts('active', 'waiting', 'completed', 'failed', 'delayed', 'paused');
        const statuses: (keyof typeof counts)[] = ['active', 'waiting', 'completed', 'failed', 'delayed', 'paused'];

        for (const status of statuses) {
          lines.push(`queue_jobs_total{queue="${queue.name}",status="${status}"} ${counts[status]}`);
        }
      } catch (err) {
        this.logger.error(
          `Failed to get metrics for queue ${queue.name}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return lines.join('\n') + '\n';
  }

  private getAllQueues(): Queue[] {
    return [
      this.bodyAnalysisQueue,
      this.photoProcessingQueue,
      this.aiGenerationQueue,
      this.notificationQueue,
      this.dataExportQueue,
      this.virtualTryonQueue,
      this.styleAnalysisQueue,
      this.wardrobeMatchQueue,
    ];
  }
}
