import React from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  ViewStyle,
  RefreshControl,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
  NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import { Colors, Spacing } from '../../../design-system/theme';
import type { ScrollEvent } from "../../../types/events";

const { width: _SCREEN_WIDTH, height: _SCREEN_HEIGHT } = Dimensions.get("window");

export interface ScreenLayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  floatingButton?: React.ReactNode;
  scrollable?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  backgroundColor?: string;
  gradientBackground?: string[];
  safeAreaTop?: boolean;
  safeAreaBottom?: boolean;
  headerSticky?: boolean;
  headerTransparent?: boolean;
  contentContainerStyle?: ViewStyle;
  style?: ViewStyle;
  showsVerticalScrollIndicator?: boolean;
  onScroll?: (event: NativeSyntheticEvent<ScrollEvent["nativeEvent"]>) => void;
  scrollEventThrottle?: number;
}

export const ScreenLayout: React.FC<ScreenLayoutProps> = ({
  children,
  header,
  footer,
  floatingButton,
  scrollable = false,
  refreshing = false,
  onRefresh,
  backgroundColor = Colors.neutral[50],
  gradientBackground,
  safeAreaTop = true,
  safeAreaBottom = true,
  headerSticky = true,
  headerTransparent = false,
  contentContainerStyle,
  style,
  showsVerticalScrollIndicator = false,
  onScroll,
  scrollEventThrottle = 16,
}) => {
  const insets = useSafeAreaInsets();
  const scrollY = React.useRef(new Animated.Value(0)).current;

  const renderContent = () => {
    if (scrollable) {
      return (
        <Animated.ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            {
              paddingTop: header && !headerSticky ? 0 : safeAreaTop ? insets.top : 0,
              paddingBottom: safeAreaBottom ? insets.bottom : 0,
            },
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          scrollEventThrottle={scrollEventThrottle}
          onScroll={
            onScroll
              ? onScroll
              : Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
                  useNativeDriver: true,
                })
          }
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={Colors.primary[500]}
                colors={[Colors.primary[500]]}
              />
            ) : undefined
          }
        >
          {header && !headerSticky && header}
          {children}
        </Animated.ScrollView>
      );
    }

    return (
      <View
        style={[
          styles.content,
          {
            paddingTop: safeAreaTop ? insets.top : 0,
            paddingBottom: safeAreaBottom ? insets.bottom : 0,
          },
          contentContainerStyle,
        ]}
      >
        {children}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor }, style]}>
      {gradientBackground ? (
        <LinearGradient
          colors={gradientBackground as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.container}
        >
          {header && headerSticky && (
            <View
              style={[
                styles.headerContainer,
                {
                  paddingTop: safeAreaTop ? insets.top : 0,
                },
                headerTransparent && styles.headerTransparent,
              ]}
            >
              {header}
            </View>
          )}
          {renderContent()}
          {footer && (
            <View
              style={[
                styles.footerContainer,
                {
                  paddingBottom: safeAreaBottom ? insets.bottom : 0,
                },
              ]}
            >
              {footer}
            </View>
          )}
          {floatingButton && (
            <View style={[styles.floatingButton, { bottom: insets.bottom + Spacing[6] }]}>
              {floatingButton}
            </View>
          )}
        </LinearGradient>
      ) : (
        <View style={[styles.container, { backgroundColor }]}>
          {header && headerSticky && (
            <View
              style={[
                styles.headerContainer,
                {
                  paddingTop: safeAreaTop ? insets.top : 0,
                },
                headerTransparent && styles.headerTransparent,
              ]}
            >
              {header}
            </View>
          )}
          {renderContent()}
          {footer && (
            <View
              style={[
                styles.footerContainer,
                {
                  paddingBottom: safeAreaBottom ? insets.bottom : 0,
                },
              ]}
            >
              {footer}
            </View>
          )}
          {floatingButton && (
            <View style={[styles.floatingButton, { bottom: insets.bottom + Spacing[6] }]}>
              {floatingButton}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  centerContent?: React.ReactNode;
  transparent?: boolean;
  blur?: boolean;
  gradient?: string[];
  style?: ViewStyle;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  leftAction,
  rightAction,
  centerContent,
  transparent = false,
  blur = false,
  gradient,
  style,
}) => {
  const content = (
    <View style={[styles.header, style]}>
      <View style={styles.headerLeft}>{leftAction}</View>
      <View style={styles.headerCenter}>
        {centerContent || (
          <>
            {title && <Animated.Text style={styles.headerTitle}>{title}</Animated.Text>}
            {subtitle && <Animated.Text style={styles.headerSubtitle}>{subtitle}</Animated.Text>}
          </>
        )}
      </View>
      <View style={styles.headerRight}>{rightAction}</View>
    </View>
  );

  if (blur) {
    return (
      <BlurView
        intensity={80}
        tint="light"
        style={StyleSheet.flatten([styles.headerBlur, transparent && styles.headerTransparent])}
      >
        {content}
      </BlurView>
    );
  }

  if (gradient) {
    return (
      <LinearGradient
        colors={gradient as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.headerGradient, transparent && styles.headerTransparent]}
      >
        {content}
      </LinearGradient>
    );
  }

  return content;
};

export interface SectionProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  horizontal?: boolean;
  showSeeAll?: boolean;
  onSeeAllPress?: () => void;
}

