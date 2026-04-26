/**
 * UserProfile Model - 用户 Profile + 偏好设置
 *
 * 字段: profile_json, preferences_json, updated_at
 */
import { Model } from "@nozbe/watermelondb";
import { field, date } from "@nozbe/watermelondb/decorators";

export class UserProfile extends Model {
  static table = "user_profiles";

  @field("profile_json") profileJson!: string;
  @field("preferences_json") preferencesJson!: string;
  @date("updated_at") updatedAt!: Date;
}
