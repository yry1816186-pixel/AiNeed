import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";

export interface ClothingNode {
  id: string;
  features: number[];
  category: string;
  attributes: Record<string, string[]>;
}

export interface CompatibilityEdge {
  sourceId: string;
  targetId: string;
  weight: number;
  type: "compatible" | "frequently_bought_together" | "style_match";
}

export interface Hyperedge {
  id: string;
  nodeIds: string[];
  weight: number;
  outfitType: string;
}

export interface CompatibilityResult {
  score: number;
  reasons: string[];
  breakdown: {
    gnnScore: number;
    hypergraphScore: number;
    crossAttentionScore: number;
  };
}

@Injectable()
export class GNNCompatibilityService {
  private readonly logger = new Logger(GNNCompatibilityService.name);

  private aiClient: AxiosInstance;
  private serviceAvailable = false;

  private nodeFeatures: Map<string, number[]> = new Map();
  private nodeMetadata: Map<
    string,
    { category: string; attributes: Record<string, string[]> }
  > = new Map();
  private adjacencyList: Map<string, Set<string>> = new Map();
  private edgeWeights: Map<string, number> = new Map();
  private hyperedges: Hyperedge[] = [];
  private hypergraphIncidence: Map<string, Set<string>> = new Map();

  private readonly categoryCompatibility: Record<string, string[]> = {
    tops: ["bottoms", "outerwear", "footwear", "accessories"],
    bottoms: ["tops", "outerwear", "footwear", "accessories"],
    dresses: ["footwear", "accessories", "outerwear"],
    outerwear: ["tops", "bottoms", "footwear"],
    footwear: ["tops", "bottoms", "dresses"],
    accessories: ["tops", "bottoms", "dresses", "footwear"],
  };

  private readonly styleCompatibility: Record<string, Record<string, number>> =
    {
      casual: { casual: 1.0, sporty: 0.8, streetwear: 0.9, minimalist: 0.7 },
      formal: { formal: 1.0, classic: 0.9, minimalist: 0.8 },
      sporty: { sporty: 1.0, casual: 0.8, streetwear: 0.7 },
      streetwear: { streetwear: 1.0, casual: 0.9, sporty: 0.7 },
      bohemian: { bohemian: 1.0, vintage: 0.8, casual: 0.6 },
      vintage: { vintage: 1.0, bohemian: 0.8, classic: 0.7 },
      minimalist: { minimalist: 1.0, classic: 0.9, formal: 0.8 },
      classic: { classic: 1.0, formal: 0.9, minimalist: 0.8 },
    };

  constructor(private configService: ConfigService) {
    const aiServiceUrl = this.configService.get<string>(
      "AI_SERVICE_URL",
      "http://localhost:8001",
    );

    this.aiClient = axios.create({
      baseURL: aiServiceUrl,
      timeout: 60000,
      headers: { "Content-Type": "application/json" },
    });

    this.checkServiceHealth();
    this.logger.log("GNN Compatibility Service initialized");
  }

  private async checkServiceHealth(): Promise<void> {
    try {
      const response = await this.aiClient.get("/health", { timeout: 5000 });
      if (response.data?.status === "healthy") {
        this.serviceAvailable = true;
        this.logger.log("Python AI Service connected for GNN embeddings");
      }
    } catch (error) {
      this.logger.warn(
        "Python AI Service not available, using local computation",
      );
      this.serviceAvailable = false;
    }
  }

  async addNode(node: ClothingNode): Promise<void> {
    this.nodeFeatures.set(node.id, node.features);
    this.nodeMetadata.set(node.id, {
      category: node.category,
      attributes: node.attributes,
    });

    if (!this.adjacencyList.has(node.id)) {
      this.adjacencyList.set(node.id, new Set());
    }

    this.logger.debug(`Added node ${node.id} to graph`);
  }

