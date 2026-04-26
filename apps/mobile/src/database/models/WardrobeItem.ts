/**
 * WardrobeItem Model - 衣橱数据
 *
 * 支持三段式衣橱: saved / wishlist / purchased
 * 字段: server_id, section, item_json, synced_at, is_dirty
 */
import { Model } from "@nozbe/watermelondb";
import { field, date } from "@nozbe/watermelondb/decorators";

export class WardrobeItem extends Model {
  static table = "wardrobe_items";

  @field("server_id") serverId!: string;
  @field("section") section!: string;
  @field("item_json") itemJson!: string;
  @date("synced_at") syncedAt!: Date;
  @field("is_dirty") isDirty!: boolean;
}
