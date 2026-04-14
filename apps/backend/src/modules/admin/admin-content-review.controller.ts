import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  NotFoundException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

import { AuthGuard } from "../auth/guards/auth.guard";
import { AdminGuard } from "../../common/guards/admin.guard";
import { RequestWithUser } from "../../common/types/common.types";
import { ContentReviewService } from "./services/content-review.service";

import {
  ReviewQueueQueryDto,
  ReviewActionDto,
  BatchReviewDto,
} from "./dto/content-review.dto";

@ApiTags("admin/content-review")
@Controller("admin/content-review")
@UseGuards(AuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminContentReviewController {
  constructor(private readonly reviewService: ContentReviewService) {}

  @Get("queue")
  @ApiOperation({ summary: "Get content review queue" })
  async getReviewQueue(@Query() query: ReviewQueueQueryDto) {
    return this.reviewService.getReviewQueue({
      page: query.page,
      pageSize: query.pageSize,
      contentType: query.contentType,
      priority: query.priority,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });
  }

  @Get("stats")
  @ApiOperation({ summary: "Get review statistics" })
  async getReviewStats() {
    return this.reviewService.getReviewStats();
  }

  @Put(":id/review")
  @ApiOperation({ summary: "Review a single content item" })
  async reviewContent(
    @Request() req: RequestWithUser,
    @Param("id") id: string,
    @Body() dto: ReviewActionDto,
  ) {
    const result = await this.reviewService.reviewContent(
      id,
      req.user.id,
      dto.action,
      dto.note,
    );

    if (!result) {
      throw new NotFoundException("Content not found");
    }

    return result;
  }

  @Post("batch-review")
  @ApiOperation({ summary: "Batch review multiple content items" })
  async batchReview(
    @Request() req: RequestWithUser,
    @Body() dto: BatchReviewDto,
  ) {
    return this.reviewService.batchReview(
      dto.ids,
      req.user.id,
      dto.action,
      dto.note,
    );
  }
}
