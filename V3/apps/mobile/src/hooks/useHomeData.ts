import { useQuery, useQueryClient } from '@tanstack/react-query';
import { homeService } from '../services/home.service';
import type { ClothingRecommendation, UserAvatarData } from '../services/home.service';
import type { User } from '../types';

const STALE_TIME = 5 * 60 * 1000;

export function useRecommendations() {
  return useQuery<ClothingRecommendation[]>({
    queryKey: ['home', 'recommendations'],
    queryFn: homeService.getDailyRecommendations,
    staleTime: STALE_TIME,
  });
}

export function useUserAvatar() {
  return useQuery<UserAvatarData>({
    queryKey: ['home', 'avatar'],
    queryFn: homeService.getUserAvatar,
    staleTime: STALE_TIME,
  });
}

export function useUserProfile() {
  return useQuery<User>({
    queryKey: ['home', 'profile'],
    queryFn: homeService.getUserProfile,
    staleTime: STALE_TIME,
  });
}

export function useRefetchRecommendations() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: ['home', 'recommendations'] });
}
