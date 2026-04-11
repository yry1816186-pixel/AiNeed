export class BehaviorProfileDto {
  preferences!: {
    styles: string[];
    colors: string[];
    brands: string[];
    priceRanges: string[];
  };

  recentBehaviors!: {
    mostViewedCategories: string[];
    mostTriedOnItems: string[];
    searchKeywords: string[];
  };

  stats!: {
    totalEvents: number;
    lastActive: Date;
    avgSessionDuration: number;
    conversionRate: number;
  };
}
