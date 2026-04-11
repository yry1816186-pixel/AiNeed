import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography, shadows } from '../../theme';
import { Text } from '../ui/Text';
import type { StylistBudget } from '../../types';
import { BUDGET_LABELS } from '../../types';

const BUDGETS: StylistBudget[] = ['under100', 'under200', 'over500'];

interface BudgetSelectorProps {
  selected: StylistBudget | null;
  onSelect: (budget: StylistBudget) => void;
}

export const BudgetSelector: React.FC<BudgetSelectorProps> = ({
  selected,
  onSelect,
}) => {
  return (
    <View style={styles.row}>
      {BUDGETS.map((budget) => {
        const isSelected = selected === budget;
        return (
          <TouchableOpacity
            key={budget}
            style={[styles.capsule, isSelected && styles.capsuleSelected]}
            onPress={() => onSelect(budget)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
          >
            <Text
              style={[styles.label, isSelected && styles.labelSelected]}
            >
              {BUDGET_LABELS[budget]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  capsule: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.full,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...shadows.sm,
  },
  capsuleSelected: {
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
