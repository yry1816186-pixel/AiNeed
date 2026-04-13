import React, { Suspense, lazy } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type {
  HomeStackParamList,
  StylistStackParamList,
  TryOnStackParamList,
  CommunityStackParamList,
  ProfileStackParamList,
} from './types';
import { PlaceholderScreen } from '../components/PlaceholderScreen';
import { theme } from '../theme';

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

// ============================================================
// Existing Screens - Lazy Loaded
// ============================================================
const HomeFeedScreen = lazy(() => import('../screens/home/HomeScreen'));
const SearchScreen = lazy(() => import('../screens/SearchScreen').then((m) => ({ default: m.SearchScreen })));
const NotificationsScreen = lazy(() => import('../screens/NotificationsScreen'));
const RecommendationDetailScreen = lazy(() => import('../screens/RecommendationDetailScreen'));
const ProductScreen = lazy(() => import('../screens/ClothingDetailScreen'));
const OutfitDetailScreen = lazy(() => import('../screens/OutfitDetailScreen'));

const AIStylistScreen = lazy(() => import('../screens/AiStylistScreenV2'));

const VirtualTryOnScreen = lazy(() => import('../screens/VirtualTryOnScreen'));

const CommunityFeedScreen = lazy(() => import('../screens/CommunityScreen'));

const ProfileMainScreen = lazy(() => import('../screens/ProfileScreen'));
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

// ============================================================
// Home Stack (Phase 4 - 推荐引擎)
// ============================================================
const HomeStack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={commonScreenOptions} initialRouteName="HomeFeed">
      <HomeStack.Screen name="HomeFeed">
        {() => <Suspense fallback={screenLoader}><HomeFeedScreen /></Suspense>}
      </HomeStack.Screen>
      <HomeStack.Screen name="Search">
        {() => <Suspense fallback={screenLoader}><SearchScreen /></Suspense>}
      </HomeStack.Screen>
      <HomeStack.Screen name="Notifications">
        {() => <Suspense fallback={screenLoader}><NotificationsScreen /></Suspense>}
      </HomeStack.Screen>
      <HomeStack.Screen name="RecommendationDetail">
        {() => <Suspense fallback={screenLoader}><RecommendationDetailScreen /></Suspense>}
      </HomeStack.Screen>
      <HomeStack.Screen name="Product">
        {() => <Suspense fallback={screenLoader}><ProductScreen /></Suspense>}
      </HomeStack.Screen>
      <HomeStack.Screen name="OutfitDetail">
        {() => <Suspense fallback={screenLoader}><OutfitDetailScreen /></Suspense>}
      </HomeStack.Screen>
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
        {() => <Suspense fallback={screenLoader}><AIStylistScreen /></Suspense>}
      </StylistStack.Screen>
      <StylistStack.Screen name="OutfitPlan">
        {(props) => <PlaceholderScreen route={{ name: props.route.name, params: { phase: 2, title: 'OutfitPlan' } }} />}
      </StylistStack.Screen>
      <StylistStack.Screen name="ChatHistory">
        {(props) => <PlaceholderScreen route={{ name: props.route.name, params: { phase: 2, title: 'ChatHistory' } }} />}
      </StylistStack.Screen>
      <StylistStack.Screen name="AiStylistChat">
        {(props) => <PlaceholderScreen route={{ name: props.route.name, params: { phase: 2, title: 'AiStylistChat' } }} />}
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
        {() => <Suspense fallback={screenLoader}><VirtualTryOnScreen /></Suspense>}
      </TryOnStack.Screen>
      <TryOnStack.Screen name="TryOnResult">
        {(props) => <PlaceholderScreen route={{ name: props.route.name, params: { phase: 3, title: 'TryOnResult' } }} />}
      </TryOnStack.Screen>
      <TryOnStack.Screen name="TryOnHistory">
        {(props) => <PlaceholderScreen route={{ name: props.route.name, params: { phase: 3, title: 'TryOnHistory' } }} />}
      </TryOnStack.Screen>
    </TryOnStack.Navigator>
  );
}

// ============================================================
// Community Stack (Phase 6 - 社区 & 博主生态)
// ============================================================
const CommunityStack = createNativeStackNavigator<CommunityStackParamList>();

