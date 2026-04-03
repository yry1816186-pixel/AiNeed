import { SetMetadata } from "@nestjs/common";

export const FEATURE_KEY = "feature";

/**
 * 标记接口所需的功能权限
 * @param feature 功能名称，如 'tryOn', 'aiAnalysis'
 */
export const RequireFeature = (feature: string) =>
  SetMetadata(FEATURE_KEY, feature);
