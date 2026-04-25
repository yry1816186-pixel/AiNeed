import { SetMetadata } from "@nestjs/common";

export const USAGE_LIMIT_KEY = "usage_limit";

/**
 * Decorator to mark an endpoint as requiring usage limit checking.
 * Usage: @RequireLimit('ai_chat') or @RequireLimit('try_on') or @RequireLimit('wardrobe_item')
 */
export const RequireLimit = (actionType: string) => SetMetadata(USAGE_LIMIT_KEY, actionType);
