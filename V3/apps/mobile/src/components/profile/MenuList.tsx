import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { colors, typography, spacing, radius, shadows } from '../../theme';
import { Text } from '../ui/Text';

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}

export interface MenuGroup {
  title: string;
  items: MenuItem[];
}

interface MenuListProps {
  groups: MenuGroup[];
}

const ChevronRight: React.FC = () => (
  <Svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <Path d="M6 4L10 8L6 12" stroke={colors.textTertiary} strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);

export const MenuList: React.FC<MenuListProps> = ({ groups }) => {
  return (
    <View style={styles.container}>
      {groups.map((group, groupIndex) => (
        <View key={group.title}>
          {groupIndex > 0 && <View style={styles.groupSpacer} />}
          <Text variant="caption" color={colors.textTertiary} style={styles.groupTitle}>
            {group.title}
          </Text>
          <View style={styles.groupCard}>
            {group.items.map((item, itemIndex) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.menuRow,
                  itemIndex === group.items.length - 1 && styles.menuRowLast,
                ]}
                onPress={item.onPress}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                <View style={styles.menuRowLeft}>
                  <View style={styles.menuIcon}>{item.icon}</View>
                  <Text variant="body" style={styles.menuLabel}>
                    {item.label}
                  </Text>
                </View>
                <ChevronRight />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
  },
  groupSpacer: {
    height: spacing.lg,
  },
  groupTitle: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    fontWeight: '500' as const,
  },
  groupCard: {
    marginHorizontal: spacing.xl,
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.lg,
    ...shadows.sm,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  menuRowLast: {
    borderBottomWidth: 0,
  },
  menuRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuLabel: {
    color: colors.textPrimary,
  },
});
