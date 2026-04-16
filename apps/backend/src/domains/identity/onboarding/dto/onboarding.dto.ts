/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from "class-validator";

const GenderValues = ["male", "female", "other"] as const;
const AgeRangeValues = ["under_18", "18_24", "25_34", "35_44", "45_54", "55_plus"] as const;
const SkipStepValues = ["PHOTO", "STYLE_TEST"] as const;
const OnboardingStepValues = ["BASIC_INFO", "PHOTO", "STYLE_TEST"] as const;
const StepStatusValues = ["pending", "completed", "skipped", "current"] as const;

export class CompleteBasicInfoDto {
  @ApiProperty({
    enum: GenderValues,
    description: "性别：male-男性，female-女性，other-其他",
    example: "male",
  })
  @IsString({ message: "性别必须是字符串" })
  @IsNotEmpty({ message: "性别不能为空" })
  @IsIn(GenderValues, { message: "性别必须是 male、female 或 other" })
  gender!: string;

  @ApiProperty({
    enum: AgeRangeValues,
    description: "年龄段",
    example: "25_34",
  })
  @IsString({ message: "年龄段必须是字符串" })
  @IsNotEmpty({ message: "年龄段不能为空" })
  @IsIn(AgeRangeValues, { message: "年龄段必须是 under_18、18_24、25_34、35_44、45_54 或 55_plus" })
  ageRange!: string;

  @ApiPropertyOptional({
    description: "身高(cm)",
    example: 170,
    minimum: 100,
    maximum: 250,
  })
  @IsOptional()
  @IsNumber({}, { message: "身高必须是数字" })
  @Min(100, { message: "身高不能低于100cm" })
  @Max(250, { message: "身高不能超过250cm" })
  height?: number;

  @ApiPropertyOptional({
    description: "体重(kg)",
    example: 65,
    minimum: 30,
    maximum: 300,
  })
  @IsOptional()
  @IsNumber({}, { message: "体重必须是数字" })
  @Min(30, { message: "体重不能低于30kg" })
  @Max(300, { message: "体重不能超过300kg" })
  weight?: number;
}

export class SkipStepDto {
  @ApiProperty({
    enum: SkipStepValues,
    description: "要跳过的步骤（BASIC_INFO 不可跳过）",
    example: "PHOTO",
  })
  @IsString({ message: "步骤必须是字符串" })
  @IsNotEmpty({ message: "步骤不能为空" })
  @IsIn(SkipStepValues, { message: "步骤必须是 PHOTO 或 STYLE_TEST" })
  step!: string;
}

export class OnboardingStateDto {
  @ApiProperty({
    description: "当前步骤",
    example: "PHOTO",
  })
  currentStep!: string;

  @ApiProperty({
    description: "已完成的步骤",
    example: ["BASIC_INFO"],
    type: [String],
  })
  completedSteps!: string[];
}

export class OnboardingProgressDto {
  @ApiProperty({
    description: "完成百分比",
    example: 33,
    minimum: 0,
    maximum: 100,
  })
  percentage!: number;

  @ApiProperty({
    description: "各步骤状态",
    type: "array",
    example: [
      { step: "BASIC_INFO", status: "completed" },
      { step: "PHOTO", status: "current" },
      { step: "STYLE_TEST", status: "pending" },
    ],
  })
  steps!: { step: string; status: "pending" | "completed" | "skipped" | "current" }[];
}
