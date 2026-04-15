import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsBoolean, IsOptional, IsIn } from "class-validator";

export class RecordConsentDto {
  @ApiProperty({ description: "同意类型，如 terms_of_service, privacy_policy, marketing 等", example: "privacy_policy" })
  @IsString()
  consentType!: string;

  @ApiProperty({ description: "是否同意", example: true })
  @IsBoolean()
  granted!: boolean;
}

export class ExportDataDto {
  @ApiPropertyOptional({ description: "导出格式", example: "json", enum: ["json", "csv"] })
  @IsOptional()
  @IsIn(["json", "csv"])
  format?: "json" | "csv";
}

export class DeleteAccountDto {
  @ApiPropertyOptional({ description: "删除原因", example: "不再使用该服务" })
  @IsOptional()
  @IsString()
  reason?: string;
}
