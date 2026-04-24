/**
 * AnimatedTabBar - Custom bottom tab bar with animated capsule indicator
 * and glass morphism background for XUNO mobile app.
 *
 * Features:
 * - Glass morphism background via BlurView
 * - Animated capsule indicator sliding between tabs (spring physics)
 * - Icon bounce animation on tab switch
 * - Color transition for active/inactive states
 * - Haptic feedback on tab press
 * - Badge support (e.g. cart count)
 * - Respects reduced motion accessibility setting
 */
import React, { useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Platform,
  Dimensions,
  StyleSheet,
  type LayoutChangeEvent,
} from "react-native";
import { BlurView } from "expo-blur";
import { House, MagnifyingGlass, ChatCircle, User, type IconProps } from "phosphor-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  useDerivedValue,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import * as Haptics from "../../polyfills/expo-haptics";
import { DesignTokens } from "../../design-system/theme/tokens/design-tokens";
import { SpringConfigs } from "../../design-system/theme/tokens/animations";
import { useTheme } from "../contexts/ThemeContext";
import { useReducedMotion } from "../hooks/useReducedMotion";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TAB_BAR_HEIGHT = 56;
const INDICATOR_HEIGHT = 32;
const INDICATOR_VERTICAL_PADDING = (TAB_BAR_HEIGHT - INDICATOR_HEIGHT) / 2;

const TAB_COUNT = 4;

/** Tab icon components in display order */
const TAB_ICONS = [House, MagnifyingGlass, ChatCircle, User] as const;

/** Tab labels in display order */
const TAB_LABELS = ["Today", "Discover", "Stylist", "Me"] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Badge configuration shown on a tab (e.g. cart count) */
export interface TabBadge {
  /** Display value - numbers are rendered as-is; values > 99 show "99+" */
  count: number;
  /** Badge background colour override (defaults to terracotta) */
  color?: string;
  /** Badge text colour override (defaults to white) */
  textColor?: string;
}

/** Per-tab configuration for custom overrides */
export interface TabConfig {
  /** Show a badge indicator on this tab */
  badge?: TabBadge;
}

export interface AnimatedTabBarProps {
  state: {
    index: number;
    routes: { name: string; key: string }[];
  };
  descriptors: Record<
    string,
    {
      options: {
        tabBarLabel?:
          | string
          | ((props: {
              focused: boolean;
              color: string;
              position: unknown;
              children: string;
            }) => React.ReactNode);
        title?: string;
        tabBarBadge?: number | string;
        [key: string]: unknown;
      };
      navigation: {
        emit: (event: { type: string; target: string; canPreventDefault?: boolean }) => {
          defaultPrevented: boolean;
        };
      };
    }
  >;
  /** Navigation object from React Navigation */
  navigation: {
    navigate: (name: string) => void;
    emit: (event: { type: string; canPreventDefault?: boolean; target?: string }) => {
      defaultPrevented: boolean;
    };
  };
  /** Optional per-tab config overrides */
  tabConfig?: Record<string, TabConfig>;
}

// ---------------------------------------------------------------------------
// Internal: per-tab animated icon
// ---------------------------------------------------------------------------

interface TabIconProps {
  IconComponent: React.ComponentType<IconProps>;
  isActive: boolean;
  activeColor: string;
  inactiveColor: string;
  index: number;
  activeIndex: SharedValue<number>;
}

const ICON_SIZE = 22;

const TabIcon: React.FC<TabIconProps> = ({
  IconComponent,
  isActive,
  activeColor,
  inactiveColor,
  index,
  activeIndex,
}) => {
  const { reducedMotionSV } = useReducedMotion();

  // Per-tab scale for bounce animation
  const scale = useSharedValue(1);

  // Trigger bounce when this tab becomes active.
  // We use useDerivedValue to react to activeIndex changes inside the
  // worklet thread and assign the spring sequence directly.
  useDerivedValue(() => {
    if (activeIndex.value === index) {
      if (reducedMotionSV.value) {
        scale.value = 1;
      } else {
        scale.value = withSequence(
          withSpring(0.9, SpringConfigs.snappy),
          withSpring(1.05, SpringConfigs.bouncy),
          withSpring(1, SpringConfigs.snappy)
        );
      }
    }
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.iconContainer, animatedStyle]}>
      <IconComponent
        size={ICON_SIZE}
        color={isActive ? activeColor : inactiveColor}
        weight={isActive ? "fill" : "regular"}
      />
    </Animated.View>
  );
};

// ---------------------------------------------------------------------------
// Internal: badge indicator
// ---------------------------------------------------------------------------

interface BadgeProps {
  count: number;
  color?: string;
  textColor?: string;
}

