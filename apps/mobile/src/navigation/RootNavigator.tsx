import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '../polyfills/expo-vector-icons';
import type { MainTabParamList, RootStackParamList } from './types';
import { TAB_LABELS } from './types';
import { AuthNavigator } from './AuthNavigator';
import {
  HomeStackNavigator,
  StylistStackNavigator,
  TryOnStackNavigator,
  CommunityStackNavigator,
  ProfileStackNavigator,
} from './MainStackNavigator';
import { useAuthStore, useCartStore } from '../stores/index';
import { theme } from '../theme';

// ============================================================
// Main Tab Navigator (5 Tabs)
// ============================================================
const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  const cartCount = useCartStore((state) => state.totalItems);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Stylist':
              iconName = focused ? 'color-wand' : 'color-wand-outline';
              break;
            case 'TryOn':
              iconName = focused ? 'shirt' : 'shirt-outline';
              break;
            case 'Community':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.colors.border,
          paddingTop: 6,
          paddingBottom: 6,
          height: 56,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.3,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{ tabBarLabel: TAB_LABELS.Home }}
      />
      <Tab.Screen
        name="Stylist"
        component={StylistStackNavigator}
        options={{ tabBarLabel: TAB_LABELS.Stylist }}
      />
      <Tab.Screen
        name="TryOn"
        component={TryOnStackNavigator}
        options={{ tabBarLabel: TAB_LABELS.TryOn }}
      />
      <Tab.Screen
        name="Community"
        component={CommunityStackNavigator}
        options={{ tabBarLabel: TAB_LABELS.Community }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{
          tabBarLabel: TAB_LABELS.Profile,
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
        }}
      />
    </Tab.Navigator>
  );
}

// ============================================================
// Root Stack Navigator
// ============================================================
const RootStack = createNativeStackNavigator<RootStackParamList>();

interface RootNavigatorProps {
  isAuthenticated: boolean;
}

export function RootNavigator({ isAuthenticated }: RootNavigatorProps) {
  return (
    <RootStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={isAuthenticated ? 'MainTabs' : 'Auth'}
    >
      <RootStack.Screen name="Auth" component={AuthNavigator} />
      <RootStack.Screen name="MainTabs" component={MainTabNavigator} />
    </RootStack.Navigator>
  );
}
