import {
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClothingDto {
  @ApiProperty({ description: '服装名称', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  name!: string;

  @ApiPropertyOptional({ description: '品牌ID' })
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional({ description: '分类ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '价格' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: '原价' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  originalPrice?: number;

  @ApiPropertyOptional({ description: '货币', default: 'CNY' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ description: '性别', enum: ['male', 'female', 'unisex'] })
  @IsOptional()
  @IsEnum(['male', 'female', 'unisex'])
  gender?: string;

  @ApiPropertyOptional({ description: '季节标签', example: ['spring', 'summer'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  seasons?: string[];

  @ApiPropertyOptional({ description: '场合标签', example: ['work', 'casual'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  occasions?: string[];

  @ApiPropertyOptional({ description: '风格标签', example: ['casual', 'streetwear'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  styleTags?: string[];

  @ApiPropertyOptional({ description: '颜色', example: ['black', 'white'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  colors?: string[];

  @ApiPropertyOptional({ description: '材质', example: ['cotton', 'polyester'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  materials?: string[];

  @ApiPropertyOptional({ description: '版型', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  fitType?: string;

  @ApiPropertyOptional({ description: '图片URL列表', example: ['https://example.com/img.jpg'] })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  imageUrls?: string[];

  @ApiPropertyOptional({ description: '来源URL' })
  @IsOptional()
  @IsUrl()
  sourceUrl?: string;

  @ApiPropertyOptional({ description: '购买链接' })
  @IsOptional()
  @IsUrl()
  purchaseUrl?: string;

  @ApiPropertyOptional({ description: '来源名称', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sourceName?: string;

  @ApiPropertyOptional({ description: '是否上架', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
