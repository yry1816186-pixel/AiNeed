import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ViewStyle, Animated as RNAnimated } from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { Duration, SpringConfigs } from "../../design-system/theme/tokens/animations";
import { useTheme, createStyles } from "../../shared/contexts/ThemeContext";
import { useReducedMotion } from "../../shared/hooks/useReducedMotion";
import { useFeatureFlags } from "../../shared/contexts/FeatureFlagContext";
import { FeatureFlagKeys } from "../../constants/feature-flags";
import { Colors, Spacing, BorderRadius, Typography } from "../../design-system/theme";

export interface AnimatedEmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export const AnimatedEmptyState: React.FC<AnimatedEmptyStateProps> = ({
  icon = "folder-open-outline",
  title,
  description,
  actionLabel,
  onAction,
  style,
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const { reducedMotion } = useReducedMotion();
  const featureFlags = useFeatureFlags();

  const iconScaleAnim = useRef(new RNAnimated.Value(0)).current;
  const textOpacityAnim = useRef(new RNAnimated.Value(0)).current;

  const isEnabled =
    !reducedMotion && featureFlags.isEnabled(FeatureFlagKeys.ENABLE_EMPTYSTATE_ANIMATION);

  useEffect(() => {
    if (isEnabled) {
      iconScaleAnim.setValue(0);
      textOpacityAnim.setValue(0);

      RNAnimated.spring(iconScaleAnim, {
        toValue: 1,
        ...SpringConfigs.bouncy,
        useNativeDriver: true,
      }).start();

      RNAnimated.timing(textOpacityAnim, {
        toValue: 1,
        duration: Duration.normal,
        delay: 200,
        useNativeDriver: true,
      }).start();
    } else {
      iconScaleAnim.setValue(1);
      textOpacityAnim.setValue(1);
    }
  }, [isEnabled]);

  return (
    <View style={[styles.container, style]}>
      <RNAnimated.View
        style={[
          styles.iconContainer,
          {
            transform: isEnabled ? [{ scale: iconScaleAnim }] : [],
          },
        ]}
      >
        <View style={[styles.iconBg, { backgroundColor: colors.primary[50] }]}>
          <Ionicons name={icon} size={48} color={colors.primary[500]} />
        </View>
      </RNAnimated.View>

      <RNAnimated.View
        style={{
          opacity: isEnabled ? textOpacityAnim : 1,
          alignItems: "center",
        }}
      >
        <Text style={styles.title}>{title}</Text>
        {description && <Text style={styles.description}>{description}</Text>}
      </RNAnimated.View>

      {actionLabel && onAction && (
        <TouchableOpacity style={styles.actionButton} onPress={onAction} activeOpacity={0.8}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const useStyles = createStyles((colors) => ({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing[10],
  },
  iconContainer: {
    marginBottom: Spacing[6],
  },
  iconBg: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...Typography.heading.lg,
    color: colors.neutral[800],
    textAlign: "center",
    marginBottom: Spacing[2],
  },
  description: {
    ...Typography.body.md,
    color: colors.neutral[500],
    textAlign: "center",
    maxWidth: 280,
    marginBottom: Spacing[6],
  },
  actionButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: Spacing[8],
    paddingVertical: Spacing[3],
    borderRadius: BorderRadius.xl,
  },
  actionText: {
    ...Typography.styles.button,
    color: Colors.neutral.white,
  },
}));

export default AnimatedEmptyState;
