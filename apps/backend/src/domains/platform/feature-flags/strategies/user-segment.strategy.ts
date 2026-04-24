interface FeatureFlag {
  id: string;
  key: string;
  type: string;
  value: Record<string, any>;
  enabled: boolean;
  rules: Record<string, any>;
}

export class UserSegmentStrategy {
  evaluate(flag: FeatureFlag, _userId: string, attributes?: Record<string, any>): boolean {
    const rules = flag.rules ?? {};
    const segments = rules.segments ?? [];
    const userSegment = attributes?.userSegment ?? "default";
    return segments.includes(userSegment);
  }
}
