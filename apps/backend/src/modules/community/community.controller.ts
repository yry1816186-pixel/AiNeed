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
  Request,
  ParseIntPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";

import { AuthGuard } from "../auth/guards/auth.guard";
import { RequestWithUser } from "../../common/types/common.types";

import { CommunityService } from "./community.service";
import {
  CreatePostDto,
  UpdatePostDto,
  PostQueryDto,
  CreateCommentDto,
  CommentQueryDto,
} from "./dto/community.dto";

@ApiTags("community")
@Controller("community")
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Post("posts")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "创建帖子", description: "创建一个新的社区帖子" })
  @ApiResponse({ status: 201, description: "帖子创建成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  async createPost(@Request() req: RequestWithUser, @Body() dto: CreatePostDto) {
    return this.communityService.createPost(req.user.id, dto);
  }

  @Get("posts")
  @ApiOperation({ summary: "获取帖子列表", description: "分页获取社区帖子列表，支持按分类、标签、作者筛选" })
  @ApiResponse({ status: 200, description: "获取成功" })
  async getPosts(@Query() query: PostQueryDto) {
    return this.communityService.getPosts(query);
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
    @Request() req: RequestWithUser,
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
    @Request() req: RequestWithUser,
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
  async getPostById(@Param("id") id: string, @Request() req: RequestWithUser) {
    return this.communityService.getPostById(id, req.user?.id);
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
    @Request() req: RequestWithUser,
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
  async deletePost(@Request() req: RequestWithUser, @Param("id") id: string) {
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
  async likePost(@Request() req: RequestWithUser, @Param("id") id: string) {
    return this.communityService.likePost(req.user.id, id);
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
    @Request() req: RequestWithUser,
    @Param("id") id: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.communityService.createComment(req.user.id, id, dto);
  }

  @Get("posts/:id/comments")
  @ApiOperation({ summary: "获取帖子评论", description: "分页获取指定帖子的评论列表" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 404, description: "帖子不存在" })
  @ApiParam({ name: "id", description: "帖子 ID" })
  async getComments(@Param("id") id: string, @Query() query: CommentQueryDto) {
    return this.communityService.getComments(id, query.page, query.pageSize);
  }

  @Post("users/:id/follow")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "关注用户", description: "关注指定用户" })
  @ApiResponse({ status: 200, description: "关注成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "用户不存在" })
  @ApiParam({ name: "id", description: "目标用户 ID" })
  async followUser(@Request() req: RequestWithUser, @Param("id") targetUserId: string) {
    return this.communityService.followUser(req.user.id, targetUserId);
  }
}
