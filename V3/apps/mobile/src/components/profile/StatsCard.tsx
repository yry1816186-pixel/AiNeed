import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius, shadows } from '../../theme';
import { Text } from '../ui/Text';

interface StatItem {
  value: number;
  label: string;
  onPress?: () => void;
}

interface StatsCardProps {
  items: StatItem[];
}

export const StatsCard: React.FC<StatsCardProps> = ({ items }) => {
  return (
    <View style={styles.container}>
      {items.map((item, index) => (
        <React.Fragment key={item.label}>
          {index > 0 && <View style={styles.divider} />}
          <TouchableOpacity
            style={styles.statItem}
            onPress={item.onPress}
            activeOpacity={0.7}
            disabled={!item.onPress}
            accessibilityRole="button"
            accessibilityLabel={`${item.label}: ${item.value}`}
          >
            <Text variant="h2" style={styles.statValue}>
              {item.value}
            </Text>
            <Text variant="caption" color={colors.textTertiary} style={styles.statLabel}>
              {item.label}
            </Text>
          </TouchableOpacity>
        </React.Fragment>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: spacing.xl,
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    ...shadows.card,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    color: colors.primary,
  },
  statLabel: {
    marginTop: spacing.xs,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: colors.divider,
    alignSelf: 'center',
  },
});
