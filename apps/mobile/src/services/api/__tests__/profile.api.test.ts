import apiClient from "../client";
import { profileApi } from "../profile.api";

// ---- Mocks ----
jest.mock("../client", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    upload: jest.fn(),
  },
}));

const mockGet = apiClient.get as jest.Mock;
const mockPut = apiClient.put as jest.Mock;

// ---- Tests ----
describe("profileApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== getProfile ====================

  describe("getProfile", () => {
    it("should GET /profile", async () => {
      const profileData = {
        id: "profile-1",
        userId: "user-1",
        nickname: "TestUser",
        avatar: "http://avatar.jpg",
        gender: "male" as const,
        birthDate: "1995-01-01",
        height: 175,
        weight: 70,
        bodyType: "rectangle" as const,
        skinTone: "medium" as const,
        colorSeason: "autumn" as const,
        stylePreferences: {
          preferredStyles: ["casual"],
          avoidedStyles: ["formal"],
          preferredColors: ["blue"],
          avoidedColors: ["pink"],
          fitGoals: ["comfort"],
        },
        sizeTop: "M",
        sizeBottom: "32",
        sizeShoes: "42",
        budget: "medium" as const,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-06-01T00:00:00.000Z",
      };
      mockGet.mockResolvedValue({ success: true, data: profileData });

      const result = await profileApi.getProfile();

      expect(mockGet).toHaveBeenCalledWith("/profile");
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.id).toBe("profile-1");
        expect(result.data.nickname).toBe("TestUser");
        expect(result.data.gender).toBe("male");
        expect(result.data.height).toBe(175);
        expect(result.data.bodyType).toBe("rectangle");
        expect(result.data.stylePreferences?.preferredStyles).toEqual(["casual"]);
        expect(result.data.budget).toBe("medium");
      }
    });

    it("should return error when request fails", async () => {
      mockGet.mockResolvedValue({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Not authenticated" },
      });

      const result = await profileApi.getProfile();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ==================== updateProfile ====================

  describe("updateProfile", () => {
    it("should PUT to /profile with update data", async () => {
      const updateData = {
        nickname: "UpdatedName",
        height: 180,
        weight: 75,
        bodyType: "hourglass" as const,
        stylePreferences: {
          preferredStyles: ["casual", "sporty"],
          avoidedStyles: [],
          preferredColors: ["black", "white"],
          avoidedColors: [],
          fitGoals: ["comfort", "style"],
        },
      };
      const updatedProfile = {
        id: "profile-1",
        userId: "user-1",
        nickname: "UpdatedName",
        height: 180,
        weight: 75,
        bodyType: "hourglass" as const,
        stylePreferences: updateData.stylePreferences,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-06-15T00:00:00.000Z",
      };
      mockPut.mockResolvedValue({ success: true, data: updatedProfile });

      const result = await profileApi.updateProfile(updateData);

      expect(mockPut).toHaveBeenCalledWith("/profile", updateData);
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.nickname).toBe("UpdatedName");
        expect(result.data.height).toBe(180);
      }
    });

    it("should handle partial update", async () => {
      const partialData = { nickname: "JustName" };
      mockPut.mockResolvedValue({
        success: true,
        data: { id: "profile-1", userId: "user-1", nickname: "JustName", createdAt: "", updatedAt: "" },
      });

      const result = await profileApi.updateProfile(partialData);

      expect(mockPut).toHaveBeenCalledWith("/profile", partialData);
      expect(result.success).toBe(true);
    });

    it("should return error on failed update", async () => {
      mockPut.mockResolvedValue({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid data" },
      });

      const result = await profileApi.updateProfile({ height: -1 });

      expect(result.success).toBe(false);
    });
  });

  // ==================== getBodyAnalysis ====================

  describe("getBodyAnalysis", () => {
    it("should GET /profile/body-analysis", async () => {
      const bodyAnalysis = {
        bodyType: {
          type: "hourglass" as const,
          label: "Hourglass",
          description: "Balanced proportions",
        },
        recommendations: {
          tops: ["fitted tops", "wrap tops"],
          bottoms: ["high-waisted pants", "A-line skirts"],
          dresses: ["wrap dresses", "fit-and-flare"],
          idealStyles: ["classic", "romantic"],
          avoidStyles: ["oversized"],
        },
        tips: ["Emphasize your waist", "Choose structured fabrics"],
      };
      mockGet.mockResolvedValue({ success: true, data: bodyAnalysis });

      const result = await profileApi.getBodyAnalysis();

      expect(mockGet).toHaveBeenCalledWith("/profile/body-analysis");
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.bodyType.type).toBe("hourglass");
        expect(result.data.bodyType.label).toBe("Hourglass");
        expect(result.data.recommendations.tops).toContain("fitted tops");
        expect(result.data.tips).toHaveLength(2);
      }
    });

    it("should return error when analysis is not available", async () => {
      mockGet.mockResolvedValue({
        success: false,
        error: { code: "PROFILE_INCOMPLETE", message: "Complete your profile first" },
      });

      const result = await profileApi.getBodyAnalysis();

      expect(result.success).toBe(false);
    });
  });

  // ==================== getColorAnalysis ====================

  describe("getColorAnalysis", () => {
    it("should GET /profile/color-analysis", async () => {
      const colorAnalysis = {
        colorSeason: {
          type: "autumn" as const,
          label: "Autumn",
          bestColors: ["burgundy", "olive", "camel"],
          neutralColors: ["cream", "beige"],
          avoidColors: ["neon pink", "icy blue"],
        },
        bestColors: ["burgundy", "olive", "camel"],
        neutralColors: ["cream", "beige"],
        avoidColors: ["neon pink", "icy blue"],
        metalPreference: "gold" as const,
      };
      mockGet.mockResolvedValue({ success: true, data: colorAnalysis });

      const result = await profileApi.getColorAnalysis();

      expect(mockGet).toHaveBeenCalledWith("/profile/color-analysis");
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.colorSeason.type).toBe("autumn");
        expect(result.data.bestColors).toContain("burgundy");
        expect(result.data.metalPreference).toBe("gold");
      }
    });

    it("should return error when color analysis fails", async () => {
      mockGet.mockResolvedValue({
        success: false,
        error: { code: "SERVER_ERROR", message: "Server error" },
      });

      const result = await profileApi.getColorAnalysis();

      expect(result.success).toBe(false);
    });
  });

  // ==================== getStyleRecommendations ====================

  describe("getStyleRecommendations", () => {
    it("should GET /profile/style-recommendations", async () => {
      const styleRecs = {
        styles: ["casual", "minimalist"],
        reasons: ["Matches your lifestyle", "Suits your body type"],
      };
      mockGet.mockResolvedValue({ success: true, data: styleRecs });

      const result = await profileApi.getStyleRecommendations();

      expect(mockGet).toHaveBeenCalledWith("/profile/style-recommendations");
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.styles).toContain("casual");
        expect(result.data.reasons).toHaveLength(2);
      }
    });
  });

  // ==================== getBodyMetrics ====================

  describe("getBodyMetrics", () => {
    it("should GET /profile/body-metrics", async () => {
      const metrics = {
        bmi: 22.9,
        bmiCategory: "Normal",
        waistHipRatio: 0.75,
        chestWaistRatio: 1.2,
      };
      mockGet.mockResolvedValue({ success: true, data: metrics });

      const result = await profileApi.getBodyMetrics();

      expect(mockGet).toHaveBeenCalledWith("/profile/body-metrics");
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.bmi).toBe(22.9);
        expect(result.data.bmiCategory).toBe("Normal");
      }
    });

    it("should return error when metrics are not available", async () => {
      mockGet.mockResolvedValue({
        success: false,
        error: { code: "PROFILE_INCOMPLETE", message: "Missing measurements" },
      });

      const result = await profileApi.getBodyMetrics();

      expect(result.success).toBe(false);
    });
  });
});
