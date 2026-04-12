import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
} from 'react-native';
import { colors, typography, spacing, radius, shadows } from '../../src/theme';
import { useProfile, useUpdatePreferences } from '../../src/hooks/useProfile';
import { Text } from '../../src/components/ui/Text';
import { Button } from '../../src/components/ui/Button';
import { Loading } from '../../src/components/ui/Loading';
import type { UserPreferences } from '../../src/services/user.service';

const STYLE_TAGS = [
  '简约', '休闲', '商务', '运动', '街头',
  '复古', '甜美', '酷感', '优雅', '文艺',
  '日系', '韩系', '欧美', '国潮',
] as const;

const OCCASION_TAGS = [
  '日常', '通勤', '约会', '聚会', '运动',
  '旅行', '正式场合', '居家', '校园',
] as const;

const COLOR_PREFERENCES = [
  { label: '黑白灰', value: 'neutral' },
  { label: '大地色', value: 'earth' },
  { label: '莫兰迪', value: 'morandi' },
  { label: '明亮色', value: 'bright' },
  { label: '深色系', value: 'dark' },
  { label: '暖色系', value: 'warm' },
  { label: '冷色系', value: 'cool' },
  { label: '粉彩色', value: 'pastel' },
] as const;

const BUDGET_MIN = 0;
const BUDGET_MAX = 10000;
const BUDGET_STEP = 100;

interface TagChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

