import { IsUUID, IsString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddOutfitItemDto {
  @ApiProperty({ description: '服装ID' })
  @IsUUID()
  clothing_id!: string;

  @ApiPropertyOptional({ description: '搭配槽位(如top, bottom, shoes等)' })
  @IsOptional()
  @IsString()
  slot?: string;

  @ApiPropertyOptional({ description: '排序顺序' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;
}
