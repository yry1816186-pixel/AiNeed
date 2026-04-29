/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { Suspense, lazy, useMemo } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type {
  TodayStackParamList,
  DiscoverStackParamList,
  WeekStackParamList,
  StylistStackParamList,
  ProfileStackParamList,
} from "./types";
import { GuardedScreen } from "./RouteGuards";

import { flatColors as colors } from "../design-system/theme";

const OutfitPlanScreenLazy = lazy(() => import("../features/stylist/screens/OutfitPlanScreen"));
const ChatHistoryScreenLazy = lazy(() => import("../features/stylist/screens/ChatHistoryScreen"));
const AIStylistScreen = lazy(() => import("../features/stylist/screens/StylistScreen"));

const TryOnResultScreenLazy = lazy(() => import("../features/tryon/screens/TryOnResultScreen"));

const PaymentScreenLazy = lazy(() => import("../features/commerce/screens/PaymentScreen"));

const PostDetailScreenLazy = lazy(() => import("../features/community/screens/PostDetailScreen"));
const PostCreateScreenLazy = lazy(() => import("../features/community/screens/CreatePostScreen"));
const InfluencerProfileScreenLazy = lazy(
  () => import("../features/community/screens/InfluencerProfileScreen")
);
const InspirationWardrobeScreenLazy = lazy(
  () => import("../features/community/screens/InspirationWardrobeScreen")
);

const CustomEditorScreenLazy = lazy(
  () => import("../features/customization/screens/CustomizationEditorScreen")
);
const BrandScreenLazy = lazy(() => import("../features/wardrobe/screens/BrandScreen"));

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
});

const screenLoader = (
  <View style={styles.loader}>
    <ActivityIndicator size="large" color={colors.primary} />
  </View>
);

const commonScreenOptions = { headerShown: false } as const;

const TodayScreen = lazy(() => import("../features/today/screens/TodayScreen"));
const DiscoverScreen = lazy(() => import("../features/discover/screens/DiscoverScreen"));
const SearchScreen = lazy(() =>
  import("../features/search/screens/SearchScreen").then((m) => ({ default: m.SearchScreen }))
);
const NotificationsScreen = lazy(
  () => import("../features/notifications/screens/NotificationsScreen")
);
const RecommendationDetailScreen = lazy(
  () => import("../features/home/screens/RecommendationDetailScreen")
);
const ProductScreen = lazy(() => import("../features/wardrobe/screens/ClothingDetailScreen"));
const OutfitDetailScreen = lazy(() => import("../features/stylist/screens/OutfitDetailScreen"));

const SessionCalendarScreen = lazy(
  () => import("../features/stylist/screens/SessionCalendarScreen")
);

const VirtualTryOnScreen = lazy(() => import("../features/tryon/screens/VirtualTryOnScreen"));
const TryOnHistoryScreenLazy = lazy(() =>
  import("../shared/components/screens/TryOnHistoryScreen").then((m) => ({
    default: m.TryOnHistoryScreen,
  }))
);

const CommunityFeedScreen = lazy(() => import("../features/community/screens/CommunityScreen"));
const BloggerDashboardScreen = lazy(
  () => import("../features/community/screens/BloggerDashboardScreen")
);
const BloggerProfileScreen = lazy(
  () => import("../features/community/screens/BloggerProfileScreen")
);
const BloggerProductScreen = lazy(
  () => import("../features/community/screens/BloggerProductScreen")
);

