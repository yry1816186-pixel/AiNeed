import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class UpdateAvatarParamsDto {
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
}

export class UpdateAvatarDto {
  @ApiPropertyOptional({ description: '形象参数(部分更新)', type: UpdateAvatarParamsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateAvatarParamsDto)
  avatar_params?: UpdateAvatarParamsDto;
}
