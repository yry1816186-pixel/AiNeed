import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface SASRecRecommendation {
  item_id: string;
  score: number;
}

interface SequenceItem {
  itemId: string;
  timestamp?: number;
}

@Injectable()
export class SASRecClientService {
  private readonly logger = new Logger(SASRecClientService.name);
  private readonly baseUrl: string;
  private readonly enabled: boolean;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>(
      "SASREC_SERVICE_URL",
      "http://localhost:8100",
    );
    this.enabled = this.configService.get<string>("SASREC_ENABLED", "false") === "true";
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async predict(
    userSequence: SequenceItem[],
    topK: number = 10,
    excludeItems: string[] = [],
  ): Promise<SASRecRecommendation[]> {
    if (!this.enabled) return [];

    try {
      const response = await fetch(`${this.baseUrl}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_sequence: userSequence.map((item) => ({
            item_id: item.itemId,
            timestamp: item.timestamp,
          })),
          top_k: topK,
          exclude_items: excludeItems,
        }),
      });

      if (!response.ok) {
        this.logger.warn(`SASRec predict failed: ${response.status}`);
        return [];
      }

      const data = (await response.json()) as {
        recommendations: SASRecRecommendation[];
      };
      return data.recommendations;
    } catch (error) {
      this.logger.warn(`SASRec service unavailable: ${error}`);
      return [];
    }
  }

  async train(
    userSequences: SequenceItem[][],
    epochs: number = 10,
    learningRate: number = 0.001,
  ): Promise<{ loss: number; epochs: number } | null> {
    if (!this.enabled) return null;

    try {
      const response = await fetch(`${this.baseUrl}/train`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_sequences: userSequences.map((seq) =>
            seq.map((item) => ({
              item_id: item.itemId,
              timestamp: item.timestamp,
            })),
          ),
          epochs,
          learning_rate: learningRate,
        }),
      });

      if (!response.ok) {
        this.logger.warn(`SASRec train failed: ${response.status}`);
        return null;
      }

      return (await response.json()) as { loss: number; epochs: number };
    } catch (error) {
      this.logger.warn(`SASRec train unavailable: ${error}`);
      return null;
    }
  }

  async warmup(itemIds: string[]): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      const response = await fetch(`${this.baseUrl}/warmup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemIds),
      });
      return response.ok;
    } catch (error) {
      this.logger.warn(`SASRec warmup unavailable: ${error}`);
      return false;
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
