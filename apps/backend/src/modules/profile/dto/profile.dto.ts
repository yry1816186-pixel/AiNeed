import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  BodyType,
  SkinTone,
  FaceShape,
  ColorSeason,
  Gender,
} from "@prisma/client";
import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  IsDate,
  Min,
  Max,
  IsObject,
  MaxLength,
} from "class-validator";
import { Type } from "class-transformer";

/**
 * 形象档案详情 DTO
 */
export class ProfileDetailDto {
  @ApiPropertyOptional({ description: "体型", enum: BodyType })
  bodyType?: BodyType;

  @ApiPropertyOptional({ description: "肤色", enum: SkinTone })
  skinTone?: SkinTone;

  @ApiPropertyOptional({ description: "脸型", enum: FaceShape })
  faceShape?: FaceShape;

  @ApiPropertyOptional({ description: "色彩季节", enum: ColorSeason })
  colorSeason?: ColorSeason;

  @ApiPropertyOptional({ description: "身高（厘米）" })
  height?: number;

  @ApiPropertyOptional({ description: "体重（公斤）" })
  weight?: number;

  @ApiPropertyOptional({ description: "肩宽（厘米）" })
  shoulder?: number;

  @ApiPropertyOptional({ description: "胸围（厘米）" })
  bust?: number;

  @ApiPropertyOptional({ description: "腰围（厘米）" })
  waist?: number;

  @ApiPropertyOptional({ description: "臀围（厘米）" })
  hip?: number;

  @ApiPropertyOptional({ description: "内缝长（厘米）" })
  inseam?: number;

  @ApiPropertyOptional({ description: "风格偏好" })
  stylePreferences?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "颜色偏好" })
  colorPreferences?: Record<string, unknown>;
}

/**
 * 更新用户形象档案 DTO
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: "用户昵称",
    example: "张三",
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: "昵称必须是字符串" })
  @MaxLength(50, { message: "昵称长度不能超过50个字符" })
  nickname?: string;

  @ApiPropertyOptional({
    description: "用户头像 URL",
    example: "https://example.com/avatar.jpg",
  })
  @IsOptional()
  @IsString({ message: "头像 URL 必须是字符串" })
  avatar?: string;

  @ApiPropertyOptional({
    description: "性别",
    enum: Gender,
    example: 'male',
  })
  @IsOptional()
  @IsEnum(Gender, { message: "性别必须是有效的 Gender 枚举值" })
  gender?: Gender;

  @ApiPropertyOptional({
    description: "出生日期",
    example: "1990-01-01",
    format: "date",
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: "出生日期必须是有效的日期" })
  birthDate?: Date;

  @ApiPropertyOptional({
    description: "身高（厘米）",
    example: 175,
    minimum: 50,
    maximum: 250,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "身高必须是数字" })
  @Min(50, { message: "身高不能低于50厘米" })
  @Max(250, { message: "身高不能超过250厘米" })
  height?: number;

  @ApiPropertyOptional({
    description: "体重（公斤）",
    example: 70,
    minimum: 20,
    maximum: 300,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "体重必须是数字" })
  @Min(20, { message: "体重不能低于20公斤" })
  @Max(300, { message: "体重不能超过300公斤" })
  weight?: number;

  @ApiPropertyOptional({
    description: "肩宽（厘米）",
    example: 42,
    minimum: 20,
    maximum: 80,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "肩宽必须是数字" })
  shoulder?: number;

  @ApiPropertyOptional({
    description: "胸围（厘米）",
    example: 90,
    minimum: 40,
    maximum: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "胸围必须是数字" })
  bust?: number;

  @ApiPropertyOptional({
    description: "腰围（厘米）",
    example: 75,
    minimum: 30,
    maximum: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "腰围必须是数字" })
  waist?: number;

  @ApiPropertyOptional({
    description: "臀围（厘米）",
    example: 95,
    minimum: 40,
    maximum: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "臀围必须是数字" })
  hip?: number;

  @ApiPropertyOptional({
    description: "内缝长（厘米）",
    example: 80,
    minimum: 30,
    maximum: 120,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "内缝长必须是数字" })
  inseam?: number;

  @ApiPropertyOptional({
    description: "体型类型",
    enum: BodyType,
    example: BodyType.rectangle,
  })
  @IsOptional()
  @IsEnum(BodyType, { message: "体型必须是有效的 BodyType 枚举值" })
  bodyType?: BodyType;

  @ApiPropertyOptional({
    description: "肤色",
    enum: SkinTone,
    example: SkinTone.medium,
  })
  @IsOptional()
  @IsEnum(SkinTone, { message: "肤色必须是有效的 SkinTone 枚举值" })
  skinTone?: SkinTone;

  @ApiPropertyOptional({
    description: "脸型",
    enum: FaceShape,
    example: FaceShape.oval,
  })
  @IsOptional()
  @IsEnum(FaceShape, { message: "脸型必须是有效的 FaceShape 枚举值" })
  faceShape?: FaceShape;

  @ApiPropertyOptional({
    description: "色彩季节",
    enum: ColorSeason,
    example: ColorSeason.autumn_warm,
  })
  @IsOptional()
  @IsEnum(ColorSeason, { message: "色彩季节必须是有效的 ColorSeason 枚举值" })
  colorSeason?: ColorSeason;

  @ApiPropertyOptional({
    description: "风格偏好",
    example: ["casual", "business", "minimalist"],
  })
  @IsOptional()
  @IsObject({ message: "风格偏好必须是一个对象" })
  stylePreferences?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: "颜色偏好",
    example: ["black", "white", "blue"],
  })
  @IsOptional()
  @IsObject({ message: "颜色偏好必须是一个对象" })
  colorPreferences?: Record<string, unknown>;
}

/**
 * 用户形象档案响应 DTO
 */
