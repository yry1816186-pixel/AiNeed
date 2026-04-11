import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  avatarService,
  type CreateAvatarPayload,
  type UpdateAvatarPayload,
  type ClothingMap,
  type UserAvatar,
  type AvatarTemplate,
} from '../services/avatar.service';

const AVATAR_KEY = ['avatar', 'me'] as const;
const TEMPLATES_KEY = ['avatar', 'templates'] as const;

export function useMyAvatar() {
  return useQuery<UserAvatar>({
    queryKey: AVATAR_KEY,
    queryFn: () => avatarService.getMyAvatar(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAvatarTemplates() {
  return useQuery<AvatarTemplate[]>({
    queryKey: TEMPLATES_KEY,
    queryFn: () => avatarService.getTemplates(),
    staleTime: 30 * 60 * 1000,
  });
}

export function useCreateAvatar() {
  const queryClient = useQueryClient();

  return useMutation<UserAvatar, Error, CreateAvatarPayload>({
    mutationFn: (payload: CreateAvatarPayload) => avatarService.createAvatar(payload),
    onSuccess: (data: UserAvatar) => {
      queryClient.setQueryData(AVATAR_KEY, data);
      queryClient.invalidateQueries({ queryKey: AVATAR_KEY });
    },
  });
}

export function useUpdateAvatar() {
  const queryClient = useQueryClient();

  return useMutation<UserAvatar, Error, UpdateAvatarPayload>({
    mutationFn: (payload: UpdateAvatarPayload) => avatarService.updateAvatar(payload),
    onSuccess: (data: UserAvatar) => {
      queryClient.setQueryData(AVATAR_KEY, data);
      queryClient.invalidateQueries({ queryKey: AVATAR_KEY });
    },
  });
}

export function useDressAvatar() {
  const queryClient = useQueryClient();

  return useMutation<UserAvatar, Error, ClothingMap>({
    mutationFn: (clothingMap: ClothingMap) => avatarService.dressAvatar(clothingMap),
    onSuccess: (data: UserAvatar) => {
      queryClient.setQueryData(AVATAR_KEY, data);
      queryClient.invalidateQueries({ queryKey: AVATAR_KEY });
    },
  });
}