export const Section: React.FC<SectionProps> = ({
  title,
  subtitle,
  action,
  children,
  style,
  contentStyle,
  horizontal = false,
  showSeeAll = false,
  onSeeAllPress,
}) => {
  return (
    <View style={[styles.section, style]}>
      {(title || subtitle || action || showSeeAll) && (
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            {title && <Animated.Text style={styles.sectionTitle}>{title}</Animated.Text>}
            {subtitle && <Animated.Text style={styles.sectionSubtitle}>{subtitle}</Animated.Text>}
          </View>
          {action ||
            (showSeeAll && onSeeAllPress && (
              <Animated.Text style={styles.seeAllText} onPress={onSeeAllPress}>
                查看全部
              </Animated.Text>
            ))}
        </View>
      )}
      <View style={[horizontal ? styles.horizontalContent : styles.verticalContent, contentStyle]}>
        {children}
      </View>
    </View>
  );
};

export interface DividerProps {
  color?: string;
  thickness?: number;
  marginVertical?: number;
  style?: ViewStyle;
}

export const Divider: React.FC<DividerProps> = ({
  color = Colors.neutral[200],
  thickness = 1,
  marginVertical = Spacing[4],
  style,
}) => {
  return (
    <View
      style={[
        {
          height: thickness,
          backgroundColor: color,
          marginVertical,
        },
        style,
      ]}
    />
  );
};

export interface SpacerProps {
  size?: number;
  horizontal?: boolean;
}

export const Spacer: React.FC<SpacerProps> = ({ size = Spacing[4], horizontal = false }) => {
  return <View style={{ [horizontal ? "width" : "height"]: size }} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  headerContainer: {
    zIndex: 10,
  },
  headerTransparent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: "transparent",
  },
  headerBlur: {
    backgroundColor: "rgba(255, 255, 255, 0.8)",
  },
  headerGradient: {
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    paddingHorizontal: Spacing[4],
  },
  headerLeft: {
    width: 60,
    alignItems: "flex-start",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerRight: {
    width: 60,
    alignItems: "flex-end",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.neutral[900],
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  footerContainer: {
    borderTopWidth: 0,
  },
  floatingButton: {
    position: "absolute",
    right: Spacing[5],
  },
  section: {
    marginVertical: Spacing[4],
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing[5],
    marginBottom: Spacing[3],
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.neutral[900],
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  seeAllText: {
    fontSize: 14,
    color: Colors.primary[500],
    fontWeight: "500",
  },
  horizontalContent: {
    paddingLeft: Spacing[5],
  },
  verticalContent: {
    paddingHorizontal: Spacing[5],
  },
});

export default ScreenLayout;
