import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUrl } from 'class-validator';

class BodyProfileResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiPropertyOptional() bodyType?: string;
  @ApiPropertyOptional() colorSeason?: string;
  @ApiPropertyOptional() measurements?: Record<string, unknown>;
  @ApiPropertyOptional() analysisResult?: Record<string, unknown>;
  @ApiPropertyOptional() sourceImageUrl?: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

class StylePreferenceResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() styleTags!: string[];
  @ApiProperty() occasionTags!: string[];
  @ApiProperty() colorPreferences!: string[];
  @ApiPropertyOptional() budgetRange?: string;
  @ApiProperty() createdAt!: string;
}

export class UserResponseDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional() phone?: string;
  @ApiPropertyOptional() email?: string;
  @ApiPropertyOptional() nickname?: string;
  @ApiPropertyOptional() avatarUrl?: string;
  @ApiPropertyOptional() gender?: string;
  @ApiPropertyOptional() birthYear?: number;
  @ApiPropertyOptional() height?: number;
  @ApiPropertyOptional() weight?: number;
  @ApiPropertyOptional() bodyType?: string;
  @ApiPropertyOptional() colorSeason?: string;
  @ApiProperty() role!: string;
  @ApiProperty() language!: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
  @ApiPropertyOptional({ type: BodyProfileResponseDto })
  bodyProfile?: BodyProfileResponseDto | null;
  @ApiPropertyOptional({ type: [StylePreferenceResponseDto] })
  stylePreferences?: StylePreferenceResponseDto[];
}

export class UpdateAvatarDto {
  @ApiProperty({ description: '头像图片URL' })
  @IsUrl()
  avatarUrl!: string;
}