const ProfileMainScreen = lazy(() => import("../features/profile/screens/ProfileScreen"));
const ProfileEditScreen = lazy(() =>
  import("../features/profile/screens/ProfileEditScreen").then((m) => ({
    default: m.ProfileEditScreen,
  }))
);
const BodyAnalysisScreen = lazy(() =>
  import("../features/profile/screens/BodyAnalysisScreen").then((m) => ({
    default: m.BodyAnalysisScreen,
  }))
);
const ColorAnalysisScreen = lazy(() =>
  import("../features/profile/screens/ColorAnalysisScreen").then((m) => ({
    default: m.ColorAnalysisScreen,
  }))
);
const SharePosterScreen = lazy(() =>
  import("../features/profile/screens/SharePosterScreen").then((m) => ({
    default: m.SharePosterScreen,
  }))
);
const StyleQuizScreen = lazy(() =>
  import("../features/style-quiz/screens/StyleQuizScreen").then((m) => ({
    default: m.StyleQuizScreen,
  }))
);
const WardrobeScreen = lazy(() => import("../features/wardrobe/screens/WardrobeScreen"));
const FavoritesScreen = lazy(() =>
  import("../features/wardrobe/screens/FavoritesScreen").then((m) => ({
    default: m.FavoritesScreen,
  }))
);
const SettingsScreen = lazy(() => import("../features/profile/screens/SettingsScreen"));
const NotificationSettingsScreen = lazy(
  () => import("../features/notifications/screens/NotificationSettingsScreen")
);
const SubscriptionScreen = lazy(() => import("../features/commerce/screens/SubscriptionScreen"));
const CartScreen = lazy(() => import("../features/commerce/screens/CartScreen"));
const CheckoutScreen = lazy(() => import("../features/commerce/screens/CheckoutScreen"));
const OrdersScreen = lazy(() => import("../features/commerce/screens/OrdersScreen"));
const OrderDetailScreen = lazy(() => import("../features/commerce/screens/OrderDetailScreen"));
const AddClothingScreen = lazy(() => import("../features/wardrobe/screens/AddClothingScreen"));
const CustomDesignScreen = lazy(
  () => import("../features/customization/screens/CustomizationScreen")
);
const LegalScreenLazy = lazy(() => import("../features/profile/screens/LegalScreen"));
function LegalScreenWrapper() {
  return <LegalScreenLazy type="terms" />;
}

const WeekScreen = lazy(() =>
  import("../features/week/screens/WeekScreen").then((m) => ({ default: m.WeekScreen }))
);
const OutfitDiaryScreen = lazy(() =>
  import("../features/home/components/OutfitDiaryScreen").then((m) => ({
    default: m.OutfitDiaryScreen,
  }))
);
const WeeklyReportScreen = lazy(() =>
  import("../features/home/components/WeeklyReportScreen").then((m) => ({
    default: m.WeeklyReportScreen,
  }))
);

const AdvisorListScreen = lazy(() => import("../features/consultant/screens/AdvisorListScreen"));
const AdvisorProfileScreen = lazy(
  () => import("../features/consultant/screens/AdvisorProfileScreen")
);
const BookingScreen = lazy(() => import("../features/consultant/screens/BookingScreen"));
const ChatScreen = lazy(() => import("../features/consultant/screens/ChatScreen"));

function withGuard(Component: React.LazyExoticComponent<React.ComponentType>, route: string) {
  return function GuardedComponent() {
    return (
      <GuardedScreen routeName={route}>
        <Component />
      </GuardedScreen>
    );
  };
}

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={screenLoader}>{children}</Suspense>;
}

// ============================================================
// Today Stack
// ============================================================
const TodayStack = createNativeStackNavigator<TodayStackParamList>();

export function TodayStackNavigator() {
  return (
    <SuspenseWrapper>
      <TodayStack.Navigator screenOptions={commonScreenOptions} initialRouteName="TodayMain">
        <TodayStack.Screen
          name="TodayMain"
          options={{ animation: "slide_from_right" }}
          component={TodayScreen}
        />
        <TodayStack.Screen
          name="Search"
          options={{ animation: "slide_from_right" }}
          component={SearchScreen}
        />
        <TodayStack.Screen
          name="Notifications"
          options={{ animation: "slide_from_right" }}
          component={withGuard(NotificationsScreen, "Notifications")}
        />
        <TodayStack.Screen
          name="RecommendationDetail"
          options={{ animation: "slide_from_right" }}
          component={RecommendationDetailScreen}
        />
        <TodayStack.Screen
          name="Product"
          options={{ animation: "slide_from_right" }}
          component={ProductScreen}
        />
        <TodayStack.Screen
          name="OutfitDetail"
          options={{ animation: "slide_from_right" }}
          component={OutfitDetailScreen}
        />
      </TodayStack.Navigator>
    </SuspenseWrapper>
  );
}

