import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

import { PrismaService } from "../../../common/prisma/prisma.service";
import { StyleMatchDto, StyleMatchesResponseDto } from "./dto/style-dna.dto";

/** Raw match returned from ML API (no PII beyond user_id + score). */
interface MlMatchResult {
  user_id: string;
  score: number;
}

@Injectable()
export class StyleDnaService {
  private readonly logger = new Logger(StyleDnaService.name);
  private readonly mlServiceUrl: string;

  constructor(private configService: ConfigService, private prisma: PrismaService) {
    this.mlServiceUrl = this.configService.get<string>("ML_SERVICE_URL", "http://localhost:8001");
  }

  /**
   * Trigger style DNA computation for a user by forwarding behavior data to ML API.
   * The userId comes from JWT (not request body) to prevent spoofing (T-08-05).
   */
  async computeStyleDna(
    userId: string,
    itemIds: string[],
    interactionTypes: string[]
  ): Promise<void> {
    try {
      await axios.post(`${this.mlServiceUrl}/api/social/style-dna/compute`, {
        user_id: userId,
        item_ids: itemIds,
        interaction_types: interactionTypes,
      });
      this.logger.log(`Style DNA computed for user ${userId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Failed to compute style DNA for user ${userId}: ${message}`);
      throw new ServiceUnavailableException("Style DNA computation service unavailable");
    }
  }

  /**
   * Get top-K similar users by style DNA, enriched with nickname/avatar only.
   * Only non-PII fields are returned (T-08-04 mitigation).
   */
  async getMatches(userId: string, topK: number = 10): Promise<StyleMatchesResponseDto> {
    let mlResults: MlMatchResult[];

    try {
      const response = await axios.get<{ matches: MlMatchResult[] }>(
        `${this.mlServiceUrl}/api/social/style-dna/matches`,
        { params: { user_id: userId, top_k: topK } }
      );
      mlResults = response.data.matches ?? [];
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Failed to get style DNA matches for user ${userId}: ${message}`);
      throw new ServiceUnavailableException("Style DNA matching service unavailable");
    }

    // Enrich with nickname and avatar from Prisma (non-PII only)
    const enrichedMatches: StyleMatchDto[] = await Promise.all(
      mlResults.map(async (match) => {
        const user = await this.prisma.user.findUnique({
          where: { id: match.user_id },
          select: { nickname: true, avatar: true },
        });

        return {
          userId: match.user_id,
          nickname: user?.nickname ?? "Anonymous",
          avatar: user?.avatar ?? null,
          similarityScore: match.score,
        };
      })
    );

    return { matches: enrichedMatches };
  }
}
