import { SetMetadata } from "@nestjs/common";

/**
 * Decorator to mark a method that MUST NOT execute in production.
 * Use with SkipInProductionGuard or manual environment checks.
 */
export const SKIP_IN_PRODUCTION_KEY = "SKIP_IN_PRODUCTION";

export const SkipInProduction = () => SetMetadata(SKIP_IN_PRODUCTION_KEY, true);
