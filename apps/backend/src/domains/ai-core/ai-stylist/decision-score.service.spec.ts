import { Test, TestingModule } from "@nestjs/testing";

import { DecisionScoreService } from "./decision-score.service";

import type { DecisionNodeType, DecisionContext, UserProfile } from "./types";

describe("DecisionScoreService", () => {
  let service: DecisionScoreService;

  const baseUserProfile: UserProfile = {
    userId: "user_1",
    bodyType: "hourglass",
    colorSeason: "autumn",
    stylePreferences: ["极简", "法式"],
    colorPreferences: ["驼色", "黑色"],
    fitGoals: ["显瘦"],
    behaviorHistory: [],
  };

  const baseContext: DecisionContext = {
    preferredStyles: ["极简"],
    styleAvoidances: [],
    fitGoals: [],
    preferredColors: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DecisionScoreService],
    }).compile();

    service = module.get<DecisionScoreService>(DecisionScoreService);
  });

  describe("calculateOptionScores", () => {
    it("应该返回包含 fitScore、styleScore、preferenceScore 的评分对象", () => {
      const opt = { id: "fitted", label: "修身", fitTypes: ["hourglass"] };
      const result = service.calculateOptionScores(opt, "top", baseContext, baseUserProfile);

      expect(result).toHaveProperty("fitScore");
      expect(result).toHaveProperty("styleScore");
      expect(result).toHaveProperty("preferenceScore");
      expect(typeof result.fitScore).toBe("number");
      expect(typeof result.styleScore).toBe("number");
      expect(typeof result.preferenceScore).toBe("number");
    });

    it("当选项 fitTypes 包含用户体型时 fitScore 应该更高", () => {
      const matchingOpt = { id: "fitted", label: "修身", fitTypes: ["hourglass"] };
      const nonMatchingOpt = { id: "loose", label: "宽松", fitTypes: ["oval"] };

      const matchingResult = service.calculateOptionScores(
        matchingOpt,
        "top",
        baseContext,
        baseUserProfile
      );
      const nonMatchingResult = service.calculateOptionScores(
        nonMatchingOpt,
        "top",
        baseContext,
        baseUserProfile
      );

      expect(matchingResult.fitScore).toBeGreaterThan(nonMatchingResult.fitScore);
    });

    it("当用户体型匹配 bodyTypeScores 映射时应该返回对应分数", () => {
      const opt = { id: "fitted", label: "修身" };
      const result = service.calculateOptionScores(opt, "top", baseContext, {
        ...baseUserProfile,
        bodyType: "hourglass",
      });

      expect(result.fitScore).toBe(90);
    });

    it("当用户体型为空时 fitScore 应该返回默认值 50", () => {
      const opt = { id: "fitted", label: "修身" };
      const result = service.calculateOptionScores(opt, "top", baseContext, {
        ...baseUserProfile,
        bodyType: undefined,
      });

      expect(result.fitScore).toBe(50);
    });

    it("当上下文 preferredStyles 包含选项标签时 styleScore 应该更高", () => {
      const opt = { id: "minimalist", label: "极简" };
      const contextWithPreference: DecisionContext = {
        ...baseContext,
        preferredStyles: ["极简"],
      };
      const contextWithoutPreference: DecisionContext = {
        ...baseContext,
        preferredStyles: [],
      };

      const withPref = service.calculateOptionScores(
        opt,
        "style",
        contextWithPreference,
        baseUserProfile
      );
      const withoutPref = service.calculateOptionScores(
        opt,
        "style",
        contextWithoutPreference,
        baseUserProfile
      );

      expect(withPref.styleScore).toBeGreaterThan(withoutPref.styleScore);
    });

    it("当上下文 styleAvoidances 包含选项标签时 styleScore 应该更低", () => {
      const opt = { id: "streetwear", label: "街头" };
      const contextWithAvoidance: DecisionContext = {
        ...baseContext,
        styleAvoidances: ["街头"],
      };
      const contextWithoutAvoidance: DecisionContext = {
        ...baseContext,
        styleAvoidances: [],
      };

      const withAvoid = service.calculateOptionScores(
        opt,
        "style",
        contextWithAvoidance,
        baseUserProfile
      );
      const withoutAvoid = service.calculateOptionScores(
        opt,
        "style",
        contextWithoutAvoidance,
        baseUserProfile
      );

      expect(withAvoid.styleScore).toBeLessThan(withoutAvoid.styleScore);
    });
  });

  describe("calculateCompositeScore", () => {
    it("应该按权重 0.3/0.3/0.4 计算综合分数", () => {
      const scores = {
        fitScore: 100,
        styleScore: 100,
        preferenceScore: 100,
      };

      const result = service.calculateCompositeScore(scores);

      expect(result).toBe(100);
    });

    it("应该正确计算不同分数的加权结果", () => {
      const scores = {
        fitScore: 80,
        styleScore: 60,
        preferenceScore: 90,
      };

      const result = service.calculateCompositeScore(scores);

      expect(result).toBeCloseTo(80 * 0.3 + 60 * 0.3 + 90 * 0.4, 5);
    });

    it("当所有分数为 0 时综合分数应该为 0", () => {
      const scores = {
        fitScore: 0,
        styleScore: 0,
        preferenceScore: 0,
      };

      const result = service.calculateCompositeScore(scores);

      expect(result).toBe(0);
    });

    it("preferenceScore 权重应该最大", () => {
      const highPreference = {
        fitScore: 0,
        styleScore: 0,
        preferenceScore: 100,
      };
      const highFit = {
        fitScore: 100,
        styleScore: 0,
        preferenceScore: 0,
      };

      const prefResult = service.calculateCompositeScore(highPreference);
      const fitResult = service.calculateCompositeScore(highFit);

      expect(prefResult).toBeGreaterThan(fitResult);
    });
  });
});
