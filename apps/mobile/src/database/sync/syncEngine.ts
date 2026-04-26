/**
 * SyncEngine - 网络恢复时同步引擎
 *
 * 支持操作:
 * - pullLatestRecommendations: GET /api/v1/recommendations?limit=50
 * - pushLocalChanges: POST /api/v1/wardrobe/sync
 * - pullCalendarPlans: GET /api/v1/calendar?days=7
 * - pullUserProfile: GET /api/v1/user/profile
 * - fullSync: 依次执行 push -> pullRecs -> pullCalendar -> pullProfile
 *
 * 设计原则: 单步骤失败不阻断后续步骤
 */

import { database } from "../index";
import { CachedRecommendation } from "../models/CachedRecommendation";
import { WardrobeItem } from "../models/WardrobeItem";
import { CalendarPlan } from "../models/CalendarPlan";
import { UserProfile } from "../models/UserProfile";
import { Q } from "@nozbe/watermelondb";

const API_BASE = "https://xuno.cn/api/v1";

async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
}

export class SyncEngine {
  /**
   * 拉取最新 50 条推荐，写入 WatermelonDB cached_recommendations
   */
  async pullLatestRecommendations(): Promise<void> {
    try {
      const response = await apiFetch(`${API_BASE}/recommendations?limit=50`);
      if (!response.ok) return;

      const { data } = (await response.json()) as {
        data: Array<{
          id: string;
          items: unknown;
          outfit: unknown;
          explanation: string;
          scenario: string;
        }>;
      };

      if (!data?.length) return;

      await database.write(async () => {
        // Clear expired entries first
        const now = Date.now();
        const allRecs = await database
          .get<CachedRecommendation>("cached_recommendations")
          .query()
          .fetch();

        const expired = allRecs.filter((r) => r.expiresAt < now);
        if (expired.length > 0) {
          await database.batch(...expired.map((r) => r.prepareMarkAsDeleted()));
        }

        // Write new recommendations
        const recsCollection = database.get<CachedRecommendation>("cached_recommendations");
        const newRecs = data.map((rec) =>
          recsCollection.prepareCreate((record) => {
            record.recommendationId = rec.id;
            record.itemsJson = JSON.stringify(rec.items);
            record.outfitJson = JSON.stringify(rec.outfit);
            record.explanationJson = rec.explanation;
            record.scenario = rec.scenario;
            record.cachedAt = new Date();
            record.expiresAt = now + 24 * 60 * 60 * 1000; // 24h expiry
          })
        );

        await database.batch(...newRecs);
      });
    } catch (error) {
      // Graceful failure - log but don't throw
      // eslint-disable-next-line no-console
      console.warn("[SyncEngine] pullLatestRecommendations failed:", error);
    }
  }

  /**
   * 推送 is_dirty=true 的 wardrobe_items 到后端，然后清除 is_dirty
   */
  async pushLocalChanges(): Promise<void> {
    try {
      const dirtyItems = await database
        .get<WardrobeItem>("wardrobe_items")
        .query(Q.where("is_dirty", true))
        .fetch();

      if (dirtyItems.length === 0) return;

      const itemsPayload = dirtyItems.map((item) => ({
        server_id: item.serverId,
        section: item.section,
        item_json: item.itemJson,
        is_dirty: item.isDirty,
      }));

      const response = await apiFetch(`${API_BASE}/wardrobe/sync`, {
        method: "POST",
        body: JSON.stringify({ items: itemsPayload }),
      });

      if (!response.ok) return;

      // Clear is_dirty flags after successful push
      await database.write(async () => {
        await database.batch(
          ...dirtyItems.map((item) =>
            item.prepareUpdate((record) => {
              record.isDirty = false;
            })
          )
        );
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("[SyncEngine] pushLocalChanges failed:", error);
    }
  }

  /**
   * 拉取 7 天日历计划，写入 calendar_plans
   */
  async pullCalendarPlans(): Promise<void> {
    try {
      const response = await apiFetch(`${API_BASE}/calendar?days=7`);
      if (!response.ok) return;

      const { data } = (await response.json()) as {
        data: Array<{
          date: string;
          outfit: unknown;
          weather: unknown;
          scenario: string;
        }>;
      };

      if (!data?.length) return;

      await database.write(async () => {
        const collection = database.get<CalendarPlan>("calendar_plans");
        const newPlans = data.map((plan) =>
          collection.prepareCreate((record) => {
            record.date = plan.date;
            record.outfitJson = JSON.stringify(plan.outfit);
            record.weatherJson = JSON.stringify(plan.weather);
            record.scenario = plan.scenario;
            record.syncedAt = new Date();
          })
        );
        await database.batch(...newPlans);
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("[SyncEngine] pullCalendarPlans failed:", error);
    }
  }

  /**
   * 拉取用户 Profile，写入 user_profiles
   */
  async pullUserProfile(): Promise<void> {
    try {
      const response = await apiFetch(`${API_BASE}/user/profile`);
      if (!response.ok) return;

      const { data } = (await response.json()) as {
        data: { profile: unknown; preferences: unknown };
      };

      if (!data) return;

      await database.write(async () => {
        const collection = database.get<UserProfile>("user_profiles");
        // Upsert: delete existing then create new
        const existing = await collection.query().fetch();
        const operations = [
          ...existing.map((r) => r.prepareMarkAsDeleted()),
          collection.prepareCreate((record) => {
            record.profileJson = JSON.stringify(data.profile);
            record.preferencesJson = JSON.stringify(data.preferences);
            record.updatedAt = new Date();
          }),
        ];
        await database.batch(...operations);
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("[SyncEngine] pullUserProfile failed:", error);
    }
  }

  /**
   * 网络恢复时完整同步
   * 顺序: push -> pullRecs -> pullCalendar -> pullProfile
   * 单步骤失败不阻断后续步骤
   */
  async fullSync(): Promise<void> {
    await this.pushLocalChanges().catch(() => {});
    await this.pullLatestRecommendations().catch(() => {});
    await this.pullCalendarPlans().catch(() => {});
    await this.pullUserProfile().catch(() => {});
  }
}
