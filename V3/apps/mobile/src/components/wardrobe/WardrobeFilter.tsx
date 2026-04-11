import React from 'react';
import {
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { colors, spacing, radius, typography } from '../../theme';
import { Text } from '../ui/Text';
import {
  type ClothingCategory,
  CATEGORY_LABELS,
  ALL_CATEGORIES,
} from '../../hooks/useWardrobe';

interface WardrobeFilterProps {
  selected: ClothingCategory | null;
  onSelect: (category: ClothingCategory | null) => void;
}

const FILTER_OPTIONS: Array<{ key: ClothingCategory | null; label: string }> = [
  { key: null, label: '全部' },
  ...ALL_CATEGORIES.map((cat) => ({ key: cat, label: CATEGORY_LABELS[cat] })),
];

export const WardrobeFilter: React.FC<WardrobeFilterProps> = ({
  selected,
  onSelect,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {FILTER_OPTIONS.map((option) => {
        const isActive = selected === option.key;
        return (
          <TouchableOpacity
            key={option.key ?? 'all'}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => onSelect(option.key)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            <Text
              variant="body2"
              weight={isActive ? '600' : '400'}
              color={isActive ? colors.white : colors.textSecondary}
              style={styles.chipText}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.gray100,
    marginRight: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.accent,
  },
  chipText: {
    lineHeight: typography.body2.lineHeight,
  },
});
