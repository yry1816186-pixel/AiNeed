import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsArray, IsEnum, IsNumber, MaxLength } from "class-validator";

import { CustomizationType } from "../../../../types/prisma-enums";

export class CreateCustomizationRequestDto {
  @ApiProperty({ description: "定制类型", enum: CustomizationType })
  @IsEnum(CustomizationType)
  type!: CustomizationType;

  @ApiPropertyOptional({ description: "定制需求标题" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiProperty({ description: "定制需求详细描述" })
  @IsString()
  @MaxLength(5000)
  description!: string;

  @ApiPropertyOptional({ description: "参考图片URL列表", type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  referenceImages?: string[];

  @ApiPropertyOptional({ description: "定制偏好设置" })
  @IsOptional()
  preferences?: Record<string, any>;
}

export class UpdateCustomizationRequestDto {
  @ApiPropertyOptional({ description: "定制需求标题" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: "定制需求详细描述" })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ description: "参考图片URL列表", type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  referenceImages?: string[];

  @ApiPropertyOptional({ description: "定制偏好设置" })
  @IsOptional()
  preferences?: Record<string, any>;
}

export class SelectQuoteDto {
  @ApiProperty({ description: "报价ID", format: "uuid" })
  @IsString()
  quoteId!: string;
}

export class PayCustomizationDto {
  @ApiProperty({ description: "支付方式 (alipay/wechat)" })
  @IsString()
  paymentMethod!: string;
}
