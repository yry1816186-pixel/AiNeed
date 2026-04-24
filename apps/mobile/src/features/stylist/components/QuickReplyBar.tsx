import React, { useEffect, useCallback } from "react";
import { Text, ScrollView, StyleSheet, Pressable, type TextStyle } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { SpringConfigs } from "../../../design-system/theme/tokens/animations";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";

export interface QuickReplyBarProps {
  options: string[];
  onSelect: (option: string) => void;
}

/**
 * QuickReplyBar - Bottom fixed quick reply options bar.
 *
 * Design:
 * - Horizontal scrollable row of pill buttons
 * - Springs in from bottom on mount
 * - Each pill has terracotta border with spring press feedback
 * - White background with top border shadow
 */
export const QuickReplyBar: React.FC<QuickReplyBarProps> = ({ options, onSelect }) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const translateY = useSharedValue(100);

  useEffect(() => {
    translateY.value = withSpring(0, SpringConfigs.bouncy);
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {options.map((option) => (
          <QuickReplyPill key={option} label={option} onPress={() => onSelect(option)} />
        ))}
      </ScrollView>
    </Animated.View>
  );
};

/** Individual pill with spring press animation */
const QuickReplyPill: React.FC<{ label: string; onPress: () => void }> = ({ label, onPress }) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const pressScale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    pressScale.value = withSpring(0.95, SpringConfigs.snappy);
  }, []);

  const handlePressOut = useCallback(() => {
    pressScale.value = withSpring(1, SpringConfigs.bouncy);
  }, []);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.pill, pillStyle]}>
        <Text style={styles.pillText} numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
};

const useStyles = createStyles((colors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
      paddingVertical: DesignTokens.spacing[2],
      ...DesignTokens.shadows.sm,
    },
    scrollContent: {
      paddingHorizontal: DesignTokens.spacing[4],
      gap: DesignTokens.spacing[2],
      alignItems: "center",
    },
    pill: {
      paddingHorizontal: DesignTokens.spacing[4],
      paddingVertical: DesignTokens.spacing[2],
      borderRadius: DesignTokens.borderRadius.full,
      borderWidth: 1.5,
      borderColor: DesignTokens.colors.brand.terracotta,
      backgroundColor: colors.surface,
    },
    pillText: {
      fontSize: DesignTokens.typography.sizes.sm,
      fontWeight: DesignTokens.typography.fontWeights.medium as TextStyle["fontWeight"],
      color: DesignTokens.colors.brand.terracotta,
    },
  })
);
