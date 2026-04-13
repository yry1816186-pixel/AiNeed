import { Type, applyDecorators } from "@nestjs/common";
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from "@nestjs/swagger";

export class JsonApiDataDto {
  id!: string;
  type!: string;
  attributes!: Record<string, any>;
}

export class JsonApiResponseDto {
  data!: JsonApiDataDto | JsonApiDataDto[];
  included?: JsonApiDataDto[];
  meta?: Record<string, any>;
}

export const ApiJsonApiResponse = <TModel extends Type<any>>(model: TModel, options?: { isArray?: boolean }) => {
  return applyDecorators(
    ApiExtraModels(JsonApiResponseDto, model),
    ApiOkResponse({
      description: options?.isArray ? "JSON:API 列表响应" : "JSON:API 单条响应",
      schema: {
        allOf: [
          { $ref: getSchemaPath(JsonApiResponseDto) },
          {
            properties: {
              data: options?.isArray
                ? { type: "array", items: { $ref: getSchemaPath(model) } }
                : { $ref: getSchemaPath(model) },
            },
          },
        ],
      },
    }),
  );
};
