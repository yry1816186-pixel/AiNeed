export interface User {
  id: string;
  email: string;
  nickname?: string;
  avatar?: string;
  phone?: string;
  gender?: "male" | "female" | "other";
  birthDate?: string;
  height?: number;
  weight?: number;
  bodyType?: string;
  skinTone?: string;
  colorSeason?: string;
  subscriptionTier?: "basic" | "premium" | "vip";
  preferences?: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  preferredStyles: string[];
  preferredColors: string[];
  avoidedColors: string[];
  styleAvoidances: string[];
  fitGoals: string[];
  bodyType?:
    | "rectangle"
    | "triangle"
    | "inverted_triangle"
    | "hourglass"
    | "oval";
  skinTone?: "fair" | "light" | "medium" | "olive" | "tan" | "dark";
  colorSeason?: "spring" | "summer" | "autumn" | "winter";
  height?: number;
  weight?: number;
  sizeTop?: string;
  sizeBottom?: string;
  sizeShoes?: string;
  budget?: "low" | "medium" | "high" | "luxury";
  notifications: {
    outfitReminders: boolean;
    newArrivals: boolean;
    sales: boolean;
  };
}

export interface UserStats {
  totalClothes: number;
  totalOutfits: number;
  mostWornCategory: string;
  leastWornCategory: string;
  favoriteColors: string[];
  styleDistribution: Record<string, number>;
  averageWearPerItem: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  nickname?: string;
}

export interface BodyAnalysis {
  bodyType: string;
  skinTone: string;
  colorSeason: string;
  recommendations: {
    suitable: string[];
    avoid: string[];
    tips: string[];
  };
  confidence: number;
}

export interface ColorAnalysis {
  season: "spring" | "summer" | "fall" | "winter";
  dominantColors: string[];
  recommendedColors: string[];
  avoidedColors: string[];
  palette: string[];
}
