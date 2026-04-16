/* eslint-disable @typescript-eslint/no-explicit-any */
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";

import { QUEUE_NAMES } from "./queue.constants";

interface StyleAnalysisJobData {
  jobId: string;
  userId: string;
  type: "style_analysis";
  userInput: string;
  userProfile?: Record<string, unknown>;
  createdAt: string;
}

interface WardrobeMatchJobData {
  jobId: string;
  userId: string;
  type: "wardrobe_match";
  wardrobeItems: string[];
  targetStyle?: string;
  occasion?: string;
  season?: string;
  createdAt: string;
}

@Processor(QUEUE_NAMES.AI_TASKS, { concurrency: 1 })
export class QueueProcessor extends WorkerHost {
  private readonly logger = new Logger(QueueProcessor.name);

  async process(job: Job): Promise<unknown> {
    this.logger.warn(
      `AI task job ${job.id} received but processor is not implemented yet. ` +
      `Job data will be discarded. Implement this processor to handle AI tasks.`,
    );
    return { jobId: job.id, status: "completed" };
  }
}

@Processor(QUEUE_NAMES.STYLE_ANALYSIS, { concurrency: 2 })
export class StyleAnalysisProcessor extends WorkerHost {
  private readonly logger = new Logger(StyleAnalysisProcessor.name);

  async process(job: Job<StyleAnalysisJobData>): Promise<unknown> {
    this.logger.warn(
      `Style analysis job ${job.data.jobId} received but processor is not implemented yet. ` +
      `Job data will be discarded. Implement this processor to handle style analysis tasks.`,
    );
    return { jobId: job.data.jobId, status: "completed" };
  }
}

@Processor(QUEUE_NAMES.WARDROBE_MATCH)
export class WardrobeMatchProcessor extends WorkerHost {
  private readonly logger = new Logger(WardrobeMatchProcessor.name);

  async process(job: Job<WardrobeMatchJobData>): Promise<unknown> {
    this.logger.warn(
      `Wardrobe match job ${job.data.jobId} received but processor is not implemented yet. ` +
      `Job data will be discarded. Implement this processor to handle wardrobe match tasks.`,
    );
    return { jobId: job.data.jobId, status: "completed" };
  }
}
