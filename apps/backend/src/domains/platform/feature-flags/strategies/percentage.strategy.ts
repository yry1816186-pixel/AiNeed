import type { FeatureFlag } from '@prisma/client';

export class PercentageStrategy {
  evaluate(flag: FeatureFlag, userId: string): boolean {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const percentage = (flag.value as Record<string, any>).percentage ?? 0;
    if (percentage <= 0) {return false;}
    if (percentage >= 100) {return true;}
    const hash = this.hashUserId(userId, flag.key);
    return (hash % 100) < percentage;
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
