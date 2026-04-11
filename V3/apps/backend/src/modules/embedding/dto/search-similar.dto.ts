import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max, IsObject } from 'class-validator';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const DEFAULT_THRESHOLD = 0.7;

export class SearchSimilarDto {
  @IsString()
  @IsNotEmpty()
  query!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  @IsOptional()
  limit?: number = DEFAULT_LIMIT;

  @Min(0)
  @Max(1)
  @IsOptional()
  threshold?: number = DEFAULT_THRESHOLD;

  @IsObject()
  @IsOptional()
  filters?: Record<string, unknown>;
}
