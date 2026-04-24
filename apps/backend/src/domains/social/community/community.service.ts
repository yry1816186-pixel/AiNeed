import { Injectable, Logger } from "@nestjs/common";

import { CommunityPostService } from "./community-post.service";
import { CommunityCommentService } from "./community-comment.service";
import { CommunityLikeService } from "./community-like.service";
import { CommunitySocialService } from "./community-social.service";
import { CommunityTrendingService } from "./community-trending.service";
import { CommunityFeedService } from "./community-feed.service";

import {
  CreatePostDto,
  UpdatePostDto,
  PostQueryDto,
  CreateCommentDto,
  BookmarkPostDto,
  CreateReportDto,
  TrendingQueryDto,
} from "./dto/community.dto";

@Injectable()
export class CommunityService {
  private readonly logger = new Logger(CommunityService.name);

  constructor(
    private readonly postService: CommunityPostService,
    private readonly commentService: CommunityCommentService,
    private readonly likeService: CommunityLikeService,
    private readonly socialService: CommunitySocialService,
    private readonly trendingService: CommunityTrendingService,
    private readonly feedService: CommunityFeedService
  ) {}

  async createPost(userId: string, dto: CreatePostDto) {
    return this.postService.createPost(userId, dto);
  }

  async getPosts(query: PostQueryDto, userId?: string, adminMode = false) {
    return this.postService.getPosts(query, userId, adminMode);
  }

  async getPostById(postId: string, userId?: string, adminMode = false) {
    return this.postService.getPostById(postId, userId, adminMode);
  }

  async updatePost(userId: string, postId: string, dto: UpdatePostDto) {
    return this.postService.updatePost(userId, postId, dto);
  }

  async deletePost(userId: string, postId: string) {
    return this.postService.deletePost(userId, postId);
  }

  async likePost(userId: string, postId: string) {
    return this.likeService.likePost(userId, postId);
  }

  async createComment(userId: string, postId: string, dto: CreateCommentDto) {
    return this.commentService.createComment(userId, postId, dto);
  }

  async getComments(postId: string, page = 1, pageSize = 20, repliesLimit = 2) {
    return this.commentService.getComments(postId, page, pageSize, repliesLimit);
  }

  async followUser(userId: string, targetUserId: string) {
    return this.socialService.followUser(userId, targetUserId);
  }

  async getUserPublicProfile(userId: string, currentUserId?: string) {
    return this.socialService.getUserPublicProfile(userId, currentUserId);
  }

  async getFollowingPosts(userId: string, page = 1, pageSize = 20) {
    return this.feedService.getFollowingPosts(userId, page, pageSize);
  }

  async getFollowingFeed(userId: string, page = 1, pageSize = 20) {
    return this.feedService.getFollowingFeed(userId, page, pageSize);
  }

  async getRecommendedPosts(userId: string, page = 1, pageSize = 20) {
    return this.feedService.getRecommendedPosts(userId, page, pageSize);
  }

  async bookmarkPost(userId: string, postId: string, dto: BookmarkPostDto) {
    return this.likeService.bookmarkPost(userId, postId, dto);
  }

  async sharePost(userId: string, postId: string) {
    return this.postService.sharePost(userId, postId);
  }

  async reportContent(userId: string, dto: CreateReportDto) {
    return this.trendingService.reportContent(userId, dto);
  }

  async getTrending(query: TrendingQueryDto) {
    return this.trendingService.getTrending(query);
  }

  async recalculateHotScores() {
    return this.trendingService.recalculateHotScores();
  }
}
