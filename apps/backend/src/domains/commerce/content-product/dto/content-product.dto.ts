import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsString, IsOptional, IsIn } from "class-validator";

export enum ContentProductTypeEnum {
  COLOR_REPORT = "color_report",
  BODY_REPORT = "body_report",
  CAPSULE_WARDROBE = "capsule_wardrobe",
}

export class PurchaseContentDto {
  @ApiProperty({
    description: "Content product type",
    enum: ContentProductTypeEnum,
    example: ContentProductTypeEnum.COLOR_REPORT,
  })
  @IsEnum(ContentProductTypeEnum)
  productType!: ContentProductTypeEnum;

  @ApiProperty({
    description: "Payment provider",
    example: "alipay",
  })
  @IsString()
  @IsIn(["alipay", "wechat"])
  provider!: "alipay" | "wechat";

  @ApiPropertyOptional({ description: "Payment method" })
  @IsOptional()
  @IsString()
  method?: string;
}

export interface ContentProductInfo {
  productType: string;
  name: string;
  description: string;
  price: number;
  currency: string;
}

export interface CheckPurchasedResult {
  purchased: boolean;
  unlockedAt?: Date;
}

export interface PurchaseResult {
  success: boolean;
  orderId: string;
  qrCode?: string;
  expireAt?: Date;
}
