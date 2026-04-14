import React, { Suspense, lazy } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createSharedElementStackNavigator } from 'react-navigation-shared-element';
import type {
  HomeStackParamList,
  StylistStackParamList,
  TryOnStackParamList,
  CommunityStackParamList,
  ProfileStackParamList,
} from './types';
import { theme } from '../theme';
import { GuardedScreen } from './RouteGuards';

const OutfitPlanScreenLazy = lazy(() => import('../screens/OutfitPlanScreen'));
const ChatHistoryScreenLazy = lazy(() => import('../screens/ChatHistoryScreen'));
const AiStylistChatScreenLazy = lazy(() => import('../screens/AiStylistChatScreen'));

const TryOnResultScreenLazy = lazy(() => import('../screens/TryOnResultScreen'));

const PaymentScreenLazy = lazy(() => import('../screens/PaymentScreen'));

const PostDetailScreenLazy = lazy(() => import('../screens/PostDetailScreen'));
const PostCreateScreenLazy = lazy(() => import('../screens/CreatePostScreen'));
const InfluencerProfileScreenLazy = lazy(() => import('../screens/InfluencerProfileScreen'));
const InspirationWardrobeScreenLazy = lazy(() => import('../screens/InspirationWardrobeScreen'));

const CustomEditorScreenLazy = lazy(() => import('../screens/CustomizationEditorScreen'));
const BrandScreenLazy = lazy(() => import('../screens/BrandScreen'));

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const screenLoader = (
  <View style={styles.loader}>
    <ActivityIndicator size="large" color={theme.colors.primary} />
  </View>
);

const commonScreenOptions = { headerShown: false } as const;

const HomeFeedScreen = lazy(() => import('../screens/home/HomeScreen'));
const SearchScreen = lazy(() => import('../screens/SearchScreen').then((m) => ({ default: m.SearchScreen })));
const NotificationsScreen = lazy(() => import('../screens/NotificationsScreen'));
const RecommendationDetailScreen = lazy(() => import('../screens/RecommendationDetailScreen'));
const ProductScreen = lazy(() => import('../screens/ClothingDetailScreen'));
const OutfitDetailScreen = lazy(() => import('../screens/OutfitDetailScreen'));

const AIStylistScreen = lazy(() => import('../screens/AiStylistScreen'));
const SessionCalendarScreen = lazy(() => import('../screens/SessionCalendarScreen'));

const VirtualTryOnScreen = lazy(() => import('../screens/VirtualTryOnScreen'));
const TryOnHistoryScreenLazy = lazy(() => import('../components/screens/TryOnHistoryScreen').then((m) => ({ default: m.TryOnHistoryScreen })));

const CommunityFeedScreen = lazy(() => import('../screens/CommunityScreen'));
const BloggerDashboardScreen = lazy(() => import('../screens/BloggerDashboardScreen'));
const BloggerProfileScreen = lazy(() => import('../screens/BloggerProfileScreen'));
const BloggerProductScreen = lazy(() => import('../screens/BloggerProductScreen'));

const ProfileMainScreen = lazy(() => import('../screens/ProfileScreen'));
const ProfileEditScreen = lazy(() => import('../screens/ProfileEditScreen').then((m) => ({ default: m.ProfileEditScreen })));
const BodyAnalysisScreen = lazy(() => import('../screens/BodyAnalysisScreen').then((m) => ({ default: m.BodyAnalysisScreen })));
const ColorAnalysisScreen = lazy(() => import('../screens/ColorAnalysisScreen').then((m) => ({ default: m.ColorAnalysisScreen })));
const SharePosterScreen = lazy(() => import('../screens/SharePosterScreen').then((m) => ({ default: m.SharePosterScreen })));
const StyleQuizScreen = lazy(() => import('../screens/style-quiz/StyleQuizScreen').then((m) => ({ default: m.StyleQuizScreen })));
const WardrobeScreen = lazy(() => import('../screens/WardrobeScreen'));
const FavoritesScreen = lazy(() => import('../screens/FavoritesScreen').then((m) => ({ default: m.FavoritesScreen })));
const SettingsScreen = lazy(() => import('../screens/SettingsScreen'));
const NotificationSettingsScreen = lazy(() => import('../screens/NotificationSettingsScreen'));
const SubscriptionScreen = lazy(() => import('../screens/SubscriptionScreen'));
const CartScreen = lazy(() => import('../screens/CartScreen'));
const CheckoutScreen = lazy(() => import('../screens/CheckoutScreen'));
const OrdersScreen = lazy(() => import('../screens/OrdersScreen'));
const OrderDetailScreen = lazy(() => import('../screens/OrderDetailScreen'));
const AddClothingScreen = lazy(() => import('../screens/AddClothingScreen'));
const CustomDesignScreen = lazy(() => import('../screens/CustomizationScreen'));
const LegalScreen = lazy(() => import('../screens/LegalScreen'));