export class UserProfileResponseDto {
  @ApiProperty({ description: "用户 ID" })
  id!: string;

  @ApiProperty({ description: "邮箱" })
  email!: string;

  @ApiPropertyOptional({ description: "手机号" })
  phone?: string;

  @ApiPropertyOptional({ description: "昵称" })
  nickname?: string;

  @ApiPropertyOptional({ description: "头像 URL" })
  avatar?: string;

  @ApiPropertyOptional({ description: "性别", enum: Gender })
  gender?: Gender;

  @ApiPropertyOptional({ description: "出生日期" })
  birthDate?: Date;

  @ApiProperty({ description: "创建时间" })
  createdAt!: Date;

  @ApiPropertyOptional({
    description: "形象档案详情",
    type: () => ProfileDetailDto,
  })
  profile?: ProfileDetailDto;
}

/**
 * 体型分析结果 DTO
 */
export class BodyAnalysisResultDto {
  @ApiPropertyOptional({ description: "体型类型", enum: BodyType })
  bodyType?: BodyType;

  @ApiProperty({ description: "体型名称" })
  bodyTypeName!: string;

  @ApiProperty({ description: "体型描述" })
  description!: string;

  @ApiProperty({ description: "穿搭建议", type: [Object] })
  recommendations!: Array<{
    category: string;
    advice: string;
    examples: string[];
  }>;

  @ApiProperty({ description: "适合风格", type: [String] })
  idealStyles!: string[];

  @ApiProperty({ description: "避免风格", type: [String] })
  avoidStyles!: string[];
}

/**
 * 色彩分析结果 DTO
 */
export class ColorAnalysisResultDto {
  @ApiPropertyOptional({ description: "色彩季节", enum: ColorSeason })
  colorSeason?: ColorSeason;

  @ApiProperty({ description: "色彩季节名称" })
  colorSeasonName!: string;

  @ApiProperty({ description: "最佳颜色", type: [String] })
  bestColors!: string[];

  @ApiProperty({ description: "中性颜色", type: [String] })
  neutralColors!: string[];

  @ApiProperty({ description: "避免颜色", type: [String] })
  avoidColors!: string[];

  @ApiProperty({ description: "金属偏好" })
  metalPreference!: string;
}

/**
 * 更新风格偏好 DTO
 */
export class UpdateStylePreferencesDto {
  @ApiProperty({
    description: "风格偏好列表",
    type: [String],
    example: ["casual", "business", "minimalist"],
  })
  styles!: string[];
}

/**
 * 更新颜色偏好 DTO
 */
export class UpdateColorPreferencesDto {
  @ApiProperty({
    description: "颜色偏好列表",
    type: [String],
    example: ["black", "white", "blue"],
  })
  colors!: string[];
}

/**
 * 更新价格区间 DTO
 */
export class UpdatePriceRangeDto {
  @ApiPropertyOptional({
    description: "最低价格",
    example: 100,
    nullable: true,
  })
  min?: number | null;

  @ApiPropertyOptional({
    description: "最高价格",
    example: 1000,
    nullable: true,
  })
  max?: number | null;
}

/**
 * 用户偏好设置响应 DTO
 */
export class UserPreferencesResponseDto {
  @ApiProperty({ description: "风格偏好", type: [String] })
  styles!: string[];

  @ApiProperty({ description: "颜色偏好", type: [String] })
  colors!: string[];

  @ApiProperty({
    description: "价格区间",
    type: () => Object,
  })
  priceRange!: { min: number | null; max: number | null };

  @ApiProperty({ description: "行为偏好" })
  behaviorPreferences!: Record<string, unknown>;
}
