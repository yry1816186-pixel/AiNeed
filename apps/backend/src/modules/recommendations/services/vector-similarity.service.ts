import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface Vector {
  id: string;
  values: number[];
  metadata?: Record<string, any>;
}

export interface SimilarityResult {
  id: string;
  score: number;
  metadata?: Record<string, any>;
}

@Injectable()
export class VectorSimilarityService {
  private readonly logger = new Logger(VectorSimilarityService.name);
  private readonly vectorDimension = 512;

  constructor(private configService: ConfigService) {}

  cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error("Vectors must have the same dimension");
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      const value1 = vec1[i] ?? 0;
      const value2 = vec2[i] ?? 0;
      dotProduct += value1 * value2;
      norm1 += value1 * value1;
      norm2 += value2 * value2;
    }

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  euclideanDistance(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error("Vectors must have the same dimension");
    }

    let sum = 0;
    for (let i = 0; i < vec1.length; i++) {
      const diff = (vec1[i] ?? 0) - (vec2[i] ?? 0);
      sum += diff * diff;
    }

    return Math.sqrt(sum);
  }

  euclideanSimilarity(vec1: number[], vec2: number[]): number {
    const distance = this.euclideanDistance(vec1, vec2);
    return 1 / (1 + distance);
  }

  manhattanDistance(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error("Vectors must have the same dimension");
    }

    let sum = 0;
    for (let i = 0; i < vec1.length; i++) {
      sum += Math.abs((vec1[i] ?? 0) - (vec2[i] ?? 0));
    }

    return sum;
  }

  dotProduct(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error("Vectors must have the same dimension");
    }

    let product = 0;
    for (let i = 0; i < vec1.length; i++) {
      product += (vec1[i] ?? 0) * (vec2[i] ?? 0);
    }

    return product;
  }

  jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    if (union.size === 0) {return 0;}

    return intersection.size / union.size;
  }

  pearsonCorrelation(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error("Vectors must have the same dimension");
    }

    const n = vec1.length;
    if (n === 0) {return 0;}

    const sum1 = vec1.reduce((a, b) => a + b, 0);
    const sum2 = vec2.reduce((a, b) => a + b, 0);

    const mean1 = sum1 / n;
    const mean2 = sum2 / n;

    let numerator = 0;
    let denom1 = 0;
    let denom2 = 0;

    for (let i = 0; i < n; i++) {
      const diff1 = (vec1[i] ?? 0) - mean1;
      const diff2 = (vec2[i] ?? 0) - mean2;

      numerator += diff1 * diff2;
      denom1 += diff1 * diff1;
      denom2 += diff2 * diff2;
    }

    const denominator = Math.sqrt(denom1 * denom2);

    if (denominator === 0) {return 0;}

    return numerator / denominator;
  }

  findTopKSimilar(
    queryVector: number[],
    vectors: Vector[],
    k: number = 10,
    method: "cosine" | "euclidean" | "dot" = "cosine",
  ): SimilarityResult[] {
    const similarities: SimilarityResult[] = vectors.map((v) => {
      let score: number;

      switch (method) {
        case "cosine":
          score = this.cosineSimilarity(queryVector, v.values);
          break;
        case "euclidean":
          score = this.euclideanSimilarity(queryVector, v.values);
          break;
        case "dot":
          score = this.dotProduct(queryVector, v.values);
          break;
        default:
          score = this.cosineSimilarity(queryVector, v.values);
      }

      return {
        id: v.id,
        score,
        metadata: v.metadata,
      };
    });

    return similarities.sort((a, b) => b.score - a.score).slice(0, k);
  }

  normalizeVector(vec: number[]): number[] {
    const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));

    if (norm === 0) {return vec.map(() => 0);}

    return vec.map((val) => val / norm);
  }

  l2Normalize(vec: number[]): number[] {
    return this.normalizeVector(vec);
  }

  meanVector(vectors: number[][]): number[] {
    if (vectors.length === 0) {
      return new Array(this.vectorDimension).fill(0);
    }

    const firstVector = vectors[0] ?? [];
    const dim = firstVector.length;
    const mean = new Array(dim).fill(0);

    for (const vec of vectors) {
      for (let i = 0; i < dim; i++) {
        mean[i] += vec[i] ?? 0;
      }
    }

    return mean.map((val) => val / vectors.length);
  }

  weightedAverage(vectors: { vector: number[]; weight: number }[]): number[] {
    if (vectors.length === 0) {
      return new Array(this.vectorDimension).fill(0);
    }

    const firstVector = vectors[0]?.vector ?? [];
    const dim = firstVector.length;
    const result = new Array(dim).fill(0);
    let totalWeight = 0;

    for (const { vector, weight } of vectors) {
      totalWeight += weight;
      for (let i = 0; i < dim; i++) {
        result[i] += (vector[i] ?? 0) * weight;
      }
    }

    if (totalWeight === 0) {return result;}

    return result.map((val) => val / totalWeight);
  }

  concatenateVectors(vec1: number[], vec2: number[]): number[] {
    return [...vec1, ...vec2];
  }

  hadamardProduct(vec1: number[], vec2: number[]): number[] {
    if (vec1.length !== vec2.length) {
      throw new Error("Vectors must have the same dimension");
    }

    return vec1.map((val, i) => val * (vec2[i] ?? 0));
  }

  generateRandomVector(dimension: number = this.vectorDimension): number[] {
    return this.generateDeterministicVector(`default:${dimension}`, dimension);
  }

  generateDeterministicVector(
    seed: string,
    dimension: number = this.vectorDimension,
  ): number[] {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    const vector: number[] = [];
    let current = Math.abs(hash);

    for (let i = 0; i < dimension; i++) {
      current = (current * 1103515245 + 12345) % 2147483648;
      vector.push(((current % 2000) - 1000) / 1000);
    }

    return this.normalizeVector(vector);
  }

  combineMultipleSimilarities(
    scores: Map<string, Map<string, number>>,
    weights: Map<string, number>,
  ): Map<string, number> {
    const combined = new Map<string, number>();
    const itemIds = new Set<string>();

    for (const methodScores of scores.values()) {
      for (const itemId of methodScores.keys()) {
        itemIds.add(itemId);
      }
    }

    for (const itemId of itemIds) {
      let totalScore = 0;
      let totalWeight = 0;

      for (const [method, methodScores] of scores) {
        const score = methodScores.get(itemId) || 0;
        const weight = weights.get(method) || 1;
        totalScore += score * weight;
        totalWeight += weight;
      }

      combined.set(itemId, totalScore / totalWeight);
    }

    return combined;
  }

  softmax(scores: number[]): number[] {
    const maxScore = Math.max(...scores);
    const expScores = scores.map((s) => Math.exp(s - maxScore));
    const sumExp = expScores.reduce((a, b) => a + b, 0);

    return expScores.map((e) => e / sumExp);
  }

  minMaxNormalize(scores: number[]): number[] {
    const min = Math.min(...scores);
    const max = Math.max(...scores);

    if (max === min) {
      return scores.map(() => 0.5);
    }

    return scores.map((s) => (s - min) / (max - min));
  }

  zScoreNormalize(scores: number[]): number[] {
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance =
      scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const std = Math.sqrt(variance);

    if (std === 0) {
      return scores.map(() => 0);
    }

    return scores.map((s) => (s - mean) / std);
  }
}
