import React, { useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Svg, Path, Circle, Rect, Ellipse } from 'react-native-svg';
import { colors, spacing, radius, typography } from '../../theme';
import { Text } from '../ui/Text';

interface QuickActionItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}

function TryOnIcon() {
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 2L6 6H4C3.44772 6 3 6.44772 3 7V10H5V20C5 20.5523 5.44772 21 6 21H18C18.5523 21 19 20.5523 19 20V10H21V7C21 6.44772 20.5523 6 20 6H18L16 2H8Z"
        stroke={colors.accent}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <Path d="M10 6H14" stroke={colors.accent} strokeWidth="1.6" strokeLinecap="round" />
      <Circle cx="12" cy="14" r="2" stroke={colors.accentLight} strokeWidth="1.2" />
    </Svg>
  );
}

function CustomizeIcon() {
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <Rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="3"
        stroke={colors.accent}
        strokeWidth="1.6"
      />
      <Path
        d="M8 12L10.5 14.5L16 9"
        stroke={colors.accent}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CommunityIcon() {
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <Circle cx="7" cy="8" r="3" stroke={colors.accent} strokeWidth="1.6" />
      <Circle cx="17" cy="8" r="3" stroke={colors.accent} strokeWidth="1.6" />
      <Path
        d="M1 20C1 16.6863 3.68629 14 7 14C8.5 14 9.87 14.55 10.93 15.46"
        stroke={colors.accent}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <Path
        d="M23 20C23 16.6863 20.3137 14 17 14C15.5 14 14.13 14.55 13.07 15.46"
        stroke={colors.accent}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function MoreIcon() {
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <Circle cx="5" cy="12" r="2" fill={colors.accent} />
      <Circle cx="12" cy="12" r="2" fill={colors.accent} />
      <Circle cx="19" cy="12" r="2" fill={colors.accent} />
      <Rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="4"
        stroke={colors.accent}
        strokeWidth="1.6"
      />
    </Svg>
  );
}

interface QuickActionsProps {
  onTryOn: () => void;
  onCustomize: () => void;
  onCommunity: () => void;
  onMore: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = React.memo(
  ({ onTryOn, onCustomize, onCommunity, onMore }) => {
    const actions: QuickActionItem[] = [
      { key: 'tryon', label: '试衣', icon: <TryOnIcon />, onPress: onTryOn },
      {
        key: 'customize',
        label: '定制',
        icon: <CustomizeIcon />,
        onPress: onCustomize,
      },
      {
        key: 'community',
        label: '社区',
        icon: <CommunityIcon />,
        onPress: onCommunity,
      },
      { key: 'more', label: '更多', icon: <MoreIcon />, onPress: onMore },
    ];

    return (
      <View style={styles.section}>
        <Text variant="h3" style={styles.title}>
          快捷操作
        </Text>
        <View style={styles.row}>
          {actions.map((action) => (
            <QuickActionButton key={action.key} item={action} />
          ))}
        </View>
      </View>
    );
  },
);

QuickActions.displayName = 'QuickActions';

const QuickActionButton: React.FC<{ item: QuickActionItem }> = React.memo(
  ({ item }) => {
    const handlePress = useCallback(() => {
      item.onPress();
    }, [item]);

    return (
      <TouchableOpacity
        style={styles.actionButton}
        onPress={handlePress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={item.label}
      >
        <View style={styles.iconContainer}>{item.icon}</View>
        <Text variant="caption" color={colors.textSecondary} align="center">
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  },
);

QuickActionButton.displayName = 'QuickActionButton';

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xxl,
  },
  title: {
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: radius.xl,
    backgroundColor: `${colors.accent}10`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
});
