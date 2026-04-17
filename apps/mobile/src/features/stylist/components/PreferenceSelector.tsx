import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  interpolate,
} from "react-native-reanimated";
import AnimatedReanimated from "react-native-reanimated";
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import { AiStylistAction } from '../../../services/api/ai-stylist.api';
import { Spacing } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';


const AnimatedView = AnimatedReanimated.createAnimatedComponent(View);
const AnimatedPressable = AnimatedReanimated.createAnimatedComponent(Pressable);

export interface PreferenceOption {
  label: string;
  value: string;
  icon?: string;
}

export interface PreferenceSelectorProps {
  action: AiStylistAction;
  onSelect: (field: string, values: string[]) => void;
  onSkip?: () => void;
}

const PREFERENCE_CONFIG: Record<
  string,
  { title: string; multiSelect: boolean; options: PreferenceOption[] }
> = {
  preferredStyles: {
    title: "你喜欢的风格",
    multiSelect: true,
    options: [
      { label: "极简", value: "极简", icon: "✨" },
      { label: "韩系", value: "韩系", icon: "🌸" },
      { label: "法式", value: "法式", icon: "🇫🇷" },
      { label: "街头", value: "街头", icon: "🔥" },
      { label: "运动", value: "运动", icon: "🏃" },
      { label: "复古", value: "复古", icon: "📻" },
      { label: "轻正式", value: "轻正式", icon: "👔" },
      { label: "日系", value: "日系", icon: "🎌" },
    ],
  },
  styleAvoidances: {
    title: "你想避免的风格",
    multiSelect: true,
    options: [
      { label: "过于花哨", value: "过于花哨" },
      { label: "过于正式", value: "过于正式" },
      { label: "过于休闲", value: "过于休闲" },
      { label: "过于暴露", value: "过于暴露" },
      { label: "过于保守", value: "过于保守" },
    ],
  },
  fitGoals: {
    title: "你想达到的效果",
    multiSelect: true,
    options: [
      { label: "显高", value: "显高", icon: "📏" },
      { label: "显瘦", value: "显瘦", icon: "💃" },
      { label: "修饰胯部", value: "修饰胯部", icon: "👗" },
      { label: "平衡肩线", value: "平衡肩线", icon: "👚" },
      { label: "利落专业", value: "利落专业", icon: "💼" },
      { label: "减龄", value: "减龄", icon: "🌟" },
      { label: "提气色", value: "提气色", icon: "🎨" },
    ],
  },
  preferredColors: {
    title: "你喜欢的颜色",
    multiSelect: true,
    options: [
      { label: "黑", value: "黑", icon: "⬛" },
      { label: "白", value: "白", icon: "⬜" },
      { label: "灰", value: "灰", icon: "🟫" },
      { label: "蓝", value: "蓝", icon: "🔵" },
      { label: "粉", value: "粉", icon: "🩷" },
      { label: "绿", value: "绿", icon: "🟢" },
      { label: "棕", value: "棕", icon: "🟤" },
      { label: "红", value: "红", icon: "🔴" },
    ],
  },
  occasion: {
    title: "这是什么场合？",
    multiSelect: false,
    options: [
      { label: "面试", value: "interview", icon: "💼" },
      { label: "通勤", value: "work", icon: "🏢" },
      { label: "约会", value: "date", icon: "💕" },
      { label: "旅行", value: "travel", icon: "✈️" },
      { label: "聚会", value: "party", icon: "🎉" },
      { label: "日常", value: "daily", icon: "☀️" },
      { label: "校园", value: "campus", icon: "📚" },
    ],
  },
  weather: {
    title: "天气怎么样？",
    multiSelect: false,
    options: [
      { label: "炎热", value: "hot", icon: "☀️" },
      { label: "温暖", value: "warm", icon: "🌤️" },
      { label: "凉爽", value: "cool", icon: "🌬️" },
      { label: "寒冷", value: "cold", icon: "❄️" },
    ],
  },
};

