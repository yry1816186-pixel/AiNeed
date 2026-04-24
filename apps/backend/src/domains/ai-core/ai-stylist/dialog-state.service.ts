import { Injectable, Logger } from "@nestjs/common";

import { RedisService } from "../../../common/redis/redis.service";

import { DialogContextDto, DialogState } from "./dto/dialog.dto";

const DIALOG_KEY_PREFIX = "dialog";
const DIALOG_TTL_SECONDS = 1800;

@Injectable()
export class DialogStateService {
  private readonly logger = new Logger(DialogStateService.name);

  constructor(private redisService: RedisService) {}

  async getContext(sessionId: string): Promise<DialogContextDto> {
    try {
      const data = await this.redisService.get(`${DIALOG_KEY_PREFIX}:${sessionId}`);
      if (data) {
        return JSON.parse(data) as DialogContextDto;
      }
    } catch (error) {
      this.logger.warn(
        `Failed to get dialog context for session ${sessionId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
    return new DialogContextDto();
  }

  async saveContext(sessionId: string, context: DialogContextDto): Promise<void> {
    try {
      await this.redisService.setex(
        `${DIALOG_KEY_PREFIX}:${sessionId}`,
        DIALOG_TTL_SECONDS,
        JSON.stringify(context)
      );
    } catch (error) {
      this.logger.warn(
        `Failed to save dialog context for session ${sessionId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async clearContext(sessionId: string): Promise<void> {
    try {
      await this.redisService.del(`${DIALOG_KEY_PREFIX}:${sessionId}`);
    } catch (error) {
      this.logger.warn(
        `Failed to clear dialog context for session ${sessionId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * @deprecated State transitions decided by Python DialogEngine only.
   * NestJS should not make independent state transition decisions.
   */
  async advanceState(sessionId: string, newState: DialogState): Promise<DialogContextDto> {
    const context = await this.getContext(sessionId);
    context.state = newState;
    context.turnCount += 1;
    await this.saveContext(sessionId, context);
    return context;
  }

  /**
   * @deprecated State transitions decided by Python DialogEngine only.
   * NestJS should not make independent slot update decisions.
   */
  async updateSlots(
    sessionId: string,
    slotUpdates: Partial<import("./dto/dialog.dto").DialogSlotDto>
  ): Promise<DialogContextDto> {
    const context = await this.getContext(sessionId);
    context.slots = { ...context.slots, ...slotUpdates };
    await this.saveContext(sessionId, context);
    return context;
  }
}