// ============================================================
// Discover Stack
// ============================================================
const DiscoverStack = createNativeStackNavigator<DiscoverStackParamList>();

export function DiscoverStackNavigator() {
  return (
    <SuspenseWrapper>
      <DiscoverStack.Navigator screenOptions={commonScreenOptions} initialRouteName="DiscoverMain">
        <DiscoverStack.Screen
          name="DiscoverMain"
          options={{ animation: "slide_from_right" }}
          component={DiscoverScreen}
        />
        <DiscoverStack.Screen
          name="CommunityFeed"
          options={{ animation: "slide_from_right" }}
          component={CommunityFeedScreen}
        />
        <DiscoverStack.Screen
          name="PostDetail"
          options={{ animation: "slide_from_right" }}
          component={PostDetailScreenLazy}
        />
        <DiscoverStack.Screen
          name="PostCreate"
          options={{ animation: "slide_from_bottom" }}
          component={withGuard(PostCreateScreenLazy, "PostCreate")}
        />
        <DiscoverStack.Screen
          name="InfluencerProfile"
          options={{ animation: "slide_from_right" }}
          component={withGuard(InfluencerProfileScreenLazy, "InfluencerProfile")}
        />
        <DiscoverStack.Screen
          name="InspirationWardrobe"
          options={{ animation: "slide_from_right" }}
          component={withGuard(InspirationWardrobeScreenLazy, "InspirationWardrobe")}
        />
        <DiscoverStack.Screen
          name="BloggerDashboard"
          options={{ animation: "slide_from_right" }}
          component={withGuard(BloggerDashboardScreen, "BloggerDashboard")}
        />
        <DiscoverStack.Screen
          name="BloggerProfile"
          options={{ animation: "slide_from_right" }}
          component={BloggerProfileScreen}
        />
        <DiscoverStack.Screen
          name="BloggerProduct"
          options={{ animation: "slide_from_right" }}
          component={BloggerProductScreen}
        />
        <DiscoverStack.Screen
          name="VirtualTryOn"
          options={{ animation: "slide_from_right" }}
          component={withGuard(VirtualTryOnScreen, "VirtualTryOn")}
        />
        <DiscoverStack.Screen
          name="TryOnResult"
          options={{ animation: "fade" }}
          component={withGuard(TryOnResultScreenLazy, "TryOnResult")}
        />
        <DiscoverStack.Screen
          name="TryOnHistory"
          options={{ animation: "slide_from_right" }}
          component={withGuard(TryOnHistoryScreenLazy, "TryOnHistory")}
        />
        <DiscoverStack.Screen
          name="Wardrobe"
          options={{ animation: "slide_from_right" }}
          component={withGuard(WardrobeScreen, "Wardrobe")}
        />
        <DiscoverStack.Screen
          name="Favorites"
          options={{ animation: "slide_from_right" }}
          component={withGuard(FavoritesScreen, "Favorites")}
        />
      </DiscoverStack.Navigator>
    </SuspenseWrapper>
  );
}

// ============================================================
// Stylist Stack
// ============================================================
const StylistStack = createNativeStackNavigator<StylistStackParamList>();

export function StylistStackNavigator() {
  return (
    <SuspenseWrapper>
      <StylistStack.Navigator screenOptions={commonScreenOptions} initialRouteName="AIStylist">
        <StylistStack.Screen
          name="AIStylist"
          options={{ animation: "fade" }}
          component={withGuard(AIStylistScreen, "AIStylist")}
        />
        <StylistStack.Screen
          name="OutfitPlan"
          options={{ animation: "fade" }}
          component={withGuard(OutfitPlanScreenLazy, "OutfitPlan")}
        />
        <StylistStack.Screen
          name="ChatHistory"
          options={{ animation: "slide_from_right" }}
          component={withGuard(ChatHistoryScreenLazy, "ChatHistory")}
        />
        <StylistStack.Screen
          name="AiStylistChat"
          options={{ animation: "fade" }}
          component={withGuard(AIStylistScreen, "AiStylistChat")}
        />
        <StylistStack.Screen
          name="SessionCalendar"
          options={{ animation: "slide_from_right" }}
          component={withGuard(SessionCalendarScreen, "SessionCalendar")}
        />
      </StylistStack.Navigator>
    </SuspenseWrapper>
  );
}

