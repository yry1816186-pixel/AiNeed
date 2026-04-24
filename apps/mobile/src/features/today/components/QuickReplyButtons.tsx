import React, { useCallback } from "react";
import {
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInRight,
} from "react-native-reanimated";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { SpringConfigs } from "../../../design-system/theme/tokens/animations";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";

interface QuickReplyButtonsProps {
  options: string[];
  onSelect: (option: string) => void;
}

const TERRACOTTA = DesignTokens.colors.brand.terracotta;
const BORDER_WIDTH = 1.5;
const STAGGER_DELAY = 80;

export function QuickReplyButtons({ options, onSelect }: QuickReplyButtonsProps) {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  return (
    <View style={styles.container}>
      {options.map((option, index) => (
        <QuickReplyButton
          key={option}
          label={option}
          index={index}
          onSelect={onSelect}
          buttonStyle={styles.button}
          textStyle={styles.buttonText}
        />
      ))}
    </View>
  );
}

interface QuickReplyButtonProps {
  label: string;
  index: number;
  onSelect: (label: string) => void;
  buttonStyle: StyleProp<ViewStyle>;
  textStyle: StyleProp<TextStyle>;
}

function QuickReplyButton({
  label,
  index,
  onSelect,
  buttonStyle,
  textStyle,
}: QuickReplyButtonProps) {
  const pressScale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const handlePressIn = useCallback(() => {
    pressScale.value = withSpring(0.94, SpringConfigs.snappy);
  }, [pressScale]);

  const handlePressOut = useCallback(() => {
    pressScale.value = withSpring(1, SpringConfigs.bouncy);
  }, [pressScale]);

  const handlePress = useCallback(() => {
    onSelect(label);
  }, [onSelect, label]);

  const entering = FadeInRight.delay(index * STAGGER_DELAY)
    .springify()
    .damping(12)
    .stiffness(180);

  return (
    <Animated.View entering={entering} style={animatedStyle}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        style={buttonStyle}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text style={textStyle}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const useStyles = createStyles((colors) => ({
  container: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: DesignTokens.spacing[2],
  },
  button: {
    paddingHorizontal: DesignTokens.spacing[4],
    paddingVertical: DesignTokens.spacing[2],
    borderRadius: DesignTokens.borderRadius.full,
    borderWidth: BORDER_WIDTH,
    borderColor: TERRACOTTA,
    backgroundColor: colors.background,
  },
  buttonText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: DesignTokens.typography.fontWeights.medium,
    color: TERRACOTTA,
  },
}));
