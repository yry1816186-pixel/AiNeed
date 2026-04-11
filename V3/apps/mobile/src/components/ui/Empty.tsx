import React from 'react';
import {
  View,
  type StyleProp,
  type ViewStyle,
  StyleSheet,
} from 'react-native';
import { colors, spacing, radius } from '../../theme';
import { Text } from './Text';
import { Button } from './Button';

interface EmptyProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const Empty: React.FC<EmptyProps> = ({
  title = '暂无内容',
  description,
  actionLabel,
  onAction,
  icon,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      {!icon && <View style={styles.defaultIcon} />}
      <Text variant="h3" align="center" style={styles.title}>
        {title}
      </Text>
      {description && (
        <Text variant="body2" color={colors.textTertiary} align="center" style={styles.description}>
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button
          variant="primary"
          size="medium"
          onPress={onAction}
          style={styles.action}
        >
          {actionLabel}
        </Button>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    marginBottom: spacing.lg,
  },
  defaultIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.gray100,
    marginBottom: spacing.lg,
  },
  title: {
    marginBottom: spacing.xs,
  },
  description: {
    textAlign: 'center',
    maxWidth: 260,
  },
  action: {
    marginTop: spacing.xl,
  },
});
