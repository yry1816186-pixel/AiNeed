import { applyDecorators } from '@nestjs/common';
import { ApiUnauthorizedResponse, ApiBearerAuth } from '@nestjs/swagger';

export function ApiAuth() {
  return applyDecorators(
    ApiBearerAuth('bearer'),
    ApiUnauthorizedResponse({
      description: '未认证 - 缺少或无效的 JWT Token',
      schema: {
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'AUTH_INVALID_TOKEN' },
              message: { type: 'string', example: '无效的认证令牌' },
            },
          },
        },
      },
    }),
  );
}
