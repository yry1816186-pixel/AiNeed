import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request as NestRequest,
  ParseIntPipe,
  UseInterceptors,
  UploadedFiles,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { RequestWithUser } from "../../../common/types/common.types";
import { AuthGuard } from "../../identity/auth/guards/auth.guard";

import { CommunityService } from "./community.service";
import {
  CreatePostDto,
  UpdatePostDto,
  PostQueryDto,
  CreateCommentDto,
  CommentQueryDto,
  BookmarkPostDto,
  SharePostDto,
  CreateReportDto,
  ReportQueryDto,
  TrendingQueryDto,
} from "./dto/community.dto";

const imageFileFilter = (_req: any, file: Express.Multer.File, callback: (error: Error | null, acceptFile: boolean) => void) => {
  if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
    return callback(new Error("Only image files are allowed"), false);
  }
  callback(null, true);
};

@ApiTags("community")
@Controller("community")
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Post("posts")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseInterceptors(
    FilesInterceptor("images", 9, {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: imageFileFilter,
    }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "创建帖子", description: "创建一个新的社区帖子，支持多图上传" })
  @ApiResponse({ status: 201, description: "帖子创建成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  async createPost(
    @NestRequest() req: RequestWithUser,
    @Body() dto: CreatePostDto,
    @UploadedFiles() _files: Express.Multer.File[],
  ) {
    return this.communityService.createPost(req.user.id, dto);
  }

  @Get("posts")
  @ApiOperation({ summary: "获取帖子列表", description: "分页获取社区帖子列表，支持按分类、标签、作者筛选" })
  @ApiResponse({ status: 200, description: "获取成功" })
  async getPosts(@Query() query: PostQueryDto, @NestRequest() req: RequestWithUser) {
    const adminMode = req.user?.role === 'admin';
    return this.communityService.getPosts(query, req.user?.id, adminMode);
  }

  @Get("trending")
  @ApiOperation({ summary: "获取热门趋势", description: "获取热门帖子或热门标签" })
  @ApiResponse({ status: 200, description: "获取成功" })
  async getTrending(@Query() query: TrendingQueryDto) {
    return this.communityService.getTrending(query);
  }

  @Get("following/feed")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "获取关注动态", description: "获取关注用户的帖子、点赞、试衣动态" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiQuery({ name: "page", type: Number, required: false, description: "页码" })
  @ApiQuery({ name: "pageSize", type: Number, required: false, description: "每页数量" })
  async getFollowingFeed(
    @NestRequest() req: RequestWithUser,
    @Query("page", ParseIntPipe) page = 1,
    @Query("pageSize", ParseIntPipe) pageSize = 20,
  ) {
    return this.communityService.getFollowingFeed(req.user.id, page, pageSize);
  }

  @Get("posts/following")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "获取关注用户的帖子", description: "获取当前用户关注的人发布的帖子" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiQuery({ name: "page", type: Number, required: false, description: "页码" })
  @ApiQuery({ name: "pageSize", type: Number, required: false, description: "每页数量" })
  async getFollowingPosts(
    @NestRequest() req: RequestWithUser,
    @Query("page", ParseIntPipe) page = 1,
    @Query("pageSize", ParseIntPipe) pageSize = 20,
  ) {
    return this.communityService.getFollowingPosts(req.user.id, page, pageSize);
  }

  @Get("posts/recommended")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "获取推荐帖子", description: "基于用户偏好推荐帖子" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiQuery({ name: "page", type: Number, required: false, description: "页码" })
  @ApiQuery({ name: "pageSize", type: Number, required: false, description: "每页数量" })
  async getRecommendedPosts(
    @NestRequest() req: RequestWithUser,
    @Query("page", ParseIntPipe) page = 1,
    @Query("pageSize", ParseIntPipe) pageSize = 20,
  ) {
    return this.communityService.getRecommendedPosts(
      req.user.id,
      page,
      pageSize,
    );
  }

  @Get("posts/:id")
  @ApiOperation({ summary: "获取帖子详情", description: "根据 ID 获取帖子的详细信息" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 404, description: "帖子不存在" })
  @ApiParam({ name: "id", description: "帖子 ID" })
  async getPostById(@Param("id") id: string, @NestRequest() req: RequestWithUser) {
    const adminMode = req.user?.role === 'admin';
    return this.communityService.getPostById(id, req.user?.id, adminMode);
  }

  @Put("posts/:id")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "更新帖子", description: "更新指定帖子的内容" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 403, description: "无权操作" })
  @ApiResponse({ status: 404, description: "帖子不存在" })
  @ApiParam({ name: "id", description: "帖子 ID" })
  async updatePost(
    @NestRequest() req: RequestWithUser,
    @Param("id") id: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.communityService.updatePost(req.user.id, id, dto);
  }

  @Delete("posts/:id")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "删除帖子", description: "删除指定帖子" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 403, description: "无权操作" })
  @ApiResponse({ status: 404, description: "帖子不存在" })
  @ApiParam({ name: "id", description: "帖子 ID" })
  async deletePost(@NestRequest() req: RequestWithUser, @Param("id") id: string) {
    return this.communityService.deletePost(req.user.id, id);
  }

  @Post("posts/:id/like")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "点赞帖子", description: "对指定帖子进行点赞" })
  @ApiResponse({ status: 200, description: "点赞成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "帖子不存在" })
  @ApiParam({ name: "id", description: "帖子 ID" })
  async likePost(@NestRequest() req: RequestWithUser, @Param("id") id: string) {
    return this.communityService.likePost(req.user.id, id);
  }

  @Post("posts/:id/bookmark")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "收藏帖子", description: "收藏或取消收藏指定帖子" })
  @ApiResponse({ status: 200, description: "操作成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "帖子不存在" })
  @ApiParam({ name: "id", description: "帖子 ID" })
  async bookmarkPost(
    @NestRequest() req: RequestWithUser,
    @Param("id") id: string,
    @Body() dto: BookmarkPostDto,
  ) {
    return this.communityService.bookmarkPost(req.user.id, id, dto);
  }

  @Post("posts/:id/share")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "分享帖子", description: "分享指定帖子" })
  @ApiResponse({ status: 200, description: "分享成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "帖子不存在" })
  @ApiParam({ name: "id", description: "帖子 ID" })
  async sharePost(
    @NestRequest() req: RequestWithUser,
    @Param("id") id: string,
    @Body() _dto: SharePostDto,
  ) {
    return this.communityService.sharePost(req.user.id, id);
  }

  @Post("posts/:id/comments")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "创建评论", description: "在指定帖子下创建评论" })
  @ApiResponse({ status: 201, description: "评论创建成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "帖子不存在" })
  @ApiParam({ name: "id", description: "帖子 ID" })
  async createComment(
    @NestRequest() req: RequestWithUser,
    @Param("id") id: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.communityService.createComment(req.user.id, id, dto);
  }

  @Get("posts/:id/comments")
  @ApiOperation({ summary: "获取帖子评论", description: "分页获取指定帖子的评论列表，支持折叠回复" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 404, description: "帖子不存在" })
  @ApiParam({ name: "id", description: "帖子 ID" })
  async getComments(@Param("id") id: string, @Query() query: CommentQueryDto) {
    return this.communityService.getComments(
      id,
      query.page,
      query.pageSize,
      query.repliesLimit,
    );
  }

  @Post("reports")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "举报内容", description: "举报帖子或其他内容" })
  @ApiResponse({ status: 201, description: "举报成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 409, description: "已经举报过" })
  async reportContent(
    @NestRequest() req: RequestWithUser,
    @Body() dto: CreateReportDto,
  ) {
    return this.communityService.reportContent(req.user.id, dto);
  }

  @Post("users/:id/follow")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "关注用户", description: "关注指定用户" })
  @ApiResponse({ status: 200, description: "关注成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "用户不存在" })
  @ApiParam({ name: "id", description: "目标用户 ID" })
  async followUser(@NestRequest() req: RequestWithUser, @Param("id") targetUserId: string) {
    return this.communityService.followUser(req.user.id, targetUserId);
  }

  @Get("users/:id/profile")
  @ApiOperation({ summary: "获取社区用户画像", description: "获取指定用户在社区的公开画像信息" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 404, description: "用户不存在" })
  @ApiParam({ name: "id", description: "用户 ID" })
  async getUserProfile(@Param("id") userId: string, @NestRequest() req: RequestWithUser) {
    return this.communityService.getUserPublicProfile(userId, req.user?.id);
  }
}
