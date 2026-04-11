import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clothingService } from '../services/clothing.service';
import type { ClothingItem, SimilarItem } from '../services/clothing.service';

export function useClothingDetail(id: string) {
  const queryClient = useQueryClient();

  const clothingQuery = useQuery({
    queryKey: ['clothing', id],
    queryFn: () => clothingService.getClothing(id),
    enabled: !!id,
  });

  const similarQuery = useQuery({
    queryKey: ['clothing', id, 'similar'],
    queryFn: () => clothingService.getSimilar(id),
    enabled: !!id,
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: ({ clothingId, isFavorited }: { clothingId: string; isFavorited: boolean }) =>
      clothingService.toggleFavorite(clothingId, isFavorited),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clothing', id] });
    },
  });

  const addToWardrobeMutation = useMutation({
    mutationFn: (clothingId: string) => clothingService.addToWardrobe(clothingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clothing', id] });
    },
  });

  return {
    clothing: clothingQuery.data as ClothingItem | undefined,
    isLoading: clothingQuery.isLoading,
    isError: clothingQuery.isError,
    error: clothingQuery.error,
    refetch: clothingQuery.refetch,
    similarItems: (similarQuery.data ?? []) as SimilarItem[],
    isSimilarLoading: similarQuery.isLoading,
    toggleFavorite: toggleFavoriteMutation.mutate,
    isFavoriteLoading: toggleFavoriteMutation.isPending,
    addToWardrobe: addToWardrobeMutation.mutate,
    isWardrobeLoading: addToWardrobeMutation.isPending,
  };
}
