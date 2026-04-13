import type { FeatureFlag } from '@prisma/client';

export interface ABTestResult {
  enabled: boolean;
  variant: string;
}

export class ABTestStrategy {
  evaluate(flag: FeatureFlag, userId: string): ABTestResult {
    const variants = (flag.value as Record<string, any>).variants ?? [];
    if (!variants.length) return { enabled: false, variant: 'control' };

    const hash = this.hashUserId(userId, flag.key);
    const bucket = hash % 100;

    let cumulative = 0;
    for (const variant of variants) {
      cumulative += variant.weight ?? 0;
      if (bucket < cumulative) {
        return { enabled: true, variant: variant.name };
      }
    }
    return { enabled: true, variant: variants[0].name };
  }

  private hashUserId(userId: string, flagKey: string): number {
    const str = `${userId}:${flagKey}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
