import { IsString, IsOptional, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CodeRagSearchDto {
  @ApiProperty({ description: '搜索查询语句', example: '用户认证逻辑' })
  @IsString()
  query!: string;

  @ApiPropertyOptional({ description: '返回结果数量上限', example: 10, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  topK?: number = 10;

  @ApiPropertyOptional({ description: '按模块筛选', example: 'auth' })
  @IsOptional()
  @IsString()
  filterModule?: string;

  @ApiPropertyOptional({ description: '按编程语言筛选', example: 'typescript' })
  @IsOptional()
  @IsString()
  filterLanguage?: string;

  @ApiPropertyOptional({ description: '按文件路径包含内容筛选', example: 'auth/guards' })
  @IsOptional()
  @IsString()
  filterPathContains?: string;

  @ApiPropertyOptional({ description: '按代码块类型筛选', example: 'function' })
  @IsOptional()
  @IsString()
  filterChunkType?: string;

  @ApiPropertyOptional({ description: '是否格式化为 LLM 上下文', example: false, default: false })
  @IsOptional()
  @IsBoolean()
  formatForLlm?: boolean = false;

  @ApiPropertyOptional({ description: 'LLM 上下文最大字符数', example: 8000, default: 8000 })
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(20000)
  maxContextChars?: number = 8000;
}

export class CodeRagFileContextDto {
  @ApiProperty({ description: '文件路径', example: 'src/modules/auth/auth.service.ts' })
  @IsString()
  filePath!: string;
}
