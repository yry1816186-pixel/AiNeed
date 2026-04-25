import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional } from "class-validator";

export class RecordReferralDto {
  @ApiProperty({ description: "Studio ID (maps to ConsultantProfile.id)" })
  @IsString()
  studioId!: string;

  @ApiProperty({ description: "Referral source", example: "chat_recommend" })
  @IsString()
  source!: string;
}

export class GetCommissionBillsDto {
  @ApiPropertyOptional({ description: "Filter by studio ID" })
  @IsOptional()
  @IsString()
  studioId?: string;

  @ApiPropertyOptional({ description: "Filter by period (YYYY-MM)" })
  @IsOptional()
  @IsString()
  period?: string;
}

export interface GenerateBillResult {
  id: string;
  studioId: string;
  period: string;
  totalReferrals: number;
  convertedOrders: number;
  totalOrderAmount: number;
  commissionRate: number;
  commissionAmount: number;
}
