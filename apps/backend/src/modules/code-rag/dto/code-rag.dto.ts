import { IsString, IsOptional, IsInt, Min, Max, IsBoolean } from 'class-validator';

export class CodeRagSearchDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  topK?: number = 10;

  @IsOptional()
  @IsString()
  filterModule?: string;

  @IsOptional()
  @IsString()
  filterLanguage?: string;

  @IsOptional()
  @IsString()
  filterPathContains?: string;

  @IsOptional()
  @IsString()
  filterChunkType?: string;

  @IsOptional()
  @IsBoolean()
  formatForLlm?: boolean = false;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(20000)
  maxContextChars?: number = 8000;
}

export class CodeRagFileContextDto {
  @IsString()
  filePath: string;
}
