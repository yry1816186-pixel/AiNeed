import { ProfileCompletenessService, CompletenessResult } from "./profile-completeness.service";

describe("ProfileCompletenessService", () => {
  let service: ProfileCompletenessService;

  beforeEach(() => {
    service = new ProfileCompletenessService();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("calculateCompleteness", () => {
    it("should return 0% with all fields missing", () => {
      const result = service.calculateCompleteness({});

      expect(result.percentage).toBe(0);
      expect(result.missingFields).toContain("性别");
      expect(result.missingFields).toContain("出生日期");
      expect(result.missingFields).toContain("昵称");
      expect(result.missingFields).toContain("身材数据");
      expect(result.missingFields).toContain("色彩分析");
      expect(result.missingFields).toContain("个人照片");
    });

    it("should return 100% when all fields are filled", () => {
      const result = service.calculateCompleteness({
        gender: "female",
        birthDate: new Date("1995-01-01"),
        nickname: "TestUser",
        height: 165,
        weight: 55,
        bodyType: "hourglass",
        colorSeason: "spring_warm",
        styleProfiles: [{ id: "1" }],
        stylePreferences: ["casual"],
        colorPreferences: ["red"],
        photos: [{ id: "photo1" }],
      });

      expect(result.percentage).toBe(100);
      expect(result.missingFields).toHaveLength(0);
    });

    it("should calculate basic info at 30% weight", () => {
      const result = service.calculateCompleteness({
        gender: "female",
        birthDate: new Date("1995-01-01"),
        nickname: "TestUser",
      });

      expect(result.percentage).toBe(30);
    });

    it("should calculate body data at 25% weight", () => {
      const result = service.calculateCompleteness({
        height: 165,
        weight: 55,
        bodyType: "hourglass",
      });

      expect(result.percentage).toBe(25);
    });

    it("should calculate style preferences at 20% weight", () => {
      const result = service.calculateCompleteness({
        styleProfiles: [{ id: "1" }],
        stylePreferences: ["casual"],
      });

      expect(result.percentage).toBe(20);
    });

    it("should calculate color preferences at 15% weight", () => {
      const result = service.calculateCompleteness({
        colorSeason: "spring_warm",
        colorPreferences: ["red"],
      });

      expect(result.percentage).toBe(15);
    });

    it("should calculate photos at 10% weight", () => {
      const result = service.calculateCompleteness({
        photos: [{ id: "photo1" }],
      });

      expect(result.percentage).toBe(10);
    });

    it("should handle partial fields correctly", () => {
      const result = service.calculateCompleteness({
        gender: "female",
        nickname: "TestUser",
        height: 165,
        photos: [{ id: "p1" }],
      });

      // gender (10) + nickname (10) + height (8) + photos (10) = 38
      expect(result.percentage).toBe(38);
    });

    it("should not list missing field if at least one sub-field is filled", () => {
      const result = service.calculateCompleteness({
        height: 165,
      });

      // Body data has height filled, so "身材数据" should NOT be in missing
      expect(result.missingFields).not.toContain("身材数据");
    });

    it("should report missingFields with Chinese labels", () => {
      const result = service.calculateCompleteness({});

      expect(result.missingFields).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/[\u4e00-\u9fff]/), // Contains Chinese characters
        ]),
      );
    });
  });
});