  async addEdge(edge: CompatibilityEdge): Promise<void> {
    const { sourceId, targetId, weight } = edge;

    if (!this.adjacencyList.has(sourceId)) {
      this.adjacencyList.set(sourceId, new Set());
    }
    if (!this.adjacencyList.has(targetId)) {
      this.adjacencyList.set(targetId, new Set());
    }

    this.adjacencyList.get(sourceId)!.add(targetId);
    this.adjacencyList.get(targetId)!.add(sourceId);

    const edgeKey = this.getEdgeKey(sourceId, targetId);
    this.edgeWeights.set(edgeKey, weight);

    this.logger.debug(
      `Added edge ${sourceId} <-> ${targetId} with weight ${weight}`,
    );
  }

  async addHyperedge(hyperedge: Hyperedge): Promise<void> {
    this.hyperedges.push(hyperedge);

    for (const nodeId of hyperedge.nodeIds) {
      if (!this.hypergraphIncidence.has(nodeId)) {
        this.hypergraphIncidence.set(nodeId, new Set());
      }
      this.hypergraphIncidence.get(nodeId)!.add(hyperedge.id);
    }

    this.logger.debug(
      `Added hyperedge ${hyperedge.id} with ${hyperedge.nodeIds.length} nodes`,
    );
  }

  async computeCompatibility(
    sourceId: string,
    targetId: string,
  ): Promise<CompatibilityResult> {
    this.logger.log(
      `Computing compatibility between ${sourceId} and ${targetId}`,
    );

    const sourceFeatures = this.nodeFeatures.get(sourceId);
    const targetFeatures = this.nodeFeatures.get(targetId);
    const sourceMeta = this.nodeMetadata.get(sourceId);
    const targetMeta = this.nodeMetadata.get(targetId);

    if (!sourceFeatures || !targetFeatures) {
      return this.getDefaultResult();
    }

    const embeddingSimilarity = this.cosineSimilarity(
      sourceFeatures,
      targetFeatures,
    );

    const categoryScore = this.computeCategoryCompatibility(
      sourceMeta?.category || "",
      targetMeta?.category || "",
    );

    const styleScore = this.computeStyleCompatibility(
      sourceMeta?.attributes?.styles || [],
      targetMeta?.attributes?.styles || [],
    );

    const colorScore = this.computeColorCompatibility(
      sourceMeta?.attributes?.colors || [],
      targetMeta?.attributes?.colors || [],
    );

    const gnnScore = this.computeGNNScore(
      sourceId,
      targetId,
      embeddingSimilarity,
    );
    const hypergraphScore = this.computeHypergraphScore(sourceId, targetId);
    const crossAttentionScore = this.computeCrossAttentionScore(
      embeddingSimilarity,
      categoryScore,
      styleScore,
      colorScore,
    );

    const fusedScore = this.fuseScores(
      gnnScore,
      hypergraphScore,
      crossAttentionScore,
    );

    const reasons = this.generateReasons(
      categoryScore,
      styleScore,
      colorScore,
      embeddingSimilarity,
      sourceMeta?.attributes?.styles || [],
      targetMeta?.attributes?.styles || [],
    );

    return {
      score: fusedScore,
      reasons,
      breakdown: {
        gnnScore,
        hypergraphScore,
        crossAttentionScore,
      },
    };
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {return 0;}

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      const valueA = a[i] ?? 0;
      const valueB = b[i] ?? 0;
      dotProduct += valueA * valueB;
      normA += valueA * valueA;
      normB += valueB * valueB;
    }

    if (normA === 0 || normB === 0) {return 0;}

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private computeCategoryCompatibility(cat1: string, cat2: string): number {
    if (!cat1 || !cat2) {return 0.5;}

    if (cat1 === cat2) {return 0.3;}

    const compatibleCategories = this.categoryCompatibility[cat1] || [];
    if (compatibleCategories.includes(cat2)) {return 0.9;}

    return 0.4;
  }

