import { ConfigService } from "@nestjs/config";

export const ENABLE_UNVERIFIED_AI_FALLBACKS = "ENABLE_UNVERIFIED_AI_FALLBACKS";

export function allowUnverifiedAiFallbacks(
  configService: ConfigService,
): boolean {
  return configService.get<string>(ENABLE_UNVERIFIED_AI_FALLBACKS) === "true";
}
