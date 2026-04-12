import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  designMarketService,
  type DesignListParams,
  type ReportParams,
} from '../services/design-market.service';

export const DESIGN_MARKET_KEYS = {
  all: ['designMarket'] as const,
  list: (params: DesignListParams) => ['designMarket', 'list', params] as const,
  detail: (id: string) => ['designMarket', 'detail', id] as const,
};

export function useDesignList(params: DesignListParams = {}) {
  return useQuery({
    queryKey: DESIGN_MARKET_KEYS.list(params),
    queryFn: () => designMarketService.listDesigns(params),
  });
}

export function useDesignDetail(designId: string) {
  return useQuery({
    queryKey: DESIGN_MARKET_KEYS.detail(designId),
    queryFn: () => designMarketService.getDesignDetail(designId),
    enabled: !!designId,
  });
}

export function useToggleLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (designId: string) => designMarketService.toggleLike(designId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DESIGN_MARKET_KEYS.all });
    },
  });
}

export function useReportDesign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ designId, params }: { designId: string; params: ReportParams }) =>
      designMarketService.reportDesign(designId, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DESIGN_MARKET_KEYS.all });
    },
  });
}

export function useDownloadDesign() {
  return useMutation({
    mutationFn: (designId: string) => designMarketService.downloadDesign(designId),
  });
}

export function usePublishDesign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (designId: string) => designMarketService.publishDesign(designId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DESIGN_MARKET_KEYS.all });
    },
  });
}