export function CommunityStackNavigator() {
  return (
    <CommunityStack.Navigator screenOptions={commonScreenOptions} initialRouteName="CommunityFeed">
      <CommunityStack.Screen name="CommunityFeed">
        {() => <Suspense fallback={screenLoader}><CommunityFeedScreen /></Suspense>}
      </CommunityStack.Screen>
      <CommunityStack.Screen name="PostDetail">
        {(props) => <PlaceholderScreen route={{ name: props.route.name, params: { phase: 6, title: 'PostDetail' } }} />}
      </CommunityStack.Screen>
      <CommunityStack.Screen name="PostCreate">
        {(props) => <PlaceholderScreen route={{ name: props.route.name, params: { phase: 6, title: 'PostCreate' } }} />}
      </CommunityStack.Screen>
      <CommunityStack.Screen name="InfluencerProfile">
        {(props) => <PlaceholderScreen route={{ name: props.route.name, params: { phase: 6, title: 'InfluencerProfile' } }} />}
      </CommunityStack.Screen>
      <CommunityStack.Screen name="InspirationWardrobe">
        {(props) => <PlaceholderScreen route={{ name: props.route.name, params: { phase: 6, title: 'InspirationWardrobe' } }} />}
      </CommunityStack.Screen>
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
        {() => <Suspense fallback={screenLoader}><ProfileMainScreen /></Suspense>}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="ProfileEdit">
        {(props) => <PlaceholderScreen route={{ name: props.route.name, params: { phase: 1, title: 'ProfileEdit' } }} />}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="StyleQuiz">
        {() => <Suspense fallback={screenLoader}><StyleQuizScreen /></Suspense>}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="BodyAnalysis">
        {(props) => <PlaceholderScreen route={{ name: props.route.name, params: { phase: 1, title: 'BodyAnalysis' } }} />}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="ColorAnalysis">
        {(props) => <PlaceholderScreen route={{ name: props.route.name, params: { phase: 1, title: 'ColorAnalysis' } }} />}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="SharePoster">
        {(props) => <PlaceholderScreen route={{ name: props.route.name, params: { phase: 1, title: 'SharePoster' } }} />}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="Wardrobe">
        {() => <Suspense fallback={screenLoader}><WardrobeScreen /></Suspense>}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="Favorites">
        {() => <Suspense fallback={screenLoader}><FavoritesScreen /></Suspense>}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="Settings">
        {() => <Suspense fallback={screenLoader}><SettingsScreen /></Suspense>}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="NotificationSettings">
        {() => <Suspense fallback={screenLoader}><NotificationSettingsScreen /></Suspense>}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="Subscription">
        {() => <Suspense fallback={screenLoader}><SubscriptionScreen /></Suspense>}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="Cart">
        {() => <Suspense fallback={screenLoader}><CartScreen /></Suspense>}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="Checkout">
        {() => <Suspense fallback={screenLoader}><CheckoutScreen /></Suspense>}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="Payment">
        {(props) => <PlaceholderScreen route={{ name: props.route.name, params: { phase: 5, title: 'Payment' } }} />}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="Orders">
        {() => <Suspense fallback={screenLoader}><OrdersScreen /></Suspense>}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="OrderDetail">
        {() => <Suspense fallback={screenLoader}><OrderDetailScreen /></Suspense>}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="AddClothing">
        {() => <Suspense fallback={screenLoader}><AddClothingScreen /></Suspense>}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="CustomDesign">
        {() => <Suspense fallback={screenLoader}><CustomDesignScreen /></Suspense>}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="CustomEditor">
        {(props) => <PlaceholderScreen route={{ name: props.route.name, params: { phase: 7, title: 'CustomEditor' } }} />}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="Brand">
        {(props) => <PlaceholderScreen route={{ name: props.route.name, params: { phase: 7, title: 'Brand' } }} />}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="AdvisorList">
        {(props) => <PlaceholderScreen route={{ name: props.route.name, params: { phase: 8, title: 'AdvisorList' } }} />}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="AdvisorProfile">
        {(props) => <PlaceholderScreen route={{ name: props.route.name, params: { phase: 8, title: 'AdvisorProfile' } }} />}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="Booking">
        {(props) => <PlaceholderScreen route={{ name: props.route.name, params: { phase: 8, title: 'Booking' } }} />}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="Chat">
        {(props) => <PlaceholderScreen route={{ name: props.route.name, params: { phase: 8, title: 'Chat' } }} />}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="Legal">
        {(props) => (
          <Suspense fallback={screenLoader}>
            <LegalScreen type={props.route.params?.type ?? 'terms'} />
          </Suspense>
        )}
      </ProfileStack.Screen>
    </ProfileStack.Navigator>
  );
}
