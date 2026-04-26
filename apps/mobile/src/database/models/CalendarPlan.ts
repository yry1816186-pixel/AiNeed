/**
 * CalendarPlan Model - 7 天穿搭日历
 *
 * 字段: date, outfit_json, weather_json, scenario, synced_at
 */
import { Model } from "@nozbe/watermelondb";
import { field, date } from "@nozbe/watermelondb/decorators";

export class CalendarPlan extends Model {
  static table = "calendar_plans";

  @field("date") date!: string;
  @field("outfit_json") outfitJson!: string;
  @field("weather_json") weatherJson!: string;
  @field("scenario") scenario!: string;
  @date("synced_at") syncedAt!: Date;
}