const TagChip: React.FC<TagChipProps> = ({ label, selected, onPress }) => (
  <TouchableOpacity
    style={[styles.tagChip, selected && styles.tagChipSelected]}
    onPress={onPress}
    activeOpacity={0.7}
    accessibilityRole="checkbox"
    accessibilityState={{ checked: selected }}
    accessibilityLabel={label}
  >
    <Text
      variant="bodySmall"
      style={[styles.tagChipText, selected && styles.tagChipTextSelected]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

interface SliderProps {
  min: number;
  max: number;
  step: number;
  value: number;
  onValueChange: (value: number) => void;
  formatLabel: (value: number) => string;
}

const Slider: React.FC<SliderProps> = ({
  min,
  max,
  step,
  value,
  onValueChange,
  formatLabel,
}) => {
  const screenWidth = Dimensions.get('window').width;
  const trackWidth = screenWidth - spacing.xl * 2 - 32;
  const ratio = (value - min) / (max - min);
  const filledWidth = trackWidth * ratio;

  const handleTrackPress = useCallback(
    (e: { nativeEvent: { locationX: number } }) => {
      const newRatio = Math.max(0, Math.min(1, e.nativeEvent.locationX / trackWidth));
      const rawValue = min + newRatio * (max - min);
      const steppedValue = Math.round(rawValue / step) * step;
      onValueChange(Math.max(min, Math.min(max, steppedValue)));
    },
    [min, max, step, trackWidth, onValueChange],
  );

  return (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderLabels}>
        <Text variant="caption" color={colors.textTertiary}>{formatLabel(min)}</Text>
        <Text variant="caption" color={colors.textTertiary}>{formatLabel(max)}</Text>
      </View>
      <TouchableOpacity
        style={styles.sliderTrack}
        onPress={handleTrackPress}
        activeOpacity={1}
        accessibilityRole="adjustable"
        accessibilityLabel={`预算范围: ${formatLabel(value)}`}
      >
        <View style={[styles.sliderFill, { width: filledWidth }]} />
        <View style={[styles.sliderThumb, { left: filledWidth - 8 }]} />
      </TouchableOpacity>
      <Text variant="body2" color={colors.accent} style={styles.sliderValue}>
        {formatLabel(value)}
      </Text>
    </View>
  );
};

export default function PreferencesScreen() {
  const { profile, isLoading } = useProfile();
  const updatePreferences = useUpdatePreferences();

  const [styleTags, setStyleTags] = useState<string[]>(
    profile?.preferences?.styleTags ?? [],
  );
  const [occasionTags, setOccasionTags] = useState<string[]>(
    profile?.preferences?.occasionTags ?? [],
  );
  const [colorPreferences, setColorPreferences] = useState<string[]>(
    profile?.preferences?.colorPreferences ?? [],
  );
  const [budgetMax, setBudgetMax] = useState<number>(
    profile?.preferences?.budgetMax ?? 3000,
  );

  const toggleTag = useCallback(
    (tag: string, current: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
      setter(
        current.includes(tag)
          ? current.filter((t) => t !== tag)
          : [...current, tag],
      );
    },
    [],
  );

  const handleSave = () => {
    const payload: Partial<UserPreferences> = {
      styleTags,
      occasionTags,
      colorPreferences,
      budgetMin: BUDGET_MIN,
      budgetMax,
    };

    updatePreferences.mutate(payload, {
      onSuccess: () => {
        Alert.alert('提示', '偏好设置已保存');
      },
      onError: () => {
        Alert.alert('错误', '保存失败，请重试');
      },
    });
  };

  if (isLoading && !profile) {
    return <Loading variant="fullscreen" message="加载中..." />;
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.section}>
        <Text variant="h3" style={styles.sectionTitle}>风格标签</Text>
        <Text variant="caption" color={colors.textTertiary} style={styles.sectionDesc}>
          选择你喜欢的风格，可多选
        </Text>
        <View style={styles.tagGrid}>
          {STYLE_TAGS.map((tag) => (
            <TagChip
              key={tag}
              label={tag}
              selected={styleTags.includes(tag)}
              onPress={() => toggleTag(tag, styleTags, setStyleTags)}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="h3" style={styles.sectionTitle}>场合标签</Text>
        <Text variant="caption" color={colors.textTertiary} style={styles.sectionDesc}>
          选择你常出席的场合，可多选
        </Text>
        <View style={styles.tagGrid}>
          {OCCASION_TAGS.map((tag) => (
            <TagChip
              key={tag}
              label={tag}
              selected={occasionTags.includes(tag)}
              onPress={() => toggleTag(tag, occasionTags, setOccasionTags)}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="h3" style={styles.sectionTitle}>颜色偏好</Text>
        <Text variant="caption" color={colors.textTertiary} style={styles.sectionDesc}>
          选择你偏好的色系，可多选
        </Text>
        <View style={styles.tagGrid}>
          {COLOR_PREFERENCES.map((item) => (
            <TagChip
              key={item.value}
              label={item.label}
              selected={colorPreferences.includes(item.value)}
              onPress={() => toggleTag(item.value, colorPreferences, setColorPreferences)}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="h3" style={styles.sectionTitle}>预算范围</Text>
        <Text variant="caption" color={colors.textTertiary} style={styles.sectionDesc}>
          单件服装的最高预算
        </Text>
        <Slider
          min={BUDGET_MIN}
          max={BUDGET_MAX}
          step={BUDGET_STEP}
          value={budgetMax}
          onValueChange={setBudgetMax}
          formatLabel={(v: number) => `¥${v.toLocaleString()}`}
        />
      </View>

      <View style={styles.saveContainer}>
        <Button
          variant="primary"
          size="large"
          fullWidth
          onPress={handleSave}
          loading={updatePreferences.isPending}
        >
          保存偏好
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  contentContainer: {
    paddingBottom: spacing.xxxl,
  },
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  sectionTitle: {
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionDesc: {
    marginBottom: spacing.md,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tagChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagChipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  tagChipText: {
    color: colors.textSecondary,
  },
  tagChipTextSelected: {
    color: colors.white,
  },
  sliderContainer: {
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sliderTrack: {
    height: 6,
    backgroundColor: colors.gray200,
    borderRadius: 3,
    justifyContent: 'center',
  },
  sliderFill: {
    height: 6,
    backgroundColor: colors.accent,
    borderRadius: 3,
  },
  sliderThumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.accent,
    top: -5,
  },
  sliderValue: {
    textAlign: 'center',
    marginTop: spacing.md,
  },
  saveContainer: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xxl,
  },
});
