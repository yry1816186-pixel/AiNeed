import type { FeatureFlag } from '@prisma/client';

export class UserSegmentStrategy {
  evaluate(flag: FeatureFlag, _userId: string, attributes?: Record<string, any>): boolean {
    const rules = (flag.rules as Record<string, any>) ?? {};
    const segments = rules.segments ?? [];
    const userSegment = attributes?.userSegment ?? 'default';
    return segments.includes(userSegment);
  }
}
