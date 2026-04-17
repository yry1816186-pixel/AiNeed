import React, { useRef, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import { Colors, Spacing, BorderRadius, Shadows } from '../../../design-system/theme';
import { ProgressiveImage } from "../../../shared/components/ux/ProgressiveImage";
import type { QuizImage } from '../../../../stores/quizStore';
import { DesignTokens } from "../../../../design-system/theme/tokens/design-tokens";

interface QuizImageCardProps {
  image: QuizImage;
  isSelected: boolean;
  onPress: () => void;
  index: number;
}

export const QuizImageCard: React.FC<QuizImageCardProps> = ({
  image,
  isSelected,
  onPress,
  index,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityLabel={`${image.label} 图片${isSelected ? " 已选择" : ""}`}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
    >
      <Animated.View
        style={[
          styles.card,
          isSelected && styles.cardSelected,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <ProgressiveImage
          source={{ uri: image.uri }}
          thumbnailSource={image.thumbnailUri ? { uri: image.thumbnailUri } : undefined}
          style={styles.image}
          borderRadius={BorderRadius.lg}
          accessibilityLabel={image.label}
        />
        {isSelected && (
          <View style={styles.checkBadge}>
            <Text style={styles.checkMark}>✓</Text>
          </View>
        )}
        <View style={styles.labelContainer}>
          <Text style={styles.label} numberOfLines={1}>
            {image.label}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.neutral.white,
    overflow: "hidden",
    ...Shadows.sm,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: Colors.primary[500],
  },
  image: {
    width: "100%",
    aspectRatio: 3 / 4,
  },
  checkBadge: {
    position: "absolute",
    top: Spacing[2],
    right: Spacing[2],
    width: Spacing.lg,
    height: Spacing.lg,
    borderRadius: 12,
    backgroundColor: Colors.primary[500],
    justifyContent: "center",
    alignItems: "center",
  },
  checkMark: {
    color: Colors.neutral.white,
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "700",
  },
  labelContainer: {
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[2],
  },
  label: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "500",
    color: Colors.neutral[700],
  },
});
