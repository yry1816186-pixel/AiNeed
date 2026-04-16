import { usePhotoStore } from "../../features/tryon/stores/photoStore";
import { photosApi } from "../../services/api/photos.api";
import apiClient from "../../services/api/client";
import type { UserPhoto } from "../../services/api/photos.api";

jest.mock("../../services/api/photos.api", () => ({
  photosApi: {
    upload: jest.fn(),
    delete: jest.fn(),
    getAll: jest.fn(),
  },
}));

jest.mock("../../services/api/client", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockedPhotosApi = photosApi as jest.Mocked<typeof photosApi>;
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

const mockPhoto: UserPhoto = {
  id: "photo-1",
  type: "full_body",
  url: "https://example.com/photo1.jpg",
  thumbnailUrl: "https://example.com/photo1-thumb.jpg",
  analysisStatus: "pending",
  createdAt: "2025-01-01T00:00:00Z",
};

const mockPhoto2: UserPhoto = {
  id: "photo-2",
  type: "front",
  url: "https://example.com/photo2.jpg",
  analysisStatus: "completed",
  createdAt: "2025-01-02T00:00:00Z",
};

describe("usePhotoStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePhotoStore.setState({
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
    });
  });

  // ==================== 初始状态 ====================

  describe("initial state", () => {
    it("should have correct default values", () => {
      const state = usePhotoStore.getState();
      expect(state.photos).toEqual([]);
      expect(state.uploadProgress).toEqual({});
      expect(state.selectedPhoto).toBeNull();
      expect(state.capturedImageUri).toBeNull();
      expect(state.isCapturing).toBe(false);
      expect(state.qualityResult).toBeNull();
      expect(state.showQualityFeedback).toBe(false);
      expect(state.cameraType).toBe("back");
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  // ==================== uploadPhoto ====================

  describe("uploadPhoto", () => {
    it("should add photo to photos list on successful upload", async () => {
      mockedPhotosApi.upload.mockResolvedValueOnce({
        success: true,
        data: mockPhoto,
      });

      await usePhotoStore
        .getState()
        .uploadPhoto({ uri: "file:///photo.jpg", type: "image/jpeg", name: "photo.jpg" });

      const state = usePhotoStore.getState();
      expect(mockedPhotosApi.upload).toHaveBeenCalledWith("file:///photo.jpg");
      expect(state.photos).toHaveLength(1);
      expect(state.photos[0].id).toBe("photo-1");
      expect(state.uploadProgress["photo-1"]).toBe(100);
      expect(state.isLoading).toBe(false);
    });

    it("should prepend new photo to existing photos", async () => {
      usePhotoStore.setState({ photos: [mockPhoto2] });

      mockedPhotosApi.upload.mockResolvedValueOnce({
        success: true,
        data: mockPhoto,
      });

      await usePhotoStore
        .getState()
        .uploadPhoto({ uri: "file:///photo.jpg", type: "image/jpeg", name: "photo.jpg" });

      const state = usePhotoStore.getState();
      expect(state.photos).toHaveLength(2);
      expect(state.photos[0].id).toBe("photo-1");
    });

    it("should set error when upload response is not successful", async () => {
      mockedPhotosApi.upload.mockResolvedValueOnce({
        success: false,
        error: { code: "ERR", message: "Upload failed" },
      });

      await usePhotoStore
        .getState()
        .uploadPhoto({ uri: "file:///photo.jpg", type: "image/jpeg", name: "photo.jpg" });

      const state = usePhotoStore.getState();
      expect(state.error).toBe("Upload failed");
      expect(state.photos).toEqual([]);
      expect(state.isLoading).toBe(false);
    });

    it("should set error on exception during upload", async () => {
      mockedPhotosApi.upload.mockRejectedValueOnce(new Error("Network error"));

      await usePhotoStore
        .getState()
        .uploadPhoto({ uri: "file:///photo.jpg", type: "image/jpeg", name: "photo.jpg" });

      const state = usePhotoStore.getState();
      expect(state.error).toBe("Network error");
      expect(state.isLoading).toBe(false);
    });
  });

  // ==================== checkQuality ====================

  describe("checkQuality", () => {
    const qualityResult = {
      isAcceptable: true,
      issues: [],
      score: 0.95,
      suggestions: [],
    };

    it("should return quality result on success", async () => {
      mockedApiClient.post.mockResolvedValueOnce({
        success: true,
        data: qualityResult,
      });

      const result = await usePhotoStore.getState().checkQuality({ uri: "file:///photo.jpg" });

      expect(mockedApiClient.post).toHaveBeenCalledWith("/photos/check-quality", {
        uri: "file:///photo.jpg",
      });
      expect(result).toEqual(qualityResult);
      expect(usePhotoStore.getState().isLoading).toBe(false);
    });

    it("should return null when response is not successful", async () => {
      mockedApiClient.post.mockResolvedValueOnce({
        success: false,
        error: { code: "ERR", message: "Quality check failed" },
      });

      const result = await usePhotoStore.getState().checkQuality({ uri: "file:///photo.jpg" });

      expect(result).toBeNull();
      expect(usePhotoStore.getState().error).toBe("Quality check failed");
    });

    it("should return null on exception", async () => {
      mockedApiClient.post.mockRejectedValueOnce(new Error("Server error"));

      const result = await usePhotoStore.getState().checkQuality({ uri: "file:///photo.jpg" });

      expect(result).toBeNull();
      expect(usePhotoStore.getState().error).toBe("Server error");
    });
  });

  // ==================== deletePhoto ====================

  describe("deletePhoto", () => {
    it("should remove photo from list on successful delete", async () => {
      usePhotoStore.setState({
        photos: [mockPhoto, mockPhoto2],
        uploadProgress: { "photo-1": 100, "photo-2": 100 },
      });

      mockedPhotosApi.delete.mockResolvedValueOnce({
        success: true,
        data: { success: true },
      });

      await usePhotoStore.getState().deletePhoto("photo-1");

      const state = usePhotoStore.getState();
      expect(mockedPhotosApi.delete).toHaveBeenCalledWith("photo-1");
      expect(state.photos).toHaveLength(1);
      expect(state.photos[0].id).toBe("photo-2");
      expect(state.uploadProgress).not.toHaveProperty("photo-1");
      expect(state.uploadProgress).toHaveProperty("photo-2");
    });

    it("should clear selectedPhoto if it is the deleted photo", async () => {
      usePhotoStore.setState({
        photos: [mockPhoto],
        selectedPhoto: mockPhoto,
      });

      mockedPhotosApi.delete.mockResolvedValueOnce({
        success: true,
        data: { success: true },
      });

      await usePhotoStore.getState().deletePhoto("photo-1");

      expect(usePhotoStore.getState().selectedPhoto).toBeNull();
    });

    it("should keep selectedPhoto if it is not the deleted photo", async () => {
      usePhotoStore.setState({
        photos: [mockPhoto, mockPhoto2],
        selectedPhoto: mockPhoto2,
      });

      mockedPhotosApi.delete.mockResolvedValueOnce({
        success: true,
        data: { success: true },
      });

      await usePhotoStore.getState().deletePhoto("photo-1");

      expect(usePhotoStore.getState().selectedPhoto?.id).toBe("photo-2");
    });

    it("should set error when delete fails", async () => {
      usePhotoStore.setState({ photos: [mockPhoto] });

      mockedPhotosApi.delete.mockResolvedValueOnce({
        success: false,
        error: { code: "ERR", message: "Failed to delete photo" },
      });

      await usePhotoStore.getState().deletePhoto("photo-1");

      expect(usePhotoStore.getState().error).toBe("Failed to delete photo");
      expect(usePhotoStore.getState().photos).toHaveLength(1);
    });
  });

  // ==================== setSelectedPhoto ====================

  describe("setSelectedPhoto", () => {
    it("should set selected photo", () => {
      usePhotoStore.getState().setSelectedPhoto(mockPhoto);
      expect(usePhotoStore.getState().selectedPhoto).toEqual(mockPhoto);
    });

    it("should clear selected photo with null", () => {
      usePhotoStore.setState({ selectedPhoto: mockPhoto });
      usePhotoStore.getState().setSelectedPhoto(null);
      expect(usePhotoStore.getState().selectedPhoto).toBeNull();
    });
  });

  // ==================== setCapturedImage ====================

  describe("setCapturedImage", () => {
    it("should set captured image URI", () => {
      usePhotoStore.getState().setCapturedImage("file:///captured.jpg");
      expect(usePhotoStore.getState().capturedImageUri).toBe("file:///captured.jpg");
    });

    it("should clear captured image with null", () => {
      usePhotoStore.setState({ capturedImageUri: "file:///captured.jpg" });
      usePhotoStore.getState().setCapturedImage(null);
      expect(usePhotoStore.getState().capturedImageUri).toBeNull();
    });
  });

  // ==================== setCapturing ====================

  describe("setCapturing", () => {
    it("should set isCapturing flag", () => {
      usePhotoStore.getState().setCapturing(true);
      expect(usePhotoStore.getState().isCapturing).toBe(true);

      usePhotoStore.getState().setCapturing(false);
      expect(usePhotoStore.getState().isCapturing).toBe(false);
    });
  });

  // ==================== setQualityResult ====================

  describe("setQualityResult", () => {
    it("should set quality result", () => {
      const result = {
        score: 0.9,
        isAcceptable: true,
        issues: [],
      };
      usePhotoStore.getState().setQualityResult(result);
      expect(usePhotoStore.getState().qualityResult).toEqual(result);
    });

    it("should clear quality result with null", () => {
      usePhotoStore.setState({
        qualityResult: { score: 0.9, isAcceptable: true, issues: [] },
      });
      usePhotoStore.getState().setQualityResult(null);
      expect(usePhotoStore.getState().qualityResult).toBeNull();
    });
  });

  // ==================== setShowQualityFeedback ====================

  describe("setShowQualityFeedback", () => {
    it("should set showQualityFeedback flag", () => {
      usePhotoStore.getState().setShowQualityFeedback(true);
      expect(usePhotoStore.getState().showQualityFeedback).toBe(true);

      usePhotoStore.getState().setShowQualityFeedback(false);
      expect(usePhotoStore.getState().showQualityFeedback).toBe(false);
    });
  });

  // ==================== toggleCameraType ====================

  describe("toggleCameraType", () => {
    it("should toggle from back to front", () => {
      usePhotoStore.setState({ cameraType: "back" });
      usePhotoStore.getState().toggleCameraType();
      expect(usePhotoStore.getState().cameraType).toBe("front");
    });

    it("should toggle from front to back", () => {
      usePhotoStore.setState({ cameraType: "front" });
      usePhotoStore.getState().toggleCameraType();
      expect(usePhotoStore.getState().cameraType).toBe("back");
    });
  });

  // ==================== reset ====================

  describe("reset", () => {
    it("should only reset capturedImage, isCapturing, qualityResult, showQualityFeedback", () => {
      usePhotoStore.setState({
        photos: [mockPhoto],
        uploadProgress: { "photo-1": 100 },
        selectedPhoto: mockPhoto,
        capturedImageUri: "file:///captured.jpg",
        isCapturing: true,
        qualityResult: { score: 0.9, isAcceptable: true, issues: [] },
        showQualityFeedback: true,
        cameraType: "front",
        isLoading: true,
        error: "some error",
      });

      usePhotoStore.getState().reset();

      const state = usePhotoStore.getState();
      // Should be reset
      expect(state.capturedImageUri).toBeNull();
      expect(state.isCapturing).toBe(false);
      expect(state.qualityResult).toBeNull();
      expect(state.showQualityFeedback).toBe(false);

      // Should NOT be reset
      expect(state.photos).toEqual([mockPhoto]);
      expect(state.uploadProgress).toEqual({ "photo-1": 100 });
      expect(state.selectedPhoto).toEqual(mockPhoto);
      expect(state.cameraType).toBe("front");
      expect(state.isLoading).toBe(true);
      expect(state.error).toBe("some error");
    });
  });

  // ==================== fetchPhotos ====================

  describe("fetchPhotos", () => {
    it("should fetch and set photos on success", async () => {
      mockedPhotosApi.getAll.mockResolvedValueOnce({
        success: true,
        data: [mockPhoto, mockPhoto2],
      });

      await usePhotoStore.getState().fetchPhotos();

      const state = usePhotoStore.getState();
      expect(mockedPhotosApi.getAll).toHaveBeenCalled();
      expect(state.photos).toHaveLength(2);
      expect(state.isLoading).toBe(false);
    });

    it("should set error when fetch fails", async () => {
      mockedPhotosApi.getAll.mockResolvedValueOnce({
        success: false,
        error: { code: "ERR", message: "Failed to fetch photos" },
      });

      await usePhotoStore.getState().fetchPhotos();

      expect(usePhotoStore.getState().error).toBe("Failed to fetch photos");
      expect(usePhotoStore.getState().isLoading).toBe(false);
    });

    it("should set error on exception during fetch", async () => {
      mockedPhotosApi.getAll.mockRejectedValueOnce(new Error("Network error"));

      await usePhotoStore.getState().fetchPhotos();

      expect(usePhotoStore.getState().error).toBe("Network error");
      expect(usePhotoStore.getState().isLoading).toBe(false);
    });
  });
});
