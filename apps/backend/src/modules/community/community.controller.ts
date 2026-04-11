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

@Controller("community")
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Post("posts")
  @UseGuards(AuthGuard)
  async createPost(@Request() req: RequestWithUser, @Body() dto: CreatePostDto) {
    return this.communityService.createPost(req.user.id, dto);
  }

  @Get("posts")
  async getPosts(@Query() query: PostQueryDto) {
    return this.communityService.getPosts(query);
  }

  @Get("posts/following")
  @UseGuards(AuthGuard)
  async getFollowingPosts(
    @Request() req: RequestWithUser,
    @Query("page", ParseIntPipe) page = 1,
    @Query("pageSize", ParseIntPipe) pageSize = 20,
  ) {
    return this.communityService.getFollowingPosts(req.user.id, page, pageSize);
  }

  @Get("posts/recommended")
  @UseGuards(AuthGuard)
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
  async getPostById(@Param("id") id: string, @Request() req: RequestWithUser) {
    return this.communityService.getPostById(id, req.user?.id);
  }

  @Put("posts/:id")
  @UseGuards(AuthGuard)
  async updatePost(
    @Request() req: RequestWithUser,
    @Param("id") id: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.communityService.updatePost(req.user.id, id, dto);
  }

  @Delete("posts/:id")
  @UseGuards(AuthGuard)
  async deletePost(@Request() req: RequestWithUser, @Param("id") id: string) {
    return this.communityService.deletePost(req.user.id, id);
  }

  @Post("posts/:id/like")
  @UseGuards(AuthGuard)
  async likePost(@Request() req: RequestWithUser, @Param("id") id: string) {
    return this.communityService.likePost(req.user.id, id);
  }

  @Post("posts/:id/comments")
  @UseGuards(AuthGuard)
  async createComment(
    @Request() req: RequestWithUser,
    @Param("id") id: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.communityService.createComment(req.user.id, id, dto);
  }

  @Get("posts/:id/comments")
  async getComments(@Param("id") id: string, @Query() query: CommentQueryDto) {
    return this.communityService.getComments(id, query.page, query.pageSize);
  }

  @Post("users/:id/follow")
  @UseGuards(AuthGuard)
  async followUser(@Request() req: RequestWithUser, @Param("id") targetUserId: string) {
    return this.communityService.followUser(req.user.id, targetUserId);
  }
}
