import { Injectable, CanActivate, ExecutionContext, SetMetadata, Logger } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { RequestWithUser } from "../../../common/types/common.types";
import { PrivacyService, ConsentType } from "./privacy.service";

/**
 * 元数据键：用于存储 @RequireConsent 装饰器标注的同意类型
 */
export const CONSENT_TYPES_KEY = "requiredConsentTypes";

/**
 * 装饰器：标记接口所需的同意类型
 *
 * @example
 * @RequireConsent("body_metrics", "photos")
 * @Post("try-on")
 * async virtualTryOn() { ... }
 */
export const RequireConsent = (...consentTypes: ConsentType[]) =>
  SetMetadata(CONSENT_TYPES_KEY, consentTypes);

/**
 * 守卫：在请求处理前检查用户是否已授予所需的同意类型
 *
 * 工作流程：
 * 1. 从 Reflector 读取 @RequireConsent 装饰器标注的同意类型
 * 2. 调用 PrivacyService.requireConsent() 检查所有类型
 * 3. 如有缺失，抛出 ForbiddenException (code: MISSING_CONSENT)
 */
@Injectable()
export class ConsentGuard implements CanActivate {
  private readonly logger = new Logger(ConsentGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly privacyService: PrivacyService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredConsentTypes = this.reflector.getAllAndOverride<ConsentType[]>(
      CONSENT_TYPES_KEY,
      [context.getHandler(), context.getClass()]
    );

    // 未标注 @RequireConsent 的接口直接放行
    if (!requiredConsentTypes || requiredConsentTypes.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const userId = request.user?.id;

    if (!userId) {
      this.logger.warn("ConsentGuard: No user ID found in request, denying access");
      return false;
    }

    // requireConsent 会在缺失同意时抛出 ForbiddenException
    await this.privacyService.requireConsent(userId, requiredConsentTypes);
    return true;
  }
}
