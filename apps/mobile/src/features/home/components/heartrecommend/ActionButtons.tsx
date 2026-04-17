import React, { useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { Colors, DesignTokens , flatColors as colors, Spacing } from '../../../../design-system/theme';
import { useTheme, createStyles } from '../../../../shared/contexts/ThemeContext';
import { haptics } from '../../../../utils/haptics';


interface ActionButtonsProps {
  onRefresh: () => void;
}

export const EmptyState: React.FC<ActionButtonsProps> = ({ onRefresh }) => (
  <View style={styles.emptyContainer}>
    <Ionicons name="shirt-outline" size={64} color={colors.textTertiary} />
    <Text style={styles.emptyTitle}>暂无更多推荐</Text>
    <Text style={styles.emptySubtitle}>我们正在为您寻找更多心仪好物</Text>
    <TouchableOpacity style={styles.refreshButton} onPress={onRefresh} accessibilityLabel="刷新推荐" accessibilityRole="button">
      <LinearGradient colors={[colors.primary, colors.primary]} style={styles.refreshGradient}>
        <Ionicons name="refresh" size={20} color={colors.surface} />
        <Text style={styles.refreshText}>刷新推荐</Text>
      </LinearGradient>
    </TouchableOpacity>
  </View>
);

interface ActionButtonProps {
  icon: string;
  size: number;
  color: string;
  borderColor: string;
  onPress: () => void;
  accessibilityLabel: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  size,
  color,
  borderColor,
  onPress,
  accessibilityLabel,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.85, { damping: 15 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15 });
  }, []);

  const handlePress = useCallback(() => {
    haptics.light();
    onPress();
  }, [onPress]);

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 2,
            borderColor,
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
          },
          animatedStyle,
        ]}
      >
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={Math.round(size * 0.4)} color={color} />
      </Animated.View>
    </Pressable>
  );
};

interface ActionButtonsCallbacks {
  onDislike: () => void;
  onSkip: () => void;
  onAddToCart: () => void;
  onLike: () => void;
}

export const ActionButtons: React.FC<ActionButtonsCallbacks> = ({
  onDislike,
  onSkip,
  onAddToCart,
  onLike,
}) => (
  <View style={styles.buttonsRow}>
    <ActionButton
      icon="close"
      size={56}
      color={DesignTokens.colors.neutral[400]}
      borderColor={DesignTokens.colors.neutral[300]}
      onPress={onDislike}
      accessibilityLabel="不喜欢"
    />
    <ActionButton
      icon="arrow-forward"
      size={48}
      color={DesignTokens.colors.neutral[300]}
      borderColor={DesignTokens.colors.neutral[200]}
      onPress={onSkip}
      accessibilityLabel="跳过"
    />
    <ActionButton
      icon="cart"
      size={48}
      color={colors.success}
      borderColor={colors.successLight}
      onPress={onAddToCart}
      accessibilityLabel="加入购物车"
    />
    <ActionButton
      icon="heart"
      size={56}
      color={colors.primary}
      borderColor={colors.primaryLight}
      onPress={onLike}
      accessibilityLabel="喜欢"
    />
  </View>
);

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: DesignTokens.spacing[10],
  },
  emptyTitle: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  refreshButton: {
    borderRadius: 24,
    overflow: "hidden",
  },
  refreshGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: DesignTokens.spacing['3.5'],
    paddingHorizontal: DesignTokens.spacing[7],
  },
  refreshText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.surface,
  },
  buttonsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: DesignTokens.spacing[5],
  },
});
