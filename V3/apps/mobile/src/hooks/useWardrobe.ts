import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  wardrobeService,
  type WardrobeListParams,
  type ClothingCategory,
} from '../services/wardrobe.service';

export type { ClothingCategory } from '../services/wardrobe.service';
export type { WardrobeItem, WardrobeStatsResponse, WardrobeListResponse } from '../services/wardrobe.service';

export const WARDROBE_KEYS = {
  all: ['wardrobe'] as const,
  list: (params: WardrobeListParams) => ['wardrobe', 'list', params] as const,
  stats: ['wardrobe', 'stats'] as const,
};

export function useWardrobeList(params: WardrobeListParams = {}) {
  return useQuery({
    queryKey: WARDROBE_KEYS.list(params),
    queryFn: () => wardrobeService.getWardrobe(params),
  });
}

export function useWardrobeStats() {
  return useQuery({
    queryKey: WARDROBE_KEYS.stats,
    queryFn: () => wardrobeService.getStats(),
  });
}

export function useAddToWardrobe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clothingId: string) => wardrobeService.addToWardrobe(clothingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WARDROBE_KEYS.all });
    },
  });
}

export function useRemoveFromWardrobe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => wardrobeService.removeFromWardrobe(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WARDROBE_KEYS.all });
    },
  });
}

export const CATEGORY_LABELS: Record<ClothingCategory, string> = {
  top: '上装',
  bottom: '下装',
  outerwear: '外套',
  shoes: '鞋子',
  bag: '包包',
  accessory: '配饰',
};

export const ALL_CATEGORIES: ClothingCategory[] = [
  'top',
  'bottom',
  'outerwear',
  'shoes',
  'bag',
  'accessory',
];

export const BODY_ZONE_TO_CATEGORY: Record<string, ClothingCategory> = {
  upper: 'top',
  lower: 'bottom',
  feet: 'shoes',
};
