import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { RedisService } from "../../../common/redis/redis.service";

export interface CloudTask {
  taskId: string;
  type: "tryon" | "segmentation" | "recommendation" | "compatibility";
  payload: Record<string, unknown>;
  priority: "low" | "normal" | "high" | "urgent";
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  retryCount: number;
  maxRetries: number;
  result?: unknown;
  error?: string;
}

export interface TaskProgress {
  taskId: string;
  progress: number;
  stage: string;
  estimatedTimeRemaining?: number;
}

export interface CloudConnection {
  connected: boolean;
  latency: number;
  lastHeartbeat: Date;
  serverLoad: number;
}

export interface SyncMessage {
  type:
    | "sync_request"
    | "sync_response"
    | "delta_update"
    | "conflict_resolution";
  timestamp: Date;
  deviceId: string;
  data: Record<string, unknown>;
  checksum?: string;
}

export interface CommunicationProtocol {
  version: string;
  encoding: "json" | "protobuf" | "msgpack";
  compression: boolean;
  encryption: boolean;
  timeout: number;
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
    maxDelay: number;
  };
}

@Injectable()
export class CloudCommunicationService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(CloudCommunicationService.name);

  private readonly PROTOCOL: CommunicationProtocol = {
    version: "1.0.0",
    encoding: "json",
    compression: true,
    encryption: true,
    timeout: 30000,
    retryPolicy: {
      maxRetries: 3,
      backoffMultiplier: 2,
      initialDelay: 1000,
      maxDelay: 10000,
    },
  };

  private connectionStatus: CloudConnection = {
    connected: false,
    latency: 0,
    lastHeartbeat: new Date(),
    serverLoad: 0,
  };

  private taskQueue: Map<string, CloudTask> = new Map();
  private pendingCallbacks: Map<
    string,
    {
      resolve: (result: unknown) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  > = new Map();

  private heartbeatInterval?: NodeJS.Timeout;
  private taskProcessorInterval?: NodeJS.Timeout;
  private readonly DEVICE_ID = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
  ) {}

  async onModuleInit() {
    this.logger.log("Initializing Cloud Communication Service");
    await this.initializeConnection();
    this.startHeartbeat();
    this.startTaskProcessor();
  }

  async onModuleDestroy() {
    this.logger.log("Destroying Cloud Communication Service");
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.taskProcessorInterval) {
      clearInterval(this.taskProcessorInterval);
    }
    await this.flushPendingTasks();
  }

  private async initializeConnection(): Promise<void> {
    this.logger.log("Establishing cloud connection...");

    try {
      const start = Date.now();
      await this.pingCloud();
      this.connectionStatus.latency = Date.now() - start;
      this.connectionStatus.connected = true;
      this.connectionStatus.lastHeartbeat = new Date();
      this.logger.log(
        `Cloud connection established. Latency: ${this.connectionStatus.latency}ms`,
      );
    } catch (error) {
      this.logger.error("Failed to establish cloud connection:", error);
      this.connectionStatus.connected = false;
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      try {
        const start = Date.now();
        await this.pingCloud();
        this.connectionStatus.latency = Date.now() - start;
        this.connectionStatus.lastHeartbeat = new Date();
        this.connectionStatus.connected = true;
      } catch (error) {
        this.logger.warn("Heartbeat failed:", error);
        this.connectionStatus.connected = false;
      }
    }, 30000);
  }

  private startTaskProcessor(): void {
    this.taskProcessorInterval = setInterval(async () => {
      await this.processPendingTasks();
    }, 5000);
  }

  private async pingCloud(): Promise<void> {
    const client = this.redisService.getClient();
    const pingKey = `cloud:ping:${this.DEVICE_ID}`;
    await client.set(pingKey, Date.now().toString(), "EX", 60);
  }

  async submitTask(
    type: CloudTask["type"],
    payload: Record<string, any>,
    priority: CloudTask["priority"] = "normal",
  ): Promise<string> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const task: CloudTask = {
      taskId,
      type,
      payload,
      priority,
      status: "pending",
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: this.PROTOCOL.retryPolicy.maxRetries,
    };

    this.taskQueue.set(taskId, task);
    await this.persistTask(task);

    this.logger.log(
      `Task ${taskId} submitted: ${type} with priority ${priority}`,
    );
    return taskId;
  }

  async getTaskResult(taskId: string, timeout: number = 30000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingCallbacks.delete(taskId);
        reject(new Error(`Task ${taskId} timed out after ${timeout}ms`));
      }, timeout);

      this.pendingCallbacks.set(taskId, {
        resolve: (result) => {
          clearTimeout(timeoutHandle);
          this.pendingCallbacks.delete(taskId);
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timeoutHandle);
          this.pendingCallbacks.delete(taskId);
          reject(error);
        },
        timeout: timeoutHandle,
      });

      this.checkTaskCompletion(taskId);
    });
  }

  private async checkTaskCompletion(taskId: string): Promise<void> {
    const task = this.taskQueue.get(taskId);
    if (!task) {
      const callback = this.pendingCallbacks.get(taskId);
      if (callback) {
        callback.reject(new Error(`Task ${taskId} not found`));
      }
      return;
    }

    if (task.status === "completed") {
      const callback = this.pendingCallbacks.get(taskId);
      if (callback) {
        callback.resolve(task.result);
      }
    } else if (task.status === "failed") {
      const callback = this.pendingCallbacks.get(taskId);
      if (callback) {
        callback.reject(new Error(task.error || "Task failed"));
      }
    }
  }

  private async processPendingTasks(): Promise<void> {
    if (!this.connectionStatus.connected) {
      this.logger.debug("Cloud not connected, skipping task processing");
      return;
    }

    const pendingTasks = Array.from(this.taskQueue.values())
      .filter((t) => t.status === "pending")
      .sort(
        (a, b) =>
          this.getPriorityWeight(b.priority) -
          this.getPriorityWeight(a.priority),
      );

    for (const task of pendingTasks.slice(0, 5)) {
      await this.processTask(task);
    }
  }

  private getPriorityWeight(priority: CloudTask["priority"]): number {
    const weights = { urgent: 4, high: 3, normal: 2, low: 1 };
    return weights[priority];
  }

  private async processTask(task: CloudTask): Promise<void> {
    this.logger.log(`Processing task ${task.taskId}`);
    task.status = "processing";
    task.startedAt = new Date();
    await this.persistTask(task);

    try {
      const result = await this.executeOnCloud(task);
      task.status = "completed";
      task.completedAt = new Date();
      task.result = result;

      const callback = this.pendingCallbacks.get(task.taskId);
      if (callback) {
        callback.resolve(result);
      }
    } catch (error) {
      this.logger.error(`Task ${task.taskId} failed:`, error);
      task.retryCount++;

      if (task.retryCount >= task.maxRetries) {
        task.status = "failed";
        task.error = error instanceof Error ? error.message : String(error);

        const callback = this.pendingCallbacks.get(task.taskId);
        if (callback) {
          callback.reject(new Error(task.error));
        }
      } else {
        task.status = "pending";
        const delay = this.calculateBackoffDelay(task.retryCount);
        await this.delay(delay);
      }
    }

    await this.persistTask(task);
  }

  private calculateBackoffDelay(retryCount: number): number {
    const { initialDelay, backoffMultiplier, maxDelay } =
      this.PROTOCOL.retryPolicy;
    const delay = initialDelay * Math.pow(backoffMultiplier, retryCount - 1);
    return Math.min(delay, maxDelay);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async executeOnCloud(task: CloudTask): Promise<any> {
    const client = this.redisService.getClient();
    const taskKey = `cloud:task:${task.taskId}`;
    const resultKey = `cloud:result:${task.taskId}`;

    await client.hset(taskKey, {
      type: task.type,
      payload: JSON.stringify(task.payload),
      priority: task.priority,
      deviceId: this.DEVICE_ID,
      createdAt: task.createdAt.toISOString(),
    });
    await client.expire(taskKey, 3600);

    await client.lpush("cloud:task:queue", task.taskId);

    const startTime = Date.now();
    const timeout = this.PROTOCOL.timeout;

    while (Date.now() - startTime < timeout) {
      const resultData = await client.get(resultKey);
      if (resultData) {
        await client.del(resultKey);
        return JSON.parse(resultData);
      }
      await this.delay(500);
    }

    throw new Error("Cloud task execution timed out");
  }

  private async persistTask(task: CloudTask): Promise<void> {
    const client = this.redisService.getClient();
    const key = `local:task:${task.taskId}`;
    await client.hset(key, {
      taskId: task.taskId,
      type: task.type,
      payload: JSON.stringify(task.payload),
      priority: task.priority,
      status: task.status,
      createdAt: task.createdAt.toISOString(),
      startedAt: task.startedAt?.toISOString() || "",
      completedAt: task.completedAt?.toISOString() || "",
      retryCount: task.retryCount.toString(),
      maxRetries: task.maxRetries.toString(),
      result: task.result ? JSON.stringify(task.result) : "",
      error: task.error || "",
    });
    await client.expire(key, 86400);
  }

  async getTaskProgress(taskId: string): Promise<TaskProgress | null> {
    const task = this.taskQueue.get(taskId);
    if (!task) {return null;}

    let progress = 0;
    let stage = "pending";

    if (task.status === "processing") {
      const elapsed = Date.now() - (task.startedAt?.getTime() || Date.now());
      const estimatedTotal = 5000;
      progress = Math.min(90, (elapsed / estimatedTotal) * 100);
      stage = this.getProcessingStage(task.type, progress);
    } else if (task.status === "completed") {
      progress = 100;
      stage = "completed";
    } else if (task.status === "failed") {
      stage = "failed";
    }

    return {
      taskId,
      progress,
      stage,
      estimatedTimeRemaining:
        task.status === "processing" ? 5000 * (1 - progress / 100) : undefined,
    };
  }

  private getProcessingStage(
    type: CloudTask["type"],
    progress: number,
  ): string {
    const stages: Record<CloudTask["type"], string[]> = {
      tryon: [
        "preprocessing",
        "pose_estimation",
        "garment_warping",
        "image_synthesis",
        "postprocessing",
      ],
      segmentation: [
        "image_loading",
        "feature_extraction",
        "mask_generation",
        "refinement",
      ],
      recommendation: [
        "user_profiling",
        "item_retrieval",
        "ranking",
        "diversification",
      ],
      compatibility: [
        "feature_extraction",
        "graph_construction",
        "gnn_propagation",
        "scoring",
      ],
    };

    const typeStages = stages[type] ?? ["queued"];
    const stageIndex = Math.floor((progress / 100) * typeStages.length);
    return typeStages[Math.min(stageIndex, typeStages.length - 1)] ?? "queued";
  }

  async cancelTask(taskId: string): Promise<boolean> {
    const task = this.taskQueue.get(taskId);
    if (!task) {return false;}

    if (task.status === "pending" || task.status === "processing") {
      task.status = "failed";
      task.error = "Cancelled by user";
      await this.persistTask(task);

      const callback = this.pendingCallbacks.get(taskId);
      if (callback) {
        callback.reject(new Error("Task cancelled"));
      }

      return true;
    }
    return false;
  }

  async syncData(message: SyncMessage): Promise<SyncMessage> {
    const client = this.redisService.getClient();
    const syncKey = `sync:${message.deviceId}:${Date.now()}`;

    await client.set(syncKey, JSON.stringify(message), "EX", 300);

    const response: SyncMessage = {
      type: "sync_response",
      timestamp: new Date(),
      deviceId: this.DEVICE_ID,
      data: { status: "acknowledged", originalMessageId: syncKey },
    };

    return response;
  }

  async requestDeltaSync(lastSyncTime: Date, dataType: string): Promise<any> {
    this.logger.log(
      `Requesting delta sync for ${dataType} since ${lastSyncTime.toISOString()}`,
    );

    const client = this.redisService.getClient();
    const deltaKey = `delta:${dataType}:${this.DEVICE_ID}`;

    const deltas = await client.lrange(deltaKey, 0, -1);
    return deltas.map((d) => JSON.parse(d));
  }

  getConnectionStatus(): CloudConnection {
    return { ...this.connectionStatus };
  }

  getProtocolInfo(): CommunicationProtocol {
    return { ...this.PROTOCOL };
  }

  getQueueStats(): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  } {
    const tasks = Array.from(this.taskQueue.values());
    return {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === "pending").length,
      processing: tasks.filter((t) => t.status === "processing").length,
      completed: tasks.filter((t) => t.status === "completed").length,
      failed: tasks.filter((t) => t.status === "failed").length,
    };
  }

  private async flushPendingTasks(): Promise<void> {
    this.logger.log("Flushing pending tasks...");

    for (const [taskId, callback] of this.pendingCallbacks) {
      callback.reject(new Error("Service shutting down"));
    }
    this.pendingCallbacks.clear();

    for (const task of this.taskQueue.values()) {
      if (task.status === "processing") {
        task.status = "pending";
        await this.persistTask(task);
      }
    }
  }

  async prefetchUserData(userId: string): Promise<void> {
    this.logger.log(`Prefetching data for user: ${userId}`);

    const client = this.redisService.getClient();
    const prefetchKey = `prefetch:user:${userId}`;

    await client.set(
      prefetchKey,
      JSON.stringify({
        userId,
        timestamp: new Date().toISOString(),
        deviceId: this.DEVICE_ID,
      }),
      "EX",
      300,
    );
  }

  async batchSubmitTasks(
    tasks: Array<{
      type: CloudTask["type"];
      payload: Record<string, any>;
      priority?: CloudTask["priority"];
    }>,
  ): Promise<string[]> {
    const taskIds: string[] = [];

    for (const task of tasks) {
      const taskId = await this.submitTask(
        task.type,
        task.payload,
        task.priority,
      );
      taskIds.push(taskId);
    }

    return taskIds;
  }

  async getBatchResults(
    taskIds: string[],
    timeout: number = 60000,
  ): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      for (const taskId of taskIds) {
        if (!results.has(taskId)) {
          const task = this.taskQueue.get(taskId);
          if (task?.status === "completed") {
            results.set(taskId, task.result);
          } else if (task?.status === "failed") {
            results.set(taskId, { error: task.error });
          }
        }
      }

      if (results.size === taskIds.length) {
        break;
      }

      await this.delay(500);
    }

    return results;
  }
}
