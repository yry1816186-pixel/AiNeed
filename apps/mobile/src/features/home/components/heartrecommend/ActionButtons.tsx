import React, { useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { theme, Colors, DesignTokens } from '../design-system/theme';
import { haptics } from '../../../utils/haptics';
import { DesignTokens } from "../../../../design-system/theme/tokens/design-tokens";

interface ActionButtonsProps {
  onRefresh: () => void;
}

export const EmptyState: React.FC<ActionButtonsProps> = ({ onRefresh }) => (
  <View style={styles.emptyContainer}>
    <Ionicons name="shirt-outline" size={64} color={theme.colors.textTertiary} />
    <Text style={styles.emptyTitle}>暂无更多推荐</Text>
    <Text style={styles.emptySubtitle}>我们正在为您寻找更多心仪好物</Text>
    <TouchableOpacity style={styles.refreshButton} onPress={onRefresh} accessibilityLabel="刷新推荐" accessibilityRole="button">
      <LinearGradient colors={[DesignTokens.colors.brand.terracotta, DesignTokens.colors.brand.camel]} style={styles.refreshGradient}>
        <Ionicons name="refresh" size={20} color={DesignTokens.colors.backgrounds.primary} />
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
            backgroundColor: DesignTokens.colors.backgrounds.primary,
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
      color={DesignTokens.colors.semantic.success}
      borderColor={DesignTokens.colors.semantic.successLight}
      onPress={onAddToCart}
      accessibilityLabel="加入购物车"
    />
    <ActionButton
      icon="heart"
      size={56}
      color={DesignTokens.colors.brand.terracotta}
      borderColor={DesignTokens.colors.brand.terracottaLight}
      onPress={onLike}
      accessibilityLabel="喜欢"
    />
  </View>
);

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: DesignTokens.typography.sizes.base,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
  },
  refreshButton: {
    borderRadius: 24,
    overflow: "hidden",
  },
  refreshGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  refreshText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: DesignTokens.colors.backgrounds.primary,
  },
  buttonsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
});
