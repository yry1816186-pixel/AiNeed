# Queue Architecture Documentation

## Overview

xuno uses a unified queue architecture based on **BullMQ** for all asynchronous task processing. This document describes the queue system architecture, configuration, and best practices.

## Architecture Decision

### Current Implementation: Unified BullMQ

The project has consolidated on **BullMQ** as the single task queue technology across both the Node.js backend and Python ML services.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Redis (Message Broker)                          │
├─────────────────────────────────────────────────────────────────────────┤
│  Queue: ai_tasks        │  Queue: style_analysis   │  Queue: virtual_tryon│
│  Queue: wardrobe_match  │                          │                      │
├─────────────────────────┴──────────────────────────┴──────────────────────┤
│                                                                           │
│  ┌───────────────────────┐          ┌───────────────────────────────┐   │
│  │   NestJS Backend      │          │    Python ML Services         │   │
│  │   (BullMQ Producer)   │          │    (Task Worker)              │   │
│  │                       │          │                               │   │
│  │  - QueueService       │◄────────►│  - task_worker.py             │   │
│  │  - QueueProcessors    │  Redis   │  - Uses Redis async client    │   │
│  │                       │  Pub/Sub │  - Compatible queue names     │   │
│  └───────────────────────┘          └───────────────────────────────┘   │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

### Why BullMQ (not Celery)?

| Feature | BullMQ | Celery |
|---------|--------|--------|
| Node.js Native | Yes | No (Python only) |
| TypeScript Support | First-class | Via additional tools |
| UI Dashboard | Bull Board | Flower |
| Redis Dependency | Yes | Yes |
| Job Priorities | Yes | Yes |
| Delayed Jobs | Yes | Yes |
| Rate Limiting | Built-in | Requires extensions |
| Concurrency | Easy configuration | Configuration required |
| Python Interop | Via Redis directly | Native |

### Python Integration Strategy

The Python ML services connect to the same Redis instance and process jobs from the same queues:

```python
# ml/services/task_worker.py
# Uses redis.asyncio to consume from BullMQ-compatible queue structures
import redis.asyncio as redis

# Queue naming matches BullMQ convention
queue_names = ["ai_tasks", "style_analysis", "virtual_tryon", "wardrobe_match"]
```

**Note**: Python workers use Redis list operations (`RPOPLPUSH`) that are compatible with BullMQ's job storage pattern, but do not use BullMQ's advanced features like job events. For full BullMQ features in Python, consider using `bullmq` Python package in future iterations.

## Queue Configuration

### Queue Names (`apps/backend/src/modules/queue/queue.constants.ts`)

```typescript
export const QUEUE_NAMES = {
  AI_TASKS: 'ai_tasks',           // General AI tasks, recommendations
  STYLE_ANALYSIS: 'style_analysis', // Style understanding and analysis
  VIRTUAL_TRYON: 'virtual_tryon',   // Virtual try-on processing
  WARDROBE_MATCH: 'wardrobe_match', // Wardrobe matching tasks
} as const;
```

### Job Types

```typescript
export const JOB_TYPES = {
  STYLE_ANALYSIS: 'style_analysis',
  VIRTUAL_TRYON: 'virtual_tryon',
  WARDROBE_MATCH: 'wardrobe_match',
  IMAGE_ANALYSIS: 'image_analysis',
  BODY_ANALYSIS: 'body_analysis',
  RECOMMENDATION: 'recommendation',
} as const;
```

### Default Configuration

```typescript
export const QUEUE_CONFIG = {
  DEFAULT_JOB_OPTIONS: {
    attempts: 3,                    // Retry failed jobs up to 3 times
    backoff: {
      type: 'exponential',          // Exponential backoff for retries
      delay: 1000,                  // Initial delay: 1 second
    },
    removeOnComplete: {
      count: 100,                   // Keep last 100 completed jobs
      age: 24 * 3600,               // Or 24 hours
    },
    removeOnFail: {
      count: 50,                    // Keep last 50 failed jobs
      age: 7 * 24 * 3600,           // Or 7 days
    },
    timeout: 300000,                // 5 minutes default timeout
  },
  STYLE_ANALYSIS_TIMEOUT: 60000,    // 1 minute
  VIRTUAL_TRYON_TIMEOUT: 180000,    // 3 minutes
  WARDROBE_MATCH_TIMEOUT: 30000,    // 30 seconds
} as const;
```

## Queue Service Usage

### Adding Jobs to Queue

```typescript
// In your service
constructor(
  @InjectQueue(QUEUE_NAMES.STYLE_ANALYSIS) private styleAnalysisQueue: Queue,
) {}

async addStyleAnalysisTask(userId: string, input: string) {
  const job = await this.styleAnalysisQueue.add('style-analysis', {
    userId,
    userInput: input,
    createdAt: new Date().toISOString(),
  }, {
    jobId: uuidv4(),
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });

  return job.id;
}
```

### Processing Jobs

```typescript
@Processor(QUEUE_NAMES.STYLE_ANALYSIS)
export class StyleAnalysisProcessor {
  constructor(private styleService: StyleUnderstandingService) {}

  @Process('style-analysis')
  async processStyleAnalysis(job: Job) {
    const { userId, userInput } = job.data;

    // Update progress
    await job.updateProgress(20);

    const result = await this.styleService.analyzeStyle(userInput);

    await job.updateProgress(100);
    return result;
  }
}
```

