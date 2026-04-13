import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class CursorPaginationDto {
  @ApiPropertyOptional({
    description: "Cursor for pagination (Base64URL encoded)",
    example:
      "eyJzb3J0RmllbGQiOiJjcmVhdGVkQXQiLCJsYXN0VmFsdWUiOiIyMDI2LTA0LTAxVDEyOjAwOjAwLjAwMFoiLCJkaXJlY3Rpb24iOiJkZXNjIn0",
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: "Number of items per page",
    default: 20,
    minimum: 1,
    maximum: 100,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: "Sort field",
    default: "createdAt",
    example: "createdAt",
  })
  @IsOptional()
  @IsString()
  sort?: string = "createdAt";

  @ApiPropertyOptional({
    description: "Sort direction",
    default: "desc",
    enum: ["asc", "desc"],
  })
  @IsOptional()
  @IsEnum(["asc", "desc"])
  order?: "asc" | "desc" = "desc";
}
