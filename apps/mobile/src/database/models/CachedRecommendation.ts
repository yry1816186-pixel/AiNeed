/**
 * CachedRecommendation Model - 推荐缓存
 *
 * 缓存最新 50 条推荐数据，支持离线浏览
 * 字段: recommendation_id, items_json, outfit_json, explanation_json, scenario, cached_at, expires_at
 */
import { Model } from "@nozbe/watermelondb";
import { field, date } from "@nozbe/watermelondb/decorators";

export class CachedRecommendation extends Model {
  static table = "cached_recommendations";

  @field("recommendation_id") recommendationId!: string;
  @field("items_json") itemsJson!: string;
  @field("outfit_json") outfitJson!: string;
  @field("explanation_json") explanationJson!: string;
  @field("scenario") scenario!: string;
  @date("cached_at") cachedAt!: Date;
  @field("expires_at") expiresAt!: number;
}
