import { useState, useCallback } from 'react';
import apiClient from '@/src/services/api/client';

export interface ReferenceLinePoint {
  x: number;
  y: number;
}

export interface ReferenceLines {
  shoulderLine: ReferenceLinePoint[];
  waistLine: ReferenceLinePoint[];
  centerLine: ReferenceLinePoint[];
  bodyOutline: ReferenceLinePoint[];
}

export type AlignmentLevel = 'aligned' | 'slight' | 'off';
export type OverallAlignment = 'perfect' | 'good' | 'adjust';

export interface AlignmentStatus {
  shoulder: AlignmentLevel;
  posture: AlignmentLevel;
  center: AlignmentLevel;
  overall: OverallAlignment;
}

interface UseReferenceLinesResult {
  referenceLines: ReferenceLines | null;
  alignmentStatus: AlignmentStatus | null;
  isLoading: boolean;
  error: string | null;
  fetchReferenceLines: (imageUri?: string) => Promise<ReferenceLines | null>;
}

const DEFAULT_REFERENCE_LINES: ReferenceLines = {
  shoulderLine: [
    { x: 0.2, y: 0.28 },
    { x: 0.8, y: 0.28 },
  ],
  waistLine: [
    { x: 0.25, y: 0.52 },
    { x: 0.75, y: 0.52 },
  ],
  centerLine: [
    { x: 0.5, y: 0.1 },
    { x: 0.5, y: 0.9 },
  ],
  bodyOutline: [
    { x: 0.5, y: 0.08 },
    { x: 0.42, y: 0.15 },
    { x: 0.35, y: 0.25 },
    { x: 0.2, y: 0.28 },
    { x: 0.22, y: 0.35 },
    { x: 0.28, y: 0.45 },
    { x: 0.25, y: 0.52 },
    { x: 0.27, y: 0.6 },
    { x: 0.3, y: 0.72 },
    { x: 0.32, y: 0.85 },
    { x: 0.38, y: 0.92 },
    { x: 0.5, y: 0.95 },
    { x: 0.62, y: 0.92 },
    { x: 0.68, y: 0.85 },
    { x: 0.7, y: 0.72 },
    { x: 0.73, y: 0.6 },
    { x: 0.75, y: 0.52 },
    { x: 0.72, y: 0.45 },
    { x: 0.78, y: 0.35 },
    { x: 0.8, y: 0.28 },
    { x: 0.65, y: 0.25 },
    { x: 0.58, y: 0.15 },
    { x: 0.5, y: 0.08 },
  ],
};

export function useReferenceLines(): UseReferenceLinesResult {
  const [referenceLines, setReferenceLines] =
    useState<ReferenceLines | null>(null);
  const [alignmentStatus, setAlignmentStatus] =
    useState<AlignmentStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReferenceLines = useCallback(
    async (imageUri?: string): Promise<ReferenceLines | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const payload = imageUri ? { imageUri } : {};
        const response = await apiClient.post<{
          referenceLines: ReferenceLines;
          alignmentStatus: AlignmentStatus;
        }>('/api/v1/ai-stylist/reference-lines', payload);

        if (response.success && response.data) {
          setReferenceLines(response.data.referenceLines);
          setAlignmentStatus(response.data.alignmentStatus);
          return response.data.referenceLines;
        }

        setReferenceLines(DEFAULT_REFERENCE_LINES);
        setAlignmentStatus({
          shoulder: 'slight',
          posture: 'slight',
          center: 'slight',
          overall: 'adjust',
        });
        return DEFAULT_REFERENCE_LINES;
      } catch {
        setError('获取参考线数据失败');
        setReferenceLines(DEFAULT_REFERENCE_LINES);
        setAlignmentStatus({
          shoulder: 'slight',
          posture: 'slight',
          center: 'slight',
          overall: 'adjust',
        });
        return DEFAULT_REFERENCE_LINES;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return { referenceLines, alignmentStatus, isLoading, error, fetchReferenceLines };
}
