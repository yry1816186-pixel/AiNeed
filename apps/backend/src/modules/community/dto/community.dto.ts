import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsBoolean,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum PostCategory {
  OUTFIT_SHARE = "outfit_share",
  ITEM_REVIEW = "item_review",
  STYLE_TIPS = "style_tips",
  QUESTION = "question",
  BRAND_STORY = "brand_story",
}

export enum PostSortBy {
  LATEST = "latest",
  POPULAR = "popular",
  TRENDING = "trending",
}

export class CreatePostDto {
  @ApiProperty({ description: "帖子标题", example: "今日穿搭分享" })
  @IsString()
  title!: string;

  @ApiProperty({ description: "帖子内容", example: "今天尝试了一套新的通勤穿搭..." })
  @IsString()
  content!: string;

  @ApiPropertyOptional({ description: "图片 URL 列表", example: ["https://example.com/img1.jpg"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ description: "标签列表", example: ["通勤", "春季"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: "帖子分类", enum: PostCategory, example: PostCategory.OUTFIT_SHARE })
  @IsOptional()
  @IsEnum(PostCategory)
  category?: PostCategory;

  @ApiPropertyOptional({ description: "关联商品 ID 列表", example: ["item_001", "item_002"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedItemIds?: string[];

  @ApiPropertyOptional({ description: "穿搭卡片 ID 列表", example: ["card_001"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  outfitCardIds?: string[];
}

export class UpdatePostDto {
  @ApiPropertyOptional({ description: "帖子标题", example: "今日穿搭分享（已编辑）" })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: "帖子内容", example: "更新后的内容..." })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: "图片 URL 列表", example: ["https://example.com/img1.jpg"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ description: "标签列表", example: ["通勤", "春季", "更新"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: "帖子分类", enum: PostCategory, example: PostCategory.STYLE_TIPS })
  @IsOptional()
  @IsEnum(PostCategory)
  category?: PostCategory;
}

export class PostQueryDto {
  @ApiPropertyOptional({ description: "页码", example: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "每页数量", example: 20, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: "帖子分类", enum: PostCategory })
  @IsOptional()
  @IsEnum(PostCategory)
  category?: PostCategory;

  @ApiPropertyOptional({ description: "标签筛选", example: ["通勤"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: "作者 ID", example: "user_001" })
  @IsOptional()
  @IsString()
  authorId?: string;

  @ApiPropertyOptional({ description: "排序方式", enum: PostSortBy, default: PostSortBy.LATEST })
  @IsOptional()
  @IsEnum(PostSortBy)
  sortBy?: PostSortBy = PostSortBy.LATEST;
}

export class CreateCommentDto {
  @ApiProperty({ description: "评论内容", example: "这套穿搭太好看了！" })
  @IsString()
  content!: string;

  @ApiPropertyOptional({ description: "父评论 ID（回复评论时使用）", example: "comment_001" })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ description: "评论图片列表", example: ["https://example.com/comment-img.jpg"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}

export class LikePostDto {
  @ApiProperty({ description: "是否点赞", example: true })
  @IsBoolean()
  liked!: boolean;
}

export class CommentQueryDto {
  @ApiPropertyOptional({ description: "页码", example: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "每页数量", example: 20, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: "每条评论的回复数量", example: 2, default: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  repliesLimit?: number = 2;
}

export class BookmarkPostDto {
  @ApiProperty({ description: "是否收藏", example: true })
  @IsBoolean()
  bookmarked!: boolean;

  @ApiPropertyOptional({ description: "收藏夹 ID", example: "collection_001" })
  @IsOptional()
  @IsString()
  collectionId?: string;
}

export class SharePostDto {
  @ApiPropertyOptional({ description: "分享平台", example: "wechat" })
  @IsOptional()
  @IsString()
  platform?: string;
}

export class CreateReportDto {
  @ApiProperty({ description: "内容类型", example: "post" })
  @IsString()
  contentType!: string;

  @ApiProperty({ description: "内容 ID", example: "post_001" })
  @IsString()
  contentId!: string;

  @ApiProperty({ description: "举报原因", example: "包含不当内容" })
  @IsString()
  reason!: string;
}

export class ReportQueryDto {
  @ApiPropertyOptional({ description: "页码", example: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "每页数量", example: 20, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: "举报状态", example: "pending" })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: "内容类型", example: "post" })
  @IsOptional()
  @IsString()
  contentType?: string;
}

export class TrendingQueryDto {
  @ApiPropertyOptional({ description: "页码", example: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "每页数量", example: 20, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: "趋势类型", example: "tags" })
  @IsOptional()
  @IsString()
  type?: string;
}
