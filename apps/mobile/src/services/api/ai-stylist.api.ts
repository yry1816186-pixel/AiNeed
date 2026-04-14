import apiClient from "./client";
import type { ApiResponse } from "../../types/api";

export type AiStylistActionType =
  | "ask_question"
  | "show_preference_buttons"
  | "request_photo_upload"
  | "poll_analysis"
  | "confirm_preferences"
  | "generate_outfit"
  | "show_outfit_cards";

export interface AiStylistAction {
  type: AiStylistActionType;
  field?: string;
  options?: string[];
  canSkip?: boolean;
  photoType?: "front" | "side" | "full_body" | "half_body" | "face";
}

export interface AiStylistSlots {
  occasion?: string;
  weather?: string;
  budgetMin?: number;
  budgetMax?: number;
  preferredStyles: string[];
  styleAvoidances: string[];
  fitGoals: string[];
  preferredColors: string[];
}

export interface AiStylistBodyProfile {
  bodyType?: string;
  skinTone?: string;
  faceShape?: string;
  colorSeason?: string;
  height?: number;
  weight?: number;
  shapeFeatures: string[];
}

export interface AiStylistSessionState {
  sceneReady: boolean;
  bodyReady: boolean;
  styleReady: boolean;
  candidateReady: boolean;
  commerceReady: boolean;
  currentStage: string;
  slots: AiStylistSlots;
  bodyProfile: AiStylistBodyProfile;
  lastPhotoId?: string;
  lastPhotoStatus?: string;
  photoRequested?: boolean;
  photoSkipped?: boolean;
}

export interface AiStylistOutfitItem {
  itemId?: string;
  category: string;
  name: string;
  reason: string;
  imageUrl?: string;
  externalUrl?: string | null;
  price?: number | null;
  brand?: string | null;
  score?: number;
}

export interface AiStylistOutfitPlan {
  title: string;
  items: AiStylistOutfitItem[];
  styleExplanation: string[];
  estimatedTotalPrice?: number;
}

export interface AiStylistResolution {
  lookSummary: string;
  whyItFits: string[];
  outfits: AiStylistOutfitPlan[];
}

export interface AiStylistProgress {
  stage: string;
  title: string;
  detail: string;
  etaSeconds?: number;
  canLeaveAndResume: boolean;
  isWaiting: boolean;
}

export interface AiStylistSessionResponse {
  success: boolean;
  message: string;
  assistantMessage: string;
  timestamp: string;
  sessionId?: string;
  nextAction?: AiStylistAction;
  sessionState?: AiStylistSessionState;
  slotUpdates?: Partial<AiStylistSlots>;
  missingFields?: string[];
  previewRecommendations?: AiStylistOutfitItem[];
  result?: AiStylistResolution;
  photoId?: string;
  analysisStatus?: string;
  progress?: AiStylistProgress;
  sessionExpiresAt?: string;
  isFallback?: boolean;
  error?: string;
}

export interface AiStylistSuggestionResponse {
  suggestions: { text: string; icon: string }[];
}

export const aiStylistApi = {
  createSession: (payload?: {
    entry?: string;
    goal?: string;
    context?: Record<string, unknown>;
  }): Promise<ApiResponse<AiStylistSessionResponse>> =>
    apiClient.post<AiStylistSessionResponse>("/ai-stylist/sessions", payload),

  getSessionStatus: (
    sessionId: string,
  ): Promise<ApiResponse<AiStylistSessionResponse>> =>
    apiClient.get<AiStylistSessionResponse>(
      `/ai-stylist/sessions/${sessionId}`,
    ),

  sendMessage: (
    sessionId: string,
    message: string,
    latitude?: number,
    longitude?: number,
  ): Promise<ApiResponse<AiStylistSessionResponse>> => {
    const payload: Record<string, unknown> = { message };
    if (latitude !== undefined && longitude !== undefined) {
      payload.latitude = latitude;
      payload.longitude = longitude;
    }
    return apiClient.post<AiStylistSessionResponse>(
      `/ai-stylist/sessions/${sessionId}/messages`,
      payload,
    );
  },

  uploadPhoto: (
    sessionId: string,
    imageUri: string,
    type: "front" | "side" | "full_body" | "half_body" | "face" = "full_body",
  ): Promise<ApiResponse<AiStylistSessionResponse>> => {
    const formData = new FormData();
    const filename = imageUri.split("/").pop() || "stylist-photo.jpg";
    const extensionMatch = /\.(\w+)$/.exec(filename);
    const fileType = extensionMatch
      ? `image/${extensionMatch[1]}`
      : "image/jpeg";

    formData.append("file", {
      uri: imageUri,
      name: filename,
      type: fileType,
    } as unknown as Blob);
    formData.append("type", type);

    return apiClient.upload<AiStylistSessionResponse>(
      `/ai-stylist/sessions/${sessionId}/photo`,
      formData,
    );
  },

  attachExistingPhoto: (
    sessionId: string,
    photoId: string,
  ): Promise<ApiResponse<AiStylistSessionResponse>> =>
    apiClient.post<AiStylistSessionResponse>(
      `/ai-stylist/sessions/${sessionId}/photo/reference`,
      { photoId },
    ),

  resolveSession: (
    sessionId: string,
  ): Promise<ApiResponse<AiStylistSessionResponse>> =>
    apiClient.post<AiStylistSessionResponse>(
      `/ai-stylist/sessions/${sessionId}/resolve`,
    ),

  getSuggestions: (): Promise<ApiResponse<AiStylistSuggestionResponse>> =>
    apiClient.get<AiStylistSuggestionResponse>("/ai-stylist/suggestions"),

  getOutfitPlan: (
    sessionId: string,
  ): Promise<ApiResponse<unknown>> =>
    apiClient.get(`/ai-stylist/sessions/${sessionId}/outfit-plan`),

  getAlternatives: (
    sessionId: string,
    outfitIndex: number,
    itemIndex: number,
    limit: number = 10,
  ): Promise<ApiResponse<unknown>> =>
    apiClient.get(
      `/ai-stylist/sessions/${sessionId}/items/alternatives?outfitIndex=${outfitIndex}&itemIndex=${itemIndex}&limit=${limit}`,
    ),

  replaceItem: (
    sessionId: string,
    outfitIndex: number,
    itemIndex: number,
    newItemId: string,
  ): Promise<ApiResponse<unknown>> =>
    apiClient.post(
      `/ai-stylist/sessions/${sessionId}/items/replace`,
      { outfitIndex, itemIndex, newItemId },
    ),

  submitFeedback: (
    sessionId: string,
    data: {
      outfitIndex: number;
      action: "like" | "dislike";
      itemId?: string;
      rating?: number;
      dislikeReason?: string;
    },
  ): Promise<ApiResponse<{ success: boolean; message: string }>> =>
    apiClient.post(
      `/ai-stylist/sessions/${sessionId}/feedback`,
      data,
    ),

  getPresetQuestions: (): Promise<ApiResponse<unknown>> =>
    apiClient.get("/ai-stylist/preset-questions"),

  getCalendarDays: (
    year: number,
    month: number,
  ): Promise<ApiResponse<unknown>> =>
    apiClient.get(`/ai-stylist/sessions/calendar?year=${year}&month=${month}`),

  getSessionsByDate: (
    date: string,
  ): Promise<ApiResponse<unknown>> =>
    apiClient.get(`/ai-stylist/sessions/date/${date}`),
};

export default aiStylistApi;
