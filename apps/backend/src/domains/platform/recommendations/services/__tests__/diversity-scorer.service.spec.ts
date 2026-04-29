import { Test, TestingModule } from "@nestjs/testing";

import { DiversityScorerService } from "../diversity-scorer.service";

describe("DiversityScorerService", () => {
  let service: DiversityScorerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DiversityScorerService],
    }).compile();

    service = module.get<DiversityScorerService>(DiversityScorerService);
  });

  it("should be defined and injectable", () => {
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(DiversityScorerService);
  });

  describe("scoreDiversity", () => {
    it("returns 0 for empty array", () => {
      expect(service.scoreDiversity([])).toBe(0);
    });

    it("returns 0 for single item", () => {
      expect(service.scoreDiversity([{ category: "tops" }])).toBe(0);
    });

    it("returns a number between 0 and 1", () => {
      const items = [
        { category: "tops", styleTags: ["casual"], price: 100 },
        { category: "bottoms", styleTags: ["formal"], price: 200 },
        { category: "footwear", styleTags: ["sporty"], price: 150 },
      ];
      const score = service.scoreDiversity(items);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it("returns high score (>0.5) for diverse items", () => {
      const items = [
        { category: "tops", styleTags: ["casual", "minimalist"], price: 100 },
        { category: "bottoms", styleTags: ["formal", "elegant"], price: 300 },
        { category: "footwear", styleTags: ["sporty", "streetwear"], price: 500 },
      ];
      const score = service.scoreDiversity(items);
      expect(score).toBeGreaterThan(0.5);
    });

    it("returns low score (<0.3) for uniform items", () => {
      const items = [
        { category: "tops", styleTags: ["casual"], price: 100 },
        { category: "tops", styleTags: ["casual"], price: 110 },
        { category: "tops", styleTags: ["casual"], price: 105 },
      ];
      const score = service.scoreDiversity(items);
      expect(score).toBeLessThan(0.3);
    });

    it("handles items without optional fields", () => {
      const items = [
        { category: "tops" },
        { category: "bottoms" },
        { category: "dresses" },
      ];
      const score = service.scoreDiversity(items);
      expect(typeof score).toBe("number");
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });
});
