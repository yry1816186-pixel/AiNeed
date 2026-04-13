import { get, post, put, del } from '@/services/request';

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string;
  type: 'boolean' | 'percentage' | 'variant' | 'segment';
  value: Record<string, unknown>;
  enabled: boolean;
  rules: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeatureFlagDto {
  key: string;
  name: string;
  description?: string;
  type: 'boolean' | 'percentage' | 'variant' | 'segment';
  value: Record<string, unknown>;
  enabled?: boolean;
  rules?: Record<string, unknown>;
}

export type UpdateFeatureFlagDto = Partial<CreateFeatureFlagDto>;

export const featureFlagApi = {
  getAll: () => get<FeatureFlag[]>('/feature-flags'),
  getById: (id: string) => get<FeatureFlag>(`/feature-flags/${id}`),
  create: (dto: CreateFeatureFlagDto) => post<FeatureFlag>('/feature-flags', dto),
  update: (id: string, dto: UpdateFeatureFlagDto) => put<FeatureFlag>(`/feature-flags/${id}`, dto),
  delete: (id: string) => del(`/feature-flags/${id}`),
};
