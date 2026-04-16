import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import { photosApi, type UserPhoto } from "../../../services/api/photos.api";
import apiClient from "../../../services/api/client";
import type { ApiResponse } from '../../../types';

interface QualityCheckResult {
  isAcceptable: boolean;
  issues: string[];
  score: number;
  suggestions: string[];
}

export interface PhotoQualityIssue {
  type: "blur" | "brightness" | "pose" | "occlusion" | "background";
  severity: "low" | "medium" | "high";
  message: string;
}

export interface PhotoQualityResult {
  score: number;
  isAcceptable: boolean;
  issues: PhotoQualityIssue[];
}

interface PhotoState {
  photos: UserPhoto[];
  uploadProgress: Record<string, number>;
  selectedPhoto: UserPhoto | null;
  capturedImageUri: string | null;
  isCapturing: boolean;
  qualityResult: PhotoQualityResult | null;
  showQualityFeedback: boolean;
  cameraType: "front" | "back";
  isLoading: boolean;
  error: string | null;
  uploadPhoto: (file: { uri: string; type: string; name: string }) => Promise<void>;
  checkQuality: (file: { uri: string }) => Promise<QualityCheckResult | null>;
  deletePhoto: (id: string) => Promise<void>;
  setSelectedPhoto: (photo: UserPhoto | null) => void;
  fetchPhotos: () => Promise<void>;
  setCapturedImage: (uri: string | null) => void;
  setCapturing: (capturing: boolean) => void;
  setQualityResult: (result: PhotoQualityResult | null) => void;
  setShowQualityFeedback: (show: boolean) => void;
  toggleCameraType: () => void;
  reset: () => void;
}

export const usePhotoStore = createWithEqualityFn<PhotoState>(
  (set) => ({
    photos: [],
    uploadProgress: {},
    selectedPhoto: null,
    capturedImageUri: null,
    isCapturing: false,
    qualityResult: null,
    showQualityFeedback: false,
    cameraType: "back",
    isLoading: false,
    error: null,

    uploadPhoto: async (file) => {
      set({ isLoading: true, error: null });
      try {
        const response = await photosApi.upload(file.uri);
        if (response.success && response.data) {
          const newPhoto = response.data;
          set((state) => ({
            photos: [newPhoto, ...state.photos],
            uploadProgress: { ...state.uploadProgress, [newPhoto.id]: 100 },
            isLoading: false,
          }));
        } else {
          set({
            error: response.error?.message || "Failed to upload photo",
            isLoading: false,
          });
        }
      } catch (err) {
        set({ error: (err as Error).message, isLoading: false });
      }
    },

    checkQuality: async (file) => {
      set({ isLoading: true, error: null });
      try {
        const response: ApiResponse<QualityCheckResult> = await apiClient.post<QualityCheckResult>(
          "/photos/check-quality",
          {
            uri: file.uri,
          }
        );
        if (response.success && response.data) {
          set({ isLoading: false });
          return response.data;
        }
        set({
          error: response.error?.message || "Quality check failed",
          isLoading: false,
        });
        return null;
      } catch (err) {
        set({ error: (err as Error).message, isLoading: false });
        return null;
      }
    },

    deletePhoto: async (id) => {
      set({ isLoading: true, error: null });
      try {
        const response = await photosApi.delete(id);
        if (response.success) {
          set((state) => ({
            photos: state.photos.filter((p) => p.id !== id),
            selectedPhoto: state.selectedPhoto?.id === id ? null : state.selectedPhoto,
            uploadProgress: (() => {
              const { [id]: _, ...rest } = state.uploadProgress;
              return rest;
            })(),
            isLoading: false,
          }));
        } else {
          set({
            error: response.error?.message || "Failed to delete photo",
            isLoading: false,
          });
        }
      } catch (err) {
        set({ error: (err as Error).message, isLoading: false });
      }
    },

    setSelectedPhoto: (photo) => set({ selectedPhoto: photo }),

    setCapturedImage: (uri) => set({ capturedImageUri: uri }),

    setCapturing: (capturing) => set({ isCapturing: capturing }),

    setQualityResult: (result) => set({ qualityResult: result }),

    setShowQualityFeedback: (show) => set({ showQualityFeedback: show }),

    toggleCameraType: () =>
      set((state) => ({
        cameraType: state.cameraType === "back" ? "front" : "back",
      })),

    reset: () =>
      set({
        capturedImageUri: null,
        isCapturing: false,
        qualityResult: null,
        showQualityFeedback: false,
      }),

    fetchPhotos: async () => {
      set({ isLoading: true, error: null });
      try {
        const response = await photosApi.getAll();
        if (response.success && response.data) {
          set({ photos: response.data, isLoading: false });
        } else {
          set({
            error: response.error?.message || "Failed to fetch photos",
            isLoading: false,
          });
        }
      } catch (err) {
        set({ error: (err as Error).message, isLoading: false });
      }
    },
  }),
  shallow
);

export const usePhotos = () => usePhotoStore((s) => s.photos);
export const useUploadProgress = () => usePhotoStore((s) => s.uploadProgress);
export const useSelectedPhoto = () => usePhotoStore((s) => s.selectedPhoto);
export const usePhotoLoading = () => usePhotoStore((s) => s.isLoading);
export const usePhotoError = () => usePhotoStore((s) => s.error);