// ============================================================
// Week Stack
// ============================================================
const WeekStack = createNativeStackNavigator<WeekStackParamList>();

export function WeekStackNavigator() {
  return (
    <SuspenseWrapper>
      <WeekStack.Navigator screenOptions={commonScreenOptions} initialRouteName="WeekMain">
        <WeekStack.Screen
          name="WeekMain"
          options={{ animation: "slide_from_right" }}
          component={WeekScreen}
        />
        <WeekStack.Screen
          name="OutfitDiary"
          options={{ animation: "slide_from_right" }}
          component={withGuard(OutfitDiaryScreen, "OutfitDiary")}
        />
        <WeekStack.Screen
          name="WeeklyReport"
          options={{ animation: "slide_from_right" }}
          component={withGuard(WeeklyReportScreen, "WeeklyReport")}
        />
      </WeekStack.Navigator>
    </SuspenseWrapper>
  );
}

// ============================================================
// Profile Stack (Me Tab)
// ============================================================
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStackNavigator() {
  return (
    <SuspenseWrapper>
      <ProfileStack.Navigator screenOptions={commonScreenOptions} initialRouteName="ProfileMain">
        <ProfileStack.Screen
          name="ProfileMain"
          options={{ animation: "slide_from_right" }}
          component={ProfileMainScreen}
        />
        <ProfileStack.Screen
          name="ProfileEdit"
          options={{ animation: "slide_from_right" }}
          component={withGuard(ProfileEditScreen, "ProfileEdit")}
        />
        <ProfileStack.Screen
          name="StyleQuiz"
          options={{ animation: "slide_from_right" }}
          component={withGuard(StyleQuizScreen, "StyleQuiz")}
        />
        <ProfileStack.Screen
          name="BodyAnalysis"
          options={{ animation: "slide_from_bottom" }}
          component={withGuard(BodyAnalysisScreen, "BodyAnalysis")}
        />
        <ProfileStack.Screen
          name="ColorAnalysis"
          options={{ animation: "slide_from_bottom" }}
          component={withGuard(ColorAnalysisScreen, "ColorAnalysis")}
        />
        <ProfileStack.Screen
          name="SharePoster"
          options={{ animation: "slide_from_bottom" }}
          component={withGuard(SharePosterScreen, "SharePoster")}
        />
        <ProfileStack.Screen
          name="Settings"
          options={{ animation: "slide_from_right" }}
          component={withGuard(SettingsScreen, "Settings")}
        />
        <ProfileStack.Screen
          name="NotificationSettings"
          options={{ animation: "slide_from_right" }}
          component={withGuard(NotificationSettingsScreen, "NotificationSettings")}
        />
        <ProfileStack.Screen
          name="Subscription"
          options={{ animation: "slide_from_bottom" }}
          component={withGuard(SubscriptionScreen, "Subscription")}
        />
        <ProfileStack.Screen
          name="Cart"
          options={{ animation: "slide_from_right" }}
          component={withGuard(CartScreen, "Cart")}
        />
        <ProfileStack.Screen
          name="Checkout"
          options={{ animation: "slide_from_right" }}
          component={withGuard(CheckoutScreen, "Checkout")}
        />
        <ProfileStack.Screen
          name="Payment"
          options={{ animation: "slide_from_bottom" }}
          component={withGuard(PaymentScreenLazy, "Payment")}
        />
        <ProfileStack.Screen
          name="Orders"
          options={{ animation: "slide_from_right" }}
          component={withGuard(OrdersScreen, "Orders")}
        />
        <ProfileStack.Screen
          name="OrderDetail"
          options={{ animation: "slide_from_right" }}
          component={withGuard(OrderDetailScreen, "OrderDetail")}
        />
        <ProfileStack.Screen
          name="AddClothing"
          options={{ animation: "slide_from_bottom" }}
          component={withGuard(AddClothingScreen, "AddClothing")}
        />
        <ProfileStack.Screen
          name="CustomDesign"
          options={{ animation: "slide_from_right" }}
          component={withGuard(CustomDesignScreen, "CustomDesign")}
        />
        <ProfileStack.Screen
          name="CustomEditor"
          options={{ animation: "fade" }}
          component={withGuard(CustomEditorScreenLazy, "CustomEditor")}
        />
        <ProfileStack.Screen
          name="Brand"
          options={{ animation: "slide_from_right" }}
          component={withGuard(BrandScreenLazy, "Brand")}
        />
        <ProfileStack.Screen
          name="AdvisorList"
          options={{ animation: "slide_from_right" }}
          component={withGuard(AdvisorListScreen, "AdvisorList")}
        />
        <ProfileStack.Screen
          name="AdvisorProfile"
          options={{ animation: "slide_from_right" }}
          component={withGuard(AdvisorProfileScreen, "AdvisorProfile")}
        />
        <ProfileStack.Screen
          name="Booking"
          options={{ animation: "slide_from_bottom" }}
          component={withGuard(BookingScreen, "Booking")}
        />
        <ProfileStack.Screen
          name="Chat"
          options={{ animation: "slide_from_right" }}
          component={withGuard(ChatScreen, "Chat")}
        />
        <ProfileStack.Screen
          name="Legal"
          options={{ animation: "slide_from_bottom" }}
          component={LegalScreenWrapper}
        />
        <ProfileStack.Screen
          name="DiscoverMain"
          options={{ animation: "slide_from_right" }}
          component={DiscoverScreen}
        />
        <ProfileStack.Screen
          name="CommunityFeed"
          options={{ animation: "slide_from_right" }}
          component={CommunityFeedScreen}
        />
        <ProfileStack.Screen
          name="PostDetail"
          options={{ animation: "slide_from_right" }}
          component={PostDetailScreenLazy}
        />
        <ProfileStack.Screen
          name="PostCreate"
          options={{ animation: "slide_from_bottom" }}
          component={withGuard(PostCreateScreenLazy, "PostCreate")}
        />
        <ProfileStack.Screen
          name="InfluencerProfile"
          options={{ animation: "slide_from_right" }}
          component={withGuard(InfluencerProfileScreenLazy, "InfluencerProfile")}
        />
        <ProfileStack.Screen
          name="InspirationWardrobe"
          options={{ animation: "slide_from_right" }}
          component={withGuard(InspirationWardrobeScreenLazy, "InspirationWardrobe")}
        />
        <ProfileStack.Screen
          name="BloggerDashboard"
          options={{ animation: "slide_from_right" }}
          component={withGuard(BloggerDashboardScreen, "BloggerDashboard")}
        />
        <ProfileStack.Screen
          name="BloggerProfile"
          options={{ animation: "slide_from_right" }}
          component={BloggerProfileScreen}
        />
        <ProfileStack.Screen
          name="BloggerProduct"
          options={{ animation: "slide_from_right" }}
          component={BloggerProductScreen}
        />
        <ProfileStack.Screen
          name="VirtualTryOn"
          options={{ animation: "slide_from_right" }}
          component={withGuard(VirtualTryOnScreen, "VirtualTryOn")}
        />
        <ProfileStack.Screen
          name="TryOnResult"
          options={{ animation: "fade" }}
          component={withGuard(TryOnResultScreenLazy, "TryOnResult")}
        />
        <ProfileStack.Screen
          name="TryOnHistory"
          options={{ animation: "slide_from_right" }}
          component={withGuard(TryOnHistoryScreenLazy, "TryOnHistory")}
        />
        <ProfileStack.Screen
          name="Wardrobe"
          options={{ animation: "slide_from_right" }}
          component={withGuard(WardrobeScreen, "Wardrobe")}
        />
        <ProfileStack.Screen
          name="Favorites"
          options={{ animation: "slide_from_right" }}
          component={withGuard(FavoritesScreen, "Favorites")}
        />
      </ProfileStack.Navigator>
    </SuspenseWrapper>
  );
}
