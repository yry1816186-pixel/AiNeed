import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography, shadows } from '../../theme';
import { Text } from '../ui/Text';
import type { StylistOccasion } from '../../types';
import { OCCASION_LABELS, OCCASION_ICONS } from '../../types';

const OCCASIONS: StylistOccasion[] = [
  'work',
  'date',
  'sport',
  'casual',
  'party',
  'campus',
];

interface OccasionCardProps {
  selected: StylistOccasion | null;
  onSelect: (occasion: StylistOccasion) => void;
}

export const OccasionCard: React.FC<OccasionCardProps> = ({
  selected,
  onSelect,
}) => {
  return (
    <View style={styles.grid}>
      {OCCASIONS.map((occasion) => {
        const isSelected = selected === occasion;
        return (
          <TouchableOpacity
            key={occasion}
            style={[styles.card, isSelected && styles.cardSelected]}
            onPress={() => onSelect(occasion)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
          >
            <Text style={styles.icon}>{OCCASION_ICONS[occasion]}</Text>
            <Text
              style={[styles.label, isSelected && styles.labelSelected]}
            >
              {OCCASION_LABELS[occasion]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const CARD_WIDTH = (320 - spacing.md * 2) / 3;

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  card: {
    width: CARD_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...shadows.sm,
  },
  cardSelected: {
    backgroundColor: `${colors.accent}10`,
    borderColor: colors.accent,
    ...shadows.md,
  },
  icon: {
    fontSize: 28,
    lineHeight: 36,
    textAlign: 'center',
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  labelSelected: {
    color: colors.accent,
    fontWeight: '600',
  },
});
