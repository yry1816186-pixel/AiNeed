/* eslint-disable @typescript-eslint/no-explicit-any */

interface FeatureFlag {
  id: string;
  key: string;
  type: string;
  value: Record<string, any>;
  enabled: boolean;
  rules: Record<string, any>;
}

export class UserSegmentStrategy {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  evaluate(flag: FeatureFlag, _userId: string, attributes?: Record<string, any>): boolean {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rules = (flag.rules as Record<string, any>) ?? {};
    const segments = rules.segments ?? [];
    const userSegment = attributes?.userSegment ?? "default";
    return segments.includes(userSegment);
  }
}
