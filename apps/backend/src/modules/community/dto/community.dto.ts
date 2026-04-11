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
  @IsString()
  title!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsEnum(PostCategory)
  category?: PostCategory;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedItemIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  outfitCardIds?: string[];
}

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsEnum(PostCategory)
  category?: PostCategory;
}

export class PostQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @IsOptional()
  @IsEnum(PostCategory)
  category?: PostCategory;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  authorId?: string;

  @IsOptional()
  @IsEnum(PostSortBy)
  sortBy?: PostSortBy = PostSortBy.LATEST;
}

export class CreateCommentDto {
  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}

export class LikePostDto {
  @IsBoolean()
  liked!: boolean;
}

export class CommentQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  pageSize?: number = 20;
}
