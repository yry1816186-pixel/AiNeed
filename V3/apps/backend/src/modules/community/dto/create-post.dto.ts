import {
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  MaxLength,
  ArrayMaxSize,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiPropertyOptional({ description: '帖子标题' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiProperty({ description: '帖子内容' })
  @IsString()
  @MaxLength(5000)
  content!: string;

  @ApiProperty({ description: '图片URL列表', type: [String] })
  @IsArray()
  @ArrayMaxSize(9)
  @IsUrl({ require_protocol: true }, { each: true })
  image_urls!: string[];

  @ApiPropertyOptional({ description: '标签', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  tags?: string[];

  @ApiPropertyOptional({ description: '关联搭配ID' })
  @IsOptional()
  @IsUUID()
  outfit_id?: string;
}