export const PreferenceSelector: React.FC<PreferenceSelectorProps> = ({
  action,
  onSelect,
  onSkip,
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const containerOpacity = useSharedValue(0);
  const containerTranslateY = useSharedValue(20);

  const field = action.field || "preferredStyles";
  const config = PREFERENCE_CONFIG[field] || PREFERENCE_CONFIG.preferredStyles;
  const rawOptions = action.options || config.options;
  const options: PreferenceOption[] = rawOptions.map((opt) =>
    typeof opt === "string" ? { label: opt, value: opt } : opt
  );

  useEffect(() => {
    containerOpacity.value = withTiming(1, { duration: 300 });
    containerTranslateY.value = withSpring(0, { damping: 15, stiffness: 150 });
  }, []);

  const toggleOption = (value: string) => {
    if (config.multiSelect) {
      setSelectedValues((prev) =>
        prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
      );
    } else {
      setSelectedValues([value]);
      setTimeout(() => {
        onSelect(field, [value]);
      }, 300);
    }
  };

  const handleConfirm = () => {
    if (selectedValues.length > 0) {
      onSelect(field, selectedValues);
    }
  };

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ translateY: containerTranslateY.value }],
  }));

  return (
    <AnimatedView style={[styles.container, containerStyle]}>
      <View style={styles.header}>
        <Text style={styles.title}>{config.title}</Text>
        {config.multiSelect && (
          <Text style={styles.subtitle}>可多选 ({selectedValues.length} 已选)</Text>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.optionsContainer}
      >
        {options.map((option, index) => {
          const isSelected = selectedValues.includes(option.value);
          return (
            <OptionChip
              key={option.value}
              option={option}
              isSelected={isSelected}
              index={index}
              onPress={() => toggleOption(option.value)}
            />
          );
        })}
      </ScrollView>

      {config.multiSelect && (
        <View style={styles.footer}>
          {action.canSkip && (
            <Pressable style={styles.skipButton} onPress={onSkip}>
              <Text style={styles.skipText}>跳过</Text>
            </Pressable>
          )}
          <Pressable
            style={[
              styles.confirmButton,
              selectedValues.length === 0 && styles.confirmButtonDisabled,
            ]}
            onPress={handleConfirm}
            disabled={selectedValues.length === 0}
          >
            <LinearGradient
              colors={
                selectedValues.length > 0
                  ? [colors.primary, colors.primary]
                  : [DesignTokens.colors.neutral[300], DesignTokens.colors.neutral[400]]
              }
              style={styles.confirmGradient}
            >
              <Text style={styles.confirmText}>确认选择</Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}
    </AnimatedView>
  );
};

interface OptionChipProps {
  option: PreferenceOption;
  isSelected: boolean;
  index: number;
  onPress: () => void;
}

const OptionChip: React.FC<OptionChipProps> = ({ option, isSelected, index, onPress }) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(index * 50, withSpring(1, { damping: 12, stiffness: 200 }));
    opacity.value = withDelay(index * 50, withTiming(1, { duration: 200 }));
  }, []);

  const chipStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <AnimatedPressable
      style={[styles.chip, isSelected && styles.chipSelected, chipStyle]}
      onPress={onPress}
    >
      {option.icon && <Text style={styles.chipIcon}>{option.icon}</Text>}
      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{option.label}</Text>
      {isSelected && (
        <View style={styles.checkmark}>
          <Text style={styles.checkmarkText}>✓</Text>
        </View>
      )}
    </AnimatedPressable>
  );
};

const useStyles = createStyles((colors) => ({
  container: {
    backgroundColor: DesignTokens.colors.neutral[50],
    borderRadius: 16,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
  },
  header: {
    marginBottom: DesignTokens.spacing[3],
  },
  title: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: DesignTokens.colors.neutral[900],
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.neutral[500],
  },
  optionsContainer: {
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing['2.5'],
    borderRadius: 20,
    backgroundColor: DesignTokens.colors.neutral[100],
    borderWidth: 1.5,
    borderColor: DesignTokens.colors.neutral[200],
    marginRight: Spacing.sm,
  },
  chipSelected: {
    backgroundColor: colors.secondary + "20",
    borderColor: colors.secondary,
  },
  chipIcon: {
    fontSize: DesignTokens.typography.sizes.md,
    marginRight: DesignTokens.spacing['1.5'],
  },
  chipText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "500",
    color: DesignTokens.colors.neutral[700],
  },
  chipTextSelected: {
    color: colors.secondary,
    fontWeight: "600",
  },
  checkmark: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: DesignTokens.spacing['1.5'],
  },
  checkmarkText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textInverse,
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: Spacing.md,
    gap: DesignTokens.spacing[3],
  },
  skipButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing['2.5'],
  },
  skipText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: DesignTokens.colors.neutral[500],
    fontWeight: "500",
  },
  confirmButton: {
    borderRadius: 20,
    overflow: "hidden",
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmGradient: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: DesignTokens.spacing[3],
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.textInverse,
  },
}))