## Python Task Worker

### Starting the Worker

```bash
# Process a specific queue
python -m ml.services.task_worker --queue style_analysis

# Process all queues
python -m ml.services.task_worker --all

# Custom Redis URL
python -m ml.services.task_worker --redis-url redis://production:6379
```

### Worker Configuration

```python
# Environment variables
REDIS_URL=redis://localhost:6379
IDM_VTON_URL=http://localhost:8001
IDM_VTON_TIMEOUT=120
STORAGE_SERVICE_URL=http://localhost:8080/api/storage
```

## Monitoring

### Bull Board (Recommended)

Install and configure Bull Board for a web UI:

```bash
npm install @bull-board/express @bull-board/api
```

```typescript
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

const serverAdapter = new ExpressAdapter();
createBullBoard({
  queues: [
    new BullMQAdapter(aiTasksQueue),
    new BullMQAdapter(styleAnalysisQueue),
  ],
  serverAdapter,
});

serverAdapter.setBasePath('/admin/queues');
app.use('/admin/queues', serverAdapter.getRouter());
```

### Programmatic Monitoring

```typescript
// Get queue statistics
async getQueueStats() {
  const counts = await this.styleAnalysisQueue.getJobCounts(
    'waiting', 'active', 'completed', 'failed', 'delayed'
  );
  return counts;
}

// Get job by ID
async getJobStatus(jobId: string) {
  const job = await this.styleAnalysisQueue.getJob(jobId);
  if (!job) return null;

  return {
    id: job.id,
    status: await job.getState(),
    progress: job.progress,
    returnValue: job.returnvalue,
    failedReason: job.failedReason,
  };
}
```

## Best Practices

### 1. Job Data Size

Keep job data small - avoid including large payloads directly:

```typescript
// Bad
await queue.add('process', { imageData: largeBase64String });

// Good
await queue.add('process', { imageId: 'img_123', storagePath: '/uploads/img_123.jpg' });
```

### 2. Idempotency

Design job processors to be idempotent, as jobs may be retried:

```typescript
@Process('update-recommendations')
async updateRecommendations(job: Job) {
  const { userId } = job.data;

  // Check if already processed
  const existing = await this.cache.get(`rec:${userId}:${job.id}`);
  if (existing) return existing;

  // Process and cache
  const result = await this.computeRecommendations(userId);
  await this.cache.set(`rec:${userId}:${job.id}`, result, { ttl: 3600 });
  return result;
}
```

### 3. Progress Updates

For long-running jobs, provide progress updates:

```typescript
@Process('virtual-tryon')
async processTryOn(job: Job) {
  await job.updateProgress(10);  // Downloading images
  // ... download
  await job.updateProgress(30);  // Loading model
  // ... load
  await job.updateProgress(50);  // Processing
  // ... process
  await job.updateProgress(90);  // Uploading result
  // ... upload
  await job.updateProgress(100); // Complete
}
```

### 4. Error Handling

Use proper error classification for retry decisions:

```typescript
@Process('style-analysis')
async process(job: Job) {
  try {
    return await this.analyze(job.data);
  } catch (error) {
    if (error instanceof TimeoutError) {
      // Will be retried
      throw error;
    }
    if (error instanceof ValidationError) {
      // Don't retry validation errors
      throw new UnrecoverableError(error.message);
    }
    throw error;
  }
}
```

## Migration Notes

### From Multiple Queue Systems

If you encounter legacy code using different queue systems:

1. **Celery (Python)**: Jobs were defined in `ml/services/celery_tasks.py`. These have been migrated to `task_worker.py` using BullMQ-compatible Redis operations.

2. **Bull (deprecated)**: Legacy Bull queues should be migrated to BullMQ. The API is similar but BullMQ has improved performance and features.

### Celery Removal Checklist

- [x] Migrate task handlers to `task_worker.py`
- [x] Update task invocation from NestJS to use BullMQ
- [x] Remove Celery dependencies from `requirements.txt`
- [x] Update deployment scripts to use `task_worker.py`

## Environment Variables

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379

# Queue-specific timeouts (optional)
STYLE_ANALYSIS_TIMEOUT=60000
VIRTUAL_TRYON_TIMEOUT=180000
WARDROBE_MATCH_TIMEOUT=30000

# Worker Configuration
MAX_CONCURRENT_TASKS=3
```

## Troubleshooting

### Queue Stuck

```bash
# Check Redis connectivity
redis-cli ping

# Check queue length
redis-cli LLEN bull:style_analysis:wait

# Clear stuck jobs (use with caution)
redis-cli DEL bull:style_analysis:active
```

### High Memory Usage

- Reduce `removeOnComplete.count` and `removeOnFail.count`
- Enable job data compression for large payloads
- Monitor Redis memory usage

### Job Not Processing

1. Check worker is running: `ps aux | grep task_worker`
2. Check queue has processors: Bull Board UI
3. Verify Redis connection: Check worker logs for connection errors
