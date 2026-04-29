import { Injectable, Logger } from "@nestjs/common";

interface DiversityItem {
  category?: string;
  styleTags?: string[];
  price?: number;
}

@Injectable()
export class DiversityScorerService {
  private readonly logger = new Logger(DiversityScorerService.name);

  scoreDiversity(items: DiversityItem[]): number {
    if (items.length <= 1) {return 0;}

    const categoryEntropy = this.shannonEntropy(items.map((i) => i.category ?? "unknown"));
    const styleDiversity = this.styleTagDiversity(items.map((i) => i.styleTags ?? []));
    const priceSpread = this.priceSpread(items.map((i) => i.price ?? 0));

    return Math.min(1, categoryEntropy * 0.4 + styleDiversity * 0.35 + priceSpread * 0.25);
  }

  private shannonEntropy(values: string[]): number {
    if (values.length === 0) {return 0;}

    const freq: Record<string, number> = {};
    for (const v of values) {
      freq[v] = (freq[v] || 0) + 1;
    }

    const n = values.length;
    let entropy = 0;
    for (const count of Object.values(freq)) {
      const p = count / n;
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }

    const maxEntropy = Math.log2(n);
    return maxEntropy > 0 ? entropy / maxEntropy : 0;
  }

  private styleTagDiversity(tags: string[][]): number {
    const allTags = tags.flat();
    if (allTags.length === 0) {return 0;}

    const uniqueTags = new Set(allTags);
    return uniqueTags.size / allTags.length;
  }

  private priceSpread(prices: number[]): number {
    const nonZero = prices.filter((p) => p > 0);
    if (nonZero.length < 2) {return 0;}

    const min = Math.min(...nonZero);
    const max = Math.max(...nonZero);
    const epsilon = 1e-6;

    return (max - min) / (max + min + epsilon);
  }
}
