import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { Queue, Worker, Job } from "bullmq";

import { ProductSyncService, SyncResult } from "../services/product-sync.service";

// ==================== Constants ====================

export const SYNC_QUEUE = "product_sync";

export enum SyncJobType {
  FULL = "full_sync",
  INCREMENTAL = "incremental_sync",
  HOT_ITEMS = "hot_items_sync",
}

interface SyncJobData {
  type: SyncJobType;
  scheduledAt: string;
  since?: string; // ISO date string for incremental sync
}

// ==================== Service ====================

@Injectable()
export class SyncSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SyncSchedulerService.name);
  private worker: Worker | null = null;
  private lastSyncTime: Date = new Date();
  private readonly timers: NodeJS.Timeout[] = [];

  constructor(
    @InjectQueue(SYNC_QUEUE) private syncQueue: Queue,
    private readonly productSync: ProductSyncService
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log("Sync scheduler initializing...");

    // Start BullMQ worker for processing sync jobs
    this.startWorker();

    // Schedule recurring jobs
    this.scheduleRecurringJobs();

    this.logger.log(
      "Sync scheduler initialized: daily full (3 AM), hourly incremental, 15-min hot items"
    );
  }

  async onModuleDestroy(): Promise<void> {
    // Clear all timers
    for (const timer of this.timers) {
      clearInterval(timer);
    }
    this.timers.length = 0;

    // Close worker
    if (this.worker) {
      await this.worker.close();
    }

    this.logger.log("Sync scheduler destroyed");
  }

  // ==================== Job Scheduling ====================

  /**
   * Schedule recurring sync jobs using setInterval (cron-like behavior).
   * BullMQ repeatable jobs require Redis-based scheduling, but we use
   * setInterval for simplicity and reliability within the NestJS lifecycle.
   */
  private scheduleRecurringJobs(): void {
    // Daily full sync at 3 AM
    // Calculate ms until next 3 AM, then set 24h interval
    this.scheduleDaily("0 3 * * *", () => this.enqueueFullSync());

    // Hourly incremental sync
    this.scheduleHourly("0 * * * *", () => this.enqueueIncrementalSync());

    // Hot item refresh every 15 minutes
    this.scheduleEvery15Min("*/15 * * * *", () => this.enqueueHotItemsSync());
  }

  /**
   * Schedule daily job at 3 AM
   */
  private scheduleDaily(_cron: string, callback: () => void): void {
    const now = new Date();
    const target = new Date(now);
    target.setHours(3, 0, 0, 0);

    // If 3 AM has already passed today, schedule for tomorrow
    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }

    const delayMs = target.getTime() - now.getTime();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    // First execution at next 3 AM
    setTimeout(() => {
      callback();
      // Then every 24 hours
      const timer = setInterval(callback, ONE_DAY_MS);
      this.timers.push(timer);
    }, delayMs);

    this.logger.log(`Daily full sync scheduled: next run at ${target.toISOString()}`);
  }

  /**
   * Schedule hourly job
   */
  private scheduleHourly(_cron: string, callback: () => void): void {
    const now = new Date();
    const target = new Date(now);
    target.setMinutes(0, 0, 0);

    // If the top of the hour has passed, schedule for next hour
    if (target.getTime() <= now.getTime()) {
      target.setHours(target.getHours() + 1);
    }

    const delayMs = target.getTime() - now.getTime();
    const ONE_HOUR_MS = 60 * 60 * 1000;

    setTimeout(() => {
      callback();
      const timer = setInterval(callback, ONE_HOUR_MS);
      this.timers.push(timer);
    }, delayMs);

    this.logger.log(`Hourly incremental sync scheduled: next run at ${target.toISOString()}`);
  }

  /**
   * Schedule job every 15 minutes
   */
  private scheduleEvery15Min(_cron: string, callback: () => void): void {
    const now = new Date();
    const minutes = now.getMinutes();
    const nextQuarter = Math.ceil((minutes + 1) / 15) * 15;
    const target = new Date(now);
    target.setMinutes(nextQuarter, 0, 0);

    if (target.getTime() <= now.getTime()) {
      target.setHours(target.getHours() + 1);
      target.setMinutes(0, 0, 0);
    }

    const delayMs = target.getTime() - now.getTime();
    const FIFTEEN_MIN_MS = 15 * 60 * 1000;

    setTimeout(() => {
      callback();
      const timer = setInterval(callback, FIFTEEN_MIN_MS);
      this.timers.push(timer);
    }, delayMs);

    this.logger.log(`15-min hot items sync scheduled: next run at ${target.toISOString()}`);
  }

  // ==================== Job Enqueuing ====================

  /**
   * Enqueue a full sync job to BullMQ
   */
  async enqueueFullSync(): Promise<void> {
    try {
      const job: SyncJobData = {
        type: SyncJobType.FULL,
        scheduledAt: new Date().toISOString(),
      };

      await this.syncQueue.add(SyncJobType.FULL, job, {
        jobId: `full_sync_${Date.now()}`,
        attempts: 3,
        backoff: { type: "fixed", delay: 5 * 60 * 1000 }, // 5-minute backoff
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      });

      this.logger.log("Full sync job enqueued");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to enqueue full sync: ${errorMessage}`);
    }
  }

  /**
   * Enqueue an incremental sync job to BullMQ
   */
  async enqueueIncrementalSync(): Promise<void> {
    try {
      const job: SyncJobData = {
        type: SyncJobType.INCREMENTAL,
        scheduledAt: new Date().toISOString(),
        since: this.lastSyncTime.toISOString(),
      };

      await this.syncQueue.add(SyncJobType.INCREMENTAL, job, {
        jobId: `incremental_sync_${Date.now()}`,
        attempts: 3,
        backoff: { type: "fixed", delay: 5 * 60 * 1000 },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 100 },
      });

      this.logger.log("Incremental sync job enqueued");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to enqueue incremental sync: ${errorMessage}`);
    }
  }

  /**
   * Enqueue a hot items sync job to BullMQ
   */
  async enqueueHotItemsSync(): Promise<void> {
    try {
      const job: SyncJobData = {
        type: SyncJobType.HOT_ITEMS,
        scheduledAt: new Date().toISOString(),
      };

      await this.syncQueue.add(SyncJobType.HOT_ITEMS, job, {
        jobId: `hot_items_sync_${Date.now()}`,
        attempts: 3,
        backoff: { type: "fixed", delay: 5 * 60 * 1000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 200 },
      });

      this.logger.log("Hot items sync job enqueued");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to enqueue hot items sync: ${errorMessage}`);
    }
  }

  // ==================== Job Processing ====================

  /**
   * Start BullMQ worker to process sync jobs
   */
  private startWorker(): void {
    this.worker = new Worker(
      SYNC_QUEUE,
      async (job: Job<SyncJobData>) => {
        this.logger.log(`Processing sync job: ${job.data.type} (id: ${job.id})`);

        switch (job.data.type) {
          case SyncJobType.FULL: {
            const result = await this.productSync.syncFull();
            this.logger.log(`Full sync completed: ${JSON.stringify(result)}`);
            return result;
          }
          case SyncJobType.INCREMENTAL: {
            const since = job.data.since ? new Date(job.data.since) : this.lastSyncTime;
            const result = await this.productSync.syncIncremental(since);
            this.lastSyncTime = new Date();
            this.logger.log(`Incremental sync completed: ${JSON.stringify(result)}`);
            return result;
          }
          case SyncJobType.HOT_ITEMS: {
            const result = await this.productSync.syncHotItems();
            this.logger.log(`Hot items sync completed: ${JSON.stringify(result)}`);
            return result;
          }
          default:
            throw new Error(`Unknown sync job type: ${job.data.type}`);
        }
      },
      {
        concurrency: 1, // Process one sync job at a time
        limiter: {
          max: 1,
          duration: 1000,
        },
        connection: {},
      }
    );

    // Job success handler
    this.worker.on("completed", (job: Job, result: SyncResult) => {
      this.logger.log(
        `Sync job completed: ${job.data.type} (id: ${job.id}) — ` +
          `added=${result.added}, updated=${result.updated}, ` +
          `skipped=${result.skipped}, embedded=${result.embedded}`
      );
    });

    // Job failure handler
    this.worker.on("failed", (job: Job | undefined, error: Error) => {
      if (job) {
        this.logger.error(
          `Sync job failed: ${job.data.type} (id: ${job.id}, attempt ${job.attemptsMade}) — ` +
            `${error.message}`
        );
      }
    });
  }

  // ==================== Manual Trigger ====================

  /**
   * Manually trigger a full sync (for admin/testing)
   */
  async triggerFullSync(): Promise<string> {
    await this.enqueueFullSync();
    return "Full sync job enqueued";
  }

  /**
   * Manually trigger an incremental sync
   */
  async triggerIncrementalSync(): Promise<string> {
    await this.enqueueIncrementalSync();
    return "Incremental sync job enqueued";
  }

  /**
   * Manually trigger a hot items sync
   */
  async triggerHotItemsSync(): Promise<string> {
    await this.enqueueHotItemsSync();
    return "Hot items sync job enqueued";
  }

  /**
   * Get current scheduler status
   */
  async getStatus(): Promise<{
    lastSyncTime: string;
    queueStats: Record<string, unknown>;
  }> {
    const [waiting, active, completed, failed] = await Promise.all([
      this.syncQueue.getWaiting(),
      this.syncQueue.getActive(),
      this.syncQueue.getCompleted(),
      this.syncQueue.getFailed(),
    ]);

    return {
      lastSyncTime: this.lastSyncTime.toISOString(),
      queueStats: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
      },
    };
  }
}
