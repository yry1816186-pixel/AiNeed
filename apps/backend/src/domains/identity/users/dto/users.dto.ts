/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Gender } from '../../../../types/prisma-enums';
import {
  IsOptional,
  IsString,
  IsEnum,
  MaxLength,
  MinLength,
} from "class-validator";

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: "用户昵称",
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickname?: string;

  @ApiPropertyOptional({
    description: "性别",
    enum: Gender,
  })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({
    description: "出生日期",
    format: "date",
  })
  @IsOptional()
  @IsString()
  birthDate?: string;
}

export class ChangePasswordDto {
  @ApiProperty({
    description: "当前密码",
  })
  @IsString()
  @MinLength(6)
  currentPassword!: string;

  @ApiProperty({
    description: "新密码",
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  newPassword!: string;
}

export class UpdateAvatarDto {
  @ApiProperty({
    description: "头像 URL",
  })
  @IsString()
  avatarUrl!: string;
}

export class UserResponseDto {
  @ApiProperty({
    description: "用户 ID",
    format: "uuid",
  })
  id!: string;

  @ApiProperty({
    description: "邮箱",
  })
  email!: string;

  @ApiPropertyOptional({
    description: "手机号",
  })
  phone?: string;

  @ApiPropertyOptional({
    description: "昵称",
  })
  nickname?: string;

  @ApiPropertyOptional({
    description: "头像 URL",
  })
  avatar?: string;

  @ApiPropertyOptional({
    description: "性别",
    enum: Gender,
  })
  gender?: Gender;

  @ApiPropertyOptional({
    description: "出生日期",
  })
  birthDate?: Date;

  @ApiProperty({
    description: "是否激活",
  })
  isActive!: boolean;

  @ApiProperty({
    description: "创建时间",
  })
  createdAt!: Date;
}

export class UserPublicResponseDto {
  @ApiProperty({
    description: "用户 ID",
    format: "uuid",
  })
  id!: string;

  @ApiPropertyOptional({
    description: "昵称",
  })
  nickname?: string;

  @ApiPropertyOptional({
    description: "头像 URL",
  })
  avatar?: string;

  @ApiPropertyOptional({
    description: "粉丝数",
  })
  followerCount?: number;
}

export class UserStatsResponseDto {
  @ApiProperty({
    description: "用户 ID",
    format: "uuid",
  })
  userId!: string;

  @ApiProperty({
    description: "收藏数量",
  })
  favoriteCount!: number;

  @ApiProperty({
    description: "试衣数量",
  })
  tryOnCount!: number;

  @ApiProperty({
    description: "穿搭数量",
  })
  outfitCount!: number;

  @ApiProperty({
    description: "粉丝数量",
  })
  followerCount!: number;
}
