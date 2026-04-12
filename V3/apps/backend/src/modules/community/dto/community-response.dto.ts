import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class PostAuthorResponse {
  @ApiProperty() id!: string;
  @ApiPropertyOptional() nickname!: string | null;
  @ApiPropertyOptional() avatarUrl!: string | null;
}

class PostResponse {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiPropertyOptional() title!: string | null;
  @ApiProperty() content!: string;
  @ApiProperty({ type: [String] }) imageUrls!: string[];
  @ApiProperty({ type: [String] }) tags!: string[];
  @ApiPropertyOptional() outfitId!: string | null;
  @ApiProperty() likesCount!: number;
  @ApiProperty() commentsCount!: number;
  @ApiProperty() sharesCount!: number;
  @ApiProperty() isFeatured!: boolean;
  @ApiProperty() status!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiPropertyOptional() user!: PostAuthorResponse | null;
  @ApiPropertyOptional() isLiked!: boolean;
}

class CommentAuthorResponse {
  @ApiProperty() id!: string;
  @ApiPropertyOptional() nickname!: string | null;
  @ApiPropertyOptional() avatarUrl!: string | null;
}

class CommentResponse {
  @ApiProperty() id!: string;
  @ApiProperty() postId!: string;
  @ApiProperty() userId!: string;
  @ApiPropertyOptional() parentId!: string | null;
  @ApiProperty() content!: string;
  @ApiProperty() likesCount!: number;
  @ApiProperty() createdAt!: Date;
  @ApiPropertyOptional() user!: CommentAuthorResponse | null;
  @ApiPropertyOptional() replies!: CommentResponse[];
  @ApiPropertyOptional() isLiked!: boolean;
}

class PostListResponse {
  @ApiProperty({ type: [PostResponse] }) items!: PostResponse[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() totalPages!: number;
}

class PostDetailResponse {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiPropertyOptional() title!: string | null;
  @ApiProperty() content!: string;
  @ApiProperty({ type: [String] }) imageUrls!: string[];
  @ApiProperty({ type: [String] }) tags!: string[];
  @ApiPropertyOptional() outfitId!: string | null;
  @ApiProperty() likesCount!: number;
  @ApiProperty() commentsCount!: number;
  @ApiProperty() sharesCount!: number;
  @ApiProperty() isFeatured!: boolean;
  @ApiProperty() status!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiPropertyOptional() user!: PostAuthorResponse | null;
  @ApiPropertyOptional() isLiked!: boolean;
  @ApiProperty({ type: [CommentResponse] }) comments!: CommentResponse[];
}

class CommentListResponse {
  @ApiProperty({ type: [CommentResponse] }) items!: CommentResponse[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
}

class LikeResponse {
  @ApiProperty() isLiked!: boolean;
  @ApiProperty() likesCount!: number;
}

export {
  PostAuthorResponse,
  PostResponse,
  CommentAuthorResponse,
  CommentResponse,
  PostListResponse,
  PostDetailResponse,
  CommentListResponse,
  LikeResponse,
};
