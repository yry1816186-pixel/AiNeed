import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsDateString,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AdminUserQueryDto {
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

  @ApiPropertyOptional({ description: "搜索关键词 (email/nickname)" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: "用户角色",
    enum: ["user", "admin", "superadmin", "ops", "customer_service", "reviewer"],
  })
  @IsOptional()
  @IsEnum(["user", "admin", "superadmin", "ops", "customer_service", "reviewer"])
  role?: string;

  @ApiPropertyOptional({ description: "状态", enum: ["active", "banned"] })
  @IsOptional()
  @IsEnum(["active", "banned"])
  status?: string;

  @ApiPropertyOptional({ description: "排序字段" })
  @IsOptional()
  @IsString()
  sortBy?: string = "createdAt";

  @ApiPropertyOptional({ description: "排序方向", enum: ["asc", "desc"] })
  @IsOptional()
  @IsEnum(["asc", "desc"])
  sortOrder?: "asc" | "desc" = "desc";
}

export class AdminUserBanDto {
  @ApiProperty({ description: "封禁原因" })
  @IsString()
  reason!: string;

  @ApiPropertyOptional({ description: "封禁时长 (天), 不填为永久" })
  @IsOptional()
  @IsNumber()
  @Min(1)
  duration?: number;
}

export class AdminUserUpdateDto {
  @ApiPropertyOptional({
    description: "用户角色",
    enum: ["user", "admin", "superadmin", "ops", "customer_service", "reviewer"],
  })
  @IsOptional()
  @IsEnum(["user", "admin", "superadmin", "ops", "customer_service", "reviewer"])
  role?: string;
}

export class AdminUserExportDto {
  @ApiPropertyOptional({ description: "起始日期" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: "结束日期" })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: "用户角色筛选" })
  @IsOptional()
  @IsString()
  role?: string;
}
