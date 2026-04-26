/**
 * useOfflineRecommendations - 离线推荐数据 Hook
 *
 * 从 WatermelonDB 查询 cached_recommendations:
 * - 按 cached_at 降序排列
 * - 最多 50 条
 * - 可选按 scenario 过滤
 * - 使用 observe() 响应式查询
 */
import { useState, useEffect } from "react";
import { Q } from "@nozbe/watermelondb";
import { database } from "../../../database/index";
import { CachedRecommendation } from "../../../database/models/CachedRecommendation";

const MAX_CACHE = 50;

export interface OfflineRecommendation {
  id: string;
  recommendationId: string;
  itemsJson: string;
  outfitJson: string;
  explanationJson: string;
  scenario: string;
  cachedAt: Date;
  expiresAt: number;
}

export function useOfflineRecommendations(scenario?: string) {
  const [recommendations, setRecommendations] = useState<OfflineRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const buildQuery = () => {
      const conditions = [];
      if (scenario) {
        conditions.push(Q.where("scenario", scenario));
      }
      return database
        .get<CachedRecommendation>("cached_recommendations")
        .query(...conditions, Q.sortBy("cached_at", Q.desc), Q.take(MAX_CACHE));
    };

    const query = buildQuery();

    const subscription = query.observe().subscribe({
      next: (recs) => {
        if (cancelled) return;
        const mapped: OfflineRecommendation[] = recs.map((r) => ({
          id: r.id,
          recommendationId: r.recommendationId,
          itemsJson: r.itemsJson,
          outfitJson: r.outfitJson,
          explanationJson: r.explanationJson,
          scenario: r.scenario,
          cachedAt: r.cachedAt,
          expiresAt: r.expiresAt,
        }));
        setRecommendations(mapped);
        setLoading(false);
      },
      error: () => {
        if (cancelled) return;
        setLoading(false);
      },
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [scenario]);

  return { recommendations, loading };
}
