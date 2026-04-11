import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

export type RootStackParamList = {
  MainTabs: undefined;
  Login: undefined;
  Register: undefined;
  Onboarding: undefined;
  Checkout: undefined;
  Orders: undefined;
  OrderDetail: { id: string };
  Notifications: undefined;
  Settings: undefined;
  NotificationSettings: undefined;
  ClothingDetail: { id: string };
  OutfitDetail: { id: string };
  RecommendationDetail: {
    id: string;
    recommendation?: {
      id: string;
      name?: string;
      brand?: string;
      price?: number;
      mainImage?: string;
      category?: string;
      score?: number;
      matchReasons?: string[];
      externalUrl?: string;
    };
  };
  AddClothing: { editId?: string } | undefined;
  Community: undefined;
  VirtualTryOn: undefined;
  Favorites: undefined;
  AiStylist: undefined;
  Customization: undefined;
  Subscription: undefined;
  TermsOfService: undefined;
  PrivacyPolicy: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Explore: undefined;
  Heart: undefined;
  Cart: undefined;
  Wardrobe: undefined;
  Profile: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = BottomTabScreenProps<MainTabParamList, T>;
