/**
 * 会员计划配置
 */

export interface MembershipPlanConfig {
  name: string;
  displayName: string;
  price: number;
  currency: string;
  features: {
    tryOn: number; // -1 = 无限
    aiAnalysis: number; // -1 = 无限
    recommendations: number; // -1 = 无限
    customization: boolean;
    customizationDiscount: number;
    visualSearch: number; // -1 = 无限
    support: "community" | "priority" | "vip";
    exclusiveBrands?: boolean;
    earlyAccess?: boolean;
  };
  isActive: boolean;
  sortOrder: number;
}

export const MEMBERSHIP_PLANS: Record<string, MembershipPlanConfig> = {
  free: {
    name: "free",
    displayName: "免费版",
    price: 0,
    currency: "CNY",
    features: {
      tryOn: 3,
      aiAnalysis: 1,
      recommendations: 10,
      customization: false,
      customizationDiscount: 1.0,
      visualSearch: 5,
      support: "community",
    },
    isActive: true,
    sortOrder: 0,
  },
  pro: {
    name: "pro",
    displayName: "专业版",
    price: 29,
    currency: "CNY",
    features: {
      tryOn: 30,
      aiAnalysis: 10,
      recommendations: -1,
      customization: true,
      customizationDiscount: 0.9,
      visualSearch: -1,
      support: "priority",
    },
    isActive: true,
    sortOrder: 1,
  },
  premium: {
    name: "premium",
    displayName: "尊享版",
    price: 99,
    currency: "CNY",
    features: {
      tryOn: -1,
      aiAnalysis: -1,
      recommendations: -1,
      customization: true,
      customizationDiscount: 0.8,
      visualSearch: -1,
      support: "vip",
      exclusiveBrands: true,
      earlyAccess: true,
    },
    isActive: true,
    sortOrder: 2,
  },
};

/**
 * 功能限制配置
 */
export const FEATURE_LIMITS = {
  tryOn: {
    displayName: "虚拟试衣",
    unit: "次/月",
  },
  aiAnalysis: {
    displayName: "AI形象分析",
    unit: "次/月",
  },
  recommendations: {
    displayName: "每日推荐",
    unit: "条/日",
  },
  visualSearch: {
    displayName: "以图搜图",
    unit: "次/月",
  },
};
