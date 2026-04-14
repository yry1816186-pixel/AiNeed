import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum RefundTypeDto {
  REFUND_ONLY = "REFUND_ONLY",
  RETURN_REFUND = "RETURN_REFUND",
}

export class CreateRefundRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @ApiProperty({ enum: RefundTypeDto })
  @IsEnum(RefundTypeDto)
  type!: RefundTypeDto;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];
}

export class AddTrackingNumberDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  trackingNumber!: string;
}

export class ApproveRefundDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  adminNote?: string;
}

export class RejectRefundDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  adminNote!: string;
}
