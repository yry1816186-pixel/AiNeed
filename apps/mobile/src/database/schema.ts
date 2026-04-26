/**
 * WatermelonDB Schema - XUNO 离线存储表结构定义
 *
 * 4 张表:
 * - cached_recommendations: 推荐缓存 (50 条最新推荐)
 * - wardrobe_items: 衣橱数据 (saved/wishlist/purchased)
 * - calendar_plans: 7 天穿搭日历
 * - user_profiles: 用户 Profile + 偏好设置
 */
import { appSchema, tableSchema } from "@nozbe/watermelondb";

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: "cached_recommendations",
      columns: [
        { name: "recommendation_id", type: "string", isIndexed: true },
        { name: "items_json", type: "string" },
        { name: "outfit_json", type: "string" },
        { name: "explanation_json", type: "string" },
        { name: "scenario", type: "string", isIndexed: true },
        { name: "cached_at", type: "number" },
        { name: "expires_at", type: "number" },
      ],
    }),
    tableSchema({
      name: "wardrobe_items",
      columns: [
        { name: "server_id", type: "string", isIndexed: true },
        { name: "section", type: "string", isIndexed: true },
        { name: "item_json", type: "string" },
        { name: "synced_at", type: "number" },
        { name: "is_dirty", type: "boolean" },
      ],
    }),
    tableSchema({
      name: "calendar_plans",
      columns: [
        { name: "date", type: "string", isIndexed: true },
        { name: "outfit_json", type: "string" },
        { name: "weather_json", type: "string" },
        { name: "scenario", type: "string" },
        { name: "synced_at", type: "number" },
      ],
    }),
    tableSchema({
      name: "user_profiles",
      columns: [
        { name: "profile_json", type: "string" },
        { name: "preferences_json", type: "string" },
        { name: "updated_at", type: "number" },
      ],
    }),
  ],
});
