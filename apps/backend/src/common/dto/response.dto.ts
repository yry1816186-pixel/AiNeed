import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * 统一 API 响应 DTO
 *
 * @template T - 数据负载类型
 */
export class ApiResponseDto<T> {
  @ApiProperty({
    description: "是否成功",
    example: true,
  })
  success!: boolean;

  @ApiPropertyOptional({
    description: "响应数据负载",
  })
  data?: T;

  @ApiPropertyOptional({
    description: "错误信息（当 success 为 false 时）",
    type: () => ErrorDetailDto,
  })
  error?: ErrorDetailDto;

  @ApiPropertyOptional({
    description: "附加消息或描述",
    example: "操作成功",
  })
  message?: string;

  @ApiPropertyOptional({
    description: "响应时间戳",
    example: "2026-04-01T12:00:00.000Z",
  })
  timestamp?: string;

  @ApiPropertyOptional({
    description: "请求路径",
    example: "/api/v1/users/profile",
  })
  path?: string;
}

/**
 * 错误详情 DTO
 */
export class ErrorDetailDto {
  @ApiProperty({
    description: "错误代码",
    example: "VALIDATION_ERROR",
  })
  code!: string;

  @ApiProperty({
    description: "人类可读的错误消息",
    example: "请求参数验证失败",
  })
  message!: string;

  @ApiPropertyOptional({
    description: "附加错误详情",
    example: { field: "email", constraint: "isEmail" },
  })
  details?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: "HTTP 状态码",
    example: 400,
  })
  statusCode?: number;
}

/**
 * 分页响应 DTO
 *
 * @template T - 数据项类型
 */
export class PagedResponseDto<T> {
  @ApiProperty({
    description: "当前页数据项数组",
    isArray: true,
  })
  items!: T[];

  @ApiProperty({
    description: "总记录数",
    example: 100,
  })
  total!: number;

  @ApiProperty({
    description: "当前页码（从 1 开始）",
    example: 1,
  })
  page!: number;

  @ApiProperty({
    description: "每页数量",
    example: 20,
  })
  pageSize!: number;

  @ApiProperty({
    description: "是否还有更多数据",
    example: true,
  })
  hasMore!: boolean;

  @ApiPropertyOptional({
    description: "总页数",
    example: 5,
  })
  totalPages?: number;
}

/**
 * 简单成功响应 DTO
 */
export class SuccessResponseDto {
  @ApiProperty({
    description: "是否成功",
    example: true,
  })
  success!: boolean;

  @ApiPropertyOptional({
    description: "消息",
    example: "操作成功",
  })
  message?: string;
}

/**
 * ID 响应 DTO
 */
export class IdResponseDto {
  @ApiProperty({
    description: "资源 ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  id!: string;
}

/**
 * 创建响应 DTO（包含 ID）
 */
export class CreatedResponseDto extends IdResponseDto {
  @ApiProperty({
    description: "创建时间",
    example: "2026-04-01T12:00:00.000Z",
  })
  createdAt!: Date;
}

/**
 * 更新响应 DTO
 */
export class UpdatedResponseDto {
  @ApiProperty({
    description: "是否成功",
    example: true,
  })
  success!: boolean;

  @ApiPropertyOptional({
    description: "更新时间",
    example: "2026-04-01T12:00:00.000Z",
  })
  updatedAt?: Date;
}

/**
 * 删除响应 DTO
 */
export class DeletedResponseDto {
  @ApiProperty({
    description: "是否成功",
    example: true,
  })
  success!: boolean;

  @ApiPropertyOptional({
    description: "删除时间",
    example: "2026-04-01T12:00:00.000Z",
  })
  deletedAt?: Date;
}
