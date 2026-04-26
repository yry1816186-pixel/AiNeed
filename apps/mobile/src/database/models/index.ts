/**
 * WatermelonDB Model Classes - 统一导出
 */
export { CachedRecommendation } from "./CachedRecommendation";
export { WardrobeItem } from "./WardrobeItem";
export { CalendarPlan } from "./CalendarPlan";
export { UserProfile } from "./UserProfile";

import { CachedRecommendation } from "./CachedRecommendation";
import { WardrobeItem } from "./WardrobeItem";
import { CalendarPlan } from "./CalendarPlan";
import { UserProfile } from "./UserProfile";

/** 所有 Model 类数组，用于 Database 初始化 */
export const modelClasses = [CachedRecommendation, WardrobeItem, CalendarPlan, UserProfile];
