import React, { useCallback } from "react";
import { View, TextInput, Pressable } from "react-native";
import { BlurView } from "expo-blur";
import { MagnifyingGlass, X } from "phosphor-react-native";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { SpringConfigs } from "../../../design-system/theme/tokens/animations";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from "react-native-reanimated";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function SearchBar({ value, onChangeText, onFocus, onBlur }: SearchBarProps) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const isFocused = useSharedValue(0);

  const handleFocus = useCallback(() => {
    isFocused.value = withSpring(1, SpringConfigs.snappy);
    onFocus?.();
  }, [onFocus, isFocused]);

  const handleBlur = useCallback(() => {
    isFocused.value = withSpring(0, SpringConfigs.snappy);
    onBlur?.();
  }, [onBlur, isFocused]);

  const handleClear = useCallback(() => {
    onChangeText("");
  }, [onChangeText]);

  const animatedContainerStyle = useAnimatedStyle(() => {
    const scale = interpolate(isFocused.value, [0, 1], [0.9, 1.0]);
    const elevation = interpolate(isFocused.value, [0, 1], [0, 4]);
    const shadowOpacity = interpolate(isFocused.value, [0, 1], [0, 0.12]);

    return {
      transform: [{ scaleX: scale }],
      shadowOpacity,
      elevation,
    };
  });

  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.animatedContainer, animatedContainerStyle]}>
        <BlurView intensity={40} tint="light" style={styles.blurContainer}>
          <View style={styles.searchRow}>
            <MagnifyingGlass
              size={DesignTokens.typography.sizes.lg}
              color={colors.textTertiary}
              weight="regular"
            />
            <TextInput
              style={styles.input}
              placeholder="搜索穿搭、场景、单品..."
              placeholderTextColor={colors.textTertiary}
              value={value}
              onChangeText={onChangeText}
              onFocus={handleFocus}
              onBlur={handleBlur}
              returnKeyType="search"
            />
            {value.length > 0 && (
              <Pressable onPress={handleClear} hitSlop={8} style={styles.clearButton}>
                <X
                  size={DesignTokens.typography.sizes.base}
                  color={colors.textTertiary}
                  weight="bold"
                />
              </Pressable>
            )}
          </View>
        </BlurView>
      </Animated.View>
    </View>
  );
}

const useStyles = createStyles((colors) => ({
  wrapper: {
    paddingHorizontal: DesignTokens.spacing[4],
    paddingTop: DesignTokens.spacing[3],
    paddingBottom: DesignTokens.spacing[2],
  },
  animatedContainer: {
    borderRadius: DesignTokens.borderRadius.full,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    overflow: "hidden",
  },
  blurContainer: {
    borderRadius: DesignTokens.borderRadius.full,
    overflow: "hidden",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    paddingHorizontal: DesignTokens.spacing[4],
  },
  input: {
    flex: 1,
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textSecondary,
    marginLeft: DesignTokens.spacing[2],
  },
  clearButton: {
    padding: DesignTokens.spacing[1],
  },
}));
