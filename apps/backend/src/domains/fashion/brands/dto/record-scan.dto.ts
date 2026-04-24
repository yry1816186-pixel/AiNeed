import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional } from "class-validator";

export class RecordScanDto {
  @ApiPropertyOptional({ description: "用户ID，已登录用户可自动导入衣橱" })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: "扫码平台" })
  @IsOptional()
  @IsString()
  platform?: string;
}
