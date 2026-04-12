import { applyDecorators, Type } from '@nestjs/common';
import { ApiOkResponse, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
import { ResponseMeta } from '../types/api.types';

class PaginatedMetaDto implements ResponseMeta {
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

interface PaginatedDecoratorOptions<T> {
  model: Type<T>;
  description?: string;
}

export function ApiPaginatedResponse<T>(options: PaginatedDecoratorOptions<T>) {
  return applyDecorators(
    ApiExtraModels(PaginatedMetaDto, options.model),
    ApiOkResponse({
      description: options.description ?? '分页响应',
      schema: {
        allOf: [
          {
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(options.model) },
              },
              meta: { $ref: getSchemaPath(PaginatedMetaDto) },
            },
          },
        ],
      },
    }),
  );
}
