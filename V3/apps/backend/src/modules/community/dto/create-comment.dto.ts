import {
  IsString,
  IsUUID,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ description: '评论内容' })
  @IsString()
  @MaxLength(1000)
  content!: string;

  @ApiPropertyOptional({ description: '父评论ID(回复)' })
  @IsOptional()
  @IsUUID()
  parent_id?: string;
}
