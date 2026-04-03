import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
} from "@nestjs/common";

import { OptionalAuthGuard } from "../../auth/guards/optional-auth.guard";
import { RequestWithUser } from "../../../common/types/common.types";
import { TrackEventDto } from "../dto/track-event.dto";
import { BehaviorTrackerService } from "../services/behavior-tracker.service";

@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly behaviorTracker: BehaviorTrackerService) {}

  /**
   * 追踪用户行为事件
   * 支持匿名和登录用户
   */
  @Post("track")
  @UseGuards(OptionalAuthGuard)
  async track(@Body() dto: TrackEventDto, @Request() req: RequestWithUser) {
    // 如果用户已登录但dto中没有userId，使用token中的userId
    if (req.user && !dto.userId) {
      dto.userId = req.user.id;
    }

    await this.behaviorTracker.track(dto);
    return { success: true };
  }

  /**
   * 批量追踪事件
   */
  @Post("track/batch")
  @UseGuards(OptionalAuthGuard)
  async trackBatch(@Body() events: TrackEventDto[], @Request() req: RequestWithUser) {
    for (const event of events) {
      if (req.user && !event.userId) {
        event.userId = req.user.id;
      }
      await this.behaviorTracker.track(event);
    }
    return { success: true, count: events.length };
  }

  /**
   * 获取用户行为画像
   */
  @Get("profile")
  async getProfile(@Request() req: RequestWithUser) {
    return this.behaviorTracker.getUserBehaviorProfile(req.user.id);
  }

  /**
   * 获取热门趋势
   */
  @Get("trending")
  async getTrending(
    @Query("type") type: "items" | "searches" = "items",
    @Query("limit") limit: string = "10",
  ) {
    return this.behaviorTracker.getTrending(type, parseInt(limit));
  }
}