const AdvisorListScreen = lazy(() => import('../screens/consultant/AdvisorListScreen'));
const AdvisorProfileScreen = lazy(() => import('../screens/consultant/AdvisorProfileScreen'));
const BookingScreen = lazy(() => import('../screens/consultant/BookingScreen'));
const ChatScreen = lazy(() => import('../screens/consultant/ChatScreen'));

function SuspenseScreen({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={screenLoader}>{children}</Suspense>;
}

function G({ route, children }: { route: string; children: React.ReactNode }) {
  return (
    <GuardedScreen routeName={route}>
      {children}
    </GuardedScreen>
  );
}

// ============================================================
// Home Stack (Phase 4) — SharedElement for Product
// ============================================================
const HomeStack = createSharedElementStackNavigator<HomeStackParamList>();

export function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={commonScreenOptions} initialRouteName="HomeFeed">
      <HomeStack.Screen name="HomeFeed" component={() => <SuspenseScreen><HomeFeedScreen /></SuspenseScreen>} />
      <HomeStack.Screen name="Search" component={() => <SuspenseScreen><SearchScreen /></SuspenseScreen>} />
      <HomeStack.Screen name="Notifications" component={() => <G route="Notifications"><SuspenseScreen><NotificationsScreen /></SuspenseScreen></G>} />
      <HomeStack.Screen name="RecommendationDetail" component={() => <SuspenseScreen><RecommendationDetailScreen /></SuspenseScreen>} />
      <HomeStack.Screen
        name="Product"
        component={() => <SuspenseScreen><ProductScreen /></SuspenseScreen>}
        sharedElements={(route) => {
          const { clothingId } = route.params;
          return [{ id: `product.${clothingId}.image`, animation: 'move', resize: 'clip' }];
        }}
      />
      <HomeStack.Screen name="OutfitDetail" component={() => <SuspenseScreen><OutfitDetailScreen /></SuspenseScreen>} />
    </HomeStack.Navigator>
  );
}

// ============================================================
// Stylist Stack (Phase 2 - AI 造型师)
// ============================================================
const StylistStack = createNativeStackNavigator<StylistStackParamList>();

export function StylistStackNavigator() {
  return (
    <StylistStack.Navigator screenOptions={commonScreenOptions} initialRouteName="AIStylist">
      <StylistStack.Screen name="AIStylist">
        {() => <G route="AIStylist"><SuspenseScreen><AIStylistScreen /></SuspenseScreen></G>}
      </StylistStack.Screen>
      <StylistStack.Screen name="OutfitPlan">
        {() => <G route="OutfitPlan"><SuspenseScreen><OutfitPlanScreenLazy /></SuspenseScreen></G>}
      </StylistStack.Screen>
      <StylistStack.Screen name="ChatHistory">
        {() => <G route="ChatHistory"><SuspenseScreen><ChatHistoryScreenLazy /></SuspenseScreen></G>}
      </StylistStack.Screen>
      <StylistStack.Screen name="AiStylistChat">
        {() => <G route="AIStylist"><SuspenseScreen><AiStylistChatScreenLazy /></SuspenseScreen></G>}
      </StylistStack.Screen>
      <StylistStack.Screen name="SessionCalendar">
        {() => <SuspenseScreen><SessionCalendarScreen /></SuspenseScreen>}
      </StylistStack.Screen>
    </StylistStack.Navigator>
  );
}

// ============================================================
// TryOn Stack (Phase 3 - 虚拟试衣)
// ============================================================
const TryOnStack = createNativeStackNavigator<TryOnStackParamList>();

export function TryOnStackNavigator() {
  return (
    <TryOnStack.Navigator screenOptions={commonScreenOptions} initialRouteName="VirtualTryOn">
      <TryOnStack.Screen name="VirtualTryOn">
        {() => <G route="VirtualTryOn"><SuspenseScreen><VirtualTryOnScreen /></SuspenseScreen></G>}
      </TryOnStack.Screen>
      <TryOnStack.Screen name="TryOnResult">
        {() => <G route="TryOnResult"><SuspenseScreen><TryOnResultScreenLazy /></SuspenseScreen></G>}
      </TryOnStack.Screen>
      <TryOnStack.Screen name="TryOnHistory">
        {() => <G route="TryOnHistory"><SuspenseScreen><TryOnHistoryScreenLazy /></SuspenseScreen></G>}
      </TryOnStack.Screen>
    </TryOnStack.Navigator>
  );
}

// ============================================================
// Community Stack (Phase 6 - 社区 & 博主生态) — SharedElement for PostDetail
// ============================================================
const CommunityStack = createSharedElementStackNavigator<CommunityStackParamList>();

