import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ErrorResponseDto {
  @ApiProperty({
    description: "是否成功",
    example: false,
  })
  success!: boolean;

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

  @ApiProperty({
    description: "HTTP 状态码",
    example: 400,
  })
  statusCode!: number;

  @ApiPropertyOptional({
    description: "请求路径",
    example: "/api/v1/auth/register",
  })
  path?: string;

  @ApiPropertyOptional({
    description: "错误时间戳",
    example: "2026-04-14T12:00:00.000Z",
  })
  timestamp?: string;
}

export class ValidationErrorDto extends ErrorResponseDto {
  code = "VALIDATION_ERROR" as const;
  message = "请求参数验证失败" as const;
  statusCode = 400 as const;

  @ApiProperty({
    description: "验证错误字段列表",
    example: [
      { field: "email", message: "邮箱格式不正确" },
      { field: "password", message: "密码必须包含大小写字母和数字" },
    ],
    isArray: true,
  })
  errors!: Array<{ field: string; message: string }>;
}

export class UnauthorizedErrorDto extends ErrorResponseDto {
  code = "UNAUTHORIZED" as const;
  message = "未授权，请提供有效的认证凭据" as const;
  statusCode = 401 as const;
}

export class ForbiddenErrorDto extends ErrorResponseDto {
  code = "FORBIDDEN" as const;
  message = "无权访问该资源" as const;
  statusCode = 403 as const;
}

export class NotFoundErrorDto extends ErrorResponseDto {
  code = "NOT_FOUND" as const;
  message = "请求的资源不存在" as const;
  statusCode = 404 as const;
}

export class ConflictErrorDto extends ErrorResponseDto {
  code = "CONFLICT" as const;
  message = "资源冲突" as const;
  statusCode = 409 as const;
}

export class TooManyRequestsErrorDto extends ErrorResponseDto {
  code = "TOO_MANY_REQUESTS" as const;
  message = "请求过于频繁，请稍后再试" as const;
  statusCode = 429 as const;

  @ApiPropertyOptional({
    description: "重试等待时间（秒）",
    example: 60,
  })
  retryAfter?: number;
}

export class InternalServerErrorDto extends ErrorResponseDto {
  code = "INTERNAL_SERVER_ERROR" as const;
  message = "服务器内部错误" as const;
  statusCode = 500 as const;

  @ApiPropertyOptional({
    description: "请求追踪ID，用于排查问题",
    example: "req-abc123def456",
  })
  traceId?: string;
}
