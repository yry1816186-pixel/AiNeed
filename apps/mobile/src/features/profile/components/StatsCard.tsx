import React, { useEffect, useRef } from "react";
import { View, Text } from "react-native";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { SpringConfigs } from "../../../design-system/theme/tokens/animations";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";

interface StatsCardProps {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ReactNode;
}

const COUNT_UP_DURATION = 1000;

export const StatsCard: React.FC<StatsCardProps> = ({ label, value, suffix, icon }) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const scale = useSharedValue(0.8);

  useEffect(() => {
    scale.value = withSpring(1, SpringConfigs.bouncy);
  }, []);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.card, cardAnimatedStyle]}>
      <View style={styles.iconContainer}>{icon}</View>
      <CountUpText value={value} suffix={suffix} style={styles.valueText} />
      <Text style={styles.labelText} numberOfLines={1}>
        {label}
      </Text>
    </Animated.View>
  );
};

interface CountUpTextProps {
  value: number;
  suffix?: string;
  style: ReturnType<typeof useStyles>["valueText"];
}

const CountUpText: React.FC<CountUpTextProps> = ({ value, suffix, style }) => {
  const [displayed, setDisplayed] = React.useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / COUNT_UP_DURATION, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * value);

      setDisplayed(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [value]);

  return (
    <Text style={style}>
      {displayed}
      {suffix ?? ""}
    </Text>
  );
};

const useStyles = createStyles((colors) => ({
  card: {
    backgroundColor: colors.backgrounds.primary,
    borderRadius: DesignTokens.borderRadius.xl,
    paddingVertical: DesignTokens.spacing[4],
    paddingHorizontal: DesignTokens.spacing[3],
    alignItems: "center",
    justifyContent: "center",
    ...DesignTokens.shadows.sm,
    borderWidth: 1,
    borderColor: colors.borders.light,
  },
  iconContainer: {
    marginBottom: DesignTokens.spacing[2],
    alignItems: "center",
    justifyContent: "center",
  },
  valueText: {
    fontSize: DesignTokens.typography.sizes["2xl"],
    fontWeight: "700",
    color: colors.text.brand,
    lineHeight: DesignTokens.typography.sizes["2xl"] * DesignTokens.typography.lineHeights.tight,
    letterSpacing: DesignTokens.typography.letterSpacing.tight,
  },
  labelText: {
    fontSize: DesignTokens.typography.sizes.xs,
    fontWeight: "400",
    color: colors.text.tertiary,
    marginTop: DesignTokens.spacing[1],
    lineHeight: DesignTokens.typography.sizes.xs * DesignTokens.typography.lineHeights.normal,
  },
}));

export default StatsCard;