  private computeStyleCompatibility(
    styles1: string[],
    styles2: string[],
  ): number {
    if (!styles1.length || !styles2.length) {return 0.5;}

    let maxScore = 0;
    for (const s1 of styles1) {
      const styleMap = this.styleCompatibility[s1];
      if (styleMap) {
        for (const s2 of styles2) {
          const score = styleMap[s2] || 0.5;
          maxScore = Math.max(maxScore, score);
        }
      }
    }

    return maxScore;
  }

  private computeColorCompatibility(
    colors1: string[],
    colors2: string[],
  ): number {
    if (!colors1.length || !colors2.length) {return 0.5;}

    const neutralColors = ["black", "white", "gray", "beige", "navy"];

    for (const c1 of colors1) {
      if (neutralColors.includes(c1.toLowerCase())) {continue;}
      for (const c2 of colors2) {
        if (neutralColors.includes(c2.toLowerCase())) {continue;}
        if (c1.toLowerCase() === c2.toLowerCase()) {return 0.7;}
      }
    }

    for (const c1 of colors1) {
      if (neutralColors.includes(c1.toLowerCase())) {
        return 0.8;
      }
    }
    for (const c2 of colors2) {
      if (neutralColors.includes(c2.toLowerCase())) {
        return 0.8;
      }
    }

    return 0.6;
  }

  private computeGNNScore(
    sourceId: string,
    targetId: string,
    embeddingSimilarity: number,
  ): number {
    const neighbors = this.getNeighbors(sourceId);
    const targetNeighbors = this.getNeighbors(targetId);

    const commonNeighbors = neighbors.filter((n) =>
      targetNeighbors.includes(n),
    );

    let neighborBonus = 0;
    if (commonNeighbors.length > 0) {
      neighborBonus = Math.min(0.2, commonNeighbors.length * 0.05);
    }

    const edgeKey = this.getEdgeKey(sourceId, targetId);
    const edgeWeight = this.edgeWeights.get(edgeKey) || 0;
    const edgeBonus = edgeWeight > 0 ? 0.15 : 0;

    return Math.min(
      1,
      (embeddingSimilarity + 1) / 2 + neighborBonus + edgeBonus,
    );
  }

  private computeHypergraphScore(sourceId: string, targetId: string): number {
    const sourceHyperedges =
      this.hypergraphIncidence.get(sourceId) || new Set();
    const targetHyperedges =
      this.hypergraphIncidence.get(targetId) || new Set();

    const commonHyperedges = [...sourceHyperedges].filter((h) =>
      targetHyperedges.has(h),
    );

    if (commonHyperedges.length === 0) {return 0.5;}

    let totalWeight = 0;
    for (const heId of commonHyperedges) {
      const hyperedge = this.hyperedges.find((h) => h.id === heId);
      if (hyperedge) {
        totalWeight += hyperedge.weight;
      }
    }

    return Math.min(1, 0.5 + totalWeight * 0.1 + commonHyperedges.length * 0.1);
  }

  private computeCrossAttentionScore(
    embeddingSimilarity: number,
    categoryScore: number,
    styleScore: number,
    colorScore: number,
  ): number {
    const weights = {
      embedding: 0.4,
      category: 0.25,
      style: 0.2,
      color: 0.15,
    };

    return (
      weights.embedding * ((embeddingSimilarity + 1) / 2) +
      weights.category * categoryScore +
      weights.style * styleScore +
      weights.color * colorScore
    );
  }

  private fuseScores(
    gnnScore: number,
    hypergraphScore: number,
    crossAttentionScore: number,
  ): number {
    const weights = {
      gnn: 0.35,
      hypergraph: 0.35,
      crossAttention: 0.3,
    };

    return (
      weights.gnn * gnnScore +
      weights.hypergraph * hypergraphScore +
      weights.crossAttention * crossAttentionScore
    );
  }

