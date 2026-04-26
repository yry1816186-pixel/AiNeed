/**
 * useOfflineWardrobe - 离线衣橱数据 Hook
 *
 * 从 WatermelonDB 查询 wardrobe_items:
 * - 按 section 过滤 (saved/wishlist/purchased)
 * - 使用 observe() 响应式查询
 */
import { useState, useEffect } from "react";
import { Q } from "@nozbe/watermelondb";
import { database } from "../../../database/index";
import { WardrobeItem } from "../../../database/models/WardrobeItem";

export type WardrobeSection = "saved" | "wishlist" | "purchased";

export interface OfflineWardrobeItem {
  id: string;
  serverId: string;
  section: string;
  itemJson: string;
  syncedAt: Date;
  isDirty: boolean;
}

export function useOfflineWardrobe(section?: WardrobeSection) {
  const [items, setItems] = useState<OfflineWardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const conditions = [];
    if (section) {
      conditions.push(Q.where("section", section));
    }

    const query = database
      .get<WardrobeItem>("wardrobe_items")
      .query(...conditions, Q.sortBy("synced_at", Q.desc));

    const subscription = query.observe().subscribe({
      next: (wardrobeItems) => {
        if (cancelled) return;
        const mapped: OfflineWardrobeItem[] = wardrobeItems.map((item) => ({
          id: item.id,
          serverId: item.serverId,
          section: item.section,
          itemJson: item.itemJson,
          syncedAt: item.syncedAt,
          isDirty: item.isDirty,
        }));
        setItems(mapped);
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
  }, [section]);

  return { items, loading };
}
