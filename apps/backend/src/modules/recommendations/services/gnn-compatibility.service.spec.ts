import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";

import { GNNCompatibilityService, CompatibilityResult } from "./gnn-compatibility.service";

describe("GNNCompatibilityService", () => {
  let service: GNNCompatibilityService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      const config: Record<string, unknown> = {
        AI_SERVICE_URL: "http://localhost:8001",
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GNNCompatibilityService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<GNNCompatibilityService>(GNNCompatibilityService);
  });

  describe("cosineSimilarity (via computeCompatibility)", () => {
    it("returns high score for identical feature vectors", async () => {
      const features = [0.5, 0.3, 0.8, 0.1];
      await service.addNode({
        id: "a",
        features,
        category: "tops",
        attributes: { styles: ["casual"], colors: ["black"] },
      });
      await service.addNode({
        id: "b",
        features,
        category: "bottoms",
        attributes: { styles: ["casual"], colors: ["white"] },
      });

      const result = await service.computeCompatibility("a", "b");

      expect(result.score).toBeGreaterThan(0);
      expect(result.breakdown.gnnScore).toBeGreaterThan(0.5);
    });

    it("returns low embedding similarity for orthogonal vectors", async () => {
      // Orthogonal: dot product = 0, but cosine returns 0 for orthogonal
      await service.addNode({
        id: "orth-a",
        features: [1, 0, 0],
        category: "tops",
        attributes: { styles: ["casual"], colors: ["red"] },
      });
      await service.addNode({
        id: "orth-b",
        features: [0, 1, 0],
        category: "bottoms",
        attributes: { styles: ["formal"], colors: ["blue"] },
      });

      const result = await service.computeCompatibility("orth-a", "orth-b");

      // Embedding similarity should be near 0, but other signals lift the total
      expect(result.breakdown.crossAttentionScore).toBeLessThan(0.5);
    });
  });

  describe("computeColorCompatibility with CIEDE2000", () => {
    it("returns high score for same color (black + black)", async () => {
      await service.addNode({
        id: "c1",
        features: [0.1],
        category: "tops",
        attributes: { styles: ["casual"], colors: ["black"] },
      });
      await service.addNode({
        id: "c2",
        features: [0.1],
        category: "bottoms",
        attributes: { styles: ["casual"], colors: ["black"] },
      });

      const result = await service.computeCompatibility("c1", "c2");

      // Same color via CIEDE2000 deltaE=0 → score near 1.0
      expect(result.reasons).toEqual(expect.arrayContaining(["色彩搭配和谐"]));
    });

    it("returns lower score for complementary (clashing) colors", async () => {
      await service.addNode({
        id: "c3",
        features: [0.1],
        category: "tops",
        attributes: { styles: ["casual"], colors: ["red"] },
      });
      await service.addNode({
        id: "c4",
        features: [0.1],
        category: "bottoms",
        attributes: { styles: ["casual"], colors: ["green"] },
      });

      const redGreen = await service.computeCompatibility("c3", "c4");

      // Same colors for high baseline
      await service.addNode({
        id: "c5",
        features: [0.1],
        category: "tops",
        attributes: { styles: ["casual"], colors: ["navy"] },
      });
      await service.addNode({
        id: "c6",
        features: [0.1],
        category: "bottoms",
        attributes: { styles: ["casual"], colors: ["navy"] },
      });

      const navyNavy = await service.computeCompatibility("c5", "c6");

      // Complementary pair should score lower than same-color pair
      expect(redGreen.score).toBeLessThan(navyNavy.score);
    });

    it("neutral colors are always compatible", async () => {
      await service.addNode({
        id: "n1",
        features: [0.1],
        category: "tops",
        attributes: { styles: ["casual"], colors: ["black"] },
      });
      await service.addNode({
        id: "n2",
        features: [0.1],
        category: "bottoms",
        attributes: { styles: ["casual"], colors: ["white"] },
      });

      const result = await service.computeCompatibility("n1", "n2");

      // Black and white are both neutral → always high compatibility
      expect(result.reasons).toEqual(expect.arrayContaining(["色彩搭配和谐"]));
    });

    it("neutral color paired with any color yields high compatibility", async () => {
      await service.addNode({
        id: "n3",
        features: [0.1],
        category: "tops",
        attributes: { styles: ["casual"], colors: ["beige"] },
      });
      await service.addNode({
        id: "n4",
        features: [0.1],
        category: "bottoms",
        attributes: { styles: ["casual"], colors: ["red"] },
      });

      const result = await service.computeCompatibility("n3", "n4");

      // Beige is neutral, so color score should be generous
      expect(result.score).toBeGreaterThan(0.3);
    });
  });

  describe("computeOutfitScore", () => {
    it("aggregates using min*0.4 + avg*0.6", () => {
      const scores = [0.8, 0.6, 0.7];
      const result = service.computeOutfitScore(scores);

      const minScore = 0.6;
      const avgScore = (0.8 + 0.6 + 0.7) / 3;
      const expected = minScore * 0.4 + avgScore * 0.6;

      expect(result.score).toBeCloseTo(expected, 5);
    });

    it("returns 0.5 score and 0 diversity for empty input", () => {
      const result = service.computeOutfitScore([]);

      expect(result.score).toBe(0.5);
      expect(result.diversity).toBe(0);
    });

    it("returns higher diversity when scores vary", () => {
      const uniform = service.computeOutfitScore([0.7, 0.7, 0.7]);
      const varied = service.computeOutfitScore([0.9, 0.5, 0.3]);

      expect(varied.diversity).toBeGreaterThan(uniform.diversity);
    });

    it("computes correct diversity from variance", () => {
      const scores = [1.0, 0.0];
      const result = service.computeOutfitScore(scores);

      // variance = ((1-0.5)^2 + (0-0.5)^2) / 2 = 0.25, sqrt = 0.5, *5 = 2.5, min(1,2.5) = 1
      expect(result.diversity).toBe(1);
    });
  });

  describe("computeCrossAttentionScore (category-pair-specific weights)", () => {
    it("uses tops-bottoms specific weights when applicable", async () => {
      await service.addNode({
        id: "xa1",
        features: [0.5, 0.5],
        category: "tops",
        attributes: { styles: ["casual"], colors: ["black"] },
      });
      await service.addNode({
        id: "xa2",
        features: [0.5, 0.5],
        category: "bottoms",
        attributes: { styles: ["casual"], colors: ["black"] },
      });

      const result = await service.computeCompatibility("xa1", "xa2");

      // With identical embeddings, matching styles, and compatible categories,
      // the cross-attention score should reflect the tops-bottoms weight config
      expect(result.breakdown.crossAttentionScore).toBeGreaterThan(0.5);
    });

    it("falls back to default weights for unknown category pairs", async () => {
      await service.addNode({
        id: "unk1",
        features: [0.5],
        category: "hats",
        attributes: { styles: ["bohemian"], colors: ["lavender"] },
      });
      await service.addNode({
        id: "unk2",
        features: [0.5],
        category: "socks",
        attributes: { styles: ["vintage"], colors: ["mint"] },
      });

      const result = await service.computeCompatibility("unk1", "unk2");

      // Unknown pair uses default weights; result should still be a valid number
      expect(result.breakdown.crossAttentionScore).toBeGreaterThanOrEqual(0);
      expect(result.breakdown.crossAttentionScore).toBeLessThanOrEqual(1);
    });
  });

  describe("edge case: empty node features", () => {
    it("returns default result when source node is missing", async () => {
      const result = await service.computeCompatibility("missing-a", "missing-b");

      expect(result).toEqual({
        score: 0.5,
        reasons: ["数据不足，无法精确计算"],
        breakdown: {
          gnnScore: 0.5,
          hypergraphScore: 0.5,
          crossAttentionScore: 0.5,
        },
      });
    });

    it("returns default result when target node has no features", async () => {
      await service.addNode({
        id: "present",
        features: [0.1, 0.2],
        category: "tops",
        attributes: { styles: ["casual"], colors: ["black"] },
      });

      const result = await service.computeCompatibility("present", "absent");

      expect(result.score).toBe(0.5);
      expect(result.reasons).toContain("数据不足，无法精确计算");
    });
  });

  describe("batchComputeCompatibility", () => {
    it("computes compatibility for multiple pairs", async () => {
      await service.addNode({
        id: "batch-a",
        features: [0.5],
        category: "tops",
        attributes: { styles: ["casual"], colors: ["black"] },
      });
      await service.addNode({
        id: "batch-b",
        features: [0.6],
        category: "bottoms",
        attributes: { styles: ["casual"], colors: ["navy"] },
      });

      const results = await service.batchComputeCompatibility([
        { sourceId: "batch-a", targetId: "batch-b" },
        { sourceId: "batch-a", targetId: "unknown" },
      ]);

      expect(results).toHaveLength(2);
      expect(results[0]?.score).toBeGreaterThan(0);
      expect(results[1]?.score).toBe(0.5);
    });
  });

  describe("graph operations", () => {
    it("adds nodes and tracks graph stats", async () => {
      await service.addNode({
        id: "g1",
        features: [0.1],
        category: "tops",
        attributes: {},
      });
      await service.addNode({
        id: "g2",
        features: [0.2],
        category: "bottoms",
        attributes: {},
      });

      const stats = service.getGraphStats();
      expect(stats.numNodes).toBeGreaterThanOrEqual(2);
    });

    it("adds edges and reflects in stats", async () => {
      await service.addNode({
        id: "ge1",
        features: [0.1],
        category: "tops",
        attributes: {},
      });
      await service.addNode({
        id: "ge2",
        features: [0.2],
        category: "bottoms",
        attributes: {},
      });
      await service.addEdge({
        sourceId: "ge1",
        targetId: "ge2",
        weight: 0.8,
        type: "compatible",
      });

      const stats = service.getGraphStats();
      expect(stats.numEdges).toBeGreaterThanOrEqual(1);
    });

    it("adds hyperedges and reflects in stats", async () => {
      await service.addNode({
        id: "gh1",
        features: [0.1],
        category: "tops",
        attributes: {},
      });
      await service.addNode({
        id: "gh2",
        features: [0.2],
        category: "bottoms",
        attributes: {},
      });
      await service.addHyperedge({
        id: "he1",
        nodeIds: ["gh1", "gh2"],
        weight: 0.9,
        outfitType: "casual",
      });

      const stats = service.getGraphStats();
      expect(stats.numHyperedges).toBeGreaterThanOrEqual(1);
    });
  });

  describe("computeOutfitScore via buildOutfitHyperedge", () => {
    it("creates an outfit hyperedge with the provided data", async () => {
      await service.addNode({
        id: "out1",
        features: [0.1],
        category: "tops",
        attributes: {},
      });
      await service.addNode({
        id: "out2",
        features: [0.2],
        category: "bottoms",
        attributes: {},
      });

      const hyperedge = await service.buildOutfitHyperedge(
        ["out1", "out2"],
        "casual",
        0.8,
      );

      expect(hyperedge.outfitType).toBe("casual");
      expect(hyperedge.weight).toBe(0.8);
      expect(hyperedge.nodeIds).toEqual(["out1", "out2"]);
    });
  });

  describe("getRecommendations", () => {
    it("returns ranked recommendations for a given item", async () => {
      await service.addNode({
        id: "rec-source",
        features: [0.5],
        category: "tops",
        attributes: { styles: ["casual"], colors: ["black"] },
      });
      await service.addNode({
        id: "rec-target1",
        features: [0.6],
        category: "bottoms",
        attributes: { styles: ["casual"], colors: ["navy"] },
      });
      await service.addNode({
        id: "rec-target2",
        features: [0.1],
        category: "dresses",
        attributes: { styles: ["formal"], colors: ["red"] },
      });

      const recs = await service.getRecommendations("rec-source", { limit: 5 });

      expect(recs.length).toBeGreaterThan(0);
      // Sorted by score descending
      for (let i = 1; i < recs.length; i++) {
        const prev = recs[i - 1];
        const curr = recs[i];
        if (prev && curr) {
          expect(prev.score).toBeGreaterThanOrEqual(curr.score);
        }
      }
    });
  });
});