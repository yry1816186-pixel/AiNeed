import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";

import { ContentModerationService, CONTENT_MODERATION_QUEUE } from "./content-moderation.service";

@Processor(CONTENT_MODERATION_QUEUE)
export class ContentModerationProcessor extends WorkerHost {
  private readonly logger = new Logger(ContentModerationProcessor.name);

  constructor(private readonly contentModerationService: ContentModerationService) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    this.logger.log(`Processing content moderation job ${job.id}`);
    await this.contentModerationService.processModerationQueue(job);
    return { jobId: job.id, status: "completed" };
  }
}
