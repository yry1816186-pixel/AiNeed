import apiClient from "./client";
import { ApiResponse } from "../../types";
import { buildPhotoAssetUrl } from "./asset-url";


export type PhotoType = "front" | "side" | "full_body" | "half_body" | "face";

/**
 * React Native FormData 文件条目类型
 */
interface RNFileBody {
  uri: string;
  name: string;
  type: string;
}

interface PhotoUploadPayload {
  id: string;
  url: string;
  thumbnailUrl?: string;
  thumbnailDataUri?: string;
  type: PhotoType;
  status?: "pending" | "processing" | "completed" | "failed";
}

export interface UserPhoto {
  id: string;
  type: PhotoType;
  url: string;
  thumbnailUrl?: string;
  thumbnailDataUri?: string;
  analysisStatus: "pending" | "processing" | "completed" | "failed";
  analysisResult?: {
    bodyType?: string;
    skinTone?: string;
    faceShape?: string;
    colorSeason?: string;
    confidence?: number;
    measurements?: {
      shoulderWidth?: number;
      chestWidth?: number;
      waistWidth?: number;
      hipWidth?: number;
    };
  };
  analyzedAt?: string;
  createdAt: string;
}

function normalizeUploadedPhoto(payload: PhotoUploadPayload): UserPhoto {
  const now = new Date().toISOString();

  return {
    id: payload.id,
    type: payload.type,
    url: buildPhotoAssetUrl(payload.id, "original", payload.url),
    thumbnailUrl: buildPhotoAssetUrl(payload.id, "thumbnail", payload.thumbnailUrl),
    thumbnailDataUri: payload.thumbnailDataUri,
    analysisStatus: payload.status ?? "pending",
    createdAt: now,
  };
}

function normalizeUserPhoto(payload: UserPhoto): UserPhoto {
  return {
    ...payload,
    url: buildPhotoAssetUrl(payload.id, "original", payload.url),
    thumbnailUrl: buildPhotoAssetUrl(payload.id, "thumbnail", payload.thumbnailUrl),
    thumbnailDataUri: payload.thumbnailDataUri,
  };
}

export const photosApi = {
  async upload(imageUri: string, type: PhotoType = "full_body"): Promise<ApiResponse<UserPhoto>> {
    const formData = new FormData();
    const filename = imageUri.split("/").pop() || "image.jpg";
    const match = /\.(\w+)$/.exec(filename);
    const fileType = match ? `image/${match[1]}` : "image/jpeg";

    formData.append("file", {
      uri: imageUri,
      name: filename,
      type: fileType,
    } as RNFileBody);
    formData.append("type", type);

    const response = await apiClient.upload<PhotoUploadPayload>("/photos/upload", formData);

    if (!response.success || !response.data) {
      return response as ApiResponse<UserPhoto>;
    }

    return {
      success: true,
      data: normalizeUploadedPhoto(response.data),
    };
  },

  async getAll(type?: PhotoType): Promise<ApiResponse<UserPhoto[]>> {
    const response = await apiClient.get<UserPhoto[]>("/photos", { type });

    if (!response.success || !response.data) {
      return response;
    }

    return {
      success: true,
      data: response.data.map(normalizeUserPhoto),
    };
  },

  async getById(photoId: string): Promise<ApiResponse<UserPhoto>> {
    const response = await apiClient.get<UserPhoto>(`/photos/${photoId}`);

    if (!response.success || !response.data) {
      return response;
    }

    return {
      success: true,
      data: normalizeUserPhoto(response.data),
    };
  },

  async delete(photoId: string): Promise<ApiResponse<{ success: boolean }>> {
    return apiClient.delete<{ success: boolean }>(`/photos/${photoId}`);
  },
};

export default photosApi;
