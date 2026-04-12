import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterDto {
  @ApiPropertyOptional({
    description: '过滤条件(JSON字符串)',
    example: '{"gender":"male","price_gte":100}',
  })
  @IsOptional()
  @IsString()
  filters?: string;
}
