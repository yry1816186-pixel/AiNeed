import {
  IsNumber,
  IsOptional,
  IsString,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AnalyzeBodyDto {
  @ApiProperty({ description: '身高(cm)', minimum: 100, maximum: 250 })
  @IsNumber()
  @Min(100)
  @Max(250)
  height: number;

  @ApiProperty({ description: '体重(kg)', minimum: 30, maximum: 300 })
  @IsNumber()
  @Min(30)
  @Max(300)
  weight: number;

  @ApiPropertyOptional({ description: '肩宽(cm)', minimum: 20, maximum: 80 })
  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(80)
  shoulder_width?: number;

  @ApiPropertyOptional({ description: '腰围(cm)', minimum: 40, maximum: 200 })
  @IsOptional()
  @IsNumber()
  @Min(40)
  @Max(200)
  waist?: number;

  @ApiPropertyOptional({ description: '臀围(cm)', minimum: 50, maximum: 200 })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(200)
  hip?: number;

  @ApiProperty({ description: '性别', enum: ['male', 'female', 'other'] })
  @IsString()
  @IsIn(['male', 'female', 'other'])
  gender: 'male' | 'female' | 'other';
}