  private generateReasons(
    categoryScore: number,
    styleScore: number,
    colorScore: number,
    embeddingSimilarity: number,
    styles1: string[],
    styles2: string[],
  ): string[] {
    const reasons: string[] = [];

    if (categoryScore > 0.8) {
      reasons.push("类别互补，适合搭配");
    }

    if (styleScore > 0.8) {
      const commonStyles = styles1.filter((s) => styles2.includes(s));
      if (commonStyles.length > 0) {
        reasons.push(`风格匹配: ${commonStyles.join(", ")}`);
      } else {
        reasons.push("风格协调");
      }
    } else if (styleScore > 0.6) {
      reasons.push("风格基本协调");
    }

    if (colorScore > 0.7) {
      reasons.push("色彩搭配和谐");
    }

    if (embeddingSimilarity > 0.8) {
      reasons.push("视觉风格高度相似");
    } else if (embeddingSimilarity > 0.6) {
      reasons.push("视觉风格相近");
    }

    if (reasons.length === 0) {
      reasons.push("基础搭配推荐");
    }

    return reasons.slice(0, 3);
  }

  private getNeighbors(nodeId: string): string[] {
    return Array.from(this.adjacencyList.get(nodeId) || []);
  }

  private getEdgeKey(sourceId: string, targetId: string): string {
    return [sourceId, targetId].sort().join("-");
  }

  private getDefaultResult(): CompatibilityResult {
    return {
      score: 0.5,
      reasons: ["数据不足，无法精确计算"],
      breakdown: {
        gnnScore: 0.5,
        hypergraphScore: 0.5,
        crossAttentionScore: 0.5,
      },
    };
  }

  async batchComputeCompatibility(
    pairs: Array<{ sourceId: string; targetId: string }>,
  ): Promise<CompatibilityResult[]> {
    return Promise.all(
      pairs.map((pair) =>
        this.computeCompatibility(pair.sourceId, pair.targetId),
      ),
    );
  }

  async getRecommendations(
    itemId: string,
    options?: { limit?: number; category?: string },
  ): Promise<Array<{ itemId: string; score: number; reasons: string[] }>> {
    const limit = options?.limit || 10;
    const candidates: Array<{
      itemId: string;
      score: number;
      reasons: string[];
    }> = [];

    const sourceMeta = this.nodeMetadata.get(itemId);
    const targetCategories = sourceMeta
      ? this.categoryCompatibility[sourceMeta.category] || []
      : [];

    for (const [nodeId] of this.nodeFeatures) {
      if (nodeId !== itemId) {
        const nodeMeta = this.nodeMetadata.get(nodeId);

        if (options?.category && nodeMeta?.category !== options.category)
          {continue;}
        if (
          targetCategories.length > 0 &&
          !targetCategories.includes(nodeMeta?.category || "")
        ) {
          continue;
        }

        const result = await this.computeCompatibility(itemId, nodeId);
        candidates.push({
          itemId: nodeId,
          score: result.score,
          reasons: result.reasons,
        });
      }
    }

    candidates.sort((a, b) => b.score - a.score);

    return candidates.slice(0, limit);
  }

  async buildOutfitHyperedge(
    itemIds: string[],
    outfitType: string,
    weight: number,
  ): Promise<Hyperedge> {
    const hyperedge: Hyperedge = {
      id: `outfit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      nodeIds: itemIds,
      weight,
      outfitType,
    };

    await this.addHyperedge(hyperedge);

    return hyperedge;
  }

  getGraphStats(): {
    numNodes: number;
    numEdges: number;
    numHyperedges: number;
  } {
    let numEdges = 0;
    for (const [, neighbors] of this.adjacencyList) {
      numEdges += neighbors.size;
    }
    numEdges = Math.floor(numEdges / 2);

    return {
      numNodes: this.nodeFeatures.size,
      numEdges,
      numHyperedges: this.hyperedges.length,
    };
  }

  isServiceAvailable(): boolean {
    return this.serviceAvailable;
  }
}
