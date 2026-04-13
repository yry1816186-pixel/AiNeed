import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  NotFoundException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";

import { AuthGuard } from "../auth/guards/auth.guard";
import { AdminGuard } from "../../common/guards/admin.guard";
import { RequestWithUser } from "../../common/types/common.types";
import { PrismaService } from "../../common/prisma/prisma.service";
import { ContentModerationService } from "../community/content-moderation.service";

import {
  AdminPostQueryDto,
  AdminReportQueryDto,
  ModeratePostDto,
  HandleReportDto,
} from "./dto/admin-community.dto";

@ApiTags("admin/community")
@Controller("admin/community")
@UseGuards(AuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminCommunityController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contentModerationService: ContentModerationService,
  ) {}

  @Get("posts")
  @ApiOperation({ summary: "List all posts including pending moderation" })
  async listPosts(@Query() query: AdminPostQueryDto) {
    const { page = 1, pageSize = 20, status, moderationStatus } = query;

    const where: Prisma.CommunityPostWhereInput = { isDeleted: false };

    if (moderationStatus) {
      where.moderationStatus = moderationStatus;
    }

    if (status === "hidden") {
      where.isHidden = true;
    } else if (status === "featured") {
      where.isFeatured = true;
    }

    const [posts, total] = await Promise.all([
      this.prisma.communityPost.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          author: {
            select: { id: true, nickname: true, avatar: true },
          },
          _count: {
            select: { likes: true, comments: true },
          },
        },
      }),
      this.prisma.communityPost.count({ where }),
    ]);

    return {
      data: posts,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  @Get("posts/:id")
  @ApiOperation({ summary: "Get post detail" })
  async getPost(@Param("id") id: string) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, nickname: true, avatar: true, bio: true },
        },
        relatedItems: {
          select: {
            item: {
              select: { id: true, name: true, mainImage: true, price: true },
            },
          },
        },
        _count: {
          select: { likes: true, comments: true },
        },
      },
    });

    if (!post || post.isDeleted) {
      throw new NotFoundException("Post not found");
    }

    return post;
  }

  @Put("posts/:id/moderate")
  @ApiOperation({ summary: "Moderate a post" })
  async moderatePost(
    @Request() req: RequestWithUser,
    @Param("id") id: string,
    @Body() dto: ModeratePostDto,
  ) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id },
    });

    if (!post || post.isDeleted) {
      throw new NotFoundException("Post not found");
    }

    await this.contentModerationService.manualReview(
      req.user.id,
      id,
      "post",
      dto.action,
      dto.note,
    );

    return { success: true };
  }

  @Delete("posts/:id")
  @ApiOperation({ summary: "Soft delete a post" })
  async deletePost(@Param("id") id: string) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id },
    });

    if (!post || post.isDeleted) {
      throw new NotFoundException("Post not found");
    }

    await this.prisma.communityPost.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    return { success: true };
  }

  @Get("reports")
  @ApiOperation({ summary: "List reports" })
  async listReports(@Query() query: AdminReportQueryDto) {
    const { page = 1, pageSize = 20, status, contentType } = query;

    const where: Prisma.ContentReportWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (contentType) {
      where.contentType = contentType;
    }

    const [reports, total] = await Promise.all([
      this.prisma.contentReport.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          reporter: {
            select: { id: true, nickname: true, avatar: true },
          },
        },
      }),
      this.prisma.contentReport.count({ where }),
    ]);

    return {
      data: reports,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  @Put("reports/:id")
  @ApiOperation({ summary: "Handle a report" })
  async handleReport(
    @Request() req: RequestWithUser,
    @Param("id") id: string,
    @Body() dto: HandleReportDto,
  ) {
    const report = await this.prisma.contentReport.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException("Report not found");
    }

    const newStatus = dto.action === "resolve" ? "resolved" : "rejected";

    await this.prisma.contentReport.update({
      where: { id },
      data: {
        status: newStatus,
        reviewedBy: req.user.id,
        reviewNote: dto.note || null,
      },
    });

    if (dto.action === "resolve") {
      await this.contentModerationService.manualReview(
        req.user.id,
        report.contentId,
        report.contentType,
        "reject",
        dto.note || "Report resolved - content removed",
      );
    }

    return { success: true };
  }

  @Get("moderation-queue")
  @ApiOperation({ summary: "Get moderation queue" })
  async getModerationQueue(@Query() query: AdminPostQueryDto) {
    return this.contentModerationService.getModerationQueue({
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @Get("trending-tags")
  @ApiOperation({ summary: "Get trending tags" })
  async getTrendingTags() {
    const posts = await this.prisma.communityPost.findMany({
      where: { isDeleted: false },
      select: { tags: true },
      orderBy: { hotScore: "desc" },
      take: 500,
    });

    const tagMap = new Map<string, number>();
    for (const post of posts) {
      for (const tag of post.tags) {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      }
    }

    const tags = Array.from(tagMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);

    return { data: tags };
  }
}
