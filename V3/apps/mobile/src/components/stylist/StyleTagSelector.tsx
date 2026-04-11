import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography, shadows } from '../../theme';
import { Text } from '../ui/Text';
import type { StylistStyleTag } from '../../types';
import { STYLE_TAG_LABELS } from '../../types';

const STYLE_TAGS: StylistStyleTag[] = [
  'minimal',
  'korean',
  'guochao',
  'japanese',
  'western',
  'neoChinese',
];

interface StyleTagSelectorProps {
  selected: StylistStyleTag[];
  onToggle: (style: StylistStyleTag) => void;
}

export const StyleTagSelector: React.FC<StyleTagSelectorProps> = ({
  selected,
  onToggle,
}) => {
  return (
    <View style={styles.grid}>
      {STYLE_TAGS.map((tag) => {
        const isSelected = selected.includes(tag);
        return (
          <TouchableOpacity
            key={tag}
            style={[styles.tag, isSelected && styles.tagSelected]}
            onPress={() => onToggle(tag)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
          >
            <Text
              style={[styles.label, isSelected && styles.labelSelected]}
            >
              {STYLE_TAG_LABELS[tag]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  tag: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...shadows.sm,
  },
  tagSelected: {
    backgroundColor: `${colors.accent}10`,
    borderColor: colors.accent,
    ...shadows.md,
  },
  label: {
    ...typography.body,
    color: colors.textSecondary,
  },
  labelSelected: {
    color: colors.accent,
    fontWeight: '600',
  },
});
