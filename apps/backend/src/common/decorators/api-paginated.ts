import { applyDecorators } from "@nestjs/common";
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiQuery,
  getSchemaPath,
} from "@nestjs/swagger";

import { PaginatedMetaDto, PaginatedResponseDto } from "../dto/paginated-response.dto";

export function ApiPaginated<T extends abstract new (...args: unknown[]) => unknown>(model: () => T) {
  return applyDecorators(
    ApiExtraModels(model, PaginatedResponseDto, PaginatedMetaDto),
    ApiOkResponse({
      description: "Paginated response",
      schema: {
        allOf: [
          { $ref: getSchemaPath(PaginatedResponseDto) },
          {
            properties: {
              items: {
                type: "array",
                items: { $ref: getSchemaPath(model) },
              },
              meta: {
                $ref: getSchemaPath(PaginatedMetaDto),
              },
            },
          },
        ],
      },
    }),
    ApiQuery({
      name: "cursor",
      required: false,
      type: String,
      description: "Cursor for pagination (Base64URL encoded)",
    }),
    ApiQuery({
      name: "limit",
      required: false,
      type: Number,
      description: "Number of items per page (1-100, default: 20)",
    }),
    ApiQuery({
      name: "sort",
      required: false,
      type: String,
      description: "Sort field (default: createdAt)",
    }),
    ApiQuery({
      name: "order",
      required: false,
      enum: ["asc", "desc"],
      description: "Sort direction (default: desc)",
    }),
  );
}
