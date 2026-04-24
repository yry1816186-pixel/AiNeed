import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsIn, MaxLength } from "class-validator";

export class ReviewConsultantProfileDto {
  @ApiProperty({ description: "审核状态", enum: ["active", "rejected"] })
  @IsIn(["active", "rejected"])
  status!: "active" | "rejected";

  @ApiPropertyOptional({ description: "拒绝原因，状态为 rejected 时必填" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  rejectReason?: string;
}
