import { applyDecorators } from "@nestjs/common";
import { ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse } from "@nestjs/swagger";

export const ApiAuth = (description?: string) => {
  return applyDecorators(
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: description || "未授权，需要提供有效的 Access Token" }),
    ApiForbiddenResponse({ description: "无权访问该资源" }),
  );
};