const Badge: React.FC<BadgeProps> = ({ count, color, textColor }) => {
  const displayText = count > 99 ? "99+" : String(count);

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: color ?? DesignTokens.colors.brand.terracotta,
        },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          {
            color: textColor ?? DesignTokens.colors.neutral.white,
          },
        ]}
        numberOfLines={1}
      >
        {displayText}
      </Text>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const AnimatedTabBar: React.FC<AnimatedTabBarProps> = ({
  state,
  descriptors,
  navigation,
  tabConfig,
}) => {
  const { isDark } = useTheme();

  // Theme-aware colours
  const activeColor = DesignTokens.colors.brand.terracotta;
  const inactiveColor = isDark
    ? DesignTokens.colors.neutral[500]
    : DesignTokens.colors.neutral[400];
  const capsuleBg = isDark ? DesignTokens.colors.neutral[200] : DesignTokens.colors.neutral[100];
  const blurTint = isDark ? "dark" : "light";
  const insets = useSafeAreaInsets();
  const { reducedMotion } = useReducedMotion();

  const activeIndex = useSharedValue(state.index);
  const indicatorX = useSharedValue(0);
  const tabWidth = useSharedValue(SCREEN_WIDTH / TAB_COUNT);

  // ---------------------------------------------------------------------------
  // Sync external index changes
  // ---------------------------------------------------------------------------

  const previousIndex = useRef(state.index);

  useEffect(() => {
    if (state.index !== previousIndex.current) {
      activeIndex.value = state.index;
      previousIndex.current = state.index;

      // Animate capsule indicator to new position
      const targetX = state.index * tabWidth.value;
      if (reducedMotion) {
        indicatorX.value = targetX;
      } else {
        indicatorX.value = withSpring(targetX, SpringConfigs.snappy);
      }
    }
  }, [state.index, reducedMotion]);

  // ---------------------------------------------------------------------------
  // Layout measurement
  // ---------------------------------------------------------------------------

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const measuredWidth = event.nativeEvent.layout.width;
      tabWidth.value = measuredWidth / TAB_COUNT;

      // Set initial indicator position without animation
      indicatorX.value = state.index * (measuredWidth / TAB_COUNT);
    },
    [state.index]
  );

  // ---------------------------------------------------------------------------
  // Tab press handler
  // ---------------------------------------------------------------------------

  const handleTabPress = useCallback(
    (index: number, routeName: string, routeKey: string) => {
      const isAlreadyActive = state.index === index;

      // Emit tabPress / tabLongPress events so navigators can intercept
      const event = navigation.emit({
        type: "tabPress",
        target: routeKey,
        canPreventDefault: true,
      });

      if (!isAlreadyActive && !event.defaultPrevented) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        activeIndex.value = index;

        // Animate indicator immediately for responsive feel
        const targetX = index * tabWidth.value;
        if (reducedMotion) {
          indicatorX.value = targetX;
        } else {
          indicatorX.value = withSpring(targetX, SpringConfigs.snappy);
        }

        navigation.navigate(routeName);
      }
    },
    [state.index, navigation]
  );

  // ---------------------------------------------------------------------------
  // Animated indicator style
  // ---------------------------------------------------------------------------

  const indicatorAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: tabWidth.value,
  }));

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const safeBottom = Platform.OS === "ios" ? insets.bottom : 0;

  return (
    <View style={[styles.container, { paddingBottom: safeBottom }]}>
      <BlurView intensity={60} tint={blurTint} style={styles.blurView}>
        {/* Capsule indicator */}
        <Animated.View style={[styles.indicatorTrack, indicatorAnimatedStyle]} pointerEvents="none">
          <View style={[styles.indicatorCapsule, { backgroundColor: capsuleBg }]} />
        </Animated.View>

        {/* Tab items */}
        <View style={styles.tabRow} onLayout={handleLayout}>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const { options } = descriptors[route.key];
            const label =
              typeof options.tabBarLabel === "string"
                ? options.tabBarLabel
                : typeof options.title === "string"
                ? options.title
                : TAB_LABELS[index];

            const badgeConfig = tabConfig?.[route.name]?.badge;
            const badgeCount = badgeConfig?.count;

            const IconComponent = TAB_ICONS[index];

            return (
              <Pressable
                key={route.key}
                style={styles.tabItem}
                onPress={() => handleTabPress(index, route.name, route.key)}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={`${label} tab`}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <View style={styles.tabContent}>
                  <TabIcon
                    IconComponent={IconComponent}
                    isActive={isFocused}
                    activeColor={activeColor}
                    inactiveColor={inactiveColor}
                    index={index}
                    activeIndex={activeIndex}
                  />
                  {badgeCount != null && badgeCount > 0 ? (
                    <Badge
                      count={badgeCount}
                      color={badgeConfig?.color}
                      textColor={badgeConfig?.textColor}
                    />
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isFocused ? activeColor : inactiveColor,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
  },
  blurView: {
    overflow: "hidden",
  },
  indicatorTrack: {
    position: "absolute" as const,
    top: INDICATOR_VERTICAL_PADDING,
    left: 0,
    height: INDICATOR_HEIGHT,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  indicatorCapsule: {
    width: "78%",
    height: INDICATOR_HEIGHT,
    borderRadius: DesignTokens.borderRadius.full,
  },
  tabRow: {
    flexDirection: "row" as const,
    height: TAB_BAR_HEIGHT,
    alignItems: "center" as const,
  },
  tabItem: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    height: TAB_BAR_HEIGHT,
  },
  tabContent: {
    position: "relative" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  iconContainer: {
    width: ICON_SIZE + 8,
    height: ICON_SIZE + 4,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  tabLabel: {
    fontSize: DesignTokens.typography.sizes.xs,
    fontWeight: "600",
    marginTop: DesignTokens.spacing[0.5],
    includeFontPadding: false,
    textAlign: "center" as const,
  },
  badge: {
    position: "absolute" as const,
    top: -6,
    right: -12,
    minWidth: 18,
    height: 18,
    borderRadius: DesignTokens.borderRadius.full,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: DesignTokens.spacing[1],
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700" as const,
    includeFontPadding: false,
    textAlign: "center" as const,
  },
});

export default AnimatedTabBar;