export function CommunityStackNavigator() {
  return (
    <CommunityStack.Navigator screenOptions={commonScreenOptions} initialRouteName="CommunityFeed">
      <CommunityStack.Screen name="CommunityFeed" component={() => <SuspenseScreen><CommunityFeedScreen /></SuspenseScreen>} />
      <CommunityStack.Screen
        name="PostDetail"
        component={() => <SuspenseScreen><PostDetailScreenLazy /></SuspenseScreen>}
        sharedElements={(route) => {
          const { postId } = route.params;
          return [{ id: `post.${postId}.image`, animation: 'move', resize: 'clip' }];
        }}
      />
      <CommunityStack.Screen name="PostCreate" component={() => <G route="PostCreate"><SuspenseScreen><PostCreateScreenLazy /></SuspenseScreen></G>} />
      <CommunityStack.Screen name="InfluencerProfile" component={() => <G route="InfluencerProfile"><SuspenseScreen><InfluencerProfileScreenLazy /></SuspenseScreen></G>} />
      <CommunityStack.Screen name="InspirationWardrobe" component={() => <SuspenseScreen><InspirationWardrobeScreenLazy /></SuspenseScreen>} />
      <CommunityStack.Screen name="BloggerDashboard" component={() => <SuspenseScreen><BloggerDashboardScreen /></SuspenseScreen>} />
      <CommunityStack.Screen name="BloggerProfile" component={() => <SuspenseScreen><BloggerProfileScreen /></SuspenseScreen>} />
      <CommunityStack.Screen name="BloggerProduct" component={() => <SuspenseScreen><BloggerProductScreen /></SuspenseScreen>} />
    </CommunityStack.Navigator>
  );
}

// ============================================================
// Profile Stack (Phase 1/5/7/8 - 综合)
// ============================================================
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={commonScreenOptions} initialRouteName="ProfileMain">
      <ProfileStack.Screen name="ProfileMain">
        {() => <SuspenseScreen><ProfileMainScreen /></SuspenseScreen>}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="ProfileEdit">
        {() => <G route="ProfileEdit"><SuspenseScreen><ProfileEditScreen /></SuspenseScreen></G>}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="StyleQuiz">
        {() => <SuspenseScreen><StyleQuizScreen /></SuspenseScreen>}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="BodyAnalysis">
        {() => <SuspenseScreen><BodyAnalysisScreen /></SuspenseScreen>}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="ColorAnalysis">
        {() => <SuspenseScreen><ColorAnalysisScreen /></SuspenseScreen>}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="SharePoster">
        {() => <G route="SharePoster"><SuspenseScreen><SharePosterScreen /></SuspenseScreen></G>}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="Wardrobe">
        {() => <G route="Wardrobe"><SuspenseScreen><WardrobeScreen /></SuspenseScreen></G>}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="Favorites">
        {() => <G route="Favorites"><SuspenseScreen><FavoritesScreen /></SuspenseScreen></G>}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="Settings">
        {() => <SuspenseScreen><SettingsScreen /></SuspenseScreen>}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="NotificationSettings">
        {() => <SuspenseScreen><NotificationSettingsScreen /></SuspenseScreen>}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="Subscription">
        {() => <G route="Subscription"><SuspenseScreen><SubscriptionScreen /></SuspenseScreen></G>}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="Cart">
        {() => <G route="Cart"><SuspenseScreen><CartScreen /></SuspenseScreen></G>}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="Checkout">
        {() => <G route="Checkout"><SuspenseScreen><CheckoutScreen /></SuspenseScreen></G>}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="Payment">
        {() => <G route="Payment"><SuspenseScreen><PaymentScreenLazy /></SuspenseScreen></G>}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="Orders">
        {() => <G route="Orders"><SuspenseScreen><OrdersScreen /></SuspenseScreen></G>}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="OrderDetail">
        {() => <G route="OrderDetail"><SuspenseScreen><OrderDetailScreen /></SuspenseScreen></G>}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="AddClothing">
        {() => <G route="AddClothing"><SuspenseScreen><AddClothingScreen /></SuspenseScreen></G>}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="CustomDesign">
        {() => <G route="CustomDesign"><SuspenseScreen><CustomDesignScreen /></SuspenseScreen></G>}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="CustomEditor">
        {() => <G route="CustomEditor"><SuspenseScreen><CustomEditorScreenLazy /></SuspenseScreen></G>}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="Brand">
        {() => <G route="Brand"><SuspenseScreen><BrandScreenLazy /></SuspenseScreen></G>}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="AdvisorList">
        {() => <G route="AdvisorList"><SuspenseScreen><AdvisorListScreen /></SuspenseScreen></G>}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="AdvisorProfile">
        {() => <G route="AdvisorProfile"><SuspenseScreen><AdvisorProfileScreen /></SuspenseScreen></G>}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="Booking">
        {() => <G route="Booking"><SuspenseScreen><BookingScreen /></SuspenseScreen></G>}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="Chat">
        {() => <G route="Chat"><SuspenseScreen><ChatScreen /></SuspenseScreen></G>}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="Legal">
        {(props) => (
          <SuspenseScreen>
            <LegalScreen type={props.route.params?.type ?? 'terms'} />
          </SuspenseScreen>
        )}
      </ProfileStack.Screen>
    </ProfileStack.Navigator>
  );
}
