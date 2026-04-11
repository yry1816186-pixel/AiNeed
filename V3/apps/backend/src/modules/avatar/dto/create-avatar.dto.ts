import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  ValidateNested,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

class AvatarParamsDto {
  @ApiPropertyOptional({ description: '脸型值', type: Number, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  face_shape?: number;

  @ApiPropertyOptional({ description: '眼型标识' })
  @IsOptional()
  @IsString()
  eye_type?: string;

  @ApiPropertyOptional({ description: '肤色色值' })
  @IsOptional()
  @IsString()
  skin_tone?: string;

  @ApiPropertyOptional({ description: '发型ID' })
  @IsOptional()
  @IsString()
  hair_id?: string;

  @ApiPropertyOptional({ description: '配饰列表', type: [String] })
  @IsOptional()
  @IsString({ each: true })
  accessories?: string[];
}

export class CreateAvatarDto {
  @ApiProperty({ description: '形象模板ID', format: 'uuid' })
  @IsUUID()
  template_id!: string;

  @ApiProperty({ description: '形象参数', type: AvatarParamsDto })
  @ValidateNested()
  @Type(() => AvatarParamsDto)
  avatar_params!: AvatarParamsDto;
}
