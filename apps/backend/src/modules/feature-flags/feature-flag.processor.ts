import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { PrismaService } from '../../common/prisma/prisma.service';

const FEATURE_FLAG_QUEUE = 'feature_flag_evaluations';

interface EvaluationJobData {
  flagId: string;
  userId: string | null;
  result: boolean;
  variant: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attributes: Record<string, any> | null;
  evaluatedAt: string;
}

@Processor(FEATURE_FLAG_QUEUE)
export class FeatureFlagProcessor extends WorkerHost {
  private readonly logger = new Logger(FeatureFlagProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<EvaluationJobData>): Promise<void> {
    const { flagId, userId, result, variant, attributes, evaluatedAt } = job.data;

    try {
      await this.prisma.featureFlagEvaluation.create({
        data: {
          flagId,
          userId,
          result,
          variant,
          attributes: attributes ?? undefined,
          evaluatedAt: new Date(evaluatedAt),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to log evaluation for flag ${flagId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
