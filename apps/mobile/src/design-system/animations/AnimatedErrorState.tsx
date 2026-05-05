import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ViewStyle, Animated as RNAnimated } from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { Duration } from "../../design-system/theme/tokens/animations";
import { useTheme, createStyles } from "../../shared/contexts/ThemeContext";
import { useReducedMotion } from "../../shared/hooks/useReducedMotion";
import { useFeatureFlags } from "../../shared/contexts/FeatureFlagContext";
import { FeatureFlagKeys } from "../../constants/feature-flags";
import { Colors, Spacing, BorderRadius, Typography } from "../../design-system/theme";

export type ErrorType = "network" | "server" | "permission" | "timeout";

export interface AnimatedErrorStateProps {
  type?: ErrorType;
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  style?: ViewStyle;
}

const ERROR_CONFIG: Record<ErrorType, { icon: string; title: string; description: string }> = {
  network: {
    icon: "wifi-outline",
    title: "\u7F51\u7EDC\u4E0D\u7ED9\u529B",
    description: "\u8BF7\u68C0\u67E5\u7F51\u7EDC\u8FDE\u63A5\u540E\u91CD\u8BD5",
  },
  server: {
    icon: "server-outline",
    title: "\u670D\u52A1\u5668\u5F00\u5C0F\u5DEE\u4E86",
    description: "\u6211\u4EEC\u6B63\u5728\u4FEE\u590D\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5",
  },
  permission: {
    icon: "lock-closed-outline",
    title: "\u6CA1\u6709\u6743\u9650",
    description: "\u4F60\u6682\u65E0\u6743\u9650\u8BBF\u95EE\u6B64\u5185\u5BB9",
  },
  timeout: {
    icon: "hourglass-outline",
    title: "\u8BF7\u6C42\u8D85\u65F6",
    description: "\u7F51\u7EDC\u54CD\u5E94\u65F6\u95F4\u8FC7\u957F\uFF0C\u8BF7\u91CD\u8BD5",
  },
};

export const AnimatedErrorState: React.FC<AnimatedErrorStateProps> = ({
  type = "network",
  title,
  description,
  onRetry,
  retryLabel = "\u91CD\u8BD5",
  style,
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const { reducedMotion } = useReducedMotion();
  const featureFlags = useFeatureFlags();

  const shakeAnim = useRef(new RNAnimated.Value(0)).current;
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;

  const config = ERROR_CONFIG[type];
  const displayTitle = title || config.title;
  const displayDesc = description || config.description;

  const isEnabled =
    !reducedMotion && featureFlags.isEnabled(FeatureFlagKeys.ENABLE_ERRORSTATE_ANIMATION);

  useEffect(() => {
    if (isEnabled) {
      const shakeSequence = RNAnimated.sequence([
        RNAnimated.timing(shakeAnim, { toValue: 5, duration: 50, useNativeDriver: true }),
        RNAnimated.timing(shakeAnim, { toValue: -5, duration: 50, useNativeDriver: true }),
        RNAnimated.timing(shakeAnim, { toValue: 5, duration: 50, useNativeDriver: true }),
        RNAnimated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]);
      shakeSequence.start();

      const pulseLoop = RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(pulseAnim, {
            toValue: 1.05,
            duration: Duration.slower,
            useNativeDriver: true,
          }),
          RNAnimated.timing(pulseAnim, {
            toValue: 1,
            duration: Duration.slower,
            useNativeDriver: true,
          }),
        ])
      );
      if (onRetry) {
        pulseLoop.start();
      }

      return () => {
        shakeSequence.stop();
        pulseLoop.stop();
      };
    }
  }, [isEnabled, onRetry]);

  return (
    <View style={[styles.container, style]}>
      <RNAnimated.View
        style={[
          styles.iconContainer,
          {
            backgroundColor: colors.error[50],
            transform: isEnabled ? [{ translateX: shakeAnim }] : [],
          },
        ]}
      >
        <Ionicons name={config.icon} size={56} color={colors.error[500]} />
      </RNAnimated.View>

      <Text style={styles.title}>{displayTitle}</Text>
      <Text style={styles.description}>{displayDesc}</Text>

      {onRetry && (
        <RNAnimated.View
          style={{
            transform: isEnabled ? [{ scale: pulseAnim }] : [],
          }}
        >
          <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.8}>
            <Ionicons name="refresh-outline" size={18} color={Colors.neutral.white} />
            <Text style={styles.retryText}>{retryLabel}</Text>
          </TouchableOpacity>
        </RNAnimated.View>
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
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing[6],
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
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[2],
    backgroundColor: colors.primary[500],
    paddingHorizontal: Spacing[8],
    paddingVertical: Spacing[3],
    borderRadius: BorderRadius.xl,
    elevation: 3,
  },
  retryText: {
    ...Typography.styles.button,
    color: Colors.neutral.white,
  },
}));

export default AnimatedErrorState;
