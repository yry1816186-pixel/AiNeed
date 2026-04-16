/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
  ApiBody,
} from "@nestjs/swagger";

import { RequestWithUser } from "../../../../common/types/common.types";
import { OptionalAuthGuard } from "../../../../../../../identity/auth/guards/optional-auth.guard";
import { TrackEventDto } from "../dto/track-event.dto";
import { BehaviorTrackerService } from "../services/behavior-tracker.service";

@ApiTags("analytics")
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly behaviorTracker: BehaviorTrackerService) {}

  @Post("track")
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({
    summary: "追踪用户行为事件",
    description: "记录用户行为事件，支持匿名和登录用户。用于收集用户交互数据以优化推荐算法。",
  })
  @ApiBody({ type: TrackEventDto })
  @ApiResponse({ status: 200, description: "事件记录成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  async track(@Body() dto: TrackEventDto, @Request() req: RequestWithUser) {
    if (req.user && !dto.userId) {
      dto.userId = req.user.id;
    }

    await this.behaviorTracker.track(dto);
    return { success: true };
  }

  @Post("track/batch")
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({
    summary: "批量追踪用户行为事件",
    description: "批量记录多条用户行为事件，适用于滑动推荐等高频交互场景。",
  })
  @ApiResponse({ status: 200, description: "批量事件记录成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  async trackBatch(@Body() events: TrackEventDto[], @Request() req: RequestWithUser) {
    for (const event of events) {
      if (req.user && !event.userId) {
        event.userId = req.user.id;
      }
      await this.behaviorTracker.track(event);
    }
    return { success: true, count: events.length };
  }

  @Get("profile")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "获取用户行为画像",
    description: "根据用户的历史行为数据生成行为画像，包括偏好、兴趣和消费习惯等。",
  })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 401, description: "未授权，需要提供有效的 Access Token" })
  async getProfile(@Request() req: RequestWithUser) {
    return this.behaviorTracker.getUserBehaviorProfile(req.user.id);
  }

  @Get("trending")
  @ApiOperation({
    summary: "获取热门趋势",
    description: "获取平台热门趋势数据，支持按类型（商品/搜索）筛选。公开接口，无需认证。",
  })
  @ApiQuery({ name: "type", required: false, enum: ["items", "searches"], description: "趋势类型：items(商品)、searches(搜索)" })
  @ApiQuery({ name: "limit", required: false, type: Number, description: "返回数量，默认10", example: 10 })
  @ApiResponse({ status: 200, description: "获取成功" })
  async getTrending(
    @Query("type") type: "items" | "searches" = "items",
    @Query("limit") limit: string = "10",
  ) {
    return this.behaviorTracker.getTrending(type, parseInt(limit));
  }
}
