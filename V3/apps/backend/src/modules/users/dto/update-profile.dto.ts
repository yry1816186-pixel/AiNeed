import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsUrl,
  IsIn,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: '昵称', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickname?: string;

  @ApiPropertyOptional({ description: '头像URL' })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiPropertyOptional({ description: '性别', enum: ['male', 'female', 'other'] })
  @IsOptional()
  @IsString()
  @IsIn(['male', 'female', 'other'])
  gender?: string;

  @ApiPropertyOptional({ description: '出生年份', minimum: 1900, maximum: 2030 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2030)
  birthYear?: number;

  @ApiPropertyOptional({ description: '身高(cm)', minimum: 50, maximum: 300 })
  @IsOptional()
  @IsInt()
  @Min(50)
  @Max(300)
  height?: number;

  @ApiPropertyOptional({ description: '体重(kg)', minimum: 20, maximum: 500 })
  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(500)
  weight?: number;

  @ApiPropertyOptional({ description: '体型', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  bodyType?: string;

  @ApiPropertyOptional({ description: '色彩季型', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  colorSeason?: string;
}
