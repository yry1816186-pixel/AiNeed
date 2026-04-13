import { IsString, IsOptional, IsEnum, IsNumber, Min, Max } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class AdminPaginationDto {
  @ApiPropertyOptional({ description: "页码", default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "每页数量", default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

export class AdminPostQueryDto extends AdminPaginationDto {
  @ApiPropertyOptional({ description: "帖子状态" })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: "审核状态", enum: ["pending", "approved", "rejected"] })
  @IsOptional()
  @IsEnum(["pending", "approved", "rejected"])
  moderationStatus?: string;
}

export class AdminReportQueryDto extends AdminPaginationDto {
  @ApiPropertyOptional({ description: "举报状态", enum: ["pending", "resolved", "rejected"] })
  @IsOptional()
  @IsEnum(["pending", "resolved", "rejected"])
  status?: string;

  @ApiPropertyOptional({ description: "内容类型", example: "post" })
  @IsOptional()
  @IsString()
  contentType?: string;
}

export class ModeratePostDto {
  @ApiPropertyOptional({ description: "审核动作", enum: ["approve", "reject"] })
  @IsEnum(["approve", "reject"])
  action!: "approve" | "reject";

  @ApiPropertyOptional({ description: "审核备注" })
  @IsOptional()
  @IsString()
  note?: string;
}

export class HandleReportDto {
  @ApiPropertyOptional({ description: "处理动作", enum: ["resolve", "reject"] })
  @IsEnum(["resolve", "reject"])
  action!: "resolve" | "reject";

  @ApiPropertyOptional({ description: "处理备注" })
  @IsOptional()
  @IsString()
  note?: string;
}
